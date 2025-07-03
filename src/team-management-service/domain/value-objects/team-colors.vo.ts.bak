export class TeamColors {
  private constructor(
    private readonly _primary: string,
    private readonly _secondary?: string
  ) {
    this.validateColor(_primary, 'Primary');
    if (_secondary) {
      this.validateColor(_secondary, 'Secondary');
    }
  }

  public static create(primary: string, secondary?: string): TeamColors {
    return new TeamColors(primary, secondary);
  }

  private validateColor(color: string, type: string): void {
    if (!color || color.trim().length === 0) {
      throw new Error(`${type} color cannot be empty`);
    }

    // Validate hex color format
    const hexColorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
    if (!hexColorRegex.test(color)) {
      throw new Error(
        `${type} color must be a valid hex color (e.g., #FF0000 or #F00)`
      );
    }
  }

  get primary(): string {
    return this._primary;
  }

  get secondary(): string | undefined {
    return this._secondary;
  }

  public equals(other: TeamColors): boolean {
    return (
      this._primary === other._primary && this._secondary === other._secondary
    );
  }

  public toString(): string {
    return this._secondary
      ? `Primary: ${this._primary}, Secondary: ${this._secondary}`
      : `Primary: ${this._primary}`;
  }

  public toPrimitives(): { primary: string; secondary?: string } {
    return {
      primary: this._primary,
      secondary: this._secondary,
    };
  }
}
