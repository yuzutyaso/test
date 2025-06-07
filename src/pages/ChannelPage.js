import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getChannelDetails, getChannelVideos } from '../api/invidious';
import VideoCard from '../components/VideoCard';
import LoadingSpinner from '../components/LoadingSpinner';

function ChannelPage() {
  const { channelId } = useParams();
  const [channel, setChannel] = useState(null);
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const channelData = await getChannelDetails(channelId);
        const videoData = await getChannelVideos(channelId);
        setChannel(channelData);
        setVideos(videoData);
      } catch (err) {
        setError("チャンネル情報の取得に失敗しました。");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [channelId]);

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return <div className="text-center text-red-500 p-4">{error}</div>;
  }

  if (!channel) {
    return <div className="text-center text-gray-600 dark:text-gray-400 p-4">チャンネルが見つかりません。</div>;
  }

  return (
    <div className="container mx-auto p-4">
      {/* チャンネルバナー */}
      {channel.authorBanners && channel.authorBanners.length > 0 && (
        <div className="w-full h-48 sm:h-64 md:h-72 lg:h-80 bg-gray-200 dark:bg-gray-700 overflow-hidden mb-6">
          <img
            src={channel.authorBanners[channel.authorBanners.length - 1].url} // 最も高画質なバナー
            alt={`${channel.author} のバナー`}
            className="w-full h-full object-cover"
          />
        </div>
      )}

      {/* チャンネル情報 */}
      <div className="flex items-center mb-8 px-4 sm:px-0">
        {channel.authorThumbnails && channel.authorThumbnails.length > 0 && (
          <img
            src={channel.authorThumbnails[channel.authorThumbnails.length - 1].url} // チャンネルアイコン
            alt={`${channel.author} のアイコン`}
            className="w-20 h-20 rounded-full mr-4 object-cover"
          />
        )}
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">{channel.author}</h1>
          {channel.subCount && (
            <p className="text-gray-600 dark:text-gray-400">登録者数: {channel.subCount.toLocaleString()}人</p>
          )}
          <button className="mt-2 px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors">
            チャンネル登録 (ダミー)
          </button>
        </div>
      </div>

      {/* チャンネルの動画 */}
      <h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-gray-100">最新の動画</h3>
      {videos.length === 0 ? (
        <p className="text-gray-600 dark:text-gray-400">このチャンネルには動画がありません。</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {videos.map((video) => (
            <VideoCard key={video.videoId} video={video} />
          ))}
        </div>
      )}
    </div>
  );
}

export default ChannelPage;
