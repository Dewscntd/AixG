/**
 * Football Entity Value Object
 * Models players, teams, positions, and tactical roles with Hebrew support
 */

import { FootballConcept, ConceptCategory } from './football-concept';

export enum EntityType {
  PLAYER = 'player',
  TEAM = 'team',
  POSITION = 'position',
  TACTICAL_ROLE = 'tactical_role',
  COACH = 'coach',
  REFEREE = 'referee',
  MATCH = 'match',
  COMPETITION = 'competition',
  VENUE = 'venue',
  CLUB = 'club',
}

export enum PositionType {
  GOALKEEPER = 'goalkeeper',
  DEFENDER = 'defender',
  MIDFIELDER = 'midfielder',
  FORWARD = 'forward',
  WING_BACK = 'wing_back',
  SWEEPER = 'sweeper',
}

export enum TacticalRole {
  // Goalkeeper Roles
  SWEEPER_KEEPER = 'sweeper_keeper',
  SHOT_STOPPER = 'shot_stopper',
  DISTRIBUTION_KEEPER = 'distribution_keeper',

  // Defensive Roles
  CENTRE_BACK = 'centre_back',
  BALL_PLAYING_DEFENDER = 'ball_playing_defender',
  STOPPER = 'stopper',
  COVERING_DEFENDER = 'covering_defender',
  FULL_BACK = 'full_back',
  ATTACKING_FULL_BACK = 'attacking_full_back',
  DEFENSIVE_FULL_BACK = 'defensive_full_back',
  WING_BACK_ROLE = 'wing_back_role',

  // Midfield Roles
  DEFENSIVE_MIDFIELDER = 'defensive_midfielder',
  HOLDING_MIDFIELDER = 'holding_midfielder',
  BOX_TO_BOX = 'box_to_box',
  CENTRAL_MIDFIELDER = 'central_midfielder',
  ATTACKING_MIDFIELDER = 'attacking_midfielder',
  PLAYMAKER = 'playmaker',
  DEEP_PLAYMAKER = 'deep_playmaker',
  WIDE_MIDFIELDER = 'wide_midfielder',
  WINGER = 'winger',
  INVERTED_WINGER = 'inverted_winger',

  // Forward Roles
  STRIKER = 'striker',
  TARGET_MAN = 'target_man',
  POACHER = 'poacher',
  FALSE_NINE = 'false_nine',
  SECOND_STRIKER = 'second_striker',
  WIDE_FORWARD = 'wide_forward',
  INSIDE_FORWARD = 'inside_forward',
}

export enum PlayerStatus {
  ACTIVE = 'active',
  INJURED = 'injured',
  SUSPENDED = 'suspended',
  RETIRED = 'retired',
  ON_LOAN = 'on_loan',
  TRANSFER_LISTED = 'transfer_listed',
}

export enum TeamStatus {
  ACTIVE = 'active',
  RELEGATED = 'relegated',
  PROMOTED = 'promoted',
  DISSOLVED = 'dissolved',
  MERGED = 'merged',
}

export interface EntityTranslation {
  language: string;
  name: string;
  shortName?: string;
  nickname?: string;
  description?: string;
  pronunciation?: string;
}

export interface EntityAttributes {
  physical: {
    height?: number; // cm
    weight?: number; // kg
    age?: number;
    preferredFoot?: 'left' | 'right' | 'both';
    fitness?: number; // 0-100
  };
  technical: {
    ballControl?: number; // 0-100
    passing?: number;
    shooting?: number;
    dribbling?: number;
    crossing?: number;
    heading?: number;
  };
  mental: {
    decisionMaking?: number; // 0-100
    positioning?: number;
    concentration?: number;
    leadership?: number;
    workRate?: number;
    vision?: number;
  };
  tactical: {
    defensiveAwareness?: number; // 0-100
    attackingTendency?: number;
    pressing?: number;
    marking?: number;
    creativity?: number;
    discipline?: number;
  };
}

export interface PositionRequirements {
  essential: {
    physicalAttributes: string[];
    technicalSkills: string[];
    mentalQualities: string[];
    tacticalAwareness: string[];
  };
  preferred: {
    physicalAttributes: string[];
    technicalSkills: string[];
    mentalQualities: string[];
    tacticalAwareness: string[];
  };
  minimumRatings: {
    [key: string]: number; // attribute name -> minimum rating
  };
}

export interface RoleResponsibilities {
  primary: {
    english: string[];
    hebrew: string[];
  };
  secondary: {
    english: string[];
    hebrew: string[];
  };
  situational: {
    attacking: { english: string[]; hebrew: string[] };
    defending: { english: string[]; hebrew: string[] };
    transition: { english: string[]; hebrew: string[] };
    setPieces: { english: string[]; hebrew: string[] };
  };
}

export interface EntityRelationships {
  teammates?: string[]; // player IDs
  opponents?: string[]; // team IDs for teams, player IDs for players
  coaches?: string[]; // coach IDs
  manager?: string; // manager ID
  club?: string; // club ID
  league?: string; // competition ID
  venue?: string; // venue ID
  parent?: string; // parent entity ID
  children?: string[]; // child entity IDs
}

