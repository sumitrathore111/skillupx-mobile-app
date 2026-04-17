// Judge0 API - Free code execution service
// Documentation: https://ce.judge0.com/
// This is used for Practice mode code execution

const JUDGE0_API_URL = 'https://ce.judge0.com/submissions';

interface ExecutionResult {
  success: boolean;
  output?: string;
  error?: string;
  executionTime?: number;
}

// Language ID mappings for Judge0 API
const languageMap: Record<string, number> = {
  javascript: 63,  // Node.js 12.14.0
  python: 71,      // Python 3.8.1
  python3: 71,
  java: 62,        // Java OpenJDK 13.0.1
  cpp: 54,         // C++ GCC 9.2.0
  c: 50,           // C GCC 9.2.0
  typescript: 74,  // TypeScript 3.7.4
  go: 60,          // Go 1.13.5
  rust: 73,        // Rust 1.40.0
  ruby: 72,        // Ruby 2.7.0
  kotlin: 78,      // Kotlin 1.3.70
  csharp: 51,      // C# Mono 6.6.0
  swift: 83        // Swift 5.2.3
};

export async function executeCode(
  code: string,
  language: string,
  input: string = ''
): Promise<ExecutionResult> {
  const startTime = Date.now();

  try {
    const languageId = languageMap[language.toLowerCase()];
    if (!languageId) {
      throw new Error(`Unsupported language: ${language}`);
    }

    const response = await fetch(`${JUDGE0_API_URL}?base64_encoded=false&wait=true`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        source_code: code,
        language_id: languageId,
        stdin: input,
        cpu_time_limit: 5,
        memory_limit: 128000
      })
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      console.error('Judge0 API error:', response.status, errorText);
      throw new Error(`Code execution failed: ${response.status}`);
    }

    const result = await response.json();
    const executionTime = result.time ? parseFloat(result.time) * 1000 : (Date.now() - startTime);

    // Check for compilation errors
    if (result.compile_output) {
      return {
        success: false,
        error: result.compile_output,
        executionTime
      };
    }

    // Judge0 status codes: 3 = Accepted, others indicate errors
    const statusId = result.status?.id;

    // Check for runtime errors - status 3 is success, 4 is wrong answer (still ran)
    if (statusId !== 3 && statusId !== 4 && result.stderr) {
      return {
        success: false,
        error: result.stderr || result.status?.description || 'Runtime error',
        executionTime
      };
    }

    // Success - return output (even if there's stderr, prioritize stdout)
    return {
      success: true,
      output: (result.stdout || '').trim(),
      error: result.stderr ? result.stderr.trim() : undefined,
      executionTime
    };

  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      executionTime: Date.now() - startTime
    };
  }
}

// Run test cases - returns standard execution result format
export async function runTestCasesPiston(
  code: string,
  language: string,
  testCases: Array<{ input: string; output: string }>
): Promise<{
  success: boolean;
  results: Array<{
    testCase: number;
    passed: boolean;
    input: string;
    expectedOutput: string;
    actualOutput: string;
    time: string | null;
    memory: number | null;
    error: string | null;
  }>;
  passedCount: number;
  totalCount: number;
  totalTime: number;
  totalMemory: number;
  compilationError?: string;
}> {
  if (!testCases || testCases.length === 0) {
    return {
      success: false,
      results: [],
      passedCount: 0,
      totalCount: 0,
      totalTime: 0,
      totalMemory: 0,
      compilationError: 'No test cases provided.'
    };
  }

  const results = [];
  let passedCount = 0;
  let totalTime = 0;

  for (let i = 0; i < testCases.length; i++) {
    const testCase = testCases[i];
    const result = await executeCode(code, language, testCase.input);

    // Handle compilation errors
    if (result.error && (result.error.toLowerCase().includes('compile') || result.error.toLowerCase().includes('syntax') || result.error.toLowerCase().includes('error:'))) {
      return {
        success: false,
        results: [],
        passedCount: 0,
        totalCount: testCases.length,
        totalTime: 0,
        totalMemory: 0,
        compilationError: result.error
      };
    }

    const actualOutput = (result.output || '').trim();
    const expectedOutput = testCase.output.trim();
    const passed = result.success && normalizeOutput(actualOutput) === normalizeOutput(expectedOutput);

    if (passed) passedCount++;
    if (result.executionTime) totalTime += result.executionTime;

    results.push({
      testCase: i + 1,
      passed,
      input: testCase.input,
      expectedOutput,
      actualOutput,
      time: result.executionTime ? `${(result.executionTime / 1000).toFixed(3)}` : null,
      memory: null,
      error: result.error || null
    });
  }

  return {
    success: passedCount === testCases.length,
    results,
    passedCount,
    totalCount: testCases.length,
    totalTime: totalTime / 1000,
    totalMemory: 0
  };
}

