import { and, gt, notInArray, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";

import { getDb } from "@/db/client";
import { ensureUsedNounsSchema } from "@/db/ensure-schema";
import { levels } from "@/db/schema";
import { getNextDevLevel, shouldUseDevStore } from "@/lib/dev-store";
import { selectUncreatedLevelPair } from "@/lib/level-pairs";
import { logApiError } from "@/lib/server-errors";

export const dynamic = "force-dynamic";

const requestSchema = z.object({
  seenLevelIds: z.array(z.string().uuid()).default([])
});

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

  return db.transaction(async (tx) => {
    await tx.execute(sql`lock table ${levels} in exclusive mode`);
    const existingPairs = await tx.select({ nounA: levels.nounA, nounB: levels.nounB }).from(levels);
    const pair = selectUncreatedLevelPair({ existingPairs });

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

    return created;
  });
}
