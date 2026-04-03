import type { Handler } from 'hono';
import { v7 } from 'uuid';
import _Config from '../config/config.js';
import redis from '../config/redis.js';

// userverify controller
const userverifyController: Handler = async (c) => {
    const version = (c.req.param("version") as string).toLowerCase();
    const ipAddress = '127.0.0.1';
    const idx = v7();

    // Validate controller version
    if (version === 'v1') {
        try {
            const exist = await redis.exists(`user:access:token:${ipAddress}`);
            if (exist) {
                const r = await redis.get(`user:access:token:${ipAddress}`);
                return c.json({
                    success: true,
                    accesstoken: (r as any).uatkn,
                    message: "access token generated",
                    timestamp: new Date().toISOString()
                }, 200);
            }
            else {
                await redis.set(
                    `user:access:token:${ipAddress}`, 
                    { uatkn: idx, iat: Date.now(), exp: Date.now() + 1800 }, 
                    { ex: 1800, nx: true } 
                );

                // Response
                return c.json({
                    success: true,
                    accesstoken: idx,
                    message: "access token generated",
                    timestamp: new Date().toISOString()
                }, 200);
            }

        } catch (error) {
            return c.json({
                success: false,
                accesstoken: null,
                message: "internal server error, please try sometime leter",
                timestamp: new Date().toISOString()
            }, 500);
        }
    } else {
        return c.json({
            success: false,
            accesstoken: null,
            message: `resources with version: ${version} not exist`,
            timestamp: new Date().toISOString()
        }, 404);
    }
}

// Export
export default userverifyController;