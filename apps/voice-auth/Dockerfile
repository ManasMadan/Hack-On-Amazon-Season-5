# Use a lightweight Python base image
FROM python:3.10-slim

# Set working directory
WORKDIR /app

# Copy requirements file
COPY requirements.txt .

# Install system dependencies and Python packages
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    gcc \
    g++ \
    libsndfile1 \
    tzdata \
    libgomp1 && \
    pip install --no-cache-dir -r requirements.txt && \
    apt-get remove -y gcc g++ && \
    apt-get autoremove -y && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/* && \
    ln -sf /usr/share/zoneinfo/Asia/Kolkata /etc/localtime && \
    echo "Asia/Kolkata" > /etc/timezone

# Copy application file
COPY main.py .

# Create directory for persistent storage
RUN mkdir -p /app/data/models

# Expose port 3533
EXPOSE 3533

# Run the FastAPI app
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "3533"]