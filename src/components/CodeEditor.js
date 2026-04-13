import React, { useState, useEffect } from 'react';
import { executeCode, LANGUAGE_IDS, formatResult } from '../services/judge0Service';
import { db} from '../firebase/config';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

/**
 * CodeEditor Component - DSA Round with Full Test Case Evaluation
 * 
 * Features:
 * - Shows ONLY visible test cases to students
 * - Runs ALL test cases (visible + hidden) on submission
 * - Calculates score based on all test cases
 * - Proper output normalization
 * - Visual feedback with colors
 * - Loading states and progress indicators
 * - Timeout handling
 */
function CodeEditor({ question, onSubmitCode, remainingTime, userId, examId, showDialog }) {
  const [code, setCode] = useState('');
  const [language, setLanguage] = useState(question.defaultLanguage || 'python');
  const [customInput, setCustomInput] = useState('');
  const [output, setOutput] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [testResults, setTestResults] = useState([]);
  const [activeTab, setActiveTab] = useState('problem');
  const [executionStatus, setExecutionStatus] = useState('');
  const [score, setScore] = useState(null);
  
  // Resizable state
  const [leftWidth, setLeftWidth] = useState(40); // in percent
  const [outputHeight, setOutputHeight] = useState(250); // in pixels
  const [isResizingH, setIsResizingH] = useState(false);
  const [isResizingV, setIsResizingV] = useState(false);

  // Handle Horizontal Resize
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isResizingH) return;
      const newWidth = (e.clientX / window.innerWidth) * 100;
      if (newWidth > 20 && newWidth < 80) setLeftWidth(newWidth);
    };
    const handleMouseUp = () => setIsResizingH(false);
    
    if (isResizingH) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizingH]);

  // Handle Vertical Resize
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isResizingV) return;
      
      // Prevent text selection while resizing
      document.body.style.userSelect = 'none';
      document.body.style.cursor = 'row-resize';
      
      const container = document.querySelector('.code-editor-area');
      if (container) {
        const containerRect = container.getBoundingClientRect();
        // Calculate the height from the bottom of the container to the mouse position
        const maxOutputHeight = containerRect.height - 100; // Leave at least 100px for code
        let newOutputHeight = containerRect.bottom - e.clientY;
        
        // Clamp the new height
        if (newOutputHeight < 60) newOutputHeight = 60; // Minimum output height
        if (newOutputHeight > maxOutputHeight) newOutputHeight = maxOutputHeight;
        
        setOutputHeight(newOutputHeight);
      }
    };

    const handleMouseUp = () => {
      setIsResizingV(false);
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    };
    
    if (isResizingV) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizingV]);

  // Language templates
  const languageTemplates = {
    python: question.starterCode?.python || '# Write your code here\ndef solution():\n    pass\n\nif __name__ == "__main__":\n    solution()\n',
    javascript: question.starterCode?.javascript || '// Write your code here\nfunction solution() {\n    \n}\n\nsolution();\n',
    java: question.starterCode?.java || 'public class Main {\n    public static void main(String[] args) {\n        // Write your code here\n    }\n}',
    cpp: question.starterCode?.cpp || '#include <iostream>\nusing namespace std;\n\nint main() {\n    // Write your code here\n    return 0;\n}',
    c: question.starterCode?.c || '#include <stdio.h>\n\nint main() {\n    // Write your code here\n    return 0;\n}'
  };

  // Initialize code with template
  useEffect(() => {
    setCode(languageTemplates[language]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [language]);

  // Normalize output for comparison (trim whitespace, newlines)
  const normalizeOutput = (str) => {
    if (!str) return '';
    return str.toString().trim().replace(/\s+/g, ' ');
  };

  // Run code with custom input
  const runCode = async () => {
    if (!code.trim()) {
      setOutput('❌ Error: Code cannot be empty');
      return;
    }

    setIsRunning(true);
    setOutput('');
    setExecutionStatus('Creating submission...');

    try {
      const languageId = LANGUAGE_IDS[language];
      
      const result = await executeCode(
        code,
        languageId,
        customInput,
        '',
        (progress) => {
          if (progress.status) {
            setExecutionStatus(`Status: ${progress.status.description}`);
          }
        }
      );

      const formatted = formatResult(result);
      
      let displayOutput = '';
      if (formatted.success) {
        displayOutput = `✅ Success!\n\nOutput:\n${formatted.output}\n\n`;
      } else if (formatted.type === 'compile_error') {
        displayOutput = `❌ Compilation Error:\n${formatted.output}\n\n`;
      } else if (formatted.type === 'runtime_error') {
        displayOutput = `❌ Runtime Error:\n${formatted.output}\n\n`;
      } else if (formatted.type === 'time_limit') {
        displayOutput = `⏱️ Time Limit Exceeded\n\nYour code took too long to execute.\n\n`;
      } else {
        displayOutput = `⚠️ ${formatted.output}\n\n`;
      }
      
      displayOutput += `Time: ${formatted.time}s | Memory: ${formatted.memory} KB`;
      setOutput(displayOutput);
      setExecutionStatus('');
    } catch (error) {
      setOutput(`❌ Error: ${error.message}\n\nPlease check your code and try again.`);
      setExecutionStatus('');
    }

    setIsRunning(false);
  };

  // Run visible test cases (for practice)
  const runVisibleTests = async () => {
    const allTestCases = question.testCases || [];
    const visibleTestCases = allTestCases.filter(tc => !tc.hidden);
    
    if (visibleTestCases.length === 0) {
      setOutput('❌ No visible test cases available');
      return;
    }

    if (!code.trim()) {
      setOutput('❌ Error: Code cannot be empty');
      return;
    }

    setIsRunning(true);
    setOutput('Running visible test cases...');
    setExecutionStatus('Executing test cases...');
    const results = [];

    try {
      const languageId = LANGUAGE_IDS[language];
      
      for (let i = 0; i < visibleTestCases.length; i++) {
        const testCase = visibleTestCases[i];
        setExecutionStatus(`Running test case ${i + 1}/${visibleTestCases.length}...`);

        try {
          const result = await executeCode(
            code,
            languageId,
            testCase.input,
            testCase.expectedOutput
          );

          const formatted = formatResult(result);
          const actualOutput = formatted.raw.stdout || '';
          const normalizedActual = normalizeOutput(actualOutput);
          const normalizedExpected = normalizeOutput(testCase.expectedOutput);
          const passed = formatted.success && (normalizedActual === normalizedExpected);

          results.push({
            id: i + 1,
            input: testCase.input,
            expected: testCase.expectedOutput,
            actual: actualOutput || formatted.raw.stderr || '(no output)',
            passed: passed,
            hidden: false,
            time: formatted.time,
            memory: formatted.memory,
            status: formatted.statusDescription,
            explanation: testCase.explanation
          });
        } catch (error) {
          results.push({
            id: i + 1,
            input: testCase.input,
            expected: testCase.expectedOutput,
            actual: `Error: ${error.message}`,
            passed: false,
            hidden: false
          });
        }
      }

      setTestResults(results);
      setActiveTab('testcases');
      
      const passedCount = results.filter(t => t.passed).length;
      setOutput(`✅ Visible Test Results: ${passedCount}/${results.length} passed\n\nSwitch to "Test Cases" tab to see details.`);
      setExecutionStatus('');
    } catch (error) {
      setOutput(`❌ Error running tests: ${error.message}`);
      setExecutionStatus('');
    }

    setIsRunning(false);
  };

  // Run ALL test cases (visible + hidden) and calculate score
  const runAllTestsAndSubmit = async () => {
    const allTestCases = question.testCases || [];
    const visibleTestCases = allTestCases.filter(tc => !tc.hidden);
    const hiddenTestCases = allTestCases.filter(tc => tc.hidden);
    
    if (allTestCases.length === 0) {
      setOutput('❌ No test cases available');
      return;
    }

    if (!code.trim()) {
      setOutput('❌ Error: Code cannot be empty');
      return;
    }

    showDialog(
      'Submit Solution',
      `Submit your solution? This will run ${visibleTestCases.length} visible + ${hiddenTestCases.length} hidden test cases. You cannot change your code after submission.`,
      async () => {
        setIsRunning(true);
        setOutput('Running all test cases (visible + hidden)...');
        setExecutionStatus('Evaluating your solution...');
        const results = [];

        try {
          const languageId = LANGUAGE_IDS[language];
          
          // Run all test cases
          for (let i = 0; i < allTestCases.length; i++) {
            const testCase = allTestCases[i];
            const isHidden = testCase.hidden;
            
            setExecutionStatus(`Running test case ${i + 1}/${allTestCases.length}... ${isHidden ? '(Hidden)' : '(Visible)'}`);

            try {
              const result = await executeCode(
                code,
                languageId,
                testCase.input,
                testCase.expectedOutput
              );

              const formatted = formatResult(result);
              const actualOutput = formatted.raw.stdout || '';
              const normalizedActual = normalizeOutput(actualOutput);
              const normalizedExpected = normalizeOutput(testCase.expectedOutput);
              const passed = formatted.success && (normalizedActual === normalizedExpected);

              results.push({
                id: i + 1,
                input: testCase.input,
                expected: testCase.expectedOutput,
                actual: actualOutput || formatted.raw.stderr || '(no output)',
                passed: passed,
                hidden: isHidden,
                time: formatted.time,
                memory: formatted.memory,
                status: formatted.statusDescription,
                explanation: testCase.explanation || ''
              });
            } catch (error) {
              results.push({
                id: i + 1,
                input: testCase.input,
                expected: testCase.expectedOutput,
                actual: `Error: ${error.message}`,
                passed: false,
                hidden: isHidden
              });
            }
          }

          // Calculate score
          const totalTests = results.length;
          const passedTests = results.filter(t => t.passed).length;
          const calculatedScore = Math.round((passedTests / totalTests) * 100);
          const passedVisible = results.filter((t, i) => !t.hidden && t.passed).length;
          const passedHidden = results.filter((t, i) => t.hidden && t.passed).length;

          setTestResults(results);
          setScore(calculatedScore);
          setActiveTab('testcases');

          // Save submission to Firestore
          const submissionData = {
            userId: userId,
            examId: examId,
            questionId: question.id || question.questionId,
            questionTitle: question.title || question.text,
            code: code,
            language: language,
            languageId: LANGUAGE_IDS[language],
            passedVisible: passedVisible,
            totalVisible: visibleTestCases.length,
            passedHidden: passedHidden,
            totalHidden: hiddenTestCases.length,
            totalTestCases: totalTests,
            passedTestCases: passedTests,
            score: calculatedScore,
            testResults: results,
            submittedAt: serverTimestamp(),
            timestamp: new Date().toISOString()
          };

          await addDoc(collection(db, 'dsaSubmissions'), submissionData);

          // Notify parent component
          if (onSubmitCode) {
            onSubmitCode({
              code: code,
              language: language,
              timestamp: new Date(),
              score: calculatedScore,
              passedVisible: passedVisible,
              passedHidden: passedHidden,
              totalTestCases: totalTests,
              passedTestCases: passedTests,
              questionId: question.id || question.questionId
            });
          }

          setOutput(
            `✅ SUBMISSION SUCCESSFUL!\n\n` +
            `Score: ${calculatedScore}%\n` +
            `Total: ${passedTests}/${totalTests} test cases passed\n\n` +
            `Visible: ${passedVisible}/${visibleTestCases.length} passed\n` +
            `Hidden: ${passedHidden}/${hiddenTestCases.length} passed\n\n` +
            `${calculatedScore >= 70 ? '🎉 Great job!' : calculatedScore >= 40 ? '👍 Good effort!' : '💪 Keep practicing!'}`
          );
          setExecutionStatus('');
        } catch (error) {
          console.error('Error submitting solution:', error);
          setOutput(`❌ Error submitting: ${error.message}`);
          setExecutionStatus('');
        }

        setIsRunning(false);
      }
    );
  };

  return (
    <div style={styles.container}>
      {/* Left Panel - Problem & Test Cases */}
      <div style={{...styles.leftPanel, flex: `0 0 ${leftWidth}%`}}>
        <div style={styles.tabs}>
          <button 
            style={{...styles.tab, ...(activeTab === 'problem' ? styles.activeTab : {})}}
            onClick={() => setActiveTab('problem')}>
            📝 Problem
          </button>
          <button 
            style={{...styles.tab, ...(activeTab === 'testcases' ? styles.activeTab : {})}}
            onClick={() => setActiveTab('testcases')}>
            🧪 Test Results {testResults.length > 0 && `(${testResults.filter(t => t.passed).length}/${testResults.length})`}
          </button>
        </div>

        {activeTab === 'problem' && (
          <div style={styles.problemContent}>
            <h2 style={styles.problemTitle}>{question.title}</h2>
            <div style={styles.difficulty}>
              <span style={getDifficultyStyle(question.difficulty)}>
                {question.difficulty}
              </span>
              <span style={styles.points}>💎 {question.points || 100} points</span>
            </div>
            
            <div style={styles.description}>
              <h3>Description:</h3>
              <div style={{whiteSpace: 'pre-wrap'}}>{question.description}</div>
            </div>

            {question.examples && question.examples.length > 0 && (
              <div style={styles.section}>
                <h3>Examples:</h3>
                {question.examples.map((ex, i) => (
                  <div key={i} style={styles.example}>
                    <strong>Example {i + 1}:</strong>
                    <pre style={styles.exampleCode}>
                      Input: {ex.input}
                      {'\n'}Output: {ex.output}
                      {ex.explanation && `\n\nExplanation: ${ex.explanation}`}
                    </pre>
                  </div>
                ))}
              </div>
            )}

            {(() => {
              const visibleCases = (question.testCases || []).filter(tc => !tc.hidden);
              return visibleCases.length > 0 && (
                <div style={styles.section}>
                  <h3>Visible Test Cases ({visibleCases.length}):</h3>
                  <p style={{color: '#7f8c8d', fontSize: '14px'}}>
                    These test cases are visible to you. Your solution will also be evaluated on hidden test cases.
                  </p>
                  {visibleCases.map((tc, i) => (
                    <div key={i} style={styles.visibleTestCase}>
                      <strong>Test Case {i + 1}:</strong>
                      <div style={styles.testCaseDetail}>
                        <span><strong>Input:</strong></span>
                        <pre style={styles.testCaseCode}>{tc.input}</pre>
                      </div>
                      <div style={styles.testCaseDetail}>
                        <span><strong>Expected Output:</strong></span>
                        <pre style={styles.testCaseCode}>{tc.expectedOutput}</pre>
                      </div>
                      {tc.explanation && (
                        <div style={{color: '#7f8c8d', fontSize: '13px', marginTop: '6px'}}>
                          💡 {tc.explanation}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              );
            })()}

            {question.constraints && question.constraints.length > 0 && (
              <div style={styles.section}>
                <h3>Constraints:</h3>
                <ul style={{paddingLeft: '20px'}}>
                  {question.constraints.map((c, i) => (
                    <li key={i} style={{marginBottom: '4px', color: '#555'}}>{c}</li>
                  ))}
                </ul>
              </div>
            )}

            {question.hints && question.hints.length > 0 && (
              <div style={styles.section}>
                <h3>💡 Hints:</h3>
                <ul style={{paddingLeft: '20px'}}>
                  {question.hints.map((h, i) => (
                    <li key={i} style={{marginBottom: '4px', color: '#7f8c8d'}}>{h}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {activeTab === 'testcases' && (
          <div style={styles.testCasesContent}>
            <div style={{marginBottom: '20px'}}>
              <h3>Test Results</h3>
              {score !== null && (
                <div style={{
                  ...styles.scoreCard,
                  backgroundColor: score >= 70 ? '#d4edda' : score >= 40 ? '#fff3cd' : '#f8d7da',
                  color: score >= 70 ? '#155724' : score >= 40 ? '#856404' : '#721c24'
                }}>
                  <div style={{fontSize: '32px', fontWeight: 'bold'}}>{score}%</div>
                  <div>{testResults.filter(t => t.passed).length} / {testResults.length} passed</div>
                </div>
              )}
            </div>

            {testResults.length === 0 ? (
              <p style={{color: '#888', textAlign: 'center', padding: '40px'}}>
                Run tests to see results
              </p>
            ) : (
              <>
                {/* Visible test results */}
                {testResults.filter(t => !t.hidden).length > 0 && (
                  <div>
                    <h4 style={{color: '#2c3e50'}}>✅ Visible Test Cases:</h4>
                    {testResults.filter(t => !t.hidden).map((test, i) => (
                      <div key={i} style={{
                        ...styles.testCase,
                        borderLeft: `5px solid ${test.passed ? '#27ae60' : '#e74c3c'}`,
                        backgroundColor: test.passed ? '#f0f9f4' : '#fff5f5'
                      }}>
                        <div style={styles.testHeader}>
                          <span style={{fontWeight: 'bold'}}>
                            {test.passed ? '✅ PASS' : '❌ FAIL'} - Test Case {test.id}
                          </span>
                          <span style={{fontSize: '11px', color: '#7f8c8d'}}>
                            {test.time}s | {test.memory} KB
                          </span>
                        </div>
                        <div style={styles.testDetail}>
                          <strong>Input:</strong>
                          <pre style={styles.testOutput}>{test.input}</pre>
                        </div>
                        <div style={styles.testDetail}>
                          <strong>Expected:</strong>
                          <pre style={styles.testOutput}>{test.expected}</pre>
                        </div>
                        <div style={styles.testDetail}>
                          <strong>Your Output:</strong>
                          <pre style={{...styles.testOutput, color: test.passed ? '#27ae60' : '#e74c3c'}}>
                            {test.actual}
                          </pre>
                        </div>
                        {test.explanation && (
                          <div style={{marginTop: '8px', fontSize: '12px', color: '#7f8c8d'}}>
                            💡 {test.explanation}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Hidden test results */}
                {testResults.filter(t => t.hidden).length > 0 && (
                  <div style={{marginTop: '20px'}}>
                    <h4 style={{color: '#2c3e50'}}>🔒 Hidden Test Cases:</h4>
                    <p style={{fontSize: '13px', color: '#7f8c8d', marginBottom: '10px'}}>
                      These test cases are hidden. Only pass/fail status is shown.
                    </p>
                    {testResults.filter(t => t.hidden).map((test, i) => (
                      <div key={i} style={{
                        ...styles.hiddenTestCase,
                        backgroundColor: test.passed ? '#f0f9f4' : '#fff5f5',
                        borderLeft: `5px solid ${test.passed ? '#27ae60' : '#e74c3c'}`
                      }}>
                        <span style={{fontWeight: 'bold'}}>
                          {test.passed ? '✅ PASS' : '❌ FAIL'} - Hidden Test {i + 1}
                        </span>
                        <span style={{fontSize: '11px', color: '#7f8c8d'}}>
                          {test.time}s
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* Horizontal Resizer */}
      <div 
        style={{
          width: '8px', 
          cursor: 'col-resize', 
          backgroundColor: isResizingH ? '#3498db' : '#333',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'background-color 0.2s'
        }}
        onMouseDown={() => setIsResizingH(true)}
      >
        <div style={{width: '2px', height: '30px', backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: '1px'}} />
      </div>

      {/* Right Panel - Code Editor Area */}
      <div style={styles.rightPanel} className="code-editor-area">
        <div style={styles.editorHeader}>
          <select 
            style={styles.languageSelect}
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            disabled={isRunning}>
            <option value="python">🐍 Python</option>
            <option value="javascript">📜 JavaScript</option>
            <option value="java">☕ Java</option>
            <option value="cpp">⚙️ C++</option>
            <option value="c">🔧 C</option>
          </select>
        </div>

        <textarea
          style={styles.codeArea}
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="Write your code here..."
          spellCheck={false}
          disabled={isRunning}
        />

        {/* Vertical Resizer */}
        <div 
          style={{
            height: '8px', 
            cursor: 'row-resize', 
            backgroundColor: isResizingV ? '#3498db' : '#333',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'background-color 0.2s'
          }}
          onMouseDown={() => setIsResizingV(true)}
        >
          <div style={{width: '30px', height: '2px', backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: '1px'}} />
        </div>

        {/* Lower Section (Input & Output) - Resizable Height */}
        <div style={{ display: 'flex', flexDirection: 'column', height: `${outputHeight}px`, minHeight: '60px' }}>
          {/* Custom Input Section */}
          <div style={styles.inputSection}>
            <label style={styles.inputLabel}>
              📝 Custom Input (stdin):
            </label>
            <textarea
              style={styles.inputArea}
              value={customInput}
              onChange={(e) => setCustomInput(e.target.value)}
              placeholder="Enter custom input for testing..."
              rows={1}
              disabled={isRunning}
            />
          </div>

          {/* Output Panel */}
          <div style={{...styles.outputPanel, flex: 1}}>
            <div style={styles.outputHeader}>
              <span>
                📊 Output 
                {executionStatus && (
                  <span style={{fontSize: '12px', color: '#f39c12', marginLeft: '10px'}}>
                    ({executionStatus})
                  </span>
                )}
              </span>
              <div style={{display: 'flex', gap: '8px'}}>
                <button 
                  style={styles.runBtn}
                  onClick={runCode}
                  disabled={isRunning}>
                  {isRunning ? '⏳ Running...' : '▶️ Run'}
                </button>
                <button 
                  style={styles.testBtn}
                  onClick={runVisibleTests}
                  disabled={isRunning}>
                  🧪 Test ({(question.testCases || []).filter(tc => !tc.hidden).length} visible)
                </button>
              </div>
            </div>
            <pre style={styles.output}>{output || 'Output will appear here...'}</pre>
          </div>
        </div>

        <button 
          style={{
            ...styles.submitBtn,
            padding: '12px',
            flexShrink: 0,
            opacity: isRunning ? 0.6 : 1,
            cursor: isRunning ? 'not-allowed' : 'pointer'
          }}
          onClick={runAllTestsAndSubmit}
          disabled={isRunning}>
          {isRunning ? '⏳ Evaluating...' : `✅ Submit Final Solution (Run All ${(question.testCases || []).length} Tests)`}
        </button>
      </div>
    </div>
  );
}

// Helper function for difficulty styling
const getDifficultyStyle = (difficulty) => {
  const baseStyle = { padding: '5px 14px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold' };
  const styles = {
    Easy: { ...baseStyle, backgroundColor: '#d4edda', color: '#155724' },
    Medium: { ...baseStyle, backgroundColor: '#fff3cd', color: '#856404' },
    Hard: { ...baseStyle, backgroundColor: '#f8d7da', color: '#721c24' }
  };
  return styles[difficulty] || styles.Easy;
};

const styles = {
  container: {
    display: 'flex',
    flex: 1,
    height: 'auto',
    backgroundColor: '#1e1e1e',
    fontFamily: "'Segoe UI', sans-serif",
    overflow: 'hidden'
  },
  leftPanel: {
    backgroundColor: '#fff',
    display: 'flex',
    flexDirection: 'column',
    borderRight: '1px solid #ddd',
    height: '100%',
    overflow: 'hidden'
  },
  tabs: {
    display: 'flex',
    borderBottom: '2px solid #e9ecef',
    backgroundColor: '#f8f9fa'
  },
  tab: {
    flex: 1,
    padding: '14px',
    border: 'none',
    backgroundColor: 'transparent',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600',
    color: '#6c757d',
    transition: 'all 0.2s'
  },
  activeTab: {
    backgroundColor: '#fff',
    color: '#3498db',
    borderBottom: '3px solid #3498db'
  },
  problemContent: {
    padding: '24px',
    overflowY: 'auto',
    flex: 1,
    lineHeight: '1.7'
  },
  problemTitle: {
    fontSize: '26px',
    color: '#2c3e50',
    marginBottom: '12px',
    fontWeight: 'bold'
  },
  difficulty: {
    display: 'flex',
    gap: '12px',
    alignItems: 'center',
    marginBottom: '24px'
  },
  points: {
    color: '#f39c12',
    fontSize: '15px',
    fontWeight: 'bold'
  },
  description: {
    marginBottom: '24px',
    color: '#34495e',
    fontSize: '15px'
  },
  section: {
    marginBottom: '24px'
  },
  example: {
    marginBottom: '16px'
  },
  exampleCode: {
    backgroundColor: '#f8f9fa',
    padding: '16px',
    borderRadius: '8px',
    border: '1px solid #dee2e6',
    fontSize: '14px',
    overflow: 'auto',
    marginTop: '8px'
  },
  visibleTestCase: {
    backgroundColor: '#f0f7ff',
    padding: '16px',
    borderRadius: '8px',
    border: '1px solid #cfe2ff',
    marginBottom: '12px'
  },
  testCaseDetail: {
    marginTop: '10px'
  },
  testCaseCode: {
    backgroundColor: '#fff',
    padding: '10px',
    borderRadius: '6px',
    border: '1px solid #dee2e6',
    fontSize: '13px',
    fontFamily: "'Consolas', monospace",
    marginTop: '6px',
    overflow: 'auto'
  },
  testCasesContent: {
    padding: '24px',
    overflowY: 'auto',
    flex: 1
  },
  scoreCard: {
    padding: '20px',
    borderRadius: '12px',
    textAlign: 'center',
    fontWeight: 'bold',
    marginBottom: '20px',
    border: '2px solid currentColor'
  },
  testCase: {
    padding: '16px',
    borderRadius: '10px',
    marginBottom: '14px',
    boxShadow: '0 2px 6px rgba(0,0,0,0.08)'
  },
  testHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '12px'
  },
  testDetail: {
    marginBottom: '10px',
    fontSize: '14px'
  },
  testOutput: {
    backgroundColor: '#f8f9fa',
    padding: '10px',
    borderRadius: '6px',
    fontSize: '13px',
    fontFamily: "'Consolas', monospace",
    marginTop: '6px',
    overflow: 'auto',
    border: '1px solid #dee2e6'
  },
  hiddenTestCase: {
    padding: '14px',
    borderRadius: '8px',
    marginBottom: '10px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    boxShadow: '0 2px 4px rgba(0,0,0,0.06)'
  },
  rightPanel: {
    flex: '1',
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: '#1e1e1e'
  },
  editorHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 18px',
    backgroundColor: '#2d2d30',
    borderBottom: '1px solid #3e3e42'
  },
  questionSelector: {
    display: 'flex',
    gap: '8px',
    padding: '16px 20px',
    backgroundColor: '#fff',
    borderBottom: '1px solid #ddd',
    overflowX: 'auto',
    minHeight: '60px',
    flexShrink: 0
  },
  languageSelect: {
    padding: '10px 16px',
    backgroundColor: '#3e3e42',
    color: '#fff',
    border: '1px solid #555',
    borderRadius: '6px',
    fontSize: '14px',
    cursor: 'pointer',
    fontWeight: '500'
  },
  timer: {
    color: '#f39c12',
    fontSize: '18px',
    fontWeight: 'bold'
  },
  codeArea: {
    flex: '1',
    minHeight: '100px',
    padding: '18px',
    backgroundColor: '#1e1e1e',
    color: '#d4d4d4',
    border: 'none',
    fontSize: '15px',
    fontFamily: "'Consolas', 'Courier New', monospace",
    lineHeight: '1.7',
    resize: 'none',
    outline: 'none',
    tabSize: 4
  },
  inputSection: {
    padding: '12px 18px',
    backgroundColor: '#252526',
    borderTop: '1px solid #3e3e42'
  },
  inputLabel: {
    color: '#d4d4d4',
    fontSize: '13px',
    display: 'block',
    marginBottom: '6px',
    fontWeight: '500'
  },
  inputArea: {
    width: '100%',
    padding: '10px',
    backgroundColor: '#1e1e1e',
    color: '#d4d4d4',
    border: '1px solid #3e3e42',
    borderRadius: '6px',
    fontSize: '14px',
    fontFamily: "'Consolas', monospace",
    resize: 'vertical',
    outline: 'none'
  },
  outputPanel: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    borderTop: '1px solid #3e3e42',
    minHeight: '100px'
  },
  outputHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 18px',
    backgroundColor: '#2d2d30',
    color: '#fff',
    fontWeight: '500'
  },
  output: {
    flex: 1,
    padding: '16px',
    backgroundColor: '#1e1e1e',
    color: '#d4d4d4',
    fontFamily: "'Consolas', monospace",
    fontSize: '14px',
    overflow: 'auto',
    margin: 0,
    whiteSpace: 'pre-wrap',
    lineHeight: '1.6'
  },
  runBtn: {
    padding: '8px 18px',
    backgroundColor: '#27ae60',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: 'bold',
    transition: 'all 0.2s'
  },
  testBtn: {
    padding: '8px 18px',
    backgroundColor: '#3498db',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: 'bold',
    transition: 'all 0.2s'
  },
  submitBtn: {
    margin: '18px',
    padding: '16px',
    backgroundColor: '#e74c3c',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '15px',
    fontWeight: 'bold',
    transition: 'all 0.2s',
    boxShadow: '0 4px 12px rgba(231, 76, 60, 0.3)'
  }
};

export default CodeEditor;
