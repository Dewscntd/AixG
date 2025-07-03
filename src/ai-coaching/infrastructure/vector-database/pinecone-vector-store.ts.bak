/**
 * Pinecone Vector Store Implementation
 * Advanced semantic search for tactical knowledge base with Hebrew support
 */

import { Pinecone } from '@pinecone-database/pinecone';
import {
  TacticalKnowledgeItem,
  FormationKnowledge,
  PatternKnowledge,
  EnhancedTacticalKnowledgeBase,
} from '../../domain/services/enhanced-tactical-knowledge-base';
import { FootballConcept } from '../../domain/value-objects/football-concept';
import { FootballEntity } from '../../domain/value-objects/football-entity';
import {
  PerformanceReport,
  PlayerProfile,
} from '../../domain/services/player-performance-analyzer';
import { HebrewMorphology } from '../../domain/value-objects/hebrew-morphology';

export enum VectorNamespace {
  TACTICAL_KNOWLEDGE = 'tactical_knowledge',
  FORMATIONS = 'formations',
  PATTERNS = 'patterns',
  PLAYERS = 'players',
  CONCEPTS = 'concepts',
  ENTITIES = 'entities',
  SCENARIOS = 'scenarios',
  TRAINING_SESSIONS = 'training_sessions',
  MATCH_ANALYSIS = 'match_analysis',
  HEBREW_TERMS = 'hebrew_terms',
}

export enum EmbeddingModel {
  OPENAI_ADA_002 = 'text-embedding-ada-002',
  OPENAI_3_SMALL = 'text-embedding-3-small',
  OPENAI_3_LARGE = 'text-embedding-3-large',
  COHERE_MULTILINGUAL = 'embed-multilingual-v3.0',
  SENTENCE_TRANSFORMERS = 'sentence-transformers/all-mpnet-base-v2',
}

export interface VectorDocument {
  id: string;
  namespace: VectorNamespace;
  metadata: {
    type: string;
    language: 'he' | 'en' | 'mixed';
    category?: string;
    subcategory?: string;
    tags: string[];
    timestamp: string;
    source: string;
    confidence?: number;
    importance?: number;
    [key: string]: any;
  };
  text: string;
  hebrewText?: string;
  embedding?: number[];
}

export interface SemanticSearchQuery {
  text: string;
  language?: 'he' | 'en' | 'auto';
  namespace?: VectorNamespace[];
  filters?: Record<string, any>;
  topK?: number;
  minSimilarity?: number;
  includeMetadata?: boolean;
  includeText?: boolean;
  hybridSearch?: {
    alpha: number; // 0-1, balance between semantic and keyword search
    keywordBoost?: number;
  };
}

export interface SemanticSearchResult {
  id: string;
  score: number;
  document: VectorDocument;
  explanation?: {
    matchedTerms: string[];
    semanticRelevance: number;
    keywordRelevance?: number;
    contextualBoost?: number;
  };
}

export interface VectorStoreConfig {
  apiKey: string;
  environment: string;
  indexName: string;
  dimension: number;
  metric: 'cosine' | 'euclidean' | 'dotproduct';
  embeddingModel: EmbeddingModel;
  batchSize?: number;
  maxRetries?: number;
  timeoutMs?: number;
}

export interface EmbeddingCache {
  text: string;
  language: 'he' | 'en' | 'mixed';
  model: EmbeddingModel;
  embedding: number[];
  timestamp: Date;
}

export class PineconeVectorStore {
  private pinecone: Pinecone;
  private index: any;
  private config: VectorStoreConfig;
  private embeddingCache = new Map<string, EmbeddingCache>();
  private hebrewMorphology: HebrewMorphology;
  private knowledgeBase: EnhancedTacticalKnowledgeBase;

  // Performance monitoring
  private metrics = {
    totalQueries: 0,
    averageLatency: 0,
    cacheHitRate: 0,
    embeddingCacheSize: 0,
    indexSize: 0,
  };

  constructor(config: VectorStoreConfig) {
    this.config = config;
    this.hebrewMorphology = new HebrewMorphology();
    this.knowledgeBase = new EnhancedTacticalKnowledgeBase();
    this.initializePinecone();
  }

