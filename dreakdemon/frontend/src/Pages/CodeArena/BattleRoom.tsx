import Editor from '@monaco-editor/react';
import { AnimatePresence, motion } from 'framer-motion';
import {
    CheckCircle,
    ChevronDown,
    Clock,
    Code2,
    DoorOpen,
    Loader2,
    Play,
    Send,
    Shield,
    Trophy,
    XCircle
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../Context/AuthContext';
import { useBattleGuard } from '../../Context/BattleGuardContext';
import { useDataContext } from '../../Context/UserDataContext';
import { SecurityError, ValidationError } from '../../middleware/inputValidator';
import { apiRequest } from '../../service/api';
import { type Challenge } from '../../service/challenges';
import {
    getPistonSupportedLanguages,
    quickRunPiston,
    type PistonBattleSubmissionResult
} from '../../service/codeExecution';

interface BattleSubmissionResult {
  success: boolean;
  passed?: boolean;
  output?: string;
  status: string;
  time?: string;
  memory?: string;
  error?: string;
  executionTime?: number;
  passedCount?: number;
  totalCount?: number;
  totalTime?: number;
}

interface Participant {
  odId: string;
  odName: string;
  odProfilePic: string;
  rating: number;
  hasSubmitted: boolean;
  submissionResult?: PistonBattleSubmissionResult;
}

interface Battle {
  id: string;
  status: 'waiting' | 'countdown' | 'active' | 'completed' | 'forfeited';
  participants: Participant[];
  challenge: {
    id: string;
    title: string;
    difficulty: string;
    category: string;
    coinReward: number;
    description?: string;
    testCases?: Array<any>;
    test_cases?: Array<any>;
  };
  difficulty: string;
  entryFee: number;
  prize: number;
  timeLimit: number; // in seconds
  startTime?: string;
  endTime?: string;
  winnerId?: string;
  winReason?: string;
  forfeitedBy?: string;
}

const BattleRoom = () => {
  const { battleId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  useDataContext();
  const { setBattleActive } = useBattleGuard();

  const [battle, setBattle] = useState<Battle | null>(null);
  const [loading, setLoading] = useState(true);
  const [countdown, setCountdown] = useState(5);
  const [timeLeft, setTimeLeft] = useState(0);

  // Challenge state
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [testCases, setTestCases] = useState<{ input: string; output: string }[]>([]);

  // Editor state
  const [code, setCode] = useState('');
  const [language, setLanguage] = useState('python');
  const [showLanguageMenu, setShowLanguageMenu] = useState(false);

  // Submission state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [quickRunResult, setQuickRunResult] = useState<{ output: string; error: string | null; time: string | null; status: string } | null>(null);

  // Set battle guard context when battle is active or in countdown
  useEffect(() => {
    if ((battle?.status === 'active' || battle?.status === 'countdown') && !hasSubmitted && battleId) {
      setBattleActive(true, battleId);
    } else {
      setBattleActive(false, null);
    }
    // Clean up on unmount
    return () => setBattleActive(false, null);
  }, [battle?.status, hasSubmitted, setBattleActive, battleId]);
  const [myResult, setMyResult] = useState<BattleSubmissionResult | null>(null);
  const [isLeaving, setIsLeaving] = useState(false);
  const [opponentLeft, setOpponentLeft] = useState(false);
  const [showTabWarning, setShowTabWarning] = useState(false);
  const [tabSwitchCount, setTabSwitchCount] = useState(0);
  // @ts-ignore - botProgress used internally by setBotProgress polling
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [botProgress, setBotProgress] = useState(0);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const codeRef = useRef(code); // Keep track of latest code for auto-submit
  const testCasesRef = useRef(testCases); // Keep track of test cases for auto-submit
  const isSubmittingRef = useRef(false); // Prevent duplicate submissions
  const audioCtxRef = useRef<AudioContext | null>(null);
  const languages = getPistonSupportedLanguages();

  // Warn user before closing/refreshing page during active battle
  useEffect(() => {
    if (battle?.status !== 'active' || hasSubmitted) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = 'You are in an active battle! Leaving will cause you to lose. Are you sure?';
      return e.returnValue;
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [battle?.status, hasSubmitted]);

  // Gamer-style beep sound for countdown (3, 2, 1, GO!)
  const playBeep = useCallback((count: number) => {
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioCtxRef.current;
      const now = ctx.currentTime;

      if (count === 0) {
        // GO! - Epic esports victory fanfare with multiple oscillators
        const freqs = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6 - Major chord arpeggio
        freqs.forEach((freq, i) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.type = 'square';
          osc.frequency.setValueAtTime(freq, now + i * 0.05);
          gain.gain.setValueAtTime(0, now);
          gain.gain.linearRampToValueAtTime(0.15, now + i * 0.05);
          gain.gain.linearRampToValueAtTime(0.15, now + i * 0.05 + 0.15);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
          osc.start(now + i * 0.05);
          osc.stop(now + 0.6);
        });
        // Add power bass hit
        const bass = ctx.createOscillator();
        const bassGain = ctx.createGain();
        bass.connect(bassGain);
        bassGain.connect(ctx.destination);
        bass.type = 'sawtooth';
        bass.frequency.setValueAtTime(130.81, now); // C3
        bass.frequency.exponentialRampToValueAtTime(65.41, now + 0.2); // Drop to C2
        bassGain.gain.setValueAtTime(0.25, now);
        bassGain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
        bass.start(now);
        bass.stop(now + 0.4);
      } else {
        // 5, 4, 3, 2, 1 - Retro arcade blip with increasing pitch
        const baseFreq = count === 5 ? 262 : count === 4 ? 294 : count === 3 ? 330 : count === 2 ? 440 : 587; // C4, D4, E4, A4, D5

        // Main blip
        const osc1 = ctx.createOscillator();
        const gain1 = ctx.createGain();
        osc1.connect(gain1);
        gain1.connect(ctx.destination);
        osc1.type = 'square';
        osc1.frequency.setValueAtTime(baseFreq * 2, now);
        osc1.frequency.exponentialRampToValueAtTime(baseFreq, now + 0.08);
        gain1.gain.setValueAtTime(0.2, now);
        gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
        osc1.start(now);
        osc1.stop(now + 0.15);

        // Sub punch
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(baseFreq / 2, now);
        gain2.gain.setValueAtTime(0.15, now);
        gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
        osc2.start(now);
        osc2.stop(now + 0.12);
      }
    } catch (e) {
      console.log('Audio not supported');
    }
  }, []);

  // Update refs when values change
  useEffect(() => {
    codeRef.current = code;
  }, [code]);

  useEffect(() => {
    testCasesRef.current = testCases;
  }, [testCases]);

  const defaultCode: { [key: string]: string } = {
    python: `# Battle Mode - Write your solution fast!
def solve():
    n = int(input())
    # Your code here
    print(result)

solve()`,
    cpp: `#include <bits/stdc++.h>
using namespace std;

int main() {
    ios_base::sync_with_stdio(false);
    cin.tie(NULL);
    int n;
    cin >> n;
    // Your code here
    cout << result << endl;
    return 0;
}`,
    java: `import java.util.*;

public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        int n = sc.nextInt();
        // Your code here
        System.out.println(result);
    }
}`,
    javascript: `const readline = require('readline');
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

let lines = [];
rl.on('line', (line) => lines.push(line));
rl.on('close', () => {
    const n = parseInt(lines[0]);
    // Your code here
    console.log(result);
});`,
  };

  // LocalStorage key for saving code
  const getStorageKey = useCallback(() => `battle_code_${battleId}`, [battleId]);
  const getLanguageStorageKey = useCallback(() => `battle_language_${battleId}`, [battleId]);

  // Restore code from localStorage on mount (for page refresh)
  useEffect(() => {
    if (!battleId) return;

    const savedCode = localStorage.getItem(getStorageKey());
    const savedLanguage = localStorage.getItem(getLanguageStorageKey());

    if (savedCode) {
      console.log('Restoring code from localStorage');
      setCode(savedCode);
    }
    if (savedLanguage && ['python', 'cpp', 'java', 'javascript'].includes(savedLanguage)) {
      setLanguage(savedLanguage);
    }
  }, [battleId, getStorageKey, getLanguageStorageKey]);

  // Auto-save code to localStorage every 2 seconds
  useEffect(() => {
    if (!battleId || hasSubmitted) return;

    const saveInterval = setInterval(() => {
      localStorage.setItem(getStorageKey(), code);
      localStorage.setItem(getLanguageStorageKey(), language);
    }, 2000);

    return () => clearInterval(saveInterval);
  }, [battleId, code, language, hasSubmitted, getStorageKey, getLanguageStorageKey]);

  // Clear localStorage when battle is completed or submitted
  useEffect(() => {
    if (hasSubmitted && battleId) {
      localStorage.removeItem(getStorageKey());
      localStorage.removeItem(getLanguageStorageKey());
    }
  }, [hasSubmitted, battleId, getStorageKey, getLanguageStorageKey]);

  // Tab switch / visibility change detection - warn and forfeit if they leave
  useEffect(() => {
    if (!battleId || !user || battle?.status !== 'active' || hasSubmitted) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        // User switched tab or minimized window
        setTabSwitchCount(prev => prev + 1);
        setShowTabWarning(true);
      }
    };

    const handleWindowBlur = () => {
      // User clicked outside the window
      if (battle?.status === 'active' && !hasSubmitted) {
        setTabSwitchCount(prev => prev + 1);
        setShowTabWarning(true);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
    };
  }, [battleId, user, battle?.status, hasSubmitted]);

  // Auto-forfeit after 3 tab switches
  useEffect(() => {
    if (tabSwitchCount >= 3 && battle?.status === 'active' && !hasSubmitted) {
      // Forfeit the battle
      const forfeitBattle = async () => {
        try {
          await apiRequest(`/battles/${battleId}/forfeit`, { method: 'POST' });
          navigate(`/dashboard/codearena/battle/results/${battleId}`);
        } catch (error) {
          console.error('Error forfeiting battle:', error);
        }
      };
      forfeitBattle();
    }
  }, [tabSwitchCount, battle?.status, hasSubmitted, battleId, navigate]);

  // Poll bot progress for bot battles
  useEffect(() => {
    if (!battleId || !battle || battle.status !== 'active') return;

    // Check if this is a bot battle (opponent has bot_ prefix)
    const opponent = battle.participants.find(p => p.odId !== user?.id);
    if (!opponent?.odId?.startsWith('bot_') || opponent?.hasSubmitted) return;

    const pollBotProgress = async () => {
      try {
        const response = await apiRequest(`/battles/${battleId}/bot-progress`);
        if (response.isBot && typeof response.progress === 'number') {
          setBotProgress(response.progress);
        }
      } catch (err) {
        // Silently ignore bot progress errors
      }
    };

    pollBotProgress();
    const interval = setInterval(pollBotProgress, 3000);
    return () => clearInterval(interval);
  }, [battleId, battle?.status, battle?.participants, user?.id]);

  // Subscribe to battle updates
  useEffect(() => {
    if (!battleId || !user) return;

    const fetchBattleData = async () => {
      try {
        const battleData = await apiRequest(`/battles/${battleId}`);
        if (!battleData) {
          navigate('/dashboard/codearena');
          return;
        }
        setBattle(battleData);

        // If challenge is from questions.json, use its data directly
        if (battleData.challenge && !challenge) {
          if (
            battleData.challenge.description &&
            (Array.isArray(battleData.challenge.testCases) || Array.isArray(battleData.challenge.test_cases))
          ) {
            setChallenge(battleData.challenge as any);
            // Prefer testCases, fallback to test_cases - normalize all output field names
            const rawCases = (battleData.challenge.testCases && battleData.challenge.testCases.length > 0)
              ? battleData.challenge.testCases
              : (battleData.challenge.test_cases || []);
            const cases = rawCases.map((tc: any) => ({
              input: tc.input || '',
              output: tc.expectedOutput || tc.expected_output || tc.output || ''
            }));
            console.log('BattleRoom: Loaded test cases:', cases.length);
            setTestCases(cases);
          }
        }

        // Check if current user has already submitted
        const me = battleData.participants.find((p: Participant) => p.odId === user?.id);
        if (me?.hasSubmitted && !hasSubmitted) {
          setHasSubmitted(true);
          if (me.submissionResult) {
            // Convert PistonBattleResult to local BattleSubmissionResult for UI
            setMyResult({
              success: me.submissionResult.passed,
              passed: me.submissionResult.passed,
              status: me.submissionResult.passed ? 'Accepted' : 'Wrong Answer',
              passedCount: me.submissionResult.passedCount,
              totalCount: me.submissionResult.totalCount,
              totalTime: me.submissionResult.totalTime,
              executionTime: me.submissionResult.totalTime
            });
          }
        }

        // Check if opponent forfeited/left
        if (battleData.forfeitedBy && battleData.forfeitedBy !== user?.id) {
          setOpponentLeft(true);
        }

        // Check if battle is completed or forfeited
        if (battleData.status === 'completed' || battleData.status === 'forfeited') {
          navigate(`/dashboard/codearena/battle/results/${battleId}`);
        }

        setLoading(false);
      } catch (error) {
        console.error("Failed to fetch battle data", error);
        navigate('/dashboard/codearena');
      }
    };

    fetchBattleData(); // Initial fetch
    const intervalId = setInterval(fetchBattleData, 3000); // Poll every 3 seconds for faster updates

    return () => clearInterval(intervalId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [battleId, user, hasSubmitted, challenge]);

  // Handle page close/refresh - auto-submit the code
  useEffect(() => {
    const handleBeforeUnload = async (e: BeforeUnloadEvent) => {
      if (battle?.status === 'active' && !hasSubmitted && !isSubmittingRef.current) {
        // Save the latest code to localStorage before refresh
        if (battleId) {
          localStorage.setItem(getStorageKey(), codeRef.current);
          localStorage.setItem(getLanguageStorageKey(), language);
          // Set a flag to auto-submit on next load
          localStorage.setItem(`battle_autosubmit_${battleId}`, 'true');
        }

        e.preventDefault();
        e.returnValue = 'Your code will be auto-submitted when you return. Continue?';
        return e.returnValue;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [battle?.status, battleId, hasSubmitted, language, getStorageKey, getLanguageStorageKey]);

  // Auto-submit if user refreshed during active battle
  useEffect(() => {
    if (!battleId || !user || !battle || hasSubmitted || isSubmittingRef.current) return;

    const shouldAutoSubmit = localStorage.getItem(`battle_autosubmit_${battleId}`);

    if (shouldAutoSubmit === 'true' && battle.status === 'active' && testCasesRef.current.length > 0) {
      console.log('Auto-submitting code after page refresh...');
      localStorage.removeItem(`battle_autosubmit_${battleId}`);

      // Small delay to ensure everything is loaded
      const autoSubmitTimer = setTimeout(() => {
        if (!hasSubmitted && !isSubmittingRef.current) {
          handleSubmit();
        }
      }, 1000);

      return () => clearTimeout(autoSubmitTimer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [battleId, user, battle?.status, hasSubmitted, testCases.length]);

  // Countdown timer with beep sounds
  useEffect(() => {
    if (battle?.status === 'countdown') {
      if (countdown > 0) {
        playBeep(countdown); // Play beep for 3, 2, 1
        // Medium speed countdown - 1.2 seconds per number
        const timer = setTimeout(() => setCountdown(countdown - 1), 1200);
        return () => clearTimeout(timer);
      } else if (countdown === 0) {
        playBeep(0); // Play GO! beep
        // Show "FIGHT!" for 1.5 seconds, then start the battle
        const timer = setTimeout(async () => {
          if (battleId) {
            await apiRequest(`/battles/${battleId}/start`, { method: 'POST' });
          }
        }, 1500);
        return () => clearTimeout(timer);
      }
    }
  }, [battle?.status, countdown, battleId, playBeep]);

  // Reset countdown when battle status changes to countdown
  useEffect(() => {
    if (battle?.status === 'countdown') {
      setCountdown(5); // Start from 5 for better preparation
    }
  }, [battle?.status]);

  // Battle timer
  useEffect(() => {
    if (battle?.status === 'active' && battle.startTime) {
      const startTime = new Date(battle.startTime).getTime();
      const duration = battle.timeLimit * 1000;

      timerRef.current = setInterval(() => {
        const now = Date.now();
        const elapsed = now - startTime;
        const remaining = Math.max(0, duration - elapsed);
        setTimeLeft(Math.ceil(remaining / 1000));

        if (remaining <= 0) {
          if (timerRef.current) clearInterval(timerRef.current);
          handleTimeUp();
        }
      }, 1000);

      return () => {
        if (timerRef.current) clearInterval(timerRef.current);
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [battle?.status, battle?.startTime, battle?.timeLimit]);

  // Set default code
  useEffect(() => {
    setCode(defaultCode[language] || defaultCode.python);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [language]);

  const handleTimeUp = async () => {
    // If user hasn't submitted, auto-submit
    if (!hasSubmitted && battle) {
      await handleSubmit();
    }
  };

  // Handle leaving/forfeiting the battle
  const handleLeaveBattle = async () => {
    if (!user || !battle || !battleId || isLeaving) return;

    const message = '⚠️ Are you sure you want to leave?\n\nLeaving will forfeit the match and your opponent will win the prize!';

    const confirmLeave = window.confirm(message);
    if (!confirmLeave) return;

    setIsLeaving(true);

    try {
      await apiRequest(`/battles/${battleId}/forfeit`, { method: 'POST' });
      navigate('/dashboard/codearena');
    } catch (error) {
      console.error('Error forfeiting battle:', error);
      alert('Failed to leave battle. Please try again.');
      setIsLeaving(false);
    }
  };

  const handleSubmit = async () => {
    if (!user || !battle || isSubmitting || hasSubmitted || !battleId || isSubmittingRef.current) return;

    // Check if we have test cases
    if (!testCases || testCases.length === 0) {
      console.error('BattleRoom: No test cases available for submission');
      // Try to reload test cases from battle data
      try {
        const battleData = await apiRequest(`/battles/${battleId}`);
        if (battleData?.challenge) {
          const rawCases = battleData.challenge.testCases || battleData.challenge.test_cases || [];
          if (rawCases.length > 0) {
            const cases = rawCases.map((tc: any) => ({
              input: tc.input || '',
              output: tc.expectedOutput || tc.expected_output || tc.output || ''
            }));
            setTestCases(cases);
            console.log('BattleRoom: Reloaded test cases:', cases.length);
            // Continue with submission after reloading
          } else {
            setMyResult({
              success: false,
              passed: false,
              status: 'Error',
              error: 'No test cases available. Please try refreshing the page.',
              passedCount: 0,
              totalCount: 0,
              totalTime: 0,
              executionTime: 0
            });
            return;
          }
        }
      } catch (err) {
        console.error('BattleRoom: Failed to reload test cases:', err);
        setMyResult({
          success: false,
          passed: false,
          status: 'Error',
          error: 'Failed to load test cases. Please try refreshing the page.',
          passedCount: 0,
          totalCount: 0,
          totalTime: 0,
          executionTime: 0
        });
        return;
      }
    }

    isSubmittingRef.current = true;
    setIsSubmitting(true);

    // Clear the auto-submit flag
    localStorage.removeItem(`battle_autosubmit_${battleId}`);

    try {
      // Submit code to our backend
      const submissionResult = await apiRequest(`/battles/${battleId}/submit`, {
        method: 'POST',
        body: JSON.stringify({
          code,
          language,
        }),
      });

      // Update UI with results
      setMyResult({
        success: submissionResult.passed,
        passed: submissionResult.passed,
        status: submissionResult.passed ? 'Accepted' : 'Wrong Answer',
        passedCount: submissionResult.passedCount,
        totalCount: submissionResult.totalCount,
        totalTime: submissionResult.totalTime,
        executionTime: submissionResult.totalTime
      });
      setHasSubmitted(true);

    } catch (error: unknown) {
      console.error('Battle submission error:', error);

      let errorMessage = 'Submission failed. Please try again.';
      if (error instanceof SecurityError) {
        errorMessage = `Security Error: ${error.message}`;
      } else if (error instanceof ValidationError) {
        errorMessage = `Validation Error: ${error.message}`;
      } else if (error instanceof Error) {
        // Check for common API errors
        if (error.message.includes('API request failed')) {
          errorMessage = '⚠️ Code execution service temporarily unavailable. Please try again.';
        } else if (error.message.includes('429') || error.message.includes('Too Many Requests')) {
          errorMessage = '⏳ Too many submissions. Please wait a moment and try again.';
        } else {
          errorMessage = error.message;
        }
      }

      // Set error result with message (no alert popup)
      setMyResult({
        success: false,
        passed: false,
        status: 'Error',
        error: errorMessage,
        passedCount: 0,
        totalCount: testCases.length,
        totalTime: 0,
        executionTime: 0
      });
    }

    setIsSubmitting(false);
    isSubmittingRef.current = false;

    // Clear saved code from localStorage after successful submission
    if (battleId) {
      localStorage.removeItem(getStorageKey());
      localStorage.removeItem(getLanguageStorageKey());
    }
  };

  // Quick run to test code with first test case
  const handleRun = async () => {
    if (!code || isRunning || hasSubmitted) return;

    setIsRunning(true);
    setQuickRunResult(null);

    try {
      // Get first test case input
      const input = testCases.length > 0 ? testCases[0].input : '';

      const result = await quickRunPiston(code, language, input);
      setQuickRunResult(result);
    } catch (error: any) {
      setQuickRunResult({
        output: '',
        error: error?.message || 'Failed to run code. Please try again.',
        time: null,
        status: 'Error'
      });
    }

    setIsRunning(false);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getOpponent = () => {
    return battle?.participants.find(p => p.odId !== user?.id);
  };

  const getMe = () => {
    return battle?.participants.find(p => p.odId === user?.id);
  };

  // Debug logging
  console.log('Battle status:', battle?.status, 'Countdown:', countdown, 'Loading:', loading);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-16 h-16 text-cyan-400 animate-spin mx-auto mb-4" />
          <p className="text-white text-lg">Loading battle...</p>
        </div>
      </div>
    );
  }

  // Countdown overlay
  if (battle?.status === 'countdown' && countdown >= 0) {
    console.log('Showing countdown overlay!', countdown);
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center relative overflow-hidden">
        {/* Animated background particles */}
        <div className="absolute inset-0 overflow-hidden">
          {[...Array(20)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-2 h-2 bg-cyan-400/30 rounded-full"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`
              }}
              animate={{
                y: [0, -200],
                scale: [0, 1, 0],
                opacity: [0, 1, 0]
              }}
              transition={{
                duration: 3 + Math.random() * 2,
                repeat: Infinity,
                delay: i * 0.1
              }}
            />
          ))}
        </div>

        {/* Pulsing rings background */}
        <motion.div
          className="absolute inset-0 flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          {[1, 2, 3].map((ring) => (
            <motion.div
              key={ring}
              className="absolute border-2 border-cyan-500/20 rounded-full"
              style={{ width: ring * 200, height: ring * 200 }}
              animate={{
                scale: [1, 1.5, 1],
                opacity: [0.3, 0.1, 0.3]
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                delay: ring * 0.3
              }}
            />
          ))}
        </motion.div>

        {/* Background gradient animation - stable, no shrinking */}
        <motion.div
          className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 via-purple-500/10 to-[#00d4ff]/10"
          animate={{
            opacity: [0.3, 0.5, 0.3]
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />

        <AnimatePresence mode="wait">
          <motion.div
            key={countdown}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{
              duration: 0.3
            }}
            className="text-center z-10"
          >
            {/* Battle Arena Title */}
            <motion.div
              initial={{ y: -50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="mb-6"
            >
              <motion.div
                animate={{
                  textShadow: [
                    "0 0 20px rgba(0, 173, 181, 0.5)",
                    "0 0 40px rgba(0, 173, 181, 0.8)",
                    "0 0 20px rgba(0, 173, 181, 0.5)"
                  ]
                }}
                transition={{ duration: 1.5, repeat: Infinity }}
                className="text-2xl font-bold text-cyan-400 tracking-widest"
              >
                ⚔️ BATTLE ARENA ⚔️
              </motion.div>
            </motion.div>

            {/* Players info with VS animation */}
            <div className="flex items-center justify-center gap-8 mb-8">
              <motion.div
                className="text-center"
                initial={{ x: -100, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
              >
                <motion.div
                  className="w-20 h-20 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center mb-2 shadow-lg shadow-cyan-500/50"
                  animate={{
                    boxShadow: [
                      "0 0 20px rgba(0, 173, 181, 0.5)",
                      "0 0 40px rgba(0, 173, 181, 0.8)",
                      "0 0 20px rgba(0, 173, 181, 0.5)"
                    ]
                  }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                >
                  <span className="text-white font-bold text-2xl">
                    {battle.participants[0]?.odName?.charAt(0) || ''}
                  </span>
                </motion.div>
                <p className="text-cyan-400 font-semibold">{battle.participants[0]?.odName}</p>
                <p className="text-gray-500 text-xs">Rating: {battle.participants[0]?.rating || 1000}</p>
              </motion.div>

              <motion.div
                className="text-cyan-400 text-5xl font-black"
                animate={{
                  scale: [1, 1.2, 1],
                  rotate: [0, 5, -5, 0],
                  textShadow: [
                    "0 0 30px rgba(255, 0, 0, 0.5)",
                    "0 0 60px rgba(255, 0, 0, 0.8)",
                    "0 0 30px rgba(255, 0, 0, 0.5)"
                  ]
                }}
                transition={{ duration: 1, repeat: Infinity }}
                style={{
                  background: "linear-gradient(to right, #00ADB5, #ff4444, #00ADB5)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent"
                }}
              >
                VS
              </motion.div>

              <motion.div
                className="text-center"
                initial={{ x: 100, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
              >
                <motion.div
                  className="w-20 h-20 rounded-full bg-gradient-to-br from-red-400 to-orange-500 flex items-center justify-center mb-2 shadow-lg shadow-red-500/50"
                  animate={{
                    boxShadow: [
                      "0 0 20px rgba(239, 68, 68, 0.5)",
                      "0 0 40px rgba(239, 68, 68, 0.8)",
                      "0 0 20px rgba(239, 68, 68, 0.5)"
                    ]
                  }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                >
                  <span className="text-white font-bold text-2xl">
                    {battle.participants[1]?.odName?.charAt(0) || ''}
                  </span>
                </motion.div>
                <p className="text-red-400 font-semibold">{battle.participants[1]?.odName}</p>
                <p className="text-gray-500 text-xs">Rating: {battle.participants[1]?.rating || 1000}</p>
              </motion.div>
            </div>

            <motion.p
              className="text-gray-400 text-xl mb-6"
            >
              {countdown > 0 ? 'Battle starts in' : ''}
            </motion.p>

            {/* Countdown number with blink animation */}
            <motion.div
              key={`countdown-${countdown}`}
              initial={{ opacity: 0.3 }}
              animate={{
                opacity: [0.3, 1, 0.3, 1],
                color: countdown === 0 ? "#22c55e" : countdown === 1 ? "#ef4444" : countdown === 2 ? "#f59e0b" : "#06b6d4"
              }}
              transition={{
                opacity: { duration: 1, times: [0, 0.3, 0.6, 1] },
                color: { duration: 0.3 }
              }}
              className="text-9xl font-black mb-6"
              style={{
                textShadow: "0 0 50px currentColor, 0 0 100px currentColor",
                filter: "drop-shadow(0 0 30px currentColor)"
              }}
            >
              {countdown === 0 ? '⚔️ FIGHT! ⚔️' : countdown}
            </motion.div>

            {/* Screen flash effect on FIGHT */}
            {countdown === 0 && (
              <motion.div
                className="absolute inset-0 bg-white pointer-events-none"
                initial={{ opacity: 0.8 }}
                animate={{ opacity: 0 }}
                transition={{ duration: 0.5 }}
              />
            )}

            <motion.p
              className="text-gray-400 text-lg"
            >
              {countdown === 0 ? '🔥 Show your coding skills! 🔥' : '⚡ Get ready to code!'}
            </motion.p>

            {/* Prize pool display */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="mt-8 flex items-center justify-center gap-2 text-yellow-400"
            >
              <Trophy className="w-5 h-5" />
              <span className="font-bold">Prize: {battle.prize} coins</span>
            </motion.div>
          </motion.div>
        </AnimatePresence>
      </div>
    );
  }

  const opponent = getOpponent();
  const me = getMe();

  return (
    <div className="h-screen bg-gray-900 flex flex-col overflow-hidden -mx-4 -mt-6">
      {/* Battle Header */}
      <header className="bg-gray-800 border-b border-gray-700 px-4 py-3">
        <div className="flex items-center justify-between">
          {/* Left - Me */}
          <div className="flex items-center gap-3">
            <img
              src={me?.odProfilePic || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.id}`}
              alt="You"
              className="w-10 h-10 rounded-full border-2 border-cyan-400"
            />
            <div>
              <p className="text-white font-medium">{me?.odName || 'You'}</p>
              <p className="text-xs text-gray-400">Rating: {me?.rating || 1000}</p>
            </div>
            {me?.hasSubmitted && (
              <CheckCircle className="w-5 h-5 text-green-400" />
            )}
          </div>

          {/* Center - Timer & Problem */}
          <div className="text-center">
            <div className={`text-3xl font-bold ${timeLeft <= 60 ? 'text-red-400 animate-pulse' : 'text-white'}`}>
              {formatTime(timeLeft)}
            </div>
            <p className="text-sm text-gray-400 mt-1">
              {battle?.challenge?.title || 'Loading challenge...'}
            </p>
          </div>

          {/* Right - Opponent */}
          <div className="flex items-center gap-3">
            {opponent?.hasSubmitted && (
              <CheckCircle className="w-5 h-5 text-green-400" />
            )}
            <div className="text-right">
              <div className="flex items-center gap-1 justify-end">
                <p className="text-white font-medium">{opponent?.odName || 'Opponent'}</p>
              </div>
              <p className="text-xs text-gray-400">Rating: {opponent?.rating || 1000}</p>
            </div>
            <img
              src={opponent?.odProfilePic || `https://api.dicebear.com/7.x/avataaars/svg?seed=${opponent?.odId}`}
              alt="Opponent"
              className="w-10 h-10 rounded-full border-2 border-red-400"
            />
          </div>
        </div>

        {/* Prize Pool */}
        <div className="flex justify-center mt-2 gap-4">
          <div className="flex items-center gap-2 px-4 py-1 bg-yellow-500/20 border border-yellow-500/30 rounded-full">
            <Trophy className="w-4 h-4 text-yellow-400" />
            <span className="text-yellow-400 font-bold">{battle?.prize || 0} coins</span>
          </div>

          <div className="flex items-center gap-2 px-3 py-1 text-green-400 bg-green-500/10 rounded-full border border-green-500/20">
            <Shield className="w-4 h-4" />
            <span className="text-sm font-medium">Secure Battle</span>
          </div>
        </div>
      </header>

      {/* Main Content - Split View */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Side - Problem */}
        <div className="w-1/3 border-r border-gray-700 flex flex-col overflow-hidden">
          <div className="p-3 bg-gray-800/50 border-b border-gray-700 flex items-center justify-between">
            <h3 className="text-white font-medium flex items-center gap-2">
              <Code2 className="w-4 h-4 text-cyan-400" />
              {challenge?.title || 'Loading Challenge...'}
            </h3>
            <span className="text-xs px-2 py-1 bg-gray-700 text-gray-300 rounded">
              {battle?.difficulty}
            </span>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            <div className="bg-gray-800/80 rounded-xl shadow-lg border border-cyan-900/30 p-5 mb-4 max-h-96 overflow-y-auto custom-scrollbar">
              <div
                className="prose prose-invert prose-base max-w-none problem-statement-prose"
                dangerouslySetInnerHTML={{ __html: (challenge?.problemStatement || challenge?.description || '<p class=\"text-white-400\">Loading challenge...</p>') }}
              />
            </div>

            {/* Sample Test Cases */}
            {testCases.length > 0 && (
              <div className="mt-6 space-y-3">
                <h4 className="text-white font-medium">Sample Cases</h4>
                {testCases.slice(0, 2).map((tc, idx) => (
                  <div key={idx} className="bg-gray-800 rounded-lg p-3 text-sm">
                    <div className="mb-2">
                      <span className="text-gray-400 text-xs">Input:</span>
                      <pre className="text-cyan-400 font-mono mt-1">{tc.input}</pre>
                    </div>
                    <div>
                      <span className="text-gray-400 text-xs">Output:</span>
                      <pre className="text-green-400 font-mono mt-1">{tc.output}</pre>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Side - Editors */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* My Editor */}
          <div className="flex-1 flex flex-col border-b border-gray-700 overflow-hidden">
            <div className="p-2 bg-gray-800/50 border-b border-gray-700 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-white font-medium text-sm">Your Code</span>
                {hasSubmitted && (
                  <span className="flex items-center gap-1 text-xs text-green-400">
                    <CheckCircle className="w-3 h-3" />
                    Submitted
                  </span>
                )}
              </div>

              {/* Language Selector */}
              <div className="relative">
                <button
                  onClick={() => setShowLanguageMenu(!showLanguageMenu)}
                  disabled={hasSubmitted}
                  className="flex items-center gap-2 px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-sm disabled:opacity-50"
                >
                  <span className="text-white capitalize">{language}</span>
                  <ChevronDown className="w-3 h-3 text-gray-400" />
                </button>

                <AnimatePresence>
                  {showLanguageMenu && (
                    <motion.div
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -5 }}
                      className="absolute right-0 top-full mt-1 w-36 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-50 overflow-hidden"
                    >
                      {languages.filter(l => ['python', 'cpp', 'java', 'javascript'].includes(l.id)).map((lang) => (
                        <button
                          key={lang.id}
                          onClick={() => {
                            setLanguage(lang.id);
                            setShowLanguageMenu(false);
                          }}
                          className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-700 ${language === lang.id ? 'text-cyan-400' : 'text-white'
                            }`}
                        >
                          {lang.name}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            <div className="flex-1 overflow-hidden">
              <Editor
                height="100%"
                language={language === 'cpp' ? 'cpp' : language}
                value={code}
                onChange={(value) => !hasSubmitted && setCode(value || '')}
                theme="vs-dark"
                options={{
                  fontSize: 13,
                  fontFamily: 'JetBrains Mono, Fira Code, Consolas, monospace',
                  minimap: { enabled: false },
                  scrollBeyondLastLine: false,
                  lineNumbers: 'on',
                  automaticLayout: true,
                  tabSize: 4,
                  readOnly: hasSubmitted,
                  padding: { top: 8 }
                }}
              />
            </div>
          </div>

          {/* Results / Opponent Status */}
          <div className="h-40 bg-gray-800/50 p-4 overflow-y-auto">
            {/* Quick Run Result */}
            {quickRunResult && !myResult && (
              <div className="space-y-2 mb-3">
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-medium ${
                    quickRunResult.error ? 'text-red-400' : 'text-green-400'
                  }`}>
                    {quickRunResult.status}
                  </span>
                  {quickRunResult.time && (
                    <span className="text-xs text-gray-400">
                      <Clock className="w-3 h-3 inline mr-1" />
                      {quickRunResult.time}s
                    </span>
                  )}
                </div>

                {quickRunResult.output && (
                  <div className="bg-gray-900 rounded p-3">
                    <p className="text-xs text-gray-400 mb-1">Output:</p>
                    <pre className="text-sm text-white font-mono whitespace-pre-wrap">
                      {quickRunResult.output}
                    </pre>
                  </div>
                )}

                {quickRunResult.error && (
                  <div className="bg-red-900/20 border border-red-500/30 rounded p-3">
                    <p className="text-xs text-red-400 mb-1">Error:</p>
                    <pre className="text-sm text-red-300 font-mono whitespace-pre-wrap">
                      {quickRunResult.error}
                    </pre>
                  </div>
                )}
              </div>
            )}

            {/* Submission Result */}
            {myResult ? (
              <div className={`p-3 rounded-lg ${myResult.passed
                ? 'bg-green-900/20 border border-green-500/30'
                : 'bg-red-900/20 border border-red-500/30'
                }`}>
                <div className="flex items-center gap-2">
                  {myResult.passed ? (
                    <CheckCircle className="w-5 h-5 text-green-400" />
                  ) : (
                    <XCircle className="w-5 h-5 text-red-400" />
                  )}
                  <span className={`font-medium ${myResult.passed ? 'text-green-400' : 'text-red-400'}`}>
                    {myResult.passed ? 'All Tests Passed!' : 'Some Tests Failed'}
                  </span>
                </div>
                <p className="text-sm text-gray-400 mt-1">
                  {myResult.passedCount} / {myResult.totalCount} test cases •
                  Time: {(myResult.totalTime || 0).toFixed(0)}ms
                </p>

                {opponent?.hasSubmitted ? (
                  <p className="text-sm text-cyan-400 mt-2">
                    Waiting for results...
                  </p>
                ) : (
                  <p className="text-sm text-gray-400 mt-2">
                    Waiting for opponent to submit...
                  </p>
                )}
              </div>
            ) : !quickRunResult ? (
              <div className="text-center text-gray-400">
                <p className="text-sm">Click "Run" to test your code, or "Submit" to finalize</p>
                {opponent?.hasSubmitted && (
                  <p className="text-xs text-yellow-400 mt-2">
                    ⚠️ Opponent has already submitted!
                  </p>
                )}
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {/* Opponent Left Modal */}
      <AnimatePresence>
        {opponentLeft && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 flex items-center justify-center z-50"
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="bg-gray-800 rounded-2xl p-8 max-w-md w-full mx-4 text-center border border-green-500/30"
            >
              <div className="w-20 h-20 mx-auto mb-4 bg-green-500/20 rounded-full flex items-center justify-center">
                <Trophy className="w-10 h-10 text-green-400" />
              </div>
              <h3 className="text-2xl font-bold text-green-400 mb-2">🎉 You Win!</h3>
              <p className="text-gray-300 mb-4">Your opponent left the battle.</p>
              <p className="text-yellow-400 font-bold text-xl mb-6">
                +{battle?.prize} coins awarded!
              </p>
              <button
                onClick={() => navigate('/dashboard/codearena')}
                className="w-full py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold rounded-xl hover:from-green-600 hover:to-emerald-700 transition-all"
              >
                Back to Arena
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom Action Bar */}
      <div className="bg-gray-800 border-t border-gray-700 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleLeaveBattle}
            disabled={isLeaving || battle?.status === 'completed'}
            className="flex items-center gap-2 px-4 py-2 bg-red-500/20 border border-red-500/30 text-red-400 rounded-lg hover:bg-red-500/30 transition-all disabled:opacity-50"
          >
            {isLeaving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <DoorOpen className="w-4 h-4" />
            )}
            <span className="text-sm font-medium">{isLeaving ? 'Leaving...' : 'Leave Battle'}</span>
          </motion.button>
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <Clock className="w-4 h-4" />
            <span>Time Limit: {battle?.timeLimit ? Math.floor(battle.timeLimit / 60) : 15} min</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Run Button */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleRun}
            disabled={isRunning || isSubmitting || hasSubmitted}
            className="flex items-center gap-2 px-5 py-2.5 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-all"
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
            disabled={isSubmitting || hasSubmitted}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-lg font-medium transition-all ${hasSubmitted
              ? 'bg-green-600 text-white cursor-not-allowed'
              : 'bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white'
              } disabled:opacity-70`}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Submitting...
              </>
            ) : hasSubmitted ? (
              <>
                <CheckCircle className="w-4 h-4" />
                Submitted
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                Submit Solution
              </>
            )}
          </motion.button>
        </div>
      </div>

      {/* Problem Statement Styles */}
      <style>{`
        .problem-statement-prose, .problem-statement-prose *, .problem-statement-prose h1, .problem-statement-prose h2, .problem-statement-prose h3 {
          color: #fff !important;
        }
        .problem-statement-prose h1, .problem-statement-prose h2, .problem-statement-prose h3 {
          margin-top: 1.2em;
          margin-bottom: 0.5em;
        }
        .problem-statement-prose ul, .problem-statement-prose ol {
          margin-left: 1.5em;
          margin-bottom: 1em;
        }
        .problem-statement-prose pre, .problem-statement-prose code {
          background: #1e293b;
          color: #facc15;
          border-radius: 0.3em;
          padding: 0.3em 0.6em;
          font-size: 1em;
        }
        .problem-statement-prose p {
          margin: 0.7em 0;
          line-height: 1.7;
        }
        .problem-statement-prose table {
          background: #0f172a;
          border-radius: 0.3em;
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #334155;
          border-radius: 4px;
        }
      `}</style>

      {/* Tab Switch Warning Modal */}
      <AnimatePresence>
        {showTabWarning && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="bg-gray-800 border-2 border-red-500 rounded-2xl p-6 max-w-md w-full shadow-2xl"
            >
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 bg-red-500/20 rounded-full flex items-center justify-center">
                  <Shield className="w-8 h-8 text-red-500" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-2">⚠️ Warning!</h3>
                <p className="text-gray-300 mb-4">
                  You switched away from the battle! This is not allowed during an active battle.
                </p>
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 mb-4">
                  <p className="text-red-400 font-semibold">
                    Tab switches: {tabSwitchCount}/3
                  </p>
                  <p className="text-sm text-gray-400 mt-1">
                    {tabSwitchCount >= 3
                      ? 'You have been disqualified!'
                      : `${3 - tabSwitchCount} more switch(es) and you will automatically lose!`}
                  </p>
                </div>
                <button
                  onClick={() => setShowTabWarning(false)}
                  className="w-full py-3 bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-bold rounded-xl hover:shadow-lg transition-all"
                >
                  I Understand, Continue Battle
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
};

export default BattleRoom;