export interface EntityMetrics {
  performance: {
    overall?: number; // 0-100
    recent?: number; // last 5 games
    seasonal?: number; // current season
    career?: number; // career average
  };
  reliability: {
    consistency?: number; // 0-100
    availability?: number; // games available / total games
    injuryProneness?: number; // 0-100 (lower is better)
  };
  development: {
    potential?: number; // 0-100
    growthRate?: number; // -10 to +10 per season
    peakAge?: number;
    currentTrend?: 'improving' | 'stable' | 'declining';
  };
  marketValue: {
    current?: number; // currency units
    peak?: number;
    trend?: 'rising' | 'stable' | 'falling';
  };
}

export interface EntityData {
  id: string;
  type: EntityType;
  name: string;
  hebrewName: string;
  translations: EntityTranslation[];
  shortName?: string;
  nickname?: string;
  hebrewNickname?: string;
  description: {
    english: string;
    hebrew: string;
  };

  // Type-specific data
  positionType?: PositionType;
  tacticalRole?: TacticalRole;
  status?: PlayerStatus | TeamStatus;

  // Attributes and capabilities
  attributes?: EntityAttributes;
  requirements?: PositionRequirements;
  responsibilities?: RoleResponsibilities;

  // Relationships and context
  relationships: EntityRelationships;
  concepts: string[]; // related football concept IDs

  // Performance and analytics
  metrics?: EntityMetrics;

  // Metadata
  tags: string[];
  nationality?: string;
  dateOfBirth?: Date;
  dateOfFormation?: Date; // for teams/clubs
  location?: {
    country: string;
    city: string;
    coordinates?: { lat: number; lng: number };
  };

  createdAt: Date;
  lastUpdated: Date;
  version: string;
  confidence: number;
  verified: boolean;
  sources: string[];
}

export class FootballEntity {
  private readonly _data: EntityData;

