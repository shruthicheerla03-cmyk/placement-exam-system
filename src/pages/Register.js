import React, { useState } from 'react';
import { auth, db } from '../firebase/config';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { useNavigate, Link } from 'react-router-dom';

function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      await setDoc(doc(db, 'users', user.uid), {
        name: name,
        email: email,
        role: 'student',
        createdAt: new Date()
      });
      navigate('/student');
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.box}>
        <h2 style={styles.title}>🎓 Placement Exam System</h2>
        <h3 style={styles.subtitle}>Create Account</h3>
        {error && <p style={styles.error}>{error}</p>}
        <form onSubmit={handleRegister}>
          <input
            style={styles.input}
            type="text"
            placeholder="Enter your full name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <input
            style={styles.input}
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            style={styles.input}
            type="password"
            placeholder="Create a password (min 6 chars)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button style={styles.button} type="submit">Register</button>
        </form>
        <p style={styles.link}>Already have an account? <Link to="/">Login here</Link></p>
      </div>
    </div>
  );
}

const styles = {
  container: { display:'flex', justifyContent:'center', alignItems:'center', height:'100vh', backgroundColor:'#f0f4f8' },
  box: { backgroundColor:'white', padding:'40px', borderRadius:'12px', boxShadow:'0 4px 20px rgba(0,0,0,0.1)', width:'380px' },
  title: { textAlign:'center', color:'#2c3e50', marginBottom:'5px' },
  subtitle: { textAlign:'center', color:'#7f8c8d', marginBottom:'20px' },
  input: { width:'100%', padding:'12px', marginBottom:'15px', borderRadius:'8px', border:'1px solid #ddd', fontSize:'14px', boxSizing:'border-box' },
  button: { width:'100%', padding:'12px', backgroundColor:'#2ecc71', color:'white', border:'none', borderRadius:'8px', fontSize:'16px', cursor:'pointer' },
  error: { color:'red', textAlign:'center', marginBottom:'10px', fontSize:'13px' },
  link: { textAlign:'center', marginTop:'15px', fontSize:'14px' }
};

export default Register;