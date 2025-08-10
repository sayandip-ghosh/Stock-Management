import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const SideNav = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    { name: 'Dashboard', icon: '📊', path: '/dashboard', count: null },
    { name: 'Add Stocks', icon: '📦', path: '/in-stocks', count: null },
    { name: 'Order', icon: '🛍️', path: '/order', count: 7 },
    { name: 'Offers', icon: '⚙️', path: '/offers', count: 2 },
    { name: 'Products', icon: '📦', path: '/products', count: 120 },
    { name: 'Message', icon: '💬', path: '/message', count: 1 },
    { name: 'Feeds', icon: '📋', path: '/feeds', count: null },
    { name: 'Settings', icon: '⚙️', path: '/settings', count: null },
    { name: 'Back to Home', icon: '🏠', path: '/', count: null }
  ];

  const handleNavigation = (path) => {
    navigate(path);
  };

  return (
    <div className="w-64 bg-white h-screen border-r border-gray-200 flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center">
            <span className="text-white text-sm">🛍️</span>
          </div>
          <span className="text-xl font-bold text-gray-800">SHOPLN</span>
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
