import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getAllVehicles, deleteVehicle } from '../../api/vehicleService';

export default function VehiclesPage() {
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchVehicles = () => {
    setLoading(true);
    getAllVehicles()
      .then((res) => {
        setVehicles(res.data || []);
        setError(null);
      })
      .catch((err) => {
        if (err.response?.status === 204) {
          setVehicles([]);
        } else {
          setError(err.response?.data?.message || err.message);
        }
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchVehicles();
  }, []);

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this vehicle?')) return;

    try {
      await deleteVehicle(id);
      setMessage('Vehicle deleted successfully');
      fetchVehicles();
    } catch (err) {
      setError('Failed to delete: ' + (err.response?.data?.message || err.message));
    }
  };

  const filteredVehicles = vehicles.filter(v => {
    const searchLower = searchTerm.toLowerCase();
    return (
      (v.licensePlate && v.licensePlate.toLowerCase().includes(searchLower)) ||
      (v.type && v.type.toLowerCase().includes(searchLower)) ||
      (v.ownerName && v.ownerName.toLowerCase().includes(searchLower))
    );
  });

  return (
    <div className="container mt-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h4>Registered Vehicles</h4>
          <p className="text-muted mb-0">View and manage all registered vehicles</p>
        </div>
        <Link to="/vehicle/register" className="btn btn-primary">
          + Register Vehicle
        </Link>
      </div>

      {message && (
        <div className="alert alert-success alert-dismissible">
          {message}
          <button type="button" className="btn-close" onClick={() => setMessage(null)}></button>
        </div>
      )}
      {error && (
        <div className="alert alert-danger alert-dismissible">
          {error}
          <button type="button" className="btn-close" onClick={() => setError(null)}></button>
        </div>
      )}

      <div className="card mb-4">
        <div className="card-body">
          <div className="row align-items-center">
            <div className="col-md-6">
              <input
                type="text"
                className="form-control"
                placeholder="Search by license plate, type, or owner..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="col-md-6 text-end">
              <span className="text-muted">
                Showing {filteredVehicles.length} of {vehicles.length} vehicles
              </span>
            </div>
          </div>
        </div>
      </div>

      {loading && (
        <div className="text-center py-5">
          <div className="spinner-border" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      )}

      {!loading && vehicles.length === 0 && (
        <div className="alert alert-info">
          No vehicles registered yet. <Link to="/vehicle/register">Register one now</Link>.
        </div>
      )}

      {!loading && vehicles.length > 0 && filteredVehicles.length === 0 && (
        <div className="alert alert-warning">
          No vehicles match your search criteria.
        </div>
      )}

      {!loading && filteredVehicles.length > 0 && (
        <div className="table-responsive">
          <table className="table table-hover">
            <thead className="table-dark">
              <tr>
                <th>ID</th>
                <th>License Plate</th>
                <th>Type</th>
                <th>Owner</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredVehicles.map((vehicle) => (
                <tr key={vehicle.id}>
                  <td>{vehicle.id}</td>
                  <td>
                    <strong>{vehicle.licensePlate}</strong>
                  </td>
                  <td>
                    <span className={'badge ' + getTypeBadgeClass(vehicle.type)}>
                      {vehicle.type || 'Unknown'}
                    </span>
                  </td>
                  <td>{vehicle.ownerName || '-'}</td>
                  <td>
                    <button
                      className="btn btn-sm btn-outline-danger"
                      onClick={() => handleDelete(vehicle.id)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function getTypeBadgeClass(type) {
  switch (type?.toUpperCase()) {
    case 'CAR': return 'bg-primary';
    case 'BIKE': return 'bg-success';
    case 'TRUCK': return 'bg-warning text-dark';
    
    default: return 'bg-secondary';
  }
}
