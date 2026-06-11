import OpenAI from "openai";
import { z } from "zod";

import { logApiError } from "./server-errors";

const nounPairSchema = z.object({
  nounA: z.string(),
  nounB: z.string()
});

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

const fallbackPairs = [
  ["tree", "noise"],
  ["window", "copper"],
  ["dust", "animal"],
  ["paper", "moon"],
  ["hammer", "garden"],
  ["mirror", "salt"],
  ["engine", "velvet"],
  ["river", "plastic"],
  ["cloud", "knife"],
  ["ladder", "fog"],
  ["bottle", "canyon"],
  ["fabric", "signal"]
] as const;

export type NounPair = {
  nounA: string;
  nounB: string;
};

export function validateNounPair(pair: NounPair): NounPair {
  const nounA = pair.nounA.trim().toLowerCase();
  const nounB = pair.nounB.trim().toLowerCase();

  if (!nounPattern.test(nounA) || !nounPattern.test(nounB)) {
    throw new Error("Nouns must be lowercase single words with 3-16 letters.");
  }

  if (nounA === nounB) {
    throw new Error("Noun pair must not contain duplicates.");
  }

  if (bannedWords.has(nounA) || bannedWords.has(nounB)) {
    throw new Error("Noun pair contains a loaded word.");
  }

  return { nounA, nounB };
}

export async function generateNounPair(): Promise<NounPair> {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is required to generate new levels.");
  }

  const client = new OpenAI({ apiKey });
  const response = await client.responses.create({
    model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
    input: [
      {
        role: "system",
        content:
          "Generate two random, concrete, lowercase English nouns for a minimalist game. Avoid moral, political, ideological, religious, sexual, violent, insulting, branded, or emotionally loaded words. Return only schema-valid JSON."
      },
      {
        role: "user",
        content:
          "Create one arbitrary noun pair. The words should feel random, slightly uncanny, and not like an obvious meaningful choice."
      }
    ],
    text: {
      format: {
        type: "json_schema",
        name: "plebscape_noun_pair",
        strict: true,
        schema: {
          type: "object",
          additionalProperties: false,
          required: ["nounA", "nounB"],
          properties: {
            nounA: {
              type: "string",
              description: "A lowercase single-word English noun."
            },
            nounB: {
              type: "string",
              description: "A different lowercase single-word English noun."
            }
          }
        }
      }
    }
  });

  const parsed = nounPairSchema.parse(JSON.parse(response.output_text));
  return validateNounPair(parsed);
}

export async function generateNounPairWithFallback(): Promise<NounPair> {
  try {
    return await generateNounPair();
  } catch (error) {
    logApiError("noun-generation", error);
    const pair = fallbackPairs[Math.floor(Math.random() * fallbackPairs.length)];
    return validateNounPair({ nounA: pair[0], nounB: pair[1] });
  }
}
