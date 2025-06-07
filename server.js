const express = require('express');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const cors = require('cors'); // CORS対策のため
const crypto = require('crypto'); // ユニークなID生成のため

const app = express();
const PORT = process.env.PORT || 3000;

// ダウンロードとエンコード済みファイルの一時保存ディレクトリ
const MEDIA_ROOT_DIR = path.join(__dirname, 'media');

// 必要に応じてディレクトリを作成
if (!fs.existsSync(MEDIA_ROOT_DIR)) {
    fs.mkdirSync(MEDIA_ROOT_DIR);
}

// CORSを有効にする (開発時のみ。本番では特定のオリジンに制限することを推奨)
app.use(cors());
app.use(express.json()); // JSONボディをパース

// エンコード済みメディアファイルを静的に配信
app.use('/media', express.static(MEDIA_ROOT_DIR));

/**
 * YouTube動画のダウンロード、エンコード、DASH形式への変換を行うAPI
 * POST /process-video
 * body: { url: "YouTube_URL" }
 */
app.post('/process-video', async (req, res) => {
    const youtubeUrl = req.body.url;

    if (!youtubeUrl) {
        return res.status(400).json({ error: 'YouTube URL is required.' });
    }

    // 各処理のディレクトリをユニークにするためのID
    const sessionId = crypto.randomBytes(16).toString('hex');
    const sessionDir = path.join(MEDIA_ROOT_DIR, sessionId);
    const inputFilePath = path.join(sessionDir, 'input.webm'); // ダウンロードしたYouTube動画のパス

    // セッションディレクトリを作成
    if (!fs.existsSync(sessionDir)) {
        fs.mkdirSync(sessionDir, { recursive: true });
    }

    console.log(`Processing YouTube URL: ${youtubeUrl} in session: ${sessionId}`);

    try {
        // 1. YouTube動画をダウンロード (WebM高画質、音あり)
        console.log('Step 1: Downloading YouTube video...');
        await new Promise((resolve, reject) => {
            const ytDlpArgs = [
                '-f', 'bestvideo[ext=webm]+bestaudio[ext=webm]/best[ext=webm]',
                '--merge-output-format', 'webm',
                '-o', inputFilePath,
                youtubeUrl
            ];
            const ytDlpProcess = spawn('yt-dlp', ytDlpArgs, { cwd: sessionDir }); // CWDを指定

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
        if (!fs.existsSync(inputFilePath)) {
            throw new Error('Downloaded input file not found.');
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
            const ffmpegProcess = spawn('ffmpeg', ffmpegArgs, { cwd: sessionDir });

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

        // 3. クライアントにDASHマニフェストのURLを返す
        const manifestUrl = `/media/${sessionId}/manifest.mpd`;
        res.json({
            message: 'Video processed successfully',
            manifestUrl: manifestUrl
        });

    } catch (error) {
        console.error(`Error processing video: ${error.message}`);
        res.status(500).json({ error: 'Failed to process video', details: error.message });
        // エラー発生時は一時ファイルを削除するロジックを追加すると良い
        // fs.rmdirSync(sessionDir, { recursive: true });
    } finally {
        // ダウンロードした元の動画ファイル（input.webm）はエンコード後に不要なため削除する
        // fs.unlink(inputFilePath, (err) => {
        //     if (err) console.error(`Failed to delete input file: ${err.message}`);
        // });
        // 厳密には、ユーザーが再生し終わった後や、一定期間経過後にsessionDirごと削除する機構が必要
    }
});

// サーバー起動
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`Media root directory: ${MEDIA_ROOT_DIR}`);
});
