// src/controllers/PollController.ts

import { Request, Response } from "express";
import { AppDataSource } from "../data-source";
import { Poll } from "../entities/Poll";
import { PollOption } from "../entities/PollOption";
import { Vote } from "../entities/Vote";
import Redis from "ioredis";
import { config } from "../config";
import { v4 as uuidv4 } from "uuid";
import { Server as SocketServer } from "socket.io";

// Redis client for caching and pub/sub if enabled
let redisClient: Redis | undefined;

if (config.redis.enabled) {
  redisClient = new Redis({
    host: config.redis.host,
    port: config.redis.port
  });

  redisClient.on("error", (err) => {
    console.error("Redis poll controller error:", err);
  });
}

export class PollController {
  /**
   * Create a new poll
   * POST /poll
   */
  public static createPoll = async (req: Request, res: Response): Promise<void> => {
    const pollRepository = AppDataSource.getRepository(Poll);
    const optionRepository = AppDataSource.getRepository(PollOption);
    
    try {
      const { question, options, expiresAt } = req.body;
      
      // Validate request
      if (!question || !options || !Array.isArray(options) || options.length < 2) {
        res.status(400).json({ 
          error: "Invalid poll data. Question and at least 2 options are required."
        });
        return;
      }
      
      const expiryDate = new Date(expiresAt);
      if (isNaN(expiryDate.getTime()) || expiryDate <= new Date()) {
        res.status(400).json({ 
          error: "Invalid expiration date. Must be a valid date in the future."
        });
        return;
      }
      
      // Create the poll
      const poll = new Poll();
      poll.question = question;
      poll.expiresAt = expiryDate;
      poll.isActive = true;
      poll.totalVotes = 0;
      
      // Save poll to get an ID
      const savedPoll = await pollRepository.save(poll);
      
      // Create and save options
      const pollOptions: PollOption[] = [];
      
      for (const optionText of options) {
        const option = new PollOption();
        option.text = optionText;
        option.count = 0;
        option.pollId = savedPoll.id;
        pollOptions.push(option);
      }
      
      console.log("before save")
      // Save all options
      await optionRepository.save(pollOptions);
      console.log("After save")

      // Load options into poll
      savedPoll.options = pollOptions;
      
      // Schedule poll expiration job (will use Redis in production)
      const now = new Date();
      const expiryDelay = expiryDate.getTime() - now.getTime();
      
      if (expiryDelay > 0 && expiryDelay <= 2147483647) { // Max setTimeout value
        setTimeout(async () => {
          try {
            // Update poll to mark as inactive if it wasn't already
            await pollRepository.update(savedPoll.id, { isActive: false });
            
            // Emit expiration event through Socket.IO
            const io: SocketServer | undefined = req.app.get("io");
            if (io) {
              io.to(`poll:${savedPoll.id}`).emit("poll:closed", { 
                pollId: savedPoll.id,
                message: "Poll has expired"
              });
            }
            
            console.log(`Poll ${savedPoll.id} has been automatically closed due to expiration`);
          } catch (error) {
            console.error(`Error automatically closing poll ${savedPoll.id}:`, error);
          }
        }, expiryDelay);
      }
      
      // Return the created poll
      res.status(201).json(savedPoll.toPublic());
    } catch (error) {
      console.error("Error creating poll:", error);
      res.status(500).json({ error: "Error creating poll" });
    }
  };

  /**
   * Get poll details and current tally
   * GET /poll/:id
   */
  public static getPoll = async (req: Request, res: Response): Promise<void> => {
    const pollRepository = AppDataSource.getRepository(Poll);
    
    try {
      const { id } = req.params;
      
      // Try to get from cache first
      if (config.redis.enabled && redisClient) {
        const cachedPoll = await redisClient.get(`poll:${id}`);
        if (cachedPoll) {
          res.json(JSON.parse(cachedPoll));
          return;
        }
      }
      
      // Fetch from database if not in cache
      const poll = await pollRepository.findOne({
        where: { id },
        relations: ["options"]
      });
      
      if (!poll) {
        res.status(404).json({ error: "Poll not found" });
        return;
      }
      
      const pollData = poll.toPublic();
      
      // Cache the result
      if (config.redis.enabled && redisClient && poll.isOpen()) {
        // Cache active polls for 30 seconds
        await redisClient.set(`poll:${id}`, JSON.stringify(pollData), "EX", 30);
      }
      
      res.json(pollData);
    } catch (error) {
      console.error("Error fetching poll:", error);
      res.status(500).json({ error: "Error fetching poll" });
    }
  };

