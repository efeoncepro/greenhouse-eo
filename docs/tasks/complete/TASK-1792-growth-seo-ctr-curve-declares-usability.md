# TASK-1792 — La curva de CTR declara si es utilizable, o la lente no ordena

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `complete`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `reader`
- Epic: `EPIC-022`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `growth`
- Blocked by: `none`
- Branch: `Greenhouse develop; sin worktrees`

## Summary

`expectedCtrAt` hace `if (typeof measured === 'number') return measured`, así que un **CTR de 0
medido pasa el guard** y anula el fallback. Con la curva real de `efeoncepro.com` el bucket de la
posición objetivo tiene 75 impresiones y 0 clics, así que `targetCtr = 0`, `estimatedClickGain = 0`
para **toda** la lente y el `.sort()` por ese campo es un no-op: la pantalla de oportunidades **no
ordena mal, no ordena**. Esta task hace que la curva declare si es utilizable y que la lente, cuando
no lo es, ordene por un criterio declarado en vez de fabricar un cero creíble.

🔴 **Bloquea el cutover de `TASK-1700`**: su plan de rollback devuelve la lente a este reader, así
que hasta que los Slices 1 y 2 estén en `main`, revertir la cola priorizada aterriza en una lente
que no ordena. Los Slices 1 y 2 son el mínimo que levanta ese bloqueo.

## Why This Task Exists

El defecto no es un error de cálculo: es una **confusión de ausencia** con consecuencias silenciosas.

**Cómo se introdujo.** Un solo commit, `8647678385b1` (2026-08-05, `TASK-1302` Slice 4). El archivo
nació completo: `MIN_IMPRESSIONS_FLOOR = 10`, `readOrgCtrCurve`, `FALLBACK_CTR_CURVE`, `expectedCtrAt`
con su guard, `estimatedClickGain` y el `.sort()` aparecen juntos en el mismo diff. **No hubo un
fallback sano que algo posterior rompiera** — nació inalcanzable para un bucket presente con CTR
cero. Los commits de `TASK-1661` (`efc76b8b0`, `fc0019e43`) agregaron mercado y barrera de enlaces
sin tocar una sola línea del score.

La curva propia no fue un capricho: la spec de `TASK-1302` pedía `impresión × volumen / dificultad`
(o sea, proveedor), y el implementador la **corrigió sobre el plan** con un argumento correcto y
declarado en el commit — *"las impresiones de GSC ya son demanda medida, y de TU SERP"*, más la
propiedad de absorber sola el efecto de los AI Overviews. La doctrina del oficio respalda eso. Lo
que falló fueron dos cosas compuestas:

1. **Ausencia sintáctica ≠ ausencia de señal.** Se modeló "no hay dato" como *"el bucket no existe
   en el `Map`"*. El caso real —bucket presente, sin clics— nunca entró al modelo. Es la doctrina
   `●`/`◑` del propio módulo violada en su centro: *ausencia ≠ 0*.
2. **Una constante respondiendo dos preguntas estadísticas distintas.** `MIN_IMPRESSIONS_FLOOR = 10`
   fue dimensionado para *"¿es interpretable la posición media?"* — y ahí 10 basta, que es
   exactamente como lo sigue usando `gap/read-seo-aeo-gap.ts:46`, su uso legítimo. Se reutilizó para
   *"¿es estimable el CTR?"*, que necesita ~1.000. Nada en el código marca que el mismo número
   responde dos cosas.

Hay un rastro delator: el docstring de `expectedCtrAt` promete *"nunca devuelve un CTR objetivo
menor al actual"* — una garantía que **esa función no implementa** (vive en el `Math.max(0, …)` del
call site). El autor creyó haber cubierto la degeneración adentro.

**Por qué nadie lo vio.** Los tests mockean la curva **siempre con CTR positivo** en el bucket
objetivo (`keyword-opportunities-reader.test.ts:168,179,190`); el caso de curva vacía se ejercita
pero **sin un solo assert sobre `estimatedClickGain`**. Y el sanity contra PG
(`scripts/growth/_sanity-seo-keyword-opportunities.ts`) importa **sólo** `SEO_KEYWORD_OPPORTUNITIES_SQL`
por una razón documentada y buena (el reader usa el pool y no ve la transacción con `ROLLBACK`), así
que nunca ejercita `readOrgCtrCurve` ni `expectedCtrAt`. Los mocks cubren el TS sin el SQL, el sanity
cubre el SQL sin el TS, y el score cayó justo en la costura. La evidencia de cierre de `TASK-1302`
es genuina —375 keywords contra PG real— pero **no midió el campo roto**. Agravante de suerte: la
única organización con serie entonces era Berel, cuyo bucket 5 tiene CTR ≈0,98%; aunque alguien
hubiera mirado el número, ahí se veía bien.

**Por qué es defecto de producto y no de un cliente.** El disparador no es "sitio chico": es
*cualquier organización cuyo bucket en la posición objetivo tenga ≥10 impresiones y 0 clics*,
condición garantizada para todo target recién onboardeado y todo sitio de bajo tráfico en sus
primeras semanas de serie.

**Por qué ahora.** El plan de rollback de `TASK-1700` (Slice 5 y Slice 7) es *"flag a `false` en
Vercel + redeploy → la lente vuelve al reader legacy"*. La red de seguridad de la cola priorizada
**aterriza en la lente rota**. Mientras el reader siga así, revertir la cola es cambiar un problema
por otro sin que nadie lo note.

## Goal

