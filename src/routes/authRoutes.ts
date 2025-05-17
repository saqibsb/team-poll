// src/routes/authRoutes.ts

import { Router } from "express";
import { AuthController } from "../controllers/AuthController";

const router = Router();

/**
 * POST /auth/anon
 * Get anonymous JWT token
 */
router.post("/anon", AuthController.getAnonymousToken);

export default router;