import React, { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../services/api';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showSignup, setShowSignup] = useState(false);
  const [showLogin, setShowLogin] = useState(false);

  // Check authentication status on app load
  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      setLoading(true);
      
      // First check if any user exists in the system
      const checkResponse = await authAPI.checkUserExists();
      setShowSignup(checkResponse.data.showSignup);
      setShowLogin(checkResponse.data.showLogin);
      
      // If user exists, try to verify token
      if (checkResponse.data.userExists) {
        const token = localStorage.getItem('token');
        if (token) {
          try {
            const verifyResponse = await authAPI.verifyToken();
            setUser(verifyResponse.data.user);
            setIsAuthenticated(true);
          } catch (error) {
            // Token is invalid, remove it
            localStorage.removeItem('token');
            setUser(null);
            setIsAuthenticated(false);
          }
        }
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      setUser(null);
      setIsAuthenticated(false);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    try {
      const response = await authAPI.login({ email, password });
      const { token, user } = response.data;
      
      localStorage.setItem('token', token);
      setUser(user);
      setIsAuthenticated(true);
      setShowLogin(false);
      setShowSignup(false);
      
      return { success: true, user };
    } catch (error) {
      console.error('Login failed:', error);
      return { 
        success: false, 
        error: error.response?.data?.message || 'Login failed' 
      };
    }
  };

  const signup = async (email, password, name) => {
    try {
      const response = await authAPI.signup({ email, password, name });
      const { token, user } = response.data;
      
      localStorage.setItem('token', token);
      setUser(user);
      setIsAuthenticated(true);
      setShowLogin(false);
      setShowSignup(false);
      
      return { success: true, user };
    } catch (error) {
      console.error('Signup failed:', error);
      return { 
        success: false, 
        error: error.response?.data?.message || 'Signup failed' 
      };
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
    setIsAuthenticated(false);
    // Refresh to check if we should show signup or login
    checkAuthStatus();
  };

  const value = {
    user,
    isAuthenticated,
    loading,
    showSignup,
    showLogin,
    login,
    signup,
    logout,
    checkAuthStatus
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
