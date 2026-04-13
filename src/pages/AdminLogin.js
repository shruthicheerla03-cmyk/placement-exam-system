import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../firebase/config";

const ADMIN_EMAIL = "placementadmin@gmail.com";

export default function AdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    if (email !== ADMIN_EMAIL) {
      setError("Access denied. Authorized personnel only.");
      return;
    }
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      // ✅ FIX: Set adminAuth so AdminDashboard doesn't redirect back
      localStorage.setItem("adminAuth", "true");
      localStorage.setItem("adminEmail", email);
      navigate("/admin/dashboard");
    } catch (err) {
      setError("Invalid credentials. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.card}>

        {/* ── LEFT: Form Panel ── */}
        <div style={styles.left}>
          {/* Brand */}
          <div style={styles.brand}>
            <div style={styles.brandIcon}>
              <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 22, height: 22 }}>
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                <path d="M9 12l2 2 4-4" />
              </svg>
            </div>
            <div>
              <div style={styles.brandTitle}>Placement Exam System</div>
              <div style={styles.brandSub}>Admin Control Panel</div>
            </div>
          </div>

          <h1 style={styles.heading}>Admin Login</h1>
          <p style={styles.subheading}>Authorized Personnel Only</p>

          {error && (
            <div style={styles.errorBox}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 15, height: 15, flexShrink: 0 }}>
                <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              {error}
            </div>
          )}

          <form onSubmit={handleLogin}>
            {/* Email */}
            <div style={styles.fieldGroup}>
              <label style={styles.label}>Admin Email</label>
              <div style={styles.inputWrap}>
                <svg viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" style={styles.inputIcon}>
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>
                </svg>
                <input
                  type="email"
                  placeholder="placementadmin@gmail.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  style={styles.input}
                />
              </div>
            </div>

            {/* Password */}
            <div style={styles.fieldGroup}>
              <label style={styles.label}>Password</label>
              <div style={styles.inputWrap}>
                <svg viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" style={styles.inputIcon}>
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter admin password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  style={{ ...styles.input, paddingRight: 44 }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={styles.eyeBtn}
                >
                  {showPassword ? (
                    <svg viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" style={{ width: 18, height: 18 }}>
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/>
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" style={{ width: 18, height: 18 }}>
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading} style={styles.btn}>
              {loading ? "Verifying..." : "Access Dashboard"}
            </button>
          </form>

          <div style={styles.backLink}>
            <a href="/" style={styles.link}>← Back to Student Login</a>
          </div>
        </div>

        {/* ── RIGHT: Visual Panel ── */}
        <div style={styles.right}>
          {/* Decorative circles */}
          <div style={styles.circle1} />
          <div style={styles.circle2} />

          <div style={styles.rightContent}>
            {/* Shield icon big */}
            <div style={styles.shieldWrap}>
              <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 56, height: 56 }}>
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                <path d="M9 12l2 2 4-4"/>
              </svg>
            </div>

            <h2 style={styles.rightTitle}>Admin Control Center</h2>
            <p style={styles.rightSub}>Manage exams, monitor students,<br/>and drive placement excellence.</p>

            {/* Feature pills */}
            <div style={styles.pills}>
              {[
                { icon: "📊", label: "Analytics Dashboard" },
                { icon: "👁️", label: "Live Monitoring" },
                { icon: "📋", label: "Results Management" },
                { icon: "🗂️", label: "Question Bank" },
              ].map((f) => (
                <div key={f.label} style={styles.pill}>
                  <span style={{ fontSize: 14 }}>{f.icon}</span>
                  <span style={styles.pillText}>{f.label}</span>
                </div>
              ))}
            </div>

            {/* Credentials hint */}
            <div style={styles.credBox}>
              <div style={styles.credTitle}>🔑 Default Credentials</div>
              <div style={styles.credRow}>
                <span style={styles.credKey}>Email:</span>
                <code style={styles.credVal}>placementadmin@gmail.com</code>
              </div>
              <div style={styles.credRow}>
                <span style={styles.credKey}>Password:</span>
                <code style={styles.credVal}>admin1234</code>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

