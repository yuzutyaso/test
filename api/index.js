import express from 'express';
import { Octokit } from '@octokit/rest';
import cors from 'cors';

const app = express();
const PORT = 3000; // ローカル開発用のポート。Vercelでは自動的に設定されます

app.use(express.json());
// CORS設定: 本番環境に合わせて特定のオリジンのみを許可するよう調整してください
app.use(cors());

// --- !!! 重要: これらの値を直接コードに記述することは極めて危険です !!! ---
// --- !!!           本番環境では絶対に避けてください           !!! ---
// ★あなたのGitHubパーソナルアクセストークンをここに記述
const GITHUB_TOKEN = 'YOUR_PERSONAL_ACCESS_TOKEN_HERE';
// ★掲示板として使いたいGitHubリポジトリのオーナー名（あなたのユーザー名または組織名）をここに記述
const GITHUB_OWNER = 'YOUR_GITHUB_USERNAME_OR_ORG';
// ★掲示板として使いたいGitHubリポジトリ名をここに記述
const GITHUB_REPO = 'YOUR_REPOSITORY_NAME';
// ------------------------------------------------------------------

const octokit = new Octokit({
  auth: GITHUB_TOKEN,
});

// ヘルスチェック用エンドポイント
app.get('/', (req, res) => {
  res.send('GitHub Bulletin Board API is running!');
});

// --- APIエンドポイント ---

// 1. すべての投稿（Issue）情報を取得
// GET /api/posts
app.get('/api/posts', async (req, res) => {
  try {
    const { data: issues } = await octokit.rest.issues.listForRepo({
      owner: GITHUB_OWNER,
      repo: GITHUB_REPO,
      state: 'all', // 'open', 'closed', 'all' のいずれか
      sort: 'created',
      direction: 'desc',
    });

    // 掲示板の投稿として必要な情報を整形して返す
    res.json(issues.map(issue => ({
      id: issue.id,
      number: issue.number,
      title: issue.title,
      body: issue.body,
      state: issue.state,
      author: issue.user.login,
      createdAt: issue.created_at,
      updatedAt: issue.updated_at,
      url: issue.html_url,
      labels: issue.labels.map(label => label.name),
      commentsCount: issue.comments,
    })));
  } catch (error) {
    console.error('投稿の取得中にエラーが発生しました:', error.message);
    res.status(500).json({ error: '投稿の取得に失敗しました。', details: error.message });
  }
});

// 2. 新しい投稿（Issue）を作成
// POST /api/posts
app.post('/api/posts', async (req, res) => {
  const { title, body, labels } = req.body;

  if (!title || !body) {
    return res.status(400).json({ error: 'タイトルと本文は必須です。' });
  }

  try {
    const { data: newIssue } = await octokit.rest.issues.create({
      owner: GITHUB_OWNER,
      repo: GITHUB_REPO,
      title,
      body,
      labels: labels || [],
    });
    res.status(201).json({
      message: '投稿が正常に作成されました。',
      post: {
        id: newIssue.id,
        number: newIssue.number,
        title: newIssue.title,
        author: newIssue.user.login,
        url: newIssue.html_url,
      }
    });
  } catch (error) {
    console.error('投稿の作成中にエラーが発生しました:', error.message);
    res.status(500).json({ error: '投稿の作成に失敗しました。', details: error.message });
  }
});

// 3. 特定の投稿（Issue）のトピック情報を取得（リポジトリのトピック）
// GET /api/topics
// GitHubのトピックはリポジトリ全体に設定されるもので、個別の投稿に紐づくものではないことに注意
app.get('/api/topics', async (req, res) => {
  try {
    const { data: repoInfo } = await octokit.rest.repos.get({
      owner: GITHUB_OWNER,
      repo: GITHUB_REPO,
    });
    res.json({ topics: repoInfo.topics });
  } catch (error) {
    console.error('トピックの取得中にエラーが発生しました:', error.message);
    res.status(500).json({ error: 'トピックの取得に失敗しました。', details: error.message });
  }
});

// 4. 特定の投稿（Issue）をクローズ（掲示板からの削除とみなす）
// DELETE /api/posts/:post_number
app.delete('/api/posts/:post_number', async (req, res) => {
  const post_number = parseInt(req.params.post_number);

  if (isNaN(post_number)) {
    return res.status(400).json({ error: '無効な投稿番号です。' });
  }

  try {
    const { data: closedIssue } = await octokit.rest.issues.update({
      owner: GITHUB_OWNER,
      repo: GITHUB_REPO,
      issue_number: post_number,
      state: 'closed',
    });
    res.json({
      message: `投稿 #${post_number} が正常にクローズされました。`,
      post: {
        id: closedIssue.id,
        number: closedIssue.number,
        title: closedIssue.title,
        state: closedIssue.state,
        url: closedIssue.html_url,
      }
    });
  } catch (error) {
    console.error(`投稿 #${post_number} のクローズ中にエラーが発生しました:`, error.message);
    if (error.status === 404) {
      return res.status(404).json({ error: `投稿 #${post_number} が見つかりません。`, details: error.message });
    }
    res.status(500).json({ error: '投稿のクローズに失敗しました。', details: error.message });
  }
});

// 5. すべてのオープンな投稿（Issue）をクローズ（非常に危険な操作）
// DELETE /api/posts/all
// 本番環境では、このエンドポイントは**絶対に公開すべきではありません。**
// 誤操作や悪用を防ぐために、認証や追加の確認ステップを強く推奨します。
app.delete('/api/posts/all', async (req, res) => {
  try {
    const { data: openIssues } = await octokit.rest.issues.listForRepo({
      owner: GITHUB_OWNER,
      repo: GITHUB_REPO,
      state: 'open',
    });

    if (openIssues.length === 0) {
      return res.json({ message: 'オープンな投稿はありません。' });
    }

    const closePromises = openIssues.map(issue =>
      octokit.rest.issues.update({
        owner: GITHUB_OWNER,
        repo: GITHUB_REPO,
        issue_number: issue.number,
        state: 'closed',
      })
    );

    await Promise.all(closePromises);
    res.json({ message: `${openIssues.length} 件のオープンな投稿がすべてクローズされました。` });
  } catch (error) {
    console.error('すべての投稿のクローズ中にエラーが発生しました:', error.message);
    res.status(500).json({ error: 'すべての投稿のクローズに失敗しました。', details: error.message });
  }
});

// Vercel Serverless Functionとしてエクスポート
export default app;
