import { describe, expect, it } from "vitest";
import { letterFor, projectedScore, requiredAverage, summarize, DEFAULT_THRESHOLDS, type GradeComponent } from "./grade";

const comps: GradeComponent[] = [
  { id: "a", name: "Tugas", weight: 20, score: 80 },
  { id: "b", name: "UTS", weight: 30, score: 70 },
  { id: "c", name: "UAS", weight: 50, score: null },
];

describe("grade math", () => {
  it("sums weighted contributions of known scores", () => {
    const s = summarize(comps);
    expect(s.earned).toBe(37); // 16 + 21
    expect(s.remainingWeight).toBe(50);
    expect(s.maxPossible).toBe(87);
  });
  it("computes the UAS score needed for an A (76)", () => {
    expect(requiredAverage(comps, 76)).toEqual({ status: "possible", needed: 78 });
  });
  it("flags an impossible target", () => {
    expect(requiredAverage(comps, 90).status).toBe("impossible");
  });
  it("detects an already achieved target", () => {
    expect(requiredAverage(comps, 30).status).toBe("achieved");
  });
  it("projects final score from simulated scores", () => {
    expect(projectedScore(comps, { c: 90 })).toBe(82);
  });
  it("maps scores to IPB-style letters at the boundary", () => {
    expect(letterFor(76, DEFAULT_THRESHOLDS)).toBe("A");
    expect(letterFor(75.99, DEFAULT_THRESHOLDS)).toBe("AB");
    expect(letterFor(10, DEFAULT_THRESHOLDS)).toBe("E");
  });
});
