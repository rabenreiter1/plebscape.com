export type LevelPair = {
  nounA: string;
  nounB: string;
};
export type LevelVoteCandidate = LevelPair & {
  id: string;
  votesA: number;
  votesB: number;
};

export const levelPairs = [
  { nounA: "old", nounB: "young" },
  { nounA: "female", nounB: "male" },
  { nounA: "poor", nounB: "rich" },
  { nounA: "weak", nounB: "strong" },
  { nounA: "sick", nounB: "healthy" },
  { nounA: "fit", nounB: "unfit" },
  { nounA: "asleep", nounB: "awake" },
  { nounA: "alive", nounB: "dead" },
  { nounA: "happy", nounB: "sad" },
  { nounA: "angry", nounB: "calm" },
  { nounA: "shy", nounB: "bold" },
  { nounA: "boring", nounB: "interesting" },
  { nounA: "proud", nounB: "ashamed" },
  { nounA: "hopeful", nounB: "hopeless" },
  { nounA: "kind", nounB: "cruel" },
  { nounA: "stupid", nounB: "smart" },
  { nounA: "patient", nounB: "impatient" },
  { nounA: "lazy", nounB: "active" },
  { nounA: "careful", nounB: "careless" },
  { nounA: "polite", nounB: "rude" },
  { nounA: "clean", nounB: "dirty" },
  { nounA: "good", nounB: "bad" },
  { nounA: "guilty", nounB: "innocent" },
  { nounA: "right", nounB: "wrong" },
  { nounA: "loyal", nounB: "disloyal" },
  { nounA: "selfish", nounB: "generous" },
  { nounA: "gentle", nounB: "rough" },
  { nounA: "peaceful", nounB: "violent" },
  { nounA: "leader", nounB: "follower" },
  { nounA: "winner", nounB: "loser" },
  { nounA: "master", nounB: "servant" },
  { nounA: "teacher", nounB: "student" },
  { nounA: "doctor", nounB: "patient" },
  { nounA: "hero", nounB: "villain" },
  { nounA: "stranger", nounB: "friend" },
  { nounA: "enemy", nounB: "ally" },
  { nounA: "free", nounB: "trapped" },
  { nounA: "safe", nounB: "unsafe" },
  { nounA: "powerful", nounB: "powerless" },
  { nounA: "famous", nounB: "unknown" },
  { nounA: "wanted", nounB: "unwanted" },
  { nounA: "accepted", nounB: "rejected" },
  { nounA: "atheist", nounB: "theist" },
  { nounA: "sinner", nounB: "saint" },
  { nounA: "heaven", nounB: "hell" },
  { nounA: "truth", nounB: "lie" },
  { nounA: "order", nounB: "chaos" },
  { nounA: "love", nounB: "hate" },
  { nounA: "laugh", nounB: "cry" },
  { nounA: "speak", nounB: "listen" },
  { nounA: "ask", nounB: "answer" },
  { nounA: "give", nounB: "take" },
  { nounA: "help", nounB: "harm" },
  { nounA: "share", nounB: "steal" },
  { nounA: "reward", nounB: "punish" },
  { nounA: "success", nounB: "failure" },
  { nounA: "work", nounB: "rest" },
  { nounA: "play", nounB: "fight" },
  { nounA: "alone", nounB: "together" },
  { nounA: "empty", nounB: "full" },
  { nounA: "cold", nounB: "warm" },
  { nounA: "human", nounB: "animal" },
  { nounA: "future", nounB: "past" },
  { nounA: "ancestor", nounB: "descendant" },
  { nounA: "nocturnal", nounB: "diurnal" },
  { nounA: "introvert", nounB: "extrovert" },
  { nounA: "married", nounB: "single" },
  { nounA: "public", nounB: "private" },
  { nounA: "educated", nounB: "uneducated" },
  { nounA: "believer", nounB: "skeptic" },
  { nounA: "optimist", nounB: "pessimist" },
  { nounA: "realist", nounB: "dreamer" },
  { nounA: "creator", nounB: "destroyer" },
  { nounA: "predator", nounB: "prey" },
  { nounA: "mature", nounB: "immature" },
  { nounA: "sober", nounB: "intoxicated" },
  { nounA: "normal", nounB: "weird" },
  { nounA: "dependent", nounB: "independent" },
  { nounA: "visible", nounB: "invisible" },
  { nounA: "lucky", nounB: "unlucky" },
  { nounA: "confident", nounB: "insecure" },
  { nounA: "obedient", nounB: "rebellious" },
  { nounA: "forgiving", nounB: "vengeful" },
  { nounA: "urban", nounB: "rural" },
  { nounA: "online", nounB: "offline" },
  { nounA: "arrive", nounB: "depart" },
  { nounA: "abroad", nounB: "domestic" },
  { nounA: "journey", nounB: "destination" },
  { nounA: "early", nounB: "late" },
  { nounA: "near", nounB: "far" },
  { nounA: "send", nounB: "receive" },
  { nounA: "call", nounB: "text" },
  { nounA: "connected", nounB: "disconnected" },
  { nounA: "left", nounB: "right" },
  { nounA: "capitalism", nounB: "socialism" },
  { nounA: "conservative", nounB: "liberal" },
  { nounA: "organic", nounB: "artificial" },
  { nounA: "professional", nounB: "amateur" },
  { nounA: "formal", nounB: "casual" },
  { nounA: "temporary", nounB: "permanent" }
] as const satisfies readonly LevelPair[];

