import React, { useState, useEffect } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getParkingStats, getLevelsWithDetails } from '../api/parkingLotService';
import { getUserTickets, getUserActiveTickets } from '../api/ticketService';

export default function Dashboard() {
  const { user, isAdmin, isUser } = useAuth();
  const [parkingStats, setParkingStats] = useState(null);
  const [userStats, setUserStats] = useState({ totalTickets: 0, activeTickets: 0 });
  const [levels, setLevels] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch parking stats for everyone
        const [parkingRes, levelsRes] = await Promise.allSettled([
          getParkingStats(),
          getLevelsWithDetails()
        ]);

        if (parkingRes.status === 'fulfilled') {
          setParkingStats(parkingRes.value.data);
        }
        if (levelsRes.status === 'fulfilled') {
          setLevels(levelsRes.value.data || []);
        }

        // Fetch user-specific stats if user role
        if (user?.email && isUser()) {
          const [totalRes, activeRes] = await Promise.allSettled([
            getUserTickets(user.email),
            getUserActiveTickets(user.email)
          ]);

          setUserStats({
            totalTickets: totalRes.status === 'fulfilled' ? (totalRes.value.data?.length || 0) : 0,
            activeTickets: activeRes.status === 'fulfilled' ? (activeRes.value.data?.length || 0) : 0
          });
        }
      } catch (err) {
        console.error('Failed to load dashboard data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user?.email, isUser]);

  // Redirect admin to admin dashboard
  if (isAdmin()) {
    return <Navigate to="/admin/dashboard" replace />;
  }

  const admin = isAdmin();

  return (
    <div className="container-fluid mt-4">
      {/* Welcome Banner */}
      <div className="row mb-4">
        <div className="col-12">
          <div className="card bg-success text-white">
            <div className="card-body py-4">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <h2 className="mb-1">Welcome back, {user?.name || 'User'}!</h2>
                  <p className="mb-0 opacity-75">
                    Parking Management System - Your Dashboard
                  </p>
                </div>
                <div className="text-end">
                  <span className="badge bg-light text-success fs-6">
                    {user?.role || 'USER'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* User Stats Row */}
      <div className="row mb-4">
        <div className="col-md-3 mb-3">
          <div className="card border-0 shadow-sm h-100 border-start border-primary border-4">
            <div className="card-body">
              <h6 className="text-muted mb-2">Your Active Tickets</h6>
              <h2 className="text-primary mb-2">
                {loading ? '...' : userStats.activeTickets}
              </h2>
              <Link to="/my-tickets?filter=active" className="btn btn-sm btn-outline-primary">
                View Active
              </Link>
            </div>
          </div>
        </div>

        <div className="col-md-3 mb-3">
          <div className="card border-0 shadow-sm h-100 border-start border-success border-4">
            <div className="card-body">
              <h6 className="text-muted mb-2">Total Tickets</h6>
              <h2 className="text-success mb-2">
                {loading ? '...' : userStats.totalTickets}
              </h2>
              <Link to="/my-tickets" className="btn btn-sm btn-outline-success">
                View All
              </Link>
            </div>
          </div>
        </div>

        <div className="col-md-3 mb-3">
          <div className="card border-0 shadow-sm h-100 border-start border-info border-4">
            <div className="card-body">
              <h6 className="text-muted mb-2">Available Spots</h6>
              <h2 className="text-info mb-2">
                {loading ? '...' : (parkingStats?.availableSpots || 0)}
              </h2>
              <Link to="/levels" className="btn btn-sm btn-outline-info">
                Find Spot
              </Link>
            </div>
          </div>
        </div>

        <div className="col-md-3 mb-3">
          <div className="card border-0 shadow-sm h-100 border-start border-warning border-4">
            <div className="card-body">
              <h6 className="text-muted mb-2">Parking Levels</h6>
              <h2 className="text-warning mb-2">
                {loading ? '...' : levels.length}
              </h2>
              <Link to="/levels" className="btn btn-sm btn-outline-warning">
                View Map
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="row mb-4">
        <div className="col-12">
          <h5 className="mb-3">Quick Actions</h5>
        </div>

        <div className="col-md-4 mb-3">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body text-center py-4">
              <div className="bg-success bg-opacity-10 d-inline-block p-3 rounded-circle mb-3">
                <i className="bi bi-plus-circle text-success fs-3"></i>
              </div>
              <h5>Park Vehicle</h5>
              <p className="text-muted small">Start a new parking session</p>
              <Link to="/create-ticket" className="btn btn-success">
                Create Ticket
              </Link>
            </div>
          </div>
        </div>

        <div className="col-md-4 mb-3">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body text-center py-4">
              <div className="bg-primary bg-opacity-10 d-inline-block p-3 rounded-circle mb-3">
                <i className="bi bi-ticket-perforated text-primary fs-3"></i>
              </div>
              <h5>My Tickets</h5>
              <p className="text-muted small">View and manage your tickets</p>
              <Link to="/my-tickets" className="btn btn-primary">
                View Tickets
              </Link>
            </div>
          </div>
        </div>

        <div className="col-md-4 mb-3">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body text-center py-4">
              <div className="bg-info bg-opacity-10 d-inline-block p-3 rounded-circle mb-3">
                <i className="bi bi-map text-info fs-3"></i>
              </div>
              <h5>Find Parking</h5>
              <p className="text-muted small">View available parking spots</p>
              <Link to="/levels" className="btn btn-info text-white">
                View Map
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Schedule Parking Section */}
      <div className="row mb-4">
        <div className="col-12">
          <div className="card border-0 shadow-sm bg-warning bg-opacity-10">
            <div className="card-body">
              <div className="row align-items-center">
                <div className="col-md-8">
                  <h5 className="mb-2">
                    <i className="bi bi-calendar-check me-2"></i>
                    Schedule Parking in Advance
                  </h5>
                  <p className="text-muted mb-md-0">
                    Reserve your parking spot up to 3 days in advance. No more searching for spots when you arrive!
                  </p>
                </div>
                <div className="col-md-4 text-md-end">
                  <Link to="/schedule-parking" className="btn btn-warning me-2">
                    <i className="bi bi-calendar-plus me-1"></i>
                    Schedule Now
                  </Link>
                  <Link to="/reservations" className="btn btn-outline-warning">
                    View Reservations
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Parking Availability Overview */}
      {parkingStats && (
        <div className="row mb-4">
          <div className="col-12">
            <h5 className="mb-3">Parking Availability</h5>
          </div>
          <div className="col-md-6">
            <div className="card border-0 shadow-sm">
              <div className="card-body">
                <h6 className="text-muted mb-3">Overall Occupancy</h6>
                <div className="d-flex justify-content-between mb-2">
                  <span>Spots Used</span>
                  <strong>
                    {parkingStats.occupiedSpots} / {parkingStats.totalSpots}
                  </strong>
                </div>
                <div className="progress mb-3" style={{ height: '20px' }}>
                  <div
                    className="progress-bar bg-success"
                    style={{ width: `${((parkingStats.availableSpots / parkingStats.totalSpots) * 100) || 0}%` }}
                  >
                    {parkingStats.availableSpots} Free
                  </div>
                  <div
                    className="progress-bar bg-danger"
                    style={{ width: `${((parkingStats.occupiedSpots / parkingStats.totalSpots) * 100) || 0}%` }}
                  >
                    {parkingStats.occupiedSpots} Used
                  </div>
                </div>
                <div className="row text-center">
                  <div className="col-4">
                    <span className="badge bg-success fs-6">{parkingStats.availableSpots}</span>
                    <div className="small text-muted">Available</div>
                  </div>
                  <div className="col-4">
                    <span className="badge bg-danger fs-6">{parkingStats.occupiedSpots}</span>
                    <div className="small text-muted">Occupied</div>
                  </div>
                  <div className="col-4">
                    <span className="badge bg-secondary fs-6">{parkingStats.disabledSpots || 0}</span>
                    <div className="small text-muted">Disabled</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="col-md-6">
            <div className="card border-0 shadow-sm h-100">
              <div className="card-body">
                <h6 className="text-muted mb-3">Levels at a Glance</h6>
                {levels.length === 0 ? (
                  <p className="text-muted">No parking levels available.</p>
                ) : (
                  <div className="list-group list-group-flush">
                    {levels.slice(0, 4).map((level) => (
                      <div key={level.id || level.levelId} className="list-group-item d-flex justify-content-between align-items-center px-0">
                        <div>
                          <strong>{level.name || `Level ${level.levelNumber}`}</strong>
                        </div>
                        <div>
                          <span className="badge bg-success me-1">{level.availableSpots || 0} free</span>
                          <span className="badge bg-secondary">{level.totalSpots || 0} total</span>
                        </div>
                      </div>
                    ))}
                    {levels.length > 4 && (
                      <Link to="/levels" className="list-group-item text-center text-primary">
                        View all {levels.length} levels
                      </Link>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Help Section */}
      <div className="row">
        <div className="col-12">
          <h5 className="mb-3">How It Works</h5>
        </div>
        <div className="col-md-4 mb-3">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body">
              <div className="d-flex align-items-center mb-2">
                <span className="badge bg-primary rounded-circle me-2" style={{ width: '30px', height: '30px', lineHeight: '20px' }}>1</span>
                <h6 className="mb-0">Find a Spot</h6>
              </div>
              <p className="text-muted small mb-0">
                Browse available parking levels and find a spot that suits your needs.
              </p>
            </div>
          </div>
        </div>
        <div className="col-md-4 mb-3">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body">
              <div className="d-flex align-items-center mb-2">
                <span className="badge bg-primary rounded-circle me-2" style={{ width: '30px', height: '30px', lineHeight: '20px' }}>2</span>
                <h6 className="mb-0">Create Ticket</h6>
              </div>
              <p className="text-muted small mb-0">
                Select your spot and create a parking ticket. The spot will be reserved for you.
              </p>
            </div>
          </div>
        </div>
        <div className="col-md-4 mb-3">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body">
              <div className="d-flex align-items-center mb-2">
                <span className="badge bg-primary rounded-circle me-2" style={{ width: '30px', height: '30px', lineHeight: '20px' }}>3</span>
                <h6 className="mb-0">Exit When Done</h6>
              </div>
              <p className="text-muted small mb-0">
                When leaving, exit your vehicle from the "My Tickets" page to free up the spot.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Contact Info */}
      <div className="row mt-2">
        <div className="col-12">
          <div className="card bg-light border-0">
            <div className="card-body text-center py-3">
              <p className="mb-0 text-muted">
                Need help? Contact parking support or speak with an attendant at the entry/exit booth.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