- Que la curva de CTR **declare** si es utilizable en la posición objetivo, en vez de que el
  consumidor lo infiera de la presencia de una clave en un `Map`.
- Que la lente, cuando la curva no es utilizable, **ordene por un criterio declarado** y diga cuál —
  nunca por un campo colapsado a un valor constante.
- Que el contrato transporte la procedencia y el tamaño de muestra, para que ningún consumidor
  (pantalla, lane ecosystem, tool MCP) pueda leer un techo estimado sin saber de dónde salió.
- Cerrar el segundo defecto de calibración descubierto al medir: el `FALLBACK_CTR_CURVE` está ~6×
  por encima del CTR realmente medido en el único sitio con datos confiables.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md` (§1.1 frontera SEO↔AEO; §556 describe
  el fallback tal como el autor lo creía: *"sólo para posiciones sin datos propios"* — esa frase
  queda desactualizada por esta task y se corrige)
- `docs/architecture/agent-invariants/SQL_DATE_MATH_AGENT_INVARIANTS.md` (la curva es SQL embebido
  con ventanas; live test contra PG real obligatorio)
- `docs/architecture/GREENHOUSE_CANONICAL_PATTERNS_V1.md`

Reglas obligatorias:

- 🔴 **`0` medido y "sin muestra suficiente" son estados distintos y jamás se colapsan.** Es la
  doctrina `●`/`◑` del módulo: ausencia ≠ 0. Un guard de una sola dimensión
  (`typeof measured === 'number'`) no puede distinguirlos y por eso no se conserva.
- 🔴 **NUNCA volver a gatear la validez del CTR por impresiones solas.** La precisión del estimador
  la gobiernan los **éxitos** (clics), no los ensayos. Un bucket con 50.000 impresiones y 3 clics
  tampoco tiene curva.
- 🔴 **NUNCA ordenar por un campo cuya varianza es cero sin declararlo.** Si el criterio primario no
  discrimina, la lente ordena por el secundario **y lo dice** en el contrato.
- 🔴 **§1.1 se mantiene:** cero JOIN/VIEW/FK entre `seo_*` y `grader_*`. Esta task no cruza lentes.
- **NO se reimplementa una tercera curva.** El repo ya tiene dos respuestas a la misma pregunta
  (`keyword-opportunities-reader.ts` y `work-queue/priority-score.ts`); esta task **reduce a una**,
  no agrega.

## Normative Docs

- `docs/tasks/in-progress/TASK-1700-growth-seo-prioritized-work-queue-aggregate.md` — su
  `isCurveUsableAtPosition` (`priority-score.ts:124-136`) + `score-versions.ts:105-107`
  (`curveMinBucketImpressions: 1000`, `curveMinBucketClicks: 5`) son la **referencia canónica** del
  umbral, con la aritmética justificada en el propio archivo: con CTR verdadero ~1%,
  `P(0 clics | n=75) ≈ 47%` (una moneda al aire) y con `n=1000` cae a ~0,004%.
- `docs/tasks/complete/TASK-1302-growth-seo-gsc-daily-snapshot-materializer.md` — origen del defecto.
- `docs/tasks/to-do/TASK-1691-seo-keywords-lente-de-mercado.md` — dueña del consumidor visible.

## Dependencies & Impact

### Depends on

- `greenhouse_growth.seo_gsc_daily` (existe; serie diaria en producción)
- `SEO_KEYWORD_OPPORTUNITIES_SQL` en `src/lib/growth/seo/keyword-opportunities-reader.ts` (existe)

### Blocks / Impacts

- **`TASK-1691`** — dueña de `src/lib/copy/growth.ts` y `KeywordOpportunityTable.tsx`. Hereda dos
  strings que quedan **factualmente falsas** en el modo degenerado y debe corregirlas:
  `keywords.opportunities.noGainHint` (*"Esta keyword ya convierte mejor que el promedio de la
  posición objetivo"* — afirma una comparación que no se hizo) y `sortedByGain` (*"Ordenadas por
  ganancia estimada: lo de arriba es lo que más rinde"* — promete un orden que no ocurre). Se le
  escribe un `## Delta` en el mismo commit que crea esta task.
- 🔴 **`TASK-1700` — ordenamiento duro, no coordinación blanda: esta task debe cerrar ANTES del
  cutover del consumer (su Slice 7).** Su plan de rollback declarado es *"flag a `false` en Vercel +
  redeploy → la lente vuelve al reader legacy"*. Mientras este reader siga fabricando el cero, esa
  red de seguridad **aterriza en una lente que no ordena**, y el revert cambiaría un problema por
  otro sin que nadie lo note — que es exactamente la propiedad que hace peligroso a este defecto.
  Un rollback cuyo destino no está verificado no es un rollback: es una suposición. Coordinación de
  umbral: esta task **adopta** su `isCurveUsableAtPosition` como referencia, no propone un valor
  propio.
- **`TASK-1708`** (`:424`) ya cita las constantes de módulo de este reader como el defecto que evita
  replicar; al cerrar esta task, esa cita se actualiza a la forma versionada.
- Tool MCP `get_seo_keyword_opportunities` (`src/mcp/greenhouse/server.ts:250-264`): hoy le promete
  al agente *"estimated click gain"* como señal, sin forma de saber que la curva no era utilizable.

### Files owned

