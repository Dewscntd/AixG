/**
 * Tactical Query Analysis Service
 * Orchestrates intent classification and semantic understanding for Hebrew coaching queries
 */

import {
  TacticalIntent,
  IntentType,
  IntentUrgency,
  IntentComplexity,
  ResponseExpectation,
  IntentContext,
} from '../value-objects/tactical-intent';
import {
  FootballConcept,
  ConceptCategory,
} from '../value-objects/football-concept';
import {
  FootballEntity,
  EntityType,
  PositionType,
  TacticalRole,
} from '../value-objects/football-entity';
import {
  HebrewMorphology,
  MorphologicalFeatures,
} from '../value-objects/hebrew-morphology';
import {
  FormationAnalyzer,
  FormationType,
  FieldZone,
} from './formation-analyzer';
import {
  TacticalPatternMatcher,
  TacticalPattern,
  PatternMatch,
} from './tactical-pattern-matcher';

export enum QueryType {
  TACTICAL_QUESTION = 'tactical_question',
  FORMATION_ANALYSIS = 'formation_analysis',
  PLAYER_ASSESSMENT = 'player_assessment',
  PERFORMANCE_REVIEW = 'performance_review',
  STRATEGY_REQUEST = 'strategy_request',
  TRAINING_GUIDANCE = 'training_guidance',
  LIVE_MATCH_QUERY = 'live_match_query',
  CONCEPT_EXPLANATION = 'concept_explanation',
  COMPARISON_REQUEST = 'comparison_request',
  PREDICTION_REQUEST = 'prediction_request',
}

export enum QueryComplexity {
  SIMPLE = 'simple', // Single concept query
  MODERATE = 'moderate', // 2-3 related concepts
  COMPLEX = 'complex', // Multi-dimensional analysis
  ADVANCED = 'advanced', // Deep tactical reasoning
  EXPERT = 'expert', // Professional-level insight
}

export enum AnalysisConfidence {
  LOW = 'low', // 0.0-0.4
  MEDIUM = 'medium', // 0.4-0.7
  HIGH = 'high', // 0.7-0.9
  VERY_HIGH = 'very_high', // 0.9-1.0
}

export interface QueryEntity {
  id: string;
  type: EntityType;
  name: string;
  hebrewName: string;
  confidence: number;
  attributes?: Record<string, any>;
  relationships?: Array<{
    targetId: string;
    type: string;
    strength: number;
  }>;
}

export interface QueryConcept {
  id: string;
  category: ConceptCategory;
  term: string;
  hebrewTerm: string;
  confidence: number;
  semanticWeight: number;
  contextualRelevance: number;
  relatedConcepts: string[];
}

export interface SemanticAnalysis {
  entities: QueryEntity[];
  concepts: QueryConcept[];
  relationships: Array<{
    sourceId: string;
    targetId: string;
    type: 'entity-entity' | 'concept-concept' | 'entity-concept';
    strength: number;
    description: string;
  }>;
  semanticComplexity: QueryComplexity;
  domainRelevance: number;
  contextualFactors: string[];
}

export interface QueryAnalysisResult {
  query: string;
  language: 'he' | 'en' | 'mixed';
  intent: TacticalIntent;
  semantics: SemanticAnalysis;
  queryType: QueryType;
  complexity: QueryComplexity;
  confidence: AnalysisConfidence;
  urgency: IntentUrgency;
  responseExpectation: ResponseExpectation;
  context: IntentContext[];
  actionableItems: Array<{
    action: string;
    priority: 'low' | 'medium' | 'high' | 'critical';
    requiredData: string[];
    estimatedTime: number; // seconds
  }>;
  recommendations: Array<{
    type:
      | 'clarification'
      | 'additional_context'
      | 'related_query'
      | 'follow_up';
    content: string;
    hebrewContent: string;
    relevance: number;
  }>;
  processingMetadata: {
    analysisTime: number;
    modelVersions: Record<string, string>;
    featureFlags: string[];
    debugInfo?: Record<string, any>;
  };
}

