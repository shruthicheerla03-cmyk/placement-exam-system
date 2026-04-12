import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { auth, db } from '../firebase/config';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { Eye, EyeOff, ShieldCheck, ArrowLeft } from 'lucide-react';
import './AdminLogin.css';

function AdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Step 1: Try to sign in with Firebase Auth
      let userCredential;
      try {
        userCredential = await signInWithEmailAndPassword(auth, email, password);
      } catch (signInError) {
        // If user doesn't exist and it's admin credentials, create admin user
        const isUserNotFound = signInError.code === 'auth/user-not-found' || 
                               signInError.code === 'auth/invalid-credential';
        
        if (isUserNotFound && email === 'admin@gmail.com' && password === 'admin123') {
          
          console.log('🔧 Creating admin account...');
          
          // Auto-create admin account
          userCredential = await createUserWithEmailAndPassword(auth, email, password);
          
          // Store admin role in Firestore
          await setDoc(doc(db, 'users', userCredential.user.uid), {
            email: email,
            role: 'admin',
            name: 'Administrator',
            createdAt: new Date()
          });
          
          console.log('✅ Admin account created successfully!');
          console.log('🔑 Admin UID:', userCredential.user.uid);
          console.log('📄 Document Path: users/' + userCredential.user.uid);
        } else {
          throw signInError;
        }
      }

      // Step 2: Check if user has admin role in Firestore
      const userDoc = await getDoc(doc(db, 'users', userCredential.user.uid));
      
      console.log('🔍 Checking user document at: users/' + userCredential.user.uid);
      console.log('📄 Document exists:', userDoc.exists());
      
      if (!userDoc.exists()) {
        throw new Error('User profile not found');
      }
      
      const userData = userDoc.data();
      console.log('👤 User role:', userData.role);
      
      if (userData.role !== 'admin') {
        await auth.signOut();
        setError('❌ Access Denied. Admin privileges required.');
        setLoading(false);
        return;
      }

      // Step 3: Grant access
      localStorage.setItem('adminAuth', 'true');
      localStorage.setItem('adminEmail', email);
      navigate('/admin/dashboard');

    } catch (err) {
      console.error('Login error:', err);
      if (err.code === 'auth/wrong-password') {
        setError('❌ Invalid password. Use: admin123');
      } else if (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') {
        setError('❌ Invalid credentials. Use: admin@gmail.com / admin123');
      } else if (err.code === 'permission-denied' || err.message?.includes('permission')) {
        setError('🔥 Firestore permissions not configured! Update rules in Firebase Console.');
      } else {
        setError('❌ Login failed: ' + err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-login-container">
      <div className="admin-login-card">
        <div className="admin-header">
          <div className="admin-icon-wrapper">
            <ShieldCheck size={48} />
          </div>
          <h2 className="admin-title">Admin Access</h2>
          <p className="admin-subtitle">Authorized Personnel Only</p>
        </div>

        {error && <div className="error-alert">{error}</div>}

        <form onSubmit={handleLogin} className="admin-form">
          <div className="admin-form-group">
            <label className="admin-label">Admin Email</label>
            <input
              className="admin-input"
              type="email"
              placeholder="admin@gmail.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>

          <div className="admin-form-group">
            <label className="admin-label">Password</label>
            <div className="admin-input-wrapper">
              <input
                className="admin-input"
                type={showPassword ? "text" : "password"}
                placeholder="Enter admin password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
              <div 
                className="admin-password-toggle"
                onClick={() => setShowPassword(!showPassword)}
                title={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </div>
            </div>
          </div>

          <button className="admin-login-button" type="submit" disabled={loading}>
            {loading ? '⏳ Authenticating...' : '🔓 Access Dashboard'}
          </button>
        </form>

        <div className="admin-credentials-box">
          <p className="credentials-title">🔑 Default Credentials:</p>
          <p className="credentials-content">
            Email: <code>admin@gmail.com</code><br />
            Password: <code>admin123</code>
          </p>
        </div>

        <div className="admin-footer">
          <Link to="/" className="back-link">
            <ArrowLeft size={16} style={{ verticalAlign: 'middle', marginRight: '5px' }} />
            Back to Student Login
          </Link>
        </div>
      </div>
    </div>
  );
}

export default AdminLogin;

