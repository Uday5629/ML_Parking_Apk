import api from './axiosConfig';

export const listTickets = (params) =>
  api.get('/ticketing-service/tickets', { params });

export const getTicket = (ticketId) =>
  api.get(`/ticketing-service/tickets/${encodeURIComponent(ticketId)}`);

export const createTicket = (payload) =>
  api.post('/ticketing-service/tickets', payload);

// Assuming ticket exit is a POST to /tickets/{id}/exit
export const exitTicket = (ticketId, payload = {}) =>
  api.post(`/ticketing-service/tickets/${encodeURIComponent(ticketId)}/exit`, payload);

