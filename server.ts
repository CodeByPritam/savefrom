import app from './src/app.js';
import { serve } from '@hono/node-server';

// Starter
const initServer = () => {
    const port = 8080;

    // Set default home route
    app.get('/', (c) => {
        return c.json({
            reqid: c.get("requestId"),
            msg: "Hello, hello nigga!",
        }, 200);
    });

    // Listen On
    serve({
        fetch: app.fetch,
        port: port
    }, (info) =>  {
        console.log(`Server is running on http://localhost:${info.port}`);
    });

}

// Invoke
initServer();