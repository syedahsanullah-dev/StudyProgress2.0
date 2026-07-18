import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../firebase';

// Page Imports (We will build these next)
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import SubjectsList from './pages/SubjectsList';
import SubjectDetail from './pages/SubjectDetail';
import BulkEntry from './pages/BulkEntry';
import TargetCalculator from './pages/TargetCalculator';
export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Listen for Firebase login state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Show a simple dark mode loading screen while checking auth
  if (loading) {
    return (
      <div className="min-h-screen bg-[#0F172A] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        {/* Public Route */}
        <Route 
          path="/login" 
          element={!user ? <Login /> : <Navigate to="/dashboard" />} 
        />
        
        {/* Protected Routes */}
        <Route 
          path="/dashboard" 
          element={user ? <Dashboard /> : <Navigate to="/login" />} 
        />

        <Route 
          path="/subjects" 
          element={user ? <SubjectsList /> : <Navigate to="/login" />} 
        />
        <Route 
          path="/subjects/:id" 
          element={user ? <SubjectDetail /> : <Navigate to="/login" />} 
        />
        
        <Route 
          path="/bulk-entry" 
          element={user ? <BulkEntry /> : <Navigate to="/login" />} 
        />
        <Route 
          path="/calculator" 
          element={user ? <TargetCalculator /> : <Navigate to="/login" />} 
        />
        
        {/* Fallback Route */}
        <Route 
          path="*" 
          element={<Navigate to={user ? "/dashboard" : "/login"} />} 
        />

      
      </Routes>
    </Router>
  );
}