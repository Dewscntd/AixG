import os
import logging
from typing import Dict, Any, Optional
from celery import Celery, Task
from celery.signals import worker_ready, worker_shutdown
from kombu import Queue

from ..domain.value_objects.video_id import VideoId
from ..domain.entities.pipeline import PipelineConfiguration
from ..application.pipeline_orchestrator import PipelineOrchestrator
from ..infrastructure.event_publisher import PulsarEventPublisher
from ..infrastructure.checkpoint_manager import RedisCheckpointManager
from ..infrastructure.progress_notifier import LoggingProgressNotifier
from ..stages.video_decoding_stage import VideoDecodingStage
from ..stages.player_detection_stage import PlayerDetectionStage
from ..stages.ball_tracking_stage import BallTrackingStage


# Celery configuration
CELERY_BROKER_URL = os.getenv('CELERY_BROKER_URL', 'redis://localhost:6379/0')
CELERY_RESULT_BACKEND = os.getenv('CELERY_RESULT_BACKEND', 'redis://localhost:6379/0')
PULSAR_URL = os.getenv('PULSAR_SERVICE_URL', 'pulsar://localhost:6650')
REDIS_URL = os.getenv('REDIS_URL', 'redis://localhost:6379')


# Create Celery app
celery_app = Celery(
    'ml_pipeline',
    broker=CELERY_BROKER_URL,
    backend=CELERY_RESULT_BACKEND,
    include=['ml_pipeline_service.infrastructure.celery_tasks']
)

# Celery configuration
celery_app.conf.update(
    # Task routing
    task_routes={
        'ml_pipeline.process_video': {'queue': 'video_processing'},
        'ml_pipeline.process_stage': {'queue': 'stage_processing'},
        'ml_pipeline.cleanup_pipeline': {'queue': 'cleanup'}
    },
    
    # Queue configuration
    task_default_queue='default',
    task_queues=(
        Queue('video_processing', routing_key='video_processing'),
        Queue('stage_processing', routing_key='stage_processing'),
        Queue('cleanup', routing_key='cleanup'),
    ),
    
    # Task execution
    task_serializer='json',
    accept_content=['json'],
    result_serializer='json',
    timezone='UTC',
    enable_utc=True,
    
    # Task timeouts and retries
    task_soft_time_limit=3600,  # 1 hour soft limit
    task_time_limit=7200,       # 2 hour hard limit
    task_acks_late=True,
    worker_prefetch_multiplier=1,
    
    # Result backend settings
    result_expires=86400,  # 24 hours
    result_persistent=True,
    
    # Worker settings
    worker_max_tasks_per_child=100,
    worker_disable_rate_limits=True,
    
    # Monitoring
    worker_send_task_events=True,
    task_send_sent_event=True,
)


class MLPipelineTask(Task):
    """
    Base task class for ML pipeline tasks.
    Provides common functionality and error handling.
    """
    
    def __init__(self):
        self._orchestrator: Optional[PipelineOrchestrator] = None
        self._logger = logging.getLogger(self.__class__.__name__)
    
    @property
    def orchestrator(self) -> PipelineOrchestrator:
        """Get or create pipeline orchestrator."""
        if not self._orchestrator:
            # Initialize infrastructure components
            event_publisher = PulsarEventPublisher(pulsar_url=PULSAR_URL)
            checkpoint_manager = RedisCheckpointManager(redis_url=REDIS_URL)
            progress_notifier = LoggingProgressNotifier()
            
            self._orchestrator = PipelineOrchestrator(
                event_publisher=event_publisher,
                checkpoint_manager=checkpoint_manager,
                progress_notifier=progress_notifier,
                logger=self._logger
            )
        
        return self._orchestrator
    
    def on_failure(self, exc, task_id, args, kwargs, einfo):
        """Handle task failure."""
        self._logger.error(f"Task {task_id} failed: {exc}", exc_info=einfo)
        
        # Try to update pipeline status if possible
        try:
            if 'pipeline_id' in kwargs:
                pipeline_id = kwargs['pipeline_id']
                # Could implement pipeline failure notification here
                self._logger.info(f"Marking pipeline {pipeline_id} as failed")
        except Exception as e:
            self._logger.error(f"Failed to handle task failure: {e}")
    
    def on_retry(self, exc, task_id, args, kwargs, einfo):
        """Handle task retry."""
        self._logger.warning(f"Task {task_id} retrying due to: {exc}")
    
    def on_success(self, retval, task_id, args, kwargs):
        """Handle task success."""
        self._logger.info(f"Task {task_id} completed successfully")