  // Comprehensive position database with Hebrew translations
  private static readonly POSITION_DATABASE = new Map<string, EntityData>([
    // Goalkeeper
    [
      'goalkeeper',
      {
        id: 'goalkeeper',
        type: EntityType.POSITION,
        name: 'Goalkeeper',
        hebrewName: 'שוער',
        translations: [
          {
            language: 'he',
            name: 'שוער',
            shortName: 'שוע',
            nickname: 'השוער',
            description: 'שחקן המגן על השער',
            pronunciation: 'sho-er',
          },
        ],
        shortName: 'GK',
        description: {
          english:
            'Player who defends the goal and can use hands within penalty area',
          hebrew: 'שחקן המגן על השער ויכול להשתמש בידיים ברחבת העונשין',
        },
        positionType: PositionType.GOALKEEPER,
        tacticalRole: TacticalRole.SWEEPER_KEEPER,
        requirements: {
          essential: {
            physicalAttributes: ['height', 'reflexes', 'agility'],
            technicalSkills: ['shot_stopping', 'distribution', 'handling'],
            mentalQualities: ['concentration', 'courage', 'decision_making'],
            tacticalAwareness: [
              'positioning',
              'command_of_area',
              'communication',
            ],
          },
          preferred: {
            physicalAttributes: ['reach', 'jumping'],
            technicalSkills: ['kicking', 'throwing'],
            mentalQualities: ['leadership', 'composure'],
            tacticalAwareness: ['reading_game', 'organization'],
          },
          minimumRatings: {
            shot_stopping: 70,
            positioning: 65,
            reflexes: 75,
            distribution: 50,
          },
        },
        responsibilities: {
          primary: {
            english: [
              'Prevent goals',
              'Distribute ball',
              'Command penalty area',
            ],
            hebrew: ['מניעת שערים', 'חלוקת כדורים', 'שליטה ברחבת העונשין'],
          },
          secondary: {
            english: [
              'Organize defense',
              'Start attacks',
              'Communicate with team',
            ],
            hebrew: ['ארגון ההגנה', 'יזום התקפות', 'תקשורת עם הקבוצה'],
          },
          situational: {
            attacking: {
              english: [
                'Long distribution',
                'Quick release',
                'Support buildup',
              ],
              hebrew: ['חלוקה ארוכה', 'שחרור מהיר', 'תמיכה בבניה'],
            },
            defending: {
              english: ['Shot stopping', 'Cross collection', 'Sweeping'],
              hebrew: ['עצירת כדורים', 'איסוף העברות', 'טאטוא'],
            },
            transition: {
              english: ['Quick distribution', 'Initiate counter', 'Find space'],
              hebrew: ['חלוקה מהירה', 'יזום נגד', 'מציאת מרחב'],
            },
            setPieces: {
              english: ['Command area', 'Positioning', 'Communication'],
              hebrew: ['שליטה באזור', 'מיקום', 'תקשורת'],
            },
          },
        },
        relationships: {
          teammates: [],
          coaches: [],
        },
        concepts: [
          'goalkeeper',
          'penalty_area',
          'distribution',
          'shot_stopping',
        ],
        tags: ['position', 'specialized', 'defensive', 'unique_rules'],
        createdAt: new Date(),
        lastUpdated: new Date(),
        version: '1.0',
        confidence: 1.0,
        verified: true,
        sources: ['FIFA Laws', 'Position Analysis'],
      },
    ],

    // Centre Back
    [
      'centre_back',
      {
        id: 'centre_back',
        type: EntityType.POSITION,
        name: 'Centre Back',
        hebrewName: 'מגן אמצע',
        translations: [
          {
            language: 'he',
            name: 'מגן אמצע',
            shortName: 'מא',
            nickname: 'הסטופר',
            description: 'מגן מרכזי באמצע קו ההגנה',
            pronunciation: 'ma-gen e-met-za',
          },
        ],
        shortName: 'CB',
        description: {
          english:
            'Central defender responsible for marking strikers and aerial duels',
          hebrew: 'מגן מרכזי האחראי על שמירה על חלוצים ודואלים אוויריים',
        },
        positionType: PositionType.DEFENDER,
        tacticalRole: TacticalRole.CENTRE_BACK,
        requirements: {
          essential: {
            physicalAttributes: ['height', 'strength', 'jumping'],
            technicalSkills: ['heading', 'tackling', 'clearances'],
            mentalQualities: ['concentration', 'positioning', 'anticipation'],
            tacticalAwareness: ['marking', 'offside_trap', 'covering'],
          },
          preferred: {
            physicalAttributes: ['pace', 'stamina'],
            technicalSkills: ['passing', 'ball_control'],
            mentalQualities: ['leadership', 'communication'],
            tacticalAwareness: ['reading_game', 'organization'],
          },
          minimumRatings: {
            heading: 75,
            marking: 70,
            tackling: 70,
            positioning: 75,
          },
        },
        responsibilities: {
          primary: {
            english: ['Mark strikers', 'Win aerial duels', 'Clear danger'],
            hebrew: [
              'שמירה על חלוצים',
              'זכייה בדואלים אוויריים',
              'פינוי סכנות',
            ],
          },
          secondary: {
            english: ['Start buildup', 'Cover teammates', 'Organize defense'],
            hebrew: ['יזום בנייה', 'כיסוי חברי קבוצה', 'ארגון ההגנה'],
          },
          situational: {
            attacking: {
              english: ['Join set pieces', 'Long passes', 'Support buildup'],
              hebrew: [
                'הצטרפות למצבים קבועים',
                'מסירות ארוכות',
                'תמיכה בבנייה',
              ],
            },
            defending: {
              english: ['Block shots', 'Intercept passes', 'Win headers'],
              hebrew: ['חסימת כדורים', 'יירוט מסירות', 'זכייה בכדורי אוויר'],
            },
            transition: {
              english: ['Quick clearance', 'Find midfielder', 'Maintain shape'],
              hebrew: ['פינוי מהיר', 'מציאת קשר', 'שמירה על מבנה'],
            },
            setPieces: {
              english: ['Defend corners', 'Mark zonally', 'Clear first post'],
              hebrew: ['הגנה על קורנרים', 'שמירה אזורית', 'פינוי עמוד ראשון'],
            },
          },
        },
        relationships: {
          teammates: [],
          coaches: [],
        },
        concepts: ['centre_back', 'marking', 'aerial_duels', 'defensive_line'],
        tags: ['position', 'defensive', 'central', 'physical'],
        createdAt: new Date(),
        lastUpdated: new Date(),
        version: '1.0',
        confidence: 1.0,
        verified: true,
        sources: ['Tactical Analysis', 'Position Guide'],
      },
    ],

    // Central Midfielder
    [
      'central_midfielder',
      {
        id: 'central_midfielder',
        type: EntityType.POSITION,
        name: 'Central Midfielder',
        hebrewName: 'קשר מרכזי',
        translations: [
          {
            language: 'he',
            name: 'קשר מרכזי',
            shortName: 'קמ',
            nickname: 'המנוע',
            description: 'קשר הפועל במרכז המגרש',
            pronunciation: 'ke-sher mer-ka-zi',
          },
        ],
        shortName: 'CM',
        description: {
          english:
            'Versatile midfielder who links defense and attack in central areas',
          hebrew: 'קשר רב-תכליתי המקשר בין ההגנה וההתקפה באזורים מרכזיים',
        },
        positionType: PositionType.MIDFIELDER,
        tacticalRole: TacticalRole.CENTRAL_MIDFIELDER,
        requirements: {
          essential: {
            physicalAttributes: ['stamina', 'pace', 'agility'],
            technicalSkills: ['passing', 'ball_control', 'dribbling'],
            mentalQualities: ['vision', 'decision_making', 'work_rate'],
            tacticalAwareness: ['positioning', 'pressing', 'space_creation'],
          },
          preferred: {
            physicalAttributes: ['strength', 'jumping'],
            technicalSkills: ['shooting', 'crossing'],
            mentalQualities: ['leadership', 'composure'],
            tacticalAwareness: ['reading_game', 'counter_pressing'],
          },
          minimumRatings: {
            passing: 75,
            positioning: 70,
            stamina: 80,
            vision: 70,
          },
        },
        responsibilities: {
          primary: {
            english: ['Link play', 'Support attacks', 'Track back defensively'],
            hebrew: ['קישור משחק', 'תמיכה בהתקפות', 'חזרה הגנתית'],
          },
          secondary: {
            english: [
              'Create chances',
              'Win midfield battles',
              'Distribute ball',
            ],
            hebrew: ['יצירת הזדמנויות', 'זכייה בקרבות קו אמצע', 'חלוקת כדורים'],
          },
          situational: {
            attacking: {
              english: ['Late runs', 'Through balls', 'Support striker'],
              hebrew: ['ריצות מאוחרות', 'כדורי חדירה', 'תמיכה בחלוץ'],
            },
            defending: {
              english: ['Press opponents', 'Intercept passes', 'Cover defense'],
              hebrew: ['לחיצה על יריבים', 'יירוט מסירות', 'כיסוי ההגנה'],
            },
            transition: {
              english: ['Quick release', 'Switch play', 'Maintain tempo'],
              hebrew: ['שחרור מהיר', 'החלפת כיוון', 'שמירה על קצב'],
            },
            setPieces: {
              english: ['Take corners', 'Support attacks', 'Defend zonally'],
              hebrew: ['ביצוע קורנרים', 'תמיכה בהתקפות', 'הגנה אזורית'],
            },
          },
        },
        relationships: {
          teammates: [],
          coaches: [],
        },
        concepts: [
          'central_midfielder',
          'box_to_box',
          'link_play',
          'midfield_control',
        ],
        tags: ['position', 'midfield', 'versatile', 'engine'],
        createdAt: new Date(),
        lastUpdated: new Date(),
        version: '1.0',
        confidence: 1.0,
        verified: true,
        sources: ['Midfield Analysis', 'Position Study'],
      },
    ],
  ]);

