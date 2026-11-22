# Más variedad en las partidas: plan de implementación

> **Para quien ejecute el plan:** REQUIRED SUB-SKILL: usar superpowers:subagent-driven-development (recomendado) o superpowers:executing-plans para ir tarea por tarea. Los pasos usan casillas (`- [ ]`) para seguir el avance.

**Objetivo:** que cada partida prefiera las preguntas que ese dispositivo ha visto menos y que nunca salgan dos preguntas seguidas de la misma categoría, sin ningún cambio visible ni en Firebase.

**Arquitectura:** el núcleo (`core/`) recibe un mapa opcional `id → veces mostrada`, ordena la cola de menos a más vista (desempate al azar) y reparte las categorías con límite 1. La app guarda ese mapa en `localStorage` con el mismo patrón que `question-cache.ts` y lo conecta a la partida desde `GamePlay.vue` a través de `useGameSession`.

**Tecnologías:** TypeScript, Vitest (proyectos `core` y `app`), Nuxt 4 / Vue 3, zod.

**Spec:** `docs/superpowers/specs/2026-11-22-question-variety-design.md`

## Restricciones globales

- `MAX_SAME_CATEGORY_IN_A_ROW = 1` en `core/constants.ts`. `MAX_SAME_IN_A_ROW = 2` se queda solo para la dificultad.
- Clave de `localStorage`: `contrarreloj.seen.v1`. Contenido: mapa `id → veces mostrada`.
- `core/` no importa Vue, Nuxt, Firebase ni ninguna API de plataforma (ni `localStorage`).
- Ninguna lectura ni escritura nueva en Firestore y `firestore.rules` no se toca.
- `core/` exige 100 % de cobertura (`vitest.config.ts`).
- Si el almacenamiento está bloqueado, lleno o corrupto, la partida se comporta como hoy (memoria vacía). Nada visible nuevo en pantalla.
- Textos nuevos de la app en español. Las fuentes de `app/` (salvo `cookies.vue` y `aviso-legal.vue`) no pueden contener las palabras prohibidas de `tests/app/copy.test.ts`.
- Commits en inglés con Conventional Commits. Añadir ficheros siempre por nombre (nunca `git add -A`); `.playwright-mcp/` sigue sin añadirse. No hacer push ni abrir PR: lo decide el usuario al final.
- Si `rtk` oculta la salida de vitest, usar `rtk proxy npx vitest run …`.

## Qué hay que vigilar (Review Focus)

1. Almacenamiento que lanza al leer o escribir (bloqueado, lleno): la partida funciona igual que hoy. → Tarea 3.
2. Datos guardados corruptos o con otra forma (JSON roto, array en vez de objeto, cuentas negativas o decimales): se tratan como memoria vacía. → Tarea 3.
3. Grupo con una sola categoría o con una categoría que se agota: la cola sigue teniendo cada pregunta exactamente una vez y no se queda colgada. → Tareas 1 y 2.
4. El jugador sale a mitad de partida o termina y luego se desmonta el componente: se guardan los ids presentados una sola vez, incluida la pregunta que estaba en pantalla. → Tarea 4.
5. El banco cambia (preguntas desactivadas o retiradas): los ids que ya no existen no se acumulan en la memoria ni afectan a la cola. → Tareas 2 y 3.

## Estructura de ficheros

| Fichero                                                                                                                            | Cambio                                                                                    |
| ---------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `core/constants.ts`                                                                                                                | constante nueva `MAX_SAME_CATEGORY_IN_A_ROW`                                              |
| `core/selection.ts`                                                                                                                | `spreadRuns` con reglas por clave; `buildQueue` con regla de categoría y parámetro `seen` |
| `core/game.ts`                                                                                                                     | `GameConfig.seen` y `Game.shownIds()`                                                     |
| `app/utils/browser-storage.ts`                                                                                                     | nuevo: `browserStorage()` movido desde `useQuestionBank.ts`                               |
| `app/utils/seen-questions.ts`                                                                                                      | nuevo: leer y registrar la memoria                                                        |
| `app/composables/useSeenQuestions.ts`                                                                                              | nuevo: conecta la utilidad con el almacenamiento real                                     |
| `app/composables/useGameSession.ts`                                                                                                | opciones `seen` y `onShown`                                                               |
| `app/components/game/GamePlay.vue`                                                                                                 | pasa `seen` y `onShown` a la sesión                                                       |
| `app/pages/cookies.vue`, `README.md`                                                                                               | política de cookies y documentación                                                       |
| `tests/core/streaks.test.ts`, `tests/core/variety.test.ts`, `tests/app/seen-questions.test.ts`, `tests/app/useGameSession.test.ts` | pruebas                                                                                   |

