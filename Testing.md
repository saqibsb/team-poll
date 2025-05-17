# Testing Setup & Instructions for Team Polls

This document provides information on the testing infrastructure and how to run tests for the Team Polls application.

## Testing Framework

The application uses Jest as its testing framework with the following setup:

- **Unit Tests**: For testing individual components in isolation
- **Integration Tests**: For testing multiple components together with a real database
- **Coverage Reports**: Minimum 80% code coverage required

## Test Structure

```
src/
├── __tests__/                      # Test configuration
│   ├── setup.ts                    # Global test setup
│   ├── teardown.ts                 # Global test teardown
│   ├── helpers/                    # Test helper functions
│   │   └── testUtils.ts            # Common test utilities
├── controllers/
│   ├── __tests__/                  # Controller tests
├── middlewares/
│   ├── __tests__/                  # Middleware tests
├── utils/
│   ├── __tests__/                  # Utility tests
└── integration/                    # Integration tests
    ├── auth.test.ts                # Authentication integration tests
    ├── poll.test.ts                # Poll API integration tests
    ├── rateLimiter.test.ts         # Rate limiting tests
    └── websocket.test.ts           # WebSocket integration tests
```

## Running Tests

### Prerequisites

Docker must be installed and running on your machine as the integration tests use TestContainers to spin up PostgreSQL and Redis instances.

### Commands

```bash
# Run all tests
npm test

# Run tests in watch mode (during development)
npm run test:watch

# Run tests with coverage report
npm run test:coverage

# Run only unit tests
npm run test:unit

# Run only integration tests
npm run test:integration

# Run tests in CI environment
npm run test:ci
```

## Integration Tests

The integration tests use real PostgreSQL and Redis instances running in Docker containers. These are automatically started before tests and cleaned up after tests using the TestContainers library.

Key integration test files:

- **auth.test.ts**: Tests authentication endpoints and middleware
- **poll.test.ts**: Tests poll creation, retrieval, and voting
- **websocket.test.ts**: Tests real-time updates through WebSockets
- **rateLimiter.test.ts**: Tests the rate limiting functionality

## Coverage Requirements

The project is configured to require a minimum of 80% code coverage for:

- Statements
- Branches
- Functions
- Lines

Coverage reports are generated in the `coverage` directory after running `npm run test:coverage`.

## Troubleshooting

### Container Issues

If tests fail due to container issues:

1. Ensure Docker is running
2. Check if there are any conflicting containers using the same ports
3. Try running `docker system prune` to clean up any dangling containers

### Database Connection Issues

If tests fail due to database connection issues:

1. Check if PostgreSQL is accessible
2. Verify that the database configuration in `setup.ts` matches your environment
3. Check for any network restrictions that might prevent container communication

## CI/CD Integration

The tests are configured to run in CI environments with the command `npm run test:ci`, which outputs coverage information in a format suitable for CI tools.