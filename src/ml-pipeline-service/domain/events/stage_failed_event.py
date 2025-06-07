from typing import Dict, Any

from .domain_event import DomainEvent
from ..value_objects.processing_id import ProcessingId
from ..value_objects.video_id import VideoId


class StageFailedEvent(DomainEvent):
    """Event published when a pipeline stage fails."""
    
    def __init__(
        self,
        pipeline_id: ProcessingId,
        video_id: VideoId,
        stage_name: str,
        error_message: str,
        retry_count: int,
        max_retries: int,
        **kwargs
    ):
        super().__init__(**kwargs)
        self.pipeline_id = pipeline_id
        self.video_id = video_id
        self.stage_name = stage_name
        self.error_message = error_message
        self.retry_count = retry_count
        self.max_retries = max_retries
    
    @property
    def event_type(self) -> str:
        return "StageFailed"
    
    @property
    def aggregate_id(self) -> str:
        return self.pipeline_id.value
    
    def _get_event_data(self) -> Dict[str, Any]:
        return {
            'pipeline_id': self.pipeline_id.value,
            'video_id': self.video_id.value,
            'stage_name': self.stage_name,
            'error_message': self.error_message,
            'retry_count': self.retry_count,
            'max_retries': self.max_retries,
            'will_retry': self.retry_count < self.max_retries
        }
