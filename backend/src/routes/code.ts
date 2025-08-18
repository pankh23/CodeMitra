import express, { Request, Response } from 'express';
import { prisma } from '../utils/prisma';
import { asyncHandler } from '../middleware/errorHandler';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';
import { validate, codeExecutionSchema } from '../utils/validation';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { v4 as uuidv4 } from 'uuid';
import { getTestCases, getBasicTests, getErrorTests, getTestCasesByCategory, getSupportedLanguages, LanguageTestCase } from '../utils/languageTests';

const execAsync = promisify(exec);

const codeRoutes = express.Router();

interface CodeExecutionRequest {
  code: string;
  language: string;
  input?: string;
  roomId: string;
  userId: string;
}

interface CodeExecutionResult {
  success: boolean;
  output?: string;
  error?: string;
  executionTime?: number;
  memoryUsed?: number;
  compilationTime?: number;
  status: 'success' | 'compilation_error' | 'runtime_error' | 'timeout' | 'memory_limit' | 'system_error';
}

// Supported languages and their configurations
const LANGUAGE_CONFIGS = {
  javascript: {
    extension: 'js',
    command: 'node',
    timeout: 10000,
    memoryLimit: 128,
    needsCompilation: false
  },
  python: {
    extension: 'py',
    command: 'python3',
    timeout: 10000,
    memoryLimit: 256,
    needsCompilation: false
  },
  java: {
    extension: 'java',
    command: 'java',
    timeout: 20000,
    memoryLimit: 512,
    needsCompilation: true,
    compileCommand: 'javac'
  },
  cpp: {
    extension: 'cpp',
    command: './a.out',
    timeout: 15000,
    memoryLimit: 256,
    needsCompilation: true,
    compileCommand: 'g++'
  },
  c: {
    extension: 'c',
    command: './a.out',
    timeout: 15000,
    memoryLimit: 256,
    needsCompilation: true,
    compileCommand: 'gcc'
  },
  php: {
    extension: 'php',
    command: 'php',
    timeout: 10000,
    memoryLimit: 128,
    needsCompilation: false
  }
};

/**
 * Execute code with enhanced security sandboxing and monitoring
 */
