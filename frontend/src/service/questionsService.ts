// Service to fetch 1000 well-structured questions from multiple sources
// Database-light: Primary = GitHub, Secondary = public/questions.json, Tertiary = bundled import
// Includes filtering, searching, and randomization

// Import local questions as fallback
import questionsData from '../../questions.json';

export interface SimilarProblem {
  id: string;
  title: string;
  difficulty: string;
}

export interface Question {
  id: string;
  title: string;
  description: string;
  category: string;
  difficulty: 'easy' | 'medium' | 'hard';
  coinReward?: number;
  coins?: number;
  constraints: string;
  solution_hint: string;
  testCases?: Array<{
    input: string;
    expectedOutput: string;
    isHidden?: boolean;
    points?: number;
  }>;
  test_cases?: Array<{
    input: string;
    expected_output: string;
  }>;
  // Company and topic data
  companies?: string[];
  relatedTopics?: string[];
  tags?: string[];
  // Statistics
  acceptanceRate?: number;
  totalSubmissions?: number;
  totalAccepted?: number;
  likes?: number;
  dislikes?: number;
  frequency?: number;
  // Additional data
  hints?: string[];
  similarProblems?: SimilarProblem[];
  isPremium?: boolean;
}

// Local public folder for questions
const LOCAL_QUESTIONS_URL = '/questions.json';

let cachedQuestions: Question[] | null = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION = 3600000; // 1 hour in milliseconds

/**
 * Fetch all questions from multiple sources with fallback chain:
 * 1. Local public/questions.json (static asset) - PRIMARY
 * 2. Bundled questions.json import - FALLBACK
 * Uses caching to reduce API calls
 */
export const fetchAllQuestions = async (): Promise<Question[]> => {
  // Return cached questions if still valid
  if (cachedQuestions && Date.now() - cacheTimestamp < CACHE_DURATION) {
    console.log('✓ Using cached questions:', cachedQuestions.length);
    return cachedQuestions;
  }

  // Try local public folder first (most reliable)
  try {
    console.log('📥 Attempting to fetch from local /questions.json...');
    const response = await fetch(LOCAL_QUESTIONS_URL);

    if (response.ok) {
      const data = await response.json();
      const normalized = normalizeQuestions(data);

      if (normalized.length > 0) {
        console.log(`✓ Loaded ${normalized.length} questions from local file`);
        cachedQuestions = normalized;
        cacheTimestamp = Date.now();
        return normalized;
      }
    }
  } catch {
    console.warn('⚠️ Local file fetch failed, using bundled data...');
  }

  // Use bundled questions as fallback
  try {
    const localQuestionsRaw = questionsData as unknown;
    const normalized = normalizeQuestions(localQuestionsRaw);

    if (normalized.length > 0) {
      console.log(`✓ Loaded ${normalized.length} questions from bundled data`);
      cachedQuestions = normalized;
      cacheTimestamp = Date.now();
      return normalized;
    }
  } catch (bundleError) {
    console.error('❌ Failed to load bundled questions:', bundleError);
  }

  console.error('❌ All question sources failed');
  return [];
};

/**
 * Normalize raw question data from different sources to the internal Question[] shape.
 * Supports objects with a `problems` array (like public/questions.json) and
 * normalizes `difficulty` to lowercase values ('easy'|'medium'|'hard') and
 * maps common alternate field names.
 */
