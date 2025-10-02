import { spawn } from 'child_process';
import { writeFile, unlink, mkdir, access } from 'fs/promises';
import { join } from 'path';
import { randomUUID } from 'crypto';

export interface ExecutionResult {
  output: string;
  error: string;
  executionTime: number;
  status: 'success' | 'error' | 'timeout' | 'compilation_error';
  compilationTime?: number;
  executionTimeOnly?: number;
}

export async function executeCode(code: string, language: string): Promise<ExecutionResult> {
  const startTime = Date.now();
  const executionId = randomUUID();
  const tempDir = join('/tmp', `exec_${executionId}`);
  
  try {
    // Create isolated temporary directory for this execution
    await mkdir(tempDir, { recursive: true });
    
    console.log(`Executing ${language} code for execution ID: ${executionId}`);
    
    switch (language) {
      case 'javascript':
        return await executeJavaScript(code, tempDir, executionId, startTime);
      case 'python':
        return await executePython(code, tempDir, executionId, startTime);
      case 'java':
        return await executeJava(code, tempDir, executionId, startTime);
      case 'cpp':
        return await executeCpp(code, tempDir, executionId, startTime);
      default:
        throw new Error(`Unsupported language: ${language}`);
    }
  } catch (error) {
    console.error(`Execution error for ${language}:`, error);
    return {
      output: '',
      error: error instanceof Error ? error.message : 'Unknown error',
      executionTime: Date.now() - startTime,
      status: 'error'
    };
  } finally {
    // Always cleanup temporary directory
    await cleanupDirectory(tempDir);
  }
}

// JavaScript execution
async function executeJavaScript(code: string, tempDir: string, executionId: string, startTime: number): Promise<ExecutionResult> {
  const fileName = 'main.js';
  const filePath = join(tempDir, fileName);
  
  try {
    // Write code to file
    await writeFile(filePath, code);
    
    // Execute with Node.js
    const result = await executeCommand('node', [fileName], tempDir, 10000);
    
    return {
      output: result.stdout,
      error: result.stderr,
      executionTime: Date.now() - startTime,
      status: result.exitCode === 0 ? 'success' : 'error'
    };
  } catch (error) {
    return {
      output: '',
      error: error instanceof Error ? error.message : 'JavaScript execution failed',
      executionTime: Date.now() - startTime,
      status: 'error'
    };
  }
}

// Python execution
async function executePython(code: string, tempDir: string, executionId: string, startTime: number): Promise<ExecutionResult> {
  const fileName = 'main.py';
  const filePath = join(tempDir, fileName);
  
  try {
    // Write code to file
    await writeFile(filePath, code);
    
    // Execute with Python 3
    const result = await executeCommand('python3', [fileName], tempDir, 10000);
    
    return {
      output: result.stdout,
      error: result.stderr,
      executionTime: Date.now() - startTime,
      status: result.exitCode === 0 ? 'success' : 'error'
    };
  } catch (error) {
    return {
      output: '',
      error: error instanceof Error ? error.message : 'Python execution failed',
      executionTime: Date.now() - startTime,
      status: 'error'
    };
  }
}

// Java execution (two-phase: compile then run)
async function executeJava(code: string, tempDir: string, executionId: string, startTime: number): Promise<ExecutionResult> {
  const fileName = 'Main.java';
  const filePath = join(tempDir, fileName);
  const classFile = join(tempDir, 'Main.class');
  
  try {
    // Write code to file
    await writeFile(filePath, code);
    
    // Phase 1: Compile Java code
    const compileStartTime = Date.now();
    const compileResult = await executeCommand('javac', [fileName], tempDir, 5000);
    const compilationTime = Date.now() - compileStartTime;
    
    if (compileResult.exitCode !== 0) {
      return {
        output: '',
        error: `Compilation Error:\n${compileResult.stderr}`,
        executionTime: Date.now() - startTime,
        compilationTime,
        status: 'compilation_error'
      };
    }
    
    // Check if class file was created
    try {
      await access(classFile);
    } catch {
      return {
        output: '',
        error: 'Compilation failed - no class file generated',
        executionTime: Date.now() - startTime,
        compilationTime,
        status: 'compilation_error'
      };
    }
    
    // Phase 2: Execute compiled Java code
    const execStartTime = Date.now();
    const execResult = await executeCommand('java', ['-cp', '.', 'Main'], tempDir, 10000);
    const executionTimeOnly = Date.now() - execStartTime;
    
    return {
      output: execResult.stdout,
      error: execResult.stderr,
      executionTime: Date.now() - startTime,
      compilationTime,
      executionTimeOnly,
      status: execResult.exitCode === 0 ? 'success' : 'error'
    };
  } catch (error) {
    return {
      output: '',
      error: error instanceof Error ? error.message : 'Java execution failed',
      executionTime: Date.now() - startTime,
      status: 'error'
    };
  }
}

