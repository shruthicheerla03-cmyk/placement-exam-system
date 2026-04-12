import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { auth, db } from '../firebase/config';
import { signOut } from 'firebase/auth';
import { doc, getDoc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';
import AdminSidebar from '../components/AdminSidebar';

function ViewExam() {
  const { examId } = useParams();
  const navigate = useNavigate();
  const [exam, setExam] = useState(null);
  const [loading, setLoading] = useState(true);

  // Replace Question Modal State
  const [replaceModalOpen, setReplaceModalOpen] = useState(false);
  const [selectedQuestionIndex, setSelectedQuestionIndex] = useState(null);
  const [selectedQuestion, setSelectedQuestion] = useState(null);
  const [availableQuestions, setAvailableQuestions] = useState([]);
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchExam = async () => {
      try {
        const snap = await getDoc(doc(db, 'exams', examId));
        if (snap.exists()) {
          const data = { id: snap.id, ...snap.data() };

          // ✅ Auto-migrate: If status is missing, set it to "active" and update Firestore
          if (!data.status) {
            console.log('⚠️ Migrating old exam: setting status to "active"');
            try {
              await updateDoc(doc(db, 'exams', examId), {
                status: 'active'
              });
              data.status = 'active'; // Update local state too
            } catch (updateError) {
              console.warn('Could not auto-migrate status:', updateError);
              // Continue anyway with local default
            }
          }

          setExam(data);
        } else {
          alert('Exam not found!');
          navigate('/admin/dashboard');
        }
      } catch (error) {
        console.error('Error fetching exam:', error);
        alert('Failed to load exam');
      } finally {
        setLoading(false);
      }
    };
    fetchExam();
  }, [examId, navigate]);

  // CSS for hover effects
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      input:hover, textarea:hover, select:hover {
        border-color: #0062ff !important;
        box-shadow: 0 0 10px rgba(0, 98, 255, 0.1);
        outline: none;
      }
      .admin-card {
        transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1) !important;
        cursor: pointer;
      }
      .admin-card:hover {
        transform: translateY(-5px) scale(1.02);
        box-shadow: 0 20px 40px rgba(0, 98, 255, 0.12), 0 10px 20px rgba(0,0,0,0.05) !important;
        border-color: #0062ff !important;
        background: linear-gradient(145deg, #ffffff, #fdfdff) !important;
      }
      .admin-static-card {
        transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1) !important;
        cursor: default !important;
      }
      .admin-static-card:hover {
        transform: none !important;
        box-shadow: 0 2px 15px rgba(0,0,0,0.05) !important;
      }
      button:hover { filter: brightness(1.1); transform: translateY(-1px); }
    `;
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, []);

  const handleMarkCompleted = async () => {
    if (!window.confirm('Mark this exam as completed? This will lock it from editing.')) return;

    try {
      await updateDoc(doc(db, 'exams', examId), {
        status: 'completed',
        completedAt: new Date()
      });
      setExam(prev => ({ ...prev, status: 'completed', completedAt: new Date() }));
      alert('✅ Exam marked as completed!');
    } catch (error) {
      alert('Failed to update exam status: ' + error.message);
    }
  };

  // Open Replace Question Modal
  const handleOpenReplaceModal = async (question, index) => {
    // Double-check status (defensive programming)
    const currentIsActive = !exam.status || exam.status === 'active';
    if (!currentIsActive) {
      alert('⚠️ Cannot replace questions in completed exams!');
      return;
    }

    setSelectedQuestion(question);
    setSelectedQuestionIndex(index);
    setReplaceModalOpen(true);
    setSearchTerm('');
    setLoadingQuestions(true);

    try {
      // Query questions with same round, subject, and difficulty
      const q = query(
        collection(db, 'questions'),
        where('round', '==', question.round),
        where('subject', '==', question.subject),
        where('difficulty', '==', question.difficulty)
      );

      const snapshot = await getDocs(q);
      const questions = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      setAvailableQuestions(questions);
    } catch (error) {
      console.error('Error fetching questions:', error);
      alert('Failed to load available questions: ' + error.message);
      setAvailableQuestions([]);
    } finally {
      setLoadingQuestions(false);
    }
  };

  // Replace Question in Exam
  const handleReplaceQuestion = async (newQuestion) => {
    // Prevent duplicate questions in exam
    const questionSet = exam.questionSet || exam.questions || [];
    const isDuplicate = questionSet.some(q => q.questionId === newQuestion.id);

    if (isDuplicate) {
      alert('⚠️ This question is already in the exam! Please select a different question.');
      return;
    }

    if (!window.confirm(`Replace this question with:\n"${newQuestion.text.substring(0, 100)}..."`)) {
      return;
    }

    try {
      // Create new question snapshot
      const newQuestionSnapshot = {
        questionId: newQuestion.id,
        text: newQuestion.text,
        options: newQuestion.options,
        correct: newQuestion.correct,
        difficulty: newQuestion.difficulty,
        subject: newQuestion.subject,
        round: newQuestion.round,
        category: newQuestion.category
      };

      // Update questionSet
      const updatedQuestionSet = [...questionSet];
      updatedQuestionSet[selectedQuestionIndex] = newQuestionSnapshot;

      // Update Firestore
      await updateDoc(doc(db, 'exams', examId), {
        questionSet: updatedQuestionSet,
        // Also update old questions array for backward compatibility
        questions: updatedQuestionSet,
        lastModified: new Date()
      });

      // Update local state
      setExam(prev => ({
        ...prev,
        questionSet: updatedQuestionSet,
        questions: updatedQuestionSet
      }));

      alert('✅ Question replaced successfully!');
      setReplaceModalOpen(false);
      setSelectedQuestion(null);
      setSelectedQuestionIndex(null);
    } catch (error) {
      console.error('Error replacing question:', error);
      alert('Failed to replace question: ' + error.message);
    }
  };

  const closeReplaceModal = () => {
    setReplaceModalOpen(false);
    setSelectedQuestion(null);
    setSelectedQuestionIndex(null);
    setAvailableQuestions([]);
    setSearchTerm('');
  };

  const handleLogout = async () => {
    localStorage.removeItem('adminAuth');
    localStorage.removeItem('adminEmail');
    await signOut(auth);
    navigate('/admin');
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loading}>Loading exam...</div>
      </div>
    );
  }

  if (!exam) return null;

  const questionSet = exam.questionSet || exam.questions || [];
  const startDate = exam.startTime?.toDate ? exam.startTime.toDate() :
    exam.startTime?.seconds ? new Date(exam.startTime.seconds * 1000) :
      new Date(exam.startTime);

  // ✅ Treat undefined status as "active" (for backward compatibility)
  const isActive = !exam.status || exam.status === 'active';

  return (
    <div style={styles.outerContainer}>
      {/* 🚀 Fully Fixed Full-Width Top Navbar */}
      <div style={styles.topNavbar}>
        <div style={styles.navLeft}>
          <div style={{...styles.branding, color: 'white'}} onClick={() => navigate('/admin/dashboard')}>
            <span style={{ fontSize: '24px' }}>🛠</span>
            <div style={{ display: 'flex', flexDirection: 'column', lineHeight: '1' }}>
              <span style={{ fontWeight: '900', fontSize: '18px', tracking: '1px' }}>ADMIN</span>
              <span style={{ fontSize: '10px', fontWeight: 'bold', opacity: 0.8, letterSpacing: '2px' }}>SYSTEM</span>
            </div>
          </div>
          <div style={{...styles.divider, backgroundColor: 'rgba(255,255,255,0.2)'}} />
        </div>

        <div style={styles.navRight}>
          <div style={styles.adminUser}>
            <div style={{ textAlign: 'right', marginRight: '12px' }}>
              <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#1e293b' }}>
                {localStorage.getItem('adminEmail')?.split('@')[0] || 'Admin User'}
              </div>
              <div style={{ fontSize: '10px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: '700' }}>
                Super Administrator
              </div>
            </div>
            <div style={styles.userAvatar}>
              {(localStorage.getItem('adminEmail') || 'A')[0].toUpperCase()}
            </div>
          </div>
          <button style={styles.navLogoutBtn} onClick={handleLogout}>
            Logout 🚪
          </button>
        </div>
      </div>

      <div style={styles.contentArea}>
        <AdminSidebar activeTab="exams" />
        <div className="admin-main-content" style={styles.mainContent}>
          <div style={styles.cardWrapper}>
            {/* Header with Back Button */}
            <div style={styles.header}>
              <button style={styles.backBtn} onClick={() => navigate('/admin/dashboard')}>
                ← Back to Exams
              </button>
              <h1 style={styles.title}>📋 View Exam</h1>
            </div>

            {/* Exam Details Card */}
            <div className="admin-card" style={styles.card}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '25px' }}>
                <div>
                  <h2 style={{ margin: 0, color: '#2c3e50', fontSize: '24px' }}>{exam.title}</h2>
                  <div style={{ marginTop: '10px' }}>
                    <span style={{
                      padding: '6px 14px',
                      borderRadius: '15px',
                      fontSize: '13px',
                      fontWeight: 'bold',
                      backgroundColor: exam.status === 'completed' ? '#fee' : '#efe',
                      color: exam.status === 'completed' ? '#c00' : '#0a0',
                      border: `2px solid ${exam.status === 'completed' ? '#c00' : '#0a0'}`
                    }}>
                      {exam.status === 'completed' ? '🔴 Completed' : '🟢 Active'}
                      {!exam.status && ' (Default)'}
                    </span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  {isActive && (
                    <>
                      <button
                        style={{ ...styles.actionBtn, backgroundColor: '#3498db' }}
                        onClick={() => navigate(`/admin/exam/${examId}/edit`)}
                      >
                        ✏️ Edit Exam
                      </button>
                      <button
                        style={{ ...styles.actionBtn, backgroundColor: '#e74c3c' }}
                        onClick={handleMarkCompleted}
                      >
                        🔒 Mark Completed
                      </button>
                    </>
                  )}
                </div>
              </div>

              <div style={styles.detailsGrid}>
                <div style={styles.detailItem}>
                  <span style={styles.detailLabel}>Exam Code:</span>
                  <span style={styles.detailValue}>{exam.examCode}</span>
                </div>
                <div style={styles.detailItem}>
                  <span style={styles.detailLabel}>Total Questions:</span>
                  <span style={styles.detailValue}>{questionSet.length}</span>
                </div>
                <div style={styles.detailItem}>
                  <span style={styles.detailLabel}>Start Time:</span>
                  <span style={styles.detailValue}>{startDate.toLocaleString()}</span>
                </div>
                {exam.roundDurations && (
                  <div style={styles.detailItem}>
                    <span style={styles.detailLabel}>Durations:</span>
                    <span style={styles.detailValue}>
                      Aptitude: {exam.roundDurations.aptitude}min | Core: {exam.roundDurations.core}min
                    </span>
                  </div>
                )}
                {exam.createdAt && (
                  <div style={styles.detailItem}>
                    <span style={styles.detailLabel}>Created:</span>
                    <span style={styles.detailValue}>
                      {(exam.createdAt?.toDate ? exam.createdAt.toDate() : new Date(exam.createdAt)).toLocaleString()}
                    </span>
                  </div>
                )}
                {exam.completedAt && (
                  <div style={styles.detailItem}>
                    <span style={styles.detailLabel}>Completed:</span>
                    <span style={styles.detailValue}>
                      {(exam.completedAt?.toDate ? exam.completedAt.toDate() : new Date(exam.completedAt)).toLocaleString()}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Question Statistics */}
            <div className="admin-static-card" style={styles.card}>
              <h3 style={{ color: '#2c3e50', marginBottom: '15px' }}>📊 Question Distribution</h3>
              <div style={styles.statsGrid}>
                {['Easy', 'Medium', 'Hard'].map(diff => {
                  const count = questionSet.filter(q => q.difficulty === diff).length;
                  return (
                    <div key={diff} className="admin-card" style={{
                      ...styles.statCard,
                      borderLeft: `4px solid ${diff === 'Easy' ? '#27ae60' : diff === 'Medium' ? '#f39c12' : '#e74c3c'}`
                    }}>
                      <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#1e293b' }}>{count}</div>
                      <div style={{ color: '#7f8c8d', fontSize: '14px' }}>{diff} Questions</div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Questions List */}
            <div className="admin-static-card" style={styles.card}>
              <h3 style={{ color: '#2c3e50', marginBottom: '20px' }}>📝 Questions ({questionSet.length})</h3>

              {questionSet.length === 0 ? (
                <p style={{ color: '#95a5a6', textAlign: 'center' }}>No questions found in this exam.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  {questionSet.map((q, index) => (
                    <div key={index} style={styles.questionCard}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                          <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#2c3e50' }}>
                            Question {index + 1}
                          </div>
                          {isActive && (
                            <button
                              onClick={() => handleOpenReplaceModal(q, index)}
                              style={styles.replaceBtn}
                              title="Replace this question"
                            >
                              🔁 Replace
                            </button>
                          )}
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <span style={{
                            ...styles.badge,
                            backgroundColor: q.difficulty === 'Easy' ? '#eafaf1' :
                              q.difficulty === 'Medium' ? '#fef9e7' : '#fdecea',
                            color: q.difficulty === 'Easy' ? '#27ae60' :
                              q.difficulty === 'Medium' ? '#f39c12' : '#e74c3c'
                          }}>
                            {q.difficulty}
                          </span>
                          <span style={{ ...styles.badge, backgroundColor: '#e8f4fd', color: '#3498db' }}>
                            {q.subject || q.category}
                          </span>
                          {q.round && (
                            <span style={{ ...styles.badge, backgroundColor: '#f0f0f0', color: '#555' }}>
                              {q.round.replace('round', 'Round ')}
                            </span>
                          )}
                        </div>
                      </div>

                      <div style={{ fontSize: '15px', color: '#34495e', marginBottom: '15px', lineHeight: '1.6' }}>
                        {q.text}
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {(q.options || []).map((option, optIndex) => {
                          const isCorrect = option === q.correct;
                          return (
                            <div
                              key={optIndex}
                              style={{
                                ...styles.optionBox,
                                backgroundColor: isCorrect ? '#eafaf1' : '#f8f9fa',
                                border: isCorrect ? '2px solid #27ae60' : '1px solid #dee2e6',
                                fontWeight: isCorrect ? 'bold' : 'normal'
                              }}
                            >
                              {isCorrect && <span style={{ color: '#27ae60', marginRight: '8px' }}>✓</span>}
                              <span style={{ color: '#2c3e50' }}>{option}</span>
                              {isCorrect && (
                                <span style={{
                                  marginLeft: 'auto',
                                  fontSize: '12px',
                                  color: '#27ae60',
                                  fontWeight: 'bold'
                                }}>
                                  CORRECT ANSWER
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Replace Question Modal */}
      {replaceModalOpen && (
        <div style={styles.modalOverlay} onClick={closeReplaceModal}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h2 style={{ margin: 0, color: '#2c3e50' }}>🔁 Replace Question</h2>
              <button style={styles.closeBtn} onClick={closeReplaceModal}>✕</button>
            </div>

            {selectedQuestion && (
              <div style={styles.modalContent}>
                <div style={{ ...styles.infoBox, marginBottom: '20px' }}>
                  <strong style={{ color: '#555' }}>Replacing:</strong>
                  <div style={{ marginTop: '8px', fontSize: '14px', color: '#666' }}>
                    {selectedQuestion.text.substring(0, 150)}...
                  </div>
                  <div style={{ marginTop: '8px', display: 'flex', gap: '8px' }}>
                    <span style={{ ...styles.badge, backgroundColor: '#eafaf1', color: '#27ae60' }}>
                      {selectedQuestion.difficulty}
                    </span>
                    <span style={{ ...styles.badge, backgroundColor: '#e8f4fd', color: '#3498db' }}>
                      {selectedQuestion.subject}
                    </span>
                    <span style={{ ...styles.badge, backgroundColor: '#f0f0f0', color: '#555' }}>
                      {selectedQuestion.round}
                    </span>
                  </div>
                </div>

                <div style={{ marginBottom: '15px' }}>
                  <input
                    type="text"
                    placeholder="🔍 Search questions..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={styles.searchInput}
                  />
                </div>

                <div style={{ maxHeight: '400px', overflowY: 'auto', marginTop: '15px' }}>
                  {loadingQuestions ? (
                    <div style={{ textAlign: 'center', padding: '40px', color: '#7f8c8d' }}>
                      Loading available questions...
                    </div>
                  ) : (
                    <>
                      <div style={{ marginBottom: '10px', color: '#7f8c8d', fontSize: '14px' }}>
                        {availableQuestions.filter(q =>
                          searchTerm === '' ||
                          q.text.toLowerCase().includes(searchTerm.toLowerCase())
                        ).length} questions found
                      </div>

                      {availableQuestions
                        .filter(q =>
                          searchTerm === '' ||
                          q.text.toLowerCase().includes(searchTerm.toLowerCase())
                        )
                        .map((question, idx) => {
                          const isCurrentQuestion = question.id === selectedQuestion.questionId;
                          const isDuplicate = (exam.questionSet || exam.questions || [])
                            .some(q => q.questionId === question.id);

                          return (
                            <div
                              key={question.id}
                              style={{
                                ...styles.questionOption,
                                opacity: isCurrentQuestion || isDuplicate ? 0.5 : 1,
                                cursor: isCurrentQuestion || isDuplicate ? 'not-allowed' : 'pointer'
                              }}
                              onClick={() => {
                                if (!isCurrentQuestion && !isDuplicate) {
                                  handleReplaceQuestion(question);
                                }
                              }}
                            >
                              <div style={{ flex: 1 }}>
                                <div style={{ fontSize: '14px', color: '#2c3e50', marginBottom: '8px', fontWeight: '500' }}>
                                  {question.text}
                                </div>
                                <div style={{ fontSize: '13px', color: '#7f8c8d' }}>
                                  {question.options?.slice(0, 2).join(' | ')}...
                                </div>
                              </div>
                              <div>
                                {isCurrentQuestion && (
                                  <span style={{ fontSize: '12px', color: '#95a5a6', fontStyle: 'italic' }}>
                                    (Current)
                                  </span>
                                )}
                                {isDuplicate && !isCurrentQuestion && (
                                  <span style={{ fontSize: '12px', color: '#e74c3c', fontStyle: 'italic' }}>
                                    (Already in exam)
                                  </span>
                                )}
                                {!isCurrentQuestion && !isDuplicate && (
                                  <button style={styles.selectBtn}>
                                    Select →
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}

                      {availableQuestions.filter(q =>
                        searchTerm === '' ||
                        q.text.toLowerCase().includes(searchTerm.toLowerCase())
                      ).length === 0 && (
                          <div style={{ textAlign: 'center', padding: '40px', color: '#95a5a6' }}>
                            No matching questions found
                          </div>
                        )}
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  outerContainer: { minHeight: '100vh', backgroundColor: '#f1f5f9', display: 'flex', flexDirection: 'column' },
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
  adminUser: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px'
  },
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
    minHeight: 'calc(100vh - 70px)',
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: '#f1f5f9',
    padding: '25px',
    marginTop: '70px',
    boxSizing: 'border-box'
  },
  cardWrapper: {
    backgroundColor: 'white',
    borderRadius: '24px',
    padding: '40px',
    maxWidth: '1400px',
    width: '100%',
    margin: '0 auto',
    boxShadow: '0 10px 30px rgba(0,0,0,0.06)',
    minHeight: 'calc(100vh - 120px)',
    boxSizing: 'border-box'
  },
  container: {
    padding: '0'
  },
  header: {
    marginBottom: '30px',
    display: 'flex',
    alignItems: 'center',
    gap: '20px'
  },
  backBtn: {
    padding: '10px 20px',
    backgroundColor: '#fff',
    border: '2px solid #e2e8f0',
    borderRadius: '10px',
    color: '#64748b',
    cursor: 'pointer',
    fontSize: '15px',
    fontWeight: '600',
    transition: 'all 0.2s',
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  title: { margin: 0, color: '#1e293b', fontSize: '28px', fontWeight: '800' },
  card: { backgroundColor: '#fff', padding: '35px', borderRadius: '16px', boxShadow: '0 4px 15px rgba(0,0,0,0.03)', border: '1px solid #e2e8f0', marginBottom: '30px' },
  loading: {
    textAlign: 'center',
    padding: '50px',
    fontSize: '18px',
    color: '#7f8c8d'
  },
  detailsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '15px',
    marginTop: '20px'
  },
  detailItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: '5px'
  },
  detailLabel: {
    fontSize: '13px',
    color: '#7f8c8d',
    fontWeight: '600',
    textTransform: 'uppercase'
  },
  detailValue: {
    fontSize: '15px',
    color: '#2c3e50',
    fontWeight: '500'
  },
  actionBtn: {
    padding: '10px 20px',
    border: 'none',
    borderRadius: '8px',
    color: '#fff',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 'bold',
    transition: 'opacity 0.2s'
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
    gap: '15px'
  },
  statCard: {
    padding: '20px',
    backgroundColor: '#f8f9fa',
    borderRadius: '8px',
    textAlign: 'center'
  },
  questionCard: {
    padding: '20px',
    backgroundColor: '#fafbfc',
    borderRadius: '10px',
    border: '1px solid #e1e4e8'
  },
  badge: {
    padding: '4px 10px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: 'bold'
  },
  optionBox: {
    padding: '12px 15px',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    transition: 'all 0.2s'
  },
  replaceBtn: {
    padding: '6px 12px',
    backgroundColor: '#f39c12',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    fontSize: '13px',
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: 'all 0.2s',
    boxShadow: '0 2px 4px rgba(243, 156, 18, 0.3)'
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1200,
    padding: '20px'
  },
  modal: {
    backgroundColor: '#fff',
    borderRadius: '12px',
    width: '100%',
    maxWidth: '800px',
    maxHeight: '90vh',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 10px 40px rgba(0, 0, 0, 0.2)'
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px 25px',
    borderBottom: '2px solid #e1e4e8',
    backgroundColor: '#f8f9fa',
    borderTopLeftRadius: '12px',
    borderTopRightRadius: '12px'
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    fontSize: '24px',
    color: '#95a5a6',
    cursor: 'pointer',
    padding: '0',
    width: '30px',
    height: '30px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '4px',
    transition: 'all 0.2s'
  },
  modalContent: {
    padding: '25px',
    overflowY: 'auto',
    flex: 1
  },
  infoBox: {
    padding: '15px',
    backgroundColor: '#fff3cd',
    border: '1px solid #ffc107',
    borderRadius: '8px',
    fontSize: '14px'
  },
  searchInput: {
    width: '100%',
    padding: '12px 15px',
    border: '2px solid #dfe6e9',
    borderRadius: '8px',
    fontSize: '14px',
    outline: 'none',
    transition: 'border-color 0.2s',
    boxSizing: 'border-box'
  },
  questionOption: {
    padding: '15px',
    marginBottom: '10px',
    backgroundColor: '#f8f9fa',
    border: '2px solid #e1e4e8',
    borderRadius: '8px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '15px',
    transition: 'all 0.2s'
  },
  selectBtn: {
    padding: '8px 16px',
    backgroundColor: '#27ae60',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    fontSize: '13px',
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: 'all 0.2s',
    whiteSpace: 'nowrap'
  }
};

export default ViewExam;
