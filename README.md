# PLEBSCAPE.COM

Minimalist survival game about escaping the mass mind.

The player sees two random nouns, chooses one, and survives only if the chosen noun remains a strict minority after the player's own vote is counted. Ties fail.

## Stack

- Next.js App Router with TypeScript
- Vercel deployment target
- Vercel Postgres or any Postgres database
- Drizzle ORM
- Checked-in finite local noun bank
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
```

Create the database tables with:

```powershell
npm.cmd run db:push
npm.cmd run db:backfill-nouns
```

## How It Works

1. You are shown two buttons.
2. Each button contains one random noun. Example: tree / noise.
3. You choose one button.
4. Your vote is added to the global vote count for that level.
5. The game reveals the percentages.
6. You survive only if your chosen button has less than 50%.
7. If your chosen button has 50% or more, you fail.

## Hostinger Deployment

Deploy PLEBSCAPE as a Node/Next app, not as a static export. The frontend can render
without the server routes, but the game cannot load levels or record votes unless
`/api/levels/next` and `/api/votes` run on the Node server.

Use these commands in Hostinger:

```text
Build command: npm ci && npm run build
Start command: npm run start
```

The start script binds Next to `0.0.0.0` and uses Hostinger's `PORT` environment
variable when it is provided, with `3000` as the local fallback.

Configure these production environment variables in Hostinger:

```text
DATABASE_URL=...
```

No OpenAI key or paid LLM provider is required. New levels are created from the
checked-in 10,000 noun bank.

Create/update the production tables once with the production `DATABASE_URL`, then
reserve nouns from any existing production levels:

```powershell
npm.cmd run db:push
npm.cmd run db:backfill-nouns
```

After deployment, verify the server routes:

```bash
curl -i https://YOUR_DOMAIN/api/health
curl -i -X POST https://YOUR_DOMAIN/api/levels/next \
  -H "Content-Type: application/json" \
  -d '{"seenLevelIds":[]}'
```

`/api/health` returns non-secret deployment checks for env vars, database
connectivity, and table reachability. If `/api/levels/next` returns 500, check
Hostinger logs for the precise server-side error.

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
