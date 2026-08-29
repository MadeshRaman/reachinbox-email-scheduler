import { Router } from 'express';
import {
  connectSlack,
  slackCallback,
  getSlackStatus,
  disconnectSlack,
} from '../controllers/slack.controller';

const router = Router();

router.get('/connect', connectSlack);
router.get('/callback', slackCallback);
router.get('/status', getSlackStatus);
router.post('/disconnect', disconnectSlack);

export default router;
