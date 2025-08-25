#!/usr/bin/env node

/**
 * CodeMitra Code Execution Test Suite
 * Tests the fixes for proper output capture across all supported languages
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:5001';
const API_URL = `${BASE_URL}/api`;

// Test cases for all languages
const TEST_CASES = {
  java: [
    {
      name: 'Basic output',
      code: `public class Main {
    public static void main(String[] args) {
        System.out.println("Hello World");
    }
}`,
      expectedOutput: 'Hello World',
      shouldSucceed: true
    },
    {
      name: 'Multiple outputs',
      code: `public class Main {
    public static void main(String[] args) {
        System.out.println("Line 1");
        System.out.println("Line 2");
        System.out.print("No newline");
    }
}`,
      expectedOutput: 'Line 1\nLine 2\nNo newline',
      shouldSucceed: true
    },
    {
      name: 'Compilation error',
      code: `public class Main {
    public static void main(String[] args) {
        System.out.println("Hello World"  // Missing semicolon and closing parenthesis
    }
}`,
      shouldSucceed: false,
      expectsCompilationError: true
    },
    {
      name: 'Runtime error',
      code: `public class Main {
    public static void main(String[] args) {
        int[] arr = new int[5];
        System.out.println(arr[10]);  // ArrayIndexOutOfBoundsException
    }
}`,
      shouldSucceed: false,
      expectsRuntimeError: true
    }
  ],

  python: [
    {
      name: 'Basic output',
      code: 'print("Hello World")',
      expectedOutput: 'Hello World',
      shouldSucceed: true
    },
    {
      name: 'Multiple outputs',
      code: `print("Line 1")
print("Line 2")
print("No newline", end="")`,
      expectedOutput: 'Line 1\nLine 2\nNo newline',
      shouldSucceed: true
    },
    {
      name: 'Syntax error',
      code: 'print("Hello World"  # Missing closing parenthesis',
      shouldSucceed: false,
      expectsCompilationError: true
    },
    {
      name: 'Runtime error',
      code: `arr = [1, 2, 3]
print(arr[10])  # IndexError`,
      shouldSucceed: false,
      expectsRuntimeError: true
    }
  ],

  javascript: [
    {
      name: 'Basic output',
      code: 'console.log("Hello World");',
      expectedOutput: 'Hello World',
      shouldSucceed: true
    },
    {
      name: 'Multiple outputs',
      code: `console.log("Line 1");
console.log("Line 2");
process.stdout.write("No newline");`,
      expectedOutput: 'Line 1\nLine 2\nNo newline',
      shouldSucceed: true
    },
    {
      name: 'Syntax error',
      code: 'console.log("Hello World"  // Missing closing parenthesis',
      shouldSucceed: false,
      expectsCompilationError: true
    },
    {
      name: 'Runtime error',
      code: `let arr = [1, 2, 3];
console.log(arr[10].toString());  // TypeError`,
      shouldSucceed: false,
      expectsRuntimeError: true
    }
  ],

  cpp: [
    {
      name: 'Basic output',
      code: `#include <iostream>
using namespace std;
int main() {
    cout << "Hello World" << endl;
    return 0;
}`,
      expectedOutput: 'Hello World',
      shouldSucceed: true
    },
    {
      name: 'Multiple outputs',
      code: `#include <iostream>
using namespace std;
int main() {
    cout << "Line 1" << endl;
    cout << "Line 2" << endl;
    cout << "No newline";
    return 0;
}`,
      expectedOutput: 'Line 1\nLine 2\nNo newline',
      shouldSucceed: true
    },
    {
      name: 'Compilation error',
      code: `#include <iostream>
using namespace std;
int main() {
    cout << "Hello World" << endl  // Missing semicolon
    return 0;
}`,
      shouldSucceed: false,
      expectsCompilationError: true
    },
    {
      name: 'Runtime error',
      code: `#include <iostream>
using namespace std;
int main() {
    int arr[5] = {1,2,3,4,5};
    cout << arr[100] << endl;  // Undefined behavior/potential crash
    return 0;
}`,
      shouldSucceed: true, // C++ undefined behavior may not always crash
      note: 'C++ runtime behavior may vary'
    }
  ]
};

class CodeExecutionTester {
  constructor() {
    this.totalTests = 0;
    this.passedTests = 0;
    this.failedTests = 0;
    this.authToken = null;
    this.testResults = [];
  }

  async setup() {
    console.log('🚀 Setting up CodeMitra Code Execution Test Suite...');
    
    try {
      // Try to register/login to get auth token
      console.log('📝 Attempting to authenticate...');
      
      // Try to register a test user
      try {
        const registerResponse = await axios.post(`${API_URL}/auth/register`, {
          name: 'Test User',
          email: 'test@codemitra.dev',
          password: 'testpassword123'
        });
        console.log('✅ Test user registered');
      } catch (error) {
        // User might already exist, that's ok
        console.log('ℹ️  Test user may already exist, continuing...');
      }

      // Login to get token
      const loginResponse = await axios.post(`${API_URL}/auth/login`, {
        email: 'test@codemitra.dev',
        password: 'testpassword123'
      });

      this.authToken = loginResponse.data.token;
      console.log('✅ Authentication successful');

      // Create a test room
      const roomResponse = await axios.post(`${API_URL}/rooms`, {
        name: 'Test Execution Room',
        description: 'Room for testing code execution',
        isPublic: true,
        maxUsers: 10,
        language: 'javascript'
      }, {
        headers: {
          'Authorization': `Bearer ${this.authToken}`
        }
      });

      console.log('Room creation response:', roomResponse.data);
      this.testRoomId = roomResponse.data.data?.id;
      console.log(`✅ Test room created: ${this.testRoomId}`);
      console.log('');

    } catch (error) {
      console.error('❌ Setup failed:', error.response?.data || error.message);
      throw error;
    }
  }

  async runTest(language, testCase) {
    this.totalTests++;
    
    console.log(`\n🧪 Testing ${language.toUpperCase()}: ${testCase.name}`);
    console.log(`Code:\n${testCase.code.split('\n').map(line => `  ${line}`).join('\n')}`);
    
    try {
      const response = await axios.post(`${API_URL}/code/execute`, {
        code: testCase.code,
        language: language,
        input: testCase.input || '',
        roomId: this.testRoomId
      }, {
        headers: {
          'Authorization': `Bearer ${this.authToken}`
        },
        timeout: 45000 // 45 second timeout
      });

      const result = response.data;
      
      // Log the actual result
      console.log(`Result:`, {
        success: result.success,
        output: result.output,
        error: result.error,
        status: result.status,
        executionTime: result.executionTime
      });

      // Analyze results
      let testPassed = true;
      let issues = [];

      if (testCase.shouldSucceed) {
        if (!result.success) {
          testPassed = false;
          issues.push(`Expected success but got failure: ${result.error}`);
        }
        
        if (testCase.expectedOutput !== undefined) {
          const actualOutput = (result.output || '').trim();
          const expectedOutput = testCase.expectedOutput.trim();
          
          if (actualOutput !== expectedOutput) {
            testPassed = false;
            issues.push(`Output mismatch. Expected: "${expectedOutput}", Got: "${actualOutput}"`);
          }
        }
        
        // Check for generic messages
        if (result.output && result.output.includes('Code executed successfully')) {
          testPassed = false;
          issues.push('Still showing generic "Code executed successfully" message');
        }
      } else {
        if (result.success) {
          testPassed = false;
          issues.push('Expected failure but got success');
        }
        
        if (testCase.expectsCompilationError && result.status !== 'compilation_error') {
          testPassed = false;
          issues.push(`Expected compilation error but got status: ${result.status}`);
        }
        
        if (testCase.expectsRuntimeError && !['runtime_error', 'failed'].includes(result.status)) {
          testPassed = false;
          issues.push(`Expected runtime error but got status: ${result.status}`);
        }
      }

      if (testPassed) {
        console.log('✅ PASSED');
        this.passedTests++;
      } else {
        console.log('❌ FAILED');
        issues.forEach(issue => console.log(`  - ${issue}`));
        this.failedTests++;
      }

      this.testResults.push({
        language,
        testName: testCase.name,
        passed: testPassed,
        issues,
        result
      });

    } catch (error) {
      console.log('❌ FAILED - Network/Server Error');
      console.log(`  - ${error.response?.data?.error || error.message}`);
      this.failedTests++;
      
      this.testResults.push({
        language,
        testName: testCase.name,
        passed: false,
        issues: [error.response?.data?.error || error.message],
        result: null
      });
    }
  }

  async runAllTests() {
    console.log('🧪 Running all test cases...\n');
    
    for (const [language, testCases] of Object.entries(TEST_CASES)) {
      console.log(`\n${'='.repeat(60)}`);
      console.log(`Testing ${language.toUpperCase()} (${testCases.length} tests)`);
      console.log('='.repeat(60));
      
      for (const testCase of testCases) {
        await this.runTest(language, testCase);
      }
    }
  }

  generateReport() {
    console.log('\n\n' + '='.repeat(80));
    console.log('📊 CODE EXECUTION TEST RESULTS');
    console.log('='.repeat(80));
    
    console.log(`\n📈 Summary:`);
    console.log(`  Total Tests: ${this.totalTests}`);
    console.log(`  Passed: ${this.passedTests} (${((this.passedTests/this.totalTests)*100).toFixed(1)}%)`);
    console.log(`  Failed: ${this.failedTests} (${((this.failedTests/this.totalTests)*100).toFixed(1)}%)`);
    
    // Group results by language
    const resultsByLanguage = {};
    this.testResults.forEach(result => {
      if (!resultsByLanguage[result.language]) {
        resultsByLanguage[result.language] = { passed: 0, failed: 0, tests: [] };
      }
      
      if (result.passed) {
        resultsByLanguage[result.language].passed++;
      } else {
        resultsByLanguage[result.language].failed++;
      }
      
      resultsByLanguage[result.language].tests.push(result);
    });
    
    console.log(`\n📋 Results by Language:`);
    for (const [language, stats] of Object.entries(resultsByLanguage)) {
      const total = stats.passed + stats.failed;
      const percentage = total > 0 ? ((stats.passed/total)*100).toFixed(1) : 0;
      console.log(`  ${language.toUpperCase()}: ${stats.passed}/${total} passed (${percentage}%)`);
      
      // Show failed tests
      const failedTests = stats.tests.filter(t => !t.passed);
      if (failedTests.length > 0) {
        failedTests.forEach(test => {
          console.log(`    ❌ ${test.testName}: ${test.issues.join(', ')}`);
        });
      }
    }
    
    // Success criteria check
    console.log(`\n🎯 Success Criteria Check:`);
    const criticalIssues = this.testResults.filter(r => 
      r.result && r.result.output && r.result.output.includes('Code executed successfully')
    );
    
    if (criticalIssues.length === 0) {
      console.log(`  ✅ No generic "Code executed successfully" messages found`);
    } else {
      console.log(`  ❌ Still showing generic messages in ${criticalIssues.length} tests`);
    }
    
    const basicOutputTests = this.testResults.filter(r => 
      r.testName === 'Basic output' && r.passed
    );
    
    console.log(`  ${basicOutputTests.length === 4 ? '✅' : '❌'} Basic output working for all languages: ${basicOutputTests.length}/4`);
    
    console.log('\n' + '='.repeat(80));
    
    if (this.failedTests === 0) {
      console.log('🎉 ALL TESTS PASSED! Code execution is working correctly.');
    } else if (this.passedTests > this.failedTests) {
      console.log('⚠️  Most tests passed, but some issues remain.');
    } else {
      console.log('🚨 Many tests failed. Code execution needs more work.');
    }
    
    console.log('='.repeat(80));
  }

  async run() {
    try {
      await this.setup();
      await this.runAllTests();
      this.generateReport();
    } catch (error) {
      console.error('\n❌ Test suite failed to run:', error.message);
      process.exit(1);
    }
  }
}

// Run the test suite
if (require.main === module) {
  const tester = new CodeExecutionTester();
  tester.run().then(() => {
    process.exit(tester.failedTests > 0 ? 1 : 0);
  }).catch(error => {
    console.error('Test suite error:', error);
    process.exit(1);
  });
}

module.exports = CodeExecutionTester;
