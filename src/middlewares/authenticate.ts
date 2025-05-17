// src/middlewares/authenticate.ts

import { Request, Response, NextFunction } from "express";
import { verifyToken } from "../utils/jwt";

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        type: string;
      };
    }
  }
}

/**
 * Authentication middleware
 * Verifies JWT token from Authorization header
 */
export const authenticate = (req: Request, res: Response, next: NextFunction): void => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }
    
    // Extract the token
    const token = authHeader.split(" ")[1];
    
    if (!token) {
      res.status(401).json({ error: "Authentication token required" });
      return;
    }
    
    // Verify the token
    const decoded = verifyToken(token);
    
    // Add user info to request
    req.user = {
      userId: decoded.userId,
      type: decoded.type
    };
    
    next();
  } catch (error) {
    res.status(401).json({ error: "Invalid or expired token" });
  }
};