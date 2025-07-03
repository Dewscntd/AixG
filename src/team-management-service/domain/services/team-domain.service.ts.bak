import { Injectable, Logger } from '@nestjs/common';
import { TeamAggregate } from '../entities/team.aggregate';
import { Player } from '../../../domain/models';

@Injectable()
export class TeamDomainService {
  private readonly logger = new Logger(TeamDomainService.name);

  validateTeamConfiguration(team: TeamAggregate): boolean {
    this.logger.log(`Validating team configuration: ${team.id.value}`);

    // Validate minimum and maximum players
    if (team.playersCount < 11) {
      this.logger.warn(`Team ${team.id.value} has less than 11 players`);
      return false;
    }

    if (team.playersCount > 25) {
      this.logger.warn(`Team ${team.id.value} has more than 25 players`);
      return false;
    }

    // Validate position distribution
    const players = team.players;
    const positions = {
      goalkeeper: 0,
      defender: 0,
      midfielder: 0,
      forward: 0,
    };

    players.forEach(player => {
      if (player.position && positions.hasOwnProperty(player.position)) {
        positions[player.position as keyof typeof positions]++;
      }
    });

    // Must have at least one goalkeeper
    if (positions.goalkeeper === 0) {
      this.logger.warn(`Team ${team.id.value} has no goalkeeper`);
      return false;
    }

    this.logger.log(`Team configuration valid: ${team.id.value}`);
    return true;
  }

  validatePlayerEligibility(team: TeamAggregate, player: Player): boolean {
    this.logger.log(
      `Validating player eligibility: ${player.id} for team ${team.id.value}`
    );

    // Check if player is already in the team
    if (team.players.some(p => p.id === player.id)) {
      this.logger.warn(
        `Player ${player.id} is already in team ${team.id.value}`
      );
      return false;
    }

    // Check team capacity
    if (team.playersCount >= 25) {
      this.logger.warn(`Team ${team.id.value} is at maximum capacity`);
      return false;
    }

    // Check jersey number conflicts
    if (
      player.jerseyNumber &&
      team.players.some(p => p.jerseyNumber === player.jerseyNumber)
    ) {
      this.logger.warn(
        `Jersey number ${player.jerseyNumber} is already taken in team ${team.id.value}`
      );
      return false;
    }

    this.logger.log(`Player eligibility valid: ${player.id}`);
    return true;
  }

  suggestFormation(team: TeamAggregate): string | null {
    this.logger.log(`Suggesting formation for team: ${team.id.value}`);

    const players = team.players;
    const positions = {
      goalkeeper: 0,
      defender: 0,
      midfielder: 0,
      forward: 0,
    };

    players.forEach(player => {
      if (player.position && positions.hasOwnProperty(player.position)) {
        positions[player.position as keyof typeof positions]++;
      }
    });

    // Simple formation suggestion based on available players
    if (
      positions.defender >= 4 &&
      positions.midfielder >= 3 &&
      positions.forward >= 3
    ) {
      return '4-3-3';
    } else if (
      positions.defender >= 4 &&
      positions.midfielder >= 4 &&
      positions.forward >= 2
    ) {
      return '4-4-2';
    } else if (
      positions.defender >= 3 &&
      positions.midfielder >= 5 &&
      positions.forward >= 2
    ) {
      return '3-5-2';
    }

    return null;
  }
}
