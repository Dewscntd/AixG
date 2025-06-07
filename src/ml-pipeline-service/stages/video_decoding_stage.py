import os
import tempfile
from typing import Dict, Any, List, Tuple
import asyncio
import subprocess
import json

from .base_stage import BaseStage


class VideoDecodingStage(BaseStage):
    """
    Stage responsible for decoding video files and extracting frames.
    Uses FFmpeg for efficient video processing.
    """
    
    def __init__(self):
        super().__init__(name="video_decoding", dependencies=[])
    
    async def _execute_stage(
        self, 
        input_data: Dict[str, Any], 
        config: Dict[str, Any]
    ) -> Tuple[Dict[str, Any], Dict[str, Any]]:
        """
        Decode video and extract frames for processing.
        
        Args:
            input_data: Contains video_path, target_fps, resolution
            config: Stage configuration
            
        Returns:
            Tuple of (output_data, metadata)
        """
        video_path = input_data['video_path']
        target_fps = config.get('target_fps', 30)
        target_resolution = config.get('target_resolution', (1920, 1080))
        extract_audio = config.get('extract_audio', False)
        
        # Create temporary directory for frames
        temp_dir = tempfile.mkdtemp(prefix='video_frames_')
        
        try:
            # Extract video metadata
            metadata = await self._extract_video_metadata(video_path)
            
            # Extract frames
            frames_info = await self._extract_frames(
                video_path, 
                temp_dir, 
                target_fps, 
                target_resolution
            )
            
            # Extract audio if requested
            audio_path = None
            if extract_audio:
                audio_path = await self._extract_audio(video_path, temp_dir)
            
            output_data = {
                'frames_directory': temp_dir,
                'frame_files': frames_info['frame_files'],
                'total_frames': frames_info['total_frames'],
                'actual_fps': frames_info['actual_fps'],
                'resolution': frames_info['resolution'],
                'audio_path': audio_path,
                'video_metadata': metadata
            }
            
            stage_metadata = {
                'original_duration': metadata['duration'],
                'original_fps': metadata['fps'],
                'original_resolution': (metadata['width'], metadata['height']),
                'compression_ratio': self._calculate_compression_ratio(metadata, frames_info),
                'processing_method': 'ffmpeg'
            }
            
            return output_data, stage_metadata
            
        except Exception as e:
            # Cleanup on error
            await self._cleanup_temp_directory(temp_dir)
            raise e
    
    async def _extract_video_metadata(self, video_path: str) -> Dict[str, Any]:
        """Extract video metadata using ffprobe."""
        cmd = [
            'ffprobe',
            '-v', 'quiet',
            '-print_format', 'json',
            '-show_format',
            '-show_streams',
            video_path
        ]
        
        process = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE
        )
        
        stdout, stderr = await process.communicate()
        
        if process.returncode != 0:
            raise RuntimeError(f"ffprobe failed: {stderr.decode()}")
        
        probe_data = json.loads(stdout.decode())
        
        # Find video stream
        video_stream = None
        for stream in probe_data['streams']:
            if stream['codec_type'] == 'video':
                video_stream = stream
                break
        
        if not video_stream:
            raise ValueError("No video stream found in file")
        
        return {
            'duration': float(probe_data['format']['duration']),
            'fps': eval(video_stream['r_frame_rate']),  # Convert fraction to float
            'width': video_stream['width'],
            'height': video_stream['height'],
            'codec': video_stream['codec_name'],
            'bitrate': int(probe_data['format'].get('bit_rate', 0)),
            'format': probe_data['format']['format_name']
        }
    
    async def _extract_frames(
        self, 
        video_path: str, 
        output_dir: str, 
        target_fps: int,
        target_resolution: Tuple[int, int]
    ) -> Dict[str, Any]:
        """Extract frames from video at specified FPS and resolution."""
        width, height = target_resolution
        
        # FFmpeg command for frame extraction
        cmd = [
            'ffmpeg',
            '-i', video_path,
            '-vf', f'fps={target_fps},scale={width}:{height}',
            '-q:v', '2',  # High quality
            '-f', 'image2',
            os.path.join(output_dir, 'frame_%06d.jpg')
        ]
        
        process = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE
        )
        
        stdout, stderr = await process.communicate()
        
        if process.returncode != 0:
            raise RuntimeError(f"Frame extraction failed: {stderr.decode()}")
        
        # Get list of extracted frames
        frame_files = sorted([
            f for f in os.listdir(output_dir) 
            if f.startswith('frame_') and f.endswith('.jpg')
        ])
        
        return {
            'frame_files': frame_files,
            'total_frames': len(frame_files),
            'actual_fps': target_fps,
            'resolution': target_resolution
        }
    
    async def _extract_audio(self, video_path: str, output_dir: str) -> str:
        """Extract audio track from video."""
        audio_path = os.path.join(output_dir, 'audio.wav')
        
        cmd = [
            'ffmpeg',
            '-i', video_path,
            '-vn',  # No video
            '-acodec', 'pcm_s16le',  # PCM 16-bit
            '-ar', '44100',  # Sample rate
            '-ac', '2',  # Stereo
            audio_path
        ]
        
        process = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE
        )
        
        stdout, stderr = await process.communicate()
        
        if process.returncode != 0:
            self._logger.warning(f"Audio extraction failed: {stderr.decode()}")
            return None
        
        return audio_path
    
    async def _cleanup_temp_directory(self, temp_dir: str) -> None:
        """Clean up temporary directory."""
        try:
            import shutil
            shutil.rmtree(temp_dir)
        except Exception as e:
            self._logger.warning(f"Failed to cleanup temp directory {temp_dir}: {e}")
    
    def _calculate_compression_ratio(
        self, 
        original_metadata: Dict[str, Any], 
        frames_info: Dict[str, Any]
    ) -> float:
        """Calculate compression ratio between original and extracted frames."""
        original_frames = original_metadata['duration'] * original_metadata['fps']
        extracted_frames = frames_info['total_frames']
        
        return extracted_frames / original_frames if original_frames > 0 else 1.0
    
    def _get_required_input_keys(self) -> List[str]:
        return ['video_path']
    
    def _get_required_output_keys(self) -> List[str]:
        return [
            'frames_directory', 
            'frame_files', 
            'total_frames', 
            'actual_fps', 
            'resolution'
        ]
    
    async def _create_checkpoint_data(
        self, 
        output_data: Dict[str, Any], 
        metadata: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Create checkpoint data for recovery."""
        return {
            'frames_directory': output_data['frames_directory'],
            'total_frames': output_data['total_frames'],
            'processing_completed': True
        }
