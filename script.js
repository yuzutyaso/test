document.addEventListener('DOMContentLoaded', () => {
    // DOM要素の取得
    const searchInput = document.getElementById('searchInput');
    const searchButton = document.getElementById('searchButton');
    const searchResultsDiv = document.getElementById('searchResults');
    const videoPlayerSection = document.getElementById('videoPlayer');
    const videoElement = document.getElementById('videoElement');
    const qualitySelect = document.getElementById('qualitySelect');
    const backToSearchButton = document.getElementById('backToSearch');
    const noResultsMessage = document.getElementById('noResultsMessage');
    const errorMessage = document.getElementById('errorMessage');

    // InvidiousインスタンスのURL (重要: 稼働している安定したインスタンスを選んでください)
    // 例: 'https://invidious.snopyta.org', 'https://invidious.projectsegfau.lt' など
    // 常に最新の稼働状況を確認してください: https://docs.invidious.io/instances/
    const INVIDIOUS_INSTANCE = 'https://lekker.gay'; // ★★★ ここを適切なインスタンスに置き換えてください ★★★

    let currentVideoDetails = null; // 現在再生中の動画の詳細情報を保持

    // 検索ボタンのクリックイベント
    searchButton.addEventListener('click', performSearch);
    // 検索入力フィールドでのEnterキーイベント
    searchInput.addEventListener('keypress', (event) => {
        if (event.key === 'Enter') {
            performSearch();
        }
    });

    // 検索処理
    async function performSearch() {
        const query = searchInput.value.trim();
        if (!query) return;

        searchResultsDiv.innerHTML = ''; // 以前の検索結果をクリア
        noResultsMessage.classList.add('hidden'); // メッセージを非表示に
        errorMessage.classList.add('hidden'); // エラーメッセージを非表示に

        console.log(`Searching for: ${query} on ${INVIDIOUS_INSTANCE}`);

        try {
            const response = await fetch(`${INVIDIOUS_INSTANCE}/api/v1/search?q=${encodeURIComponent(query)}`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const videos = await response.json();
            console.log('Search results:', videos);

            if (videos.length === 0) {
                noResultsMessage.classList.remove('hidden');
                return;
            }

            videos.forEach(video => {
                // 'video'タイプのみを対象とする
                if (video.type === 'video') {
                    const videoItem = document.createElement('div');
                    videoItem.classList.add('video-item');
                    videoItem.dataset.videoId = video.videoId; // 動画IDをデータ属性に保存

                    const thumbnail = video.authorThumbnails && video.authorThumbnails.length > 0
                        ? video.authorThumbnails[0].url // 著者サムネイルを仮に表示、より良いサムネイルがあれば変更
                        : `https://i.ytimg.com/vi/${video.videoId}/hqdefault.jpg`; // YouTubeのデフォルトサムネイル

                    videoItem.innerHTML = `
                        <img src="${video.videoThumbnails[0].url}" alt="${video.title}">
                        <div class="video-info">
                            <h3>${video.title}</h3>
                            <p>${video.author}</p>
                        </div>
                    `;
                    searchResultsDiv.appendChild(videoItem);

                    videoItem.addEventListener('click', () => loadVideo(video.videoId));
                }
            });
        } catch (error) {
            console.error('検索エラー:', error);
            errorMessage.classList.remove('hidden');
        }
    }

    // 動画をロードして再生する処理
    async function loadVideo(videoId) {
        searchResultsDiv.classList.add('hidden');
        videoPlayerSection.classList.remove('hidden');
        videoElement.src = ''; // 一度クリア
        qualitySelect.innerHTML = ''; // 画質オプションをクリア
        errorMessage.classList.add('hidden'); // エラーメッセージを非表示に

        try {
            const response = await fetch(`${INVIDIOUS_INSTANCE}/api/v1/videos/${videoId}`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const videoDetails = await response.json();
            currentVideoDetails = videoDetails; // 詳細情報を保持
            console.log('Video details:', videoDetails);

            if (!videoDetails.formatStreams || videoDetails.formatStreams.length === 0) {
                throw new Error('利用可能なストリームが見つかりませんでした。');
            }

            // WebM形式で音声を含むストリームをフィルタリング
            const webmStreams = videoDetails.formatStreams.filter(stream =>
                stream.mimeType.startsWith('video/webm') && stream.container === 'webm' && !stream.audioOnly
            );

            if (webmStreams.length === 0) {
                throw new Error('WebM形式の動画ストリームが見つかりませんでした。');
            }

            // 解像度順にソート（高い方から低い方へ）
            webmStreams.sort((a, b) => {
                const resA = parseInt(a.resolution.split('p')[0]);
                const resB = parseInt(b.resolution.split('p')[0]);
                return resB - resA;
            });

            // 画質オプションを追加
            webmStreams.forEach(stream => {
                const option = document.createElement('option');
                option.value = stream.url;
                option.textContent = stream.qualityLabel || stream.resolution;
                qualitySelect.appendChild(option);
            });

            // 初期再生は最も高い画質を選択
            if (webmStreams.length > 0) {
                videoElement.src = webmStreams[0].url;
                qualitySelect.value = webmStreams[0].url; // selectボックスも最高の画質に合わせる
                videoElement.load();
                videoElement.play().catch(e => console.error("Video play failed:", e)); // 自動再生がブロックされる可能性
            }

        } catch (error) {
            console.error('動画ロードエラー:', error);
            errorMessage.classList.remove('hidden');
            errorMessage.textContent = `動画をロードできませんでした: ${error.message}`;
            // エラー時は検索結果に戻るボタンのみ表示
            videoElement.classList.add('hidden');
            qualitySelect.classList.add('hidden');
        } finally {
            // エラー時でも戻るボタンは表示しておく
            backToSearchButton.classList.remove('hidden');
        }
    }

    // 画質選択の変更イベント
    qualitySelect.addEventListener('change', () => {
        videoElement.src = qualitySelect.value;
        videoElement.load();
        videoElement.play().catch(e => console.error("Video play failed on quality change:", e));
    });

    // 「検索結果に戻る」ボタンのクリックイベント
    backToSearchButton.addEventListener('click', () => {
        videoElement.pause();
        videoElement.src = ''; // 動画ソースをクリア
        searchResultsDiv.classList.remove('hidden');
        videoPlayerSection.classList.add('hidden');
        noResultsMessage.classList.add('hidden'); // メッセージを非表示に
        errorMessage.classList.add('hidden'); // エラーメッセージを非表示に
        videoElement.classList.remove('hidden'); // 動画エレメントを再表示
        qualitySelect.classList.remove('hidden'); // 画質選択を再表示
    });

    // 初期ロード時に検索ボックスにフォーカス
    searchInput.focus();
});
