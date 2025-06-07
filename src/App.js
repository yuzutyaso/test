import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Header from './components/Header';
import HomePage from './pages/HomePage';
import SearchPage from './pages/SearchPage';
import VideoPage from './pages/VideoPage';
import ChannelPage from './pages/ChannelPage';

function App() {
  return (
    <Router>
      <div className="min-h-screen flex flex-col bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
        <Header />
        <main className="flex-grow">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/search" element={<SearchPage />} />
            <Route path="/watch" element={<VideoPage />} />
            <Route path="/channel/:channelId" element={<ChannelPage />} />
            {/* 404ページなど、必要に応じて追加 */}
            <Route path="*" element={<div className="text-center p-8">ページが見つかりません。</div>} />
          </Routes>
        </main>
        {/* フッターなど、必要に応じて追加 */}
      </div>
    </Router>
  );
}

export default App;
