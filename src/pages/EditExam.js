import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from '../firebase/config';
import { doc, getDoc, updateDoc } from 'firebase/firestore';

function EditExam() {
  const { examId } = useParams();
  const navigate = useNavigate();
  
  const [exam, setExam] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

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
            alert('⚠️ This exam is completed and cannot be edited!');
            navigate(`/admin/exam/${examId}`);
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
          alert('Exam not found!');
          navigate('/admin/dashboard');
        }
      } catch (error) {
        console.error('Error fetching exam:', error);
        alert('Failed to load exam');
        navigate('/admin/dashboard');
      } finally {
        setLoading(false);
      }
    };
    fetchExam();
  }, [examId, navigate]);

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

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loading}>Loading exam...</div>
      </div>
    );
  }

  if (!exam) return null;

  return (
    <div style={styles.container}>
      {/* Header */}
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
              style={{...styles.input, backgroundColor: '#f5f6fa', cursor: 'not-allowed'}}
              disabled
            />
            <small style={{color: '#7f8c8d', fontSize: '13px'}}>Exam code cannot be changed</small>
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

          <div style={{...styles.formGroup, marginTop: '30px'}}>
            <label style={styles.label}>Total Questions (Read-only)</label>
            <div style={styles.readonlyBox}>
              {exam.totalQuestions || 0} questions (locked after creation)
            </div>
          </div>

          <div style={{display: 'flex', gap: '10px', marginTop: '30px'}}>
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
      <div style={styles.card}>
        <h3 style={{color: '#2c3e50', marginBottom: '15px'}}>📝 Question Set (Immutable)</h3>
        <div style={styles.infoBox}>
          <p style={{margin: 0, color: '#555'}}>
            This exam contains <strong>{exam.totalQuestions || 0} questions</strong> that were 
            selected at creation time. The question set cannot be modified to maintain exam integrity.
          </p>
          <button
            type="button"
            style={{...styles.viewBtn, marginTop: '15px'}}
            onClick={() => navigate(`/admin/exam/${examId}`)}
          >
            👁 View Question Set
          </button>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#f5f6fa',
    padding: '20px',
    maxWidth: '900px',
    margin: '0 auto'
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
    border: '2px solid #3498db',
    borderRadius: '8px',
    color: '#3498db',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 'bold',
    transition: 'all 0.2s'
  },
  title: {
    margin: 0,
    color: '#2c3e50',
    fontSize: '28px'
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