export interface QuerySessionContext {
  sessionId: string;
  userId: string;
  teamId?: string;
  matchId?: string;
  previousQueries: string[];
  sessionStartTime: Date;
  userPreferences: {
    language: 'he' | 'en' | 'mixed';
    responseStyle: 'brief' | 'detailed' | 'technical';
    expertiseLevel: 'beginner' | 'intermediate' | 'advanced' | 'professional';
    tacticalFocus: string[];
  };
  contextualData: {
    currentFormation?: FormationType;
    recentPatterns?: TacticalPattern[];
    activePlayerFocus?: string[];
    matchPhase?:
      | 'pre_match'
      | 'first_half'
      | 'half_time'
      | 'second_half'
      | 'post_match';
    scoreline?: string;
    timeRemaining?: number;
  };
}

export class TacticalQueryAnalysis {
  private readonly formationAnalyzer: FormationAnalyzer;
  private readonly patternMatcher: TacticalPatternMatcher;
  private readonly queryCache = new Map<string, QueryAnalysisResult>();
  private readonly sessionContexts = new Map<string, QuerySessionContext>();

  // Performance monitoring
  private readonly performanceMetrics = {
    averageAnalysisTime: 0,
    totalQueries: 0,
    cacheHitRate: 0,
    accuracyScore: 0,
  };

  constructor() {
    this.formationAnalyzer = new FormationAnalyzer();
    this.patternMatcher = new TacticalPatternMatcher();
  }

  /**
   * Analyze a tactical query with full semantic understanding
   */
  public async analyzeQuery(
    query: string,
    sessionContext?: QuerySessionContext,
    options?: {
      useCache?: boolean;
      timeout?: number;
      debugMode?: boolean;
      skipSemanticAnalysis?: boolean;
    }
  ): Promise<QueryAnalysisResult> {
    const startTime = Date.now();
    const cacheKey = this.generateCacheKey(query, sessionContext);

    // Check cache if enabled
    if (options?.useCache !== false && this.queryCache.has(cacheKey)) {
      this.performanceMetrics.cacheHitRate =
        (this.performanceMetrics.cacheHitRate *
          this.performanceMetrics.totalQueries +
          1) /
        (this.performanceMetrics.totalQueries + 1);
      return this.queryCache.get(cacheKey)!;
    }

    try {
      // Phase 1: Language detection and preprocessing
      const language = await this.detectLanguage(query);
      const normalizedQuery = await this.preprocessQuery(query, language);

      // Phase 2: Intent analysis
      const intent = TacticalIntent.analyze(normalizedQuery, {
        language,
        sessionContext: sessionContext
          ? {
              previousQueries: sessionContext.previousQueries,
              userExpertise: sessionContext.userPreferences.expertiseLevel,
              teamId: sessionContext.teamId,
              matchContext: sessionContext.contextualData.matchPhase,
              activePlayerFocus:
                sessionContext.contextualData.activePlayerFocus,
            }
          : undefined,
        timeoutMs: options?.timeout || 5000,
      });

      // Phase 3: Semantic analysis (if not skipped)
      let semantics: SemanticAnalysis;
      if (options?.skipSemanticAnalysis) {
        semantics = this.createEmptySemanticAnalysis();
      } else {
        semantics = await this.performSemanticAnalysis(
          normalizedQuery,
          language,
          sessionContext
        );
      }

      // Phase 4: Query classification and complexity assessment
      const queryType = this.classifyQueryType(intent, semantics);
      const complexity = this.assessComplexity(
        intent,
        semantics,
        sessionContext
      );

      // Phase 5: Confidence calculation
      const confidence = this.calculateOverallConfidence(
        intent,
        semantics,
        queryType
      );

      // Phase 6: Actionable items and recommendations
      const actionableItems = await this.generateActionableItems(
        intent,
        semantics,
        sessionContext
      );
      const recommendations = await this.generateRecommendations(
        intent,
        semantics,
        sessionContext
      );

      // Phase 7: Build result
      const result: QueryAnalysisResult = {
        query: normalizedQuery,
        language,
        intent,
        semantics,
        queryType,
        complexity,
        confidence,
        urgency: intent.urgency,
        responseExpectation: intent.responseExpectation,
        context: intent.context,
        actionableItems,
        recommendations,
        processingMetadata: {
          analysisTime: Date.now() - startTime,
          modelVersions: {
            tacticalIntent: '1.0.0',
            semanticAnalysis: '1.0.0',
            hebrewMorphology: '1.0.0',
          },
          featureFlags: this.getActiveFeatureFlags(),
          debugInfo: options?.debugMode
            ? {
                cacheKey,
                sessionId: sessionContext?.sessionId,
                originalQuery: query,
              }
            : undefined,
        },
      };

      // Update performance metrics
      this.updatePerformanceMetrics(startTime, false);

      // Cache result
      if (options?.useCache !== false) {
        this.queryCache.set(cacheKey, result);
      }

      // Update session context
      if (sessionContext) {
        this.updateSessionContext(sessionContext, query, result);
      }

      return result;
    } catch (error) {
      this.updatePerformanceMetrics(startTime, true);
      throw new Error(`Query analysis failed: ${error.message}`);
    }
  }

