import { Redis } from '@upstash/redis';
import _Config from './config.js';

// Establish connection
const redis = new Redis({
    url: _Config.redis.url,
    token: _Config.redis.token
});

// Export
export default redis;