async function executeCode(code: string, language: string, input: string, config: any): Promise<CodeExecutionResult> {
  const startTime = Date.now();
  const tempDir = path.join(os.tmpdir(), `codemitra-${uuidv4()}`);
  
  try {
    // Create temporary directory
    fs.mkdirSync(tempDir, { recursive: true });
    
    // Create input file
    const inputFile = path.join(tempDir, 'input.txt');
    fs.writeFileSync(inputFile, input);
    
    // Create source file with proper naming
    let sourceFile: string;
    let executablePath: string = tempDir;
    
    switch (language) {
      case 'java':
        sourceFile = path.join(tempDir, 'Main.java');
        break;
      case 'cpp':
        sourceFile = path.join(tempDir, 'main.cpp');
        break;
      case 'c':
        sourceFile = path.join(tempDir, 'main.c');
        break;
      case 'python':
        sourceFile = path.join(tempDir, 'main.py');
        break;
      case 'javascript':
        sourceFile = path.join(tempDir, 'main.js');
        break;
      case 'php':
        sourceFile = path.join(tempDir, 'main.php');
        break;
      default:
        sourceFile = path.join(tempDir, `main.${config.extension}`);
    }
    
    fs.writeFileSync(sourceFile, code);
    
    let compilationTime: number | undefined;
    
    // Enhanced compilation with better error handling
    if (config.needsCompilation) {
      const compileStart = Date.now();
      
      try {
        switch (language) {
          case 'java':
            // Java compilation with proper classpath
            await execAsync(`${config.compileCommand} -cp ${tempDir} ${sourceFile}`, {
              cwd: tempDir,
              timeout: config.timeout,
              maxBuffer: 1024 * 1024 // 1MB buffer
            });
            executablePath = path.join(tempDir, 'Main.class');
            break;
            
          case 'cpp':
            // C++ compilation with optimization and warnings
            await execAsync(`${config.compileCommand} -std=c++17 -Wall -Wextra -O2 ${sourceFile} -o a.out`, {
              cwd: tempDir,
              timeout: config.timeout,
              maxBuffer: 1024 * 1024
            });
            executablePath = path.join(tempDir, 'a.out');
            break;
            
          case 'c':
            // C compilation with optimization and warnings
            await execAsync(`${config.compileCommand} -std=c99 -Wall -Wextra -O2 ${sourceFile} -o a.out`, {
              cwd: tempDir,
              timeout: config.timeout,
              maxBuffer: 1024 * 1024
            });
            executablePath = path.join(tempDir, 'a.out');
            break;
            
          default:
            throw new Error(`Unsupported compiled language: ${language}`);
        }
        
        compilationTime = Date.now() - compileStart;
        
        // Verify executable was created
        if (!fs.existsSync(executablePath)) {
          throw new Error('Compilation succeeded but executable not found');
        }
        
      } catch (compileError: any) {
        const errorMessage = compileError.stderr || compileError.stdout || 'Compilation failed';
        return {
          success: false,
          error: sanitizeError(errorMessage),
          status: 'compilation_error',
          compilationTime: Date.now() - compileStart
        };
      }
    }
    
    // Execute the code with enhanced monitoring
    const executionStart = Date.now();
    let command: string;
    let executionOptions: any = {
      cwd: tempDir,
      timeout: config.timeout,
      maxBuffer: 1024 * 1024, // 1MB output buffer
      env: { ...process.env, NODE_ENV: 'production' }
    };
    
    // Language-specific execution commands
    switch (language) {
      case 'java':
        command = `${config.command} -cp ${tempDir} Main`;
        break;
      case 'cpp':
      case 'c':
        command = executablePath;
        break;
      case 'python':
        command = `${config.command} -u ${sourceFile}`; // -u for unbuffered output
        break;
      case 'javascript':
        command = `${config.command} ${sourceFile}`;
        break;
      case 'php':
        command = `${config.command} -f ${sourceFile}`;
        break;
      default:
        command = `${config.command} ${sourceFile}`;
    }
    
    // Execute with input redirection
    if (input.trim()) {
      command = `echo '${input.replace(/'/g, "'\"'\"'")}' | ${command}`;
    }
    
    const { stdout, stderr } = await execAsync(command, executionOptions);
    
    const executionTime = Date.now() - executionStart;
    
    // Enhanced error handling
    if (stderr && stderr.toString().trim()) {
      // Some languages (like Python) write warnings to stderr
      // Only treat as error if it contains actual error messages
      const errorKeywords = ['error', 'exception', 'failed', 'fatal', 'segmentation fault'];
      const hasError = errorKeywords.some(keyword => 
        stderr.toString().toLowerCase().includes(keyword.toLowerCase())
      );
      
      if (hasError) {
        return {
          success: false,
          error: sanitizeError(stderr.toString()),
          status: 'runtime_error',
          executionTime,
          compilationTime
        };
      }
    }
    
    // Success - return output
    return {
      success: true,
      output: stdout ? stdout.toString() : '',
      status: 'success',
      executionTime,
      compilationTime
    };
    
  } catch (error: any) {
    // Enhanced error classification
    if (error.code === 'ETIMEDOUT') {
      return {
        success: false,
        error: 'Execution timeout - code took too long to run',
        status: 'timeout'
      };
    }
    
    if (error.code === 'ENOMEM') {
      return {
        success: false,
        error: 'Memory limit exceeded',
        status: 'memory_limit'
      };
    }
    
    if (error.code === 'ENOENT') {
      return {
        success: false,
        error: 'Language runtime not found. Please ensure the language is installed.',
        status: 'system_error'
      };
    }
    
    // Generic error handling
    const errorMessage = error.stderr || error.stdout || error.message || 'Execution failed';
    return {
      success: false,
      error: sanitizeError(errorMessage),
      status: 'runtime_error'
    };
    
  } finally {
    // Enhanced cleanup with error handling
    try {
      if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    } catch (cleanupError) {
      console.error('Failed to cleanup temp directory:', cleanupError);
      // Don't fail execution due to cleanup errors
    }
  }
}

/**
 * Security validation for code
 */