  /**
   * Detect the primary language of the query
   */
  private async detectLanguage(query: string): Promise<'he' | 'en' | 'mixed'> {
    const hebrewCharPattern = /[\u0590-\u05FF]/;
    const englishCharPattern = /[a-zA-Z]/;

    const hebrewMatches = query.match(hebrewCharPattern);
    const englishMatches = query.match(englishCharPattern);

    const hebrewRatio = hebrewMatches ? hebrewMatches.length / query.length : 0;
    const englishRatio = englishMatches
      ? englishMatches.length / query.length
      : 0;

    if (hebrewRatio > 0.6) return 'he';
    if (englishRatio > 0.6) return 'en';
    return 'mixed';
  }

  /**
   * Preprocess and normalize the query
   */
  private async preprocessQuery(
    query: string,
    language: 'he' | 'en' | 'mixed'
  ): Promise<string> {
    let normalized = query.trim();

    // Remove extra whitespace
    normalized = normalized.replace(/\s+/g, ' ');

    // Handle Hebrew-specific preprocessing
    if (language === 'he' || language === 'mixed') {
      // Remove Hebrew punctuation marks
      normalized = normalized.replace(/[׳״]/g, '');

      // Normalize Hebrew characters
      normalized = normalized.replace(/ך/g, 'כ');
      normalized = normalized.replace(/ם/g, 'מ');
      normalized = normalized.replace(/ן/g, 'נ');
      normalized = normalized.replace(/ף/g, 'פ');
      normalized = normalized.replace(/ץ/g, 'צ');
    }

    return normalized;
  }

  /**
   * Perform comprehensive semantic analysis
   */
  private async performSemanticAnalysis(
    query: string,
    language: 'he' | 'en' | 'mixed',
    sessionContext?: QuerySessionContext
  ): Promise<SemanticAnalysis> {
    // Extract entities
    const entities = await this.extractEntities(query, language);

    // Extract concepts
    const concepts = await this.extractConcepts(query, language);

    // Analyze relationships
    const relationships = await this.analyzeRelationships(
      entities,
      concepts,
      sessionContext
    );

    // Assess complexity and relevance
    const semanticComplexity = this.assessSemanticComplexity(
      entities,
      concepts,
      relationships
    );
    const domainRelevance = this.calculateDomainRelevance(concepts, entities);
    const contextualFactors = this.identifyContextualFactors(
      query,
      sessionContext
    );

    return {
      entities,
      concepts,
      relationships,
      semanticComplexity,
      domainRelevance,
      contextualFactors,
    };
  }