function normalizeQuestions(raw: unknown): Question[] {
  if (!raw) return [];

  let arr: unknown[] = [];

  if (Array.isArray(raw)) {
    arr = raw as unknown[];
  } else {
    const rawObj = raw as Record<string, unknown>;
    if (Array.isArray(rawObj.problems)) arr = rawObj.problems as unknown[];
    else if (Array.isArray(rawObj.questions)) arr = rawObj.questions as unknown[];
    else return [];
  }

  return arr.map((item: unknown) => {
    const q = item as Record<string, unknown>;

    const diffRaw = String(q['difficulty'] ?? q['level'] ?? '').trim().toLowerCase();
    let difficulty: 'easy' | 'medium' | 'hard' = 'medium';
    if (diffRaw.startsWith('e')) difficulty = 'easy';
    else if (diffRaw.startsWith('m')) difficulty = 'medium';
    else if (diffRaw.startsWith('h')) difficulty = 'hard';

    const idVal = q['id'] ?? q['_id'] ?? '';
    const titleVal = q['title'] ?? q['name'] ?? 'Untitled';
    const descriptionVal = q['description'] ?? q['prompt'] ?? '';

    let categoryVal = 'General';
    if (typeof q['category'] === 'string') categoryVal = String(q['category']);
    else if (Array.isArray(q['tags']) && (q['tags'] as unknown[]).length > 0) {
      categoryVal = String((q['tags'] as unknown[])[0]);
    } else if (typeof q['topic'] === 'string') categoryVal = String(q['topic']);

    const coinRewardVal = Number(q['coinReward'] ?? q['coins'] ?? q['reward'] ?? 0) || 0;

    const testCasesVal = Array.isArray(q['testCases']) ? (q['testCases'] as unknown[]) : Array.isArray(q['test_cases']) ? (q['test_cases'] as unknown[]) : [];

    const mapTestCase = (it: unknown) => {
      const r = it as Record<string, unknown>;
      const input = String(r['input'] ?? r['stdin'] ?? '');
      const expectedOutput = String(r['output'] ?? r['expected_output'] ?? r['expectedOutput'] ?? '');
      const isHidden = Boolean(r['isHidden'] ?? r['hidden'] ?? false);
      const points = typeof r['points'] === 'number' ? (r['points'] as number) : undefined;
      return { input, expectedOutput, expected_output: expectedOutput, isHidden, points };
    };

    return {
      id: String(idVal),
      title: String(titleVal),
      description: String(descriptionVal),
      category: categoryVal,
      difficulty,
      coinReward: coinRewardVal,
      coins: coinRewardVal,
      constraints: String(q['constraints'] ?? q['limits'] ?? ''),
      solution_hint: String(q['solution_hint'] ?? q['hint'] ?? ''),
      testCases: (testCasesVal as unknown[]).map(mapTestCase),
      test_cases: (testCasesVal as unknown[]).map((t) => {
        const tc = mapTestCase(t);
        return { input: tc.input, expected_output: tc.expected_output };
      }),
      // Company and topic data
      companies: Array.isArray(q['companies']) ? (q['companies'] as string[]) : [],
      relatedTopics: Array.isArray(q['relatedTopics']) ? (q['relatedTopics'] as string[]) : [],
      tags: Array.isArray(q['tags']) ? (q['tags'] as string[]) : [],
      // Statistics
      acceptanceRate: typeof q['acceptanceRate'] === 'number' ? q['acceptanceRate'] as number : undefined,
      totalSubmissions: typeof q['totalSubmissions'] === 'number' ? q['totalSubmissions'] as number : undefined,
      totalAccepted: typeof q['totalAccepted'] === 'number' ? q['totalAccepted'] as number : undefined,
      likes: typeof q['likes'] === 'number' ? q['likes'] as number : undefined,
      dislikes: typeof q['dislikes'] === 'number' ? q['dislikes'] as number : undefined,
      frequency: typeof q['frequency'] === 'number' ? q['frequency'] as number : undefined,
      // Additional data
      hints: Array.isArray(q['hints']) ? (q['hints'] as string[]) : [],
      similarProblems: Array.isArray(q['similarProblems'])
        ? (q['similarProblems'] as Array<{id?: string; title?: string; difficulty?: string}>).map(sp => ({
            id: String(sp.id ?? ''),
            title: String(sp.title ?? ''),
            difficulty: String(sp.difficulty ?? 'medium')
          }))
        : [],
      isPremium: Boolean(q['isPremium'] ?? false),
    } as Question;
  });
}

/**
 * Get questions filtered by difficulty
 */
