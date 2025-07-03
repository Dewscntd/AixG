/**
 * Vector Database Service
 * High-level service interface for semantic search and vector operations
 */

import {
  PineconeVectorStore,
  VectorNamespace,
  SemanticSearchQuery,
  SemanticSearchResult,
  VectorStoreConfig,
  EmbeddingModel,
} from './pinecone-vector-store';
import {
  TacticalQueryAnalysis,
  QueryAnalysisResult,
} from '../../domain/services/tactical-query-analysis';
import {
  EnhancedTacticalKnowledgeBase,
  TacticalKnowledgeItem,
} from '../../domain/services/enhanced-tactical-knowledge-base';
import {
  PlayerPerformanceAnalyzer,
  PerformanceReport,
} from '../../domain/services/player-performance-analyzer';
import { FootballConcept } from '../../domain/value-objects/football-concept';
import { FootballEntity } from '../../domain/value-objects/football-entity';

export enum SearchMode {
  SEMANTIC_ONLY = 'semantic_only',
  HYBRID = 'hybrid',
  KEYWORD_ENHANCED = 'keyword_enhanced',
  CONTEXTUAL = 'contextual',
}

export enum IndexingPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export interface VectorSearchOptions {
  mode: SearchMode;
  language?: 'he' | 'en' | 'auto';
  context?: {
    userId?: string;
    teamId?: string;
    matchId?: string;
    sessionId?: string;
    userExpertise?: 'beginner' | 'intermediate' | 'advanced' | 'professional';
    urgency?: 'low' | 'medium' | 'high' | 'critical';
  };
  filters?: {
    dateRange?: { start: Date; end: Date };
    categories?: string[];
    sources?: string[];
    minConfidence?: number;
    maxResults?: number;
  };
  personalization?: {
    userPreferences?: string[];
    recentQueries?: string[];
    favoriteTopics?: string[];
  };
}

export interface EnhancedSearchResult extends SemanticSearchResult {
  relevanceFactors: {
    semanticMatch: number;
    contextualRelevance: number;
    personalizedScore: number;
    recencyBoost: number;
    authorityScore: number;
  };
  actionableInsights?: Array<{
    action: string;
    hebrewAction: string;
    priority: 'low' | 'medium' | 'high' | 'critical';
    confidence: number;
    resources?: string[];
  }>;
  relatedQueries?: string[];
  hebrewRelatedQueries?: string[];
}

export interface IndexingJob {
  id: string;
  type:
    | 'tactical_knowledge'
    | 'player_performance'
    | 'match_analysis'
    | 'training_sessions';
  priority: IndexingPriority;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  progress: number; // 0-100
  itemsTotal: number;
  itemsProcessed: number;
  startTime?: Date;
  completionTime?: Date;
  errorMessage?: string;
  metadata: Record<string, any>;
}

export interface VectorDatabaseStats {
  totalVectors: number;
  namespaceStats: Record<
    VectorNamespace,
    {
      count: number;
      lastUpdated: Date;
      averageConfidence: number;
    }
  >;
  searchStats: {
    totalQueries: number;
    averageLatency: number;
    cacheHitRate: number;
    popularQueries: Array<{
      query: string;
      frequency: number;
      averageResults: number;
    }>;
  };
  indexingStats: {
    totalJobs: number;
    successRate: number;
    averageProcessingTime: number;
    queueLength: number;
  };
}

export class VectorDatabaseService {
  private vectorStore: PineconeVectorStore;
  private queryAnalyzer: TacticalQueryAnalysis;
  private knowledgeBase: EnhancedTacticalKnowledgeBase;
  private performanceAnalyzer: PlayerPerformanceAnalyzer;

  // Job queue and processing
  private indexingQueue: IndexingJob[] = [];
  private currentJobs = new Map<string, IndexingJob>();
  private jobHistory: IndexingJob[] = [];

  // Search analytics
  private searchHistory: Array<{
    query: string;
    results: number;
    timestamp: Date;
    latency: number;
    language: string;
  }> = [];

  // Performance monitoring
  private stats: VectorDatabaseStats = {
    totalVectors: 0,
    namespaceStats: {} as any,
    searchStats: {
      totalQueries: 0,
      averageLatency: 0,
      cacheHitRate: 0,
      popularQueries: [],
    },
    indexingStats: {
      totalJobs: 0,
      successRate: 0,
      averageProcessingTime: 0,
      queueLength: 0,
    },
  };

