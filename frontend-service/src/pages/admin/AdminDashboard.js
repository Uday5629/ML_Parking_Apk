import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getAdminParkingStats, getParkingStats } from '../../api/parkingLotService';
import { getSystemStats, getAllActiveTickets } from '../../api/ticketService';

export default function AdminDashboard() {
  const { user } = useAuth();
  const [parkingStats, setParkingStats] = useState(null);
  const [ticketStats, setTicketStats] = useState(null);
  const [activeTickets, setActiveTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      setError(null);

      try {
        // Fetch parking stats, ticket stats, and active tickets in parallel
        const [parkingRes, ticketStatsRes, activeTicketsRes] = await Promise.all([
          getAdminParkingStats().catch(() => getParkingStats()), // Fallback to public stats
          getSystemStats(),
          getAllActiveTickets()
        ]);

        setParkingStats(parkingRes.data);
        setTicketStats(ticketStatsRes.data);
        setActiveTickets(activeTicketsRes.data || []);
      } catch (err) {
        console.error('Failed to load stats:', err);
        setError(err.response?.data?.message || err.message || 'Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  const formatDateTime = (dateTime) => {
    if (!dateTime) return '-';
    return new Date(dateTime).toLocaleString();
  };

  if (loading) {
    return (
      <div className="container mt-4">
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="mt-2 text-muted">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container-fluid mt-4">
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h3 className="mb-1">Admin Dashboard</h3>
          <p className="text-muted mb-0">Welcome back, {user?.name || 'Admin'}</p>
        </div>
        <div>
          <Link to="/admin/manage-levels" className="btn btn-primary me-2">
            Manage Levels
          </Link>
          <Link to="/admin/vehicles" className="btn btn-outline-primary">
            View Vehicles
          </Link>
        </div>
      </div>

      {error && (
        <div className="alert alert-danger alert-dismissible fade show" role="alert">
          {error}
          <button type="button" className="btn-close" onClick={() => setError(null)}></button>
        </div>
      )}

      {/* Key Metrics */}
      <div className="row mb-4">
        {/* Parking Stats */}
        <div className="col-md-3 mb-3">
          <div className="card bg-primary text-white h-100">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <h6 className="card-subtitle mb-2 opacity-75">Total Spots</h6>
                  <h2 className="card-title mb-0">{parkingStats?.totalSpots || 0}</h2>
                </div>
                <i className="bi bi-p-square fs-1 opacity-50"></i>
              </div>
            </div>
          </div>
        </div>

        <div className="col-md-3 mb-3">
          <div className="card bg-success text-white h-100">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <h6 className="card-subtitle mb-2 opacity-75">Available</h6>
                  <h2 className="card-title mb-0">{parkingStats?.availableSpots || 0}</h2>
                </div>
                <i className="bi bi-check-circle fs-1 opacity-50"></i>
              </div>
            </div>
          </div>
        </div>

        <div className="col-md-3 mb-3">
          <div className="card bg-danger text-white h-100">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <h6 className="card-subtitle mb-2 opacity-75">Occupied</h6>
                  <h2 className="card-title mb-0">{parkingStats?.occupiedSpots || 0}</h2>
                </div>
                <i className="bi bi-car-front fs-1 opacity-50"></i>
              </div>
            </div>
          </div>
        </div>

        <div className="col-md-3 mb-3">
          <div className="card bg-warning text-dark h-100">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <h6 className="card-subtitle mb-2 opacity-75">Disabled</h6>
                  <h2 className="card-title mb-0">{parkingStats?.disabledSpots || 0}</h2>
                </div>
                <i className="bi bi-x-circle fs-1 opacity-50"></i>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Second Row - Ticket Stats */}
      <div className="row mb-4">
        <div className="col-md-3 mb-3">
          <div className="card border-primary h-100">
            <div className="card-body">
              <h6 className="card-subtitle mb-2 text-muted">Total Tickets</h6>
              <h3 className="card-title text-primary">{ticketStats?.totalTickets || 0}</h3>
            </div>
          </div>
        </div>

        <div className="col-md-3 mb-3">
          <div className="card border-success h-100">
            <div className="card-body">
              <h6 className="card-subtitle mb-2 text-muted">Active Tickets</h6>
              <h3 className="card-title text-success">{ticketStats?.activeTickets || 0}</h3>
            </div>
          </div>
        </div>

        <div className="col-md-3 mb-3">
          <div className="card border-secondary h-100">
            <div className="card-body">
              <h6 className="card-subtitle mb-2 text-muted">Closed Tickets</h6>
              <h3 className="card-title text-secondary">{ticketStats?.closedTickets || 0}</h3>
            </div>
          </div>
        </div>

        <div className="col-md-3 mb-3">
          <div className="card border-info h-100">
            <div className="card-body">
              <h6 className="card-subtitle mb-2 text-muted">Active Vehicles</h6>
              <h3 className="card-title text-info">{ticketStats?.activeVehicles || activeTickets.length}</h3>
            </div>
          </div>
        </div>
      </div>

      {/* Occupancy Chart */}
      {parkingStats && (
        <div className="row mb-4">
          <div className="col-md-6">
            <div className="card h-100">
              <div className="card-header">
                <h5 className="mb-0">Occupancy Overview</h5>
              </div>
              <div className="card-body">
                <div className="mb-3">
                  <div className="d-flex justify-content-between mb-1">
                    <span>Occupancy Rate</span>
                    <strong>{(parkingStats.occupancyPercentage || 0).toFixed(1)}%</strong>
                  </div>
                  <div className="progress" style={{ height: '20px' }}>
                    <div
                      className="progress-bar bg-danger"
                      role="progressbar"
                      style={{ width: `${parkingStats.occupancyPercentage || 0}%` }}
                    >
                      {(parkingStats.occupancyPercentage || 0).toFixed(0)}%
                    </div>
                  </div>
                </div>

                <div className="row text-center mt-4">
                  <div className="col-4">
                    <div className="bg-success text-white rounded p-2">
                      <div className="fs-4">{parkingStats.availableSpots}</div>
                      <small>Free</small>
                    </div>
                  </div>
                  <div className="col-4">
                    <div className="bg-danger text-white rounded p-2">
                      <div className="fs-4">{parkingStats.occupiedSpots}</div>
                      <small>Occupied</small>
                    </div>
                  </div>
                  <div className="col-4">
                    <div className="bg-warning text-dark rounded p-2">
                      <div className="fs-4">{parkingStats.disabledSpots}</div>
                      <small>Disabled</small>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Levels Breakdown */}
          <div className="col-md-6">
            <div className="card h-100">
              <div className="card-header d-flex justify-content-between align-items-center">
                <h5 className="mb-0">Levels Overview</h5>
                <span className="badge bg-primary">{parkingStats.totalLevels} Levels</span>
              </div>
              <div className="card-body">
                {parkingStats.levelStats && parkingStats.levelStats.length > 0 ? (
                  <div className="table-responsive">
                    <table className="table table-sm table-hover mb-0">
                      <thead>
                        <tr>
                          <th>Level</th>
                          <th className="text-center">Total</th>
                          <th className="text-center">Free</th>
                          <th className="text-center">Occupied</th>
                          <th>Occupancy</th>
                        </tr>
                      </thead>
                      <tbody>
                        {parkingStats.levelStats.map((level) => (
                          <tr key={level.levelId}>
                            <td>
                              <strong>{level.levelName || level.levelNumber}</strong>
                            </td>
                            <td className="text-center">{level.totalSpots}</td>
                            <td className="text-center text-success">{level.availableSpots}</td>
                            <td className="text-center text-danger">{level.occupiedSpots}</td>
                            <td>
                              <div className="progress" style={{ height: '10px', minWidth: '80px' }}>
                                <div
                                  className="progress-bar bg-danger"
                                  style={{ width: `${level.occupancyPercentage || 0}%` }}
                                ></div>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center text-muted py-3">
                    No levels configured yet.
                    <Link to="/admin/manage-levels" className="d-block mt-2">
                      Add Parking Levels
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Active Tickets Table */}
      <div className="card">
        <div className="card-header d-flex justify-content-between align-items-center">
          <h5 className="mb-0">Currently Parked Vehicles</h5>
          <span className="badge bg-success">{activeTickets.length} Active</span>
        </div>
        <div className="card-body">
          {activeTickets.length === 0 ? (
            <div className="text-center text-muted py-4">
              <i className="bi bi-car-front" style={{ fontSize: '3rem' }}></i>
              <p className="mt-2">No vehicles currently parked</p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-striped table-hover">
                <thead className="table-dark">
                  <tr>
                    <th>Ticket #</th>
                    <th>Vehicle</th>
                    <th>User</th>
                    <th>Level</th>
                    <th>Spot</th>
                    <th>Entry Time</th>
                    <th>Duration</th>
                  </tr>
                </thead>
                <tbody>
                  {activeTickets.slice(0, 10).map((ticket) => {
                    const entryTime = ticket.entryTime ? new Date(ticket.entryTime) : null;
                    const duration = entryTime
                      ? Math.round((new Date() - entryTime) / (1000 * 60))
                      : 0;
                    const hours = Math.floor(duration / 60);
                    const minutes = duration % 60;

                    return (
                      <tr key={ticket.id || ticket.ticketId}>
                        <td><strong>#{ticket.id || ticket.ticketId}</strong></td>
                        <td>
                          <span className="badge bg-info text-dark">
                            {ticket.vehicleNumber || '-'}
                          </span>
                        </td>
                        <td>
                          <small>{ticket.userEmail || '-'}</small>
                        </td>
                        <td>{ticket.levelId || '-'}</td>
                        <td>{ticket.spotId || '-'}</td>
                        <td>{formatDateTime(ticket.entryTime)}</td>
                        <td>
                          <span className={`badge ${hours > 2 ? 'bg-warning text-dark' : 'bg-secondary'}`}>
                            {hours}h {minutes}m
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {activeTickets.length > 10 && (
                <div className="text-center">
                  <Link to="/admin/vehicles" className="btn btn-outline-primary btn-sm">
                    View All {activeTickets.length} Active Tickets
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="row mt-4">
        <div className="col-12">
          <div className="card bg-light">
            <div className="card-body">
              <h6 className="card-title mb-3">Quick Actions</h6>
              <div className="d-flex flex-wrap gap-2">
                <Link to="/admin/manage-levels" className="btn btn-primary">
                  Manage Parking Levels
                </Link>
                <Link to="/admin/vehicles" className="btn btn-outline-primary">
                  View All Vehicles
                </Link>
                <Link to="/levels" className="btn btn-outline-secondary">
                  View Public Levels
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
