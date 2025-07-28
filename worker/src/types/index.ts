export interface ExecutionRequest {
  executionId: string;
  code: string;
  language: string;
  input?: string;
  roomId: string;
  userId: string;
  timeout?: number;
  memoryLimit?: string;
}

export interface ExecutionResult {
  executionId: string;
  output?: string;
  error?: string;
  exitCode?: number;
  executionTime: number;
  memoryUsed?: number;
  status: 'completed' | 'failed' | 'timeout' | 'memory_limit_exceeded' | 'compilation_error';
  compilationOutput?: string;
  stderr?: string;
  stdout?: string;
}

export interface Language {
  id: string;
  name: string;
  version: string;
  extension: string;
  dockerImage: string;
  compileCommand?: string;
  runCommand: string;
  timeout: number;
  memoryLimit: string;
  allowedPackages?: string[];
  bannedImports?: string[];
}

export interface DockerExecutionOptions {
  image: string;
  command: string[];
  workingDir: string;
  timeout: number;
  memoryLimit: string;
  cpuLimit?: string;
  networkMode?: string;
  readOnly?: boolean;
  volumes?: { [key: string]: string };
  environment?: { [key: string]: string };
}

export interface DockerExecutionResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  executionTime: number;
  memoryUsed?: number;
  timedOut: boolean;
  killed: boolean;
}

export interface CompilationResult {
  success: boolean;
  output?: string;
  error?: string;
  executablePath?: string;
  compilationTime: number;
}

export interface FormatRequest {
  code: string;
  language: string;
  roomId: string;
  userId: string;
}

export interface FormatResult {
  formatted: boolean;
  code?: string;
  error?: string;
}

export interface SecurityScanResult {
  safe: boolean;
  issues: SecurityIssue[];
}

export interface SecurityIssue {
  type: 'malicious_import' | 'system_call' | 'file_access' | 'network_access' | 'suspicious_pattern';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  line?: number;
  column?: number;
}

export interface ResourceUsage {
  cpuUsage: number;
  memoryUsage: number;
  diskUsage: number;
  networkUsage: number;
}

export interface ExecutionStats {
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  averageExecutionTime: number;
  languageStats: { [key: string]: number };
  resourceUsage: ResourceUsage;
}

export interface WorkerConfig {
  redis: {
    host: string;
    port: number;
    password?: string;
    db?: number;
  };
  docker: {
    socketPath?: string;
    host?: string;
    port?: number;
    timeout: number;
    maxConcurrentExecutions: number;
    imageRetentionTime: number;
  };
  execution: {
    defaultTimeout: number;
    maxTimeout: number;
    defaultMemoryLimit: string;
    maxMemoryLimit: string;
    tempDir: string;
    cleanupInterval: number;
  };
  security: {
    enableSandbox: boolean;
    enableSecurityScan: boolean;
    allowedHosts: string[];
    bannedKeywords: string[];
  };
  logging: {
    level: string;
    format: string;
    file?: string;
  };
}

export interface JobData {
  type: 'execute-code' | 'format-code' | 'compile-code' | 'security-scan';
  payload: any;
}

export interface JobResult {
  success: boolean;
  data?: any;
  error?: string;
  metadata?: {
    executionTime: number;
    memoryUsed?: number;
    resourceUsage?: ResourceUsage;
  };
}
