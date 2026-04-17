// This script has been deprecated - challenges are now managed via backend API
// Use the backend endpoints to seed challenges instead

import { apiRequest } from '../service/api';

// Real coding challenges with test cases
const challenges = [
  {
    title: "Two Sum",
    description: `Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.

You may assume that each input would have exactly one solution, and you may not use the same element twice.

You can return the answer in any order.

Example 1:
Input: nums = [2,7,11,15], target = 9
Output: [0,1]
Explanation: Because nums[0] + nums[1] == 9, we return [0, 1].

Example 2:
Input: nums = [3,2,4], target = 6
Output: [1,2]

Example 3:
Input: nums = [3,3], target = 6
Output: [0,1]`,
    difficulty: 'Easy',
    category: 'Arrays',
    points: 100,
    coinReward: 50,
    timeLimit: 30,
    constraints: [
      "2 <= nums.length <= 10^4",
      "-10^9 <= nums[i] <= 10^9",
      "-10^9 <= target <= 10^9",
      "Only one valid answer exists"
    ],
    hints: [
      "A brute force approach would be to check every pair of numbers.",
      "Think about using a hash map to store numbers you've seen.",
      "For each number, check if (target - number) exists in the hash map."
    ],
    sampleTestCases: [
      { input: "[2,7,11,15]\n9", expectedOutput: "[0,1]" },
      { input: "[3,2,4]\n6", expectedOutput: "[1,2]" }
    ],
    testCases: [
      { input: "[2,7,11,15]\n9", expectedOutput: "[0,1]" },
      { input: "[3,2,4]\n6", expectedOutput: "[1,2]" },
      { input: "[3,3]\n6", expectedOutput: "[0,1]" },
      { input: "[-1,-2,-3,-4,-5]\n-8", expectedOutput: "[2,4]" },
      { input: "[1,5,3,7,9]\n12", expectedOutput: "[2,4]" }
    ],
    starterCode: {
      javascript: `function twoSum(nums, target) {
    // Write your code here
    
}`,
      python: `def two_sum(nums, target):
    # Write your code here
    pass`,
      java: `class Solution {
    public int[] twoSum(int[] nums, int target) {
        // Write your code here
        
    }
}`,
      cpp: `class Solution {
public:
    vector<int> twoSum(vector<int>& nums, int target) {
        // Write your code here
        
    }
};`
    },
    totalSubmissions: 0,
    successfulSubmissions: 0
  },
  {
    title: "Reverse String",
    description: `Write a function that reverses a string. The input string is given as an array of characters s.

You must do this by modifying the input array in-place with O(1) extra memory.

Example 1:
Input: s = ["h","e","l","l","o"]
Output: ["o","l","l","e","h"]

Example 2:
Input: s = ["H","a","n","n","a","h"]
Output: ["h","a","n","n","a","H"]`,
    difficulty: 'Easy',
    category: 'Strings',
    points: 80,
    coinReward: 40,
    timeLimit: 20,
    constraints: [
      "1 <= s.length <= 10^5",
      "s[i] is a printable ascii character"
    ],
    hints: [
      "Use two pointers approach",
      "Swap characters from both ends moving towards the center"
    ],
    sampleTestCases: [
      { input: '["h","e","l","l","o"]', expectedOutput: '["o","l","l","e","h"]' }
    ],
    testCases: [
      { input: '["h","e","l","l","o"]', expectedOutput: '["o","l","l","e","h"]' },
      { input: '["H","a","n","n","a","h"]', expectedOutput: '["h","a","n","n","a","H"]' },
      { input: '["a"]', expectedOutput: '["a"]' },
      { input: '["a","b"]', expectedOutput: '["b","a"]' }
    ],
    starterCode: {
      javascript: `function reverseString(s) {
    // Write your code here
    
}`,
      python: `def reverse_string(s):
    # Write your code here
    pass`,
      java: `class Solution {
    public void reverseString(char[] s) {
        // Write your code here
        
    }
}`,
      cpp: `class Solution {
public:
    void reverseString(vector<char>& s) {
        // Write your code here
        
    }
};`
    },
    totalSubmissions: 0,
    successfulSubmissions: 0
  },
  {
    title: "Valid Parentheses",
    description: `Given a string s containing just the characters '(', ')', '{', '}', '[' and ']', determine if the input string is valid.

An input string is valid if:
1. Open brackets must be closed by the same type of brackets.
2. Open brackets must be closed in the correct order.
3. Every close bracket has a corresponding open bracket of the same type.

Example 1:
Input: s = "()"
Output: true

Example 2:
Input: s = "()[]{}"
Output: true

Example 3:
Input: s = "(]"
Output: false`,
    difficulty: 'Medium',
    category: 'Stack',
    points: 150,
    coinReward: 75,
    timeLimit: 30,
    constraints: [
      "1 <= s.length <= 10^4",
      "s consists of parentheses only '()[]{}'."
    ],
    hints: [
      "Use a stack data structure",
      "When you see an opening bracket, push it to stack",
      "When you see a closing bracket, check if it matches the top of stack"
    ],
    sampleTestCases: [
      { input: "()", expectedOutput: "true" },
      { input: "()[]{}", expectedOutput: "true" },
      { input: "(]", expectedOutput: "false" }
    ],
    testCases: [
      { input: "()", expectedOutput: "true" },
      { input: "()[]{}", expectedOutput: "true" },
      { input: "(]", expectedOutput: "false" },
      { input: "([)]", expectedOutput: "false" },
      { input: "{[]}", expectedOutput: "true" },
      { input: "", expectedOutput: "true" }
    ],
    starterCode: {
      javascript: `function isValid(s) {
    // Write your code here
    
}`,
      python: `def is_valid(s):
    # Write your code here
    pass`,
      java: `class Solution {
    public boolean isValid(String s) {
        // Write your code here
        
    }
}`,
      cpp: `class Solution {
public:
    bool isValid(string s) {
        // Write your code here
        
    }
};`
    },
    totalSubmissions: 0,
    successfulSubmissions: 0
  },
  {
    title: "Binary Search",
    description: `Given an array of integers nums which is sorted in ascending order, and an integer target, write a function to search target in nums. If target exists, then return its index. Otherwise, return -1.

You must write an algorithm with O(log n) runtime complexity.

Example 1:
Input: nums = [-1,0,3,5,9,12], target = 9
Output: 4
Explanation: 9 exists in nums and its index is 4

Example 2:
Input: nums = [-1,0,3,5,9,12], target = 2
Output: -1
Explanation: 2 does not exist in nums so return -1`,
    difficulty: 'Easy',
    category: 'Binary Search',
    points: 100,
    coinReward: 50,
    timeLimit: 25,
    constraints: [
      "1 <= nums.length <= 10^4",
      "-10^4 < nums[i], target < 10^4",
      "All the integers in nums are unique.",
      "nums is sorted in ascending order."
    ],
    hints: [
      "Use binary search algorithm",
      "Compare middle element with target",
      "Adjust search range based on comparison"
    ],
    sampleTestCases: [
      { input: "[-1,0,3,5,9,12]\n9", expectedOutput: "4" },
      { input: "[-1,0,3,5,9,12]\n2", expectedOutput: "-1" }
    ],
    testCases: [
      { input: "[-1,0,3,5,9,12]\n9", expectedOutput: "4" },
      { input: "[-1,0,3,5,9,12]\n2", expectedOutput: "-1" },
      { input: "[5]\n5", expectedOutput: "0" },
      { input: "[1,2,3,4,5]\n1", expectedOutput: "0" },
      { input: "[1,2,3,4,5]\n5", expectedOutput: "4" }
    ],
    starterCode: {
      javascript: `function search(nums, target) {
    // Write your code here
    
}`,
      python: `def search(nums, target):
    # Write your code here
    pass`,
      java: `class Solution {
    public int search(int[] nums, int target) {
        // Write your code here
        
    }
}`,
      cpp: `class Solution {
public:
    int search(vector<int>& nums, int target) {
        // Write your code here
        
    }
};`
    },
    totalSubmissions: 0,
    successfulSubmissions: 0
  },
  {
    title: "Palindrome Number",
    description: `Given an integer x, return true if x is a palindrome, and false otherwise.

Example 1:
Input: x = 121
Output: true
Explanation: 121 reads as 121 from left to right and from right to left.

Example 2:
Input: x = -121
Output: false
Explanation: From left to right, it reads -121. From right to left, it becomes 121-. Therefore it is not a palindrome.

Example 3:
Input: x = 10
Output: false
Explanation: Reads 01 from right to left. Therefore it is not a palindrome.`,
    difficulty: 'Easy',
    category: 'Math',
    points: 90,
    coinReward: 4,
    timeLimit: 20,
    constraints: [
      "-2^31 <= x <= 2^31 - 1"
    ],
    hints: [
      "Negative numbers are not palindromes",
      "Convert to string or reverse the number mathematically",
      "Compare with original"
    ],
    sampleTestCases: [
      { input: "121", expectedOutput: "true" },
      { input: "-121", expectedOutput: "false" },
      { input: "10", expectedOutput: "false" }
    ],
    testCases: [
      { input: "121", expectedOutput: "true" },
      { input: "-121", expectedOutput: "false" },
      { input: "10", expectedOutput: "false" },
      { input: "0", expectedOutput: "true" },
      { input: "12321", expectedOutput: "true" },
      { input: "123", expectedOutput: "false" }
    ],
    starterCode: {
      javascript: `function isPalindrome(x) {
    // Write your code here
    
}`,
      python: `def is_palindrome(x):
    # Write your code here
    pass`,
      java: `class Solution {
    public boolean isPalindrome(int x) {
        // Write your code here
        
    }
}`,
      cpp: `class Solution {
public:
    bool isPalindrome(int x) {
        // Write your code here
        
    }
};`
    },
    totalSubmissions: 0,
    successfulSubmissions: 0
  },
  {
    title: "Fizz Buzz",
    description: `Given an integer n, return a string array answer (1-indexed) where:

answer[i] == "FizzBuzz" if i is divisible by 3 and 5.
answer[i] == "Fizz" if i is divisible by 3.
answer[i] == "Buzz" if i is divisible by 5.
answer[i] == i (as a string) if none of the above conditions are true.

Example 1:
Input: n = 3
Output: ["1","2","Fizz"]

Example 2:
Input: n = 5
Output: ["1","2","Fizz","4","Buzz"]

Example 3:
Input: n = 15
Output: ["1","2","Fizz","4","Buzz","Fizz","7","8","Fizz","Buzz","11","Fizz","13","14","FizzBuzz"]`,
    difficulty: 'Easy',
    category: 'Math',
    points: 80,
    coinReward: 40,
    timeLimit: 15,
    constraints: [
      "1 <= n <= 10^4"
    ],
    hints: [
      "Check divisibility by 15 first (both 3 and 5)",
      "Then check divisibility by 3",
      "Then check divisibility by 5",
      "Otherwise use the number as string"
    ],
    sampleTestCases: [
      { input: "3", expectedOutput: '["1","2","Fizz"]' },
      { input: "5", expectedOutput: '["1","2","Fizz","4","Buzz"]' }
    ],
    testCases: [
      { input: "3", expectedOutput: '["1","2","Fizz"]' },
      { input: "5", expectedOutput: '["1","2","Fizz","4","Buzz"]' },
      { input: "15", expectedOutput: '["1","2","Fizz","4","Buzz","Fizz","7","8","Fizz","Buzz","11","Fizz","13","14","FizzBuzz"]' },
      { input: "1", expectedOutput: '["1"]' }
    ],
    starterCode: {
      javascript: `function fizzBuzz(n) {
    // Write your code here
    
}`,
      python: `def fizz_buzz(n):
    # Write your code here
    pass`,
      java: `class Solution {
    public List<String> fizzBuzz(int n) {
        // Write your code here
        
    }
}`,
      cpp: `class Solution {
public:
    vector<string> fizzBuzz(int n) {
        // Write your code here
        
    }
};`
    },
    totalSubmissions: 0,
    successfulSubmissions: 0
  },
  {
    title: "Maximum Subarray",
    description: `Given an integer array nums, find the subarray with the largest sum, and return its sum.

Example 1:
Input: nums = [-2,1,-3,4,-1,2,1,-5,4]
Output: 6
Explanation: The subarray [4,-1,2,1] has the largest sum 6.

Example 2:
Input: nums = [1]
Output: 1
Explanation: The subarray [1] has the largest sum 1.

Example 3:
Input: nums = [5,4,-1,7,8]
Output: 23
Explanation: The subarray [5,4,-1,7,8] has the largest sum 23.`,
    difficulty: 'Medium',
    category: 'Dynamic Programming',
    points: 150,
    coinReward: 75,
    timeLimit: 35,
    constraints: [
      "1 <= nums.length <= 10^5",
      "-10^4 <= nums[i] <= 10^4"
    ],
    hints: [
      "Use Kadane's Algorithm",
      "Keep track of current sum and maximum sum",
      "If current sum becomes negative, reset it to 0"
    ],
    sampleTestCases: [
      { input: "[-2,1,-3,4,-1,2,1,-5,4]", expectedOutput: "6" },
      { input: "[1]", expectedOutput: "1" }
    ],
    testCases: [
      { input: "[-2,1,-3,4,-1,2,1,-5,4]", expectedOutput: "6" },
      { input: "[1]", expectedOutput: "1" },
      { input: "[5,4,-1,7,8]", expectedOutput: "23" },
      { input: "[-1]", expectedOutput: "-1" },
      { input: "[-2,-1]", expectedOutput: "-1" }
    ],
    starterCode: {
      javascript: `function maxSubArray(nums) {
    // Write your code here
    
}`,
      python: `def max_sub_array(nums):
    # Write your code here
    pass`,
      java: `class Solution {
    public int maxSubArray(int[] nums) {
        // Write your code here
        
    }
}`,
      cpp: `class Solution {
public:
    int maxSubArray(vector<int>& nums) {
        // Write your code here
        
    }
};`
    },
    totalSubmissions: 0,
    successfulSubmissions: 0
  },
  {
    title: "Merge Two Sorted Lists",
    description: `You are given the heads of two sorted linked lists list1 and list2.

Merge the two lists into one sorted list. The list should be made by splicing together the nodes of the first two lists.

Return the head of the merged linked list.

Example 1:
Input: list1 = [1,2,4], list2 = [1,3,4]
Output: [1,1,2,3,4,4]

Example 2:
Input: list1 = [], list2 = []
Output: []

Example 3:
Input: list1 = [], list2 = [0]
Output: [0]`,
    difficulty: 'Easy',
    category: 'Linked List',
    points: 100,
    coinReward: 50,
    timeLimit: 30,
    constraints: [
      "The number of nodes in both lists is in the range [0, 50].",
      "-100 <= Node.val <= 100",
      "Both list1 and list2 are sorted in non-decreasing order."
    ],
    hints: [
      "Use a dummy node to simplify edge cases",
      "Compare nodes from both lists",
      "Attach remaining nodes when one list is exhausted"
    ],
    sampleTestCases: [
      { input: "[1,2,4]\n[1,3,4]", expectedOutput: "[1,1,2,3,4,4]" },
      { input: "[]\n[]", expectedOutput: "[]" }
    ],
    testCases: [
      { input: "[1,2,4]\n[1,3,4]", expectedOutput: "[1,1,2,3,4,4]" },
      { input: "[]\n[]", expectedOutput: "[]" },
      { input: "[]\n[0]", expectedOutput: "[0]" },
      { input: "[1]\n[2]", expectedOutput: "[1,2]" }
    ],
    starterCode: {
      javascript: `function mergeTwoLists(list1, list2) {
    // Write your code here
    
}`,
      python: `def merge_two_lists(list1, list2):
    # Write your code here
    pass`,
      java: `class Solution {
    public ListNode mergeTwoLists(ListNode list1, ListNode list2) {
        // Write your code here
        
    }
}`,
      cpp: `class Solution {
public:
    ListNode* mergeTwoLists(ListNode* list1, ListNode* list2) {
        // Write your code here
        
    }
};`
    },
    totalSubmissions: 0,
    successfulSubmissions: 0
  },
  {
    title: "Best Time to Buy and Sell Stock",
    description: `You are given an array prices where prices[i] is the price of a given stock on the ith day.

You want to maximize your profit by choosing a single day to buy one stock and choosing a different day in the future to sell that stock.

Return the maximum profit you can achieve from this transaction. If you cannot achieve any profit, return 0.

Example 1:
Input: prices = [7,1,5,3,6,4]
Output: 5
Explanation: Buy on day 2 (price = 1) and sell on day 5 (price = 6), profit = 6-1 = 5.

Example 2:
Input: prices = [7,6,4,3,1]
Output: 0
Explanation: In this case, no transactions are done and the max profit = 0.`,
    difficulty: 'Easy',
    category: 'Arrays',
    points: 100,
    coinReward: 50,
    timeLimit: 25,
    constraints: [
      "1 <= prices.length <= 10^5",
      "0 <= prices[i] <= 10^4"
    ],
    hints: [
      "Track minimum price seen so far",
      "Calculate profit if selling at current price",
      "Update maximum profit"
    ],
    sampleTestCases: [
      { input: "[7,1,5,3,6,4]", expectedOutput: "5" },
      { input: "[7,6,4,3,1]", expectedOutput: "0" }
    ],
    testCases: [
      { input: "[7,1,5,3,6,4]", expectedOutput: "5" },
      { input: "[7,6,4,3,1]", expectedOutput: "0" },
      { input: "[2,4,1]", expectedOutput: "2" },
      { input: "[1,2]", expectedOutput: "1" }
    ],
    starterCode: {
      javascript: `function maxProfit(prices) {
    // Write your code here
    
}`,
      python: `def max_profit(prices):
    # Write your code here
    pass`,
      java: `class Solution {
    public int maxProfit(int[] prices) {
        // Write your code here
        
    }
}`,
      cpp: `class Solution {
public:
    int maxProfit(vector<int>& prices) {
        // Write your code here
        
    }
};`
    },
    totalSubmissions: 0,
    successfulSubmissions: 0
  },
  {
    title: "Contains Duplicate",
    description: `Given an integer array nums, return true if any value appears at least twice in the array, and return false if every element is distinct.

Example 1:
Input: nums = [1,2,3,1]
Output: true

Example 2:
Input: nums = [1,2,3,4]
Output: false

Example 3:
Input: nums = [1,1,1,3,3,4,3,2,4,2]
Output: true`,
    difficulty: 'Easy',
    category: 'Hash Table',
    points: 80,
    coinReward: 40,
    timeLimit: 20,
    constraints: [
      "1 <= nums.length <= 10^5",
      "-10^9 <= nums[i] <= 10^9"
    ],
    hints: [
      "Use a Set to track seen numbers",
      "If you encounter a number already in the set, return true",
      "If you finish the loop, return false"
    ],
    sampleTestCases: [
      { input: "[1,2,3,1]", expectedOutput: "true" },
      { input: "[1,2,3,4]", expectedOutput: "false" }
    ],
    testCases: [
      { input: "[1,2,3,1]", expectedOutput: "true" },
      { input: "[1,2,3,4]", expectedOutput: "false" },
      { input: "[1,1,1,3,3,4,3,2,4,2]", expectedOutput: "true" },
      { input: "[1]", expectedOutput: "false" }
    ],
    starterCode: {
      javascript: `function containsDuplicate(nums) {
    // Write your code here
    
}`,
      python: `def contains_duplicate(nums):
    # Write your code here
    pass`,
      java: `class Solution {
    public boolean containsDuplicate(int[] nums) {
        // Write your code here
        
    }
}`,
      cpp: `class Solution {
public:
    bool containsDuplicate(vector<int>& nums) {
        // Write your code here
        
    }
};`
    },
    totalSubmissions: 0,
    successfulSubmissions: 0
  }
];

export async function seedChallenges() {
  try {
    console.log('Starting to seed challenges via backend API...');
    
    // Check if challenges already exist
    const response = await apiRequest('/challenges');
    const existingChallenges = response.challenges || [];
    
    if (existingChallenges.length > 0) {
      console.log(`${existingChallenges.length} challenges already exist. Skipping seed.`);
      return { success: true, added: 0, existing: existingChallenges.length };
    }

    let added = 0;

    for (const challenge of challenges) {
      await apiRequest('/challenges', {
        method: 'POST',
        body: JSON.stringify({
          ...challenge,
          isActive: true
        })
      });
      added++;
      console.log(`✓ Added: ${challenge.title}`);
    }

    console.log(`\n✅ Successfully seeded ${added} challenges!`);
    return { success: true, added, existing: 0 };
  } catch (error) {
    console.error('Error seeding challenges:', error);
    return { success: false, error };
  }
}

// Run if executed directly - commented out for browser compatibility
// if (require.main === module) {
//   seedChallenges().then((result) => {
//     console.log('Seed complete:', result);
//     process.exit(0);
//   }).catch((error) => {
//     console.error('Seed failed:', error);
//     process.exit(1);
//   });
// }
