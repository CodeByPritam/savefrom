import { Hono } from 'hono';
import downloadController from '../controllers/downloadController.js';

// Create router instance
const router = new Hono();
const downloadRouter = router.post('/download', downloadController);

// Export
export default downloadRouter;