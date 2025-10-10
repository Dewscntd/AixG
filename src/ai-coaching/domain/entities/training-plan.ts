import { Entity } from '../../../shared/domain/base/aggregate-root';

export interface TrainingDrill {
  id: string;
  name: string;
  hebrewName: string;
  description: string;
  hebrewDescription: string;
  duration: number; // minutes
  intensity: 'low' | 'medium' | 'high';
  focus: 'technical' | 'tactical' | 'physical' | 'mental';
  equipment?: string[];
}

export interface TrainingSession {
  id: string;
  date: Date;
  duration: number; // minutes
  objectives: string[];
  hebrewObjectives: string[];
  drills: TrainingDrill[];
  notes?: string;
  hebrewNotes?: string;
}

export class TrainingPlan extends Entity {
  constructor(
    id: string,
    public readonly playerId: string,
    public readonly coachId: string,
    public readonly title: string,
    public readonly hebrewTitle: string,
    public readonly description: string,
    public readonly hebrewDescription: string,
    public readonly sessions: TrainingSession[],
    public readonly startDate: Date,
    public readonly endDate: Date,
    public readonly goals: string[],
    public readonly hebrewGoals: string[],
    public readonly focusAreas: string[],
    public readonly durationWeeks: number,
    public readonly createdAt: Date = new Date(),
    public readonly updatedAt: Date = new Date()
  ) {
    super(id);
  }

  static create(
    playerIdOrPlayerId: any,
    coachIdOrAnalysisScope?: any,
    titleOrCoachingStyle?: any,
    hebrewTitleOrLanguage?: any,
    description?: string,
    hebrewDescription?: string,
    goals?: string[],
    hebrewGoals?: string[]
  ): TrainingPlan {
    const id = `training-plan-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const startDate = new Date();
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + 1); // 1 month plan by default

    // Handle the coaching session signature: create(playerId, analysisScope, coachingStyle, language)
    if (typeof coachIdOrAnalysisScope === 'object' && titleOrCoachingStyle && hebrewTitleOrLanguage) {
      return new TrainingPlan(
        id,
        typeof playerIdOrPlayerId === 'object' ? playerIdOrPlayerId.value : playerIdOrPlayerId,
        'unknown-coach',
        'Player Development Plan',
        'תוכנית פיתוח שחקן',
        'Customized training plan based on analysis',
        'תוכנית אימון מותאמת אישית על בסיס ניתוח',
        [],
        startDate,
        endDate,
        ['Improve performance', 'Develop skills'],
        ['שיפור ביצועים', 'פיתוח כישורים'],
        ['technical', 'tactical'],
        4
      );
    }

    // Original signature
    return new TrainingPlan(
      id,
      playerIdOrPlayerId,
      coachIdOrAnalysisScope || 'unknown-coach',
      titleOrCoachingStyle || 'Training Plan',
      hebrewTitleOrLanguage || 'תוכנית אימון',
      description || 'Training plan description',
      hebrewDescription || 'תיאור תוכנית האימון',
      [],
      startDate,
      endDate,
      goals || ['Improve performance'],
      hebrewGoals || ['שיפור ביצועים'],
      ['general'],
      4
    );
  }

  addSession(session: TrainingSession): void {
    this.sessions.push(session);
  }

  removeSession(sessionId: string): void {
    const index = this.sessions.findIndex(session => session.id === sessionId);
    if (index !== -1) {
      this.sessions.splice(index, 1);
    }
  }

  getSessionsForWeek(weekStart: Date): TrainingSession[] {
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);

    return this.sessions.filter(session => 
      session.date >= weekStart && session.date < weekEnd
    );
  }

  getTotalTrainingTime(): number {
    return this.sessions.reduce((total, session) => total + session.duration, 0);
  }

  getProgress(): number {
    const totalSessions = this.sessions.length;
    const completedSessions = this.sessions.filter(session => 
      session.date < new Date()
    ).length;

    return totalSessions > 0 ? (completedSessions / totalSessions) * 100 : 0;
  }
}