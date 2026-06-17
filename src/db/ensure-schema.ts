import { sql, type SQLWrapper } from "drizzle-orm";

type ExecutableDb = {
  execute: (query: SQLWrapper) => Promise<unknown>;
};

let schemaPromise: Promise<void> | null = null;
export const worldVersion = "balanced-pairs-100-v1";

export function ensureUsedNounsSchema(db: ExecutableDb): Promise<void> {
  schemaPromise ??= createUsedNounsSchema(db);
  return schemaPromise;
}

async function createUsedNounsSchema(db: ExecutableDb) {
  await db.execute(sql`
    create table if not exists used_nouns (
      noun text primary key,
      level_id uuid not null references levels(id) on delete cascade,
      created_at timestamp with time zone not null default now()
    )
  `);

  await db.execute(sql`
    create index if not exists used_nouns_level_id_idx on used_nouns(level_id)
  `);

  await db.execute(sql`
    create table if not exists app_settings (
      key text primary key,
      value text not null,
      updated_at timestamp with time zone not null default now()
    )
  `);

  const rows = (await db.execute(sql`
    select value from app_settings where key = 'world_version'
  `)) as unknown as Array<{ value: string }>;

  if (rows[0]?.value !== worldVersion) {
    await db.execute(sql`truncate table votes, used_nouns, levels restart identity cascade`);
    await db.execute(sql`
      insert into app_settings (key, value, updated_at)
      values ('world_version', ${worldVersion}, now())
      on conflict (key) do update
      set value = excluded.value, updated_at = excluded.updated_at
    `);
  }

  await db.execute(sql`
    insert into used_nouns (noun, level_id)
    select noun, level_id
    from (
      select noun_a as noun, id as level_id from levels
      union
      select noun_b as noun, id as level_id from levels
    ) existing_level_nouns
    on conflict (noun) do nothing
  `);
}
