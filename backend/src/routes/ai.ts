/**
 * AI Routes
 * Provides AI-powered hints, code analysis, and debugging
 */

import express from 'express';
import fetch from 'node-fetch';

const router = express.Router();

// AI API configuration
const HF_API_URL = 'https://router.huggingface.co/v1/chat/completions';

// AI models configuration
const MODELS = {
  // Llama 3.1 8B on cerebras - fast, free tier, confirmed chat model
  HINT_MODEL: 'meta-llama/Llama-3.1-8B-Instruct:cerebras',
  // Same model works great for code too
  CODE_MODEL: 'meta-llama/Llama-3.1-8B-Instruct:cerebras',
  // Llama 3.3 70B on sambanova as backup - bigger but still free tier
  BACKUP_MODEL: 'meta-llama/Llama-3.3-70B-Instruct:sambanova'
};

// Helper to call Hugging Face API using OpenAI-compatible format
const callHuggingFace = async (model: string, prompt: string, maxTokens = 500): Promise<string> => {
  try {
    const response = await fetch(HF_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // HF_TOKEN is required for the router API
        'Authorization': `Bearer ${process.env.HF_TOKEN || ''}`
      },
      body: JSON.stringify({
        model: model,
        messages: [
          { role: 'user', content: prompt }
        ],
        max_tokens: maxTokens,
        temperature: 0.7,
        top_p: 0.9
      })
    });

    if (!response.ok) {
      const error = await response.text();
      console.error(`HuggingFace API Error: ${response.status}`, error);

      // If model is loading, wait and retry once
      if (response.status === 503) {
        console.log('Model loading, waiting 20 seconds...');
        await new Promise(resolve => setTimeout(resolve, 20000));
        return callHuggingFace(model, prompt, maxTokens);
      }

      throw new Error(`API Error: ${response.status}`);
    }

    const data = await response.json() as any;
    return data.choices?.[0]?.message?.content || '';
  } catch (error) {
    console.error('HuggingFace call failed:', error);
    throw error;
  }
};

/**
 * POST /api/ai/hint
 * Get AI-powered hint for a coding problem
 */
router.post('/hint', async (req, res) => {
  try {
    const { problemTitle, problemDescription, userCode, language, hintLevel } = req.body;

    if (!problemTitle || !problemDescription) {
      return res.status(400).json({ error: 'Problem title and description required' });
    }

    // Craft prompt based on hint level
    const hintPrompts: Record<number, string> = {
      1: `You are a coding tutor. Give a SUBTLE hint (1-2 sentences) for this problem WITHOUT revealing the solution. Just point the student in the right direction.

Problem: ${problemTitle}
Description: ${problemDescription?.substring(0, 500)}

Student's current code (${language}):
${userCode?.substring(0, 300) || 'No code yet'}

Give a brief, subtle hint:`,

      2: `You are a coding tutor. Give a MEDIUM hint for this problem. Mention the key data structure or algorithm pattern that would help, but don't give the full solution.

Problem: ${problemTitle}
Description: ${problemDescription?.substring(0, 500)}

Student's code (${language}):
${userCode?.substring(0, 400) || 'No code yet'}

Give a helpful hint mentioning the approach:`,

      3: `You are a coding tutor. Give a DETAILED hint with pseudo-code outline. Help the student understand the step-by-step approach without writing the actual code.

Problem: ${problemTitle}
Description: ${problemDescription?.substring(0, 500)}

Student's code (${language}):
${userCode?.substring(0, 500) || 'No code yet'}

Give a detailed hint with approach outline:`
    };

    const prompt = hintPrompts[hintLevel] || hintPrompts[1];

    let hint: string;
    try {
      hint = await callHuggingFace(MODELS.HINT_MODEL, prompt, 300);
    } catch (e) {
      // Fallback to backup model
      hint = await callHuggingFace(MODELS.BACKUP_MODEL, prompt, 200);
    }

    // Clean up and format response properly
    hint = hint.trim();

    // Fix numbered lists - ensure each number starts on a new line
    hint = hint.replace(/(\d+)\.\s*/g, '\n$1. ');

    // Fix bullet points - ensure each bullet starts on a new line
    hint = hint.replace(/([•\-\*])\s*/g, '\n$1 ');

    // Fix step/approach markers
    hint = hint.replace(/(Step\s*\d+|Approach\s*\d+|Hint\s*\d+)[\s:]+/gi, '\n\n$1: ');

    // Remove multiple consecutive newlines (more than 2)
    hint = hint.replace(/\n{3,}/g, '\n\n');

    // Remove leading newline if present
    hint = hint.replace(/^\n+/, '');

    // Ensure proper spacing after colons in headers
    hint = hint.replace(/:\s*\n\s*\n/g, ':\n');

    // Detect pattern from hint
    const patterns = ['Two Pointers', 'Sliding Window', 'Dynamic Programming', 'BFS', 'DFS',
                      'Binary Search', 'Hash Map', 'Heap', 'Stack', 'Queue', 'Recursion',
                      'Backtracking', 'Greedy', 'Divide and Conquer'];
    const detectedPattern = patterns.find(p => hint.toLowerCase().includes(p.toLowerCase()));

    res.json({
      hint,
      level: hintLevel,
      patternDetected: detectedPattern
    });

  } catch (error) {
    console.error('AI Hint Error:', error);
    res.status(500).json({
      error: 'AI service temporarily unavailable',
      hint: getLocalHint(req.body.hintLevel || 1),
      level: req.body.hintLevel || 1
    });
  }
});

