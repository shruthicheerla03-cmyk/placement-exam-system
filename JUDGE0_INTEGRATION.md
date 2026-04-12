# Judge0 API Integration - DSA Round Documentation

## Overview
The placement exam system now includes a fully integrated coding environment for Round 3 (DSA) using the **Judge0 Community Edition (CE) API**.

## Features
✅ Multi-language code execution (Python, C++, C, Java, JavaScript)  
✅ Real-time code compilation and execution  
✅ Custom input testing (stdin)  
✅ Automated test case validation  
✅ Firestore submission tracking  
✅ Execution status polling  
✅ Comprehensive error handling  

---

## Architecture

### 1. **Judge0 Service** (`src/services/judge0Service.js`)
Handles all API communication with Judge0:

- `createSubmission()` - Creates a code submission and returns a token
- `getSubmission()` - Retrieves submission result by token
- `pollSubmission()` - Polls for execution completion (1-second intervals, max 30 seconds)
- `executeCode()` - Complete execution flow (create + poll)
- `formatResult()` - Formats Judge0 response for display

**Supported Languages:**
| Language   | Judge0 ID | Icon |
|------------|-----------|------|
| Python     | 71        | 🐍   |
| C++        | 54        | ⚙️   |
| C          | 50        | 🔧   |
| Java       | 62        | ☕   |
| JavaScript | 63        | 📜   |

---

### 2. **CodeEditor Component** (`src/components/CodeEditor.js`)
Interactive IDE interface:

**Features:**
- Split-panel layout (problem statement | code editor)
- Syntax-highlighted textarea (dark theme)
- Language selector dropdown
- Custom input field (stdin)
- Output display panel
- Test case execution viewer

**Actions:**
- **▶️ Run Code** - Execute with custom input
- **🧪 Run Tests** - Execute all test cases
- **✅ Submit Solution** - Save to Firestore and mark complete

---

### 3. **DSARound Component** (`src/components/DSARound.js`)
Manages the coding round workflow:

- Question navigation (1/N selector)
- Timer countdown
- Solution tracking per question
- Overall score calculation
- Round submission to ExamPage

---

## API Flow

### Run Code Flow:
```
User clicks "Run Code"
    ↓
CodeEditor.runCode()
    ↓
judge0Service.executeCode(code, languageId, stdin)
    ↓
createSubmission() → returns token
    ↓
pollSubmission(token) → checks every 1s
    ↓
getSubmission(token) → status.id > 2 (complete)
    ↓
formatResult() → parse output/errors
    ↓
Display in Output panel
```

### Submit Code Flow:
```
User clicks "Submit Solution"
    ↓
CodeEditor.handleSubmit()
    ↓
Save to Firestore: dsaSubmissions collection
    ↓
{
  userId,
  examId,
  questionId,
  code,
  language,
  testResults,
  submittedAt: serverTimestamp()
}
    ↓
onSubmitCode() callback to DSARound
    ↓
DSARound tracks solution
    ↓
User clicks "Finish Round"
    ↓
Calculate overall score
    ↓
Save to dsaSubmissions (round summary)
    ↓
onComplete() callback to ExamPage
```

---

## Judge0 Status Codes

| Status ID | Description           | Handling                      |
|-----------|-----------------------|-------------------------------|
| 1         | In Queue              | Keep polling                  |
| 2         | Processing            | Keep polling                  |
| 3         | Accepted              | ✅ Success, show stdout       |
| 4         | Wrong Answer          | ❌ Show expected vs actual    |
| 5         | Time Limit Exceeded   | ⏱️ Execution timeout          |
| 6         | Compilation Error     | 🔴 Show compile_output        |
| 7-12      | Runtime Errors        | ❌ Show stderr                |
| 13-14     | System Errors         | ⚠️ Internal error             |

---

## Firestore Schema

### Collection: `dsaSubmissions`

**Individual Submissions** (per question):
```json
{
  "userId": "abc123",
  "examId": "exam789",
  "questionId": "q1",
  "questionTitle": "Two Sum",
  "code": "def solution():\n    pass",
  "language": "python",
  "languageId": 71,
  "testResults": [
    {
      "id": 1,
      "input": "1 2",
      "expected": "3",
      "actual": "3",
      "passed": true,
      "time": 0.02,
      "memory": 2048
    }
  ],
  "submittedAt": <Timestamp>,
  "timestamp": "2026-04-12T10:30:00Z"
}
```

**Round Summary** (final submission):
```json
{
  "userId": "abc123",
  "examId": "exam789",
  "solutions": {
    "0": {
      "code": "...",
      "language": "python",
      "testResults": [...]
    },
    "1": { ... }
  },
  "score": 85,
  "submittedAt": <Timestamp>,
  "timeSpent": 1800
}
```

---

## Question Format

DSA questions in Firestore should follow this structure:

```json
{
  "id": "q1",
  "title": "Two Sum",
  "description": "Given an array of integers...",
  "difficulty": "Easy",
  "category": "DSA",
  "round": "round3",
  "points": 100,
  
  "examples": [
    {
      "input": "[2,7,11,15], target=9",
      "output": "[0,1]",
      "explanation": "2 + 7 = 9"
    }
  ],
  
  "constraints": [
    "2 <= nums.length <= 10^4",
    "-10^9 <= nums[i] <= 10^9"
  ],
  
  "testCases": [
    {
      "input": "2 7 11 15\n9",
      "expectedOutput": "0 1",
      "hidden": false
    },
    {
      "input": "3 2 4\n6",
      "expectedOutput": "1 2",
      "hidden": true
    }
  ],
  
  "starterCode": {
    "python": "def two_sum(nums, target):\n    pass",
    "cpp": "#include <iostream>\nusing namespace std;\n\nint main() {\n    return 0;\n}",
    "javascript": "function twoSum(nums, target) {\n    \n}"
  },
  
  "defaultLanguage": "python"
}
```

---

## Error Handling

### Network Errors
```javascript
try {
  const result = await executeCode(...);
} catch (error) {
  setOutput(`❌ Error: ${error.message}\n\nPlease check your code and try again.`);
}
```

### Empty Code Validation
```javascript
if (!code.trim()) {
  setOutput('❌ Error: Code cannot be empty');
  return;
}
```

### API Timeout
```javascript
// In pollSubmission()
if (attempts >= maxAttempts) {
  reject(new Error('Execution timeout'));
}
```

### Compilation Errors
```javascript
if (formatted.type === 'compile_error') {
  displayOutput = `❌ ${formatted.output}`;
}
```

---

## Security Considerations

### ✅ Safe (Current Implementation)
- Using public Judge0 CE API (free tier)
- No API keys exposed in frontend
- Server-side validation via Judge0
- Rate limiting handled by Judge0

### ⚠️ Production Recommendations
1. **Set up own Judge0 instance** for better control
2. **Implement rate limiting** per user (e.g., max 50 runs/hour)
3. **Add code length limits** (max 10,000 characters)
4. **Monitor API usage** to prevent abuse
5. **Add submission cooldown** (e.g., 3 seconds between runs)

---

## Testing the Integration

### 1. Test Code Execution
```python
# Python test
print("Hello, World!")
```
Expected: `✅ Success! Output: Hello, World!`

### 2. Test Custom Input
```python
# Python test
name = input()
print(f"Hello, {name}!")
```
Input: `Alice`  
Expected: `Hello, Alice!`

### 3. Test Compilation Error
```cpp
// C++ test
#include <iostream>
int main() {
    cout << "Missing semicolon"
    return 0;
}
```
Expected: `❌ Compilation Error: ...`

### 4. Test Runtime Error
```python
# Python test
x = 10 / 0
```
Expected: `❌ Runtime Error: ZeroDivisionError...`

### 5. Test Test Cases
- Click "🧪 Run Tests"
- Should execute all test cases sequentially
- Display pass/fail status for each

---

## Performance Optimization

### Polling Strategy
- **Interval:** 1 second (balances responsiveness vs server load)
- **Max timeout:** 30 seconds (prevents infinite loops)
- **Early exit:** Stops immediately when status.id > 2

### Test Case Execution
- **Sequential execution** (not parallel) to avoid rate limits
- **Progress feedback** during multi-test execution
- **Abort on first failure** (optional feature)

---

## Troubleshooting

### Issue: "Error creating submission"
**Cause:** Network error or Judge0 API down  
**Solution:** Check console for detailed error, retry after 30 seconds

### Issue: "Execution timeout"
**Cause:** Code takes > 30 seconds or Judge0 queue is full  
**Solution:** Optimize code or increase maxAttempts in pollSubmission()

### Issue: "No output"
**Cause:** Code didn't print anything  
**Solution:** This is expected behavior, add print/cout statements

### Issue: Test cases not running
**Cause:** Question missing testCases field  
**Solution:** Add testCases array to question document in Firestore

---

## Future Enhancements

### Planned Features
- [ ] **Monaco Editor** integration (syntax highlighting, autocomplete)
- [ ] **Code templates** for common patterns
- [ ] **Execution history** viewer
- [ ] **Leaderboard** based on execution time/memory
- [ ] **Plagiarism detection** using code similarity
- [ ] **Live collaboration** mode
- [ ] **Custom judge** for special problem types

### Advanced Features
- [ ] **Interactive visualizations** (array, tree, graph)
- [ ] **Debugging tools** (step-through execution)
- [ ] **Performance metrics** dashboard
- [ ] **AI hints** system
- [ ] **Multi-file submissions**

---

## API Limits (Judge0 CE)

### Free Tier Limits:
- **Rate limit:** 50 requests/day per IP
- **Queue limit:** 20 concurrent submissions
- **Execution time:** Max 5 seconds per submission
- **Memory:** Max 128 MB per submission

**⚠️ For production:** Consider self-hosting Judge0 or upgrading to RapidAPI paid tier.

---

## Support & Contact

For issues or questions:
1. Check [Judge0 Documentation](https://ce.judge0.com)
2. Review console errors in browser DevTools
3. Check Firestore security rules
4. Verify API endpoints are accessible

---

## License

This integration uses:
- **Judge0 CE** - Licensed under GPL v3
- **React** - MIT License
- **Firebase** - Commercial license

---

**Last Updated:** April 12, 2026  
**Version:** 1.0.0  
**Contributors:** Placement Exam System Team