  constructor(config: VectorStoreConfig) {
    this.vectorStore = new PineconeVectorStore(config);
    this.queryAnalyzer = new TacticalQueryAnalysis();
    this.knowledgeBase = new EnhancedTacticalKnowledgeBase();
    this.performanceAnalyzer = new PlayerPerformanceAnalyzer();

    // Start background job processor
    this.startJobProcessor();
  }

  /**
   * Enhanced semantic search with contextual understanding
   */
  public async enhancedSearch(
    query: string,
    options: VectorSearchOptions
  ): Promise<EnhancedSearchResult[]> {
    const startTime = Date.now();

    try {
      // Analyze query for better understanding
      const queryAnalysis = await this.queryAnalyzer.analyzeQuery(
        query,
        undefined,
        {
          useCache: true,
          skipSemanticAnalysis: false,
        }
      );

      // Enhance search parameters based on analysis
      const searchParams = this.buildSearchParameters(
        query,
        queryAnalysis,
        options
      );

      // Perform semantic search
      const baseResults = await this.vectorStore.semanticSearch(searchParams);

      // Enhance results with additional intelligence
      const enhancedResults = await this.enhanceSearchResults(
        baseResults,
        queryAnalysis,
        options
      );

      // Apply personalization if enabled
      if (options.personalization) {
        this.applyPersonalization(enhancedResults, options.personalization);
      }

      // Record search analytics
      this.recordSearchAnalytics(
        query,
        enhancedResults.length,
        Date.now() - startTime,
        options.language || 'auto'
      );

      return enhancedResults;
    } catch (error) {
      console.error('Enhanced search failed:', error);
      throw new Error(`Search failed: ${error.message}`);
    }
  }

  /**
   * Hebrew-specific coaching search with cultural context
   */
  public async searchHebrewCoaching(
    hebrewQuery: string,
    coachingContext?: {
      playerLevel?: 'youth' | 'amateur' | 'professional';
      tacticalFocus?: string[];
      sessionType?: 'training' | 'match_preparation' | 'analysis';
      urgency?: 'low' | 'medium' | 'high' | 'critical';
    }
  ): Promise<EnhancedSearchResult[]> {
    const options: VectorSearchOptions = {
      mode: SearchMode.CONTEXTUAL,
      language: 'he',
      context: {
        urgency: coachingContext?.urgency,
      },
      filters: {
        categories: coachingContext?.tacticalFocus,
        maxResults: 12,
      },
    };

    // Add Hebrew-specific contextual filters
    const contextFilters = {
      playerPosition: undefined, // Could be extracted from query analysis
      tacticalFocus: coachingContext?.tacticalFocus,
      urgency: coachingContext?.urgency,
    };

    // Use Hebrew-optimized search
    const results = await this.vectorStore.searchHebrewCoaching(
      hebrewQuery,
      contextFilters
    );

    // Convert to enhanced results format
    const enhancedResults: EnhancedSearchResult[] = results.map(result => ({
      ...result,
      relevanceFactors: {
        semanticMatch: result.score,
        contextualRelevance: this.calculateContextualRelevance(
          result,
          coachingContext
        ),
        personalizedScore: 0.8, // Base score for Hebrew coaching
        recencyBoost: this.calculateRecencyBoost(result),
        authorityScore: result.document.metadata.confidence || 0.7,
      },
      actionableInsights: this.generateActionableInsights(result, 'he'),
      relatedQueries: this.generateRelatedQueries(result, 'en'),
      hebrewRelatedQueries: this.generateRelatedQueries(result, 'he'),
    }));

    return enhancedResults;
  }

