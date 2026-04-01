# CodeArena Database Schema

## Collections

### 1. **CodeArena_Challenges**
```
{
  id: string (auto-generated)
  title: string
  description: string
  difficulty: 'easy' | 'medium' | 'hard'
  category: string (e.g., 'Arrays', 'Strings', 'DP', 'Graph')
  points: number (easy: 10, medium: 25, hard: 50)
  coinReward: number (easy: 100, medium: 250, hard: 500)
  timeLimit: number (in minutes)
  memoryLimit: number (in MB)
  
  problemStatement: string
  inputFormat: string
  outputFormat: string
  constraints: string[]
  examples: [{
    input: string
    output: string
    explanation: string
  }]
  
  testCases: [{
    input: string
    expectedOutput: string
    isHidden: boolean
    points: number
  }]
  
  hints: [{
    text: string
    coinCost: number
  }]
  
  starterCode: {
    javascript: string
    python: string
    java: string
    cpp: string
  }
  
  solution: string
  solutionExplanation: string
  
  tags: string[]
  isPremium: boolean
  isDaily: boolean
  dailyDate?: Timestamp
  
  totalSubmissions: number
  successfulSubmissions: number
  acceptanceRate: number
  
  createdBy: string
  createdAt: Timestamp
  updatedAt: Timestamp
}
```

### 2. **CodeArena_Submissions**
```
{
  id: string
  challengeId: string
  userId: string
  userName: string
  
  code: string
  language: 'javascript' | 'python' | 'java' | 'cpp'
  
  status: 'pending' | 'accepted' | 'wrong_answer' | 'time_limit' | 'runtime_error' | 'compile_error'
  testsPassed: number
  totalTests: number
  
  executionTime: number (in ms)
  memoryUsed: number (in MB)
  
  pointsEarned: number
  coinsEarned: number
  
  error?: string
  output?: string
  
  submittedAt: Timestamp
}
```

### 3. **CodeArena_Battles**
```
{
  id: string
  battleType: '1v1' | 'team'
  
  challengeId: string
  difficulty: 'easy' | 'medium' | 'hard'
  
  entryFee: number (in coins)
  prizePool: number (in coins)
  
  participants: [{
    userId: string
    userName: string
    userAvatar?: string
    submissionId?: string
    score: number
    timeTaken: number
    status: 'waiting' | 'submitted' | 'forfeit'
  }]
  
  maxParticipants: number
  currentParticipants: number
  
  status: 'waiting' | 'in_progress' | 'completed' | 'cancelled'
  
  startTime: Timestamp
  endTime: Timestamp
  duration: number (in minutes)
  
  winnerId?: string
  winnerName?: string
  
  createdBy: string
  createdAt: Timestamp
}
```

### 4. **CodeArena_Tournaments**
```
{
  id: string
  title: string
  description: string
  
  type: 'weekly' | 'monthly' | 'sponsored'
  difficulty: 'mixed' | 'easy' | 'medium' | 'hard'
  
  challenges: string[] (array of challengeIds)
  
  entryFee: number (in coins or real money)
  prizePool: {
    first: number
    second: number
    third: number
    participation: number
  }
  isCashPrize: boolean
  
  maxParticipants: number
  currentParticipants: number
  
  participants: [{
    userId: string
    userName: string
    totalScore: number
    solvedChallenges: number
    rank?: number
    prizeWon?: number
  }]
  
  status: 'upcoming' | 'registration' | 'in_progress' | 'completed'
  
  registrationStart: Timestamp
  registrationEnd: Timestamp
  startTime: Timestamp
  endTime: Timestamp
  
  sponsoredBy?: string
  sponsorLogo?: string
  
  createdBy: string
  createdAt: Timestamp
}
```

### 5. **CodeArena_Wallets**
```
{
  userId: string (document ID)
  userName: string
  
  coins: number
  totalEarned: number
  totalSpent: number
  
  cashBalance: number (in real currency)
  totalWithdrawn: number
  
  level: number
  experience: number
  
  badges: [{
    id: string
    name: string
    description: string
    icon: string
    earnedAt: Timestamp
  }]
  
  streak: {
    current: number
    longest: number
    lastActiveDate: Timestamp
  }
  
  achievements: {
    problemsSolved: number
    battlesWon: number
    tournamentsWon: number
    perfectSubmissions: number
  }
  
  premiumUntil?: Timestamp
  isPremium: boolean
  
  createdAt: Timestamp
  updatedAt: Timestamp
}
```

### 6. **CodeArena_Transactions**
```
{
  id: string
  userId: string
  userName: string
  
  type: 'earn' | 'spend' | 'deposit' | 'withdraw' | 'prize'
  category: 'challenge' | 'battle' | 'tournament' | 'hint' | 'premium' | 'withdrawal' | 'entry_fee'
  
  amount: number
  currency: 'coins' | 'cash'
  
  balanceBefore: number
  balanceAfter: number
  
  description: string
  referenceId?: string (challengeId, battleId, tournamentId, etc.)
  
  status: 'completed' | 'pending' | 'failed'
  
  createdAt: Timestamp
}
```

### 7. **CodeArena_Leaderboards**
```
{
  id: string
  type: 'global' | 'weekly' | 'monthly' | 'tournament'
  
  period?: string (e.g., '2025-W47', '2025-11')
  tournamentId?: string
  
  rankings: [{
    rank: number
    userId: string
    userName: string
    userAvatar?: string
    
    totalScore: number
    problemsSolved: number
    battlesWon: number
    
    coins: number
    level: number
    
    lastActiveAt: Timestamp
  }]
  
  updatedAt: Timestamp
}
```

### 8. **CodeArena_UserProgress**
```
{
  userId: string (document ID)
  
  solvedChallenges: [{
    challengeId: string
    solvedAt: Timestamp
    attempts: number
    bestSubmissionId: string
  }]
  
  categoryProgress: {
    [category: string]: {
      solved: number
      total: number
      easy: number
      medium: number
      hard: number
    }
  }
  
  hintsUsed: [{
    challengeId: string
    hintIndex: number
    usedAt: Timestamp
  }]
  
  favoriteProblems: string[]
  
  stats: {
    totalAttempts: number
    successfulAttempts: number
    averageTime: number
    fastestSolve: number
    languagesUsed: string[]
    mostSolvedCategory: string
  }
  
  updatedAt: Timestamp
}
```

## Indexes Required

- CodeArena_Challenges: difficulty, category, isDaily, isPremium
- CodeArena_Submissions: userId, challengeId, status, submittedAt
- CodeArena_Battles: status, startTime, participants.userId
- CodeArena_Tournaments: status, type, startTime
- CodeArena_Transactions: userId, type, createdAt
- CodeArena_Leaderboards: type, period

## Security Rules

All collections should have proper Firestore security rules to:
- Allow users to read their own data
- Allow users to submit solutions
- Restrict admin operations (creating challenges, managing tournaments)
- Prevent tampering with wallet balances
- Validate transaction amounts