  /**
   * Cast a vote on a poll
   * POST /poll/:id/vote
   */
  public static castVote = async (req: Request, res: Response): Promise<void> => {
    const pollRepository = AppDataSource.getRepository(Poll);
    const optionRepository = AppDataSource.getRepository(PollOption);
    const voteRepository = AppDataSource.getRepository(Vote);
    
    // Begin transaction
    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    
    try {
      const { id: pollId } = req.params;
      const { optionId } = req.body;
      
      if (!req.user || !req.user.userId) {
        res.status(401).json({ error: "Authentication required" });
        return;
      }
      
      const userId = req.user.userId;
      
      if (!optionId) {
        res.status(400).json({ error: "Option ID is required" });
        return;
      }
      
      // Get the poll
      const poll = await queryRunner.manager.findOne(Poll, {
        where: { id: pollId },
        relations: ["options"]
      });
      
      if (!poll) {
        await queryRunner.rollbackTransaction();
        res.status(404).json({ error: "Poll not found" });
        return;
      }
      
      // Check if poll is still active
      if (!poll.isOpen()) {
        await queryRunner.rollbackTransaction();
        res.status(403).json({ error: "Poll is closed or expired" });
        return;
      }
      
      // Check if option exists
      const option = poll.options.find(opt => opt.id === optionId);
      if (!option) {
        await queryRunner.rollbackTransaction();
        res.status(400).json({ error: "Invalid option ID" });
        return;
      }
      
      // Check if user has already voted on this poll
      const existingVote = await queryRunner.manager.findOne(Vote, {
        where: { pollId, userId }
      });
      
      let message = "Vote recorded successfully";
      let optionDelta = {};
      
      if (existingVote) {
        // If voting for the same option, return success as it's idempotent
        if (existingVote.optionId === optionId) {
          await queryRunner.rollbackTransaction();
          res.json({ 
            message: "Vote already recorded", 
            pollId, 
            optionId 
          });
          return;
        }
        
        // If voting for a different option, update the vote and poll counts
        const oldOptionId = existingVote.optionId;
        
        // Get the old option
        const oldOption = await queryRunner.manager.findOne(PollOption, {
          where: { id: oldOptionId }
        });
        
        // Update the old option count (decrement)
        if (oldOption && oldOption.count > 0) {
          await queryRunner.manager.decrement(
            PollOption, 
            { id: oldOptionId }, 
            "count", 
            1
          );
          
          // Record the delta for WebSocket broadcast
          //@ts-ignore
          optionDelta[oldOptionId] = -1;
        }
        
        // Update the vote
        await queryRunner.manager.update(
          Vote, 
          { id: existingVote.id }, 
          { optionId }
        );
        
        message = "Vote updated successfully";
      } else {
        // Create a new vote
        const vote = new Vote();
        vote.userId = userId;
        vote.pollId = pollId;
        vote.optionId = optionId;
        
        await queryRunner.manager.save(vote);
        
        // Increment total votes
        await queryRunner.manager.increment(
          Poll, 
          { id: pollId }, 
          "totalVotes", 
          1
        );
      }
      
      // Increment the selected option count
      await queryRunner.manager.increment(
        PollOption, 
        { id: optionId }, 
        "count", 
        1
      );
      
      // Add to delta for WebSocket broadcast
      //@ts-ignore
      optionDelta[optionId] = 1;
      
      // Commit the transaction
      await queryRunner.commitTransaction();
      
      // Invalidate cache
      if (config.redis.enabled && redisClient) {
        await redisClient.del(`poll:${pollId}`);
      }
      
      // Emit update event through Socket.IO
      const io: SocketServer | undefined = req.app.get("io");
      if (io) {
        io.to(`poll:${pollId}`).emit("poll:update", { 
          pollId, 
          options: optionDelta
        });
      }
      
      res.json({ 
        message, 
        pollId, 
        optionId 
      });
    } catch (error) {
      // Rollback transaction on error
      await queryRunner.rollbackTransaction();
      
    //   if (error.name === "QueryFailedError" && error.constraint === "UQ_votes_user_poll") {
    //     res.status(409).json({ error: "You have already voted in this poll" });
    //     return;
    //   }
      
      console.error("Error casting vote:", error);
      res.status(500).json({ error: "Error casting vote" });
    } finally {
      // Release query runner
      await queryRunner.release();
    }
  };
}