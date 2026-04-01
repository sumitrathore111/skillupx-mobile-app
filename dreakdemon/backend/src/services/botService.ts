import axios from 'axios';

// ============================================================
// BOT SERVICE - Hugging Face AI-powered Code Arena Bot
// ============================================================
// This bot simulates a real opponent in Code Arena battles.
// It uses Hugging Face's free Inference API (CodeLlama/StarCoder)
// to generate code solutions, with fallback to template solutions.
// The bot has adjustable difficulty levels that control:
//   - Solution quality (correct vs partial vs buggy)
//   - Submission timing (fast vs slow)
//   - Code style (clean vs messy)
// ============================================================

const HF_API_URL = 'https://api-inference.huggingface.co/models';
const HF_MODEL = 'bigcode/starcoder2-3b'; // Free, fast code generation model
const HF_FALLBACK_MODEL = 'Qwen/Qwen2.5-Coder-1.5B-Instruct'; // Fallback model

// Human-like names pool for bots (so users can't tell it's a bot)
const HUMAN_NAMES = [
  'Aarav Mehta', 'Priya Sharma', 'Rahul Verma', 'Sneha Patel', 'Arjun Nair',
  'Kavya Iyer', 'Dev Kapoor', 'Ishaan Gupta', 'Ananya Rao', 'Rohan Joshi',
  'Meera Reddy', 'Vikram Singh', 'Tanvi Bhat', 'Aditya Kumar', 'Neha Saxena',
  'Karthik Menon', 'Pooja Desai', 'Siddharth Yadav', 'Riya Chopra', 'Nikhil Das',
  'Alex Morgan', 'Sam Rivera', 'Jordan Lee', 'Casey Kim', 'Taylor Chen',
  'Morgan Bailey', 'Riley Patel', 'Jamie Wong', 'Avery Nakamura', 'Quinn Fernandez',
  'CodeWarrior99', 'ByteHunter', 'PixelNinja42', 'StackMaster', 'AlgoKing',
  'SyntaxWiz', 'DebugDemon', 'BinaryBoss', 'LogicLord', 'HackPro2k',
];

// Pick a random human-like name for a bot
function getRandomHumanName(): string {
  return HUMAN_NAMES[Math.floor(Math.random() * HUMAN_NAMES.length)];
}

// Bot profiles with varying skill levels (names/avatars are randomized per battle)
export const BOT_PROFILES = [
  {
    id: 'bot_nova',
    name: 'Nova',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=nova',
    rating: 1100,
    skillLevel: 'beginner',
    solveChance: 0.55,      // 55% chance to solve correctly
    minDelay: 45000,         // Min 45s before submitting
    maxDelay: 120000,        // Max 2 min
    mistakeChance: 0.35,    // 35% chance of intentional mistakes
  },
  {
    id: 'bot_cipher',
    name: 'Cipher',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=cipher',
    rating: 1350,
    skillLevel: 'intermediate',
    solveChance: 0.72,
    minDelay: 30000,
    maxDelay: 90000,
    mistakeChance: 0.2,
  },
  {
    id: 'bot_apex',
    name: 'Apex',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=apex',
    rating: 1600,
    skillLevel: 'advanced',
    solveChance: 0.88,
    minDelay: 20000,
    maxDelay: 60000,
    mistakeChance: 0.1,
  },
  {
    id: 'bot_zenith',
    name: 'Zenith',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=zenith',
    rating: 1850,
    skillLevel: 'expert',
    solveChance: 0.95,
    minDelay: 15000,
    maxDelay: 45000,
    mistakeChance: 0.05,
  },
];