  /**
   * Extract football entities from the query
   */
  private async extractEntities(
    query: string,
    language: 'he' | 'en' | 'mixed'
  ): Promise<QueryEntity[]> {
    const entities: QueryEntity[] = [];

    // Extract formation references
    const formationPatterns = {
      he: /(\d-\d-\d|\d-\d-\d-\d|מערך|מבנה|צורה)/g,
      en: /(formation|\d-\d-\d|\d-\d-\d-\d|shape|structure)/g,
    };

    // Extract player position references
    const positionPatterns = {
      he: /(שוער|מגן|קשר|חלוץ|אגף|מרכז)/g,
      en: /(goalkeeper|defender|midfielder|forward|winger|striker|center)/g,
    };

    // Extract tactical role references
    const rolePatterns = {
      he: /(קליבר|פלייקר|רגליסטה|מתקיף|הגנתי)/g,
      en: /(playmaker|regista|libero|attacking|defensive|box.to.box)/g,
    };

    // Use FootballEntity to identify and classify entities
    const words = query.toLowerCase().split(/\s+/);

    for (const word of words) {
      // Try to match formations
      if (this.isFormationReference(word)) {
        entities.push({
          id: `formation_${word}`,
          type: EntityType.TACTICAL_ROLE,
          name: word,
          hebrewName: this.translateToHebrew(word, 'formation'),
          confidence: 0.85,
          attributes: { category: 'formation' },
        });
      }

      // Try to match positions
      if (this.isPositionReference(word)) {
        entities.push({
          id: `position_${word}`,
          type: EntityType.POSITION,
          name: word,
          hebrewName: this.translateToHebrew(word, 'position'),
          confidence: 0.8,
          attributes: { category: 'position' },
        });
      }
    }

    return entities;
  }

  /**
   * Extract football concepts from the query
   */
  private async extractConcepts(
    query: string,
    language: 'he' | 'en' | 'mixed'
  ): Promise<QueryConcept[]> {
    const concepts: QueryConcept[] = [];

    // Use FootballConcept to identify semantic concepts
    const conceptMatches = FootballConcept.searchSemantic(query, {
      maxResults: 10,
      minRelevance: 0.6,
      language,
      includeRelated: true,
    });

    for (const match of conceptMatches) {
      concepts.push({
        id: match.concept.id,
        category: match.concept.category,
        term: match.concept.englishTerm,
        hebrewTerm: match.concept.hebrewTerm,
        confidence: match.relevance,
        semanticWeight: match.concept.tacticalSignificance?.importance || 0.5,
        contextualRelevance: this.calculateContextualRelevance(
          match.concept,
          query
        ),
        relatedConcepts:
          match.concept.relationships
            ?.filter(r => r.strength > 0.7)
            .map(r => r.targetConceptId) || [],
      });
    }

    return concepts;
  }

  /**
   * Analyze relationships between entities and concepts
   */
  private async analyzeRelationships(
    entities: QueryEntity[],
    concepts: QueryConcept[],
    sessionContext?: QuerySessionContext
  ): Promise<
    Array<{
      sourceId: string;
      targetId: string;
      type: 'entity-entity' | 'concept-concept' | 'entity-concept';
      strength: number;
      description: string;
    }>
  > {
    const relationships: Array<{
      sourceId: string;
      targetId: string;
      type: 'entity-entity' | 'concept-concept' | 'entity-concept';
      strength: number;
      description: string;
    }> = [];

    // Entity-Entity relationships
    for (let i = 0; i < entities.length; i++) {
      for (let j = i + 1; j < entities.length; j++) {
        const entity1 = entities[i];
        const entity2 = entities[j];
        const compatibility = FootballEntity.getEntityCompatibility(
          entity1.type,
          entity2.type
        );

        if (compatibility > 0.5) {
          relationships.push({
            sourceId: entity1.id,
            targetId: entity2.id,
            type: 'entity-entity',
            strength: compatibility,
            description: `${entity1.name} relates to ${entity2.name} in tactical context`,
          });
        }
      }
    }

    // Concept-Concept relationships
    for (let i = 0; i < concepts.length; i++) {
      for (let j = i + 1; j < concepts.length; j++) {
        const concept1 = concepts[i];
        const concept2 = concepts[j];

        if (concept1.relatedConcepts.includes(concept2.id)) {
          relationships.push({
            sourceId: concept1.id,
            targetId: concept2.id,
            type: 'concept-concept',
            strength: 0.8,
            description: `${concept1.term} is semantically related to ${concept2.term}`,
          });
        }
      }
    }

    // Entity-Concept relationships
    for (const entity of entities) {
      for (const concept of concepts) {
        const relevance = this.calculateEntityConceptRelevance(entity, concept);
        if (relevance > 0.6) {
          relationships.push({
            sourceId: entity.id,
            targetId: concept.id,
            type: 'entity-concept',
            strength: relevance,
            description: `${entity.name} is relevant to concept ${concept.term}`,
          });
        }
      }
    }

    return relationships;
  }