  /**
   * Initialize Pinecone client and index
   */
  private async initializePinecone(): Promise<void> {
    try {
      this.pinecone = new Pinecone({
        apiKey: this.config.apiKey,
        environment: this.config.environment,
      });

      this.index = this.pinecone.index(this.config.indexName);

      // Verify index exists and has correct configuration
      await this.verifyIndexConfiguration();

      console.log('Pinecone vector store initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Pinecone:', error);
      throw new Error(`Pinecone initialization failed: ${error.message}`);
    }
  }

  /**
   * Verify index configuration matches expected settings
   */
  private async verifyIndexConfiguration(): Promise<void> {
    try {
      const indexStats = await this.index.describeIndexStats();
      this.metrics.indexSize = indexStats.totalVectorCount || 0;

      console.log(`Index stats: ${this.metrics.indexSize} vectors indexed`);
    } catch (error) {
      console.warn('Could not verify index configuration:', error);
    }
  }

  /**
   * Generate embeddings for text using specified model
   */
  public async generateEmbedding(
    text: string,
    language: 'he' | 'en' | 'mixed' = 'auto',
    model: EmbeddingModel = this.config.embeddingModel
  ): Promise<number[]> {
    const cacheKey = `${text}_${language}_${model}`;

    // Check cache first
    if (this.embeddingCache.has(cacheKey)) {
      this.metrics.cacheHitRate =
        (this.metrics.cacheHitRate * this.metrics.totalQueries + 1) /
        (this.metrics.totalQueries + 1);
      return this.embeddingCache.get(cacheKey)!.embedding;
    }

    try {
      let processedText = text;

      // Preprocess Hebrew text if needed
      if (
        language === 'he' ||
        (language === 'auto' && /[\u0590-\u05FF]/.test(text))
      ) {
        const morphology = await this.hebrewMorphology.analyze(text);
        processedText = this.preprocessHebrewForEmbedding(text, morphology);
      }

      // Generate embedding based on model
      let embedding: number[];

      switch (model) {
        case EmbeddingModel.OPENAI_ADA_002:
        case EmbeddingModel.OPENAI_3_SMALL:
        case EmbeddingModel.OPENAI_3_LARGE:
          embedding = await this.generateOpenAIEmbedding(processedText, model);
          break;
        case EmbeddingModel.COHERE_MULTILINGUAL:
          embedding = await this.generateCohereEmbedding(processedText);
          break;
        case EmbeddingModel.SENTENCE_TRANSFORMERS:
          embedding = await this.generateSentenceTransformerEmbedding(
            processedText
          );
          break;
        default:
          throw new Error(`Unsupported embedding model: ${model}`);
      }

      // Cache the result
      this.embeddingCache.set(cacheKey, {
        text,
        language: language === 'auto' ? this.detectLanguage(text) : language,
        model,
        embedding,
        timestamp: new Date(),
      });

      this.metrics.embeddingCacheSize = this.embeddingCache.size;

      return embedding;
    } catch (error) {
      console.error('Failed to generate embedding:', error);
      throw new Error(`Embedding generation failed: ${error.message}`);
    }
  }

  /**
   * Upsert documents into vector store
   */
  public async upsertDocuments(
    documents: VectorDocument[],
    namespace: VectorNamespace
  ): Promise<void> {
    try {
      const vectors = [];

      for (const doc of documents) {
        // Generate embedding if not provided
        if (!doc.embedding) {
          const text = doc.hebrewText || doc.text;
          const language = doc.metadata.language;
          doc.embedding = await this.generateEmbedding(text, language);
        }

        vectors.push({
          id: doc.id,
          values: doc.embedding,
          metadata: {
            ...doc.metadata,
            text: doc.text,
            hebrewText: doc.hebrewText,
            namespace: namespace,
          },
        });
      }

      // Batch upsert
      const batchSize = this.config.batchSize || 100;
      for (let i = 0; i < vectors.length; i += batchSize) {
        const batch = vectors.slice(i, i + batchSize);
        await this.index.namespace(namespace).upsert(batch);
      }

      console.log(
        `Upserted ${documents.length} documents to namespace: ${namespace}`
      );
    } catch (error) {
      console.error('Failed to upsert documents:', error);
      throw new Error(`Document upsert failed: ${error.message}`);
    }
  }