// Quick run - returns standard execution result format
export async function quickRunPiston(
  code: string,
  language: string,
  input: string = ''
): Promise<{
  output: string;
  error: string | null;
  time: string | null;
  memory: number | null;
  status: string;
}> {
  const result = await executeCode(code, language, input);

  return {
    output: result.output || '',
    error: result.error || null,
    time: result.executionTime ? `${(result.executionTime / 1000).toFixed(3)}` : null,
    memory: null,
    status: result.success ? 'Accepted' : (result.error ? 'Error' : 'Unknown')
  };
}

// Get supported languages list
export const getPistonSupportedLanguages = () => {
  return Object.keys(languageMap).filter(l => l !== 'python3').map(lang => ({
    id: lang,
    name: lang.charAt(0).toUpperCase() + lang.slice(1),
    languageId: lang
  }));
};

export async function runTestCases(
  code: string,
  language: string,
  testCases: Array<{ input: string; expectedOutput: string; isHidden?: boolean }>
): Promise<Array<{
  passed: boolean;
  input: string;
  expectedOutput: string;
  actualOutput?: string;
  error?: string;
  executionTime?: number;
  isHidden?: boolean;
}>> {
  const results = [];

  for (const testCase of testCases) {
    const result = await executeCode(code, language, testCase.input);

    const actualOutput = result.output || '';
    const expectedOutput = testCase.expectedOutput.trim();
    const passed = result.success && normalizeOutput(actualOutput) === normalizeOutput(expectedOutput);

    results.push({
      passed,
      input: testCase.input,
      expectedOutput: testCase.expectedOutput,
      actualOutput: result.output,
      error: result.error,
      executionTime: result.executionTime,
      isHidden: testCase.isHidden
    });

    // Stop on first failure for efficiency (optional)
    // if (!passed && !testCase.isHidden) break;
  }

  return results;
}

function normalizeOutput(output: string): string {
  if (!output) return '';

  // Normalize for comparison:
  // 1. Trim leading/trailing whitespace
  // 2. Normalize line endings (\r\n -> \n)
  // 3. Trim trailing whitespace from each line
  // 4. Collapse multiple spaces to single space within lines
  // 5. Remove empty lines
  return output
    .trim()
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    .map(line => line.trim().replace(/\s+/g, ' '))
    .filter(line => line.length > 0)
    .join('\n');
}

// Check if Judge0 API is available
export async function checkJudge0Availability(): Promise<boolean> {
  try {
    const response = await fetch(`https://ce.judge0.com/about`);
    return response.ok;
  } catch {
    return false;
  }
}

// Legacy alias for backward compatibility
export const checkPistonAvailability = checkJudge0Availability;

// ============================================
// BATTLE-SPECIFIC FUNCTIONS (Judge0 API)
// ============================================

// Battle submission result interface
export interface PistonBattleSubmissionResult {
  userId: string;
  passed: boolean;
  passedCount: number;
  totalCount: number;
  totalTime: number;       // Total execution time in ms
  totalMemory: number;     // Total memory in KB
  submittedAt: number;     // Timestamp
  compilationError?: string;
}

