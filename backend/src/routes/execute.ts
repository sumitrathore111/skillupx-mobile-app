import axios from 'axios';
import { Response, Router } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { wrapCode } from '../services/codeWrapper';

const router = Router();

// Judge0 CE public instance (FREE, no API key needed!)
const JUDGE0_CE_URL = 'https://ce.judge0.com/submissions?base64_encoded=true&wait=true';

// Base64 helpers
function toBase64(str: string): string {
  return Buffer.from(str, 'utf-8').toString('base64');
}
function fromBase64(str: string): string {
  if (!str) return '';
  return Buffer.from(str, 'base64').toString('utf-8');
}

// Language ID mapping for Judge0
const languageMap: { [key: number]: number } = {
  71: 71,  // Python 3.8.1
  63: 63,  // JavaScript (Node.js 12.14.0)
  62: 62,  // Java (OpenJDK 13.0.1)
  54: 54,  // C++ (GCC 9.2.0)
  50: 50   // C (GCC 9.2.0)
};

// Execute code using Judge0 CE (free, no API key)
async function executeWithJudge0CE(source_code: string, language_id: number, stdin: string) {
  const response = await axios.post(JUDGE0_CE_URL, {
    source_code: toBase64(source_code),
    language_id,
    stdin: toBase64(stdin || '')
  }, {
    headers: { 'Content-Type': 'application/json' },
    timeout: 30000
  });

  return response.data;
}

// Reverse language ID mapping (ID -> name for wrapper)
const langNameMap: { [key: number]: string } = {
  71: 'python',
  63: 'javascript',
  62: 'java',
  54: 'cpp',
  50: 'c'
};

// Execute code securely
router.post('/', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { source_code, language_id, stdin, problemTitle } = req.body;

    if (!source_code || !language_id) {
      res.status(400).json({ error: 'source_code and language_id are required' });
      return;
    }

    const langId = languageMap[language_id] || 71;
    const langName = langNameMap[langId] || 'python';

    // Wrap code (adds main(), input parsing, etc.) — skips if code already has its own I/O
    const { wrappedCode } = wrapCode(source_code, langName, problemTitle || 'solution');

    // Execute with Judge0 CE
    const j0Result = await executeWithJudge0CE(wrappedCode, langId, stdin || '');

    const result = {
      output: fromBase64(j0Result.stdout || ''),
      status: j0Result.status?.id === 3 ? 'success' : 'error',
      time: j0Result.time || '0',
      memory: j0Result.memory?.toString() || '0',
      stderr: fromBase64(j0Result.stderr || '') || fromBase64(j0Result.compile_output || '') || null,
      compile_output: fromBase64(j0Result.compile_output || '') || null,
      status_description: j0Result.status?.description || 'Unknown'
    };

    res.json(result);
  } catch (error: any) {
    console.error('Code execution error:', error);
    res.status(500).json({
      error: 'Execution failed',
      message: error.message
    });
  }
});

export default router;
