import uuid
from typing import Union


class VideoId:
    """Value object representing a unique video identifier."""
    
    def __init__(self, value: Union[str, uuid.UUID]):
        if isinstance(value, str):
            try:
                self._value = uuid.UUID(value)
            except ValueError:
                raise ValueError(f"Invalid UUID format: {value}")
        elif isinstance(value, uuid.UUID):
            self._value = value
        else:
            raise TypeError(f"VideoId must be str or UUID, got {type(value)}")
    
    @property
    def value(self) -> str:
        return str(self._value)
    
    def __str__(self) -> str:
        return self.value
    
    def __repr__(self) -> str:
        return f"VideoId('{self.value}')"
    
    def __eq__(self, other) -> bool:
        if not isinstance(other, VideoId):
            return False
        return self._value == other._value
    
    def __hash__(self) -> int:
        return hash(self._value)
    
    @classmethod
    def generate(cls) -> 'VideoId':
        """Generate a new random VideoId."""
        return cls(uuid.uuid4())
    
    @classmethod
    def from_string(cls, value: str) -> 'VideoId':
        """Create VideoId from string representation."""
        return cls(value)