  /**
   * Find tactical patterns and similar situations
   */
  public async findTacticalPatterns(
    situation: string,
    matchContext: {
      formation?: string;
      phase?: string;
      scoreline?: string;
      timeRemaining?: number;
      opposition?: string;
    }
  ): Promise<{
    similarSituations: EnhancedSearchResult[];
    recommendedPatterns: EnhancedSearchResult[];
    historicalExamples: EnhancedSearchResult[];
  }> {
    // Find similar situations
    const similarSituations = await this.vectorStore.findSimilarSituations(
      situation,
      matchContext
    );

    // Search for recommended patterns
    const patternQuery: SemanticSearchQuery = {
      text: `tactical pattern ${situation} ${matchContext.formation || ''} ${
        matchContext.phase || ''
      }`,
      namespace: [VectorNamespace.PATTERNS, VectorNamespace.TACTICAL_KNOWLEDGE],
      topK: 8,
      minSimilarity: 0.65,
    };
    const patterns = await this.vectorStore.semanticSearch(patternQuery);

    // Search for historical examples
    const historicalQuery: SemanticSearchQuery = {
      text: `match analysis ${situation} examples`,
      namespace: [VectorNamespace.MATCH_ANALYSIS, VectorNamespace.SCENARIOS],
      filters: {
        type: { $in: ['match_analysis', 'historical_example'] },
      },
      topK: 6,
    };
    const historical = await this.vectorStore.semanticSearch(historicalQuery);

    return {
      similarSituations: await this.enhanceSearchResults(
        similarSituations,
        undefined,
        { mode: SearchMode.CONTEXTUAL }
      ),
      recommendedPatterns: await this.enhanceSearchResults(
        patterns,
        undefined,
        { mode: SearchMode.CONTEXTUAL }
      ),
      historicalExamples: await this.enhanceSearchResults(
        historical,
        undefined,
        { mode: SearchMode.CONTEXTUAL }
      ),
    };
  }

  /**
   * Get personalized recommendations based on user profile
   */
  public async getPersonalizedRecommendations(
    userId: string,
    context: {
      recentActivity?: string[];
      preferences?: string[];
      expertiseLevel?: string;
      currentFocus?: string[];
    }
  ): Promise<{
    tacticalInsights: EnhancedSearchResult[];
    playerDevelopment: EnhancedSearchResult[];
    formationAdvice: EnhancedSearchResult[];
    trainingRecommendations: EnhancedSearchResult[];
  }> {
    const baseQuery = this.buildPersonalizedQuery(context);

    // Get tactical insights
    const tacticalQuery: SemanticSearchQuery = {
      text: `${baseQuery} tactical insights coaching advice`,
      namespace: [VectorNamespace.TACTICAL_KNOWLEDGE, VectorNamespace.CONCEPTS],
      topK: 8,
      filters: {
        importance: { $gte: 0.6 },
      },
    };
    const tacticalInsights = await this.vectorStore.semanticSearch(
      tacticalQuery
    );

    // Get player development recommendations
    const playerQuery: SemanticSearchQuery = {
      text: `${baseQuery} player development training improvement`,
      namespace: [VectorNamespace.PLAYERS, VectorNamespace.TRAINING_SESSIONS],
      topK: 6,
    };
    const playerDevelopment = await this.vectorStore.semanticSearch(
      playerQuery
    );

    // Get formation advice
    const formationQuery: SemanticSearchQuery = {
      text: `${baseQuery} formation analysis tactical setup`,
      namespace: [
        VectorNamespace.FORMATIONS,
        VectorNamespace.TACTICAL_KNOWLEDGE,
      ],
      topK: 5,
    };
    const formationAdvice = await this.vectorStore.semanticSearch(
      formationQuery
    );

    // Get training recommendations
    const trainingQuery: SemanticSearchQuery = {
      text: `${baseQuery} training methods exercises drills`,
      namespace: [
        VectorNamespace.TRAINING_SESSIONS,
        VectorNamespace.TACTICAL_KNOWLEDGE,
      ],
      topK: 7,
    };
    const trainingRecommendations = await this.vectorStore.semanticSearch(
      trainingQuery
    );

    const options: VectorSearchOptions = {
      mode: SearchMode.CONTEXTUAL,
      context: { userId },
      personalization: {
        userPreferences: context.preferences,
        favoriteTopics: context.currentFocus,
      },
    };

    return {
      tacticalInsights: await this.enhanceSearchResults(
        tacticalInsights,
        undefined,
        options
      ),
      playerDevelopment: await this.enhanceSearchResults(
        playerDevelopment,
        undefined,
        options
      ),
      formationAdvice: await this.enhanceSearchResults(
        formationAdvice,
        undefined,
        options
      ),
      trainingRecommendations: await this.enhanceSearchResults(
        trainingRecommendations,
        undefined,
        options
      ),
    };
  }

