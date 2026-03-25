import { Hono } from 'hono';

// Create router instance
const router = new Hono();
const userverifyRouter = router.post('/userverify', (c) => {
    return c.json({
        msg: "Hello, from userverify route"
    }, 200);
});

// Export
export default userverifyRouter;