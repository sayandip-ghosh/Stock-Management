import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import SideNav from './SideNav';

const Layout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, logout } = useAuth();

  const handleLogout = () => {
    if (window.confirm('Are you sure you want to logout?')) {
      logout();
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex max-w-full overflow-hidden">
      {/* Desktop Sidebar - Fixed */}
      <div className="hidden lg:flex lg:flex-shrink-0">
        <SideNav />
      </div>

      {/* Mobile Sidebar - Overlay */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="fixed inset-0 bg-black opacity-50" onClick={() => setSidebarOpen(false)} />
          <div className="relative flex-1 flex flex-col max-w-xs w-full bg-white">
            <SideNav onClose={() => setSidebarOpen(false)} />
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="flex flex-col flex-1 lg:flex-1 min-w-0 overflow-hidden">
        {/* Top navigation */}
        <nav className="bg-white shadow-sm border-b border-gray-200">
          <div className="px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16">
              <div className="flex items-center">
                {/* Mobile menu button */}
                <button
                  onClick={() => setSidebarOpen(true)}
                  className="lg:hidden p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100"
                >
                  <span className="sr-only">Open sidebar</span>
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>

                {/* Breadcrumb or page title */}
                <div className="ml-4 lg:ml-0">
                  <h1 className="text-lg font-medium text-gray-900">
                    Stock Management System
                  </h1>
                </div>
              </div>

              {/* Right side - User menu */}
              <div className="flex items-center space-x-4">

                {/* User menu */}
                <div className="flex items-center space-x-3">
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                      <span className="text-purple-600 text-sm font-medium">
                        {user?.name?.charAt(0) || 'A'}
                      </span>
                    </div>
                    <div className="hidden sm:block">
                      <span className="text-sm font-medium text-gray-700">
                        {user?.name || 'Admin'}
                      </span>
                      <div className="text-xs text-gray-500">{user?.role || 'Administrator'}</div>
                    </div>
                  </div>
                  
                  <button
                    onClick={handleLogout}
                    className="text-sm text-red-600 hover:text-red-800 font-medium px-3 py-2 rounded-md hover:bg-red-50 transition-colors duration-200"
                  >
                    Logout
                  </button>
                </div>
              </div>
            </div>
          </div>
        </nav>

        {/* Main content area */}
        <main className="flex-1 py-6 min-w-0 overflow-hidden">
          <div className="px-4 sm:px-6 lg:px-8 max-w-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;
