import { v4 as uuidv4 } from 'uuid';

/**
 * Stream ID value object for real-time video streams
 * Immutable identifier for live video streams
 */
export class StreamId {
  private readonly _value: string;

  private constructor(value: string) {
    if (!value || value.trim().length === 0) {
      throw new Error('StreamId cannot be empty');
    }

    // Validate UUID format
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(value)) {
      throw new Error('StreamId must be a valid UUID');
    }

    this._value = value;
  }

  /**
   * Generate a new unique StreamId
   */
  static generate(): StreamId {
    return new StreamId(uuidv4());
  }

  /**
   * Create StreamId from existing string value
   */
  static fromString(value: string): StreamId {
    return new StreamId(value);
  }

  /**
   * Get the string value of the StreamId
   */
  get value(): string {
    return this._value;
  }

  /**
   * Check equality with another StreamId
   */
  equals(other: StreamId): boolean {
    return this._value === other._value;
  }

  /**
   * String representation
   */
  toString(): string {
    return this._value;
  }

  /**
   * JSON serialization
   */
  toJSON(): string {
    return this._value;
  }
}
