# Firebase Database Schema Documentation

## Collections Structure

### 1. **Student_Detail** (User Profiles)
Main collection for storing student/user information.

```typescript
{
  uid: string,                    // Firebase Auth UID (Document ID)
  email: string,
  name: string,
  phone: string,
  location: string,
  institute: string,
  bio: string,
  portfolio: string,
  resume_objective: string,
  
  // Arrays
  skills: string[],
  languages: string[],
  achievements: string[],
  target_compnay: string[],       // Company IDs
  
  // Nested Objects
  education: [{
    degree: string,
    school: string,
    year: string
  }],
  
  experience: [{
    title: string,
    company: string,
    year: string,
    desc: string
  }],
  
  links: [{
    platform: string,
    url: string
  }],
  
  projects: [{
    name: string,
    description: string,
    tech: string[]
  }],
  
  internship_tasks: [{
    id: number,
    text: string,
    done: boolean
  }],
  
  // Metadata
  yearOfStudy: number,
  profileCompletion: number,
  isprofileComplete: boolean,
  role: "student" | "admin",
  createdAt: Timestamp,
  
  // Marathon specific
  marathon_score: number,
  marathon_rank: number,
  streakCount: number,
  challenges_solved: number,
  last_active_date: Timestamp
}
```

---

### 2. **Companies**
Collection for company job postings and requirements.

```typescript
{
  id: string,                     // Auto-generated
  company_name: string,
  industry: string,
  location: string,
  job_role: string,
  required_skills: string[],
  experience_required: string,    // e.g., "0-2 years"
  package_lpa: number,
  job_type: string,               // "Full-time", "Internship", etc.
  education: string,
  hiring_for: string              // e.g., "2025 Batch"
}
```

**Usage:**
- Populated from `data.ts` on first load
- Users can add companies to their `target_compnay` array

---

### 3. **Marathon_Challenges**
Daily coding challenges for students.

```typescript
{
  id: string,                     // Auto-generated
  title: string,
  type: "MCQ" | "Code",
  difficulty: "Easy" | "Medium" | "Hard",
  points: number,
  timeLimit: number,              // in minutes
  topic: string,
  description: string,
  date: Timestamp,                // Challenge date
  
  // For MCQ type
  question: string,
  options: [{
    id: string,
    text: string
  }],
  correctAnswer: string,          // option id
  
  // For Code type
  problem: string,
  starterCode: string,
  testCases: any[]
}
```

---

### 4. **Marathon_Submissions**
User submissions for marathon challenges.

```typescript
{
  id: string,                     // Auto-generated
  userId: string,                 // Reference to Student_Detail
  challengeId: string,            // Reference to Marathon_Challenges
  answer: string,
  isCorrect: boolean,
  points: number,
  submittedAt: Timestamp
}
```

---

### 5. **Courses**
Available courses for students.

```typescript
{
  id: string,                     // Auto-generated or custom
  title: string,
  instructor: string,
  duration: string,               // e.g., "6 weeks"
  lessons: number,
  level: "Beginner" | "Intermediate" | "Advanced",
  rating: number,                 // 0-5
  price: number,                  // 0 for free
  tags: string[],
  thumbnail: string               // Image URL
}
```

---

### 6. **Enrollments**
Student course enrollments and progress.

```typescript
{
  id: string,                     // Auto-generated
  userId: string,                 // Reference to Student_Detail
  courseId: string,               // Reference to Courses
  progress: number,               // 0-100
  lessonsCompleted: number,
  enrolledAt: Timestamp,
  lastAccessed: Timestamp
}
```

---

### 7. **Open_Projects**
Open-source projects students can contribute to.

```typescript
{
  id: string,                     // Auto-generated
  name: string,
  techStack: string,
  idea: string,
  shortDescription: string,
  createdAt: Timestamp,
  
  // Sub-collections
  issues: [{
    id: string,
    title: string,
    description: string,
    status: "open" | "in-progress" | "closed",
    createdBy: string,
    createdAt: Timestamp
  }],
  
  messages: [{
    id: string,
    text: string,
    userId: string,
    userName: string,
    createdAt: Timestamp
  }]
}
```

---

### 8. **query**
Student questions and community answers.

