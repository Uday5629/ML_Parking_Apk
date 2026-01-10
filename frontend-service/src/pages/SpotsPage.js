import React, { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getSpotsByLevel } from '../api/parkingLotService';
import Loading from '../components/Loading';
import ErrorMessage from '../components/ErrorMessage';

export default function SpotsPage() {
  const { levelId } = useParams();
  const [spots, setSpots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAccessible, setShowAccessible] = useState(false);

  const fetchSpots = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getSpotsByLevel(levelId, showAccessible);
      setSpots(res.data || []);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [levelId, showAccessible]);

  useEffect(() => {
    fetchSpots();
  }, [fetchSpots]);

  const getSpotStatusClass = (spot) => {
    if (spot.occupied || spot.isOccupied) return 'bg-danger';
    if (spot.disabled || spot.isDisabled || spot.spotType === 'HANDICAPPED') return 'bg-warning';
    return 'bg-success';
  };

  const getSpotStatusText = (spot) => {
    if (spot.occupied || spot.isOccupied) return 'Occupied';
    if (spot.disabled || spot.isDisabled) return 'Disabled';
    return 'Available';
  };

  const getSpotTypeIcon = (spot) => {
    const spotType = spot.spotType || spot.type || 'CAR';
    switch (spotType) {
      case 'BIKE': return 'bi-bicycle';
      case 'EV': return 'bi-lightning-charge';
      case 'HANDICAPPED': return 'bi-person-wheelchair';
      default: return 'bi-car-front';
    }
  };

  // Calculate stats
  const availableCount = spots.filter(s => !s.occupied && !s.isOccupied && !s.disabled && !s.isDisabled).length;
  const occupiedCount = spots.filter(s => s.occupied || s.isOccupied).length;
  const accessibleCount = spots.filter(s => s.spotType === 'HANDICAPPED' || s.disabled || s.isDisabled).length;

  return (
    <div className="container mt-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <Link to="/levels" className="btn btn-outline-secondary btn-sm me-2">
            <i className="bi bi-arrow-left me-1"></i>Back
          </Link>
          <span className="fs-5">Level {levelId} - Parking Spots</span>
        </div>
        <div className="d-flex align-items-center gap-3">
          <div className="form-check">
            <input
              type="checkbox"
              className="form-check-input"
              id="showAccessible"
              checked={showAccessible}
              onChange={(e) => setShowAccessible(e.target.checked)}
            />
            <label className="form-check-label" htmlFor="showAccessible">
              Accessible Spots Only
            </label>
          </div>
          {!loading && (
            <button
              className="btn btn-outline-primary btn-sm"
              onClick={fetchSpots}
              disabled={loading}
            >
              Refresh
            </button>
          )}
        </div>
      </div>

      {loading && <Loading text="Loading parking spots..." />}

      {error && <ErrorMessage error={error} onRetry={fetchSpots} />}

      {!loading && !error && spots.length === 0 && (
        <div className="alert alert-info">
          <h5 className="alert-heading">No Spots Found</h5>
          <p className="mb-0">
            {showAccessible
              ? 'No accessible spots are available on this level.'
              : 'There are no parking spots configured for this level yet.'}
          </p>
        </div>
      )}

      {!loading && !error && spots.length > 0 && (
        <>
          {/* Legend and Stats */}
          <div className="card mb-4 shadow-sm">
            <div className="card-body py-2">
              <div className="row align-items-center">
                <div className="col-md-6">
                  <span className="badge bg-success me-2">Available ({availableCount})</span>
                  <span className="badge bg-danger me-2">Occupied ({occupiedCount})</span>
                  <span className="badge bg-warning text-dark me-2">Accessible ({accessibleCount})</span>
                </div>
                <div className="col-md-6 text-md-end mt-2 mt-md-0">
                  <small className="text-muted">
                    Total: {spots.length} spots
                  </small>
                </div>
              </div>
            </div>
          </div>

          {/* Spots Grid */}
          <div className="row">
            {spots.map((spot) => {
              const spotId = spot.id || spot.spotId;
              const spotCode = spot.spotCode || spot.spotNumber || spotId;
              const isOccupied = spot.occupied || spot.isOccupied;
              const isAccessible = spot.spotType === 'HANDICAPPED' || spot.disabled || spot.isDisabled;

              return (
                <div className="col-6 col-md-3 col-lg-2 mb-3" key={spotId}>
                  <div
                    className={`card text-center h-100 ${getSpotStatusClass(spot)}`}
                    style={{ cursor: isOccupied ? 'not-allowed' : 'pointer' }}
                  >
                    <div className="card-body text-white py-3">
                      <i className={`bi ${getSpotTypeIcon(spot)} fs-5 mb-1 d-block`}></i>
                      <h6 className="card-title mb-1">{spotCode}</h6>
                      <small>{getSpotStatusText(spot)}</small>
                      {isAccessible && !isOccupied && (
                        <div className="mt-1">
                          <i className="bi bi-person-wheelchair small"></i>
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
  );
}
