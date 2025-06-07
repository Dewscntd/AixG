from typing import Dict, Any

from .domain_event import DomainEvent
from ..value_objects.processing_id import ProcessingId
from ..value_objects.video_id import VideoId
from ..entities.pipeline import StageResult


class PipelineCompletedEvent(DomainEvent):
    """Event published when a pipeline completes all stages successfully."""
    
    def __init__(
        self,
        pipeline_id: ProcessingId,
        video_id: VideoId,
        total_processing_time_ms: int,
        final_results: Dict[str, StageResult],
        **kwargs
    ):
        super().__init__(**kwargs)
        self.pipeline_id = pipeline_id
        self.video_id = video_id
        self.total_processing_time_ms = total_processing_time_ms
        self.final_results = final_results
    
    @property
    def event_type(self) -> str:
        return "PipelineCompleted"
    
    @property
    def aggregate_id(self) -> str:
        return self.pipeline_id.value
    
    def _get_event_data(self) -> Dict[str, Any]:
        return {
            'pipeline_id': self.pipeline_id.value,
            'video_id': self.video_id.value,
            'total_processing_time_ms': self.total_processing_time_ms,
            'stage_results': {
                stage_name: {
                    'status': result.status.value,
                    'processing_time_ms': result.processing_time_ms,
                    'metadata': result.metadata
                }
                for stage_name, result in self.final_results.items()
            }
        }
