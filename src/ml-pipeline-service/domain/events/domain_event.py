from abc import ABC, abstractmethod
from datetime import datetime
from typing import Dict, Any, Optional
import uuid


class DomainEvent(ABC):
    """Base class for all domain events."""
    
    def __init__(
        self,
        event_id: Optional[str] = None,
        occurred_on: Optional[datetime] = None,
        correlation_id: Optional[str] = None,
        causation_id: Optional[str] = None
    ):
        self.event_id = event_id or str(uuid.uuid4())
        self.occurred_on = occurred_on or datetime.utcnow()
        self.correlation_id = correlation_id
        self.causation_id = causation_id
    
    @property
    @abstractmethod
    def event_type(self) -> str:
        """The type identifier for this event."""
        pass
    
    @property
    @abstractmethod
    def aggregate_id(self) -> str:
        """The ID of the aggregate that generated this event."""
        pass
    
    @property
    def version(self) -> int:
        """Event schema version."""
        return 1
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert event to dictionary for serialization."""
        return {
            'event_id': self.event_id,
            'event_type': self.event_type,
            'aggregate_id': self.aggregate_id,
            'version': self.version,
            'occurred_on': self.occurred_on.isoformat(),
            'correlation_id': self.correlation_id,
            'causation_id': self.causation_id,
            **self._get_event_data()
        }
    
    @abstractmethod
    def _get_event_data(self) -> Dict[str, Any]:
        """Get event-specific data for serialization."""
        pass
    
    def __repr__(self) -> str:
        return f"{self.__class__.__name__}(event_id='{self.event_id}', aggregate_id='{self.aggregate_id}')"
