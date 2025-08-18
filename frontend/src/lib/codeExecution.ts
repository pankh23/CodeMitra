export interface CodeExecutionRequest {
  code: string;
  language: string;
  input?: string;
  roomId: string;
  userId: string;
}

export interface CodeExecutionResult {
  success: boolean;
  output?: string;
  error?: string;
  executionTime?: number; // in milliseconds
  memoryUsed?: number; // in KB
  compilationTime?: number; // in milliseconds
  status: 'success' | 'compilation_error' | 'runtime_error' | 'timeout' | 'memory_limit' | 'system_error';
  timestamp: Date;
  language: string;
  codeSize: number; // in characters
}

export interface ExecutionStatus {
  isExecuting: boolean;
  progress?: number; // 0-100
  currentStep?: string;
  estimatedTime?: number; // in seconds
}

export class CodeExecutionService {
  private static instance: CodeExecutionService;
  private executionQueue: Map<string, AbortController> = new Map();

  private constructor() {}

  static getInstance(): CodeExecutionService {
    if (!CodeExecutionService.instance) {
      CodeExecutionService.instance = new CodeExecutionService();
    }
    return CodeExecutionService.instance;
  }

  /**
   * Execute code with real backend integration
   */
  async executeCode(request: CodeExecutionRequest): Promise<CodeExecutionResult> {
    const { code, language, input, roomId, userId } = request;
    
    // Validate input
    if (!code.trim()) {
      return {
        success: false,
        error: 'Please write some code before executing.',
        status: 'system_error',
        timestamp: new Date(),
        language,
        codeSize: 0
      };
    }

    // Create abort controller for this execution
    const abortController = new AbortController();
    const executionId = `${roomId}-${userId}-${Date.now()}`;
    this.executionQueue.set(executionId, abortController);

    try {
      // Call backend execution service
      const response = await fetch('/api/code/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          code: code.trim(),
          language,
          input: input || '',
          roomId,
          userId
        }),
        signal: abortController.signal
      });

      if (!response.ok) {
        throw new Error(`Execution failed: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      
      // Clean up execution queue
      this.executionQueue.delete(executionId);

      return {
        success: result.success,
        output: result.output,
        error: result.error,
        executionTime: result.executionTime,
        memoryUsed: result.memoryUsed,
        compilationTime: result.compilationTime,
        status: result.status,
        timestamp: new Date(),
        language,
        codeSize: code.length
      };

    } catch (error) {
      // Clean up execution queue
      this.executionQueue.delete(executionId);

      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          return {
            success: false,
            error: 'Code execution was cancelled.',
            status: 'system_error',
            timestamp: new Date(),
            language,
            codeSize: code.length
          };
        }
        
        return {
          success: false,
          error: error.message,
          status: 'system_error',
          timestamp: new Date(),
          language,
          codeSize: code.length
        };
      }

      return {
        success: false,
        error: 'An unexpected error occurred during execution.',
        status: 'system_error',
        timestamp: new Date(),
        language,
        codeSize: code.length
      };
    }
  }

  /**
   * Cancel ongoing code execution
   */
  cancelExecution(executionId: string): boolean {
    const controller = this.executionQueue.get(executionId);
    if (controller) {
      controller.abort();
      this.executionQueue.delete(executionId);
      return true;
    }
    return false;
  }

  /**
   * Cancel all executions for a specific room
   */
  cancelRoomExecutions(roomId: string): void {
    const entries = Array.from(this.executionQueue.entries());
    for (const [executionId, controller] of entries) {
      if (executionId.startsWith(roomId)) {
        controller.abort();
        this.executionQueue.delete(executionId);
      }
    }
  }

  /**
   * Get execution status
   */
  getExecutionStatus(executionId: string): ExecutionStatus | null {
    if (this.executionQueue.has(executionId)) {
      return {
        isExecuting: true,
        progress: 50, // Estimate
        currentStep: 'Executing code...',
        estimatedTime: 5
      };
    }
    return null;
  }

  /**
   * Validate code syntax for supported languages
   */
  validateCodeSyntax(code: string, language: string): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (!code.trim()) {
      errors.push('Code cannot be empty');
      return { isValid: false, errors };
    }

    // Language-specific validation
    switch (language) {
      case 'javascript':
        return this.validateJavaScript(code);
      case 'typescript':
        return this.validateTypeScript(code);
      case 'python':
        return this.validatePython(code);
      case 'java':
        return this.validateJava(code);
      case 'cpp':
        return this.validateCpp(code);
      case 'c':
        return this.validateC(code);
      case 'go':
        return this.validateGo(code);
      case 'rust':
        return this.validateRust(code);
      case 'php':
        return this.validatePhp(code);
      case 'html':
        return this.validateHtml(code);
      case 'css':
        return this.validateCss(code);
      case 'sql':
        return this.validateSql(code);
      default:
        return { isValid: true, errors: [] };
    }
  }

  private validateJavaScript(code: string): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    try {
      // Basic syntax validation
      new Function(code);
      
      // Check for common issues
      if (code.includes('while(true)') || code.includes('for(;;)')) {
        errors.push('Potential infinite loop detected');
      }
      
      if (code.includes('process.exit') || code.includes('window.close')) {
        errors.push('System exit commands are not allowed');
      }
      
      return { isValid: errors.length === 0, errors };
    } catch (error) {
      return { isValid: false, errors: ['JavaScript syntax error'] };
    }
  }

  private validateTypeScript(code: string): { isValid: boolean; errors: string[] } {
    // For now, use JavaScript validation since TypeScript compilation happens on backend
    return this.validateJavaScript(code);
  }

  private validatePython(code: string): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    // Check for common issues
    if (code.includes('while True:') || code.includes('for i in range(9999999)')) {
      errors.push('Potential infinite loop detected');
    }
    
    if (code.includes('os.system') || code.includes('subprocess.call')) {
      errors.push('System commands are not allowed');
    }
    
    if (code.includes('import os') || code.includes('import subprocess')) {
      errors.push('System modules are not allowed');
    }
    
    return { isValid: errors.length === 0, errors };
  }

  private validateJava(code: string): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    // Check for required Java structure
    if (!code.includes('public class')) {
      errors.push('Java code must contain a public class');
    }
    
    if (!code.includes('public static void main')) {
      errors.push('Java code must contain a main method');
    }
    
    if (code.includes('System.exit') || code.includes('Runtime.getRuntime()')) {
      errors.push('System exit commands are not allowed');
    }
    
    return { isValid: errors.length === 0, errors };
  }

  private validateCpp(code: string): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    // Check for required C++ structure
    if (!code.includes('int main()')) {
      errors.push('C++ code must contain a main function');
    }
    
    if (code.includes('system(') || code.includes('exit(')) {
      errors.push('System commands are not allowed');
    }
    
    return { isValid: errors.length === 0, errors };
  }

  private validateC(code: string): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    // Check for required C structure
    if (!code.includes('int main(')) {
      errors.push('C code must contain a main function');
    }
    
    if (code.includes('system(') || code.includes('exit(')) {
      errors.push('System commands are not allowed');
    }
    
    return { isValid: errors.length === 0, errors };
  }

  private validateGo(code: string): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    // Check for required Go structure
    if (!code.includes('package main')) {
      errors.push('Go code must contain package main');
    }
    
    if (!code.includes('func main()')) {
      errors.push('Go code must contain a main function');
    }
    
    if (code.includes('os.Exit') || code.includes('syscall.Exec')) {
      errors.push('System exit commands are not allowed');
    }
    
    return { isValid: errors.length === 0, errors };
  }

  private validateRust(code: string): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    // Check for required Rust structure
    if (!code.includes('fn main()')) {
      errors.push('Rust code must contain a main function');
    }
    
    if (code.includes('std::process::exit') || code.includes('std::env::set_var')) {
      errors.push('System commands are not allowed');
    }
    
    return { isValid: errors.length === 0, errors };
  }

  private validatePhp(code: string): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    // Check for common issues
    if (code.includes('exec(') || code.includes('shell_exec(') || code.includes('system(')) {
      errors.push('System commands are not allowed');
    }
    
    if (code.includes('file_get_contents') || code.includes('fopen')) {
      errors.push('File operations are not allowed');
    }
    
    return { isValid: errors.length === 0, errors };
  }

  private validateHtml(code: string): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    // Check for required HTML structure
    if (!code.includes('<html') || !code.includes('</html>')) {
      errors.push('HTML code must contain html tags');
    }
    
    if (!code.includes('<body') || !code.includes('</body>')) {
      errors.push('HTML code must contain body tags');
    }
    
    return { isValid: errors.length === 0, errors };
  }

  private validateCss(code: string): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    // Check for required CSS structure
    if (!code.includes('{') || !code.includes('}')) {
      errors.push('CSS code must contain style rules');
    }
    
    return { isValid: errors.length === 0, errors };
  }

  private validateSql(code: string): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    // Check for dangerous SQL operations
    const dangerousKeywords = ['DROP', 'DELETE', 'UPDATE', 'INSERT', 'ALTER', 'CREATE'];
    const upperCode = code.toUpperCase();
    
    for (const keyword of dangerousKeywords) {
      if (upperCode.includes(keyword)) {
        errors.push(`${keyword} operations are not allowed in demo mode`);
      }
    }
    
    return { isValid: errors.length === 0, errors };
  }
}

// Export singleton instance
export const codeExecutionService = CodeExecutionService.getInstance();
