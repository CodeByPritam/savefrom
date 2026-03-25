import type { Handler } from 'hono';
import _Config from '../config/config.js';
import { jwt } from 'hono/jwt';
import redis from '../config/redis.js';

// Download controller
const downloadController: Handler = async (c) => {
    return c.json({
        msg: 'Hello, from download controller'
    }, 200);
}

// Export
export default downloadController;