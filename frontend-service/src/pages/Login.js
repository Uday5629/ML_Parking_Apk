import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const [loginType, setLoginType] = useState('user'); // 'user' or 'admin'
  const [activeTab, setActiveTab] = useState('login'); // 'login' or 'register'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const { login, loginAdmin, register } = useAuth();

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setName('');
    setPhone('');
    setConfirmPassword('');
    setError(null);
  };

  const handleLoginTypeChange = (type) => {
    setLoginType(type);
    setActiveTab('login');
    resetForm();
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    resetForm();
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (!email.trim() || !password.trim()) {
        throw new Error('Please enter both email and password');
      }

      if (loginType === 'admin') {
        await loginAdmin(email.trim(), password);
      } else {
        await login(email.trim(), password);
      }
      navigate('/');
    } catch (err) {
      setError(err.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (!name.trim() || !email.trim() || !password.trim()) {
        throw new Error('Please fill in all required fields');
      }

      if (password !== confirmPassword) {
        throw new Error('Passwords do not match');
      }

      if (password.length < 6) {
        throw new Error('Password must be at least 6 characters');
      }

      // Phone is mandatory for users
      if (!phone.trim()) {
        throw new Error('Phone number is required for user registration');
      }

      await register(email.trim(), password, name.trim(), phone.trim());
      navigate('/');
    } catch (err) {
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const gradientStyle = loginType === 'admin'
    ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
    : 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)';

  const primaryColor = loginType === 'admin' ? '#667eea' : '#11998e';

  return (
    <div className="min-vh-100 d-flex align-items-center" style={{ background: gradientStyle }}>
      <div className="container">
        <div className="row justify-content-center">
          <div className="col-md-5">
            <div className="card shadow-lg border-0">
              <div className="card-header bg-white text-center py-4 border-0">
                <h3 className="mb-1" style={{ color: primaryColor }}>
                  Parking Management
                </h3>
                <p className="text-muted mb-3">Welcome to the Parking System</p>

                {/* User Type Toggle */}
                <div className="btn-group w-100" role="group">
                  <button
                    type="button"
                    className={`btn ${loginType === 'user' ? 'btn-success' : 'btn-outline-success'}`}
                    onClick={() => handleLoginTypeChange('user')}
                  >
                    User Login
                  </button>
                  <button
                    type="button"
                    className={`btn ${loginType === 'admin' ? 'btn-primary' : 'btn-outline-primary'}`}
                    onClick={() => handleLoginTypeChange('admin')}
                  >
                    Admin Login
                  </button>
                </div>
              </div>

              {/* Tab Navigation - Only show for User */}
              {loginType === 'user' && (
                <ul className="nav nav-tabs nav-fill border-0 px-4">
                  <li className="nav-item">
                    <button
                      className={`nav-link ${activeTab === 'login' ? 'active fw-bold' : 'text-muted'}`}
                      onClick={() => handleTabChange('login')}
                      style={activeTab === 'login' ? { color: primaryColor, borderColor: primaryColor } : {}}
                    >
                      Sign In
                    </button>
                  </li>
                  <li className="nav-item">
                    <button
                      className={`nav-link ${activeTab === 'register' ? 'active fw-bold' : 'text-muted'}`}
                      onClick={() => handleTabChange('register')}
                      style={activeTab === 'register' ? { color: primaryColor, borderColor: primaryColor } : {}}
                    >
                      Register
                    </button>
                  </li>
                </ul>
              )}

              <div className="card-body p-4">
                {error && (
                  <div className="alert alert-danger alert-dismissible fade show" role="alert">
                    {error}
                    <button type="button" className="btn-close" onClick={() => setError(null)}></button>
                  </div>
                )}

                {/* Login Form (Admin or User) */}
                {(loginType === 'admin' || activeTab === 'login') && activeTab !== 'register' && (
                  <form onSubmit={handleLogin}>
                    <div className="mb-3">
                      <label className="form-label fw-semibold">Email</label>
                      <input
                        type="email"
                        className="form-control form-control-lg"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder={loginType === 'admin' ? 'Admin email' : 'Your email'}
                        autoComplete="email"
                        required
                      />
                    </div>

                    <div className="mb-4">
                      <label className="form-label fw-semibold">Password</label>
                      <input
                        type="password"
                        className="form-control form-control-lg"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Enter password"
                        autoComplete="current-password"
                        required
                      />
                    </div>

                    <button
                      className="btn btn-lg w-100 text-white"
                      style={{ background: gradientStyle }}
                      type="submit"
                      disabled={loading}
                    >
                      {loading ? (
                        <>
                          <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                          Signing in...
                        </>
                      ) : (
                        `Sign In as ${loginType === 'admin' ? 'Admin' : 'User'}`
                      )}
                    </button>

                    {loginType === 'user' && (
                      <div className="text-center mt-3">
                        <small className="text-muted">
                          In production, this would use Google OAuth2
                        </small>
                      </div>
                    )}
                  </form>
                )}

                {/* Registration Form (User only) */}
                {loginType === 'user' && activeTab === 'register' && (
                  <form onSubmit={handleRegister}>
                    <div className="mb-3">
                      <label className="form-label fw-semibold">Full Name *</label>
                      <input
                        type="text"
                        className="form-control form-control-lg"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Enter your full name"
                        autoComplete="name"
                        required
                      />
                    </div>

                    <div className="mb-3">
                      <label className="form-label fw-semibold">Email *</label>
                      <input
                        type="email"
                        className="form-control form-control-lg"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="Enter your email"
                        autoComplete="email"
                        required
                      />
                    </div>

                    <div className="mb-3">
                      <label className="form-label fw-semibold">Phone Number *</label>
                      <input
                        type="tel"
                        className="form-control form-control-lg"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+91 9876543210"
                        autoComplete="tel"
                        required
                      />
                      <small className="text-muted">Required for account verification</small>
                    </div>

                    <div className="mb-3">
                      <label className="form-label fw-semibold">Password *</label>
                      <input
                        type="password"
                        className="form-control form-control-lg"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Create a password (min 6 characters)"
                        autoComplete="new-password"
                        required
                      />
                    </div>

                    <div className="mb-4">
                      <label className="form-label fw-semibold">Confirm Password *</label>
                      <input
                        type="password"
                        className="form-control form-control-lg"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Confirm your password"
                        autoComplete="new-password"
                        required
                      />
                    </div>

                    <button
                      className="btn btn-lg w-100 text-white"
                      style={{ background: gradientStyle }}
                      type="submit"
                      disabled={loading}
                    >
                      {loading ? (
                        <>
                          <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                          Creating account...
                        </>
                      ) : (
                        'Create User Account'
                      )}
                    </button>

                    <p className="text-muted small text-center mt-3 mb-0">
                      New users are registered with USER role
                    </p>
                  </form>
                )}
              </div>

              <div className="card-footer bg-light text-center py-3 border-0">
                <small className="text-muted">
                  <strong>Demo Accounts:</strong><br />
                  {loginType === 'admin' ? (
                    <>Admin: <code>admin@parking.com</code> / <code>admin123</code></>
                  ) : (
                    <>User: <code>user@parking.com</code> / <code>user123</code></>
                  )}
                </small>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
