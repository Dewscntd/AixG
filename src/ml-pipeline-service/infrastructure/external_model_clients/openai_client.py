"""
OpenAI API Client for Computer Vision and LLM Models
Supports GPT-4 Vision, DALL-E, and embeddings
"""

import asyncio
import base64
import io
import logging
from typing import Any, Dict, List, Optional, Union
from dataclasses import dataclass
from PIL import Image
import numpy as np

import aiohttp
import openai
from openai import AsyncOpenAI

from ..model_registry import ModelInterface, ModelMetadata

logger = logging.getLogger(__name__)

@dataclass
class OpenAIResponse:
    content: str
    usage: Dict[str, int]
    model: str
    finish_reason: str
    response_time_ms: float

class OpenAIVisionClient(ModelInterface):
    """OpenAI GPT-4 Vision client for image analysis"""
    
    def __init__(self, metadata: ModelMetadata, api_key: str):
        self.metadata = metadata
        self.client = AsyncOpenAI(api_key=api_key)
        self._loaded = False
        
    async def load(self) -> None:
        """Initialize the client"""
        try:
            # Test the connection
            await self.client.models.list()
            self._loaded = True
            logger.info(f"OpenAI client loaded: {self.metadata.name}")
        except Exception as e:
            logger.error(f"Failed to initialize OpenAI client: {e}")
            raise
    
    def is_loaded(self) -> bool:
        return self._loaded
    
    async def unload(self) -> None:
        """Close the client"""
        if hasattr(self.client, '_client'):
            await self.client._client.aclose()
        self._loaded = False
        logger.info(f"OpenAI client unloaded: {self.metadata.name}")
    
    async def predict(self, input_data: Union[Dict[str, Any], np.ndarray, Image.Image]) -> OpenAIResponse:
        """
        Make a prediction using GPT-4 Vision
        
        Args:
            input_data: Can be:
                - Dict with 'image' and 'prompt' keys
                - NumPy array (image)
                - PIL Image
        """
        if not self._loaded:
            await self.load()
        
        # Process input
        if isinstance(input_data, dict):
            image = input_data.get('image')
            prompt = input_data.get('prompt', "Analyze this image and describe what you see.")
            max_tokens = input_data.get('max_tokens', 1000)
        else:
            image = input_data
            prompt = "Analyze this image and describe what you see."
            max_tokens = 1000
        
        # Convert image to base64
        image_base64 = self._image_to_base64(image)
        
        try:
            import time
            start_time = time.time()
            
            response = await self.client.chat.completions.create(
                model="gpt-4-vision-preview",
                messages=[
                    {
                        "role": "user",
                        "content": [
                            {"type": "text", "text": prompt},
                            {
                                "type": "image_url",
                                "image_url": {
                                    "url": f"data:image/jpeg;base64,{image_base64}",
                                    "detail": "high"
                                }
                            }
                        ]
                    }
                ],
                max_tokens=max_tokens
            )
            
            response_time_ms = (time.time() - start_time) * 1000
            
            return OpenAIResponse(
                content=response.choices[0].message.content,
                usage=response.usage.model_dump() if response.usage else {},
                model=response.model,
                finish_reason=response.choices[0].finish_reason,
                response_time_ms=response_time_ms
            )
            
        except Exception as e:
            logger.error(f"OpenAI Vision prediction failed: {e}")
            raise
    
    async def batch_predict(self, input_batch: List[Any]) -> List[OpenAIResponse]:
        """Make batch predictions (sequential due to rate limits)"""
        results = []
        for input_data in input_batch:
            try:
                result = await self.predict(input_data)
                results.append(result)
                # Small delay to respect rate limits
                await asyncio.sleep(0.1)
            except Exception as e:
                logger.error(f"Batch prediction failed for item: {e}")
                # Continue with other items
                results.append(None)
        return results
    
    def _image_to_base64(self, image: Union[np.ndarray, Image.Image, str]) -> str:
        """Convert image to base64 string"""
        if isinstance(image, str):
            # Assume it's already base64 or file path
            if image.startswith('data:image'):
                return image.split(',')[1]
            elif image.startswith('/') or image.startswith('.'):
                # File path
                with open(image, 'rb') as f:
                    return base64.b64encode(f.read()).decode('utf-8')
            else:
                return image
        
        elif isinstance(image, np.ndarray):
            # Convert numpy array to PIL Image
            image = Image.fromarray(image.astype('uint8'))
        
        if isinstance(image, Image.Image):
            # Convert PIL Image to base64
            buffer = io.BytesIO()
            image.save(buffer, format='JPEG', quality=85)
            return base64.b64encode(buffer.getvalue()).decode('utf-8')
        
        raise ValueError(f"Unsupported image type: {type(image)}")

