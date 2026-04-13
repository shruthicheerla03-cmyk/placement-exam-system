import React, { useState } from 'react';
import CodeEditor from '../components/CodeEditor';
import { db } from '../firebase/config';
import { collection, addDoc } from 'firebase/firestore';
import { ChevronRight } from 'lucide-react';
import '../pages/ExamPage.css';

function DSARound({ exam, questions, onComplete, userId, examId, violations, showDialog, currentTime, timeLeft: globalTimeLeft }) {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [solutions, setSolutions] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const MAX_VIOLATIONS = 3;

  const timeLeft = globalTimeLeft;

  const handleCodeSubmit = (submission) => {
    setSolutions(prev => ({
      ...prev,
      [currentQuestion]: submission
    }));

    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    }
    // Don't show dialog — user uses "Finish Round" button
  };

  // ✅ FIXED: Correct closing braces + correct onComplete call
  const handleSubmit = async () => {
    if (isSubmitting) return;

    showDialog(
      'Confirm Final Submission',
      'Are you sure you want to finish this round? You will not be able to return to these problems.',
      async () => {
        setIsSubmitting(true);
        try {
          // Calculate score based on test results
          let totalScore = 0;
          let totalPassed = 0;
          let totalTests = 0;

          Object.values(solutions).forEach(sol => {
            if (sol.testResults && sol.testResults.length > 0) {
              const passed = sol.testResults.filter(t => t.passed).length;
              totalPassed += passed;
              totalTests  += sol.testResults.length;
              totalScore  += (passed / sol.testResults.length) * 100;
            }
          });

          const avgScore = questions.length > 0
            ? Math.round(totalScore / questions.length)
            : 0;

          await addDoc(collection(db, 'dsaSubmissions'), {
            userId,
            examId,
            solutions,
            score:       avgScore,
            totalPassed,
            totalTests,
            submittedAt: new Date(),
            timeSpent:   ((exam?.roundDurations?.dsa || 60) * 60) - (timeLeft || 0),
          });

          // ✅ Call onComplete the way ExamPage.handleSubmitRound expects (no args needed)
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
      },
      'confirm',
      true
    );
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