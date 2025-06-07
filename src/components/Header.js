import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
// アイコンライブラリをインストールする場合（例：react-icons）
// import { FaSearch, FaYoutube } from 'react-icons/fa';

function Header() {
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchTerm)}`);
    }
  };

  return (
    <header className="sticky-header bg-white dark:bg-gray-800 p-4 shadow-md flex items-center justify-between">
      {/* ロゴ */}
      <Link to="/" className="flex items-center space-x-2 text-red-500 hover:text-red-600">
        {/* <FaYoutube className="text-3xl" /> */} {/* アイコンを使う場合 */}
        <span className="text-2xl font-bold">簡易YouTube</span>
      </Link>

      {/* 検索バー */}
      <form onSubmit={handleSearch} className="flex-1 max-w-xl mx-4">
        <div className="relative">
          <input
            type="text"
            placeholder="検索"
            className="w-full p-2 pl-4 pr-10 rounded-full border border-gray-300 dark:border-gray-700 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <button type="submit" className="absolute right-0 top-0 h-full px-4 rounded-r-full text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600">
            {/* <FaSearch /> */} {/* アイコンを使う場合 */}
            🔍
          </button>
        </div>
      </form>

      {/* 右側のアイコン (ダミー) */}
      <div className="flex items-center space-x-4">
        <button className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300">
          {/* 設定アイコンやユーザーアイコンなど */}
          ⚙️
        </button>
      </div>
    </header>
  );
}

export default Header;