export const levelPairCount = 100;

export function pairKey(pair: LevelPair): string {
  return [pair.nounA, pair.nounB].sort().join("/");
}

export function validateLevelPairs(pairs: readonly LevelPair[] = levelPairs): {
  ok: boolean;
  message?: string;
} {
  if (pairs.length !== levelPairCount) {
    return { ok: false, message: `Expected ${levelPairCount} level pairs, found ${pairs.length}.` };
  }

  const seenPairs = new Set<string>();

  for (const pair of pairs) {
    if (!isValidWord(pair.nounA) || !isValidWord(pair.nounB)) {
      return { ok: false, message: "Level pairs must contain lowercase single words." };
    }

    if (pair.nounA === pair.nounB) {
      return { ok: false, message: "Level pairs cannot repeat the same word." };
    }

    const key = pairKey(pair);

    if (seenPairs.has(key)) {
      return { ok: false, message: `Duplicate level pair: ${pair.nounA} / ${pair.nounB}.` };
    }

    seenPairs.add(key);
  }

  return { ok: true };
}

export function selectUncreatedLevelPair({
  existingPairs,
  pairs = levelPairs,
  random = Math.random
}: {
  existingPairs: readonly LevelPair[];
  pairs?: readonly LevelPair[];
  random?: () => number;
}): LevelPair | null {
  const uncreated = getMissingLevelPairs(existingPairs, pairs);

  if (uncreated.length === 0) {
    return null;
  }

  return uncreated[Math.floor(random() * uncreated.length)];
}

export function getMissingLevelPairs(
  existingPairs: readonly LevelPair[],
  pairs: readonly LevelPair[] = levelPairs
): LevelPair[] {
  const existingKeys = new Set(existingPairs.map(pairKey));
  return pairs.filter((pair) => !existingKeys.has(pairKey(pair)));
}

export function selectBalancedLevel({
  levels,
  seenLevelIds = [],
  pairs = levelPairs,
  random = Math.random
}: {
  levels: readonly LevelVoteCandidate[];
  seenLevelIds?: readonly string[];
  pairs?: readonly LevelPair[];
  random?: () => number;
}): LevelVoteCandidate | null {
  const authoredKeys = new Set(pairs.map(pairKey));
  const seenIds = new Set(seenLevelIds);
  const candidates = levels.filter((level) => authoredKeys.has(pairKey(level)) && !seenIds.has(level.id));

  if (candidates.length === 0) {
    return null;
  }

  const minimumVotes = Math.min(...candidates.map((level) => level.votesA + level.votesB));
  const leastVoted = candidates.filter((level) => level.votesA + level.votesB === minimumVotes);

  return leastVoted[Math.floor(random() * leastVoted.length)];
}

function isValidWord(value: string): boolean {
  return /^[a-z]+$/.test(value);
}