  /**
   * Queue indexing job for background processing
   */
  public async queueIndexingJob(
    type: IndexingJob['type'],
    data: any,
    priority: IndexingPriority = IndexingPriority.MEDIUM
  ): Promise<string> {
    const job: IndexingJob = {
      id: `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      priority,
      status: 'pending',
      progress: 0,
      itemsTotal: this.estimateItemCount(type, data),
      itemsProcessed: 0,
      metadata: data,
    };

    // Insert job based on priority
    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    const insertIndex = this.indexingQueue.findIndex(
      existing => priorityOrder[existing.priority] > priorityOrder[priority]
    );

    if (insertIndex === -1) {
      this.indexingQueue.push(job);
    } else {
      this.indexingQueue.splice(insertIndex, 0, job);
    }

    this.stats.indexingStats.queueLength = this.indexingQueue.length;
    console.log(`Queued indexing job: ${job.id} (${type})`);

    return job.id;
  }

  /**
   * Get job status and progress
   */
  public getJobStatus(jobId: string): IndexingJob | null {
    return (
      this.currentJobs.get(jobId) ||
      this.indexingQueue.find(job => job.id === jobId) ||
      this.jobHistory.find(job => job.id === jobId) ||
      null
    );
  }

  /**
   * Perform clustering analysis on knowledge domains
   */
  public async performKnowledgeClustering(
    domain: 'tactical' | 'players' | 'formations' | 'patterns',
    numClusters: number = 5
  ): Promise<
    Array<{
      clusterId: number;
      description: string;
      hebrewDescription: string;
      members: string[];
      insights: string[];
    }>
  > {
    const namespace = this.getNamespaceForDomain(domain);
    const clusters = await this.vectorStore.performClustering(
      namespace,
      numClusters
    );

    return clusters.map(cluster => ({
      clusterId: cluster.clusterId,
      description: cluster.description,
      hebrewDescription: cluster.hebrewDescription,
      members: cluster.members,
      insights: this.generateClusterInsights(cluster, domain),
    }));
  }

  /**
   * Get comprehensive database statistics
   */
  public async getDatabaseStats(): Promise<VectorDatabaseStats> {
    const vectorMetrics = this.vectorStore.getMetrics();

    // Update search stats
    this.stats.searchStats.totalQueries = vectorMetrics.totalQueries;
    this.stats.searchStats.averageLatency = vectorMetrics.averageLatency;
    this.stats.searchStats.cacheHitRate = vectorMetrics.cacheHitRate;

    // Calculate popular queries
    this.stats.searchStats.popularQueries = this.calculatePopularQueries();

    // Update indexing stats
    this.stats.indexingStats.queueLength = this.indexingQueue.length;
    this.stats.indexingStats.totalJobs =
      this.jobHistory.length +
      this.currentJobs.size +
      this.indexingQueue.length;
    this.stats.indexingStats.successRate = this.calculateJobSuccessRate();

    return { ...this.stats };
  }

  // Helper methods

  private buildSearchParameters(
    query: string,
    analysis: QueryAnalysisResult | undefined,
    options: VectorSearchOptions
  ): SemanticSearchQuery {
    const params: SemanticSearchQuery = {
      text: query,
      language: options.language,
      topK: options.filters?.maxResults || 10,
      minSimilarity: 0.65,
      includeMetadata: true,
    };

    // Add namespace filtering based on query analysis
    if (analysis) {
      params.namespace = this.selectOptimalNamespaces(analysis);
    }

    // Add filters
    if (options.filters) {
      params.filters = this.buildVectorFilters(options.filters);
    }

    // Configure hybrid search based on mode
    if (
      options.mode === SearchMode.HYBRID ||
      options.mode === SearchMode.KEYWORD_ENHANCED
    ) {
      params.hybridSearch = {
        alpha: options.mode === SearchMode.HYBRID ? 0.7 : 0.8,
        keywordBoost: 1.2,
      };
    }

    return params;
  }

  private async enhanceSearchResults(
    results: SemanticSearchResult[],
    analysis: QueryAnalysisResult | undefined,
    options: VectorSearchOptions
  ): Promise<EnhancedSearchResult[]> {
    const enhanced: EnhancedSearchResult[] = [];

    for (const result of results) {
      const relevanceFactors = {
        semanticMatch: result.score,
        contextualRelevance: this.calculateContextualRelevance(
          result,
          options.context
        ),
        personalizedScore: this.calculatePersonalizedScore(
          result,
          options.personalization
        ),
        recencyBoost: this.calculateRecencyBoost(result),
        authorityScore: result.document.metadata.confidence || 0.7,
      };

      const actionableInsights = this.generateActionableInsights(
        result,
        options.language || 'en'
      );
      const relatedQueries = this.generateRelatedQueries(result, 'en');
      const hebrewRelatedQueries = this.generateRelatedQueries(result, 'he');

      enhanced.push({
        ...result,
        relevanceFactors,
        actionableInsights,
        relatedQueries,
        hebrewRelatedQueries,
      });
    }

    return enhanced;
  }

  private selectOptimalNamespaces(
    analysis: QueryAnalysisResult
  ): VectorNamespace[] {
    const namespaces: VectorNamespace[] = [];

    // Add namespaces based on query type and entities
    switch (analysis.queryType) {
      case 'formation_analysis':
        namespaces.push(
          VectorNamespace.FORMATIONS,
          VectorNamespace.TACTICAL_KNOWLEDGE
        );
        break;
      case 'player_assessment':
        namespaces.push(VectorNamespace.PLAYERS, VectorNamespace.CONCEPTS);
        break;
      case 'tactical_question':
        namespaces.push(
          VectorNamespace.TACTICAL_KNOWLEDGE,
          VectorNamespace.PATTERNS
        );
        break;
      default:
        namespaces.push(VectorNamespace.TACTICAL_KNOWLEDGE);
    }

    // Add concept namespace if semantic analysis found concepts
    if (analysis.semantics.concepts.length > 0) {
      namespaces.push(VectorNamespace.CONCEPTS);
    }

    return Array.from(new Set(namespaces)); // Remove duplicates
  }

  private buildVectorFilters(
    filters: VectorSearchOptions['filters']
  ): Record<string, any> {
    const vectorFilters: Record<string, any> = {};

    if (filters?.dateRange) {
      vectorFilters.timestamp = {
        $gte: filters.dateRange.start.toISOString(),
        $lte: filters.dateRange.end.toISOString(),
      };
    }

    if (filters?.categories) {
      vectorFilters.category = { $in: filters.categories };
    }

    if (filters?.sources) {
      vectorFilters.source = { $in: filters.sources };
    }

    if (filters?.minConfidence) {
      vectorFilters.confidence = { $gte: filters.minConfidence };
    }

    return vectorFilters;
  }

  private calculateContextualRelevance(
    result: SemanticSearchResult,
    context?: VectorSearchOptions['context']
  ): number {
    let relevance = 0.5; // Base relevance

    if (!context) return relevance;

    // Boost based on urgency match
    if (context.urgency && result.document.metadata.importance) {
      const urgencyMap = { low: 0.3, medium: 0.6, high: 0.8, critical: 1.0 };
      const urgencyScore = urgencyMap[context.urgency];
      if (result.document.metadata.importance >= urgencyScore) {
        relevance += 0.2;
      }
    }

    // Boost based on expertise level
    if (context.userExpertise) {
      const complexity = result.document.metadata.complexity;
      if (complexity === context.userExpertise) {
        relevance += 0.3;
      }
    }

    return Math.min(1.0, relevance);
  }

  private calculatePersonalizedScore(
    result: SemanticSearchResult,
    personalization?: VectorSearchOptions['personalization']
  ): number {
    let score = 0.5; // Base score

    if (!personalization) return score;

    // Check user preferences
    if (personalization.userPreferences) {
      const tags = result.document.metadata.tags || [];
      const matches = tags.filter(tag =>
        personalization.userPreferences!.some(pref =>
          tag.toLowerCase().includes(pref.toLowerCase())
        )
      ).length;
      score += (matches / Math.max(tags.length, 1)) * 0.3;
    }

    // Check favorite topics
    if (personalization.favoriteTopics) {
      const category = result.document.metadata.category;
      if (personalization.favoriteTopics.includes(category)) {
        score += 0.2;
      }
    }

    return Math.min(1.0, score);
  }

  private calculateRecencyBoost(result: SemanticSearchResult): number {
    const timestamp = result.document.metadata.timestamp;
    if (!timestamp) return 0.5;

    const age = Date.now() - new Date(timestamp).getTime();
    const maxAge = 365 * 24 * 60 * 60 * 1000; // 1 year

    return Math.max(0.1, 1.0 - age / maxAge);
  }

  private generateActionableInsights(
    result: SemanticSearchResult,
    language: string
  ): Array<{
    action: string;
    hebrewAction: string;
    priority: 'low' | 'medium' | 'high' | 'critical';
    confidence: number;
    resources?: string[];
  }> {
    const type = result.document.metadata.type;
    const insights: Array<{
      action: string;
      hebrewAction: string;
      priority: 'low' | 'medium' | 'high' | 'critical';
      confidence: number;
      resources?: string[];
    }> = [];

    if (type === 'tactical_principle') {
      insights.push({
        action: 'Apply this principle in next training session',
        hebrewAction: 'יישם עקרון זה באימון הבא',
        priority: 'medium',
        confidence: 0.8,
        resources: ['training_ground', 'tactical_board'],
      });
    }

    if (type === 'formation_knowledge') {
      insights.push({
        action: 'Analyze current formation compatibility',
        hebrewAction: 'נתח התאמת המערך הנוכחי',
        priority: 'high',
        confidence: 0.9,
        resources: ['formation_analyzer', 'player_data'],
      });
    }

    return insights;
  }

  private generateRelatedQueries(
    result: SemanticSearchResult,
    language: 'he' | 'en'
  ): string[] {
    const category = result.document.metadata.category;
    const tags = result.document.metadata.tags || [];

    const relatedQueries: string[] = [];

    if (language === 'he') {
      if (category === 'formations') {
        relatedQueries.push(
          'איך לשפר את המערך?',
          'חולשות במערך הנוכחי',
          'מערכים אלטרנטיביים'
        );
      }
      if (category === 'patterns') {
        relatedQueries.push(
          'דוגמאות למערך זה',
          'אימון על התבנית',
          'נגדים טקטיים'
        );
      }
    } else {
      if (category === 'formations') {
        relatedQueries.push(
          'How to improve this formation?',
          'Formation weaknesses',
          'Alternative formations'
        );
      }
      if (category === 'patterns') {
        relatedQueries.push(
          'Examples of this pattern',
          'Training this pattern',
          'Tactical counters'
        );
      }
    }

    return relatedQueries.slice(0, 3); // Limit to 3 suggestions
  }

  private buildPersonalizedQuery(context: {
    recentActivity?: string[];
    preferences?: string[];
    expertiseLevel?: string;
    currentFocus?: string[];
  }): string {
    const components: string[] = [];

    if (context.preferences) {
      components.push(...context.preferences);
    }

    if (context.currentFocus) {
      components.push(...context.currentFocus);
    }

    if (context.expertiseLevel) {
      components.push(context.expertiseLevel);
    }

    return components.join(' ');
  }

  private getNamespaceForDomain(domain: string): VectorNamespace {
    switch (domain) {
      case 'tactical':
        return VectorNamespace.TACTICAL_KNOWLEDGE;
      case 'players':
        return VectorNamespace.PLAYERS;
      case 'formations':
        return VectorNamespace.FORMATIONS;
      case 'patterns':
        return VectorNamespace.PATTERNS;
      default:
        return VectorNamespace.TACTICAL_KNOWLEDGE;
    }
  }

  private generateClusterInsights(cluster: any, domain: string): string[] {
    const insights: string[] = [];

    insights.push(`Cluster contains ${cluster.members.length} related items`);
    insights.push(`Primary focus area: ${domain}`);
    insights.push('Items show strong semantic similarity');

    return insights;
  }

  private estimateItemCount(type: IndexingJob['type'], data: any): number {
    switch (type) {
      case 'tactical_knowledge':
        return 500; // Estimated
      case 'player_performance':
        return Array.isArray(data) ? data.length : 1;
      case 'match_analysis':
        return Array.isArray(data) ? data.length : 1;
      case 'training_sessions':
        return Array.isArray(data) ? data.length : 10;
      default:
        return 1;
    }
  }

  private calculatePopularQueries(): Array<{
    query: string;
    frequency: number;
    averageResults: number;
  }> {
    const queryCount = new Map<
      string,
      { count: number; totalResults: number }
    >();

    for (const search of this.searchHistory) {
      const existing = queryCount.get(search.query) || {
        count: 0,
        totalResults: 0,
      };
      existing.count++;
      existing.totalResults += search.results;
      queryCount.set(search.query, existing);
    }

    return Array.from(queryCount.entries())
      .map(([query, stats]) => ({
        query,
        frequency: stats.count,
        averageResults: stats.totalResults / stats.count,
      }))
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, 10);
  }

  private calculateJobSuccessRate(): number {
    const completedJobs = this.jobHistory.filter(
      job => job.status === 'completed'
    ).length;
    const totalJobs = this.jobHistory.length;
    return totalJobs > 0 ? completedJobs / totalJobs : 1.0;
  }

  private recordSearchAnalytics(
    query: string,
    results: number,
    latency: number,
    language: string
  ): void {
    this.searchHistory.push({
      query,
      results,
      timestamp: new Date(),
      latency,
      language,
    });

    // Keep only recent searches (last 1000)
    if (this.searchHistory.length > 1000) {
      this.searchHistory = this.searchHistory.slice(-1000);
    }
  }

  private applyPersonalization(
    results: EnhancedSearchResult[],
    personalization: VectorSearchOptions['personalization']
  ): void {
    // Boost scores based on personalization factors
    for (const result of results) {
      let boost = 1.0;

      if (personalization?.userPreferences) {
        const tags = result.document.metadata.tags || [];
        const matches = tags.filter(tag =>
          personalization.userPreferences!.some(pref =>
            tag.toLowerCase().includes(pref.toLowerCase())
          )
        ).length;
        if (matches > 0) {
          boost += 0.2;
        }
      }

      // Apply boost to score
      result.score *= boost;
      result.relevanceFactors.personalizedScore *= boost;
    }

    // Re-sort by adjusted scores
    results.sort((a, b) => b.score - a.score);
  }

  /**
   * Background job processor
   */
  private startJobProcessor(): void {
    setInterval(async () => {
      if (this.indexingQueue.length > 0 && this.currentJobs.size < 2) {
        // Limit concurrent jobs
        const job = this.indexingQueue.shift()!;
        this.currentJobs.set(job.id, job);

        try {
          await this.processIndexingJob(job);
        } catch (error) {
          console.error(`Job ${job.id} failed:`, error);
          job.status = 'failed';
          job.errorMessage = error.message;
        } finally {
          this.currentJobs.delete(job.id);
          this.jobHistory.push(job);

          // Keep job history manageable
          if (this.jobHistory.length > 100) {
            this.jobHistory = this.jobHistory.slice(-100);
          }
        }
      }
    }, 5000); // Check every 5 seconds
  }

  private async processIndexingJob(job: IndexingJob): Promise<void> {
    job.status = 'in_progress';
    job.startTime = new Date();

    switch (job.type) {
      case 'tactical_knowledge':
        await this.vectorStore.indexTacticalKnowledge();
        break;
      case 'player_performance':
        await this.vectorStore.indexPlayerPerformance(job.metadata);
        break;
      default:
        throw new Error(`Unknown job type: ${job.type}`);
    }

    job.status = 'completed';
    job.completionTime = new Date();
    job.progress = 100;
    job.itemsProcessed = job.itemsTotal;
  }

  /**
   * Cleanup and maintenance operations
   */
  public async performMaintenance(): Promise<void> {
    console.log('Starting vector database maintenance...');

    // Clean up embedding cache
    this.vectorStore.cleanupCache();

    // Update statistics
    await this.getDatabaseStats();

    console.log('Maintenance completed');
  }

  /**
   * Export search analytics for analysis
   */
  public exportSearchAnalytics(): {
    searches: typeof this.searchHistory;
    stats: VectorDatabaseStats;
    jobHistory: IndexingJob[];
  } {
    return {
      searches: [...this.searchHistory],
      stats: { ...this.stats },
      jobHistory: [...this.jobHistory],
    };
  }
}
