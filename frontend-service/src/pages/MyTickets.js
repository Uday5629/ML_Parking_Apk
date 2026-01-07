import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { Link } from 'react-router-dom';

export default function MyTickets() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.get('/tickets/my')
      .then(res => setTickets(res.data || []))
      .catch(() => api.get('/tickets').then(res => setTickets(res.data || [])))
      .catch(err => setError(err.message))
      .finally(()=>setLoading(false));
  }, []);

  return (
    <div className="container mt-4">
      <h4>My Tickets</h4>
      {loading && <div className="spinner-border" role="status"></div>}
      {error && <div className="alert alert-danger">{error}</div>}
      {!loading && !error && (
        <div className="list-group">
          {tickets.length === 0 && <div className="alert alert-info">No tickets found.</div>}
          {tickets.map(t => (
            <Link key={t.id || t.ticketId} to={'/tickets/' + (t.id || t.ticketId)} className="list-group-item list-group-item-action">
              <div className="d-flex w-100 justify-content-between">
                <h5 className="mb-1">Ticket #{t.id || t.ticketId}</h5>
                <small>{t.status || (t.exitTime ? 'Exited' : 'Active')}</small>
              </div>
              <p className="mb-1">Vehicle: {t.vehicleNumber || (t.vehicle && t.vehicle.license)}</p>
              <small>Level: {t.level || t.parkingLevel}</small>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