- `src/lib/growth/seo/keyword-opportunities-reader.ts`
- `src/lib/growth/seo/ctr-curve.ts` (nuevo)
- `src/lib/growth/seo/__tests__/ctr-curve.test.ts` (nuevo)
- `src/lib/growth/seo/__tests__/keyword-opportunities-reader.test.ts`
- `src/lib/growth/seo/ctr-curve.live.test.ts` (nuevo)
- `src/lib/growth/seo/contracts.ts` (aditivo — coordinar con `TASK-1691`, ver abajo)
- `docs/architecture/GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md` (delta §556)

⚠️ **Colisión declarada con `TASK-1691`** (`to-do`, P2, `ui-lite`): declara `Files owned` sobre
`keyword-opportunities-reader.ts`, `contracts.ts`, `copy/growth.ts`,
`KeywordOpportunityTable.tsx` y el test del reader. **Objetos distintos, archivos compartidos**:
1691 declara la *frescura* de las lentes (`marketAsOf`, borde de `●`), esta task corrige la
*estimación*. 1691 no menciona CTR, curva ni ganancia en ninguna línea. Partición acordada: esta
task **no toca copy ni la vista**; 1691 **no toca la curva ni el score**. Ambas agregan campos al
mismo DTO, así que quien vaya segunda hereda el rebase — la serialización recomendada es
**1792 → 1691**, porque 1691 necesita saber qué estados existen para declararlos.

## Current Repo State

### Already exists

- `keyword-opportunities-reader.ts:129` `readOrgCtrCurve` — `HAVING SUM(impressions) >= 10`, devuelve
  `Map<number, number>` (sólo el CTR; **descarta la muestra**, que es justo el dato que hace falta).
- `keyword-opportunities-reader.ts:160` `FALLBACK_CTR_CURVE` + `:165` `expectedCtrAt` con el guard.
- `keyword-opportunities-reader.ts:46` `DEFAULT_TARGET_POSITION = 5`, `:50` `MIN_IMPRESSIONS_FLOOR = 10`.
- `keyword-opportunities-reader.ts:270` `estimatedClickGain`, `:282` `.sort()` por ese campo.
- **La respuesta correcta ya existe en el repo**, en el módulo hermano: `work-queue/priority-score.ts`
  quita el `HAVING` a propósito (`:65-74`), devuelve `impressions`/`clicks` junto al `ctr`, y
  `isCurveUsableAtPosition` (`:124-136`) exige **ambas** dimensiones. Cuando no pasa, declara
  `ctrCurveSource: 'unusable'` y `score: null` en vez de caer a una tabla pública. Su test
  (`__tests__/priority-score.test.ts:119-147`) ya documenta este defecto por nombre y usa las curvas
  reales de `efeoncepro.com` y `berel.com` como fixtures.
- `gap/read-seo-aeo-gap.ts:46` — mismo nombre de constante, **uso correcto** (posición ponderada). No
  construye curva. No entra en scope; se cita como el contraejemplo que confirma el diagnóstico.

### Gap

- El reader canónico sigue con el guard de una sola dimensión, que es por donde entra el 0.
- El contrato (`SeoKeywordOpportunity`) no transporta procedencia, muestra ni estado de la curva: el
  consumidor recibe un escalar sin forma de saber si significa algo.
- El `.sort()` no tiene noción de "el criterio no discrimina".
- Dos implementaciones de `readOrgCtrCurve` (mismo nombre, símbolos distintos, cero import entre
  ellas) responden distinto a la misma pregunta.

## Modular Placement Contract

- Topology impact: `none`
- Current home: `src/lib/growth/seo/` en el runtime Next.js de Vercel
- Future candidate home: `domain-package`
- Boundary: reader canónico `readKeywordOpportunities` y el nuevo módulo `ctr-curve`; consumers
  autorizados son la page server de `/admin/growth/seo/keywords`, el lane
  `api-platform/resources/ecosystem-growth-seo.ts` y la tool MCP
- Server/browser split: el módulo es server-only; toca `seo_gsc_daily` por el pool y nunca cruza al
  browser
