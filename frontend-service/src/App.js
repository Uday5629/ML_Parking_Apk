import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import CreateTicket from './pages/CreateTicket';
import MyTickets from './pages/MyTickets';
import TicketDetails from './pages/TicketDetails';
import LevelsPage from './pages/LevelsPage';
import SpotsPage from './pages/SpotsPage';
import VehicleEntryPage from './pages/VehicleEntryPage';
import VehicleExitPage from './pages/VehicleExitPage';
import RegisterVehiclePage from './pages/RegisterVehiclePage';
import ManageLevels from './pages/admin/ManageLevels';
import VehiclesPage from './pages/admin/VehiclesPage';
import AdminDashboard from './pages/admin/AdminDashboard';
import ScheduleParking from './pages/ScheduleParking';
import MyReservations from './pages/MyReservations';
import NavBar from './components/NavBar';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="container mt-5">
          <div className="alert alert-danger">
            Something went wrong: {this.state.error?.message}
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center min-vh-100">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  return isAuthenticated ? children : <Navigate to="/login" />;
}

function UserRoute({ children }) {
  const { isAuthenticated, isUser, loading } = useAuth();

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center min-vh-100">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }

  // Allow both users and admins to access user routes
  return children;
}

function AdminRoute({ children }) {
  const { isAuthenticated, isAdmin, loading } = useAuth();

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center min-vh-100">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }

  if (!isAdmin()) {
    return (
      <div className="container mt-5">
        <div className="alert alert-danger">
          <h4>Access Denied</h4>
          <p>You don't have permission to access this page. Admin access required.</p>
          <a href="/" className="btn btn-primary">Go to Dashboard</a>
        </div>
      </div>
    );
  }

  return children;
}

function AuthenticatedLayout({ children }) {
  return (
    <>
      <NavBar />
      <main>{children}</main>
    </>
  );
}

function AppRoutes() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center min-vh-100">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={isAuthenticated ? <Navigate to="/" /> : <Login />} />

      {/* Common Routes - Available to all authenticated users */}
      <Route path="/" element={
        <ProtectedRoute>
          <AuthenticatedLayout><Dashboard /></AuthenticatedLayout>
        </ProtectedRoute>
      } />

      <Route path="/levels" element={
        <ProtectedRoute>
          <AuthenticatedLayout><LevelsPage /></AuthenticatedLayout>
        </ProtectedRoute>
      } />

      <Route path="/levels/:levelId/spots" element={
        <ProtectedRoute>
          <AuthenticatedLayout><SpotsPage /></AuthenticatedLayout>
        </ProtectedRoute>
      } />

      {/* User Routes - Create ticket and manage tickets */}
      <Route path="/create-ticket" element={
        <UserRoute>
          <AuthenticatedLayout><CreateTicket /></AuthenticatedLayout>
        </UserRoute>
      } />

      <Route path="/create" element={
        <UserRoute>
          <AuthenticatedLayout><CreateTicket /></AuthenticatedLayout>
        </UserRoute>
      } />

      <Route path="/my-tickets" element={
        <UserRoute>
          <AuthenticatedLayout><MyTickets /></AuthenticatedLayout>
        </UserRoute>
      } />

      <Route path="/tickets" element={
        <UserRoute>
          <AuthenticatedLayout><MyTickets /></AuthenticatedLayout>
        </UserRoute>
      } />

      <Route path="/tickets/:id" element={
        <UserRoute>
          <AuthenticatedLayout><TicketDetails /></AuthenticatedLayout>
        </UserRoute>
      } />

      {/* Reservation Routes */}
      <Route path="/schedule-parking" element={
        <UserRoute>
          <AuthenticatedLayout><ScheduleParking /></AuthenticatedLayout>
        </UserRoute>
      } />

      <Route path="/reservations" element={
        <UserRoute>
          <AuthenticatedLayout><MyReservations /></AuthenticatedLayout>
        </UserRoute>
      } />

      {/* Admin Dashboard */}
      <Route path="/admin/dashboard" element={
        <AdminRoute>
          <AuthenticatedLayout><AdminDashboard /></AuthenticatedLayout>
        </AdminRoute>
      } />

      {/* Admin-Only Routes */}
      <Route path="/entry" element={
        <AdminRoute>
          <AuthenticatedLayout><VehicleEntryPage /></AuthenticatedLayout>
        </AdminRoute>
      } />

      <Route path="/exit" element={
        <AdminRoute>
          <AuthenticatedLayout><VehicleExitPage /></AuthenticatedLayout>
        </AdminRoute>
      } />

      <Route path="/vehicle/register" element={
        <AdminRoute>
          <AuthenticatedLayout><RegisterVehiclePage /></AuthenticatedLayout>
        </AdminRoute>
      } />

      <Route path="/admin/levels" element={
        <AdminRoute>
          <AuthenticatedLayout><ManageLevels /></AuthenticatedLayout>
        </AdminRoute>
      } />

      <Route path="/admin/manage-levels" element={
        <AdminRoute>
          <AuthenticatedLayout><ManageLevels /></AuthenticatedLayout>
        </AdminRoute>
      } />

      <Route path="/admin/vehicles" element={
        <AdminRoute>
          <AuthenticatedLayout><VehiclesPage /></AuthenticatedLayout>
        </AdminRoute>
      } />

      {/* Catch all - redirect to dashboard */}
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <Router>
          <AppRoutes />
        </Router>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
