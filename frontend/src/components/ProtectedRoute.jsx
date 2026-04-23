/**
 * ProtectedRoute Component
 * 
 * Route guard that redirects unauthenticated users to login
 * Supports role-based access control for admin routes
 */

import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ 
  children, 
  requireAuth = true, 
  requireAdmin = false,
  redirectTo = "/login"
}) => {
  const { isAuthenticated, user, loading } = useAuth();
  const location = useLocation();

  // Show loading state while auth is initializing
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // If no auth required (public route), render children
  if (!requireAuth) {
    return children;
  }

  // If not authenticated, redirect to login
  if (!isAuthenticated) {
    const currentPath = location.pathname + location.search;
    return (
      <Navigate
        to={`${redirectTo}?redirect=${encodeURIComponent(currentPath)}`}
        replace
      />
    );
  }

  // If admin route but user is not admin
  if (requireAdmin && user?.isAdmin !== true) {
    return <Navigate to="/" replace />;
  }

  // Authenticated and has required role
  return children;
};

export default ProtectedRoute;