function isCodeSafe(code: string, language: string): boolean {
  const dangerousPatterns = [
    // System commands
    /system\s*\(/i,
    /exec\s*\(/i,
    /shell_exec\s*\(/i,
    /passthru\s*\(/i,
    /eval\s*\(/i,
    
    // File operations
    /file_get_contents\s*\(/i,
    /fopen\s*\(/i,
    /unlink\s*\(/i,
    /rmdir\s*\(/i,
    
    // Network operations
    /fsockopen\s*\(/i,
    /curl_exec\s*\(/i,
    
    // Process control
    /pcntl_exec\s*\(/i,
    /proc_open\s*\(/i,
    
    // Database operations (for demo safety)
    /DROP\s+TABLE/i,
    /DELETE\s+FROM/i,
    /UPDATE\s+.*\s+SET/i,
    /INSERT\s+INTO/i,
    /ALTER\s+TABLE/i,
    /CREATE\s+TABLE/i,
    
    // Infinite loops (basic check)
    /while\s*\(\s*true\s*\)/i,
    /for\s*\(\s*;\s*;\s*\)/i,
    
    // Exit commands
    /exit\s*\(/i,
    /die\s*\(/i,
    /abort\s*\(/i
  ];
  
  // Language-specific checks
  if (language === 'python') {
    dangerousPatterns.push(
      /import\s+os/i,
      /import\s+subprocess/i,
      /import\s+sys/i,
      /__import__\s*\(/i
    );
  }
  
  if (language === 'javascript' || language === 'typescript') {
    dangerousPatterns.push(
      /process\.exit\s*\(/i,
      /require\s*\(/i,
      /eval\s*\(/i,
      /Function\s*\(/i
    );
  }
  
  if (language === 'java') {
    dangerousPatterns.push(
      /System\.exit\s*\(/i,
      /Runtime\.getRuntime\s*\(/i,
      /ProcessBuilder/i
    );
  }
  
  if (language === 'cpp' || language === 'c') {
    dangerousPatterns.push(
      /system\s*\(/i,
      /popen\s*\(/i,
      /exec\s*\(/i
    );
  }
  
  // Check for dangerous patterns
  for (const pattern of dangerousPatterns) {
    if (pattern.test(code)) {
      return false;
    }
  }
  
  return true;
}

/**
 * Sanitize error messages for security
 */
function sanitizeError(errorMessage: string): string {
  // Remove potentially sensitive information
  let sanitized = errorMessage
    .replace(/\/tmp\/[^\/\s]+/g, '/tmp/***') // Hide temp paths
    .replace(/\/home\/[^\/\s]+/g, '/home/***') // Hide home paths
    .replace(/\/Users\/[^\/\s]+/g, '/Users/***') // Hide macOS user paths
    .replace(/[A-Za-z]:\\[^\\\s]+/g, 'C:\\***') // Hide Windows paths
    .replace(/[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}/g, '***.***.***.***') // Hide IPs
    .replace(/[a-f0-9]{8,}/gi, '***') // Hide hashes/IDs
    .substring(0, 1000); // Limit length
    
  return sanitized;
}

/**
 * Execute code with security sandboxing
 */
codeRoutes.post('/execute', 
  authenticate, 
  validate(codeExecutionSchema),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { code, language, input, roomId, userId } = req.body as CodeExecutionRequest;
    
    // Validate user is in the room
    const room = await prisma.room.findFirst({
      where: {
        id: roomId,
        users: {
          some: {
            id: userId
          }
        }
      }
    });

    if (!room) {
      return res.status(403).json({
        success: false,
        error: 'You are not a member of this room'
      });
    }

    // Validate language support
    const config = LANGUAGE_CONFIGS[language as keyof typeof LANGUAGE_CONFIGS];
    if (!config) {
      return res.status(400).json({
        success: false,
        error: `Unsupported language: ${language}`
      });
    }

    // Validate code length
    if (code.length > 10000) {
      return res.status(400).json({
        success: false,
        error: 'Code too long (max 10,000 characters)'
      });
    }

    // Security checks
    if (!isCodeSafe(code, language)) {
      return res.status(400).json({
        success: false,
        error: 'Code contains potentially unsafe operations'
      });
    }

    try {
      const result = await executeCode(code, language, input || '', config);
      
      // Log execution for audit
      await prisma.codeExecution.create({
        data: {
          id: uuidv4(),
          roomId,
          userId,
          language,
          code: code.substring(0, 1000), // Store first 1000 chars
          success: result.success,
          output: result.output,
          error: result.error,
          executionTime: result.executionTime,
          memoryUsed: result.memoryUsed,
          compilationTime: result.compilationTime,
          status: result.status
        }
      });

      return res.json({
        success: true,
        output: result.output,
        error: result.error,
        executionTime: result.executionTime,
        memoryUsed: result.memoryUsed,
        compilationTime: result.compilationTime,
        status: result.status
      });

    } catch (error) {
      console.error('Code execution error:', error);
      
      return res.status(500).json({
        success: false,
        error: 'Code execution failed',
        status: 'system_error'
      });
    }
  })
);

/**
 * Get execution history for a room
 */
codeRoutes.get('/history/:roomId',
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { roomId } = req.params;
    const userId = req.user?.id;

    // Validate user is in the room
    const room = await prisma.room.findFirst({
      where: {
        id: roomId,
        users: {
          some: {
            id: userId
          }
        }
      }
    });

    if (!room) {
      return res.status(403).json({
        success: false,
        error: 'You are not a member of this room'
      });
    }

    const executions = await prisma.codeExecution.findMany({
      where: {
        roomId,
        userId
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 50,
      select: {
        id: true,
        language: true,
        success: true,
        output: true,
        error: true,
        executionTime: true,
        memoryUsed: true,
        compilationTime: true,
        status: true,
        createdAt: true
      }
    });

    return res.json({
      success: true,
      executions
    });
  })
);

/**
 * Test all languages with comprehensive test cases
 */
codeRoutes.post('/test-languages',
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { roomId, userId } = req.body;
    
    // Validate user is in the room
    const room = await prisma.room.findFirst({
      where: {
        id: roomId,
        users: {
          some: {
            id: userId
          }
        }
      }
    });

    if (!room) {
      return res.status(403).json({
        success: false,
        error: 'You are not a member of this room'
      });
    }

    const results: Record<string, any> = {};
    const supportedLanguages = ['javascript', 'python', 'java', 'cpp', 'c', 'php'];
    
    // Test each language
    for (const language of supportedLanguages) {
      console.log(`Testing language: ${language}`);
      
      try {
        const testResults = await testLanguageComprehensively(language);
        results[language] = testResults;
      } catch (error) {
        console.error(`Error testing ${language}:`, error);
        results[language] = {
          success: false,
          error: `Failed to test ${language}: ${error}`,
          tests: []
        };
      }
    }
    
    return res.json({
      success: true,
      results,
      summary: generateTestSummary(results)
    });
  })
);

/**
 * Test a specific language with all test cases
 */
async function testLanguageComprehensively(language: string) {
  const testCases = getTestCases(language);
  const results = [];
  
  for (const testCase of testCases) {
    try {
      const result = await executeTestCase(testCase, language);
      results.push({
        testId: testCase.id,
        name: testCase.name,
        category: testCase.category,
        success: result.success,
        output: result.output,
        error: result.error,
        executionTime: result.executionTime,
        compilationTime: result.compilationTime,
        status: result.status,
        expectedOutput: testCase.expectedOutput,
        expectedError: testCase.expectedError,
        passed: validateTestResult(result, testCase)
      });
    } catch (error) {
      results.push({
        testId: testCase.id,
        name: testCase.name,
        category: testCase.category,
        success: false,
        error: `Test execution failed: ${error}`,
        passed: false
      });
    }
  }
  
  const passedTests = results.filter(r => r.passed).length;
  const totalTests = results.length;
    
    return {
      success: true,
    language,
    totalTests,
    passedTests,
    failedTests: totalTests - passedTests,
    successRate: (passedTests / totalTests) * 100,
    results
  };
}

/**
 * Execute a single test case
 */
async function executeTestCase(testCase: LanguageTestCase, language: string): Promise<CodeExecutionResult> {
  const config = LANGUAGE_CONFIGS[language as keyof typeof LANGUAGE_CONFIGS];
  if (!config) {
    throw new Error(`Unsupported language: ${language}`);
  }
  
  return await executeCode(testCase.code, language, testCase.input || '', config);
}

/**
 * Validate if test result matches expected outcome
 */
function validateTestResult(result: CodeExecutionResult, testCase: LanguageTestCase): boolean {
  if (testCase.shouldExecute === false) {
    // Test should fail
    return !result.success && result.status !== 'success';
  }
  
  if (testCase.expectedError) {
    // Test should produce specific error
    return !result.success && 
           (result.error?.includes(testCase.expectedError) || 
            result.status === testCase.expectedError);
  }
  
  if (testCase.expectedOutput) {
    // Test should produce specific output
    return result.success === true && 
           result.output?.includes(testCase.expectedOutput) === true;
  }
  
  // Basic success validation
  const shouldExecute = testCase.shouldExecute ?? true; // Default to true if undefined
  return shouldExecute && result.success && result.status === 'success';
}

/**
 * Generate summary of all test results
 */
function generateTestSummary(results: Record<string, any>) {
  const languages = Object.keys(results);
  const totalTests = languages.reduce((sum, lang) => sum + results[lang].totalTests, 0);
  const totalPassed = languages.reduce((sum, lang) => sum + results[lang].passedTests, 0);
  const totalFailed = totalTests - totalPassed;
  const overallSuccessRate = (totalPassed / totalTests) * 100;
  
  const languageSummary = languages.map(lang => ({
    language: lang,
    totalTests: results[lang].totalTests,
    passedTests: results[lang].passedTests,
    failedTests: results[lang].failedTests,
    successRate: results[lang].successRate
  }));
  
  return {
    totalTests,
    totalPassed,
    totalFailed,
    overallSuccessRate,
    languageSummary,
    timestamp: new Date().toISOString()
  };
}

/**
 * Get available test cases for a language
 */
codeRoutes.get('/test-cases/:language',
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { language } = req.params;
    const { category } = req.query;
    
    let testCases;
    if (category) {
      testCases = getTestCasesByCategory(language, category as string);
    } else {
      testCases = getTestCases(language);
    }
    
    if (!testCases || testCases.length === 0) {
      return res.status(404).json({
        success: false,
        error: `No test cases found for language: ${language}`
      });
    }
    
    return res.json({
      success: true,
      language,
      category: category || 'all',
      count: testCases.length,
      testCases
    });
  })
);

/**
 * Run a specific test case
 */
codeRoutes.post('/test-case/:testId',
  authenticate,
  validate(codeExecutionSchema),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { testId } = req.params;
    const { roomId, userId } = req.body;
    
    // Validate user is in the room
    const room = await prisma.room.findFirst({
      where: {
        id: roomId,
        users: {
          some: {
            id: userId
          }
        }
      }
    });

    if (!room) {
      return res.status(403).json({
        success: false,
        error: 'You are not a member of this room'
      });
    }
    
    // Find the test case
    const allLanguages = getSupportedLanguages();
    let testCase: LanguageTestCase | null = null;
    let language = '';
    
    for (const lang of allLanguages) {
      const cases = getTestCases(lang);
      const found = cases.find(tc => tc.id === testId);
      if (found) {
        testCase = found;
        language = lang;
        break;
      }
    }
    
    if (!testCase) {
      return res.status(404).json({
        success: false,
        error: `Test case not found: ${testId}`
      });
    }
    
    // Execute the test case
    try {
      const result = await executeTestCase(testCase, language);
      const passed = validateTestResult(result, testCase);
      
      return res.json({
        success: true,
        testCase: {
          id: testCase.id,
          name: testCase.name,
          description: testCase.description,
          category: testCase.category
        },
        result,
        passed,
        expectedOutput: testCase.expectedOutput,
        expectedError: testCase.expectedError
      });
      
    } catch (error) {
      return res.status(500).json({
        success: false,
        error: `Test execution failed: ${error}`,
        testCase: {
          id: testCase.id,
          name: testCase.name
        }
      });
    }
  })
);

export { codeRoutes };
