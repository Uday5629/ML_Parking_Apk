import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getUserTickets, getUserActiveTickets, exitUserVehicle } from '../api/ticketService';

export default function MyTickets() {
  const { user } = useAuth();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all'); // 'all' or 'active'
  const [exitingTicketId, setExitingTicketId] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  const fetchTickets = async () => {
    if (!user?.email) return;

    setLoading(true);
    setError(null);

    try {
      let response;
      if (filter === 'active') {
        response = await getUserActiveTickets(user.email);
      } else {
        response = await getUserTickets(user.email);
      }

      const data = response.data;
      if (Array.isArray(data)) {
        setTickets(data);
      } else {
        setTickets([]);
      }
    } catch (err) {
      console.error('Failed to load tickets:', err);
      setError(err.response?.data?.message || err.message || 'Failed to load tickets');
      setTickets([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, [user?.email, filter]);

  const handleExitVehicle = async (ticketId) => {
    if (!user?.email) return;

    const confirmed = window.confirm(
      'Are you sure you want to exit this vehicle? This will close the ticket and free the parking spot.'
    );

    if (!confirmed) return;

    setExitingTicketId(ticketId);
    setError(null);
    setSuccessMessage(null);

    try {
      await exitUserVehicle(ticketId, user.email);
      setSuccessMessage('Vehicle exited successfully! Parking spot has been freed.');
      // Refresh tickets list
      await fetchTickets();
    } catch (err) {
      console.error('Failed to exit vehicle:', err);
      setError(err.response?.data?.message || err.message || 'Failed to exit vehicle');
    } finally {
      setExitingTicketId(null);
    }
  };

  const getStatusBadge = (ticket) => {
    if (ticket.status === 'CLOSED' || ticket.exitTime) {
      return <span className="badge bg-secondary">Closed</span>;
    }
    return <span className="badge bg-success">Active</span>;
  };

  const formatDateTime = (dateTime) => {
    if (!dateTime) return '-';
    return new Date(dateTime).toLocaleString();
  };

  const formatFee = (fee) => {
    if (fee === null || fee === undefined) return '-';
    return `₹${fee.toFixed(2)}`;
  };

  return (
    <div className="container mt-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h4 className="mb-1">My Parking Tickets</h4>
          <small className="text-muted">View and manage your parking tickets</small>
        </div>
        <Link to="/create-ticket" className="btn btn-success">
          <i className="bi bi-plus-circle me-2"></i>New Ticket
        </Link>
      </div>

      {/* Filter Tabs */}
      <ul className="nav nav-tabs mb-4">
        <li className="nav-item">
          <button
            className={`nav-link ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
          >
            All Tickets
          </button>
        </li>
        <li className="nav-item">
          <button
            className={`nav-link ${filter === 'active' ? 'active' : ''}`}
            onClick={() => setFilter('active')}
          >
            Active Only
          </button>
        </li>
      </ul>

      {/* Success Message */}
      {successMessage && (
        <div className="alert alert-success alert-dismissible fade show" role="alert">
          {successMessage}
          <button type="button" className="btn-close" onClick={() => setSuccessMessage(null)}></button>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="alert alert-danger alert-dismissible fade show" role="alert">
          {error}
          <button type="button" className="btn-close" onClick={() => setError(null)}></button>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="mt-2 text-muted">Loading your tickets...</p>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && tickets.length === 0 && (
        <div className="text-center py-5">
          <div className="mb-3">
            <i className="bi bi-ticket-perforated" style={{ fontSize: '4rem', color: '#ccc' }}></i>
          </div>
          <h5 className="text-muted">
            {filter === 'active' ? 'No active tickets' : 'No tickets found'}
          </h5>
          <p className="text-muted">
            {filter === 'active'
              ? 'You don\'t have any vehicles currently parked.'
              : 'You haven\'t created any parking tickets yet.'}
          </p>
          <Link to="/create-ticket" className="btn btn-primary">
            Create Your First Ticket
          </Link>
        </div>
      )}

      {/* Tickets Table */}
      {!loading && !error && tickets.length > 0 && (
        <div className="table-responsive">
          <table className="table table-striped table-hover">
            <thead className="table-dark">
              <tr>
                <th>Ticket ID</th>
                <th>Vehicle</th>
                <th>Level</th>
                <th>Spot</th>
                <th>Entry Time</th>
                <th>Exit Time</th>
                <th>Fee</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {tickets.map((ticket) => (
                <tr key={ticket.id || ticket.ticketId}>
                  <td>
                    <strong>#{ticket.id || ticket.ticketId}</strong>
                  </td>
                  <td>
                    <span className="badge bg-info text-dark">
                      {ticket.vehicleNumber || '-'}
                    </span>
                  </td>
                  <td>{ticket.levelId || '-'}</td>
                  <td>{ticket.spotId || '-'}</td>
                  <td>{formatDateTime(ticket.entryTime)}</td>
                  <td>{formatDateTime(ticket.exitTime)}</td>
                  <td>{formatFee(ticket.fee)}</td>
                  <td>{getStatusBadge(ticket)}</td>
                  <td>
                    <div className="btn-group btn-group-sm">
                      <Link
                        to={`/tickets/${ticket.id || ticket.ticketId}`}
                        className="btn btn-outline-primary"
                        title="View Details"
                      >
                        View
                      </Link>
                      {(ticket.status === 'ACTIVE' || (!ticket.exitTime && ticket.status !== 'CLOSED')) && (
                        <button
                          className="btn btn-outline-danger"
                          onClick={() => handleExitVehicle(ticket.id || ticket.ticketId)}
                          disabled={exitingTicketId === (ticket.id || ticket.ticketId)}
                          title="Exit Vehicle"
                        >
                          {exitingTicketId === (ticket.id || ticket.ticketId) ? (
                            <>
                              <span className="spinner-border spinner-border-sm me-1" role="status"></span>
                              Exiting...
                            </>
                          ) : (
                            'Exit'
                          )}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Summary Stats */}
      {!loading && !error && tickets.length > 0 && (
        <div className="row mt-4">
          <div className="col-md-4">
            <div className="card bg-light">
              <div className="card-body text-center">
                <h5 className="card-title text-muted">Total Tickets</h5>
                <h2 className="text-primary">{tickets.length}</h2>
              </div>
            </div>
          </div>
          <div className="col-md-4">
            <div className="card bg-light">
              <div className="card-body text-center">
                <h5 className="card-title text-muted">Active</h5>
                <h2 className="text-success">
                  {tickets.filter(t => t.status === 'ACTIVE' || (!t.exitTime && t.status !== 'CLOSED')).length}
                </h2>
              </div>
            </div>
          </div>
          <div className="col-md-4">
            <div className="card bg-light">
              <div className="card-body text-center">
                <h5 className="card-title text-muted">Closed</h5>
                <h2 className="text-secondary">
                  {tickets.filter(t => t.status === 'CLOSED' || t.exitTime).length}
                </h2>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
