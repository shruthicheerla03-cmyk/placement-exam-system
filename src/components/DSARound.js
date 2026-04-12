import React, { useState, useEffect } from 'react';
import CodeEditor from '../components/CodeEditor';
import { db } from '../firebase/config';
import { collection, addDoc } from 'firebase/firestore';
import { ChevronRight } from 'lucide-react';
import '../pages/ExamPage.css'; // Reuse the professional styles

/**
 * DSA Round Component - Coding Round with IDE
 */
function DSARound({ exam, questions, onComplete, userId, examId }) {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [solutions, setSolutions] = useState({});
  const [timeLeft, setTimeLeft] = useState((exam.roundDurations?.dsa || 60) * 60);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Timer
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (timeLeft <= 0) {
      handleSubmit();
      return;
    }
    const timer = setTimeout(() => setTimeLeft(t => t - 1), 1000);
    return () => clearTimeout(timer);
  }, [timeLeft]);

  // Save code solution
  const handleCodeSubmit = (submission) => {
    setSolutions({
      ...solutions,
      [currentQuestion]: submission
    });
    
    // Move to next question or finish
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    } else {
      window.alert('All problems submitted! Click "Finish Round" to complete.');
    }
  };

  // Submit entire DSA round
  const handleSubmit = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      // Calculate score based on test results
      let totalScore = 0;
      Object.values(solutions).forEach(sol => {
        if (sol.testResults && sol.testResults.length > 0) {
          const passedTests = sol.testResults.filter(t => t.passed).length;
          const totalTests = sol.testResults.length;
          totalScore += (passedTests / totalTests) * 100;
        }
      });

      await addDoc(collection(db, 'dsaSubmissions'), {
        userId: userId,
        examId: examId,
        solutions: solutions,
        score: Math.round(totalScore / questions.length),
        submittedAt: new Date(),
        timeSpent: (exam.roundDurations?.dsa || 60) * 60 - timeLeft
      });

      onComplete({
        round: 'Round 3: DSA',
        score: Math.round(totalScore / questions.length),
        total: 100
      });
    } catch (error) {
      console.error('Error submitting DSA round:', error);
      window.alert('Error submitting. Please try again.');
      setIsSubmitting(false);
    }
  };

  if (questions.length === 0) {
    return (
      <div className="fullscreen-center">
        <div className="status-card shadow-lg" style={{ maxWidth: '450px' }}>
          <div className="status-icon" style={{ fontSize: '70px', marginBottom: '15px' }}>📭</div>
          <h2 style={{ fontSize: '26px', fontWeight: '800', color: '#1e293b', marginBottom: '15px' }}>
            DSA Problems Pending
          </h2>
          <p style={{ color: '#64748b', fontSize: '16px', lineHeight: '1.7', marginBottom: '30px' }}>
            The technical team is currently populating the coding challenges. You may complete the session now.
          </p>
          <button 
            className="nav-button primary" 
            style={{ width: '100%', padding: '15px' }} 
            onClick={() => onComplete({
              round: 'Round 3: DSA',
              score: 0,
              total: 0
            })}
          >
            Finish Exam & Proceed <ChevronRight size={18} />
          </button>
        </div>
      </div>
    );
  }

  const question = questions[currentQuestion];

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <h3 style={styles.roundName}>Round 3: DSA Coding</h3>
          <p style={styles.questionCount}>
            Problem {currentQuestion + 1} of {questions.length}
          </p>
        </div>
        <div style={styles.headerRight}>
          <div style={styles.timer}>
            ⏱ {Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, '0')}
          </div>
        </div>
      </div>

      {/* Question Selector */}
      <div style={styles.questionSelector}>
        {questions.map((q, i) => (
          <button
            key={i}
            style={{
              ...styles.questionBtn,
              backgroundColor: solutions[i] ? '#27ae60' : i === currentQuestion ? '#3498db' : '#ecf0f1',
              color: solutions[i] || i === currentQuestion ? '#fff' : '#2c3e50'
            }}
            onClick={() => setCurrentQuestion(i)}
          >
            {i + 1}
          </button>
        ))}
      </div>

      {/* Code Editor */}
      <CodeEditor
        question={question}
        onSubmitCode={handleCodeSubmit}
        remainingTime={timeLeft}
      />

      {/* Footer Actions */}
      <div style={styles.footer}>
        <button
          style={styles.prevBtn}
          onClick={() => setCurrentQuestion(Math.max(0, currentQuestion - 1))}
          disabled={currentQuestion === 0}
        >
          ◀ Previous
        </button>
        <div style={styles.solvedCount}>
          Solved: {Object.keys(solutions).length} / {questions.length}
        </div>
        <button
          style={styles.nextBtn}
          onClick={() => setCurrentQuestion(Math.min(questions.length - 1, currentQuestion + 1))}
          disabled={currentQuestion === questions.length - 1}
        >
          Next ▶
        </button>
        <button
          style={styles.finishBtn}
          onClick={handleSubmit}
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Submitting...' : '✅ Finish Round'}
        </button>
      </div>
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    backgroundColor: '#f5f5f5'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 20px',
    backgroundColor: '#e67e22',
    color: '#fff'
  },
  headerLeft: {
    display: 'flex',
    flexDirection: 'column'
  },
  roundName: {
    margin: 0,
    fontSize: '18px',
    fontWeight: 'bold'
  },
  questionCount: {
    margin: '4px 0 0 0',
    fontSize: '13px',
    opacity: 0.9
  },
  headerRight: {
    display: 'flex',
    alignItems: 'center'
  },
  timer: {
    fontSize: '20px',
    fontWeight: 'bold',
    backgroundColor: 'rgba(0,0,0,0.2)',
    padding: '8px 16px',
    borderRadius: '6px'
  },
  questionSelector: {
    display: 'flex',
    gap: '8px',
    padding: '12px 20px',
    backgroundColor: '#fff',
    borderBottom: '1px solid #ddd',
    overflowX: 'auto'
  },
  questionBtn: {
    padding: '8px 16px',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: 'bold',
    cursor: 'pointer',
    minWidth: '40px'
  },
  footer: {
    display: 'flex',
    gap: '12px',
    padding: '12px 20px',
    backgroundColor: '#fff',
    borderTop: '1px solid #ddd',
    alignItems: 'center'
  },
  prevBtn: {
    padding: '10px 20px',
    backgroundColor: '#95a5a6',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    cursor: 'pointer',
    fontWeight: 'bold'
  },
  nextBtn: {
    padding: '10px 20px',
    backgroundColor: '#95a5a6',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    cursor: 'pointer',
    fontWeight: 'bold'
  },
  solvedCount: {
    flex: 1,
    textAlign: 'center',
    fontSize: '14px',
    fontWeight: 'bold',
    color: '#2c3e50'
  },
  finishBtn: {
    padding: '10px 24px',
    backgroundColor: '#e74c3c',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    fontSize: '16px',
    cursor: 'pointer',
    fontWeight: 'bold'
  },
  noQuestions: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100vh',
    textAlign: 'center',
    color: '#7f8c8d'
  },
  skipBtn: {
    marginTop: '20px',
    padding: '12px 24px',
    backgroundColor: '#3498db',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    fontSize: '16px',
    cursor: 'pointer'
  }
};

export default DSARound;
