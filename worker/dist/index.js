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
const bullmq_1 = require("bullmq");
const ioredis_1 = __importDefault(require("ioredis"));
const dockerExecutor_1 = require("./executors/dockerExecutor");
const dotenv_1 = __importDefault(require("dotenv"));
const http = __importStar(require("http"));
dotenv_1.default.config();
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
console.log('Worker Redis URL:', REDIS_URL.replace(/:\/\/([^:@]+:[^:@]+)@/, '://***:***@'));
const redisUrl = new URL(REDIS_URL);
const redisConfig = {
    host: redisUrl.hostname,
    port: parseInt(redisUrl.port) || 6379,
    maxRetriesPerRequest: null,
};
console.log('Redis Config:', { host: redisConfig.host, port: redisConfig.port });
const dockerExecutor = new dockerExecutor_1.DockerExecutor();
const resultRedis = new ioredis_1.default(REDIS_URL, {
    maxRetriesPerRequest: null,
});
resultRedis.ping().then(() => {
    console.log('✅ Redis connection successful for result storage');
}).catch(err => {
    console.error('❌ Redis connection failed for result storage:', err);
});
const worker = new bullmq_1.Worker('code-execution', async (job) => {
    console.log(`Processing job ${job.id}:`, job.data);
    try {
        const { language, code, input, executionId, timeout, memoryLimit } = job.data;
        const result = await dockerExecutor.executeCode({
            executionId: executionId || job.id?.toString() || 'unknown',
            language,
            code,
            input,
            timeout,
            memoryLimit,
            roomId: '',
            userId: ''
        });
        console.log(`🎯 EXECUTOR COMPLETED - Job ${job.id} finished execution`);
        console.log(`Job ${job.id} completed successfully`);
        console.log(`🔍 Worker result:`, JSON.stringify(result, null, 2));
        console.log(`📝 About to store result in Redis...`);
        try {
            const resultKey = `execution-result:${result.executionId}`;
            console.log(`🔑 Using Redis key: ${resultKey}`);
            await resultRedis.set(resultKey, JSON.stringify(result), 'EX', 300);
            console.log(`✅ Stored result in Redis with key: ${resultKey}`);
        }
        catch (redisError) {
            console.error(`❌ Failed to store result in Redis:`, redisError);
        }
        console.log(`📤 About to return result...`);
        return result;
    }
    catch (error) {
        console.error(`Job ${job.id} failed:`, error);
        throw error;
    }
}, {
    connection: redisConfig,
    concurrency: 5,
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 100 },
});
worker.on('completed', (job) => {
    console.log(`Job ${job.id} has completed`);
});
worker.on('failed', (job, err) => {
    console.error(`Job ${job?.id} has failed with error:`, err);
});
worker.on('error', (err) => {
    console.error('Worker error:', err);
});
const healthServer = http.createServer((req, res) => {
    if (req.url === '/health') {
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end('OK');
    }
    else {
        res.writeHead(404);
        res.end();
    }
});
const PORT = process.env.WORKER_PORT || 8080;
healthServer.listen(PORT, () => {
    console.log(`Worker health check listening on port ${PORT}`);
});
process.on('SIGTERM', async () => {
    console.log('SIGTERM signal received: closing worker');
    await worker.close();
    healthServer.close();
    process.exit(0);
});
process.on('SIGINT', async () => {
    console.log('SIGINT signal received: closing worker');
    await worker.close();
    healthServer.close();
    process.exit(0);
});
async function start() {
    console.log('Starting worker service...');
    console.log('Worker is ready to process jobs');
}
start().catch((error) => {
    console.error('Failed to start worker:', error);
    process.exit(1);
});
//# sourceMappingURL=index.js.map