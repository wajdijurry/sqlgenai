# SQLGenAI - Web Edition

A modern web-based SQL query generator powered by AI models (OpenAI GPT and DeepSeek R1) with direct support for multiple database types through SQLAlchemy.

## Features

- Connect to multiple SQL database types (MySQL, PostgreSQL, SQL Server, etc.)
- Generate SQL queries from natural language using AI models
- Modern, responsive UI
- User subscription management with multiple plans
- Secure authentication and authorization
- Database schema visualization and exploration

## Technology Stack

- **Backend**: Python with Flask framework
- **Database Connections**: SQLAlchemy with direct database drivers
- **AI Models**: OpenAI GPT and DeepSeek R1
- **Web Server**: Apache with mod_wsgi
- **Frontend**: HTML5, CSS3, JavaScript with modern frameworks
- **Payment Processing**: Stripe (simulated)

## Installation

1. Clone the repository:
```bash
git clone git@github.com:wajdijurry/sqlgenai.git
cd sqlgenai
```

2. Create a virtual environment and activate it:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. Install dependencies:
```bash
pip install -r requirements.txt
```

4. Set up environment variables:
```bash
cp .env.example .env
# Edit .env file with your configuration
```

5. Initialize the database:
```bash
flask db init
flask db migrate
flask db upgrade
```

6. Run the development server:
```bash
flask run
```

## Deployment with Apache

See the `docs/apache_deployment.md` file for detailed instructions on deploying with Apache web server.

## License

Proprietary. All rights reserved.