/* ── Styles ── */
const styles = {
  page: {
    minHeight: "100vh",
    background: "#eef2f7",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "24px 16px",
    fontFamily: "'Segoe UI', sans-serif",
  },
  card: {
    display: "flex",
    width: "100%",
    maxWidth: 900,
    minHeight: 560,
    borderRadius: 20,
    overflow: "hidden",
    boxShadow: "0 20px 60px rgba(0,0,0,0.12)",
  },
  left: {
    flex: 1,
    background: "#fff",
    padding: "48px 44px",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
  },
  brand: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    marginBottom: 28,
  },
  brandIcon: {
    width: 44,
    height: 44,
    background: "#1a2e6c",
    borderRadius: 10,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  brandTitle: {
    fontSize: 14,
    fontWeight: 700,
    color: "#1a2e6c",
    lineHeight: 1.3,
  },
  brandSub: {
    fontSize: 11,
    color: "#94a3b8",
    fontWeight: 500,
    textTransform: "uppercase",
    letterSpacing: "0.5px",
  },
  heading: {
    fontSize: 28,
    fontWeight: 800,
    color: "#0f172a",
    marginBottom: 4,
    letterSpacing: "-0.5px",
  },
  subheading: {
    fontSize: 13,
    color: "#94a3b8",
    marginBottom: 24,
  },
  errorBox: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    background: "#fef2f2",
    color: "#dc2626",
    border: "1px solid #fecaca",
    borderRadius: 10,
    padding: "10px 14px",
    fontSize: 13,
    marginBottom: 16,
  },
  fieldGroup: {
    marginBottom: 18,
  },
  label: {
    display: "block",
    fontSize: 13,
    fontWeight: 600,
    color: "#334155",
    marginBottom: 6,
  },
  inputWrap: {
    position: "relative",
  },
  inputIcon: {
    position: "absolute",
    left: 14,
    top: "50%",
    transform: "translateY(-50%)",
    width: 16,
    height: 16,
    pointerEvents: "none",
  },
  input: {
    width: "100%",
    height: 46,
    border: "1.5px solid #e2e8f0",
    borderRadius: 10,
    padding: "0 14px 0 42px",
    fontSize: 14,
    color: "#0f172a",
    background: "#fff",
    outline: "none",
    fontFamily: "inherit",
    transition: "border-color 0.15s",
  },
  eyeBtn: {
    position: "absolute",
    right: 12,
    top: "50%",
    transform: "translateY(-50%)",
    background: "none",
    border: "none",
    cursor: "pointer",
    padding: 0,
    display: "flex",
    alignItems: "center",
  },
  btn: {
    width: "100%",
    height: 48,
    background: "#1a2e6c",
    color: "#fff",
    border: "none",
    borderRadius: 10,
    fontSize: 15,
    fontWeight: 700,
    fontFamily: "inherit",
    cursor: "pointer",
    marginTop: 6,
    letterSpacing: "0.2px",
    transition: "background 0.15s",
  },
  backLink: {
    textAlign: "center",
    marginTop: 20,
    fontSize: 13,
    color: "#94a3b8",
  },
  link: {
    color: "#1a2e6c",
    fontWeight: 600,
    textDecoration: "none",
  },
  right: {
    width: "46%",
    background: "linear-gradient(145deg, #1a2e6c 0%, #2952c4 60%, #1a6fa8 100%)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "40px 32px",
    position: "relative",
    overflow: "hidden",
  },
  circle1: {
    position: "absolute",
    top: -70,
    right: -70,
    width: 220,
    height: 220,
    borderRadius: "50%",
    background: "rgba(255,255,255,0.07)",
  },
  circle2: {
    position: "absolute",
    bottom: -50,
    left: -50,
    width: 180,
    height: 180,
    borderRadius: "50%",
    background: "rgba(255,255,255,0.05)",
  },
  rightContent: {
    position: "relative",
    zIndex: 1,
    textAlign: "center",
    width: "100%",
  },
  shieldWrap: {
    width: 90,
    height: 90,
    background: "rgba(255,255,255,0.12)",
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    margin: "0 auto 20px",
    border: "1.5px solid rgba(255,255,255,0.2)",
  },
  rightTitle: {
    fontSize: 22,
    fontWeight: 800,
    color: "#fff",
    marginBottom: 10,
    letterSpacing: "-0.3px",
  },
  rightSub: {
    fontSize: 13,
    color: "rgba(255,255,255,0.7)",
    lineHeight: 1.6,
    marginBottom: 24,
  },
  pills: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
    marginBottom: 24,
  },
  pill: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    background: "rgba(255,255,255,0.12)",
    borderRadius: 10,
    padding: "10px 16px",
    border: "1px solid rgba(255,255,255,0.15)",
  },
  pillText: {
    fontSize: 13,
    fontWeight: 600,
    color: "#fff",
  },
  credBox: {
    background: "rgba(255,255,255,0.1)",
    border: "1px solid rgba(255,255,255,0.2)",
    borderRadius: 12,
    padding: "14px 18px",
    textAlign: "left",
  },
  credTitle: {
    fontSize: 12,
    fontWeight: 700,
    color: "rgba(255,255,255,0.8)",
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: "0.5px",
  },
  credRow: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  credKey: {
    fontSize: 12,
    color: "rgba(255,255,255,0.6)",
    minWidth: 60,
  },
  credVal: {
    fontSize: 12,
    color: "#fff",
    fontWeight: 600,
    background: "rgba(255,255,255,0.15)",
    padding: "2px 8px",
    borderRadius: 6,
    fontFamily: "monospace",
  },
};
