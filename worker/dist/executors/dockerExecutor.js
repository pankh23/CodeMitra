"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DockerExecutor = void 0;
const dockerode_1 = __importDefault(require("dockerode"));
const path_1 = __importDefault(require("path"));
const utils_1 = require("@/utils");
const languages_1 = require("@/languages");
class DockerExecutor {
    constructor() {
        this.config = (0, utils_1.getWorkerConfig)();
        this.docker = new dockerode_1.default({
            socketPath: this.config.docker.socketPath,
            host: this.config.docker.host,
            port: this.config.docker.port,
            timeout: this.config.docker.timeout
        });
        this.runningContainers = new Map();
        process.on('SIGINT', () => this.cleanup());
        process.on('SIGTERM', () => this.cleanup());
    }
    async executeCode(request) {
        const startTime = Date.now();
        let tempDir = null;
        let containerId = null;
        try {
            const language = (0, languages_1.getLanguageById)(request.language);
            if (!language) {
                throw new Error(`Unsupported language: ${request.language}`);
            }
            const timeout = (0, utils_1.validateTimeout)(request.timeout || language.timeout);
            const memoryLimit = (0, utils_1.validateMemoryLimit)(request.memoryLimit || language.memoryLimit);
            tempDir = await (0, utils_1.createTempDirectory)();
            utils_1.logger.info(`Created temp directory: ${tempDir}`);
            const className = (0, languages_1.extractClassName)(request.code, request.language);
            const fileName = (0, languages_1.getFileName)(request.language, className);
            const codeFile = path_1.default.join(tempDir, fileName);
            await (0, utils_1.writeCodeToFile)(request.code, codeFile);
            let inputFile = null;
            if (request.input) {
                inputFile = await (0, utils_1.createInputFile)(request.input, tempDir);
            }
            let compilationResult = null;
            if (language.compileCommand) {
                compilationResult = await this.compileCode(language, tempDir, fileName, timeout);
                if (!compilationResult.success) {
                    return {
                        executionId: request.executionId,
                        status: 'compilation_error',
                        error: compilationResult.error || 'Compilation failed',
                        compilationOutput: compilationResult.output,
                        executionTime: Date.now() - startTime
                    };
                }
            }
            const executionResult = await this.runCode(language, tempDir, fileName, inputFile, timeout, memoryLimit);
            let status;
            if (executionResult.timedOut) {
                status = 'timeout';
            }
            else if (executionResult.exitCode === 0) {
                status = 'completed';
            }
            else {
                const stderr = executionResult.stderr.toLowerCase();
                let isSyntaxError = false;
                if (language.id === 'python') {
                    isSyntaxError = stderr.includes('syntaxerror') ||
                        stderr.includes('syntax error') ||
                        stderr.includes('invalid syntax') ||
                        stderr.includes('parsing error');
                    const runtimeErrors = ['indexerror', 'nameerror', 'typeerror', 'valueerror', 'keyerror', 'attributeerror'];
                    if (stderr.includes('traceback') && runtimeErrors.some(err => stderr.includes(err))) {
                        isSyntaxError = false;
                    }
                }
                else if (language.id === 'javascript') {
                    isSyntaxError = stderr.includes('syntaxerror') ||
                        stderr.includes('syntax error') ||
                        stderr.includes('unexpected token') ||
                        stderr.includes('parsing error');
                }
                status = isSyntaxError ? 'compilation_error' : 'failed';
            }
            const result = {
                executionId: request.executionId,
                status,
                stdout: executionResult.stdout,
                stderr: executionResult.stderr,
                output: executionResult.stdout,
                error: (status === 'completed') ? undefined : (executionResult.stderr || undefined),
                exitCode: executionResult.exitCode,
                executionTime: Date.now() - startTime,
                memoryUsed: executionResult.memoryUsed,
                compilationOutput: compilationResult?.output
            };
            if ((0, utils_1.isMemoryError)(new Error(executionResult.stderr))) {
                result.status = 'memory_limit_exceeded';
            }
            utils_1.logger.info(`Execution completed: ${request.executionId}, Status: ${result.status}, Time: ${(0, utils_1.formatExecutionTime)(result.executionTime)}`);
            return result;
        }
        catch (error) {
            utils_1.logger.error(`Execution failed: ${request.executionId}`, error);
            const errorMessage = error instanceof Error ? error.message : String(error);
            const status = (0, utils_1.isTimeoutError)(error) ? 'timeout' :
                (0, utils_1.isMemoryError)(error) ? 'memory_limit_exceeded' : 'failed';
            return {
                executionId: request.executionId,
                status,
                error: (0, utils_1.sanitizeError)(errorMessage),
                executionTime: Date.now() - startTime
            };
        }
        finally {
            if (containerId) {
                await this.cleanupContainer(containerId);
            }
            if (tempDir) {
                await (0, utils_1.cleanupDirectory)(tempDir);
            }
        }
    }
    async compileCode(language, workDir, fileName, timeout) {
        const startTime = Date.now();
        try {
            const options = {
                image: language.dockerImage,
                command: language.compileCommand.split(' '),
                workingDir: '/workspace',
                timeout,
                memoryLimit: '512m',
                networkMode: 'none',
                readOnly: false,
                volumes: {
                    [workDir]: '/workspace'
                }
            };
            const result = await this.executeInDocker(options);
            const cleanOutput = (text) => {
                return text.replace(/\0/g, '')
                    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
                    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g, '')
                    .trim();
            };
            return {
                success: result.exitCode === 0,
                output: cleanOutput(result.stdout),
                error: result.stderr ? cleanOutput(result.stderr) : undefined,
                compilationTime: Date.now() - startTime
            };
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : String(error),
                compilationTime: Date.now() - startTime
            };
        }
    }
    async runCode(language, workDir, fileName, inputFile, timeout, memoryLimit) {
        const command = language.runCommand.split(' ');
        if (inputFile) {
            command.push('<', 'input.txt');
        }
        const options = {
            image: language.dockerImage,
            command,
            workingDir: '/workspace',
            timeout,
            memoryLimit,
            networkMode: 'none',
            readOnly: false,
            volumes: {
                [workDir]: '/workspace'
            }
        };
        return await this.executeInDocker(options);
    }
    async executeInDocker(options) {
        const startTime = Date.now();
        let container = null;
        let stream = null;
        let timeoutId = null;
        try {
            await this.ensureImage(options.image);
            const containerOptions = {
                Image: options.image,
                Cmd: options.command,
                WorkingDir: options.workingDir,
                NetworkMode: options.networkMode || 'none',
                AttachStdout: true,
                AttachStderr: true,
                AttachStdin: true,
                OpenStdin: true,
                StdinOnce: true,
                Tty: false,
                HostConfig: {
                    Memory: this.parseMemoryLimit(options.memoryLimit),
                    MemorySwap: this.parseMemoryLimit(options.memoryLimit),
                    CpuPeriod: 100000,
                    CpuQuota: 50000,
                    NetworkMode: options.networkMode || 'none',
                    ReadonlyRootfs: options.readOnly || false,
                    SecurityOpt: ['no-new-privileges'],
                    CapDrop: ['ALL'],
                    CapAdd: ['SETUID', 'SETGID'],
                    PidsLimit: 64,
                    Ulimits: [
                        {
                            Name: 'nofile',
                            Soft: 1024,
                            Hard: 1024
                        },
                        {
                            Name: 'nproc',
                            Soft: 32,
                            Hard: 32
                        }
                    ]
                }
            };
            if (options.volumes) {
                const volumeMode = options.readOnly ? 'ro' : 'rw';
                containerOptions.HostConfig.Binds = Object.entries(options.volumes).map(([host, container]) => `${host}:${container}:${volumeMode}`);
            }
            if (options.environment) {
                containerOptions.Env = Object.entries(options.environment).map(([key, value]) => `${key}=${value}`);
            }
            container = await this.docker.createContainer(containerOptions);
            const containerId = container.id;
            this.runningContainers.set(containerId, container);
            await container.start();
            const timeoutPromise = new Promise((_, reject) => {
                timeoutId = setTimeout(() => {
                    reject(new Error(`Execution timed out after ${options.timeout}ms`));
                }, options.timeout);
            });
            stream = await container.attach({
                stream: true,
                stdout: true,
                stderr: true,
                stdin: true
            });
            let stdout = '';
            let stderr = '';
            const outputPromise = new Promise((resolve, reject) => {
                if (!stream) {
                    reject(new Error('Stream not available'));
                    return;
                }
                stream.on('data', (chunk) => {
                    const data = chunk.toString();
                    if (chunk[0] === 1) {
                        stdout += data.slice(8);
                    }
                    else if (chunk[0] === 2) {
                        stderr += data.slice(8);
                    }
                });
                stream.on('end', resolve);
                stream.on('error', reject);
            });
            const containerPromise = container.wait();
            await Promise.race([
                Promise.all([containerPromise, outputPromise]),
                timeoutPromise
            ]);
            const stats = await container.stats({ stream: false });
            const memoryUsed = stats.memory_stats?.usage || 0;
            const containerInfo = await container.inspect();
            const exitCode = containerInfo.State.ExitCode || 0;
            const executionTime = Date.now() - startTime;
            const cleanOutput = (text) => {
                return text.replace(/\0/g, '')
                    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
                    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g, '')
                    .trim();
            };
            return {
                stdout: cleanOutput(stdout),
                stderr: cleanOutput(stderr),
                exitCode,
                executionTime,
                memoryUsed,
                timedOut: false,
                killed: false
            };
        }
        catch (error) {
            const executionTime = Date.now() - startTime;
            const isTimeout = error instanceof Error && error.message.includes('timeout');
            if (isTimeout && container) {
                try {
                    await container.kill();
                }
                catch (killError) {
                    utils_1.logger.error('Failed to kill container:', killError);
                }
            }
            return {
                stdout: '',
                stderr: error instanceof Error ? error.message : String(error),
                exitCode: isTimeout ? 124 : 1,
                executionTime,
                memoryUsed: 0,
                timedOut: isTimeout,
                killed: isTimeout
            };
        }
        finally {
            if (timeoutId) {
                clearTimeout(timeoutId);
            }
            if (stream) {
                if (typeof stream.destroy === 'function') {
                    stream.destroy();
                }
                else if (typeof stream.end === 'function') {
                    stream.end();
                }
            }
            if (container) {
                await this.cleanupContainer(container.id);
            }
        }
    }
    async ensureImage(imageName) {
        try {
            await this.docker.getImage(imageName).inspect();
        }
        catch (error) {
            utils_1.logger.info(`Pulling image: ${imageName}`);
            await new Promise((resolve, reject) => {
                this.docker.pull(imageName, (err, stream) => {
                    if (err) {
                        reject(err);
                        return;
                    }
                    this.docker.modem.followProgress(stream, (err) => {
                        if (err) {
                            reject(err);
                        }
                        else {
                            resolve();
                        }
                    });
                });
            });
        }
    }
    parseMemoryLimit(limit) {
        const match = limit.match(/^(\d+)([kmg]?)$/i);
        if (!match) {
            return 268435456;
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
    }
    async cleanupContainer(containerId) {
        try {
            const container = this.runningContainers.get(containerId);
            if (container) {
                try {
                    await container.stop({ t: 5 });
                }
                catch (error) {
                }
                try {
                    await container.remove({ force: true });
                }
                catch (error) {
                    utils_1.logger.error(`Failed to remove container ${containerId}:`, error);
                }
                this.runningContainers.delete(containerId);
            }
        }
        catch (error) {
            utils_1.logger.error(`Failed to cleanup container ${containerId}:`, error);
        }
    }
    async cleanup() {
        utils_1.logger.info('Cleaning up running containers...');
        const cleanupPromises = Array.from(this.runningContainers.keys()).map(containerId => this.cleanupContainer(containerId));
        await Promise.all(cleanupPromises);
        utils_1.logger.info('Container cleanup completed');
    }
    async getDockerInfo() {
        try {
            return await this.docker.info();
        }
        catch (error) {
            utils_1.logger.error('Failed to get Docker info:', error);
            throw error;
        }
    }
    async getRunningContainers() {
        try {
            return await this.docker.listContainers({ all: false });
        }
        catch (error) {
            utils_1.logger.error('Failed to get running containers:', error);
            throw error;
        }
    }
    async getImages() {
        try {
            return await this.docker.listImages();
        }
        catch (error) {
            utils_1.logger.error('Failed to get images:', error);
            throw error;
        }
    }
    async pruneContainers() {
        try {
            await this.docker.pruneContainers();
            utils_1.logger.info('Pruned unused containers');
        }
        catch (error) {
            utils_1.logger.error('Failed to prune containers:', error);
        }
    }
    async pruneImages() {
        try {
            await this.docker.pruneImages();
            utils_1.logger.info('Pruned unused images');
        }
        catch (error) {
            utils_1.logger.error('Failed to prune images:', error);
        }
    }
}
exports.DockerExecutor = DockerExecutor;
//# sourceMappingURL=dockerExecutor.js.map