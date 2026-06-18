import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Riders from './pages/Riders';
import Bookings from './pages/Bookings';
import Payments from './pages/Payments';
import Settings from './pages/Settings';
import Support from './pages/Support';

function PrivateRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex items-center justify-center min-h-screen bg-background"><span className="material-symbols-outlined animate-spin text-primary text-3xl">progress_activity</span></div>;
  return user ? children : <Navigate to="/login" />;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<PrivateRoute><Layout><Dashboard /></Layout></PrivateRoute>} />
      <Route path="/riders" element={<PrivateRoute><Layout><Riders /></Layout></PrivateRoute>} />
      <Route path="/bookings" element={<PrivateRoute><Layout><Bookings /></Layout></PrivateRoute>} />
      <Route path="/payments" element={<PrivateRoute><Layout><Payments /></Layout></PrivateRoute>} />
      <Route path="/settings" element={<PrivateRoute><Layout><Settings /></Layout></PrivateRoute>} />
      <Route path="/support" element={<PrivateRoute><Layout><Support /></Layout></PrivateRoute>} />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <AppRoutes />
      </Router>
    </AuthProvider>
  );
}

export default App;