---

### Task 1: Regla de categorías (límite 1)

**Ficheros:**

- Modificar: `core/constants.ts` (junto a `MAX_SAME_IN_A_ROW`, línea 36), `core/selection.ts`
- Prueba: `tests/core/streaks.test.ts`

**Interfaces:**

- Produce:
  - `export const MAX_SAME_CATEGORY_IN_A_ROW = 1` (con comentario: se aplica a la categoría en todos los filtros salvo arcade).
  - `export interface SpreadRule<T> { readonly key: (item: T) => string; readonly max: number }`
  - `export function spreadRuns<T>(items: readonly T[], rules: readonly SpreadRule<T>[]): T[]` (sustituye a la firma `(items, keys, maxRun)`).

- [ ] **Paso 0: rama y documentos**

```bash
git switch -c feat/question-variety
git add docs/superpowers/specs/2026-11-22-question-variety-design.md docs/superpowers/plans/2026-11-22-question-variety.md
git commit -m "docs(game): add the design and the plan for more question variety"
```

- [ ] **Paso 1: escribir las pruebas que fallan** en `tests/core/streaks.test.ts`
  - Adaptar las llamadas existentes a `spreadRuns` a la firma nueva (`[key], 2` pasa a `[{ key, max: 2 }]`; en la de varias claves, una regla por clave con `max: 2`).
  - Prueba `'applies a different limit to each rule'`: elementos con campos `c` y `d`; reglas `{c, max: 1}` y `{d, max: 2}`; se espera `longestRun(c) <= 1` y `longestRun(d) <= 2`.
  - Cambiar la prueba `'never serves more than two questions in a row of the same category'` a `MAX_SAME_CATEGORY_IN_A_ROW` (renombrarla: «more than one»).
  - Nuevo bloque `'buildQueue category rule outside random mode'` con un banco equilibrado (6 categorías × 10 preguntas de la dificultad dada, ids únicos): para `'Fácil'`, `'Medio'` y `'Difícil'` y 30 semillas, `longestRun(categorías de las primeras 40) <= MAX_SAME_CATEGORY_IN_A_ROW`. Si una semilla falla porque el final de la cola se degrada, reducir el tramo comprobado, no la regla.
  - Prueba `'arcade (one category) is not blocked by the category rule'`: `buildQueue(bank, 'Aleatorio', mulberry32(1), 'Ciencias')` devuelve todas las preguntas de esa categoría, una vez cada una.
  - La prueba existente de `'Medio'` con todo igual (longestRun de dificultad = 8) debe seguir pasando.

- [ ] **Paso 2: ejecutar y ver que fallan**

Ejecutar: `npx vitest run --project core tests/core/streaks.test.ts`
Esperado: FALLO (firma antigua de `spreadRuns`, constante inexistente).

- [ ] **Paso 3: implementar**
  - `core/constants.ts`: añadir `MAX_SAME_CATEGORY_IN_A_ROW`.
  - `core/selection.ts`: `spreadRuns` cuenta una violación por regla cuando `out.length >= rule.max` y los últimos `rule.max` colocados comparten la clave del candidato (mismo algoritmo voraz de hoy: elige el primero con 0 violaciones o, si no hay, el de menos). `buildQueue` construye las reglas: categoría (`MAX_SAME_CATEGORY_IN_A_ROW`) siempre que `category === undefined`, en todos los filtros; dificultad (`MAX_SAME_IN_A_ROW`) solo en `Aleatorio`. Si no hay reglas, no llama a `spreadRuns`. Actualizar el comentario de `buildQueue`.

- [ ] **Paso 4: ejecutar el proyecto `core` completo**

Ejecutar: `npx vitest run --project core`
Esperado: todo en verde (si falla otra prueba por la regla nueva, comprobar que su expectativa sigue siendo válida antes de tocarla).

- [ ] **Paso 5: commit**

```bash
git add core/constants.ts core/selection.ts tests/core/streaks.test.ts
git commit -m "feat(game): never serve two questions in a row of the same category"
```

---

### Task 2: Memoria en el núcleo (orden por veces vista)

**Ficheros:**

