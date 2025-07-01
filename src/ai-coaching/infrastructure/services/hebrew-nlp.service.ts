import { Injectable } from '@nestjs/common';
import { TacticalQueryAnalysis } from '../../domain/value-objects/tactical-query-analysis';
import { TacticalAnalysis } from '../../domain/entities/tactical-analysis';
import { CoachProfile } from '../../domain/value-objects/coach-profile';
import { FootballConcept, ConceptType } from '../../domain/value-objects/football-concept';
import { FootballEntity } from '../../domain/value-objects/football-entity';
import { HebrewMorphology } from '../../domain/value-objects/hebrew-morphology';
import { TacticalIntent } from '../../domain/value-objects/tactical-intent';

/**
 * Hebrew NLP Service for AI Coaching Assistant
 * 
 * Provides Hebrew-native tactical intelligence with football-specific
 * terminology recognition and morphological analysis.
 * 
 * Implements composition over inheritance with pure functions where possible.
 */
@Injectable()
export class HebrewNLPService {
  private readonly hebrewTerms = new Map<string, FootballConcept>([
    // Tactical Phases
    ['הגנה', new FootballConcept('defense', ConceptType.TACTICAL_PHASE)],
    ['התקפה', new FootballConcept('attack', ConceptType.TACTICAL_PHASE)],
    ['מעבר', new FootballConcept('transition', ConceptType.TACTICAL_PHASE)],
    ['לחיצה', new FootballConcept('pressing', ConceptType.TACTICAL_PHASE)],
    
    // Actions
    ['מסירה', new FootballConcept('pass', ConceptType.ACTION)],
    ['כיבוש', new FootballConcept('possession', ConceptType.ACTION)],
    ['שער', new FootballConcept('goal', ConceptType.ACTION)],
    ['בעיטה', new FootballConcept('shot', ConceptType.ACTION)],
    ['חתירה', new FootballConcept('dribble', ConceptType.ACTION)],
    ['יירוט', new FootballConcept('interception', ConceptType.ACTION)],
    
    // Tactical Setup
    ['מערך', new FootballConcept('formation', ConceptType.TACTICAL_SETUP)],
    ['מיקום', new FootballConcept('position', ConceptType.TACTICAL_SETUP)],
    ['קו', new FootballConcept('line', ConceptType.TACTICAL_SETUP)],
    ['אגף', new FootballConcept('wing', ConceptType.TACTICAL_SETUP)],
    ['מרכז', new FootballConcept('center', ConceptType.TACTICAL_SETUP)],
    
    // Player Positions (Hebrew)
    ['שוער', new FootballConcept('goalkeeper', ConceptType.PLAYER_POSITION)],
    ['מגן', new FootballConcept('defender', ConceptType.PLAYER_POSITION)],
    ['קשר', new FootballConcept('midfielder', ConceptType.PLAYER_POSITION)],
    ['תוקף', new FootballConcept('forward', ConceptType.PLAYER_POSITION)],
    ['קשר הגנתי', new FootballConcept('defensive_midfielder', ConceptType.PLAYER_POSITION)],
    ['קשר התקפי', new FootballConcept('attacking_midfielder', ConceptType.PLAYER_POSITION)],
    
    // Play Styles
    ['כדור גובה', new FootballConcept('high_ball', ConceptType.PLAY_STYLE)],
    ['משחק קצר', new FootballConcept('short_passing', ConceptType.PLAY_STYLE)],
    ['משחק נגדי', new FootballConcept('counter_attack', ConceptType.PLAY_STYLE)],
    ['לחיצה גבוהה', new FootballConcept('high_pressing', ConceptType.PLAY_STYLE)],
    ['בלוק נמוך', new FootballConcept('low_block', ConceptType.PLAY_STYLE)],
    
    // Metrics and Analytics
    ['סטטיסטיקה', new FootballConcept('statistics', ConceptType.METRIC)],
    ['דיוק מסירות', new FootballConcept('pass_accuracy', ConceptType.METRIC)],
    ['אחוז החזקה', new FootballConcept('possession_percentage', ConceptType.METRIC)],
    ['בעיטות למטרה', new FootballConcept('shots_on_target', ConceptType.METRIC)],
    ['מרחק ריצה', new FootballConcept('distance_covered', ConceptType.METRIC)],
    
    // Match Events
    ['עורפת', new FootballConcept('offside', ConceptType.MATCH_EVENT)],
    ['עבירה', new FootballConcept('foul', ConceptType.MATCH_EVENT)],
    ['כרטיס צהוב', new FootballConcept('yellow_card', ConceptType.MATCH_EVENT)],
    ['כרטיס אדום', new FootballConcept('red_card', ConceptType.MATCH_EVENT)],
    ['חילוף', new FootballConcept('substitution', ConceptType.MATCH_EVENT)],
    ['זריקת צד', new FootballConcept('throw_in', ConceptType.MATCH_EVENT)],
    ['בעיטת פינה', new FootballConcept('corner_kick', ConceptType.MATCH_EVENT)]
  ]);

