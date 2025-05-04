import os
import sys
import pathlib
from dotenv import load_dotenv

# Get the absolute path to the .env file
base_dir = pathlib.Path(__file__).parent.absolute()
env_path = base_dir / '.env'

# Debug information
print(f"Current working directory: {os.getcwd()}")
print(f"Looking for .env file at: {env_path}")
print(f"File exists: {env_path.exists()}")

# Load environment variables from .env file before importing any app modules
print("Loading environment variables from .env file")
load_dotenv(dotenv_path=str(env_path), verbose=True)

# Debug: Print all environment variables (excluding sensitive ones)
print("Environment variables after loading .env:")
for key in sorted(os.environ.keys()):
    if key not in ['SECRET_KEY', 'DATABASE_URL', 'STRIPE_SECRET_KEY', 'OPENAI_API_KEY', 'GOOGLE_CLIENT_SECRET']:
        print(f"  {key}={os.environ.get(key)}")
    else:
        print(f"  {key}=*****")

from app import create_app
application = create_app()

if __name__ == '__main__':
    application.run(debug=True)
