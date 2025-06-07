from typing import Dict, Any

from .domain_event import DomainEvent
from ..value_objects.processing_id import ProcessingId
from ..value_objects.video_id import VideoId


class PipelineCancelledEvent(DomainEvent):
    """Event published when a pipeline is cancelled."""
    
    def __init__(
        self,
        pipeline_id: ProcessingId,
        video_id: VideoId,
        reason: str,
        **kwargs
    ):
        super().__init__(**kwargs)
        self.pipeline_id = pipeline_id
        self.video_id = video_id
        self.reason = reason
    
    @property
    def event_type(self) -> str:
        return "PipelineCancelled"
    
    @property
    def aggregate_id(self) -> str:
        return self.pipeline_id.value
    
    def _get_event_data(self) -> Dict[str, Any]:
        return {
            'pipeline_id': self.pipeline_id.value,
            'video_id': self.video_id.value,
            'reason': self.reason
        }
