import React from 'react';
import { Link } from 'react-router-dom';

function VideoCard({ video }) {
  // 動画時間が秒で提供される場合、H:MM:SS形式に変換するヘルパー関数
  const formatDuration = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;
    return [
      hours > 0 ? hours : '',
      minutes.toString().padStart(2, '0'),
      remainingSeconds.toString().padStart(2, '0'),
    ].filter(Boolean).join(':');
  };

  // 視聴回数をフォーマットする
  const formatViews = (views) => {
    if (views >= 1000000) return `${(views / 1000000).toFixed(1)}M`;
    if (views >= 1000) return `${(views / 1000).toFixed(0)}K`;
    return views;
  };

  // 投稿日時を「X時間前」のように表示
  const getTimeAgo = (dateString) => {
    const postDate = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now - postDate) / 1000);

    let interval = seconds / 31536000; // 年
    if (interval > 1) return `${Math.floor(interval)}年前`;
    interval = seconds / 2592000; // 月
    if (interval > 1) return `${Math.floor(interval)}ヶ月前`;
    interval = seconds / 604800; // 週
    if (interval > 1) return `${Math.floor(interval)}週間前`;
    interval = seconds / 86400; // 日
    if (interval > 1) return `${Math.floor(interval)}日前`;
    interval = seconds / 3600; // 時間
    if (interval > 1) return `${Math.floor(interval)}時間前`;
    interval = seconds / 60; // 分
    if (interval > 1) return `${Math.floor(interval)}分前`;
    return `${Math.floor(seconds)}秒前`;
  };


  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow cursor-pointer">
      <Link to={`/watch?v=${video.videoId}`}>
        <div className="relative aspect-video">
          <img
            src={video.videoThumbnails[video.videoThumbnails.length - 1].url} // 最も高画質なサムネイル
            alt={video.title}
            className="w-full h-full object-cover"
          />
          {video.lengthSeconds && (
            <span className="absolute bottom-1 right-1 bg-black bg-opacity-80 text-white text-xs px-1 py-0.5 rounded">
              {formatDuration(video.lengthSeconds)}
            </span>
          )}
        </div>
        <div className="p-3">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-1 line-clamp-2">
            {video.title}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            <Link to={`/channel/${video.authorId}`} className="hover:text-blue-500">
              {video.author}
            </Link>
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {formatViews(video.viewCount)} 回視聴 • {getTimeAgo(video.publishedText)}
          </p>
        </div>
      </Link>
    </div>
  );
}

export default VideoCard;
