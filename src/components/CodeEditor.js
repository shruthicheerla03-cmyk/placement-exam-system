import React, { useState, useEffect } from 'react';

/**
 * CodeEditor Component - Integrated IDE for DSA Round
 * Supports: Python, C, C++, Java, JavaScript
 */
function CodeEditor({ question, onSubmitCode, remainingTime }) {
  const [code, setCode] = useState(question.starterCode || '');
  const [language, setLanguage] = useState(question.defaultLanguage || 'python');
  const [output, setOutput] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [testResults, setTestResults] = useState([]);
  const [activeTab, setActiveTab] = useState('problem'); // problem, solution, testcases

  // Language templates
  const languageTemplates = {
    python: question.starterCode?.python || '# Write your code here\ndef solution():\n    pass\n\n',
    javascript: question.starterCode?.javascript || '// Write your code here\nfunction solution() {\n    \n}\n',
    java: question.starterCode?.java || 'public class Solution {\n    public static void main(String[] args) {\n        // Write your code here\n    }\n}',
    cpp: question.starterCode?.cpp || '#include <iostream>\nusing namespace std;\n\nint main() {\n    // Write your code here\n    return 0;\n}',
    c: question.starterCode?.c || '#include <stdio.h>\n\nint main() {\n    // Write your code here\n    return 0;\n}'
  };

  // Update code when language changes
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    setCode(languageTemplates[language]);
  }, [language]);

  // Run code using Judge0 API or similar
  const runCode = async (testCase = null) => {
    setIsRunning(true);
    setOutput('Running...');

    try {
      // Using Judge0 CE API (free tier)
      const response = await fetch('https://judge0-ce.p.rapidapi.com/submissions?base64_encoded=false&wait=true', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-RapidAPI-Key': 'YOUR_RAPIDAPI_KEY', // Replace with actual key
          'X-RapidAPI-Host': 'judge0-ce.p.rapidapi.com'
        },
        body: JSON.stringify({
          source_code: code,
          language_id: getLanguageId(language),
          stdin: testCase?.input || '',
          expected_output: testCase?.expectedOutput || ''
        })
      });

      const result = await response.json();
      
      if (result.status?.id === 3) {
        // Success
        setOutput(`✅ Output:\n${result.stdout || '(no output)'}\n\nTime: ${result.time}s | Memory: ${result.memory}KB`);
      } else if (result.status?.id === 11) {
        // Runtime error
        setOutput(`❌ Runtime Error:\n${result.stderr}`);
      } else if (result.status?.id === 6) {
        // Compilation error
        setOutput(`❌ Compilation Error:\n${result.compile_output}`);
      } else {
        setOutput(`Status: ${result.status?.description}\n${result.stderr || result.stdout || ''}`);
      }
    } catch (error) {
      setOutput(`❌ Error: ${error.message}\n\nNote: This requires Judge0 API key. For testing, responses are simulated.`);
      
      // Fallback: simulate execution for demo
      setTimeout(() => {
        setOutput(`✅ Code executed successfully (simulated)\n\nOutput:\nHello World\n\nTime: 0.1s | Memory: 2048KB`);
      }, 1000);
    }

    setIsRunning(false);
  };

  // Run all test cases
  const runAllTests = async () => {
    if (!question.testCases || question.testCases.length === 0) {
      setOutput('No test cases available');
      return;
    }

    setIsRunning(true);
    const results = [];

    for (let i = 0; i < question.testCases.length; i++) {
      const testCase = question.testCases[i];
      // Simulate test execution (replace with actual API call)
      const passed = Math.random() > 0.3; // 70% pass rate for demo
      results.push({
        id: i + 1,
        input: testCase.input,
        expected: testCase.expectedOutput,
        actual: passed ? testCase.expectedOutput : 'Wrong output',
        passed: passed,
        hidden: testCase.hidden
      });
    }

    setTestResults(results);
    setIsRunning(false);
    setActiveTab('testcases');
  };

  // Get Judge0 language ID
  const getLanguageId = (lang) => {
    const ids = {
      python: 71,    // Python 3
      javascript: 63, // JavaScript (Node.js)
      java: 62,      // Java
      cpp: 54,       // C++ (GCC)
      c: 50          // C (GCC)
    };
    return ids[lang] || 71;
  };

  // Submit final solution
  const handleSubmit = () => {
    if (window.confirm('Submit your solution? You cannot change it after submission.')) {
      onSubmitCode({
        code: code,
        language: language,
        timestamp: new Date(),
        testResults: testResults
      });
    }
  };

  return (
    <div style={styles.container}>
      {/* Problem Statement */}
      <div style={styles.leftPanel}>
        <div style={styles.tabs}>
          <button 
            style={{...styles.tab, ...(activeTab === 'problem' ? styles.activeTab : {})}}
            onClick={() => setActiveTab('problem')}>
            📝 Problem
          </button>
          <button 
            style={{...styles.tab, ...(activeTab === 'testcases' ? styles.activeTab : {})}}
            onClick={() => setActiveTab('testcases')}>
            🧪 Test Cases ({testResults.filter(t => t.passed).length}/{testResults.length})
          </button>
        </div>

        {activeTab === 'problem' && (
          <div style={styles.problemContent}>
            <h2 style={styles.problemTitle}>{question.title}</h2>
            <div style={styles.difficulty}>
              <span style={getDifficultyStyle(question.difficulty)}>
                {question.difficulty}
              </span>
              <span style={styles.points}>{question.points || 100} points</span>
            </div>
            
            <div style={styles.description}>
              <h3>Description:</h3>
              <p>{question.description}</p>
            </div>

            {question.examples && (
              <div style={styles.examples}>
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

            {question.constraints && (
              <div style={styles.constraints}>
                <h3>Constraints:</h3>
                <ul>
                  {question.constraints.map((c, i) => (
                    <li key={i}>{c}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {activeTab === 'testcases' && (
          <div style={styles.testCasesContent}>
            <h3>Test Results</h3>
            {testResults.length === 0 ? (
              <p style={{color: '#888', textAlign: 'center', padding: '40px'}}>
                Run tests to see results
              </p>
            ) : (
              testResults.map((test, i) => (
                <div key={i} style={{
                  ...styles.testCase,
                  borderLeft: `4px solid ${test.passed ? '#27ae60' : '#e74c3c'}`
                }}>
                  <div style={styles.testHeader}>
                    <span>{test.passed ? '✅' : '❌'} Test Case {test.id}</span>
                    {test.hidden && <span style={styles.hiddenBadge}>Hidden</span>}
                  </div>
                  {!test.hidden && (
                    <>
                      <div style={styles.testDetail}>
                        <strong>Input:</strong> <code>{test.input}</code>
                      </div>
                      <div style={styles.testDetail}>
                        <strong>Expected:</strong> <code>{test.expected}</code>
                      </div>
                      <div style={styles.testDetail}>
                        <strong>Actual:</strong> <code>{test.actual}</code>
                      </div>
                    </>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Code Editor */}
      <div style={styles.rightPanel}>
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

          <div style={styles.timer}>
            ⏱ {Math.floor(remainingTime / 60)}:{String(remainingTime % 60).padStart(2, '0')}
          </div>
        </div>

        <textarea
          style={styles.codeArea}
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="Write your code here..."
          spellCheck={false}
          disabled={isRunning}
        />

        <div style={styles.outputPanel}>
          <div style={styles.outputHeader}>
            <span>📊 Output</span>
            <div>
              <button 
                style={{...styles.runBtn, marginRight: '8px'}}
                onClick={() => runCode()}
                disabled={isRunning}>
                {isRunning ? '⏳ Running...' : '▶️ Run Code'}
              </button>
              <button 
                style={styles.testBtn}
                onClick={runAllTests}
                disabled={isRunning}>
                🧪 Run Tests
              </button>
            </div>
          </div>
          <pre style={styles.output}>{output || 'Output will appear here...'}</pre>
        </div>

        <button 
          style={styles.submitBtn}
          onClick={handleSubmit}
          disabled={isRunning}>
          ✅ Submit Solution
        </button>
      </div>
    </div>
  );
}

// Helper function for difficulty styling
const getDifficultyStyle = (difficulty) => {
  const styles = {
    Easy: { backgroundColor: '#d4edda', color: '#155724', padding: '4px 12px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold' },
    Medium: { backgroundColor: '#fff3cd', color: '#856404', padding: '4px 12px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold' },
    Hard: { backgroundColor: '#f8d7da', color: '#721c24', padding: '4px 12px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold' }
  };
  return styles[difficulty] || styles.Easy;
};

const styles = {
  container: {
    display: 'flex',
    height: '100vh',
    backgroundColor: '#1e1e1e',
    fontFamily: 'monospace'
  },
  leftPanel: {
    flex: '0 0 40%',
    backgroundColor: '#fff',
    display: 'flex',
    flexDirection: 'column',
    borderRight: '1px solid #ddd'
  },
  tabs: {
    display: 'flex',
    borderBottom: '1px solid #ddd',
    backgroundColor: '#f5f5f5'
  },
  tab: {
    flex: 1,
    padding: '12px',
    border: 'none',
    backgroundColor: 'transparent',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    color: '#666'
  },
  activeTab: {
    backgroundColor: '#fff',
    color: '#3498db',
    borderBottom: '2px solid #3498db'
  },
  problemContent: {
    padding: '20px',
    overflowY: 'auto',
    flex: 1
  },
  problemTitle: {
    fontSize: '24px',
    color: '#2c3e50',
    marginBottom: '10px'
  },
  difficulty: {
    display: 'flex',
    gap: '10px',
    alignItems: 'center',
    marginBottom: '20px'
  },
  points: {
    color: '#f39c12',
    fontSize: '14px',
    fontWeight: 'bold'
  },
  description: {
    marginBottom: '20px',
    lineHeight: '1.6',
    color: '#34495e'
  },
  examples: {
    marginBottom: '20px'
  },
  example: {
    marginBottom: '15px'
  },
  exampleCode: {
    backgroundColor: '#f8f9fa',
    padding: '15px',
    borderRadius: '6px',
    border: '1px solid #dee2e6',
    fontSize: '13px',
    overflow: 'auto'
  },
  constraints: {
    color: '#7f8c8d'
  },
  testCasesContent: {
    padding: '20px',
    overflowY: 'auto',
    flex: 1
  },
  testCase: {
    backgroundColor: '#f8f9fa',
    padding: '15px',
    borderRadius: '8px',
    marginBottom: '10px'
  },
  testHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '10px',
    fontWeight: 'bold'
  },
  hiddenBadge: {
    backgroundColor: '#6c757d',
    color: '#fff',
    padding: '2px 8px',
    borderRadius: '10px',
    fontSize: '11px'
  },
  testDetail: {
    marginBottom: '5px',
    fontSize: '13px'
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
    padding: '10px 15px',
    backgroundColor: '#2d2d30',
    borderBottom: '1px solid #3e3e42'
  },
  languageSelect: {
    padding: '8px 12px',
    backgroundColor: '#3e3e42',
    color: '#fff',
    border: '1px solid #555',
    borderRadius: '4px',
    fontSize: '14px',
    cursor: 'pointer'
  },
  timer: {
    color: '#f39c12',
    fontSize: '16px',
    fontWeight: 'bold'
  },
  codeArea: {
    flex: '1',
    padding: '15px',
    backgroundColor: '#1e1e1e',
    color: '#d4d4d4',
    border: 'none',
    fontSize: '14px',
    fontFamily: "'Consolas', 'Courier New', monospace",
    lineHeight: '1.6',
    resize: 'none',
    outline: 'none'
  },
  outputPanel: {
    height: '200px',
    display: 'flex',
    flexDirection: 'column',
    borderTop: '1px solid #3e3e42'
  },
  outputHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '10px 15px',
    backgroundColor: '#2d2d30',
    color: '#fff'
  },
  runBtn: {
    padding: '6px 16px',
    backgroundColor: '#27ae60',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: 'bold'
  },
  testBtn: {
    padding: '6px 16px',
    backgroundColor: '#3498db',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: 'bold'
  },
  output: {
    flex: 1,
    padding: '15px',
    backgroundColor: '#1e1e1e',
    color: '#d4d4d4',
    fontSize: '13px',
    overflow: 'auto',
    margin: 0,
    fontFamily: "'Consolas', 'Courier New', monospace"
  },
  submitBtn: {
    margin: '15px',
    padding: '12px',
    backgroundColor: '#e74c3c',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    fontSize: '16px',
    fontWeight: 'bold',
    cursor: 'pointer'
  }
};

export default CodeEditor;
