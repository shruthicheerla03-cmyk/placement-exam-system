import React, { useState } from 'react';
import { auth } from '../firebase/config';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import './Login.css';
import illustration from '../assets/login-illustration.png';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigate('/student');
    } catch (err) {
      setError('Invalid email or password. Please try again.');
    }
  };

  return (
    <div className="login-container">
      <div className="login-wrapper">
        <div className="login-card">
          <h2 className="login-title">🎓 Placement Exam System</h2>
          <h3 className="login-subtitle">Student Login</h3>
          {error && <p className="error-message">{error}</p>}
          <form onSubmit={handleLogin}>
            <div className="input-container">
              <input
                className="input-field"
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="input-container">
              <div className="password-wrapper">
                <input
                  className="input-field"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <div 
                  className="password-icon" 
                  onClick={() => setShowPassword(!showPassword)}
                  title={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </div>
              </div>
            </div>
            <button className="login-button" type="submit">Login</button>
          </form>
          <p className="register-link">
            Don't have an account? <Link to="/register">Register here</Link>
          </p>
        </div>
        <div className="login-illustration">
          <img src={illustration} alt="Placement Exam Illustration" />
          <div className="illustration-overlay">
            <h4>Empower Your Future</h4>
            <p>Access top tier placement opportunities through our advanced examination system.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;
