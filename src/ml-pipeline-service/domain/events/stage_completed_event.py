from typing import Dict, Any

from .domain_event import DomainEvent
from ..value_objects.processing_id import ProcessingId
from ..value_objects.video_id import VideoId
from ..entities.pipeline import StageResult


class StageCompletedEvent(DomainEvent):
    """Event published when a pipeline stage completes successfully."""
    
    def __init__(
        self,
        pipeline_id: ProcessingId,
        video_id: VideoId,
        stage_name: str,
        result: StageResult,
        progress_percentage: float,
        **kwargs
    ):
        super().__init__(**kwargs)
        self.pipeline_id = pipeline_id
        self.video_id = video_id
        self.stage_name = stage_name
        self.result = result
        self.progress_percentage = progress_percentage
    
    @property
    def event_type(self) -> str:
        return "StageCompleted"
    
    @property
    def aggregate_id(self) -> str:
        return self.pipeline_id.value
    
    def _get_event_data(self) -> Dict[str, Any]:
        return {
            'pipeline_id': self.pipeline_id.value,
            'video_id': self.video_id.value,
            'stage_name': self.stage_name,
            'progress_percentage': self.progress_percentage,
            'result': {
                'stage_name': self.result.stage_name,
                'status': self.result.status.value,
                'processing_time_ms': self.result.processing_time_ms,
                'metadata': self.result.metadata,
                'error_message': self.result.error_message
            }
        }
