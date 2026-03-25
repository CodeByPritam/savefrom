import { config } from 'dotenv';
config();

// Setup _Config
const _Config = {
    port: process.env.PORT,
    debugger: process.env.DEBUGGER,

    // Endpoints
    stopUserverify: process.env.STOP_USERVERIFY,
    stopIgDownload: process.env.STOP_IG_DOWNLOAD,

    // Authorized Services
    authorizedPlatforms: ['instagram', 'facebook', 'twitter-x', 'tiktok', 'youtube', 'dailymotion'],

    // Proxy TCP/
    proxy: {
        oxylab: {
            protocol: process.env.OXYLAB_PROXY_PROTOCOL,
            host: process.env.OXYLAB_PROXY_HOST,
            username: process.env.OXYLAB_PROXY_USERNAME,
            password: process.env.OXYLAB_PROXY_PASSWORD,
            port: process.env.OXYLAB_PROXY_PORT
        },
        brightdata: {
            protocol: process.env.BRIGHTDATA_PROXY_PROTOCOL,
            host: process.env.BRIGHTDATA_PROXY_HOST,
            username: process.env.BRIGHTDATA_PROXY_USERNAME,
            password: process.env.BRIGHTDATA_PROXY_PASSWORD,
            port: process.env.BRIGHTDATA_PROXY_PORT
        }
    },

    // jsonwebtoken
    jwt: {
        secretKey: process.env.JWT_SECRET_KEY,
        userverifyExpiresIn: process.env.JWT_USERVERIFY_EXPIRES_IN,
        responseExpiresIn: process.env.JWT_RESPONSE_EXPIRES_IN
    },

    // Redis HTTP/
    redis: {
        url: process.env.REDIS_REST_URL,
        token: process.env.REDIS_REST_TOKEN,
    }
}

// Export
export default Object.freeze(_Config);