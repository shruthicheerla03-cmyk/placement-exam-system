import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { auth } from './firebase/config';
import { onAuthStateChanged } from 'firebase/auth';

import Login from './pages/Login';
import Register from './pages/Register';
import StudentDashboard from './pages/StudentDashboard';
import AdminDashboard from './pages/AdminDashboard';
import ExamPage from './pages/ExamPage';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  if (loading) return <div style={{textAlign:'center', marginTop:'100px'}}>Loading...</div>;

  return (
    <Router>
      <Routes>
        <Route path="/" element={user ? <Navigate to="/student" /> : <Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/student" element={user ? <StudentDashboard /> : <Navigate to="/" />} />
        <Route path="/admin" element={user ? <AdminDashboard /> : <Navigate to="/" />} />
        <Route path="/exam/:examId" element={user ? <ExamPage /> : <Navigate to="/" />} />
      </Routes>
    </Router>
  );
}

export default App;