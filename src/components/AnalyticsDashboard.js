import React, { useState, useEffect } from 'react';
import { db } from '../firebase/config';
import { collection, getDocs } from 'firebase/firestore';

/**
 * Analytics Dashboard Component
 * Shows exam statistics and performance metrics
 */
function AnalyticsDashboard({ activeExamId, activeExam }) {
  const [analytics, setAnalytics] = useState({
    totalStudents: 0,
    averageScore: 0,
    highestScore: 0,
    lowestScore: 0,
    passRate: 0,
    subjectWise: [],
    dsaStats: { total: 0, avgPts: 0, avgPct: 0 },
    violationStats: { zero: 0, low: 0, medium: 0, high: 0 }
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, [activeExamId]);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      // Fetch all, filter client-side to avoid Firestore index/examId mismatch issues
      const submissionsSnap = await getDocs(collection(db, 'submissions'));
      let submissions = submissionsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      if (activeExamId) submissions = submissions.filter(s => s.examId === activeExamId);

      // Fetch DSA submissions and build score map
      const dsaSnap = await getDocs(collection(db, 'dsaSubmissions'));
      const dsaMap = {};
      dsaSnap.forEach(d => {
        const data = d.data();
        if (!data.userId || !data.examId) return;
        if (activeExamId && data.examId !== activeExamId) return;
        const key = `${data.userId}_${data.examId}`;
        if (!dsaMap[key] || (data.rawScore ?? data.score ?? 0) > (dsaMap[key].rawScore ?? dsaMap[key].score ?? -1)) {
          dsaMap[key] = { rawScore: data.rawScore ?? null, maxScore: data.maxScore ?? null, score: data.score ?? 0 };
        }
      });

      if (submissions.length === 0) {
        setAnalytics({
          totalStudents: 0,
          averageScore: 0,
          highestScore: 0,
          lowestScore: 0,
          passRate: 0,
          subjectWise: [],
          dsaStats: { total: 0, avgPts: 0, avgPct: 0 },
          violationStats: { zero: 0, low: 0, medium: 0, high: 0 }
        });
        setLoading(false);
        return;
      }

      // Calculate MCQ scores
      const scores = submissions.map(s => s.totalScore || 0);
      const totalStudents = submissions.length;
      const averageScore = scores.reduce((a, b) => a + b, 0) / totalStudents;
      const highestScore = Math.max(...scores);
      const lowestScore = Math.min(...scores);

      const passing = submissions.filter(s => {
        const total = s.totalQuestions || 1;
        return (s.totalScore / total) * 100 >= 50;
      }).length;
      const passRate = (passing / totalStudents) * 100;

      // Subject-wise performance (R1 + R2 from scores array)
      const subjectScores = {};
      submissions.forEach(sub => {
        if (sub.scores && Array.isArray(sub.scores)) {
          sub.scores.forEach(round => {
            const subject = round.round || 'Unknown';
            if (!subjectScores[subject]) subjectScores[subject] = { total: 0, count: 0 };
            subjectScores[subject].total += round.score;
            subjectScores[subject].count += round.total;
          });
        }
      });

      // Add DSA as a subject row
      const dsaEntries = Object.values(dsaMap);
      if (dsaEntries.length > 0) {
        const dsaWithMax = dsaEntries.filter(d => d.maxScore);
        const totalRaw = dsaWithMax.reduce((a, d) => a + (d.rawScore || 0), 0);
        const totalMax = dsaWithMax.reduce((a, d) => a + d.maxScore, 0);
        if (totalMax > 0) {
          subjectScores['Round 3: DSA Coding'] = { total: totalRaw, count: totalMax };
        }
      }

      const subjectWise = Object.keys(subjectScores).map(subject => ({
        name: subject,
        score: subjectScores[subject].total,
        total: subjectScores[subject].count,
        percentage: (subjectScores[subject].total / (subjectScores[subject].count || 1) * 100).toFixed(1)
      }));

      // DSA-specific stats
      const dsaWithRaw = Object.values(dsaMap).filter(d => d.rawScore !== null);
      const dsaStats = {
        total: Object.keys(dsaMap).length,
        avgPts: dsaWithRaw.length > 0
          ? Math.round(dsaWithRaw.reduce((a, d) => a + d.rawScore, 0) / dsaWithRaw.length)
          : 0,
        avgPct: dsaWithRaw.length > 0
          ? Math.round(dsaWithRaw.reduce((a, d) => a + d.score, 0) / dsaWithRaw.length)
          : 0,
      };

      // Violation statistics — violations stored as array [r1,r2,r3] or number
      const getTotalViolations = (s) => Array.isArray(s.violations)
        ? s.violations.reduce((a, b) => a + b, 0)
        : (s.violations || 0);

      const violationStats = {
        zero:   submissions.filter(s => getTotalViolations(s) === 0).length,
        low:    submissions.filter(s => { const v = getTotalViolations(s); return v >= 1 && v <= 2; }).length,
        medium: submissions.filter(s => { const v = getTotalViolations(s); return v >= 3 && v <= 4; }).length,
        high:   submissions.filter(s => getTotalViolations(s) >= 5).length,
      };

      setAnalytics({
        totalStudents,
        averageScore: averageScore.toFixed(1),
        highestScore,
        lowestScore,
        passRate: passRate.toFixed(1),
        subjectWise,
        dsaStats,
        violationStats
      });

    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div style={styles.loading}>📊 Loading analytics...</div>;
  }

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>📈 Analytics Dashboard {activeExam ? `(Live: ${activeExam.title})` : '(All Exams)'}</h2>

      {/* Key Metrics */}
      <div style={styles.metricsGrid}>
        <div className="admin-card" style={styles.metricCard}>
          <div style={styles.metricIcon}>👥</div>
          <div style={styles.metricValue}>{analytics.totalStudents}</div>
          <div style={styles.metricLabel}>Total Students</div>
        </div>

        <div className="admin-card" style={styles.metricCard}>
          <div style={styles.metricIcon}>📊</div>
          <div style={styles.metricValue}>{analytics.averageScore}</div>
          <div style={styles.metricLabel}>Average Score</div>
        </div>

        <div className="admin-card" style={styles.metricCard}>
          <div style={styles.metricIcon}>🏆</div>
          <div style={styles.metricValue}>{analytics.highestScore}</div>
          <div style={styles.metricLabel}>Highest Score</div>
        </div>

        <div className="admin-card" style={styles.metricCard}>
          <div style={styles.metricIcon}>✅</div>
          <div style={styles.metricValue}>{analytics.passRate}%</div>
          <div style={styles.metricLabel}>Pass Rate</div>
        </div>

        <div className="admin-card" style={styles.metricCard}>
          <div style={styles.metricIcon}>💻</div>
          <div style={styles.metricValue}>{analytics.dsaStats?.avgPct ?? 0}%</div>
          <div style={styles.metricLabel}>Avg DSA Score ({analytics.dsaStats?.avgPts ?? 0} pts)</div>
        </div>
      </div>

      {/* Subject-Wise Performance */}
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>📚 Subject-Wise Performance</h3>
        <div style={styles.chartContainer}>
          {analytics.subjectWise.length === 0 ? (
            <p style={styles.emptyState}>No subject data available</p>
          ) : (
            <div style={styles.barChart}>
              {analytics.subjectWise.map((subject, index) => (
                <div key={index} style={styles.barRow}>
                  <div style={styles.barLabel}>{subject.name}</div>
                  <div style={styles.barContainer}>
                    <div 
                      style={{
                        ...styles.bar,
                        width: `${subject.percentage}%`,
                        backgroundColor: getColorForPercentage(parseFloat(subject.percentage))
                      }}
                    >
                      <span style={styles.barValue}>{subject.percentage}%</span>
                    </div>
                  </div>
                  <div style={styles.barScore}>{subject.score}/{subject.total}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Violation Statistics */}
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>⚠️ Violation Statistics</h3>
        <div style={styles.violationGrid}>
          <div className="admin-card" style={{...styles.violationCard, borderColor: '#27ae60'}}>
            <div style={{...styles.violationCount, color: '#27ae60'}}>
              {analytics.violationStats.zero}
            </div>
            <div style={styles.violationLabel}>Zero Violations</div>
          </div>

          <div className="admin-card" style={{...styles.violationCard, borderColor: '#f39c12'}}>
            <div style={{...styles.violationCount, color: '#f39c12'}}>
              {analytics.violationStats.low}
            </div>
            <div style={styles.violationLabel}>Low (1-2)</div>
          </div>

          <div className="admin-card" style={{...styles.violationCard, borderColor: '#e67e22'}}>
            <div style={{...styles.violationCount, color: '#e67e22'}}>
              {analytics.violationStats.medium}
            </div>
            <div style={styles.violationLabel}>Medium (3-4)</div>
          </div>

          <div className="admin-card" style={{...styles.violationCard, borderColor: '#e74c3c'}}>
            <div style={{...styles.violationCount, color: '#e74c3c'}}>
              {analytics.violationStats.high}
            </div>
            <div style={styles.violationLabel}>High (5+)</div>
          </div>
        </div>
      </div>

      {/* Score Distribution */}
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>📉 Quick Stats</h3>
        <div style={styles.statsTable}>
          <div style={styles.statRow}>
            <span style={styles.statKey}>Highest Score:</span>
            <span style={styles.statValue}>{analytics.highestScore}</span>
          </div>
          <div style={styles.statRow}>
            <span style={styles.statKey}>Average Score:</span>
            <span style={styles.statValue}>{analytics.averageScore}</span>
          </div>
          <div style={styles.statRow}>
            <span style={styles.statKey}>Lowest Score:</span>
            <span style={styles.statValue}>{analytics.lowestScore}</span>
          </div>
          <div style={styles.statRow}>
            <span style={styles.statKey}>Pass Rate (≥50%):</span>
            <span style={styles.statValue}>{analytics.passRate}%</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// Helper function to get color based on percentage
const getColorForPercentage = (percentage) => {
  if (percentage >= 80) return '#27ae60';
  if (percentage >= 60) return '#2ecc71';
  if (percentage >= 40) return '#f39c12';
  return '#e74c3c';
};

const styles = {
  container: {
    padding: '20px',
    backgroundColor: '#f8f9fa',
    borderRadius: '12px',
    margin: '20px 0'
  },
  title: {
    margin: '0 0 25px 0',
    color: '#2c3e50',
    fontSize: '28px',
    fontWeight: 'bold'
  },
  loading: {
    textAlign: 'center',
    padding: '40px',
    fontSize: '18px',
    color: '#7f8c8d'
  },
  metricsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '15px',
    marginBottom: '25px'
  },
  metricCard: {
    backgroundColor: 'white',
    padding: '15px',
    borderRadius: '20px',
    boxShadow: '0 4px 15px rgba(0,0,0,0.03)',
    textAlign: 'center',
    border: '1px solid #f1f5f9'
  },
  metricIcon: {
    fontSize: '24px',
    marginBottom: '8px'
  },
  metricValue: {
    fontSize: '24px',
    fontWeight: '900',
    color: '#1e293b',
    marginBottom: '2px'
  },
  metricLabel: {
    fontSize: '11px',
    color: '#64748b',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
  },
  section: {
    backgroundColor: 'white',
    padding: '20px',
    borderRadius: '12px',
    boxShadow: '0 2px 10px rgba(0,0,0,0.08)',
    marginBottom: '20px'
  },
  sectionTitle: {
    margin: '0 0 20px 0',
    color: '#2c3e50',
    fontSize: '20px',
    fontWeight: 'bold'
  },
  chartContainer: {
    padding: '10px 0'
  },
  barChart: {
    display: 'flex',
    flexDirection: 'column',
    gap: '15px'
  },
  barRow: {
    display: 'grid',
    gridTemplateColumns: '150px 1fr 80px',
    alignItems: 'center',
    gap: '15px'
  },
  barLabel: {
    fontSize: '14px',
    fontWeight: 'bold',
    color: '#2c3e50'
  },
  barContainer: {
    backgroundColor: '#ecf0f1',
    borderRadius: '8px',
    height: '30px',
    position: 'relative'
  },
  bar: {
    height: '100%',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingRight: '10px',
    transition: 'width 0.3s ease',
    minWidth: '50px'
  },
  barValue: {
    color: 'white',
    fontSize: '12px',
    fontWeight: 'bold'
  },
  barScore: {
    fontSize: '13px',
    color: '#7f8c8d',
    textAlign: 'right'
  },
  violationGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
    gap: '15px'
  },
  violationCard: {
    padding: '20px',
    borderRadius: '10px',
    border: '3px solid',
    textAlign: 'center',
    backgroundColor: '#f8f9fa'
  },
  violationCount: {
    fontSize: '36px',
    fontWeight: 'bold',
    marginBottom: '5px'
  },
  violationLabel: {
    fontSize: '14px',
    color: '#7f8c8d'
  },
  statsTable: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  statRow: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '12px',
    backgroundColor: '#f8f9fa',
    borderRadius: '8px'
  },
  statKey: {
    fontWeight: 'bold',
    color: '#2c3e50'
  },
  statValue: {
    color: '#3498db',
    fontWeight: 'bold'
  },
  emptyState: {
    textAlign: 'center',
    padding: '40px',
    color: '#95a5a6',
    fontSize: '14px'
  }
};

export default AnalyticsDashboard;
