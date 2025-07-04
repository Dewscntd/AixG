/**
 * Data Type Enumeration
 *
 * Defines all supported data types for external system synchronization.
 * Each external system connector specifies which data types it supports.
 */
export enum DataTypeEnum {
  // Match Data
  MATCH_SCHEDULE = 'MATCH_SCHEDULE',
  MATCH_RESULTS = 'MATCH_RESULTS',
  MATCH_STATISTICS = 'MATCH_STATISTICS',
  LIVE_MATCH_DATA = 'LIVE_MATCH_DATA',

  // Player Data
  PLAYER_PROFILES = 'PLAYER_PROFILES',
  PLAYER_STATISTICS = 'PLAYER_STATISTICS',
  PLAYER_POSITIONS = 'PLAYER_POSITIONS',
  PLAYER_MEDICAL_DATA = 'PLAYER_MEDICAL_DATA',

  // Team Data
  TEAM_ROSTERS = 'TEAM_ROSTERS',
  TEAM_FORMATIONS = 'TEAM_FORMATIONS',
  TEAM_STATISTICS = 'TEAM_STATISTICS',
  TEAM_TACTICS = 'TEAM_TACTICS',

  // GPS and Tracking Data
  GPS_POSITIONS = 'GPS_POSITIONS',
  MOVEMENT_PATTERNS = 'MOVEMENT_PATTERNS',
  HEAT_MAPS = 'HEAT_MAPS',
  SPEED_METRICS = 'SPEED_METRICS',
  DISTANCE_COVERED = 'DISTANCE_COVERED',

  // Performance Metrics
  PHYSICAL_PERFORMANCE = 'PHYSICAL_PERFORMANCE',
  TECHNICAL_METRICS = 'TECHNICAL_METRICS',
  TACTICAL_METRICS = 'TACTICAL_METRICS',
  INJURY_DATA = 'INJURY_DATA',

  // League and Competition Data
  LEAGUE_STANDINGS = 'LEAGUE_STANDINGS',
  TOURNAMENT_DATA = 'TOURNAMENT_DATA',
  REFEREE_DATA = 'REFEREE_DATA',
  WEATHER_CONDITIONS = 'WEATHER_CONDITIONS',

  // Video and Analysis Data
  VIDEO_METADATA = 'VIDEO_METADATA',
  EVENT_TAGS = 'EVENT_TAGS',
  ANALYSIS_RESULTS = 'ANALYSIS_RESULTS',
  HIGHLIGHTS = 'HIGHLIGHTS',
}

/**
 * Data Type Category - Groups related data types
 */
export enum DataCategoryEnum {
  MATCH = 'MATCH',
  PLAYER = 'PLAYER',
  TEAM = 'TEAM',
  TRACKING = 'TRACKING',
  PERFORMANCE = 'PERFORMANCE',
  COMPETITION = 'COMPETITION',
  ANALYSIS = 'ANALYSIS',
}

/**
 * Utility class for data type operations
 */
export class DataTypeUtils {
  /**
   * Get category for a data type
   */
  static getCategoryForDataType(dataType: DataTypeEnum): DataCategoryEnum {
    const categoryMap: Record<DataTypeEnum, DataCategoryEnum> = {
      [DataTypeEnum.MATCH_SCHEDULE]: DataCategoryEnum.MATCH,
      [DataTypeEnum.MATCH_RESULTS]: DataCategoryEnum.MATCH,
      [DataTypeEnum.MATCH_STATISTICS]: DataCategoryEnum.MATCH,
      [DataTypeEnum.LIVE_MATCH_DATA]: DataCategoryEnum.MATCH,

      [DataTypeEnum.PLAYER_PROFILES]: DataCategoryEnum.PLAYER,
      [DataTypeEnum.PLAYER_STATISTICS]: DataCategoryEnum.PLAYER,
      [DataTypeEnum.PLAYER_POSITIONS]: DataCategoryEnum.PLAYER,
      [DataTypeEnum.PLAYER_MEDICAL_DATA]: DataCategoryEnum.PLAYER,

      [DataTypeEnum.TEAM_ROSTERS]: DataCategoryEnum.TEAM,
      [DataTypeEnum.TEAM_FORMATIONS]: DataCategoryEnum.TEAM,
      [DataTypeEnum.TEAM_STATISTICS]: DataCategoryEnum.TEAM,
      [DataTypeEnum.TEAM_TACTICS]: DataCategoryEnum.TEAM,

      [DataTypeEnum.GPS_POSITIONS]: DataCategoryEnum.TRACKING,
      [DataTypeEnum.MOVEMENT_PATTERNS]: DataCategoryEnum.TRACKING,
      [DataTypeEnum.HEAT_MAPS]: DataCategoryEnum.TRACKING,
      [DataTypeEnum.SPEED_METRICS]: DataCategoryEnum.TRACKING,
      [DataTypeEnum.DISTANCE_COVERED]: DataCategoryEnum.TRACKING,

      [DataTypeEnum.PHYSICAL_PERFORMANCE]: DataCategoryEnum.PERFORMANCE,
      [DataTypeEnum.TECHNICAL_METRICS]: DataCategoryEnum.PERFORMANCE,
      [DataTypeEnum.TACTICAL_METRICS]: DataCategoryEnum.PERFORMANCE,
      [DataTypeEnum.INJURY_DATA]: DataCategoryEnum.PERFORMANCE,

      [DataTypeEnum.LEAGUE_STANDINGS]: DataCategoryEnum.COMPETITION,
      [DataTypeEnum.TOURNAMENT_DATA]: DataCategoryEnum.COMPETITION,
      [DataTypeEnum.REFEREE_DATA]: DataCategoryEnum.COMPETITION,
      [DataTypeEnum.WEATHER_CONDITIONS]: DataCategoryEnum.COMPETITION,

      [DataTypeEnum.VIDEO_METADATA]: DataCategoryEnum.ANALYSIS,
      [DataTypeEnum.EVENT_TAGS]: DataCategoryEnum.ANALYSIS,
      [DataTypeEnum.ANALYSIS_RESULTS]: DataCategoryEnum.ANALYSIS,
      [DataTypeEnum.HIGHLIGHTS]: DataCategoryEnum.ANALYSIS,
    };

    return categoryMap[dataType];
  }

  /**
   * Get all data types for a category
   */
  static getDataTypesForCategory(category: DataCategoryEnum): DataTypeEnum[] {
    return Object.values(DataTypeEnum).filter(
      dataType => this.getCategoryForDataType(dataType) === category
    );
  }

  /**
   * Check if data type requires real-time processing
   */
  static isRealTimeDataType(dataType: DataTypeEnum): boolean {
    const realTimeTypes = [
      DataTypeEnum.LIVE_MATCH_DATA,
      DataTypeEnum.GPS_POSITIONS,
      DataTypeEnum.PLAYER_POSITIONS,
      DataTypeEnum.SPEED_METRICS,
    ];

    return realTimeTypes.includes(dataType);
  }

  /**
   * Check if data type contains sensitive information
   */
  static isSensitiveDataType(dataType: DataTypeEnum): boolean {
    const sensitiveTypes = [
      DataTypeEnum.PLAYER_MEDICAL_DATA,
      DataTypeEnum.INJURY_DATA,
      DataTypeEnum.PLAYER_PROFILES,
    ];

    return sensitiveTypes.includes(dataType);
  }
}
