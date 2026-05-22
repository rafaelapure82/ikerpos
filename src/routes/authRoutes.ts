import { Router } from 'express';
import { login } from '../controllers/AuthController.js';

const router = Router();

// POST /api/auth/login
router.post('/login', login);

export default router;