- Build impact: `none`
- Extraction blocker: `none`

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-standard`
- Impacto principal: `reader`
- Source of truth afectado: `greenhouse_growth.seo_gsc_daily` (serie diaria GSC, lente `●`)
- Consumidores afectados: page server de la pantalla Keywords, lane ecosystem, tool MCP
  `get_seo_keyword_opportunities`
- Runtime target: `local` + `staging` + `production` (sólo lectura)

### Contract surface

- Contrato existente a respetar: `SeoKeywordOpportunity` en `src/lib/growth/seo/contracts.ts:86`;
  firma de `readKeywordOpportunities`
- Contrato nuevo o modificado: campos aditivos en el DTO (`ctrCurveSource`, `curveSampleSize`,
  `orderedBy`) y un módulo nuevo `ctr-curve` que expone el predicado de usabilidad
- Backward compatibility: `compatible` — la firma no cambia y los campos nuevos son aditivos.
  `estimatedClickGain` **conserva su tipo `number`**: no se vuelve nullable en esta task, porque el
  consumidor visible es propiedad de `TASK-1691` y un cambio de tipo lo rompería en compilación sin
  que su dueña pueda corregir el render en el mismo PR. La honestidad del *número* se transporta en
  `ctrCurveSource`; la honestidad del *orden* se resuelve en el servidor (Slice 2).
- Full API parity: la lente ya se consume por reader canónico desde los tres consumers; esta task no
  agrega capability nueva ni ruta nueva, así que el gate de parity aplica en modo *touch-it/fix-it*:
  los tres consumers heredan el estado declarado del mismo primitive, sin lógica duplicada.

### Data model and invariants

- Entidades/tablas/views afectadas: `greenhouse_growth.seo_gsc_daily` (sólo `SELECT`)
- Invariantes que no se pueden romper:
  - Un CTR de `0` medido y una muestra insuficiente son **estados distintos** y el contrato los
    distingue; ningún consumidor puede volver a confundirlos leyendo un solo campo.
  - La usabilidad de la curva en una posición exige **impresiones y clics**, nunca impresiones solas.
  - Si el criterio primario de orden no discrimina, el contrato declara cuál ordenó.
  - La curva expuesta es **monótona no creciente** con la posición: hoy el híbrido produce bucket 8
    en `0,0000` y bucket 9 en `≈0,03` — dos órdenes de magnitud entre posiciones adyacentes.
  - Cero JOIN/VIEW/FK con `grader_*` (§1.1).
- Write-target allowlist: `N/A` — la task no escribe en ninguna tabla.
- Tenant/space boundary: `organization_id` viaja como parámetro y filtra toda query; sin cambios
  respecto del reader actual.
- Idempotency/concurrency: `N/A` — read-only, sin efectos.
- Audit/outbox/history: `none` — no hay mutación que auditar. La procedencia viaja en el DTO.

### Migration, backfill and rollout

- Migration posture: `none`
- Default state: `enabled` — el cambio corrige una lectura que hoy no discrimina; dejarlo apagado
  mantendría la lente muda sin ganar seguridad. No hay estado que migrar ni escritura que revertir.
- Backfill plan: `N/A`
- Rollback path: `revert PR` — el reader es puro respecto de la base
- External coordination: `N/A — repo-only change`

### Security and access

- Auth/access gate: sesión + entitlement del módulo Growth SEO, sin cambios
- Sensitive data posture: sin PII; la serie GSC es agregada por keyword/página
- Error contract: `canonicalErrorResponse` en el lane; el reader conserva su `Result` tipado
- Abuse/rate-limit posture: `none with rationale` — lectura de tabla propia, sin gasto de proveedor

### Runtime evidence

- Local checks: `pnpm vitest run src/lib/growth/seo` (unitarios + fixtures con las dos curvas reales)
- DB/runtime checks: `src/lib/growth/seo/ctr-curve.live.test.ts` vía `pnpm test:live` con el proxy
  Cloud SQL — reproduce la curva de las organizaciones con serie y asevera el veredicto por bucket
- Integration checks: `N/A` — sin proveedor externo
- Reliability signals/logs: sin signal nuevo; el estado declarado en el DTO es la señal
- Production verification sequence: ver `## Rollout Plan & Risk Matrix`

### Acceptance criteria additions

- [x] Source of truth, contract surface and consumers are named with real paths or objects.
- [x] Data invariants, tenant/access boundary and idempotency/concurrency posture are explicit.
- [ ] `N/A` — la task no crea tablas, así que no hay allowlist de destinos de escritura que tocar.
- [x] Migration/backfill/rollback posture is explicit and proportional to risk.
- [x] Runtime or DB evidence is listed for any change beyond docs/tooling.
- [x] Sensitive domains have canonical errors, audit/signal posture and no raw data leaks.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — la curva devuelve su muestra y declara su usabilidad

- Módulo nuevo `src/lib/growth/seo/ctr-curve.ts`: lee la curva **sin** `HAVING` (la decisión de
  usabilidad no se toma en el SQL) y devuelve por bucket `{ ctr, impressions, clicks }`.
- Predicado `isCurveUsableAtPosition(curve, position, config)` que exige **impresiones y clics**,
  adoptando los umbrales de `work-queue/score-versions.ts` (`1000` / `5`) como referencia canónica —
  no se propone un valor nuevo.
- Unitarios con las **curvas reales medidas** como fixtures (`efeoncepro.com` bucket 5 = 75/0;
  `berel.com` bucket 5 = 37.600/370), replicando el patrón que ya usa
  `work-queue/__tests__/priority-score.test.ts`.
- 🔴 **Anti-assert obligatorio**: `expectedCtrAtTarget` **no puede ser `0`** cuando la curva se
  declara utilizable. Es el guard contra el valor válido pero degenerado — el que pasa todos los
  checks sin que nada falle.

### Slice 2 — el orden es honesto o dice que no lo es

- `readKeywordOpportunities` consume el módulo del Slice 1. Cuando la curva **no** es utilizable en
  la posición objetivo, ordena por el criterio secundario declarado (impresiones × cercanía a
  página 1) en vez de por un `estimatedClickGain` colapsado.
- El DTO gana `ctrCurveSource: 'org_measured' | 'unusable' | 'fallback'`, `curveSampleSize` y
  `orderedBy`, de modo que los tres consumers heredan la procedencia sin lógica propia.
- Test que falla si el `.sort()` opera sobre un campo con varianza cero sin que `orderedBy` lo
  declare.

### Slice 3 — una sola curva en el módulo

- El reader legacy queda consumiendo `ctr-curve.ts`; se retira su `readOrgCtrCurve` privado.
- `MIN_IMPRESSIONS_FLOOR` conserva su uso legítimo (umbral de impresiones de la lente) y **deja de
  usarse** como piso de validez de la curva; el comentario del archivo declara la separación para
  que nadie vuelva a fundir las dos preguntas.
- Se documenta la coordinación con `TASK-1700` para que `priority-score.ts` migre al predicado
  compartido; **esta task no edita ese archivo** (está en vuelo y es de otra dueña).

