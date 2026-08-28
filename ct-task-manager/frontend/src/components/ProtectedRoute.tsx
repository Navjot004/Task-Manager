import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: string[];
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
  const { isAuthenticated, loading, currentUser } = useAuth();
  const location = useLocation();

  if (loading) {
    return <div className="page-container"><div className="vu-loading">Loading...</div></div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && currentUser && !allowedRoles.includes(currentUser.role)) {
    // If authenticated but wrong role, redirect to appropriate dashboard
    switch (currentUser.role) {
      case 'super_admin':
        return <Navigate to="/super-admin" replace />;
      case 'department_admin':
        return <Navigate to="/admin" replace />;
      case 'staff':
      default:
        return <Navigate to="/staff" replace />;
    }
  }

  return <>{children}</>;
};

export default ProtectedRoute;
