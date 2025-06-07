/**
 * Pure functional xG calculation service using composition
 */

import { ShotData, XGValue, Position } from '../value-objects/analytics-metrics';

// Type definitions for functional composition
type XGModifier = (baseXG: number, shotData: ShotData) => number;
type XGCalculator = (shotData: ShotData) => XGValue;

// Pure function for base xG calculation
const baseXGCalculation = (shotData: ShotData): number => {
  const { distanceToGoal, angle } = shotData;
  
  // Base model using distance and angle (simplified Poisson regression model)
  const distanceFactor = Math.exp(-0.1 * distanceToGoal);
  const angleFactor = Math.cos(angle * Math.PI / 180);
  
  return Math.min(0.95, Math.max(0.01, distanceFactor * angleFactor * 0.3));
};

// Distance modifier function
const applyDistanceModifier: XGModifier = (baseXG: number, shotData: ShotData): number => {
  const { distanceToGoal } = shotData;
  
  if (distanceToGoal <= 6) {
    return baseXG * 1.8; // Close range shots
  } else if (distanceToGoal <= 12) {
    return baseXG * 1.4; // Penalty area shots
  } else if (distanceToGoal <= 20) {
    return baseXG * 1.0; // Edge of box
  } else {
    return baseXG * 0.6; // Long range shots
  }
};

// Angle modifier function
const applyAngleModifier: XGModifier = (baseXG: number, shotData: ShotData): number => {
  const { angle } = shotData;
  
  if (angle <= 15) {
    return baseXG * 1.6; // Central shots
  } else if (angle <= 30) {
    return baseXG * 1.3; // Good angle
  } else if (angle <= 45) {
    return baseXG * 1.0; // Moderate angle
  } else {
    return baseXG * 0.7; // Tight angle
  }
};

// Defender modifier function
const applyDefenderModifier: XGModifier = (baseXG: number, shotData: ShotData): number => {
  const { defenderCount } = shotData;
  
  switch (defenderCount) {
    case 0:
      return baseXG * 1.8; // Clear shot
    case 1:
      return baseXG * 1.3; // One defender
    case 2:
      return baseXG * 1.0; // Two defenders
    case 3:
      return baseXG * 0.7; // Three defenders
    default:
      return baseXG * 0.5; // Crowded
  }
};

// Game state modifier function
const applyGameStateModifier: XGModifier = (baseXG: number, shotData: ShotData): number => {
  const { gameState } = shotData;
  let modifier = 1.0;
  
  // Time pressure modifier
  if (gameState.minute > 85) {
    modifier *= 1.1; // Late game urgency
  }
  
  // Score difference modifier
  if (Math.abs(gameState.scoreDifference) >= 2) {
    modifier *= 0.9; // Less pressure when game is decided
  }
  
  // Home advantage
  if (gameState.isHome) {
    modifier *= 1.05;
  }
  
  return baseXG * modifier;
};

// Body part modifier function
const applyBodyPartModifier: XGModifier = (baseXG: number, shotData: ShotData): number => {
  const { bodyPart } = shotData;
  
  switch (bodyPart) {
    case 'foot':
      return baseXG * 1.0; // Base case
    case 'head':
      return baseXG * 0.8; // Headers are generally less accurate
    case 'other':
      return baseXG * 0.6; // Other body parts
    default:
      return baseXG;
  }
};

// Situation modifier function
const applySituationModifier: XGModifier = (baseXG: number, shotData: ShotData): number => {
  const { situation } = shotData;
  
  switch (situation) {
    case 'penalty':
      return 0.76; // Historical penalty conversion rate
    case 'free_kick':
      return baseXG * 0.7; // Free kicks are harder
    case 'corner':
      return baseXG * 0.8; // Corner situations
    case 'open_play':
      return baseXG * 1.0; // Base case
    default:
      return baseXG;
  }
};

// Functional composition utility
const compose = <T>(...functions: Array<(arg: T) => T>) => (arg: T): T =>
  functions.reduceRight((acc, fn) => fn(acc), arg);

