import React, { useState, useEffect, useCallback, useRef } from 'react';
import { db, auth } from '../firebase/config';
import { doc, getDoc, addDoc, collection } from 'firebase/firestore';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Timer, CheckCircle2, Home, ChevronLeft, ChevronRight, Eraser, Clock } from 'lucide-react';
import DSARound from '../components/DSARound';
import Dialog from '../components/Dialog';
import UserProfile from '../components/UserProfile';
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
  { name: 'Round 1: Aptitude',      category: 'Aptitude',      color: '#3498db', type: 'mcq'    },
  { name: 'Round 2: Core Subjects', category: 'Core Subjects', color: '#3498db', type: 'mcq'    },
  { name: 'Round 3: DSA',           category: 'DSA',           color: '#e67e22', type: 'coding' },
];
 
const MAX_VIOLATIONS_PER_ROUND = 3;
 
const COMPLETION_MESSAGES = [
  'Your responses have been successfully submitted.',
  'Thank you for completing the test. Results will be announced later.',
  'Your exam has been recorded. Please wait for further instructions.',
  'Submission successful! Your institution will share results with you.',
  'All done! Your answers have been saved securely.',
];
 
// ─────────────────────────────────────────────
// BLOCKING VIOLATION MODAL
// ─────────────────────────────────────────────
function ViolationModal({ show, message, roundName, violations, maxViolations, isFullscreenViolation, onContinue }) {
  if (!show) return null;
 
  const pct       = (violations / maxViolations) * 100;
  const barColor  = violations >= maxViolations - 1 ? '#ef4444' : violations >= maxViolations - 2 ? '#f97316' : '#f59e0b';
  const remaining = maxViolations - violations;
 
  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'rgba(0,0,0,0.92)',
      zIndex: 99999,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      backdropFilter: 'blur(6px)',
      userSelect: 'none',
    }}>
      <div style={{
        background: '#fff',
        borderRadius: 20,
        padding: '44px 40px',
        maxWidth: 460,
        width: '90%',
        textAlign: 'center',
        border: '2px solid #fee2e2',
        boxShadow: '0 32px 80px rgba(0,0,0,0.55)',
        animation: 'violationPop 0.3s cubic-bezier(0.175,0.885,0.32,1.275)',
      }}>
        <div style={{ fontSize: 54, marginBottom: 12, animation: 'shake 0.5s ease' }}>⚠️</div>
 
        <div style={{
          display: 'inline-block',
          background: '#eff6ff', color: '#2563eb',
          border: '1px solid #bfdbfe',
          borderRadius: 20, padding: '4px 14px',
          fontSize: 12, fontWeight: 700, marginBottom: 10, letterSpacing: '0.4px',
        }}>
          {roundName}
        </div>
 
        <div style={{
          display: 'inline-block', marginLeft: 8,
          background: '#fef2f2', color: '#dc2626',
          border: '1px solid #fecaca',
          borderRadius: 20, padding: '4px 14px',
          fontSize: 12, fontWeight: 700, marginBottom: 10,
        }}>
          VIOLATION {violations} / {maxViolations}
        </div>
 
        <h2 style={{ fontSize: 20, fontWeight: 800, color: '#111827', marginBottom: 10, lineHeight: 1.3 }}>
          Violation Detected
        </h2>
 
        <p style={{ fontSize: 14, color: '#4b5563', lineHeight: 1.75, marginBottom: 24 }}>
          {message}
        </p>
 
        <div style={{ marginBottom: 26 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#6b7280', marginBottom: 6 }}>
            <span>This round's violations</span>
            <span style={{ color: barColor, fontWeight: 700 }}>
              {remaining > 0 ? `${remaining} remaining` : 'Round will be submitted!'}
            </span>
          </div>
          <div style={{ height: 8, background: '#f3f4f6', borderRadius: 99, overflow: 'hidden' }}>
            <div style={{
              height: '100%', borderRadius: 99,
              width: `${pct}%`, background: barColor,
              transition: 'width 0.4s ease, background 0.4s ease',
            }} />
          </div>
          {violations >= maxViolations - 1 && (
            <p style={{ fontSize: 12, color: '#ef4444', fontWeight: 700, marginTop: 8 }}>
              ⛔ One more violation will auto-submit this round!
            </p>
          )}
        </div>
 
        <button
          onClick={onContinue}
          style={{
            width: '100%', padding: '15px 24px',
            background: isFullscreenViolation
              ? 'linear-gradient(135deg,#3b82f6,#1d4ed8)'
              : 'linear-gradient(135deg,#f59e0b,#d97706)',
            color: '#fff', border: 'none', borderRadius: 12,
            fontSize: 15, fontWeight: 700, cursor: 'pointer',
            boxShadow: isFullscreenViolation
              ? '0 4px 14px rgba(59,130,246,0.45)'
              : '0 4px 14px rgba(245,158,11,0.45)',
          }}
        >
          {isFullscreenViolation ? '🔲 Return to Fullscreen & Continue Exam' : 'I Understand — Continue Exam'}
        </button>
      </div>
 
      <style>{`
        @keyframes violationPop {
          from { opacity:0; transform:scale(0.85); }
          to   { opacity:1; transform:scale(1); }
        }
        @keyframes shake {
          0%,100% { transform:translateX(0); }
          20%      { transform:translateX(-6px); }
          40%      { transform:translateX(6px); }
          60%      { transform:translateX(-4px); }
          80%      { transform:translateX(4px); }
        }
      `}</style>
    </div>
  );
}
 
