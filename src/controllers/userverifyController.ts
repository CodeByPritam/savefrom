import type { Handler } from 'hono';
import { v7 } from 'uuid';
import _Config from '../config/config.js';
import redis from '../config/redis.js';

// userverify controller
const userverifyController: Handler = async (c) => {
    return c.json({
        msg: 'Hello, from userverify controller'
    }, 200);
}

// Export
export default userverifyController;