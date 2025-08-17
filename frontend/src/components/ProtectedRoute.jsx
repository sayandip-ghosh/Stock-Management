import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import AuthForm from './AuthForm';

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading, showSignup, showLogin } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated && (showSignup || showLogin)) {
    return <AuthForm />;
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="text-red-500 text-xl font-semibold mb-2">Access Denied</div>
          <div className="text-gray-600">Please login to access this application</div>
        </div>
      </div>
    );
  }

  return children;
};

export default ProtectedRoute;
