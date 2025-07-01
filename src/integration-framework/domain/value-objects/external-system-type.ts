/**
 * External System Type Value Object
 * 
 * Defines supported external systems for integration
 */
export enum ExternalSystemTypeEnum {
  IFA = 'IFA', // Israel Football Association
  LIGA_LEUMIT = 'LIGA_LEUMIT',
  PREMIER_LEAGUE_IL = 'PREMIER_LEAGUE_IL',
  GPS_TRACKING = 'GPS_TRACKING', // Catapult, STATSports, Polar Team Pro
  MEDICAL_SYSTEM = 'MEDICAL_SYSTEM',
  WYSCOUT = 'WYSCOUT',
  INSTAT = 'INSTAT',
  OPTA_SPORTS = 'OPTA_SPORTS',
  CUSTOM_ANALYTICS = 'CUSTOM_ANALYTICS'
}

export class ExternalSystemType {
  private readonly _value: ExternalSystemTypeEnum;

  constructor(value: ExternalSystemTypeEnum) {
    this._value = value;
  }

  static IFA(): ExternalSystemType {
    return new ExternalSystemType(ExternalSystemTypeEnum.IFA);
  }

  static GPS_TRACKING(): ExternalSystemType {
    return new ExternalSystemType(ExternalSystemTypeEnum.GPS_TRACKING);
  }

  static WYSCOUT(): ExternalSystemType {
    return new ExternalSystemType(ExternalSystemTypeEnum.WYSCOUT);
  }

  static LIGA_LEUMIT(): ExternalSystemType {
    return new ExternalSystemType(ExternalSystemTypeEnum.LIGA_LEUMIT);
  }

  static fromString(value: string): ExternalSystemType {
    const enumValue = Object.values(ExternalSystemTypeEnum).find(
      (enumVal) => enumVal === value.toUpperCase()
    );
    
    if (!enumValue) {
      throw new Error(`Unsupported external system type: ${value}`);
    }
    
    return new ExternalSystemType(enumValue);
  }

  get value(): ExternalSystemTypeEnum {
    return this._value;
  }

  equals(other: ExternalSystemType): boolean {
    return this._value === other._value;
  }

  toString(): string {
    return this._value;
  }

  /**
   * Check if system supports real-time data
   */
  supportsRealTime(): boolean {
    return [
      ExternalSystemTypeEnum.GPS_TRACKING,
      ExternalSystemTypeEnum.IFA
    ].includes(this._value);
  }

  /**
   * Check if system supports Hebrew language
   */
  supportsHebrew(): boolean {
    return [
      ExternalSystemTypeEnum.IFA,
      ExternalSystemTypeEnum.LIGA_LEUMIT,
      ExternalSystemTypeEnum.PREMIER_LEAGUE_IL
    ].includes(this._value);
  }

  /**
   * Get display name in Hebrew
   */
  getHebrewDisplayName(): string {
    const hebrewNames: Record<ExternalSystemTypeEnum, string> = {
      [ExternalSystemTypeEnum.IFA]: 'התאחדות הכדורגל הישראלית',
      [ExternalSystemTypeEnum.LIGA_LEUMIT]: 'ליגה לאומית',
      [ExternalSystemTypeEnum.PREMIER_LEAGUE_IL]: 'ליגת העל',
      [ExternalSystemTypeEnum.GPS_TRACKING]: 'מעקב GPS',
      [ExternalSystemTypeEnum.MEDICAL_SYSTEM]: 'מערכת רפואית',
      [ExternalSystemTypeEnum.WYSCOUT]: 'Wyscout',
      [ExternalSystemTypeEnum.INSTAT]: 'InStat',
      [ExternalSystemTypeEnum.OPTA_SPORTS]: 'Opta Sports',
      [ExternalSystemTypeEnum.CUSTOM_ANALYTICS]: 'אנליטיקה מותאמת'
    };

    return hebrewNames[this._value];
  }
}