  /**
   * Classify the type of query
   */
  private classifyQueryType(
    intent: TacticalIntent,
    semantics: SemanticAnalysis
  ): QueryType {
    // Formation-focused queries
    if (
      semantics.entities.some(e => e.type === EntityType.TACTICAL_ROLE) ||
      semantics.concepts.some(
        c => c.category === ConceptCategory.TACTICAL_FORMATION
      )
    ) {
      return QueryType.FORMATION_ANALYSIS;
    }

    // Player-focused queries
    if (
      semantics.entities.some(e => e.type === EntityType.PLAYER) ||
      semantics.concepts.some(c => c.category === ConceptCategory.PLAYER_ROLE)
    ) {
      return QueryType.PLAYER_ASSESSMENT;
    }

    // Based on intent type
    switch (intent.type) {
      case IntentType.TACTICAL_ANALYSIS:
        return QueryType.TACTICAL_QUESTION;
      case IntentType.FORMATION_ANALYSIS:
        return QueryType.FORMATION_ANALYSIS;
      case IntentType.PERFORMANCE_ANALYSIS:
        return QueryType.PERFORMANCE_REVIEW;
      case IntentType.STRATEGY_REQUEST:
        return QueryType.STRATEGY_REQUEST;
      case IntentType.TRAINING_REQUEST:
        return QueryType.TRAINING_GUIDANCE;
      case IntentType.LIVE_MATCH_QUERY:
        return QueryType.LIVE_MATCH_QUERY;
      case IntentType.EXPLANATION_REQUEST:
        return QueryType.CONCEPT_EXPLANATION;
      case IntentType.COMPARISON_REQUEST:
        return QueryType.COMPARISON_REQUEST;
      case IntentType.PREDICTION_REQUEST:
        return QueryType.PREDICTION_REQUEST;
      default:
        return QueryType.TACTICAL_QUESTION;
    }
  }

  /**
   * Assess the complexity of the query
   */
  private assessComplexity(
    intent: TacticalIntent,
    semantics: SemanticAnalysis,
    sessionContext?: QuerySessionContext
  ): QueryComplexity {
    let complexityScore = 0;

    // Factor in intent complexity
    complexityScore += this.mapIntentComplexityToScore(intent.complexity);

    // Factor in semantic complexity
    complexityScore += this.mapSemanticComplexityToScore(
      semantics.semanticComplexity
    );

    // Factor in number of entities and concepts
    complexityScore +=
      (semantics.entities.length + semantics.concepts.length) * 0.1;

    // Factor in relationships
    complexityScore += semantics.relationships.length * 0.05;

    // Factor in session context
    if (
      sessionContext?.contextualData.matchPhase === 'first_half' ||
      sessionContext?.contextualData.matchPhase === 'second_half'
    ) {
      complexityScore += 0.2; // Live match queries are more complex
    }

    if (complexityScore < 0.3) return QueryComplexity.SIMPLE;
    if (complexityScore < 0.6) return QueryComplexity.MODERATE;
    if (complexityScore < 0.8) return QueryComplexity.COMPLEX;
    if (complexityScore < 0.95) return QueryComplexity.ADVANCED;
    return QueryComplexity.EXPERT;
  }

