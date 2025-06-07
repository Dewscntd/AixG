import os
from typing import Dict, Any, List, Tuple, Optional
import numpy as np
from PIL import Image
import cv2

from .base_stage import GPUStage
from ..domain.value_objects.detection_result import (
    Detection, FrameDetections, BoundingBox, DetectionType, TrackingResult
)


class BallTrackingStage(GPUStage):
    """
    Stage responsible for detecting and tracking the ball across video frames.
    Uses specialized ball detection model and tracking algorithms.
    """
    
    def __init__(self):
        super().__init__(name="ball_tracking", dependencies=["video_decoding", "player_detection"])
        self._ball_detector = None
        self._tracker = None
        self._model_loaded = False
    
    async def _execute_gpu_stage(
        self, 
        input_data: Dict[str, Any], 
        config: Dict[str, Any]
    ) -> Tuple[Dict[str, Any], Dict[str, Any]]:
        """
        Detect and track the ball across video frames.
        
        Args:
            input_data: Contains frames_directory, frame_files, frame_detections
            config: Stage configuration
            
        Returns:
            Tuple of (output_data, metadata)
        """
        frames_directory = input_data['frames_directory']
        frame_files = input_data['frame_files']
        player_detections = input_data['frame_detections']
        
        confidence_threshold = config.get('ball_confidence_threshold', 0.3)
        tracking_method = config.get('tracking_method', 'kalman')
        max_missing_frames = config.get('max_missing_frames', 10)
        
        # Load ball detection model
        await self._load_ball_detector(config)
        
        # Initialize tracker
        self._initialize_tracker(tracking_method)
        
        # Process frames for ball detection and tracking
        ball_detections = []
        ball_tracks = []
        
        for idx, frame_file in enumerate(frame_files):
            self._log_progress(
                f"Processing frame {idx + 1}/{len(frame_files)}",
                (idx / len(frame_files)) * 100
            )
            
            frame_path = os.path.join(frames_directory, frame_file)
            frame_detection = await self._process_frame_for_ball(
                frame_path,
                idx,
                player_detections[idx] if idx < len(player_detections) else None,
                confidence_threshold
            )
            
            ball_detections.append(frame_detection)
        
        # Create ball tracks from detections
        ball_tracks = self._create_ball_tracks(ball_detections, max_missing_frames)
        
        # Calculate tracking statistics
        tracking_stats = self._calculate_tracking_statistics(ball_detections, ball_tracks)
        
        output_data = {
            'ball_detections': ball_detections,
            'ball_tracks': ball_tracks,
            'tracking_statistics': tracking_stats
        }
        
        stage_metadata = {
            'tracking_method': tracking_method,
            'confidence_threshold': confidence_threshold,
            'total_ball_detections': tracking_stats['total_ball_detections'],
            'total_tracks': len(ball_tracks),
            'average_track_length': tracking_stats['average_track_length'],
            'ball_visibility_percentage': tracking_stats['ball_visibility_percentage']
        }
        
        return output_data, stage_metadata
    
    async def _load_ball_detector(self, config: Dict[str, Any]) -> None:
        """Load specialized ball detection model."""
        if self._model_loaded:
            return
        
        try:
            # For this example, we'll use a custom ball detection approach
            # In a real implementation, you might use a specialized model
            self._logger.info("Loading ball detection model")
            
            # Initialize ball detector (simplified implementation)
            self._ball_detector = BallDetector(
                min_radius=config.get('min_ball_radius', 5),
                max_radius=config.get('max_ball_radius', 50),
                color_ranges=config.get('ball_color_ranges', self._get_default_ball_colors())
            )
            
            self._model_loaded = True
            self._logger.info("Ball detection model loaded successfully")
            
        except Exception as e:
            raise RuntimeError(f"Failed to load ball detection model: {e}")
    
    def _initialize_tracker(self, tracking_method: str) -> None:
        """Initialize ball tracking algorithm."""
        if tracking_method == 'kalman':
            self._tracker = KalmanBallTracker()
        elif tracking_method == 'particle':
            self._tracker = ParticleFilterTracker()
        else:
            self._tracker = SimpleBallTracker()
        
        self._logger.info(f"Initialized {tracking_method} tracker")
    
    async def _process_frame_for_ball(
        self,
        frame_path: str,
        frame_number: int,
        player_frame_detection: Optional[FrameDetections],
        confidence_threshold: float
    ) -> FrameDetections:
        """Process a single frame for ball detection."""
        # Load frame
        image = Image.open(frame_path).convert('RGB')
        frame_array = np.array(image)
        
        # Get player detections to exclude from ball detection
        player_boxes = []
        if player_frame_detection:
            player_boxes = [
                det.bounding_box for det in player_frame_detection.detections
                if det.detection_type == DetectionType.PLAYER
            ]
        
        # Detect ball candidates
        ball_candidates = self._ball_detector.detect(frame_array, player_boxes)
        
        # Filter by confidence
        ball_detections = [
            candidate for candidate in ball_candidates
            if candidate.confidence >= confidence_threshold
        ]
        
        timestamp_ms = int((frame_number / 30) * 1000)  # Assuming 30 FPS
        
        return FrameDetections(
            frame_number=frame_number,
            timestamp_ms=timestamp_ms,
            detections=ball_detections,
            frame_width=frame_array.shape[1],
            frame_height=frame_array.shape[0],
            metadata={'frame_file': os.path.basename(frame_path)}
        )
    
    def _create_ball_tracks(
        self, 
        ball_detections: List[FrameDetections],
        max_missing_frames: int
    ) -> List[TrackingResult]:
        """Create ball tracks from frame detections using tracking algorithm."""
        tracks = []
        current_track_id = 0
        active_tracks = {}
        
        for frame_detection in ball_detections:
            frame_balls = frame_detection.get_ball_detections()
            
            if not frame_balls:
                # No ball detected in this frame
                # Update existing tracks with missing detection
                for track_id in list(active_tracks.keys()):
                    active_tracks[track_id]['missing_frames'] += 1
                    if active_tracks[track_id]['missing_frames'] > max_missing_frames:
                        # Finalize track
                        track = self._finalize_track(track_id, active_tracks[track_id])
                        tracks.append(track)
                        del active_tracks[track_id]
                continue
            
            # For simplicity, assume one ball per frame (most common case)
            ball_detection = frame_balls[0]
            
            # Find best matching track or create new one
            best_track_id = self._find_best_matching_track(
                ball_detection, 
                active_tracks, 
                frame_detection.frame_number
            )
            
            if best_track_id is not None:
                # Update existing track
                active_tracks[best_track_id]['detections'].append(
                    (frame_detection.frame_number, ball_detection)
                )
                active_tracks[best_track_id]['missing_frames'] = 0
            else:
                # Create new track
                active_tracks[current_track_id] = {
                    'detections': [(frame_detection.frame_number, ball_detection)],
                    'missing_frames': 0
                }
                current_track_id += 1
        
        # Finalize remaining active tracks
        for track_id, track_data in active_tracks.items():
            track = self._finalize_track(track_id, track_data)
            tracks.append(track)
        
        return tracks
    
    def _find_best_matching_track(
        self,
        ball_detection: Detection,
        active_tracks: Dict[int, Dict],
        frame_number: int
    ) -> Optional[int]:
        """Find the best matching active track for a ball detection."""
        best_track_id = None
        best_distance = float('inf')
        max_distance_threshold = 100  # pixels
        
        ball_center = ball_detection.bounding_box.center
        
        for track_id, track_data in active_tracks.items():
            if not track_data['detections']:
                continue
            
            # Get last detection in track
            last_frame, last_detection = track_data['detections'][-1]
            last_center = last_detection.bounding_box.center
            
            # Calculate distance
            distance = np.sqrt(
                (ball_center[0] - last_center[0]) ** 2 +
                (ball_center[1] - last_center[1]) ** 2
            )
            
            # Consider temporal distance as well
            frame_gap = frame_number - last_frame
            temporal_penalty = frame_gap * 10  # Penalty for frame gaps
            
            total_distance = distance + temporal_penalty
            
            if total_distance < best_distance and distance < max_distance_threshold:
                best_distance = total_distance
                best_track_id = track_id
        
        return best_track_id
    
    def _finalize_track(self, track_id: int, track_data: Dict) -> TrackingResult:
        """Create a TrackingResult from track data."""
        return TrackingResult(
            track_id=track_id,
            detection_type=DetectionType.BALL,
            frame_detections=track_data['detections']
        )
    
    def _calculate_tracking_statistics(
        self,
        ball_detections: List[FrameDetections],
        ball_tracks: List[TrackingResult]
    ) -> Dict[str, Any]:
        """Calculate ball tracking statistics."""
        total_frames = len(ball_detections)
        frames_with_ball = len([fd for fd in ball_detections if fd.get_ball_detections()])
        total_ball_detections = sum(len(fd.get_ball_detections()) for fd in ball_detections)
        
        track_lengths = [len(track.frame_detections) for track in ball_tracks]
        average_track_length = np.mean(track_lengths) if track_lengths else 0
        
        return {
            'total_ball_detections': total_ball_detections,
            'frames_with_ball': frames_with_ball,
            'ball_visibility_percentage': (frames_with_ball / max(total_frames, 1)) * 100,
            'average_track_length': average_track_length,
            'longest_track': max(track_lengths) if track_lengths else 0,
            'total_tracks': len(ball_tracks)
        }
    
    def _get_default_ball_colors(self) -> List[Tuple[Tuple[int, int, int], Tuple[int, int, int]]]:
        """Get default color ranges for ball detection."""
        return [
            # White ball (common in football)
            ((200, 200, 200), (255, 255, 255)),
            # Orange ball (training/indoor)
            ((200, 100, 0), (255, 180, 100)),
            # Yellow ball (some leagues)
            ((200, 200, 0), (255, 255, 100))
        ]
    
    def _get_required_input_keys(self) -> List[str]:
        return ['frames_directory', 'frame_files', 'frame_detections']
    
    def _get_required_output_keys(self) -> List[str]:
        return ['ball_detections', 'ball_tracks', 'tracking_statistics']