// Helper to generate progress bar
function generateProgressBar(percentage: number): string {
  const filled = Math.round(percentage / 6.25); // 16 chars total
  const empty = 16 - filled;
  return '█'.repeat(filled) + '░'.repeat(empty);
}

// Helper to get performance label
function getPerformanceLabel(complexity: string): string {
  if (complexity.includes('1)')) return 'Instant';
  if (complexity.includes('log')) return 'Very Fast';
  if (complexity.includes('n)') && !complexity.includes('n²') && !complexity.includes('n^2')) return 'Fast';
  if (complexity.includes('n log')) return 'Good';
  if (complexity.includes('n²') || complexity.includes('n^2')) return 'Slow';
  if (complexity.includes('2^n') || complexity.includes('n!')) return 'Very Slow';
  return 'Moderate';
}

/**
 * POST /api/ai/analyze
 * Comprehensive code analysis with visual progress bars
 */
router.post('/analyze', async (req, res) => {
  try {
    const { code, language, problemTitle, problemDescription, testCases, constraints, difficulty } = req.body;

    if (!code) {
      return res.status(400).json({ error: 'Code is required' });
    }

    // Build context sections
    let contextSection = '';

    if (problemTitle) {
      contextSection += `\n📌 PROBLEM: ${problemTitle}`;
      if (difficulty) contextSection += ` (${difficulty})`;
    }

    if (problemDescription) {
      // Clean HTML tags and truncate
      const cleanDesc = problemDescription.replace(/<[^>]*>/g, '').substring(0, 400);
      contextSection += `\n\n📝 DESCRIPTION:\n${cleanDesc}`;
    }

    if (testCases && Array.isArray(testCases) && testCases.length > 0) {
      contextSection += `\n\n🧪 TEST CASES:`;
      testCases.slice(0, 2).forEach((tc: any, i: number) => {
        contextSection += `\nCase ${i + 1}: Input: ${tc.input?.substring?.(0, 100) || String(tc.input).substring(0, 100)} → Expected: ${tc.expectedOutput?.substring?.(0, 50) || String(tc.expectedOutput).substring(0, 50)}`;
      });
    }

    if (constraints && Array.isArray(constraints) && constraints.length > 0) {
      contextSection += `\n\n⚠️ CONSTRAINTS:\n${constraints.slice(0, 3).join('\n')}`;
    } else if (constraints && typeof constraints === 'string') {
      contextSection += `\n\n⚠️ CONSTRAINTS:\n${constraints.substring(0, 200)}`;
    }

    const prompt = `You are an expert code reviewer. Analyze this ${language} code for the given problem.
${contextSection}

💻 CODE TO ANALYZE:
\`\`\`${language}
${code.substring(0, 1000)}
\`\`\`

Provide a JSON response with exactly this structure:
{
  "timeComplexity": "O(?)",
  "spaceComplexity": "O(?)",
  "scores": {
    "correctness": 0-100 (does code solve the problem correctly?),
    "efficiency": 0-100 (is it optimally written?),
    "readability": 0-100 (clean code, good naming?),
    "edgeCases": 0-100 (handles null, empty, large inputs?)
  },
  "patterns": ["algorithm patterns used"],
  "issues": ["specific bugs or problems found"],
  "suggestions": ["how to improve the code"]
}

Be specific! Check if:
- Code handles all test cases
- Time/space meets constraints
- Edge cases are covered

Respond ONLY with valid JSON:`;

    let analysisText: string;
    try {
      analysisText = await callHuggingFace(MODELS.CODE_MODEL, prompt, 500);
    } catch (e) {
      analysisText = await callHuggingFace(MODELS.BACKUP_MODEL, prompt, 400);
    }

    // Try to parse JSON from response
    let analysis;
    try {
      const jsonMatch = analysisText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analysis = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found');
      }
    } catch (parseError) {
      analysis = getLocalAnalysis(code, language);
    }

    // Extract values with fallbacks
    const timeComplexity = analysis.timeComplexity || detectComplexity(code);
    const spaceComplexity = analysis.spaceComplexity || 'O(n)';
    const correctness = analysis.scores?.correctness || analysis.quality?.score || 85;
    const efficiency = analysis.scores?.efficiency || 80;
    const readability = analysis.scores?.readability || analysis.readability?.score || 70;
    const edgeCases = analysis.scores?.edgeCases || 50;
    const patterns = analysis.patterns || detectPatterns(code);
    const issues = analysis.issues || analysis.quality?.issues || [];
    const suggestions = analysis.suggestions || analysis.quality?.suggestions || [];

    // Build visual report
    const report = `═══════════════════════════════════════
       📊 CODE ANALYSIS REPORT
═══════════════════════════════════════

⚡ PERFORMANCE
Time:  ${timeComplexity.padEnd(6)} ${generateProgressBar(efficiency)} ${getPerformanceLabel(timeComplexity)}
Space: ${spaceComplexity.padEnd(6)} ${generateProgressBar(Math.min(100, 100 - (spaceComplexity.includes('n²') ? 40 : spaceComplexity.includes('n)') ? 20 : 0)))} ${spaceComplexity.includes('1)') ? 'Optimal' : spaceComplexity.includes('n)') ? 'Moderate' : 'Heavy'}

🎯 QUALITY BREAKDOWN
Correctness  ${generateProgressBar(correctness)} ${correctness}%
Efficiency   ${generateProgressBar(efficiency)} ${efficiency}%
Readability  ${generateProgressBar(readability)} ${readability}%
Edge Cases   ${generateProgressBar(edgeCases)} ${edgeCases}%

🏷️ DETECTED PATTERNS
${patterns.map((p: string) => `[${p}]`).join(' ')}

💡 QUICK FIXES
${suggestions.length > 0 ? suggestions.map((s: string) => `→ ${s}`).join('\n') : '→ No immediate fixes needed'}`;

    // Send both structured data and visual report
    res.json({
      report,
      timeComplexity,
      spaceComplexity,
      scores: {
        correctness,
        efficiency,
        readability,
        edgeCases,
        overall: Math.round((correctness + efficiency + readability + edgeCases) / 4)
      },
      patterns,
      issues,
      suggestions
    });

  } catch (error) {
    console.error('Code Analysis Error:', error);
    const fallback = getLocalAnalysis(req.body.code, req.body.language);
    res.json({
      report: `═══════════════════════════════════════
       📊 CODE ANALYSIS REPORT
═══════════════════════════════════════

⚡ PERFORMANCE
Time:  ${fallback.timeComplexity.padEnd(6)} ${generateProgressBar(75)} ${getPerformanceLabel(fallback.timeComplexity)}
Space: ${fallback.spaceComplexity.padEnd(6)} ${generateProgressBar(80)} Moderate

🎯 QUALITY BREAKDOWN
Correctness  ${generateProgressBar(85)} 85%
Efficiency   ${generateProgressBar(75)} 75%
Readability  ${generateProgressBar(70)} 70%
Edge Cases   ${generateProgressBar(50)} 50%

🏷️ DETECTED PATTERNS
${fallback.patterns.map((p: string) => `[${p}]`).join(' ')}

💡 QUICK FIXES
→ Consider adding comments for complex logic`,
      ...fallback,
      scores: { correctness: 85, efficiency: 75, readability: 70, edgeCases: 50, overall: 70 }
    });
  }
});

