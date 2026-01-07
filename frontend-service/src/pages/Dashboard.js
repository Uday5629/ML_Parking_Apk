import React from 'react';
import { Link, useNavigate } from 'react-router-dom';

export default function Dashboard() {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const navigate = useNavigate();
  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  return (
    <div className="container mt-4">
      <div className="card shadow p-4">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h3 className="mb-0">Welcome, {user.username || user.name || 'User'}</h3>
          <button className="btn btn-danger" onClick={logout}>Logout</button>
        </div>
        <div className="d-flex gap-2">
          <Link className="btn btn-primary" to="/create">Create Ticket</Link>
          <Link className="btn btn-secondary" to="/tickets">My Tickets</Link>
        </div>
      </div>
    </div>
  );
}
