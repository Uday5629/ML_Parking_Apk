import api from './axiosConfig';

export const registerVehicle = (vehicle) =>
  api.post('/vehicle-service/vehicles', vehicle);

export const getVehicle = (vehicleId) =>
  api.get(`/vehicle-service/vehicles/${encodeURIComponent(vehicleId)}`);

export const listVehicles = (params) =>
  api.get('/vehicle-service/vehicles', { params });

