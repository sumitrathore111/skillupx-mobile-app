# CodeArena Setup Guide

## 🚀 New Features Implemented

### 1. ✅ Real Code Execution with Piston API
- Integrated free Piston API for executing JavaScript, Python, Java, and C++
- No signup required, works out of the box
- Supports test case validation

### 2. ✅ Monaco Editor Integration
- VS Code editor experience in the browser
- Syntax highlighting for all supported languages
- Auto-completion and code formatting
- Dark theme optimized for coding

### 3. ✅ Real-time Wallet Updates
- Live coin balance updates using Firestore listeners
- Instant feedback when earning or spending coins
- No page refresh needed

### 4. ✅ Toast Notifications
- Success/error feedback for all actions
- Loading states for code execution
- User-friendly error messages

### 5. ✅ Challenge Seed Script
- 10 real coding challenges included
- Covers: Arrays, Strings, Stack, Binary Search, Math, Dynamic Programming
- Each with test cases and starter code

---

## 📋 Setup Instructions

### Step 1: Install Dependencies (If Not Already Done)
```bash
npm install @monaco-editor/react react-hot-toast
```

### Step 2: Add Firebase Security Rules

Go to Firebase Console → Firestore Database → Rules tab and paste:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function isSignedIn() {
      return request.auth != null;
    }
    
    function isOwner(userId) {
      return request.auth.uid == userId;
    }
    
    // Challenges - Public read, admin write
    match /codearena_challenges/{challengeId} {
      allow read: if isSignedIn();
      allow write: if isSignedIn() && get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }
    
    // Submissions - Users can only access their own
    match /codearena_submissions/{submissionId} {
      allow read: if isSignedIn() && resource.data.userId == request.auth.uid;
      allow create: if isSignedIn() && request.resource.data.userId == request.auth.uid;
    }
    
    // Wallets - Users can only read their own
    match /codearena_wallets/{walletId} {
      allow read: if isSignedIn() && walletId == request.auth.uid;
      allow write: if false;
    }
    
    // Transactions
    match /codearena_transactions/{transactionId} {
      allow read: if isSignedIn() && resource.data.userId == request.auth.uid;
      allow create: if false;
    }
    
    // Battles - Public read, participants can join
    match /codearena_battles/{battleId} {
      allow read: if isSignedIn();
      allow create: if isSignedIn();
      allow update: if isSignedIn() && request.auth.uid in resource.data.participants;
    }
    
    // Tournaments
    match /codearena_tournaments/{tournamentId} {
      allow read: if isSignedIn();
      allow write: if isSignedIn() && get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }
    
    // Leaderboards - Public read only
    match /codearena_leaderboards/{leaderboardId} {
      allow read: if isSignedIn();
      allow write: if false;
    }
    
    // User Progress
    match /codearena_user_progress/{userId} {
      allow read, write: if isSignedIn() && userId == request.auth.uid;
    }
  }
}
```

### Step 3: Seed Challenges

In Firebase Console, open Firestore and ensure the collection name is exactly `codearena_challenges` (lowercase).

Then run the seed script:

```bash
# Option 1: From browser console (after logging in)
import { seedChallenges } from './scripts/seedChallenges';
seedChallenges();

# Option 2: Add a button in admin panel to trigger seeding
# Option 3: Use Firebase Functions to seed (recommended for production)
```

Alternatively, manually create a few challenges in Firestore using this structure:
- Collection: `codearena_challenges`
- Fields: title, description, difficulty, category, points, coinReward, timeLimit, testCases, sampleTestCases, starterCode, etc.

### Step 4: Fix Collection Name Case (IMPORTANT!)

Check your Firestore collections. The code uses:
- `CodeArena_Wallets` (PascalCase)
- `CodeArena_Transactions` (PascalCase)
- `codearena_challenges` (lowercase)

Make sure they match exactly! Update either the code or collection names to be consistent.

### Step 5: Test Code Execution

1. Navigate to CodeArena
2. Click on any challenge
3. Write a simple solution (e.g., for Two Sum)
4. Click "Run" to test against sample cases
5. Click "Submit" to run against all test cases

If you see "Failed to execute code", check:
- Internet connection (Piston API requires internet)
- Browser console for errors
- Try a different challenge

---

## 🧪 Testing Checklist

- [ ] Can see challenge list
- [ ] Can open challenge solver
- [ ] Monaco Editor loads properly
- [ ] Can run code and see results
- [ ] Can submit solution
- [ ] Wallet balance updates after solving
- [ ] Toast notifications appear
- [ ] Real-time wallet updates work

---

## 🔧 Troubleshooting

### "No challenges found"
- Run the seed script
- Check Firestore collection name is `codearena_challenges`
- Verify Firebase security rules allow read access

### "Failed to execute code"
- Check internet connection (Piston API is external)
- Verify the code is valid syntax
- Check browser console for detailed errors

### "Wallet not updating"
- Check Firebase security rules for wallets collection
- Verify wallet was initialized on first login
- Check browser console for subscription errors

### Monaco Editor not loading
- Clear browser cache
- Check if @monaco-editor/react is installed
- Verify internet connection (CDN loads Monaco)

---

## 🎯 Next Steps (Optional)

1. **Admin Panel**: Create UI to add challenges without manual Firestore edits
2. **Better Code Editor**: Add themes, font size controls, keyboard shortcuts
3. **Submission History**: Show past submissions for each challenge
4. **Editorial**: Add solution explanations after solving
5. **Discussion Forum**: Let users discuss challenges
6. **Battle System**: Implement real-time 1v1 battles with WebSockets
7. **Tournament System**: Build bracket system with prizes
8. **Mobile Optimization**: Improve editor for mobile devices

---

## 📊 Production Checklist

Before launching to real users:

- [ ] Firebase security rules configured
- [ ] 50+ challenges seeded
- [ ] All test cases validated
- [ ] Error handling tested
- [ ] Performance optimized
- [ ] Mobile responsive
- [ ] Analytics added
- [ ] Backup strategy in place
- [ ] Rate limiting implemented
- [ ] Monitoring/alerts configured

---

## 🆘 Support

If you encounter any issues:
1. Check browser console for errors
2. Verify Firebase configuration
3. Test with sample challenges first
4. Review this README carefully

Good luck with your CodeArena launch! 🚀
