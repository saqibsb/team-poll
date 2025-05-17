// src/__tests__/fixtures/pollData.ts

/**
 * Sample poll data for tests
 */
export const samplePollData = {
    question: 'What is your favorite programming language?',
    options: ['JavaScript', 'TypeScript', 'Python', 'Java', 'C#'],
    expiresAt: new Date(Date.now() + 86400000).toISOString() // 1 day from now
  };
  
  /**
   * Sample expired poll data for tests
   */
  export const expiredPollData = {
    question: 'What is your favorite programming language?',
    options: ['JavaScript', 'TypeScript', 'Python', 'Java', 'C#'],
    expiresAt: new Date(Date.now() - 86400000).toISOString() // 1 day ago
  };
  
  /**
   * Sample invalid poll data for tests (missing options)
   */
  export const invalidPollData = {
    question: 'What is your favorite programming language?',
    expiresAt: new Date(Date.now() + 86400000).toISOString() // 1 day from now
  };
  
  /**
   * Sample poll with minimal options for tests
   */
  export const minimalPollData = {
    question: 'Yes or No?',
    options: ['Yes', 'No'],
    expiresAt: new Date(Date.now() + 86400000).toISOString() // 1 day from now
  };
  
  /**
   * Sample poll with many options for tests
   */
  export const manyOptionsPollData = {
    question: 'What is your favorite color?',
    options: [
      'Red', 'Orange', 'Yellow', 'Green', 'Blue',
      'Indigo', 'Violet', 'Black', 'White', 'Gray',
      'Pink', 'Brown', 'Cyan', 'Magenta', 'Teal'
    ],
    expiresAt: new Date(Date.now() + 86400000).toISOString() // 1 day from now
  };