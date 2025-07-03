import { v4 as uuidv4 } from 'uuid';

export class TeamId {
  private constructor(private readonly _value: string) {
    this.validate(_value);
  }

  public static generate(): TeamId {
    return new TeamId(uuidv4());
  }

  public static fromString(value: string): TeamId {
    return new TeamId(value);
  }

  private validate(value: string): void {
    if (!value || value.trim().length === 0) {
      throw new Error('Team ID cannot be empty');
    }

    // UUID v4 validation
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(value)) {
      throw new Error('Team ID must be a valid UUID v4');
    }
  }

  get value(): string {
    return this._value;
  }

  public equals(other: TeamId): boolean {
    return this._value === other._value;
  }

  public toString(): string {
    return this._value;
  }
}
