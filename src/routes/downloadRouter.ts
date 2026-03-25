import { Hono } from 'hono';

// Create router instance
const router = new Hono();
const downloadRouter = router.post('/download', (c) => {
    return c.json({
        msg: 'Hello, from download route'
    }, 200);
});

// Export
export default downloadRouter;