# 🚀 Deployment & Scalability Guide

## Complete Production Deployment Strategy

---

## 📋 Table of Contents
1. [Firebase Hosting Deployment](#firebase-hosting)
2. [Vercel Deployment](#vercel-deployment)
3. [Scalability for 500+ Users](#scalability)
4. [Compiler Integration Setup](#compiler-integration)
5. [Performance Optimization](#performance)
6. [Monitoring & Analytics](#monitoring)
7. [Cost Estimation](#cost)

---

## 🔥 Firebase Hosting Deployment

### Step 1: Install Firebase CLI
```bash
npm install -g firebase-tools
firebase login
```

### Step 2: Initialize Firebase
```bash
firebase init
```

Select:
- ✅ Hosting
- ✅ Firestore
- Build directory: `build`
- Single-page app: `Yes`
- GitHub auto-deploy: `Optional`

### Step 3: Build & Deploy
```bash
npm run build
firebase deploy
```

### Step 4: Configure Firebase (firebase.json)
```json
{
  "hosting": {
    "public": "build",
    "ignore": ["firebase.json", "**/.*", "**/node_modules/**"],
    "rewrites": [{
      "source": "**",
      "destination": "/index.html"
    }],
    "headers": [{
      "source": "**/*.@(jpg|jpeg|gif|png|svg|webp)",
      "headers": [{
        "key": "Cache-Control",
        "value": "max-age=31536000"
      }]
    }]
  },
  "firestore": {
    "rules": "firestore.rules",
    "indexes": "firestore.indexes.json"
  }
}
```

### Custom Domain (Optional)
```bash
firebase hosting:channel:deploy production
```

Add custom domain in Firebase Console → Hosting → Add custom domain

---

## ▲ Vercel Deployment

### Option 1: GitHub Integration

1. Push code to GitHub
2. Go to [vercel.com](https://vercel.com)
3. Import GitHub repository
4. Framework Preset: **Create React App**
5. Environment Variables:
   ```
   REACT_APP_FIREBASE_API_KEY=your_key
   REACT_APP_FIREBASE_AUTH_DOMAIN=your_domain
   REACT_APP_FIREBASE_PROJECT_ID=your_project_id
   ```
6. Deploy

### Option 2: Vercel CLI
```bash
npm install -g vercel
vercel login
vercel --prod
```

### vercel.json Configuration
```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "build",
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ],
  "headers": [
    {
      "source": "/static/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=31536000, immutable"
        }
      ]
    }
  ]
}
```

---

## 📊 Scalability for 500+ Concurrent Users

### 1. **Firestore Optimization**

#### Composite Indexes (firestore.indexes.json)
```json
{
  "indexes": [
    {
      "collectionGroup": "exams",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "examCode", "order": "ASCENDING" },
        { "fieldPath": "startTime", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "submissions",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "examId", "order": "ASCENDING" },
        { "fieldPath": "submittedAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "questions",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "category", "order": "ASCENDING" },
        { "fieldPath": "difficulty", "order": "ASCENDING" }
      ]
    }
  ],
  "fieldOverrides": []
}
```

Deploy indexes:
```bash
firebase deploy --only firestore:indexes
```

#### Security Rules (firestore.rules)
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Users can read their own data
    match /users/{userId} {
      allow read: if request.auth != null && request.auth.uid == userId;
      allow write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Only authenticated users can read exams
    match /exams/{examId} {
      allow read: if request.auth != null;
      allow write: if get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }
    
    // Questions - admin only write
    match /questions/{questionId} {
      allow read: if request.auth != null;
      allow write: if get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }
    
    // Submissions - users can only write their own
    match /submissions/{subId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null && request.resource.data.userId == request.auth.uid;
    }
    
    // DSA submissions
    match /dsaSubmissions/{subId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null && request.resource.data.userId == request.auth.uid;
    }
  }
}
```

### 2. **Connection Pooling**

Update `src/firebase/config.js`:
```javascript
import { initializeApp } from "firebase/app";
import { getAuth, connectAuthEmulator } from "firebase/auth";
import { getFirestore, enableMultiTabIndexedDbPersistence } from "firebase/firestore";

const firebaseConfig = {
  // Your config
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// Enable offline persistence for better performance
enableMultiTabIndexedDbPersistence(db).catch((err) => {
  if (err.code === 'failed-precondition') {
    console.warn('Multiple tabs open, persistence only enabled in one tab');
  } else if (err.code === 'unimplemented') {
    console.warn('Browser does not support persistence');
  }
});

export default app;
```

### 3. **Load Balancing & CDN**

Firebase Hosting automatically provides:
- ✅ Global CDN (150+ edge locations)
- ✅ Automatic SSL certificates
- ✅ DDoS protection
- ✅ Automatic compression

### 4. **Database Sharding Strategy**

For 500+ concurrent users, partition data:

```javascript
// Partition submissions by date
const submissionRef = collection(db, `submissions_${year}_${month}`);

// Partition exams by institution
const examRef = collection(db, `exams_${institutionId}`);
```

### 5. **Caching Strategy**

Implement React Query or SWR:
```bash
npm install @tanstack/react-query
```

```javascript
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
    },
  },
});
```

---

## 🔧 Compiler Integration Setup

### Option 1: Judge0 CE (Recommended)

#### Sign up for RapidAPI
1. Go to [RapidAPI Judge0](https://rapidapi.com/judge0-official/api/judge0-ce)
2. Subscribe to free tier (50 requests/day) or paid plan
3. Get API key

#### Update CodeEditor.js
```javascript
const JUDGE0_API_KEY = process.env.REACT_APP_JUDGE0_API_KEY;
const JUDGE0_HOST = 'judge0-ce.p.rapidapi.com';

const response = await fetch(`https://${JUDGE0_HOST}/submissions?base64_encoded=false&wait=true`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-RapidAPI-Key': JUDGE0_API_KEY,
    'X-RapidAPI-Host': JUDGE0_HOST
  },
  body: JSON.stringify({
    source_code: code,
    language_id: languageId,
    stdin: input,
    expected_output: expectedOutput
  })
});
```

#### Environment Variables (.env)
```
REACT_APP_JUDGE0_API_KEY=your_rapidapi_key_here
```

### Option 2: Piston API (Free Alternative)

```javascript
const response = await fetch('https://emkc.org/api/v2/piston/execute', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    language: language, // 'python', 'javascript', 'java', etc.
    version: '*',
    files: [{
      name: 'main.' + getExtension(language),
      content: code
    }],
    stdin: input
  })
});
```

### Option 3: Self-Hosted Judge0

```bash
# Docker Compose
git clone https://github.com/judge0/judge0.git
cd judge0
docker-compose up -d
```

Access at `http://localhost:2358`

