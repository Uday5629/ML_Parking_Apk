import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getTicket, exitTicket } from '../api/ticketService';
import { createPayment } from '../api/paymentService';

export default function TicketDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);
  const [processing, setProcessing] = useState(false);

  const fetchTicket = async () => {
    setLoading(true);
    try {
      const res = await getTicket(id);
      setTicket(res.data);
    } catch (err) {
      setError('Failed to fetch ticket: ' + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTicket();
  }, [id]);

  const handleExit = async () => {
    setProcessing(true);
    setError(null);
    try {
      await exitTicket(id);
      setMessage('Exit marked successfully!');
      fetchTicket();
    } catch (err) {
      setError('Failed to mark exit: ' + (err.response?.data?.message || err.message));
    } finally {
      setProcessing(false);
    }
  };

  const handlePayment = async () => {
    setProcessing(true);
    setError(null);
    try {
      const amount = 50; // Default parking fee
      const res = await createPayment(id, amount);
      if (res.data?.status === 'SUCCESS') {
        setMessage('Payment processed successfully! Payment ID: ' + (res.data.paymentId || res.data.orderId));
      } else {
        setError('Payment failed: ' + (res.data?.reason || 'Unknown error'));
      }
      fetchTicket();
    } catch (err) {
      setError('Payment failed: ' + (err.response?.data?.message || err.message));
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="container mt-4">
        <div className="text-center py-5">
          <div className="spinner-border" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mt-4">
      <div className="row justify-content-center">
        <div className="col-md-8">
          <div className="card shadow">
            <div className="card-header bg-primary text-white d-flex justify-content-between align-items-center">
              <h5 className="mb-0">Ticket #{id}</h5>
              <span className={'badge ' + (ticket?.exitTime ? 'bg-secondary' : 'bg-success')}>
                {ticket?.exitTime ? 'Exited' : 'Active'}
              </span>
            </div>
            <div className="card-body">
              {error && <div className="alert alert-danger">{error}</div>}
              {message && <div className="alert alert-success">{message}</div>}

              {ticket ? (
                <>
                  <div className="row mb-4">
                    <div className="col-md-6">
                      <h6 className="text-muted">Vehicle Number</h6>
                      <p className="fs-5">{ticket.vehicleNumber || '-'}</p>
                    </div>
                    <div className="col-md-6">
                      <h6 className="text-muted">Spot ID</h6>
                      <p className="fs-5">{ticket.spotId || '-'}</p>
                    </div>
                  </div>
                  <div className="row mb-4">
                    <div className="col-md-6">
                      <h6 className="text-muted">Entry Time</h6>
                      <p>{ticket.entryTime ? new Date(ticket.entryTime).toLocaleString() : '-'}</p>
                    </div>
                    <div className="col-md-6">
                      <h6 className="text-muted">Exit Time</h6>
                      <p>{ticket.exitTime ? new Date(ticket.exitTime).toLocaleString() : 'Not exited yet'}</p>
                    </div>
                  </div>

                  <hr />

                  <div className="d-flex gap-2 flex-wrap">
                    {!ticket.exitTime && (
                      <button
                        className="btn btn-warning"
                        onClick={handleExit}
                        disabled={processing}
                      >
                        {processing ? 'Processing...' : 'Mark Exit'}
                      </button>
                    )}
                    {ticket.exitTime && (
                      <button
                        className="btn btn-success"
                        onClick={handlePayment}
                        disabled={processing}
                      >
                        {processing ? 'Processing...' : 'Process Payment'}
                      </button>
                    )}
                    <button className="btn btn-secondary" onClick={() => navigate('/tickets')}>
                      Back to Tickets
                    </button>
                  </div>
                </>
              ) : (
                <div className="alert alert-warning">Ticket not found</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