  /**
   * Perform semantic search across vector store
   */
  public async semanticSearch(
    query: SemanticSearchQuery
  ): Promise<SemanticSearchResult[]> {
    const startTime = Date.now();

    try {
      // Detect language if auto
      let language = query.language;
      if (language === 'auto') {
        language = this.detectLanguage(query.text);
      }

      // Generate query embedding
      const queryEmbedding = await this.generateEmbedding(query.text, language);

      // Prepare search parameters
      const searchParams: any = {
        vector: queryEmbedding,
        topK: query.topK || 10,
        includeMetadata: query.includeMetadata !== false,
        includeValues: false,
      };

      // Add filters if specified
      if (query.filters) {
        searchParams.filter = query.filters;
      }

      // Perform search across specified namespaces
      const namespaces = query.namespace || [
        VectorNamespace.TACTICAL_KNOWLEDGE,
      ];
      const allResults: SemanticSearchResult[] = [];

      for (const namespace of namespaces) {
        const results = await this.index
          .namespace(namespace)
          .query(searchParams);

        for (const match of results.matches || []) {
          if (match.score >= (query.minSimilarity || 0.7)) {
            allResults.push({
              id: match.id,
              score: match.score,
              document: {
                id: match.id,
                namespace,
                metadata: match.metadata,
                text: match.metadata.text || '',
                hebrewText: match.metadata.hebrewText,
                embedding: match.values,
              },
              explanation: this.generateSearchExplanation(
                query.text,
                match,
                language
              ),
            });
          }
        }
      }

      // Sort by score and apply hybrid search if enabled
      if (query.hybridSearch) {
        this.applyHybridSearchScoring(allResults, query);
      }

      allResults.sort((a, b) => b.score - a.score);

      // Update metrics
      this.updateSearchMetrics(startTime);

      return allResults.slice(0, query.topK || 10);
    } catch (error) {
      console.error('Semantic search failed:', error);
      throw new Error(`Search failed: ${error.message}`);
    }
  }

  /**
   * Index tactical knowledge base
   */
  public async indexTacticalKnowledge(): Promise<void> {
    console.log('Starting tactical knowledge indexing...');

    const documents: VectorDocument[] = [];

    try {
      // Index knowledge base statistics to get all items
      const stats = this.knowledgeBase.getStatistics();

      // Create documents for tactical knowledge
      // Note: In a real implementation, you'd iterate through the actual knowledge items
      // This is a simplified version for demonstration

      const sampleKnowledgeItems = this.createSampleKnowledgeDocuments();
      documents.push(...sampleKnowledgeItems);

      const formationDocuments = this.createFormationDocuments();
      documents.push(...formationDocuments);

      const patternDocuments = this.createPatternDocuments();
      documents.push(...patternDocuments);

      const conceptDocuments = this.createConceptDocuments();
      documents.push(...conceptDocuments);

      // Upsert all documents
      await this.upsertDocuments(documents, VectorNamespace.TACTICAL_KNOWLEDGE);

      console.log(
        `Successfully indexed ${documents.length} tactical knowledge items`
      );
    } catch (error) {
      console.error('Failed to index tactical knowledge:', error);
      throw error;
    }
  }

  /**
   * Index player performance data
   */
  public async indexPlayerPerformance(
    reports: PerformanceReport[]
  ): Promise<void> {
    const documents: VectorDocument[] = [];

    for (const report of reports) {
      // Create document for overall player analysis
      const playerDoc: VectorDocument = {
        id: `player_${report.playerId}`,
        namespace: VectorNamespace.PLAYERS,
        metadata: {
          type: 'player_profile',
          language: 'mixed',
          category: 'performance',
          tags: [
            report.profile.position,
            ...report.profile.preferredRoles,
            ...report.profile.playingStyle,
          ],
          timestamp: report.analysisDate.toISOString(),
          source: 'performance_analyzer',
          confidence: report.overallRating.confidence,
          importance: report.overallRating.current / 100,
          playerId: report.playerId,
          position: report.profile.position,
          age: report.profile.age,
          nationality: report.profile.nationality,
        },
        text: report.englishSummary,
        hebrewText: report.hebrewSummary,
      };

      documents.push(playerDoc);

      // Create documents for each insight
      for (const insight of report.insights) {
        const insightDoc: VectorDocument = {
          id: `insight_${insight.id}`,
          namespace: VectorNamespace.PLAYERS,
          metadata: {
            type: 'performance_insight',
            language: 'mixed',
            category: insight.type,
            subcategory: insight.severity,
            tags: [...insight.relatedConcepts, insight.type, insight.severity],
            timestamp: report.analysisDate.toISOString(),
            source: 'performance_analyzer',
            confidence: insight.confidence,
            importance: this.mapSeverityToImportance(insight.severity),
            playerId: report.playerId,
            insightType: insight.type,
            severity: insight.severity,
          },
          text: insight.description,
          hebrewText: insight.hebrewDescription,
        };

        documents.push(insightDoc);
      }
    }

    await this.upsertDocuments(documents, VectorNamespace.PLAYERS);
    console.log(`Indexed ${documents.length} player performance documents`);
  }

