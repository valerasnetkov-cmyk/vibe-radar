export const BUILDABILITY_VERSION = 1;

export type BuildabilityLabel = "SOLO_MVP" | "SMALL_TEAM" | "TEAM_REQUIRED";

export type BuildabilityDimensions = {
  frontend: number;
  backend: number;
  infrastructure: number;
  externalApis: number;
  aiDependency: number;
  authBilling: number;
  dataRequirements: number;
  securityCompliance: number;
  realtimeMobile: number;
  operations: number;
};

export type BuildabilityInput = {
  dimensions: BuildabilityDimensions;
  constraints?: string[];
};

export type BuildabilityAssessment = {
  assessmentVersion: typeof BUILDABILITY_VERSION;
  label: BuildabilityLabel;
  dimensions: BuildabilityDimensions;
  constraints: string[];
  explanation: string;
};

function bounded(value: number): number {
  return Math.min(100, Math.max(0, Number.isFinite(value) ? value : 0));
}

export function assessBuildability(input: BuildabilityInput): BuildabilityAssessment {
  const dimensions = Object.fromEntries(
    Object.entries(input.dimensions).map(([key, value]) => [key, bounded(value)]),
  ) as BuildabilityDimensions;
  const values = Object.values(dimensions);
  const average = values.reduce((total, value) => total + value, 0) / values.length;
  const maximum = Math.max(...values);
  const label: BuildabilityLabel =
    average <= 35 && maximum <= 65
      ? "SOLO_MVP"
      : average <= 65 && maximum <= 85
        ? "SMALL_TEAM"
        : "TEAM_REQUIRED";
  const explanation =
    label === "SOLO_MVP"
      ? "Core value is feasible for a solo builder with bounded scope and AI-assisted development."
      : label === "SMALL_TEAM"
        ? "Core value is feasible for a small team, but multiple complex dimensions need parallel ownership."
        : "Core value requires team-level delivery, infrastructure, operations, or compliance capacity.";
  return {
    assessmentVersion: BUILDABILITY_VERSION,
    label,
    dimensions,
    constraints: [...new Set(input.constraints ?? [])].slice(0, 12),
    explanation,
  };
}