---

## ⚡ Performance Optimization

### 1. **Code Splitting**
```javascript
// App.js
import { lazy, Suspense } from 'react';

const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const ExamPage = lazy(() => import('./pages/ExamPage'));
const DSARound = lazy(() => import('./components/DSARound'));

<Suspense fallback={<div>Loading...</div>}>
  <Route path="/admin" element={<AdminDashboard />} />
</Suspense>
```

### 2. **Image Optimization**
```bash
npm install next-optimized-images
```

### 3. **Bundle Analysis**
```bash
npm install --save-dev webpack-bundle-analyzer
npm run build
npx webpack-bundle-analyzer build/static/js/*.js
```

### 4. **Minification & Compression**

Already handled by `react-scripts`, but ensure in package.json:
```json
{
  "scripts": {
    "build": "GENERATE_SOURCEMAP=false react-scripts build"
  }
}
```

### 5. **Lazy Loading Firestore**
```javascript
// Only fetch questions when needed
useEffect(() => {
  if (activeRound === 'DSA') {
    fetchDSAQuestions();
  }
}, [activeRound]);
```

---

## 📈 Monitoring & Analytics

### 1. **Firebase Performance Monitoring**
```bash
npm install firebase
```

```javascript
import { getPerformance } from 'firebase/performance';
const perf = getPerformance(app);
```

### 2. **Google Analytics**
```bash
npm install react-ga4
```

```javascript
import ReactGA from 'react-ga4';
ReactGA.initialize('G-XXXXXXXXXX');
ReactGA.send('pageview');
```

### 3. **Error Tracking (Sentry)**
```bash
npm install @sentry/react
```

```javascript
import * as Sentry from "@sentry/react";

Sentry.init({
  dsn: "YOUR_SENTRY_DSN",
  environment: process.env.NODE_ENV,
});
```

### 4. **Custom Monitoring Dashboard**

Create admin page to monitor:
- Active exam sessions
- Concurrent users
- Violation statistics
- Submit completion rates

---

## 💰 Cost Estimation (500 Users)

### Firebase (Blaze Plan)
- **Firestore**: 
  - 500 users × 50 reads/exam = 25,000 reads
  - Free tier: 50,000 reads/day
  - Cost: **$0 - $5/month**

- **Hosting**:
  - Free tier: 10GB storage, 360MB/day transfer
  - With CDN: **$0 - $10/month**

- **Authentication**:
  - Free tier: Unlimited
  - Cost: **$0**

**Total Firebase: $0 - $15/month**

### Judge0 API (RapidAPI)
- Free tier: 50 requests/day
- Basic plan: $10/month (500 requests/day)
- Pro plan: $50/month (Unlimited)

**For 500 users with DSA:**
- Estimated: **$50/month**

### Total Infrastructure Cost
**$50 - $65/month** for 500 concurrent users

---

## 🚀 Deployment Checklist

- [ ] Build production bundle (`npm run build`)
- [ ] Set environment variables
- [ ] Configure Firebase security rules
- [ ] Deploy Firestore indexes
- [ ] Setup custom domain (if applicable)
- [ ] Enable Firebase Performance Monitoring
- [ ] Setup Sentry error tracking
- [ ] Configure Google Analytics
- [ ] Test with 10-20 concurrent users
- [ ] Load test with Apache JMeter
- [ ] Setup backup strategy
- [ ] Create admin monitoring dashboard
- [ ] Document API keys and credentials
- [ ] Setup CI/CD pipeline (GitHub Actions)

---

## 🔄 CI/CD Pipeline (GitHub Actions)

`.github/workflows/deploy.yml`:
```yaml
name: Deploy to Firebase
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run build
        env:
          REACT_APP_JUDGE0_API_KEY: ${{ secrets.JUDGE0_API_KEY }}
      - uses: FirebaseExtended/action-hosting-deploy@v0
        with:
          repoToken: ${{ secrets.GITHUB_TOKEN }}
          firebaseServiceAccount: ${{ secrets.FIREBASE_SERVICE_ACCOUNT }}
          channelId: live
          projectId: your-project-id
```

---

## 📞 Support & Maintenance

- Monitor Firebase Console daily
- Check error logs in Sentry
- Review performance metrics weekly
- Update dependencies monthly
- Backup Firestore data weekly

---

**Your system is now production-ready for 500+ users!** 🎉
