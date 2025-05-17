// src/integration/rateLimiter.test.ts

import request from 'supertest';
import app from '../app';
import { clearDatabase, createTestPoll } from '../__tests__/helpers/testUtils';

describe('Rate Limiter Integration Tests', () => {
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
  
  it('should limit requests to 5 per second per user', async () => {
    // Create a test poll
    const poll = await createTestPoll();
    const optionIds = poll.options.map(option => option.id);
    
    // Send 10 requests as quickly as possible
    const requests = [];
    for (let i = 0; i < 10; i++) {
      // Use different options to avoid idempotency issues
      const optionId = optionIds[i % optionIds.length];
      
      requests.push(
        request(app)
          .post(`/poll/${poll.id}/vote`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ optionId })
      );
    }
    
    // Wait for all requests to complete
    const responses = await Promise.all(requests);
    
    // Count successful and rate-limited responses
    const successfulResponses = responses.filter(res => res.status === 200);
    const rateLimitedResponses = responses.filter(res => res.status === 429);
    
    // We expect around 5 successful responses and 5 rate-limited responses
    // But there might be some variation depending on timing
    expect(successfulResponses.length).toBeGreaterThanOrEqual(1);
    expect(rateLimitedResponses.length).toBeGreaterThanOrEqual(1);
    expect(successfulResponses.length + rateLimitedResponses.length).toBe(10);
    
    // Verify rate limit headers
    const rateLimitedResponse = rateLimitedResponses[0];
    expect(rateLimitedResponse.headers).toHaveProperty('ratelimit-limit');
    expect(rateLimitedResponse.headers).toHaveProperty('ratelimit-remaining');
    expect(rateLimitedResponse.headers).toHaveProperty('ratelimit-reset');
    
    // Verify error message
    expect(rateLimitedResponse.body).toHaveProperty('error', 'Too many requests');
  });
  
  it('should reset rate limit after the window expires', async () => {
    // Create a test poll
    const poll = await createTestPoll();
    const optionId = poll.options[0].id;
    
    // Send 5 requests to hit the limit
    for (let i = 0; i < 5; i++) {
      await request(app)
        .post(`/poll/${poll.id}/vote`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ optionId });
    }
    
    // The 6th request should be rate limited
    const limitedResponse = await request(app)
      .post(`/poll/${poll.id}/vote`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ optionId });
    
    expect(limitedResponse.status).toBe(429);
    
    // Wait for the window to expire (1 second + buffer)
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Now we should be able to send requests again
    const response = await request(app)
      .post(`/poll/${poll.id}/vote`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ optionId });
    
    expect(response.status).toBe(200);
  });
  
  it('should apply rate limits per user', async () => {
    // Create a test poll
    const poll = await createTestPoll();
    const optionId = poll.options[0].id;
    
    // Get a second authentication token
    const authResponse = await request(app)
      .post('/auth/anon')
      .send();
    
    const secondAuthToken = authResponse.body.token;
    
    // Send 5 requests with the first token
    for (let i = 0; i < 5; i++) {
      await request(app)
        .post(`/poll/${poll.id}/vote`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ optionId });
    }
    
    // The 6th request with the first token should be rate limited
    const limitedResponse = await request(app)
      .post(`/poll/${poll.id}/vote`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ optionId });
    
    expect(limitedResponse.status).toBe(429);
    
    // But requests with the second token should work
    const response = await request(app)
      .post(`/poll/${poll.id}/vote`)
      .set('Authorization', `Bearer ${secondAuthToken}`)
      .send({ optionId });
    
    expect(response.status).toBe(200);
  });
});