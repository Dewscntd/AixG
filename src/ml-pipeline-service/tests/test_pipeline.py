import pytest
import asyncio
from unittest.mock import Mock, AsyncMock
from datetime import datetime

from ..domain.entities.pipeline import Pipeline, PipelineConfiguration, PipelineStatus, StageStatus, StageResult
from ..domain.value_objects.video_id import VideoId
from ..domain.value_objects.processing_id import ProcessingId
from ..domain.events.pipeline_started_event import PipelineStartedEvent
from ..domain.events.stage_completed_event import StageCompletedEvent


class MockStage:
    """Mock pipeline stage for testing."""
    
    def __init__(self, name: str, dependencies: list = None):
        self._name = name
        self._dependencies = dependencies or []
    
    @property
    def name(self) -> str:
        return self._name
    
    @property
    def dependencies(self) -> list:
        return self._dependencies
    
    async def process(self, input_data: dict, config: dict) -> StageResult:
        # Simulate processing
        await asyncio.sleep(0.01)
        
        return StageResult(
            stage_name=self.name,
            status=StageStatus.COMPLETED,
            output_data={'processed': True, 'stage': self.name},
            metadata={'processing_time': 10},
            processing_time_ms=10
        )
    
    async def can_process(self, input_data: dict) -> bool:
        return True


@pytest.fixture
def video_id():
    """Fixture for video ID."""
    return VideoId.generate()


@pytest.fixture
def processing_id():
    """Fixture for processing ID."""
    return ProcessingId.generate()


@pytest.fixture
def pipeline_configuration():
    """Fixture for pipeline configuration."""
    return PipelineConfiguration(
        model_version="v1.0.0",
        batch_size=8,
        gpu_enabled=True,
        checkpoint_enabled=True,
        max_retries=3,
        timeout_seconds=3600
    )


@pytest.fixture
def mock_stages():
    """Fixture for mock pipeline stages."""
    return [
        MockStage("stage1"),
        MockStage("stage2", dependencies=["stage1"]),
        MockStage("stage3", dependencies=["stage2"])
    ]


