import { sql } from "drizzle-orm";
import { NextResponse } from "next/server";

import { getDb } from "@/db/client";
import { levels, votes } from "@/db/schema";
import { logApiError } from "@/lib/server-errors";

export const dynamic = "force-dynamic";

type Check = {
  ok: boolean;
  message?: string;
};

export async function GET() {
  const hasDatabaseUrl = Boolean(process.env.DATABASE_URL);
  const hasOpenAiKey = Boolean(process.env.OPENAI_API_KEY);
  const checks: Record<string, Check> = {
    databaseUrl: { ok: hasDatabaseUrl },
    openAiKey: { ok: hasOpenAiKey }
  };

  if (!hasDatabaseUrl) {
    checks.database = { ok: false, message: "DATABASE_URL is not configured." };
    checks.levelsTable = { ok: false, message: "Database check skipped." };
    checks.votesTable = { ok: false, message: "Database check skipped." };
  } else {
    try {
      const db = getDb();
      await db.execute(sql`select 1`);
      checks.database = { ok: true };

      await db.select({ id: levels.id }).from(levels).limit(1);
      checks.levelsTable = { ok: true };

      await db.select({ id: votes.id }).from(votes).limit(1);
      checks.votesTable = { ok: true };
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
    }
  }

  const healthy = Object.values(checks).every((check) => check.ok);

  return NextResponse.json(
    {
      status: healthy ? "healthy" : "unhealthy",
      checks
    },
    { status: healthy ? 200 : 503 }
  );
}