### Slice 4 — recalibrar el fallback y cerrar el salto de la curva híbrida

- El `FALLBACK_CTR_CURVE` está ~6× por encima del CTR medido en el único sitio con datos confiables
  (bucket 5: `0,06` declarado vs `0,0098` medido en Berel). Cualquier organización que caiga al
  fallback recibe techos inflados ~6×.
- Se reemplaza el salto entre "curva propia" y "tabla pública" por una transición continua: se
  estima el **nivel** del sitio (un parámetro, del agregado no-marca) y se toma la **forma** de la
  referencia, en vez de estimar ~20 parámetros desde datos que no sostienen ni uno. La curva
  resultante se fuerza monótona no creciente.
- Live test que asevera monotonía y ausencia de saltos de orden de magnitud entre buckets adyacentes.

## Out of Scope

- **Copy y vista.** `src/lib/copy/growth.ts` y `KeywordOpportunityTable.tsx` son de `TASK-1691`. Las
  dos strings falsas quedan declaradas en su `## Delta`, no se corrigen acá.
- **`estimatedClickGain` nullable.** Cambiarlo de tipo rompe el consumidor visible en compilación sin
  que su dueña pueda arreglarlo en el mismo PR. Se evalúa en `TASK-1691` o en un follow-up conjunto.
- **`work-queue/priority-score.ts`.** Propiedad de `TASK-1700`, en vuelo. Se coordina, no se edita.
- **Filtro marca / no-marca de la curva.** El oficio lo exige y hoy no existe — es un **segundo
  defecto independiente** que no se cura cuando el sitio crezca. Va a follow-up propio porque
  requiere resolver cómo se clasifica marca en el módulo, que es una decisión de alcance, no un fix.
- **Bajar `DEFAULT_TARGET_POSITION` de 5 a 8–10.** El oficio dice que 8–10 es el mejor ratio
  esfuerzo/retorno, pero mover el objetivo cambia el ranking histórico de toda organización; es
  decisión de producto con su propia evidencia, no un efecto colateral de este fix.
- Retirar `readKeywordOpportunities` como reader público (ya declarado como no-objetivo por
  `TASK-1700`).

## Detailed Spec

**El defecto, en una línea.** `expectedCtrAt` distingue "el bucket está en el `Map`" de "no está",
cuando la pregunta real es "¿hay muestra suficiente para estimar un CTR?". Son preguntas distintas y
la primera no aproxima a la segunda.

**Por qué el piso de 10 es indefendible.** Con la regla de tres (cota superior del intervalo 95% para
cero éxitos en `n` ensayos, `3/n`):

| Impresiones | CTR real compatible con "0 clics" |
|---|---|
| 10 (el piso actual) | hasta 26% |
| 32 | hasta 9,4% |
| 75 | hasta 4,0% |
| 410 | hasta 0,73% |

Un bucket que pasa el gate con 10 impresiones y 0 clics es compatible con **cualquier** CTR entre 0%
y 26%: la escala entera del fenómeno, escrita como si fuera un puntual. Y el piso mide **ensayos**
cuando la precisión la gobiernan los **éxitos**: con un CTR de 3%, 10 impresiones esperan 0,3 clics.

**Estado medido en producción (2026-08-28, proxy PG, reproduciendo el SQL exacto del reader).**

| Org | Ventana | Buckets | Con `ctr = 0` | Bucket 5 (impr/clics) | `targetCtr` | Veredicto |
|---|---|---|---|---|---|---|
| Efeonce | 7d | 32 | 31 | 18 / 0 | **0** | 🔴 rota |
| Efeonce | 28d | 63 | 61 | 75 / 0 | **0** | 🔴 rota |
| Berel | 7d | 74 | 56 | 7.389 / 78 | 0,01056 | ✅ sana |
| Berel | 28d | 100 | 69 | 37.600 / 370 | 0,00984 | ✅ sana |

Efecto end-to-end sobre las filas que la lente devuelve: **Efeonce 24 de 24 con `gain = 0` (100%)**;
Berel 1.445 de 1.798 (80%) con techo máximo de 31. El defecto es estable, no depende del período.
En Efeonce **9 de los 10 buckets del top-10 están en cero**, incluidos el 1, el 2 y el 3 — así que
mover `targetPosition` no lo salva.

Salvedad de honestidad sobre esa medición: la serie más antigua empieza el 2026-07-31, así que la
ventana de 90 días **no es hoy un test independiente** (≡ 28d por construcción). Las ventanas
realmente distintas son 7 y 28, y en ambas el veredicto coincide.

**Lo que sí es medible, y matiza el diagnóstico.** El **agregado** de `efeoncepro.com` tiene señal:
1.410 impresiones y 2 clics en 28 días → CTR ≈0,14%. Bajo la curva ya deprimida del vertical debía
producir ≈11,4 clics; `P(≤2 | λ=11,4) ≈ 0,09%`. O sea: **el sitio genuinamente rinde muy por debajo,
y eso es real. Lo que no es medible es la forma de la curva por posición.** Un nivel es 1 parámetro;
una curva por posición son ~20. Ese es exactamente el fundamento del Slice 4: estimar el nivel y
prestar la forma, en vez de estimar veinte cosas desde datos que no sostienen una.

