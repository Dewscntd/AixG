import json
import logging
from typing import Optional
from abc import ABC, abstractmethod

from ..domain.events.domain_event import DomainEvent


class EventPublisher(ABC):
    """Abstract base class for event publishing."""
    
    @abstractmethod
    async def publish(self, event: DomainEvent) -> None:
        """Publish a domain event."""
        pass


class PulsarEventPublisher(EventPublisher):
    """
    Event publisher implementation using Apache Pulsar.
    Provides reliable, scalable event publishing with retry logic.
    """
    
    def __init__(
        self,
        pulsar_url: str = "pulsar://localhost:6650",
        topic_prefix: str = "ml-pipeline",
        logger: Optional[logging.Logger] = None
    ):
        self._pulsar_url = pulsar_url
        self._topic_prefix = topic_prefix
        self._logger = logger or logging.getLogger(__name__)
        self._client = None
        self._producers = {}
        self._initialized = False
    
    async def initialize(self) -> None:
        """Initialize Pulsar client and producers."""
        if self._initialized:
            return
        
        try:
            import pulsar
            
            self._client = pulsar.Client(
                self._pulsar_url,
                operation_timeout_seconds=30,
                io_threads=4,
                message_listener_threads=4,
                concurrent_lookup_request=50000,
                use_tls=False,
                tls_validate_hostname=False,
                tls_allow_insecure_connection=True
            )
            
            self._initialized = True
            self._logger.info(f"Pulsar client initialized: {self._pulsar_url}")
            
        except ImportError:
            raise RuntimeError("pulsar-client package not installed. Install with: pip install pulsar-client")
        except Exception as e:
            raise RuntimeError(f"Failed to initialize Pulsar client: {e}")
    
    async def publish(self, event: DomainEvent) -> None:
        """Publish a domain event to Pulsar."""
        await self.initialize()
        
        topic_name = f"{self._topic_prefix}-{event.event_type.lower()}"
        
        try:
            # Get or create producer for topic
            producer = await self._get_producer(topic_name)
            
            # Serialize event
            event_data = json.dumps(event.to_dict()).encode('utf-8')
            
            # Create message with properties
            message_properties = {
                'event_type': event.event_type,
                'event_id': event.event_id,
                'aggregate_id': event.aggregate_id,
                'version': str(event.version),
                'occurred_on': event.occurred_on.isoformat()
            }
            
            if event.correlation_id:
                message_properties['correlation_id'] = event.correlation_id
            if event.causation_id:
                message_properties['causation_id'] = event.causation_id
            
            # Send message
            await producer.send_async(
                event_data,
                properties=message_properties,
                partition_key=event.aggregate_id,
                event_timestamp=int(event.occurred_on.timestamp() * 1000)
            )
            
            self._logger.debug(f"Published event {event.event_type} to topic {topic_name}")
            
        except Exception as e:
            self._logger.error(f"Failed to publish event {event.event_type}: {e}")
            raise
    
    async def _get_producer(self, topic_name: str):
        """Get or create producer for topic."""
        if topic_name not in self._producers:
            try:
                producer = self._client.create_producer(
                    topic_name,
                    send_timeout_millis=30000,
                    batching_enabled=True,
                    batching_max_messages=100,
                    batching_max_publish_delay_millis=100,
                    max_pending_messages=1000,
                    block_if_queue_full=True,
                    compression_type=pulsar.CompressionType.LZ4,
                    producer_name=f"ml-pipeline-{topic_name}"
                )
                
                self._producers[topic_name] = producer
                self._logger.info(f"Created producer for topic: {topic_name}")
                
            except Exception as e:
                self._logger.error(f"Failed to create producer for topic {topic_name}: {e}")
                raise
        
        return self._producers[topic_name]
    
    async def close(self) -> None:
        """Close all producers and client."""
        try:
            # Close all producers
            for topic_name, producer in self._producers.items():
                try:
                    producer.close()
                    self._logger.debug(f"Closed producer for topic: {topic_name}")
                except Exception as e:
                    self._logger.warning(f"Error closing producer for {topic_name}: {e}")
            
            # Close client
            if self._client:
                self._client.close()
                self._logger.info("Pulsar client closed")
            
            self._producers.clear()
            self._initialized = False
            
        except Exception as e:
            self._logger.error(f"Error during cleanup: {e}")


class InMemoryEventPublisher(EventPublisher):
    """
    In-memory event publisher for testing.
    Stores published events in memory for verification.
    """
    
    def __init__(self, logger: Optional[logging.Logger] = None):
        self._logger = logger or logging.getLogger(__name__)
        self._published_events = []
    
    async def publish(self, event: DomainEvent) -> None:
        """Store event in memory."""
        self._published_events.append(event)
        self._logger.debug(f"Published event {event.event_type} (in-memory)")
    
    def get_published_events(self) -> list:
        """Get all published events."""
        return self._published_events.copy()
    
    def clear_events(self) -> None:
        """Clear all stored events."""
        self._published_events.clear()
    
    def get_events_by_type(self, event_type: str) -> list:
        """Get events of a specific type."""
        return [e for e in self._published_events if e.event_type == event_type]
    
    def get_events_by_aggregate(self, aggregate_id: str) -> list:
        """Get events for a specific aggregate."""
        return [e for e in self._published_events if e.aggregate_id == aggregate_id]
