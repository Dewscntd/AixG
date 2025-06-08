/**
 * Pure functional possession calculation service
 */

import { PossessionPercentage, Position } from '../value-objects/analytics-metrics';

export interface PossessionEvent {
  readonly timestamp: number;
  readonly teamId: string;
  readonly playerId: string;
  readonly eventType: 'pass' | 'dribble' | 'shot' | 'tackle' | 'interception' | 'clearance';
  readonly position: Position;
  readonly successful: boolean;
  readonly duration?: number; // in seconds
}

export interface PossessionSequence {
  readonly teamId: string;
  readonly startTime: number;
  readonly endTime: number;
  readonly events: ReadonlyArray<PossessionEvent>;
  readonly endReason: 'lost_ball' | 'shot' | 'out_of_play' | 'foul' | 'half_time' | 'full_time';
}

// Pure function to calculate possession duration for a team
const calculateTeamPossessionDuration = (
  sequences: ReadonlyArray<PossessionSequence>,
  teamId: string
): number => sequences
    .filter(seq => seq.teamId === teamId)
    .reduce((total, seq) => total + (seq.endTime - seq.startTime), 0);

// Pure function to calculate total match duration from sequences
const calculateTotalMatchDuration = (
  sequences: ReadonlyArray<PossessionSequence>
): number => {
  if (sequences.length === 0) return 0;
  
  const firstEvent = Math.min(...sequences.map(seq => seq.startTime));
  const lastEvent = Math.max(...sequences.map(seq => seq.endTime));
  
  return lastEvent - firstEvent;
};

// Main possession calculation function
export const calculatePossessionPercentage = (
  sequences: ReadonlyArray<PossessionSequence>,
  teamId: string
): PossessionPercentage => {
  const teamDuration = calculateTeamPossessionDuration(sequences, teamId);
  const totalDuration = calculateTotalMatchDuration(sequences);
  
  if (totalDuration === 0) {
    return PossessionPercentage.zero();
  }
  
  const percentage = (teamDuration / totalDuration) * 100;
  return PossessionPercentage.fromNumber(percentage);
};

// Calculate possession for both teams
export const calculateBothTeamsPossession = (
  sequences: ReadonlyArray<PossessionSequence>,
  homeTeamId: string,
  awayTeamId: string
): { home: PossessionPercentage; away: PossessionPercentage } => {
  const homePossession = calculatePossessionPercentage(sequences, homeTeamId);
  const awayPossession = calculatePossessionPercentage(sequences, awayTeamId);
  
  // Ensure percentages add up to 100% (accounting for rounding)
  const total = homePossession.value + awayPossession.value;
  if (total > 0 && Math.abs(total - 100) > 0.1) {
    const homeAdjusted = (homePossession.value / total) * 100;
    const awayAdjusted = (awayPossession.value / total) * 100;
    
    return {
      home: PossessionPercentage.fromNumber(homeAdjusted),
      away: PossessionPercentage.fromNumber(awayAdjusted)
    };
  }
  
  return { home: homePossession, away: awayPossession };
};

// Calculate possession by time periods (e.g., 15-minute intervals)
export const calculatePossessionByPeriods = (
  sequences: ReadonlyArray<PossessionSequence>,
  teamId: string,
  periodDurationMinutes: number = 15
): ReadonlyArray<{ period: number; possession: PossessionPercentage }> => {
  const periodDurationSeconds = periodDurationMinutes * 60;
  const totalDuration = calculateTotalMatchDuration(sequences);
  const numberOfPeriods = Math.ceil(totalDuration / periodDurationSeconds);
  
  return Array.from({ length: numberOfPeriods }, (_, index) => {
    const periodStart = index * periodDurationSeconds;
    const periodEnd = Math.min((index + 1) * periodDurationSeconds, totalDuration);
    
    const periodSequences = sequences.filter(seq => 
      seq.startTime < periodEnd && seq.endTime > periodStart
    ).map(seq => ({
      ...seq,
      startTime: Math.max(seq.startTime, periodStart),
      endTime: Math.min(seq.endTime, periodEnd)
    }));
    
    const possession = calculatePossessionPercentage(periodSequences, teamId);
    
    return {
      period: index + 1,
      possession
    };
  });
};

// Calculate average possession sequence duration
export const calculateAveragePossessionDuration = (
  sequences: ReadonlyArray<PossessionSequence>,
  teamId: string
): number => {
  const teamSequences = sequences.filter(seq => seq.teamId === teamId);
  
  if (teamSequences.length === 0) return 0;
  
  const totalDuration = teamSequences.reduce(
    (total, seq) => total + (seq.endTime - seq.startTime),
    0
  );
  
  return totalDuration / teamSequences.length;
};

