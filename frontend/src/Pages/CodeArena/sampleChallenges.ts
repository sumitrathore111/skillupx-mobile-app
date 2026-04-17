// Sample challenges for CodeArena
// Note: These are now managed via backend API instead of Firestore

export const sampleChallenges = [
  {
    title: 'Two Sum',
    description: 'Find two numbers that add up to target',
    difficulty: 'easy',
    category: 'Arrays',
    points: 10,
    coinReward: 100,
    timeLimit: 15,
    memoryLimit: 256,
    problemStatement: `Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.

You may assume that each input would have exactly one solution, and you may not use the same element twice.

You can return the answer in any order.`,
    inputFormat: 'First line contains n (size of array) and target. Second line contains n space-separated integers.',
    outputFormat: 'Two space-separated indices of the numbers that add up to target.',
    constraints: [
      '2 <= nums.length <= 10^4',
      '-10^9 <= nums[i] <= 10^9',
      '-10^9 <= target <= 10^9',
      'Only one valid answer exists.'
    ],
    examples: [
      {
        input: '4 9\n2 7 11 15',
        output: '0 1',
        explanation: 'Because nums[0] + nums[1] == 9, we return [0, 1].'
      },
      {
        input: '3 6\n3 2 4',
        output: '1 2',
        explanation: 'nums[1] + nums[2] = 2 + 4 = 6'
      }
    ],
    testCases: [
      { input: '4 9\n2 7 11 15', expectedOutput: '0 1', isHidden: false, points: 10 },
      { input: '3 6\n3 2 4', expectedOutput: '1 2', isHidden: false, points: 10 },
      { input: '2 6\n3 3', expectedOutput: '0 1', isHidden: true, points: 10 },
      { input: '5 10\n1 2 3 4 6', expectedOutput: '3 4', isHidden: true, points: 10 },
    ],
    hints: [
      { text: 'Try using a hash map to store the complement of each number.', coinCost: 30 },
      { text: 'For each number, check if (target - num) exists in the hash map.', coinCost: 50 }
    ],
    starterCode: {
      javascript: `function twoSum(nums, target) {
  // Your code here
  
}

// Read input
const readline = require('readline');
const rl = readline.createInterface({ input: process.stdin });
let lines = [];

rl.on('line', (line) => lines.push(line));
rl.on('close', () => {
  const [n, target] = lines[0].split(' ').map(Number);
  const nums = lines[1].split(' ').map(Number);
  const result = twoSum(nums, target);
  console.log(result.join(' '));
});`,
      python: `def two_sum(nums, target):
    # Your code here
    pass

# Read input
import sys
lines = sys.stdin.read().strip().split('\\n')
n, target = map(int, lines[0].split())
nums = list(map(int, lines[1].split()))
result = two_sum(nums, target)
print(' '.join(map(str, result)))`,
      java: `import java.util.*;

public class Solution {
    public static int[] twoSum(int[] nums, int target) {
        // Your code here
        return new int[]{};
    }
    
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        String[] first = sc.nextLine().split(" ");
        int n = Integer.parseInt(first[0]);
        int target = Integer.parseInt(first[1]);
        int[] nums = new int[n];
        String[] numsStr = sc.nextLine().split(" ");
        for (int i = 0; i < n; i++) {
            nums[i] = Integer.parseInt(numsStr[i]);
        }
        int[] result = twoSum(nums, target);
        System.out.println(result[0] + " " + result[1]);
    }
}`,
      cpp: `#include <iostream>
#include <vector>
#include <unordered_map>
using namespace std;

vector<int> twoSum(vector<int>& nums, int target) {
    // Your code here
    return {};
}

int main() {
    int n, target;
    cin >> n >> target;
    vector<int> nums(n);
    for (int i = 0; i < n; i++) {
        cin >> nums[i];
    }
    vector<int> result = twoSum(nums, target);
    cout << result[0] << " " << result[1] << endl;
    return 0;
}`
    },
    solution: `function twoSum(nums, target) {
  const map = new Map();
  for (let i = 0; i < nums.length; i++) {
    const complement = target - nums[i];
    if (map.has(complement)) {
      return [map.get(complement), i];
    }
    map.set(nums[i], i);
  }
  return [];
}`,
    solutionExplanation: 'Use a hash map to store each number and its index. For each number, check if the complement exists in the map.',
    tags: ['array', 'hash-table'],
    isPremium: false,
    isDaily: false,
    totalSubmissions: 0,
    successfulSubmissions: 0,
    acceptanceRate: 0,
    createdAt: Date.now(),
    updatedAt: Date.now()
  },
  {
    title: 'Valid Parentheses',
    description: 'Check if string of brackets is valid',
    difficulty: 'easy',
    category: 'Strings',
    points: 10,
    coinReward: 100,
    timeLimit: 10,
    memoryLimit: 256,
    problemStatement: `Given a string s containing just the characters '(', ')', '{', '}', '[' and ']', determine if the input string is valid.

An input string is valid if:
1. Open brackets must be closed by the same type of brackets.
2. Open brackets must be closed in the correct order.
3. Every close bracket has a corresponding open bracket of the same type.`,
    inputFormat: 'A single line containing the string s.',
    outputFormat: 'Print "true" if valid, "false" otherwise.',
    constraints: [
      '1 <= s.length <= 10^4',
      's consists of parentheses only \'()[]{}\'.'
    ],
    examples: [
      { input: '()', output: 'true', explanation: 'Single pair of matching parentheses.' },
      { input: '()[]{}', output: 'true', explanation: 'All brackets are properly matched.' },
      { input: '(]', output: 'false', explanation: 'Mismatched bracket types.' }
    ],
    testCases: [
      { input: '()', expectedOutput: 'true', isHidden: false, points: 10 },
      { input: '()[]{}', expectedOutput: 'true', isHidden: false, points: 10 },
      { input: '(]', expectedOutput: 'false', isHidden: false, points: 10 },
      { input: '([)]', expectedOutput: 'false', isHidden: true, points: 10 },
      { input: '{[]}', expectedOutput: 'true', isHidden: true, points: 10 },
    ],
    hints: [
      { text: 'Use a stack data structure.', coinCost: 30 },
      { text: 'Push opening brackets, pop and match for closing brackets.', coinCost: 50 }
    ],
    starterCode: {
      javascript: `function isValid(s) {
  // Your code here
  
}

const readline = require('readline');
const rl = readline.createInterface({ input: process.stdin });
rl.on('line', (line) => {
  console.log(isValid(line));
  rl.close();
});`,
      python: `def is_valid(s):
    # Your code here
    pass

s = input().strip()
print('true' if is_valid(s) else 'false')`,
      java: `import java.util.*;

public class Solution {
    public static boolean isValid(String s) {
        // Your code here
        return false;
    }
    
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        String s = sc.nextLine();
        System.out.println(isValid(s));
    }
}`,
      cpp: `#include <iostream>
#include <stack>
#include <string>
using namespace std;

bool isValid(string s) {
    // Your code here
    return false;
}

int main() {
    string s;
    cin >> s;
    cout << (isValid(s) ? "true" : "false") << endl;
    return 0;
}`
    },
    tags: ['string', 'stack'],
    isPremium: false,
    isDaily: false,
    totalSubmissions: 0,
    successfulSubmissions: 0,
    acceptanceRate: 0,
    createdAt: Date.now(),
    updatedAt: Date.now()
  },
  {
    title: 'Maximum Subarray',
    description: 'Find the contiguous subarray with largest sum',
    difficulty: 'medium',
    category: 'Dynamic Programming',
    points: 25,
    coinReward: 250,
    timeLimit: 15,
    memoryLimit: 256,
    problemStatement: `Given an integer array nums, find the subarray with the largest sum, and return its sum.

A subarray is a contiguous non-empty sequence of elements within an array.`,
    inputFormat: 'First line contains n (size of array). Second line contains n space-separated integers.',
    outputFormat: 'A single integer - the maximum subarray sum.',
    constraints: [
      '1 <= nums.length <= 10^5',
      '-10^4 <= nums[i] <= 10^4'
    ],
    examples: [
      {
        input: '9\n-2 1 -3 4 -1 2 1 -5 4',
        output: '6',
        explanation: 'The subarray [4,-1,2,1] has the largest sum 6.'
      },
      {
        input: '1\n1',
        output: '1',
        explanation: 'Single element array.'
      }
    ],
    testCases: [
      { input: '9\n-2 1 -3 4 -1 2 1 -5 4', expectedOutput: '6', isHidden: false, points: 15 },
      { input: '1\n1', expectedOutput: '1', isHidden: false, points: 10 },
      { input: '5\n5 4 -1 7 8', expectedOutput: '23', isHidden: true, points: 15 },
      { input: '3\n-1 -2 -3', expectedOutput: '-1', isHidden: true, points: 10 },
    ],
    hints: [
      { text: 'Think about Kadane\'s algorithm.', coinCost: 50 },
      { text: 'At each position, decide whether to extend the previous subarray or start a new one.', coinCost: 75 }
    ],
    starterCode: {
      javascript: `function maxSubArray(nums) {
  // Your code here
  
}

const readline = require('readline');
const rl = readline.createInterface({ input: process.stdin });
let lines = [];

rl.on('line', (line) => lines.push(line));
rl.on('close', () => {
  const n = parseInt(lines[0]);
  const nums = lines[1].split(' ').map(Number);
  console.log(maxSubArray(nums));
});`,
      python: `def max_sub_array(nums):
    # Your code here
    pass

import sys
lines = sys.stdin.read().strip().split('\\n')
n = int(lines[0])
nums = list(map(int, lines[1].split()))
print(max_sub_array(nums))`,
      java: `import java.util.*;

public class Solution {
    public static int maxSubArray(int[] nums) {
        // Your code here
        return 0;
    }
    
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        int n = Integer.parseInt(sc.nextLine());
        int[] nums = new int[n];
        String[] numsStr = sc.nextLine().split(" ");
        for (int i = 0; i < n; i++) {
            nums[i] = Integer.parseInt(numsStr[i]);
        }
        System.out.println(maxSubArray(nums));
    }
}`,
      cpp: `#include <iostream>
#include <vector>
#include <algorithm>
using namespace std;

int maxSubArray(vector<int>& nums) {
    // Your code here
    return 0;
}

int main() {
    int n;
    cin >> n;
    vector<int> nums(n);
    for (int i = 0; i < n; i++) {
        cin >> nums[i];
    }
    cout << maxSubArray(nums) << endl;
    return 0;
}`
    },
    tags: ['array', 'dynamic-programming', 'divide-and-conquer'],
    isPremium: false,
    isDaily: false,
    totalSubmissions: 0,
    successfulSubmissions: 0,
    acceptanceRate: 0,
    createdAt: Date.now(),
    updatedAt: Date.now()
  },
  {
    title: 'Merge Intervals',
    description: 'Merge overlapping intervals',
    difficulty: 'medium',
    category: 'Arrays',
    points: 25,
    coinReward: 250,
    timeLimit: 15,
    memoryLimit: 256,
    problemStatement: `Given an array of intervals where intervals[i] = [starti, endi], merge all overlapping intervals, and return an array of the non-overlapping intervals that cover all the intervals in the input.`,
    inputFormat: 'First line contains n (number of intervals). Next n lines contain two space-separated integers representing start and end of each interval.',
    outputFormat: 'Print merged intervals, each on a new line as "start end".',
    constraints: [
      '1 <= intervals.length <= 10^4',
      'intervals[i].length == 2',
      '0 <= starti <= endi <= 10^4'
    ],
    examples: [
      {
        input: '4\n1 3\n2 6\n8 10\n15 18',
        output: '1 6\n8 10\n15 18',
        explanation: 'Since intervals [1,3] and [2,6] overlap, merge them into [1,6].'
      }
    ],
    testCases: [
      { input: '4\n1 3\n2 6\n8 10\n15 18', expectedOutput: '1 6\n8 10\n15 18', isHidden: false, points: 15 },
      { input: '2\n1 4\n4 5', expectedOutput: '1 5', isHidden: false, points: 10 },
      { input: '3\n1 4\n0 4\n2 3', expectedOutput: '0 4', isHidden: true, points: 15 },
    ],
    hints: [
      { text: 'Sort the intervals by start time first.', coinCost: 50 },
      { text: 'Compare end of current interval with start of next.', coinCost: 75 }
    ],
    starterCode: {
      javascript: `function merge(intervals) {
  // Your code here
  
}

const readline = require('readline');
const rl = readline.createInterface({ input: process.stdin });
let lines = [];

rl.on('line', (line) => lines.push(line));
rl.on('close', () => {
  const n = parseInt(lines[0]);
  const intervals = [];
  for (let i = 1; i <= n; i++) {
    intervals.push(lines[i].split(' ').map(Number));
  }
  const result = merge(intervals);
  result.forEach(r => console.log(r.join(' ')));
});`,
      python: `def merge(intervals):
    # Your code here
    pass

import sys
lines = sys.stdin.read().strip().split('\\n')
n = int(lines[0])
intervals = [list(map(int, lines[i+1].split())) for i in range(n)]
result = merge(intervals)
for r in result:
    print(' '.join(map(str, r)))`,
      java: `import java.util.*;

public class Solution {
    public static int[][] merge(int[][] intervals) {
        // Your code here
        return new int[][]{};
    }
    
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        int n = Integer.parseInt(sc.nextLine());
        int[][] intervals = new int[n][2];
        for (int i = 0; i < n; i++) {
            String[] parts = sc.nextLine().split(" ");
            intervals[i][0] = Integer.parseInt(parts[0]);
            intervals[i][1] = Integer.parseInt(parts[1]);
        }
        int[][] result = merge(intervals);
        for (int[] r : result) {
            System.out.println(r[0] + " " + r[1]);
        }
    }
}`,
      cpp: `#include <iostream>
#include <vector>
#include <algorithm>
using namespace std;

vector<vector<int>> merge(vector<vector<int>>& intervals) {
    // Your code here
    return {};
}

int main() {
    int n;
    cin >> n;
    vector<vector<int>> intervals(n, vector<int>(2));
    for (int i = 0; i < n; i++) {
        cin >> intervals[i][0] >> intervals[i][1];
    }
    auto result = merge(intervals);
    for (auto& r : result) {
        cout << r[0] << " " << r[1] << endl;
    }
    return 0;
}`
    },
    tags: ['array', 'sorting'],
    isPremium: false,
    isDaily: false,
    totalSubmissions: 0,
    successfulSubmissions: 0,
    acceptanceRate: 0,
    createdAt: Date.now(),
    updatedAt: Date.now()
  },
  {
    title: 'Longest Palindromic Substring',
    description: 'Find the longest palindromic substring in a string',
    difficulty: 'hard',
    category: 'Strings',
    points: 50,
    coinReward: 500,
    timeLimit: 20,
    memoryLimit: 512,
    problemStatement: `Given a string s, return the longest palindromic substring in s.

A palindrome is a string that reads the same forward and backward.`,
    inputFormat: 'A single line containing the string s.',
    outputFormat: 'The longest palindromic substring.',
    constraints: [
      '1 <= s.length <= 1000',
      's consist of only digits and English letters.'
    ],
    examples: [
      {
        input: 'babad',
        output: 'bab',
        explanation: '"aba" is also a valid answer.'
      },
      {
        input: 'cbbd',
        output: 'bb',
        explanation: 'The longest palindrome is "bb".'
      }
    ],
    testCases: [
      { input: 'babad', expectedOutput: 'bab', isHidden: false, points: 15 },
      { input: 'cbbd', expectedOutput: 'bb', isHidden: false, points: 15 },
      { input: 'a', expectedOutput: 'a', isHidden: true, points: 10 },
      { input: 'aacabdkacaa', expectedOutput: 'aca', isHidden: true, points: 10 },
    ],
    hints: [
      { text: 'Consider expanding from each character as the center of a potential palindrome.', coinCost: 75 },
      { text: 'Handle both odd and even length palindromes separately.', coinCost: 100 }
    ],
    starterCode: {
      javascript: `function longestPalindrome(s) {
  // Your code here
  
}

const readline = require('readline');
const rl = readline.createInterface({ input: process.stdin });
rl.on('line', (line) => {
  console.log(longestPalindrome(line));
  rl.close();
});`,
      python: `def longest_palindrome(s):
    # Your code here
    pass

s = input().strip()
print(longest_palindrome(s))`,
      java: `import java.util.*;

public class Solution {
    public static String longestPalindrome(String s) {
        // Your code here
        return "";
    }
    
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        String s = sc.nextLine();
        System.out.println(longestPalindrome(s));
    }
}`,
      cpp: `#include <iostream>
#include <string>
using namespace std;

string longestPalindrome(string s) {
    // Your code here
    return "";
}

int main() {
    string s;
    cin >> s;
    cout << longestPalindrome(s) << endl;
    return 0;
}`
    },
    tags: ['string', 'dynamic-programming'],
    isPremium: false,
    isDaily: false,
    totalSubmissions: 0,
    successfulSubmissions: 0,
    acceptanceRate: 0,
    createdAt: Date.now(),
    updatedAt: Date.now()
  }
];

// Function to seed challenges to backend API
export async function seedChallenges() {
  try {
    const apiRequest = (await import('../../service/api')).apiRequest;
    
    for (const challenge of sampleChallenges) {
      await apiRequest('/challenges', {
        method: 'POST',
        body: JSON.stringify(challenge)
      });
      console.log(`Added challenge: ${challenge.title}`);
    }
    
    console.log('All challenges seeded successfully!');
  } catch (error) {
    console.error('Error seeding challenges:', error);
    throw error;
  }
}

export default sampleChallenges;
