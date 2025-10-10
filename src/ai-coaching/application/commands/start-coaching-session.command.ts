
export class StartCoachingSessionCommand {
  constructor(
    public readonly userId: string,
    public readonly query: string,
    public readonly language: 'he' | 'en' | 'mixed' | 'auto',
    public readonly taskType: any,
    public readonly context: any,
    public readonly preferences: any,
  ) {}
}
