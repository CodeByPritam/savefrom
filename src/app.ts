import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { requestId } from 'hono/request-id';
import { logger } from 'hono/logger';
import userverifyRouter from './routes/userverifyRouter.js';
import downloadRouter from './routes/downloadRouter.js';

// Create instance of Hono
const app = new Hono();
app.use(logger());
app.use('*', requestId());
app.use('*', cors());

// Routes: uerverify & download
app.route('/api/:version', userverifyRouter);
app.route('/api/:version/:platform', downloadRouter);

// Export
export default app;