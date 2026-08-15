# ISSUE-155 — El informe AEO promete "se está preparando" sobre un run que ya terminó sin score

## Ambiente

production

## Detectado

2026-07-17 (caso Grupo Berel, sostenido ~15 días antes de que alguien lo mirara). Canal de
detección: revisión humana de la superficie AEO del cliente, no una alerta — **el estado se ve
sano**: no hay error, no hay 500, no hay señal de reliability que lo cuente.

Formalizado como issue el 2026-08-15. Hasta ahora el fix vivía enterrado como Slice 1 de
`TASK-1425`, que es `P2` y está **bloqueada por `TASK-1424`** — una dependencia que el fix no
necesita (la propia `TASK-1425` lo dice: *"El fix de estado sin-score NO depende de TASK-1424"*).
Un incidente de runtime que promete algo falso a un cliente real no puede esperar a que aterrice
una foundation de share of voice. Vehículo correcto: issue, por el Issue Lifecycle Protocol de
`CLAUDE.md` (los issues documentan problemas encontrados en runtime; las tasks son trabajo
planificado).

## Síntoma

Un run del grader que **ya terminó** y **no produjo score** renderiza el estado de espera:

- Superficie operador (`/growth/aeo/[organizationId]`):
  **"El informe se está preparando"** / *"Hay un run en proceso. Vuelve en unos minutos para ver el
  diagnóstico."*
- Superficie cliente (`/aeo`):
  **"Tu informe se está preparando"** / *"Estamos terminando de medir tu visibilidad. Vuelve en un
  rato y estará listo."*

Ambos textos afirman dos cosas que son falsas: que **hay un run en vuelo** y que **algo va a
llegar**. No hay nada corriendo y no va a llegar nada. La pantalla se queda igual mañana, y en 15
días. El usuario no tiene forma de distinguir esto de una espera legítima de 3 minutos, y no tiene
ninguna acción disponible: la superficie no ofrece "Correr AEO" ni explica qué pasó.

Caso concreto: Grupo Berel, runs en estado `partial` con 0 findings y sin score, de la era previa
al fix del worker del 2026-07-04. Lo vio así **durante 15 días**.

## Causa raíz

El código colapsa **dos realidades distintas** en un solo código de error, y la copy que ese código
dispara sólo describe una de las dos.

**1. La lectura sólo distingue "hay score" / "no hay score".**

`readGraderReport` lanza `score_not_found` cuando el run no tiene fila en `grader_scores`:

- `src/lib/growth/ai-visibility/report/command.ts:59` — `throw new GraderReportError('score_not_found', 'El run no tiene score persistido todavía.')`

Ese código se traduce a `report_unavailable` en los dos readers de superficie, con exactamente el
mismo texto en el mensaje interno:

- `src/lib/growth/ai-visibility/client/command.ts:66-68` — *"El reporte de tu organización aún se está preparando."*
- `src/lib/growth/ai-visibility/operator/command.ts:91-93` — mismo mapeo `score_not_found → report_unavailable`

**2. Pero el run que se está leyendo ya es TERMINAL.**

El run que alimenta ambas superficies se resuelve con un filtro de estados que **excluye los
estados en vuelo**:

- `src/lib/growth/ai-visibility/store.ts:359` — `const CLIENT_REPORTABLE_RUN_STATUSES = ['succeeded', 'partial'] as const`
- `src/lib/growth/ai-visibility/store.ts:387-398` — `getLatestClientGraderRun` filtra por esos dos estados y ordena `ORDER BY r.finished_at DESC NULLS LAST`

`succeeded` y `partial` son estados de **cierre**, con `finished_at` poblado. O sea: cuando la
superficie entra en `report_unavailable`, la afirmación "hay un run en proceso" es **estructuralmente
imposible** — el único run que la consulta puede devolver ya terminó. El estado que la copy describe
(run en vuelo) no es el estado que el código puede alcanzar por ese camino.

**3. La copy hereda la ambigüedad y la convierte en promesa.**

- `src/lib/copy/growth.ts:966-967` — `preparingTitle: 'El informe se está preparando'` /
  `preparingBody: 'Hay un run en proceso. Vuelve en unos minutos para ver el diagnóstico.'`
- `src/lib/copy/growth.ts:574-577` — `states.preparing.title: 'Tu informe se está preparando'` /
  `body: 'Estamos terminando de medir tu visibilidad. Vuelve en un rato y estará listo.'`

Los comentarios de ambas pages muestran que la intención original era correcta y que la omisión fue
no modelar el tercer caso:

- `src/app/(dashboard)/growth/aeo/[organizationId]/page.tsx:208` — *"report_unavailable → hay run pero sin score aún: 'preparando' honesto, sin razón interna"*
- `src/app/(dashboard)/aeo/page.tsx:197` — *"report_unavailable → 'se está preparando' neutral. NUNCA exponer la razón interna de review_required"*

La preocupación (no filtrar `review_required` al cliente) es legítima y debe conservarse. Pero
"no exponer la razón interna" no obliga a **inventar** una razón externa falsa. La degradación
honesta —patrón ya sostenido en este mismo dominio con `score: null ≠ 0`— exige decir *el run
terminó sin resultado*, no *espera un poco más*.

**Bug class:** el tercer estado no modelado. La lógica nació binaria (hay informe / todavía no) en
un momento donde "todavía no" era la única alternativa real; cuando apareció el tercer caso (run
terminal sin score) cayó en el cajón que quedaba libre, y nada rompió. Es el mismo patrón de
`ISSUE-154` en la superficie de keywords: un estado nuevo aterriza en el render de un estado viejo,
con el build verde.

## Impacto