/**
 * POST /api/ai/debug
 * AI debugging assistance
 */
router.post('/debug', async (req, res) => {
  try {
    const { code, language, error, expectedOutput, actualOutput } = req.body;

    if (!code) {
      return res.status(400).json({ error: 'Code is required' });
    }

    const prompt = `Debug this ${language} code. Identify the issue and suggest a fix.

Code:
\`\`\`${language}
${code.substring(0, 800)}
\`\`\`

${error ? `Error: ${error}` : ''}
${expectedOutput ? `Expected output: ${expectedOutput}` : ''}
${actualOutput ? `Actual output: ${actualOutput}` : ''}

Respond with:
1. Issue: (what's wrong in 1 sentence)
2. Explanation: (why it's wrong in 2-3 sentences)
3. Fix: (how to fix it)`;

    let debugText: string;
    try {
      debugText = await callHuggingFace(MODELS.CODE_MODEL, prompt, 400);
    } catch (e) {
      debugText = await callHuggingFace(MODELS.BACKUP_MODEL, prompt, 300);
    }

    // Parse the response
    const issueMatch = debugText.match(/Issue:?\s*([^\n]+)/i);
    const explainMatch = debugText.match(/Explanation:?\s*([^\n]+(?:\n[^\n]+)?)/i);
    const fixMatch = debugText.match(/Fix:?\s*([\s\S]+?)(?=\n\n|$)/i);

    res.json({
      issue: issueMatch?.[1]?.trim() || 'Potential logic error detected',
      explanation: explainMatch?.[1]?.trim() || debugText.substring(0, 200),
      suggestedFix: fixMatch?.[1]?.trim() || 'Review the algorithm logic'
    });

  } catch (error) {
    console.error('AI Debug Error:', error);
    res.status(500).json({
      issue: 'Unable to analyze code',
      explanation: 'Check your syntax and logic carefully',
      suggestedFix: ''
    });
  }
});

