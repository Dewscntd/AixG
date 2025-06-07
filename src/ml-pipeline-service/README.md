# FootAnalytics ML Pipeline Service

A sophisticated event-driven ML pipeline service for football video analysis, built with clean architecture principles and designed for production-scale processing.

## 🏗️ Architecture Overview

The ML Pipeline Service implements a **Pipeline Pattern** with **Event-Driven Architecture**:

```
┌─────────────────────────────────────────────────────────────┐
│                    ML Pipeline Service                      │
├─────────────────────────────────────────────────────────────┤
│  API Layer (FastAPI)                                       │
│  ├── REST Endpoints                                        │
│  ├── WebSocket Progress Updates                            │
│  └── Health Checks                                         │
├─────────────────────────────────────────────────────────────┤
│  Application Layer                                         │
│  ├── Pipeline Orchestrator                                 │
│  ├── Stage Execution Engine                                │
│  └── Progress Tracking                                     │
├─────────────────────────────────────────────────────────────┤
│  Domain Layer                                              │
│  ├── Pipeline Entity (Aggregate Root)                      │
│  ├── Stage Results (Value Objects)                         │
│  ├── Domain Events                                         │
│  └── Processing Configuration                              │
├─────────────────────────────────────────────────────────────┤
│  Infrastructure Layer                                      │
│  ├── Event Publisher (Pulsar)                              │
│  ├── Checkpoint Manager (Redis)                            │
│  ├── Progress Notifier (WebSocket)                         │
│  └── Task Queue (Celery)                                   │
├─────────────────────────────────────────────────────────────┤
│  Pipeline Stages                                           │
│  ├── Video Decoding (FFmpeg)                               │
│  ├── Player Detection (YOLO)                               │
│  ├── Ball Tracking (Computer Vision)                       │
│  ├── Team Classification                                   │
│  ├── Event Detection                                       │
│  ├── Formation Analysis                                    │
│  └── Metrics Calculation                                   │
└─────────────────────────────────────────────────────────────┘
```

## 🎯 Key Features

### 🔄 **Event-Driven Pipeline**
- **Composable Stages**: Modular pipeline stages with clear dependencies
- **Fault Tolerance**: Automatic retry with exponential backoff
- **Checkpoint Recovery**: Resume processing from any stage failure
- **Real-time Progress**: WebSocket updates for live progress tracking

### 🚀 **GPU-Optimized Processing**
- **CUDA Acceleration**: PyTorch with GPU optimization
- **Batch Processing**: Efficient batch inference for video frames
- **Memory Management**: Smart GPU memory allocation and cleanup
- **Model Caching**: Persistent model loading across requests

### 📊 **Production-Ready Features**
- **Horizontal Scaling**: Celery workers with Redis coordination
- **Distributed Locking**: Redis-based coordination for concurrent processing
- **Circuit Breaker**: Resilient external service integration
- **OpenTelemetry**: Comprehensive tracing and monitoring

## 🔧 Pipeline Stages

### 1. **Video Decoding Stage**
```python
class VideoDecodingStage(BaseStage):
    """Extracts frames from video using FFmpeg."""
    
    # Features:
    # - Configurable FPS and resolution
    # - Audio extraction support
    # - Efficient frame extraction
    # - Metadata extraction
```

### 2. **Player Detection Stage**
```python
class PlayerDetectionStage(GPUStage):
    """Detects players using YOLO model."""
    
    # Features:
    # - YOLOv8 integration
    # - GPU batch processing
    # - Confidence filtering
    # - Bounding box optimization
```

### 3. **Ball Tracking Stage**
```python
class BallTrackingStage(GPUStage):
    """Tracks ball across video frames."""
    
    # Features:
    # - Multi-algorithm tracking (Kalman, Particle Filter)
    # - Occlusion handling
    # - Trajectory smoothing
    # - Missing frame interpolation
```

## 🚀 Quick Start

### Prerequisites
- Python 3.10+
- CUDA 11.8+ (for GPU acceleration)
- Redis 6.0+
- Apache Pulsar 2.10+
- FFmpeg 4.4+

### Installation

```bash
# Clone repository
git clone <repository-url>
cd ml-pipeline-service

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Set environment variables
export PULSAR_SERVICE_URL=pulsar://localhost:6650
export REDIS_URL=redis://localhost:6379
export CUDA_VISIBLE_DEVICES=0
```

### Running the Service

```bash
# Start API server
python -m uvicorn api.main:app --host 0.0.0.0 --port 8000 --reload

# Start Celery worker (separate terminal)
python -m celery worker -A infrastructure.celery_app --loglevel=info

# Start Celery beat scheduler (separate terminal)
python -m celery beat -A infrastructure.celery_app --loglevel=info
```

## 📡 API Endpoints

