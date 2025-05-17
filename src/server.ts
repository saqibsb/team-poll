// src/server.ts

import http from "http";
import cluster from "cluster";
import { cpus } from "os";
import { config } from "./config";
import app from "./app";
import { initializeDatabase } from "./data-source";
import { SocketService } from "./services/SocketService";

const numCPUs = cpus().length;

/**
 * Start the application server
 */
async function startServer() {
  try {
    // Initialize database connection
    await initializeDatabase();
    
    // Create HTTP server
    const server = http.createServer(app);
    
    // Initialize Socket.IO
    const socketService = new SocketService(server);
    
    // Make Socket.IO instance available to routes
    app.set("io", socketService.getIO());
    
    // Start the server
    server.listen(config.port, () => {
      console.log(`Server running on port ${config.port} in ${config.nodeEnv} mode`);
    });
    
    // Handle graceful shutdown
    const gracefulShutdown = () => {
      console.log("Received shutdown signal, closing server...");
      server.close(() => {
        console.log("Server closed, exiting process");
        process.exit(0);
      });
      
      // Force close after 10s
      setTimeout(() => {
        console.error("Could not close connections in time, forcefully exiting");
        process.exit(1);
      }, 10000);
    };
    
    // Listen for termination signals
    process.on("SIGTERM", gracefulShutdown);
    process.on("SIGINT", gracefulShutdown);
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

// Use clustering in production
if (config.useCluster && cluster.isPrimary) {
  console.log(`Primary ${process.pid} is running`);
  
  // Fork workers
  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }
  
  cluster.on("exit", (worker, code, signal) => {
    console.log(`Worker ${worker.process.pid} died`);
    // Replace the dead worker
    cluster.fork();
  });
} else {
  // Start server (either as a worker or in single-instance mode)
  startServer();
}

// For testing/import purposes
export default app;