from typing import List, Dict, Any, Optional, Tuple
from dataclasses import dataclass, field
from enum import Enum


class DetectionType(Enum):
    PLAYER = "PLAYER"
    BALL = "BALL"
    REFEREE = "REFEREE"
    GOAL = "GOAL"
    CORNER_FLAG = "CORNER_FLAG"
    PENALTY_AREA = "PENALTY_AREA"


class TeamColor(Enum):
    HOME = "HOME"
    AWAY = "AWAY"
    REFEREE = "REFEREE"
    UNKNOWN = "UNKNOWN"


@dataclass(frozen=True)
class BoundingBox:
    """Immutable bounding box coordinates."""
    x: float
    y: float
    width: float
    height: float
    
    def __post_init__(self):
        if self.width <= 0 or self.height <= 0:
            raise ValueError("Width and height must be positive")
        if self.x < 0 or self.y < 0:
            raise ValueError("Coordinates must be non-negative")
    
    @property
    def center(self) -> Tuple[float, float]:
        return (self.x + self.width / 2, self.y + self.height / 2)
    
    @property
    def area(self) -> float:
        return self.width * self.height
    
    def intersects(self, other: 'BoundingBox') -> bool:
        """Check if this bounding box intersects with another."""
        return not (
            self.x + self.width < other.x or
            other.x + other.width < self.x or
            self.y + self.height < other.y or
            other.y + other.height < self.y
        )
    
    def intersection_area(self, other: 'BoundingBox') -> float:
        """Calculate intersection area with another bounding box."""
        if not self.intersects(other):
            return 0.0
        
        x_overlap = min(self.x + self.width, other.x + other.width) - max(self.x, other.x)
        y_overlap = min(self.y + self.height, other.y + other.height) - max(self.y, other.y)
        
        return x_overlap * y_overlap
    
    def iou(self, other: 'BoundingBox') -> float:
        """Calculate Intersection over Union (IoU) with another bounding box."""
        intersection = self.intersection_area(other)
        union = self.area + other.area - intersection
        
        return intersection / union if union > 0 else 0.0


@dataclass(frozen=True)
class Detection:
    """Immutable detection result for a single object."""
    detection_type: DetectionType
    confidence: float
    bounding_box: BoundingBox
    team_color: TeamColor = TeamColor.UNKNOWN
    player_id: Optional[int] = None
    jersey_number: Optional[int] = None
    metadata: Dict[str, Any] = field(default_factory=dict)
    
    def __post_init__(self):
        if not 0.0 <= self.confidence <= 1.0:
            raise ValueError("Confidence must be between 0.0 and 1.0")
        
        if self.detection_type == DetectionType.PLAYER:
            if self.team_color == TeamColor.UNKNOWN:
                raise ValueError("Player detection must have a team color")


@dataclass(frozen=True)
class FrameDetections:
    """Immutable collection of detections for a single frame."""
    frame_number: int
    timestamp_ms: int
    detections: List[Detection]
    frame_width: int
    frame_height: int
    metadata: Dict[str, Any] = field(default_factory=dict)
    
    def __post_init__(self):
        if self.frame_number < 0:
            raise ValueError("Frame number must be non-negative")
        if self.timestamp_ms < 0:
            raise ValueError("Timestamp must be non-negative")
        if self.frame_width <= 0 or self.frame_height <= 0:
            raise ValueError("Frame dimensions must be positive")
    
    def get_detections_by_type(self, detection_type: DetectionType) -> List[Detection]:
        """Get all detections of a specific type."""
        return [d for d in self.detections if d.detection_type == detection_type]
    
    def get_players_by_team(self, team_color: TeamColor) -> List[Detection]:
        """Get all player detections for a specific team."""
        return [
            d for d in self.detections 
            if d.detection_type == DetectionType.PLAYER and d.team_color == team_color
        ]
    
    def get_ball_detections(self) -> List[Detection]:
        """Get all ball detections."""
        return self.get_detections_by_type(DetectionType.BALL)
    
    def get_high_confidence_detections(self, min_confidence: float = 0.7) -> List[Detection]:
        """Get detections above a confidence threshold."""
        return [d for d in self.detections if d.confidence >= min_confidence]


