import axios from 'axios';
import { Response, Router } from 'express';
import { adminOnly, authenticate, AuthRequest } from '../middleware/auth';
import Challenge from '../models/Challenge';
import User from '../models/User';
import UserProgress from '../models/UserProgress';
import Wallet from '../models/Wallet';
import { wrapCode } from '../services/codeWrapper';
import emailNotifications from '../services/emailService';

const router = Router();

// Get all challenges (with filters)
router.get('/', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { difficulty, category, search, limit = 50, page = 1 } = req.query;

    let query: any = {};

    if (difficulty) query.difficulty = difficulty;
    if (category) query.category = category;
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { tags: { $in: [new RegExp(search as string, 'i')] } }
      ];
    }

    const challenges = await Challenge.find(query)
      .sort({ difficulty: 1, createdAt: -1 })
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit));

    const total = await Challenge.countDocuments(query);

    res.json({
      challenges,
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / Number(limit))
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ===== SPECIFIC ROUTES MUST BE BEFORE /:challengeId =====

// Get user submissions
router.get('/submissions/:userId', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;

    // Get user progress which contains solved challenges
    const progress = await UserProgress.findOne({ userId });

    if (!progress) {
      res.json({ submissions: [] });
      return;
    }

    // Transform solved challenges into submissions format
    const submissions = progress.solvedChallenges.map((solved: any) => ({
      challengeId: solved.challengeId,
      status: 'Accepted',
      submittedAt: solved.solvedAt,
      points: solved.points
    }));

    res.json({ submissions });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get user progress (solved challenges)
router.get('/progress/:userId', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;

    let progress = await UserProgress.findOne({ userId });

    // If no progress exists, create an empty one
    if (!progress) {
      progress = new UserProgress({
        userId,
        solvedChallenges: [],
        totalPoints: 0
      });
      await progress.save();
    }

    res.json({ progress });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get random challenge by difficulty
router.get('/random/:difficulty', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { difficulty } = req.params;

    const challenges = await Challenge.aggregate([
      { $match: { difficulty } },
      { $sample: { size: 1 } }
    ]);

    if (challenges.length === 0) {
      res.status(404).json({ error: 'No challenges found for this difficulty' });
      return;
    }

    res.json({ challenge: challenges[0] });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get challenge categories
router.get('/meta/categories', async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const categories = await Challenge.distinct('category');
    res.json({ categories });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Submit challenge solution - Execute code and award/deduct coins
router.post('/:challengeId/submit', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { challengeId } = req.params;
    const { code, language, source_code, language_id, testCases: requestTestCases, difficulty: requestDifficulty, title: requestTitle, coinReward: requestCoinReward } = req.body;
    const userId = req.user!.id;

    console.log('=== CHALLENGE SUBMIT ===');
    console.log('Challenge ID:', challengeId);
    console.log('Language:', language);
    console.log('Request test cases count:', requestTestCases?.length || 0);
    if (requestTestCases && requestTestCases.length > 0) {
      console.log('First test case:', JSON.stringify(requestTestCases[0]));
    }

    // Support both formats (direct or secureCodeExecution format)
    const actualCode = code || source_code;
    const actualLanguage = language || getLanguageFromId(language_id);

    if (!actualCode) {
      res.status(400).json({ error: 'Code is required', success: false });
      return;
    }

    // Try to find the challenge in database, but also support local challenges
    let challenge: any = null;
    let testCases: any[] = [];
    let challengeTitle = requestTitle || 'Practice Challenge';
    let coinReward = requestCoinReward || 10;
    let difficulty = requestDifficulty || 'Easy';

    // Try MongoDB first (if challengeId looks like an ObjectId)
    const mongoose = require('mongoose');
    if (mongoose.Types.ObjectId.isValid(challengeId)) {
      challenge = await Challenge.findById(challengeId);
    }

    if (challenge) {
      // Use challenge from database
      testCases = challenge.testCases || [];
      challengeTitle = challenge.title;
      coinReward = challenge.coinReward || (challenge.difficulty === 'Easy' ? 10 : challenge.difficulty === 'Medium' ? 20 : 30);
      difficulty = challenge.difficulty;
    } else if (requestTestCases && requestTestCases.length > 0) {
      // Use test cases from request (for local/questions.json challenges)
      testCases = requestTestCases.map((tc: any) => ({
        input: tc.input,
        expectedOutput: tc.expected_output || tc.expectedOutput || tc.output || ''
      }));

      // Calculate coin reward based on difficulty
      if (requestDifficulty) {
        coinReward = requestDifficulty.toLowerCase() === 'easy' ? 10 :
                     requestDifficulty.toLowerCase() === 'medium' ? 20 : 30;
      }
    } else {
      // Try to load from questions.json file
      try {
        const fs = await import('fs/promises');
        const path = await import('path');
       const questionsPath = path.join(__dirname, '../../../public/questions.json');;
        const questionsData = await fs.readFile(questionsPath, 'utf-8');
        const questionsJson = JSON.parse(questionsData);

        // Handle different formats
        let questions: any[] = [];
        if (Array.isArray(questionsJson)) {
          questions = questionsJson;
        } else if (questionsJson.problems) {
          questions = questionsJson.problems;
        } else if (questionsJson.questions) {
          questions = questionsJson.questions;
        }

        const found = questions.find((q: any) => q.id === challengeId);
        if (found) {
          testCases = (found.test_cases || found.testCases || []).map((tc: any) => ({
            input: tc.input,
            expectedOutput: tc.expected_output || tc.expectedOutput || tc.output || ''
          }));
          challengeTitle = found.title;
          coinReward = found.coins || found.coinReward || 10;
          difficulty = found.difficulty;
        }
      } catch (err) {
        console.error('Error loading questions.json:', err);
      }
    }

    if (testCases.length === 0) {
      res.status(400).json({ error: 'No test cases available for this challenge', success: false });
      return;
    }

    // Check if user has already solved this challenge
    const existingProgress = await UserProgress.findOne({ userId });
    const alreadySolved = existingProgress?.solvedChallenges.some(
      (sc: any) => sc.challengeId.toString() === challengeId
    );

    // Wrap user code with input parsing for DSA-style problems
    const { wrappedCode, language: wrappedLanguage } = wrapCode(actualCode, actualLanguage, challengeTitle);
    console.log('Wrapping code for:', challengeTitle);
    console.log('Wrapped code length:', wrappedCode.length);

    // Execute wrapped code against test cases
    const testResults = await executeCodeAgainstTests(wrappedCode, wrappedLanguage, testCases);
    const passedCount = testResults.filter(r => r.passed).length;
    const totalCount = testResults.length;
    const allPassed = passedCount === totalCount;

    let coinsChanged = 0;
    let message = '';

    if (allPassed) {
      if (!alreadySolved) {
        // Award coins for first-time solve
        coinsChanged = coinReward;
        message = `Congratulations! All test cases passed. You earned ${coinReward} coins!`;

        // Update wallet
        await Wallet.findOneAndUpdate(
          { userId },
          {
            $inc: { coins: coinReward, 'achievements.problemsSolved': 1 },
            $push: {
              transactions: {
                type: 'credit',
                amount: coinReward,
                reason: `Solved: ${challengeTitle}`,
                createdAt: new Date()
              }
            }
          },
          { upsert: true }
        );

        // Calculate total execution time properly (ensure it's a valid number)
        const totalExecutionTime = testResults.reduce((sum: number, r: any) => {
          const timeValue = typeof r.time === 'string' ? parseFloat(r.time) : (r.time || 0);
          return sum + (isNaN(timeValue) ? 0 : timeValue);
        }, 0);

        // Update progress
        await UserProgress.findOneAndUpdate(
          { userId },
          {
            $push: {
              solvedChallenges: {
                challengeId: challengeId,
                solvedAt: new Date(),
                language: actualLanguage,
                executionTime: Math.round(totalExecutionTime * 1000) / 1000 // Round to 3 decimal places
              }
            },
            $inc: { totalPoints: coinReward }
          },
          { upsert: true }
        );
      } else {
        message = 'All test cases passed! (Already solved - no additional coins)';
      }
    } else {
      // Wrong answer - no coin penalty for practice
      message = `Wrong answer. ${passedCount}/${totalCount} test cases passed.`;
    }

    res.json({
      success: allPassed,
      passed: passedCount,
      total: totalCount,
      passedCount,
      totalCount,
      message,
      coinsChanged,
      testResults: testResults.map(r => ({
        passed: r.passed,
        input: r.input,
        expected: r.expected,
        output: r.output,
        error: r.error
      }))
    });
  } catch (error: any) {
    console.error('Challenge submission error:', error);
    res.status(500).json({ error: error.message, success: false });
  }
});

// ===== CODE EXECUTION APIs =====
// Primary: Judge0 CE (free public, rate limited but reliable)
// For 1000+ users, consider self-hosting Piston or Judge0

const JUDGE0_URL = 'https://ce.judge0.com/submissions?base64_encoded=true&wait=true';

// Base64 helpers
function toBase64(str: string): string {
  return Buffer.from(str, 'utf-8').toString('base64');
}
function fromBase64(str: string): string {
  if (!str) return '';
  return Buffer.from(str, 'base64').toString('utf-8');
}

// Language ID mappings for Judge0 CE API
const LANG_ID_MAP: Record<string, number> = {
  'python': 71,     // Python 3.8.1
  'python3': 71,
  'javascript': 63, // JavaScript (Node.js 12.14.0)
  'java': 62,       // Java (OpenJDK 13.0.1)
  'cpp': 54,        // C++ (GCC 9.2.0)
  'c++': 54,
  'c': 50,          // C (GCC 9.2.0)
  'go': 60,         // Go (1.13.5)
  'rust': 73,       // Rust (1.40.0)
  'ruby': 72,       // Ruby (2.7.0)
  'typescript': 74, // TypeScript (3.7.4)
};

// Helper function to delay execution
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Execute with Judge0 CE API
async function executeWithJudge0(
  code: string,
  language: string,
  stdin: string,
  maxRetries: number = 3
): Promise<any> {
  const langId = LANG_ID_MAP[language.toLowerCase()] || 71;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await axios.post(
        JUDGE0_URL,
        {
          source_code: toBase64(code),
          language_id: langId,
          stdin: toBase64(stdin)
        },
        {
          headers: {
            'Content-Type': 'application/json'
          },
          timeout: 30000
        }
      );
      return response;
    } catch (error: any) {
      const status = error.response?.status;
      console.log(`[Judge0] Attempt ${attempt}/${maxRetries} failed. Status: ${status}`);

      // If rate limited (429) or server error (5xx), retry with backoff
      if ((status === 429 || status >= 500) && attempt < maxRetries) {
        const backoffTime = Math.pow(2, attempt) * 500;
        console.log(`[Judge0] Waiting ${backoffTime}ms before retry...`);
        await delay(backoffTime);
        continue;
      }
      throw error;
    }
  }
}

// Helper function to execute code against test cases using Judge0 CE API
async function executeCodeAgainstTests(code: string, language: string, testCases: any[]): Promise<any[]> {
  const results: any[] = [];

  console.log('=== CODE EXECUTION START ===');
  console.log(`Language: ${language}`);
  console.log(`Test cases count: ${testCases.length}`);
  console.log('Code length:', code.length);
  console.log('Code preview:', code.substring(0, 200));

  // Normalize output for comparison
  const normalizeOutput = (s: string) => {
    let normalized = s
      .replace(/\r\n/g, '\n')
      .split('\n')
      .map(line => line.trim())
      .join('\n')
      .replace(/\n+$/, '')
      .trim();

    // For JSON-like outputs, normalize formatting
    if ((normalized.startsWith('[') && normalized.endsWith(']')) ||
        (normalized.startsWith('{') && normalized.endsWith('}'))) {
      normalized = normalized
        .replace(/\s*,\s*/g, ',')
        .replace(/\s*:\s*/g, ':')
        .replace(/\[\s*/g, '[')
        .replace(/\s*\]/g, ']')
        .replace(/\{\s*/g, '{')
        .replace(/\s*\}/g, '}');
    }
    return normalized;
  };

  // Compare outputs with order-insensitive support for nested arrays
  const compareOutputs = (output: string, expected: string): boolean => {
    // Exact match first
    if (output === expected) return true;

    // Try parsing as JSON for smarter comparison
    try {
      const outParsed = JSON.parse(output.replace(/'/g, '"'));
      const expParsed = JSON.parse(expected.replace(/'/g, '"'));

      // Both are arrays of arrays (e.g., group anagrams, 3sum, etc.)
      if (Array.isArray(outParsed) && Array.isArray(expParsed) &&
          outParsed.length === expParsed.length &&
          outParsed.every(Array.isArray) && expParsed.every(Array.isArray)) {
        // Sort inner arrays, then sort outer array by stringified inner
        const sortNested = (arr: any[][]) =>
          arr.map(inner => [...inner].sort()).sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
        return JSON.stringify(sortNested(outParsed)) === JSON.stringify(sortNested(expParsed));
      }

      // Both are flat arrays — compare sorted
      if (Array.isArray(outParsed) && Array.isArray(expParsed) &&
          outParsed.length === expParsed.length) {
        // Check if order matters by trying sorted comparison as fallback
        const sortedOut = JSON.stringify([...outParsed].sort());
        const sortedExp = JSON.stringify([...expParsed].sort());
        if (sortedOut === sortedExp) return true;
      }

      // Deep equal for objects
      return JSON.stringify(outParsed) === JSON.stringify(expParsed);
    } catch {
      // Not valid JSON, fall back to string comparison
      return false;
    }
  };

  for (let i = 0; i < testCases.length; i++) {
    const testCase = testCases[i];
    console.log(`\n--- Test Case ${i + 1}/${testCases.length} ---`);
    console.log('Raw test case:', JSON.stringify(testCase));

    try {
      const stdin = (testCase.input || '').replace(/\\n/g, '\n');
      const expectedRaw = (testCase.expectedOutput || testCase.output || testCase.expected || '');
      const expected = expectedRaw.trim();

      console.log('Input (stdin):', JSON.stringify(stdin));
      console.log('Expected output:', JSON.stringify(expectedRaw));

      // Add delay between test cases for rate limit protection (except first)
      if (i > 0) {
        await delay(200);
      }

      // Execute with Judge0
      const j0Response = await executeWithJudge0(code, language, stdin);
      const j0Result = j0Response.data;

      const output = fromBase64(j0Result.stdout || '').trim();
      const stderr = fromBase64(j0Result.stderr || '') || fromBase64(j0Result.compile_output || '');
      const execTime = parseFloat(j0Result.time) || 0;

      // Check for errors
      const hasCriticalError = j0Result.status?.id >= 5 || (stderr && !output);

      const normalizedOutput = normalizeOutput(output);
      const normalizedExpected = normalizeOutput(expected);
      const passed = !hasCriticalError && compareOutputs(normalizedOutput, normalizedExpected);

      console.log('[Judge0] Output:', JSON.stringify(normalizedOutput));
      console.log('Expected:', JSON.stringify(normalizedExpected));
      console.log('Status:', j0Result.status?.description);
      console.log('Passed:', passed);

      results.push({
        passed,
        input: testCase.input,
        expected,
        output: output || stderr || 'No output',
        stderr,
        status: passed ? 'Accepted' : (hasCriticalError ? j0Result.status?.description || 'Error' : 'Wrong Answer'),
        time: execTime,
        memory: j0Result.memory || 0,
        error: hasCriticalError ? stderr : undefined
      });
    } catch (error: any) {
      console.error(`Test case ${i + 1} execution error:`, error.message);
      results.push({
        passed: false,
        input: testCase.input,
        expected: testCase.expectedOutput || testCase.output || '',
        output: '',
        error: error.message || 'Execution error',
        time: 0
      });
    }
  }

  console.log(`=== EXECUTION COMPLETE: ${results.filter(r => r.passed).length}/${results.length} passed ===`);
  return results;
}

// Helper function to get file extension
function getFileExtension(language: string): string {
  const extensions: Record<string, string> = {
    python: 'py',
    python3: 'py',
    javascript: 'js',
    java: 'java',
    cpp: 'cpp',
    'c++': 'cpp',
    c: 'c',
    go: 'go',
    rust: 'rs',
    ruby: 'rb',
    typescript: 'ts'
  };
  return extensions[language.toLowerCase()] || 'txt';
}

// Helper function to convert language_id to language name
function getLanguageFromId(languageId: number): string {
  const languages: Record<number, string> = {
    71: 'python',
    70: 'python',
    63: 'javascript',
    62: 'java',
    54: 'cpp',
    50: 'c',
    60: 'go',
    73: 'rust',
    72: 'ruby'
  };
  return languages[languageId] || 'python';
}

// ===== GENERIC /:challengeId ROUTE - MUST BE AFTER SPECIFIC ROUTES =====

// Get test cases for a challenge
router.get('/:challengeId/testcases', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const challenge = await Challenge.findById(req.params.challengeId);

    if (!challenge) {
      res.status(404).json({ error: 'Challenge not found', testCases: [] });
      return;
    }

    // Return only visible test cases (not hidden ones)
    const visibleTestCases = (challenge.testCases || []).filter((tc: any) => !tc.isHidden);

    // Format for frontend
    const testCases = visibleTestCases.map((tc: any) => ({
      input: tc.input,
      output: tc.expectedOutput || tc.output || tc.expected,
      expectedOutput: tc.expectedOutput || tc.output || tc.expected
    }));

    res.json({ testCases });
  } catch (error: any) {
    res.status(500).json({ error: error.message, testCases: [] });
  }
});

// Get validation test cases (includes hidden ones - for submission validation only)
router.get('/:challengeId/validation-testcases', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const challenge = await Challenge.findById(req.params.challengeId);

    if (!challenge) {
      res.status(404).json({ error: 'Challenge not found', testCases: [] });
      return;
    }

    // Return all test cases for validation
    const testCases = (challenge.testCases || []).map((tc: any) => ({
      input: tc.input,
      output: tc.expectedOutput || tc.output || tc.expected,
      expectedOutput: tc.expectedOutput || tc.output || tc.expected,
      isHidden: tc.isHidden || false
    }));

    res.json({ testCases });
  } catch (error: any) {
    res.status(500).json({ error: error.message, testCases: [] });
  }
});

// Get starter code for a challenge
router.get('/:challengeId/starter-code', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { challengeId } = req.params;
    const { language = 'python' } = req.query;
    const { getStarterCode } = await import('../services/codeWrapper.js');

    // Try to find challenge title
    let title = 'solution';
    let params: string[] = [];

    // Try MongoDB first
    const mongoose = require('mongoose');
    if (mongoose.Types.ObjectId.isValid(challengeId)) {
      const challenge = await Challenge.findById(challengeId);
      if (challenge) {
        title = challenge.title;
      }
    }

    // Try questions.json
    if (title === 'solution') {
      try {
        const fs = await import('fs/promises');
        const path = await import('path');
        const questionsPath = path.join(__dirname, '../../../public/questions.json');
        const questionsData = await fs.readFile(questionsPath, 'utf-8');
        const questionsJson = JSON.parse(questionsData);

        let questions: any[] = [];
        if (Array.isArray(questionsJson)) {
          questions = questionsJson;
        } else if (questionsJson.problems) {
          questions = questionsJson.problems;
        } else if (questionsJson.questions) {
          questions = questionsJson.questions;
        }

        const found = questions.find((q: any) => q.id === challengeId);
        if (found) {
          title = found.title;
          // Extract params from test case input format
          if (found.testCases && found.testCases[0]) {
            const input = found.testCases[0].input || '';
            const matches = input.match(/(\w+)\s*=/g);
            if (matches) {
              params = matches.map((m: string) => m.replace(/\s*=/, '').trim());
            }
          }
        }
      } catch (err) {
        console.error('Error loading questions.json for starter code:', err);
      }
    }

    const starterCode = getStarterCode(language as string, title, params);
    res.json({ starterCode, functionName: title });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get challenge by ID
router.get('/:challengeId', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const challenge = await Challenge.findById(req.params.challengeId);

    if (!challenge) {
      res.status(404).json({ error: 'Challenge not found' });
      return;
    }

    res.json({ challenge });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Create challenge (admin only)
router.post('/', authenticate, adminOnly, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const challengeData = req.body;

    if (!challengeData.title || !challengeData.description || !challengeData.difficulty) {
      res.status(400).json({ error: 'Title, description, and difficulty are required' });
      return;
    }

    const challenge = new Challenge(challengeData);
    await challenge.save();

    // Send email notification to all users about new challenge (async, don't wait)
    try {
      const users = await User.find().select('email');
      const userEmails = users.map(u => u.email).filter(Boolean);
      if (userEmails.length > 0) {
        emailNotifications.notifyNewChallenge(
          challengeData.title,
          challengeData.difficulty,
          challengeData.points || 100,
          userEmails
        );
      }
    } catch (emailError) {
      console.error('Failed to send new challenge email notifications:', emailError);
    }

    res.status(201).json({
      message: 'Challenge created successfully',
      challenge
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Update challenge (admin only)
router.put('/:challengeId', authenticate, adminOnly, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const challenge = await Challenge.findByIdAndUpdate(
      req.params.challengeId,
      { $set: req.body },
      { new: true }
    );

    if (!challenge) {
      res.status(404).json({ error: 'Challenge not found' });
      return;
    }

    res.json({
      message: 'Challenge updated successfully',
      challenge
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Delete challenge (admin only)
router.delete('/:challengeId', authenticate, adminOnly, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const challenge = await Challenge.findByIdAndDelete(req.params.challengeId);

    if (!challenge) {
      res.status(404).json({ error: 'Challenge not found' });
      return;
    }

    res.json({ message: 'Challenge deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Bulk create challenges (admin only) - for seeding
router.post('/bulk', authenticate, adminOnly, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { challenges } = req.body;

    if (!challenges || !Array.isArray(challenges)) {
      res.status(400).json({ error: 'Challenges array is required' });
      return;
    }

    const result = await Challenge.insertMany(challenges);

    res.status(201).json({
      message: `${result.length} challenges created successfully`,
      count: result.length
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Mark challenge as solved
router.post('/progress/:userId/solve', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;
    const { challengeId, language, executionTime } = req.body;

    // Get challenge points
    const challenge = await Challenge.findById(challengeId);
    const points = challenge ? (challenge.difficulty === 'Easy' ? 10 : challenge.difficulty === 'Medium' ? 20 : 30) : 10;

    let progress = await UserProgress.findOne({ userId });

    if (!progress) {
      progress = new UserProgress({
        userId,
        solvedChallenges: [],
        totalPoints: 0
      });
    }

    // Check if already solved
    const alreadySolved = progress.solvedChallenges.some(
      (sc) => sc.challengeId.toString() === challengeId
    );

    if (!alreadySolved) {
      progress.solvedChallenges.push({
        challengeId,
        solvedAt: new Date(),
        language,
        executionTime
      });
      progress.totalPoints += points;
      await progress.save();
    }

    res.json({ progress, pointsEarned: alreadySolved ? 0 : points });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Seed battle challenges (admin only)
router.post('/seed-battles', authenticate, adminOnly, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { challenges } = req.body;

    if (!challenges || !Array.isArray(challenges)) {
      res.status(400).json({ error: 'Challenges array is required' });
      return;
    }

    // Add battle-specific flags to challenges
    const battleChallenges = challenges.map((c: any) => ({
      ...c,
      isBattleChallenge: true
    }));

    const result = await Challenge.insertMany(battleChallenges);

    res.status(201).json({
      message: `${result.length} battle challenges seeded successfully`,
      count: result.length
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