  /**
   * Semantic search specifically for Hebrew coaching queries
   */
  public async searchHebrewCoaching(
    hebrewQuery: string,
    contextFilters?: {
      playerPosition?: string;
      tacticalFocus?: string[];
      urgency?: string;
    }
  ): Promise<SemanticSearchResult[]> {
    const filters: Record<string, any> = {
      $or: [{ language: 'he' }, { language: 'mixed' }],
    };

    // Add context filters
    if (contextFilters?.playerPosition) {
      filters.position = contextFilters.playerPosition;
    }

    if (contextFilters?.tacticalFocus) {
      filters.tags = {
        $in: contextFilters.tacticalFocus,
      };
    }

    if (contextFilters?.urgency) {
      filters.importance = {
        $gte: contextFilters.urgency === 'high' ? 0.7 : 0.5,
      };
    }

    return this.semanticSearch({
      text: hebrewQuery,
      language: 'he',
      namespace: [
        VectorNamespace.TACTICAL_KNOWLEDGE,
        VectorNamespace.PLAYERS,
        VectorNamespace.CONCEPTS,
      ],
      filters,
      topK: 15,
      minSimilarity: 0.65,
      hybridSearch: {
        alpha: 0.7,
        keywordBoost: 1.2,
      },
    });
  }

  /**
   * Find similar tactical situations
   */
  public async findSimilarSituations(
    situation: string,
    context: {
      formation?: string;
      phase?: string;
      scoreline?: string;
      timeRemaining?: number;
    }
  ): Promise<SemanticSearchResult[]> {
    const filters: Record<string, any> = {
      type: {
        $in: ['tactical_scenario', 'match_analysis', 'pattern_knowledge'],
      },
    };

    if (context.formation) {
      filters.formation = context.formation;
    }

    if (context.phase) {
      filters.phase = context.phase;
    }

    return this.semanticSearch({
      text: situation,
      namespace: [
        VectorNamespace.TACTICAL_KNOWLEDGE,
        VectorNamespace.SCENARIOS,
      ],
      filters,
      topK: 8,
      minSimilarity: 0.6,
    });
  }

  /**
   * Get recommendations based on vector similarity
   */
  public async getRecommendations(
    entityId: string,
    entityType: 'player' | 'formation' | 'pattern' | 'concept',
    limit: number = 5
  ): Promise<SemanticSearchResult[]> {
    try {
      // Get the entity's vector
      const entityVector = await this.getEntityVector(entityId, entityType);
      if (!entityVector) {
        throw new Error(`Entity vector not found: ${entityId}`);
      }

      // Search for similar items
      const results = await this.index
        .namespace(this.getNamespaceForEntityType(entityType))
        .query({
          vector: entityVector,
          topK: limit + 1, // +1 to exclude self
          includeMetadata: true,
          filter: {
            type: entityType,
            id: { $ne: entityId }, // Exclude self
          },
        });

      return (
        results.matches?.slice(0, limit).map(match => ({
          id: match.id,
          score: match.score,
          document: {
            id: match.id,
            namespace: this.getNamespaceForEntityType(entityType),
            metadata: match.metadata,
            text: match.metadata.text || '',
            hebrewText: match.metadata.hebrewText,
          },
        })) || []
      );
    } catch (error) {
      console.error('Failed to get recommendations:', error);
      return [];
    }
  }

