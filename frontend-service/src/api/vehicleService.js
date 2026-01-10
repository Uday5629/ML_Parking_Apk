import api from './axiosConfig';

// Save/register a new vehicle
export const registerVehicle = (vehicle) =>
  api.post('/vehicle/save', vehicle);

// Get all vehicles
export const getAllVehicles = () => api.get('/vehicle/all');

// Get vehicle by license plate
export const getVehicleByLicense = (licensePlate) =>
  api.get("/vehicle/" + encodeURIComponent(licensePlate));

// Delete a vehicle
export const deleteVehicle = (id) =>
  api.delete("/vehicle/" + encodeURIComponent(id));
