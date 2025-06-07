import asyncio
import logging
from contextlib import asynccontextmanager
from typing import Dict, Any, Optional

from fastapi import FastAPI, HTTPException, BackgroundTasks, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import uvicorn

from ..application.pipeline_orchestrator import PipelineOrchestrator
from ..domain.entities.pipeline import PipelineConfiguration
from ..domain.value_objects.video_id import VideoId
from ..infrastructure.event_publisher import PulsarEventPublisher, InMemoryEventPublisher
from ..infrastructure.checkpoint_manager import RedisCheckpointManager, InMemoryCheckpointManager
from ..infrastructure.progress_notifier import WebSocketProgressNotifier, LoggingProgressNotifier, CompositeProgressNotifier
from ..stages.video_decoding_stage import VideoDecodingStage
from ..stages.player_detection_stage import PlayerDetectionStage
from ..stages.ball_tracking_stage import BallTrackingStage
from .models import ProcessVideoRequest, ProcessVideoResponse, PipelineStatusResponse
from .dependencies import get_pipeline_orchestrator, get_logger


# Global state
app_state = {}


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager."""
    logger = logging.getLogger(__name__)
    
    try:
        # Initialize infrastructure components
        logger.info("Initializing ML Pipeline Service...")
        
        # Event publisher
        if app.state.use_in_memory:
            event_publisher = InMemoryEventPublisher()
        else:
            event_publisher = PulsarEventPublisher(
                pulsar_url=app.state.pulsar_url,
                topic_prefix="ml-pipeline"
            )
            await event_publisher.initialize()
        
        # Checkpoint manager
        if app.state.use_in_memory:
            checkpoint_manager = InMemoryCheckpointManager()
        else:
            checkpoint_manager = RedisCheckpointManager(
                redis_url=app.state.redis_url,
                key_prefix="ml-pipeline:checkpoint"
            )
            await checkpoint_manager.initialize()
        
        # Progress notifier
        websocket_notifier = WebSocketProgressNotifier(
            host="0.0.0.0",
            port=app.state.websocket_port
        )
        logging_notifier = LoggingProgressNotifier()
        progress_notifier = CompositeProgressNotifier([websocket_notifier, logging_notifier])
        
        # Start WebSocket server
        await websocket_notifier.start_server()
        
        # Pipeline orchestrator
        orchestrator = PipelineOrchestrator(
            event_publisher=event_publisher,
            checkpoint_manager=checkpoint_manager,
            progress_notifier=progress_notifier,
            logger=logger
        )
        
        # Store in app state
        app.state.event_publisher = event_publisher
        app.state.checkpoint_manager = checkpoint_manager
        app.state.progress_notifier = progress_notifier
        app.state.orchestrator = orchestrator
        
        logger.info("ML Pipeline Service initialized successfully")
        
        yield
        
    finally:
        # Cleanup
        logger.info("Shutting down ML Pipeline Service...")
        
        try:
            if hasattr(app.state, 'progress_notifier'):
                if hasattr(app.state.progress_notifier, '_notifiers'):
                    for notifier in app.state.progress_notifier._notifiers:
                        if hasattr(notifier, 'stop_server'):
                            await notifier.stop_server()
            
            if hasattr(app.state, 'event_publisher') and hasattr(app.state.event_publisher, 'close'):
                await app.state.event_publisher.close()
            
            if hasattr(app.state, 'checkpoint_manager') and hasattr(app.state.checkpoint_manager, 'close'):
                await app.state.checkpoint_manager.close()
                
        except Exception as e:
            logger.error(f"Error during cleanup: {e}")
        
        logger.info("ML Pipeline Service shutdown complete")


def create_app(
    pulsar_url: str = "pulsar://localhost:6650",
    redis_url: str = "redis://localhost:6379",
    websocket_port: int = 8765,
    use_in_memory: bool = False
) -> FastAPI:
    """Create FastAPI application with configuration."""
    
    app = FastAPI(
        title="FootAnalytics ML Pipeline Service",
        description="AI-powered video analysis pipeline for football match videos",
        version="1.0.0",
        lifespan=lifespan
    )
    
    # Store configuration in app state
    app.state.pulsar_url = pulsar_url
    app.state.redis_url = redis_url
    app.state.websocket_port = websocket_port
    app.state.use_in_memory = use_in_memory
    
    # CORS middleware
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],  # Configure appropriately for production
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    
    return app


# Create app instance
app = create_app()


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "service": "ml-pipeline-service",
        "version": "1.0.0",
        "timestamp": "2024-01-01T00:00:00Z"
    }


@app.post("/api/v1/process-video", response_model=ProcessVideoResponse)
async def process_video(
    request: ProcessVideoRequest,
    background_tasks: BackgroundTasks,
    orchestrator: PipelineOrchestrator = Depends(get_pipeline_orchestrator),
    logger: logging.Logger = Depends(get_logger)
):
    """
    Start video processing pipeline.
    
    Args:
        request: Video processing request
        background_tasks: FastAPI background tasks
        orchestrator: Pipeline orchestrator dependency
        logger: Logger dependency
        
    Returns:
        Processing response with pipeline ID
    """
    try:
        logger.info(f"Starting video processing for video: {request.video_path}")
        
        # Create video ID
        video_id = VideoId.generate()
        
        # Create pipeline configuration
        configuration = PipelineConfiguration(
            model_version=request.model_version,
            batch_size=request.batch_size,
            gpu_enabled=request.gpu_enabled,
            checkpoint_enabled=request.checkpoint_enabled,
            max_retries=request.max_retries,
            timeout_seconds=request.timeout_seconds,
            stage_configs=request.stage_configs or {}
        )
        
        # Create pipeline stages
        stages = [
            VideoDecodingStage(),
            PlayerDetectionStage(),
            BallTrackingStage(),
            # Add more stages as needed
        ]
        
        # Start pipeline in background
        background_tasks.add_task(
            _execute_pipeline_background,
            orchestrator,
            video_id,
            request.video_path,
            configuration,
            stages,
            logger
        )
        
        return ProcessVideoResponse(
            pipeline_id=str(video_id),  # Using video_id as pipeline_id for simplicity
            video_id=str(video_id),
            status="started",
            message="Video processing pipeline started successfully"
        )
        
    except Exception as e:
        logger.error(f"Failed to start video processing: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to start processing: {str(e)}")


@app.get("/api/v1/pipeline/{pipeline_id}/status", response_model=PipelineStatusResponse)
async def get_pipeline_status(
    pipeline_id: str,
    orchestrator: PipelineOrchestrator = Depends(get_pipeline_orchestrator),
    logger: logging.Logger = Depends(get_logger)
):
    """
    Get pipeline processing status.
    
    Args:
        pipeline_id: Pipeline identifier
        orchestrator: Pipeline orchestrator dependency
        logger: Logger dependency
        
    Returns:
        Pipeline status information
    """
    try:
        status = await orchestrator.get_pipeline_status(pipeline_id)
        
        if not status:
            raise HTTPException(status_code=404, detail="Pipeline not found")
        
        return PipelineStatusResponse(**status)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get pipeline status: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to get status: {str(e)}")


@app.post("/api/v1/pipeline/{pipeline_id}/cancel")
async def cancel_pipeline(
    pipeline_id: str,
    reason: str = "User requested cancellation",
    orchestrator: PipelineOrchestrator = Depends(get_pipeline_orchestrator),
    logger: logging.Logger = Depends(get_logger)
):
    """
    Cancel a running pipeline.
    
    Args:
        pipeline_id: Pipeline identifier
        reason: Cancellation reason
        orchestrator: Pipeline orchestrator dependency
        logger: Logger dependency
        
    Returns:
        Cancellation confirmation
    """
    try:
        await orchestrator.cancel_pipeline(pipeline_id, reason)
        
        return {
            "pipeline_id": pipeline_id,
            "status": "cancelled",
            "reason": reason,
            "message": "Pipeline cancelled successfully"
        }
        
    except Exception as e:
        logger.error(f"Failed to cancel pipeline: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to cancel pipeline: {str(e)}")


@app.get("/api/v1/models/active")
async def get_active_models():
    """Get information about active ML models."""
    return {
        "models": {
            "player_detection": {
                "name": "YOLOv8n",
                "version": "8.0.0",
                "status": "active"
            },
            "ball_tracking": {
                "name": "Custom Ball Detector",
                "version": "1.0.0",
                "status": "active"
            }
        }
    }


async def _execute_pipeline_background(
    orchestrator: PipelineOrchestrator,
    video_id: VideoId,
    video_path: str,
    configuration: PipelineConfiguration,
    stages: list,
    logger: logging.Logger
):
    """Execute pipeline in background task."""
    try:
        pipeline = await orchestrator.execute_pipeline(
            video_id=video_id,
            video_path=video_path,
            configuration=configuration,
            stages=stages
        )
        
        logger.info(f"Pipeline {pipeline.id.value} completed with status: {pipeline.status}")
        
    except Exception as e:
        logger.error(f"Pipeline execution failed: {e}", exc_info=True)


if __name__ == "__main__":
    # Configure logging
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
    )
    
    # Run application
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )
