# Más variedad en las partidas: memoria por dispositivo y regla de categorías (fase 1)

Estado: pendiente de aprobación. Cambio pequeño: diseño corto.

## Intención

Que cada jugador vea las preguntas repetidas lo menos posible y que las categorías se
alternen más. Todo es interno: no aparece nada nuevo en la interfaz.

El problema observado es entre partidas, no dentro de una: la cola se recorre una sola vez,
así que una pregunta no se repite en la misma partida. Entre partidas el sorteo es
independiente y el grupo de preguntas es pequeño según el modo. Preguntas activas en `main`
a 22-11-2026: Aleatorio 1.309, Medio 722, Difícil 304, Fácil 283. En arcade, un grupo es una
sola categoría (Deportes tiene 73, 43 en Difícil y 12 en Fácil). Con partidas de unas
20-60 preguntas, en Fácil o Difícil ya se repite una parte notable de la siguiente partida.

## Objetivos

- Preferir las preguntas que ese jugador ha visto menos veces (o ninguna).
- No permitir dos preguntas seguidas de la misma categoría. Antes se permitían hasta 2.
- Coste de cálculo bajo y ninguna escritura ni lectura nueva en Firebase.

## No objetivos (fase 2, decisión aparte)

- Contador global de uso entre todos los jugadores.
- Colección nueva en Firestore, cambios en `firestore.rules` o en `question-stats`.
- Sincronizar la memoria entre dispositivos o cuentas.

## Anti-objetivos (sería un fallo aunque «funcione»)

- Que una partida termine antes o no arranque por culpa de la memoria o de la regla.
- Que `localStorage` bloqueado, lleno o corrupto rompa el juego: debe comportarse como hoy.
- Cualquier escritura nueva en Firebase.

## Cómo funciona hoy

`buildQueue` (`core/selection.ts`) filtra el banco, lo baraja entero y, solo en `Aleatorio`,
aplica `spreadRuns` con `MAX_SAME_IN_A_ROW = 2` a la categoría y a la dificultad. En los
filtros Fácil, Medio y Difícil la categoría no se reparte. El modo arcade sirve una sola
categoría.

## Enfoques considerados

1. **Solo por dispositivo (elegido).** `localStorage`, sin backend. Resuelve la repetición
   que ve cada jugador. No da estadísticas globales.
2. Solo global en Firestore. Estadísticas reales, pero no evita repeticiones a un jugador,
   consume la cuota de escrituras compartida con el ranking y obliga a abrir escrituras.
3. Ambos. Es la fase 2 si se quiere: se añadiría sobre esta base sin deshacer nada.

## Diseño

**Regla de categorías**

- Constante nueva `MAX_SAME_CATEGORY_IN_A_ROW = 1` en `core/constants.ts`.
  `MAX_SAME_IN_A_ROW = 2` se queda para la dificultad.
- `spreadRuns` pasa a recibir un límite por clave (`{ key, max }`) en vez de uno común.
- La categoría se reparte en todos los filtros cuando no hay `category`. La dificultad sigue
  repartiéndose solo en `Aleatorio`. El modo arcade queda exento.
- Al final de la cola, si solo queda una categoría, la regla se relaja (ya lo hace
  `spreadRuns`): nunca se descarta una pregunta.

**Memoria por dispositivo (el contador)**

- Mapa `id → veces mostrada` en `localStorage`, clave `contrarreloj.seen.v1`.
- `buildQueue` recibe `seen` (opcional). Orden: barajar, orden estable por veces mostrada
  ascendente (el barajado hace de desempate al azar), y después `spreadRuns`. Coste
  O(n log n) con n ≈ 1.300-1.500. Sin reinicios: cuando ya se han visto todas, salen primero las
  menos vistas.
- `Game` expone los ids presentados (respondidas, saltadas y la que estaba en pantalla).
  El núcleo sigue siendo puro, sin acceso a `localStorage`.
- Nueva utilidad `app/utils/seen-questions.ts`, con el mismo patrón que `question-cache.ts`:
  `StorageLike`, validación con zod y todo dentro de `try/catch`. Almacenamiento bloqueado o
  datos corruptos equivalen a memoria vacía, es decir, el comportamiento de hoy.
- `GamePlay.vue` lee la memoria (`useSeenQuestions`) al crear la partida y se la pasa a
  `useGameSession` como `seen`; la sesión avisa con `onShown` y `GamePlay.vue` guarda.
- El guardado es incremental: cada aviso lleva solo las preguntas presentadas desde el
  anterior, así que ninguna se cuenta dos veces. Se avisa al terminar la partida, al salir de la
  pantalla (`onScopeDispose`), al ocultar o cerrar la página (`pagehide`) y al pasar la pestaña
  a segundo plano (`visibilitychange`). Si el guardado falla, la partida no se ve afectada.
- Al guardar se descartan los ids que ya no están en el banco, para que no crezca sin límite.

## Decisiones mías (revisables)

- Contador (mapa) en vez de un simple «visto / no visto», para no necesitar reinicios.
- Las cuentas se comparan dentro de cada dificultad (rango = cuenta menos la cuenta mínima de
  su nivel). Sin esto, un dispositivo que ha jugado mucho en un nivel recibiría partidas
  Aleatorias sin ese nivel y los puntos disponibles cambiarían (hallazgo de la revisión final).
- Una pregunta cuenta como mostrada al presentarse, aunque se salte o se acabe el tiempo.
- Una constante propia para categoría en vez de reutilizar `MAX_SAME_IN_A_ROW`.
- No se cambia el resto de `buildQueue` (convierte todo el banco a `PlayableQuestion`;
  coste despreciable, queda fuera de este cambio).

## Lo que queda para ti

- **Clasificación en `app/pages/cookies.vue`.** La clave nueva debe figurar en la lista. No
  es «imprescindible» ni una preferencia que el jugador elige como `contrarreloj.muted`.
  Propuesta: «Funcional, solo en tu dispositivo, no se envía a ningún sitio», duración
  «hasta que borres los datos del navegador». Si hace falta consentimiento para este tipo
  de almacenamiento es una decisión legal tuya; no es asesoramiento jurídico.

## Pruebas

El núcleo exige 100 % de cobertura (`vitest.config.ts`), así que se cubren:

- La cola prefiere menos vistas y desempata al azar con una semilla fija; nunca repite una
  pregunta dentro de una partida.
- La regla de categorías en cada filtro, la excepción del arcade y la relajación al final.
- `seen-questions`: JSON corrupto, almacenamiento bloqueado o lleno, y poda de ids.
- Que `spreadRuns` respeta límites distintos por clave (los tests actuales se actualizan).

## Impacto en Firebase

Ninguno: sin escrituras nuevas, sin lecturas nuevas (la caché del banco de una hora no
cambia), sin cambios en reglas.
