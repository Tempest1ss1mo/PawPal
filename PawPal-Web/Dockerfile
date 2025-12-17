FROM python:3.11-slim

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application files
COPY app.py .
COPY templates templates/
COPY static static/

# Set environment variables
ENV PORT=8080
ENV FLASK_DEBUG=False

# Run with gunicorn
CMD exec gunicorn --bind :$PORT --workers 1 --threads 8 app:app