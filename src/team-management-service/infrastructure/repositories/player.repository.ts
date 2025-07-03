import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { Player } from '../../../domain/models';

export interface IPlayerRepository {
  findById(id: string): Promise<Player | null>;
  findByTeamId(teamId: string): Promise<Player[]>;
  save(player: Player): Promise<void>;
  delete(id: string): Promise<void>;
}

@Injectable()
export class PlayerRepository implements IPlayerRepository {
  private readonly logger = new Logger(PlayerRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<Player | null> {
    this.logger.log(`Finding player by ID: ${id}`);

    try {
      const playerData = await this.prisma.player.findUnique({
        where: { id },
      });

      if (!playerData) {
        return null;
      }

      return {
        id: playerData.id,
        name: playerData.name,
        jerseyNumber: playerData.jerseyNumber || undefined,
        position: playerData.position || undefined,
        teamId: playerData.teamId || undefined,
        dateOfBirth: playerData.dateOfBirth || undefined,
        nationality: playerData.nationality || undefined,
      };
    } catch (error) {
      this.logger.error(
        `Failed to find player by ID ${id}: ${error.message}`,
        error.stack
      );
      throw error;
    }
  }

  async findByTeamId(teamId: string): Promise<Player[]> {
    this.logger.log(`Finding players by team ID: ${teamId}`);

    try {
      const playersData = await this.prisma.player.findMany({
        where: { teamId },
      });

      return playersData.map(playerData => ({
        id: playerData.id,
        name: playerData.name,
        jerseyNumber: playerData.jerseyNumber || undefined,
        position: playerData.position || undefined,
        teamId: playerData.teamId || undefined,
        dateOfBirth: playerData.dateOfBirth || undefined,
        nationality: playerData.nationality || undefined,
      }));
    } catch (error) {
      this.logger.error(
        `Failed to find players by team ID ${teamId}: ${error.message}`,
        error.stack
      );
      throw error;
    }
  }

  async save(player: Player): Promise<void> {
    this.logger.log(`Saving player: ${player.id}`);

    try {
      await this.prisma.player.upsert({
        where: { id: player.id },
        update: {
          name: player.name,
          jerseyNumber: player.jerseyNumber,
          position: player.position,
          teamId: player.teamId,
          dateOfBirth: player.dateOfBirth,
          nationality: player.nationality,
        },
        create: {
          id: player.id,
          name: player.name,
          jerseyNumber: player.jerseyNumber,
          position: player.position,
          teamId: player.teamId,
          dateOfBirth: player.dateOfBirth,
          nationality: player.nationality,
        },
      });

      this.logger.log(`Player saved successfully: ${player.id}`);
    } catch (error) {
      this.logger.error(
        `Failed to save player ${player.id}: ${error.message}`,
        error.stack
      );
      throw error;
    }
  }

  async delete(id: string): Promise<void> {
    this.logger.log(`Deleting player: ${id}`);

    try {
      await this.prisma.player.delete({
        where: { id },
      });

      this.logger.log(`Player deleted successfully: ${id}`);
    } catch (error) {
      this.logger.error(
        `Failed to delete player ${id}: ${error.message}`,
        error.stack
      );
      throw error;
    }
  }
}
