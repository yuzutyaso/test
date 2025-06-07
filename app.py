# app.py (バックエンドファイル)
import os
import subprocess
from flask import Flask, request, send_file, jsonify
from flask_cors import CORS # CORS対応のため
import yt_dlp
import uuid # ユニークなファイル名生成のため

app = Flask(__name__)
CORS(app) # クロスオリジンリクエストを許可

# 一時ファイルを保存するディレクトリ
# プロダクション環境では、このディレクトリの管理（定期的な削除など）が重要です
TEMP_DIR = 'temp_videos'
os.makedirs(TEMP_DIR, exist_ok=True)

@app.route('/convert', methods=['POST'])
def convert_video():
    data = request.json
    youtube_url = data.get('url')
    quality_settings = data.get('quality', {}) # 画質設定を辞書で受け取る

    if not youtube_url:
        return jsonify({'error': 'URL is required'}), 400

    unique_id = str(uuid.uuid4()) # ユニークなIDを生成
    download_path = os.path.join(TEMP_DIR, f'{unique_id}_download') # ダウンロード一時ファイル名
    output_filename = f'{unique_id}.webm'
    output_filepath = os.path.join(TEMP_DIR, output_filename) # 最終的なWEBMファイル名

    try:
        # 1. YouTube動画のダウンロード
        ydl_opts = {
            'format': 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best', # mp4形式で最高の品質を試みる
            'outtmpl': f'{download_path}.%(ext)s', # 拡張子をyt-dlpに任せる
            'noplaylist': True,
            'verbose': True # デバッグ用に詳細なログを表示
        }
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info_dict = ydl.extract_info(youtube_url, download=True)
            # ダウンロードされたファイルの正確なパスを取得
            downloaded_file_ext = info_dict.get('ext')
            actual_downloaded_path = f'{download_path}.{downloaded_file_ext}'
            if not os.path.exists(actual_downloaded_path):
                # mp4が見つからない場合、動画+音声のコンテナのパスを探す
                actual_downloaded_path = os.path.join(TEMP_DIR, ydl.prepare_filename(info_dict))


        if not os.path.exists(actual_downloaded_path):
             return jsonify({'error': 'Failed to download video file'}), 500


        # 2. FFmpegでWEBMに変換＆画質調整
        ffmpeg_command = [
            'ffmpeg',
            '-i', actual_downloaded_path, # 入力ファイル
            '-c:v', 'libvpx-vp9',         # WEBM (VP9) コーデックを使用
            '-c:a', 'libopus',            # Opus オーディオコーデックを使用
        ]

        # 画質設定の適用例
        # クライアントから受け取ったquality_settingsに基づいてコマンドを構築
        if quality_settings.get('resolution'):
            # 例: "1280x720" のような形式を想定
            ffmpeg_command.extend(['-vf', f'scale={quality_settings["resolution"]}:-1'])
        if quality_settings.get('bitrate'):
            # 例: "1M" (1Mbps) のような形式を想定
            ffmpeg_command.extend(['-b:v', quality_settings["bitrate"]])
        if quality_settings.get('crf'):
            # VP9のCRFは0-63, 低いほど高品質
            ffmpeg_command.extend(['-crf', str(quality_settings["crf"])])
        if quality_settings.get('framerate'):
            ffmpeg_command.extend(['-r', str(quality_settings["framerate"])])

        ffmpeg_command.append(output_filepath) # 出力ファイル

        print(f"FFmpeg command: {' '.join(ffmpeg_command)}") # デバッグ用
        subprocess.run(ffmpeg_command, check=True, capture_output=True)

        # 3. 変換されたファイルの提供
        return jsonify({'download_url': f'/download/{output_filename}'}), 200

    except yt_dlp.utils.DownloadError as e:
        print(f"yt-dlp download error: {e}")
        return jsonify({'error': f'Failed to download YouTube video: {e}'}), 500
    except subprocess.CalledProcessError as e:
        print(f"FFmpeg error: {e.stdout.decode()} {e.stderr.decode()}")
        return jsonify({'error': f'Video conversion failed: {e.stderr.decode()}'}), 500
    except Exception as e:
        print(f"An unexpected error occurred: {e}")
        return jsonify({'error': f'An unexpected error occurred: {e}'}), 500
    finally:
        # ダウンロードした一時ファイルを削除（変換後に残しておくとストレージを圧迫するため）
        # この部分は、ファイルが正常にダウンロードされなかった場合でも実行されるように調整が必要
        if os.path.exists(actual_downloaded_path):
            os.remove(actual_downloaded_path)


@app.route('/download/<filename>', methods=['GET'])
def download_file(filename):
    filepath = os.path.join(TEMP_DIR, filename)
    if os.path.exists(filepath):
        # ファイルを送信し、ダウンロード後に削除する
        def generate():
            with open(filepath, 'rb') as f:
                while True:
                    chunk = f.read(1024 * 1024) # 1MBずつ読み込む
                    if not chunk:
                        break
                    yield chunk
            os.remove(filepath) # ダウンロード完了後にファイルを削除

        response = app.response_class(generate(), mimetype='video/webm')
        response.headers.set('Content-Disposition', 'attachment', filename=filename)
        return response
    else:
        return jsonify({'error': 'File not found'}), 404

if __name__ == '__main__':
    # デバッグモードは開発用です。プロダクション環境では使用しないでください。
    app.run(debug=True, port=5000)
