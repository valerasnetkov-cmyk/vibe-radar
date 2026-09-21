export const GROWTH_WINDOWS = {
  twoHours: 2 * 60 * 60 * 1000,
  oneDay: 24 * 60 * 60 * 1000,
  sevenDays: 7 * 24 * 60 * 60 * 1000,
} as const;

export type GrowthSnapshot = {
  observedAt: Date;
  stars: number;
};

export type GrowthWindow = {
  status: "AVAILABLE" | "INSUFFICIENT_DATA" | "ZERO_BASELINE";
  delta: number | null;
  percent: number | null;
  hours: number;
  baselineObservedAt: Date | null;
  currentObservedAt: Date | null;
};

export type GrowthResult = {
  asOf: Date | null;
  latestStars: number | null;
  twoHours: GrowthWindow;
  oneDay: GrowthWindow;
  sevenDays: GrowthWindow;
  acceleration: number | null;
  accelerationStatus: "AVAILABLE" | "INSUFFICIENT_DATA";
};

function unavailable(
  hours: number,
  status: GrowthWindow["status"] = "INSUFFICIENT_DATA",
): GrowthWindow {
  return {
    status,
    delta: null,
    percent: null,
    hours,
    baselineObservedAt: null,
    currentObservedAt: null,
  };
}

function calculateWindow(snapshots: GrowthSnapshot[], duration: number): GrowthWindow {
  const hours = duration / (60 * 60 * 1000);
  if (snapshots.length < 2) return unavailable(hours);
  const current = snapshots.at(-1);
  if (!current) return unavailable(hours);
  const target = current.observedAt.getTime() - duration;
  const baseline = [...snapshots]
    .reverse()
    .find((snapshot) => snapshot.observedAt.getTime() <= target);
  if (!baseline) return unavailable(hours);
  if (baseline.stars === 0) {
    return {
      status: "ZERO_BASELINE",
      delta: current.stars - baseline.stars,
      percent: null,
      hours,
      baselineObservedAt: baseline.observedAt,
      currentObservedAt: current.observedAt,
    };
  }
  const delta = current.stars - baseline.stars;
  return {
    status: "AVAILABLE",
    delta,
    percent: (delta / baseline.stars) * 100,
    hours,
    baselineObservedAt: baseline.observedAt,
    currentObservedAt: current.observedAt,
  };
}

export function calculateGrowth(input: GrowthSnapshot[]): GrowthResult {
  const snapshots = input
    .filter(
      (snapshot) =>
        Number.isFinite(snapshot.stars) && Number.isFinite(snapshot.observedAt.getTime()),
    )
    .sort((left, right) => left.observedAt.getTime() - right.observedAt.getTime());
  const current = snapshots.at(-1);
  const twoHours = calculateWindow(snapshots, GROWTH_WINDOWS.twoHours);
  const oneDay = calculateWindow(snapshots, GROWTH_WINDOWS.oneDay);
  const sevenDays = calculateWindow(snapshots, GROWTH_WINDOWS.sevenDays);
  const acceleration =
    twoHours.status === "AVAILABLE" && oneDay.status === "AVAILABLE"
      ? twoHours.delta! / twoHours.hours - oneDay.delta! / oneDay.hours
      : null;
  return {
    asOf: current?.observedAt ?? null,
    latestStars: current?.stars ?? null,
    twoHours,
    oneDay,
    sevenDays,
    acceleration,
    accelerationStatus: acceleration === null ? "INSUFFICIENT_DATA" : "AVAILABLE",
  };
}
