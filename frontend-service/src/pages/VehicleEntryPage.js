import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getLevels, vehicleEntry } from '../api/parkingLotService';

export default function VehicleEntryPage() {
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [levelId, setLevelId] = useState('');
  const [isDisabled, setIsDisabled] = useState(false);
  const [levels, setLevels] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);
  const [ticketInfo, setTicketInfo] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    getLevels()
      .then((res) => {
        const data = res.data || [];
        setLevels(data);
        if (data.length > 0) {
          setLevelId(data[0].id || data[0].levelId);
        }
      })
      .catch((err) => {
        console.error('Failed to load levels:', err);
      });
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);
    setTicketInfo(null);

    try {
      const res = await vehicleEntry(levelId, vehicleNumber.toUpperCase(), isDisabled);
      const data = res.data;
      setTicketInfo(data);
      setMessage('Vehicle entry successful!');
      setVehicleNumber('');
    } catch (err) {
      setError('Entry failed: ' + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mt-4">
      <div className="row justify-content-center">
        <div className="col-md-6">
          <div className="card shadow">
            <div className="card-header bg-success text-white">
              <h5 className="mb-0">Vehicle Entry</h5>
            </div>
            <div className="card-body">
              {message && <div className="alert alert-success">{message}</div>}
              {error && <div className="alert alert-danger">{error}</div>}

              {ticketInfo && (
                <div className="alert alert-info">
                  <h6>Ticket Created!</h6>
                  <p className="mb-1"><strong>Ticket ID:</strong> {ticketInfo.ticketId || ticketInfo.id}</p>
                  <p className="mb-1"><strong>Spot ID:</strong> {ticketInfo.spotId}</p>
                  <p className="mb-1"><strong>Vehicle:</strong> {ticketInfo.vehicleNumber}</p>
                  <button
                    className="btn btn-sm btn-primary mt-2"
                    onClick={() => navigate('/tickets/' + (ticketInfo.ticketId || ticketInfo.id))}
                  >
                    View Ticket
                  </button>
                </div>
              )}

              <form onSubmit={handleSubmit}>
                <div className="mb-3">
                  <label className="form-label">Vehicle Number</label>
                  <input
                    type="text"
                    className="form-control"
                    value={vehicleNumber}
                    onChange={(e) => setVehicleNumber(e.target.value)}
                    placeholder="e.g., KA01AB1234"
                    required
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label">Parking Level</label>
                  <select
                    className="form-select"
                    value={levelId}
                    onChange={(e) => setLevelId(e.target.value)}
                    required
                  >
                    {levels.length === 0 && <option value="">No levels available</option>}
                    {levels.map((l) => (
                      <option key={l.id || l.levelId} value={l.id || l.levelId}>
                        {l.name || 'Level ' + (l.id || l.levelId)}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="mb-3 form-check">
                  <input
                    type="checkbox"
                    className="form-check-input"
                    id="isDisabled"
                    checked={isDisabled}
                    onChange={(e) => setIsDisabled(e.target.checked)}
                  />
                  <label className="form-check-label" htmlFor="isDisabled">
                    Requires accessible parking spot
                  </label>
                </div>
                <button
                  className="btn btn-success w-100"
                  type="submit"
                  disabled={loading || levels.length === 0}
                >
                  {loading ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2"></span>
                      Processing Entry...
                    </>
                  ) : (
                    'Register Entry'
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
