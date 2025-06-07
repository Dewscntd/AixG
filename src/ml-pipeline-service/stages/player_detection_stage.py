import os
from typing import Dict, Any, List, Tuple
import asyncio
import numpy as np
from PIL import Image

from .base_stage import GPUStage
from ..domain.value_objects.detection_result import (
    Detection, FrameDetections, BoundingBox, DetectionType, TeamColor
)


class PlayerDetectionStage(GPUStage):
    """
    Stage responsible for detecting players in video frames using YOLO.
    Implements GPU-optimized batch processing for efficient inference.
    """
    
    def __init__(self):
        super().__init__(name="player_detection", dependencies=["video_decoding"])
        self._model = None
        self._model_loaded = False
    
    async def _execute_gpu_stage(
        self, 
        input_data: Dict[str, Any], 
        config: Dict[str, Any]
    ) -> Tuple[Dict[str, Any], Dict[str, Any]]:
        """
        Detect players in video frames using YOLO model.
        
        Args:
            input_data: Contains frames_directory, frame_files, etc.
            config: Stage configuration including model settings
            
        Returns:
            Tuple of (output_data, metadata)
        """
        frames_directory = input_data['frames_directory']
        frame_files = input_data['frame_files']
        batch_size = config.get('batch_size', 8)
        confidence_threshold = config.get('confidence_threshold', 0.5)
        nms_threshold = config.get('nms_threshold', 0.4)
        
        # Load model if not already loaded
        await self._load_model(config)
        
        # Process frames in batches
        all_detections = []
        total_batches = (len(frame_files) + batch_size - 1) // batch_size
        
        for batch_idx in range(total_batches):
            start_idx = batch_idx * batch_size
            end_idx = min(start_idx + batch_size, len(frame_files))
            batch_files = frame_files[start_idx:end_idx]
            
            self._log_progress(
                f"Processing batch {batch_idx + 1}/{total_batches}",
                (batch_idx / total_batches) * 100
            )
            
            # Process batch
            batch_detections = await self._process_frame_batch(
                frames_directory,
                batch_files,
                start_idx,
                confidence_threshold,
                nms_threshold
            )
            
            all_detections.extend(batch_detections)
        
        # Calculate statistics
        detection_stats = self._calculate_detection_statistics(all_detections)
        
        output_data = {
            'frame_detections': all_detections,
            'detection_statistics': detection_stats
        }
        
        stage_metadata = {
            'model_name': config.get('model_name', 'yolov8n'),
            'confidence_threshold': confidence_threshold,
            'nms_threshold': nms_threshold,
            'total_detections': detection_stats['total_detections'],
            'average_detections_per_frame': detection_stats['avg_detections_per_frame'],
            'gpu_used': self._is_gpu_available()
        }
        
        return output_data, stage_metadata
    
    async def _load_model(self, config: Dict[str, Any]) -> None:
        """Load YOLO model for player detection."""
        if self._model_loaded:
            return
        
        try:
            # Import YOLO (ultralytics)
            from ultralytics import YOLO
            
            model_name = config.get('model_name', 'yolov8n.pt')
            model_path = config.get('model_path', model_name)
            
            self._logger.info(f"Loading YOLO model: {model_path}")
            
            # Load model
            self._model = YOLO(model_path)
            
            # Move to GPU if available
            if self._is_gpu_available():
                device = self._get_device()
                self._model.to(device)
                self._logger.info(f"Model moved to {device}")
            
            self._model_loaded = True
            self._logger.info("YOLO model loaded successfully")
            
        except ImportError:
            raise RuntimeError("ultralytics package not installed. Install with: pip install ultralytics")
        except Exception as e:
            raise RuntimeError(f"Failed to load YOLO model: {e}")
    
    async def _process_frame_batch(
        self,
        frames_directory: str,
        batch_files: List[str],
        start_frame_idx: int,
        confidence_threshold: float,
        nms_threshold: float
    ) -> List[FrameDetections]:
        """Process a batch of frames for player detection."""
        batch_detections = []
        
        # Load batch images
        batch_images = []
        for frame_file in batch_files:
            frame_path = os.path.join(frames_directory, frame_file)
            image = Image.open(frame_path).convert('RGB')
            batch_images.append(np.array(image))
        
        # Run inference on batch
        results = self._model(
            batch_images,
            conf=confidence_threshold,
            iou=nms_threshold,
            verbose=False
        )
        
        # Process results
        for idx, (result, frame_file) in enumerate(zip(results, batch_files)):
            frame_number = start_frame_idx + idx
            timestamp_ms = int((frame_number / 30) * 1000)  # Assuming 30 FPS
            
            # Extract detections from YOLO result
            detections = self._extract_detections_from_yolo_result(
                result, 
                batch_images[idx].shape[:2]
            )
            
            frame_detection = FrameDetections(
                frame_number=frame_number,
                timestamp_ms=timestamp_ms,
                detections=detections,
                frame_width=batch_images[idx].shape[1],
                frame_height=batch_images[idx].shape[0],
                metadata={'frame_file': frame_file}
            )
            
            batch_detections.append(frame_detection)
        
        return batch_detections
    
    def _extract_detections_from_yolo_result(
        self, 
        yolo_result, 
        image_shape: Tuple[int, int]
    ) -> List[Detection]:
        """Extract Detection objects from YOLO result."""
        detections = []
        
        if yolo_result.boxes is None:
            return detections
        
        boxes = yolo_result.boxes.xyxy.cpu().numpy()  # x1, y1, x2, y2
        confidences = yolo_result.boxes.conf.cpu().numpy()
        class_ids = yolo_result.boxes.cls.cpu().numpy()
        
        for box, confidence, class_id in zip(boxes, confidences, class_ids):
            # YOLO class 0 is 'person' in COCO dataset
            if int(class_id) == 0:  # Person class
                x1, y1, x2, y2 = box
                
                # Create bounding box
                bbox = BoundingBox(
                    x=float(x1),
                    y=float(y1),
                    width=float(x2 - x1),
                    height=float(y2 - y1)
                )
                
                # Classify as player (simplified - in real implementation,
                # you'd use additional models for team classification)
                detection = Detection(
                    detection_type=DetectionType.PLAYER,
                    confidence=float(confidence),
                    bounding_box=bbox,
                    team_color=TeamColor.UNKNOWN,  # Will be determined in team classification stage
                    metadata={
                        'yolo_class_id': int(class_id),
                        'raw_box': box.tolist()
                    }
                )
                
                detections.append(detection)
        
        return detections
    
    def _calculate_detection_statistics(
        self, 
        all_detections: List[FrameDetections]
    ) -> Dict[str, Any]:
        """Calculate detection statistics across all frames."""
        total_detections = sum(len(fd.detections) for fd in all_detections)
        total_frames = len(all_detections)
        
        # Count detections by confidence ranges
        confidence_ranges = {
            'high_confidence': 0,  # > 0.8
            'medium_confidence': 0,  # 0.5 - 0.8
            'low_confidence': 0  # < 0.5
        }
        
        for frame_detection in all_detections:
            for detection in frame_detection.detections:
                if detection.confidence > 0.8:
                    confidence_ranges['high_confidence'] += 1
                elif detection.confidence > 0.5:
                    confidence_ranges['medium_confidence'] += 1
                else:
                    confidence_ranges['low_confidence'] += 1
        
        return {
            'total_detections': total_detections,
            'total_frames': total_frames,
            'avg_detections_per_frame': total_detections / max(total_frames, 1),
            'confidence_distribution': confidence_ranges,
            'frames_with_detections': len([fd for fd in all_detections if fd.detections]),
            'detection_rate': len([fd for fd in all_detections if fd.detections]) / max(total_frames, 1)
        }
    
    def _get_required_input_keys(self) -> List[str]:
        return ['frames_directory', 'frame_files']
    
    def _get_required_output_keys(self) -> List[str]:
        return ['frame_detections', 'detection_statistics']
    
    async def _create_checkpoint_data(
        self, 
        output_data: Dict[str, Any], 
        metadata: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Create checkpoint data for recovery."""
        return {
            'total_detections': metadata['total_detections'],
            'frames_processed': len(output_data['frame_detections']),
            'model_loaded': self._model_loaded
        }
