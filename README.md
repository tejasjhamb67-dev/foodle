# Foodle

A daily food and drink guessing game. Guess the dish, the drink or the cuisine in six tries;
every miss reveals a clue, mostly ingredients. Six daily puzzles: three modes (Dish, Drink, Cuisine)
in a Global and an India edition.

Built from `docs/Foodle_Design_System.docx` (rules, tokens, components, API) and
`docs/Foodle_Concept_Note.docx`, with content from `packages/content/source/Foodle_Starter_Repository.xlsx`.

## Layout

```
foodle/                     pnpm workspaces + Turborepo
├─ apps/web/                Next.js (App Router): the website and its API
├─ packages/tokens/         tokens.json → TS constants (CSS variables live in apps/web/src/app/globals.css)
├─ packages/game/           pure TypeScript: feedback rules, puzzle number, schedule, search, share text, stats
├─ packages/content/        importer: workbook → data/*.json; image-sourcing script
└─ supabase/                migrations and row-level security for accounts and social features
```

## Run it

```bash
pnpm install
pnpm dev                    # http://localhost:3000
pnpm test                   # game rules, incl. the worked examples from the design system
pnpm build
```

Copy `apps/web/.env.example` to `apps/web/.env.local` to configure. With no Supabase keys the site
runs guest-only: every puzzle, stats, streaks, archive and sharing work; leaderboards, friends and
groups show a "switched off" state.

## How the backend works

The API is a set of Next.js route handlers (`apps/web/src/app/api`), matching design system §13.6.

| Endpoint | What it does |
| --- | --- |
| `GET /api/puzzle?mode&edition&number` | Puzzle number, first clue, clue count, guess-list version |
| `POST /api/guess` | Takes every guess so far, replays them on the server, returns tiles, revealed clues and — only once finished — the answer card |
| `GET /api/guess-list?mode&edition` | Autocomplete list (no clues or ingredients); cached on the device by version |
| `GET /api/leaderboard` | Friends / group (today or week) / global top 100 |
| `/api/me`, `/api/friends`, `/api/groups`, `/api/invite`, `/api/sync` | Profile, friend requests, groups, invite codes, guest → account sync |

- **Answers never reach the browser early.** Item data is imported only by server code
  (`apps/web/src/server/content.ts`), and the build is checked for leaks.
- **Daily schedule** is a seeded, deterministic draw (`packages/game/src/schedule.ts`): fame by weekday
  (Mon/Tue/Sun famous, Wed/Thu/Sat well known, Fri deep cut), no repeat until a tier is used up, and the
  same country (or state) never two days running. Set `FOODLE_SCHEDULE_SECRET` before launch.
- **Leaderboard integrity.** Signed-in results are recorded by the server from the validated guess
  flow, so a result can't be posted without playing. Archive plays never count.

## Accounts and leaderboards (Supabase)

1. Create a Supabase project and run `supabase/migrations/*.sql` (`supabase db push`, or paste it into the SQL editor).
2. In Authentication → URL configuration, add `https://<your-site>/auth/callback` as a redirect URL.
   Enable the Google and Apple providers if you want those buttons to work (email magic links work by default).
3. Set `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY`.

## Content

```bash
pnpm content:import          # workbook → packages/content/data/{items,countries,states}.json
pnpm content:images          # look up Wikipedia/Commons lead images (licence + ≥2,400 px filter)
```

`content:images` writes candidates to `data/images.json` with `"status": "candidate"`. A reviewer
sets `"approved"` (design system §9.3, step 3), then `content:import` attaches approved images.
`content:import --include-candidates` attaches unreviewed ones too, for preview builds.

## Decisions made where the spec was open

- **State coordinates** (open item 14): approximate centroids in `packages/content/scripts/state-coords.ts`.
- **India cuisine distance:** "close" (yellow) is ≤ 500 km rather than the global 1,500 km, since most of India
  is within 1,500 km of most other states.
- **Turkey** in the workbook is matched to "Türkiye" in the Countries sheet; items with country
  "International" (e.g. Vodka) get no distance.
- **Launch date** defaults to 2026-10-01 so the archive has content; set `NEXT_PUBLIC_FOODLE_LAUNCH`.

## Not built yet

- The Expo (iOS/Android) app from §13.1. `packages/game` and `packages/tokens` are ready to share with it.
- Photo crops, AVIF/WebP renditions and blurhash (§9.1, 9.3 steps 4–6).
