/**
 * LLM Orchestration Service
 * Multi-model routing and coordination for Hebrew coaching with advanced intelligence
 */

import {
  TacticalQueryAnalysis,
  QueryAnalysisResult,
} from '../../domain/services/tactical-query-analysis';
import {
  VectorDatabaseService,
  EnhancedSearchResult,
} from '../vector-database/vector-database-service';
import { EnhancedTacticalKnowledgeBase } from '../../domain/services/enhanced-tactical-knowledge-base';
import {
  PlayerPerformanceAnalyzer,
  PerformanceReport,
} from '../../domain/services/player-performance-analyzer';
import { HebrewMorphology } from '../../domain/value-objects/hebrew-morphology';

export enum LLMProvider {
  OPENAI_GPT4 = 'openai_gpt4',
  OPENAI_GPT4_TURBO = 'openai_gpt4_turbo',
  ANTHROPIC_CLAUDE = 'anthropic_claude',
  COHERE_COMMAND = 'cohere_command',
  GOOGLE_PALM = 'google_palm',
  AZURE_OPENAI = 'azure_openai',
  HUGGINGFACE_INFERENCE = 'huggingface_inference',
  LOCAL_LLAMA = 'local_llama',
}

export enum ModelCapability {
  HEBREW_NATIVE = 'hebrew_native',
  MULTILINGUAL = 'multilingual',
  TACTICAL_REASONING = 'tactical_reasoning',
  LONG_CONTEXT = 'long_context',
  FUNCTION_CALLING = 'function_calling',
  STRUCTURED_OUTPUT = 'structured_output',
  CODE_GENERATION = 'code_generation',
  REAL_TIME = 'real_time',
  COST_EFFICIENT = 'cost_efficient',
  HIGH_ACCURACY = 'high_accuracy',
}

export enum CoachingTaskType {
  TACTICAL_ANALYSIS = 'tactical_analysis',
  PLAYER_DEVELOPMENT = 'player_development',
  FORMATION_ADVICE = 'formation_advice',
  MATCH_PREPARATION = 'match_preparation',
  PERFORMANCE_REVIEW = 'performance_review',
  TRAINING_PLANNING = 'training_planning',
  STRATEGIC_CONSULTING = 'strategic_consulting',
  REAL_TIME_COACHING = 'real_time_coaching',
  HEBREW_EXPLANATION = 'hebrew_explanation',
  CONCEPT_TEACHING = 'concept_teaching',
}

export enum ResponseFormat {
  CONVERSATIONAL = 'conversational',
  STRUCTURED_ANALYSIS = 'structured_analysis',
  STEP_BY_STEP = 'step_by_step',
  BULLET_POINTS = 'bullet_points',
  DETAILED_REPORT = 'detailed_report',
  QUICK_TIPS = 'quick_tips',
  HEBREW_NARRATIVE = 'hebrew_narrative',
  BILINGUAL = 'bilingual',
}

export interface LLMModelConfig {
  provider: LLMProvider;
  modelName: string;
  capabilities: ModelCapability[];
  maxTokens: number;
  contextWindow: number;
  costPerToken: number;
  hebrewAccuracy: number; // 0-1
  tacticalReasoningScore: number; // 0-1
  latency: number; // average ms
  reliability: number; // 0-1
  specializations: CoachingTaskType[];
  apiEndpoint?: string;
  apiKey?: string;
  customPromptTemplate?: string;
}

export interface CoachingRequest {
  query: string;
  language: 'he' | 'en' | 'mixed' | 'auto';
  taskType: CoachingTaskType;
  context: {
    userId?: string;
    teamId?: string;
    matchId?: string;
    sessionId?: string;
    playerIds?: string[];
    formationContext?: string;
    matchPhase?: string;
    urgency?: 'low' | 'medium' | 'high' | 'critical';
    audienceLevel?: 'youth' | 'amateur' | 'professional' | 'elite';
  };
  preferences: {
    responseFormat: ResponseFormat;
    maxResponseLength?: number;
    includeExamples?: boolean;
    includeSources?: boolean;
    personalizeResponse?: boolean;
    culturalAdaptation?: boolean;
  };
  constraints?: {
    maxLatency?: number;
    maxCost?: number;
    requireHighAccuracy?: boolean;
    requireRealTime?: boolean;
  };
}

export interface ModelSelection {
  primary: LLMModelConfig;
  fallback?: LLMModelConfig;
  reasoning: string;
  expectedCost: number;
  expectedLatency: number;
  confidenceScore: number;
}

export interface CoachingResponse {
  id: string;
  query: string;
  response: string;
  hebrewResponse?: string;
  language: 'he' | 'en' | 'mixed';
  modelUsed: LLMProvider;
  processingTime: number;
  confidence: number;
  sources: Array<{
    type:
      | 'knowledge_base'
      | 'vector_search'
      | 'performance_data'
      | 'tactical_analysis';
    source: string;
    relevance: number;
    excerpt?: string;
  }>;
  actionableInsights: Array<{
    action: string;
    hebrewAction: string;
    priority: 'low' | 'medium' | 'high' | 'critical';
    timeline: string;
    resources: string[];
  }>;
  relatedTopics: string[];
  hebrewRelatedTopics: string[];
  followUpQuestions: string[];
  hebrewFollowUpQuestions: string[];
  metadata: {
    tokensUsed: number;
    cost: number;
    cacheHit?: boolean;
    fallbackUsed?: boolean;
    qualityScore: number;
  };
}

