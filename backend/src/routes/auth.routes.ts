import { Router } from 'express';
import { login, getMe, googleAuthRedirect, googleAuthCallback } from '../controllers/auth.controller';

const router = Router();

router.post('/login', login); // Fallback if still needed, or can be deprecated
router.get('/google', googleAuthRedirect);
router.get('/google/callback', googleAuthCallback);
router.get('/me', getMe);

export default router;
