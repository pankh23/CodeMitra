"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DockerExecutor = void 0;
const dockerode_1 = __importDefault(require("dockerode"));
class DockerExecutor {
    constructor() {
        this.docker = new dockerode_1.default({
            socketPath: '/var/run/docker.sock'
        });
    }
    async executeCode(request) {
        const startTime = Date.now();
        try {
            console.log(`Executing code for language: ${request.language}`);
            const config = this.getLanguageConfig(request.language);
            if (!config) {
                throw new Error(`Unsupported language: ${request.language}`);
            }
            const container = await this.docker.createContainer({
                Image: config.dockerImage,
                Cmd: config.command,
                AttachStdout: true,
                AttachStderr: true,
                AttachStdin: true,
                OpenStdin: true,
                StdinOnce: false,
                Tty: false,
                WorkingDir: '/workspace',
                HostConfig: {
                    Memory: request.memoryLimit || config.memoryLimit,
                    MemorySwap: request.memoryLimit || config.memoryLimit,
                    NetworkMode: 'none',
                    ReadonlyRootfs: true,
                    SecurityOpt: ['no-new-privileges'],
                    CapDrop: ['ALL'],
                    Binds: [`${process.cwd()}/temp:/workspace:rw`]
                }
            });
            await container.start();
            const codeBuffer = Buffer.from(request.code);
            const inputBuffer = Buffer.from(request.input || '');
            const exec = await container.exec({
                Cmd: config.command,
                AttachStdout: true,
                AttachStderr: true,
                AttachStdin: true,
                WorkingDir: '/workspace'
            });
            const stream = await exec.start({
                stdin: true,
                hijack: true
            });
            stream.write(codeBuffer);
            if (inputBuffer.length > 0) {
                stream.write(inputBuffer);
            }
            stream.end();
            let stdout = '';
            let stderr = '';
            stream.on('data', (chunk) => {
                const data = chunk.toString();
                if (data.includes('stdout')) {
                    stdout += data.replace('stdout', '').trim();
                }
                else if (data.includes('stderr')) {
                    stderr += data.replace('stderr', '').trim();
                }
            });
            const result = await new Promise((resolve, reject) => {
                stream.on('end', () => {
                    exec.inspect().then(inspect => {
                        resolve({ exitCode: inspect.ExitCode || 0 });
                    });
                });
                stream.on('error', reject);
                setTimeout(() => {
                    reject(new Error('Execution timeout'));
                }, request.timeout || config.timeout);
            });
            await container.stop();
            await container.remove();
            const executionTime = Date.now() - startTime;
            if (result.exitCode === 0) {
                return {
                    executionId: request.executionId,
                    status: 'completed',
                    stdout,
                    stderr,
                    output: stdout,
                    exitCode: result.exitCode,
                    executionTime,
                    memoryUsed: 0
                };
            }
            else {
                return {
                    executionId: request.executionId,
                    status: 'runtime_error',
                    stdout,
                    stderr,
                    output: stderr || 'Runtime error occurred',
                    exitCode: result.exitCode,
                    executionTime,
                    memoryUsed: 0,
                    error: stderr || 'Runtime error'
                };
            }
        }
        catch (error) {
            console.error(`Execution failed:`, error);
            return {
                executionId: request.executionId,
                status: 'failed',
                stdout: '',
                stderr: '',
                output: '',
                exitCode: -1,
                executionTime: Date.now() - startTime,
                memoryUsed: 0,
                error: error.message || 'Execution failed'
            };
        }
    }
    getLanguageConfig(language) {
        const configs = {
            javascript: {
                dockerImage: 'node:18-alpine',
                command: ['node', '-e'],
                timeout: 10000,
                memoryLimit: 128 * 1024 * 1024
            },
            python: {
                dockerImage: 'python:3.11-alpine',
                command: ['python3', '-c'],
                timeout: 10000,
                memoryLimit: 256 * 1024 * 1024
            },
            java: {
                dockerImage: 'openjdk:17-alpine',
                command: ['java', '-cp', '.', 'Main'],
                timeout: 20000,
                memoryLimit: 512 * 1024 * 1024
            },
            cpp: {
                dockerImage: 'gcc:alpine',
                command: ['./a.out'],
                timeout: 15000,
                memoryLimit: 256 * 1024 * 1024
            }
        };
        return configs[language];
    }
}
exports.DockerExecutor = DockerExecutor;
//# sourceMappingURL=simpleDockerExecutor.js.map