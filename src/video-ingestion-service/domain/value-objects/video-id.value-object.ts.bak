import { v4 as uuidv4, validate as uuidValidate } from 'uuid';

export class VideoId {
  private readonly _value: string;

  constructor(value?: string) {
    if (value !== undefined && (value.trim() === '' || !uuidValidate(value))) {
      throw new Error('Invalid VideoId format');
    }
    this._value = value || uuidv4();

    // Make the object immutable
    Object.freeze(this);
  }

  get value(): string {
    return this._value;
  }

  equals(other: VideoId): boolean {
    return this._value === other._value;
  }

  toString(): string {
    return this._value;
  }

  static generate(): VideoId {
    return new VideoId();
  }

  static fromString(value: string): VideoId {
    return new VideoId(value);
  }
}
