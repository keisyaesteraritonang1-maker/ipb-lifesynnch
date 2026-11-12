// Pure grade math for the Grade Predictor. All weights are percentages (sum ideally 100),
// all scores are on a 0–100 scale.

export type GradeComponent = {
  id: string;
  name: string;
  weight: number;
  score: number | null; // null = not yet known
};

export type GradeThreshold = { grade: string; min: number };

export const DEFAULT_THRESHOLDS: GradeThreshold[] = [
  { grade: "A", min: 76 },
  { grade: "AB", min: 71 },
  { grade: "B", min: 66 },
  { grade: "BC", min: 61 },
  { grade: "C", min: 56 },
  { grade: "D", min: 51 },
  { grade: "E", min: 0 },
];

const round2 = (n: number) => Math.round(n * 100) / 100;

export function totalWeight(components: GradeComponent[]) {
  return round2(components.reduce((s, c) => s + (Number.isFinite(c.weight) ? c.weight : 0), 0));
}

export function summarize(components: GradeComponent[]) {
  let earned = 0;
  let completedWeight = 0;
  let remainingWeight = 0;
  for (const c of components) {
    const w = Number.isFinite(c.weight) ? c.weight : 0;
    if (c.score === null || !Number.isFinite(c.score)) remainingWeight += w;
    else {
      earned += (w * clampScore(c.score)) / 100;
      completedWeight += w;
    }
  }
  return {
    totalWeight: round2(completedWeight + remainingWeight),
    earned: round2(earned),
    completedWeight: round2(completedWeight),
    remainingWeight: round2(remainingWeight),
    averageOnCompleted: completedWeight > 0 ? round2((earned / completedWeight) * 100) : null,
    minPossible: round2(earned),
    maxPossible: round2(earned + remainingWeight),
  };
}

export function clampScore(n: number) {
  return Math.min(100, Math.max(0, n));
}

export type Requirement =
  | { status: "achieved"; needed: 0 }
  | { status: "possible"; needed: number }
  | { status: "impossible"; needed: number }
  | { status: "no-remaining"; needed: null };

/** Average score needed on every remaining component to reach `targetMin`. */
export function requiredAverage(components: GradeComponent[], targetMin: number): Requirement {
  const s = summarize(components);
  if (s.earned >= targetMin) return { status: "achieved", needed: 0 };
  if (s.remainingWeight <= 0) return { status: "no-remaining", needed: null };
  const needed = round2(((targetMin - s.earned) / s.remainingWeight) * 100);
  return needed > 100 ? { status: "impossible", needed } : { status: "possible", needed };
}

/** Final score using known scores plus hypothetical scores for the unknown ones. */
export function projectedScore(components: GradeComponent[], hypothetical: Record<string, number>) {
  let total = 0;
  for (const c of components) {
    const sc = c.score ?? hypothetical[c.id] ?? 0;
    total += (c.weight * clampScore(sc)) / 100;
  }
  return round2(total);
}

export function letterFor(score: number, thresholds: GradeThreshold[]) {
  const sorted = [...thresholds].sort((a, b) => b.min - a.min);
  return sorted.find((t) => score >= t.min)?.grade ?? sorted.at(-1)?.grade ?? "-";
}
