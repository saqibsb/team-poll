import { DataSource } from 'typeorm';
import { Request, Response } from 'express';
import { Poll } from '../../entities/Poll';
import { PollOption } from '../../entities/PollOption';
import { Vote } from '../../entities/Vote';
import { AppDataSource } from '../../data-source';

/**
 * Clear all data from the test database
 */
export async function clearDatabase() {
  const queryRunner = AppDataSource.createQueryRunner();
  await queryRunner.connect();
  
  try {
    // Disable foreign key checks to enable truncating all tables
    await queryRunner.query('SET CONSTRAINTS ALL DEFERRED');
    
    // Truncate all tables
    await queryRunner.query('TRUNCATE TABLE votes CASCADE');
    await queryRunner.query('TRUNCATE TABLE poll_options CASCADE');
    await queryRunner.query('TRUNCATE TABLE polls CASCADE');
    
    // Re-enable foreign key checks
    await queryRunner.query('SET CONSTRAINTS ALL IMMEDIATE');
  } finally {
    await queryRunner.release();
  }
}

/**
 * Create a mock Express Request object
 */
export function createMockRequest(options: {
  params?: Record<string, any>;
  body?: Record<string, any>;
  headers?: Record<string, any>;
  user?: Record<string, any>;
} = {}): Request {
  const { params = {}, body = {}, headers = {}, user = null } = options;
  
  const req = {
    params,
    body,
    headers,
    user,
    app: {
      get: jest.fn()
    },
    get: jest.fn((name: string) => headers[name])
  } as unknown as Request;
  
  return req;
}

/**
 * Create a mock Express Response object
 */
export function createMockResponse(): Response {
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    send: jest.fn().mockReturnThis(),
    set: jest.fn().mockReturnThis(),
    end: jest.fn().mockReturnThis(),
    locals: {},
    headersSent: false
  } as unknown as Response;
  
  return res;
}

/**
 * Create a test poll in the database
 */
export async function createTestPoll(options: {
  question?: string;
  options?: string[];
  expiresAt?: Date;
} = {}): Promise<Poll> {
  const {
    question = 'Test Poll Question',
    options: optionTexts = ['Option 1', 'Option 2', 'Option 3'],
    expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000) // 1 day from now
  } = options;
  
  const pollRepository = AppDataSource.getRepository(Poll);
  const optionRepository = AppDataSource.getRepository(PollOption);
  
  // Create poll
  const poll = new Poll();
  poll.question = question;
  poll.expiresAt = expiresAt;
  poll.isActive = true;
  poll.totalVotes = 0;
  
  // Save poll to get an ID
  const savedPoll = await pollRepository.save(poll);
  
  // Create options
  const pollOptions: PollOption[] = [];
  for (const optionText of optionTexts) {
    const option = new PollOption();
    option.text = optionText;
    option.count = 0;
    option.pollId = savedPoll.id;
    option.poll = savedPoll; // Add reference to the poll
    pollOptions.push(option);
  }
  
  // Save options
  const savedOptions = await optionRepository.save(pollOptions);
  
  // Load options into poll
  savedPoll.options = savedOptions;
  
  return savedPoll;
}

/**
 * Create a test vote in the database
 */
export async function createTestVote(options: {
  userId: string;
  pollId: string;
  optionId: string;
}): Promise<Vote> {
  const { userId, pollId, optionId } = options;
  
  const voteRepository = AppDataSource.getRepository(Vote);
  const pollRepository = AppDataSource.getRepository(Poll);
  const optionRepository = AppDataSource.getRepository(PollOption);
  
  // Create and save vote
  const vote = new Vote();
  vote.userId = userId;
  vote.pollId = pollId;
  vote.optionId = optionId;
  
  const savedVote = await voteRepository.save(vote);
  
  // Increment poll total votes
  await pollRepository.increment({ id: pollId }, 'totalVotes', 1);
  
  // Increment option count
  await optionRepository.increment({ id: optionId }, 'count', 1);
  
  return savedVote;
}

/**
 * Generate a test auth token
 */
export async function getTestAuthToken(): Promise<{ token: string, userId: string }> {
  const supertest = require('supertest');
  const app = require('../../app').default;
  
  const response = await supertest(app)
    .post('/auth/anon')
    .send();
  
  return {
    token: response.body.token,
    userId: response.body.userId
  };
}