export interface ConversationContext {
  sessionId: string;
  userId: string;
  messages: Array<{
    role: 'user' | 'assistant' | 'system';
    content: string;
    hebrewContent?: string;
    timestamp: Date;
    metadata?: Record<string, any>;
  }>;
  preferences: {
    language: 'he' | 'en' | 'mixed';
    communicationStyle: 'formal' | 'casual' | 'technical' | 'motivational';
    expertiseLevel: 'beginner' | 'intermediate' | 'advanced' | 'professional';
    focusAreas: string[];
  };
  contextData: {
    currentTopic?: string;
    activePlayers?: string[];
    activeFormation?: string;
    recentAnalyses?: string[];
    sessionStartTime: Date;
    totalInteractions: number;
  };
}

export class LLMOrchestrationService {
  private models = new Map<LLMProvider, LLMModelConfig>();
  private queryAnalyzer: TacticalQueryAnalysis;
  private vectorDatabase: VectorDatabaseService;
  private knowledgeBase: EnhancedTacticalKnowledgeBase;
  private performanceAnalyzer: PlayerPerformanceAnalyzer;
  private hebrewMorphology: HebrewMorphology;

  // Conversation management
  private conversations = new Map<string, ConversationContext>();
  private responseCache = new Map<string, CoachingResponse>();

  // Performance monitoring
  private metrics = {
    totalRequests: 0,
    averageLatency: 0,
    averageCost: 0,
    modelUsageStats: new Map<LLMProvider, number>(),
    hebrewRequestRatio: 0,
    satisfactionScores: new Map<string, number>(),
    errorRate: 0,
  };

  // Hebrew coaching expertise
  private hebrewCoachingPrompts = {
    tacticalAnalysis: `אתה מאמן כדורגל מומחה דובר עברית. נתח את המצב הטקטי הבא בעברית ברורה ומקצועית.`,
    playerDevelopment: `אתה מומחה פיתוח שחקנים. תן המלצות מפורטות לפיתוח השחקן בעברית.`,
    formationAdvice: `אתה אנליסט טקטי מומחה. הסבר את יתרונות וחסרונות המערך בעברית מקצועית.`,
    matchPreparation: `אתה מאמן מנוסה. הכן תוכנית הכנה למשחק בעברית עם הוראות ברורות.`,
    realTimeCoaching: `אתה מאמן במהלך המשחק. תן הוראות טקטיות מהירות ובהירות בעברית.`,
  };

  constructor(
    vectorDatabase: VectorDatabaseService,
    knowledgeBase: EnhancedTacticalKnowledgeBase,
    performanceAnalyzer: PlayerPerformanceAnalyzer
  ) {
    this.vectorDatabase = vectorDatabase;
    this.knowledgeBase = knowledgeBase;
    this.performanceAnalyzer = performanceAnalyzer;
    this.queryAnalyzer = new TacticalQueryAnalysis();
    this.hebrewMorphology = new HebrewMorphology();

    this.initializeModels();
    this.startPerformanceMonitoring();
  }

  /**
   * Initialize available LLM models with their configurations
   */
  private initializeModels(): void {
    // OpenAI GPT-4 Turbo (Primary Hebrew model)
    this.models.set(LLMProvider.OPENAI_GPT4_TURBO, {
      provider: LLMProvider.OPENAI_GPT4_TURBO,
      modelName: 'gpt-4-0125-preview',
      capabilities: [
        ModelCapability.MULTILINGUAL,
        ModelCapability.TACTICAL_REASONING,
        ModelCapability.LONG_CONTEXT,
        ModelCapability.FUNCTION_CALLING,
        ModelCapability.STRUCTURED_OUTPUT,
        ModelCapability.HIGH_ACCURACY,
      ],
      maxTokens: 4096,
      contextWindow: 128000,
      costPerToken: 0.00003,
      hebrewAccuracy: 0.92,
      tacticalReasoningScore: 0.95,
      latency: 2500,
      reliability: 0.98,
      specializations: [
        CoachingTaskType.TACTICAL_ANALYSIS,
        CoachingTaskType.STRATEGIC_CONSULTING,
        CoachingTaskType.HEBREW_EXPLANATION,
        CoachingTaskType.CONCEPT_TEACHING,
      ],
    });

    // OpenAI GPT-4 (High accuracy model)
    this.models.set(LLMProvider.OPENAI_GPT4, {
      provider: LLMProvider.OPENAI_GPT4,
      modelName: 'gpt-4',
      capabilities: [
        ModelCapability.MULTILINGUAL,
        ModelCapability.TACTICAL_REASONING,
        ModelCapability.HIGH_ACCURACY,
      ],
      maxTokens: 4096,
      contextWindow: 8192,
      costPerToken: 0.00006,
      hebrewAccuracy: 0.9,
      tacticalReasoningScore: 0.93,
      latency: 3000,
      reliability: 0.99,
      specializations: [
        CoachingTaskType.PERFORMANCE_REVIEW,
        CoachingTaskType.PLAYER_DEVELOPMENT,
        CoachingTaskType.MATCH_PREPARATION,
      ],
    });

    // Anthropic Claude (Alternative for complex reasoning)
    this.models.set(LLMProvider.ANTHROPIC_CLAUDE, {
      provider: LLMProvider.ANTHROPIC_CLAUDE,
      modelName: 'claude-3-opus',
      capabilities: [
        ModelCapability.MULTILINGUAL,
        ModelCapability.TACTICAL_REASONING,
        ModelCapability.LONG_CONTEXT,
        ModelCapability.HIGH_ACCURACY,
      ],
      maxTokens: 4096,
      contextWindow: 200000,
      costPerToken: 0.000075,
      hebrewAccuracy: 0.85,
      tacticalReasoningScore: 0.91,
      latency: 3500,
      reliability: 0.97,
      specializations: [
        CoachingTaskType.TACTICAL_ANALYSIS,
        CoachingTaskType.TRAINING_PLANNING,
      ],
    });

    // Cohere Command (Cost-efficient multilingual)
    this.models.set(LLMProvider.COHERE_COMMAND, {
      provider: LLMProvider.COHERE_COMMAND,
      modelName: 'command-r-plus',
      capabilities: [
        ModelCapability.MULTILINGUAL,
        ModelCapability.COST_EFFICIENT,
        ModelCapability.STRUCTURED_OUTPUT,
      ],
      maxTokens: 4096,
      contextWindow: 128000,
      costPerToken: 0.000015,
      hebrewAccuracy: 0.8,
      tacticalReasoningScore: 0.75,
      latency: 1800,
      reliability: 0.94,
      specializations: [
        CoachingTaskType.FORMATION_ADVICE,
        CoachingTaskType.CONCEPT_TEACHING,
      ],
    });

    // Local Llama (Fast, private, cost-free)
    this.models.set(LLMProvider.LOCAL_LLAMA, {
      provider: LLMProvider.LOCAL_LLAMA,
      modelName: 'llama-2-70b-chat',
      capabilities: [ModelCapability.REAL_TIME, ModelCapability.COST_EFFICIENT],
      maxTokens: 2048,
      contextWindow: 4096,
      costPerToken: 0,
      hebrewAccuracy: 0.65,
      tacticalReasoningScore: 0.7,
      latency: 800,
      reliability: 0.9,
      specializations: [
        CoachingTaskType.REAL_TIME_COACHING,
        CoachingTaskType.QUICK_TIPS,
      ],
    });
  }

