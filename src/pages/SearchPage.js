import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { searchVideos } from '../api/invidious';
import VideoCard from '../components/VideoCard';
import LoadingSpinner from '../components/LoadingSpinner';

function SearchPage() {
  const location = useLocation();
  const query = new URLSearchParams(location.search).get('q');

  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchResults = async () => {
      if (!query) {
        setResults([]);
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const data = await searchVideos(query);
        // 検索結果には動画以外のタイプも含まれる可能性があるため、動画のみをフィルタリング
        const videoResults = data.filter(item => item.type === 'video');
        setResults(videoResults);
      } catch (err) {
        setError("検索結果の取得に失敗しました。");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchResults();
  }, [query]);

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return <div className="text-center text-red-500 p-4">{error}</div>;
  }

  return (
    <div className="container mx-auto p-4">
      <h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-gray-100">
        "{query}" の検索結果
      </h2>
      {results.length === 0 ? (
        <p className="text-gray-600 dark:text-gray-400">検索結果が見つかりませんでした。</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6"> {/* 検索結果はリスト形式も考慮し、md:grid-cols-2など柔軟に */}
          {results.map((video) => (
            <VideoCard key={video.videoId} video={video} />
          ))}
        </div>
      )}
    </div>
  );
}

export default SearchPage;
