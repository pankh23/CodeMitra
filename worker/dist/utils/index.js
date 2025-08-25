"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sanitizeError = exports.isMemoryError = exports.isTimeoutError = exports.generateExecutionId = exports.validateMemoryLimit = exports.validateTimeout = exports.sleep = exports.formatExecutionTime = exports.formatMemorySize = exports.parseMemoryLimit = exports.scanCodeForSecurity = exports.createInputFile = exports.getFileSize = exports.cleanupDirectory = exports.fileExists = exports.readFileContent = exports.writeCodeToFile = exports.createTempDirectory = exports.getWorkerConfig = exports.logger = void 0;
const fs_extra_1 = __importDefault(require("fs-extra"));
const path_1 = __importDefault(require("path"));
const uuid_1 = require("uuid");
const winston_1 = __importDefault(require("winston"));
exports.logger = winston_1.default.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: winston_1.default.format.combine(winston_1.default.format.timestamp(), winston_1.default.format.errors({ stack: true }), winston_1.default.format.json()),
    defaultMeta: { service: 'codemitra-worker' },
    transports: [
        new winston_1.default.transports.Console({
            format: winston_1.default.format.combine(winston_1.default.format.colorize(), winston_1.default.format.simple())
        })
    ]
});
if (process.env.LOG_FILE) {
    exports.logger.add(new winston_1.default.transports.File({ filename: process.env.LOG_FILE }));
}
const getWorkerConfig = () => {
    return {
        redis: {
            host: process.env.REDIS_HOST || 'localhost',
            port: parseInt(process.env.REDIS_PORT || '6379'),
            password: process.env.REDIS_PASSWORD,
            db: parseInt(process.env.REDIS_DB || '0')
        },
        docker: {
            socketPath: process.env.DOCKER_SOCKET_PATH || '/var/run/docker.sock',
            host: process.env.DOCKER_HOST,
            port: process.env.DOCKER_PORT ? parseInt(process.env.DOCKER_PORT) : undefined,
            timeout: parseInt(process.env.DOCKER_TIMEOUT || '60000'),
            maxConcurrentExecutions: parseInt(process.env.MAX_CONCURRENT_EXECUTIONS || '10'),
            imageRetentionTime: parseInt(process.env.IMAGE_RETENTION_TIME || '86400000')
        },
        execution: {
            defaultTimeout: parseInt(process.env.DEFAULT_TIMEOUT || '30000'),
            maxTimeout: parseInt(process.env.MAX_TIMEOUT || '300000'),
            defaultMemoryLimit: process.env.DEFAULT_MEMORY_LIMIT || '256m',
            maxMemoryLimit: process.env.MAX_MEMORY_LIMIT || '1g',
            tempDir: process.env.TEMP_DIR || '/tmp/codemitra',
            cleanupInterval: parseInt(process.env.CLEANUP_INTERVAL || '300000')
        },
        security: {
            enableSandbox: process.env.ENABLE_SANDBOX === 'true',
            enableSecurityScan: process.env.ENABLE_SECURITY_SCAN === 'true',
            allowedHosts: process.env.ALLOWED_HOSTS?.split(',') || [],
            bannedKeywords: process.env.BANNED_KEYWORDS?.split(',') || [
                'eval', 'exec', 'system', 'shell_exec', 'passthru', 'proc_open',
                'popen', 'fork', 'spawn', 'child_process', 'require', 'import',
                'subprocess', 'os.system', 'os.exec', 'Runtime.getRuntime',
                'ProcessBuilder', 'javax.script', 'java.lang.reflect',
                'java.lang.Runtime', 'java.lang.Process'
            ]
        },
        logging: {
            level: process.env.LOG_LEVEL || 'info',
            format: process.env.LOG_FORMAT || 'json',
            file: process.env.LOG_FILE
        }
    };
};
exports.getWorkerConfig = getWorkerConfig;
const createTempDirectory = async () => {
    const config = (0, exports.getWorkerConfig)();
    const baseDir = '/tmp/codemitra-shared';
    const tempDir = path_1.default.join(baseDir, `codemitra-${(0, uuid_1.v4)()}`);
    await fs_extra_1.default.ensureDir(tempDir);
    return tempDir;
};
exports.createTempDirectory = createTempDirectory;
const writeCodeToFile = async (code, filePath) => {
    await fs_extra_1.default.writeFile(filePath, code, 'utf8');
};
exports.writeCodeToFile = writeCodeToFile;
const readFileContent = async (filePath) => {
    return await fs_extra_1.default.readFile(filePath, 'utf8');
};
exports.readFileContent = readFileContent;
const fileExists = async (filePath) => {
    try {
        await fs_extra_1.default.access(filePath);
        return true;
    }
    catch {
        return false;
    }
};
exports.fileExists = fileExists;
const cleanupDirectory = async (dirPath) => {
    try {
        await fs_extra_1.default.remove(dirPath);
        exports.logger.debug(`Cleaned up directory: ${dirPath}`);
    }
    catch (error) {
        exports.logger.error(`Failed to cleanup directory ${dirPath}:`, error);
    }
};
exports.cleanupDirectory = cleanupDirectory;
const getFileSize = async (filePath) => {
    const stats = await fs_extra_1.default.stat(filePath);
    return stats.size;
};
exports.getFileSize = getFileSize;
const createInputFile = async (input, dirPath) => {
    const inputFile = path_1.default.join(dirPath, 'input.txt');
    await fs_extra_1.default.writeFile(inputFile, input, 'utf8');
    return inputFile;
};
exports.createInputFile = createInputFile;
const scanCodeForSecurity = (code, language) => {
    const issues = [];
    const config = (0, exports.getWorkerConfig)();
    if (!config.security.enableSecurityScan) {
        return { safe: true, issues: [] };
    }
    const lines = code.split('\n');
    lines.forEach((line, index) => {
        config.security.bannedKeywords.forEach(keyword => {
            if (line.includes(keyword)) {
                issues.push({
                    type: 'suspicious_pattern',
                    severity: 'high',
                    description: `Potentially dangerous keyword '${keyword}' found`,
                    line: index + 1,
                    column: line.indexOf(keyword) + 1
                });
            }
        });
    });
    switch (language) {
        case 'javascript':
            checkJavaScriptSecurity(code, issues);
            break;
        case 'python':
            checkPythonSecurity(code, issues);
            break;
        case 'java':
            checkJavaSecurity(code, issues);
            break;
        case 'cpp':
            checkCSecurity(code, issues);
            break;
    }
    const criticalIssues = issues.filter(issue => issue.severity === 'critical');
    const highIssues = issues.filter(issue => issue.severity === 'high');
    const safe = criticalIssues.length === 0 && highIssues.length < 3;
    return { safe, issues };
};
exports.scanCodeForSecurity = scanCodeForSecurity;
const checkJavaScriptSecurity = (code, issues) => {
    const dangerousPatterns = [
        /require\s*\(\s*['"]child_process['"]\s*\)/,
        /require\s*\(\s*['"]fs['"]\s*\)/,
        /require\s*\(\s*['"]net['"]\s*\)/,
        /require\s*\(\s*['"]http['"]\s*\)/,
        /require\s*\(\s*['"]https['"]\s*\)/,
        /import\s+.*\s+from\s+['"]child_process['"]/,
        /import\s+.*\s+from\s+['"]fs['"]/,
        /import\s+.*\s+from\s+['"]net['"]/,
        /process\.exit/,
        /process\.kill/,
        /global\./,
        /Function\s*\(/,
        /new\s+Function/,
        /eval\s*\(/,
        /setTimeout\s*\(\s*['"].*['"]\s*\)/,
        /setInterval\s*\(\s*['"].*['"]\s*\)/
    ];
    dangerousPatterns.forEach(pattern => {
        const matches = code.match(pattern);
        if (matches) {
            issues.push({
                type: 'malicious_import',
                severity: 'critical',
                description: `Dangerous JavaScript pattern detected: ${matches[0]}`
            });
        }
    });
};
const checkPythonSecurity = (code, issues) => {
    const dangerousPatterns = [
        /import\s+os/,
        /import\s+sys/,
        /import\s+subprocess/,
        /import\s+socket/,
        /from\s+os\s+import/,
        /from\s+sys\s+import/,
        /from\s+subprocess\s+import/,
        /from\s+socket\s+import/,
        /exec\s*\(/,
        /eval\s*\(/,
        /compile\s*\(/,
        /__import__\s*\(/,
        /open\s*\(/,
        /file\s*\(/,
        /input\s*\(/,
        /raw_input\s*\(/
    ];
    dangerousPatterns.forEach(pattern => {
        const matches = code.match(pattern);
        if (matches) {
            issues.push({
                type: 'malicious_import',
                severity: 'critical',
                description: `Dangerous Python pattern detected: ${matches[0]}`
            });
        }
    });
};
const checkJavaSecurity = (code, issues) => {
    const dangerousPatterns = [
        /import\s+java\.io\./,
        /import\s+java\.net\./,
        /import\s+java\.nio\./,
        /import\s+java\.lang\.Runtime/,
        /import\s+java\.lang\.Process/,
        /import\s+java\.lang\.ProcessBuilder/,
        /Runtime\.getRuntime\(\)/,
        /ProcessBuilder/,
        /Class\.forName/,
        /Method\.invoke/,
        /Field\.set/,
        /System\.exit/,
        /System\.gc/,
        /Thread\./,
        /Unsafe\./
    ];
    dangerousPatterns.forEach(pattern => {
        const matches = code.match(pattern);
        if (matches) {
            issues.push({
                type: 'malicious_import',
                severity: 'critical',
                description: `Dangerous Java pattern detected: ${matches[0]}`
            });
        }
    });
};
const checkCSecurity = (code, issues) => {
    const dangerousPatterns = [
        /#include\s*<sys\/socket\.h>/,
        /#include\s*<unistd\.h>/,
        /#include\s*<sys\/stat\.h>/,
        /#include\s*<dirent\.h>/,
        /system\s*\(/,
        /exec\s*\(/,
        /fork\s*\(/,
        /signal\s*\(/,
        /fopen\s*\(/,
        /fwrite\s*\(/,
        /fread\s*\(/,
        /malloc\s*\(/,
        /free\s*\(/,
        /gets\s*\(/,
        /strcpy\s*\(/,
        /strcat\s*\(/
    ];
    dangerousPatterns.forEach(pattern => {
        const matches = code.match(pattern);
        if (matches) {
            issues.push({
                type: 'malicious_import',
                severity: 'high',
                description: `Dangerous C/C++ pattern detected: ${matches[0]}`
            });
        }
    });
};
const parseMemoryLimit = (limit) => {
    const match = limit.match(/^(\d+)([kmg]?)$/i);
    if (!match) {
        throw new Error(`Invalid memory limit format: ${limit}`);
    }
    const value = parseInt(match[1]);
    const unit = match[2]?.toLowerCase() || '';
    switch (unit) {
        case 'k':
            return value * 1024;
        case 'm':
            return value * 1024 * 1024;
        case 'g':
            return value * 1024 * 1024 * 1024;
        default:
            return value;
    }
};
exports.parseMemoryLimit = parseMemoryLimit;
const formatMemorySize = (bytes) => {
    if (bytes >= 1024 * 1024 * 1024) {
        return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)}GB`;
    }
    else if (bytes >= 1024 * 1024) {
        return `${(bytes / (1024 * 1024)).toFixed(2)}MB`;
    }
    else if (bytes >= 1024) {
        return `${(bytes / 1024).toFixed(2)}KB`;
    }
    else {
        return `${bytes}B`;
    }
};
exports.formatMemorySize = formatMemorySize;
const formatExecutionTime = (ms) => {
    if (ms >= 1000) {
        return `${(ms / 1000).toFixed(2)}s`;
    }
    else {
        return `${ms}ms`;
    }
};
exports.formatExecutionTime = formatExecutionTime;
const sleep = (ms) => {
    return new Promise(resolve => setTimeout(resolve, ms));
};
exports.sleep = sleep;
const validateTimeout = (timeout) => {
    const config = (0, exports.getWorkerConfig)();
    return Math.min(Math.max(timeout, 1000), config.execution.maxTimeout);
};
exports.validateTimeout = validateTimeout;
const validateMemoryLimit = (limit) => {
    const config = (0, exports.getWorkerConfig)();
    const limitBytes = (0, exports.parseMemoryLimit)(limit);
    const maxLimitBytes = (0, exports.parseMemoryLimit)(config.execution.maxMemoryLimit);
    if (limitBytes > maxLimitBytes) {
        return config.execution.maxMemoryLimit;
    }
    return limit;
};
exports.validateMemoryLimit = validateMemoryLimit;
const generateExecutionId = () => {
    return `exec_${Date.now()}_${(0, uuid_1.v4)().split('-')[0]}`;
};
exports.generateExecutionId = generateExecutionId;
const isTimeoutError = (error) => {
    return error.message.includes('timeout') ||
        error.message.includes('ETIMEDOUT') ||
        error.message.includes('ESRCH');
};
exports.isTimeoutError = isTimeoutError;
const isMemoryError = (error) => {
    return error.message.includes('memory') ||
        error.message.includes('OOMKilled') ||
        error.message.includes('out of memory');
};
exports.isMemoryError = isMemoryError;
const sanitizeError = (error) => {
    return error
        .replace(/\/tmp\/[^\/\s]+/g, '[TEMP_DIR]')
        .replace(/\/home\/[^\/\s]+/g, '[HOME_DIR]')
        .replace(/\/var\/[^\/\s]+/g, '[VAR_DIR]')
        .replace(/file:\/\/[^\s]+/g, '[FILE_URI]')
        .replace(/http:\/\/[^\s]+/g, '[HTTP_URI]')
        .replace(/https:\/\/[^\s]+/g, '[HTTPS_URI]')
        .replace(/\b(?:\d{1,3}\.){3}\d{1,3}\b/g, '[IP_ADDRESS]')
        .replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, '[EMAIL]');
};
exports.sanitizeError = sanitizeError;
//# sourceMappingURL=index.js.map