# Multi-stage build for ML Pipeline Service
FROM nvidia/cuda:11.8-devel-ubuntu22.04 AS base

# Set environment variables
ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1
ENV DEBIAN_FRONTEND=noninteractive

# Install system dependencies
RUN apt-get update && apt-get install -y \
    python3.10 \
    python3.10-dev \
    python3-pip \
    ffmpeg \
    libsm6 \
    libxext6 \
    libxrender-dev \
    libglib2.0-0 \
    libgtk-3-0 \
    libgl1-mesa-glx \
    libglib2.0-0 \
    curl \
    wget \
    git \
    && rm -rf /var/lib/apt/lists/*

# Create symbolic link for python
RUN ln -s /usr/bin/python3.10 /usr/bin/python

# Upgrade pip
RUN python -m pip install --upgrade pip

# Set working directory
WORKDIR /app

# Copy requirements first for better caching
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Install PyTorch with CUDA support
RUN pip install torch==2.1.1+cu118 torchvision==0.16.1+cu118 \
    --index-url https://download.pytorch.org/whl/cu118

# Development stage
FROM base AS development

# Install development dependencies
RUN pip install --no-cache-dir \
    jupyter \
    ipython \
    notebook \
    jupyterlab

# Copy source code
COPY . .

# Create non-root user
RUN useradd --create-home --shell /bin/bash mlpipeline
RUN chown -R mlpipeline:mlpipeline /app
USER mlpipeline

# Expose ports
EXPOSE 8000 8765

# Default command for development
CMD ["python", "-m", "uvicorn", "api.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]

# Production stage
FROM base AS production

# Copy source code
COPY . .

# Create non-root user
RUN useradd --create-home --shell /bin/bash mlpipeline
RUN chown -R mlpipeline:mlpipeline /app

# Create directories for temporary files
RUN mkdir -p /tmp/video_processing && \
    chown -R mlpipeline:mlpipeline /tmp/video_processing

USER mlpipeline

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# Expose ports
EXPOSE 8000 8765

# Default command for production
CMD ["python", "-m", "uvicorn", "api.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "4"]

# Worker stage for Celery
FROM production AS worker

# Override command for Celery worker
CMD ["python", "-m", "celery", "worker", "-A", "infrastructure.celery_app", "--loglevel=info", "--concurrency=2"]

# Beat stage for Celery scheduler
FROM production AS beat

# Override command for Celery beat
CMD ["python", "-m", "celery", "beat", "-A", "infrastructure.celery_app", "--loglevel=info"]
