/**
 * GPU Module
 * Comprehensive GPU acceleration module for real-time video analysis
 */

import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { GPUDeviceManager } from './gpu-device-manager';
import { OptimizedModelLoader } from './optimized-model-loader';
import { GPUAcceleratedInferenceService } from './gpu-accelerated-inference.service';
import { GPUMemoryManager } from './gpu-memory-manager';
import { GPUPerformanceMonitor } from './gpu-performance-monitor';

@Module({
  imports: [
    EventEmitterModule.forRoot({
      global: true,
      wildcard: false,
      delimiter: '.',
      newListener: false,
      removeListener: false,
      maxListeners: 20,
      verboseMemoryLeak: false,
      ignoreErrors: false,
    })
  ],
  providers: [
    // Core GPU management
    GPUDeviceManager,
    
    // Memory management
    GPUMemoryManager,
    
    // Model loading and optimization
    OptimizedModelLoader,
    
    // Inference engine
    GPUAcceleratedInferenceService,
    
    // Performance monitoring
    GPUPerformanceMonitor
  ],
  exports: [
    GPUDeviceManager,
    GPUMemoryManager,
    OptimizedModelLoader,
    GPUAcceleratedInferenceService,
    GPUPerformanceMonitor
  ]
})
export class GPUModule {}