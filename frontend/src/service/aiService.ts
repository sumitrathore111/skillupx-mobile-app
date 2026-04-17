/**
 * AI Service
 * Provides AI-powered hints and code analysis
 */

import { apiRequest } from './api';

export interface AIHintRequest {
  problemTitle: string;
  problemDescription: string;
  userCode: string;
  language: string;
  hintLevel: 1 | 2 | 3; // 1=subtle, 2=medium, 3=detailed
}

export interface AIHintResponse {
  hint: string;
  level: number;
  patternDetected?: string;
}

export interface CodeAnalysisRequest {
  code: string;
  language: string;
  problemTitle?: string;
  problemDescription?: string;
  testCases?: Array<{ input: string; expectedOutput: string }>;
  constraints?: string[];
  difficulty?: string;
  expectedComplexity?: string;
}

export interface CodeAnalysisResponse {
  report?: string; // Visual progress bar report
  timeComplexity: string;
  spaceComplexity: string;
  scores?: {
    correctness: number;
    efficiency: number;
    readability: number;
    edgeCases: number;
    overall: number;
  };
  codeQuality?: {
    score: number; // 0-100
    issues: string[];
    suggestions: string[];
  };
  patterns: string[];
  issues?: string[];
  suggestions?: string[];
  optimizations?: string[];
  readability?: {
    score: number;
    feedback: string;
  };
}

export interface AIDebugRequest {
  code: string;
  language: string;
  error?: string;
  expectedOutput?: string;
  actualOutput?: string;
}

export interface AIDebugResponse {
  issue: string;
  explanation: string;
  suggestedFix: string;
  lineNumbers?: number[];
}

/**
 * Get AI-powered hint for a problem
 * Hints are progressive - level 1 is subtle, level 3 is detailed
 */
export const getAIHint = async (request: AIHintRequest): Promise<AIHintResponse> => {
  try {
    const response = await apiRequest('/ai/hint', { method: 'POST', body: JSON.stringify(request) });
    return response;
  } catch (error: any) {
    console.error('AI Hint Error:', error);
    // Return fallback hint
    return {
      hint: getLocalHint(request.hintLevel),
      level: request.hintLevel
    };
  }
};

/**
 * Get comprehensive AI code analysis
 * Analyzes complexity, quality, patterns, and suggestions
 */
export const analyzeCode = async (request: CodeAnalysisRequest): Promise<CodeAnalysisResponse> => {
  try {
    const response = await apiRequest('/ai/analyze', { method: 'POST', body: JSON.stringify(request) });
    return response;
  } catch (error: any) {
    console.error('Code Analysis Error:', error);
    // Return basic fallback analysis
    return getLocalAnalysis(request.code, request.language);
  }
};

/**
 * Get AI debugging help
 * Identifies issues and suggests fixes
 */
export const getAIDebugHelp = async (request: AIDebugRequest): Promise<AIDebugResponse> => {
  try {
    const response = await apiRequest('/ai/debug', { method: 'POST', body: JSON.stringify(request) });
    return response;
  } catch (error: any) {
    console.error('AI Debug Error:', error);
    return {
      issue: 'Unable to analyze at this time',
      explanation: 'Try checking your code syntax and logic',
      suggestedFix: ''
    };
  }
};

// Fallback local hint when API is unavailable
const getLocalHint = (level: number): string => {
  const hints = {
    1: "Think about the data structures that would optimize lookup time. What's the most efficient way to track what you've seen?",
    2: "Consider using a hash-based data structure. This can reduce your time complexity significantly by enabling O(1) lookups.",
    3: "Use a HashMap/Dictionary to store values as you iterate. For each element, check if the complement (target - current) exists in your map."
  };
  return hints[level as 1 | 2 | 3] || hints[1];
};

