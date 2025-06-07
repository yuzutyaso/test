import React, { useEffect, useState } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { getVideoDetails } from '../api/invidious';
import LoadingSpinner from '../components/LoadingSpinner';

function VideoPage() {
  const location = useLocation();
  const videoId = new URLSearchParams(location.search).get('v');

  const [video, setVideo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedQualityUrl, setSelectedQualityUrl] = useState('');
  const [availableWebmFormats, setAvailableWebmFormats] = useState([]);

  useEffect(() => {
    const fetchVideo = async () => {
      if (!videoId) {
        setError("動画IDが指定されていません。");
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const data = await getVideoDetails(videoId);
        setVideo(data);

        // 利用可能なwebm形式の動画URLをフィルタリング
        if (data && data.format) {
          const webmFormats = data.format.filter(
            f => f.mimeType?.startsWith('video/webm')
          ).sort((a, b) => b.height - a.height); // 高画質順にソート

          setAvailableWebmFormats(webmFormats);

          // デフォルトで最も高画質なwebmを選択
          if (webmFormats.length > 0) {
            setSelectedQualityUrl(webmFormats[0].url);
          } else {
            setError("利用可能なwebm形式の動画が見つかりませんでした。");
          }
        } else {
          setError("動画のフォーマット情報が見つかりませんでした。");
        }

      } catch (err) {
        setError("動画情報の取得に失敗しました。");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchVideo();
  }, [videoId]);

  const handleQualityChange = (e) => {
    setSelectedQualityUrl(e.target.value);
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return <div className="text-center text-red-500 p-4">{error}</div>;
  }

  if (!video) {
    return <div className="text-center text-gray-600 dark:text-gray-400 p-4">動画が見つかりません。</div>;
  }

  return (
    <div className="container mx-auto p-4 flex flex-col lg:flex-row gap-6">
      {/* メイン動画プレイヤーと情報 */}
      <div className="flex-1">
        {selectedQualityUrl ? (
          <div className="aspect-video bg-black rounded-lg overflow-hidden mb-4">
            <video controls src={selectedQualityUrl} className="w-full h-full"></video>
          </div>
        ) : (
          <div className="aspect-video bg-gray-200 dark:bg-gray-700 flex items-center justify-center rounded-lg mb-4">
            <p className="text-gray-600 dark:text-gray-400">動画がロードできませんでした。</p>
          </div>
        )}

        {/* 画質選択ドロップダウン */}
        {availableWebmFormats.length > 0 && (
          <div className="mb-4">
            <label htmlFor="quality-selector" className="text-gray-700 dark:text-gray-300 mr-2">画質:</label>
            <select
              id="quality-selector"
              onChange={handleQualityChange}
              value={selectedQualityUrl}
              className="p-2 border rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600"
            >
              {availableWebmFormats.map(format => (
                <option key={format.url} value={format.url}>
                  {format.qualityLabel || `${format.height}p`} ({format.mimeType.split('/')[1]})
                </option>
              ))}
            </select>
          </div>
        )}

        <h1 className="text-2xl font-bold mb-2 text-gray-900 dark:text-gray-100">{video.title}</h1>
        <div className="flex items-center mb-4">
          <Link to={`/channel/${video.authorId}`} className="flex items-center">
            {video.authorThumbnails && video.authorThumbnails.length > 0 && (
              <img
                src={video.authorThumbnails[video.authorThumbnails.length - 1].url}
                alt={video.author}
                className="w-10 h-10 rounded-full mr-2 object-cover"
              />
            )}
            <span className="font-semibold text-gray-700 dark:text-gray-300 hover:text-blue-500">
              {video.author}
            </span>
          </Link>
          <span className="text-gray-500 dark:text-gray-400 ml-4 text-sm">
            {video.viewCount?.toLocaleString()} 回視聴 • {video.publishedText}
          </span>
        </div>

        {/* 説明欄 */}
        <div className="bg-gray-100 dark:bg-gray-800 p-3 rounded-lg mb-4 text-sm text-gray-800 dark:text-gray-200">
          <p>{video.description}</p>
        </div>

        {/* コメントセクション (簡易版) */}
        <div className="mt-8">
          <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-gray-100">コメント (簡易)</h2>
          {/* 実際のコメント表示や投稿機能は、Invidious APIが提供していれば実装可能 */}
          <p className="text-gray-600 dark:text-gray-400">コメント機能は現在簡易的なものです。</p>
        </div>
      </div>

      {/* 関連動画 (サイドバー) */}
      <div className="w-full lg:w-80 flex-shrink-0">
        <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-gray-100">関連動画</h2>
        <div className="space-y-4">
          {video.recommendedVideos?.length > 0 ? (
            video.recommendedVideos.slice(0, 5).map(recVideo => ( // 5件程度に絞る
              <Link to={`/watch?v=${recVideo.videoId}`} key={recVideo.videoId} className="flex items-start space-x-3 hover:bg-gray-100 dark:hover:bg-gray-800 p-2 rounded-lg transition-colors">
                <img
                  src={recVideo.videoThumbnails[recVideo.videoThumbnails.length - 1].url}
                  alt={recVideo.title}
                  className="w-28 h-16 object-cover rounded-md flex-shrink-0"
                />
                <div>
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 line-clamp-2">
                    {recVideo.title}
                  </h4>
                  <p className="text-xs text-gray-600 dark:text-gray-400">{recVideo.author}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{recVideo.viewCount?.toLocaleString()} 回視聴</p>
                </div>
              </Link>
            ))
          ) : (
            <p className="text-gray-600 dark:text-gray-400">関連動画はありません。</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default VideoPage;
