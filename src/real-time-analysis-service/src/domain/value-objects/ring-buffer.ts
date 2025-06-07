/**
 * Ring Buffer implementation for efficient frame storage
 * Provides O(1) insertion and retrieval with fixed memory usage
 */
export class RingBuffer<T> {
  private readonly _buffer: (T | undefined)[];
  private readonly _capacity: number;
  private _head: number = 0;
  private _tail: number = 0;
  private _size: number = 0;
  private _isFull: boolean = false;

  constructor(capacity: number) {
    if (capacity <= 0) {
      throw new Error('Ring buffer capacity must be positive');
    }
    
    this._capacity = capacity;
    this._buffer = new Array(capacity);
  }

  /**
   * Add an item to the buffer
   * If buffer is full, overwrites the oldest item
   */
  push(item: T): void {
    this._buffer[this._head] = item;
    
    if (this._isFull) {
      this._tail = (this._tail + 1) % this._capacity;
    } else {
      this._size++;
    }
    
    this._head = (this._head + 1) % this._capacity;
    this._isFull = this._head === this._tail;
  }

  /**
   * Remove and return the oldest item
   * Returns undefined if buffer is empty
   */
  pop(): T | undefined {
    if (this.isEmpty()) {
      return undefined;
    }

    const item = this._buffer[this._tail];
    this._buffer[this._tail] = undefined;
    this._tail = (this._tail + 1) % this._capacity;
    this._size--;
    this._isFull = false;

    return item;
  }

  /**
   * Get the newest item without removing it
   */
  peek(): T | undefined {
    if (this.isEmpty()) {
      return undefined;
    }
    
    const newestIndex = this._head === 0 ? this._capacity - 1 : this._head - 1;
    return this._buffer[newestIndex];
  }

  /**
   * Get the oldest item without removing it
   */
  peekOldest(): T | undefined {
    if (this.isEmpty()) {
      return undefined;
    }
    
    return this._buffer[this._tail];
  }

  /**
   * Get item at specific index (0 = oldest, size-1 = newest)
   */
  get(index: number): T | undefined {
    if (index < 0 || index >= this._size) {
      return undefined;
    }
    
    const actualIndex = (this._tail + index) % this._capacity;
    return this._buffer[actualIndex];
  }

  /**
   * Get the last N items (newest first)
   */
  getLast(count: number): T[] {
    if (count <= 0) {
      return [];
    }
    
    const actualCount = Math.min(count, this._size);
    const result: T[] = [];
    
    for (let i = 0; i < actualCount; i++) {
      const index = this._head - 1 - i;
      const actualIndex = index < 0 ? this._capacity + index : index;
      const item = this._buffer[actualIndex];
      if (item !== undefined) {
        result.push(item);
      }
    }
    
    return result;
  }

  /**
   * Get all items as array (oldest first)
   */
  toArray(): T[] {
    const result: T[] = [];
    
    for (let i = 0; i < this._size; i++) {
      const item = this.get(i);
      if (item !== undefined) {
        result.push(item);
      }
    }
    
    return result;
  }

  /**
   * Clear all items from buffer
   */
  clear(): void {
    this._buffer.fill(undefined);
    this._head = 0;
    this._tail = 0;
    this._size = 0;
    this._isFull = false;
  }

  /**
   * Check if buffer is empty
   */
  isEmpty(): boolean {
    return this._size === 0;
  }

  /**
   * Check if buffer is full
   */
  isFull(): boolean {
    return this._isFull;
  }

  /**
   * Get current number of items
   */
  get size(): number {
    return this._size;
  }

  /**
   * Get maximum capacity
   */
  get capacity(): number {
    return this._capacity;
  }

  /**
   * Get available space
   */
  get availableSpace(): number {
    return this._capacity - this._size;
  }

  /**
   * Get utilization percentage (0-100)
   */
  get utilization(): number {
    return (this._size / this._capacity) * 100;
  }
}
