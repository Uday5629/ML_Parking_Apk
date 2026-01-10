import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getLevelsWithDetails, getSpotsByLevel } from '../api/parkingLotService';
import { createUserTicket } from '../api/ticketService';
import { getBlockedSpots } from '../api/reservationService';

export default function CreateTicket() {
  const { user } = useAuth();
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [levelId, setLevelId] = useState('');
  const [spotId, setSpotId] = useState('');
  const [isDisabled, setIsDisabled] = useState(false);
  const [levels, setLevels] = useState([]);
  const [availableSpots, setAvailableSpots] = useState([]);
  const [blockedSpotIds, setBlockedSpotIds] = useState([]);
  const [loading, setLoading] = useState(false);
  const [spotsLoading, setSpotsLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  // Load parking levels
  useEffect(() => {
    getLevelsWithDetails()
      .then((res) => {
        const data = res.data || [];
        setLevels(data);
        if (data.length > 0) {
          setLevelId(data[0].id || data[0].levelId);
        }
      })
      .catch((err) => {
        console.error('Failed to load levels:', err);
        setLevels([]);
      });
  }, []);

  // Load available spots and blocked spots when level changes
  useEffect(() => {
    if (!levelId) {
      setAvailableSpots([]);
      setBlockedSpotIds([]);
      setSpotId('');
      return;
    }

    setSpotsLoading(true);
    setBlockedSpotIds([]);

    // Fetch both spots and blocked spots in parallel
    Promise.all([
      getSpotsByLevel(levelId, isDisabled),
      getBlockedSpots(levelId)
    ])
      .then(([spotsRes, blockedRes]) => {
        const spots = spotsRes.data || [];
        const blocked = blockedRes.data?.blockedSpotIds || [];

        setBlockedSpotIds(blocked);

        // Filter to only available spots (not occupied and not disabled)
        const available = spots.filter(
          s => s.status === 'AVAILABLE' || (!s.isOccupied && !s.isDisabled)
        );
        setAvailableSpots(available);

        // Auto-select first truly available spot (not blocked by reservation)
        const firstAvailable = available.find(s => !blocked.includes(s.id || s.spotId));
        if (firstAvailable) {
          setSpotId(firstAvailable.id || firstAvailable.spotId);
        } else if (available.length > 0) {
          setSpotId(''); // Don't auto-select blocked spots
        } else {
          setSpotId('');
        }
      })
      .catch((err) => {
        console.error('Failed to load spots:', err);
        setAvailableSpots([]);
        setBlockedSpotIds([]);
        setSpotId('');
      })
      .finally(() => setSpotsLoading(false));
  }, [levelId, isDisabled]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    if (!user?.email || !user?.id) {
      setError('You must be logged in to create a ticket');
      setLoading(false);
      return;
    }

    if (!spotId) {
      setError('Please select an available parking spot');
      setLoading(false);
      return;
    }

    // Check if the selected spot is blocked by a reservation
    if (blockedSpotIds.includes(Number(spotId))) {
      setError('This spot is currently reserved. Please select a different spot.');
      setLoading(false);
      return;
    }

    try {
      const ticketData = {
        userId: String(user.id),
        userEmail: user.email,
        vehicleNumber: vehicleNumber.trim().toUpperCase(),
        spotId: Number(spotId),
        levelId: Number(levelId)
      };

      const res = await createUserTicket(ticketData);
      const ticketId = res.data?.id || res.data?.ticketId;
      setMessage(`Ticket created successfully! Ticket ID: #${ticketId}`);
      setTimeout(() => navigate('/my-tickets'), 1500);
    } catch (err) {
      const errorMsg = err.response?.data?.error || err.response?.data?.message || err.message || 'Failed to create ticket';
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const selectedLevel = levels.find(l => (l.id || l.levelId) == levelId);

  // Check if a spot is blocked by reservation
  const isSpotBlocked = (spot) => {
    const id = spot.id || spot.spotId;
    return blockedSpotIds.includes(id);
  };

  // Count truly available spots (not blocked)
  const trulyAvailableCount = availableSpots.filter(s => !isSpotBlocked(s)).length;

  return (
    <div className="container mt-4">
      <div className="row justify-content-center">
        <div className="col-md-8">
          <div className="card shadow">
            <div className="card-header bg-success text-white">
              <h5 className="mb-0">Park Your Vehicle</h5>
            </div>
            <div className="card-body">
              {/* User Info */}
              {user && (
                <div className="alert alert-info mb-4">
                  <strong>Parking as:</strong> {user.name} ({user.email})
                </div>
              )}

              {message && (
                <div className="alert alert-success alert-dismissible fade show">
                  {message}
                  <button type="button" className="btn-close" onClick={() => setMessage(null)}></button>
                </div>
              )}
              {error && (
                <div className="alert alert-danger alert-dismissible fade show">
                  {error}
                  <button type="button" className="btn-close" onClick={() => setError(null)}></button>
                </div>
              )}

              <form onSubmit={handleSubmit}>
                <div className="row">
                  <div className="col-md-6">
                    <div className="mb-3">
                      <label className="form-label fw-semibold">Vehicle Number *</label>
                      <input
                        type="text"
                        className="form-control form-control-lg"
                        value={vehicleNumber}
                        onChange={(e) => setVehicleNumber(e.target.value.toUpperCase())}
                        placeholder="e.g., KA01AB1234"
                        required
                        maxLength={15}
                      />
                      <small className="text-muted">Enter your vehicle registration number</small>
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="mb-3">
                      <label className="form-label fw-semibold">Parking Level *</label>
                      <select
                        className="form-select form-select-lg"
                        value={levelId}
                        onChange={(e) => setLevelId(e.target.value)}
                        required
                      >
                        {levels.length === 0 && <option value="">No levels available</option>}
                        {levels.map((l) => (
                          <option key={l.id || l.levelId} value={l.id || l.levelId}>
                            {l.name || `Level ${l.levelNumber || l.id || l.levelId}`}
                            {l.availableSpots !== undefined && ` (${l.availableSpots} spots free)`}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                <div className="mb-3">
                  <div className="form-check">
                    <input
                      type="checkbox"
                      className="form-check-input"
                      id="isDisabled"
                      checked={isDisabled}
                      onChange={(e) => setIsDisabled(e.target.checked)}
                    />
                    <label className="form-check-label" htmlFor="isDisabled">
                      I need an accessible parking spot (disability-friendly)
                    </label>
                  </div>
                </div>

                {/* Spot Selection */}
                <div className="mb-4">
                  <label className="form-label fw-semibold">
                    Select Parking Spot *
                    {blockedSpotIds.length > 0 && (
                      <span className="text-warning ms-2">
                        ({blockedSpotIds.length} spot{blockedSpotIds.length > 1 ? 's' : ''} reserved)
                      </span>
                    )}
                  </label>
                  {spotsLoading ? (
                    <div className="text-center py-3">
                      <div className="spinner-border spinner-border-sm text-primary" role="status">
                        <span className="visually-hidden">Loading spots...</span>
                      </div>
                      <span className="ms-2 text-muted">Loading available spots...</span>
                    </div>
                  ) : availableSpots.length === 0 ? (
                    <div className="alert alert-warning">
                      No available spots on this level
                      {isDisabled && ' for accessible parking'}. Please try another level.
                    </div>
                  ) : trulyAvailableCount === 0 ? (
                    <div className="alert alert-warning">
                      All spots on this level are either occupied or reserved. Please try another level.
                    </div>
                  ) : (
                    <>
                      {/* Legend */}
                      <div className="d-flex gap-3 mb-2 small">
                        <span><span className="badge bg-success">&nbsp;</span> Selected</span>
                        <span><span className="badge bg-secondary">&nbsp;</span> Available</span>
                        <span><span className="badge bg-warning text-dark">&nbsp;</span> Reserved</span>
                      </div>
                      <div className="row g-2">
                        {availableSpots.map((spot) => {
                          const id = spot.id || spot.spotId;
                          const isBlocked = isSpotBlocked(spot);
                          const isSelected = spotId == id;

                          return (
                            <div key={id} className="col-4 col-md-2">
                              <div
                                className={`card text-center ${
                                  isBlocked
                                    ? 'border-warning bg-warning text-dark opacity-75'
                                    : isSelected
                                      ? 'border-success bg-success text-white'
                                      : 'border-secondary'
                                }`}
                                style={{
                                  cursor: isBlocked ? 'not-allowed' : 'pointer',
                                  opacity: isBlocked ? 0.6 : 1
                                }}
                                onClick={() => !isBlocked && setSpotId(id)}
                                title={isBlocked ? 'This spot is currently reserved' : 'Click to select'}
                              >
                                <div className="card-body p-2">
                                  <strong>{spot.spotCode || spot.spotNumber || `S${id}`}</strong>
                                  {spot.isDisabled && (
                                    <div>
                                      <small className="text-info">Accessible</small>
                                    </div>
                                  )}
                                  {isBlocked && (
                                    <div>
                                      <small>Reserved</small>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>

                {/* Level Info */}
                {selectedLevel && (
                  <div className="card bg-light mb-4">
                    <div className="card-body">
                      <div className="row text-center">
                        <div className="col-3">
                          <h5 className="mb-0 text-primary">{selectedLevel.totalSpots || 0}</h5>
                          <small className="text-muted">Total</small>
                        </div>
                        <div className="col-3">
                          <h5 className="mb-0 text-success">{trulyAvailableCount}</h5>
                          <small className="text-muted">Available</small>
                        </div>
                        <div className="col-3">
                          <h5 className="mb-0 text-warning">{blockedSpotIds.length}</h5>
                          <small className="text-muted">Reserved</small>
                        </div>
                        <div className="col-3">
                          <h5 className="mb-0 text-danger">{selectedLevel.occupiedSpots || 0}</h5>
                          <small className="text-muted">Occupied</small>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="d-grid gap-2">
                  <button
                    className="btn btn-success btn-lg"
                    type="submit"
                    disabled={loading || levels.length === 0 || !spotId || blockedSpotIds.includes(Number(spotId))}
                  >
                    {loading ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2"></span>
                        Creating Ticket...
                      </>
                    ) : (
                      'Create Parking Ticket'
                    )}
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    onClick={() => navigate('/my-tickets')}
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
