# Use Python Alpine for small image size
FROM python:3.12-alpine

# Set working directory
WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application files
COPY server.py .
COPY templates/ ./templates/
COPY static/ ./static/

# Expose port
EXPOSE 8080

# Run the server
CMD ["python", "server.py"]
