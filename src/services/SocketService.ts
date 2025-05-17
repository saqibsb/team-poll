// src/services/SocketService.ts

import { Server as HttpServer } from "http";
import { Server as SocketServer, Socket } from "socket.io";
import { createAdapter } from "@socket.io/redis-adapter";
import Redis from "ioredis";
import { config } from "../config";

export class SocketService {
  private io: SocketServer;
  
  constructor(server: HttpServer) {
    // Initialize Socket.io server
    this.io = new SocketServer(server, {
      cors: {
        origin: config.cors.origin,
        methods: ["GET", "POST"]
      }
    });
    
    // Set up Redis adapter if Redis is enabled
    if (config.redis.enabled) {
      try {
        const pubClient = new Redis({
          host: config.redis.host,
          port: config.redis.port
        });
        
        const subClient = pubClient.duplicate();
        
        // Handle Redis connection errors
        pubClient.on("error", (err) => {
          console.error("Redis pub client error:", err);
        });
        
        subClient.on("error", (err) => {
          console.error("Redis sub client error:", err);
        });
        
        this.io.adapter(createAdapter(pubClient, subClient));
        console.log("Socket.io Redis adapter initialized");
      } catch (error) {
        console.error("Failed to initialize Socket.io Redis adapter:", error);
      }
    }
    
    // Set up connection handlers
    this.setupConnectionHandlers();
  }
  
  /**
   * Set up Socket.io connection handlers
   */
  private setupConnectionHandlers(): void {
    this.io.on("connection", (socket: Socket) => {
      console.log(`Client connected: ${socket.id}`);
      
      // Handle joining poll rooms
      socket.on("join:poll", (pollId: string) => {
        socket.join(`poll:${pollId}`);
        console.log(`Client ${socket.id} joined poll:${pollId}`);
      });
      
      // Handle leaving poll rooms
      socket.on("leave:poll", (pollId: string) => {
        socket.leave(`poll:${pollId}`);
        console.log(`Client ${socket.id} left poll:${pollId}`);
      });
      
      // Handle disconnection
      socket.on("disconnect", () => {
        console.log(`Client disconnected: ${socket.id}`);
      });
    });
  }
  
  /**
   * Get the Socket.io server instance
   */
  public getIO(): SocketServer {
    return this.io;
  }
}