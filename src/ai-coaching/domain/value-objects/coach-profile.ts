/**
 * Coach Profile Value Object
 * Represents coaching preferences, expertise, and style for personalized AI coaching
 */

export enum CoachingStyle {
  ATTACKING = 'attacking',
  DEFENSIVE = 'defensive',
  POSSESSION_BASED = 'possession_based',
  COUNTER_ATTACKING = 'counter_attacking',
  HIGH_PRESSING = 'high_pressing',
  TACTICAL_FLEXIBILITY = 'tactical_flexibility',
  YOUTH_DEVELOPMENT = 'youth_development',
  MOTIVATIONAL = 'motivational',
}

export enum ExpertiseLevel {
  BEGINNER = 'beginner',
  INTERMEDIATE = 'intermediate',
  ADVANCED = 'advanced',
  EXPERT = 'expert',
  PROFESSIONAL = 'professional',
}

export enum LanguagePreference {
  HEBREW = 'he',
  ENGLISH = 'en',
  ARABIC = 'ar',
  RUSSIAN = 'ru',
  SPANISH = 'es',
  FRENCH = 'fr',
}

export enum CommunicationTone {
  SUPPORTIVE = 'supportive',
  DIRECT = 'direct',
  ANALYTICAL = 'analytical',
  MOTIVATIONAL = 'motivational',
  INSTRUCTIONAL = 'instructional',
  ENCOURAGING = 'encouraging',
}

export enum FocusArea {
  TECHNICAL_SKILLS = 'technical_skills',
  TACTICAL_AWARENESS = 'tactical_awareness',
  PHYSICAL_FITNESS = 'physical_fitness',
  MENTAL_PREPARATION = 'mental_preparation',
  TEAM_COORDINATION = 'team_coordination',
  INDIVIDUAL_DEVELOPMENT = 'individual_development',
  MATCH_ANALYSIS = 'match_analysis',
  SET_PIECES = 'set_pieces',
}

export interface CoachingCertification {
  organization: string;
  level: string;
  issueDate: Date;
  expiryDate?: Date;
  certificateNumber?: string;
}

export interface CoachExperience {
  teamName: string;
  role: 'head_coach' | 'assistant_coach' | 'youth_coach' | 'specialist_coach';
  startDate: Date;
  endDate?: Date;
  achievements?: string[];
  teamLevel:
    | 'youth'
    | 'amateur'
    | 'semi_professional'
    | 'professional'
    | 'international';
}

export interface CoachingPreferences {
  communicationTone: CommunicationTone;
  primaryLanguage: LanguagePreference;
  secondaryLanguages: LanguagePreference[];
  detailLevel: 'brief' | 'moderate' | 'detailed' | 'comprehensive';
  feedbackFrequency: 'real_time' | 'periodic' | 'post_match' | 'weekly';
  analysisDepth: 'surface' | 'moderate' | 'deep' | 'comprehensive';
  includeStatistics: boolean;
  includeVideoReferences: boolean;
  includeHistoricalComparisons: boolean;
  prioritizePracticalAdvice: boolean;
}

