// Code wrapper service - Wraps user DSA functions with input parsing
// Supports Python, JavaScript, Java, C++
// Handles both standalone functions AND LeetCode-style class Solution

interface WrapperResult {
  wrappedCode: string;
  language: string;
}

// Extract function name from problem title
function getFunctionName(title: string): string {
  // Convert "Two Sum" -> "twoSum", "Valid Parentheses" -> "validParentheses"
  const words = title.split(/\s+/);
  return words.map((word, i) => {
    const clean = word.replace(/[^a-zA-Z0-9]/g, '');
    return i === 0 ? clean.toLowerCase() : clean.charAt(0).toUpperCase() + clean.slice(1).toLowerCase();
  }).join('');
}

// Python wrapper that parses DSA input format and calls user function/class
function getPythonWrapper(userCode: string, functionName: string): string {
  return `import sys
import json
from typing import List, Optional, Dict, Set, Tuple
from collections import Counter, defaultdict, deque, OrderedDict
import heapq
import math
import bisect
import itertools
import functools
import re
from functools import lru_cache
try:
    from functools import cache
except ImportError:
    cache = lru_cache(maxsize=None)

# ========== LEETCODE DATA STRUCTURES ==========
class ListNode:
    def __init__(self, val=0, next=None):
        self.val = val
        self.next = next
    def __repr__(self):
        return f"ListNode({self.val})"

class TreeNode:
    def __init__(self, val=0, left=None, right=None):
        self.val = val
        self.left = left
        self.right = right
    def __repr__(self):
        return f"TreeNode({self.val})"

class Node:
    """For graph problems (Clone Graph, etc.)"""
    def __init__(self, val=0, neighbors=None):
        self.val = val
        self.neighbors = neighbors if neighbors else []

# ========== CONVERSION HELPERS ==========
def list_to_linked_list(arr):
    """[1,2,3] -> 1->2->3"""
    if not arr:
        return None
    head = ListNode(arr[0])
    curr = head
    for val in arr[1:]:
        curr.next = ListNode(val)
        curr = curr.next
    return head

def linked_list_to_list(head):
    """1->2->3 -> [1,2,3]"""
    result = []
    while head:
        result.append(head.val)
        head = head.next
    return result

def list_to_tree(arr):
    """[3,1,4,null,2] -> TreeNode (level order)"""
    if not arr or arr[0] is None:
        return None
    root = TreeNode(arr[0])
    queue = deque([root])
    i = 1
    while queue and i < len(arr):
        node = queue.popleft()
        if i < len(arr) and arr[i] is not None:
            node.left = TreeNode(arr[i])
            queue.append(node.left)
        i += 1
        if i < len(arr) and arr[i] is not None:
            node.right = TreeNode(arr[i])
            queue.append(node.right)
        i += 1
    return root

def tree_to_list(root):
    """TreeNode -> [3,1,4,null,2] (level order)"""
    if not root:
        return []
    result = []
    queue = deque([root])
    while queue:
        node = queue.popleft()
        if node:
            result.append(node.val)
            queue.append(node.left)
            queue.append(node.right)
        else:
            result.append(None)
    while result and result[-1] is None:
        result.pop()
    return result

def build_graph(n, edges):
    """Build adjacency list from edge list"""
    graph = defaultdict(list)
    for u, v in edges:
        graph[u].append(v)
        graph[v].append(u)
    return graph

# ========== INPUT PARSING ==========
def parse_value(val_str):
    val_str = val_str.strip()
    if val_str.lower() in ['null', 'none']:
        return None
    if val_str.lower() == 'true':
        return True
    if val_str.lower() == 'false':
        return False
    if (val_str.startswith('"') and val_str.endswith('"')) or (val_str.startswith("'") and val_str.endswith("'")):
        return val_str[1:-1]
    try:
        return json.loads(val_str.replace("'", '"'))
    except:
        pass
    try:
        if '.' in val_str:
            return float(val_str)
        return int(val_str)
    except:
        pass
    return val_str

def parse_input_line(line):
    params = {}
    line = line.strip()
    if '=' not in line:
        return {'input': parse_value(line)}
    parts = []
    current = ""
    depth = 0
    in_string = False
    string_char = None
    for char in line:
        if char in '"\\'':
            if not in_string:
                in_string = True
                string_char = char
            elif char == string_char:
                in_string = False
                string_char = None
        elif char in '[{(' and not in_string:
            depth += 1
        elif char in ']})' and not in_string:
            depth -= 1
        if char == ',' and depth == 0 and not in_string:
            parts.append(current.strip())
            current = ""
        else:
            current += char
    if current.strip():
        parts.append(current.strip())
    for part in parts:
        if '=' in part:
            name, value = part.split('=', 1)
            params[name.strip()] = parse_value(value.strip())
    return params

def format_output(result):
    if result is None:
        return "null"
    if isinstance(result, bool):
        return "true" if result else "false"
    if isinstance(result, ListNode):
        return json.dumps(linked_list_to_list(result), separators=(',', ':'))
    if isinstance(result, TreeNode):
        return json.dumps(tree_to_list(result), separators=(',', ':'))
    if isinstance(result, (list, dict)):
        return json.dumps(result, separators=(',', ':'))
    return str(result)

# ========== USER SOLUTION ==========
${userCode}
# ========== END USER SOLUTION ==========

# Main execution - read all stdin lines
lines = []
try:
    while True:
        lines.append(input())
except EOFError:
    pass
input_str = '\\n'.join(lines).strip()
params = parse_input_line(input_str)

import inspect

def convert_param(name, value):
    """Convert array to TreeNode/ListNode based on param name"""
    if isinstance(value, list):
        # TreeNode params
        if name in ['root', 'tree', 'p', 'q', 'node', 'subRoot', 't1', 't2']:
            return list_to_tree(value)
        # ListNode params
        if name in ['head', 'l1', 'l2', 'list1', 'list2', 'node', 'linked']:
            return list_to_linked_list(value)
    return value

def call_function_smart(func, params):
    """Call function with params, matching by name or position, with auto type conversion"""
    try:
        sig = inspect.signature(func)
        param_names = [p.name for p in sig.parameters.values() if p.name != 'self']
    except:
        param_names = []

    # Convert params based on names (TreeNode, ListNode detection)
    converted_params = {}
    if param_names:
        for i, name in enumerate(param_names):
            if name in params:
                converted_params[name] = convert_param(name, params[name])
            elif i < len(params):
                # Positional match
                val = list(params.values())[i]
                converted_params[name] = convert_param(name, val)

    # Call with converted params
    if converted_params and len(converted_params) == len(param_names):
        return func(**converted_params)

    # Fallback - try positional with conversion
    args = []
    values = list(params.values())
    for i, val in enumerate(values):
        name = param_names[i] if i < len(param_names) else f'arg{i}'
        args.append(convert_param(name, val))

    if len(args) == 1:
        return func(args[0])
    return func(*args)

# Try to find and call the solution
result = None
try:
    # List of helper function names to skip (built-in helpers + common user helpers)
    SKIP_FUNCTIONS = {
        # Built-in wrapper functions
        'parse_value', 'parse_input_line', 'format_output', 'call_function_smart',
        'convert_param', 'list_to_linked_list', 'linked_list_to_list',
        'list_to_tree', 'tree_to_list', 'build_graph',
        # Common user helper names (DFS, Backtracking, etc.)
        'helper', 'dfs', 'bfs', 'merge', 'partition', 'swap', 'heapify',
        'backtrack', 'recurse', 'dp', 'check', 'valid', 'search',
        'traverse', 'preorder', 'inorder', 'postorder', 'sortArray'
    }

    # Check if Solution class exists (LeetCode style)
    if 'Solution' in globals():
        sol = Solution()
        # Get all callable methods from Solution class (exclude builtins)
        methods = [m for m in dir(sol) if not m.startswith('_') and callable(getattr(sol, m))]

        # Use the ONLY real method the user defined (there's usually just one)
        method = None
        if len(methods) == 1:
            method = getattr(sol, methods[0])
        elif len(methods) > 1:
            # Pick first non-helper method
            for m in methods:
                if m not in SKIP_FUNCTIONS:
                    method = getattr(sol, m)
                    break

        if method:
            result = call_function_smart(method, params)

    # Try standalone functions
    if result is None:
        # Get snapshot of globals to avoid iteration issues
        all_globals = list(globals().items())
        for name, obj in all_globals:
            if (callable(obj) and
                not name.startswith('_') and
                name not in SKIP_FUNCTIONS and
                not name.startswith('parse') and
                hasattr(obj, '__code__')):  # Only user-defined functions have __code__
                try:
                    result = call_function_smart(obj, params)
                    break
                except TypeError:
                    continue

    print(format_output(result))
except Exception as e:
    import traceback
    import sys
    print(f"Error: {e}", file=sys.stderr)
    traceback.print_exc(file=sys.stderr)
    print(f"Error: {e}")
`;
}

