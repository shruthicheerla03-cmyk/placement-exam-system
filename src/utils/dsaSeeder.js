/**
 * DSA Questions Seeder - Competitive Programming Style
 * Comprehensive coding problems for Round 3 with extensive test cases
 * 
 * Features:
 * - Detailed problem descriptions with summaries
 * - Multiple visible test cases for understanding
 * - Hidden test cases for edge cases validation
 * - Corner cases and boundary conditions
 * - Starter code templates for all 5 languages
 * - Hints and explanations
 */

import { collection, getDocs, deleteDoc, doc, addDoc } from 'firebase/firestore';

/**
 * Clear all existing DSA questions before seeding
 */
export const clearDSAQuestions = async (db) => {
  try {
    const snapshot = await getDocs(collection(db, 'questions'));
    const dsaQuestions = snapshot.docs.filter(d => d.data().category === 'DSA');
    
    let deletedCount = 0;
    for (const question of dsaQuestions) {
      await deleteDoc(doc(db, 'questions', question.id));
      deletedCount++;
      console.log(`🗑️ Deleted: ${question.data().title}`);
    }
    
    return {
      success: true,
      message: `Cleared ${deletedCount} existing DSA questions`,
      deletedCount
    };
  } catch (error) {
    console.error('Clear error:', error);
    return {
      success: false,
      message: `Error clearing DSA questions: ${error.message}`,
      deletedCount: 0
    };
  }
};