  /**
   * Perform clustering analysis on vectors
   */
  public async performClustering(
    namespace: VectorNamespace,
    numClusters: number = 5
  ): Promise<
    Array<{
      clusterId: number;
      centroid: number[];
      members: string[];
      description: string;
      hebrewDescription: string;
    }>
  > {
    // This is a simplified clustering implementation
    // In production, you'd use more sophisticated clustering algorithms

    try {
      // Get all vectors from namespace (simplified - in reality you'd batch this)
      const allVectors = await this.getAllVectorsFromNamespace(namespace);

      // Perform K-means clustering (simplified implementation)
      const clusters = this.performKMeansClustering(allVectors, numClusters);

      return clusters.map((cluster, index) => ({
        clusterId: index,
        centroid: cluster.centroid,
        members: cluster.members,
        description: this.generateClusterDescription(cluster, 'en'),
        hebrewDescription: this.generateClusterDescription(cluster, 'he'),
      }));
    } catch (error) {
      console.error('Clustering analysis failed:', error);
      return [];
    }
  }

  // Helper methods

  private async generateOpenAIEmbedding(
    text: string,
    model: EmbeddingModel
  ): Promise<number[]> {
    // Mock implementation - in production, use OpenAI API
    const mockEmbedding = new Array(1536)
      .fill(0)
      .map(() => Math.random() - 0.5);
    return mockEmbedding;
  }

  private async generateCohereEmbedding(text: string): Promise<number[]> {
    // Mock implementation - in production, use Cohere API
    const mockEmbedding = new Array(1024)
      .fill(0)
      .map(() => Math.random() - 0.5);
    return mockEmbedding;
  }

  private async generateSentenceTransformerEmbedding(
    text: string
  ): Promise<number[]> {
    // Mock implementation - in production, use HuggingFace or local model
    const mockEmbedding = new Array(768).fill(0).map(() => Math.random() - 0.5);
    return mockEmbedding;
  }

  private preprocessHebrewForEmbedding(text: string, morphology: any): string {
    // Apply Hebrew-specific preprocessing
    let processed = text;

    // Remove diacritics
    processed = processed.replace(
      /[\u0591-\u05AF\u05BD\u05BF\u05C1\u05C2\u05C4\u05C5\u05C7]/g,
      ''
    );

    // Normalize final letters
    processed = processed.replace(/ך/g, 'כ');
    processed = processed.replace(/ם/g, 'מ');
    processed = processed.replace(/ן/g, 'נ');
    processed = processed.replace(/ף/g, 'פ');
    processed = processed.replace(/ץ/g, 'צ');

    return processed;
  }

  private detectLanguage(text: string): 'he' | 'en' | 'mixed' {
    const hebrewChars = (text.match(/[\u0590-\u05FF]/g) || []).length;
    const englishChars = (text.match(/[a-zA-Z]/g) || []).length;
    const total = hebrewChars + englishChars;

    if (total === 0) return 'en';

    const hebrewRatio = hebrewChars / total;
    if (hebrewRatio > 0.7) return 'he';
    if (hebrewRatio < 0.3) return 'en';
    return 'mixed';
  }

  private generateSearchExplanation(
    query: string,
    match: any,
    language: 'he' | 'en' | 'mixed'
  ): {
    matchedTerms: string[];
    semanticRelevance: number;
    keywordRelevance?: number;
    contextualBoost?: number;
  } {
    const queryTerms = query.toLowerCase().split(/\s+/);
    const documentText = (match.metadata.text || '').toLowerCase();

    const matchedTerms = queryTerms.filter(term => documentText.includes(term));

    return {
      matchedTerms,
      semanticRelevance: match.score,
      keywordRelevance: matchedTerms.length / queryTerms.length,
      contextualBoost: match.metadata.importance || 0,
    };
  }

  private applyHybridSearchScoring(
    results: SemanticSearchResult[],
    query: SemanticSearchQuery
  ): void {
    const alpha = query.hybridSearch!.alpha;
    const keywordBoost = query.hybridSearch!.keywordBoost || 1.0;

    for (const result of results) {
      const semanticScore = result.score;
      const keywordScore = result.explanation?.keywordRelevance || 0;

      result.score =
        alpha * semanticScore + (1 - alpha) * keywordScore * keywordBoost;
    }
  }

