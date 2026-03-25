import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { requestId } from 'hono/request-id';
import { logger } from 'hono/logger';

// Create instance of Hono
const app = new Hono();
app.use(logger());
app.use('*', requestId());
app.use('*', cors());

// Export
export default app;