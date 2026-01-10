import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { getLevels } from '../api/parkingLotService';
import Loading from '../components/Loading';
import ErrorMessage from '../components/ErrorMessage';

export default function LevelsPage() {
  const [levels, setLevels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchLevels = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getLevels();
      setLevels(res.data || []);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLevels();
  }, [fetchLevels]);

  return (
    <div className="container mt-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h4>Parking Levels</h4>
        {!loading && (
          <button
            className="btn btn-outline-primary btn-sm"
            onClick={fetchLevels}
            disabled={loading}
          >
            Refresh
          </button>
        )}
      </div>

      {loading && <Loading text="Loading parking levels..." />}

      {error && <ErrorMessage error={error} onRetry={fetchLevels} />}

      {!loading && !error && levels.length === 0 && (
        <div className="alert alert-info">
          <h5 className="alert-heading">No Parking Levels Found</h5>
          <p className="mb-0">There are no parking levels configured in the system yet.</p>
        </div>
      )}

      {!loading && !error && levels.length > 0 && (
        <div className="row">
          {levels.map((lvl) => {
            const levelId = lvl.id || lvl.levelId;
            const availableSpots = lvl.availableSpots ?? lvl.totalSpots ?? 0;
            const totalSpots = lvl.totalSpots ?? 0;

            return (
              <div className="col-md-4 mb-3" key={levelId}>
                <div className="card h-100 shadow-sm">
                  <div className="card-body">
                    <h5 className="card-title">{lvl.name || `Level ${levelId}`}</h5>
                    <div className="mb-3">
                      {totalSpots > 0 && (
                        <>
                          <div className="d-flex justify-content-between mb-1">
                            <small className="text-muted">Availability</small>
                            <small className="text-muted">{availableSpots} / {totalSpots}</small>
                          </div>
                          <div className="progress" style={{ height: '8px' }}>
                            <div
                              className="progress-bar bg-success"
                              style={{ width: `${(availableSpots / totalSpots) * 100}%` }}
                            />
                          </div>
                        </>
                      )}
                      {totalSpots === 0 && (
                        <p className="text-muted small mb-0">No spots configured</p>
                      )}
                    </div>
                    <Link
                      to={`/levels/${encodeURIComponent(levelId)}/spots`}
                      className="btn btn-primary btn-sm w-100"
                    >
                      View Spots
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
