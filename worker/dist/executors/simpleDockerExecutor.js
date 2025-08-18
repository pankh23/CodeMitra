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
            return {
                executionId: request.executionId,
                status: 'completed',
                stdout: 'Hello from worker!',
                stderr: '',
                output: 'Hello from worker!',
                exitCode: 0,
                executionTime: Date.now() - startTime,
                memoryUsed: 0
            };
        }
        catch (error) {
            console.error(`Execution failed:`, error);
            return {
                executionId: request.executionId,
                status: 'failed',
                error: error instanceof Error ? error.message : String(error),
                executionTime: Date.now() - startTime
            };
        }
    }
}
exports.DockerExecutor = DockerExecutor;
//# sourceMappingURL=simpleDockerExecutor.js.map