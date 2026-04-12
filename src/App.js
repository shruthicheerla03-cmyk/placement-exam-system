import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { auth } from './firebase/config';
import { onAuthStateChanged } from 'firebase/auth';

import Login from './pages/Login';
import Register from './pages/Register';
import StudentDashboard from './pages/StudentDashboard';
import AdminLogin from './pages/AdminLogin';
import AdminDashboard from './pages/AdminDashboard';
import ExamPage from './pages/ExamPage';
import ViewExam from './pages/ViewExam';
import EditExam from './pages/EditExam';

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
        <Route path="/admin" element={<AdminLogin />} />
        <Route path="/admin/dashboard" element={<AdminDashboard />} />
        <Route path="/admin/exam/:examId" element={<ViewExam />} />
        <Route path="/admin/exam/:examId/edit" element={<EditExam />} />
        <Route path="/exam/:examId" element={user ? <ExamPage /> : <Navigate to="/" />} />
      </Routes>
    </Router>
  );
}

export default App;