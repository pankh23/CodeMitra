import { Worker } from 'bullmq';
import Redis from 'ioredis';
import { DockerExecutor } from './executors/simpleDockerExecutor';
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

// Create BullMQ worker with simple Redis connection
const worker = new Worker(
  'code-execution',
  async (job) => {
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
        memoryLimit
      });
      
      console.log(`Job ${job.id} completed successfully`);
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
worker.on('completed', (job) => {
  console.log(`Job ${job.id} has completed`);
});

worker.on('failed', (job, err) => {
  console.error(`Job ${job?.id} has failed with error:`, err);
});

worker.on('error', (err) => {
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
