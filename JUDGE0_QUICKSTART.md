# Judge0 Integration - Quick Start Guide

## 🚀 Getting Started

### Prerequisites
✅ React app running  
✅ Firebase Firestore configured  
✅ Internet connection (for Judge0 API)  

---

## 📋 Setup Steps

### 1. Files Added/Modified

**New Files:**
- `src/services/judge0Service.js` - Judge0 API integration
- `src/utils/dsaSeeder.js` - Sample DSA questions
- `JUDGE0_INTEGRATION.md` - Comprehensive documentation

**Modified Files:**
- `src/components/CodeEditor.js` - Enhanced with real Judge0 execution
- `src/components/DSARound.js` - Added userId/examId props
- `src/pages/ExamPage.js` - Already integrated (no changes needed)

---

### 2. Seed DSA Questions

**Option A: Using Firebase Console**
1. Go to Firebase Console > Firestore
2. Create documents in `questions` collection
3. Copy questions from `src/utils/dsaSeeder.js`

**Option B: Add Seed Button to AdminDashboard** (Recommended)

Add this to `src/pages/AdminDashboard.js`:

```javascript
import { seedDSAQuestions } from '../utils/dsaSeeder';

// Inside AdminDashboard component:
const handleSeedDSA = async () => {
  if (!window.confirm('Seed 5 DSA coding questions?')) return;
  
  const result = await seedDSAQuestions(db);
  
  if (result.success) {
    alert(`✅ ${result.message}`);
  } else {
    alert(`❌ ${result.message}`);
  }
};

// Add button in JSX:
<button 
  onClick={handleSeedDSA}
  className="nav-button primary"
  style={{ marginRight: '10px' }}>
  🧪 Seed DSA Questions
</button>
```

---

### 3. Test the Integration

#### Step 1: Create a DSA Exam
1. Login as admin
2. Go to "Create Exam" tab
3. Select questions from:
   - Two Sum (Easy)
   - Reverse String (Easy)
   - Fibonacci Number (Easy)
   - Valid Palindrome (Easy)
   - Maximum Subarray Sum (Medium)

#### Step 2: Start Exam as Student
1. Login as student
2. Enter exam code
3. Complete Round 1 and Round 2
4. Round 3 will automatically switch to coding interface

#### Step 3: Test Code Execution
```python
# Test 1: Simple Python Code
print("Hello, World!")
```
Expected: `✅ Success! Output: Hello, World!`

```python
# Test 2: With Custom Input
name = input()
print(f"Hello, {name}!")
```
Custom Input: `Alice`  
Expected: `Hello, Alice!`

#### Step 4: Test Language Switching
- Switch to C++, Java, JavaScript, or C
- Starter code auto-loads
- Run code to verify compilation

#### Step 5: Test Case Execution
- Click "🧪 Run Tests"
- Should execute all test cases
- View results in "Test Cases" tab

#### Step 6: Submit Solution
- Click "✅ Submit Solution"
- Confirm submission
- Check Firestore > `dsaSubmissions` collection

---

## 🔍 Troubleshooting

### Issue: "Error creating submission"
**Fix:** Judge0 CE might be down or rate-limited. Wait 1 minute and retry.

### Issue: Code runs but no output
**Fix:** Make sure you're using `print()` in Python or `cout` in C++. Check starter code.

### Issue: Compilation error in Java
**Fix:** Java class name must be `Main` (not `Solution`).

### Issue: Test cases all failing
**Fix:** Check input/output format matches expected format exactly (including spaces).

### Issue: "No test cases available"
**Fix:** Add `testCases` array to question document in Firestore.

---

## 📊 Monitor Submissions

### View Individual Submissions
```javascript
// In Firebase Console:
Collection: dsaSubmissions
Fields:
- userId
- examId
- questionId
- code
- language
- testResults
- submittedAt
```

### View Round Summary
```javascript
// After "Finish Round":
Collection: dsaSubmissions
Fields:
- userId
- examId
- solutions (object with all submissions)
- score (calculated)
- timeSpent
```

---

## ⚡ Performance Tips

### For Students:
- Use "Run Code" for debugging with custom input
- Use "Run Tests" to validate against all test cases
- Submit only when all tests pass

### For Admins:
- Limit Round 3 to 3-5 questions max
- Set round duration to 45-60 minutes
- Use mix of Easy (60%), Medium (30%), Hard (10%)

### API Limits:
- Judge0 CE Free Tier: 50 requests/day per IP
- If hitting limits: self-host Judge0 or upgrade to RapidAPI

---

## 🎯 Next Steps

### Immediate:
1. ✅ Seed DSA questions
2. ✅ Create test exam
3. ✅ Test all languages
4. ✅ Verify Firestore submissions

### Optional Enhancements:
- [ ] Add Monaco Editor for syntax highlighting
- [ ] Add code templates for common patterns
- [ ] Add execution time leaderboard
- [ ] Add plagiarism detection
- [ ] Add collaborative debugging

---

## 📚 Resources

- [Judge0 Documentation](https://ce.judge0.com)
- [Judge0 GitHub](https://github.com/judge0/judge0)
- [Language IDs Reference](https://ce.judge0.com/#statuses-and-languages-language-get)
- [Firebase Firestore Docs](https://firebase.google.com/docs/firestore)

---

## ✅ Verification Checklist

Before going live:
- [ ] All 5 languages tested and working
- [ ] Test cases execute correctly
- [ ] Submissions save to Firestore
- [ ] Round timer works properly
- [ ] Error messages are user-friendly
- [ ] Firestore security rules allow writes
- [ ] No console errors in browser
- [ ] Mobile responsiveness checked

---

## 🤝 Support

For issues:
1. Check browser console for errors
2. Verify Firestore rules allow authenticated writes
3. Check Judge0 API status
4. Review `JUDGE0_INTEGRATION.md` for detailed docs

---

**Happy Coding! 🎉**
