# 💻 DSA Coding Round - Setup & Integration Guide

## Adding Coding Questions & Running DSA Round

---

## 📋 Table of Contents
1. [Adding DSA Questions](#adding-dsa-questions)
2. [Question Structure](#question-structure)
3. [Integrating DSA Round](#integration)
4. [Test Cases Format](#test-cases)
5. [Compiler Setup](#compiler-setup)
6. [Sample Questions](#sample-questions)

---

## 🎯 Adding DSA Questions

### Method 1: Through Admin Dashboard

Update `AdminDashboard.js` to support DSA question type:

```javascript
// In question form, add DSA-specific fields
const [qType, setQType] = useState('MCQ'); // MCQ or Coding

{qType === 'Coding' && (
  <>
    <label>Problem Title</label>
    <input 
      value={problemTitle} 
      onChange={(e) => setProblemTitle(e.target.value)}
      placeholder="e.g., Two Sum"
    />
    
    <label>Description</label>
    <textarea 
      value={description}
      onChange={(e) => setDescription(e.target.value)}
      placeholder="Problem description..."
      rows="6"
    />
    
    <label>Input Format</label>
    <textarea value={inputFormat} onChange={(e) => setInputFormat(e.target.value)} />
    
    <label>Output Format</label>
    <textarea value={outputFormat} onChange={(e) => setOutputFormat(e.target.value)} />
    
    <label>Constraints</label>
    <textarea 
      value={constraints}
      onChange={(e) => setConstraints(e.target.value)}
      placeholder="e.g., 1 <= n <= 10^5"
    />
    
    <label>Test Cases (JSON)</label>
    <textarea 
      value={testCases}
      onChange={(e) => setTestCases(e.target.value)}
      placeholder={JSON.stringify([
        {input: "5 10", expectedOutput: "15", hidden: false},
        {input: "100 200", expectedOutput: "300", hidden: true}
      ], null, 2)}
    />
  </>
)}
```

### Method 2: Direct Firestore Upload

Add to Firestore `questions` collection:

```javascript
await addDoc(collection(db, 'questions'), {
  type: 'coding',
  category: 'DSA',
  difficulty: 'Medium',
  title: 'Two Sum',
  description: 'Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.',
  
  examples: [
    {
      input: '[2,7,11,15], target = 9',
      output: '[0,1]',
      explanation: 'Because nums[0] + nums[1] == 9, we return [0, 1].'
    }
  ],
  
  constraints: [
    '2 <= nums.length <= 10^4',
    '-10^9 <= nums[i] <= 10^9',
    'Only one valid answer exists'
  ],
  
  testCases: [
    { input: '[2,7,11,15]\n9', expectedOutput: '[0,1]', hidden: false, points: 25 },
    { input: '[3,2,4]\n6', expectedOutput: '[1,2]', hidden: false, points: 25 },
    { input: '[3,3]\n6', expectedOutput: '[0,1]', hidden: true, points: 25 },
    { input: '[1,2,3,4,5]\n9', expectedOutput: '[3,4]', hidden: true, points: 25 }
  ],
  
  starterCode: {
    python: 'def twoSum(nums, target):\n    # Write your code here\n    pass',
    javascript: 'function twoSum(nums, target) {\n    // Write your code here\n}',
    cpp: '#include <vector>\nusing namespace std;\n\nvector<int> twoSum(vector<int>& nums, int target) {\n    // Write your code here\n}',
    java: 'class Solution {\n    public int[] twoSum(int[] nums, int target) {\n        // Write your code here\n    }\n}',
    c: '#include <stdio.h>\nint* twoSum(int* nums, int numsSize, int target, int* returnSize) {\n    // Write your code here\n}'
  },
  
  defaultLanguage: 'python',
  timeLimit: 2, // seconds
  memoryLimit: 256, // MB
  points: 100,
  createdAt: new Date()
});
```

---

## 📝 Question Structure

### Complete DSA Question Schema

```typescript
interface DSAQuestion {
  // Basic Info
  type: 'coding';
  category: 'DSA';
  difficulty: 'Easy' | 'Medium' | 'Hard';
  
  // Problem Details
  title: string;
  description: string;
  
  // Examples
  examples: Array<{
    input: string;
    output: string;
    explanation?: string;
  }>;
  
  // Constraints
  constraints: string[];
  
  // Test Cases
  testCases: Array<{
    input: string;           // Input data
    expectedOutput: string;  // Expected output
    hidden: boolean;         // Hidden from student
    points: number;          // Points for this test
  }>;
  
  // Starter Code
  starterCode: {
    python?: string;
    javascript?: string;
    java?: string;
    cpp?: string;
    c?: string;
  };
  
  // Limits
  defaultLanguage: string;
  timeLimit: number;    // seconds
  memoryLimit: number;  // MB
  points: number;       // Total points
  
  // Metadata
  createdAt: Date;
  tags?: string[];      // ['array', 'hash-table']
  hints?: string[];
}
```

---

## 🔗 Integrating DSA Round into Exam Flow

### Step 1: Update ExamPage.js

Add DSA round support:

```javascript
import DSARound from '../components/DSARound';

const ROUNDS = [
  { name: 'Round 1: Aptitude', category: 'Aptitude', color: '#3498db' },
  { name: 'Round 2: Core Subjects', category: 'Core Subjects', color: '#9b59b6' },
  { name: 'Round 3: DSA', category: 'DSA', color: '#e67e22', type: 'coding' }
];

// In the render logic
if (ROUNDS[roundIndex].type === 'coding') {
  return (
    <DSARound
      exam={exam}
      questions={roundQuestions}
      onComplete={handleSubmitRound}
      userId={auth.currentUser?.uid}
      examId={examId}
    />
  );
}
```

### Step 2: Update Admin Dashboard

Add DSA question configuration:

```javascript
// In Create Exam form
const [dsaCount, setDsaCount] = useState('');

<div style={styles.sectionHeader}>💻 DSA Coding Problems</div>
<input 
  style={styles.input} 
  type="number" 
  placeholder="Number of coding problems (1-5)"
  value={dsaCount}
  onChange={e => setDsaCount(e.target.value)}
  min="0"
  max="5"
/>

// In exam creation
const dsaQuestions = questions
  .filter(q => q.category === 'DSA' && q.type === 'coding')
  .sort(() => Math.random() - 0.5)
  .slice(0, parseInt(dsaCount) || 0);
```

### Step 3: Update Round Durations

```javascript
roundDurations: {
  aptitude: parseInt(aptDuration) || 30,
  core: parseInt(coreDuration) || 30,
  dsa: parseInt(dsaDuration) || 60  // 60 minutes for DSA
}
```

---

## 🧪 Test Cases Format

### Input Format Examples

#### Simple Input (Single Line)
```json
{
  "input": "5 10",
  "expectedOutput": "15",
  "hidden": false
}
```

#### Multi-line Input
```json
{
  "input": "3\n1 2 3\n4 5 6\n7 8 9",
  "expectedOutput": "[[1,2,3],[4,5,6],[7,8,9]]",
  "hidden": false
}
```

#### Array Input
```json
{
  "input": "[2,7,11,15]\n9",
  "expectedOutput": "[0,1]",
  "hidden": false
}
```

### Output Validation

The system compares:
- **Exact match**: Trimmed strings
- **Numeric tolerance**: For floating point (within 1e-6)
- **Array order**: For unordered outputs

---

## ⚙️ Compiler Setup Options

### Option 1: Judge0 (Recommended for Production)

**Pros:**
- ✅ Supports 60+ languages
- ✅ Isolated sandbox execution
- ✅ Resource limits (time, memory)
- ✅ RESTful API
- ✅ High reliability

**Cons:**
- ❌ Paid API (after free tier)
- ❌ Requires internet

**Setup:**
```javascript
// .env
REACT_APP_JUDGE0_API_KEY=your_rapidapi_key
REACT_APP_JUDGE0_HOST=judge0-ce.p.rapidapi.com
```

### Option 2: Piston (Free Alternative)

**Pros:**
- ✅ Completely free
- ✅ No API key needed
- ✅ Open source

**Cons:**
- ❌ Limited rate limits
- ❌ Less robust than Judge0

**Setup:**
```javascript
const API_URL = 'https://emkc.org/api/v2/piston/execute';
```

### Option 3: Self-Hosted (Advanced)

**Pros:**
- ✅ Full control
- ✅ No external dependencies
- ✅ Unlimited executions

**Cons:**
- ❌ Requires server management
- ❌ Security considerations
- ❌ Infrastructure costs

**Setup:**
```bash
# Using Docker
docker run -p 2358:2358 -d judge0/judge0:latest
```

---

## 📚 Sample DSA Questions

### 1. Easy: Reverse String

```javascript
{
  type: 'coding',
  category: 'DSA',
  difficulty: 'Easy',
  title: 'Reverse a String',
  description: 'Write a function to reverse a given string.',
  
  examples: [
    { input: 'hello', output: 'olleh' },
    { input: 'world', output: 'dlrow' }
  ],
  
  constraints: [
    '1 <= string.length <= 10^4',
    'String contains only lowercase letters'
  ],
  
  testCases: [
    { input: 'hello', expectedOutput: 'olleh', hidden: false, points: 25 },
    { input: 'a', expectedOutput: 'a', hidden: false, points: 25 },
    { input: 'abcdef', expectedOutput: 'fedcba', hidden: true, points: 25 },
    { input: 'racecar', expectedOutput: 'racecar', hidden: true, points: 25 }
  ],
  
  starterCode: {
    python: 'def reverse_string(s):\n    # Write your code here\n    pass',
    javascript: 'function reverseString(s) {\n    // Write your code here\n}',
    cpp: 'string reverseString(string s) {\n    // Write your code here\n}'
  },
  
  defaultLanguage: 'python',
  points: 100
}
```

### 2. Medium: Two Sum

```javascript
{
  type: 'coding',
  category: 'DSA',
  difficulty: 'Medium',
  title: 'Two Sum',
  description: 'Given an array of integers and a target, return indices of two numbers that add up to target.',
  
  examples: [
    { 
      input: '[2,7,11,15], target = 9', 
      output: '[0,1]',
      explanation: 'nums[0] + nums[1] = 2 + 7 = 9'
    }
  ],
  
  constraints: [
    '2 <= nums.length <= 10^4',
    '-10^9 <= nums[i] <= 10^9',
    'Only one valid solution exists'
  ],
  
  testCases: [
    { input: '[2,7,11,15]\n9', expectedOutput: '[0,1]', hidden: false, points: 20 },
    { input: '[3,2,4]\n6', expectedOutput: '[1,2]', hidden: false, points: 20 },
    { input: '[3,3]\n6', expectedOutput: '[0,1]', hidden: true, points: 20 },
    { input: '[-1,-2,-3,-4,-5]\n-8', expectedOutput: '[2,4]', hidden: true, points: 20 },
    { input: '[0,4,3,0]\n0', expectedOutput: '[0,3]', hidden: true, points: 20 }
  ],
  
  starterCode: {
    python: 'def twoSum(nums, target):\n    # Write your code here\n    pass'
  },
  
  points: 100
}
```

### 3. Hard: Merge K Sorted Lists

```javascript
{
  type: 'coding',
  category: 'DSA',
  difficulty: 'Hard',
  title: 'Merge K Sorted Lists',
  description: 'Merge k sorted linked lists and return it as one sorted list.',
  
  examples: [
    {
      input: '[[1,4,5],[1,3,4],[2,6]]',
      output: '[1,1,2,3,4,4,5,6]'
    }
  ],
  
  constraints: [
    'k == lists.length',
    '0 <= k <= 10^4',
    '0 <= lists[i].length <= 500'
  ],
  
  testCases: [
    { input: '[[1,4,5],[1,3,4],[2,6]]', expectedOutput: '[1,1,2,3,4,4,5,6]', hidden: false, points: 30 },
    { input: '[]', expectedOutput: '[]', hidden: false, points: 10 },
    { input: '[[]]', expectedOutput: '[]', hidden: false, points: 10 },
    // More complex hidden tests...
  ],
  
  points: 200
}
```

---

## 🎯 Quick Start: Add Your First DSA Question

1. **Go to Firebase Console** → Firestore Database

2. **Add to `questions` collection:**
   - Click "Add Document"
   - Auto-generate ID
   - Add fields as shown above

3. **Test the question:**
   - Create an exam with DSA round
   - Add the question
   - Start exam as student
   - Verify code execution

4. **Monitor submissions:**
   - Check `dsaSubmissions` collection
   - View code, test results, scores

---

## 🔍 Debugging Tips

### Test Code Execution Locally
```javascript
// Create a test file: testCompiler.js
const testCode = `
def two_sum(nums, target):
    seen = {}
    for i, num in enumerate(nums):
        if target - num in seen:
            return [seen[target - num], i]
        seen[num] = i
`;

// Test with Judge0 or Piston
console.log('Testing code execution...');
```

### Check Firestore Data
```javascript
// In browser console
const q = await getDocs(collection(db, 'questions'));
q.forEach(doc => console.log(doc.data()));
```

### Monitor API Usage
- Judge0: Check RapidAPI dashboard
- Piston: Monitor network tab for rate limits

---

## 📊 Scoring System

### Automatic Scoring
- Each test case has points
- Partial credit for passing some tests
- Final score = (Passed Tests / Total Tests) × 100

### Manual Review (Optional)
- Admin can view submitted code
- Adjust scores manually
- Add comments/feedback

---

## 🚀 Go Live Checklist

- [ ] Add 5-10 DSA questions per difficulty
- [ ] Test code execution with all languages
- [ ] Configure Judge0 API key
- [ ] Set appropriate time limits
- [ ] Add hidden test cases for security
- [ ] Test with mock students
- [ ] Monitor API rate limits
- [ ] Setup error logging

---

**Your DSA coding round is ready! Students can now solve coding problems with real compiler integration.** 💻
