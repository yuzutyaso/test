// api/process-video.js
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs/promises'); // Promiseベースのfs
const crypto = require('crypto');

// Serverless Functionの実行環境で一時的に書き込み可能なディレクトリ
const MEDIA_ROOT_DIR = '/tmp/media';

module.exports = async (req, res) => {
    // Vercel Serverless Functionsはreq.methodとreq.bodyを直接提供
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const youtubeUrl = req.body.url;

    if (!youtubeUrl) {
        return res.status(400).json({ error: 'YouTube URL is required.' });
    }

    // ユニークなセッションIDを生成
    const sessionId = crypto.randomBytes(16).toString('hex');
    const sessionDir = path.join(MEDIA_ROOT_DIR, sessionId);
    const inputFilePath = path.join(sessionDir, 'input.webm'); // ダウンロードしたYouTube動画のパス

    try {
        // セッションディレクトリを作成
        await fs.mkdir(sessionDir, { recursive: true });

        console.log(`Processing YouTube URL: ${youtubeUrl} in session: ${sessionId}`);

        // 1. YouTube動画をダウンロード (WebM高画質、音あり)
        console.log('Step 1: Downloading YouTube video...');
        await new Promise((resolve, reject) => {
            // yt-dlpバイナリはビルドスクリプトで /tmp/bin に配置されることを想定
            const ytDlpProcess = spawn('/tmp/bin/yt-dlp', [
                '-f', 'bestvideo[ext=webm]+bestaudio[ext=webm]/best[ext=webm]',
                '--merge-output-format', 'webm',
                '-o', inputFilePath,
                youtubeUrl
            ], { cwd: sessionDir }); // カレントディレクトリをセッションディレクトリに設定

            ytDlpProcess.stdout.on('data', (data) => console.log(`yt-dlp stdout: ${data}`));
            ytDlpProcess.stderr.on('data', (data) => console.error(`yt-dlp stderr: ${data}`));

            ytDlpProcess.on('close', (code) => {
                if (code === 0) {
                    console.log('YouTube video downloaded successfully.');
                    resolve();
                } else {
                    reject(new Error(`yt-dlp exited with code ${code}`));
                }
            });
            ytDlpProcess.on('error', (err) => reject(new Error(`Failed to start yt-dlp: ${err.message}`)));
        });

        // ダウンロードしたファイルが実際に存在するか確認
        if (!await fs.access(inputFilePath).then(() => true).catch(() => false)) {
             throw new Error('Downloaded input file not found after yt-dlp.');
        }

        // 2. FFmpegでDASH形式にエンコード (WebM/VP9/Opus)
        console.log('Step 2: Encoding video to DASH (WebM/VP9/Opus)...');
        const outputManifestPath = path.join(sessionDir, 'manifest.mpd');

        // 複数の解像度とビットレートでエンコードするためのFFmpegコマンド
        // ここでは例として2つの解像度 (720p, 480p) と音声を作成。必要に応じて追加してください。
        const ffmpegArgs = [
            '-i', inputFilePath,

            // VP9 Video Stream 1 (720p)
            '-map', '0:v:0', // 最初の動画トラックをマップ
            '-c:v:0', 'libvpx-vp9', // VP9コーデック
            '-b:v:0', '1M', // ビットレート 1 Mbps
            '-crf:v:0', '30', // 品質設定
            '-maxrate:v:0', '1.2M', // 最大ビットレート
            '-bufsize:v:0', '2M', // バッファサイズ
            '-s:v:0', '1280x720', // 解像度 720p
            '-tile-columns:v:0', '4', // VP9タイル設定
            '-frame-parallel:v:0', '1',
            '-auto-alt-ref:v:0', '1',
            '-lag-in-frames:v:0', '25',
            '-keyint_min:v:0', '120',
            '-g:v:0', '120',

            // VP9 Video Stream 2 (480p)
            '-map', '0:v:0', // 最初の動画トラックをマップ
            '-c:v:1', 'libvpx-vp9',
            '-b:v:1', '500k', // ビットレート 500 kbps
            '-crf:v:1', '35',
            '-maxrate:v:1', '600k',
            '-bufsize:v:1', '1M',
            '-s:v:1', '854x480', // 解像度 480p
            '-tile-columns:v:1', '4',
            '-frame-parallel:v:1', '1',
            '-auto-alt-ref:v:1', '1',
            '-lag-in-frames:v:1', '25',
            '-keyint_min:v:1', '120',
            '-g:v:1', '120',

            // Opus Audio Stream
            '-map', '0:a:0', // 最初の音声トラックをマップ
            '-c:a:0', 'libopus', // Opusコーデック
            '-b:a:0', '96k', // ビットレート 96 kbps

            // DASH出力設定
            '-f', 'webm_dash_manifest',
            '-adaptation_sets', 'id=0,streams=v id=1,streams=a', // 動画と音声を別のadaptation setに
            '-chunk_duration', '2000', // 2秒のセグメント
            '-dash_segment_type', 'webm',
            '-init_seg_name', 'init_$RepresentationID$.webm', // 初期化セグメントの命名規則
            '-media_seg_name', 'chunk_$RepresentationID$_$Number%05d$.webm', // メディアセグメントの命名規則
            outputManifestPath // 出力マニフェストファイル
        ];

        await new Promise((resolve, reject) => {
            // ffmpegバイナリのパスもビルドスクリプトで /tmp/bin に配置されることを想定
            const ffmpegProcess = spawn('/tmp/bin/ffmpeg', ffmpegArgs, { cwd: sessionDir });

            ffmpegProcess.stdout.on('data', (data) => console.log(`ffmpeg stdout: ${data}`));
            ffmpegProcess.stderr.on('data', (data) => console.error(`ffmpeg stderr: ${data}`));

            ffmpegProcess.on('close', (code) => {
                if (code === 0) {
                    console.log('Video encoded to DASH successfully.');
                    resolve();
                } else {
                    reject(new Error(`FFmpeg exited with code ${code}`));
                }
            });
            ffmpegProcess.on('error', (err) => reject(new Error(`Failed to start FFmpeg: ${err.message}`)));
        });

        // 3. エンコードされたファイルを永続ストレージにアップロード (重要!)
        // **VercelのServerless Functionは実行が終了すると /tmp の内容が消去されます。**
        // したがって、生成された動画セグメントやマニフェストファイルを
        // **Vercel Blob Storage** または **Vercel Storage** のような永続ストレージサービスに
        // アップロードし、その公開URLをクライアントに返す必要があります。
        // ここではそのためのコードは含まれていません。
        // 例:
        // const { put } = require('@vercel/blob');
        // const manifestContent = await fs.readFile(outputManifestPath);
        // const { url: publicManifestUrl } = await put(`media/${sessionId}/manifest.mpd`, manifestContent, { access: 'public' });
        // 他の動画セグメントも同様にアップロードし、manifest.mpd内のURLを書き換える必要があります。
        // これは複雑な処理になるため、専用のストリーミングサービスやクラウドストレージの利用が推奨されます。

        // **この例では、Vercel Blob Storageへのアップロードは含まれていません。**
        // そのため、返される `manifestUrl` は `/api/media/${sessionId}/manifest.mpd` のようになりますが、
        // Vercelはこのパスを直接ファイルとして提供できないため、**実際には再生できません。**
        // この Function はあくまでデモンストレーション目的です。
        const manifestUrl = `/api/media/${sessionId}/manifest.mpd`; // 仮のURL

        res.status(200).json({
            message: 'Video processing initiated. NOTE: Files are temporary in Serverless Function and will not be accessible without permanent storage.',
            manifestUrl: manifestUrl // このURLはFunctionが終了すると無効になるため、注意
        });

    } catch (error) {
        console.error(`Error in process-video function: ${error.message}`);
        res.status(500).json({ error: 'Failed to process video', details: error.message });
    } finally {
        // Function実行の最後に一時ファイルを削除する（Vercelでは自動的に消去される傾向にあるが念のため）
        try {
            await fs.rm(sessionDir, { recursive: true, force: true });
            console.log(`Cleaned up session directory: ${sessionDir}`);
        } catch (err) {
            console.error(`Error during cleanup of ${sessionDir}: ${err.message}`);
        }
    }
};
