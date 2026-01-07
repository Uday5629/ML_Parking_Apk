import React, { useState } from 'react';
import api from '../services/api';
import { useNavigate } from 'react-router-dom';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
//    try {
//      const res = await api.post('/auth/login', { username, password });
//      localStorage.setItem('token', res.data.token);
//      localStorage.setItem('user', JSON.stringify(res.data.user || { username }));
//      navigate('/');
//    }

    try {
      // ✅ Force success without hitting backend
      const fakeUser = { username };
      const fakeToken = "dummy-token";

      localStorage.setItem("token", fakeToken);
      localStorage.setItem("user", JSON.stringify(fakeUser));

      navigate("/");  // redirect to home
    }

     catch (err) {
      setError(err.response?.data?.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mt-5">
      <div className="row justify-content-center">
        <div className="col-md-6">
          <div className="card p-4 shadow">
            <h4 className="mb-3 text-center">Sign in</h4>
            {error && <div className="alert alert-danger">{error}</div>}
            <form onSubmit={handleSubmit}>
              <div className="mb-3">
                <label className="form-label">Username</label>
                <input className="form-control" value={username} onChange={e => setUsername(e.target.value)} required />
              </div>
              <div className="mb-3">
                <label className="form-label">Password</label>
                <input type="password" className="form-control" value={password} onChange={e => setPassword(e.target.value)} required />
              </div>
              <button className="btn btn-primary w-100" type="submit" disabled={loading}>
                {loading ? 'Signing in...' : 'Login'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
