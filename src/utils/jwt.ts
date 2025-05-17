// src/utils/jwt.ts

import jwt from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";
import { config } from "../config";

interface JwtPayload {
  userId: string;
  type: string;
  iat?: number;
  exp?: number;
}

/**
 * Generate an anonymous JWT token for a user
 * @returns An object containing the token and userId
 */
export const generateAnonToken = (): { token: string; userId: string } => {
  const userId = uuidv4(); // Generate a random UUID for anonymous user
  
  const payload: JwtPayload = {
    userId,
    type: "anonymous",
    iat: Math.floor(Date.now() / 1000)
  };
  
  return {
    // token: jwt.sign(payload, config.jwt.secret, { expiresIn: config.jwt.expiryTime }),
    token: jwt.sign(payload, config.jwt.secret),
    userId
  };
};

/**
 * Verify a JWT token
 * @param token - The JWT token to verify
 * @returns The decoded token payload
 */
export const verifyToken = (token: string): JwtPayload => {
  try {
    return jwt.verify(token, config.jwt.secret) as JwtPayload;
  } catch (error) {
    throw new Error("Invalid or expired token");
  }
};