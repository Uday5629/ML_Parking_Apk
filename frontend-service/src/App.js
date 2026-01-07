import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import CreateTicket from './pages/CreateTicket';
import MyTickets from './pages/MyTickets';
import TicketDetails from './pages/TicketDetails';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught:", error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return <div className="container mt-5"><div className="alert alert-danger">Something went wrong: {this.state.error?.message}</div></div>;
    }
    return this.props.children;
  }
}

function App() {
  const isAuthenticated = !!localStorage.getItem('token');

  return (
    <ErrorBoundary>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={isAuthenticated ? <Dashboard /> : <Navigate to="/login" />} />
          <Route path="/create" element={isAuthenticated ? <CreateTicket /> : <Navigate to="/login" />} />
          <Route path="/tickets" element={isAuthenticated ? <MyTickets /> : <Navigate to="/login" />} />
          <Route path="/tickets/:id" element={isAuthenticated ? <TicketDetails /> : <Navigate to="/login" />} />
        </Routes>
      </Router>
    </ErrorBoundary>
  );
}

export default App;