export interface CoachProfileData {
  coachId: string;
  name: string;
  email: string;
  dateOfBirth?: Date;
  nationality?: string;
  primaryStyle: CoachingStyle;
  secondaryStyles: CoachingStyle[];
  expertiseLevel: ExpertiseLevel;
  focusAreas: FocusArea[];
  certifications: CoachingCertification[];
  experience: CoachExperience[];
  preferences: CoachingPreferences;
  specializations: string[];
  currentTeamId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export class CoachProfile {
  private readonly _data: CoachProfileData;

  constructor(data: CoachProfileData) {
    this.validateCoachProfile(data);
    this._data = Object.freeze({ ...data });
  }

  private validateCoachProfile(data: CoachProfileData): void {
    if (!data.coachId?.trim()) {
      throw new Error('Coach ID is required');
    }

    if (!data.name?.trim()) {
      throw new Error('Coach name is required');
    }

    if (data.name.length < 2 || data.name.length > 100) {
      throw new Error('Coach name must be between 2 and 100 characters');
    }

    if (!data.email?.trim()) {
      throw new Error('Coach email is required');
    }

    if (!this.isValidEmail(data.email)) {
      throw new Error('Coach email must be valid');
    }

    if (!data.primaryStyle) {
      throw new Error('Primary coaching style is required');
    }

    if (!data.expertiseLevel) {
      throw new Error('Expertise level is required');
    }

    if (!data.focusAreas || data.focusAreas.length === 0) {
      throw new Error('At least one focus area is required');
    }

    if (data.focusAreas.length > 5) {
      throw new Error('Maximum 5 focus areas allowed');
    }

    if (!data.preferences) {
      throw new Error('Coaching preferences are required');
    }

    if (data.dateOfBirth && data.dateOfBirth > new Date()) {
      throw new Error('Date of birth cannot be in the future');
    }

    // Validate experience dates
    data.experience.forEach((exp, index) => {
      if (exp.endDate && exp.endDate < exp.startDate) {
        throw new Error(
          `Experience ${index + 1}: End date cannot be before start date`
        );
      }
    });

    // Validate certifications
    data.certifications.forEach((cert, index) => {
      if (cert.expiryDate && cert.expiryDate < cert.issueDate) {
        throw new Error(
          `Certification ${index + 1}: Expiry date cannot be before issue date`
        );
      }
    });
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  // Getters
  get coachId(): string {
    return this._data.coachId;
  }

  get name(): string {
    return this._data.name;
  }

  get email(): string {
    return this._data.email;
  }

  get dateOfBirth(): Date | undefined {
    return this._data.dateOfBirth;
  }

  get nationality(): string | undefined {
    return this._data.nationality;
  }

  get primaryStyle(): CoachingStyle {
    return this._data.primaryStyle;
  }

  get secondaryStyles(): CoachingStyle[] {
    return [...this._data.secondaryStyles];
  }

  get expertiseLevel(): ExpertiseLevel {
    return this._data.expertiseLevel;
  }

  get focusAreas(): FocusArea[] {
    return [...this._data.focusAreas];
  }

  get certifications(): CoachingCertification[] {
    return [...this._data.certifications];
  }

  get experience(): CoachExperience[] {
    return [...this._data.experience];
  }

  get preferences(): CoachingPreferences {
    return { ...this._data.preferences };
  }

  get specializations(): string[] {
    return [...this._data.specializations];
  }

  get currentTeamId(): string | undefined {
    return this._data.currentTeamId;
  }

  get createdAt(): Date {
    return this._data.createdAt;
  }

  get updatedAt(): Date {
    return this._data.updatedAt;
  }

  // Derived properties
  get age(): number | undefined {
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

  get totalExperienceYears(): number {
    return this._data.experience.reduce((total, exp) => {
      const startYear = exp.startDate.getFullYear();
      const endYear = exp.endDate
        ? exp.endDate.getFullYear()
        : new Date().getFullYear();
      return total + (endYear - startYear);
    }, 0);
  }

  get activeCertifications(): CoachingCertification[] {
    const now = new Date();
    return this._data.certifications.filter(
      cert => !cert.expiryDate || cert.expiryDate > now
    );
  }

  get isExperiencedCoach(): boolean {
    return (
      this.totalExperienceYears >= 5 ||
      this._data.expertiseLevel === ExpertiseLevel.EXPERT ||
      this._data.expertiseLevel === ExpertiseLevel.PROFESSIONAL
    );
  }

  get prefersHebrewCommunication(): boolean {
    return this._data.preferences.primaryLanguage === LanguagePreference.HEBREW;
  }

  get isMultilingual(): boolean {
    return this._data.preferences.secondaryLanguages.length > 0;
  }

  // Methods
  public hasExpertiseIn(area: FocusArea): boolean {
    return this._data.focusAreas.includes(area);
  }

  public hasCoachingStyle(style: CoachingStyle): boolean {
    return (
      this._data.primaryStyle === style ||
      this._data.secondaryStyles.includes(style)
    );
  }

  public hasCertificationFrom(organization: string): boolean {
    return this._data.certifications.some(cert =>
      cert.organization.toLowerCase().includes(organization.toLowerCase())
    );
  }

  public hasExperienceAt(level: CoachExperience['teamLevel']): boolean {
    return this._data.experience.some(exp => exp.teamLevel === level);
  }

  public speaksLanguage(language: LanguagePreference): boolean {
    return (
      this._data.preferences.primaryLanguage === language ||
      this._data.preferences.secondaryLanguages.includes(language)
    );
  }

  public getRecommendedAnalysisStyle(): string {
    const styles: string[] = [];

    if (this._data.preferences.detailLevel === 'comprehensive') {
      styles.push('detailed');
    }

    if (this._data.preferences.includeStatistics) {
      styles.push('data-driven');
    }

    if (this._data.preferences.prioritizePracticalAdvice) {
      styles.push('practical');
    }

    if (this.hasExpertiseIn(FocusArea.TACTICAL_AWARENESS)) {
      styles.push('tactical');
    }

    if (this.hasExpertiseIn(FocusArea.TECHNICAL_SKILLS)) {
      styles.push('technical');
    }

    return styles.join(', ') || 'balanced';
  }

  public getPersonalizedGreeting(): string {
    const language = this._data.preferences.primaryLanguage;
    const name = this._data.name.split(' ')[0]; // First name

    switch (language) {
      case LanguagePreference.HEBREW:
        return `שלום ${name}, איך אפשר לעזור לך היום?`;
      case LanguagePreference.ARABIC:
        return `مرحبا ${name}، كيف يمكنني مساعدتك اليوم؟`;
      case LanguagePreference.SPANISH:
        return `Hola ${name}, ¿cómo puedo ayudarte hoy?`;
      case LanguagePreference.FRENCH:
        return `Bonjour ${name}, comment puis-je vous aider aujourd'hui?`;
      case LanguagePreference.RUSSIAN:
        return `Привет ${name}, как я могу помочь вам сегодня?`;
      default:
        return `Hello ${name}, how can I help you today?`;
    }
  }

  public withUpdatedPreferences(
    preferences: Partial<CoachingPreferences>
  ): CoachProfile {
    return new CoachProfile({
      ...this._data,
      preferences: { ...this._data.preferences, ...preferences },
      updatedAt: new Date(),
    });
  }

  public withCurrentTeam(teamId: string): CoachProfile {
    return new CoachProfile({
      ...this._data,
      currentTeamId: teamId,
      updatedAt: new Date(),
    });
  }

  public withAddedExperience(experience: CoachExperience): CoachProfile {
    return new CoachProfile({
      ...this._data,
      experience: [...this._data.experience, experience],
      updatedAt: new Date(),
    });
  }

  public withAddedCertification(
    certification: CoachingCertification
  ): CoachProfile {
    return new CoachProfile({
      ...this._data,
      certifications: [...this._data.certifications, certification],
      updatedAt: new Date(),
    });
  }

  public equals(other: CoachProfile): boolean {
    return this._data.coachId === other._data.coachId;
  }

  public toJSON(): CoachProfileData {
    return { ...this._data };
  }

  public toString(): string {
    return `CoachProfile(${this._data.name} - ${this._data.primaryStyle} - ${this._data.expertiseLevel})`;
  }
}
