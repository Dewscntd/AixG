import logging
from typing import Optional
from fastapi import Request, HTTPException

from ..application.pipeline_orchestrator import PipelineOrchestrator


def get_pipeline_orchestrator(request: Request) -> PipelineOrchestrator:
    """
    Dependency to get pipeline orchestrator from app state.
    
    Args:
        request: FastAPI request object
        
    Returns:
        PipelineOrchestrator instance
        
    Raises:
        HTTPException: If orchestrator is not available
    """
    orchestrator = getattr(request.app.state, 'orchestrator', None)
    
    if not orchestrator:
        raise HTTPException(
            status_code=503,
            detail="Pipeline orchestrator not available. Service may be starting up."
        )
    
    return orchestrator


def get_logger(request: Request) -> logging.Logger:
    """
    Dependency to get logger instance.
    
    Args:
        request: FastAPI request object
        
    Returns:
        Logger instance
    """
    return logging.getLogger(f"{__name__}.{request.url.path}")


def get_event_publisher(request: Request):
    """
    Dependency to get event publisher from app state.
    
    Args:
        request: FastAPI request object
        
    Returns:
        EventPublisher instance
        
    Raises:
        HTTPException: If event publisher is not available
    """
    event_publisher = getattr(request.app.state, 'event_publisher', None)
    
    if not event_publisher:
        raise HTTPException(
            status_code=503,
            detail="Event publisher not available. Service may be starting up."
        )
    
    return event_publisher


def get_checkpoint_manager(request: Request):
    """
    Dependency to get checkpoint manager from app state.
    
    Args:
        request: FastAPI request object
        
    Returns:
        CheckpointManager instance
        
    Raises:
        HTTPException: If checkpoint manager is not available
    """
    checkpoint_manager = getattr(request.app.state, 'checkpoint_manager', None)
    
    if not checkpoint_manager:
        raise HTTPException(
            status_code=503,
            detail="Checkpoint manager not available. Service may be starting up."
        )
    
    return checkpoint_manager


def get_progress_notifier(request: Request):
    """
    Dependency to get progress notifier from app state.
    
    Args:
        request: FastAPI request object
        
    Returns:
        ProgressNotifier instance
        
    Raises:
        HTTPException: If progress notifier is not available
    """
    progress_notifier = getattr(request.app.state, 'progress_notifier', None)
    
    if not progress_notifier:
        raise HTTPException(
            status_code=503,
            detail="Progress notifier not available. Service may be starting up."
        )
    
    return progress_notifier
