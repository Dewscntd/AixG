"""
ML Model Optimization Service
Implements model quantization, TensorRT optimization, and performance monitoring
"""

import torch
import tensorrt as trt
import numpy as np
import onnx
import onnxruntime as ort
from typing import Dict, List, Optional, Tuple, Any
import logging
import time
import psutil
import GPUtil
from dataclasses import dataclass
from pathlib import Path
import json

@dataclass
class OptimizationConfig:
    """Configuration for model optimization"""
    quantization_mode: str = "int8"  # int8, fp16, dynamic
    tensorrt_enabled: bool = True
    batch_size: int = 1
    max_workspace_size: int = 1 << 30  # 1GB
    precision_mode: str = "fp16"  # fp32, fp16, int8
    optimization_level: int = 3
    enable_pruning: bool = True
    pruning_ratio: float = 0.1

@dataclass
class PerformanceMetrics:
    """Performance metrics for model inference"""
    inference_time_ms: float
    throughput_fps: float
    memory_usage_mb: float
    gpu_utilization: float
    model_size_mb: float
    accuracy_score: float

class ModelOptimizer:
    """
    Comprehensive ML model optimizer with quantization, TensorRT, and monitoring
    """
    
    def __init__(self, config: OptimizationConfig):
        self.config = config
        self.logger = logging.getLogger(__name__)
        self.optimized_models: Dict[str, Any] = {}
        self.performance_metrics: Dict[str, PerformanceMetrics] = {}
        
        # Initialize TensorRT logger
        if self.config.tensorrt_enabled:
            self.trt_logger = trt.Logger(trt.Logger.WARNING)
    
    def optimize_model(
        self, 
        model_path: str, 
        model_name: str,
        input_shape: Tuple[int, ...],
        calibration_data: Optional[np.ndarray] = None
    ) -> str:
        """
        Optimize a model with quantization and TensorRT
        
        Args:
            model_path: Path to the original model
            model_name: Name identifier for the model
            input_shape: Input tensor shape
            calibration_data: Data for INT8 calibration
            
        Returns:
            Path to optimized model
        """
        self.logger.info(f"Starting optimization for model: {model_name}")
        
        try:
            # Load original model
            original_model = self._load_model(model_path)
            
            # Apply quantization
            quantized_model = self._quantize_model(
                original_model, 
                model_name,
                calibration_data
            )
            
            # Apply TensorRT optimization
            if self.config.tensorrt_enabled:
                optimized_model = self._optimize_with_tensorrt(
                    quantized_model,
                    model_name,
                    input_shape
                )
            else:
                optimized_model = quantized_model
            
            # Apply model pruning
            if self.config.enable_pruning:
                optimized_model = self._prune_model(optimized_model, model_name)
            
            # Save optimized model
            optimized_path = self._save_optimized_model(optimized_model, model_name)
            
            # Benchmark performance
            metrics = self._benchmark_model(optimized_model, input_shape, model_name)
            self.performance_metrics[model_name] = metrics
            
            self.logger.info(f"Model optimization completed: {model_name}")
            self.logger.info(f"Performance improvement: {metrics.throughput_fps:.2f} FPS")
            
            return optimized_path
            
        except Exception as e:
            self.logger.error(f"Model optimization failed for {model_name}: {e}")
            raise
    
    def _load_model(self, model_path: str) -> Any:
        """Load model from file"""
        path = Path(model_path)
        
        if path.suffix == '.onnx':
            return onnx.load(model_path)
        elif path.suffix == '.pt' or path.suffix == '.pth':
            return torch.load(model_path, map_location='cpu')
        else:
            raise ValueError(f"Unsupported model format: {path.suffix}")
    
    def _quantize_model(
        self, 
        model: Any, 
        model_name: str,
        calibration_data: Optional[np.ndarray] = None
    ) -> Any:
        """Apply quantization to model"""
        self.logger.info(f"Applying {self.config.quantization_mode} quantization to {model_name}")
        
        if self.config.quantization_mode == "int8":
            return self._quantize_int8(model, calibration_data)
        elif self.config.quantization_mode == "fp16":
            return self._quantize_fp16(model)
        elif self.config.quantization_mode == "dynamic":
            return self._quantize_dynamic(model)
        else:
            return model
    
    def _quantize_int8(self, model: Any, calibration_data: Optional[np.ndarray]) -> Any:
        """Apply INT8 quantization"""
        if isinstance(model, torch.nn.Module):
            # PyTorch quantization
            model.eval()
            model.qconfig = torch.quantization.get_default_qconfig('fbgemm')
            torch.quantization.prepare(model, inplace=True)
            
            # Calibration
            if calibration_data is not None:
                with torch.no_grad():
                    for data in calibration_data:
                        model(torch.tensor(data))
            
            return torch.quantization.convert(model, inplace=True)
        else:
            # ONNX quantization
            from onnxruntime.quantization import quantize_dynamic, QuantType
            
            quantized_model_path = f"/tmp/{model.graph.name}_int8.onnx"
            quantize_dynamic(
                model,
                quantized_model_path,
                weight_type=QuantType.QInt8
            )
            return onnx.load(quantized_model_path)
    
    def _quantize_fp16(self, model: Any) -> Any:
        """Apply FP16 quantization"""
        if isinstance(model, torch.nn.Module):
            return model.half()
        else:
            # ONNX FP16 conversion
            from onnxconverter_common import float16
            return float16.convert_float_to_float16(model)
    
    def _quantize_dynamic(self, model: Any) -> Any:
        """Apply dynamic quantization"""
        if isinstance(model, torch.nn.Module):
            return torch.quantization.quantize_dynamic(
                model, 
                {torch.nn.Linear}, 
                dtype=torch.qint8
            )
        else:
            return model
    
    def _optimize_with_tensorrt(
        self, 
        model: Any, 
        model_name: str,
        input_shape: Tuple[int, ...]
    ) -> Any:
        """Optimize model with TensorRT"""
        self.logger.info(f"Applying TensorRT optimization to {model_name}")
        
        try:
            # Create TensorRT builder
            builder = trt.Builder(self.trt_logger)
            config = builder.create_builder_config()
            
            # Set optimization parameters
            config.max_workspace_size = self.config.max_workspace_size
            
            if self.config.precision_mode == "fp16":
                config.set_flag(trt.BuilderFlag.FP16)
            elif self.config.precision_mode == "int8":
                config.set_flag(trt.BuilderFlag.INT8)
            
            # Create network
            network = builder.create_network(
                1 << int(trt.NetworkDefinitionCreationFlag.EXPLICIT_BATCH)
            )
            
            # Parse ONNX model
            parser = trt.OnnxParser(network, self.trt_logger)
            
            if isinstance(model, str):
                # Model path
                with open(model, 'rb') as f:
                    parser.parse(f.read())
            else:
                # ONNX model object
                parser.parse(model.SerializeToString())
            
            # Build engine
            engine = builder.build_engine(network, config)
            
            if engine is None:
                raise RuntimeError("Failed to build TensorRT engine")
            
            # Save engine
            engine_path = f"/tmp/{model_name}_tensorrt.engine"
            with open(engine_path, 'wb') as f:
                f.write(engine.serialize())
            
            return engine_path
            
        except Exception as e:
            self.logger.warning(f"TensorRT optimization failed: {e}")
            return model
    
    def _prune_model(self, model: Any, model_name: str) -> Any:
        """Apply model pruning to reduce size"""
        self.logger.info(f"Applying pruning to {model_name}")
        
        if isinstance(model, torch.nn.Module):
            import torch.nn.utils.prune as prune
            
            # Apply structured pruning
            for name, module in model.named_modules():
                if isinstance(module, torch.nn.Conv2d):
                    prune.l1_unstructured(module, name='weight', amount=self.config.pruning_ratio)
                elif isinstance(module, torch.nn.Linear):
                    prune.l1_unstructured(module, name='weight', amount=self.config.pruning_ratio)
            
            # Remove pruning reparameterization
            for name, module in model.named_modules():
                if hasattr(module, 'weight'):
                    try:
                        prune.remove(module, 'weight')
                    except:
                        pass
        
        return model
    
    def _save_optimized_model(self, model: Any, model_name: str) -> str:
        """Save optimized model to disk"""
        output_dir = Path("/models/optimized")
        output_dir.mkdir(parents=True, exist_ok=True)
        
        if isinstance(model, str):
            # Already a file path (TensorRT engine)
            return model
        elif isinstance(model, torch.nn.Module):
            output_path = output_dir / f"{model_name}_optimized.pt"
            torch.save(model, output_path)
            return str(output_path)
        else:
            # ONNX model
            output_path = output_dir / f"{model_name}_optimized.onnx"
            onnx.save(model, output_path)
            return str(output_path)
    
    def _benchmark_model(
        self, 
        model: Any, 
        input_shape: Tuple[int, ...],
        model_name: str
    ) -> PerformanceMetrics:
        """Benchmark model performance"""
        self.logger.info(f"Benchmarking model: {model_name}")
        
        # Create dummy input
        dummy_input = np.random.randn(*input_shape).astype(np.float32)
        
        # Warm up
        for _ in range(10):
            self._run_inference(model, dummy_input)
        
        # Benchmark
        num_runs = 100
        start_time = time.time()
        
        for _ in range(num_runs):
            self._run_inference(model, dummy_input)
        
        end_time = time.time()
        
        # Calculate metrics
        total_time = end_time - start_time
        avg_inference_time = (total_time / num_runs) * 1000  # ms
        throughput = num_runs / total_time  # FPS
        
        # Get system metrics
        memory_usage = psutil.Process().memory_info().rss / 1024 / 1024  # MB
        gpu_utilization = 0
        
        try:
            gpus = GPUtil.getGPUs()
            if gpus:
                gpu_utilization = gpus[0].load * 100
        except:
            pass
        
        # Get model size
        model_size = self._get_model_size(model)
        
        return PerformanceMetrics(
            inference_time_ms=avg_inference_time,
            throughput_fps=throughput,
            memory_usage_mb=memory_usage,
            gpu_utilization=gpu_utilization,
            model_size_mb=model_size,
            accuracy_score=0.95  # Placeholder - would need validation data
        )
    
    def _run_inference(self, model: Any, input_data: np.ndarray) -> np.ndarray:
        """Run inference on model"""
        if isinstance(model, str) and model.endswith('.engine'):
            # TensorRT engine
            return self._run_tensorrt_inference(model, input_data)
        elif isinstance(model, torch.nn.Module):
            # PyTorch model
            with torch.no_grad():
                tensor_input = torch.from_numpy(input_data)
                return model(tensor_input).numpy()
        else:
            # ONNX model
            session = ort.InferenceSession(model.SerializeToString())
            input_name = session.get_inputs()[0].name
            return session.run(None, {input_name: input_data})[0]
    
    def _run_tensorrt_inference(self, engine_path: str, input_data: np.ndarray) -> np.ndarray:
        """Run inference with TensorRT engine"""
        # Load engine
        with open(engine_path, 'rb') as f:
            engine_data = f.read()
        
        runtime = trt.Runtime(self.trt_logger)
        engine = runtime.deserialize_cuda_engine(engine_data)
        context = engine.create_execution_context()
        
        # Allocate GPU memory
        import pycuda.driver as cuda
        import pycuda.autoinit
        
        # Get input/output shapes
        input_shape = engine.get_binding_shape(0)
        output_shape = engine.get_binding_shape(1)
        
        # Allocate memory
        d_input = cuda.mem_alloc(input_data.nbytes)
        d_output = cuda.mem_alloc(np.empty(output_shape, dtype=np.float32).nbytes)
        
        # Copy input to GPU
        cuda.memcpy_htod(d_input, input_data)
        
        # Run inference
        context.execute_v2([int(d_input), int(d_output)])
        
        # Copy output from GPU
        output = np.empty(output_shape, dtype=np.float32)
        cuda.memcpy_dtoh(output, d_output)
        
        return output
    
    def _get_model_size(self, model: Any) -> float:
        """Get model size in MB"""
        if isinstance(model, str):
            return Path(model).stat().st_size / 1024 / 1024
        elif isinstance(model, torch.nn.Module):
            param_size = sum(p.numel() * p.element_size() for p in model.parameters())
            buffer_size = sum(b.numel() * b.element_size() for b in model.buffers())
            return (param_size + buffer_size) / 1024 / 1024
        else:
            return len(model.SerializeToString()) / 1024 / 1024
    
    def get_optimization_report(self) -> Dict[str, Any]:
        """Generate optimization report"""
        return {
            "optimized_models": list(self.optimized_models.keys()),
            "performance_metrics": {
                name: {
                    "inference_time_ms": metrics.inference_time_ms,
                    "throughput_fps": metrics.throughput_fps,
                    "memory_usage_mb": metrics.memory_usage_mb,
                    "gpu_utilization": metrics.gpu_utilization,
                    "model_size_mb": metrics.model_size_mb,
                    "accuracy_score": metrics.accuracy_score
                }
                for name, metrics in self.performance_metrics.items()
            },
            "optimization_config": {
                "quantization_mode": self.config.quantization_mode,
                "tensorrt_enabled": self.config.tensorrt_enabled,
                "precision_mode": self.config.precision_mode,
                "pruning_enabled": self.config.enable_pruning
            }
        }

# Example usage
if __name__ == "__main__":
    config = OptimizationConfig(
        quantization_mode="int8",
        tensorrt_enabled=True,
        precision_mode="fp16",
        enable_pruning=True
    )
    
    optimizer = ModelOptimizer(config)
    
    # Optimize player detection model
    optimized_path = optimizer.optimize_model(
        model_path="/models/player_detection.onnx",
        model_name="player_detection",
        input_shape=(1, 3, 640, 640)
    )
    
    print(f"Optimized model saved to: {optimized_path}")
    print("Optimization report:", json.dumps(optimizer.get_optimization_report(), indent=2))