class OpenAIEmbeddingClient(ModelInterface):
    """OpenAI Embeddings client for text/image embeddings"""
    
    def __init__(self, metadata: ModelMetadata, api_key: str):
        self.metadata = metadata
        self.client = AsyncOpenAI(api_key=api_key)
        self._loaded = False
        
    async def load(self) -> None:
        """Initialize the client"""
        try:
            await self.client.models.list()
            self._loaded = True
            logger.info(f"OpenAI Embedding client loaded: {self.metadata.name}")
        except Exception as e:
            logger.error(f"Failed to initialize OpenAI Embedding client: {e}")
            raise
    
    def is_loaded(self) -> bool:
        return self._loaded
    
    async def unload(self) -> None:
        """Close the client"""
        if hasattr(self.client, '_client'):
            await self.client._client.aclose()
        self._loaded = False
    
    async def predict(self, input_data: Union[str, List[str]]) -> Dict[str, Any]:
        """Generate embeddings for text"""
        if not self._loaded:
            await self.load()
        
        try:
            import time
            start_time = time.time()
            
            response = await self.client.embeddings.create(
                model="text-embedding-3-large",
                input=input_data,
                encoding_format="float"
            )
            
            response_time_ms = (time.time() - start_time) * 1000
            
            return {
                "embeddings": [data.embedding for data in response.data],
                "usage": response.usage.model_dump() if response.usage else {},
                "model": response.model,
                "response_time_ms": response_time_ms
            }
            
        except Exception as e:
            logger.error(f"OpenAI embedding prediction failed: {e}")
            raise
    
    async def batch_predict(self, input_batch: List[str]) -> List[Dict[str, Any]]:
        """Make batch predictions for embeddings"""
        # OpenAI embeddings API supports batch processing natively
        return [await self.predict(input_batch)]

class OpenAIDALLEClient(ModelInterface):
    """OpenAI DALL-E client for image generation"""
    
    def __init__(self, metadata: ModelMetadata, api_key: str):
        self.metadata = metadata
        self.client = AsyncOpenAI(api_key=api_key)
        self._loaded = False
        
    async def load(self) -> None:
        """Initialize the client"""
        try:
            await self.client.models.list()
            self._loaded = True
            logger.info(f"OpenAI DALL-E client loaded: {self.metadata.name}")
        except Exception as e:
            logger.error(f"Failed to initialize OpenAI DALL-E client: {e}")
            raise
    
    def is_loaded(self) -> bool:
        return self._loaded
    
    async def unload(self) -> None:
        """Close the client"""
        if hasattr(self.client, '_client'):
            await self.client._client.aclose()
        self._loaded = False
    
    async def predict(self, input_data: Union[str, Dict[str, Any]]) -> Dict[str, Any]:
        """Generate images from text prompts"""
        if not self._loaded:
            await self.load()
        
        if isinstance(input_data, str):
            prompt = input_data
            size = "1024x1024"
            quality = "standard"
            n = 1
        else:
            prompt = input_data.get('prompt', '')
            size = input_data.get('size', '1024x1024')
            quality = input_data.get('quality', 'standard')
            n = input_data.get('n', 1)
        
        try:
            import time
            start_time = time.time()
            
            response = await self.client.images.generate(
                model="dall-e-3",
                prompt=prompt,
                size=size,
                quality=quality,
                n=n
            )
            
            response_time_ms = (time.time() - start_time) * 1000
            
            return {
                "images": [{"url": image.url, "revised_prompt": getattr(image, 'revised_prompt', None)} for image in response.data],
                "response_time_ms": response_time_ms
            }
            
        except Exception as e:
            logger.error(f"OpenAI DALL-E prediction failed: {e}")
            raise
    
    async def batch_predict(self, input_batch: List[Any]) -> List[Dict[str, Any]]:
        """Make batch predictions for image generation"""
        results = []
        for input_data in input_batch:
            try:
                result = await self.predict(input_data)
                results.append(result)
                # Delay between requests to respect rate limits
                await asyncio.sleep(1)
            except Exception as e:
                logger.error(f"Batch image generation failed for item: {e}")
                results.append(None)
        return results

def create_openai_client(metadata: ModelMetadata, api_key: str) -> ModelInterface:
    """Factory function to create appropriate OpenAI client"""
    if "vision" in metadata.name.lower() or metadata.category.value == "computer_vision":
        return OpenAIVisionClient(metadata, api_key)
    elif "embedding" in metadata.name.lower() or metadata.category.value == "embedding":
        return OpenAIEmbeddingClient(metadata, api_key)
    elif "dalle" in metadata.name.lower() or "image-generation" in metadata.name.lower():
        return OpenAIDALLEClient(metadata, api_key)
    else:
        # Default to vision client for general use
        return OpenAIVisionClient(metadata, api_key)