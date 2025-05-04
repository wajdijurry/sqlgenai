#!/bin/bash
# Script to flush AI caches in SQLGenAI Docker environment
#
# This script runs the flush_cache.py script inside the Docker container
# to ensure proper cache flushing in the containerized environment.
#
# Usage:
#   ./flush_cache.sh [--query] [--explain] [--all] [--verbose]
#
# Options:
#   --query     Flush only the AI query cache
#   --explain   Flush only the AI explain plan cache
#   --all       Flush both caches (default if no options specified)
#   --verbose   Show more detailed output

# Pass all arguments to the flush_cache.py script
ARGS="$@"

# If no arguments provided, use --all
if [ -z "$ARGS" ]; then
    ARGS="--all"
fi

# Add --docker flag to indicate we're running in Docker
ARGS="$ARGS --docker"

echo "Flushing cache in Docker container..."
echo "Running: python -m scripts.flush_cache $ARGS"

# Execute the flush_cache.py script inside the backend container
docker-compose exec backend python -m scripts.flush_cache $ARGS

# Check if the command was successful
if [ $? -eq 0 ]; then
    echo -e "\n✅ Cache flushing completed successfully"
else
    echo -e "\n❌ There was an issue flushing the cache"
    echo "Try running with --verbose for more information"
fi
