import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { registerVehicle } from '../api/vehicleService';
export default function RegisterVehiclePage() {
  const [licensePlate, setLicensePlate] = useState('');
  const [vehicleType, setVehicleType] = useState('CAR');
  const [ownerName, setOwnerName] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const vehicle = {
        licensePlate: licensePlate.toUpperCase(),
        type: vehicleType,
        ownerName: ownerName || undefined
      };
      await registerVehicle(vehicle);
      setMessage('Vehicle registered successfully!');
      setLicensePlate('');
      setOwnerName('');
    } catch (err) {
      setError('Registration failed: ' + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className="container mt-4">
      <div className="row justify-content-center">
        <div className="col-md-6">
          <div className="card shadow">
            <div className="card-header bg-info text-white">
              <h5 className="mb-0">Register Vehicle</h5>
            </div>
            <div className="card-body">
              {message && <div className="alert alert-success">{message}</div>}
              {error && <div className="alert alert-danger">{error}</div>}
              <form onSubmit={handleSubmit}>
                <div className="mb-3">
                  <label className="form-label">License Plate Number</label>
                  <input
                    type="text"
                    className="form-control"
                    value={licensePlate}
                    onChange={(e) => setLicensePlate(e.target.value)}
                    placeholder="e.g., KA01AB1234"
                    required
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label">Vehicle Type</label>
                  <select
                    className="form-select"
                    value={vehicleType}
                    onChange={(e) => setVehicleType(e.target.value)}
                  >
                    <option value="CAR">Car</option>
                    <option value="BIKE">Bike</option>
                    <option value="TRUCK">Truck</option>
                  </select>
                </div>
                <div className="mb-3">
                  <label className="form-label">Owner Name (Optional)</label>
                  <input
                    type="text"
                    className="form-control"
                    value={ownerName}
                    onChange={(e) => setOwnerName(e.target.value)}
                    placeholder="Enter owner name"
                  />
                </div>
                <div className="d-grid gap-2">
                  <button
                    className="btn btn-info text-white"
                    type="submit"
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2"></span>
                        Registering...
                      </>
                    ) : (
                      'Register Vehicle'
                    )}
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => navigate('/')}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
