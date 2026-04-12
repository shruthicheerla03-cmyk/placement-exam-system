# Questions Seeder - Usage Guide

This seed script resets and populates the Firestore `questions` collection with real placement exam questions.

## 📊 Question Distribution

### Round 1 - Aptitude (20 questions)
- ✅ Easy: 10 questions
- 🟡 Medium: 5 questions  
- 🔴 Hard: 5 questions

### Round 2 - Core Subjects (70 questions)

**Operating Systems (24 questions)**
- ✅ Easy: 8
- 🟡 Medium: 8
- 🔴 Hard: 8

**Computer Networks (24 questions)**
- ✅ Easy: 8
- 🟡 Medium: 8
- 🔴 Hard: 8

**Computer Organization & Architecture (22 questions)**
- ✅ Easy: 8
- 🟡 Medium: 8
- 🔴 Hard: 6

### Round 3 - DSA (9 questions)
- ✅ Easy: 3 questions
- 🟡 Medium: 4 questions
- 🔴 Hard: 2 questions

**Total: 99 real placement-level questions**

---

## 🚀 How to Seed Questions (EASIEST METHOD)

### **Recommended: Use Admin Dashboard UI** ✨

1. **Start your React app:**
   ```bash
   npm start
   ```

2. **Login as admin:**
   - Email: `admin@gmail.com`
   - Password: `admin123`

3. **Navigate to Question Bank tab**

4. **Click the "🌱 Seed 99 Questions" button**
   - Red button in the top-right corner
   - Confirms before proceeding
   - Takes 5-10 seconds to complete

5. **Done!** ✅
   - Questions are automatically loaded
   - You'll see a success message
   - Question bank will populate with all 99 questions

**Why this method?**
- ✅ No command-line needed
- ✅ Works with existing admin authentication
- ✅ Real-time feedback with progress messages
- ✅ Automatic question refresh after seeding
- ✅ One-click operation

---

## 📝 Question Schema

Each question follows this structure:

```javascript
{
  text: string,              // Question text
  options: string[],         // Array of 4 options
  correct: string,           // Correct answer (matches one option)
  difficulty: "Easy" | "Medium" | "Hard",
  category: string,          // "Aptitude" | "Core Subjects" | "DSA"
  subject: string,           // "aptitude" | "os" | "cn" | "coa" | "dsa"
  round: "round1" | "round2" | "round3",
  createdAt: timestamp       // Auto-generated
}
```

---

## ⚠️ Important Notes

1. **Backup First**: This script DELETES all existing questions before seeding
2. **Firebase Rules**: Ensure your Firestore rules allow write access
3. **Authentication**: Make sure you're authenticated as admin
4. **Network**: Requires active internet connection
5. **Firestore Limits**: Free tier allows 50,000 reads/day, 20,000 writes/day

---

## 🔥 Firestore Security Rules

Update your `firestore.rules`:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    function isAdmin() {
      return request.auth != null && 
             get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }
    
    match /questions/{questionId} {
      allow read: if request.auth != null;
      allow write: if isAdmin();
      allow create: if isAdmin();
      allow delete: if isAdmin();
    }
  }
}
```

Deploy rules:
```bash
firebase deploy --only firestore:rules
```

---

## 🧪 Testing

After seeding, verify in Firestore console:

1. Go to Firebase Console → Firestore Database
2. Check `questions` collection
3. Verify count: Should show 99 documents
4. Check random documents for correct structure

---

## 🐛 Troubleshooting

### Error: Permission Denied
- Check Firestore security rules
- Ensure you're logged in as admin
- Verify admin role is set in users collection

### Error: Network Error
- Check internet connection
- Verify Firebase config is correct
- Check Firebase project is active

### Error: Already Exists
- Script automatically deletes first
- If issue persists, manually delete from Firestore console

---

## 📚 Sample Questions Included

All questions are real placement-level questions sourced from:
- ✅ Common aptitude patterns (percentages, ratios, profit/loss)
- ✅ CS fundamentals (OS, Networks, COA)
- ✅ DSA concepts (complexity, algorithms, data structures)
- ✅ Multiple difficulty levels for adaptive testing

---

## 🎯 Next Steps

After seeding:
1. ✅ Create an exam using Admin Dashboard
2. ✅ Questions will be auto-selected based on difficulty distribution
3. ✅ Test the exam flow from student perspective
4. ✅ Adjust question distribution as needed

---

**Created by:** Placement Exam System Team  
**Last Updated:** April 12, 2026  
**Questions Version:** 1.0
