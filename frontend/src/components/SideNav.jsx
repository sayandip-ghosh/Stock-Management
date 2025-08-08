import React from 'react';

const SideNav = () => {
  const navItems = [
    { name: 'Dashboard', icon: '📊', count: null },
    { name: 'Order', icon: '🛍️', count: 7 },
    { name: 'Offers', icon: '⚙️', count: 2 },
    { name: 'Products', icon: '📦', count: 120 },
    { name: 'Stock', icon: '🏠', count: null, active: true },
    { name: 'Message', icon: '💬', count: 1 },
    { name: 'Feeds', icon: '📋', count: null },
    { name: 'Settings', icon: '⚙️', count: null },
    { name: 'Back to Home', icon: '🏠', count: null }
  ];

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
              <a
                href="#"
                className={`flex items-center justify-between px-4 py-3 rounded-lg transition-colors ${
                  item.active
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
              </a>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
};

export default SideNav;
