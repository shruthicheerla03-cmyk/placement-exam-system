import React, { useState, useEffect } from 'react';
import { auth, db } from '../firebase/config';
import { signOut } from 'firebase/auth';
import { collection, addDoc, getDocs, deleteDoc, doc, updateDoc, onSnapshot, query, where } from 'firebase/firestore';
import { useNavigate, useSearchParams } from 'react-router-dom';
import RealTimeMonitor from '../components/RealTimeMonitor';
import AnalyticsDashboard from '../components/AnalyticsDashboard';
import ResultsManagement from '../components/ResultsManagement';
import AdminSidebar from '../components/AdminSidebar';
import TestCaseManager from '../components/TestCaseManager';
import { resetAndSeedQuestions } from '../utils/questionSeeder';
import { seedDSAQuestions } from '../utils/dsaSeeder';
import { autoCompleteExpiredExams } from '../utils/examCompletion';
import Dialog from '../components/Dialog';

function AdminDashboard() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // 🔐 Admin Authentication Check
  useEffect(() => {
    const isAdmin = localStorage.getItem('adminAuth');
    if (!isAdmin || isAdmin !== 'true') {
      navigate('/admin');
    }
  }, [navigate]);

  const handleLogout = async () => {
    localStorage.removeItem('adminAuth');
    localStorage.removeItem('adminEmail');
    await signOut(auth);
    navigate('/admin');
  };

  // Tab Syncing
  const qTab = searchParams.get('tab');
  const initialTab = qTab && ['dashboard', 'exams', 'questions', 'monitoring', 'analytics', 'results'].includes(qTab) ? qTab : 'dashboard';
  const [tab, setTab] = useState(initialTab);
  const [activeExamId, setActiveExamId] = useState(null);
  const [activeExam, setActiveExam] = useState(null);

  useEffect(() => {
    const newTab = qTab || 'dashboard';
    if (newTab !== tab) {
      setTab(newTab);
    }
  }, [qTab, tab]);

  // CSS for premium hover effects and global layout
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      input:hover, textarea:hover, select:hover {
        border-color: #0062ff !important;
        box-shadow: 0 0 10px rgba(0, 98, 255, 0.1);
        outline: none;
      }
      .admin-card, .admin-action-card, .admin-static-card, .admin-summary-card {
        transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1) !important;
      }
      .admin-card:hover, .admin-action-card:hover {
        transform: translateY(-5px) scale(1.02);
        box-shadow: 0 20px 40px rgba(0, 98, 255, 0.12), 0 10px 20px rgba(0,0,0,0.05) !important;
        border-color: #0062ff !important;
        background: linear-gradient(145deg, #ffffff, #fdfdff) !important;
      }
      .admin-action-card:hover {
        border-top: 4px solid #0062ff !important;
        padding-top: 26px !important; /* Offset for border-top to keep content stable */
      }
      .admin-static-card, .admin-summary-card {
        cursor: default !important;
      }
      .admin-static-card:hover, .admin-summary-card:hover {
        transform: none !important;
        box-shadow: 0 4px 15px rgba(0,0,0,0.03) !important;
        border-color: #f1f5f9 !important;
      }
      .admin-summary-card:hover {
        transform: none !important;
        background-color: white !important;
      }
      .admin-action-card:hover .admin-icon-box {
        transform: rotate(-10deg) scale(1.2);
      }
      .admin-summary-card:hover {
        background-color: #ffffff !important;
        border-left: 5px solid #0062ff !important;
      }
      .admin-logout-btn {
        background-color: rgba(255,255,255,0.15) !important;
        color: white !important;
        border: 1px solid rgba(255,255,255,0.2) !important;
      @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
      @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
      
      .admin-card { cursor: pointer; transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1); border: 2px solid transparent; }
      .admin-card:hover { transform: translateY(-5px); box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1); border-color: #0062ff; }
      
      .bar-hover:hover { background-color: #0062ff !important; filter: drop-shadow(0 0 8px rgba(0, 98, 255, 0.4)); }
      .bar-hover .bar-tooltip { 
        position: absolute; top: -30px; left: 50%; transform: translateX(-50%);
        background: #1e293b; color: white; padding: 4px 8px; border-radius: 4px;
        font-size: 10px; opacity: 0; transition: all 0.2s; pointer-events: none;
      }
      .bar-hover:hover .bar-tooltip { opacity: 1; top: -35px; }
      
      .admin-action-card { cursor: pointer; transition: all 0.3s ease; }
      .admin-action-card:hover { transform: scale(1.02); }
    `;
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, []);

  const [exams, setExams] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [submissionsCount, setSubmissionsCount] = useState(0);
  const [selectedCount, setSelectedCount] = useState(0);
  const [rejectedCount, setRejectedCount] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  const [trendData, setTrendData] = useState([]);
  const [trendLabels, setTrendLabels] = useState(['6d', '5d', '4d', '3d', '2d', '1d', 'Now']);
  const [trendTitle, setTrendTitle] = useState('Submission Trend (Last 7 Days)');
  const [firestoreError, setFirestoreError] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
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

  // Question modal state (unified add/edit)
  const [isQuestionModalOpen, setIsQuestionModalOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState(null);

  // Test Case Manager state
  const [isTestCaseModalOpen, setIsTestCaseModalOpen] = useState(false);
  const [editingTestCaseQuestion, setEditingTestCaseQuestion] = useState(null);

  // Collapsible sections state
  const [expandedSections, setExpandedSections] = useState({
    round1_easy: false,
    round1_medium: false,
    round1_hard: false,
    round2_easy: false,
    round2_medium: false,
    round2_hard: false,
    round3_easy: false,
    round3_medium: false,
    round3_hard: false,
  });

  // Exam form
  const [examTitle, setExamTitle] = useState('');
  const [examCode, setExamCode] = useState('');
  const [startTime, setStartTime] = useState('');

  // Round durations
  const [aptDuration, setAptDuration] = useState('30');
  const [coreDuration, setCoreDuration] = useState('30');
  const [dsaDuration, setDsaDuration] = useState('30');

  // Round-wise question counts
  const [aptEasy, setAptEasy] = useState('');
  const [aptMedium, setAptMedium] = useState('');
  const [aptHard, setAptHard] = useState('');
  const [coreEasy, setCoreEasy] = useState('');
  const [coreMedium, setCoreMedium] = useState('');
  const [coreHard, setCoreHard] = useState('');
  const [dsaEasy, setDsaEasy] = useState('');
  const [dsaMedium, setDsaMedium] = useState('');
  const [dsaHard, setDsaHard] = useState('');

  const [examMsg, setExamMsg] = useState('');

  // Question form
  const [qText, setQText] = useState('');
  const [qOptions, setQOptions] = useState(['', '', '', '']);
  const [qCorrect, setQCorrect] = useState('');
  const [qDifficulty, setQDifficulty] = useState('easy');
  const [qRound, setQRound] = useState('round1');
  const [qSubject, setQSubject] = useState('aptitude');
  const [qTestCases, setQTestCases] = useState([]);
  const [qPoints, setQPoints] = useState(100);
  const [qMsg, setQMsg] = useState('');
  const [isSeedingquestions, setIsSeeding] = useState(false);
  const [isSeedingDSA, setIsSeedingDSA] = useState(false);

  // REAL-TIME DATA LISTENERS (Live Monitor Style)
  useEffect(() => {
    // 1. Listen for Exams
    const unsubscribeExams = onSnapshot(collection(db, 'exams'), 
      (snapshot) => {
        const examsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setExams(examsData);
        
        // Find Active Exam (Champ)
        const active = examsData.find(e => e.status !== 'completed');
        if (active) {
          setActiveExamId(active.id);
          setActiveExam(active);
        } else {
          setActiveExamId(null);
          setActiveExam(null);
        }
      },
      (err) => {
        console.error("Exams listener error:", err);
        if (err.code === 'permission-denied') setFirestoreError(true);
      }
    );

    // 2. Fetch Questions once (no real-time needed)
    getDocs(collection(db, 'questions'))
      .then(snapshot => {
        setQuestions(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
      })
      .catch(err => {
        console.error('Questions fetch error:', err);
        if (err.code === 'permission-denied') setFirestoreError(true);
      });

    // 3. Fetch Submissions once (RealTimeMonitor has its own live listener)
    getDocs(collection(db, 'submissions'))
      .then(snapshot => {
        setSubmissions(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
      })
      .catch(err => {
        console.error('Submissions fetch error:', err);
        if (err.code === 'permission-denied') setFirestoreError(true);
      });

    // Initial check for expired exams
    autoCompleteExpiredExams();

    return () => {
      unsubscribeExams();
    };
  }, []);

  // ── REACTIVE DASHBOARD ANALYTICS ──
  useEffect(() => {
    if (submissions.length === 0) return;

    // Use activeExam (Champ) from state if available
    const champ = activeExam;

    if (champ) {
      // 🏆 CHAMPION MODE: Show stats for the Current Active Exam
      const champSubs = submissions.filter(s => s.examId === champ.id);
      setSubmissionsCount(champSubs.length);
      
      let selected = 0, rejected = 0, pending = 0;
      champSubs.forEach(s => {
        if (s.status === 'selected') selected++;
        else if (s.status === 'rejected') rejected++;
        else pending++;
      });
      setSelectedCount(selected);
      setRejectedCount(rejected);
      setPendingCount(pending);

      const roundPerf = { "Aptitude": { sum: 0, count: 0 }, "Core Subjects": { sum: 0, count: 0 }, "DSA": { sum: 0, count: 0 } };
      
      champSubs.forEach(s => {
        if (s.scores) {
          s.scores.forEach(r => {
            if (roundPerf[r.round]) {
              const p = (r.score / (r.total || 1)) * 100;
              roundPerf[r.round].sum += p;
              roundPerf[r.round].count++;
            }
          });
        }
      });

      const data = Object.keys(roundPerf).map(k => 
        roundPerf[k].count > 0 ? Math.round(roundPerf[k].sum / roundPerf[k].count) : 0
      );
      setTrendData(data);
      setTrendLabels(Object.keys(roundPerf).map(k => k === "Core Subjects" ? "Core" : k));
      setTrendTitle(`Performance: ${champ.title}`);
    } else {
      // 📉 FALLBACK: Compute 7-Day Performance Trend (Average Score %)
      setSubmissionsCount(submissions.length);
      
      let selected = 0, rejected = 0, pending = 0;
      submissions.forEach(s => {
        if (s.status === 'selected') selected++;
        else if (s.status === 'rejected') rejected++;
        else pending++;
      });
      setSelectedCount(selected);
      setRejectedCount(rejected);
      setPendingCount(pending);

      const now = new Date();
      const dailyPerformance = [0, 0, 0, 0, 0, 0, 0];
      const dailySubmits = [0, 0, 0, 0, 0, 0, 0];
      
      submissions.forEach(s => {
        const sDate = s.createdAt?.toDate ? s.createdAt.toDate() : (s.submittedAt?.toDate ? s.submittedAt.toDate() : new Date(s.createdAt || s.submittedAt));
        const diffDays = Math.floor((now - sDate) / (1000 * 60 * 60 * 24));
        if (diffDays >= 0 && diffDays < 7) {
          const index = 6 - diffDays;
          const score = s.totalScore || 0;
          const total = s.totalQuestions || 1;
          const percent = (score / total) * 100;
          dailyPerformance[index] += percent;
          dailySubmits[index]++;
        }
      });

      const finalTrend = dailyPerformance.map((sum, i) => 
        dailySubmits[i] > 0 ? Math.round(sum / dailySubmits[i]) : 0
      );
      setTrendData(finalTrend);
      setTrendLabels(['6d', '5d', '4d', '3d', '2d', '1d', 'Now']);
      setTrendTitle('Performance Trend (Avg Score %)');
    }
  }, [submissions, activeExam, activeExamId]);

  const fetchQuestions = async () => {
    try {
      const qSnap = await getDocs(collection(db, 'questions'));
      setQuestions(qSnap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) {
      if (err.code === 'permission-denied') setFirestoreError(true);
    }
  };

  const fetchExams = async () => {
    try {
      await autoCompleteExpiredExams();
      const eSnap = await getDocs(collection(db, 'exams'));
      setExams(eSnap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) {
      if (err.code === 'permission-denied') setFirestoreError(true);
    }
  };

  // ── SEED QUESTIONS HANDLER ──
  const handleSeedQuestions = async () => {
    showDialog(
      '⚠️ Confirm Global Seed',
      'This will DELETE all existing questions and seed with 99 fresh placement exam questions. This action is irreversible. Continue?',
      async () => {
        setIsSeeding(true);
        setQMsg('⏳ Seeding questions... Please wait...');

        try {
          const result = await resetAndSeedQuestions();
          setQMsg(`✅ Successfully seeded ${result.count} questions!`);
          await fetchQuestions(); 
          setTimeout(() => setQMsg(''), 5000);
        } catch (error) {
          console.error('Seed error:', error);
          setQMsg('❌ Failed to seed questions: ' + error.message);
          setTimeout(() => setQMsg(''), 5000);
        } finally {
          setIsSeeding(false);
        }
      },
      'warning'
    );
  };

  // ── SEED DSA QUESTIONS HANDLER ──
  const handleSeedDSA = async () => {
    showDialog(
      '🧪 Confirm DSA Seed',
      'This will CLEAR existing DSA questions and seed 5 new comprehensive coding problems with test cases. Continue?',
      async () => {
        setIsSeedingDSA(true);
        setQMsg('⏳ Clearing old DSA questions and seeding new ones... Please wait...');
        
        try {
          const result = await seedDSAQuestions(db, true);
          if (result.success) {
            setQMsg(`✅ ${result.message}`);
            await fetchQuestions();
          } else {
            setQMsg(`❌ ${result.message}`);
          }
          setTimeout(() => setQMsg(''), 5000);
        } catch (error) {
          console.error('DSA seed error:', error);
          setQMsg('❌ Failed to seed DSA questions: ' + error.message);
          setTimeout(() => setQMsg(''), 5000);
        } finally {
          setIsSeedingDSA(false);
        }
      },
      'confirm'
    );
  };

  // ── HELPER FUNCTIONS ── 
  // Map old category to new round
  const mapCategoryToRound = (category) => {
    if (category === 'Aptitude') return 'round1';
    if (category === 'Core Subjects') return 'round2';
    if (category === 'DSA') return 'round3';
    return 'round1';
  };

  // Capitalize first letter
  const capitalizeFirst = (str) => str.charAt(0).toUpperCase() + str.slice(1);

  useEffect(() => {
    if (qRound === 'round1') setQSubject('aptitude');
    else if (qRound === 'round2') setQSubject('os');
    else if (qRound === 'round3') setQSubject('dsa');
  }, [qRound]);
  
  // ── PICK QUESTIONS ROUND-WISE ──
  const pickQuestions = (category, easy, medium, hard) => {
    const pool = questions.filter(q => q.category === category);
    const easyQs = pool.filter(q => q.difficulty?.toLowerCase() === 'easy');
    const mediumQs = pool.filter(q => q.difficulty?.toLowerCase() === 'medium');
    const hardQs = pool.filter(q => q.difficulty?.toLowerCase() === 'hard');
    const sh = arr => [...arr].sort(() => Math.random() - 0.5);
    return [
      ...sh(easyQs).slice(0, easy),
      ...sh(mediumQs).slice(0, medium),
      ...sh(hardQs).slice(0, hard),
    ];
  };

  const handleCreateExam = async (e) => {
    e.preventDefault();
    setExamMsg('');

    const aE = parseInt(aptEasy) || 0, aM = parseInt(aptMedium) || 0, aH = parseInt(aptHard) || 0;
    const cE = parseInt(coreEasy) || 0, cM = parseInt(coreMedium) || 0, cH = parseInt(coreHard) || 0;
    const dE = parseInt(dsaEasy) || 0, dM = parseInt(dsaMedium) || 0, dH = parseInt(dsaHard) || 0;

    // Validate availability
    const aptPool = questions.filter(q => q.category === 'Aptitude');
    const corePool = questions.filter(q => q.category === 'Core Subjects');
    const dsaPool = questions.filter(q => q.category === 'DSA');

    const check = (pool, label, e, m, h) => {
      const avE = pool.filter(q => q.difficulty?.toLowerCase() === 'easy').length;
      const avM = pool.filter(q => q.difficulty?.toLowerCase() === 'medium').length;
      const avH = pool.filter(q => q.difficulty?.toLowerCase() === 'hard').length;
      if (avE < e) return `❌ ${label}: need ${e} Easy, only ${avE} available.`;
      if (avM < m) return `❌ ${label}: need ${m} Medium, only ${avM} available.`;
      if (avH < h) return `❌ ${label}: need ${h} Hard, only ${avH} available.`;
      return null;
    };

    const aptErr = check(aptPool, 'Aptitude', aE, aM, aH);
    if (aptErr) { setExamMsg(aptErr); return; }
    const coreErr = check(corePool, 'Core Subjects', cE, cM, cH);
    if (coreErr) { setExamMsg(coreErr); return; }
    const dsaErr = check(dsaPool, 'DSA', dE, dM, dH);
    if (dsaErr) { setExamMsg(dsaErr); return; }

    if (!startTime) { setExamMsg('❌ Please set an exam start time.'); return; }

    const aptQs = pickQuestions('Aptitude', aE, aM, aH);
    const coreQs = pickQuestions('Core Subjects', cE, cM, cH);
    const dsaQs = pickQuestions('DSA', dE, dM, dH);
    const allQs = [...aptQs, ...coreQs, ...dsaQs];

    // ✅ Create question snapshot with full details (immutable)
    const questionSet = allQs.map(q => {
      // DSA questions have different structure
      if (q.category === 'DSA') {
        return {
          questionId: q.id,
          title: q.title || q.text || "Untitled Question",
          description: q.description || "",
          difficulty: q.difficulty || "medium",
          category: q.category || "DSA",
          round: q.round || 'round3',
          points: q.points || 100,
          testCases: q.testCases || [],
          starterCode: q.starterCode || {},
          defaultLanguage: q.defaultLanguage || 'python',
          examples: q.examples || [],
          constraints: q.constraints || [],
          hints: q.hints || [],
          type: 'coding'
        };
      } else {
        // MCQ questions
        return {
          questionId: q.id,
          text: q.text || "",
          options: q.options || [],
          correct: q.correct || "",
          difficulty: q.difficulty || "easy",
          subject: q.subject || "general",
          round: q.round || "round1",
          category: q.category || "Aptitude",
          type: 'mcq'
        };
      }
    });

    try {
      await addDoc(collection(db, 'exams'), {
        title: examTitle,
        examCode: examCode.toUpperCase(),
        startTime: new Date(startTime),
        status: 'active',
        roundDurations: {
          aptitude: parseInt(aptDuration) || 30,
          core: parseInt(coreDuration) || 30,
          dsa: parseInt(dsaDuration) || 30,
        },
        questionConfig: {
          aptitude: { easy: aE, medium: aM, hard: aH },
          core: { easy: cE, medium: cM, hard: cH },
          dsa: { easy: dE, medium: dM, hard: dH },
        },
        totalQuestions: allQs.length,
        totalPoints: questionSet.reduce((sum, q) => sum + (q.points || (q.category === 'DSA' ? 100 : 1)), 0),
        questions: allQs, // Keep for backward compatibility
        questionSet: questionSet, // ✅ Immutable question snapshot
        
        // ✅ Round 3 metadata
        rounds: {
          round1: {
            name: 'Aptitude',
            duration: parseInt(aptDuration) || 30,
            questionCount: aptQs.length
          },
          round2: {
            name: 'Core Subjects',
            duration: parseInt(coreDuration) || 30,
            questionCount: coreQs.length
          },
          round3: {
            name: 'DSA (Coding)',
            type: 'coding',
            duration: parseInt(dsaDuration) || 30,
            questionCount: dsaQs.length,
            enabled: dsaQs.length > 0
          }
        },
        
        createdAt: new Date(),
      });
      
      const summary = [
        aptQs.length > 0 ? `${aptQs.length} Aptitude` : '',
        coreQs.length > 0 ? `${coreQs.length} Core` : '',
        dsaQs.length > 0 ? `${dsaQs.length} DSA` : ''
      ].filter(Boolean).join(' + ');
      
      setExamMsg(`✅ Exam created! ${summary} questions auto-selected.`);
      
      // Reset form
      setExamTitle(''); setExamCode(''); setStartTime('');
      setAptDuration('30'); setCoreDuration('30'); setDsaDuration('30');
      setAptEasy(''); setAptMedium(''); setAptHard('');
      setCoreEasy(''); setCoreMedium(''); setCoreHard('');
      setDsaEasy(''); setDsaMedium(''); setDsaHard('');
      fetchExams();
    } catch (err) {
      setExamMsg('❌ Error creating exam: ' + err.message);
      if (err.code === 'permission-denied') setFirestoreError(true);
    }
  };

  // Open modal for adding new question
  const openAddQuestionModal = () => {
    setEditingQuestion(null);
    setQText('');
    setQOptions(['', '', '', '']);
    setQCorrect('');
    setQDifficulty('easy');
    setQRound('round1');
    setQSubject('aptitude');
    setQTestCases([]);
    setQPoints(100);
    setIsQuestionModalOpen(true);
  };

  // Open modal for editing existing question
  const openEditQuestionModal = (q) => {
    setEditingQuestion(q);
    setQText(q.text || '');
    setQOptions(q.options || ['', '', '', '']);
    setQCorrect(q.correct || '');
    setQDifficulty(q.difficulty?.toLowerCase() || 'easy');
    setQRound(q.round || mapCategoryToRound(q.category));
    setQSubject(q.subject || (q.category === 'Aptitude' ? 'aptitude' : q.category === 'DSA' ? 'dsa' : 'os'));
    setQTestCases(Array.isArray(q.testCases) ? q.testCases : []);
    setQPoints(q.points || 100);
    setIsQuestionModalOpen(true);
  };

  // Save question (add or update)
  const handleSaveQuestion = async (e) => {
    e.preventDefault();
    if (qRound !== 'round3') {
      if (!qCorrect) { setQMsg('❌ Please select the correct answer!'); return; }
      if (qOptions.some(o => !o.trim())) { setQMsg('❌ Please fill all 4 options.'); return; }
    }

    try {
      const questionData = {
        text: qRound === 'round3' ? (qText.includes('\n') ? qText.substring(qText.indexOf('\n') + 1) : qText) : qText,
        title: qRound === 'round3' ? (qText.split('\n')[0].startsWith('TITLE:') ? qText.split('\n')[0].replace('TITLE:', '') : 'Coding Challenge') : null,
        options: qRound === 'round3' ? null : qOptions,
        correct: qRound === 'round3' ? 'coding_challenge' : qCorrect,
        difficulty: qDifficulty,
        round: qRound,
        subject: qSubject,
        type: qRound === 'round3' ? 'coding' : 'mcq',
        testCases: qRound === 'round3' ? qTestCases : null,
        points: qRound === 'round3' ? (parseInt(qPoints) || 0) : 1, // MCQs default to 1pt
        // Keep old category field for backward compatibility
        category: qRound === 'round1' ? 'Aptitude' : qRound === 'round2' ? 'Core Subjects' : 'DSA',
        createdAt: editingQuestion ? (editingQuestion.createdAt || new Date()) : new Date(),
      };

      if (editingQuestion) {
        // Update existing question
        await updateDoc(doc(db, 'questions', editingQuestion.id), questionData);
        setQMsg('✅ Question updated!');
      } else {
        // Add new question
        await addDoc(collection(db, 'questions'), questionData);
        setQMsg(`✅ ${qDifficulty} ${qSubject} question added!`);
      }

      setIsQuestionModalOpen(false);
      fetchQuestions();
      setTimeout(() => setQMsg(''), 3000);
    } catch (err) {
      setQMsg('❌ Error saving question.');
      if (err.code === 'permission-denied') setFirestoreError(true);
    }
  };

  const handleDeleteExam = async (id) => {
    showDialog(
      '☢️ Confirm Permanent Deletion',
      'Are you sure you want to delete this exam? This will PERMANENTLY remove the exam and ALL student submissions associated with it. This action cannot be undone.',
      async () => {
        try {
          // 1. Fetch and delete all submissions for this exam
          const subsQuery = query(collection(db, 'submissions'), where('examId', '==', id));
          const subsSnap = await getDocs(subsQuery);
          const subDeletes = subsSnap.docs.map(d => deleteDoc(d.ref));

          // 2. Fetch and delete all DSA submissions for this exam
          const dsaQuery = query(collection(db, 'dsaSubmissions'), where('examId', '==', id));
          const dsaSnap = await getDocs(dsaQuery);
          const dsaDeletes = dsaSnap.docs.map(d => deleteDoc(d.ref));

          // Run all deletions
          await Promise.all([...subDeletes, ...dsaDeletes]);

          // 3. Delete the exam itself
          await deleteDoc(doc(db, 'exams', id));
          fetchExams();
          showDialog('Deleted', '✅ Exam and all associated results have been removed.', () => {}, 'success', false);
        } catch (err) {
          if (err.code === 'permission-denied') setFirestoreError(true);
          showDialog('Error', 'Error deleting exam: ' + err.message, () => {}, 'warning', false);
        }
      },
      'warning'
    );
  };

  const handleDeleteQuestion = async (id) => {
    showDialog(
      'Confirm Deletion',
      'Are you sure you want to delete this question from the bank?',
      async () => {
        try {
          await deleteDoc(doc(db, 'questions', id));
          fetchQuestions();
        } catch (err) {
          if (err.code === 'permission-denied') setFirestoreError(true);
          showDialog('Error', 'Error deleting question: ' + err.message, () => {}, 'warning', false);
        }
      },
      'confirm'
    );
  };

  const toggleSection = (key) => {
    setExpandedSections(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // Get questions by round, difficulty, and optionally subject
  const getQuestions = (round, difficulty, subject = null) => {
    return questions.filter(q => {
      const matchRound = q.round === round || (!q.round && mapCategoryToRound(q.category) === round);
      const matchDiff = q.difficulty?.toLowerCase() === difficulty || q.difficulty === capitalizeFirst(difficulty);
      const matchSubject = subject ? (q.subject === subject || (!q.subject && q.category?.toLowerCase().includes(subject))) : true;
      return matchRound && matchDiff && matchSubject;
    });
  };

  const diffColor = { Easy: '#27ae60', Medium: '#f39c12', Hard: '#e74c3c', easy: '#27ae60', medium: '#f39c12', hard: '#e74c3c' };

  // Question bank stats per category (for system compatibility)
  const stats = (cat, diff) => questions.filter(q => q.category === cat && q.difficulty?.toLowerCase() === diff.toLowerCase()).length;

  return (
    <div style={styles.container}>
      {/* 🚀 Fully Fixed Full-Width Top Navbar */}
      <div style={styles.topNavbar}>
        <div style={styles.navLeft}>
          <div style={{...styles.branding, color: 'white'}} onClick={() => setTab('dashboard')}>
            <span style={{fontSize: '24px'}}>🛠</span>
            <div style={{display: 'flex', flexDirection: 'column', lineHeight: '1'}}>
              <span style={{fontWeight: '900', fontSize: '18px', tracking: '1px'}}>ADMIN</span>
              <span style={{fontSize: '10px', fontWeight: 'bold', opacity: 0.8, letterSpacing: '2px'}}>SYSTEM</span>
            </div>
          </div>
          <div style={{...styles.divider, backgroundColor: 'rgba(255,255,255,0.2)'}} />
        </div>

        <div style={{...styles.navRight, color: 'white'}}>
          <div style={{textAlign: 'right', display: 'flex', flexDirection: 'column', justifyContent: 'center'}}>
            <div style={{fontWeight: '900', fontSize: '15px', color: 'white'}}>admin</div>
            <div style={{fontSize: '10px', fontWeight: 'bold', opacity: 0.8, color: 'white'}}>SUPER ADMINISTRATOR</div>
          </div>
          <div style={styles.userAvatar}>
            {(localStorage.getItem('adminEmail') || 'A')[0].toUpperCase()}
          </div>
          <button className="admin-logout-btn" onClick={handleLogout} style={styles.navLogoutBtn}>
            Logout 🚪
          </button>
        </div>
      </div>

      <div style={styles.contentArea}>
        <AdminSidebar activeTab={tab} />

        <div className="admin-main-content" style={styles.mainContent}>
          <div style={styles.cardWrapper}>
            {/* 🔥 FIRESTORE ERROR WARNING */}
            {firestoreError && (
              <div style={styles.errorBanner}>
                <h3 style={{ margin: '0 0 10px 0', color: '#e74c3c' }}>
                  🔒 Firebase Permission Error
                </h3>
                <p style={{ margin: '5px 0', fontSize: '14px' }}>
                  <strong>Firestore security rules are blocking database access.</strong>
                </p>
                <pre style={styles.codeBlock}>
                  {`rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}`}
                </pre>
              </div>
            )}

            {/* ── MONITORING TAB ── */}
            {tab === 'monitoring' && <RealTimeMonitor activeExamId={activeExamId} />}

            {/* ── ANALYTICS TAB ── */}
            {tab === 'analytics' && <AnalyticsDashboard activeExamId={activeExamId} activeExam={activeExam} />}

            {/* ── RESULTS TAB ── */}
            {tab === 'results' && <ResultsManagement setTab={setTab} />}

            {/* ── DASHBOARD HOME TAB ── */}
            {tab === 'dashboard' && (
              <div style={styles.dashboardWelcome}>
                <div style={styles.welcomeHeader}>
                  <h1 style={{ fontSize: '32px', color: '#1e293b', marginBottom: '10px' }}>
                    Admin Insight Dashboard 👋
                  </h1>
                  <p style={{ fontSize: '16px', color: '#64748b', maxWidth: '700px', lineHeight: '1.6' }}>
                    Hello <strong>{localStorage.getItem('adminEmail')?.split('@')[0] || 'Admin'}</strong>, welcome to your command center.
                    Monitor performance, schedule evaluations, and drive excellence across your organization.
                  </p>
                </div>

                {/* Dashboard Summary Grid (Image 2 style) */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: '30px' }}>
                  <div className="admin-card" style={{ ...styles.card, padding: '20px' }}>
                    <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '15px' }}>Active Exams</div>
                    <div style={{ fontSize: '32px', fontWeight: '900', color: '#1e293b', marginBottom: '5px' }}>{exams.filter(e => e.status !== 'completed').length}</div>
                    <div style={{ fontSize: '12px', color: '#22c55e', fontWeight: 'bold' }}>+1 Scheduled Today</div>
                  </div>
                  <div className="admin-card" style={{ ...styles.card, padding: '20px' }}>
                    <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '15px' }}>{activeExam ? 'Questions In Assessment' : 'Total Question Bank'}</div>
                    <div style={{ fontSize: '32px', fontWeight: '900', color: '#1e293b', marginBottom: '5px' }}>{activeExam ? (activeExam.totalQuestions || activeExam.questionSet?.length || 0) : questions.length}</div>
                    <div style={{ fontSize: '12px', color: '#8b5cf6', fontWeight: 'bold' }}>{activeExam ? `${activeExam.title} Content` : 'Across 3 Categories'}</div>
                  </div>
                  <div className="admin-card" style={{ ...styles.card, padding: '20px' }}>
                    <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '15px' }}>{activeExam ? 'Current Candidates' : 'Historical Candidates'}</div>
                    <div style={{ fontSize: '32px', fontWeight: '900', color: '#1e293b', marginBottom: '5px' }}>{submissionsCount}</div>
                    <div style={{ fontSize: '12px', color: '#0ea5e9', fontWeight: 'bold' }}>{activeExam ? 'Evaluating Now' : 'Lifetime Data'}</div>
                  </div>
                </div>

                <h2 style={{ fontSize: '20px', color: '#1e293b', marginBottom: '20px' }}>📊 Performance Analytics Overview</h2>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px', marginBottom: '40px' }}>
                  {/* CSS Graph 1: Performance Trend */}
                  <div className="admin-card" style={{ ...styles.card, padding: '25px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' }}>
                      <h3 style={{ margin: 0, fontSize: '16px', color: '#1e293b' }}>{trendTitle}</h3>
                      <span style={{ fontSize: '12px', color: '#22c55e', fontWeight: 'bold' }}>Live Data Feed</span>
                    </div>
                    <div style={{ height: '180px', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-around', padding: '0 10px', position: 'relative' }}>
                      {/* Grid Lines */}
                      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '1px', background: '#f1f5f9' }} />
                      <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: '1px', background: '#f1f5f9' }} />
                      
                      {/* Bars */}
                      {trendData.map((val, i) => {
                        const height = Math.min(val, 100);
                        return (
                          <div key={i} style={{ width: '40px', backgroundColor: val > 70 ? '#22c55e' : (val > 40 ? '#f59e0b' : '#0062ff'), height: `${Math.max(height, 5)}%`, borderRadius: '6px 6px 0 0', position: 'relative', transition: 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)', cursor: 'pointer' }} className="bar-hover">
                            <div className="bar-tooltip">{val}%</div>
                          </div>
                        );
                      })}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-around', marginTop: '15px', padding: '0 5px' }}>
                      {trendLabels.map((l, i) => (
                        <span key={i} style={{ fontSize: '11px', color: '#64748b', fontWeight: 'bold', width: '40px', textAlign: 'center' }}>{l}</span>
                      ))}
                    </div>
                  </div>

                  {/* CSS Graph 2: Distribution Donut */}
                  <div className="admin-card" style={{ ...styles.card, padding: '25px', display: 'flex', flexDirection: 'column' }}>
                    <h3 style={{ margin: '0 0 25px 0', fontSize: '16px', color: '#1e293b' }}>Evaluation Distribution</h3>
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-around' }}>
                      <div style={{ 
                        width: '150px', height: '150px', borderRadius: '50%', 
                        background: `conic-gradient(
                          #22c55e 0% ${submissionsCount > 0 ? (selectedCount/submissionsCount)*100 : 0}%, 
                          #f59e0b ${submissionsCount > 0 ? (selectedCount/submissionsCount)*100 : 0}% ${submissionsCount > 0 ? ((selectedCount+pendingCount)/submissionsCount)*100 : 0}%, 
                          #ef4444 ${submissionsCount > 0 ? ((selectedCount+pendingCount)/submissionsCount)*100 : 0}% 100%
                        )`,
                        position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)' 
                      }}>
                        <div style={{ width: '90px', height: '90px', backgroundColor: 'white', borderRadius: '50%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                          <span style={{ fontSize: '20px', fontWeight: '900', color: '#1e293b' }}>{submissionsCount}</span>
                          <span style={{ fontSize: '9px', fontWeight: 'bold', color: '#64748b' }}>TOTAL</span>
                        </div>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#22c55e' }} />
                          <span style={{ fontSize: '12px', color: '#64748b' }}>Selected ({submissionsCount > 0 ? Math.round((selectedCount/submissionsCount)*100) : 0}%)</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#f59e0b' }} />
                          <span style={{ fontSize: '12px', color: '#64748b' }}>Pending ({submissionsCount > 0 ? Math.round((pendingCount/submissionsCount)*100) : 0}%)</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ef4444' }} />
                          <span style={{ fontSize: '12px', color: '#64748b' }}>Rejected ({submissionsCount > 0 ? Math.round((rejectedCount/submissionsCount)*100) : 0}%)</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ── EXAMS TAB ── */}
            {tab === 'exams' && (
              <>
                {/* 📊 Question Bank Status (Refined Alignment) */}
                <div style={styles.summaryBox}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
                    <span style={{ fontSize: '22px' }}>📊</span>
                    <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: '#1e293b' }}>Question Bank Status</h3>
                  </div>
                  <div style={styles.summaryGrid}>
                    {[
                      { label: 'Aptitude', color: '#3498db', values: { Easy: stats('Aptitude', 'Easy'), Medium: stats('Aptitude', 'Medium'), Hard: stats('Aptitude', 'Hard') } },
                      { label: 'Core Subjects', color: '#9b59b6', values: { Easy: stats('Core Subjects', 'Easy'), Medium: stats('Core Subjects', 'Medium'), Hard: stats('Core Subjects', 'Hard') } },
                      { label: 'DSA', color: '#e67e22', values: { Easy: stats('DSA', 'Easy'), Medium: stats('DSA', 'Medium'), Hard: stats('DSA', 'Hard') } },
                    ].map(cat => (
                      <div key={cat.label} className="admin-summary-card" style={styles.summaryCol}>
                        <div style={{ ...styles.catTag, backgroundColor: cat.color }}>{cat.label}</div>
                        <div style={styles.statsRow}>
                          <div style={styles.statItem}>
                            <span style={{ color: '#22c55e', fontSize: '18px' }}>●</span>
                            <span>Easy: <strong>{cat.values.Easy}</strong></span>
                          </div>
                          <div style={styles.statItem}>
                            <span style={{ color: '#f59e0b', fontSize: '18px' }}>●</span>
                            <span>Medium: <strong>{cat.values.Medium}</strong></span>
                          </div>
                          <div style={styles.statItem}>
                            <span style={{ color: '#ef4444', fontSize: '18px' }}>●</span>
                            <span>Hard: <strong>{cat.values.Hard}</strong></span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Action Button for Create Exam (Image 1 trigger) */}
                <div 
                  className="admin-card" 
                  style={{ 
                    ...styles.card, 
                    border: '2px dashed #0062ff', 
                    display: 'flex', 
                    flexDirection: 'column', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    minHeight: '120px', 
                    backgroundColor: '#f8fafc',
                    cursor: 'pointer',
                    marginBottom: '20px'
                  }}
                  onClick={() => setShowCreateForm(true)}
                >
                  <span style={{ fontSize: '28px', color: '#0062ff', marginBottom: '8px' }}>➕</span>
                  <h3 style={{ margin: 0, color: '#0062ff', fontSize: '18px' }}>Create New Exam</h3>
                  <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#64748b' }}>Configure assessment parameters and schedule live sessions</p>
                </div>

                {/* Create Exam */}
                {showCreateForm && (
                  <div style={styles.modalOverlay} onClick={() => setShowCreateForm(false)}>
                    <div 
                      id="create-exam-form" 
                      style={styles.modalContent} 
                      onClick={e => e.stopPropagation()}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px', position: 'sticky', top: 0, backgroundColor: 'white', zIndex: 10, paddingBottom: '15px' }}>
                        <div>
                          <h3 style={{ ...styles.cardTitle, margin: 0 }}>✨ Configure New Assessment</h3>
                          <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#64748b' }}>Define durations and distribute questions from the bank</p>
                        </div>
                        <button 
                          onClick={() => setShowCreateForm(false)}
                          style={{ 
                            background: '#f1f5f9', 
                            border: 'none', 
                            color: '#64748b', 
                            cursor: 'pointer', 
                            fontSize: '18px',
                            width: '36px',
                            height: '36px',
                            borderRadius: '10px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'all 0.2s'
                          }}
                          className="modal-close-btn"
                        >✕</button>
                      </div>
                  {examMsg && <div style={{
                    padding: '10px', borderRadius: '8px', marginBottom: '12px',
                    backgroundColor: examMsg.startsWith('✅') ? '#eafaf1' : '#fdecea',
                    color: examMsg.startsWith('✅') ? '#27ae60' : '#e74c3c',
                  }}>{examMsg}</div>}

                  <form onSubmit={handleCreateExam}>
                    <label style={styles.label}>Exam Title</label>
                    <input style={styles.input} type="text" placeholder="e.g. Campus Placement Test 2024"
                      value={examTitle} onChange={e => setExamTitle(e.target.value)} required />

                    <label style={styles.label}>Exam Code (students enter this)</label>
                    <input style={styles.input} type="text" placeholder="e.g. PLACE2024"
                      value={examCode} onChange={e => setExamCode(e.target.value)} required />

                    <label style={styles.label}>📅 Exam Start Time</label>
                    <input style={styles.input} type="datetime-local"
                      value={startTime} onChange={e => setStartTime(e.target.value)} required />

                    {/* Round Durations */}
                    <div style={styles.sectionHeader}>⏱ Round Durations (minutes)</div>
                    <div style={styles.twoCol}>
                      <div>
                        <label style={styles.sublabel}>Aptitude Duration</label>
                        <input style={styles.input} type="number" placeholder="30" min="5"
                          value={aptDuration} onChange={e => setAptDuration(e.target.value)} required />
                      </div>
                      <div>
                        <label style={styles.sublabel}>Core Subjects Duration</label>
                        <input style={styles.input} type="number" placeholder="30" min="5"
                          value={coreDuration} onChange={e => setCoreDuration(e.target.value)} required />
                      </div>
                      <div>
                        <label style={styles.sublabel}>DSA Duration</label>
                        <input style={styles.input} type="number" placeholder="60" min="5"
                          value={dsaDuration} onChange={e => setDsaDuration(e.target.value)} required />
                      </div>
                    </div>

                    {/* Aptitude Questions */}
                    <div style={styles.sectionHeader}>📘 Aptitude Questions</div>
                    <div style={styles.threeCol}>
                      <div>
                        <label style={{ ...styles.sublabel, color: '#27ae60' }}>Easy (max {stats('Aptitude', 'Easy')})</label>
                        <input style={{ ...styles.input, borderColor: '#27ae60' }} type="number" placeholder="0"
                          value={aptEasy} onChange={e => setAptEasy(e.target.value)} min="0" max={stats('Aptitude', 'Easy')} />
                      </div>
                      <div>
                        <label style={{ ...styles.sublabel, color: '#f39c12' }}>Medium (max {stats('Aptitude', 'Medium')})</label>
                        <input style={{ ...styles.input, borderColor: '#f39c12' }} type="number" placeholder="0"
                          value={aptMedium} onChange={e => setAptMedium(e.target.value)} min="0" max={stats('Aptitude', 'Medium')} />
                      </div>
                      <div>
                        <label style={{ ...styles.sublabel, color: '#e74c3c' }}>Hard (max {stats('Aptitude', 'Hard')})</label>
                        <input style={{ ...styles.input, borderColor: '#e74c3c' }} type="number" placeholder="0"
                          value={aptHard} onChange={e => setAptHard(e.target.value)} min="0" max={stats('Aptitude', 'Hard')} />
                      </div>
                    </div>
                    {(aptEasy || aptMedium || aptHard) && (
                      <p style={styles.totalPreview}>Aptitude Total: {(parseInt(aptEasy) || 0) + (parseInt(aptMedium) || 0) + (parseInt(aptHard) || 0)} questions</p>
                    )}

                    {/* Core Subjects Questions */}
                    <div style={styles.sectionHeader}>📗 Core Subjects Questions</div>
                    <div style={styles.threeCol}>
                      <div>
                        <label style={{ ...styles.sublabel, color: '#27ae60' }}>Easy (max {stats('Core Subjects', 'easy')})</label>
                        <input style={{ ...styles.input, borderColor: '#27ae60' }} type="number" placeholder="0"
                          value={coreEasy} onChange={e => setCoreEasy(e.target.value)} min="0" max={stats('Core Subjects', 'easy')} />
                      </div>
                      <div>
                        <label style={{ ...styles.sublabel, color: '#f39c12' }}>Medium (max {stats('Core Subjects', 'medium')})</label>
                        <input style={{ ...styles.input, borderColor: '#f39c12' }} type="number" placeholder="0"
                          value={coreMedium} onChange={e => setCoreMedium(e.target.value)} min="0" max={stats('Core Subjects', 'medium')} />
                      </div>
                      <div>
                        <label style={{ ...styles.sublabel, color: '#e74c3c' }}>Hard (max {stats('Core Subjects', 'hard')})</label>
                        <input style={{ ...styles.input, borderColor: '#e74c3c' }} type="number" placeholder="0"
                          value={coreHard} onChange={e => setCoreHard(e.target.value)} min="0" max={stats('Core Subjects', 'hard')} />
                      </div>
                    </div>
                    {(coreEasy || coreMedium || coreHard) && (
                      <p style={styles.totalPreview}>Core Total: {(parseInt(coreEasy) || 0) + (parseInt(coreMedium) || 0) + (parseInt(coreHard) || 0)} questions</p>
                    )}

                    {/* DSA Questions */}
                    <div style={styles.sectionHeader}>🟣 DSA Questions (Coding)</div>
                    <div style={styles.threeCol}>
                      <div>
                        <label style={{ ...styles.sublabel, color: '#27ae60' }}>Easy (max {stats('DSA', 'easy')})</label>
                        <input style={{ ...styles.input, borderColor: '#27ae60' }} type="number" placeholder="0"
                          value={dsaEasy} onChange={e => setDsaEasy(e.target.value)} min="0" max={stats('DSA', 'easy')} />
                      </div>
                      <div>
                        <label style={{ ...styles.sublabel, color: '#f39c12' }}>Medium (max {stats('DSA', 'medium')})</label>
                        <input style={{ ...styles.input, borderColor: '#f39c12' }} type="number" placeholder="0"
                          value={dsaMedium} onChange={e => setDsaMedium(e.target.value)} min="0" max={stats('DSA', 'medium')} />
                      </div>
                      <div>
                        <label style={{ ...styles.sublabel, color: '#e74c3c' }}>Hard (max {stats('DSA', 'hard')})</label>
                        <input style={{ ...styles.input, borderColor: '#e74c3c' }} type="number" placeholder="0"
                          value={dsaHard} onChange={e => setDsaHard(e.target.value)} min="0" max={stats('DSA', 'hard')} />
                      </div>
                    </div>
                    {(dsaEasy || dsaMedium || dsaHard) && (
                      <p style={styles.totalPreview}>DSA Total: {(parseInt(dsaEasy) || 0) + (parseInt(dsaMedium) || 0) + (parseInt(dsaHard) || 0)} questions</p>
                    )}

                    {/* Total Summary */}
                    {(aptEasy || aptMedium || aptHard || coreEasy || coreMedium || coreHard || dsaEasy || dsaMedium || dsaHard) && (
                      <div style={{
                        backgroundColor: '#f8fafc',
                        padding: '16px',
                        borderRadius: '12px',
                        marginTop: '20px',
                        border: '1px solid #e2e8f0',
                        textAlign: 'center'
                      }}>
                        <strong style={{ color: '#1e293b', fontSize: '16px' }}>
                          📊 Total Assessment Questions: {(
                            (parseInt(aptEasy) || 0) + (parseInt(aptMedium) || 0) + (parseInt(aptHard) || 0) +
                            (parseInt(coreEasy) || 0) + (parseInt(coreMedium) || 0) + (parseInt(coreHard) || 0) +
                            (parseInt(dsaEasy) || 0) + (parseInt(dsaMedium) || 0) + (parseInt(dsaHard) || 0)
                          )}
                        </strong>
                      </div>
                    )}

                    <button style={styles.addBtn} type="submit">🚀 Create Exam & Auto-Select Questions</button>
                  </form>
                </div>
                </div>
                )}

                {/* All Exams */}
                <div className="admin-static-card" style={styles.card}>
                  <h3 style={styles.cardTitle}>📋 All Exams ({exams.length})</h3>
                  {exams.length === 0 ? <p style={{ color: '#7f8c8d' }}>No exams yet.</p> : exams.map(exam => (
                    <div key={exam.id} style={styles.examRow}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                          <strong style={{ fontSize: '16px' }}>{exam.title}</strong>
                          {/* Status Badge */}
                          <span style={{
                            padding: '4px 12px',
                            borderRadius: '12px',
                            fontSize: '12px',
                            fontWeight: 'bold',
                            backgroundColor: exam.status === 'completed' ? '#fee' : '#efe',
                            color: exam.status === 'completed' ? '#c00' : '#0a0',
                            border: `1px solid ${exam.status === 'completed' ? '#c00' : '#0a0'}`
                          }}>
                            {exam.status === 'completed' ? '🔴 Completed' : '🟢 Active'}
                          </span>
                        </div>
                        <p style={styles.examMeta}>
                          🔑 <strong>{exam.examCode}</strong> &nbsp;|&nbsp;
                          📝 {exam.totalQuestions || 0} questions &nbsp;|&nbsp;
                          🏅 {exam.totalPoints || exam.totalQuestions || 0} pts
                        </p>
                        {exam.startTime && (
                          <p style={styles.examMeta}>
                            📅 Starts: {(() => {
                              let date;
                              if (exam.startTime?.toDate) {
                                date = exam.startTime.toDate();
                              } else if (exam.startTime?.seconds) {
                                date = new Date(exam.startTime.seconds * 1000);
                              } else {
                                date = new Date(exam.startTime);
                              }
                              return date.toLocaleString();
                            })()}
                          </p>
                        )}
                        {exam.roundDurations && (
                          <p style={styles.examMeta}>
                            ⏱ Aptitude: {exam.roundDurations.aptitude}min &nbsp;|&nbsp;
                            Core: {exam.roundDurations.core}min
                          </p>
                        )}
                      </div>
                      {/* Action Buttons */}
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <button
                          style={{ ...styles.editBtn, padding: '8px 16px', fontSize: '14px' }}
                          onClick={() => navigate(`/admin/exam/${exam.id}`)}
                        >
                          👁 View
                        </button>
                        
                        {exam.status !== 'completed' ? (
                          <button
                            style={{ ...styles.editBtn, padding: '8px 16px', fontSize: '14px', backgroundColor: '#3498db' }}
                            onClick={() => navigate(`/admin/exam/${exam.id}/edit`)}
                          >
                            ✏️ Edit
                          </button>
                        ) : (
                          <span style={{ color: '#95a5a6', fontSize: '11px', fontStyle: 'italic' }}>
                            (Locked - Completed)
                          </span>
                        )}

                        <button
                          style={styles.deleteBtn}
                          onClick={() => handleDeleteExam(exam.id)}
                        >
                          🗑 Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
          </>
        )}

        {/* ── QUESTION BANK TAB (HIERARCHICAL) ── */}
        {tab === 'questions' && (
          <>
            {/* Add Question & Seed Button */}
            <div style={{marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
              <h2 style={{margin: 0, color: '#2c3e50'}}>📚 Question Bank</h2>
              <div style={{display: 'flex', gap: '10px'}}>
                <button 
                  style={{...styles.addBtn, width: 'auto', padding: '10px 20px', backgroundColor: '#e74c3c'}} 
                  onClick={handleSeedQuestions}
                  disabled={isSeedingquestions}
                >
                  {isSeedingquestions ? '⏳ Seeding...' : '🌱 Seed 99 Questions'}
                </button>
                <button 
                  style={{...styles.addBtn, width: 'auto', padding: '10px 20px', backgroundColor: '#e67e22'}} 
                  onClick={handleSeedDSA}
                  disabled={isSeedingDSA}
                >
                  {isSeedingDSA ? '⏳ Seeding...' : '🧪 Seed 5 DSA Questions'}
                </button>
                <button style={{...styles.addBtn, width: 'auto', padding: '10px 20px'}} onClick={openAddQuestionModal}>
                  ➕ Add New Question
                </button>
              </div>
            </div>

            {qMsg && <div style={{
              padding: '12px', borderRadius: '10px', marginBottom: '15px',
              backgroundColor: qMsg.startsWith('✅') ? '#eafaf1' : '#fdecea',
              color: qMsg.startsWith('✅') ? '#27ae60' : '#e74c3c',
              fontSize: '14px', fontWeight: 'bold', textAlign: 'center'
            }}>{qMsg}</div>}

            {/* ======== ROUND 1: APTITUDE ======== */}
                <div style={styles.roundCard}>
                  <h2 style={styles.roundTitle}>📘 Round 1 - Aptitude</h2>

                  {/* Easy */}
                  <div style={styles.diffSection}>
                    <div style={{ ...styles.diffHeader, backgroundColor: '#eafaf1', borderLeft: '4px solid #27ae60' }}
                      onClick={() => toggleSection('round1_easy')}>
                      <span style={{ fontWeight: 'bold', color: '#27ae60' }}>✅ EASY</span>
                      <span style={styles.badge}>{getQuestions('round1', 'easy').length} questions</span>
                    </div>
                    {expandedSections.round1_easy && (
                      <div style={styles.questionList}>
                        {getQuestions('round1', 'easy').length === 0 ? (
                          <p style={styles.emptyText}>No easy aptitude questions yet</p>
                        ) : getQuestions('round1', 'easy').map(q => (
                          <div key={q.id} style={styles.qCard}>
                            <div style={{ flex: 1 }}>
                              <p style={styles.qText}>{q.text}</p>
                              <div style={styles.optionsGrid}>
                                {q.options?.map((opt, i) => (
                                  <span key={i} style={{
                                    ...styles.optionBadge,
                                    backgroundColor: opt === q.correct ? '#d4edda' : '#f8f9fa',
                                    border: opt === q.correct ? '2px solid #27ae60' : '1px solid #dee2e6'
                                  }}>
                                    {opt === q.correct && '✔ '}{opt}
                                  </span>
                                ))}
                              </div>
                            </div>
                            <div style={{ display: 'flex', gap: '5px' }}>
                              <button style={styles.editBtn} onClick={() => openEditQuestionModal(q)}>✏️ Edit</button>
                              <button style={styles.deleteBtn} onClick={() => handleDeleteQuestion(q.id)}>🗑</button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Medium */}
                  <div style={styles.diffSection}>
                    <div style={{ ...styles.diffHeader, backgroundColor: '#fef9e7', borderLeft: '4px solid #f39c12' }}
                      onClick={() => toggleSection('round1_medium')}>
                      <span style={{ fontWeight: 'bold', color: '#f39c12' }}>⚠️ MEDIUM</span>
                      <span style={styles.badge}>{getQuestions('round1', 'medium').length} questions</span>
                    </div>
                    {expandedSections.round1_medium && (
                      <div style={styles.questionList}>
                        {getQuestions('round1', 'medium').length === 0 ? (
                          <p style={styles.emptyText}>No medium aptitude questions yet</p>
                        ) : getQuestions('round1', 'medium').map(q => (
                          <div key={q.id} style={styles.qCard}>
                            <div style={{ flex: 1 }}>
                              <p style={styles.qText}>{q.text}</p>
                              <div style={styles.optionsGrid}>
                                {q.options?.map((opt, i) => (
                                  <span key={i} style={{
                                    ...styles.optionBadge,
                                    backgroundColor: opt === q.correct ? '#fff3cd' : '#f8f9fa',
                                    border: opt === q.correct ? '2px solid #f39c12' : '1px solid #dee2e6'
                                  }}>
                                    {opt === q.correct && '✔ '}{opt}
                                  </span>
                                ))}
                              </div>
                            </div>
                            <div style={{ display: 'flex', gap: '5px' }}>
                              <button style={styles.editBtn} onClick={() => openEditQuestionModal(q)}>✏️ Edit</button>
                              <button style={styles.deleteBtn} onClick={() => handleDeleteQuestion(q.id)}>🗑</button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Hard */}
                  <div style={styles.diffSection}>
                    <div style={{ ...styles.diffHeader, backgroundColor: '#fdecea', borderLeft: '4px solid #e74c3c' }}
                      onClick={() => toggleSection('round1_hard')}>
                      <span style={{ fontWeight: 'bold', color: '#e74c3c' }}>🔥 HARD</span>
                      <span style={styles.badge}>{getQuestions('round1', 'hard').length} questions</span>
                    </div>
                    {expandedSections.round1_hard && (
                      <div style={styles.questionList}>
                        {getQuestions('round1', 'hard').length === 0 ? (
                          <p style={styles.emptyText}>No hard aptitude questions yet</p>
                        ) : getQuestions('round1', 'hard').map(q => (
                          <div key={q.id} style={styles.qCard}>
                            <div style={{ flex: 1 }}>
                              <p style={styles.qText}>{q.text}</p>
                              <div style={styles.optionsGrid}>
                                {q.options?.map((opt, i) => (
                                  <span key={i} style={{
                                    ...styles.optionBadge,
                                    backgroundColor: opt === q.correct ? '#f8d7da' : '#f8f9fa',
                                    border: opt === q.correct ? '2px solid #e74c3c' : '1px solid #dee2e6'
                                  }}>
                                    {opt === q.correct && '✔ '}{opt}
                                  </span>
                                ))}
                              </div>
                            </div>
                            <div style={{ display: 'flex', gap: '5px' }}>
                              <button style={styles.editBtn} onClick={() => openEditQuestionModal(q)}>✏️ Edit</button>
                              <button style={styles.deleteBtn} onClick={() => handleDeleteQuestion(q.id)}>🗑</button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* ======== ROUND 2: CORE SUBJECTS ======== */}
                <div className="admin-static-card" style={styles.roundCard}>
                  <h2 style={styles.roundTitle}>📗 Round 2 - Core Subjects</h2>
                  <p style={{ color: '#7f8c8d', fontSize: '13px', marginTop: '-5px' }}>OS • CN • DBMS</p>

                  {['easy', 'medium', 'hard'].map(diff => (
                    <div key={diff} style={styles.diffSection}>
                      <div style={{
                        ...styles.diffHeader,
                        backgroundColor: diff === 'easy' ? '#eafaf1' : diff === 'medium' ? '#fef9e7' : '#fdecea',
                        borderLeft: `4px solid ${diffColor[diff]}`
                      }}
                        onClick={() => toggleSection(`round2_${diff}`)}>
                        <span style={{ fontWeight: 'bold', color: diffColor[diff] }}>
                          {diff === 'easy' ? '✅ EASY' : diff === 'medium' ? '⚠️ MEDIUM' : '🔥 HARD'}
                        </span>
                        <span style={styles.badge}>{getQuestions('round2', diff).length} questions</span>
                      </div>
                      {expandedSections[`round2_${diff}`] && (
                        <div style={styles.questionList}>
                          {/* Subject filters */}
                          {['os', 'cn', 'dbms'].map(sub => {
                            const subQs = getQuestions('round2', diff, sub);
                            if (subQs.length === 0) return null;
                            return (
                              <div key={sub} style={{ marginBottom: '15px' }}>
                                <h4 style={{
                                  color: '#3498db',
                                  fontSize: '13px',
                                  textTransform: 'uppercase',
                                  marginBottom: '8px',
                                  padding: '5px 10px',
                                  backgroundColor: '#ebf5fb',
                                  borderRadius: '5px',
                                  display: 'inline-block'
                                }}>
                                  {sub.toUpperCase()} ({subQs.length})
                                </h4>
                                {subQs.map(q => (
                                  <div key={q.id} style={styles.qCard}>
                                    <div style={{ flex: 1 }}>
                                      <p style={styles.qText}>{q.text}</p>
                                      <div style={styles.optionsGrid}>
                                        {q.options?.map((opt, i) => (
                                          <span key={i} style={{
                                            ...styles.optionBadge,
                                            backgroundColor: opt === q.correct ?
                                              (diff === 'easy' ? '#d4edda' : diff === 'medium' ? '#fff3cd' : '#f8d7da')
                                              : '#f8f9fa',
                                            border: opt === q.correct ? `2px solid ${diffColor[diff]}` : '1px solid #dee2e6'
                                          }}>
                                            {opt === q.correct && '✔ '}{opt}
                                          </span>
                                        ))}
                                      </div>
                                    </div>
                                    <div style={{ display: 'flex', gap: '5px' }}>
                                      <button style={styles.editBtn} onClick={() => openEditQuestionModal(q)}>✏️ Edit</button>
                                      <button style={styles.deleteBtn} onClick={() => handleDeleteQuestion(q.id)}>🗑</button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            );
                          })}
                          {getQuestions('round2', diff).length === 0 && (
                            <p style={styles.emptyText}>No {diff} core subject questions yet</p>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

            {/* ======== ROUND 3: DSA ======== */}
            <div style={styles.roundCard}>
              <h2 style={styles.roundTitle}>📕 Round 3 - DSA (Coding)</h2>
              
              {['easy', 'medium', 'hard'].map(diff => (
                <div key={diff} style={styles.diffSection}>
                  <div style={{
                    ...styles.diffHeader,
                    backgroundColor: diff === 'easy' ? '#eafaf1' : diff === 'medium' ? '#fef9e7' : '#fdecea',
                    borderLeft: `4px solid ${diffColor[diff]}`
                  }}
                       onClick={() => toggleSection(`round3_${diff}`)}>
                    <span style={{fontWeight: 'bold', color: diffColor[diff]}}>
                      {diff === 'easy' ? '✅ EASY' : diff === 'medium' ? '⚠️ MEDIUM' : '🔥 HARD'}
                    </span>
                    <span style={styles.badge}>{getQuestions('round3', diff).length} questions</span>
                  </div>
                  {expandedSections[`round3_${diff}`] && (
                    <div style={styles.questionList}>
                      {getQuestions('round3', diff).length === 0 ? (
                        <p style={styles.emptyText}>No {diff} DSA questions yet</p>
                      ) : getQuestions('round3', diff).map(q => (
                        <div key={q.id} style={styles.qCard}>
                          <div style={{flex: 1}}>
                            {/* DSA questions have different structure */}
                            <p style={styles.qText}>
                              <strong>{q.title || "Coding Challenge"}</strong>
                              {q.points && <span style={{marginLeft: '10px', color: '#3498db', fontWeight: 'bold'}}>({q.points} points)</span>}
                            </p>
                            <p style={{fontSize: '13px', color: '#555', margin: '8px 0', lineHeight: '1.4'}}>
                              { (q.description || q.text || "No description provided.").substring(0, 250) }
                              { (q.description?.length || q.text?.length) > 250 ? '...' : '' }
                            </p>
                          </div>
                          <div style={{display: 'flex', gap: '5px', flexDirection: 'column'}}>
                            <button 
                              style={{...styles.editBtn, fontSize: '12px'}} 
                              onClick={() => {
                                setEditingTestCaseQuestion(q);
                                setIsTestCaseModalOpen(true);
                              }}
                            >
                              🧪 Edit Test Cases
                            </button>
                            <button style={styles.deleteBtn} onClick={() => handleDeleteQuestion(q.id)}>🗑 Delete</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* ======== ADD/EDIT MODAL ======== */}
            {isQuestionModalOpen && (
                  <div style={styles.modalOverlay} onClick={() => setIsQuestionModalOpen(false)}>
                    <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
                      <h2 style={styles.modalTitle}>
                        {editingQuestion ? '✏️ Edit Question' : '➕ Add New Question'}
                      </h2>

                      <form onSubmit={handleSaveQuestion}>
                        <label style={styles.label}>Round</label>
                        <select style={styles.input} value={qRound} onChange={e => setQRound(e.target.value)} required>
                          <option value="round1">📘 Round 1 - Aptitude</option>
                          <option value="round2">📗 Round 2 - Core Subjects</option>
                          <option value="round3">📕 Round 3 - DSA</option>
                        </select>

                        <label style={styles.label}>Difficulty</label>
                        <div style={styles.diffRow}>
                          {['easy', 'medium', 'hard'].map(d => (
                            <button key={d} type="button"
                              style={{ ...styles.diffBtn, backgroundColor: qDifficulty === d ? diffColor[d] : '#ecf0f1', color: qDifficulty === d ? 'white' : '#333' }}
                              onClick={() => setQDifficulty(d)}>
                              {d.charAt(0).toUpperCase() + d.slice(1)}
                            </button>
                          ))}
                        </div>

                        <label style={styles.label}>Subject</label>
                        <select style={styles.input} value={qSubject} onChange={e => setQSubject(e.target.value)} required>
                          {qRound === 'round1' && (
                            <optgroup label="Round 1">
                              <option value="aptitude">Aptitude</option>
                            </optgroup>
                          )}
                          {qRound === 'round2' && (
                            <optgroup label="Round 2">
                              <option value="os">Operating System (OS)</option>
                              <option value="cn">Computer Networks (CN)</option>
                              <option value="dbms">Database Management (DBMS)</option>
                            </optgroup>
                          )}
                          {qRound === 'round3' && (
                            <optgroup label="Round 3">
                              <option value="dsa">Data Structures & Algorithms (DSA)</option>
                            </optgroup>
                          )}
                        </select>

                        {qRound === 'round3' && (
                          <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
                            <div style={{ flex: 2 }}>
                              <label style={styles.label}>Coding Challenge Title</label>
                              <input style={styles.input} type="text" placeholder="e.g. Two Sum"
                                value={qText.split('\n')[0].startsWith('TITLE:') ? qText.split('\n')[0].replace('TITLE:', '') : ''} 
                                onChange={e => {
                                  const lines = qText.split('\n');
                                  lines[0] = `TITLE:${e.target.value}`;
                                  setQText(lines.join('\n'));
                                }} required />
                            </div>
                            <div style={{ flex: 1 }}>
                              <label style={styles.label}>Points</label>
                              <input style={styles.input} type="number" min="1"
                                value={qPoints} onChange={e => setQPoints(e.target.value)} required />
                            </div>
                          </div>
                        )}
                        <textarea style={styles.textarea} placeholder={qRound === 'round3' ? 'Enter detailed problem description, constraints, and examples...' : 'Enter question text...'}
                          value={qRound === 'round3' ? (qText.includes('\n') ? qText.substring(qText.indexOf('\n') + 1) : '') : qText} 
                          onChange={e => {
                            if (qRound === 'round3') {
                              const lines = qText.split('\n');
                              const title = lines[0].startsWith('TITLE:') ? lines[0] : 'TITLE:New Challenge';
                              setQText(`${title}\n${e.target.value}`);
                            } else {
                              setQText(e.target.value);
                            }
                          }} required />

                        {qRound !== 'round3' && (
                          <>
                            <label style={styles.label}>Options (4 required):</label>
                            {qOptions.map((opt, i) => (
                              <input key={i} style={styles.input} type="text" placeholder={`Option ${i + 1}`}
                                value={opt} onChange={e => { const o = [...qOptions]; o[i] = e.target.value; setQOptions(o); }} required />
                            ))}

                            <label style={styles.label}>Correct Answer:</label>
                            <select style={styles.input} value={qCorrect} onChange={e => setQCorrect(e.target.value)} required>
                              <option value="">-- Select correct option --</option>
                              {qOptions.map((opt, i) => opt && <option key={i} value={opt}>Option {i + 1}: {opt}</option>)}
                            </select>
                          </>
                        )}
                        
                        {qRound === 'round3' && (
                          <div style={{ margin: '10px 0' }}>
                            <label style={{ ...styles.label, marginBottom: 8 }}>🧪 Test Cases</label>
                            {qTestCases.map((tc, i) => (
                              <div key={i} style={{ border: '1px solid #e2e8f0', borderRadius: 10, padding: '10px 12px', marginBottom: 8, background: '#f8fafc' }}>
                                <div style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
                                  <div style={{ flex: 1 }}>
                                    <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', marginBottom: 3 }}>Input</div>
                                    <textarea
                                      style={{ ...styles.input, fontFamily: 'monospace', fontSize: 12, resize: 'vertical', minHeight: 52, margin: 0 }}
                                      placeholder="e.g. 5\n1 2 3 4 5"
                                      value={tc.input}
                                      onChange={e => {
                                        const updated = [...qTestCases];
                                        updated[i] = { ...updated[i], input: e.target.value };
                                        setQTestCases(updated);
                                      }}
                                    />
                                  </div>
                                  <div style={{ flex: 1 }}>
                                    <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', marginBottom: 3 }}>Expected Output</div>
                                    <textarea
                                      style={{ ...styles.input, fontFamily: 'monospace', fontSize: 12, resize: 'vertical', minHeight: 52, margin: 0 }}
                                      placeholder="e.g. 15"
                                      value={tc.expectedOutput}
                                      onChange={e => {
                                        const updated = [...qTestCases];
                                        updated[i] = { ...updated[i], expectedOutput: e.target.value };
                                        setQTestCases(updated);
                                      }}
                                    />
                                  </div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#475569', cursor: 'pointer' }}>
                                    <input
                                      type="checkbox"
                                      checked={tc.hidden || false}
                                      onChange={e => {
                                        const updated = [...qTestCases];
                                        updated[i] = { ...updated[i], hidden: e.target.checked };
                                        setQTestCases(updated);
                                      }}
                                    />
                                    Hidden (not shown to student)
                                  </label>
                                  <button
                                    type="button"
                                    onClick={() => setQTestCases(qTestCases.filter((_, j) => j !== i))}
                                    style={{ background: '#fee2e2', border: 'none', borderRadius: 6, padding: '4px 10px', color: '#dc2626', fontWeight: 700, cursor: 'pointer', fontSize: 12 }}
                                  >
                                    Remove
                                  </button>
                                </div>
                              </div>
                            ))}
                            <button
                              type="button"
                              onClick={() => setQTestCases([...qTestCases, { input: '', expectedOutput: '', hidden: false }])}
                              style={{ background: '#eff6ff', border: '1.5px dashed #3b82f6', borderRadius: 8, padding: '8px 16px', color: '#2563eb', fontWeight: 700, cursor: 'pointer', fontSize: 13, width: '100%' }}
                            >
                              + Add Test Case
                            </button>
                          </div>
                        )}

                        <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                          <button style={{ ...styles.addBtn, flex: 1 }} type="submit">
                            {editingQuestion ? '💾 Update Question' : '➕ Add Question'}
                          </button>
                          <button style={{ ...styles.cancelBtn, flex: 1 }} type="button" onClick={() => setIsQuestionModalOpen(false)}>
                            ❌ Cancel
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Old results tab removed - now using ResultsManagement component */}
          </div>
        </div>
      </div>

      {/* Test Case Manager Modal */}
      {isTestCaseModalOpen && editingTestCaseQuestion && (
        <TestCaseManager
          question={editingTestCaseQuestion}
          db={db}
          onClose={() => {
            setIsTestCaseModalOpen(false);
            setEditingTestCaseQuestion(null);
          }}
          onUpdate={() => {
            fetchQuestions();
          }}
        />
      )}

      {/* Modern Dialog System */}
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

const styles = {
  container: { minHeight: '100vh', backgroundColor: '#f0f4f8', display: 'flex' },
  sidebar: {
    width: '260px',
    backgroundColor: '#3498db',
    color: 'white',
    height: 'calc(100vh - 70px)',
    position: 'fixed',
    left: 0,
    top: '70px',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '4px 0 10px rgba(0,0,0,0.1)',
    zIndex: 1000
  },
  sidebarHeader: {
    padding: '30px 20px',
    borderBottom: '1px solid rgba(255,255,255,0.1)',
    textAlign: 'center'
  },
  sidebarLogo: {
    margin: 0,
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#3498db'
  },
  adminMeta: {
    margin: '10px 0 0 0',
    fontSize: '12px',
    opacity: 0.7,
    textTransform: 'uppercase',
    letterSpacing: '1px'
  },
  sidebarNav: {
    flex: 1,
    padding: '20px 0',
    display: 'flex',
    flexDirection: 'column',
    gap: '5px'
  },
  sidebarTab: {
    padding: '15px 25px',
    border: 'none',
    backgroundColor: 'transparent',
    color: '#ecf0f1',
    cursor: 'pointer',
    textAlign: 'left',
    fontSize: '16px',
    transition: 'all 0.2s',
    display: 'flex',
    alignItems: 'center',
    gap: '12px'
  },
  activeSidebarTab: {
    backgroundColor: '#3498db',
    color: 'white',
    fontWeight: 'bold',
    borderLeft: '4px solid #fff'
  },
  sidebarFooter: {
    padding: '20px',
    borderTop: '1px solid rgba(255,255,255,0.1)'
  },
  topNavbar: {
    height: '70px',
    backgroundColor: '#0062ff',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '0 30px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
    position: 'fixed',
    top: 0,
    left: 0,
    zIndex: 1100,
    width: '100%',
    boxSizing: 'border-box'
  },
  navLeft: { display: 'flex', alignItems: 'center', gap: '25px' },
  navRight: { display: 'flex', alignItems: 'center', gap: '20px' },
  branding: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    color: '#3498db',
    cursor: 'pointer'
  },
  divider: { width: '1px', height: '30px', backgroundColor: '#e2e8f0' },
  userAvatar: {
    width: '40px',
    height: '40px',
    borderRadius: '12px',
    backgroundColor: '#3498db',
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: '800',
    fontSize: '18px',
    boxShadow: '0 4px 10px rgba(52, 152, 219, 0.3)'
  },
  navLogoutBtn: {
    padding: '8px 16px',
    backgroundColor: '#fff1f1',
    color: '#e11d48',
    border: '1px solid #fecaca',
    borderRadius: '8px',
    fontSize: '13px',
    fontWeight: '700',
    cursor: 'pointer',
    transition: 'all 0.2s'
  },
  contentArea: {
    display: 'flex',
    flex: 1
  },
  mainContent: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
    padding: '100px 20px 20px 20px',
    maxWidth: '1200px',
    margin: '0 auto',
    width: '100%'
  },
  cardWrapper: {
    backgroundColor: 'white',
    borderRadius: '35px', // More rounded for modern look
    padding: '40px',
    maxWidth: '1400px',
    width: '100%',
    margin: '0 auto',
    boxShadow: '0 10px 40px rgba(0,0,0,0.04)',
    minHeight: 'calc(100vh - 140px)',
    boxSizing: 'border-box'
  },
  dashboardWelcome: {
    padding: '20px 0'
  },
  welcomeHeader: {
    marginBottom: '40px'
  },
  quickActionsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
    gap: '24px'
  },
  actionCard: {
    backgroundColor: 'white',
    padding: '30px',
    borderRadius: '24px',
    border: '1px solid #f1f5f9',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
    gap: '10px',
    boxShadow: '0 4px 15px rgba(0,0,0,0.03)',
    cursor: 'pointer'
  },
  actionIcon: {
    width: '50px',
    height: '50px',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '24px',
    marginBottom: '10px'
  },
  contentWrapper: {
    padding: '40px',
    maxWidth: '1400px',
    width: '100%',
    boxSizing: 'border-box'
  },
  logoutBtn: {
    width: '100%',
    backgroundColor: '#e74c3c',
    color: 'white',
    border: 'none',
    padding: '12px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: 'bold'
  },
  summaryBox: {
    backgroundColor: 'white',
    padding: '30px',
    borderRadius: '16px',
    marginBottom: '30px',
    boxShadow: '0 4px 15px rgba(0,0,0,0.03)',
    border: '1px solid #e2e8f0'
  },
  summaryGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '25px'
  },
  summaryCol: {
    backgroundColor: '#f8fafc',
    padding: '20px',
    borderRadius: '14px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    border: '1px solid #f1f5f9',
    transition: 'transform 0.2s ease',
  },
  catTag: {
    alignSelf: 'flex-start',
    padding: '4px 12px',
    borderRadius: '6px',
    color: 'white',
    fontSize: '11px',
    fontWeight: '800',
    marginBottom: '8px',
    textTransform: 'uppercase',
    letterSpacing: '1px'
  },
  statsRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '10px'
  },
  statItem: {
    fontSize: '14px',
    color: '#475569',
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  card: { backgroundColor: 'white', padding: '25px', borderRadius: '12px', boxShadow: '0 2px 10px rgba(0,0,0,0.08)', marginBottom: '20px' },
  cardTitle: { color: '#2c3e50', marginTop: 0, marginBottom: '20px' },
  label: { display: 'block', fontWeight: 'bold', color: '#2c3e50', marginBottom: '5px', marginTop: '10px', fontSize: '14px' },
  sublabel: { display: 'block', fontWeight: 'bold', marginBottom: '4px', fontSize: '13px' },
  input: { width: '100%', padding: '10px', marginBottom: '10px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '14px', boxSizing: 'border-box' },
  textarea: { width: '100%', padding: '10px', marginBottom: '10px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '14px', boxSizing: 'border-box', minHeight: '80px' },
  sectionHeader: { backgroundColor: '#f0f4f8', padding: '8px 12px', borderRadius: '6px', fontWeight: 'bold', color: '#2c3e50', marginBottom: '10px', marginTop: '5px', fontSize: '14px' },
  twoCol: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '5px' },
  threeCol: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '5px' },
  totalPreview: { textAlign: 'center', fontWeight: 'bold', color: '#3498db', fontSize: '14px', marginBottom: '10px', marginTop: 0 },
  addBtn: { width: '100%', padding: '12px', backgroundColor: '#27ae60', color: 'white', border: 'none', borderRadius: '8px', fontSize: '15px', cursor: 'pointer', marginTop: '5px' },
  examRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '14px', borderBottom: '1px solid #eee', gap: '10px' },
  examMeta: { color: '#7f8c8d', margin: '3px 0', fontSize: '13px' },
  deleteBtn: { backgroundColor: '#e74c3c', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', flexShrink: 0 },
  diffRow: { display: 'flex', gap: '10px', marginBottom: '12px' },
  diffBtn: { flex: 1, padding: '10px', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' },
  diffBadge: { color: 'white', padding: '2px 8px', borderRadius: '10px', fontSize: '11px', marginRight: '6px', fontWeight: 'bold' },
  catBadge: { backgroundColor: '#3498db', color: 'white', padding: '2px 8px', borderRadius: '10px', fontSize: '11px', marginRight: '8px' },
  qRow: { display: 'flex', alignItems: 'center', padding: '10px', borderBottom: '1px solid #eee', gap: '10px' },
  bankSummaryGrid: { display: 'flex', gap: '20px', marginBottom: '15px', flexWrap: 'wrap' },
  bankCat: { display: 'flex', gap: '8px', alignItems: 'center', fontSize: '13px', fontWeight: 'bold', flexWrap: 'wrap' },
  resultRow: { display: 'flex', alignItems: 'flex-start', padding: '14px', borderBottom: '1px solid #eee', gap: '12px' },
  roundScore: { backgroundColor: '#f0f4f8', padding: '3px 10px', borderRadius: '12px', fontSize: '12px', color: '#2c3e50' },
  pctBadge: { color: 'white', fontWeight: 'bold', fontSize: '16px', padding: '8px 12px', borderRadius: '8px', minWidth: '50px', textAlign: 'center', flexShrink: 0 },
  errorBanner: {
    backgroundColor: '#ffe6e6',
    border: '2px solid #e74c3c',
    borderRadius: '12px',
    padding: '20px',
    margin: '20px auto',
    maxWidth: '800px',
    color: '#2c3e50'
  },
  codeBlock: {
    backgroundColor: '#2c3e50',
    color: '#ecf0f1',
    padding: '15px',
    borderRadius: '8px',
    overflow: 'auto',
    fontSize: '12px',
    fontFamily: 'Consolas, Monaco, monospace',
    margin: '10px 0'
  },
  // New hierarchical UI styles
  roundCard: {
    backgroundColor: 'white',
    padding: '20px',
    borderRadius: '12px',
    boxShadow: '0 2px 10px rgba(0,0,0,0.08)',
    marginBottom: '20px'
  },
  roundTitle: {
    color: '#2c3e50',
    marginTop: 0,
    marginBottom: '15px',
    fontSize: '20px'
  },
  diffSection: {
    marginBottom: '10px'
  },
  diffHeader: {
    padding: '12px 15px',
    borderRadius: '8px',
    cursor: 'pointer',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '5px',
    transition: 'all 0.2s',
    userSelect: 'none'
  },
  badge: {
    backgroundColor: '#3498db',
    color: 'white',
    padding: '3px 10px',
    borderRadius: '12px',
    fontSize: '11px',
    fontWeight: 'bold'
  },
  questionList: {
    padding: '10px',
    backgroundColor: '#fafafa',
    borderRadius: '8px',
    marginBottom: '5px'
  },
  qCard: {
    backgroundColor: 'white',
    padding: '15px',
    borderRadius: '8px',
    marginBottom: '10px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
    display: 'flex',
    gap: '10px',
    alignItems: 'flex-start'
  },
  qText: {
    color: '#2c3e50',
    fontSize: '14px',
    fontWeight: 'bold',
    marginBottom: '10px',
    marginTop: 0
  },
  optionsGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '8px'
  },
  optionBadge: {
    padding: '6px 10px',
    borderRadius: '5px',
    fontSize: '12px',
    color: '#2c3e50'
  },
  editBtn: {
    backgroundColor: '#3498db',
    color: 'white',
    border: 'none',
    padding: '6px 12px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '11px',
    flexShrink: 0
  },
  emptyText: {
    color: '#95a5a6',
    fontStyle: 'italic',
    fontSize: '13px',
    textAlign: 'center',
    padding: '20px'
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
    padding: '20px'
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '30px',
    maxWidth: '600px',
    width: '100%',
    maxHeight: '90vh',
    overflowY: 'auto',
    boxShadow: '0 10px 40px rgba(0,0,0,0.3)'
  },
  modalTitle: {
    color: '#2c3e50',
    marginTop: 0,
    marginBottom: '20px',
    fontSize: '22px'
  },
  cancelBtn: {
    padding: '12px',
    backgroundColor: '#95a5a6',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '15px',
    cursor: 'pointer'
  }
};

export default AdminDashboard;