Y para este sitio el problema no es de calibración del umbral: a la tasa actual, un solo bucket
necesitaría del orden de **14 meses** de acumulación para ser estimable, y GSC retiene 16. **La curva
propia de `efeoncepro.com` es estructuralmente inalcanzable**, así que subir el número de 10 a 1.000
sin el Slice 4 dejaría a la organización sin lente igual.

**Superficies que heredan el defecto** (los dos únicos call sites del reader; ninguno pasa
`targetPosition`, así que ambos usan el default 5):

| Superficie | Ruta:línea | ¿Orden o número? |
|---|---|---|
| Server component pantalla Keywords | `src/app/(dashboard)/admin/growth/seo/keywords/page.tsx:334` | passthrough |
| Lane ecosystem | `src/lib/api-platform/resources/ecosystem-growth-seo.ts:287` | passthrough literal |
| Tabla de oportunidades | `KeywordOpportunityTable.tsx:120,156` | **ambos** — el orden por defecto ES por ganancia |
| Celda "Ganancia est." | `KeywordOpportunityTable.tsx:447,620` | número + hint falso |
| Veredicto (titular) | `KeywordOpportunityVerdict.tsx:86` | el bloque *"+N clics/mes est."* desaparece |
| Mapa de burbujas | `KeywordOpportunityMap.tsx:179,204-206,246` | **ambos** — todas al tamaño mínimo y el lienzo queda **sin etiquetas** (`filter(gain > 0)`) |
| Export CSV | `KeywordOpportunitiesView.tsx:549` | se lo lleva el cliente |
| Tool MCP | `src/mcp/greenhouse/server.ts:250-264` | **ambos**, y su `inputSchema` no permite otro `targetPosition` |

Nota sobre el orden visible: la tabla re-ordena en cliente y `Array.prototype.sort` es estable, así
que con todas las ganancias iguales preserva el orden del servidor. Por eso **arreglar el orden en el
servidor (Slice 2) corrige lo que el usuario ve**, aunque la etiqueta siga siendo propiedad de 1691.

**El techo no es un pronóstico.** El oficio es explícito: `impresiones × (CTR_objetivo − CTR_actual)`
da un **techo** bajo el supuesto de que el CTR observado en esa posición se repite; no dice que la
página vaya a llegar ahí. `orderedBy` y `ctrCurveSource` existen para que el consumidor pueda
presentarlo como techo y no como promesa.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 (módulo + predicado) → Slice 2 (reader consume y ordena honesto) → Slice 3 (una sola curva).
- **Slice 2 no puede shippear sin Slice 1**: sin el predicado, el reader no tiene con qué decidir.
- **Slice 4 es independiente y puede ir después de Slice 2**, pero no antes: recalibrar el fallback
  mientras el guard sigue anulándolo no cambia nada observable.
- Slice 3 no puede ir antes que Slice 2 (retirar la curva privada sin consumidor la deja huérfana).
- 🔴 **Cross-task: Slices 1 y 2 de esta task deben estar en `main` ANTES del cutover del consumer de
  `TASK-1700` (su Slice 7).** No es preferencia de secuencia: el rollback de 1700 devuelve la lente a
  este reader, así que hasta que Slice 2 cierre, ese revert deja al operador sin orden y sin aviso.
  Los Slices 1 y 2 son suficientes para levantar el bloqueo — 3 y 4 pueden ir después.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| El orden de la lente cambia para Berel y un operador lo lee como regresión | UI (lectura) | medium | El cambio es la corrección; se comunica en el `changelog.md` y se compara antes/después contra la org sana en staging | no signal — emerge en feedback del operador |
| El umbral 1000/5 deja a Berel también sin curva en buckets profundos | reader | medium | Live test que reporta el veredicto por bucket para ambas orgs antes de mergear; el Slice 4 cubre el caso con nivel+forma | live test rojo |
| Rebase conflictivo con `TASK-1691` sobre `contracts.ts` | reader | high | Serialización declarada 1792 → 1691 y campos aditivos; `Files owned` de ambas lo dice explícito | conflicto de merge |
| Divergencia con `work-queue` si el umbral se toca de un solo lado | reader | medium | Los umbrales se adoptan de `score-versions.ts` como referencia; el follow-up unifica el predicado | test de paridad del predicado |
| El Slice 4 introduce una curva de referencia sin fuente declarada | reader | medium | La referencia y su procedencia se declaran en el módulo y en el delta de arquitectura; nunca un número sin origen | revisión de código |

### Feature flags / cutover

Sin flag — cambio de lectura, aditivo en el contrato y sin escritura. El cutover es inmediato al
merge. Poner un flag aquí significaría mantener vivo el camino que fabrica el cero, que es
exactamente lo que la task cierra; y un flag apagado dejaría la lente muda sin ganar reversibilidad
real (el revert del PR ya la da, en menos de 5 minutos y sin migración inversa).

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | revert PR; módulo puro sin persistencia ni consumers | <5 min | sí |
| Slice 2 | revert PR; el reader vuelve al comportamiento anterior, sin estado que deshacer | <5 min | sí |
| Slice 3 | revert PR; la curva privada vuelve al archivo | <5 min | sí |
| Slice 4 | revert PR; el fallback vuelve a la tabla anterior | <5 min | sí |

### Production verification sequence

1. `pnpm vitest run src/lib/growth/seo` verde, con los fixtures de las dos curvas reales.
2. `pnpm test:live` con el proxy Cloud SQL levantado: verificar que el live test **corre** (leer
   `passed`, no la ausencia de rojo — un `skipped` sin credenciales se ve igual que verde) y que
   reporta el veredicto por bucket para cada organización con serie.
