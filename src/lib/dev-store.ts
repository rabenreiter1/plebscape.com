import { calculateVoteOutcome, type LevelPublic, type RevealedResult, type Side } from "./game";
import { nounBank } from "./noun-bank";

type DevLevel = LevelPublic & {
  votesA: number;
  votesB: number;
};

const store = globalThis as typeof globalThis & {
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

export function shouldUseDevStore() {
  return process.env.NODE_ENV !== "production" && !process.env.DATABASE_URL;
}

export function getNextDevLevel(
  seenLevelIds: string[]
): { level: LevelPublic; generated: boolean } | { exhausted: true } {
  const existing = devLevels();
  const eligible = existing.filter(
    (level) => level.votesA + level.votesB > 0 && !seenLevelIds.includes(level.id)
  );

  if (eligible.length > 0) {
    const level = eligible[Math.floor(Math.random() * eligible.length)];
    return { level: publicLevel(level), generated: false };
  }

  const index = store.plebscapeDevIndex ?? 0;
  const nounIndex = index * 2;

  if (nounIndex + 1 >= nounBank.length) {
    return { exhausted: true };
  }

  const pair = [nounBank[nounIndex], nounBank[nounIndex + 1]] as const;
  store.plebscapeDevIndex = index + 1;

  const level: DevLevel = {
    id: crypto.randomUUID(),
    nounA: pair[0],
    nounB: pair[1],
    votesA: 0,
    votesB: 0
  };

  existing.push(level);
  return { level: publicLevel(level), generated: true };
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

function publicLevel(level: DevLevel): LevelPublic {
  return {
    id: level.id,
    nounA: level.nounA,
    nounB: level.nounB
  };
}