  // Tactical roles database with detailed Hebrew descriptions
  private static readonly TACTICAL_ROLES_DATABASE = new Map<string, EntityData>(
    [
      // Advanced Tactical Roles
      [
        'false_nine',
        {
          id: 'false_nine',
          type: EntityType.TACTICAL_ROLE,
          name: 'False Nine',
          hebrewName: 'תשע כוזב',
          translations: [
            {
              language: 'he',
              name: 'תשע כוזב',
              shortName: 'ת9',
              nickname: 'התשע הנופל',
              description: 'חלוץ הנוסר לעומק ויוצר מרחב',
              pronunciation: 'te-sha ka-zav',
            },
          ],
          description: {
            english:
              'A striker who drops deep to create space and link play, confusing defenders',
            hebrew: 'חלוץ הנוסר לעומק כדי ליצור מרחב ולקשר משחק, ולבלבל מגנים',
          },
          tacticalRole: TacticalRole.FALSE_NINE,
          requirements: {
            essential: {
              physicalAttributes: ['agility', 'pace'],
              technicalSkills: ['ball_control', 'passing', 'dribbling'],
              mentalQualities: ['vision', 'intelligence', 'positioning'],
              tacticalAwareness: ['space_creation', 'link_play', 'movement'],
            },
            preferred: {
              physicalAttributes: ['stamina'],
              technicalSkills: ['shooting', 'first_touch'],
              mentalQualities: ['creativity', 'decision_making'],
              tacticalAwareness: ['pressing', 'counter_pressing'],
            },
            minimumRatings: {
              ball_control: 80,
              vision: 85,
              positioning: 80,
              passing: 75,
            },
          },
          responsibilities: {
            primary: {
              english: [
                'Drop deep to receive',
                'Create space for wingers',
                'Link midfield and attack',
              ],
              hebrew: [
                'נסיגה לעומק לקבלה',
                'יצירת מרחב לאגפים',
                'קישור קו אמצע והתקפה',
              ],
            },
            secondary: {
              english: [
                'Draw defenders out',
                'Support build-up',
                'Create overloads',
              ],
              hebrew: ['משיכת מגנים החוצה', 'תמיכה בבנייה', 'יצירת עומסים'],
            },
            situational: {
              attacking: {
                english: ['Drop to collect', 'Through balls', 'One-twos'],
                hebrew: ['נפילה לאיסוף', 'כדורי חדירה', 'אחד-שניים'],
              },
              defending: {
                english: [
                  'Press from front',
                  'Block passing lanes',
                  'Force errors',
                ],
                hebrew: ['לחיצה מלפנים', 'חסימת נתיבי מסירה', 'כפיית שגיאות'],
              },
              transition: {
                english: ['Quick link-up', 'Find space', 'Set tempo'],
                hebrew: ['קישור מהיר', 'מציאת מרחב', 'קביעת קצב'],
              },
              setPieces: {
                english: ['Short corners', 'Free kick link', 'Decoy runs'],
                hebrew: ['קורנרים קצרים', 'קישור בעיטות חופשיות', 'ריצות הסחה'],
              },
            },
          },
          relationships: {
            teammates: [],
            coaches: [],
          },
          concepts: [
            'false_nine',
            'space_creation',
            'link_play',
            'tactical_movement',
          ],
          tags: ['tactical_role', 'advanced', 'creative', 'movement'],
          createdAt: new Date(),
          lastUpdated: new Date(),
          version: '1.0',
          confidence: 1.0,
          verified: true,
          sources: ['Tactical Innovation', 'Modern Roles'],
        },
      ],

      [
        'inverted_winger',
        {
          id: 'inverted_winger',
          type: EntityType.TACTICAL_ROLE,
          name: 'Inverted Winger',
          hebrewName: 'אגף הפוך',
          translations: [
            {
              language: 'he',
              name: 'אגף הפוך',
              shortName: 'אה',
              nickname: 'האגף החותך',
              description: 'אגף הפועל על הרגל החזקה מהצד הנגדי',
              pronunciation: 'a-gaf ha-fu-kh',
            },
          ],
          description: {
            english:
              'Winger who plays on opposite flank to their strong foot, cutting inside to shoot or create',
            hebrew:
              'אגף הפועל בצד הנגדי לרגל החזקה שלו, חותך פנימה כדי לזרוק או ליצור',
          },
          tacticalRole: TacticalRole.INVERTED_WINGER,
          requirements: {
            essential: {
              physicalAttributes: ['pace', 'agility', 'acceleration'],
              technicalSkills: ['dribbling', 'shooting', 'cutting_inside'],
              mentalQualities: ['decision_making', 'creativity'],
              tacticalAwareness: ['space_recognition', 'timing', 'movement'],
            },
            preferred: {
              physicalAttributes: ['balance', 'strength'],
              technicalSkills: ['crossing', 'passing'],
              mentalQualities: ['composure', 'vision'],
              tacticalAwareness: ['pressing', 'tracking_back'],
            },
            minimumRatings: {
              dribbling: 80,
              pace: 75,
              shooting: 70,
              cutting_inside: 85,
            },
          },
          responsibilities: {
            primary: {
              english: [
                'Cut inside to shoot',
                'Create central overloads',
                'Stretch defense wide then narrow',
              ],
              hebrew: [
                'חיתוך פנימה לזריקה',
                'יצירת עומסים מרכזיים',
                'מתיחת ההגנה רחב ואז צר',
              ],
            },
            secondary: {
              english: ['Support striker', 'Create chances', 'Press from wide'],
              hebrew: ['תמיכה בחלוץ', 'יצירת הזדמנויות', 'לחיצה מהצד'],
            },
            situational: {
              attacking: {
                english: ['Diagonal runs', 'Shoot far post', 'Through balls'],
                hebrew: ['ריצות אלכסוניות', 'זריקה לעמוד רחוק', 'כדורי חדירה'],
              },
              defending: {
                english: ['Track full-back', 'Press trigger', 'Cover center'],
                hebrew: ['מעקב אחר בק', 'טריגר לחיצה', 'כיסוי מרכז'],
              },
              transition: {
                english: ['Quick cuts', 'Counter attack', 'Switch flanks'],
                hebrew: ['חיתוכים מהירים', 'התקפת נגד', 'החלפת אגפים'],
              },
              setPieces: {
                english: [
                  'Corner delivery',
                  'Free kick shots',
                  'Short combinations',
                ],
                hebrew: [
                  'הגשת קורנרים',
                  'זריקות בעיטות חופשיות',
                  'שילובים קצרים',
                ],
              },
            },
          },
          relationships: {
            teammates: [],
            coaches: [],
          },
          concepts: [
            'inverted_winger',
            'cutting_inside',
            'width_to_narrow',
            'goal_threat',
          ],
          tags: ['tactical_role', 'modern', 'goal_threat', 'creative'],
          createdAt: new Date(),
          lastUpdated: new Date(),
          version: '1.0',
          confidence: 1.0,
          verified: true,
          sources: ['Modern Wing Play', 'Tactical Evolution'],
        },
      ],
    ]
  );

