import React, { useState, useEffect } from 'react';
import { db } from '../firebase/config';
import { collection, onSnapshot, query, orderBy, addDoc, doc, updateDoc } from 'firebase/firestore';

/**
 * Real-Time Monitoring Component
 * Shows live student activity during exams
 */
function RealTimeMonitor() {
  const [activeStudents, setActiveStudents] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    highViolations: 0
  });

  useEffect(() => {
    // Listen to submissions collection in real-time
    const q = query(
      collection(db, 'submissions'),
      orderBy('submittedAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const students = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      setActiveStudents(students);

      // Calculate stats
      const now = new Date();
      const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
      
      const recentlyActive = students.filter(s => 
        s.submittedAt?.toDate() > fiveMinutesAgo
      );

      const highViolationCount = students.filter(s => 
        s.violations >= 3
      ).length;

      setStats({
        total: students.length,
        active: recentlyActive.length,
        highViolations: highViolationCount
      });

      console.log('🔄 Real-time update received:', students.length, 'submissions');
    }, (error) => {
      console.error('Real-time monitoring error:', error);
    });

    return () => unsubscribe();
  }, []);

  // 🔥 ADMIN CONTROL: Force submit student
  const handleForceSubmit = async (student) => {
    if (!window.confirm(`Force submit exam for ${student.userEmail}?\n\nThis will immediately end their exam session.`)) {
      return;
    }

    try {
      // Mark as force-submitted
      await updateDoc(doc(db, 'submissions', student.id), {
        forceSubmitted: true,
        forceSubmittedAt: new Date(),
        reason: 'admin_force_submit'
      });

      // Create admin action log
      await addDoc(collection(db, 'adminActions'), {
        action: 'force_submit',
        targetUserId: student.userId,
        targetEmail: student.userEmail,
        submissionId: student.id,
        timestamp: new Date(),
        adminEmail: localStorage.getItem('adminEmail') || 'admin'
      });

      alert(`✅ Force submitted exam for ${student.userEmail}`);
      console.log('🔨 Admin force-submitted:', student.userEmail);
    } catch (error) {
      console.error('Error force submitting:', error);
      alert('Failed to force submit. Please try again.');
    }
  };

  // 🔥 ADMIN CONTROL: Kick student (block from exam)
  const handleKickStudent = async (student) => {
    if (!window.confirm(`Kick ${student.userEmail} from the exam?\n\nThey will be blocked from continuing.`)) {
      return;
    }

    try {
      // Add to blocked list
      await addDoc(collection(db, 'blockedStudents'), {
        userId: student.userId,
        userEmail: student.userEmail,
        examId: student.examId,
        blockedAt: new Date(),
        reason: 'admin_kicked',
        adminEmail: localStorage.getItem('adminEmail') || 'admin'
      });

      // Log admin action
      await addDoc(collection(db, 'adminActions'), {
        action: 'kick_student',
        targetUserId: student.userId,
        targetEmail: student.userEmail,
        examId: student.examId,
        timestamp: new Date(),
        adminEmail: localStorage.getItem('adminEmail') || 'admin'
      });

      alert(`🚫 Kicked ${student.userEmail} from the exam`);
      console.log('👢 Admin kicked student:', student.userEmail);
    } catch (error) {
      console.error('Error kicking student:', error);
      alert('Failed to kick student. Please try again.');
    }
  };

  const getTimeAgo = (timestamp) => {
    if (!timestamp) return 'Unknown';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const seconds = Math.floor((new Date() - date) / 1000);
    
    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>📡 Real-Time Monitoring</h2>

      {/* Stats Cards */}
      <div style={styles.statsGrid}>
        <div style={{...styles.statCard, borderLeft: '4px solid #3498db'}}>
          <div style={styles.statNumber}>{stats.total}</div>
          <div style={styles.statLabel}>Total Submissions</div>
        </div>
        <div style={{...styles.statCard, borderLeft: '4px solid #27ae60'}}>
          <div style={styles.statNumber}>{stats.active}</div>
          <div style={styles.statLabel}>Active (Last 5min)</div>
        </div>
        <div style={{...styles.statCard, borderLeft: '4px solid #e74c3c'}}>
          <div style={styles.statNumber}>{stats.highViolations}</div>
          <div style={styles.statLabel}>High Violations (3+)</div>
        </div>
      </div>

      {/* Live Activity Feed */}
      <div style={styles.activitySection}>
        <h3 style={styles.subtitle}>📊 Recent Activity</h3>
        {activeStudents.length === 0 ? (
          <p style={styles.emptyState}>No submissions yet. Waiting for students...</p>
        ) : (
          <div style={styles.activityList}>
            {activeStudents.slice(0, 10).map(student => (
              <div key={student.id} style={styles.activityItem}>
                <div style={styles.activityLeft}>
                  <div style={styles.studentEmail}>{student.userEmail}</div>
                  <div style={styles.activityMeta}>
                    Score: {student.totalScore}/{student.totalQuestions} • 
                    Violations: <span style={{
                      color: student.violations >= 3 ? '#e74c3c' : student.violations > 0 ? '#f39c12' : '#27ae60',
                      fontWeight: 'bold'
                    }}>{student.violations}</span>
                    {student.forceSubmitted && (
                      <span style={{marginLeft: '8px', color: '#e74c3c', fontWeight: 'bold'}}>
                        [FORCE-SUBMITTED]
                      </span>
                    )}
                  </div>
                </div>
                <div style={styles.activityRight}>
                  <div style={styles.timestamp}>{getTimeAgo(student.submittedAt)}</div>
                  <div style={styles.adminControls}>
                    <button 
                      style={styles.forceSubmitBtn}
                      onClick={() => handleForceSubmit(student)}
                      title="Force submit this student's exam"
                    >
                      🔨 Force Submit
                    </button>
                    <button 
                      style={styles.kickBtn}
                      onClick={() => handleKickStudent(student)}
                      title="Kick student from exam"
                    >
                      🚫 Kick
                    </button>
                  </div>
                  {student.reason === 'violations' && (
                    <span style={styles.autoSubmitBadge}>AUTO-SUBMIT</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  container: {
    padding: '20px',
    backgroundColor: '#f8f9fa',
    borderRadius: '12px',
    margin: '20px 0'
  },
  title: {
    margin: '0 0 20px 0',
    color: '#2c3e50',
    fontSize: '24px',
    fontWeight: 'bold'
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '15px',
    marginBottom: '25px'
  },
  statCard: {
    backgroundColor: 'white',
    padding: '20px',
    borderRadius: '10px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
  },
  statNumber: {
    fontSize: '36px',
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: '5px'
  },
  statLabel: {
    fontSize: '14px',
    color: '#7f8c8d'
  },
  activitySection: {
    backgroundColor: 'white',
    padding: '20px',
    borderRadius: '10px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
  },
  subtitle: {
    margin: '0 0 15px 0',
    color: '#2c3e50',
    fontSize: '18px'
  },
  activityList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px'
  },
  activityItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px',
    backgroundColor: '#f8f9fa',
    borderRadius: '8px',
    borderLeft: '3px solid #3498db'
  },
  activityLeft: {
    flex: 1
  },
  studentEmail: {
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: '4px'
  },
  activityMeta: {
    fontSize: '13px',
    color: '#7f8c8d'
  },
  activityRight: {
    textAlign: 'right',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: '5px'
  },
  timestamp: {
    fontSize: '12px',
    color: '#95a5a6',
    marginBottom: '4px'
  },
  adminControls: {
    display: 'flex',
    gap: '5px',
    marginBottom: '4px'
  },
  forceSubmitBtn: {
    backgroundColor: '#e67e22',
    color: 'white',
    border: 'none',
    padding: '4px 8px',
    borderRadius: '5px',
    fontSize: '10px',
    cursor: 'pointer',
    fontWeight: 'bold'
  },
  kickBtn: {
    backgroundColor: '#e74c3c',
    color: 'white',
    border: 'none',
    padding: '4px 8px',
    borderRadius: '5px',
    fontSize: '10px',
    cursor: 'pointer',
    fontWeight: 'bold'
  },
  autoSubmitBadge: {
    backgroundColor: '#e74c3c',
    color: 'white',
    padding: '2px 8px',
    borderRadius: '10px',
    fontSize: '10px',
    fontWeight: 'bold'
  },
  emptyState: {
    textAlign: 'center',
    padding: '40px',
    color: '#95a5a6',
    fontSize: '14px'
  }
};

export default RealTimeMonitor;
