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

_Filled in as each phase lands._

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
