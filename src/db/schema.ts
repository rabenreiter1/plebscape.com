import {
  boolean,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uuid
} from "drizzle-orm/pg-core";

export const levels = pgTable(
  "levels",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    nounA: text("noun_a").notNull(),
    nounB: text("noun_b").notNull(),
    votesA: integer("votes_a").notNull().default(0),
    votesB: integer("votes_b").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    createdAtIndex: index("levels_created_at_idx").on(table.createdAt)
  })
);

export const votes = pgTable(
  "votes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    levelId: uuid("level_id")
      .notNull()
      .references(() => levels.id, { onDelete: "cascade" }),
    chosenSide: text("chosen_side").notNull(),
    chosenNoun: text("chosen_noun").notNull(),
    passed: boolean("passed").notNull(),
    votesAAfter: integer("votes_a_after").notNull(),
    votesBAfter: integer("votes_b_after").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    levelIndex: index("votes_level_id_idx").on(table.levelId),
    createdAtIndex: index("votes_created_at_idx").on(table.createdAt)
  })
);

export type LevelRow = typeof levels.$inferSelect;
export type VoteRow = typeof votes.$inferSelect;
