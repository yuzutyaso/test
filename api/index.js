const express = require('express');
const fs = require('fs/promises'); // fs/promises を使用して非同期処理を簡略化
const path = require('path');
const { v4: uuidv4 } = require('uuid'); // ユニークID生成のため

const app = express();
const PORT = process.env.PORT || 3000;

// データファイルのパス
const DATA_FILE_PATH = path.join(__dirname, 'data.json');

// Middleware
app.use(express.json()); // JSON形式のリクエストボディをパース

// ヘルパー関数: データを読み込む
async function readData() {
  try {
    const data = await fs.readFile(DATA_FILE_PATH, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    if (error.code === 'ENOENT') {
      // ファイルが存在しない場合、空の配列を返す
      console.log('Data file not found, initializing with empty array.');
      return [];
    }
    console.error('Error reading data file:', error);
    return []; // 読み込みエラーの場合も空の配列を返す
  }
}

// ヘルパー関数: データを書き込む
async function writeData(data) {
  try {
    await fs.writeFile(DATA_FILE_PATH, JSON.stringify(data, null, 2), 'utf8');
  } catch (error) {
    console.error('Error writing data file:', error);
  }
}

// 1. 掲示板投稿情報 (全件取得) - GET /api/posts
app.get('/api/posts', async (req, res) => {
  try {
    const posts = await readData();
    // 作成日時が新しい順にソート (createdAtがない場合は何らかのデフォルトソート)
    posts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    res.status(200).json(posts);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// 2. 掲示板投稿情報 (新規作成) - POST /api/posts
app.post('/api/posts', async (req, res) => {
  const { title, content, topicId } = req.body;

  if (!title || !content || !topicId) {
    return res.status(400).json({ message: 'Title, content, and topicId are required.' });
  }

  const newPost = {
    _id: uuidv4(), // 一意なIDを生成
    title,
    content,
    topicId,
    createdAt: new Date().toISOString(), // ISO形式の文字列で保存
  };

  try {
    const posts = await readData();
    posts.push(newPost);
    await writeData(posts);
    res.status(201).json(newPost);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// 3. 特定のトピックの投稿情報 - GET /api/topics/:topicId/posts
app.get('/api/topics/:topicId/posts', async (req, res) => {
  const { topicId } = req.params;
  try {
    const allPosts = await readData();
    const posts = allPosts.filter(post => post.topicId === topicId)
                          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)); // 新しい順にソート

    if (posts.length === 0) {
      return res.status(404).json({ message: 'No posts found for this topic.' });
    }
    res.status(200).json(posts);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// 4. 投稿全消し - DELETE /api/posts/clear
app.delete('/api/posts/clear', async (req, res) => {
  // 警告: fs使用の場合、これは一時的なインスタンスのファイルのみをクリアします。
  // 永続的なデータストアとしては機能しません。
  // 本番環境での誤操作を防ぐため、認証や確認のメカニズムを追加することを強く推奨します。
  try {
    const posts = await readData();
    const deletedCount = posts.length;
    await writeData([]); // 空の配列を書き込むことで全削除
    res.status(200).json({ message: `${deletedCount} posts deleted successfully.` });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Vercel Serverless Function 対応
// VercelはrequestListenerをexportすることを期待するため、モジュールとしてexport
module.exports = app;

// ローカル開発用サーバー (Vercelデプロイ時には実行されない)
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
        }
