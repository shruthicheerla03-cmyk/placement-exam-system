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

  const MAX_ATTEMPTS = 3;

  // Countdown timer once exam is found
  useEffect(() => {
    if (!matchedExam) return;
    const tick = () => {
      const now = new Date();
      const start = matchedExam.startTime?.toDate
        ? matchedExam.startTime.toDate()
        : new Date(matchedExam.startTime);
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
        setMatchedExam({ id: examDoc.id, ...examDoc.data() });
      }
    } catch (err) {
      setError('Something went wrong. Please try again.');
    }
    setLoading(false);
  };

  const handleStartNow = async () => {
    try { await document.documentElement.requestFullscreen(); } catch (e) {}
    navigate(`/exam/${matchedExam.id}`);
  };

  const formatCountdown = (secs) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    if (h > 0) return `${h}h ${String(m).padStart(2,'0')}m ${String(s).padStart(2,'0')}s`;
    if (m > 0) return `${String(m).padStart(2,'0')}m ${String(s).padStart(2,'0')}s`;
    return `${String(s).padStart(2,'0')}s`;
  };

  const handleLogout = async () => { await signOut(auth); navigate('/'); };

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
                    ⚠️ The exam will open in <strong>full screen</strong>. Exiting full screen or switching tabs counts as a violation. More than 5 violations = auto submission.
                  </p>
                </div>
                <button style={{...styles.beginBtn, backgroundColor:'#27ae60'}} onClick={handleStartNow}>
                  🖥️ Enter Full Screen & Start Exam
                </button>
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
                ['🖥️', <><strong>Exam must be taken in full screen mode.</strong> Exiting full screen is a violation.</>],
                ['⚠️', <><strong>Do NOT switch browser tabs</strong> or minimize the window during the exam.</>],
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

