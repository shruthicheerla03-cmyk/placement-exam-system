import React, { useState } from 'react';
import { auth } from '../firebase/config';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff, Mail, Lock, GraduationCap } from 'lucide-react';
import styles from './Login.module.css';
import illustration from '../assets/login1.png';

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
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.formPanel}>
          <div className={styles.brand}>
            <div className={styles.brandMark}><GraduationCap size={18} /></div>
            <div>
              <h2 className={styles.title}>Placement Exam System</h2>
              <div className={styles.subtitle}>Student Login</div>
            </div>
          </div>

          {error && <div className={styles.errorBox}>{error}</div>}

          <form className={styles.form} onSubmit={handleLogin}>
            <label className={styles.srOnly}>
              Email
              <div className={styles.field}>
                <Mail className={styles.icon} />
                <input
                  aria-label="Email address"
                  autoFocus
                  className={styles.input}
                  type="email"
                  placeholder="Email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </label>

            <label className={styles.srOnly}>
              Password
              <div className={`${styles.field} ${styles.passwordWrap}`}>
                <Lock className={styles.icon} />
                <input
                  aria-label="Password"
                  className={styles.input}
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <div className={styles.toggle} onClick={() => setShowPassword(!showPassword)} title={showPassword ? 'Hide password' : 'Show password'}>
                  {showPassword ? <EyeOff /> : <Eye />}
                </div>
              </div>
            </label>

            <button className={styles.btn} type="submit">Login</button>
          </form>

          <div className={styles.linkRow}>Don't have an account? <Link to="/register">Register here</Link></div>
        </div>

        <div className={styles.imagePanel} aria-hidden>
          <div className={styles.imageWrap}>
            <img src={illustration} alt="" className={styles.image} />
          </div>
          <div className={styles.imageOverlay} />
        </div>
      </div>
    </div>
  );
}

export default Login;