- Modificar: `core/selection.ts`, `core/game.ts`
- Crear: `tests/core/variety.test.ts`

**Interfaces:**

- Consume: `spreadRuns` y `buildQueue` de la Tarea 1.
- Produce:
  - `buildQueue(questions, filter, rng, category?, seen?: ReadonlyMap<string, number>): PlayableQuestion[]`
  - `GameConfig.seen?: ReadonlyMap<string, number>`
  - `Game.shownIds(): string[]`: ids de las preguntas presentadas hasta ahora, en orden, incluidas las respondidas, las saltadas y la que está en pantalla; `[]` antes de `start()`.

- [ ] **Paso 1: escribir las pruebas que fallan** en `tests/core/variety.test.ts` (usar `makeQuestion`, `mulberry32`, `makeClock` de los helpers)
  - `'serves the questions seen the fewest times first'`: 30 preguntas `medio` de una categoría, con `category` indicada y filtro `'Medio'` (así no hay reglas de reparto); 10 con cuenta 1, 5 con cuenta 3, el resto sin cuenta. Esperado: las cuentas de la cola (`seen.get(id) ?? 0`) están en orden no decreciente.
  - `'breaks ties at random'`: mismo mapa vacío o igual para todas; con 6 semillas salen más de 4 órdenes distintos y la misma semilla repite orden.
  - `'ignores ids that are not in the bank'`: un `seen` con `'fantasma'` no cambia la longitud de la cola ni lanza.
  - `'an empty memory changes nothing'`: para la misma semilla, `buildQueue(bank, f, rng)` y `buildQueue(bank, f, rng, undefined, new Map())` dan los mismos ids en el mismo orden.
  - `'keeps the category rule and never repeats a question'`: banco equilibrado, `Aleatorio`, mitad vista; `longestRun(categorías de las primeras 30) <= 1` y todos los ids únicos.
  - `Game.shownIds`: `[]` antes de `start()`; tras `start()` contiene 1 id; tras responder + `next()` y saltar + `next()` contiene 3, que coinciden con los ids de `results()` más la pregunta actual.
  - `Game` con `seen` que marca todas salvo una: la primera pregunta presentada es esa.

- [ ] **Paso 2: ejecutar y ver que fallan**

Ejecutar: `npx vitest run --project core tests/core/variety.test.ts`
Esperado: FALLO (`seen` y `shownIds` no existen).

- [ ] **Paso 3: implementar**
  - `buildQueue`: tras barajar, si `seen` tiene entradas, ordenar de forma estable por `seen.get(id) ?? 0` ascendente (el barajado previo hace de desempate; `Array.prototype.sort` es estable), y después aplicar `spreadRuns`. Sin `seen` (o vacío) el resultado es idéntico al de hoy.
  - `Game`: `GameConfig.seen` opcional que se pasa a `buildQueue`; `shownIds()` devuelve `this.#queue.slice(0, this.#nextIndex).map((q) => q.id)`.

- [ ] **Paso 4: proyecto `core` completo con cobertura**

Ejecutar: `npx vitest run --project core --coverage`
Esperado: verde y 100 % en `core/`.

- [ ] **Paso 5: commit**

```bash
git add core/selection.ts core/game.ts tests/core/variety.test.ts
git commit -m "feat(game): serve first the questions a device has seen the least"
```

---

### Task 3: Memoria en el dispositivo (almacenamiento)

**Ficheros:**

- Crear: `app/utils/browser-storage.ts`, `app/utils/seen-questions.ts`
- Modificar: `app/composables/useQuestionBank.ts` (importa `browserStorage` en vez de definirla)
- Prueba: `tests/app/seen-questions.test.ts`

**Interfaces:**

- Consume: `StorageLike` de `app/utils/question-cache.ts`.
- Produce:
  - `export function browserStorage(): StorageLike | null` (el mismo cuerpo que hoy en `useQuestionBank.ts`: `window.localStorage` dentro de `try/catch`).
  - `export const SEEN_KEY = 'contrarreloj.seen.v1'`
  - `export function readSeen(storage: StorageLike | null): Map<string, number>`
  - `export function recordSeen(storage: StorageLike | null, shownIds: readonly string[], bankIds: ReadonlySet<string>): void`
  - Formato guardado: objeto JSON `{ "<id>": <entero positivo> }`, validado con zod.

