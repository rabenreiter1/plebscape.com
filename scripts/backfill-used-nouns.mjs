import postgres from "postgres";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is required to backfill used nouns.");
}

const sql = postgres(connectionString, {
  max: 1,
  prepare: false
});

try {
  const result = await sql`
    insert into used_nouns (noun, level_id)
    select noun, level_id
    from (
      select noun_a as noun, id as level_id from levels
      union
      select noun_b as noun, id as level_id from levels
    ) existing_level_nouns
    on conflict (noun) do nothing
  `;

  console.log(`Backfilled ${result.count} noun reservations.`);
} finally {
  await sql.end();
}
