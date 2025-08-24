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
const LANGUAGE_CONFIGS = {
    javascript: {
        extension: 'js',
        dockerImage: 'node:18-alpine',
        command: 'node',
        args: ['-e'],
        timeout: 10000,
        memoryLimit: 128 * 1024 * 1024,
        needsCompilation: false
    },
    python: {
        extension: 'py',
        dockerImage: 'python:3.11-alpine',
        command: 'python3',
        args: ['-c'],
        timeout: 10000,
        memoryLimit: 256 * 1024 * 1024,
        needsCompilation: false
    },
    java: {
        extension: 'java',
        dockerImage: 'openjdk:17-alpine',
        command: 'java',
        args: ['-cp', '.', 'Main'],
        timeout: 20000,
        memoryLimit: 512 * 1024 * 1024,
        needsCompilation: true,
        compileCommand: 'javac'
    },
    cpp: {
        extension: 'cpp',
        dockerImage: 'gcc:alpine',
        command: './a.out',
        args: [],
        timeout: 15000,
        memoryLimit: 256 * 1024 * 1024,
        needsCompilation: true,
        compileCommand: 'g++'
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
            config,
            timestamp: Date.now()
        }, {
            removeOnComplete: true,
            removeOnFail: true
        });
        console.log(`Code execution job ${job.id} added to queue`);
        return {
            success: true,
            output: 'Code execution queued successfully. Check worker logs for results.',
            executionTime: 0,
            status: 'success'
        };
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
            success: true,
            result
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