export const getQuestionsByDifficulty = async (
  difficulty: 'easy' | 'medium' | 'hard'
): Promise<Question[]> => {
  const questions = await fetchAllQuestions();
  return questions.filter(q => q.difficulty === difficulty);
};

/**
 * Get questions filtered by category
 */
export const getQuestionsByTopic = async (topic: string): Promise<Question[]> => {
  const questions = await fetchAllQuestions();
  return questions.filter(
    q => q.category.toLowerCase().includes(topic.toLowerCase())
  );
};

/**
 * Get questions filtered by difficulty and topic
 */
export const getFilteredQuestions = async (
  difficulty?: 'easy' | 'medium' | 'hard',
  topic?: string
): Promise<Question[]> => {
  let questions = await fetchAllQuestions();

  if (difficulty) {
    questions = questions.filter(q => q.difficulty === difficulty);
  }

  if (topic) {
    questions = questions.filter(
      q => q.category.toLowerCase().includes(topic.toLowerCase())
    );
  }

  return questions;
};

/**
 * Get a random question for battles
 */
export const getRandomQuestion = async (
  difficulty?: 'easy' | 'medium' | 'hard',
  topic?: string
): Promise<Question | null> => {
  const questions = await getFilteredQuestions(difficulty, topic);

  if (questions.length === 0) {
    return null;
  }

  const randomIndex = Math.floor(Math.random() * questions.length);
  return questions[randomIndex];
};

/**
 * Get multiple random questions for battle tournament
 */
export const getRandomQuestions = async (
  count: number,
  difficulty?: 'easy' | 'medium' | 'hard',
  topic?: string
): Promise<Question[]> => {
  const questions = await getFilteredQuestions(difficulty, topic);
  const selected: Question[] = [];

  if (questions.length <= count) {
    return questions;
  }

  const indices = new Set<number>();
  while (indices.size < count) {
    indices.add(Math.floor(Math.random() * questions.length));
  }

  for (const index of indices) {
    selected.push(questions[index]);
  }

  return selected;
};

/**
 * Get all unique topics
 */
export const getAllTopics = async (): Promise<string[]> => {
  const questions = await fetchAllQuestions();
  const topics = new Set(questions.map(q => q.category));
  return Array.from(topics).sort();
};

/**
 * Get statistics about questions
 */
export const getQuestionsStatistics = async () => {
  const questions = await fetchAllQuestions();

  const stats = {
    total: questions.length,
    byDifficulty: {
      easy: questions.filter(q => q.difficulty === 'easy').length,
      medium: questions.filter(q => q.difficulty === 'medium').length,
      hard: questions.filter(q => q.difficulty === 'hard').length,
    },
    topics: {} as Record<string, number>,
  };

  questions.forEach(q => {
    stats.topics[q.category] = (stats.topics[q.category] || 0) + 1;
  });

  return stats;
};

/**
 * Search questions by title or description
 */
export const searchQuestions = async (searchTerm: string): Promise<Question[]> => {
  const questions = await fetchAllQuestions();
  const term = searchTerm.toLowerCase();

  return questions.filter(
    q =>
      q.title.toLowerCase().includes(term) ||
      q.description.toLowerCase().includes(term) ||
      q.category.toLowerCase().includes(term)
  );
};

/**
 * Get single question by ID
 */
export const getQuestionById = async (id: string): Promise<Question | null> => {
  const questions = await fetchAllQuestions();
  return questions.find(q => q.id === id) || null;
};

/**
 * Clear cache (useful for testing or manual refresh)
 */
export const clearQuestionsCache = () => {
  cachedQuestions = null;
  cacheTimestamp = 0;
};

/**
 * Get statistics for dashboard
 */
export const getQuestionsOverview = async () => {
  try {
    const stats = await getQuestionsStatistics();
    return {
      success: true,
      data: stats
    };
  } catch (error) {
    console.error('Error getting questions overview:', error);
    return {
      success: false,
      error: 'Failed to fetch questions overview'
    };
  }
};