  constructor(data: EntityData) {
    this.validateFootballEntity(data);
    this._data = Object.freeze({ ...data });
  }

  public static createPlayer(
    name: string,
    hebrewName: string,
    position: PositionType,
    tacticalRole: TacticalRole,
    attributes: Partial<EntityAttributes>,
    options?: {
      nationality?: string;
      dateOfBirth?: Date;
      club?: string;
      status?: PlayerStatus;
      translations?: EntityTranslation[];
      nickname?: string;
      hebrewNickname?: string;
    }
  ): FootballEntity {
    const id = name.toLowerCase().replace(/\s+/g, '_');

    return new FootballEntity({
      id,
      type: EntityType.PLAYER,
      name,
      hebrewName,
      translations: options?.translations || [],
      nickname: options?.nickname,
      hebrewNickname: options?.hebrewNickname,
      description: {
        english: `${position} playing as ${tacticalRole}`,
        hebrew: `${position} המשחק כ${tacticalRole}`,
      },
      positionType: position,
      tacticalRole,
      status: options?.status || PlayerStatus.ACTIVE,
      attributes,
      relationships: {
        club: options?.club,
      },
      concepts: [],
      tags: ['player', position.toLowerCase(), tacticalRole.toLowerCase()],
      nationality: options?.nationality,
      dateOfBirth: options?.dateOfBirth,
      createdAt: new Date(),
      lastUpdated: new Date(),
      version: '1.0',
      confidence: 0.8,
      verified: false,
      sources: [],
    });
  }

  public static createTeam(
    name: string,
    hebrewName: string,
    formation: string,
    options?: {
      shortName?: string;
      nickname?: string;
      hebrewNickname?: string;
      location?: EntityData['location'];
      league?: string;
      venue?: string;
      dateOfFormation?: Date;
      status?: TeamStatus;
    }
  ): FootballEntity {
    const id = name.toLowerCase().replace(/\s+/g, '_');

    return new FootballEntity({
      id,
      type: EntityType.TEAM,
      name,
      hebrewName,
      translations: [],
      shortName: options?.shortName,
      nickname: options?.nickname,
      hebrewNickname: options?.hebrewNickname,
      description: {
        english: `Football team playing in ${formation} formation`,
        hebrew: `קבוצת כדורגל המשחקת במערך ${formation}`,
      },
      status: options?.status || TeamStatus.ACTIVE,
      relationships: {
        league: options?.league,
        venue: options?.venue,
      },
      concepts: [formation.replace(/-/g, '_')],
      tags: ['team', 'club', formation.replace(/-/g, '_')],
      location: options?.location,
      dateOfFormation: options?.dateOfFormation,
      createdAt: new Date(),
      lastUpdated: new Date(),
      version: '1.0',
      confidence: 0.8,
      verified: false,
      sources: [],
    });
  }

