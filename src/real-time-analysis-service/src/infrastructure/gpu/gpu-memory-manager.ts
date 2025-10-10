/**
 * GPU Memory Manager
 * Advanced memory management for GPU resources with automatic optimization
 */

import { Injectable, Logger } from '@nestjs/common';
import * as tf from '@tensorflow/tfjs-node-gpu';

export interface MemoryPool {
  id: string;
  size: number;
  allocated: number;
  free: number;
  chunks: MemoryChunk[];
  type: 'persistent' | 'temporary' | 'streaming';
}

export interface MemoryChunk {
  id: string;
  offset: number;
  size: number;
  isAllocated: boolean;
  allocationTime: number;
  lastAccessed: number;
  tensor?: tf.Tensor;
  tag?: string;
}

export interface MemoryAllocation {
  chunkId: string;
  poolId: string;
  size: number;
  tensor: tf.Tensor;
  metadata: {
    purpose: string;
    priority: 'high' | 'medium' | 'low';
    ttl?: number; // time to live in ms
    persistent: boolean;
  };
}

export interface MemoryStats {
  totalMemory: number;
  allocatedMemory: number;
  freeMemory: number;
  fragmentedMemory: number;
  utilizationPercent: number;
  poolStats: Map<string, MemoryPool>;
  allocationHistory: MemoryAllocationEvent[];
  gcStats: {
    totalRuns: number;
    totalFreed: number;
    averageFreed: number;
    lastRun: number;
  };
}

export interface MemoryAllocationEvent {
  timestamp: number;
  type: 'allocate' | 'deallocate' | 'gc' | 'defrag';
  size: number;
  poolId?: string;
  metadata?: any;
}

export interface MemoryConfig {
  maxPoolSize: number;
  defragmentationThreshold: number;
  gcInterval: number;
  gcThreshold: number;
  enableAutoDefrag: boolean;
  enablePredictiveAllocation: boolean;
  enableMemoryProfiling: boolean;
  persistentPoolSize: number;
  streamingPoolSize: number;
}

@Injectable()
export class GPUMemoryManager {
  private readonly logger = new Logger(GPUMemoryManager.name);
  
  private memoryPools = new Map<string, MemoryPool>();
  private allocations = new Map<string, MemoryAllocation>();
  private allocationHistory: MemoryAllocationEvent[] = [];
  
  private gcStats = {
    totalRuns: 0,
    totalFreed: 0,
    averageFreed: 0,
    lastRun: 0
  };

  private readonly config: MemoryConfig = {
    maxPoolSize: 2048 * 1024 * 1024, // 2GB per pool
    defragmentationThreshold: 0.3, // 30% fragmentation
    gcInterval: 30000, // 30 seconds
    gcThreshold: 0.8, // 80% memory usage
    enableAutoDefrag: true,
    enablePredictiveAllocation: true,
    enableMemoryProfiling: true,
    persistentPoolSize: 1024 * 1024 * 1024, // 1GB
    streamingPoolSize: 512 * 1024 * 1024   // 512MB
  };

  private memoryUsageHistory: number[] = [];
  private allocationPatterns = new Map<string, number[]>();
  private predictiveCache = new Map<string, tf.Tensor>();

  constructor() {
    this.initializeMemoryPools();
    this.startMemoryManagement();
  }

