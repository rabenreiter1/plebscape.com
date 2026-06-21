import { calculateRunScore } from "./game";

export type LeaderboardOutcome = "failed" | "escaped";

export type LeaderboardEntry = {
  averageChosenPercentage: number;
  createdAt: string;
  id: string;
  name: string;
  outcome: LeaderboardOutcome;
  rank: number;
  scoreDisplay: number;
  scoreExact: number;
  terminalLevel: number;
};

export type LeaderboardEntryCandidate = Omit<LeaderboardEntry, "rank">;

export type LeaderboardSubmission = {
  chosenPercentages: number[];
  name: string;
  outcome: LeaderboardOutcome;
  terminalLevel: number;
};

export const leaderboardLimit = 100;
export const leaderboardNameMaxLength = 10;
export const leaderboardMinimumLevel = 5;

export function countLeaderboardNameCharacters(name: string) {
  return Array.from(name).length;
}

export function truncateLeaderboardName(name: string) {
  return Array.from(name).slice(0, leaderboardNameMaxLength).join("");
}

export function isValidLeaderboardName(name: string) {
  const length = countLeaderboardNameCharacters(name);
  return length >= 1 && length <= leaderboardNameMaxLength;
}

export function createLeaderboardEntry({
  chosenPercentages,
  name,
  outcome,
  terminalLevel
}: LeaderboardSubmission): Omit<LeaderboardEntryCandidate, "createdAt" | "id"> {
  const score = calculateRunScore({ failedLevel: terminalLevel, chosenPercentages });

  return {
    averageChosenPercentage: score.averageChosenPercentage,
    name,
    outcome,
    scoreDisplay: score.scoreDisplay,
    scoreExact: score.scoreExact,
    terminalLevel
  };
}

export function rankLeaderboardEntries(
  entries: readonly LeaderboardEntryCandidate[],
  limit = leaderboardLimit
): LeaderboardEntry[] {
  return [...entries]
    .sort(compareLeaderboardEntries)
    .slice(0, limit)
    .map((entry, index) => ({ ...entry, rank: index + 1 }));
}

function compareLeaderboardEntries(a: LeaderboardEntryCandidate, b: LeaderboardEntryCandidate) {
  if (b.scoreExact !== a.scoreExact) {
    return b.scoreExact - a.scoreExact;
  }

  if (b.terminalLevel !== a.terminalLevel) {
    return b.terminalLevel - a.terminalLevel;
  }

  return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
}
