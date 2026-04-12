import React, { useState, useEffect } from 'react';
import { db } from '../firebase/config';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';

/**
 * Results Management Component
 * Allows admin to update student status and campus
 */
function ResultsManagement() {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(null);
  const [filter, setFilter] = useState('all'); // all, selected, rejected, pending

  useEffect(() => {
    fetchSubmissions();
  }, []);

  const fetchSubmissions = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, 'submissions'));
      const data = snap.docs.map(d => ({
        id: d.id,
        ...d.data(),
        status: d.data().status || 'pending',
        campus: d.data().campus || 'Not Assigned'
      }));
      
      // Sort by score descending
      data.sort((a, b) => (b.totalScore || 0) - (a.totalScore || 0));
      setSubmissions(data);
    } catch (error) {
      console.error('Error fetching submissions:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (submissionId, newStatus) => {
    setUpdating(submissionId);
    try {
      await updateDoc(doc(db, 'submissions', submissionId), {
        status: newStatus,
        updatedAt: new Date()
      });
      
      setSubmissions(prev => prev.map(sub =>
        sub.id === submissionId ? { ...sub, status: newStatus } : sub
      ));
      
      console.log(`✅ Updated status to: ${newStatus}`);
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Failed to update status. Please try again.');
    } finally {
      setUpdating(null);
    }
  };

  const updateCampus = async (submissionId, campus) => {
    if (!campus.trim()) return;
    
    setUpdating(submissionId);
    try {
      await updateDoc(doc(db, 'submissions', submissionId), {
        campus: campus,
        updatedAt: new Date()
      });
      
      setSubmissions(prev => prev.map(sub =>
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

  const getFilteredSubmissions = () => {
    if (filter === 'all') return submissions;
    return submissions.filter(sub => sub.status === filter);
  };

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

  if (loading) {
    return <div style={styles.loading}>📋 Loading results...</div>;
  }

  const filteredSubmissions = getFilteredSubmissions();

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>📋 Results Management</h2>
        <div style={styles.filterButtons}>
          <button 
            style={{...styles.filterBtn, ...(filter === 'all' ? styles.filterBtnActive : {})}}
            onClick={() => setFilter('all')}
          >
            All ({submissions.length})
          </button>
          <button 
            style={{...styles.filterBtn, ...(filter === 'selected' ? styles.filterBtnActive : {})}}
            onClick={() => setFilter('selected')}
          >
            Selected ({submissions.filter(s => s.status === 'selected').length})
          </button>
          <button 
            style={{...styles.filterBtn, ...(filter === 'rejected' ? styles.filterBtnActive : {})}}
            onClick={() => setFilter('rejected')}
          >
            Rejected ({submissions.filter(s => s.status === 'rejected').length})
          </button>
          <button 
            style={{...styles.filterBtn, ...(filter === 'pending' ? styles.filterBtnActive : {})}}
            onClick={() => setFilter('pending')}
          >
            Pending ({submissions.filter(s => s.status === 'pending').length})
          </button>
        </div>
      </div>

      {filteredSubmissions.length === 0 ? (
        <div style={styles.emptyState}>
          <p>No results found for "{filter}" filter.</p>
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
              {filteredSubmissions.map((sub, index) => {
                const percentage = ((sub.totalScore / sub.totalQuestions) * 100).toFixed(1);
                
                return (
                  <tr key={sub.id} style={styles.tableRow}>
                    <td style={styles.td}>{index + 1}</td>
                    <td style={styles.td}>
                      <div style={styles.studentCell}>
                        <div style={styles.studentEmail}>{sub.userEmail}</div>
                        <div style={styles.studentMeta}>
                          {new Date(sub.submittedAt?.toDate()).toLocaleDateString()}
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
                          setSubmissions(prev => prev.map(s =>
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
    padding: '20px',
    backgroundColor: '#f8f9fa',
    borderRadius: '12px',
    margin: '20px 0'
  },
  header: {
    marginBottom: '20px'
  },
  title: {
    margin: '0 0 15px 0',
    color: '#2c3e50',
    fontSize: '24px',
    fontWeight: 'bold'
  },
  loading: {
    textAlign: 'center',
    padding: '40px',
    fontSize: '18px',
    color: '#7f8c8d'
  },
  filterButtons: {
    display: 'flex',
    gap: '10px',
    flexWrap: 'wrap'
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
    borderBottom: '1px solid #ecf0f1'
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
    color: '#95a5a6'
  }
};

export default ResultsManagement;