  /**
   * Calculate overall confidence in the analysis
   */
  private calculateOverallConfidence(
    intent: TacticalIntent,
    semantics: SemanticAnalysis,
    queryType: QueryType
  ): AnalysisConfidence {
    let confidence = 0;

    // Intent confidence
    confidence += intent.confidence * 0.4;

    // Semantic confidence (average of entity and concept confidences)
    const entityConfidence =
      semantics.entities.length > 0
        ? semantics.entities.reduce((sum, e) => sum + e.confidence, 0) /
          semantics.entities.length
        : 0.5;
    const conceptConfidence =
      semantics.concepts.length > 0
        ? semantics.concepts.reduce((sum, c) => sum + c.confidence, 0) /
          semantics.concepts.length
        : 0.5;

    confidence += ((entityConfidence + conceptConfidence) / 2) * 0.3;

    // Domain relevance
    confidence += semantics.domainRelevance * 0.2;

    // Query type classification confidence
    confidence += 0.1; // Base confidence for classification

    if (confidence < 0.4) return AnalysisConfidence.LOW;
    if (confidence < 0.7) return AnalysisConfidence.MEDIUM;
    if (confidence < 0.9) return AnalysisConfidence.HIGH;
    return AnalysisConfidence.VERY_HIGH;
  }

  /**
   * Generate actionable items based on the analysis
   */
  private async generateActionableItems(
    intent: TacticalIntent,
    semantics: SemanticAnalysis,
    sessionContext?: QuerySessionContext
  ): Promise<
    Array<{
      action: string;
      priority: 'low' | 'medium' | 'high' | 'critical';
      requiredData: string[];
      estimatedTime: number;
    }>
  > {
    const actions: Array<{
      action: string;
      priority: 'low' | 'medium' | 'high' | 'critical';
      requiredData: string[];
      estimatedTime: number;
    }> = [];

    // Formation analysis actions
    if (semantics.entities.some(e => e.attributes?.category === 'formation')) {
      actions.push({
        action: 'analyze_formation_effectiveness',
        priority: intent.urgency === IntentUrgency.URGENT ? 'critical' : 'high',
        requiredData: [
          'player_positions',
          'formation_data',
          'opponent_analysis',
        ],
        estimatedTime: 5,
      });
    }

    // Player assessment actions
    if (semantics.entities.some(e => e.type === EntityType.PLAYER)) {
      actions.push({
        action: 'generate_player_performance_report',
        priority: 'medium',
        requiredData: ['player_stats', 'match_data', 'comparison_benchmarks'],
        estimatedTime: 10,
      });
    }

    // Live match actions
    if (intent.context.includes(IntentContext.REAL_TIME)) {
      actions.push({
        action: 'provide_real_time_tactical_insight',
        priority: 'critical',
        requiredData: [
          'live_match_data',
          'current_formations',
          'momentum_analysis',
        ],
        estimatedTime: 2,
      });
    }

    return actions;
  }

  /**
   * Generate recommendations for the user
   */
  private async generateRecommendations(
    intent: TacticalIntent,
    semantics: SemanticAnalysis,
    sessionContext?: QuerySessionContext
  ): Promise<
    Array<{
      type:
        | 'clarification'
        | 'additional_context'
        | 'related_query'
        | 'follow_up';
      content: string;
      hebrewContent: string;
      relevance: number;
    }>
  > {
    const recommendations: Array<{
      type:
        | 'clarification'
        | 'additional_context'
        | 'related_query'
        | 'follow_up';
      content: string;
      hebrewContent: string;
      relevance: number;
    }> = [];

    // Low confidence recommendations
    if (intent.confidence < 0.6) {
      recommendations.push({
        type: 'clarification',
        content:
          'Could you provide more specific details about the tactical situation?',
        hebrewContent: 'האם תוכל לספק פרטים ספציפיים יותר על המצב הטקטי?',
        relevance: 0.9,
      });
    }

    // Related query suggestions
    if (semantics.concepts.length > 0) {
      const topConcept = semantics.concepts[0];
      recommendations.push({
        type: 'related_query',
        content: `You might also be interested in learning about ${topConcept.relatedConcepts
          .slice(0, 2)
          .join(' and ')}`,
        hebrewContent: `ייתכן שתתעניין גם ללמוד על ${topConcept.relatedConcepts
          .slice(0, 2)
          .join(' ו')}`,
        relevance: 0.7,
      });
    }

    // Follow-up suggestions
    if (intent.type === IntentType.FORMATION_ANALYSIS) {
      recommendations.push({
        type: 'follow_up',
        content:
          'Would you like me to suggest specific player roles for this formation?',
        hebrewContent: 'האם תרצה שאציע תפקידי שחקנים ספציפיים למערך זה?',
        relevance: 0.8,
      });
    }

    return recommendations;
  }

