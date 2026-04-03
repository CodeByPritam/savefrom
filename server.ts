import app from './src/app.js';
import { serve } from '@hono/node-server';
import _Config from './src/config/config.js';

// Starter
const initServer = () => {
    const port = Number(_Config.port) || 8080;

    // Set default home route
    app.get('/', (c) => {
        return c.json({
            reqid: c.get("requestId"),
            msg: "Hello, nigga!",
        }, 200);
    });

    // Listen On
    serve({
        fetch: app.fetch,
        port: port
    }, (info) =>  {
        console.log(`Server is spinning up on port: ${info.port}`);
    });

}

// Invoke
initServer();