FROM python:3.12-slim

# Prevent Python from writing .pyc files and enable unbuffered output
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

# Install minimal OS dependencies for network tools, compilation and fonts
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    build-essential \
    fontconfig \
    fonts-liberation \
    fonts-dejavu \
    fonts-roboto \
    fonts-noto-core \
    fonts-inter \
    fonts-open-sans \
    fonts-lato \
    && rm -rf /var/lib/apt/lists/*

# Install python dependencies
COPY pyproject.toml .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir ".[dev]"

# Copy application source code
COPY . .

EXPOSE 8000

# Default command for development reload
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
