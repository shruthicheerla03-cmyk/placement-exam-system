import React, { useState, useEffect, useCallback, useRef } from 'react';
import { db, auth } from '../firebase/config';
import { doc, getDoc, addDoc, collection } from 'firebase/firestore';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Timer, AlertTriangle, ScreenShare, CheckCircle2, Home, ChevronLeft, ChevronRight, Eraser, Clock } from 'lucide-react';
import DSARound from '../components/DSARound';
import Dialog from '../components/Dialog';
import './ExamPage.css';

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
  { name: 'Round 2: Core Subjects', category: 'Core Subjects', color: '#3498db', type: 'mcq' }, // Same as round 1
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
  const [showTransitionScreen, setShowTransitionScreen] = useState(false);
  const [transitionCountdown, setTransitionCountdown] = useState(30);
  const [currentTime, setCurrentTime] = useState(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));

  // Violation / proctoring state
  const [violations, setViolations] = useState(0);
  const [showViolationPopup, setShowViolationPopup] = useState(false);
  const [violationMsg, setViolationMsg] = useState('');
  
  // Screen sharing state
  const [screenStream, setScreenStream] = useState(null);
  const [screenShareBlocked, setScreenShareBlocked] = useState(false);
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

  const timerRef = useRef(null);
  const countdownIntervalRef = useRef(null);
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

  const completionMsg = useRef(
    COMPLETION_MESSAGES[Math.floor(Math.random() * COMPLETION_MESSAGES.length)]
  ).current;

  // ── LOAD ROUND ──
  const loadRound = useCallback((examData, rIndex) => {
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
    
    // ✅ Auto-restore saved answers from localStorage
    const savedAnswers = localStorage.getItem(`exam_${examId}_round_${rIndex}_answers`);
    if (savedAnswers) {
      try {
        const parsed = JSON.parse(savedAnswers);
        setAnswers(parsed);
        answersRef.current = parsed;
        console.log('📥 Restored answers from auto-save');
      } catch (e) {
        console.error('Failed to restore answers:', e);
        setAnswers({});
        answersRef.current = {};
      }
    } else {
      setAnswers({});
      answersRef.current = {};
    }
    
    setTimeLeft(duration);
  }, [examId]);

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
    if (reason === 'violations') setAutoSubmitMsg('Exam submitted due to multiple violations.');
    setSubmitted(true);
    setTransitioning(false);
    // Clean up session storage and auto-save data
    sessionStorage.removeItem('screenSharingActive');
    // Clear all auto-saved answers for this exam
    for (let i = 0; i < ROUNDS.length; i++) {
      localStorage.removeItem(`exam_${examId}_round_${i}_answers`);
    }
    console.log('🗑️ Cleared auto-saved answers');
    // Exit fullscreen
    try { if (document.fullscreenElement) document.exitFullscreen(); } catch (e) {}
  }, [examId]);

  const handleSubmitRound = useCallback(async (auto = false) => {
    if (submittingRef.current) return;
    clearTimeout(timerRef.current);

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
      // Show transition screen with countdown
      setTransitioning(true);
      setShowTransitionScreen(true);
      setTransitionCountdown(30);
      
      // Start countdown timer
      let countdown = 30;
      countdownIntervalRef.current = setInterval(() => {
        countdown--;
        setTransitionCountdown(countdown);
        
        if (countdown <= 0) {
          clearInterval(countdownIntervalRef.current);
          proceedToNextRound();
        }
      }, 1000);
    } else {
      await submitExam(newScores, auto ? 'auto' : 'manual');
    }
  }, [submitExam, loadRound]);

  // Function to proceed to next round
  const proceedToNextRound = useCallback(() => {
    clearInterval(countdownIntervalRef.current);
    const next = roundIndexRef.current + 1;
    setRoundIndex(next);
    loadRound(examRef.current, next);
    setShowTransitionScreen(false);
    setTransitioning(false);
  }, [loadRound]);

  // ── VIOLATION HANDLER ──
  const handleViolation = useCallback(async (msg) => {
    if (submittingRef.current) return;
    const newCount = violationsRef.current + 1;
    setViolations(newCount);
    violationsRef.current = newCount;

    // ✅ SECURITY: Store violation in Firestore (backend validation)
    try {
      await addDoc(collection(db, 'violations'), {
        userId: auth.currentUser?.uid,
        userEmail: auth.currentUser?.email,
        examId: examId,
        violationType: msg,
        timestamp: new Date(),
        roundIndex: roundIndexRef.current,
        totalViolations: newCount
      });
      console.log('🚨 Violation logged to Firestore:', msg);
    } catch (error) {
      console.error('Failed to log violation:', error);
      // Continue even if logging fails - don't block the exam
    }

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
  }, [examId, handleSubmitRound]);

  // ── MONITOR SCREEN SHARING ──
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    // Check if screen sharing was initiated (via sessionStorage flag)
    const screenSharingActive = sessionStorage.getItem('screenSharingActive');
    const stream = location.state?.screenStream;
    
    // Allow null for testing mode (when screenSharingActive is set or stream is explicitly null)
    if (!screenSharingActive && stream === undefined) {
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
            showDialog(
              'Critical Proctoring Alert',
              'Screen sharing stopped! Your exam will be auto-submitted immediately to preserve integrity.',
              () => {
                handleSubmitRound(true).then(() => {
                  submittingRef.current = true;
                  setAutoSubmitMsg('Exam auto-submitted because screen sharing stopped.');
                });
              },
              'warning',
              false
            );
          }
        };
      }
    }

    // 🔥 SECURITY: Periodically verify screen sharing is still active
    const verifyScreenSharing = setInterval(() => {
      const isActive = sessionStorage.getItem('screenSharingActive');
      
      // If stream exists, verify it's still live
      if (stream && screenSharingActive === 'true') {
        const videoTrack = stream.getVideoTracks()[0];
        if (videoTrack && videoTrack.readyState === 'ended') {
          console.error('🚨 Screen sharing stream ended!');
          sessionStorage.removeItem('screenSharingActive');
          if (!submittingRef.current && !submitted) {
            clearInterval(verifyScreenSharing);
            handleViolation('⚠️ Screen sharing stopped!');
          }
        }
      }
      
      // If flag was removed (user tampered), take action
      if (!isActive && screenSharingActive === 'true' && !submittingRef.current) {
        console.error('🚨 Screen sharing flag tampered!');
        clearInterval(verifyScreenSharing);
        handleViolation('⚠️ Screen sharing verification failed!');
      }
    }, 5000); // Check every 5 seconds

    // Cleanup
    return () => {
      clearInterval(verifyScreenSharing);
      if (stream && submitted) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [location.state, submitted, navigate, handleViolation, handleSubmitRound]);

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

    // Prevent right-click
    const onContextMenu = (e) => {
      e.preventDefault();
      handleViolation('⚠️ Warning: Right-click is disabled during the exam!');
      return false;
    };

    // Prevent copy-paste
    const onCopy = (e) => {
      e.preventDefault();
      handleViolation('⚠️ Warning: Copying is disabled during the exam!');
      return false;
    };

    const onPaste = (e) => {
      e.preventDefault();
      handleViolation('⚠️ Warning: Pasting is disabled during the exam!');
      return false;
    };

    const onCut = (e) => {
      e.preventDefault();
      handleViolation('⚠️ Warning: Cutting is disabled during the exam!');
      return false;
    };

    // Prevent keyboard shortcuts (Ctrl+C, Ctrl+V, Ctrl+X, etc.)
    const onKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === 'c' || e.key === 'v' || e.key === 'x' || e.key === 'a')) {
        e.preventDefault();
        handleViolation(`⚠️ Warning: Keyboard shortcuts are disabled during the exam!`);
        return false;
      }
    };

    document.addEventListener('fullscreenchange', onFSChange);
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('blur', onBlur);
    document.addEventListener('contextmenu', onContextMenu);
    document.addEventListener('copy', onCopy);
    document.addEventListener('paste', onPaste);
    document.addEventListener('cut', onCut);
    document.addEventListener('keydown', onKeyDown);

    return () => {
      document.removeEventListener('fullscreenchange', onFSChange);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('blur', onBlur);
      document.removeEventListener('contextmenu', onContextMenu);
      document.removeEventListener('copy', onCopy);
      document.removeEventListener('paste', onPaste);
      document.removeEventListener('cut', onCut);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [submitted, handleViolation]);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [examId]);

  // ✅ AUTO-SAVE ANSWERS - Save to localStorage AND Firestore
  useEffect(() => {
    if (!examId || roundIndex === null || Object.keys(answers).length === 0) return;
    
    // Local backup (fast)
    const saveKey = `exam_${examId}_round_${roundIndex}_answers`;
    localStorage.setItem(saveKey, JSON.stringify(answers));
    
    // 🔥 SECURITY: Also sync to Firestore (backend validation possible)
    const syncToFirestore = async () => {
      try {
        const sessionId = `${auth.currentUser?.uid}_${examId}_${Date.now()}`;
        await addDoc(collection(db, 'examSessions'), {
          userId: auth.currentUser?.uid,
          userEmail: auth.currentUser?.email,
          examId: examId,
          roundIndex: roundIndex,
          answers: answers,
          timestamp: new Date(),
          sessionId: sessionId
        });
        console.log('☁️ Answers synced to Firestore');
      } catch (error) {
        console.error('Failed to sync answers:', error);
        // Continue with localStorage backup
      }
    };
    
    // Debounce Firestore sync (don't spam on every keystroke)
    const debounceTimer = setTimeout(syncToFirestore, 2000);
    console.log('💾 Auto-saved answers locally');
    
    return () => clearTimeout(debounceTimer);
  }, [answers, examId, roundIndex]);

  useEffect(() => {
    if (timeLeft === null || submitted || transitioning) return;
    if (timeLeft <= 0) { handleSubmitRound(true); return; }
    timerRef.current = setTimeout(() => setTimeLeft(t => t - 1), 1000);
    return () => clearTimeout(timerRef.current);
  }, [timeLeft, submitted, transitioning, handleSubmitRound]);

  // Cleanup countdown interval on unmount
  useEffect(() => {
    return () => {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
    };
  }, []);

  const formatTime = (secs) => {
    const m = String(Math.floor(secs / 60)).padStart(2, '0');
    const s = String(secs % 60).padStart(2, '0');
    return `${m}:${s}`;
  };

  if (loading) return (
    <div className="fullscreen-center">
      <div className="status-card">
        <div className="status-icon">⏳</div>
        <h3>Loading Exam...</h3>
      </div>
    </div>
  );

  if (screenShareBlocked) return (
    <div className="fullscreen-center">
      <div className="status-card">
        <div className="status-icon">🚫</div>
        <h2 style={{color: '#ef4444'}}>Access Denied</h2>
        <p>Screen sharing is mandatory to access the exam.</p>
      </div>
    </div>
  );

  if (showTransitionScreen) return (
    <div className="fullscreen-center">
      <div className="status-card" style={{ animation: 'slideDown 0.5s cubic-bezier(0.18, 0.89, 0.32, 1.28)' }}>
        <div className="status-icon" style={{ fontSize: '80px', marginBottom: '10px' }}>✅</div>
        <h2 style={{ color: '#10b981', fontSize: '30px', fontWeight: '800', marginBottom: '10px' }}>
          Round {roundIndex + 1} Completed!
        </h2>
        <p style={{ fontSize: '18px', color: '#64748b', fontWeight: '500', marginBottom: '20px' }}>
          Great work! Get ready for <strong>{ROUNDS[roundIndex + 1]?.name}</strong>
        </p>
        
        <div style={{ 
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          borderRadius: '15px',
          padding: '24px',
          marginBottom: '24px',
          boxShadow: '0 8px 20px rgba(102, 126, 234, 0.3)'
        }}>
          <p style={{ fontSize: '16px', color: '#e0e7ff', marginBottom: '8px', fontWeight: '500' }}>
            Auto-starting in
          </p>
          <div style={{ 
            fontSize: '48px', 
            fontWeight: '900', 
            color: '#ffffff',
            fontFamily: 'monospace',
            textShadow: '0 2px 10px rgba(0,0,0,0.2)'
          }}>
            {transitionCountdown}s
          </div>
        </div>

        <button 
          className="nav-button primary"
          onClick={proceedToNextRound}
          style={{ 
            width: '100%', 
            padding: '18px', 
            fontSize: '18px',
            fontWeight: '700',
            marginBottom: '16px',
            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
            border: 'none',
            boxShadow: '0 4px 15px rgba(16, 185, 129, 0.4)',
            transition: 'all 0.3s ease'
          }}
        >
          Start Round {roundIndex + 2} Now →
        </button>

        <p style={{ fontSize: '14px', color: '#f59e0b', fontWeight: '600', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
          <span style={{ fontSize: '18px' }}>⚠️</span>
          Do not leave this page or switch tabs
        </p>
      </div>
    </div>
  );

  if (transitioning) return (
    <div className="fullscreen-center">
      <div className="status-card" style={{ animation: 'slideDown 0.5s cubic-bezier(0.18, 0.89, 0.32, 1.28)' }}>
        <div className="status-icon" style={{ fontSize: '80px', marginBottom: '10px' }}>🎯</div>
        <h2 style={{ color: '#10b981', fontSize: '30px', fontWeight: '800', marginBottom: '10px' }}>
          Loading Next Round...
        </h2>
        <p style={{ fontSize: '18px', color: '#64748b', fontWeight: '500' }}>
          Please wait while we prepare your questions...
        </p>
      </div>
    </div>
  );

  if (submitted) return (
    <div className="fullscreen-center">
      <div className="status-card" style={{ animation: 'slideDown 0.5s ease-out' }}>
        <div className="status-icon" style={{ fontSize: '80px' }}>{autoSubmitMsg ? '⛔' : '🎉'}</div>
        <h2 style={{ color: autoSubmitMsg ? '#ef4444' : '#10b981', fontSize: '32px', fontWeight: '800', marginBottom: '16px' }}>
          {autoSubmitMsg ? 'Exam Auto-Submitted' : 'Exam Completed!'}
        </h2>
        <p style={{ margin: '16px 0', fontSize: '18px', color: '#64748b', lineHeight: '1.6' }}>
          {autoSubmitMsg || completionMsg}
        </p>
        <button className="nav-button primary" style={{ width: '100%', padding: '18px', marginTop: '10px' }} onClick={() => navigate('/student')}>
          <Home size={22} style={{ marginRight: '8px' }} /> Back to Dashboard
        </button>
      </div>
    </div>
  );

  const question = roundQuestions[currentQ];
  const round = ROUNDS[roundIndex];

  if (round.type === 'coding') {
    return (
      <div className="exam-page-container">
        {showViolationPopup && (
          <div className="violation-overlay">
            <div className="violation-card">
              <strong>{violationMsg}</strong>
              <p style={{fontSize: '13px', margin: '8px 0 0 0', opacity: 0.9}}>
                Violation {violations} of {MAX_VIOLATIONS}.
              </p>
            </div>
          </div>
        )}

        <DSARound
          exam={exam}
          questions={roundQuestions}
          onComplete={handleSubmitRound}
          userId={auth.currentUser?.uid}
          examId={examId}
          violations={violations}
          showDialog={showDialog}
          currentTime={currentTime}
          timeLeft={timeLeft}
        />

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

  if (!question) return (
    <div className="fullscreen-center">
      <div className="status-card shadow-lg" style={{ maxWidth: '450px' }}>
        <div className="status-icon" style={{ fontSize: '70px', marginBottom: '15px' }}>📭</div>
        <h2 style={{ fontSize: '26px', fontWeight: '800', color: '#1e293b', marginBottom: '15px' }}>
          Round {roundIndex + 1} Content Pending
        </h2>
        <p style={{ color: '#64748b', fontSize: '16px', lineHeight: '1.7', marginBottom: '30px' }}>
          The examiner has not yet populated this section with problems. You may proceed to the next stage.
        </p>
        <button className="nav-button primary" style={{ width: '100%', padding: '15px' }} onClick={() => handleSubmitRound(true)}>
          Skip Round & Continue <ChevronRight size={18} />
        </button>
      </div>
    </div>
  );

  return (
    <div className="exam-page-container">
      {showViolationPopup && (
        <div className="violation-overlay">
          <div className="violation-card">
            <strong>{violationMsg}</strong>
            <p style={{fontSize: '13px', margin: '8px 0 0 0', opacity: 0.9}}>
              Violation {violations} of {MAX_VIOLATIONS}.
            </p>
          </div>
        </div>
      )}

      <header className="exam-header" style={{backgroundColor: round.color}}>
        <div className="header-left">
          <h3 className="round-title">{round.name}</h3>
          <div className="question-progress">
            Question {currentQ + 1} of {roundQuestions.length}
          </div>
        </div>
        <div style={{display: 'flex', alignItems: 'center', gap: '15px'}}>
          {/* Screen sharing indicator */}
          {(() => {
            const sharingStatus = sessionStorage.getItem('screenSharingActive');
            const hasStream = screenStream !== null;
            
            if (hasStream || sharingStatus === 'true') {
              return (
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
              );
            } else if (sharingStatus === 'testing') {
              return (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  fontSize: '11px',
                  color: 'rgba(255,255,255,0.95)',
                  backgroundColor: 'rgba(243, 156, 18, 0.3)',
                  padding: '4px 8px',
                  borderRadius: '4px',
                  border: '1px solid rgba(255,255,255,0.3)'
                }}>
                  <span style={{fontSize: '14px'}}>⚠️</span>
                  <span>Testing Mode</span>
                </div>
              );
            } else {
              return (
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
                  <span style={{fontSize: '14px'}}>❌</span>
                  <span>No Proctoring</span>
                </div>
              );
            }
          })()}
          {/* Violation indicator */}
          <div style={{display: 'flex', alignItems: 'center', gap: '3px'}}>
            {Array.from({length: MAX_VIOLATIONS}).map((_, i) => (
              <div key={i} className={`violation-dot ${i < violations ? 'active' : ''}`} />
            ))}
            <span style={{fontSize: '11px', marginLeft: '4px', fontWeight: 600}}>Violations</span>
          </div>

          <div className="current-time-display" style={{fontSize: '14px', opacity: 0.8, display: 'flex', alignItems: 'center', gap: '4px'}}>
            <Clock size={16} />
            {currentTime}
          </div>

          <div className="exam-timer" style={{color: timeLeft < 60 ? '#ffb8b8' : 'white'}}>
            <Timer size={24} />
            {formatTime(timeLeft)}
          </div>
        </div>
      </header>

      <main className="exam-body">
        <aside className="exam-sidebar">
          <div className="sidebar-title">Question Palette</div>
          <div className="palette-grid">
            {roundQuestions.map((_, i) => (
              <button 
                key={i} 
                className={`palette-number ${answers[i] !== undefined ? 'answered' : ''} ${i === currentQ ? 'active' : ''}`}
                style={{
                  backgroundColor: answers[i] !== undefined ? 'rgb(39, 163, 20)' : 'rgba(217, 78, 59, 0.1)',
                  color: answers[i] !== undefined ? 'white' : 'rgba(217, 78, 59, 1)',
                  borderColor: i === currentQ ? '#1e293b' : 'transparent'
                }}
                onClick={() => setCurrentQ(i)}
              >
                {i + 1}
              </button>
            ))}
          </div>
          
          <div className="sidebar-footer">
            <div className="status-legend">
              <div className="legend-item">
                <div className="legend-dot" style={{backgroundColor: 'rgb(39, 163, 20)'}} />
                <span>Answered</span>
              </div>
              <div className="legend-item">
                <div className="legend-dot" style={{backgroundColor: 'rgba(217, 78, 59, 1)'}} />
                <span>Not Answered</span>
              </div>
            </div>
          </div>
        </aside>

        <section className="exam-content">
          <div className="question-card">
            <h3 className="question-text">
              Q{currentQ + 1}. {question.text}
            </h3>
            
            <div className="options-container">
              {question.options.map((opt, i) => (
                <button 
                  key={i} 
                  className={`option-btn ${answers[currentQ] === opt ? 'selected' : ''}`}
                  onClick={() => setAnswers({...answers, [currentQ]: opt})}
                >
                  <div className="option-label">{String.fromCharCode(65 + i)}</div>
                  {opt}
                </button>
              ))}
            </div>
          </div>

          <div className="exam-navigation">
            <button 
              className="nav-button secondary"
              onClick={() => setCurrentQ(q => Math.max(0, q - 1))}
              disabled={currentQ === 0}
            >
              <ChevronLeft size={18} /> Previous
            </button>

            <button 
              className="nav-button danger"
              onClick={() => { const a = {...answers}; delete a[currentQ]; setAnswers(a); }}
            >
              <Eraser size={18} /> Clear Answer
            </button>

            {currentQ < roundQuestions.length - 1 ? (
              <button 
                className="nav-button primary"
                onClick={() => setCurrentQ(q => q + 1)}
              >
                Next <ChevronRight size={18} />
              </button>
            ) : (
              <button className="nav-button success" onClick={() => handleSubmitRound(false)}>
                <CheckCircle2 size={18} /> Submit Round
              </button>
            )}
          </div>
        </section>
      </main>

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

export default ExamPage;