3. Staging: abrir `/admin/growth/seo/keywords` para la organización **sana** (Berel) y confirmar que
   el orden y los techos siguen siendo los mismos que antes del cambio.
4. Staging: abrir la misma pantalla para **Efeonce** y confirmar que la lente ordena por el criterio
   declarado y que el contrato dice `ctrCurveSource: 'unusable'`.
5. Producción: repetir 3 y 4 contra el deployment activo.
6. Verificar el lane ecosystem y la tool MCP: ambos deben transportar los campos nuevos sin cambios
   en su firma.

### Out-of-band coordination required

- **`TASK-1691`** (dueña del copy y la vista): recibe el `## Delta` con las dos strings falsas.
- **`TASK-1700`** (en vuelo, dueña de `priority-score.ts`): acuerdo sobre el predicado compartido y
  sobre quién migra ese archivo. Su umbral es la referencia; esta task no propone uno propio.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [x] `ctr-curve.ts` devuelve por bucket `{ ctr, impressions, clicks }` y **no** aplica `HAVING` en el SQL.
- [x] `isCurveUsableAtPosition` exige impresiones **y** clics; un bucket con 75/0 se declara no utilizable.
- [x] Existe un test que falla si `expectedCtrAtTarget` es `0` con la curva declarada utilizable.
- [x] Con la curva real de `efeoncepro.com`, el reader **no** devuelve `estimatedClickGain = 0` para
      todas las filas: declara `ctrCurveSource: 'unusable'` y ordena por el criterio secundario.
- [x] Con la curva real de `berel.com`, el orden y los techos **no cambian** respecto del comportamiento actual.
- [x] El DTO expone `ctrCurveSource`, `curveSampleSize` y `orderedBy`, y los tres consumers los reciben.
- [x] `keyword-opportunities-reader.ts` ya no define un `readOrgCtrCurve` privado.
- [x] `MIN_IMPRESSIONS_FLOOR` conserva sólo su uso de umbral de impresiones, con el comentario que
      declara por qué no sirve como piso de validez de la curva.
- [x] La curva expuesta es monótona no creciente y no presenta saltos de orden de magnitud entre
      buckets adyacentes.
- [x] El live test corre con credenciales y reporta `passed`, no `skipped`.
- [x] El delta de `GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md` §556 corrige la descripción del fallback.
- [x] `TASK-1691` tiene su `## Delta` con las dos strings a corregir.

## Verification

- `pnpm local:check`
- `pnpm vitest run src/lib/growth/seo`
- `pnpm test:live` (con proxy Cloud SQL; verificar `passed`)
- Lectura manual de `/admin/growth/seo/keywords` en staging para una organización sana y una degradada

## Closing Protocol

- [x] `Lifecycle` del markdown quedo sincronizado con el estado real
- [x] el archivo vive en la carpeta correcta
- [x] `docs/tasks/README.md` quedo sincronizado con el cierre
- [x] `Handoff.md` quedo actualizado
- [x] `changelog.md` quedo actualizado
- [x] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas
- [x] `TASK-1700` quedo notificada del predicado compartido y del estado de su plan de rollback
- [x] `TASK-1708` actualizo su cita de las constantes de modulo de este reader

## Follow-ups

- **Filtro marca / no-marca de la curva.** El oficio lo exige explícitamente y hoy no existe: una
  curva agregada mezcla impresiones de sitelinks —que inflan el denominador sin comportamiento real
  detrás— con impresiones genuinas. Es un defecto independiente del tamaño de muestra y no se cura
  cuando el sitio crezca. Requiere decidir cómo se clasifica marca en el módulo.
- **Unificar el predicado con `work-queue/priority-score.ts`**, una vez que `TASK-1700` cierre.
- **Revisar `DEFAULT_TARGET_POSITION = 5`** contra la doctrina de 8–10, con evidencia propia.
- **Declarar el techo como techo en la superficie** (`TASK-1691` / `TASK-1785`): el contrato ya
  transporta la procedencia; falta que la lectura no lo presente como pronóstico.
- **Cerrar la costura de verificación** que dejó pasar el defecto: el sanity ejercita el SQL y los
  mocks el TS, y nada ejercita el reader completo contra PG. Vale como patrón para el módulo.

## Open Questions

- ¿La curva de referencia del Slice 4 se toma de una fuente pública declarada, o se deriva del
  agregado de las organizaciones con serie suficiente en la propia plataforma? La segunda es más
  honesta y mejora sola, pero hoy hay **una sola** organización con datos confiables, así que sería
  una referencia de n=1. Decisión a tomar en Discovery con la evidencia del momento.
- ¿`estimatedClickGain` debe volverse `number | null` cuando la curva no es utilizable? Es la forma
  más honesta y hace imposible el error, pero rompe al consumidor visible en compilación. Requiere
  acuerdo con `TASK-1691`.

<!-- ═══════════════════════════════════════════════════════════
     CIERRE
     ═══════════════════════════════════════════════════════════ -->

## Closure Report — 2026-08-28

**Estado: `complete` en código y verificado contra runtime real (lectura).** Sin flag, sin
migración, sin escritura: el cutover fue el merge. Rollback = revert PR, <5 min por slice.

### Qué se entregó