class BallDetector:
    """Simplified ball detector using computer vision techniques."""
    
    def __init__(self, min_radius: int, max_radius: int, color_ranges: List):
        self.min_radius = min_radius
        self.max_radius = max_radius
        self.color_ranges = color_ranges
    
    def detect(self, frame: np.ndarray, exclude_boxes: List[BoundingBox]) -> List[Detection]:
        """Detect ball candidates in frame."""
        detections = []
        
        # Convert to HSV for better color detection
        hsv = cv2.cvtColor(frame, cv2.COLOR_RGB2HSV)
        
        # Create mask for ball colors
        mask = np.zeros(hsv.shape[:2], dtype=np.uint8)
        for (lower, upper) in self.color_ranges:
            color_mask = cv2.inRange(hsv, np.array(lower), np.array(upper))
            mask = cv2.bitwise_or(mask, color_mask)
        
        # Find circles using HoughCircles
        gray = cv2.cvtColor(frame, cv2.COLOR_RGB2GRAY)
        circles = cv2.HoughCircles(
            gray,
            cv2.HOUGH_GRADIENT,
            dp=1,
            minDist=30,
            param1=50,
            param2=30,
            minRadius=self.min_radius,
            maxRadius=self.max_radius
        )
        
        if circles is not None:
            circles = np.round(circles[0, :]).astype("int")
            
            for (x, y, r) in circles:
                # Check if circle overlaps with player boxes
                if self._overlaps_with_players(x, y, r, exclude_boxes):
                    continue
                
                # Calculate confidence based on color match and circularity
                confidence = self._calculate_confidence(frame, mask, x, y, r)
                
                if confidence > 0.1:  # Minimum confidence threshold
                    bbox = BoundingBox(
                        x=float(x - r),
                        y=float(y - r),
                        width=float(2 * r),
                        height=float(2 * r)
                    )
                    
                    detection = Detection(
                        detection_type=DetectionType.BALL,
                        confidence=confidence,
                        bounding_box=bbox,
                        metadata={
                            'center': (int(x), int(y)),
                            'radius': int(r),
                            'detection_method': 'hough_circles'
                        }
                    )
                    
                    detections.append(detection)
        
        return detections
    
    def _overlaps_with_players(
        self, 
        x: int, 
        y: int, 
        r: int, 
        player_boxes: List[BoundingBox]
    ) -> bool:
        """Check if ball candidate overlaps with player detections."""
        ball_box = BoundingBox(x - r, y - r, 2 * r, 2 * r)
        
        for player_box in player_boxes:
            if ball_box.intersects(player_box):
                return True
        
        return False
    
    def _calculate_confidence(
        self, 
        frame: np.ndarray, 
        color_mask: np.ndarray, 
        x: int, 
        y: int, 
        r: int
    ) -> float:
        """Calculate confidence score for ball detection."""
        # Create circular mask
        circle_mask = np.zeros(frame.shape[:2], dtype=np.uint8)
        cv2.circle(circle_mask, (x, y), r, 255, -1)
        
        # Calculate color match ratio
        color_match_pixels = cv2.bitwise_and(color_mask, circle_mask)
        color_ratio = np.sum(color_match_pixels > 0) / np.sum(circle_mask > 0)
        
        # Simple confidence calculation
        confidence = min(color_ratio * 2, 1.0)  # Scale and cap at 1.0
        
        return confidence


class KalmanBallTracker:
    """Kalman filter-based ball tracker."""
    
    def __init__(self):
        # Simplified Kalman filter implementation
        pass


class ParticleFilterTracker:
    """Particle filter-based ball tracker."""
    
    def __init__(self):
        # Simplified particle filter implementation
        pass


class SimpleBallTracker:
    """Simple nearest-neighbor ball tracker."""
    
    def __init__(self):
        pass
