#!/bin/sh

# Wait for PostgreSQL to be ready
echo "Waiting for PostgreSQL to start..."
until wget -O- -q postgres:5432 >/dev/null 2>&1; do
  echo "PostgreSQL is unavailable - sleeping"
  sleep 1
done
echo "PostgreSQL is up - proceeding with database initialization"

# Run migrations
echo "Running database migrations..."
npm run typeorm:migration:run

# Start the application
echo "Starting application..."
exec "$@"