  private readonly hebrewResponseTemplates = new Map<string, string>([
    ['formation_analysis', `
ניתוח מערך טקטי:
המערך הנוכחי: {formation}
נקודות חוזק: {strengths}
נקודות חולשה: {weaknesses}
המלצות לשיפור: {recommendations}
    `],
    ['player_performance', `
ניתוח ביצועי שחקן:
שחקן: {playerName}
מיקום: {position}
נקודות מבט: {insights}
המלצות לאימון: {trainingRecommendations}
    `],
    ['tactical_adjustment', `
המלצה לשינוי טקטי:
מצב נוכחי: {currentSituation}
שינוי מוצע: {suggestedChange}
סיבה: {reasoning}
שלבי ביצוע: {implementationSteps}
    `],
    ['match_analysis', `
ניתוח המשחק:
תוצאה: {score}
נקודות מפתח: {keyPoints}
ביצועי הקבוצה: {teamPerformance}
שחקן המשחק: {playerOfMatch}
המלצות לעתיד: {futureRecommendations}
    `]
  ]);

  constructor() {}

  /**
   * Analyze Hebrew tactical query with football-specific NLP
   */
  async analyzeTacticalQuery(query: string): Promise<TacticalQueryAnalysis> {
    // Tokenize Hebrew text with football awareness
    const tokens = await this.tokenizeHebrewQuery(query);
    
    // Perform morphological analysis
    const morphology = await this.analyzeMorphology(tokens);
    
    // Extract football-specific entities
    const entities = await this.extractFootballEntities(morphology);
    
    // Determine tactical intent
    const intent = await this.classifyTacticalIntent(entities, morphology);
    
    // Analyze sentiment and coaching tone
    const sentiment = await this.analyzeHebrewSentiment(query);

    return new TacticalQueryAnalysis(
      query,
      entities,
      intent,
      morphology,
      sentiment
    );
  }

  /**
   * Generate Hebrew response for tactical analysis
   */
  async generateHebrewResponse(
    analysis: TacticalAnalysis,
    coachProfile: CoachProfile
  ): Promise<string> {
    // Select appropriate response template
    const template = await this.selectResponseTemplate(
      analysis.getType(),
      coachProfile.getPreferredTone()
    );
    
    // Render Hebrew response with proper morphology
    return this.renderHebrewResponse(template, analysis, coachProfile);
  }

  /**
   * Extract football entities from Hebrew morphological analysis
   */
  async extractFootballEntities(morphology: HebrewMorphology): Promise<FootballEntity[]> {
    const entities: FootballEntity[] = [];
    
    for (const word of morphology.getWords()) {
      // Check exact match first
      const exactConcept = this.hebrewTerms.get(word.getLemma());
      if (exactConcept) {
        entities.push(new FootballEntity(word, exactConcept));
        continue;
      }
      
      // Check for partial matches and inflections
      const partialMatches = this.findPartialMatches(word.getLemma());
      for (const match of partialMatches) {
        entities.push(new FootballEntity(word, match.concept, match.confidence));
      }
      
      // Check for compound football terms
      const compoundMatch = await this.findCompoundFootballTerms(word, morphology);
      if (compoundMatch) {
        entities.push(compoundMatch);
      }
    }
    
    return entities;
  }

