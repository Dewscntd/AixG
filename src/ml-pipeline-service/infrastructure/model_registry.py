"""
Multi-Tier Model Registry for Free, Premium & Local Models
Supports OpenAI, Anthropic, Hugging Face, Local TensorFlow/PyTorch models
"""

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from enum import Enum
from typing import Dict, List, Optional, Any, Union, AsyncIterator
import asyncio
import logging
from datetime import datetime, timedelta
import json
import os
from pathlib import Path

import torch
import numpy as np
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)

class ModelType(str, Enum):
    FREE = "free"
    PREMIUM = "premium"
    LOCAL = "local"

class ModelCategory(str, Enum):
    COMPUTER_VISION = "computer_vision"
    OBJECT_DETECTION = "object_detection"
    TRACKING = "tracking"
    ACTION_RECOGNITION = "action_recognition"
    POSE_ESTIMATION = "pose_estimation"
    LLM = "llm"
    EMBEDDING = "embedding"

class ModelProvider(str, Enum):
    OPENAI = "openai"
    ANTHROPIC = "anthropic"
    HUGGINGFACE = "huggingface"
    YOLO = "yolo"
    DETECTRON2 = "detectron2"
    PYTORCH = "pytorch"
    TENSORFLOW = "tensorflow"
    ONNX = "onnx"
    TENSORRT = "tensorrt"
    LOCAL_CUSTOM = "local_custom"

@dataclass
class RateLimits:
    requests_per_minute: int
    requests_per_day: int
    tokens_per_minute: Optional[int] = None
    tokens_per_day: Optional[int] = None
    concurrent_requests: int = 1

@dataclass
class ModelMetadata:
    name: str
    version: str
    provider: ModelProvider
    category: ModelCategory
    tier: ModelType
    description: str
    input_format: str
    output_format: str
    rate_limits: Optional[RateLimits] = None
    endpoint_url: Optional[str] = None
    local_path: Optional[Path] = None
    model_size_mb: Optional[float] = None
    gpu_memory_required_gb: Optional[float] = None
    cpu_cores_required: Optional[int] = None
    supported_formats: List[str] = field(default_factory=list)
    preprocessing_config: Dict[str, Any] = field(default_factory=dict)
    postprocessing_config: Dict[str, Any] = field(default_factory=dict)
    created_at: datetime = field(default_factory=datetime.now)
    updated_at: datetime = field(default_factory=datetime.now)

class ModelInterface(ABC):
    """Abstract interface for all model types"""
    
    @abstractmethod
    async def load(self) -> None:
        """Load the model"""
        pass
    
    @abstractmethod
    async def predict(self, input_data: Any) -> Any:
        """Make prediction"""
        pass
    
    @abstractmethod
    async def batch_predict(self, input_batch: List[Any]) -> List[Any]:
        """Make batch predictions"""
        pass
    
    @abstractmethod
    def is_loaded(self) -> bool:
        """Check if model is loaded"""
        pass
    
    @abstractmethod
    async def unload(self) -> None:
        """Unload the model from memory"""
        pass

@dataclass
class ModelUsageStats:
    model_name: str
    requests_today: int = 0
    requests_this_minute: int = 0
    tokens_today: int = 0
    tokens_this_minute: int = 0
    last_request_time: Optional[datetime] = None
    average_latency_ms: float = 0.0
    error_count: int = 0
    success_count: int = 0

