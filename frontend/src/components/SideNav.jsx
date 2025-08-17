import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const SideNav = ({ onClose }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    // { name: 'Dashboard', icon: '📊', path: '/', count: null },
    { name: 'Add Parts', icon: '📦', path: '/in-stocks', count: null },
    { name: 'Assembly', icon: '⚙️', path: '/assembly', count: null },
  ];

  const handleNavigation = (path) => {
    navigate(path);
    // Close mobile sidebar after navigation
    if (onClose) {
      onClose();
    }
  };

  return (
    <div className="w-64 bg-white h-full border-r border-gray-200 flex flex-col">
      {/* Close button for mobile */}
      {onClose && (
        <div className="lg:hidden flex justify-end p-2">
          <button
            onClick={onClose}
            className="p-2 rounded-md text-gray-400 hover:text-gray-600"
          >
            <span className="sr-only">Close sidebar</span>
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Logo */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center">
            <span className="text-white text-sm">🛍️</span>
          </div>
          <span className="text-xl font-bold text-gray-800">TRANSELECTRICAL</span>
        </div>
      </div>

      {/* Navigation Items */}
      <nav className="flex-1 p-4">
        <ul className="space-y-2">
          {navItems.map((item, index) => (
            <li key={index}>
              <button
                onClick={() => handleNavigation(item.path)}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-lg transition-colors ${
                  location.pathname === item.path
                    ? 'bg-purple-100 text-purple-600 border-r-2 border-purple-600'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <span className="text-lg">{item.icon}</span>
                  <span className="font-medium">{item.name}</span>
                </div>
                {item.count && (
                  <span className="bg-gray-200 text-gray-600 px-2 py-1 rounded-full text-xs font-medium">
                    {item.count}
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
};

export default SideNav;
