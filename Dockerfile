FROM python:3.9-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    pkg-config \
    libssl-dev \
    libffi-dev \
    python3-dev \
    default-libmysqlclient-dev \
    libmariadb-dev \
    apache2-dev \
    git \
    libpq-dev \
    gcc \
    g++ \
    gnupg \
    curl \
    netcat-openbsd \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*
    
# Install Microsoft ODBC Driver for SQL Server (using a different approach)
RUN curl https://packages.microsoft.com/keys/microsoft.asc | apt-key add - \
    && curl https://packages.microsoft.com/config/debian/11/prod.list > /etc/apt/sources.list.d/mssql-release.list \
    && apt-get update \
    && apt-get install -y --no-install-recommends \
        unixodbc-dev \
    && ACCEPT_EULA=Y apt-get install -y --no-install-recommends \
        msodbcsql17 \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Install Oracle Instant Client
RUN apt-get update && apt-get install -y libaio1 wget unzip \
    && mkdir -p /opt/oracle \
    && cd /opt/oracle \
    && wget https://download.oracle.com/otn_software/linux/instantclient/instantclient-basiclite-linuxx64.zip \
    && unzip instantclient-basiclite-linuxx64.zip \
    && rm -f instantclient-basiclite-linuxx64.zip \
    && cd /opt/oracle/instantclient* \
    && echo /opt/oracle/instantclient* > /etc/ld.so.conf.d/oracle-instantclient.conf \
    && ldconfig \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Set Oracle environment variables
ENV LD_LIBRARY_PATH=/opt/oracle/instantclient_21_10:$LD_LIBRARY_PATH

# Install dependencies from requirements.txt
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Expose port for Flask
EXPOSE 5000

# Set environment variables
ENV FLASK_APP=wsgi.py
ENV FLASK_ENV=development
ENV FLASK_DEBUG=1
ENV PYTHONUNBUFFERED=1

# Make the entrypoint script executable
RUN chmod +x /app/docker-entrypoint.sh

# Set the entrypoint
ENTRYPOINT ["/app/docker-entrypoint.sh"]

# Run the application
CMD ["flask", "run", "--host=0.0.0.0"]
