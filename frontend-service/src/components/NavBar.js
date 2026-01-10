import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function NavBar() {
  const { user, logout, isAdmin } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [isCollapsed, setIsCollapsed] = useState(true);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActive = (path) => location.pathname === path ? 'active' : '';
  const isActiveStartsWith = (path) => location.pathname.startsWith(path) ? 'active' : '';

  const admin = isAdmin();

  return (
    <nav className={`navbar navbar-expand-lg navbar-dark ${admin ? 'bg-primary' : 'bg-success'} shadow-sm`}>
      <div className="container-fluid">
        <Link className="navbar-brand fw-bold" to={admin ? "/admin/dashboard" : "/"}>
          Parking System
        </Link>

        <button
          className="navbar-toggler"
          type="button"
          onClick={() => setIsCollapsed(!isCollapsed)}
        >
          <span className="navbar-toggler-icon"></span>
        </button>

        <div className={'collapse navbar-collapse ' + (isCollapsed ? '' : 'show')}>
          <ul className="navbar-nav me-auto mb-2 mb-lg-0">
            {/* Dashboard link - different for admin vs user */}
            <li className="nav-item">
              <Link
                className={`nav-link ${admin ? isActive('/admin/dashboard') : isActive('/')}`}
                to={admin ? "/admin/dashboard" : "/"}
              >
                Dashboard
              </Link>
            </li>

            {/* Common menu items for all users */}
            <li className="nav-item">
              <Link className={'nav-link ' + isActive('/levels')} to="/levels">Parking Map</Link>
            </li>

            {/* User-only menu items */}
            {!admin && (
              <>
                <li className="nav-item">
                  <Link className={'nav-link ' + isActive('/my-tickets')} to="/my-tickets">My Tickets</Link>
                </li>
                <li className="nav-item">
                  <Link className={'nav-link ' + isActive('/reservations')} to="/reservations">
                    <i className="bi bi-calendar-check me-1"></i>
                    Reservations
                  </Link>
                </li>
                <li className="nav-item dropdown">
                  <a
                    className={`nav-link dropdown-toggle ${isActive('/create-ticket') || isActive('/schedule-parking') ? 'active' : ''}`}
                    href="#"
                    data-bs-toggle="dropdown"
                  >
                    Park
                  </a>
                  <ul className="dropdown-menu">
                    <li>
                      <Link className="dropdown-item" to="/create-ticket">
                        <i className="bi bi-car-front me-2"></i>
                        Park Now
                      </Link>
                    </li>
                    <li>
                      <Link className="dropdown-item" to="/schedule-parking">
                        <i className="bi bi-calendar-plus me-2"></i>
                        Schedule in Advance
                      </Link>
                    </li>
                  </ul>
                </li>
              </>
            )}

            {/* Admin-only Operations dropdown */}
            {admin && (
              <li className="nav-item dropdown">
                <a
                  className={`nav-link dropdown-toggle ${isActive('/entry') || isActive('/exit') ? 'active' : ''}`}
                  href="#"
                  data-bs-toggle="dropdown"
                >
                  Operations
                </a>
                <ul className="dropdown-menu">
                  <li><Link className="dropdown-item" to="/entry">Vehicle Entry</Link></li>
                  <li><Link className="dropdown-item" to="/exit">Vehicle Exit</Link></li>
                </ul>
              </li>
            )}

            {/* Admin-only Admin dropdown */}
            {admin && (
              <li className="nav-item dropdown">
                <a
                  className={`nav-link dropdown-toggle ${isActiveStartsWith('/admin/') ? 'active' : ''}`}
                  href="#"
                  data-bs-toggle="dropdown"
                >
                  Admin
                </a>
                <ul className="dropdown-menu">
                  <li><Link className="dropdown-item" to="/admin/manage-levels">Manage Levels</Link></li>
                  <li><Link className="dropdown-item" to="/admin/vehicles">View All Vehicles</Link></li>
                  <li><hr className="dropdown-divider" /></li>
                  <li><Link className="dropdown-item" to="/vehicle/register">Register Vehicle</Link></li>
                </ul>
              </li>
            )}
          </ul>

          <div className="d-flex align-items-center">
            <span className="navbar-text text-white me-3">
              <span className={`badge ${admin ? 'bg-light text-primary' : 'bg-light text-success'} me-2`}>
                {user?.role || 'USER'}
              </span>
              {user?.name || user?.email || 'User'}
            </span>
            <button className="btn btn-outline-light" onClick={handleLogout}>
              Logout
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
