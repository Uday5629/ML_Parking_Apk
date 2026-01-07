import api from './axiosConfig';

export const getLevels = () => api.get('/parking-lot-service/levels');

export const getSpotsByLevel = (levelId) =>
  api.get(`/parking-lot-service/levels/${encodeURIComponent(levelId)}/spots`);

