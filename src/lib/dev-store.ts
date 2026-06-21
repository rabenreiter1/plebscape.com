import { calculateVoteOutcome, type LevelPublic, type RevealedResult, type Side } from "./game";
import {
  createLeaderboardEntry,
  rankLeaderboardEntries,
  type LeaderboardEntry,
  type LeaderboardEntryCandidate,
  type LeaderboardSubmission
} from "./leaderboard";
import { getMissingLevelPairs, selectBalancedLevel } from "./level-pairs";

type DevLevel = LevelPublic & {
  votesA: number;
  votesB: number;
};

const store = globalThis as typeof globalThis & {
  plebscapeDevLeaderboard?: LeaderboardEntryCandidate[];
  plebscapeDevLevels?: DevLevel[];
  plebscapeDevIndex?: number;
};

function devLevels() {
  if (!store.plebscapeDevLevels) {
    store.plebscapeDevLevels = [];
    store.plebscapeDevIndex = 0;
  }

  return store.plebscapeDevLevels;
}

function devLeaderboard() {
  store.plebscapeDevLeaderboard ??= [];
  return store.plebscapeDevLeaderboard;
}

export function shouldUseDevStore() {
  return process.env.NODE_ENV !== "production" && !process.env.DATABASE_URL;
}

export function getNextDevLevel(
  seenLevelIds: string[]
): { level: LevelPublic; generated: boolean } | { exhausted: true } {
  const existing = devLevels();
  ensureDevAuthoredLevels(existing);
  const selected = selectBalancedLevel({ levels: existing, seenLevelIds });

  if (!selected) {
    return { exhausted: true };
  }

  return { level: publicLevel(selected), generated: false };
}

function ensureDevAuthoredLevels(existing: DevLevel[]) {
  const missingPairs = getMissingLevelPairs(existing);

  existing.push(
    ...missingPairs.map((pair) => ({
      id: crypto.randomUUID(),
      nounA: pair.nounA,
      nounB: pair.nounB,
      votesA: 0,
      votesB: 0
    }))
  );
}

export function recordDevVote(levelId: string, chosenSide: Side): RevealedResult | null {
  const level = devLevels().find((candidate) => candidate.id === levelId);

  if (!level) {
    return null;
  }

  const outcome = calculateVoteOutcome({
    levelId: level.id,
    nounA: level.nounA,
    nounB: level.nounB,
    votesA: level.votesA,
    votesB: level.votesB,
    chosenSide
  });

  level.votesA = outcome.votesA;
  level.votesB = outcome.votesB;
  return outcome;
}

export function getDevLeaderboard(): LeaderboardEntry[] {
  return rankLeaderboardEntries(devLeaderboard());
}

export function saveDevLeaderboardEntry(submission: LeaderboardSubmission): LeaderboardEntry[] {
  devLeaderboard().push({
    ...createLeaderboardEntry(submission),
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString()
  });

  return getDevLeaderboard();
}

function publicLevel(level: DevLevel): LevelPublic {
  return {
    id: level.id,
    nounA: level.nounA,
    nounB: level.nounB
  };
}
