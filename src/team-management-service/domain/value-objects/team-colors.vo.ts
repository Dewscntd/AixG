export type TeamColors = {
  primary: string;
  secondary?: string | undefined;
};

// Helper to safely build TeamColors without assigning `secondary: undefined`
export function buildTeamColors(color: { primary: string; secondary?: string | null }): TeamColors {
  return {
    primary: color.primary,
    ...(color.secondary ? { secondary: String(color.secondary) } : {}),
  };
}