import { and, gt, notInArray, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";

import { getDb } from "@/db/client";
import { ensureUsedNounsSchema } from "@/db/ensure-schema";
import { levels, usedNouns } from "@/db/schema";
import { getNextDevLevel, shouldUseDevStore } from "@/lib/dev-store";
import { selectUnusedNounPair } from "@/lib/nouns";
import { logApiError } from "@/lib/server-errors";

export const dynamic = "force-dynamic";

const requestSchema = z.object({
  seenLevelIds: z.array(z.string().uuid()).default([])
});

const freshLevelRetries = 8;

export async function POST(request: Request) {
  try {
    const body = requestSchema.safeParse(await request.json().catch(() => ({})));

    if (!body.success) {
      return NextResponse.json({ error: "Invalid request." }, { status: 400 });
    }

    const seenLevelIds = body.data.seenLevelIds;

    if (shouldUseDevStore()) {
      return NextResponse.json(getNextDevLevel(seenLevelIds));
    }

    const db = getDb();
    await ensureUsedNounsSchema(db);
    const filters = [gt(sql`${levels.votesA} + ${levels.votesB}`, 0)];

    if (seenLevelIds.length > 0) {
      filters.push(notInArray(levels.id, seenLevelIds));
    }

    const [eligible] = await db
      .select({
        id: levels.id,
        nounA: levels.nounA,
        nounB: levels.nounB
      })
      .from(levels)
      .where(and(...filters))
      .orderBy(sql`random()`)
      .limit(1);

    if (eligible) {
      return NextResponse.json({ level: eligible, generated: false });
    }

    const created = await createFreshLevel();

    if (!created) {
      return NextResponse.json({ exhausted: true });
    }

    return NextResponse.json({ level: created, generated: true });
  } catch (error) {
    logApiError("api/levels/next", error);
    return NextResponse.json({ error: "Could not load the next level." }, { status: 500 });
  }
}

async function createFreshLevel() {
  const db = getDb();

  for (let attempt = 0; attempt < freshLevelRetries; attempt += 1) {
    try {
      return await db.transaction(async (tx) => {
        const reserved = await tx.select({ noun: usedNouns.noun }).from(usedNouns);
        const pair = selectUnusedNounPair({
          usedNouns: reserved.map((row) => row.noun)
        });

        if (!pair) {
          return null;
        }

        const [created] = await tx
          .insert(levels)
          .values({
            nounA: pair.nounA,
            nounB: pair.nounB,
            votesA: 0,
            votesB: 0
          })
          .returning({
            id: levels.id,
            nounA: levels.nounA,
            nounB: levels.nounB
          });

        await tx.insert(usedNouns).values([
          { noun: pair.nounA, levelId: created.id },
          { noun: pair.nounB, levelId: created.id }
        ]);

        return created;
      });
    } catch (error) {
      if (isUniqueViolation(error)) {
        continue;
      }

      throw error;
    }
  }

  throw new Error("Could not reserve unused nouns after multiple attempts.");
}

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === "23505"
  );
}
