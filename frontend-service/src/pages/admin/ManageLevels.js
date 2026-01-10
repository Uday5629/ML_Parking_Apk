import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getLevelsWithDetails, createLevelWithSpots, addSpotToLevel } from '../../api/parkingLotService';

export default function ManageLevels() {
  const [levels, setLevels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [showSpotForm, setShowSpotForm] = useState(null); // levelId when adding spot
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState(null);

  // Form state for creating level with spots
  const [formData, setFormData] = useState({
    levelNumber: '',
    name: '',
    totalSpots: 10,
    carSpots: 10,
    bikeSpots: 0,
    evSpots: 0,
    handicappedSpots: 0
  });

  // Form state for adding single spot
  const [spotFormData, setSpotFormData] = useState({
    spotCode: '',
    spotType: 'CAR',
    isDisabled: false
  });

  const fetchLevels = () => {
    setLoading(true);
    getLevelsWithDetails()
      .then((res) => {
        setLevels(res.data || []);
        setError(null);
      })
      .catch((err) => {
        // Fallback to empty if no levels exist
        if (err.response?.status === 404 || err.response?.status === 204) {
          setLevels([]);
        } else {
          setError(err.response?.data?.message || err.message);
        }
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchLevels();
  }, []);

  // Auto-calculate total spots when distribution changes
  useEffect(() => {
    const total = formData.carSpots + formData.bikeSpots + formData.evSpots + formData.handicappedSpots;
    if (total > 0) {
      setFormData(prev => ({ ...prev, totalSpots: total }));
    }
  }, [formData.carSpots, formData.bikeSpots, formData.evSpots, formData.handicappedSpots]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage(null);
    setError(null);

    try {
      // Validate
      if (!formData.levelNumber.trim()) {
        throw new Error('Level number is required');
      }
      if (formData.totalSpots <= 0) {
        throw new Error('Total spots must be greater than 0');
      }

      const levelRequest = {
        levelNumber: formData.levelNumber.trim(),
        name: formData.name.trim() || formData.levelNumber.trim(),
        totalSpots: formData.totalSpots,
        carSpots: formData.carSpots,
        bikeSpots: formData.bikeSpots,
        evSpots: formData.evSpots,
        handicappedSpots: formData.handicappedSpots
      };

      const response = await createLevelWithSpots(levelRequest);
      setMessage(`Level "${response.data.name}" created successfully with ${response.data.totalSpots} spots!`);
      setFormData({
        levelNumber: '',
        name: '',
        totalSpots: 10,
        carSpots: 10,
        bikeSpots: 0,
        evSpots: 0,
        handicappedSpots: 0
      });
      setShowForm(false);
      fetchLevels();
    } catch (err) {
      const errorMsg = err.response?.data?.message || err.message;
      setError('Failed to create level: ' + errorMsg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddSpot = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      if (!spotFormData.spotCode.trim()) {
        throw new Error('Spot code is required');
      }

      const spotRequest = {
        spotCode: spotFormData.spotCode.trim().toUpperCase(),
        spotType: spotFormData.spotType,
        isDisabled: spotFormData.isDisabled
      };

      await addSpotToLevel(showSpotForm, spotRequest);
      setMessage(`Spot "${spotRequest.spotCode}" added successfully!`);
      setSpotFormData({ spotCode: '', spotType: 'CAR', isDisabled: false });
      setShowSpotForm(null);
      fetchLevels();
    } catch (err) {
      const errorMsg = err.response?.data?.message || err.message;
      setError('Failed to add spot: ' + errorMsg);
    } finally {
      setSubmitting(false);
    }
  };

  const getTypeBadgeClass = (type) => {
    switch (type?.toUpperCase()) {
      case 'CAR': return 'bg-primary';
      case 'BIKE': return 'bg-success';
      case 'EV': return 'bg-info';
      case 'HANDICAPPED': return 'bg-warning text-dark';
      default: return 'bg-secondary';
    }
  };

  return (
    <div className="container mt-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h4>Manage Parking Levels</h4>
          <p className="text-muted mb-0">Add parking levels with spots and manage spot distribution</p>
        </div>
        <button
          className="btn btn-primary"
          onClick={() => { setShowForm(!showForm); setShowSpotForm(null); }}
        >
          {showForm ? 'Cancel' : '+ Add Level'}
        </button>
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

      {/* Create Level Form */}
      {showForm && (
        <div className="card mb-4 shadow-sm">
          <div className="card-header bg-primary text-white">
            <h6 className="mb-0">Create New Parking Level with Spots</h6>
          </div>
          <div className="card-body">
            <form onSubmit={handleSubmit}>
              <div className="row">
                <div className="col-md-6 mb-3">
                  <label className="form-label">Level Number *</label>
                  <input
                    type="text"
                    className="form-control"
                    value={formData.levelNumber}
                    onChange={(e) => setFormData({ ...formData, levelNumber: e.target.value })}
                    placeholder="e.g., L1, Level-1, Ground"
                    required
                  />
                  <small className="text-muted">Must be unique</small>
                </div>
                <div className="col-md-6 mb-3">
                  <label className="form-label">Display Name</label>
                  <input
                    type="text"
                    className="form-control"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Ground Floor, Basement 1"
                  />
                  <small className="text-muted">Optional, defaults to level number</small>
                </div>
              </div>

              <hr />
              <h6 className="mb-3">Spot Distribution</h6>
              <p className="text-muted small">
                Spots will be auto-generated with codes like A1, A2, A3...
              </p>

              <div className="row">
                <div className="col-md-3 mb-3">
                  <label className="form-label">
                    <span className="badge bg-primary me-2">CAR</span> Spots
                  </label>
                  <input
                    type="number"
                    className="form-control"
                    value={formData.carSpots}
                    onChange={(e) => setFormData({ ...formData, carSpots: parseInt(e.target.value) || 0 })}
                    min="0"
                    max="500"
                  />
                </div>
                <div className="col-md-3 mb-3">
                  <label className="form-label">
                    <span className="badge bg-success me-2">BIKE</span> Spots
                  </label>
                  <input
                    type="number"
                    className="form-control"
                    value={formData.bikeSpots}
                    onChange={(e) => setFormData({ ...formData, bikeSpots: parseInt(e.target.value) || 0 })}
                    min="0"
                    max="500"
                  />
                </div>
                <div className="col-md-3 mb-3">
                  <label className="form-label">
                    <span className="badge bg-info me-2">EV</span> Spots
                  </label>
                  <input
                    type="number"
                    className="form-control"
                    value={formData.evSpots}
                    onChange={(e) => setFormData({ ...formData, evSpots: parseInt(e.target.value) || 0 })}
                    min="0"
                    max="500"
                  />
                </div>
                <div className="col-md-3 mb-3">
                  <label className="form-label">
                    <span className="badge bg-warning text-dark me-2">HANDICAPPED</span>
                  </label>
                  <input
                    type="number"
                    className="form-control"
                    value={formData.handicappedSpots}
                    onChange={(e) => setFormData({ ...formData, handicappedSpots: parseInt(e.target.value) || 0 })}
                    min="0"
                    max="500"
                  />
                </div>
              </div>

              <div className="alert alert-info py-2">
                <strong>Total Spots: {formData.totalSpots}</strong>
                <span className="ms-3 small">
                  ({formData.carSpots} Car + {formData.bikeSpots} Bike + {formData.evSpots} EV + {formData.handicappedSpots} Handicapped)
                </span>
              </div>

              <button
                type="submit"
                className="btn btn-success"
                disabled={submitting || formData.totalSpots <= 0}
              >
                {submitting ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2"></span>
                    Creating...
                  </>
                ) : (
                  'Create Level with Spots'
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Add Single Spot Form */}
      {showSpotForm && (
        <div className="card mb-4 shadow-sm">
          <div className="card-header bg-success text-white">
            <h6 className="mb-0">Add Spot to Level</h6>
          </div>
          <div className="card-body">
            <form onSubmit={handleAddSpot}>
              <div className="row">
                <div className="col-md-4 mb-3">
                  <label className="form-label">Spot Code *</label>
                  <input
                    type="text"
                    className="form-control"
                    value={spotFormData.spotCode}
                    onChange={(e) => setSpotFormData({ ...spotFormData, spotCode: e.target.value })}
                    placeholder="e.g., Z1, PREMIUM-1"
                    required
                  />
                </div>
                <div className="col-md-4 mb-3">
                  <label className="form-label">Spot Type</label>
                  <select
                    className="form-select"
                    value={spotFormData.spotType}
                    onChange={(e) => setSpotFormData({ ...spotFormData, spotType: e.target.value })}
                  >
                    <option value="CAR">CAR</option>
                    <option value="BIKE">BIKE</option>
                    <option value="EV">EV</option>
                    <option value="HANDICAPPED">HANDICAPPED</option>
                  </select>
                </div>
                <div className="col-md-4 mb-3">
                  <label className="form-label">Accessibility</label>
                  <div className="form-check mt-2">
                    <input
                      type="checkbox"
                      className="form-check-input"
                      checked={spotFormData.isDisabled}
                      onChange={(e) => setSpotFormData({ ...spotFormData, isDisabled: e.target.checked })}
                      id="isDisabled"
                    />
                    <label className="form-check-label" htmlFor="isDisabled">
                      Handicapped Accessible
                    </label>
                  </div>
                </div>
              </div>
              <button type="submit" className="btn btn-success me-2" disabled={submitting}>
                {submitting ? 'Adding...' : 'Add Spot'}
              </button>
              <button type="button" className="btn btn-secondary" onClick={() => setShowSpotForm(null)}>
                Cancel
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="text-center py-5">
          <div className="spinner-border" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!loading && levels.length === 0 && (
        <div className="alert alert-info">
          No parking levels found. Click "Add Level" to create one with spots.
        </div>
      )}

      {/* Levels Grid */}
      {!loading && levels.length > 0 && (
        <div className="row">
          {levels.map((level) => (
            <div className="col-md-6 col-lg-4 mb-4" key={level.id}>
              <div className="card h-100 shadow-sm">
                <div className="card-header bg-light d-flex justify-content-between align-items-center">
                  <div>
                    <h5 className="mb-0">{level.name || level.levelNumber}</h5>
                    <small className="text-muted">ID: {level.levelNumber}</small>
                  </div>
                  <span className="badge bg-primary fs-6">{level.totalSpots} spots</span>
                </div>
                <div className="card-body">
                  {/* Availability Stats */}
                  <div className="d-flex justify-content-between mb-3">
                    <span className="badge bg-success">
                      {level.availableSpots} Available
                    </span>
                    <span className="badge bg-danger">
                      {level.occupiedSpots} Occupied
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div className="progress mb-3" style={{ height: '8px' }}>
                    <div
                      className="progress-bar bg-danger"
                      style={{ width: `${(level.occupiedSpots / level.totalSpots) * 100}%` }}
                    ></div>
                  </div>

                  {/* Spots by Type */}
                  {level.spotsByType && Object.keys(level.spotsByType).length > 0 && (
                    <div className="mb-3">
                      <small className="text-muted d-block mb-2">Spots by Type:</small>
                      <div className="d-flex flex-wrap gap-1">
                        {Object.entries(level.spotsByType).map(([type, count]) => (
                          <span key={type} className={`badge ${getTypeBadgeClass(type)}`}>
                            {type}: {count}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="d-flex gap-2">
                    <Link
                      to={`/levels/${level.id}/spots`}
                      className="btn btn-sm btn-outline-primary flex-grow-1"
                    >
                      View Spots
                    </Link>
                    <button
                      className="btn btn-sm btn-outline-success"
                      onClick={() => {
                        setShowSpotForm(level.id);
                        setShowForm(false);
                        setSpotFormData({ spotCode: '', spotType: 'CAR', isDisabled: false });
                      }}
                    >
                      + Spot
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