  /**
   * Main coaching query processing with intelligent model routing
   */
  public async processCoachingQuery(
    request: CoachingRequest
  ): Promise<CoachingResponse> {
    const startTime = Date.now();

    try {
      // Analyze the query for better understanding
      const queryAnalysis = await this.queryAnalyzer.analyzeQuery(
        request.query,
        this.getSessionContext(request.context.sessionId),
        { useCache: true }
      );

      // Select optimal model for this request
      const modelSelection = await this.selectOptimalModel(
        request,
        queryAnalysis
      );

      // Gather relevant context from various sources
      const contextData = await this.gatherRelevantContext(
        request,
        queryAnalysis
      );

      // Generate coaching response
      const response = await this.generateCoachingResponse(
        request,
        queryAnalysis,
        modelSelection,
        contextData
      );

      // Update conversation context
      if (request.context.sessionId) {
        this.updateConversationContext(
          request.context.sessionId,
          request,
          response
        );
      }

      // Update metrics
      this.updateMetrics(response, startTime);

      return response;
    } catch (error) {
      console.error('Coaching query processing failed:', error);
      return this.generateErrorResponse(request, error);
    }
  }

  /**
   * Hebrew-specific coaching with cultural adaptation
   */
  public async processHebrewCoaching(
    hebrewQuery: string,
    context: {
      taskType: CoachingTaskType;
      urgency?: 'low' | 'medium' | 'high' | 'critical';
      audienceLevel?: 'youth' | 'amateur' | 'professional' | 'elite';
      culturalContext?: 'israeli_football' | 'international' | 'youth_academy';
      sessionId?: string;
    }
  ): Promise<CoachingResponse> {
    const request: CoachingRequest = {
      query: hebrewQuery,
      language: 'he',
      taskType: context.taskType,
      context: {
        urgency: context.urgency,
        audienceLevel: context.audienceLevel,
        sessionId: context.sessionId,
      },
      preferences: {
        responseFormat: ResponseFormat.HEBREW_NARRATIVE,
        culturalAdaptation: true,
        personalizeResponse: true,
      },
    };

    // Use Hebrew-optimized processing
    const response = await this.processCoachingQuery(request);

    // Apply additional Hebrew cultural adaptations
    return this.applyHebrewCulturalAdaptations(response, context);
  }

  /**
   * Multi-turn conversation management
   */
  public async continueConversation(
    sessionId: string,
    message: string,
    language: 'he' | 'en' | 'auto' = 'auto'
  ): Promise<CoachingResponse> {
    const conversation = this.conversations.get(sessionId);
    if (!conversation) {
      throw new Error(`Conversation not found: ${sessionId}`);
    }

    // Determine task type based on conversation context and message
    const taskType = this.inferTaskTypeFromContext(conversation, message);

    const request: CoachingRequest = {
      query: message,
      language: language === 'auto' ? this.detectLanguage(message) : language,
      taskType,
      context: {
        sessionId,
        userId: conversation.userId,
      },
      preferences: {
        responseFormat:
          conversation.preferences.language === 'he'
            ? ResponseFormat.HEBREW_NARRATIVE
            : ResponseFormat.CONVERSATIONAL,
        personalizeResponse: true,
      },
    };

    return this.processCoachingQuery(request);
  }

  /**
   * Batch processing for multiple queries
   */
  public async processBatchQueries(
    requests: CoachingRequest[]
  ): Promise<CoachingResponse[]> {
    const responses: CoachingResponse[] = [];

    // Process in parallel with concurrency control
    const concurrency = 3;
    for (let i = 0; i < requests.length; i += concurrency) {
      const batch = requests.slice(i, i + concurrency);
      const batchResponses = await Promise.all(
        batch.map(request => this.processCoachingQuery(request))
      );
      responses.push(...batchResponses);
    }

    return responses;
  }

