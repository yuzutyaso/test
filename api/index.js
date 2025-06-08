require('dotenv').config(); // ローカル開発用に環境変数をロード
const express = require('express');
const mongoose = require('mongoose');
const postRoutes = require('./routes/posts'); // 投稿関連のルートをインポート

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json()); // JSON形式のリクエストボディをパース

// MongoDB Connection
const MONGODB_URI = process.env.MONGODB_URI;

mongoose.connect(MONGODB_URI)
  .then(() => console.log('MongoDB Connected'))
  .catch(err => console.error('MongoDB connection error:', err));

// Routes
app.use('/api', postRoutes); // /api をプレフィックスとして投稿ルートをマウント

// Vercel Serverless Function 対応
// VercelはrequestListenerをexportすることを期待するため、モジュールとしてexport
module.exports = app;

// ローカル開発用サーバー (Vercelデプロイ時には実行されない)
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}
