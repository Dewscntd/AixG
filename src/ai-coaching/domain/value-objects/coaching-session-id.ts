import { v4 as uuidv4 } from 'uuid';

/**
 * Coaching Session Identifier Value Object
 * Ensures type safety and immutability for coaching session IDs
 */
export class CoachingSessionId {
  private readonly _value: string;

  private constructor(value: string) {
    if (!value || value.trim().length === 0) {
      throw new Error('Coaching session ID cannot be empty');
    }

    if (!this.isValidUuid(value)) {
      throw new Error('Coaching session ID must be a valid UUID');
    }

    this._value = value;
  }

  public static generate(): CoachingSessionId {
    return new CoachingSessionId(uuidv4());
  }

  public static fromString(value: string): CoachingSessionId {
    return new CoachingSessionId(value);
  }

  private isValidUuid(value: string): boolean {
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(value);
  }

  get value(): string {
    return this._value;
  }

  public equals(other: CoachingSessionId): boolean {
    return this._value === other._value;
  }

  public toString(): string {
    return this._value;
  }

  public toJSON(): string {
    return this._value;
  }
}
