#!/bin/bash

echo "Starting install-dependencies.sh script..."

# Vercelのビルド環境は /usr/local/bin に書き込めないので、/tmp ディレクトリを利用します。
# Serverless Functionが実行される際に、これらのバイナリがこのパスにあるようにします。
INSTALL_DIR="/tmp/bin"
mkdir -p $INSTALL_DIR

echo "Downloading yt-dlp from $YTDLP_BINARY_URL..."
curl -L $YTDLP_BINARY_URL -o $INSTALL_DIR/yt-dlp
chmod +x $INSTALL_DIR/yt-dlp
echo "yt-dlp installed to $INSTALL_DIR/yt-dlp"

echo "Downloading ffmpeg from $FFMPEG_BINARY_URL..."
curl -L $FFMPEG_BINARY_URL -o $INSTALL_DIR/ffmpeg
chmod +x $INSTALL_DIR/ffmpeg
echo "ffmpeg installed to $INSTALL_DIR/ffmpeg"

echo "Dependencies installed successfully."