// Calculate possession in different field zones
export interface FieldZone {
  readonly name: string;
  readonly minX: number;
  readonly maxX: number;
  readonly minY: number;
  readonly maxY: number;
}

const FIELD_ZONES: ReadonlyArray<FieldZone> = [
  { name: 'defensive_third', minX: 0, maxX: 33.33, minY: 0, maxY: 100 },
  { name: 'middle_third', minX: 33.33, maxX: 66.67, minY: 0, maxY: 100 },
  { name: 'attacking_third', minX: 66.67, maxX: 100, minY: 0, maxY: 100 }
];

const isPositionInZone = (position: Position, zone: FieldZone): boolean => position.x >= zone.minX && position.x <= zone.maxX &&
         position.y >= zone.minY && position.y <= zone.maxY;

export const calculatePossessionByZone = (
  sequences: ReadonlyArray<PossessionSequence>,
  teamId: string
): ReadonlyArray<{ zone: string; possession: PossessionPercentage }> => FIELD_ZONES.map(zone => {
    const zoneSequences = sequences.filter(seq => 
      seq.teamId === teamId &&
      seq.events.some(event => isPositionInZone(event.position, zone))
    );
    
    const zoneDuration = zoneSequences.reduce(
      (total, seq) => {
        // Calculate time spent in this zone for this sequence
        const zoneEvents = seq.events.filter(event => 
          isPositionInZone(event.position, zone)
        );
        
        if (zoneEvents.length === 0) return total;
        
        // Estimate time in zone based on events
        const sequenceDuration = seq.endTime - seq.startTime;
        const zoneRatio = zoneEvents.length / seq.events.length;
        
        return total + (sequenceDuration * zoneRatio);
      },
      0
    );
    
    const totalTeamDuration = calculateTeamPossessionDuration(sequences, teamId);
    const zonePercentage = totalTeamDuration > 0 ? (zoneDuration / totalTeamDuration) * 100 : 0;
    
    return {
      zone: zone.name,
      possession: PossessionPercentage.fromNumber(zonePercentage)
    };
  });

// Calculate possession efficiency (successful actions per possession)
export const calculatePossessionEfficiency = (
  sequences: ReadonlyArray<PossessionSequence>,
  teamId: string
): number => {
  const teamSequences = sequences.filter(seq => seq.teamId === teamId);
  
  if (teamSequences.length === 0) return 0;
  
  const totalSuccessfulActions = teamSequences.reduce(
    (total, seq) => total + seq.events.filter(event => event.successful).length,
    0
  );
  
  const totalActions = teamSequences.reduce(
    (total, seq) => total + seq.events.length,
    0
  );
  
  return totalActions > 0 ? (totalSuccessfulActions / totalActions) * 100 : 0;
};

// Calculate possession transitions (how possession changes between teams)
export interface PossessionTransition {
  readonly fromTeam: string;
  readonly toTeam: string;
  readonly timestamp: number;
  readonly reason: string;
  readonly position: Position;
}

export const calculatePossessionTransitions = (
  sequences: ReadonlyArray<PossessionSequence>
): ReadonlyArray<PossessionTransition> => {
  const transitions: PossessionTransition[] = [];
  
  for (let i = 1; i < sequences.length; i++) {
    const prevSequence = sequences[i - 1];
    const currentSequence = sequences[i];

    // Add null checks for TypeScript strict mode
    if (!prevSequence || !currentSequence) {
      continue;
    }

    if (prevSequence.teamId !== currentSequence.teamId) {
      const lastEvent = prevSequence.events[prevSequence.events.length - 1];

      transitions.push({
        fromTeam: prevSequence.teamId,
        toTeam: currentSequence.teamId,
        timestamp: prevSequence.endTime,
        reason: prevSequence.endReason,
        position: lastEvent?.position || { x: 0, y: 0 }
      });
    }
  }
  
  return transitions;
};

// Export all calculation functions for testing
export const PossessionCalculationFunctions = {
  calculateTeamPossessionDuration,
  calculateTotalMatchDuration,
  calculatePossessionPercentage,
  calculateBothTeamsPossession,
  calculatePossessionByPeriods,
  calculateAveragePossessionDuration,
  calculatePossessionByZone,
  calculatePossessionEfficiency,
  calculatePossessionTransitions,
  isPositionInZone
};
