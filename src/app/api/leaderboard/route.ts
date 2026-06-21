import { asc, desc } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";

import { getDb } from "@/db/client";
import { ensureUsedNounsSchema } from "@/db/ensure-schema";
import { leaderboardEntries } from "@/db/schema";
import { getDevLeaderboard, saveDevLeaderboardEntry, shouldUseDevStore } from "@/lib/dev-store";
import {
  createLeaderboardEntry,
  isValidLeaderboardName,
  leaderboardLimit,
  leaderboardMinimumLevel,
  rankLeaderboardEntries,
  type LeaderboardEntryCandidate,
  type LeaderboardSubmission
} from "@/lib/leaderboard";
import { logApiError } from "@/lib/server-errors";

export const dynamic = "force-dynamic";

const submissionSchema = z.object({
  chosenPercentages: z.array(z.number().min(0).max(100)).min(1),
  name: z.string().refine(isValidLeaderboardName, "Name must be 1-10 characters."),
  outcome: z.enum(["failed", "escaped"]),
  terminalLevel: z.number().int().min(leaderboardMinimumLevel).max(100)
});

export async function GET() {
  try {
    if (shouldUseDevStore()) {
      return NextResponse.json({ entries: getDevLeaderboard() });
    }

    const db = getDb();
    await ensureUsedNounsSchema(db);

    return NextResponse.json({ entries: await getLeaderboardEntries() });
  } catch (error) {
    logApiError("api/leaderboard", error);
    return NextResponse.json({ error: "Could not load the leaderboard." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = submissionSchema.safeParse(await request.json().catch(() => ({})));

    if (!body.success) {
      return NextResponse.json({ error: "Invalid leaderboard entry." }, { status: 400 });
    }

    const submission: LeaderboardSubmission = body.data;

    if (shouldUseDevStore()) {
      return NextResponse.json({ entries: saveDevLeaderboardEntry(submission) });
    }

    const db = getDb();
    await ensureUsedNounsSchema(db);
    const entry = createLeaderboardEntry(submission);

    await db.insert(leaderboardEntries).values(entry);

    return NextResponse.json({ entries: await getLeaderboardEntries() });
  } catch (error) {
    logApiError("api/leaderboard", error);
    return NextResponse.json({ error: "Could not save the leaderboard entry." }, { status: 500 });
  }
}

async function getLeaderboardEntries() {
  const db = getDb();
  const rows = await db
    .select({
      averageChosenPercentage: leaderboardEntries.averageChosenPercentage,
      createdAt: leaderboardEntries.createdAt,
      id: leaderboardEntries.id,
      name: leaderboardEntries.name,
      outcome: leaderboardEntries.outcome,
      scoreDisplay: leaderboardEntries.scoreDisplay,
      scoreExact: leaderboardEntries.scoreExact,
      terminalLevel: leaderboardEntries.terminalLevel
    })
    .from(leaderboardEntries)
    .orderBy(
      desc(leaderboardEntries.scoreExact),
      desc(leaderboardEntries.terminalLevel),
      asc(leaderboardEntries.createdAt)
    )
    .limit(leaderboardLimit);

  const candidates: LeaderboardEntryCandidate[] = rows.map((row) => ({
    averageChosenPercentage: row.averageChosenPercentage,
    createdAt: row.createdAt.toISOString(),
    id: row.id,
    name: row.name,
    outcome: row.outcome === "escaped" ? "escaped" : "failed",
    scoreDisplay: row.scoreDisplay,
    scoreExact: row.scoreExact,
    terminalLevel: row.terminalLevel
  }));

  return rankLeaderboardEntries(candidates);
}