class ModelRegistry:
    """Centralized registry for managing all model types"""
    
    def __init__(self, config_path: Optional[Path] = None):
        self.models: Dict[str, ModelMetadata] = {}
        self.loaded_models: Dict[str, ModelInterface] = {}
        self.usage_stats: Dict[str, ModelUsageStats] = {}
        self.config_path = config_path or Path("models_config.json")
        self._lock = asyncio.Lock()
        
        # Load configuration
        self._load_configuration()
        
    def _load_configuration(self) -> None:
        """Load model configurations from file"""
        if self.config_path.exists():
            try:
                with open(self.config_path, 'r') as f:
                    config = json.load(f)
                    self._parse_configuration(config)
                logger.info(f"Loaded {len(self.models)} model configurations")
            except Exception as e:
                logger.error(f"Failed to load model configuration: {e}")
        else:
            logger.info("No model configuration file found, using defaults")
            self._create_default_configuration()
    
    def _parse_configuration(self, config: Dict[str, Any]) -> None:
        """Parse configuration and create model metadata"""
        for model_config in config.get("models", []):
            try:
                metadata = ModelMetadata(
                    name=model_config["name"],
                    version=model_config["version"],
                    provider=ModelProvider(model_config["provider"]),
                    category=ModelCategory(model_config["category"]),
                    tier=ModelType(model_config["tier"]),
                    description=model_config["description"],
                    input_format=model_config["input_format"],
                    output_format=model_config["output_format"],
                    endpoint_url=model_config.get("endpoint_url"),
                    local_path=Path(model_config["local_path"]) if model_config.get("local_path") else None,
                    model_size_mb=model_config.get("model_size_mb"),
                    gpu_memory_required_gb=model_config.get("gpu_memory_required_gb"),
                    cpu_cores_required=model_config.get("cpu_cores_required"),
                    supported_formats=model_config.get("supported_formats", []),
                    preprocessing_config=model_config.get("preprocessing_config", {}),
                    postprocessing_config=model_config.get("postprocessing_config", {}),
                    rate_limits=RateLimits(**model_config["rate_limits"]) if model_config.get("rate_limits") else None,
                )
                self.models[metadata.name] = metadata
                self.usage_stats[metadata.name] = ModelUsageStats(model_name=metadata.name)
            except Exception as e:
                logger.error(f"Failed to parse model configuration {model_config.get('name', 'unknown')}: {e}")
    
    def _create_default_configuration(self) -> None:
        """Create default model configurations"""
        default_models = [
            # FREE TIER MODELS
            {
                "name": "yolov8n-free",
                "version": "8.0",
                "provider": "yolo",
                "category": "object_detection",
                "tier": "free",
                "description": "YOLOv8 Nano - Free object detection",
                "input_format": "image",
                "output_format": "detections",
                "local_path": "models/yolov8n.pt",
                "model_size_mb": 6.2,
                "gpu_memory_required_gb": 1.0,
                "supported_formats": ["jpg", "png", "mp4"],
                "rate_limits": {
                    "requests_per_minute": 60,
                    "requests_per_day": 1000,
                    "concurrent_requests": 2
                }
            },
            {
                "name": "huggingface-detr-free",
                "version": "1.0",
                "provider": "huggingface",
                "category": "object_detection",
                "tier": "free",
                "description": "DETR ResNet-50 from Hugging Face",
                "input_format": "image",
                "output_format": "detections",
                "endpoint_url": "https://api-inference.huggingface.co/models/facebook/detr-resnet-50",
                "rate_limits": {
                    "requests_per_minute": 30,
                    "requests_per_day": 500,
                    "concurrent_requests": 1
                }
            },
            
            # PREMIUM TIER MODELS
            {
                "name": "openai-gpt4-vision",
                "version": "4.0",
                "provider": "openai",
                "category": "computer_vision",
                "tier": "premium",
                "description": "OpenAI GPT-4 Vision for advanced image analysis",
                "input_format": "image",
                "output_format": "text",
                "endpoint_url": "https://api.openai.com/v1/chat/completions",
                "rate_limits": {
                    "requests_per_minute": 500,
                    "requests_per_day": 10000,
                    "tokens_per_minute": 10000,
                    "tokens_per_day": 100000,
                    "concurrent_requests": 5
                }
            },
            {
                "name": "anthropic-claude-vision",
                "version": "3.5",
                "provider": "anthropic",
                "category": "computer_vision",
                "tier": "premium",
                "description": "Claude 3.5 Sonnet with vision capabilities",
                "input_format": "image",
                "output_format": "text",
                "endpoint_url": "https://api.anthropic.com/v1/messages",
                "rate_limits": {
                    "requests_per_minute": 1000,
                    "requests_per_day": 50000,
                    "tokens_per_minute": 40000,
                    "tokens_per_day": 500000,
                    "concurrent_requests": 10
                }
            },
            
            # LOCAL TIER MODELS  
            {
                "name": "yolov8x-local",
                "version": "8.0",
                "provider": "yolo",
                "category": "object_detection",
                "tier": "local",
                "description": "YOLOv8 Extra Large - Local high-accuracy detection",
                "input_format": "image",
                "output_format": "detections",
                "local_path": "models/yolov8x.pt",
                "model_size_mb": 136.7,
                "gpu_memory_required_gb": 4.0,
                "supported_formats": ["jpg", "png", "mp4"],
                "rate_limits": {
                    "requests_per_minute": 1000,
                    "requests_per_day": 999999,
                    "concurrent_requests": 8
                }
            },
            {
                "name": "detectron2-local",
                "version": "2.0",
                "provider": "detectron2",
                "category": "object_detection",
                "tier": "local",
                "description": "Detectron2 Mask R-CNN - Local instance segmentation",
                "input_format": "image",
                "output_format": "detections",
                "local_path": "models/detectron2_maskrcnn.pth",
                "model_size_mb": 329.3,
                "gpu_memory_required_gb": 6.0,
                "supported_formats": ["jpg", "png"],
                "rate_limits": {
                    "requests_per_minute": 500,
                    "requests_per_day": 999999,
                    "concurrent_requests": 4
                }
            },
            {
                "name": "pytorch-pose-local",
                "version": "1.0",
                "provider": "pytorch",
                "category": "pose_estimation",
                "tier": "local",
                "description": "PyTorch Human Pose Estimation",
                "input_format": "image",
                "output_format": "keypoints",
                "local_path": "models/pose_estimation.pth",
                "model_size_mb": 156.4,
                "gpu_memory_required_gb": 3.0,
                "supported_formats": ["jpg", "png"],
                "rate_limits": {
                    "requests_per_minute": 300,
                    "requests_per_day": 999999,
                    "concurrent_requests": 3
                }
            }
        ]
        
        for model_config in default_models:
            try:
                metadata = ModelMetadata(
                    name=model_config["name"],
                    version=model_config["version"],
                    provider=ModelProvider(model_config["provider"]),
                    category=ModelCategory(model_config["category"]),
                    tier=ModelType(model_config["tier"]),
                    description=model_config["description"],
                    input_format=model_config["input_format"],
                    output_format=model_config["output_format"],
                    endpoint_url=model_config.get("endpoint_url"),
                    local_path=Path(model_config["local_path"]) if model_config.get("local_path") else None,
                    model_size_mb=model_config.get("model_size_mb"),
                    gpu_memory_required_gb=model_config.get("gpu_memory_required_gb"),
                    cpu_cores_required=model_config.get("cpu_cores_required"),
                    supported_formats=model_config.get("supported_formats", []),
                    preprocessing_config=model_config.get("preprocessing_config", {}),
                    postprocessing_config=model_config.get("postprocessing_config", {}),
                    rate_limits=RateLimits(**model_config["rate_limits"]) if model_config.get("rate_limits") else None,
                )
                self.models[metadata.name] = metadata
                self.usage_stats[metadata.name] = ModelUsageStats(model_name=metadata.name)
            except Exception as e:
                logger.error(f"Failed to create default model {model_config.get('name', 'unknown')}: {e}")
        
        # Save default configuration
        self._save_configuration()
    
    def _save_configuration(self) -> None:
        """Save current configuration to file"""
        try:
            config = {
                "models": [
                    {
                        "name": metadata.name,
                        "version": metadata.version,
                        "provider": metadata.provider.value,
                        "category": metadata.category.value,
                        "tier": metadata.tier.value,
                        "description": metadata.description,
                        "input_format": metadata.input_format,
                        "output_format": metadata.output_format,
                        "endpoint_url": metadata.endpoint_url,
                        "local_path": str(metadata.local_path) if metadata.local_path else None,
                        "model_size_mb": metadata.model_size_mb,
                        "gpu_memory_required_gb": metadata.gpu_memory_required_gb,
                        "cpu_cores_required": metadata.cpu_cores_required,
                        "supported_formats": metadata.supported_formats,
                        "preprocessing_config": metadata.preprocessing_config,
                        "postprocessing_config": metadata.postprocessing_config,
                        "rate_limits": {
                            "requests_per_minute": metadata.rate_limits.requests_per_minute,
                            "requests_per_day": metadata.rate_limits.requests_per_day,
                            "tokens_per_minute": metadata.rate_limits.tokens_per_minute,
                            "tokens_per_day": metadata.rate_limits.tokens_per_day,
                            "concurrent_requests": metadata.rate_limits.concurrent_requests,
                        } if metadata.rate_limits else None,
                    }
                    for metadata in self.models.values()
                ]
            }
            
            with open(self.config_path, 'w') as f:
                json.dump(config, f, indent=2, default=str)
            logger.info(f"Saved model configuration to {self.config_path}")
        except Exception as e:
            logger.error(f"Failed to save model configuration: {e}")
    
    def register_model(self, metadata: ModelMetadata) -> None:
        """Register a new model"""
        self.models[metadata.name] = metadata
        self.usage_stats[metadata.name] = ModelUsageStats(model_name=metadata.name)
        self._save_configuration()
        logger.info(f"Registered model: {metadata.name}")
    
    def get_model(self, name: str) -> Optional[ModelMetadata]:
        """Get model metadata by name"""
        return self.models.get(name)
    
    def get_models_by_tier(self, tier: ModelType) -> List[ModelMetadata]:
        """Get all models of a specific tier"""
        return [model for model in self.models.values() if model.tier == tier]
    
    def get_models_by_category(self, category: ModelCategory) -> List[ModelMetadata]:
        """Get all models of a specific category"""
        return [model for model in self.models.values() if model.category == category]
    
    def get_models_by_provider(self, provider: ModelProvider) -> List[ModelMetadata]:
        """Get all models from a specific provider"""
        return [model for model in self.models.values() if model.provider == provider]
    
    def get_available_models(self) -> List[str]:
        """Get list of all available model names"""
        return list(self.models.keys())
    
    def get_loaded_models(self) -> List[str]:
        """Get list of currently loaded model names"""
        return list(self.loaded_models.keys())
    
    async def load_model(self, name: str, model_instance: ModelInterface) -> None:
        """Load a model instance"""
        async with self._lock:
            await model_instance.load()
            self.loaded_models[name] = model_instance
            logger.info(f"Loaded model: {name}")
    
    async def unload_model(self, name: str) -> None:
        """Unload a model instance"""
        async with self._lock:
            if name in self.loaded_models:
                await self.loaded_models[name].unload()
                del self.loaded_models[name]
                logger.info(f"Unloaded model: {name}")
    
    async def unload_all_models(self) -> None:
        """Unload all model instances"""
        for name in list(self.loaded_models.keys()):
            await self.unload_model(name)
    
    def update_usage_stats(self, model_name: str, tokens_used: int = 0, latency_ms: float = 0.0, success: bool = True) -> None:
        """Update usage statistics for a model"""
        if model_name not in self.usage_stats:
            self.usage_stats[model_name] = ModelUsageStats(model_name=model_name)
        
        stats = self.usage_stats[model_name]
        now = datetime.now()
        
        # Reset daily counters if needed
        if stats.last_request_time and stats.last_request_time.date() != now.date():
            stats.requests_today = 0
            stats.tokens_today = 0
        
        # Reset minute counters if needed
        if stats.last_request_time and (now - stats.last_request_time).total_seconds() >= 60:
            stats.requests_this_minute = 0
            stats.tokens_this_minute = 0
        
        # Update counters
        stats.requests_today += 1
        stats.requests_this_minute += 1
        stats.tokens_today += tokens_used
        stats.tokens_this_minute += tokens_used
        stats.last_request_time = now
        
        # Update latency (moving average)
        if stats.success_count > 0:
            stats.average_latency_ms = (stats.average_latency_ms * stats.success_count + latency_ms) / (stats.success_count + 1)
        else:
            stats.average_latency_ms = latency_ms
        
        # Update success/error counts
        if success:
            stats.success_count += 1
        else:
            stats.error_count += 1
    
    def get_usage_stats(self, model_name: str) -> Optional[ModelUsageStats]:
        """Get usage statistics for a model"""
        return self.usage_stats.get(model_name)
    
    def check_rate_limits(self, model_name: str) -> bool:
        """Check if a model is within rate limits"""
        metadata = self.get_model(model_name)
        if not metadata or not metadata.rate_limits:
            return True
        
        stats = self.get_usage_stats(model_name)
        if not stats:
            return True
        
        rate_limits = metadata.rate_limits
        
        # Check daily limits
        if stats.requests_today >= rate_limits.requests_per_day:
            return False
        
        if rate_limits.tokens_per_day and stats.tokens_today >= rate_limits.tokens_per_day:
            return False
        
        # Check minute limits
        if stats.requests_this_minute >= rate_limits.requests_per_minute:
            return False
        
        if rate_limits.tokens_per_minute and stats.tokens_this_minute >= rate_limits.tokens_per_minute:
            return False
        
        return True
    
    def get_model_status(self) -> Dict[str, Any]:
        """Get comprehensive status of all models"""
        return {
            "total_models": len(self.models),
            "loaded_models": len(self.loaded_models),
            "models_by_tier": {
                tier.value: len(self.get_models_by_tier(tier))
                for tier in ModelType
            },
            "models_by_category": {
                category.value: len(self.get_models_by_category(category))
                for category in ModelCategory
            },
            "models": {
                name: {
                    "metadata": model,
                    "loaded": name in self.loaded_models,
                    "usage_stats": self.usage_stats.get(name),
                    "within_rate_limits": self.check_rate_limits(name)
                }
                for name, model in self.models.items()
            }
        }

# Global model registry instance
model_registry = ModelRegistry()