// pages/index.tsx
import { useState, FormEvent } from 'react';

// Invidious APIからの動画データの型定義
interface Video {
  type: string;
  videoId: string;
  title: string;
  author: string;
  videoThumbnails: { url: string; quality: string; width: number; height: number }[];
  // 必要に応じて、Invidious APIからの他のプロパティを追加できます
  lengthSeconds: number; // 動画の長さ (秒)
  viewCount: number;    // 再生回数
}

// InvidiousインスタンスのURLを再度定義します
// ここで定義したURLが、動画の再生リンクや埋め込みURLの生成に使われます。
const INVIDIOUS_INSTANCE_URL = 'https://vid.puffyan.us'; 

export default function Home() {
  const [searchTerm, setSearchTerm] = useState(''); // 検索キーワードを保持
  const [videos, setVideos] = useState<Video[]>([]); // 検索結果の動画リスト
  const [loading, setLoading] = useState(false);     // 検索中のローディング状態
  const [error, setError] = useState<string | null>(null); // エラーメッセージ

  // 検索ボタンが押されたときの処理
  const handleSearch = async (event: FormEvent) => {
    event.preventDefault(); // フォームのデフォルト送信を防止
    setLoading(true);       // ローディング状態を開始
    setError(null);         // エラーメッセージをクリア
    setVideos([]);          // 以前の検索結果をクリア

    // 検索キーワードが空の場合は何もしない
    if (!searchTerm.trim()) {
      setLoading(false);
      return;
    }

    try {
      // 自分のAPI Routeにリクエストを送信
      const response = await fetch(`/api/search-videos?q=${encodeURIComponent(searchTerm)}`);
      
      // レスポンスが正常でなかった場合
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || '動画の取得中にエラーが発生しました。');
      }

      // 取得したデータをJSONとしてパース
      const data: any[] = await response.json();
      
      // Invidious APIは動画だけでなく、プレイリストなども返す場合があるため、
      // 'video'タイプのアイテムのみをフィルタリングします
      const videoResults: Video[] = data.filter(item => item.type === 'video');
      setVideos(videoResults);

    } catch (err: any) {
      console.error('Failed to fetch videos:', err);
      setError(err.message || '動画の検索に失敗しました。');
    } finally {
      setLoading(false); // ローディング状態を終了
    }
  };

  // 再生回数を読みやすい形式に変換するヘルパー関数
  const formatViewCount = (count: number): string => {
    if (count >= 1_000_000_000) return `${(count / 1_000_000_000).toFixed(1)}億回`;
    if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}万回`;
    if (count >= 1_000) return `${(count / 1_000).toFixed(1)}千回`;
    return `${count}回`;
  };

  // 動画の長さをフォーマットするヘルパー関数 (hh:mm:ss)
  const formatLength = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;

    const pad = (num: number) => num.toString().padStart(2, '0');

    if (hours > 0) {
      return `${hours}:${pad(minutes)}:${pad(remainingSeconds)}`;
    }
    return `${pad(minutes)}:${pad(remainingSeconds)}`;
  };

  return (
    <div style={{ maxWidth: '960px', margin: '0 auto', padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1>簡易TUBEFLOW</h1>
      <p>Invidiousの非公式APIを利用してYouTube動画を検索・再生します。</p>

      {/* 検索フォーム */}
      <form onSubmit={handleSearch} style={{ marginBottom: '30px', display: 'flex', gap: '10px' }}>
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="動画タイトル、キーワードで検索..."
          style={{ flexGrow: 1, padding: '10px', fontSize: '16px', border: '1px solid #ccc', borderRadius: '4px' }}
        />
        <button 
          type="submit" 
          disabled={loading || !searchTerm.trim()}
          style={{ 
            padding: '10px 20px', 
            fontSize: '16px', 
            backgroundColor: '#007bff', 
            color: 'white', 
            border: 'none', 
            borderRadius: '4px', 
            cursor: 'pointer' 
          }}
        >
          {loading ? '検索中...' : '検索'}
        </button>
      </form>

      {/* エラーメッセージ表示 */}
      {error && <p style={{ color: 'red', textAlign: 'center', marginBottom: '20px' }}>エラー: {error}</p>}

      {/* 検索結果の表示 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
        {loading && <p style={{ gridColumn: '1 / -1', textAlign: 'center' }}>動画を検索しています...</p>}
        {videos.length === 0 && !loading && !error && searchTerm.trim() && (
          <p style={{ gridColumn: '1 / -1', textAlign: 'center' }}>動画が見つかりませんでした。</p>
        )}
        {videos.length === 0 && !loading && !error && !searchTerm.trim() && (
          <p style={{ gridColumn: '1 / -1', textAlign: 'center' }}>検索ワードを入力して動画を探しましょう。</p>
        )}

        {videos.map((video) => (
          <div 
            key={video.videoId} 
            style={{ 
              border: '1px solid #eee', 
              borderRadius: '8px', 
              overflow: 'hidden', 
              boxShadow: '0 2px 5px rgba(0,0,0,0.1)',
              backgroundColor: '#fff'
            }}
          >
            {/* サムネイル */}
            {video.videoThumbnails && video.videoThumbnails.length > 0 && (
              <img 
                src={video.videoThumbnails[0].url} 
                alt={video.title} 
                style={{ width: '100%', height: '180px', objectFit: 'cover' }} 
              />
            )}
            <div style={{ padding: '15px' }}>
              {/* 動画タイトル */}
              <h2 style={{ fontSize: '1.2em', margin: '0 0 10px', height: '3em', overflow: 'hidden' }}>
                {video.title}
              </h2>
              {/* 作者と再生回数 */}
              <p style={{ fontSize: '0.9em', color: '#555', margin: '0 0 5px' }}>
                作者: {video.author}
              </p>
              <p style={{ fontSize: '0.9em', color: '#555', margin: '0 0 15px' }}>
                再生回数: {formatViewCount(video.viewCount)} · 長さ: {formatLength(video.lengthSeconds)}
              </p>
              
              {/* 動画埋め込み */}
              <div style={{ position: 'relative', width: '100%', paddingBottom: '56.25%', marginBottom: '15px' }}>
                <iframe
                  src={`${INVIDIOUS_INSTANCE_URL}/embed/${video.videoId}`}
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  title={video.title}
                  style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
                ></iframe>
              </div>

              {/* Invidiousで開くリンク */}
              <p style={{ textAlign: 'center', marginBottom: '0' }}>
                <a 
                  href={`${INVIDIOUS_INSTANCE_URL}/watch?v=${video.videoId}`} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  style={{ 
                    display: 'inline-block', 
                    padding: '8px 15px', 
                    backgroundColor: '#6c757d', 
                    color: 'white', 
                    textDecoration: 'none', 
                    borderRadius: '4px', 
                    fontSize: '0.9em' 
                  }}
                >
                  Invidiousで開く
                </a>
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
  }