  /**
   * Classify tactical intent from Hebrew query
   */
  private async classifyTacticalIntent(
    entities: FootballEntity[],
    morphology: HebrewMorphology
  ): Promise<TacticalIntent> {
    
    // Rule-based intent classification for Hebrew football queries
    const intentRules = [
      {
        condition: (e: FootballEntity[]) => e.some(entity => 
          entity.getConcept().getType() === ConceptType.TACTICAL_SETUP),
        intent: TacticalIntent.FORMATION_ANALYSIS
      },
      {
        condition: (e: FootballEntity[]) => e.some(entity => 
          entity.getConcept().getType() === ConceptType.PLAYER_POSITION),
        intent: TacticalIntent.PLAYER_ANALYSIS
      },
      {
        condition: (e: FootballEntity[]) => e.some(entity => 
          entity.getConcept().getType() === ConceptType.TACTICAL_PHASE),
        intent: TacticalIntent.TACTICAL_ADJUSTMENT
      },
      {
        condition: (e: FootballEntity[]) => e.some(entity => 
          entity.getConcept().getType() === ConceptType.METRIC),
        intent: TacticalIntent.PERFORMANCE_ANALYSIS
      }
    ];

    // Apply rules to determine intent
    for (const rule of intentRules) {
      if (rule.condition(entities)) {
        return rule.intent;
      }
    }

    // Default intent if no specific pattern found
    return TacticalIntent.GENERAL_ANALYSIS;
  }

  /**
   * Hebrew tokenization with football-specific handling
   */
  private async tokenizeHebrewQuery(query: string): Promise<string[]> {
    // Remove Hebrew punctuation and normalize
    const normalized = query
      .replace(/[״׳]/g, '') // Remove Hebrew quotation marks
      .replace(/[־]/g, ' ') // Replace Hebrew hyphen with space
      .trim();
    
    // Split by whitespace and filter empty tokens
    const tokens = normalized.split(/\s+/).filter(token => token.length > 0);
    
    // Apply Hebrew-specific tokenization rules
    return this.applyHebrewTokenizationRules(tokens);
  }

  /**
   * Hebrew morphological analysis
   */
  private async analyzeMorphology(tokens: string[]): Promise<HebrewMorphology> {
    const words = [];
    
    for (const token of tokens) {
      // Basic Hebrew morphological analysis
      const lemma = await this.getLemma(token);
      const pos = await this.getPartOfSpeech(token);
      const features = await this.getMorphologicalFeatures(token);
      
      words.push({
        surface: token,
        lemma,
        pos,
        features
      });
    }
    
    return new HebrewMorphology(words);
  }

  /**
   * Hebrew sentiment analysis for coaching context
   */
  private async analyzeHebrewSentiment(query: string): Promise<number> {
    // Simple rule-based sentiment for Hebrew coaching queries
    const positiveWords = ['טוב', 'מצוין', 'חזק', 'יעיל', 'מוצלח'];
    const negativeWords = ['רע', 'חלש', 'כושל', 'לא יעיל', 'בעייתי'];
    
    let sentiment = 0;
    const words = query.split(/\s+/);
    
    for (const word of words) {
      if (positiveWords.includes(word)) sentiment += 1;
      if (negativeWords.includes(word)) sentiment -= 1;
    }
    
    // Normalize to [-1, 1] range
    return Math.max(-1, Math.min(1, sentiment / words.length * 5));
  }

  /**
   * Select appropriate Hebrew response template
   */
  private async selectResponseTemplate(
    analysisType: string,
    coachingTone: string
  ): Promise<string> {
    const templateKey = this.mapAnalysisTypeToTemplate(analysisType);
    let template = this.hebrewResponseTemplates.get(templateKey) || 
                  this.hebrewResponseTemplates.get('tactical_adjustment');
    
    // Adjust template based on coaching tone
    if (coachingTone === 'formal') {
      template = this.makeFormalHebrew(template);
    } else if (coachingTone === 'casual') {
      template = this.makeCasualHebrew(template);
    }
    
    return template;
  }

  /**
   * Render Hebrew response with proper substitutions
   */
  private renderHebrewResponse(
    template: string,
    analysis: TacticalAnalysis,
    coachProfile: CoachProfile
  ): string {
    // Replace placeholders with actual data
    let response = template;
    
    const substitutions = analysis.getTemplateSubstitutions();
    for (const [key, value] of Object.entries(substitutions)) {
      response = response.replace(new RegExp(`{${key}}`, 'g'), value);
    }
    
    // Apply Hebrew grammatical rules
    response = this.applyHebrewGrammarRules(response);
    
    // Adjust for coach's preferred style
    response = this.adjustForCoachingStyle(response, coachProfile);
    
    return response.trim();
  }

