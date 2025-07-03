import { AggregateRoot } from '@nestjs/cqrs';
import { TeamId } from '../value-objects/team-id.vo';
import { TeamName } from '../value-objects/team-name.vo';
import { TeamColors } from '../value-objects/team-colors.vo';
import { Player } from '../../../domain/models';
import { TeamCreatedEvent } from '../events/team-created.event';
import { TeamUpdatedEvent } from '../events/team-updated.event';
import { PlayerAddedToTeamEvent } from '../events/player-added-to-team.event';
import { PlayerRemovedFromTeamEvent } from '../events/player-removed-from-team.event';
import { TeamDeletedEvent } from '../events/team-deleted.event';

export interface TeamProps {
  id: TeamId;
  name: TeamName;
  shortName?: string;
  logo?: string;
  colors?: TeamColors;
  stadium?: string;
  foundedYear?: number;
  website?: string;
  socialMedia?: {
    facebook?: string;
    twitter?: string;
    instagram?: string;
  };
  players: Player[];
  coachId?: string;
  formation?: string;
  createdAt: Date;
  updatedAt: Date;
}

export class TeamAggregate extends AggregateRoot {
  private constructor(private readonly props: TeamProps) {
    super();
  }

  public static create(
    name: string,
    shortName?: string,
    logo?: string,
    colors?: { primary: string; secondary?: string },
    stadium?: string,
    foundedYear?: number,
    website?: string,
    socialMedia?: { facebook?: string; twitter?: string; instagram?: string }
  ): TeamAggregate {
    const teamId = TeamId.generate();
    const teamName = TeamName.create(name);
    const teamColors = colors
      ? TeamColors.create(colors.primary, colors.secondary)
      : undefined;

    const team = new TeamAggregate({
      id: teamId,
      name: teamName,
      shortName,
      logo,
      colors: teamColors,
      stadium,
      foundedYear,
      website,
      socialMedia,
      players: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const event = new TeamCreatedEvent(
      teamId.value,
      name,
      shortName,
      logo,
      colors?.primary,
      colors?.secondary,
      stadium,
      foundedYear,
      website,
      socialMedia
    );

    team.apply(event);
    return team;
  }

  public static fromPrimitives(data: any): TeamAggregate {
    return new TeamAggregate({
      id: TeamId.fromString(data.id),
      name: TeamName.create(data.name),
      shortName: data.shortName,
      logo: data.logo,
      colors: data.primaryColor
        ? TeamColors.create(data.primaryColor, data.secondaryColor)
        : undefined,
      stadium: data.stadium,
      foundedYear: data.foundedYear,
      website: data.website,
      socialMedia: data.socialMedia,
      players: data.players || [],
      coachId: data.coachId,
      formation: data.formation,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    });
  }

  public update(
    updateData: Partial<{
      name: string;
      shortName: string;
      logo: string;
      colors: { primary: string; secondary?: string };
      stadium: string;
      foundedYear: number;
      website: string;
      socialMedia: { facebook?: string; twitter?: string; instagram?: string };
      coachId: string;
      formation: string;
    }>
  ): void {
    if (updateData.name) {
      this.props.name = TeamName.create(updateData.name);
    }

    if (updateData.shortName !== undefined) {
      this.props.shortName = updateData.shortName;
    }

    if (updateData.logo !== undefined) {
      this.props.logo = updateData.logo;
    }

    if (updateData.colors) {
      this.props.colors = TeamColors.create(
        updateData.colors.primary,
        updateData.colors.secondary
      );
    }

    if (updateData.stadium !== undefined) {
      this.props.stadium = updateData.stadium;
    }

    if (updateData.foundedYear !== undefined) {
      this.props.foundedYear = updateData.foundedYear;
    }

    if (updateData.website !== undefined) {
      this.props.website = updateData.website;
    }

    if (updateData.socialMedia !== undefined) {
      this.props.socialMedia = updateData.socialMedia;
    }

    if (updateData.coachId !== undefined) {
      this.props.coachId = updateData.coachId;
    }

    if (updateData.formation !== undefined) {
      this.props.formation = updateData.formation;
    }

    this.props.updatedAt = new Date();

    const event = new TeamUpdatedEvent(this.props.id.value, updateData);

    this.apply(event);
  }

  public addPlayer(player: Player): void {
    if (this.props.players.some(p => p.id === player.id)) {
      throw new Error(`Player ${player.id} is already in the team`);
    }

    if (this.props.players.length >= 25) {
      throw new Error('Team cannot have more than 25 players');
    }

    this.props.players.push(player);
    this.props.updatedAt = new Date();

    const event = new PlayerAddedToTeamEvent(
      this.props.id.value,
      player.id,
      player.name,
      player.position || 'Unknown'
    );

    this.apply(event);
  }

  public removePlayer(playerId: string): void {
    const playerIndex = this.props.players.findIndex(p => p.id === playerId);

    if (playerIndex === -1) {
      throw new Error(`Player ${playerId} is not in the team`);
    }

    const removedPlayer = this.props.players[playerIndex];
    this.props.players.splice(playerIndex, 1);
    this.props.updatedAt = new Date();

    const event = new PlayerRemovedFromTeamEvent(
      this.props.id.value,
      playerId,
      removedPlayer.name
    );

    this.apply(event);
  }

  public delete(): void {
    const event = new TeamDeletedEvent(
      this.props.id.value,
      this.props.name.value
    );

    this.apply(event);
  }

  // Getters
  get id(): TeamId {
    return this.props.id;
  }

  get name(): TeamName {
    return this.props.name;
  }

  get shortName(): string | undefined {
    return this.props.shortName;
  }

  get logo(): string | undefined {
    return this.props.logo;
  }

  get colors(): TeamColors | undefined {
    return this.props.colors;
  }

  get stadium(): string | undefined {
    return this.props.stadium;
  }

  get foundedYear(): number | undefined {
    return this.props.foundedYear;
  }

  get website(): string | undefined {
    return this.props.website;
  }

  get socialMedia():
    | { facebook?: string; twitter?: string; instagram?: string }
    | undefined {
    return this.props.socialMedia;
  }

  get players(): Player[] {
    return [...this.props.players];
  }

  get coachId(): string | undefined {
    return this.props.coachId;
  }

  get formation(): string | undefined {
    return this.props.formation;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  get playersCount(): number {
    return this.props.players.length;
  }

  public toPrimitives(): any {
    return {
      id: this.props.id.value,
      name: this.props.name.value,
      shortName: this.props.shortName,
      logo: this.props.logo,
      primaryColor: this.props.colors?.primary,
      secondaryColor: this.props.colors?.secondary,
      stadium: this.props.stadium,
      foundedYear: this.props.foundedYear,
      website: this.props.website,
      socialMedia: this.props.socialMedia,
      players: this.props.players,
      coachId: this.props.coachId,
      formation: this.props.formation,
      createdAt: this.props.createdAt,
      updatedAt: this.props.updatedAt,
    };
  }
}
