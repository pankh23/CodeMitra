"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
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
const child_process_1 = require("child_process");
const util_1 = require("util");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const os = __importStar(require("os"));
const uuid_1 = require("uuid");
const execAsync = (0, util_1.promisify)(child_process_1.exec);
const codeRoutes = express_1.default.Router();
exports.codeRoutes = codeRoutes;
const LANGUAGE_CONFIGS = {
    javascript: {
        extension: 'js',
        command: 'node',
        timeout: 10000,
        memoryLimit: 128,
        needsCompilation: false
    },
    typescript: {
        extension: 'ts',
        command: 'ts-node',
        timeout: 15000,
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
    go: {
        extension: 'go',
        command: './main',
        timeout: 15000,
        memoryLimit: 256,
        needsCompilation: true,
        compileCommand: 'go build'
    },
    rust: {
        extension: 'rs',
        command: './main',
        timeout: 20000,
        memoryLimit: 256,
        needsCompilation: true,
        compileCommand: 'rustc'
    },
    php: {
        extension: 'php',
        command: 'php',
        timeout: 10000,
        memoryLimit: 128,
        needsCompilation: false
    }
};
codeRoutes.post('/execute', auth_1.authenticate, (0, validation_1.validate)(validation_1.codeExecutionSchema), (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { code, language, input, roomId, userId } = req.body;
    const room = await prisma_1.prisma.room.findFirst({
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
    const config = LANGUAGE_CONFIGS[language];
    if (!config) {
        return res.status(400).json({
            success: false,
            error: `Unsupported language: ${language}`
        });
    }
    if (code.length > 10000) {
        return res.status(400).json({
            success: false,
            error: 'Code too long (max 10,000 characters)'
        });
    }
    if (!isCodeSafe(code, language)) {
        return res.status(400).json({
            success: false,
            error: 'Code contains potentially unsafe operations'
        });
    }
    try {
        const result = await executeCode(code, language, input || '', config);
        await prisma_1.prisma.codeExecution.create({
            data: {
                id: (0, uuid_1.v4)(),
                roomId,
                userId,
                language,
                code: code.substring(0, 1000),
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
    }
    catch (error) {
        console.error('Code execution error:', error);
        return res.status(500).json({
            success: false,
            error: 'Code execution failed',
            status: 'system_error'
        });
    }
}));
codeRoutes.get('/history/:roomId', auth_1.authenticate, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { roomId } = req.params;
    const userId = req.user?.id;
    const room = await prisma_1.prisma.room.findFirst({
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
    const executions = await prisma_1.prisma.codeExecution.findMany({
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
}));
async function executeCode(code, language, input, config) {
    const startTime = Date.now();
    const tempDir = path.join(os.tmpdir(), `code-exec-${(0, uuid_1.v4)()}`);
    try {
        fs.mkdirSync(tempDir, { recursive: true });
        const inputFile = path.join(tempDir, 'input.txt');
        fs.writeFileSync(inputFile, input);
        const sourceFile = path.join(tempDir, `main.${config.extension}`);
        fs.writeFileSync(sourceFile, code);
        let compilationTime;
        let executablePath = sourceFile;
        if (config.needsCompilation) {
            const compileStart = Date.now();
            try {
                if (language === 'java') {
                    await execAsync(`${config.compileCommand} ${sourceFile}`, {
                        cwd: tempDir,
                        timeout: config.timeout
                    });
                    executablePath = path.join(tempDir, 'Main.class');
                }
                else if (language === 'go') {
                    await execAsync(`${config.compileCommand} -o main ${sourceFile}`, {
                        cwd: tempDir,
                        timeout: config.timeout
                    });
                    executablePath = path.join(tempDir, 'main');
                }
                else if (language === 'rust') {
                    await execAsync(`${config.compileCommand} ${sourceFile} -o main`, {
                        cwd: tempDir,
                        timeout: config.timeout
                    });
                    executablePath = path.join(tempDir, 'main');
                }
                else {
                    await execAsync(`${config.compileCommand} ${sourceFile} -o a.out`, {
                        cwd: tempDir,
                        timeout: config.timeout
                    });
                    executablePath = path.join(tempDir, 'a.out');
                }
                compilationTime = Date.now() - compileStart;
            }
            catch (compileError) {
                return {
                    success: false,
                    error: compileError.stderr || 'Compilation failed',
                    status: 'compilation_error',
                    compilationTime: Date.now() - compileStart
                };
            }
        }
        const executionStart = Date.now();
        let command;
        if (language === 'java') {
            command = `${config.command} -cp ${tempDir} Main`;
        }
        else if (language === 'go' || language === 'rust' || language === 'cpp' || language === 'c') {
            command = executablePath;
        }
        else {
            command = `${config.command} ${sourceFile}`;
        }
        const { stdout, stderr } = await execAsync(command, {
            cwd: tempDir,
            timeout: config.timeout
        });
        const executionTime = Date.now() - executionStart;
        const totalTime = Date.now() - startTime;
        if (stderr && stderr.trim()) {
            return {
                success: false,
                error: stderr,
                status: 'runtime_error',
                executionTime,
                compilationTime
            };
        }
        return {
            success: true,
            output: stdout || '',
            status: 'success',
            executionTime,
            compilationTime
        };
    }
    catch (error) {
        if (error.code === 'ETIMEDOUT') {
            return {
                success: false,
                error: 'Execution timeout',
                status: 'timeout'
            };
        }
        return {
            success: false,
            error: error.stderr || error.message || 'Execution failed',
            status: 'runtime_error'
        };
    }
    finally {
        try {
            fs.rmSync(tempDir, { recursive: true, force: true });
        }
        catch (cleanupError) {
            console.error('Failed to cleanup temp directory:', cleanupError);
        }
    }
}
function isCodeSafe(code, language) {
    const dangerousPatterns = [
        /system\s*\(/i,
        /exec\s*\(/i,
        /shell_exec\s*\(/i,
        /passthru\s*\(/i,
        /eval\s*\(/i,
        /file_get_contents\s*\(/i,
        /fopen\s*\(/i,
        /unlink\s*\(/i,
        /rmdir\s*\(/i,
        /fsockopen\s*\(/i,
        /curl_exec\s*\(/i,
        /pcntl_exec\s*\(/i,
        /proc_open\s*\(/i,
        /DROP\s+TABLE/i,
        /DELETE\s+FROM/i,
        /UPDATE\s+.*\s+SET/i,
        /INSERT\s+INTO/i,
        /ALTER\s+TABLE/i,
        /CREATE\s+TABLE/i,
        /while\s*\(\s*true\s*\)/i,
        /for\s*\(\s*;\s*;\s*\)/i,
        /exit\s*\(/i,
        /die\s*\(/i,
        /abort\s*\(/i
    ];
    if (language === 'python') {
        dangerousPatterns.push(/import\s+os/i, /import\s+subprocess/i, /import\s+sys/i, /__import__\s*\(/i);
    }
    if (language === 'javascript' || language === 'typescript') {
        dangerousPatterns.push(/process\.exit\s*\(/i, /require\s*\(/i, /eval\s*\(/i, /Function\s*\(/i);
    }
    if (language === 'java') {
        dangerousPatterns.push(/System\.exit\s*\(/i, /Runtime\.getRuntime\s*\(/i, /ProcessBuilder/i);
    }
    if (language === 'cpp' || language === 'c') {
        dangerousPatterns.push(/system\s*\(/i, /popen\s*\(/i, /exec\s*\(/i);
    }
    for (const pattern of dangerousPatterns) {
        if (pattern.test(code)) {
            return false;
        }
    }
    return true;
}
//# sourceMappingURL=code.js.map