  /**
   * Real-time coaching assistance
   */
  public async getRealTimeCoachingAdvice(
    situation: string,
    matchContext: {
      scoreline: string;
      timeRemaining: number;
      phase: 'first_half' | 'second_half' | 'extra_time';
      formation: string;
      keyEvents: string[];
    },
    language: 'he' | 'en' = 'he'
  ): Promise<CoachingResponse> {
    const request: CoachingRequest = {
      query: `${situation} - זמן נותר: ${matchContext.timeRemaining} דקות, תוצאה: ${matchContext.scoreline}`,
      language,
      taskType: CoachingTaskType.REAL_TIME_COACHING,
      context: {
        urgency: 'critical',
        matchPhase: matchContext.phase,
        formationContext: matchContext.formation,
      },
      preferences: {
        responseFormat: ResponseFormat.QUICK_TIPS,
        maxResponseLength: 200,
      },
      constraints: {
        maxLatency: 2000,
        requireRealTime: true,
      },
    };

    return this.processCoachingQuery(request);
  }

  // Helper methods for model selection and processing

  private async selectOptimalModel(
    request: CoachingRequest,
    analysis: QueryAnalysisResult
  ): Promise<ModelSelection> {
    const candidates: Array<{
      model: LLMModelConfig;
      score: number;
      reasoning: string[];
    }> = [];

    for (const [provider, model] of this.models) {
      let score = 0;
      const reasoning: string[] = [];

      // Language compatibility
      if (request.language === 'he') {
        score += model.hebrewAccuracy * 30;
        reasoning.push(
          `Hebrew accuracy: ${(model.hebrewAccuracy * 100).toFixed(0)}%`
        );
      }

      // Task specialization
      if (model.specializations.includes(request.taskType)) {
        score += 25;
        reasoning.push(`Specialized for ${request.taskType}`);
      }

      // Tactical reasoning capability
      score += model.tacticalReasoningScore * 20;
      reasoning.push(
        `Tactical reasoning: ${(model.tacticalReasoningScore * 100).toFixed(
          0
        )}%`
      );

      // Latency constraints
      if (
        request.constraints?.maxLatency &&
        model.latency <= request.constraints.maxLatency
      ) {
        score += 15;
        reasoning.push(`Meets latency requirement (${model.latency}ms)`);
      }

      // Cost constraints
      if (request.constraints?.maxCost) {
        const estimatedCost = this.estimateQueryCost(request, model);
        if (estimatedCost <= request.constraints.maxCost) {
          score += 10;
          reasoning.push(`Cost efficient (${estimatedCost.toFixed(4)}$)`);
        }
      }

      // Reliability
      score += model.reliability * 10;

      candidates.push({ model, score, reasoning });
    }

    // Sort by score and select best
    candidates.sort((a, b) => b.score - a.score);
    const selected = candidates[0];
    const fallback = candidates[1];

    return {
      primary: selected.model,
      fallback: fallback?.model,
      reasoning: selected.reasoning.join(', '),
      expectedCost: this.estimateQueryCost(request, selected.model),
      expectedLatency: selected.model.latency,
      confidenceScore: selected.score / 100,
    };
  }

  private async gatherRelevantContext(
    request: CoachingRequest,
    analysis: QueryAnalysisResult
  ): Promise<{
    vectorSearchResults: EnhancedSearchResult[];
    knowledgeBaseInsights: any[];
    performanceData?: any[];
    conversationHistory?: any[];
  }> {
    const context: any = {
      vectorSearchResults: [],
      knowledgeBaseInsights: [],
    };

    // Vector database search for relevant knowledge
    if (request.language === 'he') {
      context.vectorSearchResults =
        await this.vectorDatabase.searchHebrewCoaching(request.query, {
          tacticalFocus: analysis.semantics.concepts.map(c => c.term),
          urgency: request.context.urgency,
        });
    } else {
      context.vectorSearchResults = await this.vectorDatabase.enhancedSearch(
        request.query,
        {
          mode: 'contextual' as any,
          language: request.language,
          context: request.context as any,
        }
      );
    }

    // Knowledge base insights
    const knowledgeResults = this.knowledgeBase.searchKnowledge(request.query, {
      language: request.language,
      maxResults: 5,
    });
    context.knowledgeBaseInsights = knowledgeResults;

    // Performance data if player-related
    if (request.context.playerIds && request.context.playerIds.length > 0) {
      context.performanceData = []; // Would fetch from performance analyzer
    }

    // Conversation history if available
    if (request.context.sessionId) {
      const conversation = this.conversations.get(request.context.sessionId);
      if (conversation) {
        context.conversationHistory = conversation.messages.slice(-5); // Last 5 messages
      }
    }

    return context;
  }