// JavaScript wrapper
function getJavaScriptWrapper(userCode: string, functionName: string): string {
  return `
// ========== LEETCODE DATA STRUCTURES ==========
class ListNode {
  constructor(val = 0, next = null) {
    this.val = val;
    this.next = next;
  }
}

class TreeNode {
  constructor(val = 0, left = null, right = null) {
    this.val = val;
    this.left = left;
    this.right = right;
  }
}

// ========== CONVERSION HELPERS ==========
function listToLinkedList(arr) {
  if (!arr || arr.length === 0) return null;
  const head = new ListNode(arr[0]);
  let curr = head;
  for (let i = 1; i < arr.length; i++) {
    curr.next = new ListNode(arr[i]);
    curr = curr.next;
  }
  return head;
}

function linkedListToList(head) {
  const result = [];
  while (head) {
    result.push(head.val);
    head = head.next;
  }
  return result;
}

function listToTree(arr) {
  if (!arr || arr.length === 0 || arr[0] === null) return null;
  const root = new TreeNode(arr[0]);
  const queue = [root];
  let i = 1;
  while (queue.length > 0 && i < arr.length) {
    const node = queue.shift();
    if (i < arr.length && arr[i] !== null) {
      node.left = new TreeNode(arr[i]);
      queue.push(node.left);
    }
    i++;
    if (i < arr.length && arr[i] !== null) {
      node.right = new TreeNode(arr[i]);
      queue.push(node.right);
    }
    i++;
  }
  return root;
}

function treeToList(root) {
  if (!root) return [];
  const result = [];
  const queue = [root];
  while (queue.length > 0) {
    const node = queue.shift();
    if (node) {
      result.push(node.val);
      queue.push(node.left);
      queue.push(node.right);
    } else {
      result.push(null);
    }
  }
  while (result.length > 0 && result[result.length - 1] === null) {
    result.pop();
  }
  return result;
}

// ========== INPUT PARSING ==========
function parseValue(valStr) {
  valStr = valStr.trim();
  if (valStr.toLowerCase() === 'null') return null;
  if (valStr.toLowerCase() === 'true') return true;
  if (valStr.toLowerCase() === 'false') return false;
  if ((valStr.startsWith('"') && valStr.endsWith('"')) ||
      (valStr.startsWith("'") && valStr.endsWith("'"))) {
    return valStr.slice(1, -1);
  }
  try {
    return JSON.parse(valStr.replace(/'/g, '"'));
  } catch {}
  const num = Number(valStr);
  if (!isNaN(num)) return num;
  return valStr;
}

function parseInputLine(line) {
  const params = {};
  line = line.trim();
  if (!line.includes('=')) {
    return { input: parseValue(line) };
  }
  const parts = [];
  let current = "";
  let depth = 0;
  let inString = false;
  let stringChar = null;
  for (const char of line) {
    if ((char === '"' || char === "'") && !inString) {
      inString = true;
      stringChar = char;
    } else if (char === stringChar && inString) {
      inString = false;
      stringChar = null;
    } else if ('[{('.includes(char) && !inString) {
      depth++;
    } else if (']})'.includes(char) && !inString) {
      depth--;
    }
    if (char === ',' && depth === 0 && !inString) {
      parts.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  if (current.trim()) parts.push(current.trim());
  for (const part of parts) {
    if (part.includes('=')) {
      const [name, ...rest] = part.split('=');
      params[name.trim()] = parseValue(rest.join('=').trim());
    }
  }
  return params;
}

function formatOutput(result) {
  if (result === null || result === undefined) return "null";
  if (typeof result === 'boolean') return result ? "true" : "false";
  if (result instanceof ListNode) return JSON.stringify(linkedListToList(result));
  if (result instanceof TreeNode) return JSON.stringify(treeToList(result));
  if (Array.isArray(result) || typeof result === 'object') {
    return JSON.stringify(result);
  }
  return String(result);
}

function convertParam(name, value) {
  if (Array.isArray(value)) {
    const treeParams = ['root', 'tree', 'p', 'q', 'node', 'subRoot', 't1', 't2'];
    const listParams = ['head', 'l1', 'l2', 'list1', 'list2', 'linked'];
    if (treeParams.includes(name)) return listToTree(value);
    if (listParams.includes(name)) return listToLinkedList(value);
  }
  return value;
}

// Helper functions to skip
const SKIP_METHODS = new Set([
  'constructor', 'helper', 'dfs', 'bfs', 'merge', 'partition', 'swap',
  'heapify', 'backtrack', 'recurse', 'dp', 'check', 'valid', 'traverse'
]);

// ========== USER SOLUTION ==========
${userCode}
// ========== END USER SOLUTION ==========

// Main execution
const readline = require('readline');
const rl = readline.createInterface({ input: process.stdin });
const inputLines = [];

rl.on('line', (line) => inputLines.push(line));
rl.on('close', () => {
  try {
    const inputStr = inputLines.join('\\n').trim();
    const params = parseInputLine(inputStr);
    const values = Object.entries(params).map(([k, v]) => convertParam(k, v));

    let result;
    let found = false;

    // Try Solution class first (most common LeetCode pattern)
    try {
      if (typeof Solution === 'function') {
        const sol = new Solution();
        // Get methods from prototype
        const proto = Object.getPrototypeOf(sol);
        const allMethods = Object.getOwnPropertyNames(proto)
          .filter(m => typeof sol[m] === 'function' && !SKIP_METHODS.has(m));

        if (allMethods.length > 0) {
          // Use first non-constructor method
          const methodName = allMethods[0];
          result = sol[methodName](...values);
          found = true;
        }
      }
    } catch (e) {
      // Solution class doesn't exist or failed, try standalone
    }

    // Try standalone function with expected name
    if (!found) {
      try {
        const expectedFunc = eval('typeof ${functionName} === "function" ? ${functionName} : null');
        if (expectedFunc) {
          result = expectedFunc(...values);
          found = true;
        }
      } catch (e) {}
    }

    // Try common LeetCode function names as fallback
    if (!found) {
      const commonNames = [
        'productExceptSelf', 'twoSum', 'threeSum', 'maxProfit', 'maxSubArray',
        'containsDuplicate', 'isValid', 'lengthOfLongestSubstring', 'search',
        'merge', 'rotate', 'moveZeroes', 'findMin', 'climbStairs', 'rob',
        'coinChange', 'numIslands', 'hasCycle', 'reverseList', 'isPalindrome'
      ];
      for (const fname of commonNames) {
        try {
          const func = eval('typeof ' + fname + ' === "function" ? ' + fname + ' : null');
          if (func) {
            result = func(...values);
            found = true;
            break;
          }
        } catch (e) {}
      }
    }

    console.log(formatOutput(result));
  } catch (e) {
    console.log('Error: ' + e.message);
  }
});
`;
}

