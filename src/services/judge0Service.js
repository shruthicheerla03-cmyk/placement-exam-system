/**
 * Judge0 API Service
 * Official CE API: https://ce.judge0.com
 * 
 * Language IDs:
 * - Python (3.8.1) → 71
 * - C++ (GCC 9.2.0) → 54
 * - C (GCC 9.2.0) → 50
 * - Java (OpenJDK 13.0.1) → 62
 * - JavaScript (Node.js 12.14.0) → 63
 */

const JUDGE0_API_URL = 'https://ce.judge0.com';

// Language ID mapping
export const LANGUAGE_IDS = {
  python: 71,
  cpp: 54,
  c: 50,
  java: 62,
  javascript: 63
};

/**
 * Create a submission and get token
 * @param {string} sourceCode - The code to execute
 * @param {number} languageId - Judge0 language ID
 * @param {string} stdin - Standard input (optional)
 * @param {string} expectedOutput - Expected output for testing (optional)
 * @returns {Promise<string>} - Submission token
 */
export const createSubmission = async (sourceCode, languageId, stdin = '', expectedOutput = '') => {
  try {
    const payload = {
      source_code: sourceCode,
      language_id: languageId,
      stdin: stdin,
      expected_output: expectedOutput || undefined
    };

    const response = await fetch(`${JUDGE0_API_URL}/submissions?base64_encoded=false&wait=false`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    return result.token;
  } catch (error) {
    console.error('Error creating submission:', error);
    throw error;
  }
};

/**
 * Get submission result by token
 * @param {string} token - Submission token
 * @returns {Promise<Object>} - Submission result
 */
export const getSubmission = async (token) => {
  try {
    const response = await fetch(`${JUDGE0_API_URL}/submissions/${token}?base64_encoded=false`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Error getting submission:', error);
    throw error;
  }
};

/**
 * Poll for submission result until execution completes
 * @param {string} token - Submission token
 * @param {function} onProgress - Callback for progress updates
 * @returns {Promise<Object>} - Final submission result
 */
export const pollSubmission = async (token, onProgress = null) => {
  const maxAttempts = 30; // Maximum 30 seconds
  let attempts = 0;

  return new Promise((resolve, reject) => {
    const interval = setInterval(async () => {
      attempts++;
      
      try {
        const result = await getSubmission(token);
        
        // Status IDs:
        // 1 = In Queue
        // 2 = Processing
        // 3 = Accepted
        // 4 = Wrong Answer
        // 5 = Time Limit Exceeded
        // 6 = Compilation Error
        // 7-14 = Various runtime errors
        
        if (onProgress) {
          onProgress(result);
        }

        // Check if execution is complete (status.id > 2)
        if (result.status && result.status.id > 2) {
          clearInterval(interval);
          resolve(result);
        }

        // Timeout after max attempts
        if (attempts >= maxAttempts) {
          clearInterval(interval);
          reject(new Error('Execution timeout'));
        }
      } catch (error) {
        clearInterval(interval);
        reject(error);
      }
    }, 1000); // Poll every 1 second
  });
};

/**
 * Execute code and wait for result
 * @param {string} sourceCode - The code to execute
 * @param {number} languageId - Judge0 language ID
 * @param {string} stdin - Standard input (optional)
 * @param {string} expectedOutput - Expected output for testing (optional)
 * @param {function} onProgress - Callback for progress updates
 * @returns {Promise<Object>} - Execution result
 */
export const executeCode = async (sourceCode, languageId, stdin = '', expectedOutput = '', onProgress = null) => {
  try {
    // Create submission
    const token = await createSubmission(sourceCode, languageId, stdin, expectedOutput);
    
    // Poll for result
    const result = await pollSubmission(token, onProgress);
    
    return result;
  } catch (error) {
    console.error('Error executing code:', error);
    throw error;
  }
};

/**
 * Format execution result for display
 * @param {Object} result - Judge0 submission result
 * @returns {Object} - Formatted result
 */
export const formatResult = (result) => {
  const statusId = result.status?.id;
  const statusDescription = result.status?.description || 'Unknown';
  
  let output = '';
  let success = false;
  let type = 'error';

  switch (statusId) {
    case 3: // Accepted
      success = true;
      type = 'success';
      output = result.stdout || '(no output)';
      break;
    
    case 4: // Wrong Answer
      type = 'wrong';
      output = `Wrong Answer\n\nYour Output:\n${result.stdout || '(no output)'}\n\nExpected:\n${result.expected_output || 'N/A'}`;
      break;
    
    case 5: // Time Limit Exceeded
      type = 'error';
      output = `Time Limit Exceeded\n\nExecution took longer than allowed time.`;
      break;
    
    case 6: // Compilation Error
      type = 'compile_error';
      output = `Compilation Error:\n${result.compile_output || 'Unknown compilation error'}`;
      break;
    
    case 7: // Runtime Error (SIGSEGV)
    case 8: // Runtime Error (SIGXFSZ)
    case 9: // Runtime Error (SIGFPE)
    case 10: // Runtime Error (SIGABRT)
    case 11: // Runtime Error (NZEC)
    case 12: // Runtime Error (Other)
      type = 'runtime_error';
      output = `Runtime Error:\n${result.stderr || statusDescription}`;
      break;
    
    case 13: // Internal Error
    case 14: // Exec Format Error
      type = 'error';
      output = `System Error: ${statusDescription}`;
      break;
    
    default:
      type = 'error';
      output = `Status: ${statusDescription}\n${result.stderr || result.stdout || ''}`;
  }

  return {
    success,
    type,
    output,
    time: result.time || 0,
    memory: result.memory || 0,
    statusId,
    statusDescription,
    raw: result
  };
};

/**
 * Get language details
 * @param {string} languageKey - Language key (python, cpp, etc.)
 * @returns {Object} - Language details
 */
export const getLanguageDetails = (languageKey) => {
  const languages = {
    python: { id: 71, name: 'Python', icon: '🐍', extension: 'py' },
    cpp: { id: 54, name: 'C++', icon: '⚙️', extension: 'cpp' },
    c: { id: 50, name: 'C', icon: '🔧', extension: 'c' },
    java: { id: 62, name: 'Java', icon: '☕', extension: 'java' },
    javascript: { id: 63, name: 'JavaScript', icon: '📜', extension: 'js' }
  };
  
  return languages[languageKey] || languages.python;
};

const judge0Service = {
  LANGUAGE_IDS,
  createSubmission,
  getSubmission,
  pollSubmission,
  executeCode,
  formatResult,
  getLanguageDetails
};

export default judge0Service;
