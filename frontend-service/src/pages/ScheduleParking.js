import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getLevelsWithDetails, getSpotsByLevel } from '../api/parkingLotService';
import { createReservation, getAvailableSlots } from '../api/reservationService';
import Loading from '../components/Loading';
import ErrorMessage from '../components/ErrorMessage';

export default function ScheduleParking() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Form state
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [levelId, setLevelId] = useState('');
  const [spotId, setSpotId] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [duration, setDuration] = useState(60); // minutes

  // Data state
  const [levels, setLevels] = useState([]);
  const [spots, setSpots] = useState([]);
  const [availableSlots, setAvailableSlots] = useState([]);

  // UI state
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [spotsLoading, setSpotsLoading] = useState(false);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Set default date to today
  useEffect(() => {
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0];
    setSelectedDate(dateStr);
  }, []);

  // Load levels on mount
  useEffect(() => {
    getLevelsWithDetails()
      .then(res => {
        const data = res.data || [];
        setLevels(data);
        if (data.length > 0) {
          setLevelId(data[0].id || data[0].levelId);
        }
      })
      .catch(err => {
        console.error('Failed to load levels:', err);
        setError(err);
      });
  }, []);

  // Load spots when level changes
  useEffect(() => {
    if (!levelId) {
      setSpots([]);
      return;
    }

    setSpotsLoading(true);
    getSpotsByLevel(levelId, false)
      .then(res => {
        const allSpots = res.data || [];
        // Show all spots (we'll check availability per slot)
        setSpots(allSpots.filter(s => !s.isDisabled && !s.disabled));
      })
      .catch(err => {
        console.error('Failed to load spots:', err);
        setSpots([]);
      })
      .finally(() => setSpotsLoading(false));
  }, [levelId]);

  // Load available slots when spot and date are selected
  const loadAvailableSlots = useCallback(async () => {
    if (!spotId || !selectedDate) return;

    setSlotsLoading(true);
    try {
      const res = await getAvailableSlots(spotId, selectedDate);
      setAvailableSlots(res.data?.availableSlots || []);
    } catch (err) {
      console.error('Failed to load slots:', err);
      setAvailableSlots([]);
    } finally {
      setSlotsLoading(false);
    }
  }, [spotId, selectedDate]);

  useEffect(() => {
    loadAvailableSlots();
  }, [loadAvailableSlots]);

  // Generate time options (30-min intervals from 6 AM to 10 PM)
  const generateTimeOptions = () => {
    const options = [];
    for (let h = 6; h < 22; h++) {
      for (let m = 0; m < 60; m += 30) {
        const time = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
        options.push(time);
      }
    }
    return options;
  };

  // Check if a time slot is available
  const isTimeSlotAvailable = (time) => {
    if (!availableSlots.length) return true; // If no slot data, assume available

    const [hours, mins] = time.split(':').map(Number);
    const slotStart = new Date(`${selectedDate}T${time}:00`);
    const slotEnd = new Date(slotStart.getTime() + duration * 60000);

    // Check if any available slot covers this time
    return availableSlots.some(slot => {
      const availStart = new Date(slot.start);
      const availEnd = new Date(slot.end);
      return slotStart >= availStart && slotEnd <= availEnd;
    });
  };

  // Calculate end time
  const getEndTime = () => {
    if (!startTime) return '';
    const [hours, mins] = startTime.split(':').map(Number);
    const start = new Date(`${selectedDate}T${startTime}:00`);
    const end = new Date(start.getTime() + duration * 60000);
    return `${end.getHours().toString().padStart(2, '0')}:${end.getMinutes().toString().padStart(2, '0')}`;
  };

  // Get min date (today)
  const getMinDate = () => {
    return new Date().toISOString().split('T')[0];
  };

  // Get max date (3 days from now)
  const getMaxDate = () => {
    const max = new Date();
    max.setDate(max.getDate() + 3);
    return max.toISOString().split('T')[0];
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (!user?.email || !user?.id) {
      setError({ message: 'You must be logged in to make a reservation' });
      setLoading(false);
      return;
    }

    try {
      const startDateTime = `${selectedDate}T${startTime}:00`;
      const endTime = getEndTime();
      const endDateTime = `${selectedDate}T${endTime}:00`;

      const reservationData = {
        userId: String(user.id),
        userEmail: user.email,
        vehicleNumber: vehicleNumber.trim().toUpperCase(),
        spotId: Number(spotId),
        levelId: Number(levelId),
        startTime: startDateTime,
        endTime: endDateTime
      };

      const res = await createReservation(reservationData);
      setSuccess(res.data);

      // Navigate to reservations page after 2 seconds
      setTimeout(() => {
        navigate('/reservations');
      }, 2000);

    } catch (err) {
      const message = err.response?.data?.error || err.response?.data?.message || err.message;
      setError({ message });
    } finally {
      setLoading(false);
    }
  };

  const selectedLevel = levels.find(l => (l.id || l.levelId) == levelId);
  const selectedSpot = spots.find(s => (s.id || s.spotId) == spotId);

  return (
    <div className="container mt-4">
      <div className="row justify-content-center">
        <div className="col-lg-10">
          <div className="card shadow">
            <div className="card-header bg-warning text-dark">
              <h5 className="mb-0">
                <i className="bi bi-calendar-check me-2"></i>
                Schedule Parking in Advance
              </h5>
            </div>
            <div className="card-body">
              {/* Progress Steps */}
              <div className="d-flex justify-content-center mb-4">
                <div className="d-flex align-items-center">
                  <span className={`badge rounded-pill ${step >= 1 ? 'bg-warning text-dark' : 'bg-secondary'} px-3 py-2`}>
                    1. Date & Time
                  </span>
                  <div className="mx-2 text-muted">→</div>
                  <span className={`badge rounded-pill ${step >= 2 ? 'bg-warning text-dark' : 'bg-secondary'} px-3 py-2`}>
                    2. Select Spot
                  </span>
                  <div className="mx-2 text-muted">→</div>
                  <span className={`badge rounded-pill ${step >= 3 ? 'bg-warning text-dark' : 'bg-secondary'} px-3 py-2`}>
                    3. Confirm
                  </span>
                </div>
              </div>

              {/* User Info */}
              {user && (
                <div className="alert alert-info mb-4">
                  <strong>Booking as:</strong> {user.name} ({user.email})
                </div>
              )}

              {success && (
                <div className="alert alert-success">
                  <h5 className="alert-heading">Reservation Confirmed!</h5>
                  <p className="mb-0">Your parking spot has been reserved. Redirecting to your reservations...</p>
                </div>
              )}

              {error && <ErrorMessage error={error} onRetry={() => setError(null)} />}

              <form onSubmit={handleSubmit}>
                {/* Step 1: Date & Time */}
                {step === 1 && (
                  <div className="row">
                    <div className="col-md-6 mb-3">
                      <label className="form-label fw-semibold">Date *</label>
                      <input
                        type="date"
                        className="form-control form-control-lg"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        min={getMinDate()}
                        max={getMaxDate()}
                        required
                      />
                      <small className="text-muted">Book up to 3 days in advance</small>
                    </div>

                    <div className="col-md-6 mb-3">
                      <label className="form-label fw-semibold">Start Time *</label>
                      <select
                        className="form-select form-select-lg"
                        value={startTime}
                        onChange={(e) => setStartTime(e.target.value)}
                        required
                      >
                        <option value="">Select time</option>
                        {generateTimeOptions().map(time => (
                          <option key={time} value={time}>
                            {time}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="col-md-6 mb-3">
                      <label className="form-label fw-semibold">Duration *</label>
                      <select
                        className="form-select form-select-lg"
                        value={duration}
                        onChange={(e) => setDuration(Number(e.target.value))}
                      >
                        <option value={30}>30 minutes</option>
                        <option value={60}>1 hour</option>
                        <option value={90}>1.5 hours</option>
                        <option value={120}>2 hours</option>
                        <option value={150}>2.5 hours</option>
                        <option value={180}>3 hours</option>
                        <option value={210}>3.5 hours</option>
                        <option value={240}>4 hours (max)</option>
                      </select>
                    </div>

                    <div className="col-md-6 mb-3">
                      <label className="form-label fw-semibold">End Time</label>
                      <input
                        type="text"
                        className="form-control form-control-lg bg-light"
                        value={startTime ? getEndTime() : '--:--'}
                        disabled
                      />
                    </div>

                    <div className="col-12">
                      <button
                        type="button"
                        className="btn btn-warning btn-lg"
                        onClick={() => setStep(2)}
                        disabled={!selectedDate || !startTime}
                      >
                        Next: Select Spot <i className="bi bi-arrow-right ms-2"></i>
                      </button>
                    </div>
                  </div>
                )}

                {/* Step 2: Select Spot */}
                {step === 2 && (
                  <div>
                    <div className="d-flex justify-content-between align-items-center mb-3">
                      <button
                        type="button"
                        className="btn btn-outline-secondary"
                        onClick={() => setStep(1)}
                      >
                        <i className="bi bi-arrow-left me-1"></i> Back
                      </button>
                      <span className="text-muted">
                        {selectedDate} at {startTime} - {getEndTime()}
                      </span>
                    </div>

                    <div className="row mb-3">
                      <div className="col-md-6 mb-3">
                        <label className="form-label fw-semibold">Parking Level *</label>
                        <select
                          className="form-select form-select-lg"
                          value={levelId}
                          onChange={(e) => {
                            setLevelId(e.target.value);
                            setSpotId('');
                          }}
                          required
                        >
                          {levels.length === 0 && <option value="">No levels available</option>}
                          {levels.map((l) => (
                            <option key={l.id || l.levelId} value={l.id || l.levelId}>
                              {l.name || `Level ${l.levelNumber || l.id || l.levelId}`}
                              {l.availableSpots !== undefined && ` (${l.availableSpots} spots)`}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="col-md-6 mb-3">
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
                      </div>
                    </div>

                    {/* Spot Selection */}
                    <div className="mb-4">
                      <label className="form-label fw-semibold">Select Parking Spot *</label>
                      {spotsLoading ? (
                        <Loading text="Loading spots..." />
                      ) : spots.length === 0 ? (
                        <div className="alert alert-warning">
                          No spots available on this level.
                        </div>
                      ) : (
                        <div className="row g-2">
                          {spots.map((spot) => {
                            const id = spot.id || spot.spotId;
                            const code = spot.spotCode || spot.spotNumber || `S${id}`;
                            const isSelected = spotId == id;

                            return (
                              <div key={id} className="col-4 col-md-2">
                                <div
                                  className={`card text-center ${
                                    isSelected
                                      ? 'border-warning bg-warning text-dark'
                                      : 'border-secondary'
                                  }`}
                                  style={{ cursor: 'pointer' }}
                                  onClick={() => setSpotId(id)}
                                >
                                  <div className="card-body p-2">
                                    <strong>{code}</strong>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    <button
                      type="button"
                      className="btn btn-warning btn-lg"
                      onClick={() => setStep(3)}
                      disabled={!spotId || !vehicleNumber}
                    >
                      Next: Review <i className="bi bi-arrow-right ms-2"></i>
                    </button>
                  </div>
                )}

                {/* Step 3: Confirm */}
                {step === 3 && (
                  <div>
                    <div className="d-flex justify-content-between align-items-center mb-3">
                      <button
                        type="button"
                        className="btn btn-outline-secondary"
                        onClick={() => setStep(2)}
                      >
                        <i className="bi bi-arrow-left me-1"></i> Back
                      </button>
                    </div>

                    <div className="card bg-light mb-4">
                      <div className="card-header">
                        <h5 className="mb-0">Reservation Summary</h5>
                      </div>
                      <div className="card-body">
                        <div className="row">
                          <div className="col-md-6">
                            <p><strong>Date:</strong> {selectedDate}</p>
                            <p><strong>Time:</strong> {startTime} - {getEndTime()}</p>
                            <p><strong>Duration:</strong> {duration} minutes</p>
                          </div>
                          <div className="col-md-6">
                            <p><strong>Level:</strong> {selectedLevel?.name || `Level ${levelId}`}</p>
                            <p><strong>Spot:</strong> {selectedSpot?.spotCode || `Spot ${spotId}`}</p>
                            <p><strong>Vehicle:</strong> {vehicleNumber}</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="alert alert-info">
                      <i className="bi bi-info-circle me-2"></i>
                      <strong>Check-in Window:</strong> You can check in from 10 minutes before to 10 minutes after your scheduled start time.
                      If you don't check in, your reservation will expire automatically.
                    </div>

                    <div className="d-grid gap-2">
                      <button
                        type="submit"
                        className="btn btn-success btn-lg"
                        disabled={loading}
                      >
                        {loading ? (
                          <>
                            <span className="spinner-border spinner-border-sm me-2"></span>
                            Creating Reservation...
                          </>
                        ) : (
                          <>
                            <i className="bi bi-check-circle me-2"></i>
                            Confirm Reservation
                          </>
                        )}
                      </button>
                      <button
                        type="button"
                        className="btn btn-outline-secondary"
                        onClick={() => navigate('/')}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
