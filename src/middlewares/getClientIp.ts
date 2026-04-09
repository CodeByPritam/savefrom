import type { Context, Next } from 'hono';
import { getConnInfo } from '@hono/node-server/conninfo';

// Get client actual IP address
const clientIpResolver = (c: Context): string => {

    // Cloudflare
    const cfIp = c.req.header("cf-connecting-ip");
    if (cfIp) return cfIp;

    // X-Forwarded-For
    const xff = c.req.header("x-forwarded-for");
    if (xff) return xff.split(",")[0].trim();

    // Ngnix
    const realIp = c.req.header("x-real-ip");
    if (realIp) return realIp;

    // Fallback
    const connInfo = getConnInfo(c);
    return connInfo.remote.address ?? '0.0.0.0';
};

// Export
export const getClientIp = async (c: Context, next: Next) => {
    const ip = clientIpResolver(c);
    c.set("clientIp", ip);
    await next();
};