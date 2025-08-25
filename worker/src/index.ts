import { Worker } from 'bullmq';
import Redis from 'ioredis';
import { DockerExecutor } from './executors/dockerExecutor';
import dotenv from 'dotenv';
import * as http from 'http';

// Load environment variables
dotenv.config();

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
console.log('Worker Redis URL:', REDIS_URL.replace(/:\/\/([^:@]+:[^:@]+)@/, '://***:***@')); // Hide auth in logs

// Parse Redis URL for connection options
const redisUrl = new URL(REDIS_URL);
const redisConfig = {
  host: redisUrl.hostname,
  port: parseInt(redisUrl.port) || 6379,
  maxRetriesPerRequest: null,
};

console.log('Redis Config:', { host: redisConfig.host, port: redisConfig.port });

// Create Docker executor instance
const dockerExecutor = new DockerExecutor();

// Create Redis client for storing results
const resultRedis = new Redis(REDIS_URL, {
  maxRetriesPerRequest: null,
});

// Test Redis connection on startup
resultRedis.ping().then(() => {
  console.log('✅ Redis connection successful for result storage');
}).catch(err => {
  console.error('❌ Redis connection failed for result storage:', err);
});

// Create BullMQ worker with simple Redis connection
const worker = new Worker(
  'code-execution',
  async (job: any) => {
    console.log(`Processing job ${job.id}:`, job.data);
    
    try {
      const { language, code, input, executionId, timeout, memoryLimit } = job.data;
      
      // Execute code using Docker
      const result = await dockerExecutor.executeCode({
        executionId: executionId || job.id?.toString() || 'unknown',
        language,
        code,
        input,
        timeout,
        memoryLimit,
        // The ExecutionRequest interface requires these but they're not used in execution
        roomId: '',
        userId: ''
      });
      
      console.log(`🎯 EXECUTOR COMPLETED - Job ${job.id} finished execution`);
      console.log(`Job ${job.id} completed successfully`);
      console.log(`🔍 Worker result:`, JSON.stringify(result, null, 2));
      
      // Store result in Redis with executionId as key BEFORE returning
      console.log(`📝 About to store result in Redis...`);
      try {
        const resultKey = `execution-result:${result.executionId}`;
        console.log(`🔑 Using Redis key: ${resultKey}`);
        await resultRedis.set(resultKey, JSON.stringify(result), 'EX', 300); // Expire in 5 minutes
        console.log(`✅ Stored result in Redis with key: ${resultKey}`);
      } catch (redisError) {
        console.error(`❌ Failed to store result in Redis:`, redisError);
      }
      console.log(`📤 About to return result...`);
      
      return result;
    } catch (error) {
      console.error(`Job ${job.id} failed:`, error);
      throw error;
    }
  },
  {
    connection: redisConfig,
    concurrency: 5,
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 100 },
  }
);

// Worker event listeners
worker.on('completed', (job: any) => {
  console.log(`Job ${job.id} has completed`);
});

worker.on('failed', (job: any, err: any) => {
  console.error(`Job ${job?.id} has failed with error:`, err);
});

worker.on('error', (err: any) => {
  console.error('Worker error:', err);
});

// Health check endpoint
const healthServer = http.createServer((req: http.IncomingMessage, res: http.ServerResponse) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('OK');
  } else {
    res.writeHead(404);
    res.end();
  }
});

const PORT = process.env.WORKER_PORT || 8080;
healthServer.listen(PORT, () => {
  console.log(`Worker health check listening on port ${PORT}`);
});

// Graceful shutdown
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

// Start the worker
async function start() {
  console.log('Starting worker service...');
  console.log('Worker is ready to process jobs');
}

start().catch((error) => {
  console.error('Failed to start worker:', error);
  process.exit(1);
});
