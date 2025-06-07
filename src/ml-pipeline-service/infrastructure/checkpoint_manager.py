import json
import logging
from typing import Dict, Any, Optional
from abc import ABC, abstractmethod
import redis
import asyncio


class CheckpointManager(ABC):
    """Abstract base class for checkpoint management."""
    
    @abstractmethod
    async def save_checkpoint(self, pipeline_id: str, checkpoint_data: Dict[str, Any]) -> None:
        """Save checkpoint data for a pipeline."""
        pass
    
    @abstractmethod
    async def load_checkpoint(self, pipeline_id: str) -> Optional[Dict[str, Any]]:
        """Load checkpoint data for a pipeline."""
        pass
    
    @abstractmethod
    async def delete_checkpoint(self, pipeline_id: str) -> None:
        """Delete checkpoint data for a pipeline."""
        pass
    
    @abstractmethod
    async def list_checkpoints(self) -> list:
        """List all available checkpoints."""
        pass


class RedisCheckpointManager(CheckpointManager):
    """
    Redis-based checkpoint manager for distributed checkpoint storage.
    Provides reliable, fast checkpoint persistence with TTL support.
    """
    
    def __init__(
        self,
        redis_url: str = "redis://localhost:6379",
        key_prefix: str = "ml-pipeline:checkpoint",
        ttl_seconds: int = 86400 * 7,  # 7 days
        logger: Optional[logging.Logger] = None
    ):
        self._redis_url = redis_url
        self._key_prefix = key_prefix
        self._ttl_seconds = ttl_seconds
        self._logger = logger or logging.getLogger(__name__)
        self._redis_client = None
        self._initialized = False
    
    async def initialize(self) -> None:
        """Initialize Redis connection."""
        if self._initialized:
            return
        
        try:
            self._redis_client = redis.from_url(
                self._redis_url,
                decode_responses=True,
                socket_connect_timeout=5,
                socket_timeout=5,
                retry_on_timeout=True,
                health_check_interval=30
            )
            
            # Test connection
            await asyncio.get_event_loop().run_in_executor(
                None, self._redis_client.ping
            )
            
            self._initialized = True
            self._logger.info(f"Redis checkpoint manager initialized: {self._redis_url}")
            
        except Exception as e:
            raise RuntimeError(f"Failed to initialize Redis checkpoint manager: {e}")
    
    async def save_checkpoint(self, pipeline_id: str, checkpoint_data: Dict[str, Any]) -> None:
        """Save checkpoint data to Redis."""
        await self.initialize()
        
        try:
            key = self._get_checkpoint_key(pipeline_id)
            serialized_data = json.dumps(checkpoint_data, default=str)
            
            # Save with TTL
            await asyncio.get_event_loop().run_in_executor(
                None,
                lambda: self._redis_client.setex(key, self._ttl_seconds, serialized_data)
            )
            
            self._logger.debug(f"Checkpoint saved for pipeline {pipeline_id}")
            
        except Exception as e:
            self._logger.error(f"Failed to save checkpoint for pipeline {pipeline_id}: {e}")
            raise
    
    async def load_checkpoint(self, pipeline_id: str) -> Optional[Dict[str, Any]]:
        """Load checkpoint data from Redis."""
        await self.initialize()
        
        try:
            key = self._get_checkpoint_key(pipeline_id)
            
            serialized_data = await asyncio.get_event_loop().run_in_executor(
                None, self._redis_client.get, key
            )
            
            if serialized_data:
                checkpoint_data = json.loads(serialized_data)
                self._logger.debug(f"Checkpoint loaded for pipeline {pipeline_id}")
                return checkpoint_data
            else:
                self._logger.debug(f"No checkpoint found for pipeline {pipeline_id}")
                return None
                
        except Exception as e:
            self._logger.error(f"Failed to load checkpoint for pipeline {pipeline_id}: {e}")
            raise
    
    async def delete_checkpoint(self, pipeline_id: str) -> None:
        """Delete checkpoint data from Redis."""
        await self.initialize()
        
        try:
            key = self._get_checkpoint_key(pipeline_id)
            
            await asyncio.get_event_loop().run_in_executor(
                None, self._redis_client.delete, key
            )
            
            self._logger.debug(f"Checkpoint deleted for pipeline {pipeline_id}")
            
        except Exception as e:
            self._logger.error(f"Failed to delete checkpoint for pipeline {pipeline_id}: {e}")
            raise
    
    async def list_checkpoints(self) -> list:
        """List all available checkpoints."""
        await self.initialize()
        
        try:
            pattern = f"{self._key_prefix}:*"
            
            keys = await asyncio.get_event_loop().run_in_executor(
                None, self._redis_client.keys, pattern
            )
            
            # Extract pipeline IDs from keys
            pipeline_ids = []
            for key in keys:
                if key.startswith(f"{self._key_prefix}:"):
                    pipeline_id = key[len(f"{self._key_prefix}:"):]
                    pipeline_ids.append(pipeline_id)
            
            self._logger.debug(f"Found {len(pipeline_ids)} checkpoints")
            return pipeline_ids
            
        except Exception as e:
            self._logger.error(f"Failed to list checkpoints: {e}")
            raise
    
    def _get_checkpoint_key(self, pipeline_id: str) -> str:
        """Generate Redis key for checkpoint."""
        return f"{self._key_prefix}:{pipeline_id}"
    
    async def close(self) -> None:
        """Close Redis connection."""
        if self._redis_client:
            try:
                await asyncio.get_event_loop().run_in_executor(
                    None, self._redis_client.close
                )
                self._logger.info("Redis checkpoint manager closed")
            except Exception as e:
                self._logger.warning(f"Error closing Redis connection: {e}")
            finally:
                self._initialized = False