export const dsaQuestions = [
  // ============ PROBLEM 1: Two Sum ============
  {
    id: 'dsa_two_sum_v2',
    title: 'Two Sum',
    text: 'Find two numbers in an array that add up to a target value',
    description: `Given an array of integers nums and an integer target, return the indices of the two numbers such that they add up to target.

**Problem Summary:**
You are given an array of integers and a target number. Your task is to find exactly two numbers in the array that sum up to the target value and return their indices (positions in the array).

**Important Notes:**
- Each input has exactly ONE valid solution
- You cannot use the same element twice
- You can return the indices in any order
- Array indices start from 0

**Approach:**
This is a classic hashing/dictionary problem. The optimal solution uses a hash map to store numbers we've seen along with their indices, allowing us to check in O(1) time if the complement (target - current number) exists.`,
    
    difficulty: 'Easy',
    category: 'DSA',
    subject: 'Arrays & Hashing',
    round: 'round3',
    points: 100,
    timeLimit: 1, // seconds
    memoryLimit: 128, // MB
    
    examples: [
      {
        input: 'nums = [2,7,11,15], target = 9',
        output: '[0, 1]',
        explanation: 'Because nums[0] + nums[1] == 9 (2 + 7 = 9), we return [0, 1].'
      },
      {
        input: 'nums = [3,2,4], target = 6',
        output: '[1, 2]',
        explanation: 'Because nums[1] + nums[2] == 6 (2 + 4 = 6), we return [1, 2].'
      },
      {
        input: 'nums = [3,3], target = 6',
        output: '[0, 1]',
        explanation: 'Both elements are same but different indices. 3 + 3 = 6.'
      }
    ],
    
    constraints: [
      '2 <= nums.length <= 10^4',
      '-10^9 <= nums[i] <= 10^9',
      '-10^9 <= target <= 10^9',
      'Only one valid answer exists'
    ],
    
    hints: [
      'Can you think of a way to check if a number\'s complement exists in constant time?',
      'Try using a hash map to store numbers and their indices',
      'For each number, check if (target - number) exists in the hash map'
    ],
    
    testCases: [
      // Visible test cases
      {
        input: '2 7 11 15\n9',
        expectedOutput: '0 1',
        explanation: 'Basic case: 2 + 7 = 9',
        hidden: false
      },
      {
        input: '3 2 4\n6',
        expectedOutput: '1 2',
        explanation: 'Numbers not in sorted order',
        hidden: false
      },
      {
        input: '3 3\n6',
        expectedOutput: '0 1',
        explanation: 'Duplicate numbers case',
        hidden: false
      },
      // Hidden test cases
      {
        input: '-1 -2 -3 -4 -5\n-8',
        expectedOutput: '2 4',
        explanation: 'Negative numbers: -3 + (-5) = -8',
        hidden: true
      },
      {
        input: '0 4 3 0\n0',
        expectedOutput: '0 3',
        explanation: 'Zero target with zeros in array',
        hidden: true
      },
      {
        input: '1 5 3 7 9 2\n10',
        expectedOutput: '1 3',
        explanation: 'Larger array: 3 + 7 = 10',
        hidden: true
      },
      {
        input: '230 863 916 585 981 404 316 785 88 12 70 435 384 778 887 755 740 337 86 92 325 422 815 650 920 125 277 336 221 847 168 23 677 61 400 136 874 363 394 199 863 997 794 587 124 321 212 957 764 173 314 422 927 783 930 282 306 506 44 926 691 568 68 730 933 737 531 180 414 751 28 546 60 371 493 370 527 387 43 541 13 457 328 227 652 365 430 803 59 858 538 427 583 368 375 173 809 896 370 789\n542',
        expectedOutput: '28 45',
        explanation: 'Large array case',
        hidden: true
      }
    ],
    
    starterCode: {
      python: '# Input format: First line contains array elements, second line contains target\nnums = list(map(int, input().split()))\ntarget = int(input())\n\n# Write your solution here\ndef two_sum(nums, target):\n    # TODO: Implement your solution\n    # Hint: Use a hash map (dictionary in Python)\n    pass\n\n# Output: Print the indices space-separated\nresult = two_sum(nums, target)\nif result:\n    print(result[0], result[1])',
      
      cpp: '#include <iostream>\n#include <vector>\n#include <unordered_map>\nusing namespace std;\n\nint main() {\n    // Input: First line contains array elements, second line contains target\n    vector<int> nums;\n    int num, target;\n    \n    while(cin >> num) {\n        nums.push_back(num);\n        if(cin.peek() == \'\\n\') break;\n    }\n    cin >> target;\n    \n    // Write your solution here\n    // TODO: Implement using unordered_map\n    \n    // Output: Print indices space-separated (idx1 idx2)\n    return 0;\n}',
      
      javascript: '// Input: Lines from stdin\nconst readline = require(\'readline\');\nconst rl = readline.createInterface({\n    input: process.stdin,\n    output: process.stdout\n});\n\nlet lines = [];\nrl.on(\'line\', (line) => {\n    lines.push(line);\n}).on(\'close\', () => {\n    const nums = lines[0].split(\' \').map(Number);\n    const target = parseInt(lines[1]);\n    \n    // Write your solution here\n    function twoSum(nums, target) {\n        // TODO: Implement using Map\n        return null;\n    }\n    \n    const result = twoSum(nums, target);\n    if(result) console.log(result[0], result[1]);\n});',
      
      java: 'import java.util.*;\n\npublic class Main {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        \n        // Input: First line array, second line target\n        String[] numsStr = sc.nextLine().split(" ");\n        int[] nums = new int[numsStr.length];\n        for(int i = 0; i < numsStr.length; i++) {\n            nums[i] = Integer.parseInt(numsStr[i]);\n        }\n        int target = sc.nextInt();\n        \n        // Write your solution here\n        int[] result = twoSum(nums, target);\n        \n        // Output: Print indices space-separated\n        if(result != null) {\n            System.out.println(result[0] + " " + result[1]);\n        }\n    }\n    \n    public static int[] twoSum(int[] nums, int target) {\n        // TODO: Implement using HashMap\n        return null;\n    }\n}',
      
      c: '#include <stdio.h>\n#include <stdlib.h>\n\nint main() {\n    int nums[10000], n = 0, target;\n    \n    // Input: Read array elements then target\n    while(scanf("%d", &nums[n]) == 1) {\n        n++;\n        if(getchar() == \'\\n\') break;\n    }\n    scanf("%d", &target);\n    \n    // Write your solution here\n    // TODO: Implement brute force or optimized approach\n    \n    // Output: Print indices (idx1 idx2)\n    return 0;\n}'
    },
    
    defaultLanguage: 'python',
    type: 'coding'
  },

  // ============ PROBLEM 2: PalindromeCheck ============
  {
    id: 'dsa_palindrome_check_v2',
    title: 'Palindrome Number',
    text: 'Determine if an integer is a palindrome',
    description: `Given an integer x, return true if x is a palindrome, and false otherwise.

**Problem Summary:**
A palindrome reads the same backward as forward. For example, 121 is a palindrome while 123 is not.

**Important Notes:**
- Negative numbers are NOT palindromes (-121 → false)
- Can you solve without converting to string?
- Follow-up: Could you solve it in O(1) space?

**Approach:**
1. Simple way: Convert to string and check if it equals its reverse
2. Mathematical way: Extract digits from both ends and compare`,
    
    difficulty: 'Easy',
    category: 'DSA',
    subject: 'Math',
    round: 'round3',
    points: 75,
    
    examples: [
      {
        input: '121',
        output: 'true',
        explanation: '121 reads the same from left to right and right to left'
      },
      {
        input: '-121',
        output: 'false',
        explanation: 'From left to right: -121. From right to left: 121-. Not the same'
      },
      {
        input: '10',
        output: 'false',
        explanation: 'Reads 01 from right to left, different from 10'
      }
    ],
    
    constraints: [
      '-2^31 <= x <= 2^31 - 1'
    ],
    
    hints: [
      'Negative numbers cannot be palindromes',
      'Numbers ending in 0 (except 0 itself) cannot be palindromes',
      'Try reversing half the number'
    ],
    
    testCases: [
      {
        input: '121',
        expectedOutput: 'true',
        hidden: false
      },
      {
        input: '-121',
        expectedOutput: 'false',
        hidden: false
      },
      {
        input: '10',
        expectedOutput: 'false',
        hidden: false
      },
      {
        input: '0',
        expectedOutput: 'true',
        hidden: true
      },
      {
        input: '1',
        expectedOutput: 'true',
        hidden: true
      },
      {
        input: '12321',
        expectedOutput: 'true',
        hidden: true
      },
      {
        input: '1000021',
        expectedOutput: 'false',
        hidden: true
      }
    ],
    
    starterCode: {
      python: '# Input: One integer\nx = int(input())\n\n# Write your solution here\ndef is_palindrome(x):\n    # TODO: Check if x is palindrome\n    if x < 0:\n        return False\n    return str(x) == str(x)[::-1]\n\n# Output: Print "true" or "false"\nprint(str(is_palindrome(x)).lower())',
      
      cpp: '#include <iostream>\nusing namespace std;\n\nint main() {\n    int x;\n    cin >> x;\n    \n    // Write your solution here\n    bool is_palindrome = false;\n    \n    if(x < 0) {\n        is_palindrome = false;\n    } else {\n        int original = x;\n        int reversed = 0;\n        \n        while(x > 0) {\n            reversed = reversed * 10 + x % 10;\n            x /= 10;\n        }\n        \n        is_palindrome = (original == reversed);\n    }\n    \n    cout << (is_palindrome ? "true" : "false") << endl;\n    return 0;\n}',
      
      javascript: 'const readline = require(\'readline\');\nconst rl = readline.createInterface({\n    input: process.stdin\n});\n\nrl.on(\'line\', (line) => {\n    const x = parseInt(line);\n    \n    // Write your solution here\n    function isPalindrome(x) {\n        if(x < 0) return false;\n        return x.toString() === x.toString().split(\'\').reverse().join(\'\');\n    }\n    \n    console.log(isPalindrome(x) ? \'true\' : \'false\');\n    rl.close();\n});',
      
      java: 'import java.util.*;\n\npublic class Main {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        int x = sc.nextInt();\n        \n        // Write your solution here\n        boolean isPalindrome = false;\n        \n        if(x < 0) {\n            isPalindrome = false;\n        } else {\n            int original = x;\n            int reversed = 0;\n            \n            while(x > 0) {\n                reversed = reversed * 10 + x % 10;\n                x /= 10;\n            }\n            \n            isPalindrome = (original == reversed);\n        }\n        \n        System.out.println(isPalindrome ? "true" : "false");\n    }\n}',
      
      c: '#include <stdio.h>\n#include <stdbool.h>\n\nint main() {\n    int x;\n    scanf("%d", &x);\n    \n    // Write your solution here\n    bool is_palindrome = false;\n    \n    if(x < 0) {\n        is_palindrome = false;\n    } else {\n        int original = x;\n        int reversed = 0;\n        \n        while(x > 0) {\n            reversed = reversed * 10 + x % 10;\n            x /= 10;\n        }\n        \n        is_palindrome = (original == reversed);\n    }\n    \n    printf("%s\\n", is_palindrome ? "true" : "false");\n    return 0;\n}'
    },
    
    defaultLanguage: 'python',
    type: 'coding'
  },

  // ============ PROBLEM 3: Fibonacci Number ============
  {
    id: 'dsa_fibonacci_v2',
    title: 'Fibonacci Number',
    text: 'Calculate the nth Fibonacci number efficiently',
    description: `The Fibonacci numbers form a sequence where each number is the sum of the two preceding ones, starting from 0 and 1.

**Fibonacci Sequence:**
F(0) = 0, F(1) = 1
F(n) = F(n-1) + F(n-2) for n > 1

So: 0, 1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, ...

**Problem Summary:**
Given n, calculate F(n).

**Important Notes:**
- Use dynamic programming or memoization for optimal solution
- Recursive solution without memoization will be too slow for large n
- Can also use iterative approach with O(1) space

**Approach:**
Bottom-up DP approach is most efficient. Start with base cases F(0)=0, F(1)=1, then calculate each subsequent number using the formula.`,
    
    difficulty: 'Easy',
    category: 'DSA',
    subject: 'Dynamic Programming',
    round: 'round3',
    points: 90,
    timeLimit: 1,
    memoryLimit: 128,
    
    examples: [
      {
        input: 'n = 2',
        output: '1',
        explanation: 'F(2) = F(1) + F(0) = 1 + 0 = 1'
      },
      {
        input: 'n = 3',
        output: '2',
        explanation: 'F(3) = F(2) + F(1) = 1 + 1 = 2'
      },
      {
        input: 'n = 4',
        output: '3',
        explanation: 'F(4) = F(3) + F(2) = 2 + 1 = 3'
      }
    ],
    
    constraints: [
      '0 <= n <= 30'
    ],
    
    hints: [
      'Try iterative approach instead of recursion',
      'Only need to keep track of previous two numbers',
      'Time complexity can be O(n) with O(1) space'
    ],
    
    testCases: [
      {
        input: '0',
        expectedOutput: '0',
        explanation: 'Base case: F(0) = 0',
        hidden: false
      },
      {
        input: '1',
        expectedOutput: '1',
        explanation: 'Base case: F(1) = 1',
        hidden: false
      },
      {
        input: '2',
        expectedOutput: '1',
        explanation: 'F(2) = 1',
        hidden: false
      },
      {
        input: '5',
        expectedOutput: '5',
        explanation: 'F(5) = 5',
        hidden: true
      },
      {
        input: '10',
        expectedOutput: '55',
        explanation: 'F(10) = 55',
        hidden: true
      },
      {
        input: '15',
        expectedOutput: '610',
        explanation: 'F(15) = 610',
        hidden: true
      },
      {
        input: '20',
        expectedOutput: '6765',
        explanation: 'F(20) = 6765',
        hidden: true
      },
      {
        input: '30',
        expectedOutput: '832040',
        explanation: 'F(30) = 832040 (boundary case)',
        hidden: true
      }
    ],
    
    starterCode: {
      python: '# Input: One integer n\nn = int(input())\n\n# Write your solution here\ndef fibonacci(n):\n    # TODO: Implement iteratively or with DP\n    # Avoid plain recursion for large n\n    if n <= 1:\n        return n\n    \n    a, b = 0, 1\n    for _ in range(2, n + 1):\n        a, b = b, a + b\n    return b\n\n# Output: Print F(n)\nprint(fibonacci(n))',
      
      cpp: '#include <iostream>\nusing namespace std;\n\nint fibonacci(int n) {\n    // TODO: Implement iteratively for better performance\n    if(n <= 1) return n;\n    \n    int a = 0, b = 1;\n    for(int i = 2; i <= n; i++) {\n        int temp = a + b;\n        a = b;\n        b = temp;\n    }\n    return b;\n}\n\nint main() {\n    int n;\n    cin >> n;\n    cout << fibonacci(n) << endl;\n    return 0;\n}',
      
      javascript: 'const readline = require(\'readline\');\nconst rl = readline.createInterface({\n    input: process.stdin\n});\n\nfunction fibonacci(n) {\n    // TODO: Implement iteratively\n    if(n <= 1) return n;\n    let a = 0, b = 1;\n    for(let i = 2; i <= n; i++) {\n        let temp = a + b;\n        a = b;\n        b = temp;\n    }\n    return b;\n}\n\nrl.on(\'line\', (line) => {\n    const n = parseInt(line);\n    console.log(fibonacci(n));\n    rl.close();\n});',
      
      java: 'import java.util.*;\n\npublic class Main {\n    public static int fibonacci(int n) {\n        // TODO: Implement iteratively\n        if(n <= 1) return n;\n        int a = 0, b = 1;\n        for(int i = 2; i <= n; i++) {\n            int temp = a + b;\n            a = b;\n            b = temp;\n        }\n        return b;\n    }\n    \n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        int n = sc.nextInt();\n        System.out.println(fibonacci(n));\n    }\n}',
      
      c: '#include <stdio.h>\n\nint fibonacci(int n) {\n    if(n <= 1) return n;\n    int a = 0, b = 1;\n    for(int i = 2; i <= n; i++) {\n        int temp = a + b;\n        a = b;\n        b = temp;\n    }\n    return b;\n}\n\nint main() {\n    int n;\n    scanf("%d", &n);\n    printf("%d\\n", fibonacci(n));\n    return 0;\n}'
    },
    
    defaultLanguage: 'python',
    type: 'coding'
  },



  // ============ PROBLEM 4: Maximum Subarray Sum (Kadane's Algorithm) ============
  {
    id: 'dsa_max_subarray_v2',
    title: 'Maximum Subarray Sum',
    text: 'Find the contiguous subarray with the largest sum (Kadane\'s Algorithm)',
    description: `Given an integer array nums, find the contiguous subarray (containing at least one number) which has the largest sum and return its sum.

**Problem Summary:**
Find a continuous portion of the array that has the maximum sum.

**Important Notes:**
- A subarray is a contiguous part of an array
- Array can contain negative numbers
- At least one element must be included
- This is a classic Dynamic Programming problem

**Kadane's Algorithm:**
Keep track of:
1. max_sum: Maximum sum found so far
2. current_sum: Maximum sum ending at current position

For each element:
- current_sum = max(element, current_sum + element)
- max_sum = max(max_sum, current_sum)

**Time Complexity:** O(n)
**Space Complexity:** O(1)`,
    
    difficulty: 'Medium',
    category: 'DSA',
    subject: 'Dynamic Programming',
    round: 'round3',
    points: 120,
    timeLimit: 1,
    memoryLimit: 128,
    
    examples: [
      {
        input: 'nums = [-2,1,-3,4,-1,2,1,-5,4]',
        output: '6',
        explanation: 'Subarray [4,-1,2,1] has the largest sum = 6'
      },
      {
        input: 'nums = [1]',
        output: '1',
        explanation: 'Single element array'
      },
      {
        input: 'nums = [5,4,-1,7,8]',
        output: '23',
        explanation: 'Entire array [5,4,-1,7,8] has sum = 23'
      }
    ],
    
    constraints: [
      '1 <= nums.length <= 10^5',
      '-10^4 <= nums[i] <= 10^4'
    ],
    
    hints: [
      'Try Kadane\'s Algorithm - a famous DP solution',
      'At each position, decide: extend current subarray or start fresh?',
      'Keep track of maximum sum seen so far'
    ],
    
    testCases: [
      {
        input: '-2 1 -3 4 -1 2 1 -5 4',
        expectedOutput: '6',
        explanation: 'Classic example: [4,-1,2,1] = 6',
        hidden: false
      },
      {
        input: '1',
        expectedOutput: '1',
        explanation: 'Single element',
        hidden: false
      },
      {
        input: '5 4 -1 7 8',
        expectedOutput: '23',
        explanation: 'All positive contribution',
        hidden: false
      },
      {
        input: '-1',
        expectedOutput: '-1',
        explanation: 'Single negative number',
        hidden: true
      },
      {
        input: '-2 -3 -1 -4',
        expectedOutput: '-1',
        explanation: 'All negative: choose least negative',
        hidden: true
      },
      {
        input: '1 2 3 4 5',
        expectedOutput: '15',
        explanation: 'All positive: sum entire array',
        hidden: true
      },
      {
        input: '-2 1 -3 4 -1 2 1 -5 4',
        expectedOutput: '6',
        explanation: 'Duplicate of visible case',
        hidden: true
      },
      {
        input: '8 -19 5 -4 20',
        expectedOutput: '21',
        explanation: 'Mix of positive and negative',
        hidden: true
      },
      {
        input: '1 -1 1 -1 1 -1 1 -1 1',
        expectedOutput: '1',
        explanation: 'Alternating pattern',
        hidden: true
      }
    ],
    
    starterCode: {
      python: '# Input: One line containing array elements\nnums = list(map(int, input().split()))\n\n# Write your solution here (Kadane\'s Algorithm)\ndef max_subarray_sum(nums):\n    # TODO: Implement Kadane\'s Algorithm\n    max_sum = nums[0]\n    current_sum = nums[0]\n    \n    for i in range(1, len(nums)):\n        current_sum = max(nums[i], current_sum + nums[i])\n        max_sum = max(max_sum, current_sum)\n    \n    return max_sum\n\n# Output: Print the maximum sum\nprint(max_subarray_sum(nums))',
      
      cpp: '#include <iostream>\n#include <vector>\n#include <algorithm>\nusing namespace std;\n\nint main() {\n    vector<int> nums;\n    int num;\n    \n    // Read all numbers\n    while(cin >> num) {\n        nums.push_back(num);\n    }\n    \n    // Write your solution here (Kadane\'s Algorithm)\n    int max_sum = nums[0];\n    int current_sum = nums[0];\n    \n    for(int i = 1; i < nums.size(); i++) {\n        current_sum = max(nums[i], current_sum + nums[i]);\n        max_sum = max(max_sum, current_sum);\n    }\n    \n    cout << max_sum << endl;\n    return 0;\n}',
      
      javascript: 'const readline = require(\'readline\');\nconst rl = readline.createInterface({\n    input: process.stdin\n});\n\nrl.on(\'line\', (line) => {\n    const nums = line.split(\' \').map(Number);\n    \n    // Write your solution here (Kadane\'s Algorithm)\n    let maxSum = nums[0];\n    let currentSum = nums[0];\n    \n    for(let i = 1; i < nums.length; i++) {\n        currentSum = Math.max(nums[i], currentSum + nums[i]);\n        maxSum = Math.max(maxSum, currentSum);\n    }\n    \n    console.log(maxSum);\n    rl.close();\n});',
      
      java: 'import java.util.*;\n\npublic class Main {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        String[] numsStr = sc.nextLine().split(" ");\n        int[] nums = new int[numsStr.length];\n        for(int i = 0; i < numsStr.length; i++) {\n            nums[i] = Integer.parseInt(numsStr[i]);\n        }\n        \n        // Write your solution here (Kadane\'s Algorithm)\n        int maxSum = nums[0];\n        int currentSum = nums[0];\n        \n        for(int i = 1; i < nums.length; i++) {\n            currentSum = Math.max(nums[i], currentSum + nums[i]);\n            maxSum = Math.max(maxSum, currentSum);\n        }\n        \n        System.out.println(maxSum);\n    }\n}',
      
      c: '#include <stdio.h>\n\nint max(int a, int b) {\n    return a > b ? a : b;\n}\n\nint main() {\n    int nums[100000], n = 0;\n    \n    // Read all numbers\n    while(scanf("%d", &nums[n]) == 1) {\n        n++;\n    }\n    \n    // Kadane\'s Algorithm\n    int max_sum = nums[0];\n    int current_sum = nums[0];\n    \n    for(int i = 1; i < n; i++) {\n        current_sum = max(nums[i], current_sum + nums[i]);\n        max_sum = max(max_sum, current_sum);\n    }\n    \n    printf("%d\\n", max_sum);\n    return 0;\n}'
    },
    
    defaultLanguage: 'python',
    type: 'coding'
  },

  // ============ PROBLEM 5: String Compression ============
  {
    id: 'dsa_string_compression_v2',
    title: 'String Compression',
    text: 'Compress a string using counts of repeated characters',
    description: `Given an array of characters, compress it using the following algorithm:
Begin with an empty string s. For each group of consecutive repeating characters:
- If the group's length is 1, append the character to s.
- Otherwise, append the character followed by the group's length.

**Problem Summary:**
Compress strings like "aabcccccaaa" to "a2b1c5a3" or "a2bc5a3".

**Important Notes:**
- Return the compressed string
- The compressed string should always be shorter or equal length
- If compression doesn't save space, return original

**Approach:**
Use two pointers to track start and end of each character group, count occurrences, and build result string.`,
    
    difficulty: 'Medium',
    category: 'DSA',
    subject: 'String Manipulation',
    round: 'round3',
    points: 110,
    
    examples: [
      {
        input: '"aabcccccaaa"',
        output: '"a2bc5a3"',
        explanation: 'Group counts: a-2, b-1, c-5, a-3. Single chars can omit count.'
      },
      {
        input: '"abc"',
        output: '"abc"',
        explanation: 'All single characters, no compression needed'
      }
    ],
    
    constraints: [
      '1 <= s.length <= 1000',
      's consists of lowercase English letters only'
    ],
    
    hints: [
      'Iterate through the string counting consecutive characters',
      'Build result string as you go',
      'Handle the last group carefully'
    ],
    
    testCases: [
      {
        input: 'aabcccccaaa',
        expectedOutput: 'a2bc5a3',
        hidden: false
      },
      {
        input: 'abc',
        expectedOutput: 'abc',
        hidden: false
      },
      {
        input: 'a',
        expectedOutput: 'a',
        hidden: true
      },
      {
        input: 'aaa',
        expectedOutput: 'a3',
        hidden: true
      },
      {
        input: 'aaabbbccc',
        expectedOutput: 'a3b3c3',
        hidden: true
      }
    ],
    
    starterCode: {
      python: '# Input: One string\ns = input().strip()\n\n# Write your solution here\ndef compress_string(s):\n    if not s:\n        return s\n    \n    result = []\n    i = 0\n    \n    while i < len(s):\n        char = s[i]\n        count = 1\n        \n        while i + count < len(s) and s[i + count] == char:\n            count += 1\n        \n        result.append(char)\n        if count > 1:\n            result.append(str(count))\n        \n        i += count\n    \n    return \'\'.join(result)\n\n# Output: Print compressed string\nprint(compress_string(s))',
      
      cpp: '#include <iostream>\n#include <string>\nusing namespace std;\n\nint main() {\n    string s;\n    getline(cin, s);\n    \n    // Write your solution here\n    string result = "";\n    int i = 0;\n    \n    while(i < s.length()) {\n        char c = s[i];\n        int count = 1;\n        \n        while(i + count < s.length() && s[i + count] == c) {\n            count++;\n        }\n        \n        result += c;\n        if(count > 1) {\n            result += to_string(count);\n        }\n        \n        i += count;\n    }\n    \n    cout << result << endl;\n    return 0;\n}',
      
      javascript: 'const readline = require(\'readline\');\nconst rl = readline.createInterface({\n    input: process.stdin\n});\n\nfunction compressString(s) {\n    if(!s) return s;\n    \n    let result = \'\';\n    let i = 0;\n    \n    while(i < s.length) {\n        let char = s[i];\n        let count = 1;\n        \n        while(i + count < s.length && s[i + count] === char) {\n            count++;\n        }\n        \n        result += char;\n        if(count > 1) {\n            result += count;\n        }\n        \n        i += count;\n    }\n    \n    return result;\n}\n\nrl.on(\'line\', (line) => {\n    console.log(compressString(line.trim()));\n    rl.close();\n});',
      
      java: 'import java.util.*;\n\npublic class Main {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        String s = sc.nextLine();\n        \n        // Write your solution here\n        StringBuilder result = new StringBuilder();\n        int i = 0;\n        \n        while(i < s.length()) {\n            char c = s.charAt(i);\n            int count = 1;\n            \n            while(i + count < s.length() && s.charAt(i + count) == c) {\n                count++;\n            }\n            \n            result.append(c);\n            if(count > 1) {\n                result.append(count);\n            }\n            \n            i += count;\n        }\n        \n        System.out.println(result.toString());\n    }\n}',
      
      c: '#include <stdio.h>\n#include <string.h>\n\nint main() {\n    char s[1001], result[2001];\n    fgets(s, sizeof(s), stdin);\n    s[strcspn(s, "\\n")] = 0;\n    \n    // Write your solution here\n    int resIdx = 0;\n    int i = 0;\n    int len = strlen(s);\n    \n    while(i < len) {\n        char c = s[i];\n        int count = 1;\n        \n        while(i + count < len && s[i + count] == c) {\n            count++;\n        }\n        \n        result[resIdx++] = c;\n        if(count > 1) {\n            resIdx += sprintf(&result[resIdx], "%d", count);\n        }\n        \n        i += count;\n    }\n    \n    result[resIdx] = 0;\n    printf("%s\\n", result);\n    return 0;\n}'
    },
    
    defaultLanguage: 'python',
    type: 'coding'
  }
];

