// src/middlewares/rateLimiter.ts

import { Request, Response, NextFunction } from "express";
import Redis from "ioredis";
import { config } from "../config";

// Create Redis client for rate limiting if enabled
let redisClient: Redis | undefined;

if (config.redis.enabled) {
  redisClient = new Redis({
    host: config.redis.host,
    port: config.redis.port
  });

  // Handle Redis connection errors
  redisClient.on("error", (err) => {
    console.error("Redis rate limiter error:", err);
  });
}

/**
 * Rate limiter middleware for vote endpoints
 * Limits to 5 requests per second per user with burst capability
 */
export const voteRateLimiter = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  if (!config.redis.enabled || !redisClient) {
    // Skip rate limiting if Redis is not available
    next();
    return;
  }
  
  try {
    if (!req.user || !req.user.userId) {
      res.status(401).json({ error: "User identification required" });
      return;
    }
    
    const userId = req.user.userId;
    const key = `ratelimit:vote:${userId}`;
    const now = Date.now();
    const windowMs = config.rateLimit.windowMs;
    
    // Use Redis to track requests with a sliding window
    // This implements a token bucket algorithm with burst capability
    
    // Get current count and timestamp
    const [countStr, lastRequestTimeStr] = await redisClient.mget(`${key}:count`, `${key}:time`);
    
    // Calculate time since last request
    const lastRequestTime = lastRequestTimeStr ? parseInt(lastRequestTimeStr, 10) : 0;
    const timeSinceLastRequest = now - lastRequestTime;
    
    // Calculate new token count (based on time elapsed)
    let tokenCount = countStr ? parseInt(countStr, 10) : config.rateLimit.max;
    
    // Regenerate tokens based on time passed, up to the maximum
    const tokensToAdd = Math.floor(timeSinceLastRequest / (windowMs / config.rateLimit.max));
    tokenCount = Math.min(config.rateLimit.max, tokenCount + tokensToAdd);
    
    if (tokenCount < 1) {
      // Set RateLimit headers
      const resetTime = Math.ceil((lastRequestTime + windowMs - now) / 1000);
      
      if (config.rateLimit.standardHeaders) {
        res.set({
          'RateLimit-Limit': config.rateLimit.max.toString(),
          'RateLimit-Remaining': '0',
          'RateLimit-Reset': resetTime.toString()
        });
      }
      
      res.status(429).json({ 
        error: "Too many requests",
        retryAfter: resetTime
      });
      return;
    }
    
    // Consume a token
    tokenCount -= 1;
    
    // Update Redis with new values
    await redisClient.multi()
      .set(`${key}:count`, tokenCount.toString())
      .set(`${key}:time`, now.toString())
      .expire(`${key}:count`, 60) // TTL for cleanup
      .expire(`${key}:time`, 60)  // TTL for cleanup
      .exec();
    
    // Set RateLimit headers
    if (config.rateLimit.standardHeaders) {
      res.set({
        'RateLimit-Limit': config.rateLimit.max.toString(),
        'RateLimit-Remaining': tokenCount.toString(),
        'RateLimit-Reset': Math.ceil((now + windowMs) / 1000).toString()
      });
    }
    
    next();
  } catch (error) {
    console.error("Rate limiting error:", error);
    // Fail open if there's an error with rate limiting
    next();
  }
};