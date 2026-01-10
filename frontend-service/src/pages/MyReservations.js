import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getUserReservations, cancelReservation, checkInReservation } from '../api/reservationService';
import Loading from '../components/Loading';
import ErrorMessage from '../components/ErrorMessage';

export default function MyReservations() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionLoading, setActionLoading] = useState(null); // ID of reservation being acted on
  const [filter, setFilter] = useState('all');

  const fetchReservations = useCallback(async () => {
    if (!user?.email) return;

    setLoading(true);
    setError(null);
    try {
      const res = await getUserReservations(user.email);
      setReservations(res.data || []);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [user?.email]);

  useEffect(() => {
    fetchReservations();
  }, [fetchReservations]);

  const handleCancel = async (id) => {
    if (!window.confirm('Are you sure you want to cancel this reservation?')) {
      return;
    }

    setActionLoading(id);
    try {
      await cancelReservation(id, user.email);
      fetchReservations();
    } catch (err) {
      const message = err.response?.data?.error || err.message;
      alert('Failed to cancel: ' + message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleCheckIn = async (id) => {
    setActionLoading(id);
    try {
      const res = await checkInReservation(id, user.email);
      alert('Checked in successfully! Ticket ID: ' + res.data.ticketId);
      navigate('/my-tickets');
    } catch (err) {
      const message = err.response?.data?.error || err.message;
      alert('Check-in failed: ' + message);
    } finally {
      setActionLoading(null);
    }
  };

  // Filter reservations
  const filteredReservations = reservations.filter(r => {
    if (filter === 'all') return true;
    if (filter === 'upcoming') return r.status === 'CREATED';
    if (filter === 'active') return r.status === 'ACTIVE';
    if (filter === 'past') return ['EXPIRED', 'CANCELLED'].includes(r.status);
    return true;
  });

  // Get status badge class
  const getStatusBadge = (status) => {
    switch (status) {
      case 'CREATED':
        return 'bg-warning text-dark';
      case 'ACTIVE':
        return 'bg-success';
      case 'EXPIRED':
        return 'bg-secondary';
      case 'CANCELLED':
        return 'bg-danger';
      default:
        return 'bg-secondary';
    }
  };

  // Format date/time
  const formatDateTime = (dateStr) => {
    if (!dateStr) return '--';
    const date = new Date(dateStr);
    return date.toLocaleString('en-IN', {
      dateStyle: 'medium',
      timeStyle: 'short'
    });
  };

  // Format time only
  const formatTime = (dateStr) => {
    if (!dateStr) return '--';
    const date = new Date(dateStr);
    return date.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Format date only
  const formatDate = (dateStr) => {
    if (!dateStr) return '--';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-IN', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="container mt-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h4>
          <i className="bi bi-calendar-check me-2"></i>
          My Reservations
        </h4>
        <Link to="/schedule-parking" className="btn btn-warning">
          <i className="bi bi-plus-circle me-2"></i>
          New Reservation
        </Link>
      </div>

      {/* Filter Tabs */}
      <ul className="nav nav-tabs mb-4">
        {['all', 'upcoming', 'active', 'past'].map(f => (
          <li className="nav-item" key={f}>
            <button
              className={`nav-link ${filter === f ? 'active' : ''}`}
              onClick={() => setFilter(f)}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
              {f === 'upcoming' && (
                <span className="badge bg-warning text-dark ms-2">
                  {reservations.filter(r => r.status === 'CREATED').length}
                </span>
              )}
            </button>
          </li>
        ))}
      </ul>

      {loading && <Loading text="Loading reservations..." />}

      {error && <ErrorMessage error={error} onRetry={fetchReservations} />}

      {!loading && !error && filteredReservations.length === 0 && (
        <div className="alert alert-info">
          <h5 className="alert-heading">No Reservations Found</h5>
          <p>You don't have any {filter !== 'all' ? filter : ''} reservations.</p>
          <Link to="/schedule-parking" className="btn btn-warning">
            Schedule Your First Parking
          </Link>
        </div>
      )}

      {!loading && !error && filteredReservations.length > 0 && (
        <div className="row">
          {filteredReservations.map(reservation => (
            <div className="col-md-6 mb-4" key={reservation.id}>
              <div className="card shadow-sm h-100">
                <div className="card-header d-flex justify-content-between align-items-center">
                  <span>
                    <strong>Reservation #{reservation.id}</strong>
                  </span>
                  <span className={`badge ${getStatusBadge(reservation.status)}`}>
                    {reservation.status}
                  </span>
                </div>
                <div className="card-body">
                  <div className="row mb-3">
                    <div className="col-6">
                      <small className="text-muted">Date</small>
                      <p className="mb-0 fw-semibold">{formatDate(reservation.startTime)}</p>
                    </div>
                    <div className="col-6">
                      <small className="text-muted">Time</small>
                      <p className="mb-0 fw-semibold">
                        {formatTime(reservation.startTime)} - {formatTime(reservation.endTime)}
                      </p>
                    </div>
                  </div>

                  <div className="row mb-3">
                    <div className="col-6">
                      <small className="text-muted">Spot</small>
                      <p className="mb-0 fw-semibold">
                        {reservation.spotCode || `Spot ${reservation.spotId}`}
                      </p>
                    </div>
                    <div className="col-6">
                      <small className="text-muted">Vehicle</small>
                      <p className="mb-0 fw-semibold">{reservation.vehicleNumber}</p>
                    </div>
                  </div>

                  {reservation.canCheckIn && (
                    <div className="alert alert-success py-2 mb-3">
                      <i className="bi bi-clock me-2"></i>
                      Check-in window is open!
                    </div>
                  )}

                  {reservation.minutesUntilStart > 0 && reservation.status === 'CREATED' && !reservation.canCheckIn && (
                    <div className="alert alert-info py-2 mb-3">
                      <i className="bi bi-hourglass-split me-2"></i>
                      Starts in {reservation.minutesUntilStart} minutes
                    </div>
                  )}

                  {reservation.ticketId && (
                    <div className="alert alert-secondary py-2 mb-3">
                      <i className="bi bi-ticket me-2"></i>
                      Ticket ID: #{reservation.ticketId}
                    </div>
                  )}
                </div>

                <div className="card-footer bg-transparent">
                  <div className="d-flex gap-2">
                    {reservation.canCheckIn && (
                      <button
                        className="btn btn-success flex-grow-1"
                        onClick={() => handleCheckIn(reservation.id)}
                        disabled={actionLoading === reservation.id}
                      >
                        {actionLoading === reservation.id ? (
                          <span className="spinner-border spinner-border-sm"></span>
                        ) : (
                          <>
                            <i className="bi bi-box-arrow-in-right me-1"></i>
                            Check In
                          </>
                        )}
                      </button>
                    )}

                    {reservation.canCancel && (
                      <button
                        className="btn btn-outline-danger"
                        onClick={() => handleCancel(reservation.id)}
                        disabled={actionLoading === reservation.id}
                      >
                        {actionLoading === reservation.id ? (
                          <span className="spinner-border spinner-border-sm"></span>
                        ) : (
                          <>
                            <i className="bi bi-x-circle me-1"></i>
                            Cancel
                          </>
                        )}
                      </button>
                    )}

                    {reservation.ticketId && reservation.status === 'ACTIVE' && (
                      <Link
                        to={`/tickets/${reservation.ticketId}`}
                        className="btn btn-primary flex-grow-1"
                      >
                        <i className="bi bi-eye me-1"></i>
                        View Ticket
                      </Link>
                    )}
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
