// src/components/YouTubeEmbed.tsx
'use client'; // Next.js App Routerでクライアントコンポーネントとしてマーク

import React from 'react';
import YouTube from 'react-youtube';

interface YouTubeEmbedProps {
  videoId: string;
  width?: string;
  height?: string;
  quality?: 'default' | 'small' | 'medium' | 'large' | 'hd720' | 'hd1080' | 'highres';
}

const YouTubeEmbed: React.FC<YouTubeEmbedProps> = ({
  videoId,
  width = '640',
  height = '360',
  quality = 'highres', // デフォルトは高画質
}) => {
  const opts = {
    height: height,
    width: width,
    playerVars: {
      autoplay: 0, // 自動再生しない (0: オフ, 1: オン)
      controls: 1, // プレイヤーコントロールを表示 (1: 表示, 0: 非表示)
      modestbranding: 1, // YouTubeロゴを控えめに (1: 控えめ, 0: 通常)
      rel: 0, // 再生終了後に「関連動画」を表示しない (0: 表示しない, 1: 表示する)
      fs: 1, // フルスクリーンボタンを表示 (1: 表示, 0: 非表示)
      suggestedQuality: quality, // 可能な限り指定の品質でロードしようとする
    },
  };

  // プレイヤーの準備ができたときに呼び出される関数
  const onReady = (event: { target: any }) => {
    // console.log('YouTube player is ready:', event.target);
  };

  // プレイヤーのエラーが発生したときに呼び出される関数
  const onError = (event: { data: number }) => {
    console.error('YouTube player error code:', event.data);
    // エラーコードの例:
    // 2 – 無効なパラメータが含まれている。
    // 100 – 存在しない動画や削除された動画。
    // 101/150 – 埋め込みが許可されていない動画。
  };

  return (
    <div className="youtube-embed-container flex justify-center items-center mb-8 relative w-full pt-[56.25%] h-0 overflow-hidden">
      <YouTube
        videoId={videoId}
        opts={opts}
        onReady={onReady}
        onError={onError}
        className="absolute top-0 left-0 w-full h-full"
      />
    </div>
  );
};

export default YouTubeEmbed;
