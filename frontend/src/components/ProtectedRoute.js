import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';

/**
 * A wrapper component for routes that require authentication
 * Redirects to login page if user is not authenticated
 */
const ProtectedRoute = ({ user, children }) => {
  const location = useLocation();

  if (!user) {
    // Redirect to login page with a return URL
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  return children;
};

export default ProtectedRoute;