class InMemoryCheckpointManager(CheckpointManager):
    """
    In-memory checkpoint manager for testing and development.
    Stores checkpoints in memory without persistence.
    """
    
    def __init__(self, logger: Optional[logging.Logger] = None):
        self._logger = logger or logging.getLogger(__name__)
        self._checkpoints: Dict[str, Dict[str, Any]] = {}
    
    async def save_checkpoint(self, pipeline_id: str, checkpoint_data: Dict[str, Any]) -> None:
        """Save checkpoint data in memory."""
        self._checkpoints[pipeline_id] = checkpoint_data.copy()
        self._logger.debug(f"Checkpoint saved for pipeline {pipeline_id} (in-memory)")
    
    async def load_checkpoint(self, pipeline_id: str) -> Optional[Dict[str, Any]]:
        """Load checkpoint data from memory."""
        checkpoint_data = self._checkpoints.get(pipeline_id)
        if checkpoint_data:
            self._logger.debug(f"Checkpoint loaded for pipeline {pipeline_id} (in-memory)")
            return checkpoint_data.copy()
        else:
            self._logger.debug(f"No checkpoint found for pipeline {pipeline_id} (in-memory)")
            return None
    
    async def delete_checkpoint(self, pipeline_id: str) -> None:
        """Delete checkpoint data from memory."""
        if pipeline_id in self._checkpoints:
            del self._checkpoints[pipeline_id]
            self._logger.debug(f"Checkpoint deleted for pipeline {pipeline_id} (in-memory)")
    
    async def list_checkpoints(self) -> list:
        """List all available checkpoints."""
        pipeline_ids = list(self._checkpoints.keys())
        self._logger.debug(f"Found {len(pipeline_ids)} checkpoints (in-memory)")
        return pipeline_ids
    
    def clear_all_checkpoints(self) -> None:
        """Clear all checkpoints (testing utility)."""
        self._checkpoints.clear()
        self._logger.debug("All checkpoints cleared (in-memory)")
    
    def get_checkpoint_count(self) -> int:
        """Get number of stored checkpoints (testing utility)."""
        return len(self._checkpoints)
