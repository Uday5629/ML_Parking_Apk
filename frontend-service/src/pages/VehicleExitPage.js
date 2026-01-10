import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { vehicleExit } from '../api/parkingLotService';
import { getTicket } from '../api/ticketService';

export default function VehicleExitPage() {
  const [ticketId, setTicketId] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);
  const [ticketInfo, setTicketInfo] = useState(null);
  const navigate = useNavigate();

  const handleLookup = async (e) => {
    e.preventDefault();
    if (!ticketId) return;

    setLoading(true);
    setError(null);
    setTicketInfo(null);

    try {
      const res = await getTicket(ticketId);
      setTicketInfo(res.data);
    } catch (err) {
      setError('Ticket not found: ' + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  const handleExit = async () => {
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      await vehicleExit(ticketId);
      setMessage('Vehicle exit processed successfully! Payment completed.');
      setTicketInfo(null);
      setTicketId('');
    } catch (err) {
      setError('Exit failed: ' + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mt-4">
      <div className="row justify-content-center">
        <div className="col-md-6">
          <div className="card shadow">
            <div className="card-header bg-warning text-dark">
              <h5 className="mb-0">Vehicle Exit</h5>
            </div>
            <div className="card-body">
              {message && <div className="alert alert-success">{message}</div>}
              {error && <div className="alert alert-danger">{error}</div>}

              <form onSubmit={handleLookup}>
                <div className="mb-3">
                  <label className="form-label">Ticket ID</label>
                  <div className="input-group">
                    <input
                      type="number"
                      className="form-control"
                      value={ticketId}
                      onChange={(e) => setTicketId(e.target.value)}
                      placeholder="Enter ticket ID"
                      required
                    />
                    <button
                      className="btn btn-outline-primary"
                      type="submit"
                      disabled={loading}
                    >
                      Lookup
                    </button>
                  </div>
                </div>
              </form>

              {ticketInfo && (
                <div className="card bg-light mt-3">
                  <div className="card-body">
                    <h6 className="card-title">Ticket Information</h6>
                    <p className="mb-1"><strong>Ticket ID:</strong> {ticketInfo.id || ticketInfo.ticketId}</p>
                    <p className="mb-1"><strong>Vehicle:</strong> {ticketInfo.vehicleNumber}</p>
                    <p className="mb-1"><strong>Spot ID:</strong> {ticketInfo.spotId}</p>
                    <p className="mb-1"><strong>Entry Time:</strong> {ticketInfo.entryTime ? new Date(ticketInfo.entryTime).toLocaleString() : '-'}</p>
                    <p className="mb-1">
                      <strong>Status:</strong>{' '}
                      <span className={'badge ' + (ticketInfo.exitTime ? 'bg-secondary' : 'bg-success')}>
                        {ticketInfo.exitTime ? 'Already Exited' : 'Active'}
                      </span>
                    </p>

                    {!ticketInfo.exitTime && (
                      <button
                        className="btn btn-warning w-100 mt-3"
                        onClick={handleExit}
                        disabled={loading}
                      >
                        {loading ? (
                          <>
                            <span className="spinner-border spinner-border-sm me-2"></span>
                            Processing Exit...
                          </>
                        ) : (
                          'Process Exit & Payment'
                        )}
                      </button>
                    )}

                    {ticketInfo.exitTime && (
                      <div className="alert alert-info mt-3 mb-0">
                        This ticket has already been processed.
                        Exit Time: {new Date(ticketInfo.exitTime).toLocaleString()}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
