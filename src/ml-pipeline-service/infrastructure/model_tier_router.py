"""
Model Tier Router - Intelligent routing between Free, Premium, and Local models
Handles fallbacks, load balancing, and cost optimization
"""

import asyncio
import logging
from typing import Any, Dict, List, Optional, Union, Tuple
from dataclasses import dataclass
from enum import Enum
import random
from datetime import datetime, timedelta

from .model_registry import ModelRegistry, ModelType, ModelCategory, ModelMetadata, model_registry
from .external_model_clients.openai_client import create_openai_client
from .external_model_clients.anthropic_client import create_anthropic_client
from .external_model_clients.huggingface_client import create_huggingface_client
from .external_model_clients.local_model_client import create_local_model_client

logger = logging.getLogger(__name__)

class RoutingStrategy(str, Enum):
    COST_OPTIMIZED = "cost_optimized"  # Start with free, fallback to premium
    PERFORMANCE_OPTIMIZED = "performance_optimized"  # Start with premium/local
    BALANCED = "balanced"  # Distribute load across tiers
    LOCAL_FIRST = "local_first"  # Prefer local models
    FREE_ONLY = "free_only"  # Only use free tier
    PREMIUM_ONLY = "premium_only"  # Only use premium tier

@dataclass
class RoutingResult:
    model_name: str
    tier: ModelType
    response: Any
    response_time_ms: float
    cost_estimate: float
    fallback_used: bool = False
    error: Optional[str] = None

@dataclass
class RoutingConfig:
    strategy: RoutingStrategy = RoutingStrategy.COST_OPTIMIZED
    max_fallbacks: int = 3
    timeout_ms: int = 30000
    enable_caching: bool = True
    cost_threshold: float = 1.0  # Maximum cost per request
    preferred_providers: List[str] = None
    excluded_providers: List[str] = None