// ─────────────────────────────────────────────
// MAIN EXAM PAGE
// ─────────────────────────────────────────────
function ExamPage() {
  const { examId } = useParams();
  const navigate   = useNavigate();
  const location   = useLocation();
 
  const [exam, setExam]                 = useState(null);
  const [roundIndex, setRoundIndex]     = useState(0);
  const [roundQuestions, setRoundQuestions] = useState([]);
  const [currentQ, setCurrentQ]         = useState(0);
  const [answers, setAnswers]           = useState({});
  const [timeLeft, setTimeLeft]         = useState(null);
  const [submitted, setSubmitted]       = useState(false);
  const [autoSubmitMsg, setAutoSubmitMsg] = useState('');
  const [scores, setScores]             = useState([]);
  const [loading, setLoading]           = useState(true);
  const [transitioning, setTransitioning]       = useState(false);
  const [showTransitionScreen, setShowTransitionScreen] = useState(false);
  const [transitionCountdown, setTransitionCountdown]   = useState(30);
  const [currentTime, setCurrentTime]   = useState(
    new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  );
 
  const [roundViolations, setRoundViolations] = useState([0, 0, 0]);
  const roundViolationsRef = useRef([0, 0, 0]);
 
  const [showViolationPopup, setShowViolationPopup]   = useState(false);
  const [violationMsg, setViolationMsg]               = useState('');
  const [isFullscreenViolation, setIsFullscreenViolation] = useState(false);
 
  const [screenStream, setScreenStream]         = useState(null);
  const [screenShareBlocked, setScreenShareBlocked] = useState(false);
  const [showPausedOverlay, setShowPausedOverlay] = useState(false);
 
  const [dialogConfig, setDialogConfig] = useState({
    isOpen: false, title: '', message: '', type: 'confirm',
    onConfirm: () => {}, onCancel: null,
  });
 
  const showDialog = (title, message, onConfirm, type = 'confirm', hasCancel = true) => {
    setDialogConfig({
      isOpen: true, title, message, type,
      onConfirm: () => { onConfirm(); setDialogConfig(p => ({ ...p, isOpen: false })); },
      onCancel: hasCancel ? () => setDialogConfig(p => ({ ...p, isOpen: false })) : null,
    });
  };
 
  const timerRef             = useRef(null);
  const countdownIntervalRef = useRef(null);
  const submittingRef        = useRef(false);
  const scoresRef            = useRef([]);
  const roundQuestionsRef    = useRef([]);
  const answersRef           = useRef({});
  const roundIndexRef        = useRef(0);
  const examRef              = useRef(null);
  const violationCooldownRef = useRef(false);
 
  useEffect(() => { scoresRef.current = scores; },               [scores]);
  useEffect(() => { roundQuestionsRef.current = roundQuestions; }, [roundQuestions]);
  useEffect(() => { answersRef.current = answers; },             [answers]);
  useEffect(() => { roundIndexRef.current = roundIndex; },       [roundIndex]);
  useEffect(() => { examRef.current = exam; },                   [exam]);
 
  useEffect(() => {
    const id = setInterval(() =>
      setCurrentTime(new Date().toLocaleTimeString([], {
        hour: '2-digit', minute: '2-digit', second: '2-digit',
      })), 1000);
    return () => clearInterval(id);
  }, []);
 
  const completionMsg = useRef(
    COMPLETION_MESSAGES[Math.floor(Math.random() * COMPLETION_MESSAGES.length)]
  ).current;
 
  const loadRound = useCallback((examData, rIndex) => {
    if (!ROUNDS[rIndex]) { console.error('loadRound: invalid rIndex', rIndex); return; }
    const category = ROUNDS[rIndex].category;
    const roundType = ROUNDS[rIndex].type;
    const filtered  = (examData.questions || []).filter(q => q.category === category);

    // Try to restore saved question order from localStorage (preserves shuffle after refresh)
    const savedQKey = `exam_${examId}_round_${rIndex}_questions`;
    let processed = null;
    try {
      const savedQJSON = localStorage.getItem(savedQKey);
      if (savedQJSON) processed = JSON.parse(savedQJSON);
    } catch { processed = null; }

    if (!processed) {
      processed = roundType === 'coding'
        ? shuffle(filtered)
        : shuffle(filtered).map(q => ({
            id: q.id, text: q.text, options: shuffle(q.options),
            correct: q.correct, category: q.category,
            difficulty: q.difficulty,
          }));
      localStorage.setItem(savedQKey, JSON.stringify(processed));
    }

    let duration = (examData.duration || 30) * 60;
    if (examData.roundDurations) {
      if (rIndex === 0) duration = (examData.roundDurations.aptitude || 30) * 60;
      if (rIndex === 1) duration = (examData.roundDurations.core     || 30) * 60;
      if (rIndex === 2) duration = (examData.roundDurations.dsa      || 60) * 60;
    }

    setRoundQuestions(processed);
    roundQuestionsRef.current = processed;
    setCurrentQ(0);

    const saved = localStorage.getItem(`exam_${examId}_round_${rIndex}_answers`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setAnswers(parsed);
        answersRef.current = parsed;
      } catch { setAnswers({}); answersRef.current = {}; }
    } else {
      setAnswers({});
      answersRef.current = {};
    }

    // Restore saved timer or use full duration
    const savedTimer = localStorage.getItem(`exam_${examId}_round_${rIndex}_timer`);
    setTimeLeft(savedTimer !== null ? parseInt(savedTimer) : duration);
  }, [examId]);
 
  const submitExam = useCallback(async (finalScores, reason = '') => {
    if (submittingRef.current) return;
    submittingRef.current = true;
    clearTimeout(timerRef.current);
    try {
      await addDoc(collection(db, 'submissions'), {
        userId:         auth.currentUser?.uid,
        userEmail:      auth.currentUser?.email,
        examId,
        scores:         finalScores,
        totalScore:     finalScores.reduce((s, r) => s + r.score, 0),
        totalQuestions: finalScores.reduce((s, r) => s + r.total, 0),
        violations:     roundViolationsRef.current,
        submittedAt:    new Date(),
        reason,
      });
    } catch (e) { console.error(e); }
    if (reason === 'violations') setAutoSubmitMsg('Exam submitted due to excessive violations.');
    setSubmitted(true);
    setTransitioning(false);
    sessionStorage.removeItem('screenSharingActive');
    sessionStorage.removeItem('examInProgress');
    for (let i = 0; i < ROUNDS.length; i++) {
      localStorage.removeItem(`exam_${examId}_round_${i}_answers`);
      localStorage.removeItem(`exam_${examId}_round_${i}_timer`);
      localStorage.removeItem(`exam_${examId}_round_${i}_questions`);
    }
    localStorage.removeItem(`exam_${examId}_currentRound`);
    localStorage.removeItem(`exam_${examId}_r1r2scores`);
    localStorage.removeItem(`exam_${examId}_violations`);
    localStorage.removeItem(`exam_${examId}_dsa_currentQuestion`);
    localStorage.removeItem(`exam_${examId}_dsa_solutions`);
    // Clean up per-user code drafts for this exam
    const uid = auth.currentUser?.uid;
    if (uid) {
      const draftPrefix = `dsa_draft_${uid}_${examId}_`;
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith(draftPrefix)) keysToRemove.push(k);
      }
      keysToRemove.forEach(k => localStorage.removeItem(k));
    }
    try { if (document.fullscreenElement) document.exitFullscreen(); } catch {}
  }, [examId]);
 
  const handleSubmitRound = useCallback(async (auto = false) => {
    if (submittingRef.current) return;
    clearTimeout(timerRef.current);
 
    const isDSARound = ROUNDS[roundIndexRef.current]?.type === 'coding';
    let correct = 0;
    let answered = 0;
    if (isDSARound) {
      // For DSA, count solutions from localStorage (MCQ answers state is not used)
      try {
        const saved = localStorage.getItem(`exam_${examId}_dsa_solutions`);
        if (saved) answered = Object.keys(JSON.parse(saved)).length;
      } catch {}
      correct = answered; // treat attempted = correct for submissions scoring
    } else {
      roundQuestionsRef.current.forEach((q, i) => {
        if (answersRef.current[i] === q.correct) correct++;
      });
      answered = Object.keys(answersRef.current).length;
    }
    const roundScore = {
      round: ROUNDS[roundIndexRef.current].name,
      score: correct,
      total: roundQuestionsRef.current.length,
      answered: answered,
    };
    const newScores = [...scoresRef.current, roundScore];
    setScores(newScores);
    scoresRef.current = newScores;
    localStorage.setItem(`exam_${examId}_r1r2scores`, JSON.stringify(newScores));
 
    const isLastRound = roundIndexRef.current >= ROUNDS.length - 1;
 
    if (isLastRound) {
      await submitExam(newScores, auto ? 'auto' : 'manual');
    } else {
      setTransitioning(true);
      setShowTransitionScreen(true);
      setTransitionCountdown(30);
 
      let countdown = 30;
      countdownIntervalRef.current = setInterval(() => {
        countdown--;
        setTransitionCountdown(countdown);
        if (countdown <= 0) {
          clearInterval(countdownIntervalRef.current);
          proceedToNextRound();
        }
      }, 1000);
    }
  }, [submitExam]);
 
  const proceedToNextRound = useCallback(() => {
    clearInterval(countdownIntervalRef.current);
    const next = roundIndexRef.current + 1;
    localStorage.setItem(`exam_${examId}_currentRound`, next.toString());
 
    setRoundViolations(prev => {
      const updated = [...prev];
      updated[next] = 0;
      return updated;
    });
    roundViolationsRef.current[next] = 0;
 
    setRoundIndex(next);
    roundIndexRef.current = next;
    loadRound(examRef.current, next);
    setShowTransitionScreen(false);
    setTransitioning(false);
    setShowViolationPopup(false);
    submittingRef.current = false;
  }, [loadRound, examId]);
 
  const handleViolation = useCallback(async (msg, isFS = false) => {
    if (submittingRef.current) return;
 
    if (violationCooldownRef.current) return;
    violationCooldownRef.current = true;
    setTimeout(() => { violationCooldownRef.current = false; }, 1000);
 
    const rIdx    = roundIndexRef.current;
    const current = roundViolationsRef.current[rIdx] + 1;
 
    setRoundViolations(prev => {
      const updated = [...prev];
      updated[rIdx] = current;
      localStorage.setItem(`exam_${examId}_violations`, JSON.stringify(updated));
      return updated;
    });
    roundViolationsRef.current[rIdx] = current;

    try {
      await addDoc(collection(db, 'violations'), {
        userId:          auth.currentUser?.uid,
        userEmail:       auth.currentUser?.email,
        examId,
        violationType:   msg,
        timestamp:       new Date(),
        roundIndex:      rIdx,
        roundViolations: current,
      });
    } catch (err) { console.error('Failed to log violation:', err); }
 
    if (current >= MAX_VIOLATIONS_PER_ROUND) {
      setShowViolationPopup(false);
      handleSubmitRound(true);
      return;
    }
 
    setViolationMsg(msg);
    setIsFullscreenViolation(isFS);
    setShowViolationPopup(true);
  }, [examId, handleSubmitRound]);
 
  const handleDismissViolation = useCallback(() => {
    if (isFullscreenViolation) {
      const el  = document.documentElement;
      const rfs = el.requestFullscreen
        || el.webkitRequestFullscreen
        || el.mozRequestFullScreen
        || el.msRequestFullscreen;
      if (rfs) rfs.call(el).catch(() => {});
    }
    setShowViolationPopup(false);
    setIsFullscreenViolation(false);
  }, [isFullscreenViolation]);

  // ── MCQ intermediate submit with answered/not-answered confirmation ──
  const handleMCQSubmitClick = useCallback(() => {
    const answeredCount  = Object.keys(answersRef.current).length;
    const notAnsweredCount = roundQuestionsRef.current.length - answeredCount;

    const msgContent = (
      <div style={{ textAlign: 'center' }}>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 16, margin: '4px 0 14px 0' }}>
          <div style={{
            background: 'rgba(39,163,20,0.1)', border: '2px solid rgb(39,163,20)',
            borderRadius: 10, padding: '12px 22px', minWidth: 90,
          }}>
            <div style={{ fontSize: 28, fontWeight: 900, color: 'rgb(39,163,20)' }}>{answeredCount}</div>
            <div style={{ fontSize: 12, color: 'rgb(39,163,20)', fontWeight: 700, marginTop: 2 }}>Answered</div>
          </div>
          <div style={{
            background: 'rgba(217,78,59,0.1)', border: '2px solid rgba(217,78,59,1)',
            borderRadius: 10, padding: '12px 22px', minWidth: 90,
          }}>
            <div style={{ fontSize: 28, fontWeight: 900, color: 'rgba(217,78,59,1)' }}>{notAnsweredCount}</div>
            <div style={{ fontSize: 12, color: 'rgba(217,78,59,1)', fontWeight: 700, marginTop: 2 }}>Not Answered</div>
          </div>
        </div>
        <div style={{ fontSize: 14, color: '#64748b' }}>Are you sure you want to submit this round?</div>
      </div>
    );

    showDialog(
      `Submit ${ROUNDS[roundIndexRef.current].name}?`,
      msgContent,
      () => handleSubmitRound(false),
      'confirm',
      true
    );
  }, [showDialog, handleSubmitRound]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    const screenSharingActive = sessionStorage.getItem('screenSharingActive');
    const stream = location.state?.screenStream;
 
    if (!screenSharingActive && stream === undefined) {
      setScreenShareBlocked(true);
      setTimeout(() => navigate('/student'), 3000);
      return;
    }
 
    setScreenStream(stream);
 
    if (stream) {
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.onended = () => {
          if (!submittingRef.current && !submitted) {
            showDialog(
              'Critical Proctoring Alert',
              'Screen sharing stopped! Your exam will be auto-submitted immediately.',
              () => handleSubmitRound(true),
              'warning', false
            );
          }
        };
      }
    }
 
    const verifyInterval = setInterval(() => {
      const isActive = sessionStorage.getItem('screenSharingActive');
      if (stream && screenSharingActive === 'true') {
        const vt = stream.getVideoTracks()[0];
        if (vt && vt.readyState === 'ended') {
          sessionStorage.removeItem('screenSharingActive');
          if (!submittingRef.current) {
            clearInterval(verifyInterval);
            handleViolation('Screen sharing stopped!');
          }
        }
      }
      if (!isActive && screenSharingActive === 'true' && !submittingRef.current) {
        clearInterval(verifyInterval);
        handleViolation('Screen sharing verification failed!');
      }
    }, 5000);
 
    return () => {
      clearInterval(verifyInterval);
      if (stream && submitted) stream.getTracks().forEach(t => t.stop());
    };
  }, [location.state, submitted, navigate, handleViolation, handleSubmitRound]);
 
  useEffect(() => {
    if (submitted) return;
 
    const onFSChange = () => {
      if (!document.fullscreenElement && !submittingRef.current) {
        handleViolation('You exited full screen. This is not allowed during the exam.', true);
      }
    };
 
    const onVisibility = () => {
      if (document.hidden && !submittingRef.current) {
        handleViolation('Switching tabs is not allowed during the exam!');
      }
    };
 
    const onBlur = () => {
      if (!submittingRef.current) {
        handleViolation('Do not leave the exam window!');
      }
    };
 
    const onKeyDown = (e) => {
      if (e.key === 'Escape') { e.preventDefault(); return false; }
 
      if (e.key === 'F12') {
        e.preventDefault();
        handleViolation('Developer tools are not allowed during the exam!');
        return false;
      }
 
      if (e.ctrlKey && e.shiftKey && ['i', 'I', 'j', 'J'].includes(e.key)) {
        e.preventDefault();
        handleViolation('Developer tools are not allowed during the exam!');
        return false;
      }
 
      if (e.key === 'PrintScreen') {
        e.preventDefault();
        handleViolation('Screenshots are not allowed during the exam!');
        return false;
      }
 
      if (e.ctrlKey || e.metaKey) {
        const blocked = {
          c: 'Copying is not allowed during the exam!',
          v: 'Pasting is not allowed during the exam!',
          a: 'Select All is not allowed during the exam!',
          s: 'Saving is not allowed during the exam!',
          p: 'Printing is not allowed during the exam!',
        };
        const key = e.key.toLowerCase();
        if (blocked[key]) {
          e.preventDefault();
          handleViolation(blocked[key]);
          return false;
        }
      }
    };
 
    const onCopy  = (e) => { e.preventDefault(); handleViolation('Copying is not allowed during the exam!'); };
    const onPaste = (e) => { e.preventDefault(); handleViolation('Pasting is not allowed during the exam!'); };
    const onCut   = (e) => { e.preventDefault(); handleViolation('Cutting is not allowed during the exam!'); };
 
    document.body.style.userSelect       = 'none';
    document.body.style.webkitUserSelect = 'none';
 
    document.addEventListener('fullscreenchange',        onFSChange);
    document.addEventListener('webkitfullscreenchange',  onFSChange);
    document.addEventListener('visibilitychange',        onVisibility);
    window.addEventListener('blur',                      onBlur);
    document.addEventListener('keydown',                 onKeyDown);
    document.addEventListener('copy',                    onCopy);
    document.addEventListener('paste',                   onPaste);
    document.addEventListener('cut',                     onCut);
 
    return () => {
      document.body.style.userSelect       = '';
      document.body.style.webkitUserSelect = '';
      document.removeEventListener('fullscreenchange',       onFSChange);
      document.removeEventListener('webkitfullscreenchange', onFSChange);
      document.removeEventListener('visibilitychange',       onVisibility);
      window.removeEventListener('blur',                     onBlur);
      document.removeEventListener('keydown',                onKeyDown);
      document.removeEventListener('copy',                   onCopy);
      document.removeEventListener('paste',                  onPaste);
      document.removeEventListener('cut',                    onCut);
    };
  }, [submitted, handleViolation]);
 
  // Detect page reload and show Session Paused overlay
  useEffect(() => {
    const navEntries = performance?.getEntriesByType?.('navigation') || [];
    const isReload = navEntries.length > 0 && navEntries[0].type === 'reload';
    const wasActive = sessionStorage.getItem('examInProgress') === examId;
    const hasSavedState = localStorage.getItem(`exam_${examId}_currentRound`) !== null;
    if (isReload && wasActive && hasSavedState) {
      setShowPausedOverlay(true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const fetchExam = async () => {
      try {
        const snap = await getDoc(doc(db, 'exams', examId));
        if (snap.exists()) {
          const data = { id: snap.id, ...snap.data() };
          setExam(data);
          examRef.current = data;

          // Restore saved round on reload, otherwise start from round 0
          const savedRoundStr = localStorage.getItem(`exam_${examId}_currentRound`);
          const parsedRound = savedRoundStr !== null ? parseInt(savedRoundStr, 10) : 0;
          // Clamp to a valid round index (guard against stale/corrupt localStorage)
          const startRound = (Number.isFinite(parsedRound) && parsedRound >= 0 && parsedRound < ROUNDS.length)
            ? parsedRound
            : 0;
          // Always persist currentRound so Round-0 refresh is also detected
          localStorage.setItem(`exam_${examId}_currentRound`, startRound.toString());
          setRoundIndex(startRound);
          roundIndexRef.current = startRound;
          loadRound(data, startRound);

          // Restore MCQ scores (needed for DSA final summary after refresh)
          try {
            const savedScores = localStorage.getItem(`exam_${examId}_r1r2scores`);
            if (savedScores) {
              const parsed = JSON.parse(savedScores);
              setScores(parsed);
              scoresRef.current = parsed;
            }
          } catch {}

          // Restore violations per round
          try {
            const savedViolations = localStorage.getItem(`exam_${examId}_violations`);
            if (savedViolations) {
              const parsed = JSON.parse(savedViolations);
              setRoundViolations(parsed);
              roundViolationsRef.current = parsed;
            }
          } catch {}

          // Mark exam session as active (survives page reload)
          sessionStorage.setItem('examInProgress', examId);
        }
      } catch (e) { console.error(e); }
      setLoading(false);
    };
    fetchExam();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [examId]);
 
  useEffect(() => {
    if (!examId || roundIndex === null || Object.keys(answers).length === 0) return;
    localStorage.setItem(`exam_${examId}_round_${roundIndex}_answers`, JSON.stringify(answers));
    const timer = setTimeout(async () => {
      try {
        await addDoc(collection(db, 'examSessions'), {
          userId: auth.currentUser?.uid, userEmail: auth.currentUser?.email,
          examId, roundIndex, answers, timestamp: new Date(),
        });
      } catch {}
    }, 2000);
    return () => clearTimeout(timer);
  }, [answers, examId, roundIndex]);
 
  useEffect(() => {
    if (timeLeft === null || submitted || transitioning) return;
    if (timeLeft <= 0) { handleSubmitRound(true); return; }
    timerRef.current = setTimeout(() => {
      const next = timeLeft - 1;
      setTimeLeft(next);
      // Persist timer so it survives page refresh
      localStorage.setItem(`exam_${examId}_round_${roundIndexRef.current}_timer`, next.toString());
    }, 1000);
    return () => clearTimeout(timerRef.current);
  }, [timeLeft, submitted, transitioning, handleSubmitRound, examId]);
 
  useEffect(() => () => { if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current); }, []);
 
  const formatTime = (secs) => {
    if (secs === null) return '--:--';
    const m = String(Math.floor(secs / 60)).padStart(2, '0');
    const s = String(secs % 60).padStart(2, '0');
    return `${m}:${s}`;
  };
 
  const currentViolations = roundViolations[roundIndex] || 0;
 
  // ─────────────────────────────────────────────
  // RENDER STATES
  // ─────────────────────────────────────────────
 
  // ── SESSION PAUSED OVERLAY (shown after page refresh during active exam) ──
  if (showPausedOverlay) return (
    <div className="fullscreen-center" style={{ background: 'rgba(0,0,0,0.96)', backdropFilter: 'blur(10px)' }}>
      <div className="status-card" style={{ textAlign: 'center', maxWidth: 420 }}>
        <div style={{ fontSize: 52, marginBottom: 12 }}>⏸️</div>
        <h2 style={{ color: '#1e293b', fontWeight: 800, marginBottom: 8, fontSize: 24 }}>Session Paused</h2>
        <p style={{ color: '#64748b', fontSize: 15, lineHeight: 1.6, marginBottom: 24 }}>
          Your exam was paused due to a page refresh.<br />
          All your answers and progress are saved.
        </p>
        <button
          className="nav-button primary"
          style={{ width: '100%', padding: 16, fontSize: 16, fontWeight: 700 }}
          onClick={() => {
            const el = document.documentElement;
            const rfs = el.requestFullscreen || el.webkitRequestFullscreen || el.mozRequestFullScreen || el.msRequestFullscreen;
            if (rfs) rfs.call(el).catch(() => {});
            setShowPausedOverlay(false);
          }}
        >
          🔲 Resume Exam (Fullscreen)
        </button>
      </div>
    </div>
  );

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
        <h2 style={{ color: '#ef4444' }}>Access Denied</h2>
        <p>Screen sharing is mandatory. Redirecting...</p>
      </div>
    </div>
  );
 
  if (showTransitionScreen) return (
    <div className="fullscreen-center">
      <div className="status-card" style={{ animation: 'slideDown 0.5s cubic-bezier(0.18,0.89,0.32,1.28)', maxWidth: 340, padding: '24px 20px' }}>
        <div style={{ fontSize: 42, marginBottom: 6, textAlign: 'center' }}>✅</div>
        <h2 style={{ color: '#10b981', fontSize: 20, fontWeight: 800, marginBottom: 6, textAlign: 'center' }}>
          Round {roundIndex + 1} Completed!
        </h2>
        <p style={{ fontSize: 13, color: '#64748b', fontWeight: 500, marginBottom: 12, textAlign: 'center' }}>
          Get ready for <strong>{ROUNDS[roundIndex + 1]?.name}</strong>
        </p>
        <div style={{
          background: 'linear-gradient(135deg,#667eea,#764ba2)',
          borderRadius: 12, padding: '12px 16px', marginBottom: 12,
          boxShadow: '0 4px 14px rgba(102,126,234,0.3)', textAlign: 'center',
        }}>
          <p style={{ fontSize: 12, color: '#e0e7ff', marginBottom: 4, fontWeight: 500 }}>Auto-starting in</p>
          <div style={{ fontSize: 32, fontWeight: 900, color: '#fff', fontFamily: 'monospace' }}>
            {transitionCountdown}s
          </div>
        </div>
        <div style={{
          background: '#f0fdf4', border: '1px solid #bbf7d0',
          borderRadius: 8, padding: '7px 12px', marginBottom: 14,
          fontSize: 11, color: '#15803d', fontWeight: 600, textAlign: 'center',
        }}>
          ✅ Violations reset for {ROUNDS[roundIndex + 1]?.name}
        </div>
        <button
          className="nav-button primary"
          onClick={proceedToNextRound}
          style={{ width: '100%', padding: '12px', fontSize: 14, fontWeight: 700, marginBottom: 10, background: 'linear-gradient(135deg,#10b981,#059669)', border: 'none', boxShadow: '0 4px 12px rgba(16,185,129,0.35)', borderRadius: 10 }}
        >
          Start Round {roundIndex + 2} Now →
        </button>
        <p style={{ fontSize: 11, color: '#f59e0b', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, margin: 0 }}>
          <span>⚠️</span> Do not leave this page or switch tabs
        </p>
      </div>
    </div>
  );
 
  if (transitioning) return (
    <div className="fullscreen-center">
      <div className="status-card">
        <div className="status-icon" style={{ fontSize: 80, marginBottom: 10 }}>🎯</div>
        <h2 style={{ color: '#10b981', fontSize: 30, fontWeight: 800 }}>Loading Next Round...</h2>
      </div>
    </div>
  );
 
  if (submitted) return (
    <div className="fullscreen-center">
      <div className="status-card" style={{ animation: 'slideDown 0.5s ease-out' }}>
        <div className="status-icon" style={{ fontSize: 80 }}>{autoSubmitMsg ? '⛔' : '🎉'}</div>
        <h2 style={{ color: autoSubmitMsg ? '#ef4444' : '#10b981', fontSize: 32, fontWeight: 800, marginBottom: 16 }}>
          {autoSubmitMsg ? 'Exam Auto-Submitted' : 'Exam Completed!'}
        </h2>
        <p style={{ margin: '16px 0', fontSize: 18, color: '#64748b', lineHeight: 1.6 }}>
          {autoSubmitMsg || completionMsg}
        </p>
        <button className="nav-button primary" style={{ width: '100%', padding: 18, marginTop: 10 }} onClick={() => navigate('/student')}>
          <Home size={22} style={{ marginRight: 8 }} /> Back to Dashboard
        </button>
      </div>
    </div>
  );
 
  const question = roundQuestions[currentQ];
  const round    = ROUNDS[roundIndex];

  if (!round) return (
    <div className="fullscreen-center">
      <div className="status-card">
        <div className="status-icon">⚠️</div>
        <h3>Something went wrong. Please return to the dashboard.</h3>
        <button className="nav-button primary" onClick={() => navigate('/student')}>Go to Dashboard</button>
      </div>
    </div>
  );

  // ── CODING ROUND (Round 3: DSA) ──
  if (round.type === 'coding') return (
    <div className="exam-page-container">
      <ViolationModal
        show={showViolationPopup}
        message={violationMsg}
        roundName={round.name}
        violations={currentViolations}
        maxViolations={MAX_VIOLATIONS_PER_ROUND}
        isFullscreenViolation={isFullscreenViolation}
        onContinue={handleDismissViolation}
      />
 
      {/* ── DSA NAVBAR ── */}
      <header className="exam-header" style={{ backgroundColor: round.color }}>
        <div className="header-left">
          <h3 className="round-title">{round.name}</h3>
          <div className="question-progress">Problem 1 of {roundQuestions.length}</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 15 }}>
          {/* Violations */}
          <div style={{ display:'flex', alignItems:'center', gap:3 }}>
            {Array.from({ length: MAX_VIOLATIONS_PER_ROUND }).map((_, i) => (
              <div key={i} className={`violation-dot ${i < currentViolations ? 'active' : ''}`} />
            ))}
            <span style={{ fontSize:11, marginLeft:4, fontWeight:600, color:'white' }}>
              VIOLATIONS {currentViolations}/{MAX_VIOLATIONS_PER_ROUND}
            </span>
          </div>
          {/* Clock */}
          <div style={{ fontSize:14, opacity:0.85, display:'flex', alignItems:'center', gap:4, color:'white' }}>
            <Clock size={16} />{currentTime}
          </div>
          {/* Timer */}
          <div className="exam-timer" style={{ color: timeLeft !== null && timeLeft < 60 ? '#ffb8b8' : 'white' }}>
            <Timer size={24} />{formatTime(timeLeft)}
          </div>
          {/* ── USER PROFILE ── */}
          <UserProfile showDropdown={true} />
        </div>
      </header>
 
      <DSARound
        exam={exam}
        questions={roundQuestions}
        onComplete={handleSubmitRound}
        userId={auth.currentUser?.uid}
        examId={examId}
        violations={currentViolations}
        showDialog={showDialog}
        currentTime={currentTime}
        timeLeft={timeLeft}
        previousScores={scores}
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
 
  // ── NO QUESTIONS ──
  if (!question) return (
    <div className="fullscreen-center">
      <div className="status-card" style={{ maxWidth: 450 }}>
        <div className="status-icon" style={{ fontSize: 70, marginBottom: 15 }}>📭</div>
        <h2 style={{ fontSize: 26, fontWeight: 800, color: '#1e293b', marginBottom: 15 }}>
          Round {roundIndex + 1} Content Pending
        </h2>
        <p style={{ color: '#64748b', fontSize: 16, lineHeight: 1.7, marginBottom: 30 }}>
          This section has no questions yet. You may proceed.
        </p>
        <button className="nav-button primary" style={{ width: '100%', padding: 15 }} onClick={() => handleSubmitRound(true)}>
          Skip Round &amp; Continue <ChevronRight size={18} />
        </button>
      </div>
    </div>
  );
 
  // ── MCQ ROUND (Round 1 & 2) ──
  return (
    <div className="exam-page-container">
      <ViolationModal
        show={showViolationPopup}
        message={violationMsg}
        roundName={round.name}
        violations={currentViolations}
        maxViolations={MAX_VIOLATIONS_PER_ROUND}
        isFullscreenViolation={isFullscreenViolation}
        onContinue={handleDismissViolation}
      />
 
      {/* ── MCQ HEADER ── */}
      <header className="exam-header" style={{ backgroundColor: round.color }}>
        <div className="header-left">
          <h3 className="round-title">{round.name}</h3>
          <div className="question-progress">Question {currentQ + 1} of {roundQuestions.length}</div>
        </div>
 
        <div style={{ display: 'flex', alignItems: 'center', gap: 15 }}>
          {/* Screen share indicator */}
          {(() => {
            const status    = sessionStorage.getItem('screenSharingActive');
            const hasStream = screenStream !== null;
            const base = { display:'flex', alignItems:'center', gap:5, fontSize:11, color:'rgba(255,255,255,0.95)', padding:'4px 8px', borderRadius:4, border:'1px solid rgba(255,255,255,0.3)' };
            if (hasStream || status === 'true')
              return <div style={{ ...base, backgroundColor:'rgba(46,204,113,0.3)' }}><span style={{fontSize:14}}>🔴</span><span>Screen Sharing Active</span></div>;
            if (status === 'testing')
              return <div style={{ ...base, backgroundColor:'rgba(243,156,18,0.3)' }}><span style={{fontSize:14}}>⚠️</span><span>Testing Mode</span></div>;
            return <div style={{ ...base, backgroundColor:'rgba(231,76,60,0.3)' }}><span style={{fontSize:14}}>❌</span><span>No Proctoring</span></div>;
          })()}
 
          {/* Per-round violation dots */}
          <div style={{ display:'flex', alignItems:'center', gap:3 }}>
            {Array.from({ length: MAX_VIOLATIONS_PER_ROUND }).map((_, i) => (
              <div
                key={i}
                className={`violation-dot ${i < currentViolations ? 'active' : ''}`}
              />
            ))}
            <span style={{ fontSize:11, marginLeft:4, fontWeight:600 }}>
              Violations ({currentViolations}/{MAX_VIOLATIONS_PER_ROUND})
            </span>
          </div>
 
          {/* Clock */}
          <div style={{ fontSize:14, opacity:0.8, display:'flex', alignItems:'center', gap:4 }}>
            <Clock size={16} />{currentTime}
          </div>
 
          {/* Timer */}
          <div className="exam-timer" style={{ color: timeLeft !== null && timeLeft < 60 ? '#ffb8b8' : 'white' }}>
            <Timer size={24} />{formatTime(timeLeft)}
          </div>
 
          {/* ── USER PROFILE ── */}
          <UserProfile showDropdown={true} />
        </div>
      </header>
 
      {/* ── BODY ── */}
      <main className="exam-body">
        <aside className="exam-sidebar">
          <div className="sidebar-title">Question Palette</div>
          <div className="palette-grid">
            {roundQuestions.map((_, i) => (
              <button
                key={i}
                className={`palette-number ${answers[i] !== undefined ? 'answered' : ''} ${i === currentQ ? 'active' : ''}`}
                style={{
                  backgroundColor: answers[i] !== undefined ? 'rgb(39,163,20)' : 'rgba(217,78,59,0.1)',
                  color:           answers[i] !== undefined ? 'white'          : 'rgba(217,78,59,1)',
                  borderColor:     i === currentQ ? '#1e293b' : 'transparent',
                }}
                onClick={() => setCurrentQ(i)}
              >{i + 1}</button>
            ))}
          </div>
          <div className="sidebar-footer">
            <div className="status-legend">
              <div className="legend-item">
                <div className="legend-dot" style={{ backgroundColor:'rgb(39,163,20)' }} />
                <span>Answered</span>
              </div>
              <div className="legend-item">
                <div className="legend-dot" style={{ backgroundColor:'rgba(217,78,59,1)' }} />
                <span>Not Answered</span>
              </div>
            </div>
          </div>
        </aside>
 
        <section className="exam-content">
          <div className="question-card" style={{ position: 'relative' }}>
            {question.difficulty && (
              <span style={{
                position: 'absolute', top: 14, right: 14,
                padding: '3px 11px', borderRadius: 20, fontSize: 11, fontWeight: 700, letterSpacing: '0.3px',
                ...(question.difficulty === 'Easy'
                  ? { background: '#d4edda', color: '#155724' }
                  : question.difficulty === 'Medium'
                  ? { background: '#fff3cd', color: '#856404' }
                  : { background: '#f8d7da', color: '#721c24' })
              }}>{question.difficulty}</span>
            )}
            <h3 className="question-text">Q{currentQ + 1}. {question.text}</h3>
            <div className="options-container">
              {question.options.map((opt, i) => (
                <button
                  key={i}
                  className={`option-btn ${answers[currentQ] === opt ? 'selected' : ''}`}
                  onClick={() => setAnswers({ ...answers, [currentQ]: opt })}
                >
                  <div className="option-label">{String.fromCharCode(65 + i)}</div>
                  {opt}
                </button>
              ))}
            </div>
          </div>
 
          <div className="exam-navigation">
            <button className="nav-button secondary" onClick={() => setCurrentQ(q => Math.max(0, q - 1))} disabled={currentQ === 0}>
              <ChevronLeft size={18} /> Previous
            </button>
            <button className="nav-button danger" onClick={() => { const a = { ...answers }; delete a[currentQ]; setAnswers(a); }}>
              <Eraser size={18} /> Clear Answer
            </button>
            {currentQ < roundQuestions.length - 1 ? (
              <button className="nav-button primary" onClick={() => setCurrentQ(q => q + 1)}>
                Next <ChevronRight size={18} />
              </button>
            ) : (
              <button className="nav-button success" onClick={handleMCQSubmitClick}>
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