// Java wrapper with main class — full DSA support like Python wrapper
function getJavaWrapper(userCode: string, functionName: string, className: string = 'Solution'): string {
  // Judge0 saves as Main.java — only Main can be public
  // 1. Rename any user class to non-public Solution so it doesn't conflict with our Main
  let sanitizedCode = userCode
    .replace(/public\s+class\s+Solution/g, 'class Solution')
    .replace(/public\s+class\s+solution/gi, 'class Solution')
    .replace(/public\s+class\s+Main/g, 'class Solution')
    .replace(/class\s+Main\b/g, 'class Solution');

  // 2. Strip any user-defined main method so only our wrapper's stdin-reading main runs.
  //    Uses brace-depth tracking to handle nested blocks inside main.
  const mainMatch = sanitizedCode.match(/public\s+static\s+void\s+main\s*\(\s*String\s*\[\s*\]\s*\w*\s*\)/);
  if (mainMatch && mainMatch.index !== undefined) {
    const braceStart = sanitizedCode.indexOf('{', mainMatch.index + mainMatch[0].length);
    if (braceStart !== -1) {
      let depth = 1;
      let pos = braceStart + 1;
      while (pos < sanitizedCode.length && depth > 0) {
        if (sanitizedCode[pos] === '{') depth++;
        else if (sanitizedCode[pos] === '}') depth--;
        pos++;
      }
      sanitizedCode = sanitizedCode.substring(0, mainMatch.index) +
        '// main method removed by wrapper' +
        sanitizedCode.substring(pos);
    }
  }

  return `
import java.util.*;
import java.util.regex.*;
import java.lang.reflect.*;

// ========== USER SOLUTION ==========
${sanitizedCode}
// ========== END USER SOLUTION ==========

public class Main {
    public static void main(String[] args) {
        try {
            Scanner scanner = new Scanner(System.in);
            StringBuilder inputBuilder = new StringBuilder();
            while (scanner.hasNextLine()) {
                String line = scanner.nextLine();
                inputBuilder.append(line).append("\\n");
            }
            scanner.close();

            String inputStr = inputBuilder.toString().trim();
            ${className} solution = new ${className}();

            // Find user's solution method via reflection
            Method targetMethod = findSolutionMethod(solution, "${functionName}");
            if (targetMethod == null) {
                System.err.println("Error: Could not find solution method");
                System.exit(1);
            }

            // Parse input and invoke
            Map<String, String> params = parseInputLine(inputStr);
            Class<?>[] paramTypes = targetMethod.getParameterTypes();
            Object[] parsedArgs = new Object[paramTypes.length];
            List<String> paramValues = new ArrayList<>(params.values());

            for (int i = 0; i < paramTypes.length; i++) {
                String rawValue = i < paramValues.size() ? paramValues.get(i).trim() : "";
                parsedArgs[i] = convertToType(rawValue, paramTypes[i]);
            }

            Object result = targetMethod.invoke(solution, parsedArgs);
            System.out.println(formatOutput(result));

        } catch (InvocationTargetException e) {
            Throwable cause = e.getCause();
            System.err.println("Error: " + (cause != null ? cause.getMessage() : e.getMessage()));
            System.exit(1);
        } catch (Exception e) {
            System.err.println("Error: " + e.getMessage());
            e.printStackTrace(System.err);
            System.exit(1);
        }
    }

    // ========== FIND METHOD ==========
    static Method findSolutionMethod(Object solution, String functionName) {
        Method[] methods = solution.getClass().getDeclaredMethods();
        // Try exact name
        for (Method m : methods) {
            if (m.getName().equals(functionName) && Modifier.isPublic(m.getModifiers())) return m;
        }
        // Try case-insensitive
        for (Method m : methods) {
            if (m.getName().equalsIgnoreCase(functionName) && Modifier.isPublic(m.getModifiers())) return m;
        }
        // Pick first public non-helper method
        Set<String> skip = new HashSet<>(Arrays.asList(
            "main","helper","dfs","bfs","merge","swap","partition","heapify",
            "backtrack","recurse","check","valid","search","traverse","sort",
            "compare","toString","hashCode","equals","wait","notify","notifyAll","getClass"
        ));
        for (Method m : methods) {
            if (Modifier.isPublic(m.getModifiers()) && !skip.contains(m.getName()) && !m.getName().startsWith("_")) {
                return m;
            }
        }
        // Last resort: first public method
        for (Method m : methods) {
            if (Modifier.isPublic(m.getModifiers())) return m;
        }
        return null;
    }

    // ========== INPUT PARSING ==========
    static Map<String, String> parseInputLine(String input) {
        Map<String, String> params = new LinkedHashMap<>();
        input = input.trim();

        // Split into separate param assignments
        // Handle multi-line: "nums = [1,2]\\ntarget = 9"
        // Handle single-line: "nums = [1,2], target = 9"
        List<String> parts = new ArrayList<>();

        // Try newline split first
        String[] lines = input.split("\\n");
        if (lines.length > 1) {
            boolean allHaveEquals = true;
            for (String l : lines) {
                if (!l.trim().isEmpty() && !l.trim().contains("=")) { allHaveEquals = false; break; }
            }
            if (allHaveEquals) {
                for (String l : lines) {
                    l = l.trim();
                    if (!l.isEmpty()) parts.add(l);
                }
            }
        }

        if (parts.isEmpty()) {
            // Split by comma at depth 0
            StringBuilder current = new StringBuilder();
            int depth = 0;
            boolean inString = false;
            char stringChar = 0;
            for (int i = 0; i < input.length(); i++) {
                char c = input.charAt(i);
                if ((c == '"' || c == '\\'') && !inString) { inString = true; stringChar = c; }
                else if (c == stringChar && inString) { inString = false; }
                if (!inString) {
                    if (c == '[' || c == '{' || c == '(') depth++;
                    else if (c == ']' || c == '}' || c == ')') depth--;
                }
                if (c == ',' && depth == 0 && !inString) {
                    parts.add(current.toString().trim());
                    current = new StringBuilder();
                } else {
                    current.append(c);
                }
            }
            if (current.length() > 0) parts.add(current.toString().trim());
        }

        int idx = 0;
        for (String part : parts) {
            part = part.trim();
            if (part.contains("=")) {
                int eq = part.indexOf('=');
                params.put(part.substring(0, eq).trim(), part.substring(eq + 1).trim());
            } else {
                params.put("arg" + idx, part);
            }
            idx++;
        }
        return params;
    }

    // ========== TYPE CONVERSION ==========
    static Object convertToType(String value, Class<?> type) {
        if (value == null || value.isEmpty() || value.equals("null")) return null;

        // Primitives
        if (type == int.class || type == Integer.class) return Integer.parseInt(value);
        if (type == long.class || type == Long.class) return Long.parseLong(value);
        if (type == double.class || type == Double.class) return Double.parseDouble(value);
        if (type == float.class || type == Float.class) return Float.parseFloat(value);
        if (type == boolean.class || type == Boolean.class) {
            return value.equalsIgnoreCase("true") || value.equals("1");
        }
        if (type == char.class || type == Character.class) {
            String v = value.replace("'", "").replace("\\"", "").trim();
            return v.length() > 0 ? v.charAt(0) : ' ';
        }
        if (type == String.class) {
            if ((value.startsWith("\\"") && value.endsWith("\\"")) || (value.startsWith("'") && value.endsWith("'")))
                return value.substring(1, value.length() - 1);
            return value;
        }

        // Arrays
        if (type == int[].class) return parseIntArray(value);
        if (type == int[][].class) return parseInt2DArray(value);
        if (type == char[].class) return parseCharArray(value);
        if (type == char[][].class) return parseChar2DArray(value);
        if (type == String[].class) return parseStringArray(value);
        if (type == String[][].class) return parseString2DArray(value);
        if (type == long[].class) return parseLongArray(value);
        if (type == double[].class) return parseDoubleArray(value);
        if (type == boolean[].class) return parseBoolArray(value);
        if (type == byte[].class) return parseByteArray(value);

        // List (generic — try int list by default)
        if (type == List.class) return parseIntList(value);

        return value;
    }

    // ========== ARRAY PARSERS ==========
    static String stripBrackets(String s) {
        s = s.trim();
        if (s.startsWith("[")) s = s.substring(1);
        if (s.endsWith("]")) s = s.substring(0, s.length()-1);
        return s.trim();
    }

    static int[] parseIntArray(String s) {
        s = stripBrackets(s);
        if (s.isEmpty()) return new int[0];
        String[] p = s.split(",");
        int[] r = new int[p.length];
        for (int i = 0; i < p.length; i++) r[i] = Integer.parseInt(p[i].trim());
        return r;
    }

    static long[] parseLongArray(String s) {
        s = stripBrackets(s);
        if (s.isEmpty()) return new long[0];
        String[] p = s.split(",");
        long[] r = new long[p.length];
        for (int i = 0; i < p.length; i++) r[i] = Long.parseLong(p[i].trim());
        return r;
    }

    static double[] parseDoubleArray(String s) {
        s = stripBrackets(s);
        if (s.isEmpty()) return new double[0];
        String[] p = s.split(",");
        double[] r = new double[p.length];
        for (int i = 0; i < p.length; i++) r[i] = Double.parseDouble(p[i].trim());
        return r;
    }

    static boolean[] parseBoolArray(String s) {
        s = stripBrackets(s);
        if (s.isEmpty()) return new boolean[0];
        String[] p = s.split(",");
        boolean[] r = new boolean[p.length];
        for (int i = 0; i < p.length; i++) r[i] = Boolean.parseBoolean(p[i].trim());
        return r;
    }

    static byte[] parseByteArray(String s) {
        s = stripBrackets(s);
        if (s.isEmpty()) return new byte[0];
        String[] p = s.split(",");
        byte[] r = new byte[p.length];
        for (int i = 0; i < p.length; i++) r[i] = Byte.parseByte(p[i].trim());
        return r;
    }

    static char[] parseCharArray(String s) {
        s = stripBrackets(s);
        if (s.isEmpty()) return new char[0];
        String[] p = s.split(",");
        char[] r = new char[p.length];
        for (int i = 0; i < p.length; i++) {
            String v = p[i].trim().replace("\\"","").replace("'","");
            r[i] = v.length() > 0 ? v.charAt(0) : ' ';
        }
        return r;
    }

    static String[] parseStringArray(String s) {
        s = stripBrackets(s);
        if (s.isEmpty()) return new String[0];
        List<String> items = new ArrayList<>();
        StringBuilder cur = new StringBuilder();
        boolean inQ = false; char qc = 0;
        for (int i = 0; i < s.length(); i++) {
            char c = s.charAt(i);
            if ((c == '"' || c == '\\'') && !inQ) { inQ = true; qc = c; }
            else if (c == qc && inQ) { inQ = false; }
            else if (c == ',' && !inQ) {
                items.add(cur.toString().trim().replaceAll("^[\\"\\']+|[\\"\\']+$", ""));
                cur = new StringBuilder(); continue;
            }
            if (c != '"' && c != '\\'') cur.append(c);
        }
        if (cur.length() > 0) items.add(cur.toString().trim().replaceAll("^[\\"\\']+|[\\"\\']+$", ""));
        return items.toArray(new String[0]);
    }

    // 2D array parsers
    static List<String> splitNestedArray(String s) {
        s = s.trim();
        if (s.startsWith("[")) s = s.substring(1);
        if (s.endsWith("]")) s = s.substring(0, s.length()-1);
        s = s.trim();
        List<String> rows = new ArrayList<>();
        int depth = 0;
        StringBuilder cur = new StringBuilder();
        for (int i = 0; i < s.length(); i++) {
            char c = s.charAt(i);
            if (c == '[') { depth++; if (depth == 1) { cur = new StringBuilder(); continue; } }
            else if (c == ']') { depth--; if (depth == 0) { rows.add("[" + cur.toString() + "]"); cur = new StringBuilder(); continue; } }
            if (depth >= 1) cur.append(c);
        }
        return rows;
    }

    static int[][] parseInt2DArray(String s) {
        List<String> rows = splitNestedArray(s);
        if (rows.isEmpty()) return new int[0][0];
        int[][] r = new int[rows.size()][];
        for (int i = 0; i < rows.size(); i++) r[i] = parseIntArray(rows.get(i));
        return r;
    }

    static char[][] parseChar2DArray(String s) {
        List<String> rows = splitNestedArray(s);
        if (rows.isEmpty()) return new char[0][0];
        char[][] r = new char[rows.size()][];
        for (int i = 0; i < rows.size(); i++) r[i] = parseCharArray(rows.get(i));
        return r;
    }

    static String[][] parseString2DArray(String s) {
        List<String> rows = splitNestedArray(s);
        if (rows.isEmpty()) return new String[0][0];
        String[][] r = new String[rows.size()][];
        for (int i = 0; i < rows.size(); i++) r[i] = parseStringArray(rows.get(i));
        return r;
    }

    static List<Integer> parseIntList(String s) {
        int[] a = parseIntArray(s);
        List<Integer> list = new ArrayList<>();
        for (int v : a) list.add(v);
        return list;
    }

    // ========== OUTPUT FORMATTING ==========
    static String formatOutput(Object result) {
        if (result == null) return "null";
        if (result instanceof Boolean) return ((Boolean) result) ? "true" : "false";
        if (result instanceof Character) return String.valueOf(result);
        if (result instanceof Number) return result.toString();
        if (result instanceof String) return (String) result;

        if (result instanceof int[]) {
            int[] a = (int[]) result;
            StringBuilder sb = new StringBuilder("[");
            for (int i = 0; i < a.length; i++) { if (i > 0) sb.append(","); sb.append(a[i]); }
            return sb.append("]").toString();
        }
        if (result instanceof long[]) {
            long[] a = (long[]) result;
            StringBuilder sb = new StringBuilder("[");
            for (int i = 0; i < a.length; i++) { if (i > 0) sb.append(","); sb.append(a[i]); }
            return sb.append("]").toString();
        }
        if (result instanceof double[]) {
            double[] a = (double[]) result;
            StringBuilder sb = new StringBuilder("[");
            for (int i = 0; i < a.length; i++) { if (i > 0) sb.append(","); sb.append(a[i]); }
            return sb.append("]").toString();
        }
        if (result instanceof boolean[]) {
            boolean[] a = (boolean[]) result;
            StringBuilder sb = new StringBuilder("[");
            for (int i = 0; i < a.length; i++) { if (i > 0) sb.append(","); sb.append(a[i]); }
            return sb.append("]").toString();
        }
        if (result instanceof char[]) {
            char[] a = (char[]) result;
            StringBuilder sb = new StringBuilder("[");
            for (int i = 0; i < a.length; i++) { if (i > 0) sb.append(","); sb.append("\\"").append(a[i]).append("\\""); }
            return sb.append("]").toString();
        }
        if (result instanceof String[]) {
            String[] a = (String[]) result;
            StringBuilder sb = new StringBuilder("[");
            for (int i = 0; i < a.length; i++) { if (i > 0) sb.append(","); sb.append("\\"").append(a[i]).append("\\""); }
            return sb.append("]").toString();
        }
        if (result instanceof int[][]) {
            int[][] a = (int[][]) result;
            StringBuilder sb = new StringBuilder("[");
            for (int i = 0; i < a.length; i++) { if (i > 0) sb.append(","); sb.append(formatOutput(a[i])); }
            return sb.append("]").toString();
        }
        if (result instanceof List) {
            List<?> list = (List<?>) result;
            if (list.isEmpty()) return "[]";
            if (list.get(0) instanceof List) {
                StringBuilder sb = new StringBuilder("[");
                for (int i = 0; i < list.size(); i++) { if (i > 0) sb.append(","); sb.append(formatOutput(list.get(i))); }
                return sb.append("]").toString();
            }
            StringBuilder sb = new StringBuilder("[");
            for (int i = 0; i < list.size(); i++) {
                if (i > 0) sb.append(",");
                Object item = list.get(i);
                if (item instanceof String) sb.append("\\"").append(item).append("\\"");
                else sb.append(item);
            }
            return sb.append("]").toString();
        }
        return result.toString();
    }
}
`;
}

