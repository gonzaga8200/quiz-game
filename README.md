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

| Script                  | What it does                                                        |
| ----------------------- | ------------------------------------------------------------------- |
| `npm run dev`           | Start the dev server                                                |
| `npm run build`         | Static build (`nuxt generate`) into `.output/public`                |
| `npm run preview`       | Serve the static build locally                                      |
| `npm run lint`          | ESLint                                                              |
| `npm run format`        | Prettier (write). `format:check` only verifies                      |
| `npm run typecheck`     | Strict TypeScript check (`nuxt typecheck`)                          |
| `npm test`              | Vitest unit tests. `test:coverage` enforces 100% on `core/`         |
| `npm run test:rules`    | Firestore security-rules tests against the emulator (needs JDK 21+) |
| `npm run emulators`     | Start the Auth and Firestore emulators (needs JDK 21+)              |
| `npm run dev:emulators` | Dev server pointed at the local emulators                           |

## Firebase

The app uses Firebase on the free Spark plan: **Hosting** (static site), **Auth** (Google
sign-in only) and **Firestore**. The Firebase project id is `contrarreloj-quiz`.

- `firestore.rules` is the security model (see below) and is covered by `npm run test:rules`.
- Questions live in `questions/{id}`; rankings in `rankings/{duration}_{filter}/entries/{uid}`
  (8 boards, one best score per player per board, top 50 shown).
- Without any Firebase variables the game still runs: arcade mode uses the questions
  bundled in `data/questions/`, and the competitive/ranking entry points stay hidden.

### Running against the local emulators

```bash
npm run emulators        # terminal 1 (needs JDK 21+ on your PATH)
npm run dev:emulators    # terminal 2
```

The Auth emulator offers a fake Google account picker, so you can sign in, play a competitive
game and see the ranking without touching the real project.

### Security rules in short

- Anyone can read **active** questions; nobody can write questions from a client (they are
  imported with the Admin SDK).
- Anyone can read rankings. A signed-in player can write only their own entry
  (`rankings/<board>/entries/<their uid>`), only with the exact set of fields, in range, with the
  board matching the duration and filter, `createdAt` set by the server, and only to replace a
  lower score with a higher one. Nobody can delete entries.

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

**UI**

- The visual idea is a cycling time trial: the clock is the only yellow thing on screen, the
  remaining time is a dashed road that gets "ridden" (solid) as the clock runs down.
- Keyboard: `1`-`4` or `A`-`D` answer, `P` skips. Answer buttons stay focusable after an
  answer (they use `aria-disabled`), and results are announced through a live region. Every
  state that uses colour also has an icon and text.
- Sounds are synthesised with the Web Audio API (no audio files). The mute choice is kept in
  `localStorage` (`contrarreloj.muted`), a purely functional preference.
- With `prefers-reduced-motion`, the wrong-answer shake, the urgent pulse and the confetti
  are turned off; colour and icons still show the result.
- In the report, skipped questions also show the correct answer and explanation (the brief
  only asks for wrong ones); it is useful and costs nothing.
- Fonts (Barlow Condensed, Atkinson Hyperlegible Next) are downloaded at build time and
  served from this site, so visitors' IP addresses are never sent to Google's font CDN.

**Ranking**

- One entry per player per board (`60_aleatorio`...`120_dificil`). A later game replaces it only
  if it scores higher; otherwise the report says "your best is still X". Games with 0 points are
  not ranked. A player's position is the number of players with strictly more points, plus one,
  so ties share a position.
- Questions are fetched from Firestore, cached for an hour in `localStorage`, and the bundled
  questions are used if Firestore is empty or unreachable (6 s timeout).

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

- **Scoring runs in the browser.** Spark has no Cloud Functions, so the game rules, the
  questions and their correct answers are all available to the client. A determined player can
  therefore submit a fake score. The Firestore rules limit the damage (field and range checks,
  points capped by the number of correct answers, at most one answer per second, one entry per
  player, scores can only go up) but cannot prove a game was actually played. A future option is
  to move scoring into a Cloud Function on the Blaze plan: the server would hold the answers,
  validate each response and write the score itself.
- **Read quota.** The free plan allows 50,000 Firestore reads per day. Each browser caches the
  question bank for one hour, and ranking boards are cached for a minute, but a large question
  bank with many players can still exceed it. The alternative is publishing the bank as a static
  JSON file at build time.
- **Google sign-in uses a pop-up.** If the browser blocks it, the player is told to allow
  pop-ups for the site; there is no redirect fallback because redirects are unreliable when the
  auth domain differs from the hosting domain.
- Ranking avatars are loaded from Google's servers, which receive the visitor's IP address when
  they are shown.

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
