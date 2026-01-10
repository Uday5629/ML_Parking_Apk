import api from './axiosConfig';

// ========== User Endpoints ==========

// Create a new reservation
export const createReservation = (data) =>
  api.post('/reservations', data);

// Get all user's reservations
export const getUserReservations = (email) =>
  api.get('/reservations', { params: { email } });

// Get user's active/upcoming reservations
export const getUserActiveReservations = (email) =>
  api.get('/reservations/active', { params: { email } });

// Get a specific reservation
export const getReservation = (id, email) =>
  api.get(`/reservations/${id}`, { params: { email } });

// Cancel a reservation
export const cancelReservation = (id, email) =>
  api.delete(`/reservations/${id}`, { params: { email } });

// Check in to a reservation
export const checkInReservation = (id, email) =>
  api.post(`/reservations/${id}/check-in`, null, { params: { email } });

// ========== Availability Endpoints ==========

// Get available time slots for a spot on a date
export const getAvailableSlots = (spotId, date) =>
  api.get('/reservations/slots', { params: { spotId, date } });

// Check if a specific slot is available
export const checkSlotAvailability = (spotId, startTime, endTime) =>
  api.get('/reservations/check-availability', {
    params: { spotId, startTime, endTime }
  });

// Get spot IDs currently blocked by reservations for a level
export const getBlockedSpots = (levelId) =>
  api.get('/reservations/blocked-spots', { params: { levelId } });

// ========== Admin Endpoints ==========

// Get all reservations (admin)
export const getAllReservations = () =>
  api.get('/reservations/admin/all');
