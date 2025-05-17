// src/app.ts

import express, { Express, Request, Response, NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import { config } from "./config";

// Import routes
import authRoutes from "./routes/authRoutes";
import pollRoutes from "./routes/pollRoutes";

// Create Express application
const app: Express = express();

// Apply middleware
app.use(helmet()); // Security headers
app.use(cors({
  origin: config.cors.origin,
  optionsSuccessStatus: 200
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan(config.isDevelopment ? "dev" : "combined")); // Logging

// Health check endpoint
app.get("/health", (req: Request, res: Response) => {
  res.status(200).json({ status: "ok" });
});

// API routes
app.use("/auth", authRoutes);
app.use("/poll", pollRoutes);

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({ error: "Not found" });
});

// Error handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: "Internal server error" });
});

export default app;