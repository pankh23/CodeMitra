"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.redisClient = void 0;
const ioredis_1 = __importDefault(require("ioredis"));
const REDIS_URL = process.env.REDIS_URL || 'redis://codemitra-redis:6379';
console.log('Redis URL:', REDIS_URL.replace(/:\/\/([^:@]+:[^:@]+)@/, '://***:***@'));
exports.redisClient = new ioredis_1.default(REDIS_URL, {
    enableReadyCheck: false,
    maxRetriesPerRequest: null,
    lazyConnect: true,
    enableOfflineQueue: false,
    connectTimeout: 10000,
    commandTimeout: 5000,
});
exports.redisClient.on('error', (err) => {
    console.error('Redis Client Error:', err);
});
exports.redisClient.on('connect', () => {
    console.log('Redis Client Connected');
});
exports.redisClient.on('ready', () => {
    console.log('Redis Client Ready');
});
exports.redisClient.on('end', () => {
    console.log('Redis Client Disconnected');
});
exports.default = exports.redisClient;
//# sourceMappingURL=redis.js.map