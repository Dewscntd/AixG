from typing import List, Dict, Any, Optional, Protocol
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
import uuid
from abc import ABC, abstractmethod

from ..value_objects.video_id import VideoId
from ..value_objects.processing_id import ProcessingId
from ..events.domain_event import DomainEvent


class PipelineStatus(Enum):
    PENDING = "PENDING"
    RUNNING = "RUNNING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"
    CANCELLED = "CANCELLED"


class StageStatus(Enum):
    PENDING = "PENDING"
    RUNNING = "RUNNING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"
    SKIPPED = "SKIPPED"


@dataclass(frozen=True)
class StageResult:
    """Immutable result from a pipeline stage."""
    stage_name: str
    status: StageStatus
    output_data: Dict[str, Any]
    metadata: Dict[str, Any] = field(default_factory=dict)
    error_message: Optional[str] = None
    processing_time_ms: int = 0
    checkpoint_data: Optional[Dict[str, Any]] = None


@dataclass(frozen=True)
class PipelineConfiguration:
    """Immutable pipeline configuration."""
    model_version: str
    batch_size: int
    gpu_enabled: bool
    checkpoint_enabled: bool
    max_retries: int = 3
    timeout_seconds: int = 3600
    stage_configs: Dict[str, Dict[str, Any]] = field(default_factory=dict)


class PipelineStage(Protocol):
    """Protocol defining the interface for pipeline stages."""
    
    @property
    def name(self) -> str:
        """Stage name identifier."""
        ...
    
    @property
    def dependencies(self) -> List[str]:
        """List of stage names this stage depends on."""
        ...
    
    async def process(
        self, 
        input_data: Dict[str, Any], 
        config: Dict[str, Any]
    ) -> StageResult:
        """Process the input data and return results."""
        ...
    
    async def can_process(self, input_data: Dict[str, Any]) -> bool:
        """Check if this stage can process the given input."""
        ...


