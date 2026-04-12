import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { auth, db } from '../firebase/config';
import { signOut } from 'firebase/auth';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import AdminSidebar from '../components/AdminSidebar';
import Dialog from '../components/Dialog';

function EditExam() {
  const { examId } = useParams();
  const navigate = useNavigate();

  const [exam, setExam] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [dialogConfig, setDialogConfig] = useState({ 
    isOpen: false, 
    title: '', 
    message: '', 
    type: 'confirm', 
    onConfirm: () => {},
    onCancel: null
  });

  const showDialog = (title, message, onConfirm, type = 'confirm', hasCancel = true) => {
    setDialogConfig({
      isOpen: true,
      title,
      message,
      type,
      onConfirm: () => {
        onConfirm();
        setDialogConfig(prev => ({ ...prev, isOpen: false }));
      },
      onCancel: hasCancel ? () => setDialogConfig(prev => ({ ...prev, isOpen: false })) : null
    });
  };

  // Form fields
  const [title, setTitle] = useState('');
  const [startTime, setStartTime] = useState('');
  const [aptDuration, setAptDuration] = useState('30');
  const [coreDuration, setCoreDuration] = useState('30');

  useEffect(() => {
    const fetchExam = async () => {
      try {
        const snap = await getDoc(doc(db, 'exams', examId));
        if (snap.exists()) {
          const data = { id: snap.id, ...snap.data() };
          setExam(data);

          // Check if exam is completed
          if (data.status === 'completed') {
            showDialog(
              'Exam Locked',
              'This exam is completed and cannot be edited. Navigating back to overview...',
              () => navigate(`/admin/exam/${examId}`),
              'warning',
              false
            );
            return;
          }

          // Populate form
          setTitle(data.title || '');
          setAptDuration(data.roundDurations?.aptitude?.toString() || '30');
          setCoreDuration(data.roundDurations?.core?.toString() || '30');

          // Format startTime for datetime-local input
          if (data.startTime) {
            const date = data.startTime?.toDate ? data.startTime.toDate() :
              data.startTime?.seconds ? new Date(data.startTime.seconds * 1000) :
                new Date(data.startTime);

            // Convert to YYYY-MM-DDTHH:mm format for datetime-local input
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            const hours = String(date.getHours()).padStart(2, '0');
            const minutes = String(date.getMinutes()).padStart(2, '0');
            setStartTime(`${year}-${month}-${day}T${hours}:${minutes}`);
          }
        } else {
          showDialog('Not Found', 'Exam not found!', () => navigate('/admin/dashboard'), 'warning', false);
        }
      } catch (error) {
        console.error('Error fetching exam:', error);
        showDialog('Error', 'Failed to load exam', () => navigate('/admin/dashboard'), 'warning', false);
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
        border-color: #3498db !important;
        box-shadow: 0 0 8px rgba(52, 152, 219, 0.2);
        outline: none;
      }
      button:hover { filter: brightness(1.1); }
      .sidebar-item:hover { background-color: rgba(255, 255, 255, 0.1) !important; }
    `;
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();

    if (!title.trim()) {
      setMessage('❌ Title is required');
      return;
    }
    if (!startTime) {
      setMessage('❌ Start time is required');
      return;
    }

    setSaving(true);
    setMessage('');

    try {
      await updateDoc(doc(db, 'exams', examId), {
        title: title.trim(),
        startTime: new Date(startTime),
        roundDurations: {
          aptitude: parseInt(aptDuration) || 30,
          core: parseInt(coreDuration) || 30,
        },
        updatedAt: new Date()
      });

      setMessage('✅ Exam updated successfully!');

      // Redirect after 1.5 seconds
      setTimeout(() => {
        navigate(`/admin/exam/${examId}`);
      }, 1500);
    } catch (error) {
      console.error('Error updating exam:', error);
      setMessage('❌ Failed to update exam: ' + error.message);
    } finally {
      setSaving(false);
    }
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

        <div style={{...styles.navRight, color: 'white'}}>
          <div style={{textAlign: 'right', display: 'flex', flexDirection: 'column', justifyContent: 'center'}}>
            <div style={{fontWeight: '900', fontSize: '15px', color: 'white'}}>admin</div>
            <div style={{fontSize: '10px', fontWeight: 'bold', opacity: 0.8, color: 'white'}}>SUPER ADMINISTRATOR</div>
          </div>
          <div style={styles.userAvatar}>
            {(localStorage.getItem('adminEmail') || 'A')[0].toUpperCase()}
          </div>
          <button className="admin-logout-btn" onClick={handleLogout} style={styles.navLogoutBtn}>
            Logout
          </button>
        </div>
      </div>

      <div style={styles.contentArea}>
        <AdminSidebar activeTab="exams" />
        <div className="admin-main-content" style={styles.mainContent}>
          <div style={styles.cardWrapper}>
            {/* Header with Back Button */}
            <div style={styles.header}>
              <button style={styles.backBtn} onClick={() => navigate(`/admin/exam/${examId}`)}>
                ← Back to Exam
              </button>
              <h1 style={styles.title}>✏️ Edit Exam</h1>
            </div>

            {/* Warning Banner */}
            <div style={styles.warningBanner}>
              <strong>⚠️ Note:</strong> You can only edit basic details. Question set cannot be modified after exam creation.
            </div>

            {/* Edit Form */}
            <div style={styles.card}>
              <form onSubmit={handleSave}>
                {message && (
                  <div style={{
                    padding: '15px',
                    borderRadius: '8px',
                    marginBottom: '20px',
                    backgroundColor: message.startsWith('✅') ? '#eafaf1' : '#fdecea',
                    color: message.startsWith('✅') ? '#27ae60' : '#e74c3c',
                    fontWeight: 'bold',
                    textAlign: 'center'
                  }}>
                    {message}
                  </div>
                )}

                <div style={styles.formGroup}>
                  <label style={styles.label}>Exam Title *</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    style={styles.input}
                    placeholder="e.g., Campus Placement Test 2024"
                    required
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Exam Code (Read-only)</label>
                  <input
                    type="text"
                    value={exam.examCode}
                    style={{ ...styles.input, backgroundColor: '#f5f6fa', cursor: 'not-allowed' }}
                    disabled
                  />
                  <small style={{ color: '#7f8c8d', fontSize: '13px' }}>Exam code cannot be changed</small>
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Start Time *</label>
                  <input
                    type="datetime-local"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    style={styles.input}
                    required
                  />
                </div>

                <div style={styles.twoCol}>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Aptitude Duration (minutes) *</label>
                    <input
                      type="number"
                      value={aptDuration}
                      onChange={(e) => setAptDuration(e.target.value)}
                      style={styles.input}
                      min="5"
                      max="180"
                      required
                    />
                  </div>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Core Subjects Duration (minutes) *</label>
                    <input
                      type="number"
                      value={coreDuration}
                      onChange={(e) => setCoreDuration(e.target.value)}
                      style={styles.input}
                      min="5"
                      max="180"
                      required
                    />
                  </div>
                </div>

                <div style={{ ...styles.formGroup, marginTop: '30px' }}>
                  <label style={styles.label}>Total Questions (Read-only)</label>
                  <div style={styles.readonlyBox}>
                    {exam.totalQuestions || 0} questions (locked after creation)
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '10px', marginTop: '30px' }}>
                  <button
                    type="submit"
                    disabled={saving}
                    style={{
                      ...styles.saveBtn,
                      opacity: saving ? 0.6 : 1,
                      cursor: saving ? 'not-allowed' : 'pointer'
                    }}
                  >
                    {saving ? '💾 Saving...' : '💾 Save Changes'}
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate(`/admin/exam/${examId}`)}
                    style={styles.cancelBtn}
                    disabled={saving}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>

            {/* Question Set Info */}
            <div className="admin-card" style={styles.card}>
              <h3 style={{ color: '#2c3e50', marginBottom: '15px' }}>📝 Question Set (Immutable)</h3>
              <div style={styles.infoBox}>
                <p style={{ margin: 0, color: '#555' }}>
                  This exam contains <strong>{exam.totalQuestions || 0} questions</strong> that were
                  selected at creation time. The question set cannot be modified to maintain exam integrity.
                </p>
                <button
                  type="button"
                  style={{ ...styles.viewBtn, marginTop: '15px' }}
                  onClick={() => navigate(`/admin/exam/${examId}`)}
                >
                  👁 View Question Set
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Dialog
        isOpen={dialogConfig.isOpen}
        title={dialogConfig.title}
        message={dialogConfig.message}
        type={dialogConfig.type}
        onConfirm={dialogConfig.onConfirm}
        onCancel={dialogConfig.onCancel}
      />
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
  title: {
    margin: 0,
    color: '#1e293b',
    fontSize: '28px',
    fontWeight: '800'
  },
  loading: {
    textAlign: 'center',
    padding: '50px',
    fontSize: '18px',
    color: '#7f8c8d'
  },
  warningBanner: {
    backgroundColor: '#fff3cd',
    color: '#856404',
    padding: '15px 20px',
    borderRadius: '8px',
    marginBottom: '20px',
    border: '1px solid #ffeaa7',
    fontSize: '14px'
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: '12px',
    padding: '30px',
    marginBottom: '20px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
  },
  formGroup: {
    marginBottom: '20px'
  },
  label: {
    display: 'block',
    marginBottom: '8px',
    color: '#2c3e50',
    fontWeight: '600',
    fontSize: '14px'
  },
  input: {
    width: '100%',
    padding: '12px 15px',
    border: '2px solid #dfe6e9',
    borderRadius: '8px',
    fontSize: '15px',
    transition: 'border-color 0.2s',
    outline: 'none',
    boxSizing: 'border-box'
  },
  twoCol: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '20px'
  },
  readonlyBox: {
    padding: '12px 15px',
    backgroundColor: '#f8f9fa',
    border: '2px solid #e1e4e8',
    borderRadius: '8px',
    color: '#555',
    fontSize: '15px'
  },
  saveBtn: {
    flex: 1,
    padding: '12px 24px',
    backgroundColor: '#27ae60',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: 'opacity 0.2s'
  },
  cancelBtn: {
    flex: 1,
    padding: '12px 24px',
    backgroundColor: '#95a5a6',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: 'opacity 0.2s'
  },
  infoBox: {
    padding: '20px',
    backgroundColor: '#f8f9fa',
    borderRadius: '8px',
    border: '1px solid #e1e4e8'
  },
  viewBtn: {
    padding: '10px 20px',
    backgroundColor: '#3498db',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 'bold',
    cursor: 'pointer'
  }
};

export default EditExam;
