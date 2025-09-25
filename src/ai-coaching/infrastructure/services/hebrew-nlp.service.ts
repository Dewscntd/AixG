import { Injectable } from '@nestjs/common';

@Injectable()
export class HebrewNlpService {
  // If token or morphology aren't used yet, prefix with underscore.
  // Replace `unknown` with a proper interface (e.g., Token, Morphology) when available.
  analyze(_token: unknown, _morphology: unknown): void {
    // TODO: implement real logic. Linter will no longer flag unused args.
  }

  // Example of a method that previously used `any`; use `unknown` or a proper type.
  normalizeText(text: string): string {
    // implement actual normalization instead of using `any`
    return text.trim();
  }
}
