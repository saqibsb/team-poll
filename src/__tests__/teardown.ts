// src/__tests__/teardown.ts

import { AppDataSource } from '../data-source';
import { StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { StartedRedisContainer } from '@testcontainers/redis';
import { StartedNetwork } from 'testcontainers';

declare global {
  // eslint-disable-next-line no-var
  var __TESTCONTAINERS__: {
    network: StartedNetwork;
    postgresContainer: StartedPostgreSqlContainer;
    redisContainer: StartedRedisContainer;
  };
}

export default async function() {
  console.log('Global teardown - Cleaning up...');
  
  // Close database connection
  if (AppDataSource.isInitialized) {
    await AppDataSource.destroy();
    console.log('Database connection closed');
  }
  
  // Stop containers
  if (global.__TESTCONTAINERS__) {
    const { postgresContainer, redisContainer, network } = global.__TESTCONTAINERS__;
    
    console.log('Stopping containers...');
    
    if (postgresContainer) {
      await postgresContainer.stop();
      console.log('PostgreSQL container stopped');
    }
    
    if (redisContainer) {
      await redisContainer.stop();
      console.log('Redis container stopped');
    }
    
    if (network) {
      await network.stop();
      console.log('Docker network stopped');
    }
  }
  
  console.log('Global teardown completed');
}