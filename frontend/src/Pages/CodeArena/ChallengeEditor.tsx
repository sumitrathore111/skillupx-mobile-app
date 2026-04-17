import Editor from '@monaco-editor/react';
import { AnimatePresence, motion } from 'framer-motion';
import {
    BarChart3,
    BookOpen,
    Bot,
    Brain,
    Briefcase,
    CheckCircle,
    ChevronDown,
    ChevronLeft,
    ChevronRight,
    Clock,
    Code2,
    Coins,
    Copy,
    Eye,
    FileCode,
    GitBranch,
    GripVertical,
    Hash,
    Heart,
    History,
    Lightbulb,
    Link2,
    Loader2,
    MessageSquare,
    Pause,
    Play,
    Plus,
    RefreshCw,
    Save,
    Send,
    Settings,
    Share2,
    Sparkles,
    StickyNote,
    Target,
    Terminal,
    ThumbsUp,
    Timer,
    TrendingUp,
    Volume2,
    VolumeX,
    X,
    XCircle,
    Zap
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../Context/AuthContext';
import { useDataContext } from '../../Context/UserDataContext';
import { SecurityError, ValidationError } from '../../middleware/inputValidator';
import { analyzeCode as analyzeCodeAI, getAIDebugHelp, getAIHint, traceCodeExecution, type TraceStep } from '../../service/aiService';
import {
    fetchChallengeById,
    getChallengeTestCases,
    type Challenge,
    type TestCase
} from '../../service/challenges';
import { createDiscussion, getDiscussionsWithVoteStatus, voteDiscussion, type DiscussionPost } from '../../service/discussionService';
import { getQuestionById } from '../../service/questionsService';
import { secureCodeExecutionService } from '../../service/secureCodeExecution';

// Supported languages for the editor
const supportedLanguages = [
  { id: 'python', name: 'Python', icon: '🐍' },
  { id: 'cpp', name: 'C++', icon: '⚙️' },
  { id: 'java', name: 'Java', icon: '☕' },
  { id: 'javascript', name: 'JavaScript', icon: '🟨' }
];

type LeftTab = 'description' | 'editorial' | 'solutions' | 'submissions' | 'discussion' | 'notes';
type BottomTab = 'testcase' | 'result' | 'debugger' | 'ai-review';
type TimerMode = 'off' | 'stopwatch' | 'countdown';
type AIHint = { level: number; text: string; revealed: boolean };

// Helper function to format large numbers
const formatNumber = (num?: number): string => {
  if (num === undefined || num === null) return '0';
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toString();
};

const ChallengeEditor = () => {
  const { challengeId } = useParams(); // Format: "contestId-index" e.g., "1800-A"
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { } = useDataContext();

  // Challenge state
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [testCases, setTestCases] = useState<TestCase[]>([]);
  const [loading, setLoading] = useState(true);

  // Editor state
  const [code, setCode] = useState<string>('');
  const [language, setLanguage] = useState('python');
  const [showLanguageMenu, setShowLanguageMenu] = useState(false);

  // Execution state
  const [isRunning, setIsRunning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [quickRunResult, setQuickRunResult] = useState<any>(null);
  const [customInput, setCustomInput] = useState('');
  const [showCustomInput, _setShowCustomInput] = useState(false);

  // UI state - LeetCode style tabs
  const [leftTab, setLeftTab] = useState<LeftTab>('description');
  const [bottomTab, setBottomTab] = useState<BottomTab>('testcase');
  const [showHint, setShowHint] = useState(false);
  const [solved, setSolved] = useState(false);
  const [activeTestCase, setActiveTestCase] = useState(0);
  const [customTestCases, setCustomTestCases] = useState<{input: string; expected: string}[]>([]);
  const [showConsole, setShowConsole] = useState(true);
  const [consoleHeight, _setConsoleHeight] = useState(200);
  const [fontSize, setFontSize] = useState(14);

  // Advanced features state
  const [leftPanelWidth, setLeftPanelWidth] = useState(45); // percentage
  const [isResizing, setIsResizing] = useState(false);
  const [timerMode, setTimerMode] = useState<TimerMode>('off');
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [countdownMinutes, _setCountdownMinutes] = useState(30);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [focusMode, setFocusMode] = useState(false);
  const [problemNotes, setProblemNotes] = useState('');
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [showAIPanel, setShowAIPanel] = useState(false);
  const [aiHints, setAiHints] = useState<AIHint[]>([
    { level: 1, text: 'Click to get a subtle hint...', revealed: false },
    { level: 2, text: 'Click to get a medium hint...', revealed: false },
    { level: 3, text: 'Click to get a detailed hint...', revealed: false },
  ]);
  const [isLoadingHint, setIsLoadingHint] = useState<number | null>(null);
  const [aiAnalysis, setAiAnalysis] = useState<string>('');
  const [isAiAnalyzing, setIsAiAnalyzing] = useState(false);
  const [codeComplexity, setCodeComplexity] = useState<{ time: string; space: string } | null>(null);
  const [_executionStats, _setExecutionStats] = useState<{ runtime: number; memory: number; percentile: number } | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [editorTheme, _setEditorTheme] = useState('vs-dark');
  const [autoSave, setAutoSave] = useState(true);
  const [showLineNumbers, setShowLineNumbers] = useState(true);
  const [tabSize, setTabSize] = useState(4);

  // Debugger state - NOW DYNAMIC
  const [debuggerStep, setDebuggerStep] = useState(0);
  const [debuggerVariables, setDebuggerVariables] = useState<{name: string; value: string; type: string}[]>([]);
  const [debuggerLines, setDebuggerLines] = useState<{line: number; code: string; status: 'completed' | 'current' | 'pending'}[]>([]);
  const [traceSteps, setTraceSteps] = useState<TraceStep[]>([]);
  const [traceOutput, setTraceOutput] = useState<string>('');
  const [isTracing, setIsTracing] = useState(false);
  const [traceError, setTraceError] = useState<string | null>(null);
  const [isAiDebugging, setIsAiDebugging] = useState(false);
  const [aiDebugResult, setAiDebugResult] = useState<{issue: string; explanation: string; suggestedFix: string} | null>(null);

  // Discussion state
  const [discussionPosts, setDiscussionPosts] = useState<DiscussionPost[]>([]);
  const [discussionLoading, setDiscussionLoading] = useState(false);
  const [showNewPostModal, setShowNewPostModal] = useState(false);
  const [newPostTitle, setNewPostTitle] = useState('');
  const [newPostContent, setNewPostContent] = useState('');

  // Problem navigation state
  const [_adjacentProblems, _setAdjacentProblems] = useState<{prev: string | null; next: string | null}>({ prev: null, next: null });
  const [showAllCompanies, setShowAllCompanies] = useState(false);

  const resizeRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const languages = supportedLanguages;

  // Helper to convert problem title to function name
  const getFunctionName = (title: string): string => {
    const words = title.split(/\s+/);
    return words.map((word, i) => {
      const clean = word.replace(/[^a-zA-Z0-9]/g, '');
      return i === 0 ? clean.toLowerCase() : clean.charAt(0).toUpperCase() + clean.slice(1).toLowerCase();
    }).join('');
  };

  // Generate starter code based on problem title and test cases
  const getStarterCode = (_lang: string, title: string = 'solution', testCase?: any): { [key: string]: string } => {
    const funcName = getFunctionName(title);

    // Extract params from test case input format (e.g., "nums = [1,2,3], target = 6")
    let params = ['nums', 'target']; // default
    if (testCase?.input) {
      const matches = testCase.input.match(/(\w+)\s*=/g);
      if (matches) {
        params = matches.map((m: string) => m.replace(/\s*=/, '').trim());
      }
    }

    return {
      python: `def ${funcName}(${params.join(', ')}):
    """
    ${title}

    Args:
        ${params.map(p => `${p}: Input parameter`).join('\n        ')}

    Returns:
        The result as specified in the problem
    """
    # Write your solution here

    pass
`,
      cpp: `class Solution {
public:
    // ${title}
    vector<int> ${funcName}(vector<int>& ${params[0] || 'nums'}${params.length > 1 ? `, int ${params[1]}` : ''}) {
        // Write your solution here

        return {};
    }
};
`,
      java: `class Solution {
    // ${title}
    public int[] ${funcName}(int[] ${params[0] || 'nums'}${params.length > 1 ? `, int ${params[1]}` : ''}) {
        // Write your solution here

        return new int[]{};
    }
}
`,
      javascript: `/**
 * ${title}
 * @param {${params.map(() => 'any').join(', ')}} ${params.join(', ')}
 * @return {any}
 */
function ${funcName}(${params.join(', ')}) {
    // Write your solution here

}
`,
    };
  };

  // Default starter code (generic)
  const defaultCode: { [key: string]: string } = {
    python: `def solution(nums, target):
    """
    Write your solution here.
    The input will be parsed automatically.
    Just implement the function logic.
    """
    # Your code here

    pass
`,
    cpp: `class Solution {
public:
    vector<int> solution(vector<int>& nums, int target) {
        // Write your solution here

        return {};
    }
};
`,
    java: `class Solution {
    public int[] solution(int[] nums, int target) {
        // Write your solution here

        return new int[]{};
    }
}
`,
    javascript: `/**
 * @param {number[]} nums
 * @param {number} target
 * @return {number[]}
 */
function solution(nums, target) {
    // Write your solution here

}
`,
  };

  // Timer functionality
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
    if (isTimerRunning && timerMode !== 'off') {
      interval = setInterval(() => {
        if (timerMode === 'stopwatch') {
          setTimerSeconds((prev) => prev + 1);
        } else if (timerMode === 'countdown') {
          setTimerSeconds((prev) => {
            if (prev <= 1) {
              setIsTimerRunning(false);
              if (soundEnabled) {
                // Play sound notification
                const audio = new Audio('/notification.mp3');
                audio.play().catch(() => {});
              }
              return 0;
            }
            return prev - 1;
          });
        }
      }, 1000);
    }
    return () => { if (interval) clearInterval(interval); };
  }, [isTimerRunning, timerMode, soundEnabled]);

  // Format timer display
  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hrs > 0) {
      return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Resizable panel handlers
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isResizing || !containerRef.current) return;
    const containerRect = containerRef.current.getBoundingClientRect();
    const newWidth = ((e.clientX - containerRect.left) / containerRect.width) * 100;
    setLeftPanelWidth(Math.min(Math.max(newWidth, 25), 75));
  }, [isResizing]);

  const handleMouseUp = useCallback(() => {
    setIsResizing(false);
  }, []);

  useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, handleMouseMove, handleMouseUp]);

  // AI Code Analysis with visual progress bars
  const analyzeCode = useCallback(async () => {
    if (!code.trim()) return;
    setIsAiAnalyzing(true);

    try {
      // Send full context to AI for better analysis
      const result = await analyzeCodeAI({
        code,
        language,
        problemTitle: challenge?.title,
        problemDescription: challenge?.description,
        testCases: challenge?.testCases?.slice(0, 3)?.map(tc => ({
          input: tc.input,
          expectedOutput: tc.expectedOutput
        })),
        constraints: challenge?.constraints,
        difficulty: challenge?.difficulty
      });

      // Use the visual report if available, otherwise format manually
      let analysis: string;
      if (result.report) {
        analysis = result.report;
      } else {
        // Fallback formatting
        const generateBar = (pct: number) => '█'.repeat(Math.round(pct / 6.25)) + '░'.repeat(16 - Math.round(pct / 6.25));
        const scores = result.scores || { correctness: 85, efficiency: 75, readability: 70, edgeCases: 50 };

        analysis = `═══════════════════════════════════════
       📊 CODE ANALYSIS REPORT
═══════════════════════════════════════

⚡ PERFORMANCE
Time:  ${(result.timeComplexity || 'O(n)').padEnd(6)} ${generateBar(scores.efficiency)} ${scores.efficiency >= 80 ? 'Fast' : 'Moderate'}
Space: ${(result.spaceComplexity || 'O(n)').padEnd(6)} ${generateBar(80)} Moderate

🎯 QUALITY BREAKDOWN
Correctness  ${generateBar(scores.correctness)} ${scores.correctness}%
Efficiency   ${generateBar(scores.efficiency)} ${scores.efficiency}%
Readability  ${generateBar(scores.readability)} ${scores.readability}%
Edge Cases   ${generateBar(scores.edgeCases)} ${scores.edgeCases}%

🏷️ DETECTED PATTERNS
${(result.patterns || ['General']).map((p: string) => `[${p}]`).join(' ')}

💡 QUICK FIXES
${(result.suggestions || result.codeQuality?.suggestions || ['No immediate fixes needed']).map((s: string) => `→ ${s}`).join('\n')}`;
      }

      setAiAnalysis(analysis);
      setCodeComplexity({ time: result.timeComplexity, space: result.spaceComplexity });
    } catch (error) {
      console.error('AI Analysis failed:', error);
      setAiAnalysis('Analysis temporarily unavailable. Please try again.');
    }

    setIsAiAnalyzing(false);
  }, [code, language, challenge]);

  // Reveal AI hint
  const revealHint = async (index: number) => {
    const hintLevel = (index + 1) as 1 | 2 | 3;
    setIsLoadingHint(hintLevel);

    try {
      const result = await getAIHint({
        problemTitle: challenge?.title || 'Coding Problem',
        problemDescription: challenge?.description || '',
        userCode: code,
        language,
        hintLevel
      });

      setAiHints((prev) =>
        prev.map((hint, i) => (i === index ? { ...hint, text: result.hint, revealed: true } : hint))
      );
    } catch (error) {
      console.error('Failed to get hint:', error);
      setAiHints((prev) =>
        prev.map((hint, i) => (i === index ? { ...hint, text: 'Hint unavailable. Try again later.', revealed: true } : hint))
      );
    }

    setIsLoadingHint(null);
  };

  // Copy code to clipboard
  const copyCode = useCallback(() => {
    navigator.clipboard.writeText(code);
  }, [code]);

  // Share problem
  const shareProblem = useCallback(() => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
  }, []);

  // Debugger controls
  // Start trace execution - REAL debugger
  const startTraceExecution = useCallback(async () => {
    if (!code.trim()) {
      alert('Please write some code first');
      return;
    }

    setIsTracing(true);
    setTraceError(null);
    setTraceSteps([]);
    setDebuggerLines([]);
    setDebuggerVariables([]);
    setDebuggerStep(0);

    try {
      // Get input from first test case or use empty
      const input = testCases[0]?.input || '';

      const result = await traceCodeExecution({
        code,
        language,
        input
      });

      if (result.success && result.steps.length > 0) {
        setTraceSteps(result.steps);
        setTraceOutput(result.output);

        // Set up debugger lines from trace steps
        const lines = result.steps.map((step, idx) => ({
          line: step.line,
          code: step.code,
          status: idx === 0 ? 'current' as const : 'pending' as const
        }));
        setDebuggerLines(lines);

        // Set initial variables from first step
        const vars = Object.entries(result.steps[0].variables || {}).map(([name, data]) => ({
          name,
          value: data.value,
          type: data.type
        }));
        setDebuggerVariables(vars.length > 0 ? vars : [{ name: '(no variables)', value: '-', type: '-' }]);
      } else {
        setTraceError(result.error || 'No trace data returned');
        // Show code lines anyway for reference
        const codeLines = code.split('\n').filter(l => l.trim()).map((line, idx) => ({
          line: idx + 1,
          code: line,
          status: 'pending' as const
        }));
        setDebuggerLines(codeLines);
      }
    } catch (error) {
      console.error('Trace error:', error);
      setTraceError('Failed to trace code execution');
    } finally {
      setIsTracing(false);
    }
  }, [code, language, testCases]);

  // Debugger controls - NOW USE REAL TRACE DATA
  const debuggerReset = useCallback(() => {
    setDebuggerStep(0);
    setDebuggerLines(prev => prev.map((line, idx) => ({
      ...line,
      status: idx === 0 ? 'current' : 'pending'
    })));
    // Set variables from first trace step
    if (traceSteps.length > 0) {
      const vars = Object.entries(traceSteps[0].variables || {}).map(([name, data]) => ({
        name,
        value: data.value,
        type: data.type
      }));
      setDebuggerVariables(vars.length > 0 ? vars : [{ name: '(no variables)', value: '-', type: '-' }]);
    } else {
      setDebuggerVariables([]);
    }
  }, [traceSteps]);

  const debuggerPrev = useCallback(() => {
    setDebuggerStep(prev => {
      const newStep = Math.max(0, prev - 1);
      setDebuggerLines(lines => lines.map((line, idx) => ({
        ...line,
        status: idx < newStep ? 'completed' : idx === newStep ? 'current' : 'pending'
      })));
      // Update variables from trace step
      if (traceSteps[newStep]) {
        const vars = Object.entries(traceSteps[newStep].variables || {}).map(([name, data]) => ({
          name,
          value: data.value,
          type: data.type
        }));
        setDebuggerVariables(vars.length > 0 ? vars : [{ name: '(no variables)', value: '-', type: '-' }]);
      }
      return newStep;
    });
  }, [traceSteps]);

  const debuggerNext = useCallback(() => {
    setDebuggerStep(prev => {
      const maxStep = debuggerLines.length - 1;
      const newStep = Math.min(maxStep, prev + 1);
      setDebuggerLines(lines => lines.map((line, idx) => ({
        ...line,
        status: idx < newStep ? 'completed' : idx === newStep ? 'current' : 'pending'
      })));
      // Update variables from trace step
      if (traceSteps[newStep]) {
        const vars = Object.entries(traceSteps[newStep].variables || {}).map(([name, data]) => ({
          name,
          value: data.value,
          type: data.type
        }));
        setDebuggerVariables(vars.length > 0 ? vars : [{ name: '(no variables)', value: '-', type: '-' }]);
      }
      return newStep;
    });
  }, [debuggerLines.length, traceSteps]);

  const debuggerEnd = useCallback(() => {
    const lastStep = debuggerLines.length - 1;
    setDebuggerStep(lastStep);
    setDebuggerLines(prev => prev.map((line, idx) => ({
      ...line,
      status: idx < lastStep ? 'completed' : idx === lastStep ? 'current' : 'pending'
    })));
    // Update variables from last trace step
    if (traceSteps[lastStep]) {
      const vars = Object.entries(traceSteps[lastStep].variables || {}).map(([name, data]) => ({
        name,
        value: data.value,
        type: data.type
      }));
      setDebuggerVariables(vars.length > 0 ? vars : [{ name: '(no variables)', value: '-', type: '-' }]);
    }
  }, [debuggerLines.length, traceSteps]);

  // AI Debug handler
  const handleAiDebug = useCallback(async () => {
    if (!code.trim()) {
      alert('Please write some code first');
      return;
    }

    setIsAiDebugging(true);
    setAiDebugResult(null);

    try {
      const result = await getAIDebugHelp({
        code,
        language,
        error: quickRunResult?.error || results?.compilationError,
        expectedOutput: testCases[0]?.expectedOutput,
        actualOutput: quickRunResult?.output
      });
      setAiDebugResult(result);
    } catch (error) {
      console.error('AI Debug error:', error);
      setAiDebugResult({
        issue: 'Unable to analyze code',
        explanation: 'AI service is temporarily unavailable. Please try again.',
        suggestedFix: ''
      });
    } finally {
      setIsAiDebugging(false);
    }
  }, [code, language, quickRunResult, results, testCases]);

  // Fetch discussions when challengeId changes
  useEffect(() => {
    const fetchDiscussions = async () => {
      if (!challengeId) return;
      setDiscussionLoading(true);
      try {
        const posts = await getDiscussionsWithVoteStatus(challengeId);
        setDiscussionPosts(posts);
      } catch (error) {
        console.error('Failed to fetch discussions:', error);
      } finally {
        setDiscussionLoading(false);
      }
    };
    fetchDiscussions();
  }, [challengeId]);

  // Discussion handlers
  const handleVotePost = useCallback(async (postId: string) => {
    try {
      const result = await voteDiscussion(postId);
      if (result) {
        setDiscussionPosts(prev => prev.map(post => {
          if (post.id === postId) {
            return { ...post, votes: result.votes, voted: result.voted };
          }
          return post;
        }));
      }
    } catch (error) {
      console.error('Vote failed:', error);
    }
  }, []);

  const handleNewPost = useCallback(async () => {
    if (!newPostTitle.trim() || !newPostContent.trim() || !challengeId) return;
    try {
      const newPost = await createDiscussion(challengeId, newPostTitle, newPostContent);
      if (newPost) {
        setDiscussionPosts(prev => [newPost, ...prev]);
      }
      setNewPostTitle('');
      setNewPostContent('');
      setShowNewPostModal(false);
    } catch (error) {
      console.error('Create post failed:', error);
      alert('Failed to create post. Please try again.');
    }
  }, [newPostTitle, newPostContent, challengeId]);

  // Navigate to adjacent problems
  const navigateToProblem = useCallback((direction: 'prev' | 'next') => {
    // Get available problems from localStorage
    const storedProblems = localStorage.getItem('cachedProblems');
    console.log('Navigating:', direction, 'Current ID:', challengeId);
    console.log('Stored problems:', storedProblems ? 'found' : 'not found');

    if (storedProblems && challengeId) {
      try {
        const problems = JSON.parse(storedProblems);
        console.log('Total cached problems:', problems.length);

        // Find current problem by ID (handle both string and exact match)
        const currentIndex = problems.findIndex((p: any) =>
          p.id === challengeId || p.id?.toString() === challengeId || String(p.id) === String(challengeId)
        );

        console.log('Current index:', currentIndex);

        if (currentIndex !== -1) {
          const targetIndex = direction === 'prev' ? currentIndex - 1 : currentIndex + 1;
          console.log('Target index:', targetIndex);

          if (targetIndex >= 0 && targetIndex < problems.length) {
            const targetProblem = problems[targetIndex];
            console.log('Navigating to:', targetProblem.id, targetProblem.title);
            // Navigate to practice route
            navigate(`/dashboard/practice/${targetProblem.id}`);
          } else {
            console.log('Target index out of bounds');
          }
        } else {
          console.log('Current problem not found in cache, ID:', challengeId);
          console.log('First few IDs in cache:', problems.slice(0, 5).map((p: any) => p.id));
        }
      } catch (e) {
        console.error('Error navigating:', e);
      }
    } else {
      console.log('No cached problems found or no challengeId');
    }
  }, [challengeId, navigate]);

  // Auto-save functionality
  useEffect(() => {
    if (!autoSave || !challengeId || !code) return;
    const timeout = setTimeout(() => {
      localStorage.setItem(`code_${challengeId}_${language}`, code);
      localStorage.setItem(`notes_${challengeId}`, problemNotes);
    }, 2000);
    return () => clearTimeout(timeout);
  }, [code, problemNotes, autoSave, challengeId, language]);

  // Load saved code and notes
  useEffect(() => {
    if (challengeId) {
      const savedCode = localStorage.getItem(`code_${challengeId}_${language}`);
      const savedNotes = localStorage.getItem(`notes_${challengeId}`);
      if (savedCode) setCode(savedCode);
      if (savedNotes) setProblemNotes(savedNotes);
    }
  }, [challengeId, language]);

  // Fetch challenge details
  useEffect(() => {
    const loadChallenge = async () => {
      if (!challengeId) return;

      // Reset previous results when navigating to a new problem
      setResults(null);
      setQuickRunResult(null);
      setBottomTab('testcase');
      setAiDebugResult(null);

      setLoading(true);

      try {
        // First, check if challenge data was passed via navigation state
        const challengeData = (location.state as any)?.challenge;

        if (challengeData) {
          setChallenge(challengeData as Challenge);
          // Parse test cases from the challenge object
          if (challengeData.testCases) {
            setTestCases(Array.isArray(challengeData.testCases) ? challengeData.testCases : []);
          }
        } else {
          // Fallback: Get challenge from database
          const firestoreChallenge = await fetchChallengeById(challengeId);

          if (firestoreChallenge) {
            setChallenge(firestoreChallenge);
            // Fetch test cases (visible ones only for practice)
            const cases = await getChallengeTestCases(challengeId);
            setTestCases(cases);
          } else {
            // Try to get from local questions.json
            const localQuestion = await getQuestionById(challengeId);
            if (localQuestion) {
              // Convert Question to Challenge format
              const challengeFromQuestion = {
                id: localQuestion.id,
                title: localQuestion.title,
                description: localQuestion.description,
                difficulty: localQuestion.difficulty.charAt(0).toUpperCase() + localQuestion.difficulty.slice(1) as 'Easy' | 'Medium' | 'Hard',
                category: localQuestion.category,
                points: localQuestion.coinReward || 10,
                testCases: localQuestion.testCases || [],
                hints: localQuestion.hints,
                tags: localQuestion.tags,
                coinReward: localQuestion.coinReward,
                // Extra fields for display
                companies: localQuestion.companies,
                relatedTopics: localQuestion.relatedTopics,
                similarProblems: localQuestion.similarProblems,
                acceptanceRate: localQuestion.acceptanceRate,
                totalSubmissions: localQuestion.totalSubmissions,
                totalAccepted: localQuestion.totalAccepted,
                likes: localQuestion.likes,
                dislikes: localQuestion.dislikes,
              } as any;
              setChallenge(challengeFromQuestion);
              setTestCases(localQuestion.testCases || []);
            } else {
              setChallenge(null);
            }
          }
        }

        setLoading(false);
      } catch (error) {
        console.error('Error loading challenge:', error);
        setChallenge(null);
        setLoading(false);
      }
    };

    loadChallenge();
  }, [challengeId, location]);

  // Set problem-specific starter code when language or challenge changes
  useEffect(() => {
    // Only set code if there's no saved code for this challenge
    const savedCode = localStorage.getItem(`code_${challengeId}_${language}`);
    if (savedCode) {
      setCode(savedCode);
      return;
    }

    // Generate problem-specific starter code if we have challenge info
    if (challenge?.title) {
      const starterCodes = getStarterCode(language, challenge.title, testCases[0]);
      setCode(starterCodes[language] || starterCodes.python || defaultCode[language]);
    } else {
      setCode(defaultCode[language] || defaultCode.python);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [language, challenge?.title, testCases]);

  // Quick run code with security validation
  const handleRun = async () => {
    setIsRunning(true);
    setQuickRunResult(null);
    setResults(null);

    try {
      const input = showCustomInput ? customInput : (testCases[0]?.input || '');
      const result = await secureCodeExecutionService.executeCode(code, language, input, challenge?.title);
      setQuickRunResult(result);
    } catch (error) {
      let errorMessage = 'Failed to run code. Please try again.';

      if (error instanceof SecurityError) {
        errorMessage = `Security Error: ${error.message}`;
      } else if (error instanceof ValidationError) {
        errorMessage = `Validation Error: ${error.message}`;
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }

      setQuickRunResult({
        output: '',
        stderr: errorMessage,
        time: '0',
        memory: '0',
        status: 'Error'
      });
    }

    setIsRunning(false);
  };

  // Submit code against all test cases with security validation
  const handleSubmit = async () => {
    if (!challengeId) {
      alert('Invalid challenge ID');
      return;
    }

    if (testCases.length === 0) {
      // Try to refresh test cases (functionality disabled for deployment)
      // const [contestId, index] = challengeId.split('-');
      // const cases = await fetchProblemTestCases(parseInt(contestId), index);
      // if (cases.length > 0) {
      //   setTestCases(cases);
      // } else {
        alert('No test cases available for this problem. Please try again or use the Run button with custom input.');
        return;
      // }
    }

    setIsSubmitting(true);
    setResults(null);
    setQuickRunResult(null);

    try {
      // Pass test cases to backend for validation (especially for local/questions.json challenges)
      const submissionResult = await secureCodeExecutionService.submitChallenge(
        challengeId,
        code,
        language,
        testCases.map(tc => ({
          input: tc.input,
          expected_output: tc.expectedOutput,
          expectedOutput: tc.expectedOutput
        })),
        challenge?.coinReward,
        challenge?.title,
        challenge?.difficulty
      );

      if (submissionResult.success && challenge && user) {
        // Coins are awarded server-side, just update UI
        setSolved(true);
        setResults({
          success: true,
          passedCount: submissionResult.passedCount,
          totalCount: submissionResult.totalCount,
          totalTime: 0,
          totalMemory: 0,
          results: submissionResult.testResults?.map((r, idx) => ({
            testCase: idx + 1,
            passed: r.passed,
            input: r.input,
            expected: r.expected,
            output: r.output
          })) || testCases.map((_, idx) => ({ testCase: idx + 1, passed: true }))
        });

        // Show success message with coins earned
        if (submissionResult.coinsChanged > 0) {
          alert(`🎉 ${submissionResult.message}`);
        }
      } else {
        setResults({
          success: false,
          passedCount: submissionResult.passedCount,
          totalCount: submissionResult.totalCount,
          totalTime: 0,
          totalMemory: 0,
          results: submissionResult.testResults?.map((r, idx) => ({
            testCase: idx + 1,
            passed: r.passed,
            input: r.input,
            expected: r.expected,
            output: r.output,
            error: r.error
          })) || testCases.map((_, idx) => ({ testCase: idx + 1, passed: false }))
        });

        // Show failure message with coins lost
        if (submissionResult.coinsChanged < 0) {
          alert(`❌ ${submissionResult.message}`);
        } else if (submissionResult.message) {
          alert(submissionResult.message);
        }
      }
    } catch (error: any) {
      console.error('Submission error:', error);

      let errorMessage = 'Submission failed. Please try again.';
      if (error instanceof SecurityError) {
        errorMessage = `Security Error: ${error.message}`;
      } else if (error instanceof ValidationError) {
        errorMessage = `Validation Error: ${error.message}`;
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }

      setResults({
        success: false,
        results: [],
        passedCount: 0,
        totalCount: testCases.length,
        totalTime: 0,
        totalMemory: 0,
        compilationError: errorMessage
      });
    }

    setIsSubmitting(false);
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'text-[#00b8a3] bg-[#00b8a3]/10 border-[#00b8a3]/30';
      case 'medium': return 'text-[#ffc01e] bg-[#ffc01e]/10 border-[#ffc01e]/30';
      case 'hard': return 'text-[#ff375f] bg-[#ff375f]/10 border-[#ff375f]/30';
      case 'expert': return 'text-purple-400 bg-purple-400/10 border-purple-400/30';
      default: return 'text-gray-400 bg-gray-400/10 border-gray-400/30';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="w-16 h-16 border-4 border-cyan-500 border-t-transparent rounded-full"
        />
      </div>
    );
  }

  return (
    <div ref={containerRef} className={`absolute inset-0 bg-[#1a1a1a] flex flex-col overflow-hidden ${focusMode ? 'focus-mode' : ''}`}>
      {/* Advanced Header with Timer */}
      <header className="flex-shrink-0 bg-[#282828] border-b border-gray-800 px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate('/dashboard/practice')}
            className="flex items-center gap-1 text-gray-400 hover:text-white transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
            <span className="text-sm hidden md:block">Problem List</span>
          </motion.button>

          <div className="h-6 w-px bg-gray-700" />

          <div className="flex items-center gap-3">
            <button
              onClick={() => navigateToProblem('prev')}
              className="flex items-center gap-1.5 text-gray-400 hover:text-white text-sm transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              <span className="hidden md:block">Prev</span>
            </button>
            <button
              onClick={() => navigateToProblem('next')}
              className="flex items-center gap-1.5 text-gray-400 hover:text-white text-sm transition-colors"
            >
              <span className="hidden md:block">Next</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="h-6 w-px bg-gray-700 hidden md:block" />

          {/* Timer Section */}
          <div className="hidden md:flex items-center gap-2">
            <div className="flex items-center bg-[#1e1e1e] rounded-lg border border-gray-700 overflow-hidden">
              <button
                onClick={() => {
                  if (timerMode === 'off') {
                    setTimerMode('stopwatch');
                    setTimerSeconds(0);
                  } else if (timerMode === 'stopwatch') {
                    setTimerMode('countdown');
                    setTimerSeconds(countdownMinutes * 60);
                  } else {
                    setTimerMode('off');
                    setIsTimerRunning(false);
                  }
                }}
                className={`px-3 py-1.5 text-xs font-medium flex items-center gap-1.5 ${
                  timerMode !== 'off' ? 'text-[#ffa116]' : 'text-gray-400'
                } hover:text-white transition-colors`}
              >
                <Timer className="w-3.5 h-3.5" />
                {timerMode === 'off' ? 'Timer' : timerMode === 'stopwatch' ? '⏱️' : '⏳'}
              </button>

              {timerMode !== 'off' && (
                <>
                  <span className={`px-3 py-1.5 text-sm font-mono font-bold ${
                    timerMode === 'countdown' && timerSeconds <= 60 ? 'text-[#ff375f] animate-pulse' : 'text-white'
                  }`}>
                    {formatTime(timerSeconds)}
                  </span>
                  <button
                    onClick={() => setIsTimerRunning(!isTimerRunning)}
                    className="px-2 py-1.5 text-gray-400 hover:text-white transition-colors"
                  >
                    {isTimerRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                  </button>
                  <button
                    onClick={() => {
                      setTimerSeconds(timerMode === 'countdown' ? countdownMinutes * 60 : 0);
                      setIsTimerRunning(false);
                    }}
                    className="px-2 py-1.5 text-gray-400 hover:text-white transition-colors"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                </>
              )}
            </div>

            {/* Focus Mode */}
            <button
              onClick={() => setFocusMode(!focusMode)}
              className={`p-2 rounded-lg transition-colors ${
                focusMode ? 'bg-[#ffa116]/20 text-[#ffa116]' : 'text-gray-400 hover:text-white hover:bg-[#2d2d2d]'
              }`}
              title="Focus Mode"
            >
              <Target className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Bookmark */}
          <button
            onClick={() => setIsBookmarked(!isBookmarked)}
            className={`p-2 rounded-lg transition-colors ${
              isBookmarked ? 'text-[#ff375f]' : 'text-gray-400 hover:text-white hover:bg-[#2d2d2d]'
            }`}
          >
            <Heart className={`w-4 h-4 ${isBookmarked ? 'fill-current' : ''}`} />
          </button>

          {/* Share */}
          <button
            onClick={shareProblem}
            className="p-2 text-gray-400 hover:text-white hover:bg-[#2d2d2d] rounded-lg transition-colors"
            title="Copy Link"
          >
            <Share2 className="w-4 h-4" />
          </button>

          {/* AI Assistant */}
          <button
            onClick={() => setShowAIPanel(!showAIPanel)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors ${
              showAIPanel ? 'bg-purple-500/20 text-purple-400 border border-purple-500/50' : 'text-gray-400 hover:text-white hover:bg-[#2d2d2d] border border-transparent'
            }`}
            title="AI Assistant"
          >
            <Sparkles className="w-4 h-4" />
            <span className="text-xs font-medium hidden md:inline">AI Hints</span>
          </button>

          <div className="h-6 w-px bg-gray-700" />

          {/* Language Selector - LeetCode Style */}
          <div className="relative">
            <button
              onClick={() => setShowLanguageMenu(!showLanguageMenu)}
              className="flex items-center gap-2 px-3 py-1.5 bg-[#2d2d2d] hover:bg-[#3d3d3d] rounded-lg text-sm transition-all border border-gray-700"
            >
              <span className="text-base">{languages.find(l => l.id === language)?.icon}</span>
              <span className="text-white font-medium">{languages.find(l => l.id === language)?.name}</span>
              <ChevronDown className="w-4 h-4 text-gray-400" />
            </button>

            <AnimatePresence>
              {showLanguageMenu && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="absolute right-0 top-full mt-2 w-48 bg-[#2d2d2d] border border-gray-700 rounded-lg shadow-xl z-50 overflow-hidden"
                >
                  {languages.map((lang) => (
                    <button
                      key={lang.id}
                      onClick={() => {
                        setLanguage(lang.id);
                        setShowLanguageMenu(false);
                      }}
                      className={`w-full px-4 py-2.5 text-left hover:bg-[#3d3d3d] transition-colors flex items-center gap-3 ${
                        language === lang.id ? 'text-cyan-400 bg-cyan-500/10' : 'text-white'
                      }`}
                    >
                      <span className="text-base">{lang.icon}</span>
                      <span>{lang.name}</span>
                      {language === lang.id && <CheckCircle className="w-4 h-4 ml-auto" />}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Settings */}
          <div className="relative">
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="p-2 text-gray-400 hover:text-white hover:bg-[#2d2d2d] rounded-lg transition-colors"
            >
              <Settings className="w-4 h-4" />
            </button>

            <AnimatePresence>
              {showSettings && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="absolute right-0 top-full mt-2 w-64 bg-[#2d2d2d] border border-gray-700 rounded-lg shadow-xl z-50 p-4 space-y-4"
                >
                  <h3 className="text-white font-medium text-sm mb-3">Editor Settings</h3>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400 text-xs">Font Size</span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setFontSize(Math.max(10, fontSize - 1))}
                          className="w-6 h-6 flex items-center justify-center bg-[#1e1e1e] rounded text-gray-400 hover:text-white"
                        >-</button>
                        <span className="text-white text-xs w-6 text-center">{fontSize}</span>
                        <button
                          onClick={() => setFontSize(Math.min(24, fontSize + 1))}
                          className="w-6 h-6 flex items-center justify-center bg-[#1e1e1e] rounded text-gray-400 hover:text-white"
                        >+</button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-gray-400 text-xs">Tab Size</span>
                      <select
                        value={tabSize}
                        onChange={(e) => setTabSize(Number(e.target.value))}
                        className="bg-[#1e1e1e] border border-gray-700 rounded px-2 py-1 text-xs text-white"
                      >
                        <option value={2}>2</option>
                        <option value={4}>4</option>
                      </select>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-gray-400 text-xs">Line Numbers</span>
                      <button
                        onClick={() => setShowLineNumbers(!showLineNumbers)}
                        className={`w-10 h-5 rounded-full transition-colors ${showLineNumbers ? 'bg-[#2cbb5d]' : 'bg-gray-600'}`}
                      >
                        <div className={`w-4 h-4 bg-white rounded-full transform transition-transform ${showLineNumbers ? 'translate-x-5' : 'translate-x-0.5'}`} />
                      </button>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-gray-400 text-xs">Auto Save</span>
                      <button
                        onClick={() => setAutoSave(!autoSave)}
                        className={`w-10 h-5 rounded-full transition-colors ${autoSave ? 'bg-[#2cbb5d]' : 'bg-gray-600'}`}
                      >
                        <div className={`w-4 h-4 bg-white rounded-full transform transition-transform ${autoSave ? 'translate-x-5' : 'translate-x-0.5'}`} />
                      </button>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-gray-400 text-xs">Sound</span>
                      <button
                        onClick={() => setSoundEnabled(!soundEnabled)}
                        className={`p-1.5 rounded ${soundEnabled ? 'text-[#2cbb5d]' : 'text-gray-500'}`}
                      >
                        {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Run Button */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleRun}
            disabled={isRunning || isSubmitting}
            className="flex items-center gap-2 px-4 py-1.5 bg-[#2d2d2d] hover:bg-[#3d3d3d] border border-gray-700 text-white text-sm font-medium rounded-lg transition-all disabled:opacity-50"
          >
            {isRunning ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Play className="w-4 h-4" />
            )}
            Run
          </motion.button>

          {/* Submit Button */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleSubmit}
            disabled={isRunning || isSubmitting}
            className="flex items-center gap-2 px-4 py-1.5 bg-[#2cbb5d] hover:bg-[#3ac96a] text-white text-sm font-medium rounded-lg transition-all disabled:opacity-50"
          >
            {isSubmitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            Submit
          </motion.button>
        </div>
      </header>

      {/* AI Assistant Floating Panel */}
      <AnimatePresence>
        {showAIPanel && (
          <motion.div
            initial={{ opacity: 0, x: 300 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 300 }}
            className="fixed right-4 top-20 w-80 bg-[#1e1e1e] border border-purple-500/30 rounded-xl shadow-2xl z-[100] overflow-hidden"
          >
            <div className="bg-gradient-to-r from-purple-600/20 to-pink-600/20 px-4 py-3 border-b border-gray-700 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bot className="w-5 h-5 text-purple-400" />
                <span className="font-medium text-white">AI Assistant</span>
              </div>
              <button onClick={() => setShowAIPanel(false)} className="text-gray-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-4 max-h-96 overflow-y-auto">
              {/* Progressive Hints */}
              <div className="space-y-2">
                <h4 className="text-xs font-medium text-gray-400 uppercase tracking-wider flex items-center gap-2">
                  <Lightbulb className="w-3 h-3 text-yellow-500" />
                  AI Hints
                </h4>
                {aiHints.map((hint, index) => (
                  <div key={index} className="bg-[#282828] rounded-lg p-3 border border-gray-700">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium text-purple-400">
                        {hint.level === 1 ? '🌱 Subtle' : hint.level === 2 ? '🌿 Medium' : '🌳 Detailed'} Hint
                      </span>
                      {!hint.revealed && (
                        <button
                          onClick={() => revealHint(index)}
                          disabled={isLoadingHint !== null}
                          className="px-2 py-1 text-xs bg-[#ffa116]/20 text-[#ffa116] hover:bg-[#ffa116]/30 rounded transition-colors flex items-center gap-1 disabled:opacity-50"
                        >
                          {isLoadingHint === hint.level ? (
                            <><Loader2 className="w-3 h-3 animate-spin" /> Loading...</>
                          ) : (
                            <>🔓 Get Hint</>
                          )}
                        </button>
                      )}
                      {hint.revealed && (
                        <span className="text-xs text-green-400">✓ AI Generated</span>
                      )}
                    </div>
                    {isLoadingHint === hint.level ? (
                      <div className="flex items-center gap-2 text-sm text-gray-400">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        AI is thinking...
                      </div>
                    ) : hint.revealed ? (
                      <div className="text-sm text-gray-300 whitespace-pre-wrap">{hint.text}</div>
                    ) : (
                      <div className="text-sm text-gray-500 italic">Click to get AI-powered hint</div>
                    )}
                  </div>
                ))}
              </div>

              {/* AI Code Review */}
              <div className="space-y-2">
                <h4 className="text-xs font-medium text-gray-400 uppercase tracking-wider flex items-center gap-2">
                  <Brain className="w-3 h-3 text-purple-400" />
                  Code Analysis
                  <span className="text-[10px] px-1.5 py-0.5 bg-purple-500/20 text-purple-300 rounded">✨ AI</span>
                </h4>
                <button
                  onClick={analyzeCode}
                  disabled={isAiAnalyzing || !code.trim()}
                  className="w-full flex items-center justify-center gap-2 px-3 py-3 bg-gradient-to-r from-purple-500/30 to-pink-500/30 hover:from-purple-500/40 hover:to-pink-500/40 text-white rounded-lg text-sm font-medium transition-all border border-purple-500/30 disabled:opacity-50"
                >
                  {isAiAnalyzing ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Sparkles className="w-4 h-4" />
                  )}
                  {isAiAnalyzing ? 'AI Analyzing...' : '✨ Analyze My Code'}
                </button>

                {aiAnalysis && (
                  <div className="bg-[#282828] rounded-lg p-3 text-sm text-gray-300 whitespace-pre-wrap">
                    {aiAnalysis}
                  </div>
                )}

                {codeComplexity && (
                  <div className="flex gap-2">
                    <div className="flex-1 bg-[#282828] rounded-lg p-2 text-center">
                      <div className="text-xs text-gray-400">Time</div>
                      <div className="text-sm font-mono text-[#00b8a3]">{codeComplexity.time}</div>
                    </div>
                    <div className="flex-1 bg-[#282828] rounded-lg p-2 text-center">
                      <div className="text-xs text-gray-400">Space</div>
                      <div className="text-sm font-mono text-[#ffc01e]">{codeComplexity.space}</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content - Resizable Panels */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Panel - Problem Description */}
        <div
          style={{ width: `${leftPanelWidth}%` }}
          className="border-r border-gray-800 flex flex-col overflow-hidden bg-[#1e1e1e]"
        >
          {/* Advanced Tabs */}
          <div className="flex items-center border-b border-gray-800 bg-[#282828] overflow-x-auto">
            {[
              { id: 'description', label: 'Description', icon: BookOpen },
              { id: 'editorial', label: 'Editorial', icon: Lightbulb },
              { id: 'solutions', label: 'Solutions', icon: Code2 },
              { id: 'submissions', label: 'Submissions', icon: History },
              { id: 'discussion', label: 'Discuss', icon: MessageSquare },
              { id: 'notes', label: 'Notes', icon: StickyNote },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setLeftTab(tab.id as LeftTab)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors border-b-2 whitespace-nowrap ${
                  leftTab === tab.id
                    ? 'text-white border-[#ffa116] bg-[#1e1e1e]'
                    : 'text-gray-400 border-transparent hover:text-gray-200 hover:bg-[#2d2d2d]'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>

          {/* Left Panel Content */}
          <div className="flex-1 overflow-y-auto">
            {leftTab === 'description' ? (
              <div className="p-6 space-y-6">
                {/* Title and Difficulty */}
                <div>
                  <div className="flex items-center gap-3 mb-3">
                    <h1 className="text-xl font-bold text-white">
                      {challenge?.title || 'Loading...'}
                    </h1>
                    {solved && (
                      <span className="flex items-center gap-1 px-2 py-0.5 bg-[#2cbb5d]/20 text-[#2cbb5d] text-xs font-medium rounded-full">
                        <CheckCircle className="w-3 h-3" />
                        Solved
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-4 text-sm">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${getDifficultyColor(challenge?.difficulty || '')}`}>
                      {challenge?.difficulty ? challenge.difficulty.charAt(0).toUpperCase() + challenge.difficulty.slice(1) : 'Unknown'}
                    </span>
                    {challenge?.category && (
                      <span className="text-gray-400">{challenge.category}</span>
                    )}
                    <span className="flex items-center gap-1 text-[#ffa116]">
                      <Coins className="w-4 h-4" />
                      {challenge?.coinReward || 0} coins
                    </span>
                  </div>
                </div>

                {/* Problem Statement */}
                {challenge?.description && (
                  <div className="prose prose-invert max-w-none">
                    <p className="text-gray-300 leading-relaxed whitespace-pre-wrap">{challenge.description}</p>
                  </div>
                )}

                {/* Constraints */}
                {challenge?.constraints && (
                  <div>
                    <h3 className="text-sm font-semibold text-white mb-2">Constraints</h3>
                    <div className="bg-[#282828] rounded-lg p-4 text-sm text-gray-300 font-mono whitespace-pre-wrap">
                      {challenge.constraints}
                    </div>
                  </div>
                )}

                {/* Examples / Test Cases */}
                {testCases.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-white mb-3">Examples</h3>
                    <div className="space-y-4">
                      {testCases.slice(0, 3).map((tc, idx) => (
                        <div key={idx} className="bg-[#282828] rounded-lg overflow-hidden border border-gray-700">
                          <div className="px-4 py-2 bg-[#2d2d2d] border-b border-gray-700">
                            <span className="text-sm text-gray-400">Example {idx + 1}</span>
                          </div>
                          <div className="p-4 space-y-3">
                            <div>
                              <span className="text-xs text-gray-500 block mb-1">Input:</span>
                              <pre className="text-sm text-cyan-400 font-mono bg-[#1e1e1e] p-2 rounded">{tc.input}</pre>
                            </div>
                            <div>
                              <span className="text-xs text-gray-500 block mb-1">Output:</span>
                              <pre className="text-sm text-emerald-400 font-mono bg-[#1e1e1e] p-2 rounded">{(tc as any).output || tc.expectedOutput || (tc as any).expected_output || 'N/A'}</pre>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Hints */}
                {(challenge as any)?.solution_hint && (
                  <div>
                    <button
                      onClick={() => setShowHint(!showHint)}
                      className="flex items-center gap-2 text-amber-400 hover:text-amber-300 transition-colors text-sm"
                    >
                      <Lightbulb className="w-4 h-4" />
                      {showHint ? 'Hide Hint' : 'Show Hint'}
                    </button>

                    <AnimatePresence>
                      {showHint && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="mt-3 p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg"
                        >
                          <p className="text-sm text-amber-200">{(challenge as any).solution_hint}</p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}

                {/* Company Tags */}
                {(challenge as any)?.companies && (challenge as any).companies.length > 0 && (
                <div className="pt-4 border-t border-gray-700">
                  <div className="flex items-center gap-2 mb-3">
                    <Briefcase className="w-4 h-4 text-gray-400" />
                    <h3 className="text-sm font-semibold text-gray-400">Companies</h3>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {((showAllCompanies ? (challenge as any).companies : (challenge as any).companies.slice(0, 4)) as string[]).map((company: string) => (
                      <span
                        key={company}
                        className="px-2.5 py-1 bg-blue-500/10 text-blue-400 text-xs font-medium rounded-full border border-blue-500/20 hover:bg-blue-500/20 cursor-pointer transition-colors"
                      >
                        {company}
                      </span>
                    ))}
                    {(challenge as any).companies.length > 4 && (
                      <button
                        onClick={() => setShowAllCompanies(!showAllCompanies)}
                        className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
                      >
                        {showAllCompanies ? 'Show less' : `+${(challenge as any).companies.length - 4} more`}
                      </button>
                    )}
                  </div>
                </div>
                )}

                {/* Topic Tags */}
                {(((challenge as any)?.relatedTopics && (challenge as any).relatedTopics.length > 0) || (challenge?.tags && challenge.tags.length > 0)) && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Hash className="w-4 h-4 text-gray-400" />
                    <h3 className="text-sm font-semibold text-gray-400">Related Topics</h3>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {((challenge as any)?.relatedTopics || challenge?.tags || []).map((topic: string) => (
                      <span
                        key={topic}
                        className="px-2.5 py-1 bg-[#282828] text-gray-300 text-xs font-medium rounded-full border border-gray-700 hover:border-[#ffa116] hover:text-[#ffa116] cursor-pointer transition-colors"
                      >
                        {topic}
                      </span>
                    ))}
                  </div>
                </div>
                )}

                {/* Similar Problems */}
                {(challenge as any)?.similarProblems && (challenge as any).similarProblems.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <GitBranch className="w-4 h-4 text-gray-400" />
                    <h3 className="text-sm font-semibold text-gray-400">Similar Problems</h3>
                  </div>
                  <div className="space-y-2">
                    {(challenge as any).similarProblems.map((problem: {id: string; title: string; difficulty: string}) => (
                      <div
                        key={problem.id}
                        onClick={() => navigate(`/dashboard/practice/${problem.id}`)}
                        className="flex items-center justify-between p-3 bg-[#282828] rounded-lg hover:bg-[#2d2d2d] cursor-pointer transition-colors group"
                      >
                        <div className="flex items-center gap-3">
                          <span className={`w-2 h-2 rounded-full ${
                            problem.difficulty.toLowerCase() === 'easy' ? 'bg-[#00b8a3]' :
                            problem.difficulty.toLowerCase() === 'medium' ? 'bg-[#ffc01e]' : 'bg-[#ff375f]'
                          }`} />
                          <span className="text-sm text-gray-300 group-hover:text-white transition-colors">{problem.title}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className={`text-xs font-medium ${
                            problem.difficulty.toLowerCase() === 'easy' ? 'text-[#00b8a3]' :
                            problem.difficulty.toLowerCase() === 'medium' ? 'text-[#ffc01e]' : 'text-[#ff375f]'
                          }`}>{problem.difficulty}</span>
                          <Link2 className="w-3.5 h-3.5 text-gray-500 group-hover:text-[#ffa116] transition-colors" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                )}

                {/* Problem Stats */}
                {((challenge as any)?.acceptanceRate !== undefined || (challenge as any)?.totalSubmissions !== undefined) && (
                <div className="p-4 bg-gradient-to-br from-[#282828] to-[#1e1e1e] rounded-xl border border-gray-700">
                  <h3 className="text-sm font-semibold text-gray-400 mb-4 flex items-center gap-2">
                    <BarChart3 className="w-4 h-4" />
                    Problem Statistics
                  </h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-white">{(challenge as any)?.acceptanceRate?.toFixed(1) || '0'}%</div>
                      <div className="text-xs text-gray-500">Acceptance</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-white">{formatNumber((challenge as any)?.totalSubmissions)}</div>
                      <div className="text-xs text-gray-500">Submissions</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-white">{formatNumber((challenge as any)?.totalAccepted)}</div>
                      <div className="text-xs text-gray-500">Accepted</div>
                    </div>
                  </div>
                </div>
                )}
              </div>
            ) : leftTab === 'submissions' ? (
              <div className="p-6">
                <div className="text-center py-10 text-gray-400">
                  <History className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p className="font-medium">No submissions yet</p>
                  <p className="text-sm mt-1">Submit your solution to see results here</p>
                </div>
              </div>
            ) : leftTab === 'discussion' ? (
              <div className="p-6 space-y-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-white">Discussion</h3>
                  <button
                    onClick={() => setShowNewPostModal(true)}
                    className="flex items-center gap-2 px-3 py-1.5 bg-[#ffa116] hover:bg-[#ffb340] text-black text-sm font-medium rounded-lg transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    New Post
                  </button>
                </div>

                {/* New Post Modal */}
                {showNewPostModal && (
                  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-[#282828] rounded-xl p-6 w-full max-w-md border border-gray-700">
                      <h3 className="text-lg font-semibold text-white mb-4">Create New Post</h3>
                      <input
                        type="text"
                        value={newPostTitle}
                        onChange={(e) => setNewPostTitle(e.target.value)}
                        placeholder="Post title..."
                        className="w-full px-3 py-2 bg-[#1e1e1e] border border-gray-700 rounded-lg text-white text-sm mb-3 focus:outline-none focus:border-[#ffa116]"
                      />
                      <textarea
                        value={newPostContent}
                        onChange={(e) => setNewPostContent(e.target.value)}
                        placeholder="Share your thoughts, solution, or questions..."
                        className="w-full h-32 px-3 py-2 bg-[#1e1e1e] border border-gray-700 rounded-lg text-white text-sm resize-none focus:outline-none focus:border-[#ffa116]"
                      />
                      <div className="flex justify-end gap-2 mt-4">
                        <button
                          onClick={() => {
                            setShowNewPostModal(false);
                            setNewPostTitle('');
                            setNewPostContent('');
                          }}
                          className="px-4 py-2 text-gray-400 hover:text-white text-sm transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleNewPost}
                          disabled={!newPostTitle.trim()}
                          className="px-4 py-2 bg-[#ffa116] hover:bg-[#ffb340] text-black text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Post
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Discussion Posts */}
                {discussionLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-[#ffa116]" />
                    <span className="ml-2 text-gray-400">Loading discussions...</span>
                  </div>
                ) : discussionPosts.length === 0 ? (
                  <div className="text-center py-8 text-gray-400">
                    <MessageSquare className="w-10 h-10 mx-auto mb-3 opacity-50" />
                    <p className="font-medium">No discussions yet</p>
                    <p className="text-sm mt-1">Be the first to start a discussion!</p>
                  </div>
                ) : (
                  discussionPosts.map((post) => (
                    <div key={post.id} className="bg-[#282828] rounded-lg p-4 hover:bg-[#2d2d2d] transition-colors cursor-pointer">
                      <div className="flex items-start gap-3">
                        <div className="flex flex-col items-center gap-1 min-w-[50px]">
                          <button
                            onClick={() => handleVotePost(post.id)}
                            className={`transition-colors ${post.voted ? 'text-[#ffa116]' : 'text-gray-400 hover:text-[#ffa116]'}`}
                          >
                            <ThumbsUp className={`w-4 h-4 ${post.voted ? 'fill-current' : ''}`} />
                          </button>
                          <span className="text-sm font-medium text-gray-300">{post.votes}</span>
                        </div>
                        <div className="flex-1">
                          <h4 className="text-white font-medium hover:text-[#ffa116] transition-colors">{post.title}</h4>
                          <div className="flex items-center gap-2 mt-2 text-xs text-gray-400">
                            <span className="text-[#00b8a3]">@{post.author}</span>
                            <span>•</span>
                            <span>{post.repliesCount} replies</span>
                            <span>•</span>
                            <span>{post.time}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            ) : leftTab === 'notes' ? (
              <div className="p-6 space-y-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-white">Personal Notes</h3>
                  <button className="flex items-center gap-1.5 px-2 py-1 text-xs text-gray-400 hover:text-white hover:bg-[#3d3d3d] rounded transition-colors">
                    <Save className="w-3 h-3" />
                    {autoSave ? 'Auto-saved' : 'Save'}
                  </button>
                </div>

                <textarea
                  value={problemNotes}
                  onChange={(e) => setProblemNotes(e.target.value)}
                  placeholder="Write your notes, observations, and approach ideas here..."
                  className="w-full h-64 bg-[#282828] border border-gray-700 rounded-lg p-4 text-gray-200 text-sm resize-none focus:outline-none focus:border-[#ffa116] transition-colors"
                />

                <div className="space-y-2">
                  <h4 className="text-xs font-medium text-gray-400 uppercase tracking-wider">Quick Templates</h4>
                  <div className="flex flex-wrap gap-2">
                    {['Edge Cases', 'Time Complexity', 'Space Complexity', 'Pattern Used', 'Similar To'].map((template) => (
                      <button
                        key={template}
                        onClick={() => setProblemNotes(prev => prev + `\n\n## ${template}\n- `)}
                        className="px-2 py-1 bg-[#282828] hover:bg-[#3d3d3d] text-gray-400 hover:text-white text-xs rounded transition-colors"
                      >
                        + {template}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-6">
                <div className="text-center py-10 text-gray-400">
                  <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p className="font-medium">Coming Soon</p>
                  <p className="text-sm mt-1">This feature is under development</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Resizable Handle */}
        <div
          ref={resizeRef}
          onMouseDown={handleMouseDown}
          className={`absolute top-0 bottom-0 w-1 cursor-col-resize z-10 group ${isResizing ? 'bg-[#ffa116]' : 'bg-transparent hover:bg-[#ffa116]/50'}`}
          style={{ left: `${leftPanelWidth}%`, transform: 'translateX(-50%)' }}
        >
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-4 h-8 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <GripVertical className="w-4 h-4 text-[#ffa116]" />
          </div>
        </div>

        {/* Right Panel - Code Editor & Console (LeetCode Style) */}
        <div
          style={{ width: `${100 - leftPanelWidth}%` }}
          className="flex flex-col overflow-hidden bg-[#1e1e1e]"
        >
          {/* Editor Header */}
          <div className="flex items-center justify-between px-4 py-2 border-b border-gray-800 bg-[#282828]">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <FileCode className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-gray-300">Code</span>
              </div>
              {autoSave && (
                <span className="text-xs text-gray-500 flex items-center gap-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#2cbb5d] animate-pulse" />
                  Auto-save
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={copyCode}
                className="flex items-center gap-1.5 px-2 py-1 text-xs text-gray-400 hover:text-white hover:bg-[#3d3d3d] rounded transition-colors"
                title="Copy Code"
              >
                <Copy className="w-3 h-3" />
              </button>
              <button
                onClick={() => {
                  // Reset to problem-specific starter code
                  if (challenge?.title) {
                    const starterCodes = getStarterCode(language, challenge.title, testCases[0]);
                    setCode(starterCodes[language] || defaultCode[language] || '');
                  } else {
                    setCode(defaultCode[language] || '');
                  }
                  // Clear saved code
                  localStorage.removeItem(`code_${challengeId}_${language}`);
                }}
                className="flex items-center gap-1.5 px-2 py-1 text-xs text-gray-400 hover:text-white hover:bg-[#3d3d3d] rounded transition-colors"
                title="Reset Code"
              >
                <RefreshCw className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* Monaco Editor */}
          <div className="flex-1 overflow-hidden">
            <Editor
              height="100%"
              language={language === 'cpp' ? 'cpp' : language}
              value={code}
              onChange={(value) => setCode(value || '')}
              theme={editorTheme}
              options={{
                fontSize: fontSize,
                fontFamily: 'JetBrains Mono, Fira Code, Monaco, Consolas, monospace',
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                lineNumbers: showLineNumbers ? 'on' : 'off',
                glyphMargin: false,
                folding: true,
                lineDecorationsWidth: 10,
                automaticLayout: true,
                tabSize: tabSize,
                wordWrap: 'off',
                padding: { top: 16, bottom: 16 },
                renderLineHighlight: 'line',
                cursorBlinking: 'smooth',
                smoothScrolling: true,
                contextmenu: true,
                suggest: {
                  showMethods: true,
                  showFunctions: true,
                  showConstructors: true,
                  showFields: true,
                  showVariables: true,
                  showClasses: true,
                  showStructs: true,
                  showInterfaces: true,
                  showModules: true,
                  showProperties: true,
                  showEvents: true,
                  showOperators: true,
                  showUnits: true,
                  showValues: true,
                  showConstants: true,
                  showEnums: true,
                  showEnumMembers: true,
                  showKeywords: true,
                  showWords: true,
                  showColors: true,
                  showFiles: true,
                  showReferences: true,
                  showFolders: true,
                  showTypeParameters: true,
                  showSnippets: true,
                }
              }}
            />
          </div>

          {/* Bottom Console Panel - LeetCode Style */}
          {showConsole && (
            <div
              className="border-t border-gray-800 bg-[#1e1e1e] flex flex-col"
              style={{ height: consoleHeight }}
            >
              {/* Console Header with Tabs */}
              <div className="flex items-center justify-between px-2 border-b border-gray-800 bg-[#282828]">
                <div className="flex items-center">
                  {[
                    { id: 'testcase', label: 'Testcase', icon: FileCode },
                    { id: 'result', label: 'Test Result', icon: Terminal },
                    { id: 'debugger', label: 'Debugger', icon: Eye },
                    { id: 'ai-review', label: 'AI Review', icon: Sparkles },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setBottomTab(tab.id as BottomTab)}
                      className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition-colors ${
                        bottomTab === tab.id
                          ? 'text-white border-b-2 border-[#ffa116]'
                          : 'text-gray-400 hover:text-gray-200'
                      }`}
                    >
                      <tab.icon className="w-3.5 h-3.5" />
                      {tab.label}
                      {tab.id === 'result' && results && (
                        <span className={`ml-1 w-2 h-2 rounded-full ${results.success ? 'bg-[#2cbb5d]' : 'bg-[#ff375f]'}`} />
                      )}
                      {tab.id === 'ai-review' && aiAnalysis && (
                        <span className="ml-1 w-2 h-2 rounded-full bg-purple-500" />
                      )}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => setShowConsole(false)}
                  className="p-1 text-gray-400 hover:text-white rounded transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Console Content */}
              <div className="flex-1 overflow-y-auto p-4">
                {bottomTab === 'testcase' ? (
                  <div className="space-y-4">
                    {/* Test Case Tabs */}
                    <div className="flex items-center gap-2 flex-wrap">
                      {testCases.slice(0, 5).map((_, idx) => (
                        <button
                          key={idx}
                          onClick={() => setActiveTestCase(idx)}
                          className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                            activeTestCase === idx
                              ? 'bg-[#3d3d3d] text-white'
                              : 'bg-[#2d2d2d] text-gray-400 hover:text-white'
                          }`}
                        >
                          Case {idx + 1}
                        </button>
                      ))}
                      <button
                        onClick={() => {
                          setCustomTestCases([...customTestCases, { input: '', expected: '' }]);
                        }}
                        className="flex items-center gap-1 px-2 py-1.5 text-xs text-gray-400 hover:text-white bg-[#2d2d2d] rounded-lg transition-colors"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>

                    {/* Test Case Input/Expected */}
                    {testCases[activeTestCase] && (
                      <div className="space-y-3">
                        <div>
                          <label className="text-xs text-gray-400 mb-1 block">Input =</label>
                          <textarea
                            value={showCustomInput ? customInput : testCases[activeTestCase]?.input || ''}
                            onChange={(e) => setCustomInput(e.target.value)}
                            className="w-full h-20 px-3 py-2 bg-[#282828] border border-gray-700 rounded-lg text-sm text-white font-mono resize-none focus:outline-none focus:ring-1 focus:ring-cyan-500"
                            placeholder="Enter input..."
                          />
                        </div>
                        <div>
                          <label className="text-xs text-gray-400 mb-1 block">Expected Output =</label>
                          <div className="w-full px-3 py-2 bg-[#282828] border border-gray-700 rounded-lg text-sm text-emerald-400 font-mono min-h-[50px]">
                            {testCases[activeTestCase]?.expectedOutput || 'N/A'}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ) : bottomTab === 'result' ? (
                  <div className="space-y-4">
                    {/* Quick Run Result */}
                    {quickRunResult && (
                      <div className="space-y-3">
                        <div className={`flex items-center gap-2 text-sm font-medium ${
                          quickRunResult.stderr ? 'text-red-400' : 'text-emerald-400'
                        }`}>
                          {quickRunResult.stderr ? (
                            <>
                              <XCircle className="w-4 h-4" />
                              Runtime Error
                            </>
                          ) : (
                            <>
                              <CheckCircle className="w-4 h-4" />
                              Executed Successfully
                            </>
                          )}
                        </div>

                        {quickRunResult.output && (
                          <div>
                            <label className="text-xs text-gray-400 mb-1 block">Output</label>
                            <pre className="px-3 py-2 bg-[#282828] border border-gray-700 rounded-lg text-sm text-white font-mono whitespace-pre-wrap">
                              {quickRunResult.output}
                            </pre>
                          </div>
                        )}

                        {quickRunResult.stderr && (
                          <div>
                            <label className="text-xs text-red-400 mb-1 block">Error</label>
                            <pre className="px-3 py-2 bg-red-900/20 border border-red-500/30 rounded-lg text-sm text-red-300 font-mono whitespace-pre-wrap">
                              {quickRunResult.stderr}
                            </pre>
                          </div>
                        )}

                        <div className="flex items-center gap-4 text-xs text-gray-400">
                          {quickRunResult.time && (
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              Runtime: {quickRunResult.time}s
                            </span>
                          )}
                          {quickRunResult.memory && (
                            <span className="flex items-center gap-1">
                              <Zap className="w-3 h-3" />
                              Memory: {(quickRunResult.memory / 1024).toFixed(2)} MB
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Submission Results */}
                    {results && (
                      <div className="space-y-4">
                        {/* Status Banner */}
                        <div className={`flex items-center gap-3 p-4 rounded-lg ${
                          results.success
                            ? 'bg-[#2cbb5d]/10 border border-[#2cbb5d]/30'
                            : 'bg-[#ff375f]/10 border border-[#ff375f]/30'
                        }`}>
                          {results.success ? (
                            <CheckCircle className="w-8 h-8 text-[#2cbb5d]" />
                          ) : (
                            <XCircle className="w-8 h-8 text-[#ff375f]" />
                          )}
                          <div>
                            <p className={`text-lg font-bold ${results.success ? 'text-[#2cbb5d]' : 'text-[#ff375f]'}`}>
                              {results.success ? 'Accepted' : 'Wrong Answer'}
                            </p>
                            <p className="text-sm text-gray-400">
                              {results.passedCount} / {results.totalCount} testcases passed
                            </p>
                          </div>

                          {results.success && challenge && (
                            <div className="ml-auto flex items-center gap-2 px-3 py-2 bg-[#ffa116]/20 rounded-lg">
                              <Coins className="w-5 h-5 text-[#ffa116]" />
                              <span className="text-[#ffa116] font-bold">+{challenge.coinReward}</span>
                            </div>
                          )}
                        </div>

                        {/* Compilation Error */}
                        {results.compilationError && (
                          <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-4">
                            <p className="text-xs text-red-400 mb-2 font-medium">Compilation Error</p>
                            <pre className="text-sm text-red-300 font-mono whitespace-pre-wrap">
                              {results.compilationError}
                            </pre>
                          </div>
                        )}

                        {/* Individual Test Results */}
                        {results.results && results.results.length > 0 && (
                          <div className="grid grid-cols-5 gap-2">
                            {results.results.map((r: any, idx: number) => (
                              <div
                                key={idx}
                                className={`flex items-center justify-center gap-1 p-2 rounded-lg text-xs font-medium ${
                                  r.passed
                                    ? 'bg-emerald-900/20 text-emerald-400 border border-emerald-500/20'
                                    : 'bg-red-900/20 text-red-400 border border-red-500/20'
                                }`}
                              >
                                {r.passed ? (
                                  <CheckCircle className="w-3 h-3" />
                                ) : (
                                  <XCircle className="w-3 h-3" />
                                )}
                                <span>Case {r.testCase}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Empty State */}
                    {!quickRunResult && !results && (
                      <div className="flex flex-col items-center justify-center h-full text-gray-500">
                        <Terminal className="w-8 h-8 mb-2 opacity-50" />
                        <p className="text-sm">Run your code to see results</p>
                      </div>
                    )}
                  </div>
                ) : bottomTab === 'debugger' ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-medium text-white flex items-center gap-2">
                        <Eye className="w-4 h-4 text-[#ffa116]" />
                        Code Debugger
                      </h3>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={startTraceExecution}
                          disabled={isTracing || !code.trim()}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-[#ffa116]/30 to-[#ff6b00]/30 hover:from-[#ffa116]/40 hover:to-[#ff6b00]/40 text-white text-xs font-medium rounded-lg transition-all border border-[#ffa116]/30 disabled:opacity-50"
                        >
                          {isTracing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />}
                          {isTracing ? 'Tracing...' : '▶ Start Trace'}
                        </button>
                        <button
                          onClick={handleAiDebug}
                          disabled={isAiDebugging}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-purple-500/30 to-pink-500/30 hover:from-purple-500/40 hover:to-pink-500/40 text-white text-xs font-medium rounded-lg transition-all border border-purple-500/30 disabled:opacity-50"
                        >
                          {isAiDebugging ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                          {isAiDebugging ? 'Analyzing...' : '🔍 AI Debug'}
                        </button>
                      </div>
                    </div>

                    {/* Trace Error */}
                    {traceError && (
                      <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-3">
                        <p className="text-xs text-red-400">{traceError}</p>
                      </div>
                    )}

                    {/* AI Debug Result */}
                    {aiDebugResult && (
                      <div className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 rounded-lg p-4 border border-purple-500/30">
                        <h4 className="text-sm font-medium text-purple-400 mb-3 flex items-center gap-2">
                          <Sparkles className="w-4 h-4" />
                          AI Debug Analysis
                        </h4>
                        <div className="space-y-3 text-sm">
                          <div>
                            <span className="text-red-400 font-medium">Issue: </span>
                            <span className="text-gray-300">{aiDebugResult.issue}</span>
                          </div>
                          <div>
                            <span className="text-yellow-400 font-medium">Explanation: </span>
                            <span className="text-gray-300">{aiDebugResult.explanation}</span>
                          </div>
                          {aiDebugResult.suggestedFix && (
                            <div>
                              <span className="text-green-400 font-medium">Suggested Fix: </span>
                              <pre className="mt-1 p-2 bg-[#1e1e1e] rounded text-gray-300 text-xs overflow-auto whitespace-pre-wrap">{aiDebugResult.suggestedFix}</pre>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Step Through Section */}
                    {debuggerLines.length > 0 ? (
                      <div className="bg-[#282828] rounded-lg p-4 border border-gray-700">
                        <div className="flex items-center justify-between mb-4">
                          <p className="text-sm text-gray-400">
                            Step {debuggerStep + 1} of {debuggerLines.length}
                          </p>
                          {traceOutput && (
                            <span className="text-xs text-[#00b8a3] bg-[#00b8a3]/10 px-2 py-1 rounded">
                              Output: {traceOutput.trim().substring(0, 50)}{traceOutput.length > 50 ? '...' : ''}
                            </span>
                          )}
                        </div>

                      <div className="space-y-3">
                        {debuggerLines.map((line, idx) => (
                          <div
                            key={idx}
                            className={`flex items-center gap-3 p-3 bg-[#1e1e1e] rounded-lg transition-all ${
                              line.status === 'current' ? 'border-l-2 border-[#ffa116]' : ''
                            } ${line.status === 'pending' ? 'opacity-50' : ''}`}
                          >
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                              line.status === 'completed' ? 'bg-[#ffa116]/20 text-[#ffa116]' :
                              line.status === 'current' ? 'bg-[#ffa116] text-black' :
                              'bg-gray-700 text-gray-400'
                            }`}>
                              {idx + 1}
                            </div>
                            <code className={`text-sm font-mono ${
                              line.status === 'current' ? 'text-white' :
                              line.status === 'completed' ? 'text-gray-300' : 'text-gray-500'
                            }`}>
                              {line.code}
                            </code>
                            <span className={`ml-auto text-xs px-2 py-0.5 rounded ${
                              line.status === 'completed' ? 'text-[#00b8a3] bg-[#00b8a3]/10' :
                              line.status === 'current' ? 'text-[#ffc01e] bg-[#ffc01e]/10' : 'hidden'
                            }`}>
                              {line.status === 'completed' ? 'completed' : line.status === 'current' ? 'executing...' : ''}
                            </span>
                          </div>
                        ))}
                      </div>

                      <div className="flex items-center gap-2 mt-4">
                        <button
                          onClick={debuggerReset}
                          className="flex-1 py-2 bg-[#2d2d2d] hover:bg-[#3d3d3d] text-gray-300 text-xs font-medium rounded transition-colors"
                        >
                          ⏮ Reset
                        </button>
                        <button
                          onClick={debuggerPrev}
                          disabled={debuggerStep === 0}
                          className="flex-1 py-2 bg-[#2d2d2d] hover:bg-[#3d3d3d] text-gray-300 text-xs font-medium rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          ◀ Prev
                        </button>
                        <button
                          onClick={debuggerNext}
                          disabled={debuggerStep === debuggerLines.length - 1}
                          className="flex-1 py-2 bg-[#ffa116] hover:bg-[#ffb340] text-black text-xs font-medium rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          ▶ Next
                        </button>
                        <button
                          onClick={debuggerEnd}
                          className="flex-1 py-2 bg-[#2d2d2d] hover:bg-[#3d3d3d] text-gray-300 text-xs font-medium rounded transition-colors"
                        >
                          ⏭ End
                        </button>
                      </div>
                    </div>
                    ) : (
                      /* Empty State - No trace yet */
                      <div className="bg-[#282828] rounded-lg p-8 border border-gray-700 text-center">
                        <Eye className="w-10 h-10 mx-auto mb-3 text-gray-500 opacity-50" />
                        <p className="text-sm text-gray-400 mb-2">Step-Through Debugger</p>
                        <p className="text-xs text-gray-500 mb-4">
                          Click "Start Trace" to execute your code line-by-line and see variable values at each step.
                        </p>
                        <button
                          onClick={startTraceExecution}
                          disabled={isTracing || !code.trim()}
                          className="inline-flex items-center gap-2 px-4 py-2 bg-[#ffa116] hover:bg-[#ffb340] text-black text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
                        >
                          {isTracing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                          {isTracing ? 'Tracing...' : 'Start Trace'}
                        </button>
                      </div>
                    )}

                    {/* Variable Watch - only show when we have trace data */}
                    {debuggerVariables.length > 0 && (
                    <div className="bg-[#282828] rounded-lg p-4 border border-gray-700">
                      <h4 className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                        <span>Variables</span>
                        <span className="text-[#ffa116]">@ Step {debuggerStep + 1}</span>
                      </h4>
                      <div className="space-y-2">
                        {debuggerVariables.map((variable, idx) => (
                          <div key={idx} className="flex items-center justify-between text-sm p-2 bg-[#1e1e1e] rounded">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-purple-400">{variable.name}</span>
                              <span className="text-xs text-gray-500">({variable.type})</span>
                            </div>
                            <span className={`font-mono ${variable.value === 'undefined' || variable.value === '-' ? 'text-[#ffc01e]' : 'text-[#00b8a3]'}`}>
                              {variable.value}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                    )}

                    {/* Trace Output */}
                    {traceOutput && (
                      <div className="bg-[#282828] rounded-lg p-4 border border-gray-700">
                        <h4 className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-3">Program Output</h4>
                        <pre className="text-sm text-[#00b8a3] font-mono bg-[#1e1e1e] p-3 rounded overflow-auto max-h-32">
                          {traceOutput}
                        </pre>
                      </div>
                    )}
                  </div>
                ) : bottomTab === 'ai-review' ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-medium text-white flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-purple-400" />
                        AI Code Review
                      </h3>
                      <button
                        onClick={analyzeCode}
                        disabled={isAiAnalyzing}
                        className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-purple-500/30 to-pink-500/30 hover:from-purple-500/40 hover:to-pink-500/40 text-white text-xs font-medium rounded-lg transition-all border border-purple-500/30"
                      >
                        {isAiAnalyzing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                        {isAiAnalyzing ? 'Analyzing...' : '✨ Analyze Code'}
                      </button>
                    </div>

                    {aiAnalysis ? (
                      <div className="space-y-4">
                        {/* Complexity Cards */}
                        {codeComplexity && (
                          <div className="grid grid-cols-2 gap-3">
                            <div className="bg-gradient-to-br from-[#00b8a3]/10 to-[#00b8a3]/5 rounded-lg p-4 border border-[#00b8a3]/20">
                              <div className="flex items-center gap-2 mb-1">
                                <TrendingUp className="w-4 h-4 text-[#00b8a3]" />
                                <span className="text-xs text-gray-400">Time Complexity</span>
                              </div>
                              <div className="text-xl font-mono font-bold text-[#00b8a3]">{codeComplexity.time}</div>
                            </div>
                            <div className="bg-gradient-to-br from-[#ffc01e]/10 to-[#ffc01e]/5 rounded-lg p-4 border border-[#ffc01e]/20">
                              <div className="flex items-center gap-2 mb-1">
                                <BarChart3 className="w-4 h-4 text-[#ffc01e]" />
                                <span className="text-xs text-gray-400">Space Complexity</span>
                              </div>
                              <div className="text-xl font-mono font-bold text-[#ffc01e]">{codeComplexity.space}</div>
                            </div>
                          </div>
                        )}

                        {/* Analysis Content */}
                        <div className="bg-[#282828] rounded-lg p-4 border border-gray-700">
                          <div className="prose prose-invert prose-sm max-w-none text-gray-300 whitespace-pre-wrap">
                            {aiAnalysis}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-8 text-gray-500">
                        <div className="relative mb-4">
                          <Brain className="w-12 h-12 text-purple-400/30" />
                          <Sparkles className="w-5 h-5 text-purple-400 absolute -top-1 -right-1" />
                        </div>
                        <p className="text-sm mb-2 text-white">Get AI-powered code review</p>
                        <p className="text-xs text-gray-500 mb-4 text-center">Analyze complexity, find issues, and get optimization tips</p>
                        <button
                          onClick={analyzeCode}
                          disabled={isAiAnalyzing}
                          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white text-sm font-medium rounded-lg transition-all"
                        >
                          {isAiAnalyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                          {isAiAnalyzing ? 'Analyzing...' : 'Start Analysis'}
                        </button>
                      </div>
                    )}
                  </div>
                ) : null}
              </div>
            </div>
          )}

          {/* Console Toggle (when hidden) */}
          {!showConsole && (
            <button
              onClick={() => setShowConsole(true)}
              className="flex items-center gap-2 px-4 py-2 border-t border-gray-800 bg-[#282828] text-gray-400 hover:text-white text-sm transition-colors"
            >
              <Terminal className="w-4 h-4" />
              Console
            </button>
          )}
        </div>
      </div>

      {/* Styles for problem statement */}
      <style>{`
        .prose p {
          margin-bottom: 1rem;
          line-height: 1.75;
        }
        .prose pre {
          background: #282828;
          padding: 1rem;
          border-radius: 0.5rem;
          overflow-x: auto;
          margin: 1rem 0;
        }
        .prose code {
          background: #282828;
          padding: 0.25rem 0.5rem;
          border-radius: 0.25rem;
          font-size: 0.875rem;
        }
      `}</style>
    </div>
  );
};

export default ChallengeEditor;
