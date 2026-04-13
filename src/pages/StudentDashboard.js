import React, { useState, useEffect } from 'react';
import { db, auth } from '../firebase/config';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import Dialog from '../components/Dialog';
import './StudentDashboard.css';

function StudentDashboard() {
  const navigate = useNavigate();
  const [agreed, setAgreed] = useState(false);
  const [showCodeInput, setShowCodeInput] = useState(false);
  const [examCode, setExamCode] = useState('');
  const [error, setError] = useState('');
  const [attempts, setAttempts] = useState(0);
  const [loading, setLoading] = useState(false);
  const [matchedExam, setMatchedExam] = useState(null);
  const [countdown, setCountdown] = useState(null);
  const [screenStream, setScreenStream] = useState(null);
  const [screenShareError, setScreenShareError] = useState('');
  const [dialogConfig, setDialogConfig] = useState({ 
    isOpen: false, 
    title: '', 
    message: '', 
    type: 'confirm', 
    onConfirm: () => {},
    onCancel: null
  });

  const showDialog = (title, message, onConfirm, type = 'confirm', hasCancel = true) => {
    setDialogConfig({
      isOpen: true,
      title,
      message,
      type,
      onConfirm: () => {
        onConfirm();
        setDialogConfig(prev => ({ ...prev, isOpen: false }));
      },
      onCancel: hasCancel ? () => setDialogConfig(prev => ({ ...prev, isOpen: false })) : null
    });
  };

  const MAX_ATTEMPTS = 3;

  // Cleanup screen stream on unmount
  useEffect(() => {
    return () => {
      if (screenStream) {
        screenStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [screenStream]);

  // Countdown timer once exam is found
  useEffect(() => {
    if (!matchedExam) return;
    const tick = () => {
      const now = new Date();
      let start;
      
      // Handle Firestore Timestamp or regular date
      if (matchedExam.startTime?.toDate) {
        start = matchedExam.startTime.toDate();
      } else if (matchedExam.startTime?.seconds) {
        // Firestore Timestamp has seconds property
        start = new Date(matchedExam.startTime.seconds * 1000);
      } else {
        start = new Date(matchedExam.startTime);
      }
      
      // Validate the date
      if (isNaN(start.getTime())) {
        console.error('Invalid start time:', matchedExam.startTime);
        setCountdown(0);
        return;
      }
      
      const diff = Math.floor((start - now) / 1000);
      setCountdown(diff <= 0 ? 0 : diff);
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [matchedExam]);

  const handleBeginTest = () => {
    if (!agreed) {
      setError('⚠️ Please check the box to confirm you have read the instructions.');
      return;
    }
    setError('');
    setShowCodeInput(true);
  };

  const handleSubmitCode = async () => {
    if (!examCode.trim()) { setError('Please enter an exam code.'); return; }
    if (attempts >= MAX_ATTEMPTS) { setError('❌ Too many incorrect attempts.'); return; }
    setLoading(true);
    setError('');
    try {
      const q = query(collection(db, 'exams'), where('examCode', '==', examCode.trim().toUpperCase()));
      const snapshot = await getDocs(q);
      if (snapshot.empty) {
        const newAttempts = attempts + 1;
        setAttempts(newAttempts);
        const remaining = MAX_ATTEMPTS - newAttempts;
        setError(remaining <= 0
          ? '❌ Too many incorrect attempts. Contact your admin.'
          : `❌ Invalid exam code. ${remaining} attempt(s) remaining.`);
      } else {
        const examDoc = snapshot.docs[0];
        const examData = examDoc.data();
        
        // ✅ Validate startTime exists
        if (!examData.startTime) {
          setError('❌ Exam configuration error: Start time not set. Contact admin.');
          setLoading(false);
          return;
        }
        
        setMatchedExam({ id: examDoc.id, ...examData });
      }
    } catch (err) {
      setError('Something went wrong. Please try again.');
    }
    setLoading(false);
  };

  const handleStartNow = async () => {
    setScreenShareError('');
    
    try {
      // Request screen sharing with less strict constraints for better compatibility
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          cursor: 'always'
        },
        audio: false,
        preferCurrentTab: false
      });

      // Get video track info
      const videoTrack = stream.getVideoTracks()[0];
      const settings = videoTrack.getSettings();
      
      console.log('Screen sharing settings:', settings);
      
      // Optional validation - warn but don't block if not monitor
      // Some browsers don't support displaySurface detection
      if (settings.displaySurface && settings.displaySurface !== 'monitor') {
        showDialog(
          '⚠️ Integrity Warning',
          'You selected a window or tab instead of your entire screen.\n\nFor exam integrity, you should share your ENTIRE SCREEN.\n\nContinue anyway, or try again to select your entire screen?',
          async () => {
            // Monitor if user stops sharing
            videoTrack.onended = () => {
              showDialog('Critical Error', 'Screen sharing stopped! You will be logged out.', () => handleLogout(), 'warning', false);
            };

            setScreenStream(stream);
            
            // Enter fullscreen mode
            try { 
              await document.documentElement.requestFullscreen(); 
            } catch (e) {
              console.log('Fullscreen not supported or denied:', e);
            }
            
            sessionStorage.setItem('screenSharingActive', 'true');
            navigate(`/exam/${matchedExam.id}`, { 
              state: { screenStream: null }
            });
          },
          'warning'
        );
        return;
      }

      // Monitor if user stops sharing
      videoTrack.onended = () => {
        showDialog('Critical Error', 'Screen sharing stopped! You will be logged out.', () => handleLogout(), 'warning', false);
      };

      setScreenStream(stream);
      
      // Enter fullscreen mode
      try { 
        await document.documentElement.requestFullscreen(); 
      } catch (e) {
        console.log('Fullscreen not supported or denied:', e);
      }
      
      sessionStorage.setItem('screenSharingActive', 'true');
      navigate(`/exam/${matchedExam.id}`, { 
        state: { screenStream: null }
      });
      
    } catch (err) {
      console.error('Screen sharing error:', err);
      
      if (err.name === 'NotAllowedError') {
        setScreenShareError('❌ Screen sharing permission denied. Please click "Share" when your browser prompts you.');
      } else if (err.name === 'NotSupportedError') {
        setScreenShareError('❌ Your browser does not support screen sharing. Please use Chrome, Edge, or Firefox (latest version).');
      } else if (err.name === 'NotFoundError') {
        setScreenShareError('❌ No screen available to share. Please ensure you have a display connected.');
      } else if (err.name === 'AbortError') {
        setScreenShareError('⚠️ Screen sharing was cancelled. Click the button again to retry.');
      } else if (err.name === 'NotReadableError') {
        setScreenShareError('❌ Could not access screen. Please close other apps that might be using screen capture and try again.');
      } else if (err.name === 'OverconstrainedError') {
        setScreenShareError('❌ Screen sharing constraints not supported. Please update your browser.');
      } else if (err.name === 'TypeError') {
        setScreenShareError('❌ Screen sharing is not supported in your browser. Please use Chrome, Edge, or Firefox.');
      } else {
        setScreenShareError(`❌ Failed to start screen sharing: ${err.message || 'Unknown error'}. Please try again or use a different browser.`);
      }
    }
  };

  const formatCountdown = (secs) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    if (h > 0) return `${h}h ${String(m).padStart(2,'0')}m ${String(s).padStart(2,'0')}s`;
    if (m > 0) return `${String(m).padStart(2,'0')}m ${String(s).padStart(2,'0')}s`;
    return `${String(s).padStart(2,'0')}s`;
  };

  const handleLogout = async () => { 
    sessionStorage.removeItem('screenSharingActive');
    await signOut(auth); 
    navigate('/'); 
  };

  // Development mode: Skip screen sharing
  const handleSkipScreenSharing = async () => {
    showDialog(
      '⚠️ Testing Mode Override',
      'This is for TESTING ONLY.\n\nSkipping screen sharing violates exam integrity.\n\nContinue anyway?',
      async () => {
        try { 
          await document.documentElement.requestFullscreen(); 
        } catch (e) {
          console.log('Fullscreen not supported or denied:', e);
        }
        // Set testing mode flag
        sessionStorage.setItem('screenSharingActive', 'testing');
        navigate(`/exam/${matchedExam.id}`, { state: { screenStream: null } });
      },
      'warning'
    );
  };

  // ── COUNTDOWN / READY SCREEN ──
  if (matchedExam) {
    const examReady = countdown !== null && countdown <= 0;
    return (
      <div className="student-dashboard-page">
        <div className="student-navbar">
          <span className="nav-title">🎓 Placement Exam System</span>
          <button className="logout-btn" onClick={handleLogout}>Logout</button>
        </div>
        <div className="student-container">
          <div className="code-entry-card">
            <div className="exam-ready-icon">{examReady ? '✅' : '⏳'}</div>
            <h2 className="student-heading" style={{ color: examReady ? '#27ae60' : '#2c3e50' }}>
              {examReady ? 'Exam is Ready!' : 'Exam Starts In...'}
            </h2>
            <div className="exam-info-box">
              <p style={{ fontWeight: 'bold', color: '#2c3e50', fontSize: '18px', margin: '0 0 5px 0' }}>📋 {matchedExam.title}</p>
              <p style={{ color: '#666', margin: 0, fontSize: '14px' }}>🔑 Code: <strong>{matchedExam.examCode}</strong></p>
            </div>
            {!examReady ? (
              <div className="countdown-box">
                <p className="countdown-num">{countdown !== null ? formatCountdown(countdown) : '...'}</p>
                <p style={{ color: '#64748b', fontSize: '14px', margin: 0, fontWeight: '500' }}>Please wait. Do not close this window.</p>
              </div>
            ) : (
              <>
                <div style={{ backgroundColor: '#f0fdf4', border: '1px solid #86efac', borderRadius: '10px', padding: '5px', marginBottom: '5px', textAlign: 'center' }}>
                  <p style={{ margin: 0, color: '#27ae60', fontWeight: 'bold', fontSize: '14px' }}>
                    🚀 The exam is now open! Click below to begin.
                  </p>
                </div>
                <div style={{ backgroundColor: '#fffbeb', border: '1px solid #fcd34d', borderRadius: '10px', padding: '5px', marginBottom: '8px' }}>
                  <p style={{ margin: 0, fontSize: '11px', color: '#856404', lineHeight: '1.3' }}>
                    ⚠️ You will be asked to <strong>share your entire screen</strong>. Select your full screen (not a window or tab). The exam will then open in full screen mode. Exiting full screen or stopping screen sharing will result in violations or automatic logout.
                  </p>
                </div>
                {screenShareError && (
                  <div className="error-message">
                    {screenShareError}
                  </div>
                )}
                <button className="action-btn success" onClick={handleStartNow}>
                  🖥️ Share Entire Screen & Start Exam
                </button>
                <div style={{ textAlign: 'center', marginTop: '15px' }}>
                  <button 
                    style={{
                      padding: '8px 16px',
                      backgroundColor: 'transparent',
                      color: '#94a3b8',
                      border: '1px dashed #cbd5e1',
                      borderRadius: '8px',
                      fontSize: '12px',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                    onClick={handleSkipScreenSharing}
                  >
                    ⚠️ Skip Screen Sharing (Testing Only)
                  </button>
                  <p style={{ fontSize: '11px', color: '#94a3b8', margin: '8px 0 0 0' }}>
                    Use only for testing. Screen sharing enforces exam integrity.
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="student-dashboard-page">
      <div className="student-navbar">
        <span className="nav-title">🎓 Placement Exam System</span>
        <button className="logout-btn" onClick={handleLogout}>Logout</button>
      </div>
      <div className="student-container">
        {!showCodeInput ? (
          // ── INSTRUCTIONS ──
          <div className="student-card">
            <h2 className="student-heading">📋 Exam Instructions</h2>
            <div className="instruction-box">
              {[
                ['📌', <><strong>Read all questions carefully</strong> before answering.</>],
                ['⏱', <><strong>Each round has a separate timer.</strong> Answers are auto-submitted when time runs out.</>],
                ['🔄', <><strong>3 Rounds:</strong> Round 1 → Aptitude | Round 2 → Core Subjects | Round 3 → DSA</>],
                ['🖥️', <><strong>Screen Sharing REQUIRED:</strong> You must share your entire screen (not a window/tab).</>],
                ['🔒', <><strong>Exam must be taken in full screen mode.</strong> Exiting full screen is a violation.</>],
                ['⚠️', <><strong>Do NOT switch browser tabs</strong> or minimize the window during the exam.</>],
                ['🚫', <><strong>Stopping screen sharing</strong> will auto-submit your exam and log you out.</>],
                ['🚨', <><strong>More than 5 violations</strong> (tab switch / exit full screen) will result in <strong>automatic submission.</strong></>],
                ['💾', <><strong>Answers are auto-saved.</strong> You can change answers within the same round.</>],
                ['🔑', <><strong>You will need an Exam Code</strong> provided by your admin to start.</>],
                ['✅', <><strong>Once you submit a round</strong>, you cannot go back to it.</>],
                ['💻', <><strong>DSA Round:</strong> Write full code solutions in your preferred language (C, C++, Java, Python).</>],
              ].map(([icon, text], i) => (
                <div key={i} className="instruction-item">
                  <span className="instruction-icon">{icon}</span>
                  <span className="instruction-text">{text}</span>
                </div>
              ))}
            </div>
            <div className="checkbox-row">
              <input type="checkbox" id="agree" checked={agreed}
                onChange={e => { setAgreed(e.target.checked); setError(''); }}
                className="student-checkbox" />
              <label htmlFor="agree" className="checkbox-label">
                I have read and understood all the instructions.
              </label>
            </div>
            {error && <div className="error-message"><span>⚠️</span> {error}</div>}
            <button 
              className="action-btn primary"
              style={{ opacity: agreed ? 1 : 0.6 }}
              disabled={!agreed}
              onClick={handleBeginTest}
            >
              Begin Test 🚀
            </button>
          </div>
        ) : (
          // ── EXAM CODE ENTRY ──
          <div className="code-entry-card">
            <div style={{ textAlign: 'center', fontSize: '64px', marginBottom: '20px' }}>🔐</div>
            <h2 className="student-heading" style={{ marginBottom: '10px' }}>Enter Exam Code</h2>
            <p style={{ textAlign: 'center', color: '#64748b', marginBottom: '30px', fontSize: '15px', fontWeight: '500' }}>
              Enter the exam code provided by your administrator.
            </p>
            <div className="code-input-wrapper">
              <input type="text" placeholder="e.g. PLACE2024" value={examCode}
                onChange={e => { setExamCode(e.target.value.toUpperCase()); setError(''); }}
                className="code-input"
                onKeyDown={e => e.key === 'Enter' && handleSubmitCode()}
                disabled={attempts >= MAX_ATTEMPTS} maxLength={20} />
            </div>
            {error && <div className="error-message"><span>❌</span> {error}</div>}
            <div className="attempt-row">
              {[1,2,3].map(i => (
                <div key={i} className="attempt-dot" style={{ backgroundColor: attempts >= i ? '#e74c3c' : '#e2e8f0' }}></div>
              ))}
              <span className="attempt-text">
                {attempts > 0 ? `${attempts} of ${MAX_ATTEMPTS} attempts used` : `${MAX_ATTEMPTS} attempts allowed`}
              </span>
            </div>
            <button 
              className="action-btn success"
              disabled={loading || attempts >= MAX_ATTEMPTS}
              onClick={handleSubmitCode}
            >
              {loading ? '⏳ Verifying...' : 'Verify Code ✅'}
            </button>
            <button className="back-btn" onClick={() => { setShowCodeInput(false); setError(''); setExamCode(''); }}>
              ← Back to Instructions
            </button>
          </div>
        )}
      </div>

      <Dialog
        isOpen={dialogConfig.isOpen}
        title={dialogConfig.title}
        message={dialogConfig.message}
        type={dialogConfig.type}
        onConfirm={dialogConfig.onConfirm}
        onCancel={dialogConfig.onCancel}
      />
    </div>
  );
}

export default StudentDashboard;