class Pipeline:
    """
    Main pipeline aggregate root that orchestrates video analysis stages.
    Implements rich domain behavior with event sourcing.
    """
    
    def __init__(
        self,
        pipeline_id: ProcessingId,
        video_id: VideoId,
        configuration: PipelineConfiguration,
        stages: List[PipelineStage]
    ):
        self._id = pipeline_id
        self._video_id = video_id
        self._configuration = configuration
        self._stages = {stage.name: stage for stage in stages}
        self._stage_order = [stage.name for stage in stages]
        self._status = PipelineStatus.PENDING
        self._stage_results: Dict[str, StageResult] = {}
        self._current_stage_index = 0
        self._created_at = datetime.utcnow()
        self._updated_at = datetime.utcnow()
        self._domain_events: List[DomainEvent] = []
        self._retry_counts: Dict[str, int] = {}
        self._checkpoint_data: Dict[str, Any] = {}
    
    @property
    def id(self) -> ProcessingId:
        return self._id
    
    @property
    def video_id(self) -> VideoId:
        return self._video_id
    
    @property
    def status(self) -> PipelineStatus:
        return self._status
    
    @property
    def configuration(self) -> PipelineConfiguration:
        return self._configuration
    
    @property
    def stage_results(self) -> Dict[str, StageResult]:
        return self._stage_results.copy()
    
    @property
    def current_stage(self) -> Optional[str]:
        if self._current_stage_index < len(self._stage_order):
            return self._stage_order[self._current_stage_index]
        return None
    
    @property
    def progress_percentage(self) -> float:
        if not self._stage_order:
            return 0.0
        completed_stages = len([r for r in self._stage_results.values() 
                              if r.status == StageStatus.COMPLETED])
        return (completed_stages / len(self._stage_order)) * 100.0
    
    @property
    def domain_events(self) -> List[DomainEvent]:
        return self._domain_events.copy()
    
    def start_processing(self) -> None:
        """Start the pipeline processing."""
        if self._status != PipelineStatus.PENDING:
            raise ValueError(f"Cannot start pipeline in status: {self._status}")
        
        self._status = PipelineStatus.RUNNING
        self._updated_at = datetime.utcnow()
        
        from ..events.pipeline_started_event import PipelineStartedEvent
        self._add_domain_event(PipelineStartedEvent(
            pipeline_id=self._id,
            video_id=self._video_id,
            total_stages=len(self._stage_order),
            configuration=self._configuration
        ))
    
    def complete_stage(self, stage_name: str, result: StageResult) -> None:
        """Mark a stage as completed with its result."""
        if stage_name not in self._stages:
            raise ValueError(f"Unknown stage: {stage_name}")
        
        if self._status != PipelineStatus.RUNNING:
            raise ValueError(f"Cannot complete stage when pipeline status is: {self._status}")
        
        self._stage_results[stage_name] = result
        self._updated_at = datetime.utcnow()
        
        # Store checkpoint data if enabled
        if self._configuration.checkpoint_enabled and result.checkpoint_data:
            self._checkpoint_data[stage_name] = result.checkpoint_data
        
        # Reset retry count on success
        if result.status == StageStatus.COMPLETED:
            self._retry_counts[stage_name] = 0
            self._advance_to_next_stage()
        
        from ..events.stage_completed_event import StageCompletedEvent
        self._add_domain_event(StageCompletedEvent(
            pipeline_id=self._id,
            video_id=self._video_id,
            stage_name=stage_name,
            result=result,
            progress_percentage=self.progress_percentage
        ))
    
    def fail_stage(self, stage_name: str, error_message: str) -> None:
        """Mark a stage as failed."""
        if stage_name not in self._stages:
            raise ValueError(f"Unknown stage: {stage_name}")
        
        retry_count = self._retry_counts.get(stage_name, 0)
        self._retry_counts[stage_name] = retry_count + 1
        
        if retry_count >= self._configuration.max_retries:
            # Max retries exceeded, fail the entire pipeline
            self._status = PipelineStatus.FAILED
            result = StageResult(
                stage_name=stage_name,
                status=StageStatus.FAILED,
                output_data={},
                error_message=error_message
            )
            self._stage_results[stage_name] = result
        
        self._updated_at = datetime.utcnow()
        
        from ..events.stage_failed_event import StageFailedEvent
        self._add_domain_event(StageFailedEvent(
            pipeline_id=self._id,
            video_id=self._video_id,
            stage_name=stage_name,
            error_message=error_message,
            retry_count=self._retry_counts[stage_name],
            max_retries=self._configuration.max_retries
        ))
    
    def complete_pipeline(self) -> None:
        """Mark the entire pipeline as completed."""
        if self._status != PipelineStatus.RUNNING:
            raise ValueError(f"Cannot complete pipeline in status: {self._status}")
        
        # Verify all stages are completed
        for stage_name in self._stage_order:
            if stage_name not in self._stage_results:
                raise ValueError(f"Stage {stage_name} not completed")
            if self._stage_results[stage_name].status != StageStatus.COMPLETED:
                raise ValueError(f"Stage {stage_name} not in completed status")
        
        self._status = PipelineStatus.COMPLETED
        self._updated_at = datetime.utcnow()
        
        from ..events.pipeline_completed_event import PipelineCompletedEvent
        self._add_domain_event(PipelineCompletedEvent(
            pipeline_id=self._id,
            video_id=self._video_id,
            total_processing_time_ms=self._calculate_total_processing_time(),
            final_results=self._stage_results
        ))
    
    def cancel_pipeline(self, reason: str) -> None:
        """Cancel the pipeline processing."""
        if self._status in [PipelineStatus.COMPLETED, PipelineStatus.FAILED]:
            raise ValueError(f"Cannot cancel pipeline in status: {self._status}")
        
        self._status = PipelineStatus.CANCELLED
        self._updated_at = datetime.utcnow()
        
        from ..events.pipeline_cancelled_event import PipelineCancelledEvent
        self._add_domain_event(PipelineCancelledEvent(
            pipeline_id=self._id,
            video_id=self._video_id,
            reason=reason
        ))
    
    def get_stage_dependencies_met(self, stage_name: str) -> bool:
        """Check if all dependencies for a stage are met."""
        if stage_name not in self._stages:
            return False
        
        stage = self._stages[stage_name]
        for dependency in stage.dependencies:
            if dependency not in self._stage_results:
                return False
            if self._stage_results[dependency].status != StageStatus.COMPLETED:
                return False
        
        return True
    
    def clear_domain_events(self) -> None:
        """Clear domain events after publishing."""
        self._domain_events.clear()
    
    def _advance_to_next_stage(self) -> None:
        """Advance to the next stage in the pipeline."""
        self._current_stage_index += 1
        
        # Check if pipeline is complete
        if self._current_stage_index >= len(self._stage_order):
            self.complete_pipeline()
    
    def _calculate_total_processing_time(self) -> int:
        """Calculate total processing time across all stages."""
        return sum(result.processing_time_ms for result in self._stage_results.values())
    
    def _add_domain_event(self, event: DomainEvent) -> None:
        """Add a domain event to be published."""
        self._domain_events.append(event)
    
    @classmethod
    def create_for_video(
        cls,
        video_id: VideoId,
        configuration: PipelineConfiguration,
        stages: List[PipelineStage]
    ) -> 'Pipeline':
        """Factory method to create a new pipeline for video processing."""
        pipeline_id = ProcessingId.generate()
        return cls(pipeline_id, video_id, configuration, stages)