- [ ] **Paso 1: escribir las pruebas que fallan** (con una clase `MemoryStorage` local como la de `tests/app/firebase-utils.test.ts`)
  - `'returns an empty map when nothing is stored'`.
  - `'adds one to each shown id on every call'`: `recordSeen` con `['a','b']` dos veces y luego `['a']` da `a = 3`, `b = 2`.
  - `'drops ids that are no longer in the bank'`: una cuenta guardada para `'viejo'` desaparece al registrar con un `bankIds` que no lo contiene.
  - `'does not record ids that are not in the bank'`: registrar `['fantasma']` no lo guarda.
  - `'treats corrupt data as empty'`: `'{not json'`, `'[1,2]'`, `'{"a":-1}'`, `'{"a":1.5}'` y `'{"a":"x"}'` dan un mapa vacío.
  - `'does nothing without storage'`: con `null`, `readSeen` devuelve mapa vacío y `recordSeen` no lanza.
  - `'survives storage that throws'`: `getItem` que lanza (lectura vacía) y `setItem` que lanza (sin excepción).

- [ ] **Paso 2: ejecutar y ver que fallan**

Ejecutar: `npx vitest run --project app tests/app/seen-questions.test.ts`
Esperado: FALLO (módulos inexistentes).

- [ ] **Paso 3: implementar** `seen-questions.ts` con el patrón de `question-cache.ts` (todo dentro de `try/catch`, esquema `z.record(z.string(), z.number().int().positive())`) y mover `browserStorage` a su propio fichero, actualizando `useQuestionBank.ts`.

- [ ] **Paso 4: ejecutar el proyecto `app`**

Ejecutar: `npx vitest run --project app`
Esperado: verde (incluidas las pruebas existentes de `useQuestionBank` y de la caché).

- [ ] **Paso 5: commit**

```bash
git add app/utils/browser-storage.ts app/utils/seen-questions.ts app/composables/useQuestionBank.ts tests/app/seen-questions.test.ts
git commit -m "feat(app): remember on the device how many times each question was shown"
```

---

### Task 4: Conectar la memoria a la partida

**Ficheros:**

- Crear: `app/composables/useSeenQuestions.ts`
- Modificar: `app/composables/useGameSession.ts`, `app/components/game/GamePlay.vue`
- Prueba: `tests/app/useGameSession.test.ts`

**Interfaces:**

- Consume: `readSeen`, `recordSeen`, `browserStorage` (Tarea 3); `GameConfig.seen`, `Game.shownIds()` (Tarea 2).
- Produce:
  - `SessionOptions.seen?: ReadonlyMap<string, number>` y `SessionOptions.onShown?: (ids: readonly string[]) => void`.
  - `export function useSeenQuestions(): { read(): ReadonlyMap<string, number>; save(shownIds: readonly string[], bank: readonly Question[]): void }`.

- [ ] **Paso 1: escribir las pruebas que fallan** en `tests/app/useGameSession.test.ts` (reutilizar `setup`, que ya admite sobrescribir opciones)
  - `'reports the shown questions once when the game ends'`: banco de 6, `onShown` espía; se responden todas hasta agotar el banco. `onShown` se llamó una vez con 6 ids del banco; tras `scope.stop()` sigue siendo una.
  - `'saves when the player leaves mid-game, including the question on screen'`: se responde una pregunta y pasan 600 ms (hay 2 presentadas); `scope.stop()` llama a `onShown` una vez con 2 ids.
  - `'does not report anything if no question was shown'`: sesión sin `start()` y `scope.stop()` no llama a `onShown`.
  - `'uses the memory to pick the first question'`: `seen` marca todas salvo una (banco de una categoría, con `category` indicada); la primera pregunta es esa.

- [ ] **Paso 2: ejecutar y ver que fallan**

Ejecutar: `npx vitest run --project app tests/app/useGameSession.test.ts`
Esperado: FALLO (opciones nuevas inexistentes).

- [ ] **Paso 3: implementar**
  - `useGameSession`: pasar `seen` al `Game`; función interna `persistShown()` con un indicador para llamarla una sola vez y solo si `game.shownIds()` no está vacío; invocarla en `finalize()` y en `onScopeDispose` (junto a `stopTimers`).
  - `useSeenQuestions`: `read()` usa `readSeen(browserStorage())`; `save()` usa `recordSeen(browserStorage(), ids, new Set(bank.map((q) => q.id)))`.
  - `GamePlay.vue`: importar `useSeenQuestions` explícitamente (como ya se importa `useGameSession`, para que funcione en los tests de componentes) y pasar `seen: memory.read()` y `onShown: (ids) => memory.save(ids, props.questions)`.

