import { and, gt, notInArray, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";

import { getDb } from "@/db/client";
import { levels } from "@/db/schema";
import { generateNounPair } from "@/lib/nouns";

export const dynamic = "force-dynamic";

const requestSchema = z.object({
  seenLevelIds: z.array(z.string().uuid()).default([])
});

export async function POST(request: Request) {
  const db = getDb();
  const body = requestSchema.safeParse(await request.json().catch(() => ({})));

  if (!body.success) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const seenLevelIds = body.data.seenLevelIds;
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

  const pair = await generateNounPair();
  const [created] = await db
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

  return NextResponse.json({ level: created, generated: true });
}