  /**
   * Initialize memory pools for different use cases
   */
  private initializeMemoryPools(): void {
    try {
      // Persistent pool for model weights and long-lived tensors
      this.createMemoryPool('persistent', this.config.persistentPoolSize, 'persistent');
      
      // Temporary pool for intermediate computations
      this.createMemoryPool('temporary', this.config.maxPoolSize, 'temporary');
      
      // Streaming pool for video frames and real-time data
      this.createMemoryPool('streaming', this.config.streamingPoolSize, 'streaming');

      this.logger.log('Memory pools initialized successfully');
      
    } catch (error) {
      this.logger.error(`Memory pool initialization failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Create a memory pool
   */
  private createMemoryPool(id: string, size: number, type: MemoryPool['type']): void {
    const pool: MemoryPool = {
      id,
      size,
      allocated: 0,
      free: size,
      chunks: [],
      type
    };

    // Initialize with one large free chunk
    pool.chunks.push({
      id: `${id}_chunk_0`,
      offset: 0,
      size,
      isAllocated: false,
      allocationTime: 0,
      lastAccessed: 0
    });

    this.memoryPools.set(id, pool);
    this.logger.log(`Created ${type} memory pool: ${id} (${(size / 1024 / 1024).toFixed(1)}MB)`);
  }

  /**
   * Allocate memory for a tensor with intelligent pool selection
   */
  public async allocateMemory(
    size: number,
    metadata: MemoryAllocation['metadata'],
    preferredPool?: string
  ): Promise<MemoryAllocation | null> {
    try {
      // Select optimal pool
      const poolId = preferredPool || this.selectOptimalPool(size, metadata);
      const pool = this.memoryPools.get(poolId);
      
      if (!pool) {
        throw new Error(`Memory pool ${poolId} not found`);
      }

      // Find suitable chunk
      let chunk = this.findSuitableChunk(pool, size);
      
      if (!chunk) {
        // Try garbage collection
        await this.runGarbageCollection();
        chunk = this.findSuitableChunk(pool, size);
        
        if (!chunk) {
          // Try defragmentation
          await this.defragmentPool(pool);
          chunk = this.findSuitableChunk(pool, size);
        }
        
        if (!chunk) {
          this.logger.warn(`Memory allocation failed: insufficient space in pool ${poolId}`);
          return null;
        }
      }

      // Split chunk if necessary
      if (chunk.size > size + 1024) { // Leave some padding
        this.splitChunk(pool, chunk, size);
      }

      // Mark chunk as allocated
      chunk.isAllocated = true;
      chunk.allocationTime = Date.now();
      chunk.lastAccessed = Date.now();
      chunk.tag = metadata.purpose;

      // Update pool statistics
      pool.allocated += chunk.size;
      pool.free -= chunk.size;

      // Create tensor (placeholder for actual GPU allocation)
      const tensor = tf.zeros([size / 4]); // Assuming float32
      chunk.tensor = tensor;

      // Create allocation record
      const allocation: MemoryAllocation = {
        chunkId: chunk.id,
        poolId,
        size: chunk.size,
        tensor,
        metadata
      };

      this.allocations.set(chunk.id, allocation);

      // Record allocation event
      this.recordAllocationEvent('allocate', chunk.size, poolId, metadata);

      // Update usage patterns for prediction
      this.updateAllocationPattern(metadata.purpose, size);

      this.logger.debug(`Allocated ${(size / 1024).toFixed(1)}KB in pool ${poolId} for ${metadata.purpose}`);

      return allocation;

    } catch (error) {
      this.logger.error(`Memory allocation failed: ${error.message}`);
      return null;
    }
  }

  /**
   * Select optimal memory pool based on allocation requirements
   */
  private selectOptimalPool(size: number, metadata: MemoryAllocation['metadata']): string {
    // Persistent data goes to persistent pool
    if (metadata.persistent) {
      return 'persistent';
    }

    // Streaming data (video frames) goes to streaming pool
    if (metadata.purpose.includes('frame') || metadata.purpose.includes('stream')) {
      return 'streaming';
    }

    // Everything else goes to temporary pool
    return 'temporary';
  }

  /**
   * Find suitable chunk in memory pool
   */
  private findSuitableChunk(pool: MemoryPool, size: number): MemoryChunk | null {
    // First fit strategy with size preference
    let bestChunk: MemoryChunk | null = null;
    let bestSize = Infinity;

    for (const chunk of pool.chunks) {
      if (!chunk.isAllocated && chunk.size >= size) {
        // Prefer chunk that's closest in size to minimize fragmentation
        if (chunk.size < bestSize) {
          bestChunk = chunk;
          bestSize = chunk.size;
        }
      }
    }

    return bestChunk;
  }

  /**
   * Split a chunk into allocated and free parts
   */
  private splitChunk(pool: MemoryPool, chunk: MemoryChunk, allocatedSize: number): void {
    const remainingSize = chunk.size - allocatedSize;
    
    if (remainingSize > 0) {
      // Create new chunk for remaining space
      const newChunk: MemoryChunk = {
        id: `${pool.id}_chunk_${Date.now()}`,
        offset: chunk.offset + allocatedSize,
        size: remainingSize,
        isAllocated: false,
        allocationTime: 0,
        lastAccessed: 0
      };

      // Update original chunk size
      chunk.size = allocatedSize;

      // Insert new chunk
      const chunkIndex = pool.chunks.indexOf(chunk);
      pool.chunks.splice(chunkIndex + 1, 0, newChunk);
    }
  }

  /**
   * Deallocate memory and return chunk to pool
   */
  public async deallocateMemory(chunkId: string): Promise<boolean> {
    try {
      const allocation = this.allocations.get(chunkId);
      if (!allocation) {
        this.logger.warn(`Allocation not found: ${chunkId}`);
        return false;
      }

      const pool = this.memoryPools.get(allocation.poolId);
      if (!pool) {
        this.logger.error(`Pool not found: ${allocation.poolId}`);
        return false;
      }

      // Find chunk in pool
      const chunk = pool.chunks.find(c => c.id === chunkId);
      if (!chunk) {
        this.logger.error(`Chunk not found in pool: ${chunkId}`);
        return false;
      }

      // Dispose tensor
      if (chunk.tensor) {
        chunk.tensor.dispose();
        chunk.tensor = undefined;
      }

      // Mark chunk as free
      chunk.isAllocated = false;
      chunk.allocationTime = 0;
      chunk.tag = undefined;

      // Update pool statistics
      pool.allocated -= chunk.size;
      pool.free += chunk.size;

      // Remove allocation record
      this.allocations.delete(chunkId);

      // Record deallocation event
      this.recordAllocationEvent('deallocate', chunk.size, allocation.poolId);

      // Try to merge with adjacent free chunks
      this.mergeAdjacentChunks(pool, chunk);

      this.logger.debug(`Deallocated ${(chunk.size / 1024).toFixed(1)}KB from pool ${allocation.poolId}`);

      return true;

    } catch (error) {
      this.logger.error(`Memory deallocation failed: ${error.message}`);
      return false;
    }
  }

  /**
   * Merge adjacent free chunks to reduce fragmentation
   */
  private mergeAdjacentChunks(pool: MemoryPool, chunk: MemoryChunk): void {
    const chunkIndex = pool.chunks.indexOf(chunk);
    
    // Merge with next chunk if it's free
    if (chunkIndex < pool.chunks.length - 1) {
      const nextChunk = pool.chunks[chunkIndex + 1];
      if (!nextChunk.isAllocated && chunk.offset + chunk.size === nextChunk.offset) {
        chunk.size += nextChunk.size;
        pool.chunks.splice(chunkIndex + 1, 1);
      }
    }

    // Merge with previous chunk if it's free
    if (chunkIndex > 0) {
      const prevChunk = pool.chunks[chunkIndex - 1];
      if (!prevChunk.isAllocated && prevChunk.offset + prevChunk.size === chunk.offset) {
        prevChunk.size += chunk.size;
        pool.chunks.splice(chunkIndex, 1);
      }
    }
  }

  /**
   * Run garbage collection to free unused memory
   */
  public async runGarbageCollection(): Promise<number> {
    const startTime = Date.now();
    let totalFreed = 0;

    try {
      this.logger.debug('Starting garbage collection...');

      // Collect expired allocations
      const now = Date.now();
      const expiredAllocations: string[] = [];

      for (const [chunkId, allocation] of this.allocations) {
        // Check TTL
        if (allocation.metadata.ttl) {
          const chunk = this.findChunkById(chunkId);
          if (chunk && now - chunk.allocationTime > allocation.metadata.ttl) {
            expiredAllocations.push(chunkId);
          }
        }

        // Check last access time for temporary allocations
        if (!allocation.metadata.persistent) {
          const chunk = this.findChunkById(chunkId);
          if (chunk && now - chunk.lastAccessed > 300000) { // 5 minutes
            expiredAllocations.push(chunkId);
          }
        }
      }

      // Deallocate expired chunks
      for (const chunkId of expiredAllocations) {
        const allocation = this.allocations.get(chunkId);
        if (allocation) {
          totalFreed += allocation.size;
          await this.deallocateMemory(chunkId);
        }
      }

      // Force TensorFlow garbage collection
      tf.disposeVariables();
      if (global.gc) {
        global.gc();
      }

      // Update GC stats
      this.gcStats.totalRuns++;
      this.gcStats.totalFreed += totalFreed;
      this.gcStats.averageFreed = this.gcStats.totalFreed / this.gcStats.totalRuns;
      this.gcStats.lastRun = now;

      // Record GC event
      this.recordAllocationEvent('gc', totalFreed);

      const duration = Date.now() - startTime;
      this.logger.debug(`Garbage collection completed: freed ${(totalFreed / 1024 / 1024).toFixed(1)}MB in ${duration}ms`);

      return totalFreed;

    } catch (error) {
      this.logger.error(`Garbage collection failed: ${error.message}`);
      return 0;
    }
  }

  /**
   * Defragment memory pool by compacting allocated chunks
   */
  public async defragmentPool(pool: MemoryPool): Promise<void> {
    try {
      this.logger.debug(`Starting defragmentation for pool ${pool.id}...`);

      // Sort chunks by offset
      pool.chunks.sort((a, b) => a.offset - b.offset);

      // Compact allocated chunks
      let currentOffset = 0;
      const newChunks: MemoryChunk[] = [];

      for (const chunk of pool.chunks) {
        if (chunk.isAllocated) {
          // Move chunk to current offset
          if (chunk.offset !== currentOffset) {
            chunk.offset = currentOffset;
          }
          newChunks.push(chunk);
          currentOffset += chunk.size;
        }
      }

      // Create one large free chunk for remaining space
      if (currentOffset < pool.size) {
        newChunks.push({
          id: `${pool.id}_free_${Date.now()}`,
          offset: currentOffset,
          size: pool.size - currentOffset,
          isAllocated: false,
          allocationTime: 0,
          lastAccessed: 0
        });
      }

      pool.chunks = newChunks;

      // Record defragmentation event
      this.recordAllocationEvent('defrag', 0, pool.id);

      this.logger.debug(`Defragmentation completed for pool ${pool.id}`);

    } catch (error) {
      this.logger.error(`Defragmentation failed for pool ${pool.id}: ${error.message}`);
    }
  }

  /**
   * Predictively allocate memory based on usage patterns
   */
  public async predictiveAllocate(): Promise<void> {
    if (!this.config.enablePredictiveAllocation) {
      return;
    }

    try {
      for (const [purpose, sizes] of this.allocationPatterns) {
        if (sizes.length < 5) continue; // Need enough data

        // Calculate average size for this purpose
        const avgSize = sizes.reduce((a, b) => a + b, 0) / sizes.length;
        
        // Pre-allocate if we don't have a cached tensor for this purpose
        if (!this.predictiveCache.has(purpose)) {
          const tensor = tf.zeros([Math.floor(avgSize / 4)]);
          this.predictiveCache.set(purpose, tensor);
          
          this.logger.debug(`Predictively allocated ${(avgSize / 1024).toFixed(1)}KB for ${purpose}`);
        }
      }

    } catch (error) {
      this.logger.error(`Predictive allocation failed: ${error.message}`);
    }
  }

  /**
   * Get comprehensive memory statistics
   */
  public getMemoryStats(): MemoryStats {
    let totalMemory = 0;
    let allocatedMemory = 0;
    let freeMemory = 0;
    let fragmentedMemory = 0;

    for (const pool of this.memoryPools.values()) {
      totalMemory += pool.size;
      allocatedMemory += pool.allocated;
      freeMemory += pool.free;

      // Calculate fragmentation (number of free chunks > 1 indicates fragmentation)
      const freeChunks = pool.chunks.filter(c => !c.isAllocated);
      if (freeChunks.length > 1) {
        fragmentedMemory += freeChunks.reduce((sum, c) => sum + c.size, 0);
      }
    }

    return {
      totalMemory,
      allocatedMemory,
      freeMemory,
      fragmentedMemory,
      utilizationPercent: (allocatedMemory / totalMemory) * 100,
      poolStats: new Map(this.memoryPools),
      allocationHistory: [...this.allocationHistory].slice(-100), // Last 100 events
      gcStats: { ...this.gcStats }
    };
  }

  /**
   * Start automatic memory management
   */
  private startMemoryManagement(): void {
    // Garbage collection interval
    setInterval(async () => {
      const stats = this.getMemoryStats();
      
      if (stats.utilizationPercent > this.config.gcThreshold * 100) {
        await this.runGarbageCollection();
      }
    }, this.config.gcInterval);

    // Defragmentation check
    if (this.config.enableAutoDefrag) {
      setInterval(async () => {
        for (const pool of this.memoryPools.values()) {
          const freeChunks = pool.chunks.filter(c => !c.isAllocated);
          const fragmentation = freeChunks.length > 1 ? 
            freeChunks.reduce((sum, c) => sum + c.size, 0) / pool.size : 0;

          if (fragmentation > this.config.defragmentationThreshold) {
            await this.defragmentPool(pool);
          }
        }
      }, 60000); // Every minute
    }

    // Predictive allocation
    if (this.config.enablePredictiveAllocation) {
      setInterval(async () => {
        await this.predictiveAllocate();
      }, 30000); // Every 30 seconds
    }

    // Memory profiling
    if (this.config.enableMemoryProfiling) {
      setInterval(() => {
        const stats = this.getMemoryStats();
        this.memoryUsageHistory.push(stats.utilizationPercent);
        
        if (this.memoryUsageHistory.length > 1000) {
          this.memoryUsageHistory.shift();
        }

        this.logger.debug(`Memory utilization: ${stats.utilizationPercent.toFixed(1)}%`);
      }, 5000); // Every 5 seconds
    }
  }

  /**
   * Helper methods
   */
  private findChunkById(chunkId: string): MemoryChunk | null {
    for (const pool of this.memoryPools.values()) {
      const chunk = pool.chunks.find(c => c.id === chunkId);
      if (chunk) return chunk;
    }
    return null;
  }

  private recordAllocationEvent(
    type: MemoryAllocationEvent['type'], 
    size: number, 
    poolId?: string, 
    metadata?: any
  ): void {
    this.allocationHistory.push({
      timestamp: Date.now(),
      type,
      size,
      poolId,
      metadata
    });

    // Keep only recent history
    if (this.allocationHistory.length > 10000) {
      this.allocationHistory.shift();
    }
  }

  private updateAllocationPattern(purpose: string, size: number): void {
    if (!this.allocationPatterns.has(purpose)) {
      this.allocationPatterns.set(purpose, []);
    }

    const pattern = this.allocationPatterns.get(purpose)!;
    pattern.push(size);

    // Keep only recent patterns
    if (pattern.length > 100) {
      pattern.shift();
    }
  }

  /**
   * Update configuration
   */
  public updateConfiguration(newConfig: Partial<MemoryConfig>): void {
    Object.assign(this.config, newConfig);
    this.logger.log(`Memory manager configuration updated`);
  }

  /**
   * Force memory cleanup
   */
  public async forceCleanup(): Promise<void> {
    await this.runGarbageCollection();
    
    for (const pool of this.memoryPools.values()) {
      await this.defragmentPool(pool);
    }

    // Clear predictive cache
    for (const tensor of this.predictiveCache.values()) {
      tensor.dispose();
    }
    this.predictiveCache.clear();

    this.logger.log('Forced memory cleanup completed');
  }
}