// Create a disguised bot profile with a random human name and avatar
export function disguiseBotProfile(botProfile: typeof BOT_PROFILES[0]): typeof BOT_PROFILES[0] & { displayName: string; displayAvatar: string } {
  const humanName = getRandomHumanName();
  const avatarSeed = humanName.replace(/\s+/g, '').toLowerCase() + Math.floor(Math.random() * 1000);
  // Slightly randomize rating to look more natural (±50)
  const ratingJitter = Math.floor(Math.random() * 100) - 50;
  return {
    ...botProfile,
    displayName: humanName,
    displayAvatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${avatarSeed}`,
    rating: Math.max(800, botProfile.rating + ratingJitter),
  };
}

// Select a bot profile based on the user's rating
export function selectBotProfile(userRating: number, difficulty: string): typeof BOT_PROFILES[0] {
  // Match bot difficulty to user level
  let targetRating = userRating;

  // Adjust based on battle difficulty
  if (difficulty === 'easy') {
    targetRating -= 200;
  } else if (difficulty === 'hard') {
    targetRating += 200;
  }

  // Find closest bot by rating
  const sorted = [...BOT_PROFILES].sort(
    (a, b) => Math.abs(a.rating - targetRating) - Math.abs(b.rating - targetRating)
  );

  // Add some randomness - pick from top 2 closest
  const candidates = sorted.slice(0, 2);
  return candidates[Math.floor(Math.random() * candidates.length)];
}

// Generate code solution using Hugging Face API
export async function generateBotCode(
  challenge: {
    title: string;
    description: string;
    difficulty: string;
    testCases: Array<{ input: string; expectedOutput?: string; expected_output?: string; output?: string }>;
  },
  language: string = 'python',
  botProfile: typeof BOT_PROFILES[0]
): Promise<string> {
  const hfToken = process.env.HUGGINGFACE_API_KEY || process.env.HF_TOKEN || '';

  // Build prompt for the model
  const sampleInput = challenge.testCases?.[0]?.input || '';
  const sampleOutput = challenge.testCases?.[0]?.expectedOutput ||
    challenge.testCases?.[0]?.expected_output ||
    challenge.testCases?.[0]?.output || '';

  const prompt = buildCodePrompt(challenge.title, challenge.description, sampleInput, sampleOutput, language);

  try {
    // Try Hugging Face API first
    if (hfToken) {
      const code = await callHuggingFaceAPI(prompt, language, hfToken);
      if (code && code.trim().length > 20) {
        console.log(`[Bot] Generated code via HuggingFace (${code.length} chars)`);
        return maybeIntroduceBugs(code, botProfile);
      }
    }

    // Fallback: generate template-based solution
    console.log('[Bot] Using template-based solution (no HF token or API failed)');
    const templateCode = generateTemplateSolution(challenge, language);
    return maybeIntroduceBugs(templateCode, botProfile);

  } catch (error: any) {
    console.error('[Bot] Error generating code:', error.message);
    // Ultimate fallback
    return generateTemplateSolution(challenge, language);
  }
}

// Build a code generation prompt
function buildCodePrompt(
  title: string,
  description: string,
  sampleInput: string,
  sampleOutput: string,
  language: string
): string {
  // Clean description - remove HTML tags
  const cleanDesc = description
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .substring(0, 800);

  return `# Problem: ${title}
# ${cleanDesc}
# Sample Input: ${sampleInput.replace(/\n/g, ', ')}
# Sample Output: ${sampleOutput}
# Language: ${language}
# Read input from stdin and print output to stdout

${language === 'python' ? `def solve():
    ` : language === 'javascript' ? `const readline = require('readline');
const rl = readline.createInterface({ input: process.stdin });
let lines = [];
rl.on('line', (line) => lines.push(line));
rl.on('close', () => {
    ` : `import java.util.*;
public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        `}`;
}

// Call HuggingFace Inference API
async function callHuggingFaceAPI(prompt: string, language: string, token: string): Promise<string> {
  const models = [HF_MODEL, HF_FALLBACK_MODEL];

  for (const model of models) {
    try {
      console.log(`[Bot] Trying HuggingFace model: ${model}`);
      const response = await axios.post(
        `${HF_API_URL}/${model}`,
        {
          inputs: prompt,
          parameters: {
            max_new_tokens: 512,
            temperature: 0.3,
            top_p: 0.9,
            do_sample: true,
            return_full_text: false,
          },
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          timeout: 30000,
        }
      );

      if (response.data && Array.isArray(response.data) && response.data[0]?.generated_text) {
        let generatedCode = response.data[0].generated_text;

        // Clean up the generated code
        generatedCode = cleanGeneratedCode(generatedCode, language);
        return prompt.split('\n').slice(-3).join('\n') + generatedCode;
      }
    } catch (err: any) {
      console.warn(`[Bot] Model ${model} failed:`, err.response?.status || err.message);
      // Model might be loading, wait and try next
      if (err.response?.status === 503) {
        await new Promise(r => setTimeout(r, 2000));
      }
      continue;
    }
  }

  throw new Error('All HuggingFace models failed');
}

// Clean generated code output
function cleanGeneratedCode(code: string, language: string): string {
  // Remove markdown code blocks if present
  code = code.replace(/```[\w]*\n?/g, '').replace(/```/g, '');

  // Remove trailing incomplete lines
  const lines = code.split('\n');
  while (lines.length > 0 && lines[lines.length - 1].trim() === '') {
    lines.pop();
  }

  // Ensure the code has proper structure
  if (language === 'python') {
    // Ensure it ends with a function call
    if (!code.includes('solve()') && !code.includes('print(')) {
      lines.push('\nsolve()');
    }
  }

  return lines.join('\n');
}

// Introduce intentional bugs based on bot skill level
function maybeIntroduceBugs(code: string, botProfile: typeof BOT_PROFILES[0]): string {
  const shouldMakeMistake = Math.random() < botProfile.mistakeChance;
  if (!shouldMakeMistake) return code;

  const bugTypes = [
    // Off-by-one errors
    () => code.replace(/range\((\w+)\)/, 'range($1 - 1)'),
    () => code.replace(/range\(1,\s*(\w+)\s*\+\s*1\)/, 'range(1, $1)'),
    // Wrong operator
    () => code.replace(/<=/g, '<'),
    () => code.replace(/>=/g, '>'),
    // Swap + and -
    () => {
      const match = code.match(/(\w+)\s*\+\s*1/);
      return match ? code.replace(match[0], match[1] + ' - 1') : code;
    },
    // Comment out a print statement (causes wrong output)
    () => code.replace(/(\s*)(print\(.+\))/, '$1# $2\n$1print("wrong")'),
    // Wrong sort order
    () => code.replace(/\.sort\(\)/, '.sort(reverse=True)'),
    () => code.replace(/\.sort\(reverse=True\)/, '.sort()'),
  ];

  // Pick a random bug to introduce
  const bugFn = bugTypes[Math.floor(Math.random() * bugTypes.length)];
  const buggyCode = bugFn();

  // If bug introduction didn't change anything, return original
  if (buggyCode === code) return code;

  console.log('[Bot] Introduced intentional bug');
  return buggyCode;
}

// Generate template-based solutions for common problem patterns
function generateTemplateSolution(
  challenge: {
    title: string;
    description: string;
    difficulty: string;
    testCases: Array<{ input: string; expectedOutput?: string; expected_output?: string; output?: string }>;
  },
  language: string
): string {
  const title = challenge.title.toLowerCase();
  const desc = challenge.description.toLowerCase().replace(/<[^>]*>/g, '');

  // Try to infer the problem type and generate appropriate code
  const sampleInput = challenge.testCases?.[0]?.input || '';
  const sampleOutput = challenge.testCases?.[0]?.expectedOutput ||
    challenge.testCases?.[0]?.expected_output ||
    challenge.testCases?.[0]?.output || '';

  // Analyze the problem to pick a strategy
  const isArray = desc.includes('array') || desc.includes('list') || desc.includes('numbers');
  const isString = desc.includes('string') || desc.includes('palindrome') || desc.includes('anagram');
  const isSort = desc.includes('sort') || desc.includes('order');
  const isSum = desc.includes('sum') || desc.includes('total') || desc.includes('add');
  const isMax = desc.includes('maximum') || desc.includes('largest') || desc.includes('max');
  const isMin = desc.includes('minimum') || desc.includes('smallest') || desc.includes('min');
  const isSearch = desc.includes('search') || desc.includes('find') || desc.includes('missing');
  const isCount = desc.includes('count') || desc.includes('frequency') || desc.includes('how many');
  const isReverse = desc.includes('reverse');
  const isFibonacci = desc.includes('fibonacci') || desc.includes('fib');
  const isPrime = desc.includes('prime');
  const isMatrix = desc.includes('matrix') || desc.includes('grid');
  const isTwoPointer = desc.includes('two sum') || desc.includes('pair') || desc.includes('two pointer');
  const isDP = desc.includes('dynamic') || desc.includes('subsequence') || desc.includes('knapsack');

  if (language === 'python') {
    return generatePythonSolution(
      { isArray, isString, isSort, isSum, isMax, isMin, isSearch, isCount, isReverse, isFibonacci, isPrime, isMatrix, isTwoPointer, isDP },
      sampleInput, sampleOutput, desc, title
    );
  } else if (language === 'javascript') {
    return generateJSSolution(
      { isArray, isString, isSort, isSum, isMax, isMin, isSearch, isCount, isReverse },
      sampleInput, sampleOutput
    );
  } else if (language === 'java') {
    return generateJavaSolution(
      { isArray, isString, isSort, isSum, isMax, isMin, isSearch, isCount, isReverse },
      sampleInput, sampleOutput
    );
  } else if (language === 'cpp') {
    return generateCppSolution(
      { isArray, isString, isSort, isSum, isMax, isMin, isSearch, isCount, isReverse },
      sampleInput, sampleOutput
    );
  }

  // Generic fallback
  return `# Bot solution
import sys
data = sys.stdin.read().strip().split('\\n')
print(data[0])`;
}

interface ProblemFlags {
  isArray: boolean; isString: boolean; isSort: boolean; isSum: boolean;
  isMax: boolean; isMin: boolean; isSearch: boolean; isCount: boolean;
  isReverse: boolean; isFibonacci?: boolean; isPrime?: boolean;
  isMatrix?: boolean; isTwoPointer?: boolean; isDP?: boolean;
}

function generatePythonSolution(
  flags: ProblemFlags,
  sampleInput: string,
  sampleOutput: string,
  desc: string,
  title: string
): string {
  // Build an intelligent solution based on problem analysis
  const lines = sampleInput.split(/\\n|\n/).filter(Boolean);
  const hasMultipleLines = lines.length > 1;

  // Two Sum / Pair finding
  if (flags.isTwoPointer || title.includes('two sum')) {
    return `import sys

def solve():
    data = sys.stdin.read().strip().split('\\n')
    n = int(data[0])
    nums = list(map(int, data[1].split()))
    target = int(data[2]) if len(data) > 2 else n

    seen = {}
    for i, num in enumerate(nums):
        complement = target - num
        if complement in seen:
            print(seen[complement], i)
            return
        seen[num] = i
    print(-1)

solve()`;
  }

  // Fibonacci
  if (flags.isFibonacci) {
    return `import sys

def solve():
    n = int(sys.stdin.read().strip())
    if n <= 0:
        print(0)
        return
    if n == 1:
        print(1)
        return
    a, b = 0, 1
    for _ in range(2, n + 1):
        a, b = b, a + b
    print(b)

solve()`;
  }

  // Prime check
  if (flags.isPrime) {
    return `import sys

def solve():
    n = int(sys.stdin.read().strip())
    if n < 2:
        print("No")
        return
    for i in range(2, int(n**0.5) + 1):
        if n % i == 0:
            print("No")
            return
    print("Yes")

solve()`;
  }

  // Reverse
  if (flags.isReverse && flags.isString) {
    return `import sys

def solve():
    s = sys.stdin.read().strip()
    print(s[::-1])

solve()`;
  }

  if (flags.isReverse && flags.isArray) {
    return `import sys

def solve():
    data = sys.stdin.read().strip().split('\\n')
    n = int(data[0])
    nums = list(map(int, data[1].split()))
    nums.reverse()
    print(' '.join(map(str, nums)))

solve()`;
  }

  // Sort
  if (flags.isSort) {
    return `import sys

def solve():
    data = sys.stdin.read().strip().split('\\n')
    n = int(data[0])
    nums = list(map(int, data[1].split()))
    nums.sort()
    print(' '.join(map(str, nums)))

solve()`;
  }

  // Sum
  if (flags.isSum && flags.isArray) {
    return `import sys

def solve():
    data = sys.stdin.read().strip().split('\\n')
    n = int(data[0])
    nums = list(map(int, data[1].split()))
    print(sum(nums))

solve()`;
  }

  // Max element
  if (flags.isMax && flags.isArray) {
    return `import sys

def solve():
    data = sys.stdin.read().strip().split('\\n')
    n = int(data[0])
    nums = list(map(int, data[1].split()))
    print(max(nums))

solve()`;
  }

  // Min element
  if (flags.isMin && flags.isArray) {
    return `import sys

def solve():
    data = sys.stdin.read().strip().split('\\n')
    n = int(data[0])
    nums = list(map(int, data[1].split()))
    print(min(nums))

solve()`;
  }

  // Search / Missing number
  if (flags.isSearch) {
    return `import sys

def solve():
    data = sys.stdin.read().strip().split('\\n')
    n = int(data[0])
    nums = list(map(int, data[1].split()))
    total = n * (n + 1) // 2
    print(total - sum(nums))

solve()`;
  }

  // Count / Frequency
  if (flags.isCount) {
    return `import sys
from collections import Counter

def solve():
    data = sys.stdin.read().strip().split('\\n')
    n = int(data[0])
    if len(data) > 1:
        nums = data[1].split()
        counts = Counter(nums)
        for key, val in sorted(counts.items()):
            print(f"{key}: {val}")
    else:
        print(0)

solve()`;
  }

  // String palindrome
  if (flags.isString && desc.includes('palindrome')) {
    return `import sys

def solve():
    s = sys.stdin.read().strip().lower()
    cleaned = ''.join(c for c in s if c.isalnum())
    print("Yes" if cleaned == cleaned[::-1] else "No")

solve()`;
  }

  // String anagram
  if (flags.isString && desc.includes('anagram')) {
    return `import sys
from collections import Counter

def solve():
    data = sys.stdin.read().strip().split('\\n')
    s1 = data[0].strip().lower()
    s2 = data[1].strip().lower()
    print("Yes" if Counter(s1) == Counter(s2) else "No")

solve()`;
  }

  // Generic problem - try to parse input intelligently
  // Analyze sample input/output to build a response
  if (hasMultipleLines) {
    return `import sys

def solve():
    data = sys.stdin.read().strip().split('\\n')
    n = int(data[0])
    if len(data) > 1:
        nums = list(map(int, data[1].split()))
        # Process the array
        result = sum(nums)
        print(result)
    else:
        print(n)

solve()`;
  }

  // Single line input - generic
  return `import sys

def solve():
    data = sys.stdin.read().strip()
    try:
        n = int(data)
        print(n)
    except:
        print(data)

solve()`;
}

function generateJSSolution(flags: ProblemFlags, sampleInput: string, sampleOutput: string): string {
  return `const readline = require('readline');
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
let lines = [];
rl.on('line', (line) => lines.push(line.trim()));
rl.on('close', () => {
    const n = parseInt(lines[0]);
    if (lines.length > 1) {
        const nums = lines[1].split(' ').map(Number);
        ${flags.isSum ? 'console.log(nums.reduce((a, b) => a + b, 0));' :
    flags.isMax ? 'console.log(Math.max(...nums));' :
      flags.isMin ? 'console.log(Math.min(...nums));' :
        flags.isSort ? 'nums.sort((a, b) => a - b); console.log(nums.join(" "));' :
          flags.isReverse ? 'nums.reverse(); console.log(nums.join(" "));' :
            flags.isSearch ? 'const total = n * (n + 1) / 2; console.log(total - nums.reduce((a, b) => a + b, 0));' :
              'console.log(nums.reduce((a, b) => a + b, 0));'}
    } else {
        console.log(n);
    }
});`;
}

function generateJavaSolution(flags: ProblemFlags, sampleInput: string, sampleOutput: string): string {
  return `import java.util.*;

public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        int n = sc.nextInt();
        int[] nums = new int[n];
        for (int i = 0; i < n; i++) {
            nums[i] = sc.nextInt();
        }
        ${flags.isSum ? 'long sum = 0; for (int x : nums) sum += x; System.out.println(sum);' :
    flags.isMax ? 'int mx = nums[0]; for (int x : nums) mx = Math.max(mx, x); System.out.println(mx);' :
      flags.isSort ? 'Arrays.sort(nums); StringBuilder sb = new StringBuilder(); for (int i = 0; i < n; i++) { if (i > 0) sb.append(" "); sb.append(nums[i]); } System.out.println(sb);' :
        flags.isSearch ? 'long total = (long)n * (n + 1) / 2; long sum = 0; for (int x : nums) sum += x; System.out.println(total - sum);' :
          'long sum = 0; for (int x : nums) sum += x; System.out.println(sum);'}
    }
}`;
}

function generateCppSolution(flags: ProblemFlags, sampleInput: string, sampleOutput: string): string {
  return `#include <bits/stdc++.h>
