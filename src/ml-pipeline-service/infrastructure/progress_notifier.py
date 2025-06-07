import json
import logging
from typing import Dict, Any, Set, Optional, Callable
from abc import ABC, abstractmethod
import asyncio
import websockets
from datetime import datetime


class ProgressNotifier(ABC):
    """Abstract base class for progress notifications."""
    
    @abstractmethod
    async def notify_stage_started(
        self, 
        pipeline_id: str, 
        video_id: str, 
        stage_name: str
    ) -> None:
        """Notify that a stage has started."""
        pass
    
    @abstractmethod
    async def notify_stage_completed(
        self, 
        pipeline_id: str, 
        video_id: str, 
        stage_name: str, 
        progress_percentage: float
    ) -> None:
        """Notify that a stage has completed."""
        pass
    
    @abstractmethod
    async def notify_stage_failed(
        self, 
        pipeline_id: str, 
        video_id: str, 
        stage_name: str, 
        error_message: str
    ) -> None:
        """Notify that a stage has failed."""
        pass


class WebSocketProgressNotifier(ProgressNotifier):
    """
    WebSocket-based progress notifier for real-time updates.
    Manages WebSocket connections and broadcasts progress updates.
    """
    
    def __init__(
        self,
        host: str = "localhost",
        port: int = 8765,
        logger: Optional[logging.Logger] = None
    ):
        self._host = host
        self._port = port
        self._logger = logger or logging.getLogger(__name__)
        self._clients: Set[websockets.WebSocketServerProtocol] = set()
        self._server = None
        self._running = False
    
    async def start_server(self) -> None:
        """Start the WebSocket server."""
        if self._running:
            return
        
        try:
            self._server = await websockets.serve(
                self._handle_client,
                self._host,
                self._port,
                ping_interval=20,
                ping_timeout=10,
                close_timeout=10
            )
            
            self._running = True
            self._logger.info(f"WebSocket progress notifier started on {self._host}:{self._port}")
            
        except Exception as e:
            self._logger.error(f"Failed to start WebSocket server: {e}")
            raise
    
    async def stop_server(self) -> None:
        """Stop the WebSocket server."""
        if not self._running:
            return
        
        try:
            # Close all client connections
            if self._clients:
                await asyncio.gather(
                    *[client.close() for client in self._clients],
                    return_exceptions=True
                )
                self._clients.clear()
            
            # Close server
            if self._server:
                self._server.close()
                await self._server.wait_closed()
            
            self._running = False
            self._logger.info("WebSocket progress notifier stopped")
            
        except Exception as e:
            self._logger.error(f"Error stopping WebSocket server: {e}")
    
    async def _handle_client(self, websocket, path):
        """Handle new WebSocket client connection."""
        self._clients.add(websocket)
        client_address = websocket.remote_address
        self._logger.info(f"Client connected: {client_address}")
        
        try:
            # Send welcome message
            welcome_message = {
                'type': 'connection',
                'status': 'connected',
                'timestamp': datetime.utcnow().isoformat(),
                'message': 'Connected to ML Pipeline progress updates'
            }
            await websocket.send(json.dumps(welcome_message))
            
            # Keep connection alive
            async for message in websocket:
                # Handle client messages if needed
                try:
                    data = json.loads(message)
                    await self._handle_client_message(websocket, data)
                except json.JSONDecodeError:
                    self._logger.warning(f"Invalid JSON from client {client_address}: {message}")
                
        except websockets.exceptions.ConnectionClosed:
            self._logger.info(f"Client disconnected: {client_address}")
        except Exception as e:
            self._logger.error(f"Error handling client {client_address}: {e}")
        finally:
            self._clients.discard(websocket)
    
    async def _handle_client_message(
        self, 
        websocket: websockets.WebSocketServerProtocol, 
        data: Dict[str, Any]
    ) -> None:
        """Handle messages from clients."""
        message_type = data.get('type')
        
        if message_type == 'ping':
            # Respond to ping
            pong_message = {
                'type': 'pong',
                'timestamp': datetime.utcnow().isoformat()
            }
            await websocket.send(json.dumps(pong_message))
        
        elif message_type == 'subscribe':
            # Handle subscription to specific pipeline
            pipeline_id = data.get('pipeline_id')
            if pipeline_id:
                # Store subscription info (could be enhanced to filter messages)
                self._logger.debug(f"Client subscribed to pipeline {pipeline_id}")
    
    async def notify_stage_started(
        self, 
        pipeline_id: str, 
        video_id: str, 
        stage_name: str
    ) -> None:
        """Notify that a stage has started."""
        message = {
            'type': 'stage_started',
            'pipeline_id': pipeline_id,
            'video_id': video_id,
            'stage_name': stage_name,
            'timestamp': datetime.utcnow().isoformat()
        }
        
        await self._broadcast_message(message)
        self._logger.debug(f"Notified stage started: {stage_name} for pipeline {pipeline_id}")
    
    async def notify_stage_completed(
        self, 
        pipeline_id: str, 
        video_id: str, 
        stage_name: str, 
        progress_percentage: float
    ) -> None:
        """Notify that a stage has completed."""
        message = {
            'type': 'stage_completed',
            'pipeline_id': pipeline_id,
            'video_id': video_id,
            'stage_name': stage_name,
            'progress_percentage': progress_percentage,
            'timestamp': datetime.utcnow().isoformat()
        }
        
        await self._broadcast_message(message)
        self._logger.debug(f"Notified stage completed: {stage_name} for pipeline {pipeline_id}")
    
    async def notify_stage_failed(
        self, 
        pipeline_id: str, 
        video_id: str, 
        stage_name: str, 
        error_message: str
    ) -> None:
        """Notify that a stage has failed."""
        message = {
            'type': 'stage_failed',
            'pipeline_id': pipeline_id,
            'video_id': video_id,
            'stage_name': stage_name,
            'error_message': error_message,
            'timestamp': datetime.utcnow().isoformat()
        }
        
        await self._broadcast_message(message)
        self._logger.debug(f"Notified stage failed: {stage_name} for pipeline {pipeline_id}")
    
    async def _broadcast_message(self, message: Dict[str, Any]) -> None:
        """Broadcast message to all connected clients."""
        if not self._clients:
            return
        
        message_json = json.dumps(message)
        
        # Send to all clients, removing disconnected ones
        disconnected_clients = set()
        
        for client in self._clients:
            try:
                await client.send(message_json)
            except websockets.exceptions.ConnectionClosed:
                disconnected_clients.add(client)
            except Exception as e:
                self._logger.warning(f"Error sending message to client: {e}")
                disconnected_clients.add(client)
        
        # Remove disconnected clients
        self._clients -= disconnected_clients
    
    def get_connected_clients_count(self) -> int:
        """Get number of connected clients."""
        return len(self._clients)


