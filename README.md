# Placement Exam System

A modern, cloud-based online placement examination system built with React and Firebase.

## 🚀 Features

### Authentication
- User registration and login with Firebase Authentication
- Role-based access (Student & Admin)
- Secure user data storage in Firestore

### Student Features
- **Screen Sharing Enforcement**: Mandatory full screen sharing using `getDisplayMedia` API
- Exam code validation (3 max attempts)
- Interactive exam instructions with agreement checkbox
- Countdown timer before exam starts
- **Multi-round examination system:**
  - Round 1: Aptitude
  - Round 2: Core Subjects
  - Round 3: DSA (Coding Round with integrated IDE)
- Real-time violation tracking
- Auto-submission on time expiry or violations
- Fullscreen mode enforcement

### Admin Features
- Create exams with custom configurations
- Question bank management (Easy/Medium/Hard difficulty levels)
- **Support for MCQ and Coding questions**
- Set exam start times and round durations
- Auto-select questions based on difficulty distribution
- View exam submissions and results
- Track student violations
- Monitor DSA code submissions

### DSA Coding Round 🆕
- **Integrated Code Editor** with syntax highlighting
- **Multi-language support:** Python, C, C++, Java, JavaScript
- **Run code** with custom input
- **Test cases** with hidden tests
- **Compiler integration:** Judge0 API / Piston API
- **Auto-grading** with partial credit
- Real-time output display
- Time and memory limits

### Security & Proctoring
- 🖥️ **Mandatory Screen Sharing** - Students must share entire screen
- 🔒 Fullscreen enforcement
- ⚠️ Tab switching detection
- 🚫 Window blur detection
- 📊 Violation counting (max 5 violations)
- ⏱ Auto-submission on time expiry
- 🔴 Real-time screen sharing status monitoring

### Performance & Scalability
- Optimized for **500+ concurrent users**
- Firebase indexing and caching
- Code splitting and lazy loading
- **CDN-ready** for global deployment
- Offline persistence support

## 📋 Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- Firebase account
- Modern browser (Chrome/Edge recommended for screen sharing)

## 🛠️ Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd placement-exam-system
```

2. Install dependencies:
```bash
npm install
```

3. Configure Firebase:
   - Update `src/firebase/config.js` with your Firebase credentials

4. (Optional) Setup Compiler API for DSA Round:
   - Sign up for [Judge0 on RapidAPI](https://rapidapi.com/judge0-official/api/judge0-ce)
   - Create `.env` file in root:
     ```
     REACT_APP_JUDGE0_API_KEY=your_rapidapi_key_here
     REACT_APP_JUDGE0_HOST=judge0-ce.p.rapidapi.com
     ```
   - Or use free Piston API (no setup required)

## 🎯 Running the Application

### Development Mode
```bash
npm start
```
Runs the app at [http://localhost:3000](http://localhost:3000)

⚠️ **Note**: Use `npm start` (not `npm run dev`)

### Build for Production
```bash
npm run build
```

### Run Tests
```bash
npm test
```

## 📚 Documentation

- **[Complete Feature List](FEATURES.md)** - All implemented features and capabilities
- **[Screen Sharing Guide](SCREEN_SHARING_GUIDE.md)** - Screen sharing implementation details
- **[DSA Coding Round Setup](DSA_ROUND_GUIDE.md)** - Add coding questions and configure compiler
- **[Deployment & Scalability Guide](DEPLOYMENT_GUIDE.md)** - Production deployment for 500+ users
- **[Implementation Summary](IMPLEMENTATION_SUMMARY.md)** - Technical implementation details
- Exam instructions displayed in Student Dashboard
- Admin controls explained in Admin Dashboard UI

## 🔐 User Roles

### Student
- Route: `/student`
- Can take exams after entering valid exam code
- Must share screen to access exam
- Violations tracked and enforced

### Admin
- Route: `/admin`
- Manage exams and question bank
- View submissions and results
- Configure exam settings

## 🌐 Routes

- `/` - Login page
- `/register` - User registration
- `/student` - Student dashboard (protected)
- `/admin` - Admin dashboard (protected)
- `/exam/:examId` - Exam page (protected, requires screen sharing)

## 🔧 Tech Stack

- **Frontend**: React 19.2.5
- **Routing**: React Router DOM 7.14.0
- **Backend**: Firebase Authentication & Firestore
- **Styling**: Inline CSS (responsive design)
- **Screen Sharing**: MediaDevices API (`getDisplayMedia`)

## 📱 Browser Compatibility

| Browser | Authentication | Screen Sharing | Recommended |
|---------|---------------|----------------|-------------|
| Chrome 72+ | ✅ | ✅ | ⭐ Yes |
| Edge 79+ | ✅ | ✅ | ⭐ Yes |
| Firefox 66+ | ✅ | ✅ | ✅ |
| Safari 13+ | ✅ | ⚠️ Partial | ❌ |

## 🎓 Taking an Exam

1. Login with your credentials
2. Read exam instructions carefully
3. Check "I agree" checkbox
4. Enter exam code provided by admin
5. Wait for countdown timer
6. Click "Share Entire Screen & Start Exam"
7. **Select "Entire Screen" option** (not window/tab)
8. Exam opens in fullscreen
9. Complete all rounds:
   - **Round 1**: MCQ - Aptitude
   - **Round 2**: MCQ - Core Subjects
   - **Round 3**: Coding - DSA problems
10. Submit or auto-submit on timer

## 💻 DSA Coding Round

Students can:
- Write code in 5 languages (Python, C, C++, Java, JavaScript)
- Run code with custom input
- Test against sample test cases
- View execution results (output, time, memory)
- Submit solution for auto-grading

Admins need to:
1. Add coding questions to Firestore (see [DSA_ROUND_GUIDE.md](DSA_ROUND_GUIDE.md))
2. Configure Judge0 API key in `.env`
3. Set DSA round duration in exam creation

## 👨‍💼 Creating an Exam (Admin)

1. Go to Admin Dashboard
2. Navigate to "Exams" tab
3. Fill exam details:
   - Title and exam code
   - Start date/time
   - Round durations
   - Question counts per difficulty
4. Click "Create Exam & Auto-Select Questions"
5. Share exam code with students

## 🛡️ Security Features

- Screen sharing cannot be bypassed
- Only entire screen sharing accepted
- Auto-detection of sharing stop
- Fullscreen exit tracked as violation
- Tab switching tracked as violation
- Max 5 violations before auto-submission
- Firebase security rules (configure in Firebase Console)

## 📊 Database Collections

### Firestore Collections
- `users` - User profiles with roles
- `exams` - Exam configurations
- `questions` - Question bank
- `submissions` - Exam submissions and results

## 🐛 Troubleshooting

### "npm run dev" fails
**Solution**: Use `npm start` instead

### Screen sharing not working
**Solutions**:
- Use Chrome or Edge browser
- Ensure browser is up to date
- Check system screen recording permissions
- Use HTTPS in production (localhost works for dev)

### Exam code not working
- Codes are case-insensitive
- Maximum 3 attempts allowed
- Contact admin for correct code

## 📄 License

This project is created for educational purposes.

## 🤝 Contributing

Contributions, issues, and feature requests are welcome!

## 📞 Support

For technical issues, refer to:
- [Screen Sharing Guide](SCREEN_SHARING_GUIDE.md)
- Firebase Documentation
- React Documentation

---

**Built with ❤️ using React and Firebase**
