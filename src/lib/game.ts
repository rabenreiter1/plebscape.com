export type Side = "a" | "b";

export type LevelPublic = {
  id: string;
  nounA: string;
  nounB: string;
};

export type RevealedResult = {
  levelId: string;
  nounA: string;
  nounB: string;
  votesA: number;
  votesB: number;
  percentA: number;
  percentB: number;
  chosenSide: Side;
  chosenNoun: string;
  passed: boolean;
};

export type RunScore = {
  averageChoiceDisplay: string;
  averageChosenPercentage: number;
  scoreDisplay: number;
  scoreExact: number;
};

export function calculateVoteOutcome(input: {
  votesA: number;
  votesB: number;
  chosenSide: Side;
  nounA: string;
  nounB: string;
  levelId?: string;
}): RevealedResult {
  const votesA = input.chosenSide === "a" ? input.votesA + 1 : input.votesA;
  const votesB = input.chosenSide === "b" ? input.votesB + 1 : input.votesB;
  const total = votesA + votesB;
  const chosenVotes = input.chosenSide === "a" ? votesA : votesB;
  const otherVotes = input.chosenSide === "a" ? votesB : votesA;

  return {
    levelId: input.levelId ?? "",
    nounA: input.nounA,
    nounB: input.nounB,
    votesA,
    votesB,
    percentA: total === 0 ? 0 : (votesA / total) * 100,
    percentB: total === 0 ? 0 : (votesB / total) * 100,
    chosenSide: input.chosenSide,
    chosenNoun: input.chosenSide === "a" ? input.nounA : input.nounB,
    passed: chosenVotes < otherVotes
  };
}

export function getChosenPercentage(result: RevealedResult): number {
  return result.chosenSide === "a" ? result.percentA : result.percentB;
}

export function calculateRunScore({
  failedLevel,
  chosenPercentages
}: {
  failedLevel: number;
  chosenPercentages: number[];
}): RunScore {
  if (chosenPercentages.length === 0) {
    throw new Error("Cannot calculate a run score without answered levels.");
  }

  const averageChosenPercentage =
    chosenPercentages.reduce((total, percentage) => total + percentage, 0) / chosenPercentages.length;
  const scoreExact = (failedLevel - 1) * 100 + (100 - averageChosenPercentage);

  return {
    averageChoiceDisplay: `${Math.round(averageChosenPercentage)}%`,
    averageChosenPercentage,
    scoreDisplay: Math.round(scoreExact),
    scoreExact
  };
}

export function roundPercent(value: number): number {
  return Math.round(value);
}

export function displayPercent(value: number): string {
  return `${roundPercent(value)}%`;
}

export function isSide(value: unknown): value is Side {
  return value === "a" || value === "b";
}
