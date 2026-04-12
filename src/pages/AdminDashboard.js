import React, { useState, useEffect } from 'react';
import { auth, db } from '../firebase/config';
import { signOut } from 'firebase/auth';
import { collection, addDoc, getDocs, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import RealTimeMonitor from '../components/RealTimeMonitor';
import AnalyticsDashboard from '../components/AnalyticsDashboard';
import ResultsManagement from '../components/ResultsManagement';
import TestCaseManager from '../components/TestCaseManager';
import { resetAndSeedQuestions } from '../utils/questionSeeder';
import { seedDSAQuestions } from '../utils/dsaSeeder';
import { autoCompleteExpiredExams } from '../utils/examCompletion';

function AdminDashboard() {
  const navigate = useNavigate();
  
  // 🔐 Admin Authentication Check
  useEffect(() => {
    const isAdmin = localStorage.getItem('adminAuth');
    if (!isAdmin || isAdmin !== 'true') {
      navigate('/admin');
    }
  }, [navigate]);

  const [tab, setTab] = useState('exams');
  const [exams, setExams] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [firestoreError, setFirestoreError] = useState(false);

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
  const [qMsg, setQMsg] = useState('');
  const [isSeedingquestions, setIsSeeding] = useState(false);
  const [isSeedingDSA, setIsSeedingDSA] = useState(false);

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

  useEffect(() => { fetchExams(); fetchQuestions(); }, []);

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

  // ── SEED DSA QUESTIONS HANDLER ──
  const handleSeedDSA = async () => {
    if (!window.confirm('🧪 This will CLEAR existing DSA questions and seed 5 new comprehensive coding problems with test cases. Continue?')) {
      return;
    }
    
    setIsSeedingDSA(true);
    setQMsg('⏳ Clearing old DSA questions and seeding new ones... Please wait...');
    
    try {
      const result = await seedDSAQuestions(db, true); // Auto-clear enabled
      if (result.success) {
        setQMsg(`✅ ${result.message}`);
        await fetchQuestions(); // Refresh the questions list
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
    const dE = parseInt(dsaEasy) || 0, dM = parseInt(dsaMedium) || 0, dH = parseInt(dsaHard) || 0;

    // Validate availability
    const aptPool = questions.filter(q => q.category === 'Aptitude');
    const corePool = questions.filter(q => q.category === 'Core Subjects');
    const dsaPool = questions.filter(q => q.category === 'DSA');

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
          title: q.title || q.text,
          description: q.description,
          difficulty: q.difficulty,
          category: q.category,
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
          text: q.text,
          options: q.options,
          correct: q.correct,
          difficulty: q.difficulty,
          subject: q.subject,
          round: q.round,
          category: q.category,
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
    setIsQuestionModalOpen(true);
  };

  // Open modal for editing existing question
  const openEditQuestionModal = (q) => {
    // Don't allow editing DSA questions (they have different structure)
    if (q.subject === 'dsa' || q.category === 'DSA' || !q.options) {
      alert('❌ DSA coding questions cannot be edited through this modal. Please delete and re-seed to update.');
      return;
    }
    
    setEditingQuestion(q);
    setQText(q.text);
    setQOptions(q.options || ['', '', '', '']);
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
  
  const handleLogout = async () => {
    localStorage.removeItem('adminAuth');
    localStorage.removeItem('adminEmail');
    await signOut(auth);
    navigate('/admin');
  };

  // Toggle section expansion
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
      <div style={styles.navbar}>
        <div>
          <h2 style={styles.navTitle}>🛠 Admin Dashboard</h2>
          <p style={{margin: 0, fontSize: '12px', color: '#ecf0f1', opacity: 0.8}}>
            🔐 Logged in as: {localStorage.getItem('adminEmail') || 'Admin'}
          </p>
        </div>
        <button style={styles.logoutBtn} onClick={handleLogout}>🚪 Logout</button>
      </div>

      {/* 🔥 FIRESTORE ERROR WARNING */}
      {firestoreError && (
        <div style={styles.errorBanner}>
          <h3 style={{margin: '0 0 10px 0', color: '#e74c3c'}}>
            🔒 Firebase Permission Error
          </h3>
          <p style={{margin: '5px 0', fontSize: '14px'}}>
            <strong>Firestore security rules are blocking database access.</strong>
          </p>
          <p style={{margin: '5px 0', fontSize: '13px'}}>
            Fix this in Firebase Console (2 minutes):
          </p>
          <ol style={{margin: '10px 0', paddingLeft: '20px', fontSize: '13px', lineHeight: '1.6'}}>
            <li>Go to <a href="https://console.firebase.google.com/" target="_blank" rel="noopener noreferrer" style={{color: '#3498db'}}>Firebase Console</a></li>
            <li>Select <code style={{background: '#34495e', padding: '2px 6px', borderRadius: '3px'}}>placement-exam-system</code></li>
            <li>Navigate: <strong>Firestore Database</strong> → <strong>Rules</strong> tab</li>
            <li>Replace all rules with:</li>
          </ol>
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
          <p style={{margin: '10px 0 0 0', fontSize: '13px'}}>
            5. Click <strong style={{color: '#27ae60'}}>Publish</strong> → Refresh this page
          </p>
        </div>
      )}

      {/* Tabs */}
      <div style={styles.tabs}>
        {[
          { key:'exams', label:'📋 Exams' },
          { key:'questions', label:'❓ Question Bank' },
          { key:'monitoring', label:'📡 Live Monitor' },
          { key:'analytics', label:'📈 Analytics' },
          { key:'results', label:'📊 Results' },
        ].map(t => (
          <button key={t.key}
            style={{...styles.tab, ...(tab===t.key ? styles.activeTab : {})}}
            onClick={() => setTab(t.key)}>
            {t.label}
          </button>
        ))}
      </div>

      <div style={styles.content}>
        
        {/* Real-Time Monitoring Tab */}
        {tab === 'monitoring' && <RealTimeMonitor />}
        
        {/* Analytics Dashboard Tab */}
        {tab === 'analytics' && <AnalyticsDashboard />}
        
         {/* Results Management Tab (Enhanced) */}
        {tab === 'results' && <ResultsManagement />}

        {/* ── EXAMS TAB ── */}
        {tab === 'exams' && (
          <>
            {/* Question Bank Summary */}
            <div style={styles.summaryBox}>
              <p style={styles.summaryTitle}>📊 Question Bank Status</p>
              <div style={styles.summaryGrid}>
                <div style={styles.summaryCol}>
                  <strong style={{color:'#3498db'}}>Aptitude</strong>
                  <span style={{color:'#27ae60'}}>Easy: {stats('Aptitude','Easy')}</span>
                  <span style={{color:'#f39c12'}}>Medium: {stats('Aptitude','Medium')}</span>
                  <span style={{color:'#e74c3c'}}>Hard: {stats('Aptitude','Hard')}</span>
                </div>
                <div style={styles.summaryCol}>
                  <strong style={{color:'#9b59b6'}}>Core Subjects</strong>
                  <span style={{color:'#27ae60'}}>Easy: {stats('Core Subjects','Easy')}</span>
                  <span style={{color:'#f39c12'}}>Medium: {stats('Core Subjects','Medium')}</span>
                  <span style={{color:'#e74c3c'}}>Hard: {stats('Core Subjects','Hard')}</span>
                </div>
                <div style={styles.summaryCol}>
                  <strong style={{color:'#9b59b6'}}>DSA (Coding)</strong>
                  <span style={{color:'#27ae60'}}>Easy: {stats('DSA','Easy')}</span>
                  <span style={{color:'#f39c12'}}>Medium: {stats('DSA','Medium')}</span>
                  <span style={{color:'#e74c3c'}}>Hard: {stats('DSA','Hard')}</span>
                </div>
              </div>
            </div>

            {/* Create Exam */}
            <div style={styles.card}>
              <h3 style={styles.cardTitle}>➕ Create New Exam</h3>
              {examMsg && <div style={{
                padding:'10px', borderRadius:'8px', marginBottom:'12px',
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
                <div style={styles.threeCol}>
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
                    <input style={styles.input} type="number" placeholder="30" min="5"
                      value={dsaDuration} onChange={e => setDsaDuration(e.target.value)} required />
                  </div>
                </div>

                {/* Aptitude Questions */}
                <div style={styles.sectionHeader}>📘 Aptitude Questions</div>
                <div style={styles.threeCol}>
                  <div>
                    <label style={{...styles.sublabel, color:'#27ae60'}}>Easy (max {stats('Aptitude','Easy')})</label>
                    <input style={{...styles.input, borderColor:'#27ae60'}} type="number" placeholder="0"
                      value={aptEasy} onChange={e => setAptEasy(e.target.value)} min="0" max={stats('Aptitude','Easy')} />
                  </div>
                  <div>
                    <label style={{...styles.sublabel, color:'#f39c12'}}>Medium (max {stats('Aptitude','Medium')})</label>
                    <input style={{...styles.input, borderColor:'#f39c12'}} type="number" placeholder="0"
                      value={aptMedium} onChange={e => setAptMedium(e.target.value)} min="0" max={stats('Aptitude','Medium')} />
                  </div>
                  <div>
                    <label style={{...styles.sublabel, color:'#e74c3c'}}>Hard (max {stats('Aptitude','Hard')})</label>
                    <input style={{...styles.input, borderColor:'#e74c3c'}} type="number" placeholder="0"
                      value={aptHard} onChange={e => setAptHard(e.target.value)} min="0" max={stats('Aptitude','Hard')} />
                  </div>
                </div>
                {(aptEasy||aptMedium||aptHard) && (
                  <p style={styles.totalPreview}>Aptitude Total: {(parseInt(aptEasy)||0)+(parseInt(aptMedium)||0)+(parseInt(aptHard)||0)} questions</p>
                )}

                {/* Core Subjects Questions */}
                <div style={styles.sectionHeader}>📗 Core Subjects Questions</div>
                <div style={styles.threeCol}>
                  <div>
                    <label style={{...styles.sublabel, color:'#27ae60'}}>Easy (max {stats('Core Subjects','Easy')})</label>
                    <input style={{...styles.input, borderColor:'#27ae60'}} type="number" placeholder="0"
                      value={coreEasy} onChange={e => setCoreEasy(e.target.value)} min="0" max={stats('Core Subjects','Easy')} />
                  </div>
                  <div>
                    <label style={{...styles.sublabel, color:'#f39c12'}}>Medium (max {stats('Core Subjects','Medium')})</label>
                    <input style={{...styles.input, borderColor:'#f39c12'}} type="number" placeholder="0"
                      value={coreMedium} onChange={e => setCoreMedium(e.target.value)} min="0" max={stats('Core Subjects','Medium')} />
                  </div>
                  <div>
                    <label style={{...styles.sublabel, color:'#e74c3c'}}>Hard (max {stats('Core Subjects','Hard')})</label>
                    <input style={{...styles.input, borderColor:'#e74c3c'}} type="number" placeholder="0"
                      value={coreHard} onChange={e => setCoreHard(e.target.value)} min="0" max={stats('Core Subjects','Hard')} />
                  </div>
                </div>
                {(coreEasy||coreMedium||coreHard) && (
                  <p style={styles.totalPreview}>Core Total: {(parseInt(coreEasy)||0)+(parseInt(coreMedium)||0)+(parseInt(coreHard)||0)} questions</p>
                )}

                {/* DSA Questions */}
                <div style={styles.sectionHeader}>🟣 DSA Questions (Coding)</div>
                <div style={styles.threeCol}>
                  <div>
                    <label style={{...styles.sublabel, color:'#27ae60'}}>Easy (max {stats('DSA','Easy')})</label>
                    <input style={{...styles.input, borderColor:'#27ae60'}} type="number" placeholder="0"
                      value={dsaEasy} onChange={e => setDsaEasy(e.target.value)} min="0" max={stats('DSA','Easy')} />
                  </div>
                  <div>
                    <label style={{...styles.sublabel, color:'#f39c12'}}>Medium (max {stats('DSA','Medium')})</label>
                    <input style={{...styles.input, borderColor:'#f39c12'}} type="number" placeholder="0"
                      value={dsaMedium} onChange={e => setDsaMedium(e.target.value)} min="0" max={stats('DSA','Medium')} />
                  </div>
                  <div>
                    <label style={{...styles.sublabel, color:'#e74c3c'}}>Hard (max {stats('DSA','Hard')})</label>
                    <input style={{...styles.input, borderColor:'#e74c3c'}} type="number" placeholder="0"
                      value={dsaHard} onChange={e => setDsaHard(e.target.value)} min="0" max={stats('DSA','Hard')} />
                  </div>
                </div>
                {(dsaEasy||dsaMedium||dsaHard) && (
                  <p style={styles.totalPreview}>DSA Total: {(parseInt(dsaEasy)||0)+(parseInt(dsaMedium)||0)+(parseInt(dsaHard)||0)} questions</p>
                )}

                {/* Total Questions Summary */}
                {(aptEasy||aptMedium||aptHard||coreEasy||coreMedium||coreHard||dsaEasy||dsaMedium||dsaHard) && (
                  <div style={{
                    backgroundColor: '#f0f4f8',
                    padding: '16px',
                    borderRadius: '10px',
                    marginTop: '16px',
                    border: '2px solid #3498db'
                  }}>
                    <strong style={{color: '#2c3e50', fontSize: '16px'}}>📊 Total Exam Questions: {(
                      (parseInt(aptEasy)||0)+(parseInt(aptMedium)||0)+(parseInt(aptHard)||0)+
                      (parseInt(coreEasy)||0)+(parseInt(coreMedium)||0)+(parseInt(coreHard)||0)+
                      (parseInt(dsaEasy)||0)+(parseInt(dsaMedium)||0)+(parseInt(dsaHard)||0)
                    )}</strong>
                  </div>
                )}

                <button style={styles.addBtn} type="submit">🚀 Create Exam & Auto-Select Questions</button>
              </form>
            </div>

            {/* All Exams */}
            <div style={styles.card}>
              <h3 style={styles.cardTitle}>📋 All Exams ({exams.length})</h3>
              {exams.length === 0 ? <p style={{color:'#7f8c8d'}}>No exams yet.</p> : exams.map(exam => (
                <div key={exam.id} style={styles.examRow}>
                  <div style={{flex:1}}>
                    <div style={{display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px'}}>
                      <strong style={{fontSize:'16px'}}>{exam.title}</strong>
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
                  <div style={{display: 'flex', gap: '8px', alignItems: 'center'}}>
                    <button 
                      style={{...styles.editBtn, padding: '8px 16px', fontSize: '14px'}} 
                      onClick={() => navigate(`/admin/exam/${exam.id}`)}
                    >
                      👁 View
                    </button>
                    {exam.status !== 'completed' && (
                      <>
                        <button 
                          style={{...styles.editBtn, padding: '8px 16px', fontSize: '14px', backgroundColor: '#3498db'}} 
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
                      <span style={{color: '#95a5a6', fontSize: '12px', fontStyle: 'italic'}}>
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
              padding:'12px', borderRadius:'10px', marginBottom:'15px',
              backgroundColor: qMsg.startsWith('✅') ? '#eafaf1' : '#fdecea',
              color: qMsg.startsWith('✅') ? '#27ae60' : '#e74c3c',
              fontSize: '14px', fontWeight: 'bold', textAlign: 'center'
            }}>{qMsg}</div>}

            {/* ======== ROUND 1: APTITUDE ======== */}
            <div style={styles.roundCard}>
              <h2 style={styles.roundTitle}>📘 Round 1 - Aptitude</h2>
              
              {/* Easy */}
              <div style={styles.diffSection}>
                <div style={{...styles.diffHeader, backgroundColor: '#eafaf1', borderLeft: '4px solid #27ae60'}}
                     onClick={() => toggleSection('round1_easy')}>
                  <span style={{fontWeight: 'bold', color: '#27ae60'}}>✅ EASY</span>
                  <span style={styles.badge}>{getQuestions('round1', 'easy').length} questions</span>
                </div>
                {expandedSections.round1_easy && (
                  <div style={styles.questionList}>
                    {getQuestions('round1', 'easy').length === 0 ? (
                      <p style={styles.emptyText}>No easy aptitude questions yet</p>
                    ) : getQuestions('round1', 'easy').map(q => (
                      <div key={q.id} style={styles.qCard}>
                        <div style={{flex: 1}}>
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
                        <div style={{display: 'flex', gap: '5px'}}>
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
                <div style={{...styles.diffHeader, backgroundColor: '#fef9e7', borderLeft: '4px solid #f39c12'}}
                     onClick={() => toggleSection('round1_medium')}>
                  <span style={{fontWeight: 'bold', color: '#f39c12'}}>⚠️ MEDIUM</span>
                  <span style={styles.badge}>{getQuestions('round1', 'medium').length} questions</span>
                </div>
                {expandedSections.round1_medium && (
                  <div style={styles.questionList}>
                    {getQuestions('round1', 'medium').length === 0 ? (
                      <p style={styles.emptyText}>No medium aptitude questions yet</p>
                    ) : getQuestions('round1', 'medium').map(q => (
                      <div key={q.id} style={styles.qCard}>
                        <div style={{flex: 1}}>
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
                        <div style={{display: 'flex', gap: '5px'}}>
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
                <div style={{...styles.diffHeader, backgroundColor: '#fdecea', borderLeft: '4px solid #e74c3c'}}
                     onClick={() => toggleSection('round1_hard')}>
                  <span style={{fontWeight: 'bold', color: '#e74c3c'}}>🔥 HARD</span>
                  <span style={styles.badge}>{getQuestions('round1', 'hard').length} questions</span>
                </div>
                {expandedSections.round1_hard && (
                  <div style={styles.questionList}>
                    {getQuestions('round1', 'hard').length === 0 ? (
                      <p style={styles.emptyText}>No hard aptitude questions yet</p>
                    ) : getQuestions('round1', 'hard').map(q => (
                      <div key={q.id} style={styles.qCard}>
                        <div style={{flex: 1}}>
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
                        <div style={{display: 'flex', gap: '5px'}}>
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
            <div style={styles.roundCard}>
              <h2 style={styles.roundTitle}>📗 Round 2 - Core Subjects</h2>
              <p style={{color: '#7f8c8d', fontSize: '13px', marginTop: '-5px'}}>OS • CN • DBMS</p>
              
              {['easy', 'medium', 'hard'].map(diff => (
                <div key={diff} style={styles.diffSection}>
                  <div style={{
                    ...styles.diffHeader, 
                    backgroundColor: diff === 'easy' ? '#eafaf1' : diff === 'medium' ? '#fef9e7' : '#fdecea',
                    borderLeft: `4px solid ${diffColor[diff]}`
                  }}
                       onClick={() => toggleSection(`round2_${diff}`)}>
                    <span style={{fontWeight: 'bold', color: diffColor[diff]}}>
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
                          <div key={sub} style={{marginBottom: '15px'}}>
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
                                <div style={{flex: 1}}>
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
                                <div style={{display: 'flex', gap: '5px'}}>
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
                              <strong>{q.title || q.text}</strong>
                              {q.points && <span style={{marginLeft: '10px', color: '#3498db'}}>({q.points} points)</span>}
                            </p>
                            <p style={{fontSize: '13px', color: '#555', margin: '8px 0'}}>
                              {q.description?.substring(0, 150)}{q.description?.length > 150 ? '...' : ''}
                            </p>
                            <div style={{fontSize: '12px', color: '#7f8c8d', marginTop: '8px', display: 'flex', gap: '16px'}}>
                              <span>✅ {(q.testCases?.filter(tc => !tc.hidden) || []).length} visible test cases</span>
                              <span>🔒 {(q.testCases?.filter(tc => tc.hidden) || []).length} hidden test cases</span>
                              <span>📊 Total: {(q.testCases || []).length} cases</span>
                            </div>
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
                          style={{...styles.diffBtn, backgroundColor: qDifficulty===d ? diffColor[d] : '#ecf0f1', color: qDifficulty===d ? 'white' : '#333'}}
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
                      <input key={i} style={styles.input} type="text" placeholder={`Option ${i+1}`}
                        value={opt} onChange={e => { const o = [...qOptions]; o[i] = e.target.value; setQOptions(o); }} required />
                    ))}
                    
                    <label style={styles.label}>Correct Answer:</label>
                    <select style={styles.input} value={qCorrect} onChange={e => setQCorrect(e.target.value)} required>
                      <option value="">-- Select correct option --</option>
                      {qOptions.map((opt, i) => opt && <option key={i} value={opt}>Option {i+1}: {opt}</option>)}
                    </select>

                    <div style={{display: 'flex', gap: '10px', marginTop: '20px'}}>
                      <button style={{...styles.addBtn, flex: 1}} type="submit">
                        {editingQuestion ? '💾 Update Question' : '➕ Add Question'}
                      </button>
                      <button style={{...styles.cancelBtn, flex: 1}} type="button" onClick={() => setIsQuestionModalOpen(false)}>
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
    </div>
  );
}

const styles = {
  container: { minHeight:'100vh', backgroundColor:'#f0f4f8' },
  navbar: { 
    backgroundColor:'#2c3e50', 
    padding:'15px 30px', 
    display:'flex', 
    justifyContent:'space-between', 
    alignItems:'center',
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100%',
    zIndex: 1000,
    boxSizing: 'border-box'
  },
  navTitle: { color:'white', margin:0 },
  logoutBtn: { backgroundColor:'#e74c3c', color:'white', border:'none', padding:'8px 16px', borderRadius:'6px', cursor:'pointer' },
  tabs: { 
    display:'flex', 
    backgroundColor:'white', 
    borderBottom:'2px solid #eee',
    marginTop: '70px',
    position: 'sticky',
    top: '70px',
    zIndex: 900
  },
  tab: { padding:'14px 25px', border:'none', backgroundColor:'transparent', cursor:'pointer', fontSize:'15px', color:'#7f8c8d' },
  activeTab: { color:'#3498db', borderBottom:'3px solid #3498db', fontWeight:'bold' },
  content: { padding:'25px', maxWidth:'860px', margin:'0 auto' },
  summaryBox: { backgroundColor:'white', padding:'15px 20px', borderRadius:'10px', marginBottom:'20px', boxShadow:'0 2px 8px rgba(0,0,0,0.08)' },
  summaryTitle: { fontWeight:'bold', color:'#2c3e50', marginBottom:'12px', marginTop:0 },
  summaryGrid: { display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'15px' },
  summaryCol: { display:'flex', flexDirection:'column', gap:'4px', fontSize:'13px' },
  card: { backgroundColor:'white', padding:'25px', borderRadius:'12px', boxShadow:'0 2px 10px rgba(0,0,0,0.08)', marginBottom:'20px' },
  cardTitle: { color:'#2c3e50', marginTop:0, marginBottom:'20px' },
  label: { display:'block', fontWeight:'bold', color:'#2c3e50', marginBottom:'5px', marginTop:'10px', fontSize:'14px' },
  sublabel: { display:'block', fontWeight:'bold', marginBottom:'4px', fontSize:'13px' },
  input: { width:'100%', padding:'10px', marginBottom:'10px', borderRadius:'8px', border:'1px solid #ddd', fontSize:'14px', boxSizing:'border-box' },
  textarea: { width:'100%', padding:'10px', marginBottom:'10px', borderRadius:'8px', border:'1px solid #ddd', fontSize:'14px', boxSizing:'border-box', minHeight:'80px' },
  sectionHeader: { backgroundColor:'#f0f4f8', padding:'8px 12px', borderRadius:'6px', fontWeight:'bold', color:'#2c3e50', marginBottom:'10px', marginTop:'5px', fontSize:'14px' },
  twoCol: { display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px', marginBottom:'5px' },
  threeCol: { display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'12px', marginBottom:'5px' },
  totalPreview: { textAlign:'center', fontWeight:'bold', color:'#3498db', fontSize:'14px', marginBottom:'10px', marginTop:0 },
  addBtn: { width:'100%', padding:'12px', backgroundColor:'#27ae60', color:'white', border:'none', borderRadius:'8px', fontSize:'15px', cursor:'pointer', marginTop:'5px' },
  examRow: { display:'flex', justifyContent:'space-between', alignItems:'flex-start', padding:'14px', borderBottom:'1px solid #eee', gap:'10px' },
  examMeta: { color:'#7f8c8d', margin:'3px 0', fontSize:'13px' },
  deleteBtn: { backgroundColor:'#e74c3c', color:'white', border:'none', padding:'6px 12px', borderRadius:'6px', cursor:'pointer', flexShrink:0 },
  diffRow: { display:'flex', gap:'10px', marginBottom:'12px' },
  diffBtn: { flex:1, padding:'10px', border:'none', borderRadius:'8px', cursor:'pointer', fontWeight:'bold' },
  diffBadge: { color:'white', padding:'2px 8px', borderRadius:'10px', fontSize:'11px', marginRight:'6px', fontWeight:'bold' },
  catBadge: { backgroundColor:'#3498db', color:'white', padding:'2px 8px', borderRadius:'10px', fontSize:'11px', marginRight:'8px' },
  qRow: { display:'flex', alignItems:'center', padding:'10px', borderBottom:'1px solid #eee', gap:'10px' },
  bankSummaryGrid: { display:'flex', gap:'20px', marginBottom:'15px', flexWrap:'wrap' },
  bankCat: { display:'flex', gap:'8px', alignItems:'center', fontSize:'13px', fontWeight:'bold', flexWrap:'wrap' },
  resultRow: { display:'flex', alignItems:'flex-start', padding:'14px', borderBottom:'1px solid #eee', gap:'12px' },
  roundScore: { backgroundColor:'#f0f4f8', padding:'3px 10px', borderRadius:'12px', fontSize:'12px', color:'#2c3e50' },
  pctBadge: { color:'white', fontWeight:'bold', fontSize:'16px', padding:'8px 12px', borderRadius:'8px', minWidth:'50px', textAlign:'center', flexShrink:0 },
  errorBanner: { 
    backgroundColor:'#ffe6e6', 
    border:'2px solid #e74c3c', 
    borderRadius:'12px', 
    padding:'20px', 
    margin:'20px auto', 
    maxWidth:'800px',
    color:'#2c3e50'
  },
  codeBlock: { 
    backgroundColor:'#2c3e50', 
    color:'#ecf0f1', 
    padding:'15px', 
    borderRadius:'8px', 
    overflow:'auto', 
    fontSize:'12px',
    fontFamily:'Consolas, Monaco, monospace',
    margin:'10px 0'
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
