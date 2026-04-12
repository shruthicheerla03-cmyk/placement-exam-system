import React, { useState, useEffect } from 'react';
import CodeEditor from '../components/CodeEditor';
import { db } from '../firebase/config';
import { collection, addDoc } from 'firebase/firestore';
import { ChevronRight } from 'lucide-react';
import '../pages/ExamPage.css'; // Reuse the professional styles

/**
 * DSA Round Component - Coding Round with IDE
 */
function DSARound({ exam, questions, onComplete, userId, examId, violations, showDialog, currentTime, timeLeft: globalTimeLeft }) {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [solutions, setSolutions] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const MAX_VIOLATIONS = 5;

  // Use the time from ExamPage (parent)
  const timeLeft = globalTimeLeft;

  // Timer
  // eslint-disable-next-line react-hooks/exhaustive-deps
  // Timer logic moved to parent (ExamPage)

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
      showDialog(
        'Problems Submitted',
        'All problems in this round have been submitted. You can now click "Finish Round" to complete the session.',
        () => {},
        'success',
        false
      );
    }
  };

  // Submit entire DSA round
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
        showDialog('Submission Error', 'Failed to submit the round. Please try again.', () => {}, 'warning', false);
        setIsSubmitting(false);
      }
    });
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
      {/* Header (Replicating ExamPage style) */}
      <header className="exam-header" style={{backgroundColor: '#e67e22', height: '70px', padding: '0 24px'}}>
        <div className="header-left">
          <h3 style={{fontSize: '20px', fontWeight: '800', margin: 0}}>Round 3: DSA Coding</h3>
          <div style={{fontSize: '12px', opacity: 0.9, marginTop: '2px'}}>
            Problem {currentQuestion + 1} of {questions.length}
          </div>
        </div>
        
        <div style={{display: 'flex', alignItems: 'center', gap: '20px'}}>
          {/* Violation indicator (As requested: "show violations as like before rounds") */}
          <div style={{display: 'flex', alignItems: 'center', gap: '4px', backgroundColor: 'rgba(0,0,0,0.15)', padding: '6px 12px', borderRadius: '8px'}}>
            <div style={{display: 'flex', alignItems: 'center', gap: '3px'}}>
              {Array.from({length: MAX_VIOLATIONS}).map((_, i) => (
                <div key={i} className={`violation-dot ${i < violations ? 'active' : ''}`} style={{ width: '8px', height: '8px' }} />
              ))}
            </div>
            <span style={{fontSize: '11px', marginLeft: '4px', fontWeight: 700, color: 'white', textTransform: 'uppercase', letterSpacing: '0.5px'}}>Violations</span>
          </div>

          <div style={{fontSize: '14px', opacity: 0.9, display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: 'rgba(0,0,0,0.1)', padding: '6px 10px', borderRadius: '6px'}}>
            <span style={{fontSize: '16px'}}>🕒</span>
            {currentTime}
          </div>

          <div style={{fontSize: '22px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '8px'}}>
            <span style={{fontSize: '24px'}}>⏱</span>
            {Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, '0')}
          </div>
        </div>
      </header>

      {/* Question Selector - Compacted space */}
      {questions.length > 1 && (
        <div style={{ ...styles.questionSelector, padding: '10px 20px 0px 20px', minHeight: '65px' }}>
          {questions.map((q, i) => (
            <button
              key={i}
              style={{
                ...styles.questionBtn,
                height: '45px',
                width: '45px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '18px',
                backgroundColor: solutions[i] ? '#27ae60' : i === currentQuestion ? '#3498db' : '#ecf0f1',
                color: solutions[i] || i === currentQuestion ? '#fff' : '#2c3e50'
              }}
              onClick={() => setCurrentQuestion(i)}
            >
              {i + 1}
            </button>
          ))}
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
