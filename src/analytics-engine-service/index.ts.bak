/**
 * Analytics Engine Service Barrel Exports
 * Provides centralized access to analytics service components
 */

// Main Module
export { AnalyticsModule } from './analytics.module';

// Application Services
export { AnalyticsApplicationService } from './application/analytics-application.service';

// API Layer
export { AnalyticsController } from './api/analytics.controller';
export * from './api/types/analytics.types';

// Application Layer - Commands & Queries
export * from './application/commands/analytics-commands';
export * from './application/queries/analytics-queries';

// Domain Layer - Core Components
export { DomainEvent } from './domain/events/domain-event';
export { MatchAnalyticsCreatedEvent } from './domain/events/match-analytics-created.event';
export { XGCalculatedEvent } from './domain/events/xg-calculated.event';
export { PossessionCalculatedEvent } from './domain/events/possession-calculated.event';
export { FormationDetectedEvent } from './domain/events/formation-detected.event';

// Domain Services - Export calculation functions
export {
  calculatePossessionPercentage,
  calculateBothTeamsPossession,
  calculatePossessionByPeriods,
  PossessionCalculationFunctions,
} from './domain/services/possession-calculation.service';

// Domain Value Objects & Entities
export { MatchId } from './domain/value-objects/match-id';
export { MatchAnalytics } from './domain/entities/match-analytics';

// Infrastructure Interfaces
export { EventStore } from './infrastructure/event-store/event-store.interface';
export { ProjectionManager } from './infrastructure/projections/projection-manager';

// Re-export specific types and classes to avoid conflicts
export {
  // Value object classes
  XGValue,
  PossessionPercentage,
  PassAccuracy,
  Formation,
  TeamAnalytics,
} from './domain/value-objects/analytics-metrics';

export type {
  // Interface types from analytics-metrics
  Position,
  ShotData,
  PassData,
  FormationData,
  TeamMetrics,
} from './domain/value-objects/analytics-metrics';

export type {
  // From possession calculation service
  PossessionEvent,
  PossessionSequence,
  PossessionTransition,
} from './domain/services/possession-calculation.service';

export type {
  // From ML pipeline types
  MLPipelineOutput,
} from './domain/types/ml-pipeline.types';
