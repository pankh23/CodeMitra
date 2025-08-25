interface ExecutionRequest {
    executionId: string;
    language: string;
    code: string;
    input?: string;
    timeout?: number;
    memoryLimit?: number;
}
interface ExecutionResult {
    executionId: string;
    status: 'completed' | 'failed' | 'timeout' | 'compilation_error' | 'runtime_error';
    stdout: string;
    stderr: string;
    output: string;
    exitCode: number;
    executionTime: number;
    memoryUsed: number;
    compilationTime?: number;
    error?: string;
}
export declare class DockerExecutor {
    private docker;
    constructor();
    executeCode(request: ExecutionRequest): Promise<ExecutionResult>;
    private getLanguageConfig;
}
export {};
//# sourceMappingURL=simpleDockerExecutor.d.ts.map