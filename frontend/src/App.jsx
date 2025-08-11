import React from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import InStocks from './pages/InStocks';
import Assembly from './pages/Assembly';

const App = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/in-stocks" element={<InStocks />} />
        <Route path="/assembly" element={<Assembly />} />
      </Routes>
    </Router>
  );
};  

export default App;