@celery_app.task(bind=True, base=MLPipelineTask, name='ml_pipeline.process_video')
def process_video_task(
    self,
    video_id: str,
    video_path: str,
    configuration: Dict[str, Any],
    pipeline_id: Optional[str] = None
) -> Dict[str, Any]:
    """
    Celery task to process a video through the ML pipeline.
    
    Args:
        video_id: Video identifier
        video_path: Path to video file
        configuration: Pipeline configuration
        pipeline_id: Optional pipeline identifier for recovery
        
    Returns:
        Processing result
    """
    try:
        self._logger.info(f"Starting video processing task for video {video_id}")
        
        # Convert configuration dict to PipelineConfiguration
        config = PipelineConfiguration(
            model_version=configuration.get('model_version', 'v1.0.0'),
            batch_size=configuration.get('batch_size', 8),
            gpu_enabled=configuration.get('gpu_enabled', True),
            checkpoint_enabled=configuration.get('checkpoint_enabled', True),
            max_retries=configuration.get('max_retries', 3),
            timeout_seconds=configuration.get('timeout_seconds', 3600),
            stage_configs=configuration.get('stage_configs', {})
        )
        
        # Create pipeline stages
        stages = [
            VideoDecodingStage(),
            PlayerDetectionStage(),
            BallTrackingStage(),
        ]
        
        # Execute pipeline
        video_id_obj = VideoId.from_string(video_id)
        
        # Use asyncio to run the async orchestrator
        import asyncio
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
        try:
            pipeline = loop.run_until_complete(
                self.orchestrator.execute_pipeline(
                    video_id=video_id_obj,
                    video_path=video_path,
                    configuration=config,
                    stages=stages
                )
            )
            
            result = {
                'pipeline_id': pipeline.id.value,
                'video_id': video_id,
                'status': pipeline.status.value,
                'progress_percentage': pipeline.progress_percentage,
                'stage_results': {
                    name: {
                        'status': result.status.value,
                        'processing_time_ms': result.processing_time_ms,
                        'error_message': result.error_message
                    }
                    for name, result in pipeline.stage_results.items()
                }
            }
            
            self._logger.info(f"Video processing completed for video {video_id}")
            return result
            
        finally:
            loop.close()
    
    except Exception as e:
        self._logger.error(f"Video processing failed for video {video_id}: {e}", exc_info=True)
        raise


@celery_app.task(bind=True, base=MLPipelineTask, name='ml_pipeline.process_stage')
def process_stage_task(
    self,
    pipeline_id: str,
    stage_name: str,
    input_data: Dict[str, Any],
    stage_config: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Celery task to process a single pipeline stage.
    
    Args:
        pipeline_id: Pipeline identifier
        stage_name: Name of stage to process
        input_data: Input data for stage
        stage_config: Stage configuration
        
    Returns:
        Stage processing result
    """
    try:
        self._logger.info(f"Starting stage processing task: {stage_name} for pipeline {pipeline_id}")
        
        # Create stage instance based on name
        stage_map = {
            'video_decoding': VideoDecodingStage(),
            'player_detection': PlayerDetectionStage(),
            'ball_tracking': BallTrackingStage(),
        }
        
        if stage_name not in stage_map:
            raise ValueError(f"Unknown stage: {stage_name}")
        
        stage = stage_map[stage_name]
        
        # Process stage
        import asyncio
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
        try:
            result = loop.run_until_complete(
                stage.process(input_data, stage_config)
            )
            
            stage_result = {
                'stage_name': result.stage_name,
                'status': result.status.value,
                'output_data': result.output_data,
                'metadata': result.metadata,
                'processing_time_ms': result.processing_time_ms,
                'error_message': result.error_message
            }
            
            self._logger.info(f"Stage processing completed: {stage_name}")
            return stage_result
            
        finally:
            loop.close()
    
    except Exception as e:
        self._logger.error(f"Stage processing failed: {stage_name} for pipeline {pipeline_id}: {e}", exc_info=True)
        raise


@celery_app.task(bind=True, base=MLPipelineTask, name='ml_pipeline.cleanup_pipeline')
def cleanup_pipeline_task(self, pipeline_id: str) -> Dict[str, Any]:
    """
    Celery task to cleanup pipeline resources.
    
    Args:
        pipeline_id: Pipeline identifier
        
    Returns:
        Cleanup result
    """
    try:
        self._logger.info(f"Starting cleanup task for pipeline {pipeline_id}")
        
        # Cleanup logic here
        # - Remove temporary files
        # - Clear cache entries
        # - Delete old checkpoints
        
        import asyncio
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
        try:
            # Example cleanup operations
            checkpoint_manager = self.orchestrator._checkpoint_manager
            loop.run_until_complete(
                checkpoint_manager.delete_checkpoint(pipeline_id)
            )
            
            result = {
                'pipeline_id': pipeline_id,
                'status': 'cleaned',
                'message': 'Pipeline resources cleaned up successfully'
            }
            
            self._logger.info(f"Cleanup completed for pipeline {pipeline_id}")
            return result
            
        finally:
            loop.close()
    
    except Exception as e:
        self._logger.error(f"Cleanup failed for pipeline {pipeline_id}: {e}", exc_info=True)
        raise


@worker_ready.connect
def worker_ready_handler(sender=None, **kwargs):
    """Handle worker ready signal."""
    logger = logging.getLogger(__name__)
    logger.info("ML Pipeline Celery worker is ready")


@worker_shutdown.connect
def worker_shutdown_handler(sender=None, **kwargs):
    """Handle worker shutdown signal."""
    logger = logging.getLogger(__name__)
    logger.info("ML Pipeline Celery worker is shutting down")


if __name__ == '__main__':
    # Configure logging
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
    )
    
    # Start worker
    celery_app.start()
