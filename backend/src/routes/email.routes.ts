import { Router } from 'express';
import {
  scheduleEmails,
  getScheduledEmails,
  getSentEmails,
  searchEmails,
  getEmailStats,
} from '../controllers/email.controller';

const router = Router();

router.post('/schedule', scheduleEmails);
router.get('/scheduled', getScheduledEmails);
router.get('/sent', getSentEmails);
router.get('/search', searchEmails);
router.get('/stats', getEmailStats);

export default router;
