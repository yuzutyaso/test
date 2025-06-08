const express = require('express');
const router = express.Router();
const Post = require('../models/Post');

// 1. 掲示板投稿情報 (全件取得) - GET /api/posts
router.get('/posts', async (req, res) => {
  try {
    const posts = await Post.find().sort({ createdAt: -1 }); // 新しい順にソート
    res.status(200).json(posts);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// 2. 掲示板投稿情報 (新規作成) - POST /api/posts
router.post('/posts', async (req, res) => {
  const { title, content, topicId } = req.body;

  if (!title || !content || !topicId) {
    return res.status(400).json({ message: 'Title, content, and topicId are required.' });
  }

  const newPost = new Post({
    title,
    content,
    topicId,
  });

  try {
    const savedPost = await newPost.save();
    res.status(201).json(savedPost);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// 3. 特定のトピックの投稿情報 - GET /api/topics/:topicId/posts
router.get('/topics/:topicId/posts', async (req, res) => {
  const { topicId } = req.params;
  try {
    const posts = await Post.find({ topicId: topicId }).sort({ createdAt: -1 });
    if (posts.length === 0) {
      return res.status(404).json({ message: 'No posts found for this topic.' });
    }
    res.status(200).json(posts);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// 4. 投稿全消し - DELETE /api/posts/clear
router.delete('/posts/clear', async (req, res) => {
  // 本番環境での誤操作を防ぐため、認証や確認のメカニズムを追加することを強く推奨します。
  // ここでは簡略化のために直接削除します。
  try {
    const result = await Post.deleteMany({}); // 全ての投稿を削除
    res.status(200).json({ message: `${result.deletedCount} posts deleted successfully.` });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
