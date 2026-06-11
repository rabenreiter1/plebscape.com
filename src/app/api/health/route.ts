import { sql } from "drizzle-orm";
import { NextResponse } from "next/server";

import { getDb } from "@/db/client";
import { ensureUsedNounsSchema } from "@/db/ensure-schema";
import { levels, usedNouns, votes } from "@/db/schema";
import { validateNounBank } from "@/lib/nouns";
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
  const nounBank = validateNounBank();
  const checks: Record<string, Check> = {
    databaseUrl: { ok: hasDatabaseUrl },
    nounBank
  };

  if (!hasDatabaseUrl) {
    checks.database = { ok: false, message: "DATABASE_URL is not configured." };
    checks.levelsTable = { ok: false, message: "Database check skipped." };
    checks.votesTable = { ok: false, message: "Database check skipped." };
    checks.usedNounsTable = { ok: false, message: "Database check skipped." };
    checks.usedNounsBackfill = { ok: false, message: "Database check skipped." };
  } else {
    try {
      const db = getDb();
      await db.execute(sql`select 1`);
      checks.database = { ok: true };

      await db.select({ id: levels.id }).from(levels).limit(1);
      checks.levelsTable = { ok: true };

      await db.select({ id: votes.id }).from(votes).limit(1);
      checks.votesTable = { ok: true };

      await ensureUsedNounsSchema(db);

      await db.select({ noun: usedNouns.noun }).from(usedNouns).limit(1);
      checks.usedNounsTable = { ok: true };

      const missingRows = (await db.execute(sql`
        select count(*)::int as count
        from (
          select noun_a as noun from levels
          union
          select noun_b as noun from levels
        ) level_nouns
        left join used_nouns on used_nouns.noun = level_nouns.noun
        where used_nouns.noun is null
      `)) as unknown as Array<{ count: number | string }>;
      const missingCount = Number(missingRows[0]?.count ?? 0);
      checks.usedNounsBackfill =
        missingCount === 0
          ? { ok: true }
          : {
              ok: false,
              message: `${missingCount} existing level nouns are not reserved.`
            };
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
      checks.usedNounsBackfill = checks.usedNounsBackfill ?? {
        ok: false,
        message: "Used nouns backfill check failed."
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
