# Contrarreloj

A timed quiz game ("contrarreloj" is Spanish for a cycling time trial). In each match
the player answers as many questions as possible before the clock runs out. The game UI
and all content are in Spanish.

- **Live app:** _pending first deploy_
- **Status:** under construction. See [Roadmap](#roadmap).

## Game modes

| Mode        | Login            | Ranking | Options                                                       |
| ----------- | ---------------- | ------- | ------------------------------------------------------------- |
| Arcade      | No               | No      | Fixed 60 s, random difficulty                                 |
| Competitive | Yes (Google SSO) | Yes     | 60 s or 120 s; difficulty: Aleatorio, Fácil, Medio or Difícil |

## Requirements

- Node.js 22.12 or newer (`.nvmrc` pins 24)
- npm 10 or newer

## Getting started

```bash
npm install
cp .env.example .env   # optional: the game runs without Firebase values
npm run dev            # http://localhost:3000
```

### Scripts

| Script              | What it does                                                |
| ------------------- | ----------------------------------------------------------- |
| `npm run dev`       | Start the dev server                                        |
| `npm run build`     | Static build (`nuxt generate`) into `.output/public`        |
| `npm run preview`   | Serve the static build locally                              |
| `npm run lint`      | ESLint                                                      |
| `npm run format`    | Prettier (write). `format:check` only verifies              |
| `npm run typecheck` | Strict TypeScript check (`nuxt typecheck`)                  |
| `npm test`          | Vitest unit tests. `test:coverage` enforces 100% on `core/` |

## Environment variables

See [`.env.example`](.env.example). All `NUXT_PUBLIC_*` values are inlined into the static
build and are **public identifiers, not secrets**. Never commit a real `.env`, a service
account key or Application Default Credentials.

## Architecture

```
core/            Framework-agnostic game rules (TypeScript + zod only).
                 Must not import Vue, Nuxt or Firebase, so it can be reused on mobile.
app/             Nuxt 4 application (pages, components, composables).
data/questions/  Question bank as JSON, reviewed in pull requests.
scripts/         Node scripts (validate and import questions).
tests/           Vitest tests.
```

The site is generated as static files and served by Firebase Hosting (Spark plan, no
Cloud Functions). Authentication and Firestore are used from the browser.

## Assumptions

Decisions taken where the brief left room. Change them in `core/` and the tests will tell
you what else moves.

**Game rules (`core/`)**

- Skipping does not reset the combo, and a skipped question is reported as "skipped",
  never as wrong.
- The score never goes below 0. Penalties are recorded as the points _actually_
  deducted, so the report breakdown always adds up to the total.
- Each combo bonus (+2 at 3, +4 at 5, +8 at 10 in a row) is awarded once per streak, when
  that exact length is reached. A wrong answer resets the streak, so a bonus can be earned
  again later. There is no bonus beyond a streak of 10.
- The timer keeps running during the ~600 ms feedback after an answer. A question answered
  before the clock hits zero counts even if the animation runs past it. A question still
  open when the clock hits zero is discarded.
- Questions are drawn in uniformly random order, with options shuffled at play time. If
  the bank runs out before the time does, the game ends early.
- Celebration tiers (confetti emojis) are based on points per minute, so 60 s and 120 s
  games are comparable: 150+ trophy, 90+ party, 45+ applause, 15+ thumbs up, otherwise a
  gentle encouragement. Thresholds live in `core/celebration.ts`.

**Data**

- Category and difficulty values are stored exactly as written in the brief (`"Historia y
Geografía"`, `"muy fácil"`...), accents included. Ranking board ids use ASCII slugs
  (`60_aleatorio`, `120_dificil`).
- Question ids are lowercase slugs chosen by whoever writes the question; the validator
  checks they are unique across all files.
- Unknown fields are rejected by the schema, so typos in question files fail loudly.

**Tooling**

- Node 24 in CI and `.nvmrc`; the code needs Node 22.12 or newer.
- A project `.npmrc` pins the public npm registry.

## Known limitations

_Filled in as each phase lands._

## Roadmap

1. Repo, Nuxt 4 project and tooling
2. `core/` game engine and tests
3. UI: menu, setup, game, report, effects, sounds
4. Firebase: Auth, Firestore, rules, ranking, question loading
5. Cookie consent and analytics
6. Question skill, import script, starter questions
7. CI/CD, first deploy, first release

## License

[MIT](LICENSE)
