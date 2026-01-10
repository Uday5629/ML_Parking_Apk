import api from './axiosConfig';

// ========== PUBLIC/USER ENDPOINTS ==========

// Get all parking levels (basic)
export const getLevels = () => api.get('/parking/levels');

// Get all parking levels with detailed spot information
export const getLevelsWithDetails = () => api.get('/parking/levels/details');

// Get all spots for a level (available and occupied)
export const getAllSpotsForLevel = (levelId) =>
  api.get(`/parking/levels/${levelId}/spots/all`);

// Get available spots by level (filtered by disability status)
export const getSpotsByLevel = (levelId, isDisabled = false) =>
  api.get(`/parking/spots/${encodeURIComponent(levelId)}`, {
    params: { isDisabled }
  });

// Get parking system stats (available to all users)
export const getParkingStats = () => api.get('/parking/stats');

// ========== ADMIN ENDPOINTS ==========

// Legacy: Add a parking level (without spots)
export const addLevel = (level) => api.post('/parking/levels', level);

// Create a new parking level WITH spots (atomic operation)
export const createLevelWithSpots = (levelRequest) =>
  api.post('/parking/levels/create', levelRequest);

// Add a single spot to an existing level
export const addSpotToLevel = (levelId, spotRequest) =>
  api.post(`/parking/levels/${levelId}/spots`, spotRequest);

// Enable a disabled spot (Admin only)
export const enableSpot = (spotId) =>
  api.put(`/parking/admin/spots/${spotId}/enable`);

// Disable a spot (Admin only)
export const disableSpot = (spotId) =>
  api.put(`/parking/admin/spots/${spotId}/disable`);

// Get detailed admin stats
export const getAdminParkingStats = () => api.get('/parking/admin/stats');

// Vehicle entry - allocate spot and create ticket (Admin only)
export const vehicleEntry = (levelId, vehicleNumber, isDisabled = false) =>
  api.post('/parking/entry', null, {
    params: { levelId, vehicleNumber, isDisabled }
  });

// Vehicle exit - process payment and release spot (Admin only)
export const vehicleExit = (ticketId) =>
  api.put('/parking/exit', null, {
    params: { ticketId }
  });
