// src/app/page.tsx
import YouTubeEmbed from '../components/YouTubeEmbed';

export default function Home() {
  // 埋め込みたいYouTube動画のIDを指定します。
  // 例: https://www.youtube.com/watch?v=dQw4w9WgXcQ の 'dQw4w9WgXcQ' の部分です。
  const videoId1 = 'dQw4w9WgXcQ'; // Rick Astley - Never Gonna Give You Up
  const videoId2 = 'M_V2u54sPto'; // Chill Vibes - Lofi Hip Hop Mix

  return (
    <div className="min-h-screen flex flex-col items-center justify-center py-10 bg-gray-50 text-gray-800">
      <main className="flex flex-col items-center justify-center w-full max-w-4xl px-4">
        <h1 className="text-4xl font-bold text-center mb-8">
          YouTube動画埋め込みデモ
        </h1>

        <p className="text-lg text-center mb-12">
          `react-youtube` を使ってYouTube動画を埋め込みます。<br />
          プレイヤーの画質はYouTube側で自動調整されますが、埋め込みコードで推奨品質を指定できます。
        </p>

        {/* 1つ目の動画埋め込み */}
        <div className="w-full mb-12">
          <h2 className="text-2xl font-semibold mb-4 text-center">動画1: 1080p推奨</h2>
          <YouTubeEmbed
            videoId={videoId1}
            width="100%" // 親要素に合わせて幅100%に
            height="auto" // 高さはアスペクト比で自動調整されるためauto
            quality="hd1080" // 初期品質を1080pに設定（可能であれば）
          />
        </div>

        {/* 2つ目の動画埋め込み (異なる設定の例) */}
        <div className="w-full mb-12">
          <h2 className="text-2xl font-semibold mb-4 text-center">動画2: 720p推奨</h2>
          <YouTubeEmbed
            videoId={videoId2}
            width="100%"
            height="auto"
            quality="hd720" // 初期品質を720pに設定
          />
        </div>

        <p className="text-center text-gray-600 mt-8">
          動画プレイヤーの右下にある歯車アイコンから、手動で画質を調整できます。
        </p>
      </main>

      <footer className="w-full mt-16 text-center text-gray-500 text-sm">
        <a
          href="https://vercel.com"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:underline"
        >
          Powered by Vercel
        </a>
      </footer>
    </div>
  );
}
