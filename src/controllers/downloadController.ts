import type { Context, Handler } from 'hono';
import _Config from '../config/config.js';
import redis from '../config/redis.js';
import { dissectIgUrl } from '../utils/igUtils.js';
import { rpCaller } from '../service/instagram.js';

// Download controller
const downloadController: Handler = async (c: Context) => {
    const version = (c.req.param("version") as string).toLowerCase();
    const platform = (c.req.param("platform") as string).toLowerCase();
    const ipAddress = '127.0.0.1';
    const { accesstoken, fp, url } = await c.req.json();

    // Validate controller version
    if (version === 'v1') {

        // Check platform
        if (!_Config.authorizedPlatforms.includes(platform)) {
            return c.json({ 
                success: false,
                data: [],
                message: `invalid: ${platform} platform selected`,
                timestamp: new Date().toISOString()
            }, 404);
        }

        // Check accesstoken, fp, url
        const missing = [!accesstoken && "accesstoken", !fp && "fp", !url && "url"].filter(Boolean);
        if (missing.length) {
            return c.json({
                success: false,
                data: [],
                message: `${missing.join(" & ")} is required`,
                timestamp: new Date().toISOString()
            }, 400);
        }

        // Validate :: Accesstoken
        const exist = await redis.get(`user:access:token:${ipAddress}`);
        if (exist === null) {
            return c.json({
                success: false,
                data: [],
                message: `token might expire or not exist`,
                timestamp: new Date().toISOString()
            }, 404)
        }

        // Instagram: Rest of logic
        if (platform === 'instagram') {
            const refinedUrl = url.split("?")[0].trim();
            const dIgUrl = dissectIgUrl(refinedUrl);
            const shortcode = (dIgUrl as any).shortcode;

            // Define types
            let type;
            if ((dIgUrl as any).isPost) { type = 'post' }
            if ((dIgUrl as any).isReel) { type = 'reels' }
            if ((dIgUrl as any).isProfile) { type = 'profile' }

            // Cases
            if ((dIgUrl as any).isPost || (dIgUrl as any).isReel) { return await rpCaller(c, refinedUrl, shortcode, type as string); }
        }

        // else case
        else {
            return c.json({
                success: false,
                data: [],
                message: "service not implemented, yet",
                timestamp: new Date().toISOString()
            }, 404)
        }

    } else {
        return c.json({
            success: false,
            data: [],
            message: `resources with version: ${version} not exist`,
            timestamp: new Date().toISOString()
        }, 404);
    }
}

// Export
export default downloadController;