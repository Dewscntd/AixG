from typing import Dict, Any, Optional, List
from pydantic import BaseModel, Field, validator
from enum import Enum


class ProcessingStatus(str, Enum):
    """Pipeline processing status enumeration."""
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class StageStatus(str, Enum):
    """Stage processing status enumeration."""
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    SKIPPED = "skipped"


class ProcessVideoRequest(BaseModel):
    """Request model for video processing."""
    
    video_path: str = Field(
        ...,
        description="Path to the video file to process",
        example="/path/to/match_video.mp4"
    )
    
    model_version: str = Field(
        default="v1.0.0",
        description="ML model version to use for processing",
        example="v1.0.0"
    )
    
    batch_size: int = Field(
        default=8,
        ge=1,
        le=32,
        description="Batch size for ML inference",
        example=8
    )
    
    gpu_enabled: bool = Field(
        default=True,
        description="Whether to use GPU acceleration",
        example=True
    )
    
    checkpoint_enabled: bool = Field(
        default=True,
        description="Whether to enable checkpoint recovery",
        example=True
    )
    
    max_retries: int = Field(
        default=3,
        ge=0,
        le=10,
        description="Maximum number of retries per stage",
        example=3
    )
    
    timeout_seconds: int = Field(
        default=3600,
        ge=60,
        le=86400,
        description="Pipeline timeout in seconds",
        example=3600
    )
    
    stage_configs: Optional[Dict[str, Dict[str, Any]]] = Field(
        default=None,
        description="Stage-specific configuration overrides",
        example={
            "player_detection": {
                "confidence_threshold": 0.7,
                "nms_threshold": 0.4
            },
            "ball_tracking": {
                "tracking_method": "kalman",
                "max_missing_frames": 10
            }
        }
    )
    
    @validator('video_path')
    def validate_video_path(cls, v):
        if not v or not v.strip():
            raise ValueError('Video path cannot be empty')
        return v.strip()
    
    @validator('model_version')
    def validate_model_version(cls, v):
        if not v or not v.strip():
            raise ValueError('Model version cannot be empty')
        return v.strip()


class ProcessVideoResponse(BaseModel):
    """Response model for video processing request."""
    
    pipeline_id: str = Field(
        ...,
        description="Unique identifier for the processing pipeline",
        example="123e4567-e89b-12d3-a456-426614174000"
    )
    
    video_id: str = Field(
        ...,
        description="Unique identifier for the video",
        example="123e4567-e89b-12d3-a456-426614174001"
    )
    
    status: str = Field(
        ...,
        description="Initial processing status",
        example="started"
    )
    
    message: str = Field(
        ...,
        description="Human-readable status message",
        example="Video processing pipeline started successfully"
    )


class StageResultModel(BaseModel):
    """Model for stage processing result."""
    
    status: StageStatus = Field(
        ...,
        description="Stage processing status"
    )
    
    processing_time_ms: int = Field(
        ...,
        ge=0,
        description="Processing time in milliseconds"
    )
    
    error_message: Optional[str] = Field(
        default=None,
        description="Error message if stage failed"
    )
    
    metadata: Dict[str, Any] = Field(
        default_factory=dict,
        description="Stage-specific metadata"
    )


class PipelineStatusResponse(BaseModel):
    """Response model for pipeline status."""
    
    pipeline_id: str = Field(
        ...,
        description="Pipeline identifier",
        example="123e4567-e89b-12d3-a456-426614174000"
    )
    
    video_id: str = Field(
        ...,
        description="Video identifier",
        example="123e4567-e89b-12d3-a456-426614174001"
    )
    
    status: ProcessingStatus = Field(
        ...,
        description="Current pipeline status"
    )
    
    progress_percentage: float = Field(
        ...,
        ge=0.0,
        le=100.0,
        description="Overall progress percentage",
        example=45.5
    )
    
    current_stage: Optional[str] = Field(
        default=None,
        description="Currently executing stage",
        example="player_detection"
    )
    
    stage_results: Dict[str, StageResultModel] = Field(
        default_factory=dict,
        description="Results from completed stages"
    )
    
    created_at: Optional[str] = Field(
        default=None,
        description="Pipeline creation timestamp",
        example="2024-01-01T12:00:00Z"
    )
    
    updated_at: Optional[str] = Field(
        default=None,
        description="Last update timestamp",
        example="2024-01-01T12:30:00Z"
    )


class WebSocketMessage(BaseModel):
    """Model for WebSocket progress messages."""
    
    type: str = Field(
        ...,
        description="Message type",
        example="stage_completed"
    )
    
    pipeline_id: str = Field(
        ...,
        description="Pipeline identifier"
    )
    
    video_id: str = Field(
        ...,
        description="Video identifier"
    )
    
    timestamp: str = Field(
        ...,
        description="Message timestamp",
        example="2024-01-01T12:00:00Z"
    )
    
    # Optional fields based on message type
    stage_name: Optional[str] = Field(
        default=None,
        description="Stage name for stage-related messages"
    )
    
    progress_percentage: Optional[float] = Field(
        default=None,
        ge=0.0,
        le=100.0,
        description="Progress percentage"
    )
    
    error_message: Optional[str] = Field(
        default=None,
        description="Error message for failure notifications"
    )
    
    message: Optional[str] = Field(
        default=None,
        description="Additional message content"
    )


class ModelInfo(BaseModel):
    """Model information."""
    
    name: str = Field(
        ...,
        description="Model name",
        example="YOLOv8n"
    )
    
    version: str = Field(
        ...,
        description="Model version",
        example="8.0.0"
    )
    
    status: str = Field(
        ...,
        description="Model status",
        example="active"
    )
    
    description: Optional[str] = Field(
        default=None,
        description="Model description"
    )
    
    capabilities: Optional[List[str]] = Field(
        default=None,
        description="Model capabilities",
        example=["player_detection", "object_tracking"]
    )


class ActiveModelsResponse(BaseModel):
    """Response model for active models endpoint."""
    
    models: Dict[str, ModelInfo] = Field(
        ...,
        description="Dictionary of active models by category"
    )


class ErrorResponse(BaseModel):
    """Error response model."""
    
    error: str = Field(
        ...,
        description="Error type",
        example="ValidationError"
    )
    
    message: str = Field(
        ...,
        description="Error message",
        example="Invalid video path provided"
    )
    
    details: Optional[Dict[str, Any]] = Field(
        default=None,
        description="Additional error details"
    )
    
    timestamp: str = Field(
        ...,
        description="Error timestamp",
        example="2024-01-01T12:00:00Z"
    )
