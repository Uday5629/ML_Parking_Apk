import api from './axiosConfig';

// Send a notification
export const sendNotification = (payload) =>
  api.post('/notifications/send', payload);
