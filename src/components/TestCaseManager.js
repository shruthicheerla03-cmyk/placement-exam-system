import React, { useState } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import Dialog from './Dialog';

/**
 * TestCaseManager Component
 * Admin tool for viewing and editing DSA question test cases
 * 
 * Features:
 * - View visible and hidden test cases in tabs
 * - Add new test cases
 * - Edit existing test cases (input/output/explanation)
 * - Delete test cases
 * - Save changes to Firestore
 * 
 * Data Structure: Single testCases array with hidden flag
 * testCases: [
 *   { input, expectedOutput, explanation, hidden: false },
 *   { input, expectedOutput, explanation, hidden: true }
 * ]
 */
function TestCaseManager({ question, db, onClose, onUpdate }) {
  const [activeTab, setActiveTab] = useState('visible');
  const [testCases, setTestCases] = useState(question.testCases || []);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [dialogConfig, setDialogConfig] = useState({ isOpen: false });

  const showDialog = (title, message, onConfirm, type = 'confirm') => {
    setDialogConfig({
      isOpen: true,
      title,
      message,
      onConfirm: () => {
        onConfirm();
        setDialogConfig({ isOpen: false });
      },
      onCancel: () => setDialogConfig({ isOpen: false }),
      type
    });
  };

  // Get visible and hidden test cases by filtering
  const visibleTestCases = testCases.filter(tc => !tc.hidden);
  const hiddenTestCases = testCases.filter(tc => tc.hidden);

  // Add new test case
  const handleAddTestCase = (type) => {
    const newTestCase = {
      input: '',
      expectedOutput: '',
      explanation: '',
      hidden: type === 'hidden'
    };

    setTestCases([...testCases, newTestCase]);
  };

  // Update test case field
  const handleUpdateTestCase = (index, field, value) => {
    const updated = [...testCases];
    updated[index][field] = value;
    setTestCases(updated);
  };

  // Delete test case
  const handleDeleteTestCase = (index) => {
    showDialog(
      'Confirm Deletion',
      'Are you sure you want to delete this test case? This will be removed from the list but won\'t be saved to the database until you click "Save Changes".',
      () => {
        const updated = [...testCases];
        updated.splice(index, 1);
        setTestCases(updated);
      },
      'warning'
    );
  };

  // Save changes to Firestore
  const handleSave = async () => {
    try {
      setSaving(true);
      setMessage('');

      const questionRef = doc(db, 'questions', question.id);
      await updateDoc(questionRef, {
        testCases: testCases
      });

      setMessage('✅ Test cases updated successfully!');
      
      // Notify parent to refresh
      if (onUpdate) onUpdate();

      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (error) {
      console.error('Error updating test cases:', error);
      setMessage('❌ Error: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  // Get display test cases based on active tab
  const displayTestCases = activeTab === 'visible' ? visibleTestCases : hiddenTestCases;
  
  // Get actual indexes in the full testCases array
  const getActualIndex = (displayIndex) => {
    if (activeTab === 'visible') {
      return testCases.findIndex((tc, i) => !tc.hidden && visibleTestCases[displayIndex] === tc);
    } else {
      return testCases.findIndex((tc, i) => tc.hidden && hiddenTestCases[displayIndex] === tc);
    }
  };

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={styles.header}>
          <h2 style={styles.title}>
            🧪 Test Case Manager
          </h2>
          <button style={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        <div style={styles.questionInfo}>
          <strong>{question.title}</strong>
          <span style={styles.badge}>{question.difficulty}</span>
          <span style={styles.badge}>{question.points} pts</span>
        </div>

        {/* Tabs */}
        <div style={styles.tabs}>
          <button
            style={{
              ...styles.tab,
              ...(activeTab === 'visible' ? styles.activeTab : {})
            }}
            onClick={() => setActiveTab('visible')}
          >
            ✅ Visible ({visibleTestCases.length})
          </button>
          <button
            style={{
              ...styles.tab,
              ...(activeTab === 'hidden' ? styles.activeTab : {})
            }}
            onClick={() => setActiveTab('hidden')}
          >
            🔒 Hidden ({hiddenTestCases.length})
          </button>
        </div>

        {/* Test Cases */}
        <div style={styles.content}>
          <div style={styles.testCaseList}>
            {displayTestCases.length === 0 ? (
              <p style={styles.emptyText}>No {activeTab} test cases yet</p>
            ) : (
              displayTestCases.map((tc, displayIndex) => {
                const actualIndex = getActualIndex(displayIndex);
                return (
                  <div key={actualIndex} style={styles.testCase}>
                    <div style={styles.testCaseHeader}>
                      <span style={styles.testCaseNumber}>Test Case #{displayIndex + 1}</span>
                      <button
                        style={styles.deleteBtn}
                        onClick={() => handleDeleteTestCase(actualIndex)}
                      >
                        🗑️ Delete
                      </button>
                    </div>

                    <label style={styles.label}>Input (stdin):</label>
                    <textarea
                      style={styles.textarea}
                      value={tc.input}
                      onChange={(e) => handleUpdateTestCase(actualIndex, 'input', e.target.value)}
                      placeholder="Enter input data (will be passed to stdin)"
                      rows={3}
                    />

                    <label style={styles.label}>Expected Output:</label>
                    <textarea
                      style={styles.textarea}
                      value={tc.expectedOutput}
                      onChange={(e) => handleUpdateTestCase(actualIndex, 'expectedOutput', e.target.value)}
                      placeholder="Enter expected output"
                      rows={2}
                    />

                    <label style={styles.label}>Explanation (optional):</label>
                    <input
                      style={styles.input}
                      value={tc.explanation || ''}
                      onChange={(e) => handleUpdateTestCase(actualIndex, 'explanation', e.target.value)}
                      placeholder="Brief explanation of this test case"
                    />
                  </div>
                );
              })
            )}
          </div>

          {/* Add Test Case Button */}
          <button
            style={styles.addBtn}
            onClick={() => handleAddTestCase(activeTab)}
          >
            ➕ Add {activeTab} test case
          </button>
        </div>

        {/* Footer */}
        <div style={styles.footer}>
          {message && <div style={message.includes('✅') ? styles.successMsg : styles.errorMsg}>{message}</div>}
          
          <div style={styles.actions}>
            <button style={styles.cancelBtn} onClick={onClose}>
              Cancel
            </button>
            <button
              style={styles.saveBtn}
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? '💾 Saving...' : '💾 Save Changes'}
            </button>
          </div>
        </div>
      </div>

      {/* Modern Dialog System */}
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
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10000,
    padding: '20px'
  },
  modal: {
    backgroundColor: 'white',
    borderRadius: '16px',
    width: '90%',
    maxWidth: '900px',
    maxHeight: '90vh',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 10px 40px rgba(0,0,0,0.3)'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '24px 28px',
    borderBottom: '2px solid #e9ecef'
  },
  title: {
    margin: 0,
    color: '#2c3e50',
    fontSize: '24px'
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    fontSize: '28px',
    cursor: 'pointer',
    color: '#7f8c8d',
    padding: '0',
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    transition: 'all 0.2s'
  },
  questionInfo: {
    padding: '16px 28px',
    backgroundColor: '#f8f9fa',
    display: 'flex',
    gap: '12px',
    alignItems: 'center',
    borderBottom: '1px solid #dee2e6'
  },
  badge: {
    backgroundColor: '#e3f2fd',
    color: '#1976d2',
    padding: '4px 12px',
    borderRadius: '12px',
    fontSize: '13px',
    fontWeight: 'bold'
  },
  tabs: {
    display: 'flex',
    borderBottom: '2px solid #e9ecef',
    padding: '0 28px'
  },
  tab: {
    padding: '14px 24px',
    border: 'none',
    background: 'none',
    cursor: 'pointer',
    fontSize: '15px',
    fontWeight: '500',
    color: '#6c757d',
    borderBottom: '3px solid transparent',
    transition: 'all 0.2s'
  },
  activeTab: {
    color: '#3498db',
    borderBottomColor: '#3498db'
  },
  content: {
    flex: 1,
    overflowY: 'auto',
    padding: '28px'
  },
  testCaseList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
    marginBottom: '20px'
  },
  testCase: {
    backgroundColor: '#f8f9fa',
    border: '2px solid #e9ecef',
    borderRadius: '12px',
    padding: '20px'
  },
  testCaseHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px'
  },
  testCaseNumber: {
    fontSize: '16px',
    fontWeight: 'bold',
    color: '#2c3e50'
  },
  label: {
    display: 'block',
    marginTop: '12px',
    marginBottom: '6px',
    fontWeight: '600',
    color: '#495057',
    fontSize: '14px'
  },
  input: {
    width: '100%',
    padding: '10px 14px',
    border: '1px solid #ced4da',
    borderRadius: '8px',
    fontSize: '14px',
    fontFamily: 'inherit'
  },
  textarea: {
    width: '100%',
    padding: '10px 14px',
    border: '1px solid #ced4da',
    borderRadius: '8px',
    fontSize: '14px',
    fontFamily: 'Monaco, Consolas, monospace',
    resize: 'vertical'
  },
  deleteBtn: {
    backgroundColor: '#fff',
    border: '2px solid #dc3545',
    color: '#dc3545',
    padding: '6px 14px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: 'bold',
    transition: 'all 0.2s'
  },
  addBtn: {
    width: '100%',
    padding: '14px',
    backgroundColor: '#e3f2fd',
    border: '2px dashed #3498db',
    borderRadius: '12px',
    color: '#3498db',
    fontSize: '15px',
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: 'all 0.2s'
  },
  emptyText: {
    textAlign: 'center',
    color: '#6c757d',
    padding: '40px',
    fontSize: '15px'
  },
  footer: {
    padding: '20px 28px',
    borderTop: '2px solid #e9ecef'
  },
  actions: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'flex-end',
    marginTop: '12px'
  },
  cancelBtn: {
    padding: '12px 28px',
    backgroundColor: '#6c757d',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '15px',
    fontWeight: 'bold',
    transition: 'all 0.2s'
  },
  saveBtn: {
    padding: '12px 32px',
    backgroundColor: '#28a745',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '15px',
    fontWeight: 'bold',
    transition: 'all 0.2s'
  },
  successMsg: {
    backgroundColor: '#d4edda',
    color: '#155724',
    padding: '12px 16px',
    borderRadius: '8px',
    marginBottom: '12px',
    fontSize: '14px'
  },
  errorMsg: {
    backgroundColor: '#f8d7da',
    color: '#721c24',
    padding: '12px 16px',
    borderRadius: '8px',
    marginBottom: '12px',
    fontSize: '14px'
  }
};

export default TestCaseManager;