| Slice | Commit | Qué cerró |
|---|---|---|
| 1 | `d4d731721` | `ctr-curve.ts`: SQL sin `HAVING`, curva con su muestra, `isCurveUsableAtPosition` de dos dimensiones, veredicto explícito |
| 2+3 | `f8be78d83` | El reader consume el módulo, ordena honesto y declara el criterio; se retira la curva privada; `MIN_IMPRESSIONS_FLOOR` conserva sólo su uso legítimo |
| 4 | `8943b2f5c` | Referencia recalibrada con procedencia, nivel estimado del propio sitio, curva única monótona |

Slices 2 y 3 fueron un solo commit: separarlos dejaba la curva privada huérfana entre ambos, que
es justo lo que la regla de orden de la task prohíbe.

### Evidencia

- `pnpm vitest run src/lib/growth/seo` — **663 passed** (61 archivos).
- `pnpm test:live src/lib/growth/seo/ctr-curve` — **4 passed, NO skipped** (criterio explícito de
  la task). Reporta el veredicto por bucket de cada org y cada ventana independiente (7d y 28d):

  | Org | Ventana | Buckets | Nivel | p5 | CTR esperado |
  |---|---|---|---|---|---|
  | Efeonce | 7d | 74 | `reference` (1,000) | `unusable` | 0,01120 |
  | Efeonce | 28d | 98 | `reference` (1,000) | `unusable` | 0,01120 |
  | Berel | 7d | 116 | `org_level` (1,095) | `org_measured` | 0,01056 |
  | Berel | 28d | 137 | `org_level` (1,048) | `org_measured` | 0,00984 |

- `pnpm lint` limpio sobre el módulo · `pnpm typecheck` limpio.
- **Los tres anti-asserts se verificaron EN ROJO**, no sólo en verde: reintroducir el guard de una
  dimensión pone 3 tests a fallar; volver el `.sort()` a incondicional pone otros 3; bajar el piso
  de un solo lado rompe la paridad nombrando la fixture y la posición exactas.

### Dos hallazgos que la spec no anticipaba

1. **La referencia calza con Berel dentro del 5%.** El nivel estimado de `berel.com` da **1,048**
   (28d) y **1,095** (7d) contra la curva de referencia — y Berel **no es la fuente** de esa
   referencia (viene de la medición no-marca de la skill `seo-aeo`, otro sitio). Es una tercera
   medición independiente que sostiene la decisión de prestar la forma y estimar sólo el nivel.
   Resuelve la Open Question del Slice 4 sin caer en ninguna de sus dos opciones: ni tabla pública
   obsoleta, ni referencia de n=1 derivada de la plataforma.
2. **Cuarto estado, no tres.** `org_level_reference_shape` no estaba en la spec; salió de la
   evidencia. Sin él, «calibrado al nivel medido de este sitio» y «tabla prestada tal cual» se
   leerían igual en el contrato, que es la clase exacta de colapso que esta task existe para
   cerrar.

### Lo que NO está verificado en runtime (declarado, no omitido)

**Ninguna de las dos organizaciones reales ejercita hoy el camino `org_level_reference_shape`**:
Berel mide en el bucket objetivo (gana `org_measured`) y Efeonce no tiene muestra ni para un nivel
(2 clics en 28d). El camino está unit-tested y es correcto por construcción, pero **no observado en
producción**. Se verá cuando exista una org con tráfico agregado suficiente y un bucket objetivo
delgado — una forma común, sólo que hoy no presente.

### Open Questions — resueltas

- **¿La referencia del Slice 4 es pública o derivada de la plataforma?** Ninguna de las dos: se toma
  la curva **medida sobre filas no-marca** que la skill `seo-aeo` documenta con as-of (2026-08), y
  se declara `berel.com` como corroboración independiente. Evita a la vez la tabla pública obsoleta
  y la referencia de n=1.
- **¿`estimatedClickGain` debe ser `number | null`?** No en esta task (Out of Scope declarado). El
  argumento además se debilitó: hoy el número siempre existe, es un techo honesto y viaja con su
  procedencia, así que el `null` pasó de urgente a decisión de ergonomía del render — de `TASK-1691`.

### Coordinación ejecutada

- **`TASK-1700`** (`greenhouse-eo-56`): bloqueo **levantado** — Slices 1 y 2 en `develop`, su Slice 7
  puede cutover y el destino de su rollback ahora ordena. Acordado con ella que el predicado NO se
  importa cruzado (acoplaría el reader legacy a la config versionada del score: un bump de versión
  del score le cambiaría el comportamiento al reader sin que nadie lo pida) sino que se sostiene con
  el test de paridad. Suyo el matiz de comparar el **veredicto** y no las constantes.
- **`TASK-1691`**: `## Delta 2026-08-28 (3)` con el contrato tal como quedó — cuatro estados, no
  tres, más `targetPosition` y `expectedCtrAtTarget`, y la nota de que el ORDEN ya quedó corregido
  del lado servidor aunque la etiqueta siga siendo suya.
- **`TASK-1708`**: cita actualizada — el piso de curva salió del reader; `DEFAULT_TARGET_POSITION` y
  el percentil siguen siendo constantes de módulo y su crítica sigue en pie.

### Alcance, para que no se encoja al archivar

El defecto **no era de un cliente**. El disparador es *cualquier organización cuyo bucket en la
posición objetivo tenga ≥10 impresiones y 0 clics* — condición **garantizada** en todo target recién
onboardeado. Y Berel, con curva sana, igual tenía **1.445 de 1.798 filas (80%) empatadas en cero**:
su curva servía, su lente discriminaba sobre ~353 filas. "Le pasa a Efeonce" es leer una muestra de
dos como si fuera una tasa.
