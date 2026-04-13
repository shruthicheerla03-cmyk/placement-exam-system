import React, { useState, useEffect } from 'react';
import CodeEditor from '../components/CodeEditor';
import { db } from '../firebase/config';
import { collection, addDoc } from 'firebase/firestore';
import { ChevronRight } from 'lucide-react';
import '../pages/ExamPage.css';

function DSARound({ exam, questions, onComplete, userId, examId, violations, showDialog, currentTime, timeLeft: globalTimeLeft, previousScores }) {
  // Lazy-init from localStorage so refresh restores state instantly
  const [currentQuestion, setCurrentQuestion] = useState(() => {
    const s = localStorage.getItem(`exam_${examId}_dsa_currentQuestion`);
    return s !== null ? parseInt(s) : 0;
  });
  const [solutions, setSolutions] = useState(() => {
    try {
      const s = localStorage.getItem(`exam_${examId}_dsa_solutions`);
      return s ? JSON.parse(s) : {};
    } catch { return {}; }
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dsaConfirmOpen, setDsaConfirmOpen] = useState(false);
  const [finalSummaryOpen, setFinalSummaryOpen] = useState(false);
  const MAX_VIOLATIONS = 3;

  const timeLeft = globalTimeLeft;

  // Persist currentQuestion and solutions on every change
  useEffect(() => {
    localStorage.setItem(`exam_${examId}_dsa_currentQuestion`, currentQuestion.toString());
  }, [currentQuestion, examId]);

  useEffect(() => {
    localStorage.setItem(`exam_${examId}_dsa_solutions`, JSON.stringify(solutions));
  }, [solutions, examId]);

  const handleCodeSubmit = (submission) => {
    setSolutions(prev => ({
      ...prev,
      [currentQuestion]: submission
    }));

    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    }
  };

  // Step 1 of 2: open DSA confirm dialog
  const handleSubmit = () => {
    if (isSubmitting) return;
    setDsaConfirmOpen(true);
  };

  // Step 2: after DSA confirm, open final 3-round summary
  const handleDSAConfirm = () => {
    setDsaConfirmOpen(false);
    setTimeout(() => setFinalSummaryOpen(true), 80);
  };

  // Final OK — actually submit
  const handleFinalSubmit = async () => {
    setFinalSummaryOpen(false);
    setIsSubmitting(true);
    try {
      let totalScore = 0;
      let totalPassed = 0;
      let totalTests = 0;

      Object.entries(solutions).forEach(([qIdx, sol]) => {
        if (sol.testResults && sol.testResults.length > 0) {
          const passed = sol.testResults.filter(t => t.passed).length;
          totalPassed += passed;
          totalTests  += sol.testResults.length;
          const qPoints = questions[parseInt(qIdx)]?.points || 100;
          totalScore  += (passed / sol.testResults.length) * qPoints;
        }
      });

      const maxPossibleScore = questions.reduce((sum, q) => sum + (q.points || 100), 0);
      const avgScore = maxPossibleScore > 0
        ? Math.round((totalScore / maxPossibleScore) * 100)
        : 0;

      await addDoc(collection(db, 'dsaSubmissions'), {
        userId,
        examId,
        solutions,
        score:          avgScore,
        rawScore:       Math.round(totalScore),
        maxScore:       questions.reduce((sum, q) => sum + (q.points || 100), 0),
        solvedCount:    solvedCount,
        totalQuestions: questions.length,
        totalPassed,
        totalTests,
        submittedAt: new Date(),
        timeSpent:   ((exam?.roundDurations?.dsa || 60) * 60) - (timeLeft || 0),
      });

      onComplete();
    } catch (error) {
      console.error('Error submitting DSA round:', error);
      showDialog(
        'Submission Error',
        'Failed to submit. Please try again.',
        () => {},
        'warning',
        false
      );
      setIsSubmitting(false);
    }
  };

  if (questions.length === 0) {
    return (
      <div className="fullscreen-center">
        <div className="status-card" style={{ maxWidth: 450 }}>
          <div className="status-icon" style={{ fontSize: 70, marginBottom: 15 }}>📭</div>
          <h2 style={{ fontSize: 26, fontWeight: 800, color: '#1e293b', marginBottom: 15 }}>
            DSA Problems Pending
          </h2>
          <p style={{ color: '#64748b', fontSize: 16, lineHeight: 1.7, marginBottom: 30 }}>
            No coding problems found. You may complete the session now.
          </p>
          <button
            className="nav-button primary"
            style={{ width: '100%', padding: 15 }}
            onClick={() => onComplete()}
          >
            Finish Exam &amp; Proceed <ChevronRight size={18} />
          </button>
        </div>
      </div>
    );
  }

  const question = questions[currentQuestion];
  const solvedCount = Object.keys(solutions).length;
  const allSolved   = solvedCount === questions.length;

  return (
    <div style={styles.container}>

      {/* Question Selector */}
      {questions.length > 1 && (
        <div style={styles.questionSelector}>
          {questions.map((q, i) => (
            <button
              key={i}
              style={{
                ...styles.questionBtn,
                backgroundColor: solutions[i]
                  ? '#27ae60'
                  : i === currentQuestion
                  ? '#3498db'
                  : '#ecf0f1',
                color: solutions[i] || i === currentQuestion ? '#fff' : '#2c3e50',
              }}
              onClick={() => setCurrentQuestion(i)}
            >
              {i + 1}
            </button>
          ))}
          <span style={{ marginLeft: 'auto', fontSize: 13, color: '#64748b', alignSelf: 'center', fontWeight: 600 }}>
            {solvedCount} / {questions.length} solved
          </span>
        </div>
      )}

      {/* Code Editor */}
      <CodeEditor
        question={question}
        onSubmitCode={handleCodeSubmit}
        remainingTime={timeLeft}
        userId={userId}
        examId={examId}
        showDialog={showDialog}
        existingSolution={solutions[currentQuestion]}
      />

      {/* ✅ Footer with clearly visible Finish Round button */}
      <div style={styles.footer}>
        <button
          style={styles.prevBtn}
          onClick={() => setCurrentQuestion(q => Math.max(0, q - 1))}
          disabled={currentQuestion === 0}
        >
          ◀ Previous
        </button>

        <div style={styles.solvedCount}>
          Solved: <strong style={{ color: allSolved ? '#27ae60' : '#e67e22' }}>{solvedCount}</strong> / {questions.length}
        </div>

        <button
          style={styles.nextBtn}
          onClick={() => setCurrentQuestion(q => Math.min(questions.length - 1, q + 1))}
          disabled={currentQuestion === questions.length - 1}
        >
          Next ▶
        </button>

        {/* ✅ Always-visible Finish Round button */}
        <button
          style={{
            ...styles.finishBtn,
            backgroundColor: isSubmitting ? '#95a5a6' : allSolved ? '#27ae60' : '#e74c3c',
            cursor: isSubmitting ? 'not-allowed' : 'pointer',
            boxShadow: allSolved ? '0 4px 15px rgba(39,174,96,0.4)' : '0 4px 15px rgba(231,76,60,0.3)',
            animation: allSolved ? 'pulse 1.5s infinite' : 'none',
          }}
          onClick={handleSubmit}
          disabled={isSubmitting}
        >
          {isSubmitting ? '⏳ Submitting...' : allSolved ? '✅ Finish Round' : '🏁 Finish Round'}
        </button>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { transform: scale(1); box-shadow: 0 4px 15px rgba(39,174,96,0.4); }
          50%       { transform: scale(1.03); box-shadow: 0 6px 20px rgba(39,174,96,0.6); }
        }
      `}</style>

      {/* ── STEP 1: DSA answered/not-answered confirmation ── */}
      {dsaConfirmOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.65)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div style={{ background: '#fff', borderRadius: 24, padding: 32, width: '90%', maxWidth: 420, boxShadow: '0 25px 50px -12px rgba(0,0,0,0.3)', textAlign: 'center' }}>
            <div style={{ fontSize: 46, marginBottom: 12 }}>❓</div>
            <h3 style={{ fontSize: 21, fontWeight: 800, color: '#1e293b', marginBottom: 16 }}>Submit DSA Round?</h3>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginBottom: 14 }}>
              <div style={{ background: 'rgba(39,163,20,0.1)', border: '2px solid rgb(39,163,20)', borderRadius: 10, padding: '12px 22px', minWidth: 90 }}>
                <div style={{ fontSize: 28, fontWeight: 900, color: 'rgb(39,163,20)' }}>{solvedCount}</div>
                <div style={{ fontSize: 12, color: 'rgb(39,163,20)', fontWeight: 700, marginTop: 2 }}>Answered</div>
              </div>
              <div style={{ background: 'rgba(217,78,59,0.1)', border: '2px solid rgba(217,78,59,1)', borderRadius: 10, padding: '12px 22px', minWidth: 90 }}>
                <div style={{ fontSize: 28, fontWeight: 900, color: 'rgba(217,78,59,1)' }}>{questions.length - solvedCount}</div>
                <div style={{ fontSize: 12, color: 'rgba(217,78,59,1)', fontWeight: 700, marginTop: 2 }}>Not Answered</div>
              </div>
            </div>
            <p style={{ fontSize: 14, color: '#64748b', marginBottom: 22 }}>Are you sure you want to submit this round?</p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
              <button onClick={() => setDsaConfirmOpen(false)} style={{ padding: '12px 24px', borderRadius: 12, fontSize: 15, fontWeight: 700, border: '2px solid #e2e8f0', background: 'white', color: '#64748b', cursor: 'pointer' }}>Cancel</button>
              <button onClick={handleDSAConfirm} style={{ padding: '12px 24px', borderRadius: 12, fontSize: 15, fontWeight: 700, border: 'none', background: '#0062ff', color: 'white', cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,98,255,0.25)' }}>Confirm</button>
            </div>
          </div>
        </div>
      )}

      {/* ── STEP 2: Final 3-round summary (no cancel, no back) ── */}
      {finalSummaryOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.65)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div style={{ background: '#fff', borderRadius: 24, padding: '26px 22px', width: '90%', maxWidth: 420, boxShadow: '0 25px 50px -12px rgba(0,0,0,0.3)', textAlign: 'center' }}>
            <div style={{ fontSize: 38, marginBottom: 8 }}>🎉</div>
            <h3 style={{ fontSize: 19, fontWeight: 800, color: '#1e293b', marginBottom: 14 }}>Final Submission Summary</h3>

            {/* R1 and R2 side by side */}
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginBottom: 10 }}>
              {(previousScores || []).slice(0, 2).map((s, idx) => (
                <div key={idx} style={{ flex: 1, border: '1.5px solid #e2e8f0', borderRadius: 12, padding: '10px 8px', background: '#f8fafc' }}>
                  <div style={{ fontSize: 10, color: '#64748b', fontWeight: 700, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                    {idx === 0 ? 'R1: Aptitude' : 'R2: Core'}
                  </div>
                  <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                    <div style={{ background: 'rgba(39,163,20,0.1)', border: '1.5px solid rgb(39,163,20)', borderRadius: 8, padding: '5px 8px', minWidth: 44 }}>
                      <div style={{ fontSize: 17, fontWeight: 900, color: 'rgb(39,163,20)' }}>{s.answered || 0}</div>
                      <div style={{ fontSize: 9, color: 'rgb(39,163,20)', fontWeight: 700 }}>Ans</div>
                    </div>
                    <div style={{ background: 'rgba(217,78,59,0.1)', border: '1.5px solid rgba(217,78,59,1)', borderRadius: 8, padding: '5px 8px', minWidth: 44 }}>
                      <div style={{ fontSize: 17, fontWeight: 900, color: 'rgba(217,78,59,1)' }}>{(s.total || 0) - (s.answered || 0)}</div>
                      <div style={{ fontSize: 9, color: 'rgba(217,78,59,1)', fontWeight: 700 }}>N/A</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* DSA centered below */}
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 18 }}>
              <div style={{ border: '1.5px solid #e2e8f0', borderRadius: 12, padding: '10px 20px', background: '#f8fafc', minWidth: 170 }}>
                <div style={{ fontSize: 10, color: '#64748b', fontWeight: 700, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.3px' }}>R3: DSA Coding</div>
                <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                  <div style={{ background: 'rgba(39,163,20,0.1)', border: '1.5px solid rgb(39,163,20)', borderRadius: 8, padding: '5px 10px' }}>
                    <div style={{ fontSize: 17, fontWeight: 900, color: 'rgb(39,163,20)' }}>{solvedCount}</div>
                    <div style={{ fontSize: 9, color: 'rgb(39,163,20)', fontWeight: 700 }}>Answered</div>
                  </div>
                  <div style={{ background: 'rgba(217,78,59,0.1)', border: '1.5px solid rgba(217,78,59,1)', borderRadius: 8, padding: '5px 10px' }}>
                    <div style={{ fontSize: 17, fontWeight: 900, color: 'rgba(217,78,59,1)' }}>{questions.length - solvedCount}</div>
                    <div style={{ fontSize: 9, color: 'rgba(217,78,59,1)', fontWeight: 700 }}>Not Ans</div>
                  </div>
                </div>
              </div>
            </div>

            <button
              onClick={handleFinalSubmit}
              disabled={isSubmitting}
              style={{ width: '100%', padding: '13px', borderRadius: 12, fontSize: 15, fontWeight: 700, border: 'none', background: isSubmitting ? '#95a5a6' : '#0062ff', color: 'white', cursor: isSubmitting ? 'not-allowed' : 'pointer', boxShadow: '0 4px 12px rgba(0,98,255,0.25)' }}
            >
              {isSubmitting ? '⏳ Submitting...' : 'OK — Submit Exam'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: 'calc(100vh - 70px)', // subtract navbar height
    backgroundColor: '#f5f5f5',
  },
  questionSelector: {
    display: 'flex',
    gap: 8,
    padding: '10px 20px',
    backgroundColor: '#fff',
    borderBottom: '1px solid #ddd',
    overflowX: 'auto',
    alignItems: 'center',
    minHeight: 56,
  },
  questionBtn: {
    width: 42,
    height: 42,
    border: 'none',
    borderRadius: 8,
    fontSize: 16,
    fontWeight: 700,
    cursor: 'pointer',
    flexShrink: 0,
    transition: 'all 0.2s',
  },
  footer: {
    display: 'flex',
    gap: 12,
    padding: '14px 20px',
    backgroundColor: '#fff',
    borderTop: '2px solid #e2e8f0',
    alignItems: 'center',
    flexShrink: 0,
  },
  prevBtn: {
    padding: '10px 20px',
    backgroundColor: '#95a5a6',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    fontSize: 14,
    cursor: 'pointer',
    fontWeight: 700,
  },
  nextBtn: {
    padding: '10px 20px',
    backgroundColor: '#95a5a6',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    fontSize: 14,
    cursor: 'pointer',
    fontWeight: 700,
  },
  solvedCount: {
    flex: 1,
    textAlign: 'center',
    fontSize: 14,
    fontWeight: 600,
    color: '#2c3e50',
  },
  finishBtn: {
    padding: '12px 28px',
    color: '#fff',
    border: 'none',
    borderRadius: 10,
    fontSize: 16,
    fontWeight: 800,
    letterSpacing: '0.3px',
    transition: 'all 0.3s ease',
  },
};

export default DSARound;