### Process Video
```http
POST /api/v1/process-video
Content-Type: application/json

{
  "video_path": "/path/to/match_video.mp4",
  "model_version": "v1.0.0",
  "batch_size": 8,
  "gpu_enabled": true,
  "checkpoint_enabled": true,
  "stage_configs": {
    "player_detection": {
      "confidence_threshold": 0.7,
      "nms_threshold": 0.4
    },
    "ball_tracking": {
      "tracking_method": "kalman",
      "max_missing_frames": 10
    }
  }
}
```

### Get Pipeline Status
```http
GET /api/v1/pipeline/{pipeline_id}/status
```

### WebSocket Progress Updates
```javascript
const ws = new WebSocket('ws://localhost:8765');

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('Progress update:', data);
  
  // Message types:
  // - stage_started
  // - stage_completed
  // - stage_failed
  // - pipeline_completed
};
```

## 🐳 Docker Deployment

### Development
```bash
# Build development image
docker build --target development -t ml-pipeline:dev .

# Run with GPU support
docker run --gpus all -p 8000:8000 -p 8765:8765 ml-pipeline:dev
```

### Production
```bash
# Build production images
docker build --target production -t ml-pipeline:api .
docker build --target worker -t ml-pipeline:worker .
docker build --target beat -t ml-pipeline:beat .

# Run with docker-compose
docker-compose up -d
```

## 🧪 Testing

```bash
# Run all tests
pytest

# Run with coverage
pytest --cov=src --cov-report=html

# Run specific test categories
pytest tests/test_pipeline.py -v
pytest tests/test_stages.py -v
pytest tests/test_api.py -v

# Run performance tests
pytest tests/test_performance.py --benchmark-only
```

## 📊 Monitoring & Observability

### Metrics
- **Pipeline Throughput**: Videos processed per hour
- **Stage Performance**: Processing time per stage
- **GPU Utilization**: Memory and compute usage
- **Error Rates**: Failure rates by stage and error type

### Tracing
```python
# OpenTelemetry integration
from opentelemetry import trace

tracer = trace.get_tracer(__name__)

with tracer.start_as_current_span("video_processing"):
    # Processing logic with automatic tracing
    pass
```

### Health Checks
```http
GET /health
```

## 🔧 Configuration

### Environment Variables
```bash
# Service Configuration
ML_PIPELINE_PORT=8000
ML_PIPELINE_WORKERS=4
ML_PIPELINE_LOG_LEVEL=INFO

# GPU Configuration
CUDA_VISIBLE_DEVICES=0,1
GPU_MEMORY_FRACTION=0.8

# Infrastructure
PULSAR_SERVICE_URL=pulsar://localhost:6650
REDIS_URL=redis://localhost:6379
CELERY_BROKER_URL=redis://localhost:6379/0

# Model Configuration
MODEL_CACHE_DIR=/models
YOLO_MODEL_PATH=/models/yolov8n.pt
CHECKPOINT_TTL_SECONDS=604800  # 7 days
```

### Stage Configuration
```python
stage_configs = {
    "video_decoding": {
        "target_fps": 30,
        "target_resolution": [1920, 1080],
        "extract_audio": False
    },
    "player_detection": {
        "model_name": "yolov8n.pt",
        "confidence_threshold": 0.5,
        "nms_threshold": 0.4,
        "batch_size": 8
    },
    "ball_tracking": {
        "tracking_method": "kalman",
        "min_ball_radius": 5,
        "max_ball_radius": 50,
        "max_missing_frames": 10
    }
}
```

## 🚀 Performance Optimization

### GPU Optimization
- **Model Quantization**: INT8 quantization for faster inference
- **TensorRT**: NVIDIA TensorRT optimization
- **Batch Processing**: Optimal batch sizes for GPU memory
- **Memory Pooling**: Efficient GPU memory management

### Scaling Strategies
- **Horizontal Scaling**: Multiple Celery workers
- **Load Balancing**: Round-robin task distribution
- **Resource Isolation**: GPU allocation per worker
- **Queue Prioritization**: High-priority video processing

## 🤝 Contributing

1. **Follow Clean Architecture**: Maintain separation of concerns
2. **Write Tests**: Comprehensive unit and integration tests
3. **Document Changes**: Update API documentation
4. **Performance Testing**: Benchmark critical paths
5. **GPU Testing**: Test with and without GPU acceleration

## 📚 Additional Documentation

- [Pipeline Stage Development Guide](./docs/stage-development.md)
- [GPU Optimization Guide](./docs/gpu-optimization.md)
- [Deployment Guide](./docs/deployment.md)
- [API Reference](./docs/api-reference.md)
- [Troubleshooting Guide](./docs/troubleshooting.md)

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

---

**Built with ❤️ for FootAnalytics - AI-powered football video analysis platform**
