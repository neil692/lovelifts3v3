# Love Lifts 3v3 Tournament

3-on-3 basketball tournament management app for Common Ground Northeast.
Tournament date: June 6, 2026.

## Tech Stack

- **Framework:** Next.js 16 App Router, TypeScript strict mode
- **Database:** PostgreSQL 16 + Prisma 7 (with `@prisma/adapter-pg`)
- **UI:** TailwindCSS v4, Lucide React, Sonner toasts
- **Auth:** NextAuth v5 beta (credentials, JWT sessions)
- **Deploy:** Vercel (frontend) + Neon (PostgreSQL)

## Key Differences from Prisma v5

- Generator: `provider = "prisma-client"` (not `prisma-client-js`)
- Client generated to `app/generated/prisma/` — import from `@/app/generated/prisma/client`
- `PrismaClient` requires either `adapter` or `accelerateUrl` — use `@prisma/adapter-pg`
- Seed command configured in `prisma.config.ts` under `migrations.seed`, not `package.json`
- Auth proxy file is `proxy.ts` not `middleware.ts` (Next.js 16 convention)

## Commands

```bash
# Local dev (Docker)
docker compose up -d           # Start db (port 5433) + app (port 3001)
docker compose exec app npx prisma migrate dev --name <name>
docker compose exec app npx prisma db seed

# Public URL: http://localhost:3001
# Admin login: admin@lovelifts.com / lovelifts2026
```

## Architecture

```
prisma/schema.prisma, prisma.config.ts, migrations/, seed.ts
app/
  (public) page.tsx             # Division list, auto-revalidates every 30s
  division/[slug]/page.tsx      # Standings, schedule, bracket
  login/page.tsx                # Admin login
  admin/
    layout.tsx                  # Auth guard + nav
    page.tsx                    # Dashboard + phase control
    teams/                      # Add/edit/delete teams
    pools/                      # Generate pools per division
    schedule/                   # View schedule + cascade delays
    scores/                     # Enter/edit scores
    bracket/                    # Generate + view elimination bracket
  api/auth/[...nextauth]/route.ts
lib/
  db.ts                         # PrismaClient singleton (PrismaPg adapter)
  auth.ts                       # NextAuth v5 config
  tournament-utils.ts           # Standings, tiebreakers, bracket builder
  schedule-generator.ts         # Greedy slot assignment algorithm
actions/
  teams.ts, pools.ts, schedule.ts, games.ts, bracket.ts
proxy.ts                        # Auth guard for /admin routes
```

## Tournament Format

- Up to 8 divisions, 36 teams total, 3 courts
- Schedule: 9:30am–4:00pm, 15-min slots
- Pool sizes: ≤7 = single pool, 8+ = pools of 4 (remainder in larger pool)
- Rounds: every team plays ≥3 games (circle/Berger algorithm)
- Rest constraint: 2-slot minimum gap (30 min) between games per team
- Pool clustering: all games in a pool scheduled consecutively
- Advancing: top 2 per pool (single pool ≥6 teams: top 4)
- Tiebreakers: head-to-head → point diff → points for → points against → coin flip
- Cascade: admin can push all future games on a court forward by 15/30/45 min
