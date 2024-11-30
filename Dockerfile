# Use the official Python image from Docker Hub
FROM python:3.9

# Set the working directory in the container
WORKDIR /app

# Copy the current directory contents into the container at /app
COPY . /app

# Install system dependencies (if any are required)
RUN apt-get update && apt-get install -y --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Expose the application port for Cloud Run
EXPOSE 5328

# Command to run the application with Gunicorn
CMD ["gunicorn", "api.index:app", "--bind", "0.0.0.0:5328", "--workers", "2", "--threads", "4", "--timeout", "300"]