/**
 * Seed DSA questions to Firestore
 * With auto-clear functionality
 */
export const seedDSAQuestions = async (db, autoClear = true) => {
  try {
    // Auto-clear by default
    if (autoClear) {
      console.log('🗑️ Clearing existing DSA questions...');
      const clearResult = await clearDSAQuestions(db);
      console.log(clearResult.message);
    }
    
    let successCount = 0;
    let errorCount = 0;

    console.log('🌱 Seeding DSA questions...');
    console.log(`📊 Total questions to seed: ${dsaQuestions.length}`);
    
    for (const question of dsaQuestions) {
      try {
        console.log(`Attempting to add: ${question.title}...`);
        await addDoc(collection(db, 'questions'), question);
        successCount++;
        console.log(`✅ Added: ${question.title} (${question.difficulty}) - ${question.testCases.length} test cases (${question.testCases.filter(t => t.hidden).length} hidden)`);
      } catch (error) {
        errorCount++;
        console.error(`❌ Failed to add ${question.title}:`, error);
        console.error('Error details:', error.message);
      }
    }

    console.log(`\n📈 Summary: ${successCount} succeeded, ${errorCount} failed`);

    return {
      success: true,
      message: `Seeded ${successCount} DSA questions successfully! ${errorCount} failed.`,
      successCount,
      errorCount
    };
  } catch (error) {
    console.error('Fatal seeding error:', error);
    return {
      success: false,
      message: `Error seeding DSA questions: ${error.message}`,
      successCount: 0,
      errorCount: dsaQuestions.length
    };
  }
};

const dsaSeederService = {
  dsaQuestions,
  clearDSAQuestions,
  seedDSAQuestions
};

export default dsaSeederService;
