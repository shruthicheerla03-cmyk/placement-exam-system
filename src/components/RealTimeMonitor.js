import React, { useState, useEffect } from 'react';
import { db } from '../firebase/config';
import { collection, onSnapshot, addDoc, doc, updateDoc, getDocs, query, where } from 'firebase/firestore';
import Dialog from './Dialog';

/**
 * Real-Time Monitoring Component
 * Shows live student activity during exams
 */
function RealTimeMonitor({ activeExamId }) {
  const [activeStudents, setActiveStudents] = useState([]);
  const [examsMap, setExamsMap] = useState({});
  const [dsaMap, setDsaMap] = useState({});
  const [userNamesMap, setUserNamesMap] = useState({});
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    highViolations: 0
  });

  // Dialog State
  const [dialogConfig, setDialogConfig] = useState({
    isOpen: false,
    title: '',
    message: '',
    type: 'confirm',
    onConfirm: () => {},
    onCancel: () => setDialogConfig(prev => ({ ...prev, isOpen: false })),
    showCancel: true
  });

  const showDialog = (title, message, onConfirm, type = 'confirm', showCancel = true) => {
    setDialogConfig({
      isOpen: true,
      title,
      message,
      type,
      onConfirm: async () => {
        await onConfirm();
        setDialogConfig(prev => ({ ...prev, isOpen: false }));
      },
      onCancel: () => setDialogConfig(prev => ({ ...prev, isOpen: false })),
      showCancel
    });
  };

  useEffect(() => {
    // Always fetch ALL submissions, filter client-side — avoids Firestore index
    // requirements and works regardless of exam ID mismatches
    const submissionsQuery = activeExamId 
      ? query(collection(db, 'submissions'), where('examId', '==', activeExamId))
      : collection(db, 'submissions');

    const unsubscribe = onSnapshot(submissionsQuery, (snapshot) => {
      // If no active exam is provided, we should probably not show anything in "Live" monitor
      if (!activeExamId) {
        setActiveStudents([]);
        setStats({ total: 0, active: 0, highViolations: 0 });
        return;
      }

      let students = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      // Sort newest first client-side (for activity feed)
      students.sort((a, b) => {
        const ta = a.submittedAt?.toDate ? a.submittedAt.toDate() : new Date(a.submittedAt || 0);
        const tb = b.submittedAt?.toDate ? b.submittedAt.toDate() : new Date(b.submittedAt || 0);
        return tb - ta;
      });

      setActiveStudents(students);

      const now = new Date();
      const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
      const recentlyActive = students.filter(s => {
        const date = s.submittedAt?.toDate ? s.submittedAt.toDate() : new Date(s.submittedAt || s.createdAt);
        return date > fiveMinutesAgo;
      });

      const getTotalViolations = (s) => Array.isArray(s.violations)
        ? s.violations.reduce((a, b) => a + b, 0)
        : (s.violations || 0);

      const highViolationCount = students.filter(s => getTotalViolations(s) >= 3).length;

      setStats({
        total: students.length,
        active: recentlyActive.length,
        highViolations: highViolationCount
      });
    }, (error) => {
      console.error('Real-time monitoring error:', error);
    });

    return () => unsubscribe();
  }, [activeExamId, db]);

  useEffect(() => {
    // Fetch users to build email → name map
    const fetchUsers = async () => {
      try {
        const snap = await getDocs(collection(db, 'users'));
        const map = {};
        snap.forEach(d => {
          const u = d.data();
          if (u.email) map[u.email] = u.name || u.displayName || u.username || '';
        });
        setUserNamesMap(map);
      } catch (err) { console.error('Error fetching users for monitor:', err); }
    };
    fetchUsers();
  }, []);

  useEffect(() => {
    // Fetch exams to get master question counts for consistency
    const fetchExams = async () => {
      try {
        const snap = await getDocs(collection(db, 'exams'));
        const map = {};
        snap.forEach(d => { 
          const data = d.data();
          map[d.id] = data.totalPoints || data.totalQuestions; 
        });
        setExamsMap(map);
      } catch (err) { console.error('Error fetching exams for monitor:', err); }
    };
    fetchExams();
  }, []);

  useEffect(() => {
    // 2. Listen for DSA Submissions for unified score merging
    const unsubscribe = onSnapshot(collection(db, 'dsaSubmissions'), (snapshot) => {
      const map = {};
      snapshot.forEach(d => {
        const data = d.data();
        if (!data.userId || !data.examId) return;
        const key = `${data.userId}_${data.examId}`;
        const existing = map[key];
        if (!existing || (data.rawScore ?? 0) > (existing.rawScore ?? -1)) {
          map[key] = data;
        }
      });
      setDsaMap(map);
    });
    return () => unsubscribe();
  }, []);

  // 🔥 ADMIN CONTROL: Force submit student
  const handleForceSubmit = async (student) => {
    showDialog(
      '⚠️ Confirm Force Submit',
      `Are you sure you want to force submit the exam for ${student.userEmail}? This will immediately end their session.`,
      async () => {
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

          showDialog('Success', `✅ Force submitted exam for ${student.userEmail}`, () => {}, 'success', false);
          console.log('🔨 Admin force-submitted:', student.userEmail);
        } catch (error) {
          console.error('Error force submitting:', error);
          showDialog('Error', 'Failed to force submit. Please try again.', () => {}, 'warning', false);
        }
      }
    );
  };

  // 🔥 ADMIN CONTROL: Kick student (block from exam)
  const handleKickStudent = async (student) => {
    showDialog(
      '🚫 Confirm Kick',
      `Kick ${student.userEmail} from the exam? They will be blocked from continuing.`,
      async () => {
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

          showDialog('Success', `🚫 Kicked ${student.userEmail} from the exam`, () => {}, 'success', false);
          console.log('👢 Admin kicked student:', student.userEmail);
        } catch (error) {
          console.error('Error kicking student:', error);
          showDialog('Error', 'Failed to kick student. Please try again.', () => {}, 'warning', false);
        }
      }
    );
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

  if (!activeExamId) {
    return (
      <div style={{ ...styles.card, textAlign: 'center', padding: '100px 20px', backgroundColor: '#f8fafc', border: '2px dashed #cbd5e1' }}>
        <div style={{ fontSize: '64px', marginBottom: '20px' }}>📡</div>
        <h2 style={{ color: '#1e293b', marginBottom: '10px' }}>No Live Exam in Progress</h2>
        <p style={{ color: '#64748b', fontSize: '16px' }}>The monitoring system is on standby. Data will appear here automatically when a new exam starts.</p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>📡 Real-Time Monitoring {activeExamId ? '(Live Exam)' : '(All Submissions)'}</h2>

      {/* Stats Cards */}
      <div style={styles.statsGrid}>
        <div className="admin-card" style={{...styles.statCard, borderLeft: '4px solid #3498db'}}>
          <div style={styles.statNumber}>{stats.total}</div>
          <div style={styles.statLabel}>Total Submissions</div>
        </div>
        <div className="admin-card" style={{...styles.statCard, borderLeft: '4px solid #27ae60'}}>
          <div style={styles.statNumber}>{stats.active}</div>
          <div style={styles.statLabel}>Active (Last 5min)</div>
        </div>
        <div className="admin-card" style={{...styles.statCard, borderLeft: '4px solid #e74c3c'}}>
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
                    Score: {(() => {
                      const dsa = dsaMap[`${student.userId}_${student.examId}`];
                      // Calculate MCQ portion strictly
                      const r1Match = (student.scores || []).find(s => s.round?.includes('Round 1') || s.round?.includes('Aptitude'));
                      const r2Match = (student.scores || []).find(s => s.round?.includes('Round 2') || s.round?.includes('Core'));
                      const mcqPoints = (r1Match?.score || 0) + (r2Match?.score || 0);
                      
                      const totalPoints = mcqPoints + (dsa?.rawScore || 0);
                      // Consistent Denominator
                      // If examsMap has a large value, it's already the unified totalPoints.
                      // Otherwise, it's likely just the MCQ count (legacy), so we add dsa.maxScore.
                      const masterValue = examsMap[student.examId] || student.totalQuestions || 0;
                      const officialMax = (masterValue > (student.totalQuestions || 0)) 
                        ? masterValue 
                        : (masterValue + (dsa?.maxScore || 0));
                      
                      return `${totalPoints}/${officialMax}`;
                    })()} • 
                    Violations: <span style={{
                      color: (() => { const v = Array.isArray(student.violations) ? student.violations.reduce((a,b)=>a+b,0) : (student.violations||0); return v >= 3 ? '#e74c3c' : v > 0 ? '#f39c12' : '#27ae60'; })(),
                      fontWeight: 'bold'
                    }}>{Array.isArray(student.violations) ? student.violations.reduce((a,b)=>a+b,0) : (student.violations||0)}</span>
                    {student.forceSubmitted && (
                      <span style={{marginLeft: '8px', color: '#e74c3c', fontWeight: 'bold'}}>
                        [FORCE-SUBMITTED]
                      </span>
                    )}
                  </div>
                </div>
                <div style={styles.activityRight}>
                  <div style={styles.timestamp}>{getTimeAgo(student.submittedAt)}</div>
                  {userNamesMap[student.userEmail] && (
                    <div style={{ fontWeight: '600', color: '#2c3e50', fontSize: '14px', marginTop: '4px', textAlign: 'right' }}>
                      {userNamesMap[student.userEmail]}
                    </div>
                  )}
                  {student.reason === 'violations' && (
                    <span style={styles.autoSubmitBadge}>AUTO-SUBMIT</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modern Dialog System */}
      <Dialog
        isOpen={dialogConfig.isOpen}
        title={dialogConfig.title}
        message={dialogConfig.message}
        type={dialogConfig.type}
        onConfirm={dialogConfig.onConfirm}
        onCancel={dialogConfig.onCancel}
        showCancel={dialogConfig.showCancel}
      />
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
