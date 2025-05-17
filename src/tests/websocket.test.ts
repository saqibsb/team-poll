// src/integration/websocket.test.ts

import request from 'supertest';
import { io as Client, Socket as ClientSocket } from 'socket.io-client';
import { Server } from 'http';
import app from '../app';
import { createTestPoll, clearDatabase } from '../__tests__/helpers/testUtils';
import { AppDataSource } from '../data-source';

describe('WebSocket Integration Tests', () => {
  let server: Server;
  let clientSocket: ClientSocket;
  let authToken: string;
  let userId: string;
  
  beforeAll(async () => {
    // Start the server
    server = app.listen(0); // Use a random available port
    
    // Get authentication token for testing
    const authResponse = await request(app)
      .post('/auth/anon')
      .send();
    
    authToken = authResponse.body.token;
    userId = authResponse.body.userId;
  });
  
  afterAll(() => {
    if (clientSocket) {
      clientSocket.close();
    }
    server.close();
  });
  
  beforeEach(async () => {
    await clearDatabase();
    
    // Close previous socket connection if exists
    if (clientSocket) {
      clientSocket.close();
    }
  });
  
  const createSocketClient = () => {
    const port = (server.address() as any).port;
    return Client(`http://localhost:${port}`, {
      autoConnect: true,
      reconnection: false,
      transports: ['websocket']
    });
  };
  
  describe('Poll Room Subscription', () => {
    it('should allow clients to join poll rooms', done => {
      // Create a socket client
      clientSocket = createSocketClient();
      
      clientSocket.on('connect', () => {
        // Emit join:poll event
        clientSocket.emit('join:poll', 'test-poll-id');
        
        // Wait a moment to ensure the event is processed
        setTimeout(() => {
          // Check if socket is in the room (indirectly)
          // This is testing the connection works, not the specific room
          expect(clientSocket.connected).toBe(true);
          done();
        }, 100);
      });
    });
  });
  
  describe('Real-time Updates', () => {
    it('should broadcast poll updates when votes are cast', async () => {
      // Create a test poll
      const poll = await createTestPoll();
      const optionId = poll.options[0].id;
      
      // Create a promise that resolves when the poll:update event is received
      const updatePromise = new Promise((resolve) => {
        // Create a socket client
        clientSocket = createSocketClient();
        
        clientSocket.on('connect', () => {
          // Join the poll room
          clientSocket.emit('join:poll', poll.id);
          
          // Listen for updates
          clientSocket.on('poll:update', (data) => {
            resolve(data);
          });
          
          // Cast a vote after joining the room
          setTimeout(async () => {
            await request(app)
              .post(`/poll/${poll.id}/vote`)
              .set('Authorization', `Bearer ${authToken}`)
              .send({ optionId });
          }, 100);
        });
      });
      
      // Wait for the poll:update event
      const updateData = await updatePromise;
      
      // Assert the update data format
      expect(updateData).toHaveProperty('pollId', poll.id);
      expect(updateData).toHaveProperty('options');
      expect(updateData.options).toHaveProperty(optionId, 1); // Option count incremented by 1
    });
    
    // Additional test for poll:closed event could be added here
  });
});