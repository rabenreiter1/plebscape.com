# PLEBSCAPE.COM

Minimalist survival game about escaping the mass mind.

The player sees two random nouns, chooses one, and survives only if the chosen noun remains a strict minority after the player's own vote is counted. Ties fail.

## Stack

- Next.js App Router with TypeScript
- Vercel deployment target
- Vercel Postgres or any Postgres database
- Drizzle ORM
- OpenAI Responses API for noun-pair generation
- Vitest and Playwright

## Local Setup

```powershell
npm.cmd install
Copy-Item .env.example .env.local
npm.cmd run dev
```

Fill `.env.local` with:

```text
DATABASE_URL=...
OPENAI_API_KEY=...
OPENAI_MODEL=gpt-4o-mini
```

Create the database tables with:

```powershell
npm.cmd run db:push
```

## Game Rules

- Each level has exactly two nouns.
- The player cannot see vote totals before choosing.
- The player's vote is counted before judgment.
- The chosen noun must be below 50% after the vote.
- 50/50 is failure.
- A level is passable only when one noun is already behind by at least two votes.
- New levels are impossible because the first vote makes the chosen noun 100%.
- One previous vote, tied votes, and one-vote differences are impossible for the same strict-minority reason.

## Deployment

1. Create a Vercel project from this repo.
2. Add a Vercel Postgres database or provide `DATABASE_URL`.
3. Add `OPENAI_API_KEY` and optionally `OPENAI_MODEL`.
4. Run `npm.cmd run db:push` against production once.
5. Point `PLEBSCAPE.COM` at the Vercel deployment.

## GitHub Flow

This repo is local-first. After creating an empty GitHub repository:

```powershell
git remote add origin <your-github-repo-url>
git branch -M main
git push -u origin main
```

## Verification

```powershell
npm.cmd run test
npm.cmd run test:e2e
npm.cmd run build
```