```typescript
{
  id: string,                     // Auto-generated
  question: string,
  answer: string,
  ans_user: string,               // Name of answerer
  userId: string,                 // Question asker
  createdAt: Timestamp
}
```

---

### 9. **Contributers**
Platform contributors/team members.

```typescript
{
  id: string,                     // Auto-generated
  name: string,
  avatar: string,                 // Image URL
  contributions: number,
  role: string,
  joinDate: string,
  specialties: string[],
  isTopContributor: boolean,
  from: string                    // University/Institution
}
```

---

## Firestore Security Rules (Recommended)

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Student profiles - users can only read/write their own
    match /Student_Detail/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Companies - read-only for all authenticated users
    match /Companies/{companyId} {
      allow read: if request.auth != null;
      allow write: if false; // Admin only (set via console)
    }
    
    // Marathon challenges - read-only
    match /Marathon_Challenges/{challengeId} {
      allow read: if request.auth != null;
      allow write: if false; // Admin only
    }
    
    // Marathon submissions - users can create their own
    match /Marathon_Submissions/{submissionId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null && request.resource.data.userId == request.auth.uid;
    }
    
    // Courses - read-only
    match /Courses/{courseId} {
      allow read: if request.auth != null;
      allow write: if false; // Admin only
    }
    
    // Enrollments - users can manage their own
    match /Enrollments/{enrollmentId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null && request.resource.data.userId == request.auth.uid;
      allow update: if request.auth != null && resource.data.userId == request.auth.uid;
    }
    
    // Open Projects - authenticated users can read, create
    match /Open_Projects/{projectId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null;
      allow update: if request.auth != null;
    }
    
    // Queries - authenticated users can read and create
    match /query/{queryId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null;
    }
    
    // Contributors - read-only
    match /Contributers/{contributorId} {
      allow read: if true;
      allow write: if false; // Admin only
    }
  }
}
```

---

## Indexes Required

For optimal performance, create these composite indexes in Firestore:

1. **Marathon_Challenges**
   - Fields: `date` (Ascending), `__name__` (Ascending)
   - Query scope: Collection

2. **Student_Detail**
   - Fields: `marathon_score` (Descending), `__name__` (Ascending)
   - Query scope: Collection

3. **query**
   - Fields: `createdAt` (Ascending), `__name__` (Ascending)
   - Query scope: Collection

4. **Enrollments**
   - Fields: `userId` (Ascending), `courseId` (Ascending)
   - Query scope: Collection

---

## Initial Setup Steps

1. **Enable Firestore** in Firebase Console
2. **Set up Authentication** (Email/Password + Google)
3. **Create collections** using the initialization script
4. **Apply security rules** from above
5. **Create indexes** as listed
6. **Populate sample data** using `src/utils/initializeFirebase.ts`

---

## API Functions Available

All functions are available through `useDataContext()`:

### User Profile
- `pushDataWithId(data)` - Create/update user profile
- `calculateResumeCompletion(userProfile)` - Calculate completion %
- `calculateCategoryCompletion(userProfile)` - Category-wise completion

### Marathon
- `fetchTodayChallenge()` - Get today's challenge
- `submitMarathonAnswer(challengeId, answer, isCorrect, points)` - Submit answer
- `fetchLeaderboard()` - Get top 10 users
- `updateUserStreak()` - Update daily streak

### Companies
- `fetchCompanies()` - Get all companies
- `addCompanyToTarget(companyId)` - Add to user's targets

### Courses
- `fetchCourses()` - Get all courses
- `fetchEnrolledCourses()` - Get user's enrolled courses
- `enrollInCourse(courseId)` - Enroll in a course
- `updateCourseProgress(courseId, progress, lessonsCompleted)` - Update progress

### Internship
- `fetchInternshipTasks()` - Get user's tasks
- `updateTaskStatus(taskId, done)` - Update task completion

### Queries
- `writeQueryOnDate(questionData)` - Post a question
- `fetchTodayQueries()` - Get today's questions

### General
- `addObjectToUserArray(uid, arrayField, objectToAdd)` - Add to any array field
- `pushDataToFirestore(collectionName, dataList)` - Bulk insert data
