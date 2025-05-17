// src/routes/pollRoutes.ts

import { Router } from "express";
import { PollController } from "../controllers/PollController";
import { authenticate } from "../middlewares/authenticate";
import { voteRateLimiter } from "../middlewares/rateLimiter";

const router = Router();

/**
 * POST /poll
 * Create a new poll
 */
router.post("/", PollController.createPoll);

/**
 * GET /poll/:id
 * Get poll details and current tally
 */
router.get("/:id", PollController.getPoll);

/**
 * POST /poll/:id/vote
 * Cast a vote (requires authentication, rate limited)
 */
router.post("/:id/vote", authenticate, voteRateLimiter, PollController.castVote);

export default router;