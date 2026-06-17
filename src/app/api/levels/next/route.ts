import { sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";

import { getDb } from "@/db/client";
import { ensureUsedNounsSchema } from "@/db/ensure-schema";
import { levels } from "@/db/schema";
import { getNextDevLevel, shouldUseDevStore } from "@/lib/dev-store";
import { getMissingLevelPairs, selectBalancedLevel } from "@/lib/level-pairs";
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
    await ensureAuthoredLevels();

    const allLevels = await db
      .select({
        id: levels.id,
        nounA: levels.nounA,
        nounB: levels.nounB,
        votesA: levels.votesA,
        votesB: levels.votesB
      })
      .from(levels);
    const selected = selectBalancedLevel({ levels: allLevels, seenLevelIds });

    if (!selected) {
      return NextResponse.json({ exhausted: true });
    }

    return NextResponse.json({
      level: {
        id: selected.id,
        nounA: selected.nounA,
        nounB: selected.nounB
      },
      generated: false
    });
  } catch (error) {
    logApiError("api/levels/next", error);
    return NextResponse.json({ error: "Could not load the next level." }, { status: 500 });
  }
}

async function ensureAuthoredLevels() {
  const db = getDb();

  await db.transaction(async (tx) => {
    await tx.execute(sql`lock table ${levels} in exclusive mode`);
    const existingPairs = await tx.select({ nounA: levels.nounA, nounB: levels.nounB }).from(levels);
    const missingPairs = getMissingLevelPairs(existingPairs);

    if (missingPairs.length === 0) {
      return;
    }

    await tx.insert(levels).values(
      missingPairs.map((pair) => ({
        nounA: pair.nounA,
        nounB: pair.nounB,
        votesA: 0,
        votesB: 0
      }))
    );
  });
}