- **A un cliente real, en producción, durante 15 días.** Grupo Berel vio una promesa que nadie iba a
  cumplir. El daño no es la ausencia del informe (eso ya había pasado): es que la plataforma afirmó
  que estaba en camino.
- **Afecta las dos superficies**, cliente y operador, por la misma causa. El operador tampoco se
  entera de que hay que volver a correr: la pantalla le dice que espere.
- **Sin señal, sin ticket, sin alerta.** El estado es un render de éxito degradado: no hay excepción,
  no hay `captureWithDomain`, no hay signal de reliability que cuente runs terminales sin score. La
  única forma de detectarlo es que un humano mire y sepa que 15 días no es "unos minutos".
- **Contradice una regla del propio repo.** El contrato de errores canónico prohíbe ofrecer una
  acción de espera/reintento cuando la causa es estructural: reintentar no resuelve nada y oculta la
  acción real. Acá la acción real es *volver a correr el diagnóstico*, y no está ofrecida.
- **Riesgo de recurrencia alto**: cualquier corrida futura que termine `partial` con 0 findings —
  provider caído, prompt pack degradado, gate de revisión— cae en el mismo agujero. La tasa de
  observaciones `skipped`/`failed` del grader es del 32% (auditoría de plataforma 2026-08-15 §1.4),
  así que el caso no es exótico.

## Solución

Separar el tercer estado en la capa que sabe distinguirlo, y decir la verdad.

**1. Distinguir run en vuelo de run terminal sin score.** El dato ya está en la fila: si el run que
se leyó tiene `status IN ('succeeded','partial')` y `finished_at` poblado, no está en vuelo. Dos
caminos posibles, a decidir al implementar:

- (a) Código de error nuevo en los readers (`report_scoreless` junto a `report_unavailable`), que es
  lo correcto de contrato pero toca `client/command.ts` y `operator/command.ts`; o
- (b) Lookup del run en la page para clasificar el estado, sin tocar el reader — que es lo que
  `TASK-1425` prefería para no ampliar el contrato.

Preferir (a): el contrato es el lugar donde vive la distinción, y hoy los **dos** consumers tienen
que repetir la misma inferencia. Un `report_unavailable` que significa dos cosas distintas es el
defecto, no la page.

**2. Copy honesta, en ambas superficies**, con ids nuevos en `src/lib/copy/growth.ts` (validar con
`greenhouse-ux-writing`, es-CL tuteo para cliente y registro de operador para el cockpit):

- decir que **el último diagnóstico terminó sin resultado**, con su fecha;
- **no** prometer que algo está en camino;
- **no** exponer la razón interna (`review_required` sigue sin filtrarse al cliente);
- ofrecer la acción real: **Correr AEO** en la superficie operador; en la del cliente, el
  affordance de soporte que ya existe (`support.action: 'Hablar con tu equipo'`,
  `src/lib/copy/growth.ts:562-567`) o el run self-serve cuando el tier lo permite.

**3. Hacerlo visible.** Señal de reliability que cuente runs reportables terminales sin score
(steady 0). Hoy este defecto no tiene ningún observador: se descubrió mirando.

**4. Cerrar la deuda en `TASK-1425`.** Al aplicar el fix, su Slice 1 queda cerrado por este issue;
`TASK-1425` conserva sólo el panel per-motor (Slices 2 y 3), que sí depende de `TASK-1424`. Dejar
`## Delta` en `TASK-1425` con la fecha y el puntero a este issue.

## Verificación

1. Reproducir en staging: un run reportable (`succeeded` o `partial`) sin fila en `grader_scores`
   para una org de prueba.
2. `/growth/aeo/[organizationId]` muestra el estado nuevo, con fecha del último run y CTA **Correr
   AEO** — no la copy de espera.
3. `/aeo` de esa misma org muestra el estado nuevo, sin prometer llegada y sin filtrar la razón
   interna.
4. Un run **realmente** en vuelo (`pending`/`running`) sigue mostrando la copy de espera actual —
   el estado legítimo no se pierde.
5. La señal de reliability cuenta el caso reproducido y vuelve a 0 al puntuar el run.
6. Verificar contra el caso real: la org de Grupo Berel deja de mostrar la promesa.
7. Gates: `pnpm local:check` + `pnpm vitest run src/lib/growth/ai-visibility` + GVC de las dos
   superficies (desktop + 390px) con el estado nuevo capturado.

## Estado

open

## Relacionado

- `TASK-1425` — *AEO: panel "Cómo te ve cada motor" (SoV per-motor) + estado honesto de run sin
  score*. Su Slice 1 es este fix; queda absorbido por este issue. `P2`, bloqueada por `TASK-1424`.
- `TASK-1424` — foundation SoV per-motor. **No** es dependencia de este fix.
- `docs/audits/platform/2026-08-15-growth-seo-aeo-module-opportunity-audit.md` §1.4 — el 32% de
  observaciones `skipped`/`failed` que hace probable el caso; §C2 — el eje AEO del 360 como foto que
  puede estar vencida.
- `ISSUE-154` — mismo bug class (el estado nuevo cae en el render del estado viejo, build verde) en
  la superficie de keywords SEO.
- Archivos: `src/lib/growth/ai-visibility/report/command.ts:59` ·
  `src/lib/growth/ai-visibility/client/command.ts:66-68` ·
  `src/lib/growth/ai-visibility/operator/command.ts:91-93` ·
  `src/lib/growth/ai-visibility/store.ts:359,387-398` ·
  `src/app/(dashboard)/aeo/page.tsx:197-206` ·
  `src/app/(dashboard)/growth/aeo/[organizationId]/page.tsx:208-215` ·
  `src/lib/copy/growth.ts:574-577,966-967`
