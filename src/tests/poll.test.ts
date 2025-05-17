// src/integration/poll.test.ts

import request from 'supertest';
import app from '../app';
import { clearDatabase, createTestPoll } from '../__tests__/helpers/testUtils';
import { AppDataSource } from '../data-source';
import { Poll } from '../entities/Poll';
import { Vote } from '../entities/Vote';

describe('Poll API Integration Tests', () => {
  let authToken: string;
  let userId: string;
  
  beforeAll(async () => {
    // Get authentication token for testing
    const authResponse = await request(app)
      .post('/auth/anon')
      .send();
    
    authToken = authResponse.body.token;
    userId = authResponse.body.userId;
  });
  
  beforeEach(async () => {
    await clearDatabase();
  });
  
  describe('POST /poll', () => {
    it('should create a new poll with options', async () => {
      // Setup
      const pollData = {
        question: 'What is your favorite color?',
        options: ['Red', 'Blue', 'Green', 'Yellow'],
        expiresAt: new Date(Date.now() + 86400000).toISOString() // 1 day from now
      };
      
      // Execute
      const response = await request(app)
        .post('/poll')
        .send(pollData);
      
      // Assert
      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body.question).toBe(pollData.question);
      expect(response.body.options).toHaveLength(pollData.options.length);
      expect(response.body.isActive).toBe(true);
      expect(response.body.totalVotes).toBe(0);
      
      // Check that options are created correctly
      for (let i = 0; i < pollData.options.length; i++) {
        expect(response.body.options[i].text).toBe(pollData.options[i]);
        expect(response.body.options[i].count).toBe(0);
      }
      
      // Verify in database
      const pollRepository = AppDataSource.getRepository(Poll);
      const savedPoll = await pollRepository.findOne({
        where: { id: response.body.id },
        relations: ['options']
      });
      
      expect(savedPoll).not.toBeNull();
      expect(savedPoll!.question).toBe(pollData.question);
      expect(savedPoll!.options).toHaveLength(pollData.options.length);
    });
    
    it('should reject poll creation with invalid data', async () => {
      // Test with missing options
      const response1 = await request(app)
        .post('/poll')
        .send({
          question: 'What is your favorite color?',
          expiresAt: new Date(Date.now() + 86400000).toISOString()
        });
      
      expect(response1.status).toBe(400);
      
      // Test with past expiration date
      const response2 = await request(app)
        .post('/poll')
        .send({
          question: 'What is your favorite color?',
          options: ['Red', 'Blue'],
          expiresAt: new Date(Date.now() - 86400000).toISOString() // 1 day ago
        });
      
      expect(response2.status).toBe(400);
    });
  });
  
  describe('GET /poll/:id', () => {
    it('should return poll details with current tally', async () => {
      // Create a test poll
      const poll = await createTestPoll();
      
      // Execute
      const response = await request(app)
        .get(`/poll/${poll.id}`);
      
      // Assert
      expect(response.status).toBe(200);
      expect(response.body.id).toBe(poll.id);
      expect(response.body.question).toBe(poll.question);
      expect(response.body.options).toHaveLength(poll.options.length);
    });
    
    it('should return 404 for non-existent poll', async () => {
      // Execute
      const response = await request(app)
        .get('/poll/non-existent-id');
      
      // Assert
      expect(response.status).toBe(404);
    });
  });
  
  describe('POST /poll/:id/vote', () => {
    it('should allow casting a vote on an active poll', async () => {
      // Create a test poll
      const poll = await createTestPoll();
      const optionId = poll.options[0].id;
      
      // Execute
      const response = await request(app)
        .post(`/poll/${poll.id}/vote`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ optionId });
      
      // Assert
      expect(response.status).toBe(200);
      expect(response.body.message).toContain('success');
      expect(response.body.pollId).toBe(poll.id);
      expect(response.body.optionId).toBe(optionId);
      
      // Verify vote was recorded in database
      const voteRepository = AppDataSource.getRepository(Vote);
      const savedVote = await voteRepository.findOne({
        where: { 
          pollId: poll.id,
          userId 
        }
      });
      
      expect(savedVote).not.toBeNull();
      expect(savedVote!.optionId).toBe(optionId);
      
      // Verify option count was incremented
      const pollRepository = AppDataSource.getRepository(Poll);
      const updatedPoll = await pollRepository.findOne({
        where: { id: poll.id },
        relations: ['options']
      });
      
      const votedOption = updatedPoll!.options.find(o => o.id === optionId);
      expect(votedOption!.count).toBe(1);
      expect(updatedPoll!.totalVotes).toBe(1);
    });
    
    it('should be idempotent for the same user and poll', async () => {
      // Create a test poll
      const poll = await createTestPoll();
      const optionId = poll.options[0].id;
      
      // First vote
      await request(app)
        .post(`/poll/${poll.id}/vote`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ optionId });
      
      // Second vote (same option)
      const response = await request(app)
        .post(`/poll/${poll.id}/vote`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ optionId });
      
      // Assert
      expect(response.status).toBe(200);
      expect(response.body.message).toContain('already recorded');
      
      // Verify total votes is still 1
      const pollRepository = AppDataSource.getRepository(Poll);
      const updatedPoll = await pollRepository.findOne({
        where: { id: poll.id }
      });
      
      expect(updatedPoll!.totalVotes).toBe(1);
    });
    
    it('should allow changing vote to a different option', async () => {
      // Create a test poll
      const poll = await createTestPoll();
      const firstOptionId = poll.options[0].id;
      const secondOptionId = poll.options[1].id;
      
      // First vote
      await request(app)
        .post(`/poll/${poll.id}/vote`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ optionId: firstOptionId });
      
      // Second vote (different option)
      const response = await request(app)
        .post(`/poll/${poll.id}/vote`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ optionId: secondOptionId });
      
      // Assert
      expect(response.status).toBe(200);
      expect(response.body.message).toContain('updated');
      
      // Verify vote was updated in database
      const voteRepository = AppDataSource.getRepository(Vote);
      const savedVote = await voteRepository.findOne({
        where: { 
          pollId: poll.id,
          userId 
        }
      });
      
      expect(savedVote!.optionId).toBe(secondOptionId);
      
      // Verify option counts were updated correctly
      const pollRepository = AppDataSource.getRepository(Poll);
      const updatedPoll = await pollRepository.findOne({
        where: { id: poll.id },
        relations: ['options']
      });
      
      const firstOption = updatedPoll!.options.find(o => o.id === firstOptionId);
      const secondOption = updatedPoll!.options.find(o => o.id === secondOptionId);
      
      expect(firstOption!.count).toBe(0);
      expect(secondOption!.count).toBe(1);
      expect(updatedPoll!.totalVotes).toBe(1); // Total remains the same
    });
    
    it('should require authentication to vote', async () => {
      // Create a test poll
      const poll = await createTestPoll();
      const optionId = poll.options[0].id;
      
      // Execute without token
      const response = await request(app)
        .post(`/poll/${poll.id}/vote`)
        .send({ optionId });
      
      // Assert
      expect(response.status).toBe(401);
    });
    
    it('should reject votes for non-existent polls', async () => {
      // Execute
      const response = await request(app)
        .post('/poll/non-existent-id/vote')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ optionId: 'some-option-id' });
      
      // Assert
      expect(response.status).toBe(404);
    });
    
    it('should reject votes for invalid options', async () => {
      // Create a test poll
      const poll = await createTestPoll();
      
      // Execute with invalid option
      const response = await request(app)
        .post(`/poll/${poll.id}/vote`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ optionId: 'non-existent-option' });
      
      // Assert
      expect(response.status).toBe(400);
    });
  });
});