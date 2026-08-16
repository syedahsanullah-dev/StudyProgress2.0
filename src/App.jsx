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
import Datesheet from './pages/Datesheet';
import Settings from './pages/Settings';
import PageTransition, { LoadingScreen } from './components/ui/PageTransition';
import BackgroundParallax from './components/ui/BackgroundParallax';
import InitialLoader from './components/ui/InitialLoader';
import useStore from './store/useStore';

export default function App() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [showInitialLoader, setShowInitialLoader] = useState(() => {
    return sessionStorage.getItem('hasSeenInitialLoader') !== 'true';
  });

  // Listen for Firebase login state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      
      if (currentUser) {
        useStore.getState().initialize(currentUser.uid);
      } else {
        useStore.getState().clearStore();
      }
      
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  return (
    <Router>
      <BackgroundParallax />
      
      {showInitialLoader && <InitialLoader onComplete={() => setShowInitialLoader(false)} />}
      
      {authLoading ? (
        <LoadingScreen />
      ) : (
        <PageTransition skipInitialAnimation={showInitialLoader}>
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
        
        <Route 
          path="/datesheet" 
          element={user ? <Datesheet /> : <Navigate to="/login" />} 
        />
        
        <Route 
          path="/settings" 
          element={user ? <Settings /> : <Navigate to="/login" />} 
        />
        
        {/* Fallback Route */}
        <Route 
          path="*" 
          element={<Navigate to={user ? "/dashboard" : "/login"} />} 
        />

      
      </Routes>
        </PageTransition>
      )}
    </Router>
  );
}