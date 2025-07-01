import { v4 as uuidv4 } from 'uuid';

/**
 * DataSourceId Value Object
 * 
 * Strongly typed identifier for data sources with validation
 */
export class DataSourceId {
  private readonly _value: string;

  constructor(value: string) {
    if (!value || value.trim().length === 0) {
      throw new Error('DataSourceId cannot be empty');
    }
    
    if (!this.isValidUuid(value)) {
      throw new Error('DataSourceId must be a valid UUID');
    }
    
    this._value = value;
  }

  static generate(): DataSourceId {
    return new DataSourceId(uuidv4());
  }

  static fromString(value: string): DataSourceId {
    return new DataSourceId(value);
  }

  get value(): string {
    return this._value;
  }

  equals(other: DataSourceId): boolean {
    return this._value === other._value;
  }

  toString(): string {
    return this._value;
  }

  private isValidUuid(uuid: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  }
}
