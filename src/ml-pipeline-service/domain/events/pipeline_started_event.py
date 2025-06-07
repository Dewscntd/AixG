from typing import Dict, Any
from datetime import datetime

from .domain_event import DomainEvent
from ..value_objects.processing_id import ProcessingId
from ..value_objects.video_id import VideoId
from ..entities.pipeline import PipelineConfiguration


class PipelineStartedEvent(DomainEvent):
    """Event published when a pipeline starts processing."""
    
    def __init__(
        self,
        pipeline_id: ProcessingId,
        video_id: VideoId,
        total_stages: int,
        configuration: PipelineConfiguration,
        **kwargs
    ):
        super().__init__(**kwargs)
        self.pipeline_id = pipeline_id
        self.video_id = video_id
        self.total_stages = total_stages
        self.configuration = configuration
    
    @property
    def event_type(self) -> str:
        return "PipelineStarted"
    
    @property
    def aggregate_id(self) -> str:
        return self.pipeline_id.value
    
    def _get_event_data(self) -> Dict[str, Any]:
        return {
            'pipeline_id': self.pipeline_id.value,
            'video_id': self.video_id.value,
            'total_stages': self.total_stages,
            'configuration': {
                'model_version': self.configuration.model_version,
                'batch_size': self.configuration.batch_size,
                'gpu_enabled': self.configuration.gpu_enabled,
                'checkpoint_enabled': self.configuration.checkpoint_enabled,
                'max_retries': self.configuration.max_retries,
                'timeout_seconds': self.configuration.timeout_seconds
            }
        }
