import React, { useState, useEffect } from 'react';
import { auth, db } from '../firebase/config';
import { signOut } from 'firebase/auth';
import { collection, addDoc, getDocs, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { useNavigate, useSearchParams } from 'react-router-dom';
import RealTimeMonitor from '../components/RealTimeMonitor';
import AnalyticsDashboard from '../components/AnalyticsDashboard';
import ResultsManagement from '../components/ResultsManagement';
import AdminSidebar from '../components/AdminSidebar';
import { resetAndSeedQuestions } from '../utils/questionSeeder';
import { autoCompleteExpiredExams } from '../utils/examCompletion';

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
  const [submissionsCount, setSubmissionsCount] = useState(0);
  const [firestoreError, setFirestoreError] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);

  // Question modal state (unified add/edit)
  const [isQuestionModalOpen, setIsQuestionModalOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState(null);

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

  // Round-wise question counts
  const [aptEasy, setAptEasy] = useState('');
  const [aptMedium, setAptMedium] = useState('');
  const [aptHard, setAptHard] = useState('');
  const [coreEasy, setCoreEasy] = useState('');
  const [coreMedium, setCoreMedium] = useState('');
  const [coreHard, setCoreHard] = useState('');

  const [examMsg, setExamMsg] = useState('');

  // Question form
  const [qText, setQText] = useState('');
  const [qOptions, setQOptions] = useState(['', '', '', '']);
  const [qCorrect, setQCorrect] = useState('');
  const [qDifficulty, setQDifficulty] = useState('easy');
  const [qRound, setQRound] = useState('round1');
  const [qSubject, setQSubject] = useState('aptitude');
  const [qMsg, setQMsg] = useState('');
  const [isSeedingquestions, setIsSeeding] = useState(false);

  const fetchExams = async () => {
    try {
      // Auto-complete expired exams before fetching
      await autoCompleteExpiredExams();

      const snap = await getDocs(collection(db, 'exams'));
      setExams(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setFirestoreError(false);
    } catch (error) {
      console.error('Firestore Error:', error);
      setFirestoreError(true);
    }
  };
  const fetchQuestions = async () => {
    try {
      const snap = await getDocs(collection(db, 'questions'));
      setQuestions(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setFirestoreError(false);
    } catch (error) {
      console.error('Firestore Error:', error);
      setFirestoreError(true);
    }
  };

  const fetchSubmissionsCount = async () => {
    try {
      const snap = await getDocs(collection(db, 'submissions'));
      setSubmissionsCount(snap.docs.length);
    } catch (error) {
      console.error('Error fetching submissions count:', error);
    }
  };

  useEffect(() => { 
    fetchExams(); 
    fetchQuestions(); 
    fetchSubmissionsCount();
  }, []);

  // ── SEED QUESTIONS HANDLER ──
  const handleSeedQuestions = async () => {
    if (!window.confirm('⚠️ This will DELETE all existing questions and seed with 99 fresh placement exam questions. Continue?')) {
      return;
    }

    setIsSeeding(true);
    setQMsg('⏳ Seeding questions... Please wait...');

    try {
      const result = await resetAndSeedQuestions();
      setQMsg(`✅ Successfully seeded ${result.count} questions! Refresh the page to see them.`);
      await fetchQuestions(); // Refresh the questions list
      setTimeout(() => setQMsg(''), 5000);
    } catch (error) {
      console.error('Seed error:', error);
      setQMsg('❌ Failed to seed questions: ' + error.message);
      setTimeout(() => setQMsg(''), 5000);
    } finally {
      setIsSeeding(false);
    }
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

  // ── PICK QUESTIONS ROUND-WISE ──
  const pickQuestions = (category, easy, medium, hard) => {
    const pool = questions.filter(q => q.category === category);
    const easyQs = pool.filter(q => q.difficulty === 'Easy');
    const mediumQs = pool.filter(q => q.difficulty === 'Medium');
    const hardQs = pool.filter(q => q.difficulty === 'Hard');
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

    // Validate availability
    const aptPool = questions.filter(q => q.category === 'Aptitude');
    const corePool = questions.filter(q => q.category === 'Core Subjects');

    const check = (pool, label, e, m, h) => {
      const avE = pool.filter(q => q.difficulty === 'Easy').length;
      const avM = pool.filter(q => q.difficulty === 'Medium').length;
      const avH = pool.filter(q => q.difficulty === 'Hard').length;
      if (avE < e) return `❌ ${label}: need ${e} Easy, only ${avE} available.`;
      if (avM < m) return `❌ ${label}: need ${m} Medium, only ${avM} available.`;
      if (avH < h) return `❌ ${label}: need ${h} Hard, only ${avH} available.`;
      return null;
    };

    const aptErr = check(aptPool, 'Aptitude', aE, aM, aH);
    if (aptErr) { setExamMsg(aptErr); return; }
    const coreErr = check(corePool, 'Core Subjects', cE, cM, cH);
    if (coreErr) { setExamMsg(coreErr); return; }

    if (!startTime) { setExamMsg('❌ Please set an exam start time.'); return; }

    const aptQs = pickQuestions('Aptitude', aE, aM, aH);
    const coreQs = pickQuestions('Core Subjects', cE, cM, cH);
    const allQs = [...aptQs, ...coreQs];

    // ✅ Create question snapshot with full details (immutable)
    const questionSet = allQs.map(q => ({
      questionId: q.id,
      text: q.text,
      options: q.options,
      correct: q.correct,
      difficulty: q.difficulty,
      subject: q.subject,
      round: q.round,
      category: q.category
    }));

    try {
      await addDoc(collection(db, 'exams'), {
        title: examTitle,
        examCode: examCode.toUpperCase(),
        startTime: new Date(startTime),
        status: 'active', // ✅ New status field
        roundDurations: {
          aptitude: parseInt(aptDuration) || 30,
          core: parseInt(coreDuration) || 30,
        },
        questionConfig: {
          aptitude: { easy: aE, medium: aM, hard: aH },
          core: { easy: cE, medium: cM, hard: cH },
        },
        totalQuestions: allQs.length,
        questions: allQs, // Keep for backward compatibility
        questionSet: questionSet, // ✅ Immutable question snapshot
        createdAt: new Date(),
      });
      setExamMsg(`✅ Exam created! ${aptQs.length} Aptitude + ${coreQs.length} Core questions auto-selected.`);
      // Reset form
      setExamTitle(''); setExamCode(''); setStartTime('');
      setAptDuration('30'); setCoreDuration('30');
      setAptEasy(''); setAptMedium(''); setAptHard('');
      setCoreEasy(''); setCoreMedium(''); setCoreHard('');
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
    setIsQuestionModalOpen(true);
  };

  // Open modal for editing existing question
  const openEditQuestionModal = (q) => {
    setEditingQuestion(q);
    setQText(q.text);
    setQOptions(q.options);
    setQCorrect(q.correct);
    setQDifficulty(q.difficulty?.toLowerCase() || 'easy');
    setQRound(q.round || mapCategoryToRound(q.category));
    setQSubject(q.subject || (q.category === 'Aptitude' ? 'aptitude' : q.category === 'DSA' ? 'dsa' : 'os'));
    setIsQuestionModalOpen(true);
  };

  // Save question (add or update)
  const handleSaveQuestion = async (e) => {
    e.preventDefault();
    if (!qCorrect) { setQMsg('❌ Please select the correct answer!'); return; }
    if (qOptions.some(o => !o.trim())) { setQMsg('❌ Please fill all 4 options.'); return; }

    try {
      const questionData = {
        text: qText,
        options: qOptions,
        correct: qCorrect,
        difficulty: qDifficulty,
        round: qRound,
        subject: qSubject,
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
    // Safety check: find exam and verify it's not completed
    const exam = exams.find(e => e.id === id);
    if (exam?.status === 'completed') {
      alert('❌ Cannot delete completed exams! Completed exams are locked for audit purposes.');
      return;
    }

    if (!window.confirm('Are you sure you want to delete this exam?')) {
      return;
    }

    try {
      await deleteDoc(doc(db, 'exams', id));
      fetchExams();
    } catch (err) {
      if (err.code === 'permission-denied') setFirestoreError(true);
      alert('Error deleting exam: ' + err.message);
    }
  };
  const handleDeleteQuestion = async (id) => {
    try {
      await deleteDoc(doc(db, 'questions', id));
      fetchQuestions();
    } catch (err) {
      if (err.code === 'permission-denied') setFirestoreError(true);
      alert('Error deleting question: ' + err.message);
    }
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

  // Question bank stats per category (for old system compatibility)
  const stats = (cat, diff) => questions.filter(q => q.category === cat && q.difficulty === diff).length;

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
            {tab === 'monitoring' && <RealTimeMonitor />}

            {/* ── ANALYTICS TAB ── */}
            {tab === 'analytics' && <AnalyticsDashboard />}

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

                {/* 📊 Quick Stats Overview */}
                <div style={{ ...styles.summaryGrid, marginBottom: '40px' }}>
                  <div className="admin-summary-card" style={styles.summaryCol}>
                    <div style={{ color: '#64748b', fontSize: '13px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px' }}>Active Exams</div>
                    <div style={{ fontSize: '28px', fontWeight: '900', color: '#1e293b' }}>{exams.filter(e => e.status !== 'completed').length}</div>
                    <div style={{ fontSize: '12px', color: '#22c55e', fontWeight: 'bold' }}>
                      +{exams.filter(e => {
                        const day = new Date().setHours(0,0,0,0);
                        const eDate = e.startTime?.toDate ? e.startTime.toDate() : new Date(e.startTime);
                        return eDate >= day;
                      }).length} Scheduled Today
                    </div>
                  </div>
                  <div className="admin-summary-card" style={styles.summaryCol}>
                    <div style={{ color: '#64748b', fontSize: '13px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px' }}>Total Questions</div>
                    <div style={{ fontSize: '28px', fontWeight: '900', color: '#1e293b' }}>{questions.length}</div>
                    <div style={{ fontSize: '12px', color: '#8b5cf6', fontWeight: 'bold' }}>Across {new Set(questions.map(q => q.category)).size} Categories</div>
                  </div>
                  <div className="admin-summary-card" style={styles.summaryCol}>
                    <div style={{ color: '#64748b', fontSize: '13px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px' }}>Candidates Evaluated</div>
                    <div style={{ fontSize: '28px', fontWeight: '900', color: '#1e293b' }}>{submissionsCount}</div>
                    <div style={{ fontSize: '12px', color: '#3498db', fontWeight: 'bold' }}>Live Submission Data</div>
                  </div>
                </div>

                <h2 style={{ fontSize: '20px', color: '#1e293b', marginBottom: '20px' }}>📈 Performance Analytics Overview</h2>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px', marginBottom: '40px' }}>
                  {/* CSS Graph 1: Performance Trend */}
                  <div className="admin-static-card" style={{ ...styles.card, padding: '25px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' }}>
                      <h3 style={{ margin: 0, fontSize: '16px', color: '#1e293b' }}>Performance Trend (Last 7 Days)</h3>
                      <span style={{ fontSize: '12px', color: '#22c55e', fontWeight: 'bold' }}>↑ 12.5%</span>
                    </div>
                    <div style={{ height: '180px', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', padding: '0 10px', position: 'relative' }}>
                      {/* Grid Lines */}
                      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '1px', background: '#f1f5f9' }} />
                      <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: '1px', background: '#f1f5f9' }} />
                      
                      {/* Bars */}
                      {[40, 65, 45, 80, 55, 90, 75].map((val, i) => (
                        <div key={i} style={{ width: '30px', backgroundColor: i === 5 ? '#0062ff' : '#e2e8f0', height: `${val}%`, borderRadius: '6px 6px 0 0', position: 'relative', transition: 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)', cursor: 'pointer' }} className="bar-hover">
                          <div className="bar-tooltip">{val}%</div>
                        </div>
                      ))}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '15px', padding: '0 5px' }}>
                      {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
                        <span key={i} style={{ fontSize: '11px', color: '#64748b', fontWeight: 'bold' }}>{d}</span>
                      ))}
                    </div>
                  </div>

                  {/* CSS Graph 2: Distribution Donut */}
                  <div className="admin-static-card" style={{ ...styles.card, padding: '25px', display: 'flex', flexDirection: 'column' }}>
                    <h3 style={{ margin: '0 0 25px 0', fontSize: '16px', color: '#1e293b' }}>Evaluation Distribution</h3>
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-around' }}>
                      <div style={{ width: '150px', height: '150px', borderRadius: '50%', background: 'conic-gradient(#22c55e 0% 45%, #f59e0b 45% 75%, #ef4444 75% 100%)', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)' }}>
                        <div style={{ width: '90px', height: '90px', backgroundColor: 'white', borderRadius: '50%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                          <span style={{ fontSize: '20px', fontWeight: '900', color: '#1e293b' }}>{submissionsCount}</span>
                          <span style={{ fontSize: '9px', fontWeight: 'bold', color: '#64748b' }}>TOTAL</span>
                        </div>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#22c55e' }} />
                          <span style={{ fontSize: '12px', color: '#64748b' }}>Selected (45%)</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#f59e0b' }} />
                          <span style={{ fontSize: '12px', color: '#64748b' }}>Pending (30%)</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ef4444' }} />
                          <span style={{ fontSize: '12px', color: '#64748b' }}>Rejected (25%)</span>
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

                {/* ➕ Quick Create Exam Trigger */}
                <div 
                  className="admin-card" 
                  style={{...styles.card, border: '2px dashed #0062ff', background: '#f8fbff', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '140px', marginBottom: '30px'}}
                  onClick={() => setShowCreateForm(true)}
                >
                  <div style={{fontSize: '36px', color: '#0062ff', marginBottom: '8px'}}>➕</div>
                  <div style={{fontWeight: '900', color: '#0062ff', fontSize: '18px'}}>Create New Exam</div>
                  <div style={{fontSize: '12px', color: '#64748b', marginTop: '4px'}}>Configure durations and select questions from the bank below</div>
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
                        <label style={{ ...styles.sublabel, color: '#27ae60' }}>Easy (max {stats('Core Subjects', 'Easy')})</label>
                        <input style={{ ...styles.input, borderColor: '#27ae60' }} type="number" placeholder="0"
                          value={coreEasy} onChange={e => setCoreEasy(e.target.value)} min="0" max={stats('Core Subjects', 'Easy')} />
                      </div>
                      <div>
                        <label style={{ ...styles.sublabel, color: '#f39c12' }}>Medium (max {stats('Core Subjects', 'Medium')})</label>
                        <input style={{ ...styles.input, borderColor: '#f39c12' }} type="number" placeholder="0"
                          value={coreMedium} onChange={e => setCoreMedium(e.target.value)} min="0" max={stats('Core Subjects', 'Medium')} />
                      </div>
                      <div>
                        <label style={{ ...styles.sublabel, color: '#e74c3c' }}>Hard (max {stats('Core Subjects', 'Hard')})</label>
                        <input style={{ ...styles.input, borderColor: '#e74c3c' }} type="number" placeholder="0"
                          value={coreHard} onChange={e => setCoreHard(e.target.value)} min="0" max={stats('Core Subjects', 'Hard')} />
                      </div>
                    </div>
                    {(coreEasy || coreMedium || coreHard) && (
                      <p style={styles.totalPreview}>Core Total: {(parseInt(coreEasy) || 0) + (parseInt(coreMedium) || 0) + (parseInt(coreHard) || 0)} questions</p>
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
                          📝 {exam.totalQuestions || 0} questions
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
                        {exam.status !== 'completed' && (
                          <>
                            <button
                              style={{ ...styles.editBtn, padding: '8px 16px', fontSize: '14px', backgroundColor: '#3498db' }}
                              onClick={() => navigate(`/admin/exam/${exam.id}/edit`)}
                            >
                              ✏️ Edit
                            </button>
                            <button
                              style={styles.deleteBtn}
                              onClick={() => handleDeleteExam(exam.id)}
                            >
                              🗑 Delete
                            </button>
                          </>
                        )}
                        {exam.status === 'completed' && (
                          <span style={{ color: '#95a5a6', fontSize: '12px', fontStyle: 'italic' }}>
                            (Locked - Completed)
                          </span>
                        )}
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
                <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h2 style={{ margin: 0, color: '#2c3e50' }}>📚 Question Bank</h2>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                      style={{ ...styles.addBtn, width: 'auto', padding: '10px 20px', backgroundColor: '#e74c3c' }}
                      onClick={handleSeedQuestions}
                      disabled={isSeedingquestions}
                    >
                      {isSeedingquestions ? '⏳ Seeding...' : '🌱 Seed 99 Questions'}
                    </button>
                    <button style={{ ...styles.addBtn, width: 'auto', padding: '10px 20px' }} onClick={openAddQuestionModal}>
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
                <div className="admin-static-card" style={styles.roundCard}>
                  <h2 style={styles.roundTitle}>📕 Round 3 - DSA (Coding)</h2>

                  {['easy', 'medium', 'hard'].map(diff => (
                    <div key={diff} style={styles.diffSection}>
                      <div style={{
                        ...styles.diffHeader,
                        backgroundColor: diff === 'easy' ? '#eafaf1' : diff === 'medium' ? '#fef9e7' : '#fdecea',
                        borderLeft: `4px solid ${diffColor[diff]}`
                      }}
                        onClick={() => toggleSection(`round3_${diff}`)}>
                        <span style={{ fontWeight: 'bold', color: diffColor[diff] }}>
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
                          <optgroup label="Round 1">
                            <option value="aptitude">Aptitude</option>
                          </optgroup>
                          <optgroup label="Round 2">
                            <option value="os">Operating System (OS)</option>
                            <option value="cn">Computer Networks (CN)</option>
                            <option value="dbms">Database Management (DBMS)</option>
                          </optgroup>
                          <optgroup label="Round 3">
                            <option value="dsa">Data Structures & Algorithms (DSA)</option>
                          </optgroup>
                        </select>

                        <label style={styles.label}>Question Text</label>
                        <textarea style={styles.textarea} placeholder="Enter question text..."
                          value={qText} onChange={e => setQText(e.target.value)} required />

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
