import express, { Request, Response } from 'express';
import { prisma } from '../utils/prisma';
import { asyncHandler } from '../middleware/errorHandler';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';
import { validate, codeExecutionSchema } from '../utils/validation';
import { Queue } from 'bullmq';
import { redisClient } from '../utils/redis';
import { v4 as uuidv4 } from 'uuid';

const codeRoutes = express.Router();

// Create BullMQ queue for code execution
const codeExecutionQueue = new Queue('code-execution', {
  connection: redisClient,
  defaultJobOptions: {
    removeOnComplete: 10,
    removeOnFail: 50,
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
  },
});

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
    dockerImage: 'node:18-alpine',
    command: 'node',
    args: ['-e'],
    timeout: 10000,
    memoryLimit: 128 * 1024 * 1024, // 128MB
    needsCompilation: false
  },
  python: {
    extension: 'py',
    dockerImage: 'python:3.11-alpine',
    command: 'python3',
    args: ['-c'],
    timeout: 10000,
    memoryLimit: 256 * 1024 * 1024, // 256MB
    needsCompilation: false
  },
  java: {
    extension: 'java',
    dockerImage: 'openjdk:17-alpine',
    command: 'java',
    args: ['-cp', '.', 'Main'],
    timeout: 20000,
    memoryLimit: 512 * 1024 * 1024, // 512MB
    needsCompilation: true,
    compileCommand: 'javac'
  },
  cpp: {
    extension: 'cpp',
    dockerImage: 'gcc:alpine',
    command: './a.out',
    args: [],
    timeout: 15000,
    memoryLimit: 256 * 1024 * 1024, // 256MB
    needsCompilation: true,
    compileCommand: 'g++'
  }
};

/**
 * Execute code using BullMQ queue and Docker containers
 */
async function executeCodeWithQueue(code: string, language: string, input: string, config: any): Promise<CodeExecutionResult> {
  const executionId = uuidv4();
  
  try {
    // Add job to queue
    const job = await codeExecutionQueue.add('execute', {
      executionId,
      language,
      code,
      input,
      config,
      timestamp: Date.now()
    }, {
      removeOnComplete: false, // Keep completed jobs so we can get results
      removeOnFail: false,     // Keep failed jobs so we can get error details
      attempts: 1,
      delay: 0
    });

    console.log(`Code execution job ${job.id} added to queue`);

    // Wait for job completion using polling approach
    try {
      console.log(`Waiting for job ${job.id} to complete...`);
      
      // Poll for job completion with timeout
      let attempts = 0;
      const maxAttempts = 60; // 30 seconds with 500ms intervals
      
      while (attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 500)); // Wait 500ms
        
        const jobState = await job.getState();
        console.log(`Job ${job.id} state: ${jobState}`);
        
        if (jobState === 'completed') {
          const result = job.returnvalue;
          console.log(`Job ${job.id} completed successfully with result:`, JSON.stringify(result, null, 2));
          
          return {
            success: result?.success !== false,
            output: result?.output || result?.stdout || 'Code executed successfully',
            error: result?.error || result?.stderr || '',
            executionTime: result?.executionTime || 0,
            memoryUsed: result?.memoryUsage || 0,
            compilationTime: result?.compilationTime || 0,
            status: (result?.success !== false ? 'success' : 'runtime_error') as any
          };
        }
        
        if (jobState === 'failed') {
          const failedReason = job.failedReason;
          console.error(`Job ${job.id} failed:`, failedReason);
          
          return {
            success: false,
            output: '',
            error: failedReason || 'Code execution failed',
            executionTime: 0,
            memoryUsed: 0,
            compilationTime: 0,
            status: 'runtime_error' as any
          };
        }
        
        attempts++;
      }
      
      // Timeout reached
      console.error(`Job ${job.id} timed out after ${maxAttempts * 500}ms`);
      return {
        success: false,
        output: '',
        error: 'Code execution timed out',
        executionTime: 0,
        memoryUsed: 0,
        compilationTime: 0,
        status: 'timeout' as any
      };
      
    } catch (waitError: any) {
      console.error(`Job ${job.id} wait failed:`, waitError);
      
      return {
        success: false,
        output: '',
        error: waitError.message || 'Code execution failed',
        executionTime: 0,
        memoryUsed: 0,
        compilationTime: 0,
        status: 'system_error' as any
      };
    }
  } catch (error: any) {
    console.error('Code execution failed:', error);
    return {
      success: false,
      error: error.message || 'Execution failed',
      status: 'system_error'
    };
  }
}

/**
 * Execute code endpoint
 */
codeRoutes.post('/execute', 
  authenticate, 
  validate(codeExecutionSchema),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { code, language, input = '', roomId } = req.body;
    const userId = req.user!.id;

    console.log(`Code execution request: ${language} in room ${roomId} by user ${userId}`);

    // Validate language support
    if (!LANGUAGE_CONFIGS[language as keyof typeof LANGUAGE_CONFIGS]) {
      return res.status(400).json({
        success: false,
        error: `Unsupported language: ${language}. Supported languages: ${Object.keys(LANGUAGE_CONFIGS).join(', ')}`
      });
    }

    // Check if user is in the room
    const room = await prisma.room.findFirst({
      where: {
        id: roomId,
        users: {
          some: {
            userId: userId
          }
        }
      }
    });

    if (!room) {
      return res.status(403).json({
        success: false,
        error: 'You are not authorized to execute code in this room'
      });
    }

    try {
      const config = LANGUAGE_CONFIGS[language as keyof typeof LANGUAGE_CONFIGS];
      const result = await executeCodeWithQueue(code, language, input, config);

      // Save execution result to database
      await prisma.codeExecution.create({
        data: {
          id: uuidv4(),
          userId,
          roomId,
          language,
          code,
          success: result.success,
          output: result.output || '',
          error: result.error || '',
          executionTime: result.executionTime || 0,
          memoryUsed: result.memoryUsed || 0,
          compilationTime: result.compilationTime || 0,
          status: result.status
        }
      });

      return res.json({
        success: result.success,
        output: result.output,
        error: result.error,
        executionTime: result.executionTime,
        memoryUsed: result.memoryUsed,
        compilationTime: result.compilationTime,
        status: result.status
      });

    } catch (error: any) {
      console.error('Code execution error:', error);
      return res.status(500).json({
        success: false,
        error: 'Code execution failed',
        details: error.message
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
    const userId = req.user!.id;

    // Check if user is in the room
    const room = await prisma.room.findFirst({
      where: {
        id: roomId,
        users: {
          some: {
            userId: userId
          }
        }
      }
    });

    if (!room) {
      return res.status(403).json({
        success: false,
        error: 'You are not authorized to view execution history in this room'
      });
    }

    const executions = await prisma.codeExecution.findMany({
      where: { roomId },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            avatar: true
          }
        }
      }
    });

    return res.json({
      success: true,
      executions
    });
  })
);

/**
 * Get supported languages
 */
codeRoutes.get('/languages', async (req: Request, res: Response) => {
  const languages = Object.keys(LANGUAGE_CONFIGS).map(lang => ({
    id: lang,
    name: lang.charAt(0).toUpperCase() + lang.slice(1),
    extension: LANGUAGE_CONFIGS[lang as keyof typeof LANGUAGE_CONFIGS].extension,
    needsCompilation: LANGUAGE_CONFIGS[lang as keyof typeof LANGUAGE_CONFIGS].needsCompilation
  }));

  return res.json({
    success: true,
    languages
  });
});

export { codeRoutes };
