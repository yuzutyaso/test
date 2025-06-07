// pages/api/search-videos.ts
import type { NextApiRequest, NextApiResponse } from 'next';

// 使用するInvidiousインスタンスのURLを指定します。
// 動作しない場合は、他のInvidiousインスタンス (例: https://invidious.snopyta.org など) を試してください。
const INVIDIOUS_INSTANCE = 'https://vid.puffyan.us'; 

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // GETリクエストのみを受け付けます
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const { q } = req.query; // クエリパラメータ 'q' (検索キーワード) を取得

  // 検索キーワードがない場合はエラーを返します
  if (!q || typeof q !== 'string') {
    return res.status(400).json({ message: 'Missing search query (q)' });
  }

  try {
    // Invidiousの非公式検索APIエンドポイントにリクエストを送信
    const response = await fetch(`${INVIDIOUS_INSTANCE}/api/v1/search?q=${encodeURIComponent(q)}`);
    
    // レスポンスが正常でなかった場合
    if (!response.ok) {
      const errorData = await response.json();
      console.error('Invidious API error:', errorData);
      return res.status(response.status).json({ 
        message: 'Failed to fetch from Invidious API', 
        details: errorData.message || '不明なエラー' 
      });
    }

    // JSON形式でレスポンスデータを取得
    const data = await response.json();
    
    // 取得したデータをそのままフロントエンドに返します
    res.status(200).json(data);

  } catch (error) {
    // ネットワークエラーなど、予期せぬエラーが発生した場合
    console.error('Error fetching from Invidious:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
               }
