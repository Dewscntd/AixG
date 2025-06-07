from abc import ABC, abstractmethod
from typing import Dict, Any, List, Optional
import time
import logging
from datetime import datetime

from ..domain.entities.pipeline import StageResult, StageStatus


class BaseStage(ABC):
    """
    Abstract base class for all pipeline stages.
    Implements common functionality and enforces the stage interface.
    """
    
    def __init__(self, name: str, dependencies: List[str] = None):
        self._name = name
        self._dependencies = dependencies or []
        self._logger = logging.getLogger(f"{self.__class__.__module__}.{self.__class__.__name__}")
    
    @property
    def name(self) -> str:
        return self._name
    
    @property
    def dependencies(self) -> List[str]:
        return self._dependencies.copy()
    
    async def process(self, input_data: Dict[str, Any], config: Dict[str, Any]) -> StageResult:
        """
        Process the input data and return results.
        This method handles timing, error handling, and result creation.
        """
        start_time = time.time()
        
        try:
            self._logger.info(f"Starting stage {self.name}")
            
            # Validate input data
            await self._validate_input(input_data)
            
            # Perform the actual processing
            output_data, metadata = await self._execute_stage(input_data, config)
            
            # Validate output data
            await self._validate_output(output_data)
            
            processing_time_ms = int((time.time() - start_time) * 1000)
            
            self._logger.info(f"Stage {self.name} completed in {processing_time_ms}ms")
            
            return StageResult(
                stage_name=self.name,
                status=StageStatus.COMPLETED,
                output_data=output_data,
                metadata=metadata,
                processing_time_ms=processing_time_ms,
                checkpoint_data=await self._create_checkpoint_data(output_data, metadata)
            )
            
        except Exception as e:
            processing_time_ms = int((time.time() - start_time) * 1000)
            error_message = f"Stage {self.name} failed: {str(e)}"
            
            self._logger.error(error_message, exc_info=True)
            
            return StageResult(
                stage_name=self.name,
                status=StageStatus.FAILED,
                output_data={},
                metadata={'error_details': str(e)},
                error_message=error_message,
                processing_time_ms=processing_time_ms
            )
    
    async def can_process(self, input_data: Dict[str, Any]) -> bool:
        """
        Check if this stage can process the given input.
        Default implementation checks for required input keys.
        """
        try:
            await self._validate_input(input_data)
            return True
        except Exception:
            return False
    
    @abstractmethod
    async def _execute_stage(
        self, 
        input_data: Dict[str, Any], 
        config: Dict[str, Any]
    ) -> tuple[Dict[str, Any], Dict[str, Any]]:
        """
        Execute the core logic of this stage.
        
        Args:
            input_data: Input data from previous stages
            config: Stage-specific configuration
            
        Returns:
            Tuple of (output_data, metadata)
        """
        pass
    
    async def _validate_input(self, input_data: Dict[str, Any]) -> None:
        """
        Validate input data for this stage.
        Override in subclasses for stage-specific validation.
        """
        required_keys = self._get_required_input_keys()
        for key in required_keys:
            if key not in input_data:
                raise ValueError(f"Missing required input key: {key}")
    
    async def _validate_output(self, output_data: Dict[str, Any]) -> None:
        """
        Validate output data from this stage.
        Override in subclasses for stage-specific validation.
        """
        required_keys = self._get_required_output_keys()
        for key in required_keys:
            if key not in output_data:
                raise ValueError(f"Missing required output key: {key}")
    
    async def _create_checkpoint_data(
        self, 
        output_data: Dict[str, Any], 
        metadata: Dict[str, Any]
    ) -> Optional[Dict[str, Any]]:
        """
        Create checkpoint data for recovery.
        Override in subclasses if checkpoint data is needed.
        """
        return None
    
    def _get_required_input_keys(self) -> List[str]:
        """
        Get list of required input keys for this stage.
        Override in subclasses.
        """
        return []
    
    def _get_required_output_keys(self) -> List[str]:
        """
        Get list of required output keys for this stage.
        Override in subclasses.
        """
        return []
    
    def _log_progress(self, message: str, progress_percentage: Optional[float] = None) -> None:
        """Log progress message with optional percentage."""
        if progress_percentage is not None:
            self._logger.info(f"{self.name}: {message} ({progress_percentage:.1f}%)")
        else:
            self._logger.info(f"{self.name}: {message}")


class GPUStage(BaseStage):
    """
    Base class for stages that require GPU processing.
    Provides GPU-specific utilities and error handling.
    """
    
    def __init__(self, name: str, dependencies: List[str] = None, gpu_memory_fraction: float = 0.8):
        super().__init__(name, dependencies)
        self.gpu_memory_fraction = gpu_memory_fraction
        self._gpu_available = False
        self._device = None
    
    async def _execute_stage(
        self, 
        input_data: Dict[str, Any], 
        config: Dict[str, Any]
    ) -> tuple[Dict[str, Any], Dict[str, Any]]:
        """Execute stage with GPU setup and cleanup."""
        await self._setup_gpu()
        
        try:
            return await self._execute_gpu_stage(input_data, config)
        finally:
            await self._cleanup_gpu()
    
    async def _setup_gpu(self) -> None:
        """Setup GPU for processing."""
        try:
            import torch
            
            if torch.cuda.is_available():
                self._device = torch.device('cuda')
                self._gpu_available = True
                
                # Set memory fraction if specified
                if self.gpu_memory_fraction < 1.0:
                    torch.cuda.set_per_process_memory_fraction(self.gpu_memory_fraction)
                
                self._logger.info(f"GPU setup complete. Device: {self._device}")
            else:
                self._device = torch.device('cpu')
                self._gpu_available = False
                self._logger.warning("GPU not available, falling back to CPU")
                
        except ImportError:
            self._device = None
            self._gpu_available = False
            self._logger.warning("PyTorch not available, GPU processing disabled")
    
    async def _cleanup_gpu(self) -> None:
        """Cleanup GPU resources."""
        if self._gpu_available:
            try:
                import torch
                torch.cuda.empty_cache()
                self._logger.debug("GPU cache cleared")
            except ImportError:
                pass
    
    @abstractmethod
    async def _execute_gpu_stage(
        self, 
        input_data: Dict[str, Any], 
        config: Dict[str, Any]
    ) -> tuple[Dict[str, Any], Dict[str, Any]]:
        """Execute the GPU-specific stage logic."""
        pass
    
    def _get_device(self):
        """Get the current device (GPU or CPU)."""
        return self._device
    
    def _is_gpu_available(self) -> bool:
        """Check if GPU is available for processing."""
        return self._gpu_available
