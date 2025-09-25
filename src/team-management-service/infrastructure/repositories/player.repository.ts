import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

type PlayerPrismaRecord = Record<string, unknown>; // replace with domain Player type when available

@Injectable()
export class PlayerRepository {
  private readonly logger = new Logger(PlayerRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<PlayerPrismaRecord[]> {
    try {
      const playersData = await this.prisma.player.findMany();
      return playersData.map((playerData: PlayerPrismaRecord) => ({ ...playerData }));
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Failed to fetch players: ${err.message}`, err.stack);
      throw err;
    }
  }

  async create(playerData: PlayerPrismaRecord): Promise<void> {
    try {
      await this.prisma.player.create({ data: playerData as any });
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Failed to create player: ${err.message}`, err.stack);
      throw err;
    }
  }
}