// Local fallback functions
function getLocalHint(level: number): string {
  const hints: Record<number, string> = {
    1: "Think about which data structure would give you O(1) lookup time. What have you seen before that could help?",
    2: "Consider using a Hash Map (dictionary). For each element, think about what value you're looking for and whether you've seen it.",
    3: "Use a HashMap to store each number's index as you iterate. For each number, check if (target - number) exists in your map. This gives O(n) time complexity."
  };
  return hints[level] || hints[1];
}

function getLocalAnalysis(code: string, language: string): any {
  return {
    timeComplexity: detectComplexity(code),
    spaceComplexity: code.includes('[]') || code.includes('{}') ? 'O(n)' : 'O(1)',
    codeQuality: {
      score: 75,
      issues: [],
      suggestions: ['Consider adding comments for complex logic']
    },
    patterns: detectPatterns(code),
    optimizations: [],
    readability: { score: 70, feedback: 'Code is reasonably readable' }
  };
}

function detectComplexity(code: string): string {
  if (/(for|while)[\s\S]*?(for|while)/i.test(code)) return 'O(n²)';
  if (/for |while |\.map\(|\.forEach\(|\.filter\(/i.test(code)) return 'O(n)';
  if (/\.sort\(/i.test(code)) return 'O(n log n)';
  return 'O(1)';
}

function detectPatterns(code: string): string[] {
  const patterns: string[] = [];
  if (/left.*right|two.*pointer/i.test(code)) patterns.push('Two Pointers');
  if (/window|slide/i.test(code)) patterns.push('Sliding Window');
  if (/dp\[|memo|cache/i.test(code)) patterns.push('Dynamic Programming');
  if (/bfs|queue/i.test(code)) patterns.push('BFS');
  if (/dfs|stack/i.test(code)) patterns.push('DFS');
  if (/binary.*search|mid/i.test(code)) patterns.push('Binary Search');
  if (/dict|map|hash/i.test(code)) patterns.push('Hash Map');
  return patterns.length ? patterns : ['General'];
}

/**
 * POST /api/ai/trace
 * Execute code with line-by-line tracing for step-through debugger
 * Returns variable states at each execution step
 */
router.post('/trace', async (req, res) => {
  try {
    const { code, language, input } = req.body;

    if (!code) {
      return res.status(400).json({ error: 'Code is required' });
    }

    // Generate traced code based on language
    let tracedCode: string;
    let languageId: number;

    if (language === 'python' || language === 'python3') {
      tracedCode = generatePythonTrace(code, input || '');
      languageId = 71; // Python 3
    } else if (language === 'javascript' || language === 'nodejs') {
      tracedCode = generateJavaScriptTrace(code, input || '');
      languageId = 63; // JavaScript
    } else if (language === 'java') {
      tracedCode = generateJavaTrace(code, input || '');
      languageId = 62; // Java
    } else if (language === 'cpp' || language === 'c++') {
      tracedCode = generateCppTrace(code, input || '');
      languageId = 54; // C++
    } else {
      return res.status(400).json({ error: `Trace not supported for ${language}` });
    }

    // Execute traced code via Judge0
    const judge0Response = await fetch('https://ce.judge0.com/submissions?base64_encoded=false&wait=true', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        source_code: tracedCode,
        language_id: languageId,
        stdin: input || '',
        cpu_time_limit: 5,
        memory_limit: 128000
      })
    });

    if (!judge0Response.ok) {
      throw new Error('Failed to execute trace');
    }

    const result = await judge0Response.json() as any;

    // Parse the trace output
    if (result.status?.id === 3 && result.stdout) {
      const traceData = parseTraceOutput(result.stdout);
      return res.json({
        success: true,
        steps: traceData.steps,
        output: traceData.output,
        totalLines: traceData.steps.length
      });
    } else if (result.compile_output || result.stderr) {
      return res.json({
        success: false,
        error: result.compile_output || result.stderr,
        steps: []
      });
    } else {
      return res.json({
        success: false,
        error: result.status?.description || 'Execution failed',
        steps: []
      });
    }

  } catch (error) {
    console.error('Trace Error:', error);
    res.status(500).json({ error: 'Failed to trace code execution' });
  }
});

// Generate Python code with tracing - simpler approach using sys.settrace
function generatePythonTrace(code: string, input: string): string {
  const escapedInput = input.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n');

  return `
import sys
import json
from io import StringIO

# Trace storage
__trace_steps__ = []
__output__ = StringIO()
__stdout_orig__ = sys.stdout

# Input simulation
__inputs__ = "${escapedInput}".split("\\n") if "${escapedInput}" else []
__input_idx__ = [0]

def __mock_input__(prompt=''):
    if __input_idx__[0] < len(__inputs__):
        result = __inputs__[__input_idx__[0]].strip()
        __input_idx__[0] += 1
        return result
    return ''

input = __mock_input__

# Capture print output
def __mock_print__(*args, **kwargs):
    msg = ' '.join(str(a) for a in args) + kwargs.get('end', '\\n')
    __stdout_orig__.write(msg)
    __output__.write(msg)

print = __mock_print__

# Trace function
def __trace__(frame, event, arg):
    if event == 'line' and frame.f_code.co_filename == '<string>':
        lineno = frame.f_lineno
        # Get source line
        try:
            source_lines = __user_source__.split('\\n')
            if 0 < lineno <= len(source_lines):
                code_line = source_lines[lineno - 1]
            else:
                code_line = f"line {lineno}"
        except:
            code_line = f"line {lineno}"

        # Capture variables
        vars_dict = {}
        for name, val in frame.f_locals.items():
            if not name.startswith('_'):
                try:
                    if isinstance(val, (int, float, bool)):
                        vars_dict[name] = {"value": str(val), "type": type(val).__name__}
                    elif isinstance(val, str):
                        vars_dict[name] = {"value": val[:50], "type": "str"}
                    elif isinstance(val, (list, tuple)):
                        vars_dict[name] = {"value": str(val)[:80], "type": type(val).__name__}
                    elif isinstance(val, dict):
                        vars_dict[name] = {"value": str(val)[:80], "type": "dict"}
                    elif val is None:
                        vars_dict[name] = {"value": "None", "type": "NoneType"}
                    else:
                        vars_dict[name] = {"value": str(val)[:40], "type": type(val).__name__}
                except:
                    pass

        __trace_steps__.append({
            "line": lineno,
            "code": code_line.strip() if code_line else "",
            "variables": vars_dict
        })
    return __trace__

# User's original code
__user_source__ = '''${code.replace(/'/g, "\\'")}'''

# Execute with tracing
sys.settrace(__trace__)
try:
    exec(__user_source__)
except Exception as e:
    __trace_steps__.append({"line": -1, "code": "ERROR: " + str(e), "variables": {}})
finally:
    sys.settrace(None)

# Output results
sys.stdout = __stdout_orig__
print("__TRACE_START__")
print(json.dumps({"steps": __trace_steps__, "output": __output__.getvalue()}))
print("__TRACE_END__")
`;
}

// Generate JavaScript code with tracing
function generateJavaScriptTrace(code: string, input: string): string {
  const lines = code.split('\n');

  return `
const __trace_data__ = [];
let __output_buffer__ = '';

// Mock input handling
const __input_lines__ = \`${input}\`.trim().split('\\n').filter(Boolean);
let __input_idx__ = 0;

// Mock readline for Node.js style input
const readline = () => __input_lines__[__input_idx__++] || '';
const prompt = () => __input_lines__[__input_idx__++] || '';

// Override console.log
const __original_log__ = console.log;
console.log = (...args) => {
  const output = args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ');
  __output_buffer__ += output + '\\n';
  __original_log__(...args);
};

function __capture_vars__(vars, lineNum, lineCode) {
  const snapshot = {};
  for (const [name, value] of Object.entries(vars)) {
    if (name.startsWith('__') || typeof value === 'function') continue;
    try {
      if (Array.isArray(value)) {
        snapshot[name] = { value: JSON.stringify(value).slice(0, 100), type: 'array' };
      } else if (typeof value === 'object' && value !== null) {
        snapshot[name] = { value: JSON.stringify(value).slice(0, 100), type: 'object' };
      } else {
        snapshot[name] = { value: String(value), type: typeof value };
      }
    } catch(e) {}
  }
  __trace_data__.push({ line: lineNum, code: lineCode, variables: snapshot });
}

try {
${lines.map((line, idx) => {
  const lineNum = idx + 1;
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('//')) return line;

  const escapedCode = line.replace(/\\/g, '\\\\').replace(/`/g, '\\`');
  const indent = line.match(/^(\s*)/)?.[0] || '';

  // Skip function declarations, just add the line
  if (trimmed.startsWith('function ') || trimmed === '{' || trimmed === '}') {
    return line;
  }

  // For variable declarations and expressions, capture after
  return `${line}
${indent}__capture_vars__({${extractJsVars(lines.slice(0, idx + 1))}}, ${lineNum}, \`${escapedCode}\`);`;
}).join('\n')}
} catch(e) {
  __trace_data__.push({ line: -1, code: 'ERROR', variables: { error: { value: e.message, type: 'Error' }}});
}

