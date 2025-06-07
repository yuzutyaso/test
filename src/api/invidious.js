import axios from 'axios';

// 使用するInvidiousインスタンスのベースURL
// 安定しているインスタンスを選びましょう。
// 例: 'https://invidious.snopyta.org' または 'https://yt.artemislena.eu'
const INV_API_BASE_URL = 'https://lekker.gay';

const invidiousApi = axios.create({
  baseURL: `${INV_API_BASE_URL}/api/v1`,
});

export const getTrendingVideos = async () => {
  try {
    const response = await invidiousApi.get('/trending');
    return response.data;
  } catch (error) {
    console.error("Error fetching trending videos:", error);
    return [];
  }
};

export const searchVideos = async (query) => {
  try {
    const response = await invidiousApi.get(`/search?q=${encodeURIComponent(query)}`);
    return response.data;
  } catch (error) {
    console.error(`Error searching for "${query}":`, error);
    return [];
  }
};

export const getVideoDetails = async (videoId) => {
  try {
    const response = await invidiousApi.get(`/videos/${videoId}`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching video details for ID "${videoId}":`, error);
    return null;
  }
};

export const getChannelDetails = async (channelId) => {
  try {
    const response = await invidiousApi.get(`/channels/${channelId}`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching channel details for ID "${channelId}":`, error);
    return null;
  }
};

export const getChannelVideos = async (channelId) => {
  try {
    const response = await invidiousApi.get(`/channels/${channelId}/videos`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching channel videos for ID "${channelId}":`, error);
    return [];
  }
};
