import React from 'react';
import { Link } from 'react-router-dom';

export default function NavBar() {
  return (
    <nav style={{ padding: 12, borderBottom: '1px solid #ccc' }}>
      <Link to="/" style={{ marginRight: 12 }}>Levels</Link>
      <Link to="/tickets" style={{ marginRight: 12 }}>Tickets</Link>
      <Link to="/vehicle/register" style={{ marginRight: 12 }}>Register Vehicle</Link>
      <Link to="/entry" style={{ marginRight: 12 }}>Vehicle Entry</Link>
      <Link to="/exit" style={{ marginRight: 12 }}>Vehicle Exit</Link>
      <Link to="/notify" style={{ marginRight: 12 }}>Send Notification</Link>
    </nav>
  );
}