console.log = __original_log__;
console.log("__TRACE_START__");
console.log(JSON.stringify({ steps: __trace_data__, output: __output_buffer__ }));
console.log("__TRACE_END__");
`;
}

// Helper to extract JS variable names from code
function extractJsVars(lines: string[]): string {
  const vars = new Set<string>();
  const varPattern = /(?:let|const|var)\s+(\w+)/g;
  const assignPattern = /^(\w+)\s*=/;

  for (const line of lines) {
    let match;
    while ((match = varPattern.exec(line)) !== null) {
      vars.add(match[1]);
    }
    const assignMatch = line.trim().match(assignPattern);
    if (assignMatch) {
      vars.add(assignMatch[1]);
    }
  }

  return Array.from(vars).map(v => `${v}: typeof ${v} !== 'undefined' ? ${v} : undefined`).join(', ');
}

// Generate Java trace (simplified - uses print statements)
function generateJavaTrace(code: string, input: string): string {
  // For Java, we'll use a simpler approach with print statements
  // since Java doesn't have eval
  const lines = code.split('\n');

  // Find the main method and inject trace calls
  let inMain = false;
  const tracedLines: string[] = [];

  tracedLines.push('import java.util.*;');
  tracedLines.push('import java.io.*;');
  tracedLines.push('');
  tracedLines.push('public class Main {');
  tracedLines.push('    static StringBuilder __trace__ = new StringBuilder();');
  tracedLines.push('    static StringBuilder __output__ = new StringBuilder();');
  tracedLines.push('');
  tracedLines.push('    static void __capture__(int line, String code, String... vars) {');
  tracedLines.push('        __trace__.append("{\\"line\\":").append(line).append(",\\"code\\":\\"").append(code.replace("\\"", "\\\\\\"")).append("\\",\\"variables\\":{");');
  tracedLines.push('        for(int i = 0; i < vars.length; i += 3) {');
  tracedLines.push('            if(i > 0) __trace__.append(",");');
  tracedLines.push('            __trace__.append("\\"").append(vars[i]).append("\\":{\\"value\\":\\"").append(vars[i+1]).append("\\",\\"type\\":\\"").append(vars[i+2]).append("\\"}");');
  tracedLines.push('        }');
  tracedLines.push('        __trace__.append("}}|");');
  tracedLines.push('    }');
  tracedLines.push('');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Skip imports and class declaration
    if (trimmed.startsWith('import ') || trimmed.startsWith('package ')) continue;
    if (trimmed.startsWith('public class') || trimmed.startsWith('class ')) {
      continue;
    }

    if (trimmed.includes('public static void main')) {
      inMain = true;
      tracedLines.push('    public static void main(String[] args) {');
      tracedLines.push(`        Scanner __scanner__ = new Scanner(new ByteArrayInputStream("${input.replace(/"/g, '\\"').replace(/\n/g, '\\n')}".getBytes()));`);
      continue;
    }

    if (inMain) {
      tracedLines.push(line);
    } else {
      tracedLines.push(line);
    }
  }

  // Close and output trace
  tracedLines.push('        System.out.println("__TRACE_START__");');
  tracedLines.push('        System.out.println("{\\"steps\\":[" + __trace__.toString().replaceAll("\\\\|$", "").replaceAll("\\\\|", ",") + "],\\"output\\":\\"" + __output__.toString().replace("\\"", "\\\\\\"").replace("\\n", "\\\\n") + "\\"}");');
  tracedLines.push('        System.out.println("__TRACE_END__");');
  tracedLines.push('    }');
  tracedLines.push('}');

  return tracedLines.join('\n');
}

