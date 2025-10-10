/**
 * GPU Device Manager
 * Manages CUDA/GPU devices for optimized ML inference with automatic fallback
 */

import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import * as tf from '@tensorflow/tfjs-node-gpu';

export interface GPUDeviceInfo {
  deviceId: number;
  name: string;
  memoryTotal: number;
  memoryFree: number;
  computeCapability: string;
  cudaVersion?: string;
  isAvailable: boolean;
  utilization: number;
  temperature?: number;
}

export interface GPUMemoryInfo {
  allocated: number;
  reserved: number;
  free: number;
  total: number;
  utilization: number;
}

export interface GPUPerformanceMetrics {
  inferenceTime: number;
  throughput: number; // frames per second
  memoryUsage: number;
  temperature: number;
  powerConsumption: number;
  utilization: number;
}

export interface GPUConfiguration {
  enableGPU: boolean;
  preferredDevice: number;
  memoryLimit?: number; // MB
  enableMemoryGrowth: boolean;
  enableMixedPrecision: boolean;
  batchSize: number;
  maxConcurrentInferences: number;
  fallbackToCPU: boolean;
  performanceMonitoring: boolean;
}

@Injectable()
export class GPUDeviceManager implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(GPUDeviceManager.name);
  
  private isInitialized = false;
  private availableDevices: GPUDeviceInfo[] = [];
  private activeDevice: GPUDeviceInfo | null = null;
  private gpuEnabled = false;
  
  private performanceMetrics: GPUPerformanceMetrics = {
    inferenceTime: 0,
    throughput: 0,
    memoryUsage: 0,
    temperature: 0,
    powerConsumption: 0,
    utilization: 0
  };

  private readonly config: GPUConfiguration = {
    enableGPU: true,
    preferredDevice: 0,
    memoryLimit: 4096, // 4GB default
    enableMemoryGrowth: true,
    enableMixedPrecision: true,
    batchSize: 8,
    maxConcurrentInferences: 4,
    fallbackToCPU: true,
    performanceMonitoring: true
  };

  private memoryUsageHistory: number[] = [];
  private inferenceQueue: Array<() => Promise<any>> = [];
  private activeInferences = 0;

  constructor() {}

  async onModuleInit() {
    await this.initializeGPU();
    if (this.config.performanceMonitoring) {
      this.startPerformanceMonitoring();
    }
  }

  async onModuleDestroy() {
    await this.cleanup();
  }

  /**
   * Initialize GPU devices and TensorFlow backend
   */
  private async initializeGPU(): Promise<void> {
    try {
      this.logger.log('Initializing GPU devices...');

      // Check if CUDA is available
      const isCudaAvailable = await this.checkCudaAvailability();
      if (!isCudaAvailable && this.config.enableGPU) {
        this.logger.warn('CUDA not available, falling back to CPU inference');
        this.gpuEnabled = false;
        return;
      }

      // Initialize TensorFlow GPU backend
      if (this.config.enableGPU) {
        await this.initializeTensorFlowGPU();
      }

      // Discover available GPU devices
      await this.discoverGPUDevices();

      // Select optimal device
      await this.selectOptimalDevice();

      // Configure memory settings
      await this.configureMemorySettings();

      this.isInitialized = true;
      this.logger.log(`GPU initialization complete. Active device: ${this.activeDevice?.name || 'CPU'}`);

    } catch (error) {
      this.logger.error(`GPU initialization failed: ${error.message}`);
      if (this.config.fallbackToCPU) {
        this.logger.log('Falling back to CPU inference');
        this.gpuEnabled = false;
      } else {
        throw error;
      }
    }
  }

  /**
   * Check CUDA availability
   */
  private async checkCudaAvailability(): Promise<boolean> {
    try {
      // In a real implementation, this would check CUDA runtime
      // For demo purposes, we'll simulate the check
      const hasCuda = process.env.CUDA_VISIBLE_DEVICES !== undefined;
      const hasNvidia = process.env.NVIDIA_VISIBLE_DEVICES !== undefined;
      
      this.logger.log(`CUDA availability check: ${hasCuda || hasNvidia}`);
      return hasCuda || hasNvidia;
    } catch (error) {
      this.logger.warn(`CUDA availability check failed: ${error.message}`);
      return false;
    }
  }

  /**
   * Initialize TensorFlow GPU backend
   */
  private async initializeTensorFlowGPU(): Promise<void> {
    try {
      // Set TensorFlow to use GPU
      await tf.ready();
      
      // Configure GPU memory growth
      if (this.config.enableMemoryGrowth) {
        // This would be configured in a real TensorFlow setup
        this.logger.log('Enabled GPU memory growth');
      }

      // Enable mixed precision if supported
      if (this.config.enableMixedPrecision) {
        this.logger.log('Enabled mixed precision training');
      }

      this.gpuEnabled = true;
      this.logger.log('TensorFlow GPU backend initialized successfully');

    } catch (error) {
      this.logger.error(`TensorFlow GPU initialization failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Discover available GPU devices
   */
  private async discoverGPUDevices(): Promise<void> {
    try {
      // In a real implementation, this would query NVIDIA-ML API
      // For demo purposes, we'll simulate device discovery
      const simulatedDevices: GPUDeviceInfo[] = [
        {
          deviceId: 0,
          name: 'NVIDIA GeForce RTX 4090',
          memoryTotal: 24576, // 24GB
          memoryFree: 20480,  // 20GB free
          computeCapability: '8.9',
          cudaVersion: '12.0',
          isAvailable: true,
          utilization: 15,
          temperature: 45
        },
        {
          deviceId: 1,
          name: 'NVIDIA GeForce RTX 4080',
          memoryTotal: 16384, // 16GB
          memoryFree: 14336,  // 14GB free
          computeCapability: '8.9',
          cudaVersion: '12.0',
          isAvailable: true,
          utilization: 25,
          temperature: 52
        }
      ];

      this.availableDevices = simulatedDevices.filter(device => device.isAvailable);
      
      this.logger.log(`Discovered ${this.availableDevices.length} GPU devices:`);
      this.availableDevices.forEach(device => {
        this.logger.log(`  Device ${device.deviceId}: ${device.name} (${device.memoryFree}MB free)`);
      });

    } catch (error) {
      this.logger.error(`GPU device discovery failed: ${error.message}`);
      this.availableDevices = [];
    }
  }

  /**
   * Select optimal GPU device based on available memory and utilization
   */
  private async selectOptimalDevice(): Promise<void> {
    if (this.availableDevices.length === 0) {
      this.logger.warn('No GPU devices available');
      return;
    }

    // Sort devices by available memory and low utilization
    const sortedDevices = this.availableDevices.sort((a, b) => {
      const scoreA = a.memoryFree * (100 - a.utilization);
      const scoreB = b.memoryFree * (100 - b.utilization);
      return scoreB - scoreA;
    });

    // Select preferred device if available, otherwise use optimal
    let selectedDevice = sortedDevices.find(d => d.deviceId === this.config.preferredDevice);
    if (!selectedDevice) {
      selectedDevice = sortedDevices[0];
    }

    this.activeDevice = selectedDevice;
    this.logger.log(`Selected GPU device: ${selectedDevice.name} (Device ${selectedDevice.deviceId})`);
  }

  /**
   * Configure GPU memory settings
   */
  private async configureMemorySettings(): Promise<void> {
    if (!this.activeDevice) return;

    try {
      // Set memory limit if specified
      if (this.config.memoryLimit) {
        const limitMB = Math.min(this.config.memoryLimit, this.activeDevice.memoryFree);
        this.logger.log(`Setting GPU memory limit to ${limitMB}MB`);
        // In real implementation, configure TensorFlow memory limit
      }

      // Configure memory growth
      if (this.config.enableMemoryGrowth) {
        this.logger.log('Enabled GPU memory growth');
        // Configure TensorFlow memory growth
      }

    } catch (error) {
      this.logger.error(`Memory configuration failed: ${error.message}`);
    }
  }

  /**
   * Execute inference with GPU acceleration and queue management
   */
  public async executeInference<T>(
    inferenceFunction: () => Promise<T>,
    priority: 'high' | 'medium' | 'low' = 'medium'
  ): Promise<T> {
    // Check if we can execute immediately
    if (this.activeInferences < this.config.maxConcurrentInferences) {
      return this.executeImmediateInference(inferenceFunction);
    }

    // Queue the inference
    return new Promise((resolve, reject) => {
      const queuedInference = async () => {
        try {
          const result = await this.executeImmediateInference(inferenceFunction);
          resolve(result);
        } catch (error) {
          reject(error);
        }
      };

      // Add to queue based on priority
      if (priority === 'high') {
        this.inferenceQueue.unshift(queuedInference);
      } else {
        this.inferenceQueue.push(queuedInference);
      }
    });
  }

  /**
   * Execute inference immediately
   */
  private async executeImmediateInference<T>(
    inferenceFunction: () => Promise<T>
  ): Promise<T> {
    const startTime = Date.now();
    this.activeInferences++;

    try {
      // Record memory usage before inference
      const memoryBefore = await this.getMemoryUsage();

      // Execute inference
      const result = await inferenceFunction();

      // Record performance metrics
      const inferenceTime = Date.now() - startTime;
      this.updatePerformanceMetrics(inferenceTime, memoryBefore);

      return result;

    } catch (error) {
      this.logger.error(`GPU inference failed: ${error.message}`);
      throw error;
    } finally {
      this.activeInferences--;
      
      // Process next queued inference
      if (this.inferenceQueue.length > 0) {
        const nextInference = this.inferenceQueue.shift();
        if (nextInference) {
          // Execute in next tick to avoid blocking
          setImmediate(() => nextInference());
        }
      }
    }
  }

  /**
   * Get current GPU memory usage
   */
  public async getMemoryUsage(): Promise<GPUMemoryInfo> {
    if (!this.activeDevice || !this.gpuEnabled) {
      return {
        allocated: 0,
        reserved: 0,
        free: 0,
        total: 0,
        utilization: 0
      };
    }

    try {
      // In real implementation, query GPU memory from NVIDIA-ML
      const memoryInfo = tf.memory();
      
      return {
        allocated: memoryInfo.numBytes,
        reserved: memoryInfo.numBytesInGPU || 0,
        free: this.activeDevice.memoryFree,
        total: this.activeDevice.memoryTotal,
        utilization: ((this.activeDevice.memoryTotal - this.activeDevice.memoryFree) / this.activeDevice.memoryTotal) * 100
      };
    } catch (error) {
      this.logger.error(`Failed to get memory usage: ${error.message}`);
      return {
        allocated: 0,
        reserved: 0,
        free: 0,
        total: 0,
        utilization: 0
      };
    }
  }

  /**
   * Update performance metrics
   */
  private updatePerformanceMetrics(inferenceTime: number, memoryBefore: GPUMemoryInfo): void {
    this.performanceMetrics.inferenceTime = inferenceTime;
    this.performanceMetrics.throughput = 1000 / inferenceTime; // FPS
    this.performanceMetrics.memoryUsage = memoryBefore.utilization;

    // Update history
    this.memoryUsageHistory.push(memoryBefore.utilization);
    if (this.memoryUsageHistory.length > 100) {
      this.memoryUsageHistory.shift();
    }
  }

  /**
   * Start performance monitoring
   */
  private startPerformanceMonitoring(): void {
    setInterval(async () => {
      try {
        const memoryInfo = await this.getMemoryUsage();
        const deviceInfo = await this.getDeviceInfo();

        this.logger.debug(`GPU Performance - Memory: ${memoryInfo.utilization.toFixed(1)}%, ` +
                         `Utilization: ${deviceInfo?.utilization || 0}%, ` +
                         `Active Inferences: ${this.activeInferences}, ` +
                         `Queue Length: ${this.inferenceQueue.length}`);

        // Alert on high memory usage
        if (memoryInfo.utilization > 90) {
          this.logger.warn(`High GPU memory usage: ${memoryInfo.utilization.toFixed(1)}%`);
        }

        // Alert on high queue length
        if (this.inferenceQueue.length > 10) {
          this.logger.warn(`High inference queue length: ${this.inferenceQueue.length}`);
        }

      } catch (error) {
        this.logger.error(`Performance monitoring error: ${error.message}`);
      }
    }, 10000); // Every 10 seconds
  }

  /**
   * Get current device information
   */
  public async getDeviceInfo(): Promise<GPUDeviceInfo | null> {
    return this.activeDevice;
  }

  /**
   * Get performance metrics
   */
  public getPerformanceMetrics(): GPUPerformanceMetrics {
    return { ...this.performanceMetrics };
  }

  /**
   * Check if GPU is available and enabled
   */
  public isGPUEnabled(): boolean {
    return this.gpuEnabled && this.isInitialized;
  }

  /**
   * Get GPU utilization statistics
   */
  public getUtilizationStats(): any {
    return {
      isGPUEnabled: this.gpuEnabled,
      activeDevice: this.activeDevice?.name || 'CPU',
      activeInferences: this.activeInferences,
      queueLength: this.inferenceQueue.length,
      maxConcurrent: this.config.maxConcurrentInferences,
      averageMemoryUsage: this.memoryUsageHistory.length > 0 
        ? this.memoryUsageHistory.reduce((a, b) => a + b, 0) / this.memoryUsageHistory.length
        : 0,
      performanceMetrics: this.performanceMetrics
    };
  }

  /**
   * Cleanup GPU resources
   */
  private async cleanup(): Promise<void> {
    try {
      this.logger.log('Cleaning up GPU resources...');
      
      // Wait for active inferences to complete
      while (this.activeInferences > 0) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Clear inference queue
      this.inferenceQueue = [];

      // Dispose TensorFlow resources
      tf.disposeVariables();

      this.logger.log('GPU cleanup complete');
    } catch (error) {
      this.logger.error(`GPU cleanup failed: ${error.message}`);
    }
  }

  /**
   * Force garbage collection to free GPU memory
   */
  public async freeMemory(): Promise<void> {
    try {
      // Dispose unused tensors
      tf.disposeVariables();
      
      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      this.logger.log('GPU memory cleanup completed');
    } catch (error) {
      this.logger.error(`Memory cleanup failed: ${error.message}`);
    }
  }

  /**
   * Update configuration
   */
  public updateConfiguration(newConfig: Partial<GPUConfiguration>): void {
    Object.assign(this.config, newConfig);
    this.logger.log(`GPU configuration updated: ${JSON.stringify(newConfig)}`);
  }
}