using namespace std;

int main() {
    ios_base::sync_with_stdio(false);
    cin.tie(NULL);
    int n;
    cin >> n;
    vector<int> nums(n);
    for (int i = 0; i < n; i++) cin >> nums[i];
    ${flags.isSum ? 'long long sum = 0; for (int x : nums) sum += x; cout << sum << endl;' :
    flags.isMax ? 'cout << *max_element(nums.begin(), nums.end()) << endl;' :
      flags.isSort ? 'sort(nums.begin(), nums.end()); for (int i = 0; i < n; i++) cout << nums[i] << (i < n-1 ? " " : "\\n");' :
        flags.isSearch ? 'long long total = (long long)n * (n + 1) / 2; long long sum = 0; for (int x : nums) sum += x; cout << total - sum << endl;' :
          'long long sum = 0; for (int x : nums) sum += x; cout << sum << endl;'}
    return 0;
}`;
}

// Calculate bot submission delay based on difficulty and bot profile
export function calculateBotDelay(botProfile: typeof BOT_PROFILES[0], difficulty: string): number {
  let minDelay = botProfile.minDelay;
  let maxDelay = botProfile.maxDelay;

  // Adjust timing based on problem difficulty
  if (difficulty === 'hard') {
    minDelay *= 1.5;
    maxDelay *= 1.5;
  } else if (difficulty === 'easy') {
    minDelay *= 0.7;
    maxDelay *= 0.7;
  }

  // Add random variation
  const delay = minDelay + Math.random() * (maxDelay - minDelay);
  return Math.round(delay);
}

// Simulate bot "typing" progress (0-100) over time
export function getBotProgress(elapsedMs: number, totalDelayMs: number): number {
  const progress = (elapsedMs / totalDelayMs) * 100;

  // Add some random fluctuation to look natural
  const jitter = Math.sin(elapsedMs / 2000) * 5;

  return Math.min(Math.max(Math.round(progress + jitter), 0), 99);
}

export default {
  BOT_PROFILES,
  selectBotProfile,
  generateBotCode,
  calculateBotDelay,
  getBotProgress,
};
