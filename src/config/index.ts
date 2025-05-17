// src/config/index.ts

import dotenv from "dotenv";
dotenv.config();

export const config = {
  // Server configuration
  port: parseInt(process.env.PORT || "3000", 10),
  nodeEnv: process.env.NODE_ENV || "development",
  isDevelopment: process.env.NODE_ENV !== "production",
  
  // Database configuration
  db: {
    host: process.env.DB_HOST || "localhost",
    port: parseInt(process.env.DB_PORT || "5432", 10),
    username: process.env.DB_USERNAME || "postgres",
    password: process.env.DB_PASSWORD || "postgres",
    database: process.env.DB_DATABASE || "team_polls"
  },
  
  // Redis configuration
  redis: {
    host: process.env.REDIS_HOST || "localhost",
    port: parseInt(process.env.REDIS_PORT || "6379", 10),
    enabled: process.env.REDIS_ENABLED !== "false"
  },
  
  // JWT configuration
  jwt: {
    secret: process.env.JWT_SECRET || "your_jwt_secret_key",
    expiryTime: process.env.JWT_EXPIRY || "1h"
  },
  
  // CORS configuration
  cors: {
    origin: process.env.CORS_ORIGIN || "*"
  },
  
  // Rate limiting configuration
  rateLimit: {
    windowMs: 1000, // 1 second window
    max: 5, // 5 requests per window per user
    standardHeaders: true,
    legacyHeaders: false
  },
  
  // Cluster configuration
  useCluster: process.env.USE_CLUSTER === "true" && process.env.NODE_ENV === "production"
};