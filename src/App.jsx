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
import PageTransition, { LoadingScreen } from './components/ui/PageTransition';
import BackgroundParallax from './components/ui/BackgroundParallax';

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

  // Show the cinematic transition screen while checking auth
  if (loading) {
    return (
      <Router>
        <BackgroundParallax />
        <LoadingScreen />
      </Router>
    );
  }

  return (
    <Router>
      <BackgroundParallax />
      <PageTransition>
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
      </PageTransition>
    </Router>
  );
}