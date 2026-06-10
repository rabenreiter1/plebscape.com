import { eq, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";

import { getDb } from "@/db/client";
import { levels, votes } from "@/db/schema";
import { recordDevVote, shouldUseDevStore } from "@/lib/dev-store";
import { calculateVoteOutcome, isSide } from "@/lib/game";

export const dynamic = "force-dynamic";

const voteSchema = z.object({
  levelId: z.string().uuid(),
  chosenSide: z.enum(["a", "b"])
});

type LockedLevel = {
  id: string;
  noun_a: string;
  noun_b: string;
  votes_a: number;
  votes_b: number;
};

export async function POST(request: Request) {
  const body = voteSchema.safeParse(await request.json().catch(() => ({})));

  if (!body.success || !isSide(body.data.chosenSide)) {
    return NextResponse.json({ error: "Invalid vote." }, { status: 400 });
  }

  if (shouldUseDevStore()) {
    const result = recordDevVote(body.data.levelId, body.data.chosenSide);

    if (!result) {
      return NextResponse.json({ error: "Level not found." }, { status: 404 });
    }

    return NextResponse.json({ result });
  }

  const db = getDb();
  const result = await db.transaction(async (tx) => {
    const lockedLevels = (await tx.execute(sql`
      select id, noun_a, noun_b, votes_a, votes_b
      from ${levels}
      where id = ${body.data.levelId}
      for update
    `)) as unknown as LockedLevel[];
    const level = lockedLevels[0];

    if (!level) {
      return null;
    }

    const outcome = calculateVoteOutcome({
      levelId: level.id,
      nounA: level.noun_a,
      nounB: level.noun_b,
      votesA: level.votes_a,
      votesB: level.votes_b,
      chosenSide: body.data.chosenSide
    });

    await tx
      .update(levels)
      .set({
        votesA: outcome.votesA,
        votesB: outcome.votesB
      })
      .where(eq(levels.id, level.id));

    await tx.insert(votes).values({
      levelId: level.id,
      chosenSide: outcome.chosenSide,
      chosenNoun: outcome.chosenNoun,
      passed: outcome.passed,
      votesAAfter: outcome.votesA,
      votesBAfter: outcome.votesB
    });

    return outcome;
  });

  if (!result) {
    return NextResponse.json({ error: "Level not found." }, { status: 404 });
  }

  return NextResponse.json({ result });
}
