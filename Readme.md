# Team Polls Application

A scalable real-time polling system that can handle 10k concurrent voters, built with Express, TypeORM, PostgreSQL, Socket.io, and Redis.

## Features

- REST + WebSocket API for poll management and real-time updates
- JWT-based anonymous authentication
- Rate-limiting for vote protection (5/sec per user, burst-safe)
- Durable data persistence
- Automatic poll expiration
- Horizontal scaling capabilities

## Running with Docker Compose

### Development Environment

For local development with hot-reloading:

```bash
# Start the development environment
docker-compose -f docker-compose.dev.yml up

# Stop containers
docker-compose -f docker-compose.dev.yml down

# Rebuild containers after dependencies change
docker-compose -f docker-compose.dev.yml up --build
```

### Production Environment

For production deployment:

```bash
# Start the production environment
docker-compose up -d

# Scale the application (if using the app-worker service)
docker-compose up -d --scale app-worker=4

# View logs
docker-compose logs -f

# Stop containers
docker-compose down
```

## API Documentation

### Authentication
- `POST /auth/anon`: Get anonymous JWT token
  - Response: `{ token: string, userId: string, expiresIn: string }`

### Polls
- `POST /poll`: Create a new poll
  - Request Body: `{ question: string, options: string[], expiresAt: ISO8601DateTime }`
  - Response: `{ id: string, question: string, options: Array<{ id: string, text: string }>, expiresAt: ISO8601DateTime }`

- `GET /poll/:id`: Get poll details and current tally
  - Response: `{ id: string, question: string, options: Array<{ id: string, text: string, count: number }>, expiresAt: ISO8601DateTime, isActive: boolean, totalVotes: number }`

- `POST /poll/:id/vote`: Cast a vote (requires authentication)
  - Request Headers: `Authorization: Bearer <token>`
  - Request Body: `{ optionId: string }`
  - Response: `{ message: string, pollId: string, optionId: string }`

### WebSockets
- Connect to `/socket.io`
- Join room `poll/:id` to receive real-time updates
- Events:
  - `poll:update`: Receive tally updates (delta format)
  - `poll:closed`: Notifies when poll expires

## Load Testing

To verify that the application can handle 10k concurrent users, a k6 load testing script is provided:

```bash
# Install k6
docker pull grafana/k6

# Run the load test
docker run --rm -i grafana/k6 run - <load-test.js
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| PORT | Application port | 3000 |
| NODE_ENV | Environment (development/production) | development |
| DB_HOST | PostgreSQL host | postgres |
| DB_PORT | PostgreSQL port | 5432 |
| DB_USERNAME | PostgreSQL username | postgres |
| DB_PASSWORD | PostgreSQL password | postgres |
| DB_DATABASE | PostgreSQL database name | team_polls |
| REDIS_HOST | Redis host | redis |
| REDIS_PORT | Redis port | 6379 |
| REDIS_ENABLED | Enable Redis | true |
| JWT_SECRET | JWT signing secret | your_jwt_secret_key |
| JWT_EXPIRY | JWT expiration time | 1h |
| CORS_ORIGIN | CORS allowed origins | * |
| USE_CLUSTER | Use Node.js clustering | false |

## Scaling Strategy

The application is designed to scale horizontally to handle 10k concurrent users:

1. **Multi-container setup**: 
   - Application containers can be scaled with Docker Compose
   - NGINX load balances traffic across containers

2. **WebSocket scaling**:
   - Socket.io with Redis adapter handles WebSocket connections across instances
   - Room-based message distribution for efficient real-time updates

3. **Database optimization**:
   - TypeORM with PostgreSQL provides durable storage
   - Proper indexes and efficient queries
   - Transaction management for data integrity

4. **Caching and rate limiting**:
   - Redis for shared cache and rate limiting across instances
   - Optimized token bucket algorithm for rate control
   - Cache hot poll data for reduced database load

5. **Resilience**:
   - Graceful shutdown handling
   - Container health checks
   - Auto-restart of failed containers
<!-- # Team Polls Application with TypeORM and PostgreSQL

A scalable real-time polling system built with Express, Socket.io, TypeORM, and PostgreSQL that can handle 10k concurrent voters.

## Features

- REST + WebSocket API for poll management and real-time updates
- JWT-based anonymous authentication
- Rate-limiting for vote protection (5/sec per user, burst-safe)
- Automatic poll expiration with configurable expiry time
- Horizontal scaling capabilities to handle 10k concurrent voters

## Project Structure

```
team-polls/
├── src/
│   ├── config/
│   │   └── index.ts
│   ├── controllers/
│   │   ├── AuthController.ts
│   │   └── PollController.ts
│   ├── entities/
│   │   ├── Poll.ts
│   │   ├── PollOption.ts
│   │   └── Vote.ts
│   ├── middlewares/
│   │   ├── authenticate.ts
│   │   ├── errorHandler.ts
│   │   └── rateLimiter.ts
│   ├── routes/
│   │   ├── authRoutes.ts
│   │   └── pollRoutes.ts
│   ├── services/
│   │   ├── PollService.ts
│   │   └── SocketService.ts
│   ├── utils/
│   │   ├── jwt.ts
│   │   └── redis.ts
│   ├── app.ts
│   ├── server.ts
│   └── data-source.ts
├── .env
├── .gitignore
├── package.json
├── tsconfig.json
└── README.md
```

## Prerequisites

- Node.js (v14+)
- PostgreSQL (v12+)
- Redis (for rate limiting and scaling WebSockets)

## Setup Instructions

1. Install dependencies:
   ```bash
   npm install
   ```

2. Set up environment variables in a .env file:
   ```
   PORT=3000
   NODE_ENV=development
   
   # Database
   DB_HOST=localhost
   DB_PORT=5432
   DB_USERNAME=postgres
   DB_PASSWORD=postgres
   DB_DATABASE=team_polls
   
   # Redis
   REDIS_HOST=localhost
   REDIS_PORT=6379
   
   # JWT
   JWT_SECRET=your_jwt_secret_key
   JWT_EXPIRY=1h
   
   # CORS
   CORS_ORIGIN=*
   ```

3. Start PostgreSQL and Redis:
   ```bash
   # Using Docker (recommended)
   docker-compose up -d
   ```

4. Run migrations:
   ```bash
   npm run typeorm:migration:run
   ```

5. Start the server:
   ```bash
   # Development mode
   npm run dev
   
   # Production mode
   npm start
   ```

## API Documentation

### Authentication
- `POST /auth/anon`: Get anonymous JWT token
  - Response: `{ token: string, userId: string, expiresIn: string }`

### Polls
- `POST /poll`: Create a new poll
  - Request Body: `{ question: string, options: string[], expiresAt: ISO8601DateTime }`
  - Response: `{ id: string, question: string, options: Array<{ id: string, text: string }>, expiresAt: ISO8601DateTime }`

- `GET /poll/:id`: Get poll details and current tally
  - Response: `{ id: string, question: string, options: Array<{ id: string, text: string, count: number }>, expiresAt: ISO8601DateTime, isActive: boolean, totalVotes: number }`

- `POST /poll/:id/vote`: Cast a vote (requires authentication)
  - Request Body: `{ optionId: string }`
  - Response: `{ message: string, pollId: string, optionId: string }`

### WebSockets
- Connect to `/socket.io`
- Join room `poll/:id` to receive real-time updates
- Events:
  - `poll:update`: Receive tally updates (delta format)
  - `poll:closed`: Notifies when poll expires

## Scaling Strategy

- Multiple Node.js instances behind a load balancer
- Redis for shared state across instances
- PostgreSQL for durable storage
- Socket.io with Redis adapter for WebSocket scaling -->