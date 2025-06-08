const fs = require('fs');
const path = require('path');
const crypto = require('crypto'); // ID生成のために利用

// 投稿データを保存するファイルのパス
const POSTS_FILE = path.join(__dirname, 'posts.json');

/**
 * 投稿データファイルを初期化します。
 * ファイルが存在しない場合、空の配列で作成します。
 */
function initializePostsFile() {
    if (!fs.existsSync(POSTS_FILE)) {
        console.log(`${POSTS_FILE} が見つかりません。新規作成します。`);
        fs.writeFileSync(POSTS_FILE, JSON.stringify([]), 'utf8');
    }
}

/**
 * 投稿データをファイルから読み込みます。
 * @returns {Promise<Array<Object>>} 投稿データの配列
 */
async function readPosts() {
    try {
        const data = await fs.promises.readFile(POSTS_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        // ファイルが存在しない場合（初期化前など）やJSONパースエラーの場合
        if (error.code === 'ENOENT') {
            console.warn('投稿ファイルが見つかりません。空の配列として扱います。');
            return [];
        }
        console.error('投稿ファイルの読み込み中にエラーが発生しました:', error);
        return []; // エラー時は空の配列を返す
    }
}

/**
 * 投稿データをファイルに書き込みます。
 * @param {Array<Object>} posts - 書き込む投稿データの配列
 */
async function writePosts(posts) {
    try {
        // JSONを整形して書き込む (null, 2でインデント)
        await fs.promises.writeFile(POSTS_FILE, JSON.stringify(posts, null, 2), 'utf8');
        console.log('投稿データが保存されました。');
    } catch (error) {
        console.error('投稿ファイルの書き込み中にエラーが発生しました:', error);
    }
}

/**
 * 新しい投稿を追加します。
 * @param {string} name - 投稿者の名前
 * @param {string} content - 投稿内容
 */
async function addPost(name, content) {
    const posts = await readPosts();
    
    // 投稿番号を自動生成 (既存の最大投稿番号 + 1)
    const newPostNumber = posts.length > 0 ? Math.max(...posts.map(p => p.postNumber)) + 1 : 1;

    // ユニークなID (ハッシュ値) を生成
    const postId = crypto.randomBytes(16).toString('hex'); 

    const newPost = {
        postNumber: newPostNumber,
        name: name,
        id: postId, // ハッシュ値（ID）
        content: content,
        timestamp: new Date().toISOString() // 投稿日時
    };

    posts.push(newPost);
    await writePosts(posts);
    console.log(`投稿 #${newPost.postNumber} が追加されました。`);
    console.log(`内容: ${newPost.content}`);
    console.log(`ID: ${newPost.id}`);
}

/**
 * 全ての投稿を表示します。
 */
async function getAllPosts() {
    const posts = await readPosts();
    if (posts.length === 0) {
        console.log('\n--- 現在、投稿はありません ---');
        return;
    }

    console.log('\n--- 全ての投稿 ---');
    posts.forEach(post => {
        console.log(`投稿番号: ${post.postNumber}`);
        console.log(`名前: ${post.name}`);
        console.log(`ID (ハッシュ値): ${post.id}`);
        console.log(`内容: ${post.content}`);
        console.log(`投稿日時: ${new Date(post.timestamp).toLocaleString()}`);
        console.log('------------------');
    });
    console.log('--- 投稿一覧の終わり ---');
}

/**
 * 全ての投稿を削除します。
 */
async function deleteAllPosts() {
    await writePosts([]); // 空の配列を書き込むことで全削除
    console.log('\n--- 全ての投稿が削除されました ---');
}

/**
 * メイン実行関数
 */
async function main() {
    initializePostsFile(); // まずファイルを初期化

    console.log('::掲示板システム開始::');

    // 投稿を追加
    await addPost('山田太郎', '初めての投稿です。よろしくお願いします！');
    await addPost('佐藤花子', 'こんにちは、掲示板！今日の天気は最高ですね。');
    await addPost('田中一郎', '技術的な質問があります。Node.jsについて教えてください。');

    // 全ての投稿を表示
    await getAllPosts();

    // 投稿をさらに追加
    await addPost('鈴木次郎', '掲示板の機能に感動しました！');

    // 再度全ての投稿を表示して、新しい投稿が追加されたことを確認
    await getAllPosts();

    // 全ての投稿を削除する場合（コメントアウトを外して実行してください）
    // console.log('\n::全ての投稿を削除します::');
    // await deleteAllPosts();
    // await getAllPosts(); // 削除後の確認
}

// プログラムを実行
main();