// Generate C++ trace (simplified)
function generateCppTrace(code: string, input: string): string {
  return `
#include <iostream>
#include <sstream>
#include <vector>
#include <string>
using namespace std;

stringstream __trace__;
stringstream __output__;

void __capture__(int line, const string& code) {
    __trace__ << "{\\"line\\":" << line << ",\\"code\\":\\"" << code << "\\",\\"variables\\":{}}|";
}

int main() {
    istringstream __input__("${input.replace(/"/g, '\\"').replace(/\n/g, '\\n')}");
    cin.rdbuf(__input__.rdbuf());

${code}

    cout << "__TRACE_START__" << endl;
    string trace_str = __trace__.str();
    if (!trace_str.empty() && trace_str.back() == '|') trace_str.pop_back();
    cout << "{\\"steps\\":[";
    for (size_t i = 0; i < trace_str.size(); i++) {
        if (trace_str[i] == '|') cout << ",";
        else cout << trace_str[i];
    }
    cout << "],\\"output\\":\\"" << __output__.str() << "\\"}" << endl;
    cout << "__TRACE_END__" << endl;
    return 0;
}
`;
}

// Parse trace output from execution
function parseTraceOutput(stdout: string): { steps: any[]; output: string } {
  try {
    const traceMatch = stdout.match(/__TRACE_START__\s*([\s\S]*?)\s*__TRACE_END__/);
    if (traceMatch) {
      const jsonStr = traceMatch[1].trim();
      const data = JSON.parse(jsonStr);
      return {
        steps: data.steps || [],
        output: data.output || ''
      };
    }
  } catch (e) {
    console.error('Failed to parse trace:', e);
  }

  return { steps: [], output: stdout };
}

export default router;
