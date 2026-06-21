import { sql } from "drizzle-orm";
import { NextResponse } from "next/server";

import { getDb } from "@/db/client";
import { ensureUsedNounsSchema } from "@/db/ensure-schema";
import { leaderboardEntries, levels, usedNouns, votes } from "@/db/schema";
import { levelPairCount, levelPairs, pairKey, validateLevelPairs } from "@/lib/level-pairs";
import { logApiError } from "@/lib/server-errors";

export const dynamic = "force-dynamic";

type Check = {
  ok: boolean;
  message?: string;
};

type DatabaseUrlInfo = {
  protocol?: string;
  host?: string;
  port?: string;
  database?: string;
  username?: string;
  sslmode?: string | null;
  parseError?: string;
};

export async function GET() {
  const hasDatabaseUrl = Boolean(process.env.DATABASE_URL);
  const levelPairsCheck = validateLevelPairs();
  const checks: Record<string, Check> = {
    databaseUrl: { ok: hasDatabaseUrl },
    levelPairs: levelPairsCheck
  };

  if (!hasDatabaseUrl) {
    checks.database = { ok: false, message: "DATABASE_URL is not configured." };
    checks.levelsTable = { ok: false, message: "Database check skipped." };
    checks.votesTable = { ok: false, message: "Database check skipped." };
    checks.usedNounsTable = { ok: false, message: "Database check skipped." };
    checks.leaderboardTable = { ok: false, message: "Database check skipped." };
  } else {
    try {
      const db = getDb();
      await db.execute(sql`select 1`);
      checks.database = { ok: true };

      await db.select({ id: levels.id }).from(levels).limit(1);
      checks.levelsTable = { ok: true };
      const existingLevels = await db.select({ nounA: levels.nounA, nounB: levels.nounB }).from(levels);
      const authoredKeys = new Set(levelPairs.map(pairKey));
      const existingAuthoredCount = new Set(
        existingLevels
          .map(pairKey)
          .filter((key) => authoredKeys.has(key))
      ).size;
      checks.authoredLevels =
        existingAuthoredCount === levelPairCount
          ? { ok: true }
          : {
              ok: true,
              message: `${existingAuthoredCount}/${levelPairCount} authored levels exist. Missing levels are inserted by /api/levels/next.`
            };

      await db.select({ id: votes.id }).from(votes).limit(1);
      checks.votesTable = { ok: true };

      await ensureUsedNounsSchema(db);

      await db.select({ noun: usedNouns.noun }).from(usedNouns).limit(1);
      checks.usedNounsTable = { ok: true };

      await db.select({ id: leaderboardEntries.id }).from(leaderboardEntries).limit(1);
      checks.leaderboardTable = { ok: true };
    } catch (error) {
      logApiError("api/health", error);
      checks.database = checks.database ?? {
        ok: false,
        message: "Database connection failed."
      };
      checks.levelsTable = checks.levelsTable ?? {
        ok: false,
        message: "Levels table check failed."
      };
      checks.votesTable = checks.votesTable ?? {
        ok: false,
        message: "Votes table check failed."
      };
      checks.usedNounsTable = checks.usedNounsTable ?? {
        ok: false,
        message: "Used nouns table check failed."
      };
      checks.leaderboardTable = checks.leaderboardTable ?? {
        ok: false,
        message: "Leaderboard table check failed."
      };
    }
  }

  const healthy = Object.values(checks).every((check) => check.ok);

  return NextResponse.json(
    {
      status: healthy ? "healthy" : "unhealthy",
      checks,
      databaseUrl: describeDatabaseUrl(process.env.DATABASE_URL)
    },
    { status: healthy ? 200 : 503 }
  );
}

function describeDatabaseUrl(value: string | undefined): DatabaseUrlInfo | undefined {
  if (!value) {
    return undefined;
  }

  try {
    const url = new URL(value);

    return {
      protocol: url.protocol,
      host: url.hostname,
      port: url.port,
      database: url.pathname.replace(/^\//, ""),
      username: url.username,
      sslmode: url.searchParams.get("sslmode")
    };
  } catch (error) {
    return {
      parseError: error instanceof Error ? error.message : "Could not parse DATABASE_URL."
    };
  }
}