// C++ wrapper
function getCppWrapper(userCode: string, functionName: string): string {
  // Check if user code has a Solution class
  const hasSolutionClass = userCode.includes('class Solution') || userCode.includes('class solution');

  // Try to extract actual function name from user code
  // Look for patterns like: vector<int> functionName(vector<int>&
  // or: int functionName(string s)
  let detectedFunctionName = functionName;

  // C++ function patterns - look for return type ffroollowed by function name
  // Handles: bool func(string s), vector<int> func(vector<int>& nums),
  // bool func(const string& s, const string& t), etc.
  const cppFuncPatterns = [
    /\b(vector<[^>]+>|int|bool|string|void|double|float|long(?:\s+long)?|ListNode\s*\*|TreeNode\s*\*)\s+(\w+)\s*\(/g,
  ];

  const skipFunctions = new Set(['main', 'helper', 'dfs', 'bfs', 'solve', 'traverse', 'search', 'merge', 'partition']);

  let detectedReturnType = '';
  for (const pattern of cppFuncPatterns) {
    let match;
    while ((match = pattern.exec(userCode)) !== null) {
      const funcName = match[2];
      if (!skipFunctions.has(funcName) && funcName !== 'Solution') {
        detectedFunctionName = funcName;
        detectedReturnType = match[1]; // e.g. 'bool', 'int', 'vector<int>'
        break;
      }
    }
    if (detectedFunctionName !== functionName) break;
  }

  console.log(`[C++ Wrapper] Title-derived name: ${functionName}, Detected name: ${detectedFunctionName}, Return type: ${detectedReturnType}`);

  // Parse actual function parameters from user code
  // Matches: returnType funcName(params...) - handles const, &, *, std:: qualifiers
  const funcSigPattern = new RegExp(
    `(?:(?:const\\s+)?(?:std::)?(?:vector<[^>]+>|int|bool|string|void|double|float|long(?:\\s+long)?|ListNode\\s*\\*|TreeNode\\s*\\*)[&*\\s]*)\\s*${detectedFunctionName}\\s*\\(([^)]*)\\)`
  );
  const sigMatch = userCode.match(funcSigPattern);
  console.log(`[C++ Wrapper] Sig pattern: ${funcSigPattern}`);
  console.log(`[C++ Wrapper] Sig match:`, sigMatch ? sigMatch[0] : 'NO MATCH');
  console.log(`[C++ Wrapper] Sig params raw:`, sigMatch ? sigMatch[1] : 'N/A');

  interface FuncParam { type: string; name: string; }
  const funcParams: FuncParam[] = [];

  if (sigMatch && sigMatch[1].trim()) {
    const rawParams = sigMatch[1];
    // Split by comma, handling template types with commas inside <>
    const paramParts: string[] = [];
    let depth = 0;
    let current = '';
    for (const ch of rawParams) {
      if (ch === '<') depth++;
      else if (ch === '>') depth--;
      if (ch === ',' && depth === 0) {
        paramParts.push(current.trim());
        current = '';
      } else {
        current += ch;
      }
    }
    if (current.trim()) paramParts.push(current.trim());

    for (const part of paramParts) {
      const nameMatch = part.match(/(\w+)\s*$/);
      const paramName = nameMatch ? nameMatch[1] : 'arg';
      funcParams.push({ type: part, name: paramName });
    }
  }

  console.log(`[C++ Wrapper] Detected params:`, funcParams.map(p => `${p.type} -> ${p.name}`));

  // Generate parsing statements and call arguments for main()
  const parseStatements: string[] = [];
  const callArgs: string[] = [];

  for (const param of funcParams) {
    const ptype = param.type;
    const pname = param.name;

    if (ptype.includes('vector<int>')) {
      parseStatements.push(`vector<int> ${pname} = parseIntArray(params.count("${pname}") ? params["${pname}"] : params["input"]);`);
      callArgs.push(pname);
    } else if (ptype.includes('vector<string>')) {
      // Basic vector<string> parsing
      parseStatements.push(`// vector<string> parsing for ${pname}`);
      parseStatements.push(`vector<string> ${pname}; // TODO: parse string array`);
      callArgs.push(pname);
    } else if (/\bint\b/.test(ptype) && !ptype.includes('vector')) {
      parseStatements.push(`int ${pname} = stoi(params["${pname}"]);`);
      callArgs.push(pname);
    } else if (/\blong\b/.test(ptype) && !ptype.includes('vector')) {
      parseStatements.push(`long long ${pname} = stoll(params["${pname}"]);`);
      callArgs.push(pname);
    } else if (/\bdouble\b/.test(ptype)) {
      parseStatements.push(`double ${pname} = stod(params["${pname}"]);`);
      callArgs.push(pname);
    } else if (/\bfloat\b/.test(ptype)) {
      parseStatements.push(`float ${pname} = stof(params["${pname}"]);`);
      callArgs.push(pname);
    } else if (/\bbool\b/.test(ptype)) {
      parseStatements.push(`bool ${pname} = (params["${pname}"] == "true");`);
      callArgs.push(pname);
    } else if (/\bstring\b/.test(ptype) && !ptype.includes('vector')) {
      parseStatements.push(`string ${pname} = params["${pname}"];`);
      parseStatements.push(`if (!${pname}.empty() && ${pname}[0] == '"') ${pname} = ${pname}.substr(1);`);
      parseStatements.push(`if (!${pname}.empty() && ${pname}.back() == '"') ${pname}.pop_back();`);
      callArgs.push(pname);
    } else {
      // Fallback: try as string
      parseStatements.push(`string ${pname} = params["${pname}"];`);
      callArgs.push(pname);
    }
  }

  // Build output statement based on return type
  const rt = detectedReturnType.toLowerCase();
  let outputStatement = 'cout << result << endl;';
  if (rt === 'bool') {
    outputStatement = 'cout << (result ? "true" : "false") << endl;';
  } else if (rt.startsWith('vector<int>')) {
    outputStatement = 'printVector(result);';
  } else if (rt === 'void') {
    outputStatement = '// void return type';
  } else if (rt === 'string') {
    outputStatement = 'cout << result << endl;';
  }

  const parseLines = parseStatements.map(s => `    ${s}`).join('\n');

  // Strip any existing main function from user code
  let sanitizedCode = userCode;
  const mainMatch = sanitizedCode.match(/int\s+main\s*\([^)]*\)\s*\{/);
  if (mainMatch && mainMatch.index !== undefined) {
    const braceStart = sanitizedCode.indexOf('{', mainMatch.index);
    if (braceStart !== -1) {
      let depth = 1;
      let pos = braceStart + 1;
      while (pos < sanitizedCode.length && depth > 0) {
        if (sanitizedCode[pos] === '{') depth++;
        else if (sanitizedCode[pos] === '}') depth--;
        pos++;
      }
      sanitizedCode = sanitizedCode.substring(0, mainMatch.index) +
        '// main removed by wrapper' +
        sanitizedCode.substring(pos);
    }
  }

  const actualFuncName = detectedFunctionName;
  const solPrefix = hasSolutionClass ? 'sol.' : '';
  const solDecl = hasSolutionClass ? 'Solution sol;' : '';

  const funcCallLine = `    auto result = ${solPrefix}${actualFuncName}(${callArgs.join(', ')});`;
  const outputLine = `    ${outputStatement}`;

  console.log(`[C++ Wrapper] parseLines: ${parseLines}`);
  console.log(`[C++ Wrapper] funcCallLine: ${funcCallLine}`);
  console.log(`[C++ Wrapper] outputLine: ${outputLine}`);

  return `
#include <iostream>
#include <vector>
#include <string>
#include <sstream>
#include <algorithm>
#include <unordered_map>
#include <unordered_set>
#include <map>
#include <set>
#include <queue>
#include <stack>
#include <climits>
#include <cmath>
using namespace std;

// ========== DATA STRUCTURES ==========
struct ListNode {
    int val;
    ListNode *next;
    ListNode() : val(0), next(nullptr) {}
    ListNode(int x) : val(x), next(nullptr) {}
    ListNode(int x, ListNode *next) : val(x), next(next) {}
};

struct TreeNode {
    int val;
    TreeNode *left;
    TreeNode *right;
    TreeNode() : val(0), left(nullptr), right(nullptr) {}
    TreeNode(int x) : val(x), left(nullptr), right(nullptr) {}
    TreeNode(int x, TreeNode *left, TreeNode *right) : val(x), left(left), right(right) {}
};

// ========== USER SOLUTION ==========
${sanitizedCode}
// ========== END USER SOLUTION ==========

// ========== PARSING HELPERS ==========
string trim(const string& s) {
    size_t start = s.find_first_not_of(" \\t\\n\\r");
    if (start == string::npos) return "";
    size_t end = s.find_last_not_of(" \\t\\n\\r");
    return s.substr(start, end - start + 1);
}

vector<int> parseIntArray(const string& str) {
    vector<int> result;
    string s = trim(str);
    if (s.empty() || s == "[]") return result;
    if (s[0] == '[') s = s.substr(1);
    if (!s.empty() && s.back() == ']') s.pop_back();
    stringstream ss(s);
    string item;
    while (getline(ss, item, ',')) {
        item = trim(item);
        if (!item.empty()) {
            result.push_back(stoi(item));
        }
    }
    return result;
}

map<string, string> parseInputLine(const string& line) {
    map<string, string> params;
    string s = trim(line);
    if (s.find('=') == string::npos) {
        params["input"] = s;
        return params;
    }
    int depth = 0;
    bool inString = false;
    string current;
    for (size_t i = 0; i < s.length(); i++) {
        char c = s[i];
        if (c == '"') inString = !inString;
        else if (!inString) {
            if (c == '[' || c == '{' || c == '(') depth++;
            else if (c == ']' || c == '}' || c == ')') depth--;
        }
        if (c == ',' && depth == 0 && !inString) {
            size_t eq = current.find('=');
            if (eq != string::npos) {
                string key = trim(current.substr(0, eq));
                string val = trim(current.substr(eq + 1));
                params[key] = val;
            }
            current = "";
        } else {
            current += c;
        }
    }
    if (!current.empty()) {
        size_t eq = current.find('=');
        if (eq != string::npos) {
            string key = trim(current.substr(0, eq));
            string val = trim(current.substr(eq + 1));
            params[key] = val;
        }
    }
    return params;
}

void printVector(const vector<int>& v) {
    cout << "[";
    for (size_t i = 0; i < v.size(); i++) {
        if (i > 0) cout << ",";
        cout << v[i];
    }
    cout << "]" << endl;
}

void printBool(bool b) {
    cout << (b ? "true" : "false") << endl;
}

int main() {
    ios_base::sync_with_stdio(false);
    cin.tie(NULL);

    string line;
    getline(cin, line);

    map<string, string> params = parseInputLine(line);
    ${solDecl}

${parseLines}
${funcCallLine}
${outputLine}

    return 0;
}
`;
}

// Main wrapper function
export function wrapCode(
  userCode: string,
  language: string,
  problemTitle: string = 'solution'
): WrapperResult {
  const functionName = getFunctionName(problemTitle);
  const lang = language.toLowerCase();

  // Check if code already has main/stdin handling (full self-contained program)
  const hasMainPython = userCode.includes('if __name__') || userCode.includes('input()') || userCode.includes('sys.stdin');
  const hasMainJS = userCode.includes('readline') || userCode.includes('process.stdin');
  const hasMainCpp = (userCode.includes('int main') || userCode.includes('void main')) &&
    (userCode.includes('cin') || userCode.includes('scanf') || userCode.includes('getline'));
  const hasMainJava = userCode.includes('public static void main') &&
    (userCode.includes('Scanner') || userCode.includes('BufferedReader') || userCode.includes('System.in'));

  // If user code already handles I/O (full program), don't wrap — run as-is
  if ((lang === 'python' && hasMainPython) ||
      (lang === 'javascript' && hasMainJS) ||
      ((lang === 'cpp' || lang === 'c++') && hasMainCpp) ||
      (lang === 'java' && hasMainJava)) {
    return { wrappedCode: userCode, language: lang === 'c++' ? 'cpp' : lang };
  }

  switch (lang) {
    case 'python':
    case 'python3':
      return { wrappedCode: getPythonWrapper(userCode, functionName), language: 'python' };

    case 'javascript':
    case 'js':
      return { wrappedCode: getJavaScriptWrapper(userCode, functionName), language: 'javascript' };

    case 'java':
      return { wrappedCode: getJavaWrapper(userCode, functionName), language: 'java' };

    case 'cpp':
    case 'c++':
      return { wrappedCode: getCppWrapper(userCode, functionName), language: 'cpp' };

    default:
      // Return unwrapped for unsupported languages
      return { wrappedCode: userCode, language };
  }
}

// Generate starter code template for a problem
export function getStarterCode(language: string, problemTitle: string, params: string[] = []): string {
  const functionName = getFunctionName(problemTitle);
  const lang = language.toLowerCase();

  // Default params if not provided
  const paramList = params.length > 0 ? params : ['nums', 'target'];

  switch (lang) {
    case 'python':
    case 'python3':
      return `def ${functionName}(${paramList.join(', ')}):
    # Write your solution here
    pass
`;

    case 'javascript':
    case 'js':
      return `function ${functionName}(${paramList.join(', ')}) {
    // Write your solution here

}
`;

    case 'java':
      return `class Solution {
    public int[] ${functionName}(int[] ${paramList[0] || 'nums'}, int ${paramList[1] || 'target'}) {
        // Write your solution here
        return new int[]{};
    }
}
`;

    case 'cpp':
    case 'c++':
      return `class Solution {
public:
    vector<int> ${functionName}(vector<int>& ${paramList[0] || 'nums'}, int ${paramList[1] || 'target'}) {
        // Write your solution here
        return {};
    }
};
`;

    default:
      return `// Write your ${functionName} solution here\n`;
  }
}

export default { wrapCode, getStarterCode, getFunctionName };
