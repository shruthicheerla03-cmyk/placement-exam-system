import React, { useState, useEffect } from 'react';
import { db, auth } from '../firebase/config';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';

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
        const userConfirms = window.confirm(
          '⚠️ WARNING: You selected a window or tab instead of your entire screen.\n\n' +
          'For exam integrity, you should share your ENTIRE SCREEN.\n\n' +
          'Click OK to continue anyway, or Cancel to try again and select your entire screen.'
        );
        
        if (!userConfirms) {
          stream.getTracks().forEach(track => track.stop());
          setScreenShareError('⚠️ Please try again and select "Entire Screen" option.');
          return;
        }
      }

      // Monitor if user stops sharing
      videoTrack.onended = () => {
        alert('⚠️ Screen sharing stopped! You will be logged out.');
        handleLogout();
      };

      setScreenStream(stream);
      
      // Enter fullscreen mode
      try { 
        await document.documentElement.requestFullscreen(); 
      } catch (e) {
        console.log('Fullscreen not supported or denied:', e);
      }
      
      // ✅ Navigate to exam - MediaStream stored in localStorage/sessionStorage or component state
      // Cannot pass MediaStream through React Router state (DataCloneError)
      // The exam page will check if screen sharing is active via stream tracks
      sessionStorage.setItem('screenSharingActive', 'true');
      navigate(`/exam/${matchedExam.id}`, { 
        state: { screenStream: null } // Pass null for testing, actual stream is managed separately
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
    if (window.confirm('⚠️ WARNING: This is for TESTING ONLY.\n\nSkipping screen sharing violates exam integrity.\n\nContinue anyway?')) {
      try { 
        await document.documentElement.requestFullscreen(); 
      } catch (e) {
        console.log('Fullscreen not supported or denied:', e);
      }
      // Set testing mode flag
      sessionStorage.setItem('screenSharingActive', 'testing');
      navigate(`/exam/${matchedExam.id}`, { state: { screenStream: null } });
    }
  };

  // ── COUNTDOWN / READY SCREEN ──
  if (matchedExam) {
    const examReady = countdown !== null && countdown <= 0;
    return (
      <div style={styles.page}>
        <div style={styles.navbar}>
          <span style={styles.navTitle}>🎓 Placement Exam System</span>
          <button style={styles.logoutBtn} onClick={handleLogout}>Logout</button>
        </div>
        <div style={styles.container}>
          <div style={styles.card}>
            <div style={{textAlign:'center', fontSize:'60px', marginBottom:'10px'}}>{examReady ? '✅' : '⏳'}</div>
            <h2 style={{...styles.heading, color: examReady ? '#27ae60' : '#2c3e50'}}>
              {examReady ? 'Exam is Ready!' : 'Exam Starts In...'}
            </h2>
            <div style={styles.examInfoBox}>
              <p style={styles.examInfoTitle}>📋 {matchedExam.title}</p>
              <p style={styles.examInfoMeta}>🔑 Code: <strong>{matchedExam.examCode}</strong></p>
            </div>
            {!examReady ? (
              <div style={styles.countdownBox}>
                <p style={styles.countdownNum}>{countdown !== null ? formatCountdown(countdown) : '...'}</p>
                <p style={{color:'#888', fontSize:'14px', margin:0}}>Please wait. Do not close this window.</p>
              </div>
            ) : (
              <>
                <div style={styles.readyBox}>
                  <p style={{margin:0, color:'#27ae60', fontWeight:'bold', fontSize:'16px'}}>
                    🚀 The exam is now open! Click below to begin.
                  </p>
                </div>
                <div style={styles.warningBox}>
                  <p style={{margin:0, fontSize:'13px', color:'#856404'}}>
                    ⚠️ You will be asked to <strong>share your entire screen</strong>. Select your full screen (not a window or tab). The exam will then open in full screen mode. Exiting full screen or stopping screen sharing will result in violations or automatic logout.
                  </p>
                </div>
                {screenShareError && (
                  <div style={{
                    padding: '12px',
                    backgroundColor: '#fdecea',
                    color: '#e74c3c',
                    borderRadius: '8px',
                    marginBottom: '15px',
                    fontSize: '14px',
                    textAlign: 'center',
                    border: '1px solid #e74c3c'
                  }}>
                    {screenShareError}
                  </div>
                )}
                <button style={{...styles.beginBtn, backgroundColor:'#27ae60'}} onClick={handleStartNow}>
                  🖥️ Share Entire Screen & Start Exam
                </button>
                <div style={{textAlign:'center', marginTop:'15px'}}>
                  <button 
                    style={{
                      padding:'8px 16px',
                      backgroundColor:'transparent',
                      color:'#888',
                      border:'1px dashed #ddd',
                      borderRadius:'6px',
                      fontSize:'12px',
                      cursor:'pointer'
                    }}
                    onClick={handleSkipScreenSharing}
                  >
                    ⚠️ Skip Screen Sharing (Testing Only)
                  </button>
                  <p style={{fontSize:'11px', color:'#999', margin:'8px 0 0 0'}}>
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
    <div style={styles.page}>
      <div style={styles.navbar}>
        <span style={styles.navTitle}>🎓 Placement Exam System</span>
        <button style={styles.logoutBtn} onClick={handleLogout}>Logout</button>
      </div>
      <div style={styles.container}>
        {!showCodeInput ? (
          // ── INSTRUCTIONS ──
          <div style={styles.card}>
            <h2 style={styles.heading}>📋 Exam Instructions</h2>
            <div style={styles.instructionBox}>
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
                <div key={i} style={styles.instruction}>
                  <span style={styles.icon}>{icon}</span>
                  <span style={{fontSize:'15px', color:'#2c3e50', lineHeight:'1.5'}}>{text}</span>
                </div>
              ))}
            </div>
            <div style={styles.checkboxRow}>
              <input type="checkbox" id="agree" checked={agreed}
                onChange={e => { setAgreed(e.target.checked); setError(''); }}
                style={styles.checkbox} />
              <label htmlFor="agree" style={styles.checkboxLabel}>
                I have read and understood all the instructions.
              </label>
            </div>
            {error && <div style={styles.errorMsg}>{error}</div>}
            <button style={{
              ...styles.beginBtn,
              backgroundColor: agreed ? '#3498db' : '#bdc3c7',
              cursor: agreed ? 'pointer' : 'not-allowed'
            }} onClick={handleBeginTest}>
              Begin Test 🚀
            </button>
          </div>
        ) : (
          // ── EXAM CODE ENTRY ──
          <div style={styles.card}>
            <div style={{textAlign:'center', fontSize:'60px', marginBottom:'10px'}}>🔐</div>
            <h2 style={styles.heading}>Enter Exam Code</h2>
            <p style={styles.subText}>Enter the exam code provided by your administrator.</p>
            <input type="text" placeholder="e.g. PLACE2024" value={examCode}
              onChange={e => { setExamCode(e.target.value.toUpperCase()); setError(''); }}
              style={styles.codeInput}
              onKeyDown={e => e.key === 'Enter' && handleSubmitCode()}
              disabled={attempts >= MAX_ATTEMPTS} maxLength={20} />
            {error && <div style={styles.errorMsg}>{error}</div>}
            <div style={styles.attemptRow}>
              {[1,2,3].map(i => (
                <div key={i} style={{...styles.attemptDot, backgroundColor: attempts >= i ? '#e74c3c' : '#ecf0f1'}}></div>
              ))}
              <span style={styles.attemptText}>
                {attempts > 0 ? `${attempts} of ${MAX_ATTEMPTS} attempts used` : `${MAX_ATTEMPTS} attempts allowed`}
              </span>
            </div>
            <button style={{
              ...styles.beginBtn,
              backgroundColor: attempts >= MAX_ATTEMPTS ? '#bdc3c7' : '#27ae60',
              cursor: attempts >= MAX_ATTEMPTS ? 'not-allowed' : 'pointer'
            }} onClick={handleSubmitCode} disabled={loading || attempts >= MAX_ATTEMPTS}>
              {loading ? '⏳ Verifying...' : 'Verify Code ✅'}
            </button>
            <button style={styles.backBtn} onClick={() => { setShowCodeInput(false); setError(''); setExamCode(''); }}>
              ← Back to Instructions
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  page: { minHeight:'100vh', backgroundColor:'#f0f4f8' },
  navbar: { backgroundColor:'#2c3e50', padding:'15px 30px', display:'flex', justifyContent:'space-between', alignItems:'center' },
  navTitle: { color:'white', fontSize:'20px', fontWeight:'bold' },
  logoutBtn: { backgroundColor:'#e74c3c', color:'white', border:'none', padding:'8px 18px', borderRadius:'6px', cursor:'pointer', fontSize:'14px', fontWeight:'bold' },
  container: { display:'flex', justifyContent:'center', alignItems:'center', minHeight:'calc(100vh - 60px)', padding:'30px 20px' },
  card: { backgroundColor:'white', borderRadius:'12px', padding:'40px', maxWidth:'680px', width:'100%', boxShadow:'0 4px 20px rgba(0,0,0,0.1)' },
  heading: { color:'#2c3e50', fontSize:'24px', marginTop:0, marginBottom:'25px', textAlign:'center' },
  instructionBox: { backgroundColor:'#f8f9fa', borderRadius:'10px', padding:'20px', marginBottom:'25px', display:'flex', flexDirection:'column', gap:'14px' },
  instruction: { display:'flex', gap:'12px', alignItems:'flex-start' },
  icon: { fontSize:'18px', minWidth:'24px' },
  checkboxRow: { display:'flex', alignItems:'center', gap:'10px', marginBottom:'15px', padding:'12px', backgroundColor:'#f0f9f0', borderRadius:'8px', border:'1px solid #c3e6cb' },
  checkbox: { width:'18px', height:'18px', cursor:'pointer' },
  checkboxLabel: { fontSize:'15px', color:'#2c3e50', cursor:'pointer', fontWeight:'500' },
  beginBtn: { width:'100%', padding:'14px', color:'white', border:'none', borderRadius:'8px', fontSize:'17px', fontWeight:'bold', marginBottom:'10px' },
  errorMsg: { backgroundColor:'#fdecea', color:'#e74c3c', padding:'10px 15px', borderRadius:'8px', fontSize:'14px', marginBottom:'15px', border:'1px solid #f5c6cb' },
  subText: { textAlign:'center', color:'#666', marginBottom:'25px', fontSize:'15px' },
  codeInput: { width:'100%', padding:'15px', fontSize:'22px', textAlign:'center', letterSpacing:'4px', fontWeight:'bold', border:'2px solid #ddd', borderRadius:'8px', marginBottom:'15px', outline:'none', boxSizing:'border-box', color:'#2c3e50' },
  attemptRow: { display:'flex', alignItems:'center', gap:'8px', marginBottom:'20px', justifyContent:'center' },
  attemptDot: { width:'14px', height:'14px', borderRadius:'50%', border:'1px solid #ccc' },
  attemptText: { fontSize:'13px', color:'#888', marginLeft:'5px' },
  backBtn: { width:'100%', padding:'11px', backgroundColor:'transparent', color:'#3498db', border:'1px solid #3498db', borderRadius:'8px', fontSize:'15px', cursor:'pointer', marginTop:'8px' },
  examInfoBox: { backgroundColor:'#f0f4f8', borderRadius:'8px', padding:'15px', marginBottom:'20px', textAlign:'center' },
  examInfoTitle: { fontWeight:'bold', color:'#2c3e50', fontSize:'18px', margin:'0 0 5px 0' },
  examInfoMeta: { color:'#666', margin:0, fontSize:'14px' },
  countdownBox: { textAlign:'center', padding:'30px', backgroundColor:'#f0f4f8', borderRadius:'12px', marginBottom:'20px' },
  countdownNum: { fontSize:'52px', fontWeight:'bold', color:'#3498db', margin:'0 0 10px 0', fontFamily:'monospace' },
  readyBox: { backgroundColor:'#f0fdf4', border:'1px solid #86efac', borderRadius:'8px', padding:'15px', marginBottom:'12px', textAlign:'center' },
  warningBox: { backgroundColor:'#fffbeb', border:'1px solid #fcd34d', borderRadius:'8px', padding:'12px', marginBottom:'20px' },
};

export default StudentDashboard;

