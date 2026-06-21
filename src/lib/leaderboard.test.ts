import { describe, expect, it } from "vitest";

import {
  createLeaderboardEntry,
  isValidLeaderboardName,
  leaderboardLimit,
  rankLeaderboardEntries,
  truncateLeaderboardName,
  type LeaderboardEntryCandidate
} from "./leaderboard";

describe("leaderboard name validation", () => {
  it("accepts any characters from length 1 to 10", () => {
    expect(isValidLeaderboardName("A")).toBe(true);
    expect(isValidLeaderboardName("🐵! / x")).toBe(true);
    expect(isValidLeaderboardName("1234567890")).toBe(true);
  });

  it("rejects empty and longer-than-10-character names", () => {
    expect(isValidLeaderboardName("")).toBe(false);
    expect(isValidLeaderboardName("12345678901")).toBe(false);
  });

  it("truncates by user-perceived characters", () => {
    expect(truncateLeaderboardName("🐵🐵🐵🐵🐵🐵🐵🐵🐵🐵🐵")).toBe("🐵🐵🐵🐵🐵🐵🐵🐵🐵🐵");
  });
});

describe("createLeaderboardEntry", () => {
  it("recalculates the score server-side from exact run percentages", () => {
    const entry = createLeaderboardEntry({
      chosenPercentages: [21, 32, 65],
      name: "bruno",
      outcome: "failed",
      terminalLevel: 3
    });

    expect(entry.scoreExact).toBeCloseTo(260 + 2 / 3, 6);
    expect(entry.scoreDisplay).toBe(261);
    expect(entry.averageChosenPercentage).toBeCloseTo(39 + 1 / 3, 6);
  });
});

describe("rankLeaderboardEntries", () => {
  const baseEntry = {
    averageChosenPercentage: 40,
    outcome: "failed" as const,
    scoreDisplay: 260,
    scoreExact: 260,
    terminalLevel: 3
  };

  it("sorts by score, then terminal level, then earliest created date", () => {
    const entries: LeaderboardEntryCandidate[] = [
      { ...baseEntry, id: "late", name: "late", createdAt: "2026-06-21T10:00:00.000Z" },
      { ...baseEntry, id: "higher-level", name: "level", terminalLevel: 4, createdAt: "2026-06-21T12:00:00.000Z" },
      { ...baseEntry, id: "best", name: "best", scoreExact: 300, scoreDisplay: 300, createdAt: "2026-06-21T12:00:00.000Z" },
      { ...baseEntry, id: "early", name: "early", createdAt: "2026-06-21T09:00:00.000Z" }
    ];

    expect(rankLeaderboardEntries(entries).map((entry) => entry.id)).toEqual([
      "best",
      "higher-level",
      "early",
      "late"
    ]);
  });

  it("keeps only the top 100 entries", () => {
    const entries: LeaderboardEntryCandidate[] = Array.from({ length: leaderboardLimit + 5 }, (_, index) => ({
      ...baseEntry,
      createdAt: new Date(2026, 0, index + 1).toISOString(),
      id: String(index),
      name: String(index),
      scoreDisplay: index,
      scoreExact: index
    }));

    const ranked = rankLeaderboardEntries(entries);

    expect(ranked).toHaveLength(leaderboardLimit);
    expect(ranked[0]).toMatchObject({ rank: 1, scoreDisplay: leaderboardLimit + 4 });
    expect(ranked.at(-1)).toMatchObject({ rank: leaderboardLimit, scoreDisplay: 5 });
  });
});
