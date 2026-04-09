import type { Context } from 'hono';
import { fetch, ProxyAgent } from 'undici';
import _Config from '../config/config.js';
import { URLSearchParams } from "node:url";
import { v7 } from 'uuid';

// Handle posts & reels HTTP request
const rpCaller = async (c: Context, url: string, shortcode: string, type: string) => {
    return c.json({
        msg: 'Hello, from rpCaller',
        url
    }, 200)
};

// Export
export { rpCaller };