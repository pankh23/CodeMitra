import Redis from 'ioredis';

// Debug Redis URL configuration for Docker environment
const REDIS_URL = process.env.REDIS_URL || 'redis://codemitra-redis:6379';
console.log('Redis URL:', REDIS_URL.replace(/:\/\/([^:@]+:[^:@]+)@/, '://***:***@')); // Hide auth in logs

export const redisClient = new Redis(REDIS_URL, {
  enableReadyCheck: false,
  maxRetriesPerRequest: null,
  lazyConnect: true,
  enableOfflineQueue: false,
  connectTimeout: 10000,
  commandTimeout: 5000,
});

redisClient.on('error', (err) => {
  console.error('Redis Client Error:', err);
});

redisClient.on('connect', () => {
  console.log('Redis Client Connected');
});

redisClient.on('ready', () => {
  console.log('Redis Client Ready');
});

redisClient.on('end', () => {
  console.log('Redis Client Disconnected');
});

export default redisClient;
