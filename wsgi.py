import os
import sys
from dotenv import load_dotenv

# Load environment variables from .env file before importing any app modules
print("Loading environment variables from .env file")
load_dotenv(verbose=True)

from app import create_app
application = create_app()

if __name__ == '__main__':
    application.run(debug=True)
