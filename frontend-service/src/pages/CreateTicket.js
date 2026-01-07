import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useNavigate } from 'react-router-dom';

export default function CreateTicket() {
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [vehicleType, setVehicleType] = useState('CAR');
  const [level, setLevel] = useState('1');
  const [levels, setLevels] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/parking/levels')
      .then(res => setLevels(res.data))
      .catch(() => setLevels([{id:1,name:'Level 1'}]));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      await api.post('/vehicle', { license: vehicleNumber, type: vehicleType, isDisabled: false }).catch(()=>{});
      const res = await api.post('/tickets', { vehicleNumber, level });
      setMessage('Ticket created successfully! ID: ' + (res.data.ticketId || res.data.id));
      setTimeout(()=>navigate('/tickets'), 1500);
    } catch (err) {
      setError('Failed to create ticket: ' + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mt-4">
      <div className="card p-3 shadow">
        <h4>Create Ticket</h4>
        {message && <div className="alert alert-success">{message}</div>}
        {error && <div className="alert alert-danger">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label className="form-label">Vehicle Number</label>
            <input className="form-control" value={vehicleNumber} onChange={e => setVehicleNumber(e.target.value)} required />
          </div>
          <div className="mb-3">
            <label className="form-label">Vehicle Type</label>
            <select className="form-select" value={vehicleType} onChange={e=>setVehicleType(e.target.value)}>
              <option>CAR</option>
              <option>MOTORBIKE</option>
              <option>TRUCK</option>
            </select>
          </div>
          <div className="mb-3">
            <label className="form-label">Level</label>
            <select className="form-select" value={level} onChange={e=>setLevel(e.target.value)}>
              {levels.map(l => <option key={l.id} value={l.id}>{l.name || 'Level '+l.id}</option>)}
            </select>
          </div>
          <button className="btn btn-primary" type="submit" disabled={loading}>
            {loading ? 'Creating...' : 'Create Ticket'}
          </button>
        </form>
      </div>
    </div>
  );
}
