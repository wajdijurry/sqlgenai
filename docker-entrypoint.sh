#!/bin/bash
set -e

# Wait for MySQL to be ready
echo "Waiting for MySQL to be ready..."
while ! nc -z mysql 3306; do
  sleep 1
done
echo "MySQL is ready!"

# Database is already migrated, no need to initialize
echo "Database already migrated, skipping initialization"

# Start the Flask application
echo "Starting Flask application..."
exec "$@"