  private async generateCoachingResponse(
    request: CoachingRequest,
    analysis: QueryAnalysisResult,
    modelSelection: ModelSelection,
    contextData: any
  ): Promise<CoachingResponse> {
    const model = modelSelection.primary;

    // Build comprehensive prompt
    const prompt = this.buildCoachingPrompt(request, analysis, contextData);

    // Generate response using selected model
    const llmResponse = await this.callLLMModel(model, prompt, request);

    // Post-process response
    const processedResponse = await this.postProcessResponse(
      llmResponse,
      request,
      analysis
    );

    // Generate actionable insights
    const actionableInsights = this.generateActionableInsights(
      processedResponse,
      request
    );

    // Generate follow-up questions
    const followUpQuestions = this.generateFollowUpQuestions(
      processedResponse,
      request
    );

    return {
      id: `response_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      query: request.query,
      response: processedResponse.text,
      hebrewResponse: processedResponse.hebrewText,
      language: this.detectLanguage(processedResponse.text),
      modelUsed: model.provider,
      processingTime: Date.now() - Date.now(), // Would be calculated properly
      confidence: processedResponse.confidence,
      sources: this.extractSources(contextData),
      actionableInsights,
      relatedTopics: this.extractRelatedTopics(processedResponse, 'en'),
      hebrewRelatedTopics: this.extractRelatedTopics(processedResponse, 'he'),
      followUpQuestions: followUpQuestions.english,
      hebrewFollowUpQuestions: followUpQuestions.hebrew,
      metadata: {
        tokensUsed: processedResponse.tokensUsed,
        cost: modelSelection.expectedCost,
        qualityScore: processedResponse.qualityScore,
      },
    };
  }

  private buildCoachingPrompt(
    request: CoachingRequest,
    analysis: QueryAnalysisResult,
    contextData: any
  ): string {
    let prompt = '';

    // System prompt based on language and task
    if (request.language === 'he') {
      prompt +=
        this.hebrewCoachingPrompts[request.taskType] ||
        this.hebrewCoachingPrompts.tacticalAnalysis;
    } else {
      prompt += `You are an expert football coach and tactical analyst. Provide professional coaching advice.`;
    }

    prompt += '\n\n';

    // Add context from vector search
    if (contextData.vectorSearchResults.length > 0) {
      prompt += 'Relevant tactical knowledge:\n';
      for (const result of contextData.vectorSearchResults.slice(0, 3)) {
        prompt += `- ${result.document.text}\n`;
      }
      prompt += '\n';
    }

    // Add knowledge base insights
    if (contextData.knowledgeBaseInsights.length > 0) {
      prompt += 'Expert insights:\n';
      for (const insight of contextData.knowledgeBaseInsights.slice(0, 2)) {
        prompt += `- ${insight.item.description}\n`;
      }
      prompt += '\n';
    }

    // Add conversation context if available
    if (contextData.conversationHistory) {
      prompt += 'Previous conversation context:\n';
      for (const msg of contextData.conversationHistory) {
        prompt += `${msg.role}: ${msg.content}\n`;
      }
      prompt += '\n';
    }

    // Add the user query
    prompt += `User query: ${request.query}\n\n`;

    // Add response format instructions
    prompt += this.getFormatInstructions(
      request.preferences.responseFormat,
      request.language
    );

    return prompt;
  }

  private async callLLMModel(
    model: LLMModelConfig,
    prompt: string,
    request: CoachingRequest
  ): Promise<{
    text: string;
    hebrewText?: string;
    confidence: number;
    tokensUsed: number;
    qualityScore: number;
  }> {
    // Mock implementation - in production, would call actual LLM APIs
    const mockResponse = {
      text: this.generateMockResponse(request, 'en'),
      hebrewText:
        request.language === 'he'
          ? this.generateMockResponse(request, 'he')
          : undefined,
      confidence: 0.85,
      tokensUsed: 1500,
      qualityScore: 0.88,
    };

    return mockResponse;
  }

  private generateMockResponse(
    request: CoachingRequest,
    language: 'he' | 'en'
  ): string {
    if (language === 'he') {
      switch (request.taskType) {
        case CoachingTaskType.TACTICAL_ANALYSIS:
          return 'על בסיס הניתוח הטקטי, מומלץ לשנות את המערך ל-4-3-3 כדי להגביר את השליטה בקו האמצע. השחקנים צריכים להתמקד בלחץ גבוה ומסירות קצרות.';
        case CoachingTaskType.PLAYER_DEVELOPMENT:
          return 'השחקן מראה פוטנציאל גבוה במהירות ובטכניקה. מומלץ לעבוד על שיפור הכנה הראשונה ועל קבלת החלטות מהירות יותר בלחץ.';
        case CoachingTaskType.FORMATION_ADVICE:
          return 'מערך 4-4-2 מתאים לקבוצה זו בזכות החוזק באגפים. יש לנצל את המהירות של הקיצוניים ולשמור על קומפקטיות במרכז.';
        default:
          return 'בהתבסס על הניתוח, מומלץ להתמקד בשיפור התיאום הקבוצתי ובפיתוח הבנה טקטית טובה יותר.';
      }
    } else {
      switch (request.taskType) {
        case CoachingTaskType.TACTICAL_ANALYSIS:
          return 'Based on the tactical analysis, I recommend switching to a 4-3-3 formation to increase midfield control. Players should focus on high pressing and short passing combinations.';
        case CoachingTaskType.PLAYER_DEVELOPMENT:
          return 'The player shows great potential in pace and technique. I recommend working on improving first touch and faster decision-making under pressure.';
        case CoachingTaskType.FORMATION_ADVICE:
          return 'The 4-4-2 formation suits this team well due to strong wing play. Utilize the pace of wide players while maintaining compactness in central areas.';
        default:
          return 'Based on the analysis, focus on improving team coordination and developing better tactical understanding across all players.';
      }
    }
  }

  private async postProcessResponse(
    llmResponse: any,
    request: CoachingRequest,
    analysis: QueryAnalysisResult
  ): Promise<any> {
    // Apply Hebrew language corrections if needed
    if (request.language === 'he' && llmResponse.hebrewText) {
      llmResponse.hebrewText = await this.refineHebrewText(
        llmResponse.hebrewText
      );
    }

    // Add tactical terminology validation
    llmResponse = await this.validateTacticalTerminology(
      llmResponse,
      request.language
    );

    // Apply cultural adaptations
    if (request.preferences.culturalAdaptation) {
      llmResponse = await this.applyCulturalAdaptations(llmResponse, request);
    }

    return llmResponse;
  }

  private generateActionableInsights(
    response: any,
    request: CoachingRequest
  ): Array<{
    action: string;
    hebrewAction: string;
    priority: 'low' | 'medium' | 'high' | 'critical';
    timeline: string;
    resources: string[];
  }> {
    // Extract actionable items from response
    const insights: Array<{
      action: string;
      hebrewAction: string;
      priority: 'low' | 'medium' | 'high' | 'critical';
      timeline: string;
      resources: string[];
    }> = [];

    // Mock insights based on task type
    switch (request.taskType) {
      case CoachingTaskType.TACTICAL_ANALYSIS:
        insights.push({
          action: 'Implement formation change in next training',
          hebrewAction: 'יישום שינוי מערך באימון הבא',
          priority: 'high',
          timeline: 'immediate',
          resources: ['training_ground', 'tactical_board', 'video_analysis'],
        });
        break;
      case CoachingTaskType.PLAYER_DEVELOPMENT:
        insights.push({
          action: 'Schedule individual technical training sessions',
          hebrewAction: 'קבע אימונים טכניים אישיים',
          priority: 'medium',
          timeline: 'weekly',
          resources: ['individual_coach', 'technical_equipment'],
        });
        break;
    }

    return insights;
  }

  private generateFollowUpQuestions(
    response: any,
    request: CoachingRequest
  ): { english: string[]; hebrew: string[] } {
    const english: string[] = [];
    const hebrew: string[] = [];

    switch (request.taskType) {
      case CoachingTaskType.TACTICAL_ANALYSIS:
        english.push('How should we prepare players for this tactical change?');
        english.push('What are the potential risks of this approach?');
        hebrew.push('איך נכין את השחקנים לשינוי הטקטי הזה?');
        hebrew.push('מה הסיכונים הפוטנציאליים של הגישה הזו?');
        break;
      case CoachingTaskType.PLAYER_DEVELOPMENT:
        english.push('What specific drills would help improve these areas?');
        english.push('How long should this development program take?');
        hebrew.push('אילו תרגילים ספציפיים יעזרו לשפר את התחומים האלה?');
        hebrew.push('כמה זמן צריכה להימשך תוכנית הפיתוח הזו?');
        break;
    }

    return { english, hebrew };
  }

  private extractSources(contextData: any): Array<{
    type:
      | 'knowledge_base'
      | 'vector_search'
      | 'performance_data'
      | 'tactical_analysis';
    source: string;
    relevance: number;
    excerpt?: string;
  }> {
    const sources: Array<{
      type:
        | 'knowledge_base'
        | 'vector_search'
        | 'performance_data'
        | 'tactical_analysis';
      source: string;
      relevance: number;
      excerpt?: string;
    }> = [];

    // Add vector search sources
    for (const result of contextData.vectorSearchResults || []) {
      sources.push({
        type: 'vector_search',
        source: result.document.metadata.source || 'tactical_database',
        relevance: result.score,
        excerpt: result.document.text.substring(0, 100) + '...',
      });
    }

    // Add knowledge base sources
    for (const insight of contextData.knowledgeBaseInsights || []) {
      sources.push({
        type: 'knowledge_base',
        source: insight.item.name,
        relevance: 0.8,
        excerpt: insight.item.description.substring(0, 100) + '...',
      });
    }

    return sources.slice(0, 5); // Limit to top 5 sources
  }

  private extractRelatedTopics(response: any, language: 'he' | 'en'): string[] {
    // Mock implementation - would use NLP to extract topics
    if (language === 'he') {
      return ['טקטיקה', 'מערכים', 'פיתוח שחקנים', 'אימונים'];
    } else {
      return ['tactics', 'formations', 'player development', 'training'];
    }
  }

  // Conversation and context management

  private getSessionContext(sessionId?: string): any {
    if (!sessionId) return undefined;

    const conversation = this.conversations.get(sessionId);
    if (!conversation) return undefined;

    return {
      previousQueries: conversation.messages
        .filter(m => m.role === 'user')
        .map(m => m.content),
      userExpertise: conversation.preferences.expertiseLevel,
      teamId: undefined,
      matchContext: undefined,
      activePlayerFocus: conversation.contextData.activePlayers,
    };
  }

  private updateConversationContext(
    sessionId: string,
    request: CoachingRequest,
    response: CoachingResponse
  ): void {
    let conversation = this.conversations.get(sessionId);

    if (!conversation) {
      conversation = {
        sessionId,
        userId: request.context.userId || 'anonymous',
        messages: [],
        preferences: {
          language: request.language as any,
          communicationStyle: 'technical',
          expertiseLevel:
            (request.context.audienceLevel as any) || 'intermediate',
          focusAreas: [],
        },
        contextData: {
          sessionStartTime: new Date(),
          totalInteractions: 0,
        },
      };
      this.conversations.set(sessionId, conversation);
    }

    // Add user message
    conversation.messages.push({
      role: 'user',
      content: request.query,
      timestamp: new Date(),
    });

    // Add assistant response
    conversation.messages.push({
      role: 'assistant',
      content: response.response,
      hebrewContent: response.hebrewResponse,
      timestamp: new Date(),
      metadata: {
        modelUsed: response.modelUsed,
        confidence: response.confidence,
        cost: response.metadata.cost,
      },
    });

    // Update context data
    conversation.contextData.totalInteractions++;
    conversation.contextData.currentTopic = this.extractMainTopic(
      request.query
    );

    // Keep conversation manageable (last 20 messages)
    if (conversation.messages.length > 20) {
      conversation.messages = conversation.messages.slice(-20);
    }
  }

  // Hebrew and cultural adaptations

  private async applyHebrewCulturalAdaptations(
    response: CoachingResponse,
    context: any
  ): Promise<CoachingResponse> {
    // Apply Israeli football culture adaptations
    if (context.culturalContext === 'israeli_football') {
      response.response = this.adaptToIsraeliFootballCulture(response.response);
      if (response.hebrewResponse) {
        response.hebrewResponse = this.adaptToIsraeliFootballCulture(
          response.hebrewResponse
        );
      }
    }

    // Adapt communication style based on audience level
    if (context.audienceLevel === 'youth') {
      response = this.adaptForYouthAudience(response);
    }

    return response;
  }

  private async refineHebrewText(text: string): Promise<string> {
    // Apply Hebrew grammar and style corrections
    const morphology = await this.hebrewMorphology.analyze(text);

    // Apply corrections based on morphological analysis
    let refined = text;

    // Fix common Hebrew tactical terminology
    refined = refined.replace(/מערך שליטה/g, 'מערך שליטה בכדור');
    refined = refined.replace(/לחץ גבוהה/g, 'לחץ גבוה');
    refined = refined.replace(/מהירות הכדור/g, 'מהירות העברת הכדור');

    return refined;
  }

  private async validateTacticalTerminology(
    response: any,
    language: 'he' | 'en' | 'mixed' | 'auto'
  ): Promise<any> {
    // Validate and correct tactical terms using knowledge base
    const knowledgeBase = this.knowledgeBase;

    // This would integrate with our football concepts to ensure accurate terminology
    return response;
  }

  private async applyCulturalAdaptations(
    response: any,
    request: CoachingRequest
  ): Promise<any> {
    if (request.preferences.culturalAdaptation && request.language === 'he') {
      // Apply Israeli football cultural context
      response.text = this.adaptToIsraeliFootballCulture(response.text);
      if (response.hebrewText) {
        response.hebrewText = this.adaptToIsraeliFootballCulture(
          response.hebrewText
        );
      }
    }

    return response;
  }

  private adaptToIsraeliFootballCulture(text: string): string {
    // Replace international terms with Israeli equivalents
    text = text.replace(/soccer/g, 'כדורגל');
    text = text.replace(/football manager/g, 'מאמן');
    text = text.replace(/pitch/g, 'מגרש');

    // Add cultural context references
    if (text.includes('מערך') && !text.includes('ליגת העל')) {
      text += ' (בהתאם לסגנון המשחק בליגה הישראלית)';
    }

    return text;
  }

  private adaptForYouthAudience(response: CoachingResponse): CoachingResponse {
    // Simplify language and add encouragement
    response.response = this.simplifyForYouth(response.response);
    if (response.hebrewResponse) {
      response.hebrewResponse = this.simplifyForYouth(response.hebrewResponse);
    }

    return response;
  }

  private simplifyForYouth(text: string): string {
    // Simplify complex tactical terms
    text = text.replace(/tactical formation/g, 'team setup');
    text = text.replace(/מערך טקטי/g, 'סידור הקבוצה');

    // Add encouraging language
    if (!text.includes('great') && !text.includes('נהדר')) {
      text = 'נהדר! ' + text;
    }

    return text;
  }

  // Utility methods

  private detectLanguage(text: string): 'he' | 'en' | 'mixed' {
    const hebrewChars = (text.match(/[\u0590-\u05FF]/g) || []).length;
    const englishChars = (text.match(/[a-zA-Z]/g) || []).length;
    const total = hebrewChars + englishChars;

    if (total === 0) return 'en';

    const hebrewRatio = hebrewChars / total;
    if (hebrewRatio > 0.6) return 'he';
    if (hebrewRatio < 0.3) return 'en';
    return 'mixed';
  }

  private inferTaskTypeFromContext(
    conversation: ConversationContext,
    message: string
  ): CoachingTaskType {
    // Analyze message and context to infer task type
    const lowerMessage = message.toLowerCase();

    if (lowerMessage.includes('formation') || lowerMessage.includes('מערך')) {
      return CoachingTaskType.FORMATION_ADVICE;
    }

    if (lowerMessage.includes('player') || lowerMessage.includes('שחקן')) {
      return CoachingTaskType.PLAYER_DEVELOPMENT;
    }

    if (lowerMessage.includes('training') || lowerMessage.includes('אימון')) {
      return CoachingTaskType.TRAINING_PLANNING;
    }

    return CoachingTaskType.TACTICAL_ANALYSIS;
  }

  private estimateQueryCost(
    request: CoachingRequest,
    model: LLMModelConfig
  ): number {
    // Estimate tokens needed based on query complexity and context
    const baseTokens = request.query.length / 4; // Rough estimation
    const contextTokens = 500; // Context from vector search, etc.
    const responseTokens = 1000; // Expected response length

    const totalTokens = baseTokens + contextTokens + responseTokens;
    return totalTokens * model.costPerToken;
  }

  private getFormatInstructions(
    format: ResponseFormat,
    language: 'he' | 'en' | 'mixed' | 'auto'
  ): string {
    const isHebrew = language === 'he';

    switch (format) {
      case ResponseFormat.HEBREW_NARRATIVE:
        return 'ענה בעברית בצורה נרטיבית וברורה. השתמש במושגים טקטיים מקצועיים.';
      case ResponseFormat.QUICK_TIPS:
        return isHebrew
          ? 'תן 3-5 טיפים מהירים ופרקטיים.'
          : 'Provide 3-5 quick, practical tips.';
      case ResponseFormat.STEP_BY_STEP:
        return isHebrew
          ? 'פרט את התשובה בשלבים ברורים.'
          : 'Break down the answer into clear steps.';
      case ResponseFormat.DETAILED_REPORT:
        return isHebrew
          ? 'כתב דוח מפורט עם ניתוח מעמיק.'
          : 'Write a detailed report with in-depth analysis.';
      default:
        return isHebrew
          ? 'ענה בצורה שיחתית וידידותית.'
          : 'Respond in a conversational and friendly manner.';
    }
  }

  private extractMainTopic(query: string): string {
    // Simple topic extraction - in production would use NLP
    const lowerQuery = query.toLowerCase();

    if (lowerQuery.includes('formation') || lowerQuery.includes('מערך'))
      return 'formations';
    if (lowerQuery.includes('player') || lowerQuery.includes('שחקן'))
      return 'players';
    if (lowerQuery.includes('training') || lowerQuery.includes('אימון'))
      return 'training';
    if (lowerQuery.includes('tactic') || lowerQuery.includes('טקטיקה'))
      return 'tactics';

    return 'general';
  }

  private generateErrorResponse(
    request: CoachingRequest,
    error: any
  ): CoachingResponse {
    const isHebrew = request.language === 'he';

    return {
      id: `error_${Date.now()}`,
      query: request.query,
      response: isHebrew
        ? 'מצטער, אירעה שגיאה בעיבוד השאלה. אנא נסה שוב.'
        : 'Sorry, an error occurred processing your question. Please try again.',
      hebrewResponse: isHebrew
        ? undefined
        : 'מצטער, אירעה שגיאה בעיבוד השאלה. אנא נסה שוב.',
      language: request.language,
      modelUsed: LLMProvider.LOCAL_LLAMA, // Fallback
      processingTime: 0,
      confidence: 0,
      sources: [],
      actionableInsights: [],
      relatedTopics: [],
      hebrewRelatedTopics: [],
      followUpQuestions: [],
      hebrewFollowUpQuestions: [],
      metadata: {
        tokensUsed: 0,
        cost: 0,
        qualityScore: 0,
      },
    };
  }

  private updateMetrics(response: CoachingResponse, startTime: number): void {
    this.metrics.totalRequests++;

    const latency = Date.now() - startTime;
    this.metrics.averageLatency =
      (this.metrics.averageLatency * (this.metrics.totalRequests - 1) +
        latency) /
      this.metrics.totalRequests;

    this.metrics.averageCost =
      (this.metrics.averageCost * (this.metrics.totalRequests - 1) +
        response.metadata.cost) /
      this.metrics.totalRequests;

    // Update model usage stats
    const currentUsage =
      this.metrics.modelUsageStats.get(response.modelUsed) || 0;
    this.metrics.modelUsageStats.set(response.modelUsed, currentUsage + 1);

    // Update Hebrew request ratio
    if (response.language === 'he') {
      this.metrics.hebrewRequestRatio =
        (this.metrics.hebrewRequestRatio * (this.metrics.totalRequests - 1) +
          1) /
        this.metrics.totalRequests;
    } else {
      this.metrics.hebrewRequestRatio =
        (this.metrics.hebrewRequestRatio * (this.metrics.totalRequests - 1)) /
        this.metrics.totalRequests;
    }
  }

  private startPerformanceMonitoring(): void {
    // Clean up old conversations every hour
    setInterval(() => {
      const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago

      for (const [sessionId, conversation] of this.conversations) {
        if (conversation.contextData.sessionStartTime < cutoff) {
          this.conversations.delete(sessionId);
        }
      }
    }, 60 * 60 * 1000);

    // Clean up response cache every 30 minutes
    setInterval(() => {
      if (this.responseCache.size > 1000) {
        const entries = Array.from(this.responseCache.entries());
        entries
          .slice(0, 500)
          .forEach(([key]) => this.responseCache.delete(key));
      }
    }, 30 * 60 * 1000);
  }

  /**
   * Get performance metrics and statistics
   */
  public getMetrics(): typeof this.metrics {
    return { ...this.metrics };
  }

  /**
   * Clear conversation history for a session
   */
  public clearConversation(sessionId: string): void {
    this.conversations.delete(sessionId);
  }

  /**
   * Export conversation data for analysis
   */
  public exportConversationData(sessionId?: string): any {
    if (sessionId) {
      return this.conversations.get(sessionId);
    }
    return Array.from(this.conversations.values());
  }

  /**
   * Update model configuration
   */
  public updateModelConfig(
    provider: LLMProvider,
    config: Partial<LLMModelConfig>
  ): void {
    const existingConfig = this.models.get(provider);
    if (existingConfig) {
      this.models.set(provider, { ...existingConfig, ...config });
    }
  }
}
