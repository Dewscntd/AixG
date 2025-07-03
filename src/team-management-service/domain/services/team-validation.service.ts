import { Injectable, Logger } from '@nestjs/common';
import { CreateTeamCommand } from '../../application/commands/create-team.command';

@Injectable()
export class TeamValidationService {
  private readonly logger = new Logger(TeamValidationService.name);

  async validateTeamCreation(command: CreateTeamCommand): Promise<void> {
    this.logger.log(`Validating team creation: ${command.name}`);

    const errors: string[] = [];

    // Validate required fields
    if (!command.name || command.name.trim().length === 0) {
      errors.push('Team name is required');
    }

    // Validate name length and format
    if (command.name && command.name.length < 2) {
      errors.push('Team name must be at least 2 characters long');
    }

    if (command.name && command.name.length > 100) {
      errors.push('Team name cannot exceed 100 characters');
    }

    // Validate short name
    if (command.shortName && command.shortName.length > 10) {
      errors.push('Team short name cannot exceed 10 characters');
    }

    // Validate colors
    if (command.colors?.primary) {
      if (!this.isValidHexColor(command.colors.primary)) {
        errors.push('Primary color must be a valid hex color (e.g., #FF0000)');
      }
    }

    if (command.colors?.secondary) {
      if (!this.isValidHexColor(command.colors.secondary)) {
        errors.push(
          'Secondary color must be a valid hex color (e.g., #00FF00)'
        );
      }
    }

    // Validate founded year
    if (command.foundedYear) {
      const currentYear = new Date().getFullYear();
      if (command.foundedYear < 1800 || command.foundedYear > currentYear) {
        errors.push(`Founded year must be between 1800 and ${currentYear}`);
      }
    }

    // Validate website URL
    if (command.website) {
      if (!this.isValidUrl(command.website)) {
        errors.push('Website must be a valid URL');
      }
    }

    // Validate social media URLs
    if (command.socialMedia) {
      if (
        command.socialMedia.facebook &&
        !this.isValidUrl(command.socialMedia.facebook)
      ) {
        errors.push('Facebook URL must be a valid URL');
      }
      if (
        command.socialMedia.twitter &&
        !this.isValidUrl(command.socialMedia.twitter)
      ) {
        errors.push('Twitter URL must be a valid URL');
      }
      if (
        command.socialMedia.instagram &&
        !this.isValidUrl(command.socialMedia.instagram)
      ) {
        errors.push('Instagram URL must be a valid URL');
      }
    }

    // Validate logo URL
    if (command.logo && !this.isValidUrl(command.logo)) {
      errors.push('Logo must be a valid URL');
    }

    if (errors.length > 0) {
      throw new Error(`Team validation failed: ${errors.join(', ')}`);
    }

    this.logger.log(`Team validation passed: ${command.name}`);
  }

  private isValidHexColor(color: string): boolean {
    const hexColorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
    return hexColorRegex.test(color);
  }

  private isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }
}