- [ ] **Paso 4: ejecutar `app` y `core`**

Ejecutar: `npx vitest run --project core --project app`
Esperado: verde (revisar `tests/app/components.test.ts` si monta `GamePlay`).

- [ ] **Paso 5: commit**

```bash
git add app/composables/useSeenQuestions.ts app/composables/useGameSession.ts app/components/game/GamePlay.vue tests/app/useGameSession.test.ts
git commit -m "feat(app): save the shown questions when a game ends or is left"
```

---

### Task 5: Política de cookies y documentación

**Ficheros:**

- Modificar: `app/pages/cookies.vue`, `README.md`
- Prueba: añadir a `tests/app/seen-questions.test.ts` (o fichero nuevo `tests/app/cookies-policy.test.ts`)

**Interfaces:**

- Consume: `SEEN_KEY` (Tarea 3), `QUESTION_CACHE_KEY` de `app/utils/question-cache.ts`.

- [ ] **Paso 1: escribir la prueba que falla**: `'the cookie policy lists every localStorage key the app uses'`. Lee `app/pages/cookies.vue` y espera que contenga `SEEN_KEY`, `QUESTION_CACHE_KEY`, `'contrarreloj.consent'` y `'contrarreloj.muted'`.

- [ ] **Paso 2: ejecutar y ver que falla**

Ejecutar: `npx vitest run --project app tests/app/seen-questions.test.ts`
Esperado: FALLO (falta `contrarreloj.seen.v1` en la página).

- [ ] **Paso 3: editar `cookies.vue`**
  - Añadir a la lista `storage` (después de `contrarreloj.questions.v1`) este elemento, con el texto fijado por la spec:
    - `name`: `'contrarreloj.seen.v1 (localStorage)'`
    - `purpose`: `'Recordar qué preguntas has visto en este dispositivo para repetirlas lo menos posible. No contiene datos personales y no se envía a ningún sitio.'`
    - `kind`: `'Funcional, solo en tu dispositivo'`
    - `duration`: `'Hasta que borres los datos del navegador'`
  - En el párrafo de introducción de «Qué guardamos en tu dispositivo», añadir una frase neutra: el juego recuerda en el dispositivo qué preguntas has visto para no repetírtelas enseguida y ese dato no sale del navegador. No afirmar nada sobre si requiere o no consentimiento: esa clasificación es decisión del titular.
  - `LEGAL.lastUpdated` (`app/content/legal.ts`): dejarlo en la fecha del día del cambio (hoy es «22 de noviembre de 2026»; si se implementa otro día, actualizarla).

- [ ] **Paso 4: editar `README.md`**
  - Párrafo de reglas del juego (cerca de la línea 262): sustituir la descripción del orden por la nueva: orden aleatorio; nunca dos seguidas de la misma categoría (`MAX_SAME_CATEGORY_IN_A_ROW`) en todos los filtros salvo arcade; en `Aleatorio` además nunca más de dos de la misma dificultad (`MAX_SAME_IN_A_ROW`); las preguntas que el dispositivo ha mostrado menos veces salen primero (`contrarreloj.seen.v1`, solo en `localStorage`, no se envía a ningún sitio); si el banco se agota antes que el tiempo, la partida termina.
  - Viñeta de preguntas/caché (cerca de la línea 293): mencionar la memoria local junto a la caché de una hora.

- [ ] **Paso 5: verificación completa**

```bash
npm run lint
npm run format:check
npm run typecheck
npm run test:coverage
```

Esperado: los cuatro en verde; `core/` al 100 %. Si `format:check` falla, ejecutar `npx prettier --write` solo sobre los ficheros tocados.

- [ ] **Paso 6: commit**

```bash
git add app/pages/cookies.vue app/content/legal.ts README.md tests/app/seen-questions.test.ts
git commit -m "docs(app): list the seen-questions key in the cookie policy and update the README"
```

Si `legal.ts` no cambió, no añadirlo al `git add`.

- [ ] **Paso 7: informe final**: ramas y commits creados, resultado de la verificación y recordatorio de que la clasificación de la clave en la política de cookies (funcional, sin consentimiento) es decisión del titular. No hacer push ni abrir PR sin que lo pida el usuario.