// Pipe utility for left-to-right composition
const pipe = <T>(...functions: Array<(arg: T) => T>) => (arg: T): T =>
  functions.reduce((acc, fn) => fn(acc), arg);

// Main xG calculation using functional composition
export const calculateXG: XGCalculator = (shotData: ShotData): XGValue => {
  // Create a pipeline of modifiers
  const modifierPipeline = (baseXG: number): number => {
    return pipe(
      (xg: number) => applyDistanceModifier(xg, shotData),
      (xg: number) => applyAngleModifier(xg, shotData),
      (xg: number) => applyDefenderModifier(xg, shotData),
      (xg: number) => applyGameStateModifier(xg, shotData),
      (xg: number) => applyBodyPartModifier(xg, shotData),
      (xg: number) => applySituationModifier(xg, shotData)
    )(baseXG);
  };
  
  const baseXG = baseXGCalculation(shotData);
  const finalXG = modifierPipeline(baseXG);
  
  return XGValue.fromNumber(Math.min(0.99, Math.max(0.01, finalXG)));
};

// Alternative composition using compose (right-to-left)
export const calculateXGComposed: XGCalculator = (shotData: ShotData): XGValue => {
  const baseXG = baseXGCalculation(shotData);
  
  const finalXG = compose(
    (xg: number) => applySituationModifier(xg, shotData),
    (xg: number) => applyBodyPartModifier(xg, shotData),
    (xg: number) => applyGameStateModifier(xg, shotData),
    (xg: number) => applyDefenderModifier(xg, shotData),
    (xg: number) => applyAngleModifier(xg, shotData),
    (xg: number) => applyDistanceModifier(xg, shotData)
  )(baseXG);
  
  return XGValue.fromNumber(Math.min(0.99, Math.max(0.01, finalXG)));
};

// Utility functions for position calculations
export const calculateDistance = (from: Position, to: Position): number => {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  return Math.sqrt(dx * dx + dy * dy);
};

export const calculateAngle = (shotPosition: Position, goalPosition: Position): number => {
  const goalWidth = 7.32; // Standard goal width in meters
  const goalLeft = { x: goalPosition.x - goalWidth / 2, y: goalPosition.y };
  const goalRight = { x: goalPosition.x + goalWidth / 2, y: goalPosition.y };
  
  const angleLeft = Math.atan2(goalLeft.y - shotPosition.y, goalLeft.x - shotPosition.x);
  const angleRight = Math.atan2(goalRight.y - shotPosition.y, goalRight.x - shotPosition.x);
  
  return Math.abs(angleLeft - angleRight) * (180 / Math.PI);
};

// Expected Assists (xA) calculation
export const calculateXA = (passData: any, subsequentShot: ShotData): XGValue => {
  // xA is the xG value of the shot that resulted from the pass
  const shotXG = calculateXG(subsequentShot);
  
  // Apply pass quality modifier
  const passQualityModifier = passData.successful ? 1.0 : 0.0;
  const passTypeModifier = passData.type === 'through_ball' ? 1.2 : 
                          passData.type === 'cross' ? 1.1 : 1.0;
  
  return XGValue.fromNumber(shotXG.value * passQualityModifier * passTypeModifier);
};

// Batch xG calculation for multiple shots
export const calculateBatchXG = (shots: ShotData[]): XGValue => {
  return shots
    .map(calculateXG)
    .reduce((total, xg) => total.add(xg), XGValue.zero());
};

// xG per minute calculation
export const calculateXGPerMinute = (shots: ShotData[], matchDuration: number): number => {
  const totalXG = calculateBatchXG(shots);
  return matchDuration > 0 ? totalXG.value / matchDuration : 0;
};

// Export all calculation functions for testing
export const XGCalculationFunctions = {
  baseXGCalculation,
  applyDistanceModifier,
  applyAngleModifier,
  applyDefenderModifier,
  applyGameStateModifier,
  applyBodyPartModifier,
  applySituationModifier,
  calculateDistance,
  calculateAngle,
  calculateXA,
  calculateBatchXG,
  calculateXGPerMinute
};
