import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { auth, db } from '../firebase/config';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';

function AdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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
    <div style={styles.container}>
      <div style={styles.box}>
        <div style={styles.header}>
          <div style={styles.icon}>🔐</div>
          <h2 style={styles.title}>Admin Access</h2>
          <p style={styles.subtitle}>Authorized Personnel Only</p>
        </div>

        {error && <div style={styles.error}>{error}</div>}

        <form onSubmit={handleLogin} style={styles.form}>
          <div style={styles.inputGroup}>
            <label style={styles.label}>Admin Email</label>
            <input
              style={styles.input}
              type="email"
              placeholder="admin@gmail.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>Password</label>
            <input
              style={styles.input}
              type="password"
              placeholder="Enter admin password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </div>

          <button style={styles.button} type="submit" disabled={loading}>
            {loading ? '⏳ Authenticating...' : '🔓 Access Dashboard'}
          </button>
        </form>

        <div style={styles.credentials}>
          <p style={styles.credentialsTitle}>🔑 Default Credentials:</p>
          <p style={styles.credentialsText}>
            Email: <code>admin@gmail.com</code><br />
            Password: <code>admin123</code>
          </p>
        </div>

        <div style={styles.footer}>
          <Link to="/" style={styles.link}>← Back to Student Login</Link>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100vh',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    fontFamily: 'Arial, sans-serif'
  },
  box: {
    backgroundColor: 'white',
    padding: '40px',
    borderRadius: '16px',
    boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
    width: '420px',
    maxWidth: '90%'
  },
  header: {
    textAlign: 'center',
    marginBottom: '30px'
  },
  icon: {
    fontSize: '60px',
    marginBottom: '15px'
  },
  title: {
    margin: '0 0 8px 0',
    color: '#2c3e50',
    fontSize: '28px',
    fontWeight: 'bold'
  },
  subtitle: {
    margin: 0,
    color: '#7f8c8d',
    fontSize: '14px',
    fontWeight: '500'
  },
  form: {
    marginBottom: '25px'
  },
  inputGroup: {
    marginBottom: '20px'
  },
  label: {
    display: 'block',
    marginBottom: '8px',
    color: '#2c3e50',
    fontSize: '14px',
    fontWeight: '600'
  },
  input: {
    width: '100%',
    padding: '14px',
    borderRadius: '8px',
    border: '2px solid #e0e0e0',
    fontSize: '15px',
    boxSizing: 'border-box',
    transition: 'border-color 0.3s',
    outline: 'none'
  },
  button: {
    width: '100%',
    padding: '14px',
    backgroundColor: '#667eea',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: 'background-color 0.3s',
    marginTop: '10px'
  },
  error: {
    backgroundColor: '#fee',
    color: '#c00',
    padding: '12px',
    borderRadius: '8px',
    marginBottom: '20px',
    textAlign: 'center',
    fontSize: '14px',
    fontWeight: '500',
    border: '1px solid #fcc'
  },
  credentials: {
    backgroundColor: '#f8f9fa',
    padding: '15px',
    borderRadius: '8px',
    marginBottom: '20px',
    border: '1px dashed #dee2e6'
  },
  credentialsTitle: {
    margin: '0 0 10px 0',
    fontSize: '13px',
    fontWeight: 'bold',
    color: '#495057'
  },
  credentialsText: {
    margin: 0,
    fontSize: '13px',
    color: '#6c757d',
    lineHeight: '1.6'
  },
  footer: {
    textAlign: 'center',
    paddingTop: '15px',
    borderTop: '1px solid #e0e0e0'
  },
  link: {
    color: '#667eea',
    textDecoration: 'none',
    fontSize: '14px',
    fontWeight: '500'
  }
};

export default AdminLogin;
