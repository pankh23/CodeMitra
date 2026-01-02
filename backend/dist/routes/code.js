"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.codeRoutes = void 0;
const express_1 = __importDefault(require("express"));
const prisma_1 = require("../utils/prisma");
const errorHandler_1 = require("../middleware/errorHandler");
const auth_1 = require("../middleware/auth");
const validation_1 = require("../utils/validation");
const bullmq_1 = require("bullmq");
const redis_1 = require("../utils/redis");
const uuid_1 = require("uuid");
const codeRoutes = express_1.default.Router();
exports.codeRoutes = codeRoutes;
const codeExecutionQueue = new bullmq_1.Queue('code-execution', {
    connection: redis_1.redisClient,
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
const queueEvents = new bullmq_1.QueueEvents('code-execution', {
    connection: redis_1.redisClient,
});
const LANGUAGE_CONFIGS = {
    javascript: {
        extension: 'js',
        dockerImage: 'node:18-alpine',
        runCommand: 'node main.js',
        timeout: 30000,
        memoryLimit: '256m',
        needsCompilation: false
    },
    python: {
        extension: 'py',
        dockerImage: 'python:3.11-alpine',
        runCommand: 'python main.py',
        timeout: 30000,
        memoryLimit: '256m',
        needsCompilation: false
    },
    java: {
        extension: 'java',
        dockerImage: 'eclipse-temurin:17-jdk',
        compileCommand: 'javac Main.java',
        runCommand: 'java Main',
        timeout: 30000,
        memoryLimit: '512m',
        needsCompilation: true
    },
    cpp: {
        extension: 'cpp',
        dockerImage: 'gcc:11-alpine',
        compileCommand: 'g++ -std=c++17 -O2 -Wall -Wextra -o main main.cpp',
        runCommand: './main',
        timeout: 45000,
        memoryLimit: '256m',
        needsCompilation: true
    }
};
async function executeCodeWithQueue(code, language, input, config) {
    const executionId = (0, uuid_1.v4)();
    try {
        const job = await codeExecutionQueue.add('execute', {
            executionId,
            language,
            code,
            input,
            timeout: config.timeout,
            memoryLimit: config.memoryLimit,
            timestamp: Date.now()
        }, {
            removeOnComplete: false,
            removeOnFail: false,
            attempts: 1,
            delay: 0
        });
        console.log(`Code execution job ${job.id} added to queue`);
        try {
            console.log(`Waiting for job ${job.id} to complete...`);
            {
                let attempts = 0;
                const maxAttempts = 60;
                while (attempts < maxAttempts) {
                    await new Promise(resolve => setTimeout(resolve, 500));
                    const jobState = await job.getState();
                    console.log(`Job ${job.id} state: ${jobState}`);
                    if (jobState === 'completed') {
                        const resultKey = `execution-result:${executionId}`;
                        const resultStr = await redis_1.redisClient.get(resultKey);
                        let result = null;
                        if (resultStr) {
                            try {
                                result = JSON.parse(resultStr);
                                console.log(`Job ${job.id} completed successfully with result from Redis:`, JSON.stringify(result, null, 2));
                            }
                            catch (parseError) {
                                console.error(`Failed to parse result from Redis:`, parseError);
                            }
                        }
                        else {
                            console.log(`No result found in Redis for key: ${resultKey}, falling back to job.returnvalue`);
                            await new Promise(resolve => setTimeout(resolve, 1000));
                            result = job.returnvalue;
                            console.log(`Job ${job.id} completed with fallback result:`, JSON.stringify(result, null, 2));
                        }
                        return {
                            success: result?.status === 'completed',
                            output: result?.output || result?.stdout || '',
                            error: result?.error || result?.stderr || '',
                            executionTime: result?.executionTime || 0,
                            memoryUsed: result?.memoryUsage || result?.memoryUsed || 0,
                            compilationTime: result?.compilationTime || 0,
                            status: result?.status || 'failed'
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
                            status: 'runtime_error'
                        };
                    }
                    attempts++;
                }
                console.error(`Job ${job.id} timed out after ${maxAttempts * 500}ms`);
                return {
                    success: false,
                    output: '',
                    error: 'Code execution timed out',
                    executionTime: 0,
                    memoryUsed: 0,
                    compilationTime: 0,
                    status: 'timeout'
                };
            }
        }
        catch (waitError) {
            console.error(`Job ${job.id} wait failed:`, waitError);
            return {
                success: false,
                output: '',
                error: waitError.message || 'Code execution failed',
                executionTime: 0,
                memoryUsed: 0,
                compilationTime: 0,
                status: 'system_error'
            };
        }
    }
    catch (error) {
        console.error('Code execution failed:', error);
        return {
            success: false,
            error: error.message || 'Execution failed',
            status: 'system_error'
        };
    }
}
codeRoutes.post('/execute', auth_1.authenticate, (0, validation_1.validate)(validation_1.codeExecutionSchema), (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { code, language, input = '', roomId } = req.body;
    const userId = req.user.id;
    console.log(`Code execution request: ${language} in room ${roomId} by user ${userId}`);
    if (!LANGUAGE_CONFIGS[language]) {
        return res.status(400).json({
            success: false,
            error: `Unsupported language: ${language}. Supported languages: ${Object.keys(LANGUAGE_CONFIGS).join(', ')}`
        });
    }
    const room = await prisma_1.prisma.room.findFirst({
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
        const config = LANGUAGE_CONFIGS[language];
        const result = await executeCodeWithQueue(code, language, input, config);
        await prisma_1.prisma.codeExecution.create({
            data: {
                id: (0, uuid_1.v4)(),
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
    }
    catch (error) {
        console.error('Code execution error:', error);
        return res.status(500).json({
            success: false,
            error: 'Code execution failed',
            details: error.message
        });
    }
}));
codeRoutes.get('/history/:roomId', auth_1.authenticate, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { roomId } = req.params;
    const userId = req.user.id;
    const room = await prisma_1.prisma.room.findFirst({
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
    const executions = await prisma_1.prisma.codeExecution.findMany({
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
}));
codeRoutes.get('/languages', async (req, res) => {
    const languages = Object.keys(LANGUAGE_CONFIGS).map(lang => ({
        id: lang,
        name: lang.charAt(0).toUpperCase() + lang.slice(1),
        extension: LANGUAGE_CONFIGS[lang].extension,
        needsCompilation: LANGUAGE_CONFIGS[lang].needsCompilation
    }));
    return res.json({
        success: true,
        languages
    });
});
//# sourceMappingURL=code.js.map