@dataclass(frozen=True)
class TrackingResult:
    """Immutable tracking result for an object across frames."""
    track_id: int
    detection_type: DetectionType
    frame_detections: List[Tuple[int, Detection]]  # (frame_number, detection)
    team_color: TeamColor = TeamColor.UNKNOWN
    player_id: Optional[int] = None
    
    def __post_init__(self):
        if self.track_id < 0:
            raise ValueError("Track ID must be non-negative")
        if not self.frame_detections:
            raise ValueError("Track must have at least one detection")
    
    @property
    def start_frame(self) -> int:
        return min(frame_num for frame_num, _ in self.frame_detections)
    
    @property
    def end_frame(self) -> int:
        return max(frame_num for frame_num, _ in self.frame_detections)
    
    @property
    def duration_frames(self) -> int:
        return self.end_frame - self.start_frame + 1
    
    def get_detection_at_frame(self, frame_number: int) -> Optional[Detection]:
        """Get detection for a specific frame."""
        for frame_num, detection in self.frame_detections:
            if frame_num == frame_number:
                return detection
        return None
    
    def get_trajectory(self) -> List[Tuple[float, float]]:
        """Get the center points trajectory across frames."""
        return [detection.bounding_box.center for _, detection in self.frame_detections]
    
    def calculate_average_speed(self, fps: float) -> float:
        """Calculate average speed in pixels per second."""
        if len(self.frame_detections) < 2:
            return 0.0
        
        trajectory = self.get_trajectory()
        total_distance = 0.0
        
        for i in range(1, len(trajectory)):
            x1, y1 = trajectory[i-1]
            x2, y2 = trajectory[i]
            distance = ((x2 - x1) ** 2 + (y2 - y1) ** 2) ** 0.5
            total_distance += distance
        
        time_seconds = self.duration_frames / fps
        return total_distance / time_seconds if time_seconds > 0 else 0.0


@dataclass(frozen=True)
class VideoDetectionResult:
    """Immutable complete detection result for an entire video."""
    video_id: str
    frame_detections: List[FrameDetections]
    tracking_results: List[TrackingResult]
    video_metadata: Dict[str, Any] = field(default_factory=dict)
    processing_metadata: Dict[str, Any] = field(default_factory=dict)
    
    def __post_init__(self):
        if not self.video_id:
            raise ValueError("Video ID cannot be empty")
    
    @property
    def total_frames(self) -> int:
        return len(self.frame_detections)
    
    @property
    def total_detections(self) -> int:
        return sum(len(fd.detections) for fd in self.frame_detections)
    
    @property
    def total_tracks(self) -> int:
        return len(self.tracking_results)
    
    def get_frame_detections(self, frame_number: int) -> Optional[FrameDetections]:
        """Get detections for a specific frame."""
        for fd in self.frame_detections:
            if fd.frame_number == frame_number:
                return fd
        return None
    
    def get_tracks_by_type(self, detection_type: DetectionType) -> List[TrackingResult]:
        """Get all tracks of a specific type."""
        return [t for t in self.tracking_results if t.detection_type == detection_type]
    
    def get_player_tracks_by_team(self, team_color: TeamColor) -> List[TrackingResult]:
        """Get all player tracks for a specific team."""
        return [
            t for t in self.tracking_results 
            if t.detection_type == DetectionType.PLAYER and t.team_color == team_color
        ]
    
    def get_ball_tracks(self) -> List[TrackingResult]:
        """Get all ball tracking results."""
        return self.get_tracks_by_type(DetectionType.BALL)
    
    def calculate_detection_statistics(self) -> Dict[str, Any]:
        """Calculate various detection statistics."""
        stats = {
            'total_frames': self.total_frames,
            'total_detections': self.total_detections,
            'total_tracks': self.total_tracks,
            'detections_by_type': {},
            'tracks_by_type': {},
            'average_detections_per_frame': self.total_detections / max(self.total_frames, 1)
        }
        
        # Count detections by type
        for detection_type in DetectionType:
            type_detections = sum(
                len(fd.get_detections_by_type(detection_type)) 
                for fd in self.frame_detections
            )
            stats['detections_by_type'][detection_type.value] = type_detections
            
            type_tracks = len(self.get_tracks_by_type(detection_type))
            stats['tracks_by_type'][detection_type.value] = type_tracks
        
        return stats
