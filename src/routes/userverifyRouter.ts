import { Hono } from 'hono';
import userverifyController from '../controllers/userverifyController.js';

// Create router instance
const router = new Hono();
const userverifyRouter = router.post('/userverify', userverifyController);

// Export
export default userverifyRouter;