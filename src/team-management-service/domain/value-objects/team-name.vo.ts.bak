export class TeamName {
  private constructor(private readonly _value: string) {
    this.validate(_value);
  }

  public static create(value: string): TeamName {
    return new TeamName(value);
  }

  private validate(value: string): void {
    if (!value || value.trim().length === 0) {
      throw new Error('Team name cannot be empty');
    }

    if (value.length < 2) {
      throw new Error('Team name must be at least 2 characters long');
    }

    if (value.length > 100) {
      throw new Error('Team name cannot exceed 100 characters');
    }

    // Only allow letters, numbers, spaces, and common punctuation
    const validNameRegex = /^[a-zA-Z0-9\s\-'.&()]+$/;
    if (!validNameRegex.test(value)) {
      throw new Error('Team name contains invalid characters');
    }
  }

  get value(): string {
    return this._value;
  }

  public equals(other: TeamName): boolean {
    return this._value === other._value;
  }

  public toString(): string {
    return this._value;
  }
}