  // Helper methods

  private createEmptySemanticAnalysis(): SemanticAnalysis {
    return {
      entities: [],
      concepts: [],
      relationships: [],
      semanticComplexity: QueryComplexity.SIMPLE,
      domainRelevance: 0.5,
      contextualFactors: [],
    };
  }

  private generateCacheKey(
    query: string,
    sessionContext?: QuerySessionContext
  ): string {
    const contextKey = sessionContext
      ? `${sessionContext.userId}_${sessionContext.teamId || 'no_team'}`
      : 'no_context';
    return `${contextKey}_${Buffer.from(query)
      .toString('base64')
      .slice(0, 32)}`;
  }

  private getActiveFeatureFlags(): string[] {
    return [
      'semantic_analysis',
      'hebrew_morphology',
      'formation_analysis',
      'pattern_matching',
    ];
  }

  private updatePerformanceMetrics(startTime: number, failed: boolean): void {
    const analysisTime = Date.now() - startTime;
    this.performanceMetrics.totalQueries++;

    this.performanceMetrics.averageAnalysisTime =
      (this.performanceMetrics.averageAnalysisTime *
        (this.performanceMetrics.totalQueries - 1) +
        analysisTime) /
      this.performanceMetrics.totalQueries;

    if (!failed) {
      this.performanceMetrics.accuracyScore =
        (this.performanceMetrics.accuracyScore *
          (this.performanceMetrics.totalQueries - 1) +
          1) /
        this.performanceMetrics.totalQueries;
    }
  }

  private updateSessionContext(
    sessionContext: QuerySessionContext,
    query: string,
    result: QueryAnalysisResult
  ): void {
    sessionContext.previousQueries.push(query);

    // Keep only last 10 queries for context
    if (sessionContext.previousQueries.length > 10) {
      sessionContext.previousQueries =
        sessionContext.previousQueries.slice(-10);
    }

    // Update contextual data based on analysis
    if (
      result.semantics.entities.some(
        e => e.attributes?.category === 'formation'
      )
    ) {
      const formationEntity = result.semantics.entities.find(
        e => e.attributes?.category === 'formation'
      );
      if (formationEntity) {
        sessionContext.contextualData.currentFormation =
          formationEntity.name as FormationType;
      }
    }
  }

  private assessSemanticComplexity(
    entities: QueryEntity[],
    concepts: QueryConcept[],
    relationships: Array<{
      sourceId: string;
      targetId: string;
      type: string;
      strength: number;
      description: string;
    }>
  ): QueryComplexity {
    const totalElements = entities.length + concepts.length;
    const relationshipDensity =
      relationships.length / Math.max(1, totalElements);

    if (totalElements <= 2 && relationshipDensity < 0.5)
      return QueryComplexity.SIMPLE;
    if (totalElements <= 4 && relationshipDensity < 1.0)
      return QueryComplexity.MODERATE;
    if (totalElements <= 7 && relationshipDensity < 1.5)
      return QueryComplexity.COMPLEX;
    if (totalElements <= 10 && relationshipDensity < 2.0)
      return QueryComplexity.ADVANCED;
    return QueryComplexity.EXPERT;
  }

  private calculateDomainRelevance(
    concepts: QueryConcept[],
    entities: QueryEntity[]
  ): number {
    if (concepts.length === 0 && entities.length === 0) return 0.3;

    const conceptRelevance =
      concepts.length > 0
        ? concepts.reduce((sum, c) => sum + c.contextualRelevance, 0) /
          concepts.length
        : 0;

    const entityRelevance = entities.length > 0 ? 0.8 : 0; // Entities are generally highly relevant

    return (conceptRelevance + entityRelevance) / 2;
  }

