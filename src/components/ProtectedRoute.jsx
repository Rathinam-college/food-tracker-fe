import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ children, permission }) => {
  const { user, loading, hasPermission } = useAuth();
  const location = useLocation();

  if (loading) {
    return <div className="loading-spinner">Loading...</div>; // TODO: Better spinner
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (permission && !hasPermission(permission)) {
    // Determine landing page route
    const landing = user.profile?.landing_page;
    let redirectTo = '/launcher';
    if (landing === 'procurement') redirectTo = '/procurement';
    else if (landing === 'kitchen') redirectTo = '/kitchen';

    console.warn(`Access denied for ${permission}. Redirecting to ${redirectTo}`);
    return <Navigate to={redirectTo} replace />;
  }

  return children;
};

export default ProtectedRoute;
