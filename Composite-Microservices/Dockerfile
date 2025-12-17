FROM python:3.11-slim

WORKDIR /app

# Copy requirements and install dependencies
COPY pawpal-composite-service/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Copy models directory (shared across services)
COPY models ./models

# Copy composite service code
COPY pawpal-composite-service/*.py ./
COPY pawpal-composite-service/clients ./clients
COPY pawpal-composite-service/services ./services

# Set environment variables
ENV PORT=8080

# Run the application
CMD exec uvicorn main:app --host 0.0.0.0 --port $PORT