// Submit battle code using backend API (Judge0 powered)
export const submitBattleCodePiston = async (
  userId: string,
  code: string,
  language: string,
  testCases: { input: string; output: string }[]
): Promise<PistonBattleSubmissionResult> => {
  const submittedAt = Date.now();

  if (!testCases || testCases.length === 0) {
    return {
      userId,
      passed: false,
      passedCount: 0,
      totalCount: 0,
      totalTime: 0,
      totalMemory: 0,
      submittedAt,
      compilationError: 'No test cases provided'
    };
  }

  let passedCount = 0;
  let totalTime = 0;

  for (const testCase of testCases) {
    const result = await executeCode(code, language, testCase.input);

    // Handle compilation errors - stop immediately
    if (result.error && (
      result.error.toLowerCase().includes('compile') ||
      result.error.toLowerCase().includes('syntax') ||
      result.error.toLowerCase().includes('error:')
    )) {
      return {
        userId,
        passed: false,
        passedCount: 0,
        totalCount: testCases.length,
        totalTime: 0,
        totalMemory: 0,
        submittedAt,
        compilationError: result.error
      };
    }

    const actualOutput = (result.output || '').trim();
    const expectedOutput = testCase.output.trim();
    const passed = result.success && normalizeOutput(actualOutput) === normalizeOutput(expectedOutput);

    if (passed) passedCount++;
    if (result.executionTime) totalTime += result.executionTime;
  }

  return {
    userId,
    passed: passedCount === testCases.length,
    passedCount,
    totalCount: testCases.length,
    totalTime,
    totalMemory: 0,
    submittedAt
  };
};

// Determine battle winner based on submissions
export const determineBattleWinnerPiston = (
  submission1: PistonBattleSubmissionResult,
  submission2: PistonBattleSubmissionResult
): {
  winnerId: string | null;
  reason: string;
  isDraw: boolean;
} => {
  // If one passed and other didn't
  if (submission1.passed && !submission2.passed) {
    return {
      winnerId: submission1.userId,
      reason: 'Solved the problem correctly',
      isDraw: false
    };
  }

  if (submission2.passed && !submission1.passed) {
    return {
      winnerId: submission2.userId,
      reason: 'Solved the problem correctly',
      isDraw: false
    };
  }

  // If both passed, compare metrics
  if (submission1.passed && submission2.passed) {
    // First priority: more test cases passed (shouldn't differ if both passed, but just in case)
    if (submission1.passedCount !== submission2.passedCount) {
      const winner = submission1.passedCount > submission2.passedCount ? submission1 : submission2;
      return {
        winnerId: winner.userId,
        reason: 'Passed more test cases',
        isDraw: false
      };
    }

    // Second priority: faster submission time
    if (submission1.submittedAt !== submission2.submittedAt) {
      const winner = submission1.submittedAt < submission2.submittedAt ? submission1 : submission2;
      const timeDiff = Math.abs(submission1.submittedAt - submission2.submittedAt) / 1000;
      return {
        winnerId: winner.userId,
        reason: `Submitted ${timeDiff.toFixed(1)}s faster`,
        isDraw: false
      };
    }

    // Third priority: faster execution
    if (submission1.totalTime !== submission2.totalTime) {
      const winner = submission1.totalTime < submission2.totalTime ? submission1 : submission2;
      return {
        winnerId: winner.userId,
        reason: 'Code executed faster',
        isDraw: false
      };
    }

    // Complete draw
    return {
      winnerId: null,
      reason: 'Both solutions are equally efficient',
      isDraw: true
    };
  }

  // Both failed - compare who got more test cases
  if (submission1.passedCount !== submission2.passedCount) {
    const winner = submission1.passedCount > submission2.passedCount ? submission1 : submission2;
    return {
      winnerId: winner.userId,
      reason: 'Passed more test cases',
      isDraw: false
    };
  }

  // Both completely failed
  return {
    winnerId: null,
    reason: 'Neither player solved the problem',
    isDraw: true
  };
};
