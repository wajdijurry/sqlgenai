#!/bin/bash
# Flush AI caches script for SQLGenAI (shell version)
# This script can be run inside the Docker container

# Set the working directory
cd /app

# Import the Flask app context
python -c "
from app import create_app
from app.utils.cache import AIQueryCache, AIExplainCache

app = create_app()
with app.app_context():
    print('Flushing AI query cache...')
    query_result = AIQueryCache.flush_cache()
    
    print('Flushing AI explain plan cache...')
    explain_result = AIExplainCache.flush_cache()
    
    if query_result and explain_result:
        print('✅ All caches flushed successfully')
    else:
        print('⚠️ There were issues flushing some caches')
        exit(1)
"

exit $?
