"""
Anthropic Claude API Client for Computer Vision and LLM Models
Supports Claude 3.5 Sonnet with vision capabilities
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
import anthropic
from anthropic import AsyncAnthropic

from ..model_registry import ModelInterface, ModelMetadata

logger = logging.getLogger(__name__)

@dataclass
class AnthropicResponse:
    content: str
    usage: Dict[str, int]
    model: str
    stop_reason: str
    response_time_ms: float

class AnthropicVisionClient(ModelInterface):
    """Anthropic Claude Vision client for image analysis"""
    
    def __init__(self, metadata: ModelMetadata, api_key: str):
        self.metadata = metadata
        self.client = AsyncAnthropic(api_key=api_key)
        self._loaded = False
        
    async def load(self) -> None:
        """Initialize the client"""
        try:
            # Test the connection by making a simple request
            test_response = await self.client.messages.create(
                model="claude-3-5-sonnet-20241022",
                max_tokens=10,
                messages=[{"role": "user", "content": "Test"}]
            )
            self._loaded = True
            logger.info(f"Anthropic client loaded: {self.metadata.name}")
        except Exception as e:
            logger.error(f"Failed to initialize Anthropic client: {e}")
            raise
    
    def is_loaded(self) -> bool:
        return self._loaded
    
    async def unload(self) -> None:
        """Close the client"""
        if hasattr(self.client, '_client'):
            await self.client._client.aclose()
        self._loaded = False
        logger.info(f"Anthropic client unloaded: {self.metadata.name}")
    
    async def predict(self, input_data: Union[Dict[str, Any], np.ndarray, Image.Image]) -> AnthropicResponse:
        """
        Make a prediction using Claude Vision
        
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
            prompt = input_data.get('prompt', "Analyze this image and describe what you see in detail.")
            max_tokens = input_data.get('max_tokens', 1000)
            system_prompt = input_data.get('system_prompt', None)
        else:
            image = input_data
            prompt = "Analyze this image and describe what you see in detail."
            max_tokens = 1000
            system_prompt = None
        
        # Convert image to base64
        image_base64, media_type = self._image_to_base64(image)
        
        try:
            import time
            start_time = time.time()
            
            # Prepare message content
            message_content = [
                {
                    "type": "image",
                    "source": {
                        "type": "base64",
                        "media_type": media_type,
                        "data": image_base64
                    }
                },
                {
                    "type": "text",
                    "text": prompt
                }
            ]
            
            # Prepare request parameters
            request_params = {\n                "model": "claude-3-5-sonnet-20241022",\n                "max_tokens": max_tokens,\n                "messages": [{\n                    "role": "user",\n                    "content": message_content\n                }]\n            }\n            \n            if system_prompt:\n                request_params["system"] = system_prompt\n            \n            response = await self.client.messages.create(**request_params)\n            \n            response_time_ms = (time.time() - start_time) * 1000\n            \n            return AnthropicResponse(\n                content=response.content[0].text if response.content else "",\n                usage={\n                    "input_tokens": response.usage.input_tokens if response.usage else 0,\n                    "output_tokens": response.usage.output_tokens if response.usage else 0\n                },\n                model=response.model,\n                stop_reason=response.stop_reason or "unknown",\n                response_time_ms=response_time_ms\n            )\n            \n        except Exception as e:\n            logger.error(f"Anthropic Vision prediction failed: {e}")\n            raise\n    \n    async def batch_predict(self, input_batch: List[Any]) -> List[AnthropicResponse]:\n        """Make batch predictions (sequential due to rate limits)"""\n        results = []\n        for input_data in input_batch:\n            try:\n                result = await self.predict(input_data)\n                results.append(result)\n                # Small delay to respect rate limits\n                await asyncio.sleep(0.1)\n            except Exception as e:\n                logger.error(f"Batch prediction failed for item: {e}")\n                # Continue with other items\n                results.append(None)\n        return results\n    \n    def _image_to_base64(self, image: Union[np.ndarray, Image.Image, str]) -> tuple[str, str]:\n        """Convert image to base64 string and return media type"""\n        if isinstance(image, str):\n            # Assume it's a file path\n            if image.startswith('/') or image.startswith('.'):\n                with open(image, 'rb') as f:\n                    image_data = f.read()\n                    \n                # Determine media type from file extension\n                if image.lower().endswith('.png'):\n                    media_type = "image/png"\n                elif image.lower().endswith('.webp'):\n                    media_type = "image/webp"\n                elif image.lower().endswith('.gif'):\n                    media_type = "image/gif"\n                else:\n                    media_type = "image/jpeg"\n                    \n                return base64.b64encode(image_data).decode('utf-8'), media_type\n            else:\n                # Assume it's already base64\n                return image, "image/jpeg"\n        \n        elif isinstance(image, np.ndarray):\n            # Convert numpy array to PIL Image\n            image = Image.fromarray(image.astype('uint8'))\n        \n        if isinstance(image, Image.Image):\n            # Convert PIL Image to base64\n            buffer = io.BytesIO()\n            \n            # Convert to RGB if necessary\n            if image.mode != 'RGB':\n                image = image.convert('RGB')\n                \n            image.save(buffer, format='JPEG', quality=85)\n            return base64.b64encode(buffer.getvalue()).decode('utf-8'), "image/jpeg"\n        \n        raise ValueError(f"Unsupported image type: {type(image)}")\n\nclass AnthropicTextClient(ModelInterface):\n    """Anthropic Claude Text client for general LLM tasks"""\n    \n    def __init__(self, metadata: ModelMetadata, api_key: str):\n        self.metadata = metadata\n        self.client = AsyncAnthropic(api_key=api_key)\n        self._loaded = False\n        \n    async def load(self) -> None:\n        """Initialize the client"""\n        try:\n            # Test the connection\n            test_response = await self.client.messages.create(\n                model="claude-3-5-sonnet-20241022",\n                max_tokens=10,\n                messages=[{"role": "user", "content": "Test"}]\n            )\n            self._loaded = True\n            logger.info(f"Anthropic Text client loaded: {self.metadata.name}")\n        except Exception as e:\n            logger.error(f"Failed to initialize Anthropic Text client: {e}")\n            raise\n    \n    def is_loaded(self) -> bool:\n        return self._loaded\n    \n    async def unload(self) -> None:\n        """Close the client"""\n        if hasattr(self.client, '_client'):\n            await self.client._client.aclose()\n        self._loaded = False\n    \n    async def predict(self, input_data: Union[str, Dict[str, Any]]) -> AnthropicResponse:\n        """Generate text responses"""\n        if not self._loaded:\n            await self.load()\n        \n        if isinstance(input_data, str):\n            prompt = input_data\n            max_tokens = 1000\n            system_prompt = None\n            temperature = 0.7\n        else:\n            prompt = input_data.get('prompt', '')\n            max_tokens = input_data.get('max_tokens', 1000)\n            system_prompt = input_data.get('system_prompt', None)\n            temperature = input_data.get('temperature', 0.7)\n        \n        try:\n            import time\n            start_time = time.time()\n            \n            request_params = {\n                "model": "claude-3-5-sonnet-20241022",\n                "max_tokens": max_tokens,\n                "temperature": temperature,\n                "messages": [{\n                    "role": "user",\n                    "content": prompt\n                }]\n            }\n            \n            if system_prompt:\n                request_params["system"] = system_prompt\n            \n            response = await self.client.messages.create(**request_params)\n            \n            response_time_ms = (time.time() - start_time) * 1000\n            \n            return AnthropicResponse(\n                content=response.content[0].text if response.content else "",\n                usage={\n                    "input_tokens": response.usage.input_tokens if response.usage else 0,\n                    "output_tokens": response.usage.output_tokens if response.usage else 0\n                },\n                model=response.model,\n                stop_reason=response.stop_reason or "unknown",\n                response_time_ms=response_time_ms\n            )\n            \n        except Exception as e:\n            logger.error(f"Anthropic text prediction failed: {e}")\n            raise\n    \n    async def batch_predict(self, input_batch: List[Any]) -> List[AnthropicResponse]:\n        """Make batch predictions for text generation"""\n        results = []\n        for input_data in input_batch:\n            try:\n                result = await self.predict(input_data)\n                results.append(result)\n                # Small delay to respect rate limits\n                await asyncio.sleep(0.1)\n            except Exception as e:\n                logger.error(f"Batch text generation failed for item: {e}")\n                results.append(None)\n        return results\n\nclass AnthropicReasoningClient(ModelInterface):\n    """Anthropic Claude client for complex reasoning tasks"""\n    \n    def __init__(self, metadata: ModelMetadata, api_key: str):\n        self.metadata = metadata\n        self.client = AsyncAnthropic(api_key=api_key)\n        self._loaded = False\n        \n    async def load(self) -> None:\n        """Initialize the client"""\n        try:\n            test_response = await self.client.messages.create(\n                model="claude-3-5-sonnet-20241022",\n                max_tokens=10,\n                messages=[{"role": "user", "content": "Test"}]\n            )\n            self._loaded = True\n            logger.info(f"Anthropic Reasoning client loaded: {self.metadata.name}")\n        except Exception as e:\n            logger.error(f"Failed to initialize Anthropic Reasoning client: {e}")\n            raise\n    \n    def is_loaded(self) -> bool:\n        return self._loaded\n    \n    async def unload(self) -> None:\n        """Close the client"""\n        if hasattr(self.client, '_client'):\n            await self.client._client.aclose()\n        self._loaded = False\n    \n    async def predict(self, input_data: Union[str, Dict[str, Any]]) -> AnthropicResponse:\n        """Perform complex reasoning tasks"""\n        if not self._loaded:\n            await self.load()\n        \n        if isinstance(input_data, str):\n            prompt = input_data\n            max_tokens = 2000\n            system_prompt = "You are an expert reasoning assistant. Think step-by-step and provide detailed analysis."\n            temperature = 0.3  # Lower temperature for reasoning\n        else:\n            prompt = input_data.get('prompt', '')\n            max_tokens = input_data.get('max_tokens', 2000)\n            system_prompt = input_data.get('system_prompt', "You are an expert reasoning assistant. Think step-by-step and provide detailed analysis.")\n            temperature = input_data.get('temperature', 0.3)\n        \n        # Add reasoning structure to prompt\n        structured_prompt = f"""\nPlease analyze the following problem step-by-step:\n\n{prompt}\n\nProvide your analysis in this format:\n1. Understanding: What is the core problem/question?\n2. Analysis: Break down the key components\n3. Reasoning: Work through the logic step-by-step\n4. Conclusion: Provide your final answer/recommendation\n"""\n        \n        try:\n            import time\n            start_time = time.time()\n            \n            response = await self.client.messages.create(\n                model="claude-3-5-sonnet-20241022",\n                max_tokens=max_tokens,\n                temperature=temperature,\n                system=system_prompt,\n                messages=[{\n                    "role": "user",\n                    "content": structured_prompt\n                }]\n            )\n            \n            response_time_ms = (time.time() - start_time) * 1000\n            \n            return AnthropicResponse(\n                content=response.content[0].text if response.content else "",\n                usage={\n                    "input_tokens": response.usage.input_tokens if response.usage else 0,\n                    "output_tokens": response.usage.output_tokens if response.usage else 0\n                },\n                model=response.model,\n                stop_reason=response.stop_reason or "unknown",\n                response_time_ms=response_time_ms\n            )\n            \n        except Exception as e:\n            logger.error(f"Anthropic reasoning prediction failed: {e}")\n            raise\n    \n    async def batch_predict(self, input_batch: List[Any]) -> List[AnthropicResponse]:\n        """Make batch predictions for reasoning tasks"""\n        results = []\n        for input_data in input_batch:\n            try:\n                result = await self.predict(input_data)\n                results.append(result)\n                # Longer delay for complex reasoning tasks\n                await asyncio.sleep(0.2)\n            except Exception as e:\n                logger.error(f"Batch reasoning failed for item: {e}")\n                results.append(None)\n        return results\n\ndef create_anthropic_client(metadata: ModelMetadata, api_key: str) -> ModelInterface:\n    """Factory function to create appropriate Anthropic client"""\n    if "vision" in metadata.name.lower() or metadata.category.value == "computer_vision":\n        return AnthropicVisionClient(metadata, api_key)\n    elif "reasoning" in metadata.name.lower() or "analysis" in metadata.name.lower():\n        return AnthropicReasoningClient(metadata, api_key)\n    else:\n        # Default to text client\n        return AnthropicTextClient(metadata, api_key)