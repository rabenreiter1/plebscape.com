import { nounBank, nounBankSize } from "./noun-bank";

const bannedWords = new Set([
  "beauty",
  "degeneracy",
  "discipline",
  "evil",
  "freedom",
  "god",
  "hate",
  "justice",
  "propaganda",
  "sin",
  "slavery",
  "truth",
  "ugliness",
  "virtue",
  "war"
]);

const nounPattern = /^[a-z]{3,16}$/;

export type NounPair = {
  nounA: string;
  nounB: string;
};

export function validateNoun(value: string): string {
  const noun = value.trim().toLowerCase();

  if (!nounPattern.test(noun)) {
    throw new Error("Nouns must be lowercase single words with 3-16 letters.");
  }

  if (bannedWords.has(noun)) {
    throw new Error("Noun contains a loaded word.");
  }

  return noun;
}

export function validateNounPair(pair: NounPair): NounPair {
  const nounA = validateNoun(pair.nounA);
  const nounB = validateNoun(pair.nounB);

  if (nounA === nounB) {
    throw new Error("Noun pair must not contain duplicates.");
  }

  return { nounA, nounB };
}

export function selectUnusedNounPair({
  usedNouns,
  bank = nounBank,
  random = Math.random
}: {
  usedNouns: Iterable<string>;
  bank?: readonly string[];
  random?: () => number;
}): NounPair | null {
  const used = new Set(Array.from(usedNouns, (noun) => noun.trim().toLowerCase()));
  const unused = bank.filter((noun) => !used.has(noun));

  if (unused.length < 2) {
    return null;
  }

  const firstIndex = Math.floor(random() * unused.length);
  const first = unused[firstIndex];
  const secondPool = unused.filter((_, index) => index !== firstIndex);
  const second = secondPool[Math.floor(random() * secondPool.length)];

  return validateNounPair({ nounA: first, nounB: second });
}

export function validateNounBank(bank: readonly string[] = nounBank): {
  ok: boolean;
  message?: string;
} {
  try {
    if (bank.length !== nounBankSize) {
      return { ok: false, message: `Expected ${nounBankSize} nouns, found ${bank.length}.` };
    }

    const seen = new Set<string>();

    for (const noun of bank) {
      const normalized = validateNoun(noun);

      if (seen.has(normalized)) {
        return { ok: false, message: `Duplicate noun found: ${normalized}.` };
      }

      seen.add(normalized);
    }

    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Noun bank validation failed."
    };
  }
}
