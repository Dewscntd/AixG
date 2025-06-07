import asyncio
from typing import Dict, Any, List, Optional, Callable
import logging
from datetime import datetime

from ..domain.entities.pipeline import Pipeline, PipelineConfiguration, PipelineStage, PipelineStatus
from ..domain.value_objects.video_id import VideoId
from ..domain.events.domain_event import DomainEvent
from ..infrastructure.event_publisher import EventPublisher
from ..infrastructure.checkpoint_manager import CheckpointManager
from ..infrastructure.progress_notifier import ProgressNotifier


class PipelineOrchestrator:
    """
    Orchestrates the execution of ML pipeline stages with fault tolerance,
    checkpoint recovery, and real-time progress updates.
    """
    
    def __init__(
        self,
        event_publisher: EventPublisher,
        checkpoint_manager: CheckpointManager,
        progress_notifier: ProgressNotifier,
        logger: Optional[logging.Logger] = None
    ):
        self._event_publisher = event_publisher
        self._checkpoint_manager = checkpoint_manager
        self._progress_notifier = progress_notifier
        self._logger = logger or logging.getLogger(__name__)
        self._active_pipelines: Dict[str, Pipeline] = {}
        self._stage_executors: Dict[str, Callable] = {}
    
    async def execute_pipeline(
        self,
        video_id: VideoId,
        video_path: str,
        configuration: PipelineConfiguration,
        stages: List[PipelineStage]
    ) -> Pipeline:
        """
        Execute a complete ML pipeline for video analysis.
        
        Args:
            video_id: Unique identifier for the video
            video_path: Path to the video file
            configuration: Pipeline configuration
            stages: List of pipeline stages to execute
            
        Returns:
            Completed Pipeline entity
        """
        # Create pipeline
        pipeline = Pipeline.create_for_video(video_id, configuration, stages)
        self._active_pipelines[pipeline.id.value] = pipeline
        
        try:
            self._logger.info(f"Starting pipeline {pipeline.id.value} for video {video_id.value}")
            
            # Start pipeline
            pipeline.start_processing()
            await self._publish_domain_events(pipeline)
            
            # Create initial input data
            input_data = {'video_path': video_path}
            
            # Execute stages sequentially
            for stage in stages:
                if pipeline.status != PipelineStatus.RUNNING:
                    break
                
                await self._execute_stage(pipeline, stage, input_data, configuration)
                
                # Save checkpoint after each stage
                if configuration.checkpoint_enabled:
                    await self._save_checkpoint(pipeline)
                
                # Update input data for next stage
                if stage.name in pipeline.stage_results:
                    stage_result = pipeline.stage_results[stage.name]
                    input_data.update(stage_result.output_data)
            
            # Pipeline completed successfully
            if pipeline.status == PipelineStatus.RUNNING:
                pipeline.complete_pipeline()
                await self._publish_domain_events(pipeline)
            
            self._logger.info(f"Pipeline {pipeline.id.value} completed with status: {pipeline.status}")
            
        except Exception as e:
            self._logger.error(f"Pipeline {pipeline.id.value} failed: {e}", exc_info=True)
            pipeline.fail_stage("orchestrator", str(e))
            await self._publish_domain_events(pipeline)
            raise
        
        finally:
            # Cleanup
            if pipeline.id.value in self._active_pipelines:
                del self._active_pipelines[pipeline.id.value]
        
        return pipeline
    
    async def resume_pipeline_from_checkpoint(
        self,
        checkpoint_data: Dict[str, Any],
        stages: List[PipelineStage]
    ) -> Pipeline:
        """
        Resume pipeline execution from a checkpoint.
        
        Args:
            checkpoint_data: Saved checkpoint data
            stages: List of pipeline stages
            
        Returns:
            Resumed Pipeline entity
        """
        # Restore pipeline from checkpoint
        pipeline = Pipeline.restore_from_checkpoint(checkpoint_data, stages)
        self._active_pipelines[pipeline.id.value] = pipeline
        
        try:
            self._logger.info(f"Resuming pipeline {pipeline.id.value} from checkpoint")
            
            # Find the stage to resume from
            current_stage_name = pipeline.current_stage
            if not current_stage_name:
                # Pipeline was already completed
                return pipeline
            
            # Reconstruct input data from previous stage results
            input_data = self._reconstruct_input_data(pipeline)
            
            # Resume execution from current stage
            remaining_stages = [s for s in stages if s.name == current_stage_name]
            remaining_stages.extend([s for s in stages if stages.index(s) > 
                                   next(i for i, s in enumerate(stages) if s.name == current_stage_name)])
            
            for stage in remaining_stages:
                if pipeline.status != PipelineStatus.RUNNING:
                    break
                
                await self._execute_stage(pipeline, stage, input_data, pipeline.configuration)
                
                # Save checkpoint after each stage
                if pipeline.configuration.checkpoint_enabled:
                    await self._save_checkpoint(pipeline)
                
                # Update input data for next stage
                if stage.name in pipeline.stage_results:
                    stage_result = pipeline.stage_results[stage.name]
                    input_data.update(stage_result.output_data)
            
            # Complete pipeline if all stages finished
            if pipeline.status == PipelineStatus.RUNNING:
                pipeline.complete_pipeline()
                await self._publish_domain_events(pipeline)
            
            self._logger.info(f"Resumed pipeline {pipeline.id.value} completed with status: {pipeline.status}")
            
        except Exception as e:
            self._logger.error(f"Resumed pipeline {pipeline.id.value} failed: {e}", exc_info=True)
            pipeline.fail_stage("orchestrator", str(e))
            await self._publish_domain_events(pipeline)
            raise
        
        finally:
            # Cleanup
            if pipeline.id.value in self._active_pipelines:
                del self._active_pipelines[pipeline.id.value]
        
        return pipeline
    
    async def cancel_pipeline(self, pipeline_id: str, reason: str) -> None:
        """Cancel an active pipeline."""
        if pipeline_id in self._active_pipelines:
            pipeline = self._active_pipelines[pipeline_id]
            pipeline.cancel_pipeline(reason)
            await self._publish_domain_events(pipeline)
            
            self._logger.info(f"Pipeline {pipeline_id} cancelled: {reason}")
    
    async def get_pipeline_status(self, pipeline_id: str) -> Optional[Dict[str, Any]]:
        """Get current status of a pipeline."""
        if pipeline_id in self._active_pipelines:
            pipeline = self._active_pipelines[pipeline_id]
            return {
                'pipeline_id': pipeline.id.value,
                'video_id': pipeline.video_id.value,
                'status': pipeline.status.value,
                'progress_percentage': pipeline.progress_percentage,
                'current_stage': pipeline.current_stage,
                'stage_results': {
                    name: {
                        'status': result.status.value,
                        'processing_time_ms': result.processing_time_ms,
                        'error_message': result.error_message
                    }
                    for name, result in pipeline.stage_results.items()
                }
            }
        return None
    
    async def _execute_stage(
        self,
        pipeline: Pipeline,
        stage: PipelineStage,
        input_data: Dict[str, Any],
        configuration: PipelineConfiguration
    ) -> None:
        """Execute a single pipeline stage."""
        stage_name = stage.name
        
        try:
            self._logger.info(f"Executing stage {stage_name} for pipeline {pipeline.id.value}")
            
            # Check dependencies
            if not pipeline.get_stage_dependencies_met(stage_name):
                raise RuntimeError(f"Dependencies not met for stage {stage_name}")
            
            # Notify progress start
            await self._progress_notifier.notify_stage_started(
                pipeline.id.value,
                pipeline.video_id.value,
                stage_name
            )
            
            # Get stage-specific configuration
            stage_config = configuration.stage_configs.get(stage_name, {})
            
            # Execute stage
            result = await stage.process(input_data, stage_config)
            
            # Complete stage in pipeline
            pipeline.complete_stage(stage_name, result)
            
            # Publish domain events
            await self._publish_domain_events(pipeline)
            
            # Notify progress completion
            await self._progress_notifier.notify_stage_completed(
                pipeline.id.value,
                pipeline.video_id.value,
                stage_name,
                pipeline.progress_percentage
            )
            
            self._logger.info(f"Stage {stage_name} completed successfully")
            
        except Exception as e:
            self._logger.error(f"Stage {stage_name} failed: {e}", exc_info=True)
            
            # Fail stage in pipeline
            pipeline.fail_stage(stage_name, str(e))
            
            # Publish domain events
            await self._publish_domain_events(pipeline)
            
            # Notify progress failure
            await self._progress_notifier.notify_stage_failed(
                pipeline.id.value,
                pipeline.video_id.value,
                stage_name,
                str(e)
            )
            
            # Re-raise exception to stop pipeline
            raise
    
    async def _publish_domain_events(self, pipeline: Pipeline) -> None:
        """Publish domain events from pipeline."""
        events = pipeline.domain_events
        if events:
            for event in events:
                await self._event_publisher.publish(event)
            pipeline.clear_domain_events()
    
    async def _save_checkpoint(self, pipeline: Pipeline) -> None:
        """Save pipeline checkpoint."""
        try:
            checkpoint_data = pipeline.get_checkpoint_data()
            await self._checkpoint_manager.save_checkpoint(
                pipeline.id.value,
                checkpoint_data
            )
            self._logger.debug(f"Checkpoint saved for pipeline {pipeline.id.value}")
        except Exception as e:
            self._logger.warning(f"Failed to save checkpoint: {e}")
    
    def _reconstruct_input_data(self, pipeline: Pipeline) -> Dict[str, Any]:
        """Reconstruct input data from completed stage results."""
        input_data = {}
        
        # Combine output data from all completed stages
        for stage_name, result in pipeline.stage_results.items():
            input_data.update(result.output_data)
        
        return input_data
