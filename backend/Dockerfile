FROM python:3.11-slim

# Install Node.js
RUN apt-get update && apt-get install -y curl
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
RUN apt-get install -y nodejs

# Set working directory
WORKDIR /app

# Copy requirements and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy package.json and install Node dependencies
COPY package.json .
RUN npm install

# Copy the rest of the backend code
COPY . .

# Run Django migrations and start Daphne (ASGI) for WebSocket support
CMD python manage.py migrate && daphne -b 0.0.0.0 -p ${PORT:-8000} vulnbridge_project.asgi:application