  public static fromPosition(positionId: string): FootballEntity | null {
    const data = this.POSITION_DATABASE.get(positionId);
    return data ? new FootballEntity(data) : null;
  }

  public static fromTacticalRole(roleId: string): FootballEntity | null {
    const data = this.TACTICAL_ROLES_DATABASE.get(roleId);
    return data ? new FootballEntity(data) : null;
  }

  public static getPositionsByType(
    positionType: PositionType
  ): FootballEntity[] {
    const positions: FootballEntity[] = [];

    for (const [_, data] of this.POSITION_DATABASE) {
      if (data.positionType === positionType) {
        positions.push(new FootballEntity(data));
      }
    }

    return positions;
  }

  public static getTacticalRolesByPosition(
    positionType: PositionType
  ): FootballEntity[] {
    const roles: FootballEntity[] = [];

    // Get roles that are appropriate for this position type
    for (const [_, data] of this.TACTICAL_ROLES_DATABASE) {
      const rolePosition = this.getRolePositionType(data.tacticalRole!);
      if (rolePosition === positionType) {
        roles.push(new FootballEntity(data));
      }
    }

    return roles;
  }

  private static getRolePositionType(role: TacticalRole): PositionType {
    // Goalkeeper roles
    if (
      [
        TacticalRole.SWEEPER_KEEPER,
        TacticalRole.SHOT_STOPPER,
        TacticalRole.DISTRIBUTION_KEEPER,
      ].includes(role)
    ) {
      return PositionType.GOALKEEPER;
    }

    // Defender roles
    if (
      [
        TacticalRole.CENTRE_BACK,
        TacticalRole.BALL_PLAYING_DEFENDER,
        TacticalRole.STOPPER,
        TacticalRole.COVERING_DEFENDER,
        TacticalRole.FULL_BACK,
        TacticalRole.ATTACKING_FULL_BACK,
        TacticalRole.DEFENSIVE_FULL_BACK,
      ].includes(role)
    ) {
      return PositionType.DEFENDER;
    }

    // Wing-back roles
    if ([TacticalRole.WING_BACK_ROLE].includes(role)) {
      return PositionType.WING_BACK;
    }

    // Midfielder roles
    if (
      [
        TacticalRole.DEFENSIVE_MIDFIELDER,
        TacticalRole.HOLDING_MIDFIELDER,
        TacticalRole.BOX_TO_BOX,
        TacticalRole.CENTRAL_MIDFIELDER,
        TacticalRole.ATTACKING_MIDFIELDER,
        TacticalRole.PLAYMAKER,
        TacticalRole.DEEP_PLAYMAKER,
        TacticalRole.WIDE_MIDFIELDER,
        TacticalRole.WINGER,
        TacticalRole.INVERTED_WINGER,
      ].includes(role)
    ) {
      return PositionType.MIDFIELDER;
    }

    // Forward roles
    return PositionType.FORWARD;
  }

  public static searchEntities(
    query: string,
    options?: {
      type?: EntityType;
      language?: 'en' | 'he';
      includeAliases?: boolean;
      limit?: number;
    }
  ): FootballEntity[] {
    const results: Array<{ entity: FootballEntity; score: number }> = [];
    const normalizedQuery = query.toLowerCase().trim();
    const language = options?.language || 'en';

    // Search positions
    for (const [_, data] of this.POSITION_DATABASE) {
      if (options?.type && data.type !== options.type) continue;

      let score = 0;

      if (language === 'en') {
        if (data.name.toLowerCase().includes(normalizedQuery)) {
          score += data.name.toLowerCase() === normalizedQuery ? 1.0 : 0.8;
        }
        if (data.shortName?.toLowerCase().includes(normalizedQuery)) {
          score += 0.7;
        }
      } else {
        if (data.hebrewName.includes(query.trim())) {
          score += data.hebrewName === query.trim() ? 1.0 : 0.8;
        }
      }

      if (score > 0) {
        results.push({ entity: new FootballEntity(data), score });
      }
    }

    // Search tactical roles
    for (const [_, data] of this.TACTICAL_ROLES_DATABASE) {
      if (options?.type && data.type !== options.type) continue;

      let score = 0;

      if (language === 'en') {
        if (data.name.toLowerCase().includes(normalizedQuery)) {
          score += data.name.toLowerCase() === normalizedQuery ? 1.0 : 0.8;
        }
      } else {
        if (data.hebrewName.includes(query.trim())) {
          score += data.hebrewName === query.trim() ? 1.0 : 0.8;
        }
      }

      if (score > 0) {
        results.push({ entity: new FootballEntity(data), score });
      }
    }

    results.sort((a, b) => b.score - a.score);

    const limit = options?.limit || 10;
    return results.slice(0, limit).map(r => r.entity);
  }

  public static getPlayerCompatibility(
    playerAttributes: EntityAttributes,
    positionRequirements: PositionRequirements
  ): {
    overall: number;
    physical: number;
    technical: number;
    mental: number;
    tactical: number;
    missing: string[];
    strengths: string[];
  } {
    const scores = { physical: 0, technical: 0, mental: 0, tactical: 0 };
    const missing: string[] = [];
    const strengths: string[] = [];

    // Check minimum requirements
    Object.entries(positionRequirements.minimumRatings).forEach(
      ([attr, minRating]) => {
        const playerRating = this.getAttributeValue(playerAttributes, attr);
        if (playerRating < minRating) {
          missing.push(attr);
        } else if (playerRating > minRating + 15) {
          strengths.push(attr);
        }
      }
    );

    // Calculate category scores
    const categories = ['physical', 'technical', 'mental', 'tactical'] as const;

    categories.forEach(category => {
      const attrs = playerAttributes[category];
      if (attrs) {
        const values = Object.values(attrs).filter(
          v => v !== undefined
        ) as number[];
        scores[category] =
          values.length > 0
            ? values.reduce((sum, val) => sum + val, 0) / values.length
            : 0;
      }
    });

    const overall =
      (scores.physical + scores.technical + scores.mental + scores.tactical) /
      4;

    return {
      overall,
      ...scores,
      missing,
      strengths,
    };
  }