  private identifyContextualFactors(
    query: string,
    sessionContext?: QuerySessionContext
  ): string[] {
    const factors: string[] = [];

    if (sessionContext?.contextualData.matchPhase) {
      factors.push(`match_phase_${sessionContext.contextualData.matchPhase}`);
    }

    if (sessionContext?.contextualData.scoreline) {
      factors.push('live_match_context');
    }

    if (query.includes('urgent') || query.includes('דחוף')) {
      factors.push('urgency_expressed');
    }

    if (sessionContext?.userPreferences.expertiseLevel) {
      factors.push(
        `expertise_${sessionContext.userPreferences.expertiseLevel}`
      );
    }

    return factors;
  }

  private isFormationReference(word: string): boolean {
    const formationPatterns =
      /^(\d-\d-\d|\d-\d-\d-\d|442|433|352|formation|מערך)$/i;
    return formationPatterns.test(word);
  }

  private isPositionReference(word: string): boolean {
    const positionTerms = [
      'goalkeeper',
      'defender',
      'midfielder',
      'forward',
      'winger',
      'striker',
      'שוער',
      'מגן',
      'קשר',
      'חלוץ',
      'אגף',
    ];
    return positionTerms.some(term =>
      word.toLowerCase().includes(term.toLowerCase())
    );
  }

  private translateToHebrew(term: string, category: string): string {
    const translations: Record<string, Record<string, string>> = {
      formation: {
        '4-4-2': '4-4-2',
        '4-3-3': '4-3-3',
        formation: 'מערך',
      },
      position: {
        goalkeeper: 'שוער',
        defender: 'מגן',
        midfielder: 'קשר',
        forward: 'חלוץ',
      },
    };

    return translations[category]?.[term] || term;
  }

  private calculateContextualRelevance(concept: any, query: string): number {
    // Simple relevance calculation based on term frequency and importance
    const termOccurrences = (
      query
        .toLowerCase()
        .match(new RegExp(concept.englishTerm.toLowerCase(), 'g')) || []
    ).length;
    const hebrewOccurrences = (
      query.match(new RegExp(concept.hebrewTerm, 'g')) || []
    ).length;

    const frequency =
      (termOccurrences + hebrewOccurrences) / query.split(' ').length;
    const importance = concept.tacticalSignificance?.importance || 0.5;

    return Math.min(1, frequency * 2 + importance * 0.5);
  }

  private calculateEntityConceptRelevance(
    entity: QueryEntity,
    concept: QueryConcept
  ): number {
    // Calculate relevance between entity and concept
    if (
      entity.type === EntityType.POSITION &&
      concept.category === ConceptCategory.PLAYER_ROLE
    ) {
      return 0.9;
    }

    if (
      entity.type === EntityType.TACTICAL_ROLE &&
      concept.category === ConceptCategory.TACTICAL_FORMATION
    ) {
      return 0.8;
    }

    return 0.5; // Default relevance
  }

  private mapIntentComplexityToScore(complexity: IntentComplexity): number {
    switch (complexity) {
      case IntentComplexity.SIMPLE:
        return 0.1;
      case IntentComplexity.MODERATE:
        return 0.3;
      case IntentComplexity.COMPLEX:
        return 0.5;
      case IntentComplexity.ADVANCED:
        return 0.7;
      case IntentComplexity.EXPERT:
        return 0.9;
      default:
        return 0.5;
    }
  }

  private mapSemanticComplexityToScore(complexity: QueryComplexity): number {
    switch (complexity) {
      case QueryComplexity.SIMPLE:
        return 0.1;
      case QueryComplexity.MODERATE:
        return 0.3;
      case QueryComplexity.COMPLEX:
        return 0.5;
      case QueryComplexity.ADVANCED:
        return 0.7;
      case QueryComplexity.EXPERT:
        return 0.9;
      default:
        return 0.5;
    }
  }

  /**
   * Get performance metrics for monitoring
   */
  public getPerformanceMetrics(): typeof this.performanceMetrics {
    return { ...this.performanceMetrics };
  }

  /**
   * Clear query cache
   */
  public clearCache(): void {
    this.queryCache.clear();
  }

  /**
   * Get cache statistics
   */
  public getCacheStatistics(): { size: number; hitRate: number } {
    return {
      size: this.queryCache.size,
      hitRate: this.performanceMetrics.cacheHitRate,
    };
  }
}
