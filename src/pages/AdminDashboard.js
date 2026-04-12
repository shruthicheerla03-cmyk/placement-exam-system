import React, { useState, useEffect } from 'react';
import { auth, db } from '../firebase/config';
import { signOut } from 'firebase/auth';
import { collection, addDoc, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';

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
  const [submissions, setSubmissions] = useState([]);
  const [firestoreError, setFirestoreError] = useState(false);

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
  const [qDifficulty, setQDifficulty] = useState('Easy');
  const [qCategory, setQCategory] = useState('Aptitude');
  const [qMsg, setQMsg] = useState('');

  const fetchExams = async () => {
    try {
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
  const fetchSubmissions = async () => {
    try {
      const snap = await getDocs(collection(db, 'submissions'));
      setSubmissions(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setFirestoreError(false);
    } catch (error) {
      console.error('Firestore Error:', error);
      setFirestoreError(true);
    }
  };

  useEffect(() => { fetchExams(); fetchQuestions(); fetchSubmissions(); }, []);

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

    try {
      await addDoc(collection(db, 'exams'), {
        title: examTitle,
        examCode: examCode.toUpperCase(),
        startTime: new Date(startTime),
        roundDurations: {
          aptitude: parseInt(aptDuration) || 30,
          core: parseInt(coreDuration) || 30,
        },
        questionConfig: {
          aptitude: { easy: aE, medium: aM, hard: aH },
          core: { easy: cE, medium: cM, hard: cH },
        },
        totalQuestions: allQs.length,
        questions: allQs,
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

  const handleAddQuestion = async (e) => {
    e.preventDefault();
    if (!qCorrect) { setQMsg('❌ Please select the correct answer!'); return; }
    if (qOptions.some(o => !o.trim())) { setQMsg('❌ Please fill all 4 options.'); return; }
    try {
      await addDoc(collection(db, 'questions'), {
        text: qText,
        options: qOptions,
        correct: qCorrect,
        difficulty: qDifficulty,
        category: qCategory,
        createdAt: new Date(),
      });
      setQMsg(`✅ ${qDifficulty} ${qCategory} question added!`);
      setQText(''); setQOptions(['', '', '', '']); setQCorrect(''); setQDifficulty('Easy');
      fetchQuestions();
    } catch (err) { 
      setQMsg('❌ Error adding question.');
      if (err.code === 'permission-denied') setFirestoreError(true);
    }
  };

  const handleDeleteExam = async (id) => { 
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

  const diffColor = { Easy: '#27ae60', Medium: '#f39c12', Hard: '#e74c3c' };

  // Question bank stats per category
  const stats = (cat, diff) => questions.filter(q => q.category === cat && q.difficulty === diff).length;

  // Submissions grouped by exam
  const getExamTitle = (id) => exams.find(e => e.id === id)?.title || id;

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
          { key:'results', label:'📊 Results' },
        ].map(t => (
          <button key={t.key}
            style={{...styles.tab, ...(tab===t.key ? styles.activeTab : {})}}
            onClick={() => { setTab(t.key); if (t.key==='results') fetchSubmissions(); }}>
            {t.label}
          </button>
        ))}
      </div>

      <div style={styles.content}>

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
                  <strong style={{color:'#e67e22'}}>DSA</strong>
                  <span style={{color:'#666'}}>Coming soon</span>
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

                <button style={styles.addBtn} type="submit">🚀 Create Exam & Auto-Select Questions</button>
              </form>
            </div>

            {/* All Exams */}
            <div style={styles.card}>
              <h3 style={styles.cardTitle}>📋 All Exams ({exams.length})</h3>
              {exams.length === 0 ? <p style={{color:'#7f8c8d'}}>No exams yet.</p> : exams.map(exam => (
                <div key={exam.id} style={styles.examRow}>
                  <div style={{flex:1}}>
                    <strong style={{fontSize:'16px'}}>{exam.title}</strong>
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
                  <button style={styles.deleteBtn} onClick={() => handleDeleteExam(exam.id)}>Delete</button>
                </div>
              ))}
            </div>
          </>
        )}

        {/* ── QUESTION BANK TAB ── */}
        {tab === 'questions' && (
          <>
            <div style={styles.card}>
              <h3 style={styles.cardTitle}>➕ Add Question to Bank</h3>
              {qMsg && <div style={{
                padding:'10px', borderRadius:'8px', marginBottom:'12px',
                backgroundColor: qMsg.startsWith('✅') ? '#eafaf1' : '#fdecea',
                color: qMsg.startsWith('✅') ? '#27ae60' : '#e74c3c',
              }}>{qMsg}</div>}
              <form onSubmit={handleAddQuestion}>
                <label style={styles.label}>Category</label>
                <select style={styles.input} value={qCategory} onChange={e => setQCategory(e.target.value)}>
                  <option>Aptitude</option>
                  <option>Core Subjects</option>
                  <option>DSA</option>
                </select>
                <label style={styles.label}>Question Text</label>
                <textarea style={styles.textarea} placeholder="Enter question text..."
                  value={qText} onChange={e => setQText(e.target.value)} required />
                <label style={styles.label}>Enter 4 Options:</label>
                {qOptions.map((opt, i) => (
                  <input key={i} style={styles.input} type="text" placeholder={`Option ${i+1}`}
                    value={opt} onChange={e => { const o = [...qOptions]; o[i] = e.target.value; setQOptions(o); }} required />
                ))}
                <label style={styles.label}>Correct Answer:</label>
                <select style={styles.input} value={qCorrect} onChange={e => setQCorrect(e.target.value)} required>
                  <option value="">-- Select correct option --</option>
                  {qOptions.map((opt, i) => opt && <option key={i} value={opt}>Option {i+1}: {opt}</option>)}
                </select>
                <label style={styles.label}>Difficulty:</label>
                <div style={styles.diffRow}>
                  {['Easy', 'Medium', 'Hard'].map(d => (
                    <button key={d} type="button"
                      style={{...styles.diffBtn, backgroundColor: qDifficulty===d ? diffColor[d] : '#ecf0f1', color: qDifficulty===d ? 'white' : '#333'}}
                      onClick={() => setQDifficulty(d)}>{d}</button>
                  ))}
                </div>
                <button style={styles.addBtn} type="submit">Add Question ➕</button>
              </form>
            </div>

            <div style={styles.card}>
              <h3 style={styles.cardTitle}>📚 All Questions ({questions.length})</h3>
              <div style={styles.bankSummaryGrid}>
                {['Aptitude', 'Core Subjects', 'DSA'].map(cat => (
                  <div key={cat} style={styles.bankCat}>
                    <strong>{cat}</strong>
                    <span style={{color:'#27ae60'}}>E: {stats(cat,'Easy')}</span>
                    <span style={{color:'#f39c12'}}>M: {stats(cat,'Medium')}</span>
                    <span style={{color:'#e74c3c'}}>H: {stats(cat,'Hard')}</span>
                  </div>
                ))}
              </div>
              {questions.length === 0
                ? <p style={{color:'#7f8c8d'}}>No questions yet.</p>
                : questions.map(q => (
                  <div key={q.id} style={styles.qRow}>
                    <div style={{flex:1}}>
                      <span style={{...styles.diffBadge, backgroundColor: diffColor[q.difficulty]}}>{q.difficulty}</span>
                      <span style={styles.catBadge}>{q.category}</span>
                      <span style={{fontSize:'14px', color:'#2c3e50'}}>{q.text}</span>
                    </div>
                    <button style={styles.deleteBtn} onClick={() => handleDeleteQuestion(q.id)}>🗑</button>
                  </div>
                ))
              }
            </div>
          </>
        )}

        {/* ── RESULTS TAB ── */}
        {tab === 'results' && (
          <div style={styles.card}>
            <h3 style={styles.cardTitle}>📊 Student Results ({submissions.length})</h3>
            {submissions.length === 0
              ? <p style={{color:'#7f8c8d'}}>No submissions yet.</p>
              : submissions
                  .sort((a,b) => (b.submittedAt?.toDate?.() || 0) - (a.submittedAt?.toDate?.() || 0))
                  .map(sub => {
                    const pct = sub.totalQuestions > 0
                      ? Math.round((sub.totalScore / sub.totalQuestions) * 100) : 0;
                    return (
                      <div key={sub.id} style={styles.resultRow}>
                        <div style={{flex:1}}>
                          <p style={{margin:'0 0 4px 0', fontWeight:'bold', color:'#2c3e50'}}>
                            👤 {sub.userEmail}
                          </p>
                          <p style={styles.examMeta}>
                            📋 {getExamTitle(sub.examId)} &nbsp;|&nbsp;
                            🏆 Total: <strong>{sub.totalScore}/{sub.totalQuestions}</strong> ({pct}%)
                            {sub.violations > 0 && (
                              <span style={{color:'#e74c3c', marginLeft:'8px'}}>
                                ⚠️ Violations: {sub.violations}
                              </span>
                            )}
                          </p>
                          <div style={{display:'flex', gap:'10px', flexWrap:'wrap', marginTop:'6px'}}>
                            {(sub.scores || []).map((s, i) => (
                              <span key={i} style={styles.roundScore}>
                                {s.round}: <strong>{s.score}/{s.total}</strong>
                              </span>
                            ))}
                          </div>
                          <p style={styles.examMeta}>
                            🕐 {sub.submittedAt?.toDate
                              ? sub.submittedAt.toDate().toLocaleString()
                              : 'N/A'}
                            {sub.reason === 'violations' && (
                              <span style={{color:'#e74c3c', marginLeft:'8px', fontWeight:'bold'}}>
                                [Auto-submitted: violations]
                              </span>
                            )}
                          </p>
                        </div>
                        <div style={{...styles.pctBadge,
                          backgroundColor: pct >= 70 ? '#27ae60' : pct >= 40 ? '#f39c12' : '#e74c3c'
                        }}>
                          {pct}%
                        </div>
                      </div>
                    );
                  })
            }
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  container: { minHeight:'100vh', backgroundColor:'#f0f4f8' },
  navbar: { backgroundColor:'#2c3e50', padding:'15px 30px', display:'flex', justifyContent:'space-between', alignItems:'center' },
  navTitle: { color:'white', margin:0 },
  logoutBtn: { backgroundColor:'#e74c3c', color:'white', border:'none', padding:'8px 16px', borderRadius:'6px', cursor:'pointer' },
  tabs: { display:'flex', backgroundColor:'white', borderBottom:'2px solid #eee' },
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
};

export default AdminDashboard;