  /**
   * Find partial matches for Hebrew football terms
   */
  private findPartialMatches(lemma: string): Array<{concept: FootballConcept, confidence: number}> {
    const matches = [];
    
    for (const [term, concept] of this.hebrewTerms) {
      // Calculate similarity score
      const similarity = this.calculateHebrewSimilarity(lemma, term);
      
      if (similarity > 0.7) { // Threshold for partial matches
        matches.push({ concept, confidence: similarity });
      }
    }
    
    return matches.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Find compound football terms in Hebrew
   */
  private async findCompoundFootballTerms(
    word: any,
    morphology: HebrewMorphology
  ): Promise<FootballEntity | null> {
    // Look for compound terms like "קשר הגנתי" (defensive midfielder)
    const compoundPatterns = [
      ['קשר', 'הגנתי'],
      ['קשר', 'התקפי'],
      ['מגן', 'אגף'],
      ['כדור', 'גובה']
    ];
    
    for (const pattern of compoundPatterns) {
      if (this.matchesCompoundPattern(word, pattern, morphology)) {
        const compoundTerm = pattern.join(' ');
        const concept = this.hebrewTerms.get(compoundTerm);
        if (concept) {
          return new FootballEntity(word, concept, 0.9);
        }
      }
    }
    
    return null;
  }

  // Helper methods for Hebrew processing
  private applyHebrewTokenizationRules(tokens: string[]): string[] {
    // Apply Hebrew-specific tokenization rules
    return tokens;
  }

  private async getLemma(token: string): Promise<string> {
    // Basic Hebrew lemmatization - in production, use Hebrew NLP library
    return token;
  }

  private async getPartOfSpeech(token: string): Promise<string> {
    // Basic POS tagging for Hebrew
    return 'UNKNOWN';
  }

  private async getMorphologicalFeatures(token: string): Promise<object> {
    return {};
  }

  private mapAnalysisTypeToTemplate(analysisType: string): string {
    const mapping: Record<string, string> = {
      'FORMATION': 'formation_analysis',
      'PLAYER': 'player_performance',
      'TACTICAL': 'tactical_adjustment',
      'MATCH': 'match_analysis'
    };
    
    return mapping[analysisType] || 'tactical_adjustment';
  }

  private makeFormalHebrew(template: string): string {
    // Convert to formal Hebrew style
    return template;
  }

  private makeCasualHebrew(template: string): string {
    // Convert to casual Hebrew style
    return template;
  }

  private applyHebrewGrammarRules(response: string): string {
    // Apply Hebrew grammatical adjustments
    return response;
  }

  private adjustForCoachingStyle(response: string, coachProfile: CoachProfile): string {
    // Adjust response based on coach's style and preferences
    return response;
  }

  private calculateHebrewSimilarity(word1: string, word2: string): number {
    // Calculate similarity between Hebrew words
    // This is a simplified implementation - in production, use Hebrew-aware similarity
    if (word1 === word2) return 1.0;
    if (word1.includes(word2) || word2.includes(word1)) return 0.8;
    return 0.0;
  }

  private matchesCompoundPattern(word: any, pattern: string[], morphology: HebrewMorphology): boolean {
    // Check if current context matches compound pattern
    return false; // Simplified implementation
  }

  /**
   * Get supported Hebrew dialects
   */
  getSupportedDialects(): string[] {
    return ['modern_hebrew', 'formal_hebrew', 'colloquial_hebrew'];
  }

  /**
   * Get football terminology statistics
   */
  getTerminologyStats(): {
    totalTerms: number;
    conceptTypes: number;
    coveragePercentage: number;
  } {
    const conceptTypes = new Set(
      Array.from(this.hebrewTerms.values()).map(concept => concept.getType())
    );
    
    return {
      totalTerms: this.hebrewTerms.size,
      conceptTypes: conceptTypes.size,
      coveragePercentage: 85 // Estimated coverage of Hebrew football terminology
    };
  }
}
