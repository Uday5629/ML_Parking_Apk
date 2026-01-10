import api from './axiosConfig';

// ========== USER ENDPOINTS ==========

// Create a ticket for a user (vehicle entry)
export const createUserTicket = (ticketData) =>
  api.post('/ticketing/user/create', ticketData);

// Get all tickets for a user
export const getUserTickets = (email) =>
  api.get('/ticketing/user/tickets', { params: { email } });

// Get active tickets for a user
export const getUserActiveTickets = (email) =>
  api.get('/ticketing/user/tickets/active', { params: { email } });

// Get a specific ticket for a user (validates ownership)
export const getUserTicket = (ticketId, email) =>
  api.get(`/ticketing/user/tickets/${ticketId}`, { params: { email } });

// Exit a vehicle for a user (validates ownership)
export const exitUserVehicle = (ticketId, email) =>
  api.put(`/ticketing/user/exit/${ticketId}`, null, { params: { email } });

// ========== ADMIN ENDPOINTS ==========

// Get all tickets (admin only)
export const getAllTickets = () =>
  api.get('/ticketing/admin/tickets');

// Get all active tickets (admin only)
export const getAllActiveTickets = () =>
  api.get('/ticketing/admin/tickets/active');

// Get system statistics (admin only)
export const getSystemStats = () =>
  api.get('/ticketing/admin/stats');

// Get any ticket by ID (admin only)
export const getTicketAdmin = (ticketId) =>
  api.get(`/ticketing/admin/tickets/${ticketId}`);

// Exit any ticket (admin only)
export const exitTicketAdmin = (ticketId) =>
  api.put(`/ticketing/admin/exit/${ticketId}`);

// ========== LEGACY ENDPOINTS (backward compatible) ==========

// Get all tickets (legacy)
export const listTickets = () => api.get('/ticketing');

// Get ticket by ID (legacy)
export const getTicket = (ticketId) =>
  api.get("/ticketing/" + encodeURIComponent(ticketId));

// Create a new ticket (legacy - called internally by parking service)
export const createTicket = (spotId, vehicleNumber) =>
  api.post('/ticketing/create', null, {
    params: { spotId, vehicleNumber }
  });

// Mark ticket exit (legacy)
export const exitTicket = (ticketId) =>
  api.put("/ticketing/exit/" + encodeURIComponent(ticketId));