// Fallback local analysis when API is unavailable
const getLocalAnalysis = (code: string, _language: string): CodeAnalysisResponse => {
  const lines = code.split('\n').length;
  const hasLoop = /for |while |forEach|map\(|reduce\(|filter\(/i.test(code);
  const hasNestedLoop = /(for|while)[\s\S]*?(for|while)/i.test(code);
  const hasRecursion = /def\s+(\w+)[\s\S]*?\1\(|function\s+(\w+)[\s\S]*?\2\(/i.test(code);

  let timeComplexity = 'O(1)';
  if (hasNestedLoop) timeComplexity = 'O(n²)';
  else if (hasLoop) timeComplexity = 'O(n)';
  else if (hasRecursion) timeComplexity = 'O(n) or O(2^n) - depends on recursion';

  const issues: string[] = [];
  const suggestions: string[] = [];

  // Basic code quality checks
  if (lines > 50) issues.push('Function is quite long - consider breaking it into smaller functions');
  if (hasNestedLoop) suggestions.push('Nested loops detected - consider if this can be optimized with a hash map');
  if (!code.includes('//') && !code.includes('#')) suggestions.push('Add comments to explain complex logic');

  return {
    timeComplexity,
    spaceComplexity: hasLoop ? 'O(n)' : 'O(1)',
    codeQuality: {
      score: Math.max(60, 100 - issues.length * 10 - (hasNestedLoop ? 15 : 0)),
      issues,
      suggestions
    },
    patterns: detectPatterns(code),
    optimizations: hasNestedLoop ? ['Consider using a HashMap to reduce nested loop to O(n)'] : [],
    readability: {
      score: Math.min(100, 70 + (code.includes('//') || code.includes('#') ? 15 : 0) + (lines < 30 ? 15 : 0)),
      feedback: lines > 40 ? 'Code could be more concise' : 'Code length is reasonable'
    }
  };
};

// Detect common algorithm patterns
const detectPatterns = (code: string): string[] => {
  const patterns: string[] = [];

  if (/left.*right|low.*high|start.*end/i.test(code)) patterns.push('Two Pointers');
  if (/window|slide/i.test(code) || /\[i\].*\[i\s*[\+\-]/i.test(code)) patterns.push('Sliding Window');
  if (/dp\[|memo|cache|@lru_cache|@cache/i.test(code)) patterns.push('Dynamic Programming');
  if (/bfs|queue|deque/i.test(code)) patterns.push('BFS');
  if (/dfs|stack|recursive/i.test(code)) patterns.push('DFS');
  if (/binary.*search|mid\s*=|lo.*hi/i.test(code)) patterns.push('Binary Search');
  if (/heap|heapq|priority/i.test(code)) patterns.push('Heap/Priority Queue');
  if (/dict\[|map\[|hashmap|{}/i.test(code)) patterns.push('Hash Map');
  if (/sort\(|sorted\(/i.test(code)) patterns.push('Sorting');
  if (/tree|node.*left.*right|TreeNode/i.test(code)) patterns.push('Tree Traversal');
  if (/graph|adj|edges|vertices/i.test(code)) patterns.push('Graph');
  if (/backtrack|permut|combin/i.test(code)) patterns.push('Backtracking');
  if (/prefix.*sum|cumulative/i.test(code)) patterns.push('Prefix Sum');
  if (/union.*find|disjoint/i.test(code)) patterns.push('Union Find');
  if (/trie|prefix.*tree/i.test(code)) patterns.push('Trie');

  return patterns.length > 0 ? patterns : ['General Algorithm'];
};

// --- Code Trace / Step-through Debugger ---

export interface TraceStep {
  line: number;
  code: string;
  variables: Record<string, { value: string; type: string }>;
}

export interface TraceRequest {
  code: string;
  language: string;
  input?: string;
}

export interface TraceResponse {
  success: boolean;
  steps: TraceStep[];
  output: string;
  totalLines: number;
  error?: string;
}

/**
 * Execute code with line-by-line tracing for step-through debugger
 * Returns variable states at each execution step
 */
export const traceCodeExecution = async (request: TraceRequest): Promise<TraceResponse> => {
  try {
    const response = await apiRequest('/ai/trace', {
      method: 'POST',
      body: JSON.stringify(request)
    });
    return response;
  } catch (error: any) {
    console.error('Trace Execution Error:', error);
    return {
      success: false,
      steps: [],
      output: '',
      totalLines: 0,
      error: error.message || 'Failed to trace code execution'
    };
  }
};

export default {
  getAIHint,
  analyzeCode,
  getAIDebugHelp,
  traceCodeExecution
};
