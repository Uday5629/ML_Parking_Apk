import api from './axiosConfig';

export const sendNotification = (payload) =>
  api.post('/notification-service/notifications', payload);

