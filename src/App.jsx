import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Tracker from './pages/Tracker';
import Dashboard from './pages/Dashboard';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/tracker" element={<Tracker />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