  private static getAttributeValue(
    attributes: EntityAttributes,
    attributeName: string
  ): number {
    // Search through all attribute categories
    for (const category of [
      'physical',
      'technical',
      'mental',
      'tactical',
    ] as const) {
      const categoryAttrs = attributes[category] as any;
      if (categoryAttrs && categoryAttrs[attributeName] !== undefined) {
        return categoryAttrs[attributeName];
      }
    }
    return 0;
  }

  private validateFootballEntity(data: EntityData): void {
    if (!data.id?.trim()) {
      throw new Error('Entity ID is required');
    }

    if (!data.name?.trim()) {
      throw new Error('Entity name is required');
    }

    if (!data.hebrewName?.trim()) {
      throw new Error('Hebrew name is required');
    }

    if (!data.type) {
      throw new Error('Entity type is required');
    }

    if (!data.description?.english?.trim()) {
      throw new Error('English description is required');
    }

    if (!data.description?.hebrew?.trim()) {
      throw new Error('Hebrew description is required');
    }

    if (data.confidence < 0 || data.confidence > 1) {
      throw new Error('Confidence must be between 0 and 1');
    }

    // Validate attributes if present
    if (data.attributes) {
      const categories = [
        'physical',
        'technical',
        'mental',
        'tactical',
      ] as const;
      categories.forEach(category => {
        const attrs = data.attributes![category] as any;
        if (attrs) {
          Object.entries(attrs).forEach(([key, value]) => {
            if (typeof value === 'number' && (value < 0 || value > 100)) {
              throw new Error(
                `${category}.${key}: Value must be between 0 and 100`
              );
            }
          });
        }
      });
    }
  }

  // Getters
  get id(): string {
    return this._data.id;
  }

  get type(): EntityType {
    return this._data.type;
  }

  get name(): string {
    return this._data.name;
  }

  get hebrewName(): string {
    return this._data.hebrewName;
  }

  get translations(): EntityTranslation[] {
    return [...this._data.translations];
  }

  get shortName(): string | undefined {
    return this._data.shortName;
  }

  get nickname(): string | undefined {
    return this._data.nickname;
  }

  get hebrewNickname(): string | undefined {
    return this._data.hebrewNickname;
  }

  get description(): EntityData['description'] {
    return { ...this._data.description };
  }

  get positionType(): PositionType | undefined {
    return this._data.positionType;
  }

  get tacticalRole(): TacticalRole | undefined {
    return this._data.tacticalRole;
  }

  get status(): PlayerStatus | TeamStatus | undefined {
    return this._data.status;
  }

  get attributes(): EntityAttributes | undefined {
    return this._data.attributes ? { ...this._data.attributes } : undefined;
  }

  get requirements(): PositionRequirements | undefined {
    return this._data.requirements ? { ...this._data.requirements } : undefined;
  }

  get responsibilities(): RoleResponsibilities | undefined {
    return this._data.responsibilities
      ? { ...this._data.responsibilities }
      : undefined;
  }

  get relationships(): EntityRelationships {
    return { ...this._data.relationships };
  }

  get concepts(): string[] {
    return [...this._data.concepts];
  }

  get metrics(): EntityMetrics | undefined {
    return this._data.metrics ? { ...this._data.metrics } : undefined;
  }

  get tags(): string[] {
    return [...this._data.tags];
  }

  get nationality(): string | undefined {
    return this._data.nationality;
  }

  get dateOfBirth(): Date | undefined {
    return this._data.dateOfBirth;
  }

  get dateOfFormation(): Date | undefined {
    return this._data.dateOfFormation;
  }

  get location(): EntityData['location'] | undefined {
    return this._data.location ? { ...this._data.location } : undefined;
  }

  get confidence(): number {
    return this._data.confidence;
  }

  get verified(): boolean {
    return this._data.verified;
  }

  get sources(): string[] {
    return [...this._data.sources];
  }

  get createdAt(): Date {
    return this._data.createdAt;
  }

  get lastUpdated(): Date {
    return this._data.lastUpdated;
  }

  // Derived properties
  get isPlayer(): boolean {
    return this._data.type === EntityType.PLAYER;
  }

  get isTeam(): boolean {
    return this._data.type === EntityType.TEAM;
  }

  get isPosition(): boolean {
    return this._data.type === EntityType.POSITION;
  }

  get isTacticalRole(): boolean {
    return this._data.type === EntityType.TACTICAL_ROLE;
  }

  get isActive(): boolean {
    return (
      this._data.status === PlayerStatus.ACTIVE ||
      this._data.status === TeamStatus.ACTIVE
    );
  }

  get isDefensiveRole(): boolean {
    return (
      this._data.positionType === PositionType.GOALKEEPER ||
      this._data.positionType === PositionType.DEFENDER
    );
  }

