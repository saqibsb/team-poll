import http from 'k6/http';
import { check, sleep } from 'k6';
import { SharedArray } from 'k6/data';
import { uuidv4 } from 'https://jslib.k6.io/k6-utils/1.4.0/index.js';

// Test configuration
export const options = {
  stages: [
    { duration: '30s', target: 100 }, // Ramp up to 100 users
    { duration: '1m', target: 1000 }, // Ramp up to 1,000 users
    { duration: '2m', target: 5000 }, // Ramp up to 5,000 users
    { duration: '1m', target: 10000 }, // Ramp up to 10,000 users
    { duration: '5m', target: 10000 }, // Stay at 10,000 users for 5 minutes
    { duration: '1m', target: 0 }, // Ramp down to 0 users
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests should be below 500ms
    http_req_failed: ['rate<0.01'], // Less than 1% of requests should fail
  },
};

// Create a test poll that will be used by all virtual users
const pollId = new SharedArray('pollId', function () {
  return [createTestPoll()];
});

// Function to create a test poll
function createTestPoll() {
  const payload = JSON.stringify({
    question: 'What is your favorite color?',
    options: ['Red', 'Blue', 'Green', 'Yellow', 'Purple'],
    expiresAt: new Date(Date.now() + 1000 * 60 * 60).toISOString(), // 1 hour from now
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
    },
  };

  const response = http.post('http://localhost:3000/poll', payload, params);
  check(response, {
    'Poll created successfully': (r) => r.status === 201,
  });

  return JSON.parse(response.body).id;
}

// Main function that each virtual user will execute
export default function () {
  // Step 1: Get an anonymous token
  const authResponse = http.post('http://localhost:3000/auth/anon');
  
  check(authResponse, {
    'Auth token received': (r) => r.status === 200,
  });
  
  const authData = JSON.parse(authResponse.body);
  const token = authData.token;
  
  // Step 2: Vote on the poll
  const optionIndex = Math.floor(Math.random() * 5); // Random option index (0-4)
  const optionId = optionIndex.toString(); // Simplified for testing
  
  const votePayload = JSON.stringify({
    optionId: optionId,
  });
  
  const voteParams = {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
  };
  
  const voteResponse = http.post(
    `http://localhost:3000/poll/${pollId[0]}/vote`,
    votePayload,
    voteParams
  );
  
  check(voteResponse, {
    'Vote accepted': (r) => r.status === 200 || r.status === 409, // 409 if already voted
  });
  
  // Step 3: Get poll results
  const pollResponse = http.get(`http://localhost:3000/poll/${pollId[0]}`);
  
  check(pollResponse, {
    'Poll results retrieved': (r) => r.status === 200,
  });
  
  // Wait before next iteration
  sleep(1);
}