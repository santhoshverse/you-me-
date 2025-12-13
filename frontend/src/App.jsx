import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import RoomPage from './components/RoomPage';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Navigate to={`/room/${Math.random().toString(36).substr(2, 9)}`} replace />} />
        <Route path="/room/:roomId" element={<RoomPage />} />
        {/* Catch all redirect to home */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
