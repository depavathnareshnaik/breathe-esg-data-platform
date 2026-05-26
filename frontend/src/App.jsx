import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Login from './pages/Login';
import ReviewDashboard from './pages/ReviewDashboard';
import Upload from './pages/Upload';
import RecordDetails from './pages/RecordDetails';
import AuditLogs from './pages/AuditLogs';
import { auth } from './services/api';

// Guard component checking if a token is present in localStorage
function ProtectedRoute({ children }) {
  if (!auth.isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }
  return (
    <div className="app-container">
      <Sidebar />
      <main className="main-content">
        {children}
      </main>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        
        <Route 
          path="/dashboard" 
          element={
            <ProtectedRoute>
              <ReviewDashboard />
            </ProtectedRoute>
          } 
        />
        
        <Route 
          path="/upload" 
          element={
            <ProtectedRoute>
              <Upload />
            </ProtectedRoute>
          } 
        />
        
        <Route 
          path="/records/:id" 
          element={
            <ProtectedRoute>
              <RecordDetails />
            </ProtectedRoute>
          } 
        />
        
        <Route 
          path="/audit" 
          element={
            <ProtectedRoute>
              <AuditLogs />
            </ProtectedRoute>
          } 
        />
        
        {/* Wildcard Fallback */}
        <Route 
          path="*" 
          element={<Navigate to={auth.isAuthenticated() ? "/dashboard" : "/login"} replace />} 
        />
      </Routes>
    </BrowserRouter>
  );
}