class ModelTierRouter:
    """Intelligent router for multi-tier model system"""
    
    def __init__(self, config: RoutingConfig = None):
        self.config = config or RoutingConfig()
        self.registry = model_registry
        self.loaded_clients = {}
        self.api_keys = {}
        self.performance_stats = {}
        self._cache = {} if self.config.enable_caching else None
        
    def set_api_key(self, provider: str, api_key: str) -> None:
        """Set API key for external providers"""
        self.api_keys[provider] = api_key
        logger.info(f"API key set for provider: {provider}")
    
    def set_api_keys(self, keys: Dict[str, str]) -> None:
        """Set multiple API keys"""
        self.api_keys.update(keys)
        logger.info(f"API keys set for providers: {list(keys.keys())}")
    
    async def route_request(
        self,
        category: ModelCategory,
        input_data: Any,
        preferred_tier: Optional[ModelType] = None,
        fallback_tiers: Optional[List[ModelType]] = None,
        **kwargs
    ) -> RoutingResult:
        """
        Route a request to the best available model
        
        Args:
            category: Type of model needed (object_detection, computer_vision, etc.)
            input_data: Input data for the model
            preferred_tier: Preferred model tier (optional)
            fallback_tiers: List of fallback tiers if preferred fails
            **kwargs: Additional parameters for the model
        """
        start_time = datetime.now()
        
        try:
            # Determine routing order
            routing_order = self._get_routing_order(category, preferred_tier, fallback_tiers)
            
            last_error = None
            for i, (tier, model_name) in enumerate(routing_order):
                try:
                    # Check rate limits
                    if not self.registry.check_rate_limits(model_name):
                        logger.warning(f"Rate limit exceeded for model: {model_name}")
                        continue
                    \n                    # Get or create client\n                    client = await self._get_or_create_client(model_name)\n                    if not client:\n                        continue\n                    \n                    # Check cache first\n                    cache_key = self._get_cache_key(model_name, input_data, kwargs)\n                    if self._cache and cache_key in self._cache:\n                        cached_result = self._cache[cache_key]\n                        logger.info(f"Cache hit for model: {model_name}")\n                        return RoutingResult(\n                            model_name=model_name,\n                            tier=tier,\n                            response=cached_result['response'],\n                            response_time_ms=cached_result['response_time_ms'],\n                            cost_estimate=cached_result['cost_estimate'],\n                            fallback_used=i > 0\n                        )\n                    \n                    # Make prediction\n                    response = await asyncio.wait_for(\n                        client.predict(input_data),\n                        timeout=self.config.timeout_ms / 1000\n                    )\n                    \n                    response_time_ms = (datetime.now() - start_time).total_seconds() * 1000\n                    cost_estimate = self._estimate_cost(model_name, input_data, response)\n                    \n                    # Update usage stats\n                    tokens_used = self._extract_token_count(response)\n                    self.registry.update_usage_stats(\n                        model_name, \n                        tokens_used=tokens_used,\n                        latency_ms=response_time_ms,\n                        success=True\n                    )\n                    \n                    # Cache result\n                    if self._cache:\n                        self._cache[cache_key] = {\n                            'response': response,\n                            'response_time_ms': response_time_ms,\n                            'cost_estimate': cost_estimate,\n                            'timestamp': datetime.now()\n                        }\n                    \n                    logger.info(f"Successful prediction with model: {model_name} ({tier.value})")\n                    \n                    return RoutingResult(\n                        model_name=model_name,\n                        tier=tier,\n                        response=response,\n                        response_time_ms=response_time_ms,\n                        cost_estimate=cost_estimate,\n                        fallback_used=i > 0\n                    )\n                    \n                except asyncio.TimeoutError:\n                    error_msg = f"Timeout for model: {model_name}"\n                    logger.warning(error_msg)\n                    last_error = error_msg\n                    self.registry.update_usage_stats(model_name, success=False)\n                    continue\n                    \n                except Exception as e:\n                    error_msg = f"Error with model {model_name}: {str(e)}"\n                    logger.warning(error_msg)\n                    last_error = error_msg\n                    self.registry.update_usage_stats(model_name, success=False)\n                    continue\n            \n            # All models failed\n            return RoutingResult(\n                model_name="none",\n                tier=ModelType.FREE,\n                response=None,\n                response_time_ms=(datetime.now() - start_time).total_seconds() * 1000,\n                cost_estimate=0.0,\n                fallback_used=True,\n                error=f"All models failed. Last error: {last_error}"\n            )\n            \n        except Exception as e:\n            logger.error(f"Routing failed: {e}")\n            return RoutingResult(\n                model_name="none",\n                tier=ModelType.FREE,\n                response=None,\n                response_time_ms=(datetime.now() - start_time).total_seconds() * 1000,\n                cost_estimate=0.0,\n                error=str(e)\n            )\n    \n    def _get_routing_order(self, category: ModelCategory, preferred_tier: Optional[ModelType], fallback_tiers: Optional[List[ModelType]]) -> List[Tuple[ModelType, str]]:\n        """Determine the order of models to try"""\n        available_models = self.registry.get_models_by_category(category)\n        \n        if not available_models:\n            return []\n        \n        # Filter by preferred/excluded providers\n        if self.config.preferred_providers:\n            available_models = [m for m in available_models if m.provider.value in self.config.preferred_providers]\n        \n        if self.config.excluded_providers:\n            available_models = [m for m in available_models if m.provider.value not in self.config.excluded_providers]\n        \n        routing_order = []\n        \n        if preferred_tier:\n            # Start with preferred tier\n            tier_models = [m for m in available_models if m.tier == preferred_tier]\n            routing_order.extend([(preferred_tier, m.name) for m in tier_models])\n        \n        # Apply strategy\n        if self.config.strategy == RoutingStrategy.COST_OPTIMIZED:\n            # Free -> Premium -> Local\n            for tier in [ModelType.FREE, ModelType.PREMIUM, ModelType.LOCAL]:\n                if preferred_tier == tier:\n                    continue\n                tier_models = [m for m in available_models if m.tier == tier]\n                routing_order.extend([(tier, m.name) for m in tier_models])\n        \n        elif self.config.strategy == RoutingStrategy.PERFORMANCE_OPTIMIZED:\n            # Local -> Premium -> Free\n            for tier in [ModelType.LOCAL, ModelType.PREMIUM, ModelType.FREE]:\n                if preferred_tier == tier:\n                    continue\n                tier_models = [m for m in available_models if m.tier == tier]\n                routing_order.extend([(tier, m.name) for m in tier_models])\n        \n        elif self.config.strategy == RoutingStrategy.LOCAL_FIRST:\n            # Local -> Free -> Premium\n            for tier in [ModelType.LOCAL, ModelType.FREE, ModelType.PREMIUM]:\n                if preferred_tier == tier:\n                    continue\n                tier_models = [m for m in available_models if m.tier == tier]\n                routing_order.extend([(tier, m.name) for m in tier_models])\n        \n        elif self.config.strategy == RoutingStrategy.BALANCED:\n            # Random distribution across all tiers\n            remaining_models = [m for m in available_models if not preferred_tier or m.tier != preferred_tier]\n            random.shuffle(remaining_models)\n            routing_order.extend([(m.tier, m.name) for m in remaining_models])\n        \n        elif self.config.strategy == RoutingStrategy.FREE_ONLY:\n            # Only free models\n            free_models = [m for m in available_models if m.tier == ModelType.FREE]\n            routing_order.extend([(ModelType.FREE, m.name) for m in free_models])\n        \n        elif self.config.strategy == RoutingStrategy.PREMIUM_ONLY:\n            # Only premium models\n            premium_models = [m for m in available_models if m.tier == ModelType.PREMIUM]\n            routing_order.extend([(ModelType.PREMIUM, m.name) for m in premium_models])\n        \n        # Add fallback tiers if specified\n        if fallback_tiers:\n            for tier in fallback_tiers:\n                if tier in [t for t, _ in routing_order]:\n                    continue\n                tier_models = [m for m in available_models if m.tier == tier]\n                routing_order.extend([(tier, m.name) for m in tier_models])\n        \n        # Sort by performance stats (success rate, latency)\n        routing_order = self._sort_by_performance(routing_order)\n        \n        return routing_order[:self.config.max_fallbacks + 1]\n    \n    def _sort_by_performance(self, routing_order: List[Tuple[ModelType, str]]) -> List[Tuple[ModelType, str]]:\n        """Sort models by performance metrics"""\n        def performance_score(model_name: str) -> float:\n            stats = self.registry.get_usage_stats(model_name)\n            if not stats or stats.success_count == 0:\n                return 0.5  # Default score for new models\n            \n            success_rate = stats.success_count / (stats.success_count + stats.error_count)\n            latency_score = max(0, 1 - (stats.average_latency_ms / 10000))  # Normalize latency\n            \n            return success_rate * 0.7 + latency_score * 0.3\n        \n        return sorted(routing_order, key=lambda x: performance_score(x[1]), reverse=True)\n    \n    async def _get_or_create_client(self, model_name: str):\n        """Get existing client or create new one"""\n        if model_name in self.loaded_clients:\n            return self.loaded_clients[model_name]\n        \n        metadata = self.registry.get_model(model_name)\n        if not metadata:\n            return None\n        \n        try:\n            if metadata.tier == ModelType.LOCAL:\n                client = create_local_model_client(metadata)\n            elif metadata.provider.value == "openai":\n                api_key = self.api_keys.get("openai")\n                if not api_key:\n                    logger.warning("OpenAI API key not set")\n                    return None\n                client = create_openai_client(metadata, api_key)\n            elif metadata.provider.value == "anthropic":\n                api_key = self.api_keys.get("anthropic")\n                if not api_key:\n                    logger.warning("Anthropic API key not set")\n                    return None\n                client = create_anthropic_client(metadata, api_key)\n            elif metadata.provider.value == "huggingface":\n                api_key = self.api_keys.get("huggingface")  # Optional for free tier\n                client = create_huggingface_client(metadata, api_key)\n            else:\n                logger.warning(f"Unknown provider: {metadata.provider.value}")\n                return None\n            \n            await client.load()\n            self.loaded_clients[model_name] = client\n            return client\n            \n        except Exception as e:\n            logger.error(f"Failed to create client for {model_name}: {e}")\n            return None\n    \n    def _get_cache_key(self, model_name: str, input_data: Any, kwargs: Dict[str, Any]) -> str:\n        """Generate cache key for request"""\n        # Simple hash-based cache key\n        import hashlib\n        key_data = f"{model_name}_{str(input_data)[:100]}_{str(sorted(kwargs.items()))}"  # Limit input_data to avoid huge keys\n        return hashlib.md5(key_data.encode()).hexdigest()\n    \n    def _estimate_cost(self, model_name: str, input_data: Any, response: Any) -> float:\n        """Estimate cost of the request"""\n        metadata = self.registry.get_model(model_name)\n        if not metadata:\n            return 0.0\n        \n        if metadata.tier == ModelType.FREE:\n            return 0.0\n        elif metadata.tier == ModelType.LOCAL:\n            # Estimate based on compute cost (GPU time, energy, etc.)\n            return 0.001  # Minimal local cost\n        elif metadata.tier == ModelType.PREMIUM:\n            # Estimate based on tokens/API calls\n            tokens = self._extract_token_count(response)\n            if metadata.provider.value == "openai":\n                # Rough estimate: $0.01 per 1K tokens for GPT-4\n                return (tokens / 1000) * 0.01\n            elif metadata.provider.value == "anthropic":\n                # Rough estimate: $0.015 per 1K tokens for Claude\n                return (tokens / 1000) * 0.015\n            else:\n                return 0.01  # Default premium cost\n        \n        return 0.0\n    \n    def _extract_token_count(self, response: Any) -> int:\n        """Extract token count from response"""\n        if hasattr(response, 'usage'):\n            if hasattr(response.usage, 'total_tokens'):\n                return response.usage.total_tokens\n            elif isinstance(response.usage, dict):\n                return response.usage.get('input_tokens', 0) + response.usage.get('output_tokens', 0)\n        return 0\n    \n    async def batch_route_requests(\n        self,\n        category: ModelCategory,\n        input_batch: List[Any],\n        preferred_tier: Optional[ModelType] = None,\n        **kwargs\n    ) -> List[RoutingResult]:\n        """Route multiple requests efficiently"""\n        # For now, process sequentially\n        # TODO: Implement intelligent batching based on model capabilities\n        results = []\n        for input_data in input_batch:\n            result = await self.route_request(category, input_data, preferred_tier, **kwargs)\n            results.append(result)\n        return results\n    \n    async def unload_all_clients(self) -> None:\n        """Unload all loaded model clients"""\n        for model_name, client in self.loaded_clients.items():\n            try:\n                await client.unload()\n                logger.info(f"Unloaded client: {model_name}")\n            except Exception as e:\n                logger.error(f"Failed to unload client {model_name}: {e}")\n        \n        self.loaded_clients.clear()\n    \n    def get_routing_stats(self) -> Dict[str, Any]:\n        """Get routing and performance statistics"""\n        stats = {\n            "loaded_clients": len(self.loaded_clients),\n            "cache_size": len(self._cache) if self._cache else 0,\n            "models_by_tier": {},\n            "usage_stats": {}\n        }\n        \n        # Models by tier\n        for tier in ModelType:\n            models = self.registry.get_models_by_tier(tier)\n            stats["models_by_tier"][tier.value] = len(models)\n        \n        # Usage statistics\n        for model_name in self.registry.get_available_models():\n            usage_stats = self.registry.get_usage_stats(model_name)\n            if usage_stats:\n                stats["usage_stats"][model_name] = {\n                    "success_rate": usage_stats.success_count / (usage_stats.success_count + usage_stats.error_count) if (usage_stats.success_count + usage_stats.error_count) > 0 else 0,\n                    "average_latency_ms": usage_stats.average_latency_ms,\n                    "requests_today": usage_stats.requests_today,\n                    "within_rate_limits": self.registry.check_rate_limits(model_name)\n                }\n        \n        return stats\n\n# Global router instance\nmodel_router = ModelTierRouter()