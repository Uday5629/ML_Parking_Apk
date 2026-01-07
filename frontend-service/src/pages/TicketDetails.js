import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';

export default function TicketDetails() {
  const { id } = useParams();
  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);
  const navigate = useNavigate();

  const fetchTicket = async () => {
    setLoading(true);
    try {
      const res = await api.get('/tickets/' + id);
      setTicket(res.data);
    } catch (err) {
      setError('Failed to fetch ticket: ' + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTicket(); }, [id]);

  const markExit = async () => {
    try {
      await api.post(`/tickets/${id}/exit`);
      setMessage('Exit marked successfully!');
      fetchTicket();
    } catch (err) {
      setError('Failed to mark exit: ' + (err.response?.data?.message || err.message));
    }
  };

  const pay = async () => {
    try {
      const res = await api.post(`/payments/charge`, { ticketId: id });
      setMessage('Payment processed: ' + (res.data.status || 'OK'));
      fetchTicket();
    } catch (err) {
      setError('Payment failed: ' + (err.response?.data?.message || err.message));
    }
  };

  if (loading) return <div className="container mt-4"><div className="spinner-border" role="status"></div></div>;

  return (
    <div className="container mt-4">
      <div className="card p-3 shadow">
        <h4>Ticket Details #{id}</h4>
        {error && <div className="alert alert-danger">{error}</div>}
        {message && <div className="alert alert-success">{message}</div>}
        {ticket ? (
          <div>
            <p><strong>Vehicle:</strong> {ticket.vehicleNumber || (ticket.vehicle && ticket.vehicle.license)}</p>
            <p><strong>Entry:</strong> {ticket.entryTime}</p>
            <p><strong>Exit:</strong> {ticket.exitTime || 'Not exited yet'}</p>
            <p><strong>Level:</strong> {ticket.level || ticket.parkingLevel}</p>
            <p><strong>Status:</strong> {ticket.status || (ticket.exitTime ? 'Exited' : 'Active')}</p>

            <div className="mt-3 d-flex gap-2">
              {!ticket.exitTime && <button className="btn btn-warning" onClick={markExit}>Mark Exit</button>}
              {ticket.exitTime && <button className="btn btn-success" onClick={pay}>Pay</button>}
              <button className="btn btn-secondary" onClick={() => navigate('/tickets')}>Back</button>
            </div>
          </div>
        ) : (
          <div className="alert alert-warning">Ticket not found</div>
        )}
      </div>
    </div>
  );
}