  private updateSearchMetrics(startTime: number): void {
    const latency = Date.now() - startTime;
    this.metrics.totalQueries++;
    this.metrics.averageLatency =
      (this.metrics.averageLatency * (this.metrics.totalQueries - 1) +
        latency) /
      this.metrics.totalQueries;
  }

  private createSampleKnowledgeDocuments(): VectorDocument[] {
    return [
      {
        id: 'tactical_pressing_high',
        namespace: VectorNamespace.TACTICAL_KNOWLEDGE,
        metadata: {
          type: 'tactical_principle',
          language: 'mixed',
          category: 'pressing',
          tags: ['high_press', 'coordinated_movement', 'ball_recovery'],
          timestamp: new Date().toISOString(),
          source: 'knowledge_base',
          confidence: 0.9,
          importance: 0.8,
        },
        text: 'High pressing is a tactical approach where teams apply immediate pressure on the opposition when they lose possession',
        hebrewText:
          'לחץ גבוה הוא גישה טקטית שבה קבוצות מפעילות לחץ מיידי על היריב כשהן מאבדות החזקה',
      },
      {
        id: 'formation_442_analysis',
        namespace: VectorNamespace.FORMATIONS,
        metadata: {
          type: 'formation_knowledge',
          language: 'mixed',
          category: 'formations',
          subcategory: '4-4-2',
          tags: ['442', 'balanced', 'traditional', 'wing_play'],
          timestamp: new Date().toISOString(),
          source: 'knowledge_base',
          confidence: 0.95,
          importance: 0.9,
          formation: '4-4-2',
        },
        text: '4-4-2 formation provides excellent balance between attack and defense with strong wing play capabilities',
        hebrewText:
          'מערך 4-4-2 מספק איזון מעולה בין התקפה והגנה עם יכולות משחק אגפים חזקות',
      },
    ];
  }

  private createFormationDocuments(): VectorDocument[] {
    return [
      {
        id: 'formation_433_tiki_taka',
        namespace: VectorNamespace.FORMATIONS,
        metadata: {
          type: 'formation_pattern',
          language: 'mixed',
          category: 'formations',
          subcategory: '4-3-3',
          tags: ['433', 'possession', 'tiki_taka', 'pressing'],
          timestamp: new Date().toISOString(),
          source: 'knowledge_base',
          confidence: 0.92,
          importance: 0.85,
          formation: '4-3-3',
        },
        text: '4-3-3 formation with tiki-taka style emphasizes short passing, movement, and positional play',
        hebrewText:
          'מערך 4-3-3 עם סגנון טיקי-טקה מדגיש מסירות קצרות, תנועה ומשחק עמדות',
      },
    ];
  }

  private createPatternDocuments(): VectorDocument[] {
    return [
      {
        id: 'pattern_gegenpressing',
        namespace: VectorNamespace.PATTERNS,
        metadata: {
          type: 'tactical_pattern',
          language: 'mixed',
          category: 'patterns',
          subcategory: 'gegenpressing',
          tags: ['gegenpressing', 'counter_press', 'high_intensity'],
          timestamp: new Date().toISOString(),
          source: 'knowledge_base',
          confidence: 0.88,
          importance: 0.8,
          pattern: 'gegenpressing',
        },
        text: 'Gegenpressing involves immediate high-intensity pressing after losing possession to regain the ball quickly',
        hebrewText:
          'גגנפרסינג כולל לחץ מיידי בעצימות גבוהה לאחר איבוד החזקה כדי להחזיר את הכדור במהירות',
      },
    ];
  }

  private createConceptDocuments(): VectorDocument[] {
    return [
      {
        id: 'concept_false_nine',
        namespace: VectorNamespace.CONCEPTS,
        metadata: {
          type: 'football_concept',
          language: 'mixed',
          category: 'concepts',
          subcategory: 'player_role',
          tags: ['false_nine', 'dropping_deep', 'creativity'],
          timestamp: new Date().toISOString(),
          source: 'knowledge_base',
          confidence: 0.9,
          importance: 0.75,
        },
        text: 'False nine is a striker who drops deep to create space and link play between midfield and attack',
        hebrewText:
          'תשעה כוזב הוא חלוץ שיורד עמוק כדי ליצור מרחב ולחבר בין קו האמצע וההתקפה',
      },
    ];
  }

