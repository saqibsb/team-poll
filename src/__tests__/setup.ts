// src/tests/setupTests.ts

import { AppDataSource } from '../data-source';

/**
 * This file is run before each test file
 * We need to make sure the database is initialized before running tests
 */
beforeAll(async () => {
  // Make sure we have a database connection
  if (!AppDataSource.isInitialized) {
    try {
      // Initialize the database connection
      await AppDataSource.initialize();
      console.log('Database initialized for tests');
    } catch (err) {
      console.error('Failed to initialize database for tests:', err);
      throw err;
    }
  }
});

// Clean up after all tests
afterAll(async () => {
  // Only close the connection if we're not using it elsewhere
  if (AppDataSource.isInitialized) {
    await AppDataSource.destroy();
    console.log('Database connection closed after tests');
  }
});