class TestPipeline:
    """Test cases for Pipeline entity."""
    
    def test_create_pipeline(self, processing_id, video_id, pipeline_configuration, mock_stages):
        """Test pipeline creation."""
        pipeline = Pipeline(processing_id, video_id, pipeline_configuration, mock_stages)
        
        assert pipeline.id == processing_id
        assert pipeline.video_id == video_id
        assert pipeline.status == PipelineStatus.PENDING
        assert pipeline.progress_percentage == 0.0
        assert pipeline.current_stage == "stage1"
        assert len(pipeline.stage_results) == 0
        assert len(pipeline.domain_events) == 0
    
    def test_start_processing(self, processing_id, video_id, pipeline_configuration, mock_stages):
        """Test starting pipeline processing."""
        pipeline = Pipeline(processing_id, video_id, pipeline_configuration, mock_stages)
        
        pipeline.start_processing()
        
        assert pipeline.status == PipelineStatus.RUNNING
        assert len(pipeline.domain_events) == 1
        assert isinstance(pipeline.domain_events[0], PipelineStartedEvent)
    
    def test_complete_stage(self, processing_id, video_id, pipeline_configuration, mock_stages):
        """Test completing a pipeline stage."""
        pipeline = Pipeline(processing_id, video_id, pipeline_configuration, mock_stages)
        pipeline.start_processing()
        
        # Complete first stage
        result = StageResult(
            stage_name="stage1",
            status=StageStatus.COMPLETED,
            output_data={'test': 'data'},
            metadata={'time': 100},
            processing_time_ms=100
        )
        
        pipeline.complete_stage("stage1", result)
        
        assert "stage1" in pipeline.stage_results
        assert pipeline.stage_results["stage1"] == result
        assert pipeline.current_stage == "stage2"
        assert pipeline.progress_percentage > 0
        
        # Check domain events
        stage_events = [e for e in pipeline.domain_events if isinstance(e, StageCompletedEvent)]
        assert len(stage_events) == 1
        assert stage_events[0].stage_name == "stage1"
    
    def test_fail_stage(self, processing_id, video_id, pipeline_configuration, mock_stages):
        """Test failing a pipeline stage."""
        pipeline = Pipeline(processing_id, video_id, pipeline_configuration, mock_stages)
        pipeline.start_processing()
        
        # Fail stage multiple times to test retry logic
        for i in range(pipeline_configuration.max_retries + 1):
            pipeline.fail_stage("stage1", f"Error {i}")
        
        assert pipeline.status == PipelineStatus.FAILED
        assert "stage1" in pipeline.stage_results
        assert pipeline.stage_results["stage1"].status == StageStatus.FAILED
    
    def test_complete_pipeline(self, processing_id, video_id, pipeline_configuration, mock_stages):
        """Test completing entire pipeline."""
        pipeline = Pipeline(processing_id, video_id, pipeline_configuration, mock_stages)
        pipeline.start_processing()
        
        # Complete all stages
        for stage in mock_stages:
            result = StageResult(
                stage_name=stage.name,
                status=StageStatus.COMPLETED,
                output_data={'completed': True},
                metadata={},
                processing_time_ms=50
            )
            pipeline.complete_stage(stage.name, result)
        
        assert pipeline.status == PipelineStatus.COMPLETED
        assert pipeline.progress_percentage == 100.0
        assert pipeline.current_stage is None
        assert len(pipeline.stage_results) == 3
    
    def test_dependencies_check(self, processing_id, video_id, pipeline_configuration, mock_stages):
        """Test stage dependencies checking."""
        pipeline = Pipeline(processing_id, video_id, pipeline_configuration, mock_stages)
        
        # Initially, only stage1 should have dependencies met
        assert pipeline.get_stage_dependencies_met("stage1") == True
        assert pipeline.get_stage_dependencies_met("stage2") == False
        assert pipeline.get_stage_dependencies_met("stage3") == False
        
        # Complete stage1
        result1 = StageResult(
            stage_name="stage1",
            status=StageStatus.COMPLETED,
            output_data={},
            metadata={},
            processing_time_ms=10
        )
        pipeline.complete_stage("stage1", result1)
        
        # Now stage2 should have dependencies met
        assert pipeline.get_stage_dependencies_met("stage2") == True
        assert pipeline.get_stage_dependencies_met("stage3") == False
    
    def test_checkpoint_data(self, processing_id, video_id, pipeline_configuration, mock_stages):
        """Test checkpoint data generation."""
        pipeline = Pipeline(processing_id, video_id, pipeline_configuration, mock_stages)
        pipeline.start_processing()
        
        # Complete first stage
        result = StageResult(
            stage_name="stage1",
            status=StageStatus.COMPLETED,
            output_data={'test': 'data'},
            metadata={},
            processing_time_ms=100
        )
        pipeline.complete_stage("stage1", result)
        
        checkpoint_data = pipeline.get_checkpoint_data()
        
        assert checkpoint_data['pipeline_id'] == pipeline.id.value
        assert checkpoint_data['video_id'] == pipeline.video_id.value
        assert checkpoint_data['status'] == PipelineStatus.RUNNING.value
        assert 'stage1' in checkpoint_data['stage_results']
        assert checkpoint_data['current_stage_index'] == 1
    
    def test_factory_method(self, video_id, pipeline_configuration, mock_stages):
        """Test factory method for creating pipeline."""
        pipeline = Pipeline.create_for_video(video_id, pipeline_configuration, mock_stages)
        
        assert pipeline.video_id == video_id
        assert pipeline.configuration == pipeline_configuration
        assert pipeline.status == PipelineStatus.PENDING
        assert isinstance(pipeline.id, ProcessingId)
    
    def test_restore_from_checkpoint(self, mock_stages):
        """Test restoring pipeline from checkpoint."""
        # Create checkpoint data
        checkpoint_data = {
            'pipeline_id': str(ProcessingId.generate().value),
            'video_id': str(VideoId.generate().value),
            'status': PipelineStatus.RUNNING.value,
            'current_stage_index': 1,
            'stage_results': {
                'stage1': {
                    'stage_name': 'stage1',
                    'status': StageStatus.COMPLETED.value,
                    'output_data': {'test': 'data'},
                    'metadata': {},
                    'error_message': None,
                    'processing_time_ms': 100
                }
            },
            'retry_counts': {},
            'checkpoint_data': {},
            'created_at': datetime.utcnow().isoformat(),
            'updated_at': datetime.utcnow().isoformat()
        }
        
        pipeline = Pipeline.restore_from_checkpoint(checkpoint_data, mock_stages)
        
        assert pipeline.status == PipelineStatus.RUNNING
        assert len(pipeline.stage_results) == 1
        assert 'stage1' in pipeline.stage_results
        assert pipeline.current_stage == "stage2"
    
    def test_cancel_pipeline(self, processing_id, video_id, pipeline_configuration, mock_stages):
        """Test cancelling pipeline."""
        pipeline = Pipeline(processing_id, video_id, pipeline_configuration, mock_stages)
        pipeline.start_processing()
        
        pipeline.cancel_pipeline("User requested cancellation")
        
        assert pipeline.status == PipelineStatus.CANCELLED
        
        # Should not be able to cancel completed pipeline
        pipeline._status = PipelineStatus.COMPLETED
        with pytest.raises(ValueError):
            pipeline.cancel_pipeline("Cannot cancel completed")
    
    def test_invalid_operations(self, processing_id, video_id, pipeline_configuration, mock_stages):
        """Test invalid operations on pipeline."""
        pipeline = Pipeline(processing_id, video_id, pipeline_configuration, mock_stages)
        
        # Cannot complete stage before starting
        result = StageResult(
            stage_name="stage1",
            status=StageStatus.COMPLETED,
            output_data={},
            metadata={},
            processing_time_ms=10
        )
        
        with pytest.raises(ValueError):
            pipeline.complete_stage("stage1", result)
        
        # Cannot start already running pipeline
        pipeline.start_processing()
        with pytest.raises(ValueError):
            pipeline.start_processing()
        
        # Cannot complete unknown stage
        with pytest.raises(ValueError):
            pipeline.complete_stage("unknown_stage", result)


@pytest.mark.asyncio
class TestAsyncPipelineOperations:
    """Test async operations with pipeline."""
    
    async def test_stage_processing(self, processing_id, video_id, pipeline_configuration):
        """Test async stage processing."""
        stages = [MockStage("async_stage")]
        pipeline = Pipeline(processing_id, video_id, pipeline_configuration, stages)
        
        # Test stage processing
        stage = stages[0]
        input_data = {'test': 'input'}
        config = {'batch_size': 4}
        
        result = await stage.process(input_data, config)
        
        assert result.stage_name == "async_stage"
        assert result.status == StageStatus.COMPLETED
        assert result.output_data['processed'] == True
        assert result.processing_time_ms > 0