class LoggingProgressNotifier(ProgressNotifier):
    """
    Simple logging-based progress notifier for development and testing.
    Logs progress updates instead of sending real-time notifications.
    """
    
    def __init__(self, logger: Optional[logging.Logger] = None):
        self._logger = logger or logging.getLogger(__name__)
    
    async def notify_stage_started(
        self, 
        pipeline_id: str, 
        video_id: str, 
        stage_name: str
    ) -> None:
        """Log that a stage has started."""
        self._logger.info(f"PROGRESS: Stage '{stage_name}' started for pipeline {pipeline_id}")
    
    async def notify_stage_completed(
        self, 
        pipeline_id: str, 
        video_id: str, 
        stage_name: str, 
        progress_percentage: float
    ) -> None:
        """Log that a stage has completed."""
        self._logger.info(
            f"PROGRESS: Stage '{stage_name}' completed for pipeline {pipeline_id} "
            f"({progress_percentage:.1f}% total progress)"
        )
    
    async def notify_stage_failed(
        self, 
        pipeline_id: str, 
        video_id: str, 
        stage_name: str, 
        error_message: str
    ) -> None:
        """Log that a stage has failed."""
        self._logger.error(
            f"PROGRESS: Stage '{stage_name}' failed for pipeline {pipeline_id}: {error_message}"
        )


class CompositeProgressNotifier(ProgressNotifier):
    """
    Composite progress notifier that delegates to multiple notifiers.
    Useful for combining WebSocket and logging notifications.
    """
    
    def __init__(self, notifiers: list[ProgressNotifier]):
        self._notifiers = notifiers
    
    async def notify_stage_started(
        self, 
        pipeline_id: str, 
        video_id: str, 
        stage_name: str
    ) -> None:
        """Notify all notifiers that a stage has started."""
        await asyncio.gather(
            *[notifier.notify_stage_started(pipeline_id, video_id, stage_name) 
              for notifier in self._notifiers],
            return_exceptions=True
        )
    
    async def notify_stage_completed(
        self, 
        pipeline_id: str, 
        video_id: str, 
        stage_name: str, 
        progress_percentage: float
    ) -> None:
        """Notify all notifiers that a stage has completed."""
        await asyncio.gather(
            *[notifier.notify_stage_completed(pipeline_id, video_id, stage_name, progress_percentage) 
              for notifier in self._notifiers],
            return_exceptions=True
        )
    
    async def notify_stage_failed(
        self, 
        pipeline_id: str, 
        video_id: str, 
        stage_name: str, 
        error_message: str
    ) -> None:
        """Notify all notifiers that a stage has failed."""
        await asyncio.gather(
            *[notifier.notify_stage_failed(pipeline_id, video_id, stage_name, error_message) 
              for notifier in self._notifiers],
            return_exceptions=True
        )
