# 🖥️ Screen Sharing Feature Guide

## Overview

The Placement Exam System now includes **mandatory screen sharing** to ensure exam integrity. Students must share their entire screen before accessing the exam.

---

## 🚀 How It Works

### For Students:

1. **Login & Enter Exam Code**
   - Log in to your account
   - Read and agree to exam instructions
   - Enter the exam code provided by your admin

2. **Wait for Exam Start Time**
   - Countdown timer shows time until exam begins
   - Do not close the browser window

3. **Share Your Screen**
   - When exam is ready, click **"Share Entire Screen & Start Exam"**
   - Browser will prompt for screen sharing permission
   - **MUST select "Entire Screen"** option (not "Window" or "Chrome Tab")
   - Select your primary monitor/screen

4. **Take the Exam**
   - Screen sharing indicator (🔴 Screen Sharing Active) appears in header
   - Exam opens in fullscreen mode
   - Both screen sharing and fullscreen are monitored

### What Happens If:

| Action | Result |
|--------|--------|
| Student shares a window/tab instead of screen | ❌ Blocked - Error message shown |
| Student denies screen sharing | ❌ Blocked - Cannot access exam |
| Student stops screen sharing during exam | ⚠️ Exam auto-submitted immediately |
| Student exits fullscreen | ⚠️ Violation counted (5 max) |
| Student switches tabs | ⚠️ Violation counted (5 max) |

---

## 🔧 Technical Implementation

### Browser API Used
- **`navigator.mediaDevices.getDisplayMedia()`**
- Requires HTTPS in production (works on localhost for development)

### Validation
```javascript
// Ensures entire screen is shared
video: {
  displaySurface: 'monitor' // Rejects 'window' or 'browser'
}
```

### Monitoring
- Video track `onended` event detects when sharing stops
- Auto-submits exam and logs out student

---

## 🌐 Browser Compatibility

| Browser | Support | Notes |
|---------|---------|-------|
| Chrome 72+ | ✅ Full | Recommended |
| Edge 79+ | ✅ Full | Chromium-based |
| Firefox 66+ | ✅ Full | Works well |
| Safari 13+ | ⚠️ Partial | Limited displaySurface detection |
| Opera 60+ | ✅ Full | Chromium-based |

**Recommended:** Chrome or Edge for best experience

---

## 🛡️ Security Features

1. **Mandatory Sharing**
   - Cannot bypass screen sharing requirement
   - Exam access blocked without active sharing

2. **Surface Validation**
   - Only accepts entire screen (monitor)
   - Rejects window or tab sharing

3. **Continuous Monitoring**
   - Detects if student stops sharing
   - Auto-submits exam on violation

4. **Combined Proctoring**
   - Screen sharing + Fullscreen enforcement
   - Tab switching detection
   - Window blur detection
   - Violation counting (max 5)

---

## 📱 For Mobile/Tablet Users

⚠️ **Screen sharing is not well-supported on mobile browsers**

- iOS Safari: Limited support
- Android Chrome: Partial support
- **Recommendation:** Use desktop/laptop for exams

---

## 🔍 Troubleshooting

### "Screen sharing is not supported"
- **Solution:** Use Chrome, Edge, or Firefox browser
- Update browser to latest version

### "You must share ENTIRE SCREEN"
- **Cause:** Student selected window or tab instead of screen
- **Solution:** Click share again and select "Entire Screen" option

### "Screen sharing permission denied"
- **Solution:** 
  1. Refresh page
  2. Click share button again
  3. Choose "Allow" when browser prompts

### Screen sharing stops unexpectedly
- **Cause:** System screen saver, lock screen, or user stopped sharing
- **Result:** Exam auto-submits (by design for security)

---

## 👨‍💼 For Administrators

### Setup Requirements
- No additional setup needed
- Feature works automatically with existing Firebase setup

### Viewing Results
- Submissions include violation counts
- Screen sharing violations trigger auto-submission
- Check `reason` field in submissions (shows if auto-submitted)

### Testing
1. Create a test exam
2. Generate exam code
3. Login as student
4. Test screen sharing flow
5. Verify access blocked if wrong surface selected

---

## 🔐 Privacy & Data

- **No recording:** Stream is NOT recorded or transmitted to server
- **Local only:** Stream exists only in student's browser
- **Purpose:** Proctoring enforcement only
- **Cleanup:** Stream stops when exam ends

---

## 📊 System Flow Diagram

```
Student Login
    ↓
Enter Exam Code → Validate Code
    ↓
Wait for Start Time (Countdown)
    ↓
Click "Share Entire Screen & Start Exam"
    ↓
Browser Prompts for Permission
    ↓
Student Selects "Entire Screen"
    ↓
Validate Surface Type (monitor)
    ↓
✅ Access Granted → Enter Fullscreen → Start Exam
    ↓
Monitor Sharing Status (continuous)
    ↓
If Stopped → Auto-Submit & Logout
    ↓
If Completed Normally → Submit & Show Results
```

---

## 🎯 Best Practices for Students

1. ✅ Use a desktop or laptop computer
2. ✅ Use Chrome or Edge browser
3. ✅ Close unnecessary applications before exam
4. ✅ Ensure stable internet connection
5. ✅ Test screen sharing before actual exam
6. ✅ Keep browser in focus during exam
7. ❌ Don't use mobile devices
8. ❌ Don't minimize browser
9. ❌ Don't switch tabs
10. ❌ Don't stop screen sharing

---

## 📞 Support

If students experience technical issues:
1. Ensure browser is updated
2. Try different browser (Chrome recommended)
3. Check system permissions for screen recording
4. Contact institution's IT support

---

**Version:** 1.0  
**Last Updated:** April 2026  
**Feature Status:** ✅ Production Ready