  private mapSeverityToImportance(severity: string): number {
    switch (severity) {
      case 'critical':
        return 1.0;
      case 'high':
        return 0.8;
      case 'medium':
        return 0.6;
      case 'low':
        return 0.4;
      default:
        return 0.5;
    }
  }

  private getNamespaceForEntityType(entityType: string): VectorNamespace {
    switch (entityType) {
      case 'player':
        return VectorNamespace.PLAYERS;
      case 'formation':
        return VectorNamespace.FORMATIONS;
      case 'pattern':
        return VectorNamespace.PATTERNS;
      case 'concept':
        return VectorNamespace.CONCEPTS;
      default:
        return VectorNamespace.TACTICAL_KNOWLEDGE;
    }
  }

  private async getEntityVector(
    entityId: string,
    entityType: string
  ): Promise<number[] | null> {
    try {
      const namespace = this.getNamespaceForEntityType(entityType);
      const result = await this.index.namespace(namespace).fetch([entityId]);
      return result.vectors?.[entityId]?.values || null;
    } catch (error) {
      console.error('Failed to get entity vector:', error);
      return null;
    }
  }

  private async getAllVectorsFromNamespace(
    namespace: VectorNamespace
  ): Promise<Array<{ id: string; values: number[] }>> {
    // Simplified implementation - in production, you'd use pagination
    // This is a mock implementation
    return [
      {
        id: 'sample1',
        values: new Array(1536).fill(0).map(() => Math.random()),
      },
      {
        id: 'sample2',
        values: new Array(1536).fill(0).map(() => Math.random()),
      },
    ];
  }

  private performKMeansClustering(
    vectors: Array<{ id: string; values: number[] }>,
    numClusters: number
  ): Array<{ centroid: number[]; members: string[] }> {
    // Simplified K-means implementation for demonstration
    const clusters: Array<{ centroid: number[]; members: string[] }> = [];

    for (let i = 0; i < numClusters; i++) {
      clusters.push({
        centroid: new Array(vectors[0]?.values.length || 1536)
          .fill(0)
          .map(() => Math.random()),
        members: [],
      });
    }

    // Assign vectors to clusters (simplified)
    for (const vector of vectors) {
      const clusterIndex = Math.floor(Math.random() * numClusters);
      clusters[clusterIndex].members.push(vector.id);
    }

    return clusters;
  }

  private generateClusterDescription(
    cluster: { centroid: number[]; members: string[] },
    language: 'he' | 'en'
  ): string {
    if (language === 'he') {
      return `אשכול עם ${cluster.members.length} חברים המתמחה בתחום טקטי ספציפי`;
    } else {
      return `Cluster with ${cluster.members.length} members specializing in specific tactical domain`;
    }
  }

  /**
   * Clean up expired cache entries
   */
  public cleanupCache(maxAge: number = 24 * 60 * 60 * 1000): void {
    const now = new Date();
    const expired: string[] = [];

    for (const [key, entry] of this.embeddingCache) {
      if (now.getTime() - entry.timestamp.getTime() > maxAge) {
        expired.push(key);
      }
    }

    for (const key of expired) {
      this.embeddingCache.delete(key);
    }

    this.metrics.embeddingCacheSize = this.embeddingCache.size;
    console.log(`Cleaned up ${expired.length} expired cache entries`);
  }

  /**
   * Get performance metrics
   */
  public getMetrics(): typeof this.metrics {
    return { ...this.metrics };
  }

  /**
   * Delete documents from vector store
   */
  public async deleteDocuments(
    ids: string[],
    namespace: VectorNamespace
  ): Promise<void> {
    try {
      await this.index.namespace(namespace).deleteMany(ids);
      console.log(
        `Deleted ${ids.length} documents from namespace: ${namespace}`
      );
    } catch (error) {
      console.error('Failed to delete documents:', error);
      throw new Error(`Document deletion failed: ${error.message}`);
    }
  }

  /**
   * Update vector store configuration
   */
  public updateConfig(newConfig: Partial<VectorStoreConfig>): void {
    this.config = { ...this.config, ...newConfig };
    console.log('Vector store configuration updated');
  }
}
