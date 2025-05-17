// src/controllers/AuthController.ts

import { Request, Response } from "express";
import { generateAnonToken } from "../utils/jwt";
import { config } from "../config";

export class AuthController {
  /**
   * Generate an anonymous JWT token
   * POST /auth/anon
   */
  public static getAnonymousToken = (req: Request, res: Response): void => {
    try {
      const { token, userId } = generateAnonToken();
      
      res.json({
        token,
        userId,
        expiresIn: config.jwt.expiryTime
      });
    } catch (error) {
      console.error("Error generating anonymous token:", error);
      res.status(500).json({ error: "Error generating token" });
    }
  };
}