  get isAttackingRole(): boolean {
    return (
      this._data.positionType === PositionType.FORWARD ||
      [
        TacticalRole.ATTACKING_MIDFIELDER,
        TacticalRole.ATTACKING_FULL_BACK,
        TacticalRole.WINGER,
        TacticalRole.INVERTED_WINGER,
      ].includes(this._data.tacticalRole!)
    );
  }

  get overallRating(): number {
    if (!this._data.attributes) return 0;

    const categories = ['physical', 'technical', 'mental', 'tactical'] as const;
    let totalScore = 0;
    let totalCount = 0;

    categories.forEach(category => {
      const attrs = this._data.attributes![category] as any;
      if (attrs) {
        const values = Object.values(attrs).filter(
          v => v !== undefined
        ) as number[];
        totalScore += values.reduce((sum, val) => sum + val, 0);
        totalCount += values.length;
      }
    });

    return totalCount > 0 ? totalScore / totalCount : 0;
  }

  // Methods
  public hasTag(tag: string): boolean {
    return this._data.tags.includes(tag.toLowerCase());
  }

  public hasRelationshipWith(entityId: string): boolean {
    return Object.values(this._data.relationships).some(rel =>
      Array.isArray(rel) ? rel.includes(entityId) : rel === entityId
    );
  }

  public isCompatibleWith(positionRequirements: PositionRequirements): boolean {
    if (!this._data.attributes) return false;

    const compatibility = FootballEntity.getPlayerCompatibility(
      this._data.attributes,
      positionRequirements
    );
    return compatibility.overall > 70 && compatibility.missing.length === 0;
  }

  public getStrengthsForPosition(
    positionRequirements: PositionRequirements
  ): string[] {
    if (!this._data.attributes) return [];

    const compatibility = FootballEntity.getPlayerCompatibility(
      this._data.attributes,
      positionRequirements
    );
    return compatibility.strengths;
  }

  public getWeaknessesForPosition(
    positionRequirements: PositionRequirements
  ): string[] {
    if (!this._data.attributes) return [];

    const compatibility = FootballEntity.getPlayerCompatibility(
      this._data.attributes,
      positionRequirements
    );
    return compatibility.missing;
  }

  public getRelatedConcepts(): string[] {
    return this._data.concepts;
  }

  public getAge(): number | undefined {
    if (!this._data.dateOfBirth) return undefined;

    const today = new Date();
    const birthDate = new Date(this._data.dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();

    if (
      monthDiff < 0 ||
      (monthDiff === 0 && today.getDate() < birthDate.getDate())
    ) {
      age--;
    }

    return age;
  }

  public getYearsActive(): number | undefined {
    const startDate = this._data.dateOfFormation || this._data.dateOfBirth;
    if (!startDate) return undefined;

    const today = new Date();
    return today.getFullYear() - startDate.getFullYear();
  }

  public withUpdatedAttributes(
    attributes: Partial<EntityAttributes>
  ): FootballEntity {
    const updatedAttributes = this._data.attributes
      ? { ...this._data.attributes, ...attributes }
      : attributes;

    return new FootballEntity({
      ...this._data,
      attributes: updatedAttributes as EntityAttributes,
      lastUpdated: new Date(),
    });
  }

  public withUpdatedStatus(status: PlayerStatus | TeamStatus): FootballEntity {
    return new FootballEntity({
      ...this._data,
      status,
      lastUpdated: new Date(),
    });
  }

  public withAddedRelationship(
    relationshipType: keyof EntityRelationships,
    entityId: string
  ): FootballEntity {
    const currentRel = this._data.relationships[relationshipType];
    let updatedRel;

    if (Array.isArray(currentRel)) {
      updatedRel = [...currentRel, entityId];
    } else {
      updatedRel = entityId;
    }

    return new FootballEntity({
      ...this._data,
      relationships: {
        ...this._data.relationships,
        [relationshipType]: updatedRel,
      },
      lastUpdated: new Date(),
    });
  }

  public withUpdatedMetrics(metrics: Partial<EntityMetrics>): FootballEntity {
    const updatedMetrics = this._data.metrics
      ? { ...this._data.metrics, ...metrics }
      : metrics;

    return new FootballEntity({
      ...this._data,
      metrics: updatedMetrics as EntityMetrics,
      lastUpdated: new Date(),
    });
  }

  public equals(other: FootballEntity): boolean {
    return (
      this._data.id === other._data.id &&
      this._data.version === other._data.version
    );
  }

  public toJSON(): EntityData {
    return { ...this._data };
  }

  public toString(): string {
    return `FootballEntity(${this._data.type}: "${this._data.name}" / "${this._data.hebrewName}")`;
  }

  public toHebrewString(): string {
    const typeTranslations = {
      [EntityType.PLAYER]: 'שחקן',
      [EntityType.TEAM]: 'קבוצה',
      [EntityType.POSITION]: 'עמדה',
      [EntityType.TACTICAL_ROLE]: 'תפקיד טקטי',
      [EntityType.COACH]: 'מאמן',
      [EntityType.REFEREE]: 'שופט',
      [EntityType.MATCH]: 'משחק',
      [EntityType.COMPETITION]: 'תחרות',
      [EntityType.VENUE]: 'מתקן',
      [EntityType.CLUB]: 'מועדון',
    };

    return `ישות כדורגל (${typeTranslations[this._data.type]}: ${
      this._data.hebrewName
    })`;
  }
}
