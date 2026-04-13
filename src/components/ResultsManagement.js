import React, { useState, useEffect } from 'react';
import { db } from '../firebase/config';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';

/**
 * Exam-Centric Results Management Component
 * Step 1: Display list of exams
 * Step 2: Select exam to view students who attempted it
 * Step 3: Manage student status and campus assignment
 * @param {Object} props
 * @param {Function} props.setTab
 */
function ResultsManagement({ setTab }) {
  // Add CSS for hover effects
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      .table-row-hover:hover {
        background-color: #f8f9fa !important;
      }
      .export-btn:hover {
        background-color: #1e8449 !important; /* Darker green */
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(39, 174, 96, 0.3);
      }
      .back-btn:hover {
        background-color: #7f8c8d !important;
        transform: translateY(-2px);
      }
    `;
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, []);

  // State management
  const [selectedExamId, setSelectedExamId] = useState(null);
  const [exams, setExams] = useState([]);
  const [allSubmissions, setAllSubmissions] = useState([]);
  const [filteredSubmissions, setFilteredSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(null);
  const [filter, setFilter] = useState('all'); // all, selected, rejected, pending

  // Initial load: fetch all data
  useEffect(() => {
    fetchAllData();
  }, []);

  // Fetch exams and submissions
  const fetchAllData = async () => {
    setLoading(true);
    try {
      // Fetch exams
      const examsSnap = await getDocs(collection(db, 'exams'));
      const examsData = examsSnap.docs.map(d => ({
        id: d.id,
        title: d.data().title,
        examCode: d.data().examCode,
        createdAt: d.data().createdAt,
        totalQuestions: d.data().totalQuestions
      }));

      // Fetch all users to map names
      const usersSnap = await getDocs(collection(db, 'users'));
      const userNamesMap = {};
      usersSnap.forEach(doc => {
        const u = doc.data();
        userNamesMap[u.email] = u.name || u.displayName || u.username || 'Student';
      });

      // Fetch all submissions
      const submissionsSnap = await getDocs(collection(db, 'submissions'));
      const submissionsData = submissionsSnap.docs.map(d => ({
        id: d.id,
        ...d.data(),
        userName: userNamesMap[d.data().userEmail] || 'Student',
        status: d.data().status || 'pending',
        campus: d.data().campus || 'Not Assigned'
      }));

      // Build exam stats
      const examStats = examsData.map(exam => {
        const examSubmissions = submissionsData.filter(s => s.examId === exam.id);
        const totalStudents = examSubmissions.length;
        const avgScore = totalStudents > 0
          ? (examSubmissions.reduce((sum, s) => sum + (s.totalScore || 0), 0) / totalStudents).toFixed(1)
          : 0;
        const selectedCount = examSubmissions.filter(s => s.status === 'selected').length;
        const rejectedCount = examSubmissions.filter(s => s.status === 'rejected').length;
        const pendingCount = examSubmissions.filter(s => s.status === 'pending').length;

        return {
          ...exam,
          totalStudents,
          avgScore,
          selectedCount,
          rejectedCount,
          pendingCount
        };
      });

      setExams(examStats);
      setAllSubmissions(submissionsData);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Handle exam selection
  const handleExamSelect = (examId) => {
    setSelectedExamId(examId);
    const examSubmissions = allSubmissions.filter(s => s.examId === examId);
    // Sort by score descending
    examSubmissions.sort((a, b) => (b.totalScore || 0) - (a.totalScore || 0));
    setFilteredSubmissions(examSubmissions);
    setFilter('all'); // Reset filter when selecting new exam
  };

  // Handle back to exams list
  const handleBackToExams = () => {
    setSelectedExamId(null);
    setFilteredSubmissions([]);
    setFilter('all');
  };

  // Update student status
  const updateStatus = async (submissionId, newStatus) => {
    setUpdating(submissionId);
    try {
      await updateDoc(doc(db, 'submissions', submissionId), {
        status: newStatus,
        updatedAt: new Date()
      });
      
      // Update both filtered and all submissions
      setFilteredSubmissions(prev => prev.map(sub =>
        sub.id === submissionId ? { ...sub, status: newStatus } : sub
      ));
      setAllSubmissions(prev => prev.map(sub =>
        sub.id === submissionId ? { ...sub, status: newStatus } : sub
      ));
      
      // Update exam stats
      setExams(prev => prev.map(exam => {
        if (exam.id === selectedExamId) {
          const updatedSubmissions = allSubmissions.map(sub =>
            sub.id === submissionId ? { ...sub, status: newStatus } : sub
          ).filter(s => s.examId === exam.id);
          
          return {
            ...exam,
            selectedCount: updatedSubmissions.filter(s => s.status === 'selected').length,
            rejectedCount: updatedSubmissions.filter(s => s.status === 'rejected').length,
            pendingCount: updatedSubmissions.filter(s => s.status === 'pending').length
          };
        }
        return exam;
      }));
      
      console.log(`✅ Updated status to: ${newStatus}`);
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Failed to update status. Please try again.');
    } finally {
      setUpdating(null);
    }
  };

  // Handle CSV Export
  const handleExportCSV = () => {
    const selectedExam = exams.find(e => e.id === selectedExamId);
    if (!selectedExam || filteredSubmissions.length === 0) return;

    const data = filteredSubmissions.map(sub => ({
      'Student Name': sub.userName,
      'Email': sub.userEmail,
      'Score': sub.totalScore,
      'Max Score': sub.totalQuestions,
      'Percentage': `${((sub.totalScore / sub.totalQuestions) * 100).toFixed(1)}%`,
      'Status': sub.status,
      'Campus': sub.campus
    }));

    const headers = Object.keys(data[0]).join(',');
    const csvRows = data.map(row => Object.values(row).map(v => `"${v}"`).join(','));
    const csvString = [headers, ...csvRows].join('\n');
    
    const blob = new Blob([csvString], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${selectedExam.title.replace(/\s+/g, '_')}_Results.csv`;
    link.click();
  };

  // Update campus assignment
  const updateCampus = async (submissionId, campus) => {
    if (!campus.trim()) return;
    
    setUpdating(submissionId);
    try {
      await updateDoc(doc(db, 'submissions', submissionId), {
        campus: campus,
        updatedAt: new Date()
      });
      
      setFilteredSubmissions(prev => prev.map(sub =>
        sub.id === submissionId ? { ...sub, campus } : sub
      ));
      setAllSubmissions(prev => prev.map(sub =>
        sub.id === submissionId ? { ...sub, campus } : sub
      ));
      
      console.log(`✅ Updated campus to: ${campus}`);
    } catch (error) {
      console.error('Error updating campus:', error);
      alert('Failed to update campus. Please try again.');
    } finally {
      setUpdating(null);
    }
  };

  // Filter submissions by status
  const getFilteredByStatus = () => {
    if (filter === 'all') return filteredSubmissions;
    return filteredSubmissions.filter(sub => sub.status === filter);
  };

  // Helper functions
  const getStatusColor = (status) => {
    switch (status) {
      case 'selected': return '#27ae60';
      case 'rejected': return '#e74c3c';
      default: return '#f39c12';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'selected': return '✅';
      case 'rejected': return '❌';
      default: return '⏳';
    }
  };

  // Loading state
  if (loading) {
    return <div style={styles.loading}>📋 Loading exams and results...</div>;
  }

  // ==== VIEW 1: EXAMS LIST ====
  if (!selectedExamId) {
    return (
      <div style={styles.container}>
        <div style={styles.header}>
          <h2 style={styles.title}>📋 Results Management - Select Exam</h2>
          <p style={styles.subtitle}>Choose an exam to view and manage student results</p>
        </div>

        <div style={styles.examsGrid}>
          {exams.length === 0 ? (
            <div style={styles.emptyState}>
              <p>No exams found. Create exams first to see results here.</p>
            </div>
          ) : (
            <>
              {exams.map(exam => (
              <div 
                key={exam.id} 
                className="exam-card-hover"
                style={styles.examCard}
                onClick={() => handleExamSelect(exam.id)}
              >
                <div style={styles.examHeader}>
                  <h3 style={styles.examTitle}>{exam.title}</h3>
                  <span style={styles.examCode}>🔑 {exam.examCode}</span>
                </div>

                <div style={styles.examStats}>
                  <div style={styles.statItem}>
                    <div style={styles.statContent}>
                      <div style={styles.statValue}>{exam.totalStudents}</div>
                      <div style={styles.statLabel}>Students</div>
                    </div>
                  </div>

                  <div style={styles.statItem}>
                    <div style={styles.statContent}>
                      <div style={styles.statValue}>{exam.avgScore}</div>
                      <div style={styles.statLabel}>Avg Score</div>
                    </div>
                  </div>

                  <div style={styles.statItem}>
                    <div style={styles.statContent}>
                      <div style={styles.statValue}>{exam.selectedCount}</div>
                      <div style={styles.statLabel}>Selected</div>
                    </div>
                  </div>

                  <div style={styles.statItem}>
                    <div style={styles.statContent}>
                      <div style={styles.statValue}>{exam.rejectedCount}</div>
                      <div style={styles.statLabel}>Rejected</div>
                    </div>
                  </div>

                  <div style={styles.statItem}>
                    <div style={styles.statContent}>
                      <div style={styles.statValue}>{exam.pendingCount}</div>
                      <div style={styles.statLabel}>Pending</div>
                    </div>
                  </div>
                </div>
                <button className="view-results-btn" style={styles.viewResultsBtn}>
                  View Results →
                </button>
              </div>
            ))}
          </>
        )}
      </div>
      </div>
    );
  }

  // ==== VIEW 2: STUDENTS LIST FOR SELECTED EXAM ====
  const selectedExam = exams.find(e => e.id === selectedExamId);
  const statusFilteredSubmissions = getFilteredByStatus();

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={styles.title}>📋 {selectedExam?.title}</h2>
            <p style={styles.subtitle}>
              Exam Code: {selectedExam?.examCode} | {filteredSubmissions.length} students attempted
            </p>
          </div>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <button 
              className="export-btn" 
              style={{...styles.actionBtn, backgroundColor: '#27ae60', color: 'white', display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 20px'}}
              onClick={handleExportCSV}
            >
              📥 Export as Excel (CSV)
            </button>
            <button className="back-btn" style={styles.backButton} onClick={handleBackToExams}>
              ← Back
            </button>
          </div>
        </div>
      </div>

      <div style={styles.filterButtons}>
        <button 
          style={{...styles.filterBtn, ...(filter === 'all' ? styles.filterBtnActive : {})}}
          onClick={() => setFilter('all')}
        >
          All ({filteredSubmissions.length})
        </button>
        <button 
          style={{...styles.filterBtn, ...(filter === 'selected' ? styles.filterBtnActive : {})}}
          onClick={() => setFilter('selected')}
        >
          Selected ({filteredSubmissions.filter(s => s.status === 'selected').length})
        </button>
        <button 
          style={{...styles.filterBtn, ...(filter === 'rejected' ? styles.filterBtnActive : {})}}
          onClick={() => setFilter('rejected')}
        >
          Rejected ({filteredSubmissions.filter(s => s.status === 'rejected').length})
        </button>
        <button 
          style={{...styles.filterBtn, ...(filter === 'pending' ? styles.filterBtnActive : {})}}
          onClick={() => setFilter('pending')}
        >
          Pending ({filteredSubmissions.filter(s => s.status === 'pending').length})
        </button>
      </div>

      {statusFilteredSubmissions.length === 0 ? (
        <div style={styles.emptyState}>
          <p>No students found for "{filter}" filter in this exam.</p>
        </div>
      ) : (
        <div style={styles.tableContainer}>
          <table style={styles.table}>
            <thead>
              <tr style={styles.tableHeaderRow}>
                <th style={styles.th}>#</th>
                <th style={styles.th}>Student</th>
                <th style={styles.th}>Score</th>
                <th style={styles.th}>Percentage</th>
                <th style={styles.th}>Violations</th>
                <th style={styles.th}>Status</th>
                <th style={styles.th}>Campus</th>
                <th style={styles.th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {statusFilteredSubmissions.map((sub, index) => {
                const percentage = ((sub.totalScore / sub.totalQuestions) * 100).toFixed(1);
                
                return (
                  <tr key={sub.id} style={styles.tableRow} className="table-row-hover">
                    <td style={styles.td}>{index + 1}</td>
                    <td style={styles.td}>
                      <div style={styles.studentCell}>
                        <div style={{...styles.studentEmail, fontWeight: 'bold', color: '#1a202c'}}>{sub.userName}</div>
                        <div style={styles.studentEmail}>{sub.userEmail}</div>
                        <div style={styles.studentMeta}>
                          Attempted: {sub.submittedAt?.toDate ? 
                            new Date(sub.submittedAt.toDate()).toLocaleDateString() :
                            'N/A'
                          }
                        </div>
                      </div>
                    </td>
                    <td style={styles.td}>
                      <strong>{sub.totalScore}</strong>/{sub.totalQuestions}
                    </td>
                    <td style={styles.td}>
                      <div style={{
                        ...styles.percentageBadge,
                        backgroundColor: percentage >= 60 ? '#27ae60' : percentage >= 40 ? '#f39c12' : '#e74c3c'
                      }}>
                        {percentage}%
                      </div>
                    </td>
                    <td style={styles.td}>
                      <span style={{
                        color: sub.violations >= 3 ? '#e74c3c' : sub.violations > 0 ? '#f39c12' : '#27ae60',
                        fontWeight: 'bold'
                      }}>
                        {sub.violations || 0}
                      </span>
                    </td>
                    <td style={styles.td}>
                      <div style={{
                        ...styles.statusBadge,
                        color: getStatusColor(sub.status)
                      }}>
                        {getStatusIcon(sub.status)} {sub.status.toUpperCase()}
                      </div>
                    </td>
                    <td style={styles.td}>
                      <input
                        type="text"
                        value={sub.campus}
                        onChange={(e) => {
                          // Update local state immediately for better UX
                          setFilteredSubmissions(prev => prev.map(s =>
                            s.id === sub.id ? { ...s, campus: e.target.value } : s
                          ));
                        }}
                        onBlur={(e) => updateCampus(sub.id, e.target.value)}
                        disabled={updating === sub.id}
                        style={styles.campusInput}
                        placeholder="Enter campus"
                      />
                    </td>
                    <td style={styles.td}>
                      <div style={styles.actionButtons}>
                        <button
                          onClick={() => updateStatus(sub.id, 'selected')}
                          disabled={updating === sub.id || sub.status === 'selected'}
                          style={{
                            ...styles.actionBtn,
                            ...styles.selectBtn,
                            opacity: sub.status === 'selected' ? 0.5 : 1
                          }}
                        >
                          Select
                        </button>
                        <button
                          onClick={() => updateStatus(sub.id, 'rejected')}
                          disabled={updating === sub.id || sub.status === 'rejected'}
                          style={{
                            ...styles.actionBtn,
                            ...styles.rejectBtn,
                            opacity: sub.status === 'rejected' ? 0.5 : 1
                          }}
                        >
                          Reject
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    padding: '0',
    margin: '0'
  },
  header: {
    marginBottom: '20px'
  },
  title: {
    margin: '0 0 10px 0',
    color: '#2c3e50',
    fontSize: '24px',
    fontWeight: 'bold'
  },
  subtitle: {
    margin: '0',
    color: '#7f8c8d',
    fontSize: '14px'
  },
  loading: {
    textAlign: 'center',
    padding: '40px',
    fontSize: '18px',
    color: '#7f8c8d'
  },
  // Exam cards grid
  examsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: '20px',
    marginTop: '20px'
  },
  examCard: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '15px',
    boxShadow: '0 2px 10px rgba(0,0,0,0.06)',
    cursor: 'pointer',
    transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
    border: '1px solid #edf2f7',
  },
  examHeader: {
    marginBottom: '15px',
    paddingBottom: '15px',
    borderBottom: '2px solid #ecf0f1'
  },
  examTitle: {
    margin: '0 0 8px 0',
    color: '#2c3e50',
    fontSize: '18px',
    fontWeight: 'bold'
  },
  examCode: {
    fontSize: '13px',
    color: '#7f8c8d',
    backgroundColor: '#ecf0f1',
    padding: '4px 10px',
    borderRadius: '6px',
    display: 'inline-block'
  },
  examStats: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '10px',
    marginBottom: '10px'
  },
  statItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px'
  },
  statIcon: {
    fontSize: '20px'
  },
  statContent: {
    display: 'flex',
    flexDirection: 'column'
  },
  statValue: {
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#2c3e50'
  },
  statLabel: {
    fontSize: '11px',
    color: '#7f8c8d',
    textTransform: 'uppercase'
  },
  viewResultsBtn: {
    width: '100%',
    padding: '10px',
    backgroundColor: '#3498db',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: 'background-color 0.2s'
  },
  backButton: {
    padding: '8px 16px',
    backgroundColor: '#95a5a6',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '13px',
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
  },
  filterButtons: {
    display: 'flex',
    gap: '10px',
    flexWrap: 'wrap',
    marginBottom: '20px'
  },
  filterBtn: {
    padding: '8px 16px',
    border: '2px solid #ddd',
    backgroundColor: 'white',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    transition: 'all 0.2s'
  },
  filterBtnActive: {
    backgroundColor: '#3498db',
    color: 'white',
    borderColor: '#3498db'
  },
  tableContainer: {
    backgroundColor: 'white',
    borderRadius: '10px',
    overflow: 'auto',
    boxShadow: '0 2px 10px rgba(0,0,0,0.08)'
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse'
  },
  tableHeaderRow: {
    backgroundColor: '#34495e',
    color: 'white'
  },
  th: {
    padding: '12px',
    textAlign: 'left',
    fontSize: '13px',
    fontWeight: 'bold',
    whiteSpace: 'nowrap'
  },
  tableRow: {
    borderBottom: '1px solid #ecf0f1',
    transition: 'background-color 0.2s'
  },
  td: {
    padding: '12px',
    fontSize: '14px'
  },
  studentCell: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px'
  },
  studentEmail: {
    fontWeight: '500',
    color: '#2c3e50'
  },
  studentMeta: {
    fontSize: '12px',
    color: '#7f8c8d'
  },
  percentageBadge: {
    display: 'inline-block',
    padding: '4px 10px',
    borderRadius: '12px',
    color: 'white',
    fontWeight: 'bold',
    fontSize: '13px'
  },
  statusBadge: {
    fontWeight: 'bold',
    fontSize: '12px'
  },
  campusInput: {
    padding: '6px 10px',
    border: '1px solid #ddd',
    borderRadius: '6px',
    fontSize: '13px',
    width: '120px'
  },
  actionButtons: {
    display: 'flex',
    gap: '8px'
  },
  actionBtn: {
    padding: '6px 12px',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: 'bold',
    transition: 'all 0.2s'
  },
  selectBtn: {
    backgroundColor: '#27ae60',
    color: 'white'
  },
  rejectBtn: {
    backgroundColor: '#e74c3c',
    color: 'white'
  },
  emptyState: {
    textAlign: 'center',
    padding: '60px 20px',
    backgroundColor: 'white',
    borderRadius: '10px',
    color: '#95a5a6',
    fontSize: '16px'
  }
};

export default ResultsManagement;
