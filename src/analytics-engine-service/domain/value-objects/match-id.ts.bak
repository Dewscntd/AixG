import { v4 as uuidv4, validate as uuidValidate } from 'uuid';

export class MatchId {
  private readonly _value: string;

  constructor(value?: string) {
    if (value && !uuidValidate(value)) {
      throw new Error('Invalid MatchId format');
    }
    this._value = value || uuidv4();
  }

  get value(): string {
    return this._value;
  }

  equals(other: MatchId): boolean {
    return this._value === other._value;
  }

  toString(): string {
    return this._value;
  }

  static generate(): MatchId {
    return new MatchId();
  }

  static fromString(value: string): MatchId {
    return new MatchId(value);
  }
}