// C++ execution (two-phase: compile then run)
async function executeCpp(code: string, tempDir: string, executionId: string, startTime: number): Promise<ExecutionResult> {
  const fileName = 'main.cpp';
  const filePath = join(tempDir, fileName);
  const executableName = 'program';
  const executablePath = join(tempDir, executableName);
  
  try {
    // Write code to file
    await writeFile(filePath, code);
    
    // Phase 1: Compile C++ code
    const compileStartTime = Date.now();
    const compileResult = await executeCommand('g++', [
      '-std=c++17',
      '-o', executableName,
      fileName
    ], tempDir, 5000);
    const compilationTime = Date.now() - compileStartTime;
    
    if (compileResult.exitCode !== 0) {
      return {
        output: '',
        error: `Compilation Error:\n${compileResult.stderr}`,
        executionTime: Date.now() - startTime,
        compilationTime,
        status: 'compilation_error'
      };
    }
    
    // Check if executable was created
    try {
      await access(executablePath);
    } catch {
      return {
        output: '',
        error: 'Compilation failed - no executable generated',
        executionTime: Date.now() - startTime,
        compilationTime,
        status: 'compilation_error'
      };
    }
    
    // Phase 2: Execute compiled C++ code
    const execStartTime = Date.now();
    const execResult = await executeCommand(`./${executableName}`, [], tempDir, 10000);
    const executionTimeOnly = Date.now() - execStartTime;
    
    return {
      output: execResult.stdout,
      error: execResult.stderr,
      executionTime: Date.now() - startTime,
      compilationTime,
      executionTimeOnly,
      status: execResult.exitCode === 0 ? 'success' : 'error'
    };
  } catch (error) {
    return {
      output: '',
      error: error instanceof Error ? error.message : 'C++ execution failed',
      executionTime: Date.now() - startTime,
      status: 'error'
    };
  }
}

// Generic command execution with timeout
function executeCommand(command: string, args: string[], cwd: string, timeout: number): Promise<{
  stdout: string;
  stderr: string;
  exitCode: number;
}> {
  return new Promise((resolve, reject) => {
    console.log(`Executing: ${command} ${args.join(' ')} in ${cwd}`);
    
    const childProcess = spawn(command, args, {
      cwd,
      timeout,
      env: {
        ...process.env,
        LANG: 'en_US.UTF-8',
        LC_ALL: 'en_US.UTF-8'
      }
    });

    let stdout = '';
    let stderr = '';

    childProcess.stdout.on('data', (data: Buffer) => {
      stdout += data.toString();
    });

    childProcess.stderr.on('data', (data: Buffer) => {
      stderr += data.toString();
    });

    childProcess.on('close', (code: number | null) => {
      console.log(`Command completed with exit code: ${code}`);
      resolve({
        stdout,
        stderr,
        exitCode: code || 0
      });
    });

    childProcess.on('error', (error: Error) => {
      console.error(`Command error:`, error);
      reject(error);
    });
  });
}

// Cleanup temporary directory
async function cleanupDirectory(tempDir: string): Promise<void> {
  try {
    const { exec } = require('child_process');
    const { promisify } = require('util');
    const execAsync = promisify(exec);
    
    // Remove the entire directory and its contents
    await execAsync(`rm -rf "${tempDir}"`);
  } catch (error) {
    console.warn('Cleanup warning:', error);
  }
}

