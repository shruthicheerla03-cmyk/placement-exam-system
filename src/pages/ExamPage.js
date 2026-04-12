import React, { useState, useEffect, useCallback, useRef } from 'react';
import { db, auth } from '../firebase/config';
import { doc, getDoc, addDoc, collection } from 'firebase/firestore';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import DSARound from '../components/DSARound';

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const ROUNDS = [
  { name: 'Round 1: Aptitude', category: 'Aptitude', color: '#3498db', type: 'mcq' },
  { name: 'Round 2: Core Subjects', category: 'Core Subjects', color: '#9b59b6', type: 'mcq' },
  { name: 'Round 3: DSA', category: 'DSA', color: '#e67e22', type: 'coding' },
];

const MAX_VIOLATIONS = 5;

const COMPLETION_MESSAGES = [
  'Your responses have been successfully submitted.',
  'Thank you for completing the test. Results will be announced later.',
  'Your exam has been recorded. Please wait for further instructions.',
  'Submission successful! Your institution will share results with you.',
  'All done! Your answers have been saved securely.',
];

function ExamPage() {
  const { examId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [exam, setExam] = useState(null);
  const [roundIndex, setRoundIndex] = useState(0);
  const [roundQuestions, setRoundQuestions] = useState([]);
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState({});
  const [timeLeft, setTimeLeft] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const [autoSubmitMsg, setAutoSubmitMsg] = useState('');
  const [scores, setScores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [transitioning, setTransitioning] = useState(false);

  // Violation / proctoring state
  const [violations, setViolations] = useState(0);
  const [showViolationPopup, setShowViolationPopup] = useState(false);
  const [violationMsg, setViolationMsg] = useState('');
  
  // Screen sharing state
  const [screenStream, setScreenStream] = useState(null);
  const [screenShareBlocked, setScreenShareBlocked] = useState(false);

  const timerRef = useRef(null);
  const submittingRef = useRef(false);
  const scoresRef = useRef([]);
  const roundQuestionsRef = useRef([]);
  const answersRef = useRef({});
  const roundIndexRef = useRef(0);
  const examRef = useRef(null);
  const violationsRef = useRef(0);

  // Keep refs in sync
  useEffect(() => { scoresRef.current = scores; }, [scores]);
  useEffect(() => { roundQuestionsRef.current = roundQuestions; }, [roundQuestions]);
  useEffect(() => { answersRef.current = answers; }, [answers]);
  useEffect(() => { roundIndexRef.current = roundIndex; }, [roundIndex]);
  useEffect(() => { examRef.current = exam; }, [exam]);
  useEffect(() => { violationsRef.current = violations; }, [violations]);

  // ── MONITOR SCREEN SHARING ──
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    // Get screen stream from navigation state
    const stream = location.state?.screenStream;
    
    // Allow null for testing mode
    if (stream === undefined) {
      // No screen sharing detected - block exam
      setScreenShareBlocked(true);
      setAutoSubmitMsg('⚠️ Screen sharing is required to access the exam. You will be redirected.');
      setTimeout(() => {
        navigate('/student');
      }, 3000);
      return;
    }

    setScreenStream(stream);

    // Monitor if screen sharing stops (only if stream exists)
    if (stream) {
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.onended = () => {
          if (!submittingRef.current && !submitted) {
            alert('⚠️ Screen sharing stopped! Exam will be auto-submitted.');
            handleSubmitRound(true).then(() => {
              submittingRef.current = true;
              setAutoSubmitMsg('Exam auto-submitted because screen sharing stopped.');
            });
          }
        };
      }
    }

    // Cleanup
    return () => {
      if (stream && submitted) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [location.state, submitted, navigate]);

  const completionMsg = useRef(
    COMPLETION_MESSAGES[Math.floor(Math.random() * COMPLETION_MESSAGES.length)]
  ).current;

  // ── SUBMIT EXAM (final) ──
  const submitExam = useCallback(async (finalScores, reason = '') => {
    if (submittingRef.current) return;
    submittingRef.current = true;
    clearTimeout(timerRef.current);
    try {
      await addDoc(collection(db, 'submissions'), {
        userId: auth.currentUser?.uid,
        userEmail: auth.currentUser?.email,
        examId,
        scores: finalScores,
        totalScore: finalScores.reduce((s, r) => s + r.score, 0),
        totalQuestions: finalScores.reduce((s, r) => s + r.total, 0),
        violations: violationsRef.current,
        submittedAt: new Date(),
        reason,
      });
    } catch (e) { console.error(e); }
    if (reason === 'violations') {
      setAutoSubmitMsg('Exam submitted due to multiple violations.');
    }
    setSubmitted(true);
    setTransitioning(false);
    // Exit fullscreen
    try { if (document.fullscreenElement) document.exitFullscreen(); } catch (e) {}
  }, [examId]);

  // ── SUBMIT ROUND ──
  const handleSubmitRound = useCallback(async (auto = false) => {
    if (submittingRef.current) return;
    clearTimeout(timerRef.current);
    setTransitioning(true);

    let correct = 0;
    roundQuestionsRef.current.forEach((q, i) => {
      if (answersRef.current[i] === q.correct) correct++;
    });

    const roundScore = {
      round: ROUNDS[roundIndexRef.current].name,
      score: correct,
      total: roundQuestionsRef.current.length,
    };
    const newScores = [...scoresRef.current, roundScore];
    setScores(newScores);

    if (roundIndexRef.current < ROUNDS.length - 1) {
      setTimeout(() => {
        const next = roundIndexRef.current + 1;
        setRoundIndex(next);
        loadRound(examRef.current, next);
        setTransitioning(false);
      }, 2000);
    } else {
      await submitExam(newScores, auto ? 'auto' : 'manual');
    }
  }, [submitExam]);

  // ── VIOLATION HANDLER ──
  const handleViolation = useCallback((msg) => {
    if (submittingRef.current) return;
    const newCount = violationsRef.current + 1;
    setViolations(newCount);
    violationsRef.current = newCount;

    if (newCount > MAX_VIOLATIONS) {
      setShowViolationPopup(false);
      handleSubmitRound(true).then(() => {
        submittingRef.current = true;
        setAutoSubmitMsg('Exam submitted due to multiple violations.');
      });
      return;
    }

    setViolationMsg(msg);
    setShowViolationPopup(true);
    setTimeout(() => setShowViolationPopup(false), 4000);
  }, [handleSubmitRound]);

  // ── FULLSCREEN + PROCTORING ──
  useEffect(() => {
    if (submitted) return;

    const onFSChange = () => {
      if (!document.fullscreenElement && !submittingRef.current) {
        handleViolation('⚠️ Warning: Do not exit full screen during the exam!');
      }
    };

    const onVisibility = () => {
      if (document.hidden && !submittingRef.current) {
        handleViolation('⚠️ Warning: Do not switch tabs during the exam!');
      }
    };

    const onBlur = () => {
      if (!submittingRef.current) {
        handleViolation('⚠️ Warning: Do not leave the exam window!');
      }
    };

    document.addEventListener('fullscreenchange', onFSChange);
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('blur', onBlur);

    return () => {
      document.removeEventListener('fullscreenchange', onFSChange);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('blur', onBlur);
    };
  }, [submitted, handleViolation]);

  // ── FETCH EXAM ──
  useEffect(() => {
    const fetchExam = async () => {
      try {
        const snap = await getDoc(doc(db, 'exams', examId));
        if (snap.exists()) {
          const data = { id: snap.id, ...snap.data() };
          setExam(data);
          examRef.current = data;
          loadRound(data, 0);
        }
      } catch (e) { console.error(e); }
      setLoading(false);
    };
    fetchExam();
  }, [examId]);

  const loadRound = (examData, rIndex) => {
    const category = ROUNDS[rIndex].category;
    const roundType = ROUNDS[rIndex].type;
    const allQs = examData.questions || [];
    const filtered = allQs.filter(q => q.category === category);
    
    let processedQuestions;
    
    if (roundType === 'coding') {
      // For coding questions, pass them as-is (don't shuffle or modify structure)
      processedQuestions = shuffle(filtered);
    } else {
      // For MCQ questions, shuffle questions and options
      processedQuestions = shuffle(filtered).map(q => ({
        id: q.id,
        text: q.text,
        options: shuffle(q.options),
        correct: q.correct,
        category: q.category,
        // difficulty intentionally excluded from student view
      }));
    }

    // Use round-specific duration if available
    let duration;
    if (examData.roundDurations) {
      if (rIndex === 0) duration = (examData.roundDurations.aptitude || 30) * 60;
      else if (rIndex === 1) duration = (examData.roundDurations.core || 30) * 60;
      else if (rIndex === 2) duration = (examData.roundDurations.dsa || 60) * 60;
    } else {
      duration = (examData.duration || 30) * 60;
    }

    setRoundQuestions(processedQuestions);
    roundQuestionsRef.current = processedQuestions;
    setCurrentQ(0);
    setAnswers({});
    answersRef.current = {};
    setTimeLeft(duration);
  };

  // ── TIMER ──
  useEffect(() => {
    if (timeLeft === null || submitted || transitioning) return;
    if (timeLeft <= 0) { handleSubmitRound(true); return; }
    timerRef.current = setTimeout(() => setTimeLeft(t => t - 1), 1000);
    return () => clearTimeout(timerRef.current);
  }, [timeLeft, submitted, transitioning, handleSubmitRound]);

  const formatTime = (secs) => {
    const m = String(Math.floor(secs / 60)).padStart(2, '0');
    const s = String(secs % 60).padStart(2, '0');
    return `${m}:${s}`;
  };

  const timerColor = timeLeft < 60 ? '#e74c3c' : timeLeft < 180 ? '#f39c12' : 'white';

  // ── LOADING ──
  if (loading) return (
    <div style={styles.center}>
      <div style={styles.transBox}><p style={{fontSize:'20px'}}>⏳ Loading Exam...</p></div>
    </div>
  );

  // ── SCREEN SHARE BLOCKED ──
  if (screenShareBlocked) return (
    <div style={styles.center}>
      <div style={styles.resultBox}>
        <div style={{fontSize:'70px', textAlign:'center', marginBottom:'15px'}}>🚫</div>
        <h1 style={{color:'#e74c3c', textAlign:'center', fontSize:'24px', marginBottom:'15px'}}>
          Access Denied
        </h1>
        <div style={styles.msgBox}>
          <p style={{margin:0, fontSize:'16px', color:'#2c3e50', lineHeight:'1.6', textAlign:'center'}}>
            Screen sharing is mandatory to access the exam. You will be redirected to the dashboard.
          </p>
        </div>
        <p style={{textAlign:'center', color:'#888', fontSize:'14px', marginTop:'15px'}}>
          Please restart the exam and share your entire screen when prompted.
        </p>
      </div>
    </div>
  );

  // ── TRANSITIONING ──
  if (transitioning) return (
    <div style={styles.center}>
      <div style={styles.transBox}>
        <h2 style={{color:'#27ae60'}}>✅ Round {roundIndex + 1} Submitted!</h2>
        {roundIndex < ROUNDS.length - 1 && (
          <p style={{fontSize:'18px', color:'#2c3e50'}}>Get ready for {ROUNDS[roundIndex + 1]?.name}...</p>
        )}
        <div style={styles.spinner}></div>
      </div>
    </div>
  );

  // ── SUBMITTED ──
  if (submitted) return (
    <div style={styles.center}>
      <div style={styles.resultBox}>
        <div style={{fontSize:'70px', textAlign:'center', marginBottom:'15px'}}>
          {autoSubmitMsg ? '⛔' : '🎉'}
        </div>
        <h1 style={{color: autoSubmitMsg ? '#e74c3c' : '#27ae60', textAlign:'center', fontSize:'24px', marginBottom:'15px'}}>
          {autoSubmitMsg ? 'Exam Auto-Submitted' : 'Exam Completed!'}
        </h1>
        <div style={styles.msgBox}>
          <p style={{margin:0, fontSize:'16px', color:'#2c3e50', lineHeight:'1.6'}}>
            {autoSubmitMsg || completionMsg}
          </p>
        </div>
        <p style={{textAlign:'center', color:'#888', fontSize:'14px', marginBottom:'25px'}}>
          Results will be announced by your institution.
        </p>
        <button style={styles.homeBtn} onClick={() => navigate('/student')}>
          Back to Dashboard 🏠
        </button>
      </div>
    </div>
  );

  const question = roundQuestions[currentQ];
  const round = ROUNDS[roundIndex];

  // ── CODING ROUND (DSA) ──
  if (round.type === 'coding') {
    return (
      <DSARound
        exam={exam}
        questions={roundQuestions}
        onComplete={handleSubmitRound}
        userId={auth.currentUser?.uid}
        examId={examId}
      />
    );
  }

  // ── NO QUESTIONS ──
  if (!question) return (
    <div style={styles.center}>
      <div style={styles.transBox}>
        <h2>📭 No questions for {round.name}</h2>
        <p style={{color:'#666'}}>Admin needs to add <strong>{round.category}</strong> questions.</p>
        <button style={{...styles.homeBtn, width:'auto', padding:'10px 25px'}} onClick={() => handleSubmitRound(true)}>
          Skip Round ▶
        </button>
      </div>
    </div>
  );

  // ── MAIN EXAM UI ──
  return (
    <div style={styles.container}>

      {/* Violation Popup */}
      {showViolationPopup && (
        <div style={styles.violationPopup}>
          <div style={styles.violationContent}>
            <strong>{violationMsg}</strong>
            <br/>
            <span style={{fontSize:'13px'}}>
              Violation {violations} of {MAX_VIOLATIONS}. Exam auto-submits after {MAX_VIOLATIONS} violations.
            </span>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{...styles.header, backgroundColor: round.color}}>
        <div>
          <h3 style={styles.roundName}>{round.name}</h3>
          <p style={styles.qCount}>Question {currentQ + 1} of {roundQuestions.length}</p>
        </div>
        <div style={styles.headerRight}>
          {/* Screen sharing indicator */}
          {screenStream ? (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              fontSize: '11px',
              color: 'rgba(255,255,255,0.95)',
              backgroundColor: 'rgba(46, 204, 113, 0.3)',
              padding: '4px 8px',
              borderRadius: '4px',
              border: '1px solid rgba(255,255,255,0.3)'
            }}>
              <span style={{fontSize: '14px'}}>🔴</span>
              <span>Screen Sharing Active</span>
            </div>
          ) : (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              fontSize: '11px',
              color: 'rgba(255,255,255,0.95)',
              backgroundColor: 'rgba(231, 76, 60, 0.3)',
              padding: '4px 8px',
              borderRadius: '4px',
              border: '1px solid rgba(255,255,255,0.3)'
            }}>
              <span style={{fontSize: '14px'}}>⚠️</span>
              <span>Testing Mode - No Screen Sharing</span>
            </div>
          )}
          {/* Violation indicator */}
          <div style={styles.violationBar}>
            {Array.from({length: MAX_VIOLATIONS}).map((_, i) => (
              <div key={i} style={{
                ...styles.violationDot,
                backgroundColor: i < violations ? '#e74c3c' : 'rgba(255,255,255,0.3)'
              }}></div>
            ))}
            <span style={{color:'rgba(255,255,255,0.8)', fontSize:'11px', marginLeft:'5px'}}>
              Violations
            </span>
          </div>
          <div style={{...styles.timer, color: timerColor}}>
            ⏱ {formatTime(timeLeft)}
          </div>
        </div>
      </div>

      <div style={styles.body}>
        {/* Question Palette */}
        <div style={styles.palette}>
          <p style={styles.paletteTitle}>Question Palette</p>
          <div style={styles.paletteGrid}>
            {roundQuestions.map((_, i) => (
              <button key={i} style={{
                ...styles.paletteBtn,
                backgroundColor: answers[i] !== undefined ? round.color : i === currentQ ? '#ecf0f1' : 'white',
                color: answers[i] !== undefined ? 'white' : '#2c3e50',
                border: i === currentQ ? `2px solid ${round.color}` : '1px solid #ddd',
              }} onClick={() => setCurrentQ(i)}>{i + 1}</button>
            ))}
          </div>
          <div style={styles.legend}>
            <span style={{...styles.dot, backgroundColor: round.color}}></span> Answered &nbsp;
            <span style={{...styles.dot, backgroundColor:'white', border:'1px solid #ddd'}}></span> Not Answered
          </div>
          <div style={styles.answered}>
            {Object.keys(answers).length}/{roundQuestions.length} answered
          </div>
        </div>

        {/* Question Area */}
        <div style={styles.questionArea}>
          <div style={styles.questionBox}>
            {/* NO difficulty badge shown to student */}
            <h3 style={styles.questionText}>Q{currentQ + 1}. {question.text}</h3>
            <div style={styles.options}>
              {question.options.map((opt, i) => (
                <button key={i} style={{
                  ...styles.optBtn,
                  backgroundColor: answers[currentQ] === opt ? round.color : 'white',
                  color: answers[currentQ] === opt ? 'white' : '#2c3e50',
                  borderColor: answers[currentQ] === opt ? round.color : '#ddd',
                }} onClick={() => setAnswers({...answers, [currentQ]: opt})}>
                  <span style={styles.optLabel}>{String.fromCharCode(65 + i)}.</span> {opt}
                </button>
              ))}
            </div>
          </div>

          {/* Navigation */}
          <div style={styles.navRow}>
            <button style={styles.navBtn}
              onClick={() => setCurrentQ(q => Math.max(0, q - 1))}
              disabled={currentQ === 0}>◀ Previous</button>
            <button style={styles.clearBtn}
              onClick={() => { const a = {...answers}; delete a[currentQ]; setAnswers(a); }}>
              Clear Answer
            </button>
            {currentQ < roundQuestions.length - 1
              ? <button style={{...styles.navBtn, backgroundColor: round.color}}
                  onClick={() => setCurrentQ(q => q + 1)}>Next ▶</button>
              : <button style={styles.submitBtn} onClick={() => handleSubmitRound(false)}>
                  Submit Round ✅
                </button>
            }
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: { height:'100vh', backgroundColor:'#f0f4f8', display:'flex', flexDirection:'column', overflow:'hidden' },
  center: { display:'flex', justifyContent:'center', alignItems:'center', height:'100vh', backgroundColor:'#f0f4f8' },
  header: { padding:'12px 20px', display:'flex', justifyContent:'space-between', alignItems:'center', flexShrink:0 },
  headerRight: { display:'flex', flexDirection:'column', alignItems:'flex-end', gap:'4px' },
  roundName: { color:'white', margin:0, fontSize:'18px' },
  qCount: { color:'rgba(255,255,255,0.8)', margin:'2px 0 0 0', fontSize:'12px' },
  timer: { fontSize:'26px', fontWeight:'bold' },
  violationBar: { display:'flex', alignItems:'center', gap:'4px' },
  violationDot: { width:'10px', height:'10px', borderRadius:'50%' },
  body: { display:'flex', gap:'15px', padding:'15px', flex:1, overflow:'hidden' },
  palette: { width:'170px', backgroundColor:'white', padding:'12px', borderRadius:'10px', boxShadow:'0 2px 8px rgba(0,0,0,0.1)', overflowY:'auto', flexShrink:0 },
  paletteTitle: { fontWeight:'bold', color:'#2c3e50', marginTop:0, fontSize:'12px' },
  paletteGrid: { display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap:'4px' },
  paletteBtn: { padding:'5px', borderRadius:'4px', cursor:'pointer', fontSize:'11px', fontWeight:'bold' },
  legend: { marginTop:'10px', fontSize:'10px', color:'#7f8c8d', display:'flex', alignItems:'center', flexWrap:'wrap', gap:'4px' },
  dot: { width:'9px', height:'9px', borderRadius:'50%', display:'inline-block' },
  answered: { marginTop:'8px', fontSize:'11px', color:'#666', textAlign:'center', fontWeight:'bold' },
  questionArea: { flex:1, display:'flex', flexDirection:'column', gap:'12px', overflowY:'auto' },
  questionBox: { backgroundColor:'white', padding:'20px', borderRadius:'10px', boxShadow:'0 2px 8px rgba(0,0,0,0.1)' },
  questionText: { color:'#2c3e50', fontSize:'17px', lineHeight:'1.6', marginBottom:'20px', marginTop:'5px' },
  options: { display:'flex', flexDirection:'column', gap:'10px' },
  optBtn: { padding:'12px 16px', border:'2px solid', borderRadius:'8px', cursor:'pointer', fontSize:'15px', textAlign:'left', display:'flex', alignItems:'center', gap:'10px', transition:'all 0.15s' },
  optLabel: { fontWeight:'bold', minWidth:'20px' },
  navRow: { display:'flex', justifyContent:'space-between', gap:'10px', flexShrink:0 },
  navBtn: { padding:'10px 20px', backgroundColor:'#95a5a6', color:'white', border:'none', borderRadius:'8px', cursor:'pointer', fontSize:'14px' },
  clearBtn: { padding:'10px 16px', backgroundColor:'white', color:'#e74c3c', border:'1px solid #e74c3c', borderRadius:'8px', cursor:'pointer', fontSize:'14px' },
  submitBtn: { padding:'10px 20px', backgroundColor:'#27ae60', color:'white', border:'none', borderRadius:'8px', cursor:'pointer', fontSize:'14px', fontWeight:'bold' },
  transBox: { backgroundColor:'white', padding:'50px', borderRadius:'12px', textAlign:'center', boxShadow:'0 4px 20px rgba(0,0,0,0.1)' },
  spinner: { width:'40px', height:'40px', border:'4px solid #f0f0f0', borderTop:'4px solid #3498db', borderRadius:'50%', animation:'spin 1s linear infinite', margin:'20px auto' },
  resultBox: { backgroundColor:'white', padding:'50px 40px', borderRadius:'12px', boxShadow:'0 4px 20px rgba(0,0,0,0.1)', maxWidth:'500px', width:'90%' },
  msgBox: { backgroundColor:'#f0f9f0', border:'1px solid #c3e6cb', borderRadius:'8px', padding:'20px', marginBottom:'20px', textAlign:'center' },
  homeBtn: { width:'100%', padding:'13px', backgroundColor:'#3498db', color:'white', border:'none', borderRadius:'8px', fontSize:'16px', cursor:'pointer', fontWeight:'bold' },
  violationPopup: { position:'fixed', top:0, left:0, right:0, zIndex:9999, display:'flex', justifyContent:'center', padding:'15px' },
  violationContent: { backgroundColor:'#e74c3c', color:'white', padding:'14px 24px', borderRadius:'8px', textAlign:'center', boxShadow:'0 4px 20px rgba(0,0,0,0.3)', maxWidth:'500px', lineHeight:'1.5' },
};

export default ExamPage;
