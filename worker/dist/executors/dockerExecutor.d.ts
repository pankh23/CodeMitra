import Docker from 'dockerode';
import { ExecutionRequest, ExecutionResult } from '@/types';
export declare class DockerExecutor {
    private docker;
    private config;
    private runningContainers;
    constructor();
    executeCode(request: ExecutionRequest): Promise<ExecutionResult>;
    private compileCode;
    private runCode;
    private executeInDocker;
    private ensureImage;
    private parseMemoryLimit;
    private cleanupContainer;
    private cleanup;
    getDockerInfo(): Promise<any>;
    getRunningContainers(): Promise<Docker.ContainerInfo[]>;
    getImages(): Promise<Docker.ImageInfo[]>;
    pruneContainers(): Promise<void>;
    pruneImages(): Promise<void>;
}
//# sourceMappingURL=dockerExecutor.d.ts.map