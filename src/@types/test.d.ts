// src/@types/test.d.ts

import { StartedNetwork } from 'testcontainers';
import { StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { StartedRedisContainer } from '@testcontainers/redis';

declare global {
  // eslint-disable-next-line no-var
  var __TESTCONTAINERS__: {
    network: StartedNetwork;
    postgresContainer: StartedPostgreSqlContainer;
    redisContainer: StartedRedisContainer;
  };
}