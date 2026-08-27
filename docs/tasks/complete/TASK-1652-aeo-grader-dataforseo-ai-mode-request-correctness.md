# TASK-1652 — AEO Grader: corrección del request AI Mode DataForSEO (location ISO-2 + gate per-task + citas anidadas)

## Cierre 2026-08-27 — evidencia y decisiones

**Commits:** `bc2dd0f99` (Slice 1: mapa market→`location_code` + gate per-task), `63d01db49`
(Slice 2: descenso anidado + fixture shape real), `6b6c5d200` (Slice 2b: atribución bajo el wrapper
de Google + smoke live). Local-first, sin push.

**Open Questions resueltas en Discovery:**

- `location_code` verificados EN VIVO contra `GET /v3/serp/google/locations/{cc}`: CL=2152,
  MX=2484, CO=2170, PE=2604, US=2840 — los candidatos eran exactos.
- El proveedor SÍ duplica `references[]` en el nivel superior del item `ai_overview` (sandbox y
  live: top ⊇ anidadas) → el descenso quedó como defensa con dedupe por URL (`buildCitations`).

**Hallazgo nuevo del smoke live (Slice 2b, no estaba en la spec):** Google envuelve TODAS las
references de AI Mode en redirects propios (`domain: google.com`, `url: google.com/goto?url=<token
opaco>`); la identidad real de la fuente viene SOLO en `source` (a veces dominio, a veces marca).
Sin manejo, cada cita quedaba atribuida a `google.com` y el SoV de citabilidad quedaba envenenado.
Fix en el mismo adapter: dominio derivado de `source` cuando es domain-shaped; marca no atribuible
se descarta honesto y se cuenta en `usage.dataforseo_citations_unattributable` (dedupe por URL).
Verificado contra el payload live guardado: 2 citas con dominio real (`metrix.digital`,
`agenciagrowth.cl`), 25 no-atribuibles contadas. Herencia declarada en TASK-1311 (las `url`
persistidas de este provider son punteros al wrapper, no la página citada).

**Smoke live (Slice 3):** `scripts/growth/_sanity-task-1652-ai-mode-smoke.ts --spend --market=CL`
→ PASS: task `20000`, estado `succeeded`, answer real de agencias chilenas, citas con dominios
reales. Gasto total del smoke: ~USD 0,008 (2 llamadas AI Mode live).

**Dimensionamiento histórico (query read-only sobre `greenhouse_growth.provider_observations`):**

| status | error_code | `usage->>'dataforseo_status_code'` | n | rango |
|---|---|---|---|---|
| skipped | no_ai_overview_block | `40501` | 54 | 2026-06-29 → 2026-07-17 |
| skipped | no_ai_overview_block | `40201` | 6 | 2026-06-29 |
| succeeded | — | `20000` | 30 | 2026-06-28 → 2026-08-27 |

**60 observaciones históricas** eran falsos negativos (task fallido clasificado como "Google no
mostró bloque AI"), 54 por el error exacto de location ISO-2 (`40501`). **Decisión de regrade:
DESCARTADO.** Los tasks fallidos nunca se ejecutaron — no hay data que reinterpretar (un regrade no
resucita respuestas que no existieron), y río abajo `skipped` y `failed` se excluyen por igual
(`citation-breakdown` solo consume `succeeded`), así que los scores entregados no cambiarían. El
daño era diagnóstico y queda corregido hacia adelante.

**Rollout:** cambio activo al mergear bajo los flags existentes; AIO en producción sigue OFF
(gated por TASK-1341) — el fix llega inerte a producción hasta ese rollout, como declara la spec.
`pnpm build` de producción pendiente del pase de release coordinado (sesión `greenhouse-eo-c1`),
que corre su propio preflight; suite full `pnpm test` verde local.


<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `complete`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Bajo`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `integration`
- Epic: `EPIC-020`
- Status real: `Implementada y verificada live (2026-08-27)`
- Rank: `TBD`
- Domain: `growth|ai|integrations`
- Blocked by: `none`
- Branch: `develop (contrato del repositorio; sin worktrees)`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Corrige tres defectos del adapter `google_ai_overview` del AI Visibility Grader detectados en revisión con la skill `dataforseo-operator` (2026-08-06): **(1)** el adapter pasa `input.market` verbatim como `location_name` de DataForSEO, pero los runs productivos guardan el market como **ISO-2** (`CL`/`MX`/`CO`/`PE`/`US`) y DataForSEO exige nombre completo o `location_code` numérico — la tarea falla per-task y nadie lo ve; **(2)** el adapter **no valida el `status_code` per-task** (`20000` = ok) pese a que "HTTP 200 ≠ éxito" es regla dura del proveedor — un task fallido se clasifica como `skipped:no_ai_overview_block` en vez de `failed`, enmascarando (1); **(3)** el parser de citas solo desciende un nivel (`task.result[].items[]`) y según la doc las `references[]` de AI Mode viven **anidadas** dentro de los `ai_overview_element` del item `ai_overview` — las citas pueden estar quedando `[]` en silencio, subestimando el SoV de citabilidad.

## Why This Task Exists

Los tests y evals del adapter usan `market: 'Chile'` (nombre completo válido), pero `provision-profile.ts` y `aeo-form-grader-adapter.ts` — los dos caminos productivos — producen `market: 'CL'`. El resultado esperado en producción es que **cada run productivo reporta "Google no mostró bloque AI" cuando en realidad la tarea nunca se ejecutó**: un falso negativo disfrazado de degradación honesta, invisible en CI porque el fixture nunca ejercita el caso ISO-2. La causa habilitante es que el adapter guarda `dataforseo_status_code` solo como telemetría en `usage` y nunca ramifica por él, violando la regla del oficio DataForSEO ("cada task del batch trae su propio `status_code`; validar POR TASK"). El tercer defecto (citas anidadas) degrada el diferenciador comercial del grader (citabilidad por dominio) y contamina río abajo a TASK-1311, cuyo reader de atribución URL-level lee las citas ya persistidas asumiendo que la captura upstream es correcta.

## Goal

- Los runs del grader con market ISO-2 (`CL`, `MX`, `CO`, `PE`, `US`) generan tareas AI Mode válidas en DataForSEO (mapa market → `location_code`), con fallback explícito y observable para markets no mapeados.
- Un task DataForSEO con `status_code != 20000` produce observación `failed` (nunca `skipped:no_ai_overview_block`); solo un task `20000` sin bloque AI produce el skip honesto.
- Las citas (`references[]`) anidadas en los elementos internos del bloque `ai_overview` se recolectan; el parser queda verificado contra el shape real del proveedor (sandbox o respuesta live), no solo contra fixtures inventados.
- Evidencia de dimensionamiento del impacto histórico: query read-only sobre `provider_observations` que cuente observaciones `skipped:no_ai_overview_block` con `usage.dataforseo_status_code != 20000` (o ausente), para decidir si amerita regrade (follow-up, no scope).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_PUBLIC_AI_VISIBILITY_GRADER_ARCHITECTURE_V1.md` (§Delta 2026-06-24)
- `docs/architecture/GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md` (§1.1 boundary SEO↔AEO, §1.2 cliente canónico)
- `.claude/skills/dataforseo-operator/SKILL.md` + `references/01-serp.md` (oficio del proveedor; skill MANDATORIA al tocar DataForSEO)

Reglas obligatorias:

- **NUNCA** `fetch` directo a `api.dataforseo.com`: todo pasa por `postDataForSeoSerpLiveAdvanced` (contrato congelado — NO agregarle parámetros) / `postDataForSeoTask` de `src/lib/ai/dataforseo.ts`.
- HTTP 200 ≠ éxito: validar `status_code` POR TASK (`20000` ok). Es la regla que esta task cablea.
- Degradación honesta se preserva: `skipped:no_ai_overview_block` sigue existiendo, pero solo para tasks realmente ejecutadas sin bloque AI.
- AI Mode es English-only: `language_code: 'en'` no se toca.
- Errores vía `captureWithDomain(err, 'growth', ...)`, nunca Sentry directo.

## Normative Docs

- `.claude/skills/dataforseo-operator/references/01-serp.md` — §4.1 shape del item `ai_overview` (markdown + `items` anidados con `references[]`), §3.1 `location_name`/`location_code`, §6 apéndice locations (gratis: `GET /v3/serp/google/locations`).
- `docs/tasks/complete/TASK-1265-growth-ai-visibility-answer-engine-coverage-google-aio.md` — task que creó el adapter (contexto del contrato).

## Dependencies & Impact

### Depends on

- `src/lib/ai/dataforseo.ts` — transporte canónico (existe; no se modifica).
- Credenciales DataForSEO en el runtime donde corre el smoke (staging ops-worker ya las tiene ON per TASK-1265; ver TASK-1341).

### Blocks / Impacts

- **TASK-1311** (citation attribution URL-level): consume las citas persistidas; el fix (3) mejora su materia prima. Dejar `## Delta` en TASK-1311 al cerrar.
- **TASK-1341** (runtime config guard): complementaria, no solapada — aquella cubre `missing_secret` por deploy; esta cubre corrección del request/parseo. Sin dependencia dura.
- Reportes públicos del grader (`efeonce-think`): al corregirse (1)+(2), el provider `google_ai_overview` puede pasar de "sin bloque AI" a datos reales — cambio visible en reportes nuevos, sin tocar código de render.

### Files owned

- `src/lib/growth/ai-visibility/providers/google-ai-overview-adapter.ts`
- `src/lib/growth/ai-visibility/__tests__/google-ai-overview-adapter.test.ts`
- `docs/tasks/to-do/TASK-1652-aeo-grader-dataforseo-ai-mode-request-correctness.md`

## Current Repo State

### Already exists

- Adapter `google_ai_overview` con flags, breaker handling y degradación honesta (`src/lib/growth/ai-visibility/providers/google-ai-overview-adapter.ts`) — `locationFromMarket` en líneas ~150-154, `usageFromDataForSeo` lee `status_code` solo como telemetría (~161-169), `collectResultItems` desciende un solo nivel (~73-93).
- Markets productivos ISO-2: `src/lib/growth/ai-visibility/provision-profile.ts` (`MARKET_BY_COUNTRY`: `MX`/`CL`/`US`) y `src/lib/growth/ai-visibility/public-intake/aeo-form-grader-adapter.ts` (`AEO_MARKET_BY_COUNTRY`: `CL`/`CO`/`MX`/`PE`/`US`).
- Tests del adapter con fixtures `market: 'Chile'` y `references` en el nivel superior del item (`__tests__/google-ai-overview-adapter.test.ts`) — justo los shapes que no ejercitan los bugs.
- `buildCitations`/`boundedExcerpt`/`sha256Hex` en `observation.ts` (no se tocan).

### Gap

- Ningún mapa market ISO-2 → location DataForSEO; el market cae verbatim en `location_name`.
- Ninguna rama por `status_code` per-task; task fallido = skip silencioso.
- Ningún descenso recursivo a los `items` internos del bloque `ai_overview`; citas anidadas se pierden. **[verificar]** contra respuesta real/sandbox si el proveedor también duplica `references` en el nivel superior (si lo hace, el fix (3) es defensa, no bug activo).
- Ningún test con fixture ISO-2 ni con task-level error.

## Modular Placement Contract

- Topology impact: `none`
- Current home: `src/lib/growth/ai-visibility/providers/**` (server-only; consumido por Vercel API routes y ops-worker)
- Future candidate home: `domain-package`
- Boundary: interfaz `ProviderAdapter` (`providers/types.ts`); el fix es interno al adapter, sin cambio de contrato hacia el run-engine
- Server/browser split: `server-only` ya declarado en el adapter; sin exposición browser
- Build impact: `none`
- Extraction blocker: `none`

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-standard`
- Impacto principal: `integration`
- Source of truth afectado: adapter `google_ai_overview` (request a DataForSEO AI Mode + parseo de observaciones); las observaciones persisten en `greenhouse_growth.provider_observations` (append-only, sin cambio de schema)
- Consumidores afectados: run-engine del grader (3 endpoints public/client-portal/operator), ops-worker async, reportes Think, TASK-1311 (futuro reader de citas)
- Runtime target: `worker` (ops-worker staging para smoke) + `local`

### Contract surface

- Contrato existente a respetar: `postDataForSeoSerpLiveAdvanced` (congelado — no se le agregan parámetros; el mapa location vive en el adapter), interfaz `ProviderAdapter`, shape de `GrowthAiVisibilityProviderObservation`
- Contrato nuevo o modificado: ninguno público; cambio interno de request-building + clasificación + parseo
- Backward compatibility: `compatible` (mismo shape de observación; cambia la correctitud de la clasificación)
- Full API parity: sin cambio — el adapter ya es primitive server-side consumido por los 3 endpoints por construcción

### Data model and invariants

- Entidades/tablas/views afectadas: ninguna (sin migración; `provider_observations` recibe los mismos shapes)
- Invariantes que no se pueden romper:
  - `skipped:no_ai_overview_block` NUNCA para un task con `status_code != 20000` (nueva invariante que esta task instala)
  - Nunca `succeeded` con texto vacío (se preserva)
  - Observaciones append-only; no se reescriben runs históricos en esta task
- Tenant/space boundary: sin cambio (el adapter no deriva tenancy; la deriva el run-engine)
- Idempotency/concurrency: sin cambio (live request por prompt, sin retry nuevo)
- Audit/outbox/history: sin cambio; `usage.dataforseo_status_code` se conserva como telemetría (y pasa a ser además input de clasificación)

### Migration, backfill and rollout

- Migration posture: `none`
- Default state: cambio activo al mergear, gated por los flags existentes `GROWTH_AI_VISIBILITY_GRADER_ENABLED` + `GROWTH_AI_VISIBILITY_GOOGLE_AIO_ENABLED` (prod hoy OFF para AIO per TASK-1265/1341)
- Backfill plan: fuera de scope; la query de dimensionamiento (Goal 4) informa un follow-up de regrade si amerita
- Rollback path: revert PR + redeploy (aditivo, sin schema)
- External coordination: ninguna (credenciales ya gestionadas por TASK-1265/1341)

### Security and access

- Auth/access gate: sin cambio (flags + secret resolution existentes)
- Sensitive data posture: sin datos sensibles nuevos; no loggear credenciales (ya cubierto por el transporte)
- Error contract: `mapHttpStatusToErrorCode`/`mapThrownErrorToErrorCode` existentes + rama nueva para task-level error → `provider_error` (o código nuevo si Discovery lo justifica); `captureWithDomain` para lo inesperado
- Abuse/rate-limit posture: sin cambio (breaker por familia existente)

### Runtime evidence

- Local checks: suite focal `pnpm vitest run src/lib/growth/ai-visibility` con fixtures nuevos (ISO-2, task-error, references anidadas)
- DB/runtime checks: query read-only sobre `provider_observations` (staging) contando `skipped:no_ai_overview_block` con `usage->>'dataforseo_status_code'` distinto de `20000` o ausente
- Integration checks: 1 llamada real low-volume AI Mode (staging ops-worker o local con creds) con `location_code` de Chile → observación `succeeded` (o skip honesto si Google no muestra bloque) con `dataforseo_status_code = 20000`; capturar el JSON crudo como fixture del shape real de `references[]`
- Reliability signals/logs: sin signal nueva; logs del ops-worker + Sentry `growth`
- Production verification sequence: N/A en esta task — AIO en producción sigue gated (TASK-1341); la evidencia es staging + local

### Acceptance criteria additions

- [x] Source of truth, contract surface and consumers are named with real paths or objects.
- [x] Data invariants, tenant/access boundary and idempotency/concurrency posture are explicit.
- [x] Migration/backfill/rollback posture is explicit and proportional to risk.
- [x] Runtime or DB evidence is listed for any change beyond docs/tooling.
- [x] Sensitive domains have canonical errors, audit/signal posture and no raw data leaks.

## Capability Definition of Done — Full API Parity gate

N/A — no capability: fix interno de correctitud de un provider adapter existente; no introduce ni modifica capability, endpoint, ni contrato consumible nuevo.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Mapa market → location + gate per-task `status_code`

- Mapa cerrado `market ISO-2 → location_code` DataForSEO para los markets productivos (`CL`, `MX`, `CO`, `PE`, `US`), verificado contra el apéndice gratuito `GET /v3/serp/google/locations` **[verificar códigos exactos en Discovery — candidatos: CL=2152, US=2840, MX=2484, CO=2170, PE=2604]**; el request usa `location_code` (robusto) en vez de `location_name`. Market no mapeado → fallback explícito documentado (US como hoy) + `captureWithDomain` informativo, nunca pasar el código crudo.
- Rama de clasificación per-task: task con `status_code != 20000` → `failed` (código de error honesto; `provider_error` o el que Discovery justifique, extendiendo el enum del builder si aplica), registrando el `status_code` en `usage`. Solo task `20000` sin bloque AI → `skipped:no_ai_overview_block`.
- Tests: fixture con `market: 'CL'` (asserting `location_code` correcto en el task enviado), fixture con task-level error (`status_code: 40501`, `result: null`) asserting `failed`, y los tests existentes verdes sin regresión.

### Slice 2 — Citas anidadas + fixture del shape real

- `collectResultItems`/parseo desciende a los `items` internos del bloque `ai_overview` (elementos `ai_overview_element`, `ai_overview_table_element`, `ai_overview_expanded_element`) recolectando sus `references[]`/`links[]`, con dedupe vía `buildCitations` (ya dedupea) y sin doble conteo si el proveedor duplica referencias en el nivel superior.
- 1 llamada real o sandbox a AI Mode para capturar el JSON crudo del bloque `ai_overview` y convertirlo en fixture del test ("parser lock" contra shape real, no inventado).
- Tests: fixture anidado real asserting que las citas de elementos internos aparecen en `observation.citations`.

### Slice 3 — Evidencia runtime + dimensionamiento histórico

- Smoke low-volume en staging (ops-worker con flag ON) o local con creds: run del grader con perfil market `CL` → observación `google_ai_overview` con `dataforseo_status_code = 20000` y estado `succeeded` o skip honesto real.
- Query read-only en staging PG sobre `provider_observations` dimensionando cuántas observaciones históricas `skipped:no_ai_overview_block` tienen `status_code` ausente o != 20000; resultado documentado en la task para decidir el follow-up de regrade.

## Out of Scope

- Regrade/backfill de runs históricos afectados (follow-up separado si el dimensionamiento lo justifica; el módulo `regrade/` existe).
- Cualquier cambio al transporte `src/lib/ai/dataforseo.ts`, familias, breaker o spend guard.
- Monitoreo de AI Overview en organic (`load_async_ai_overview`) — vive en rank-capture (TASK-1303, módulo SEO).
- `labs ranked_keywords` con `ai_overview_reference` (presencia AEO longitudinal) — candidato a task futura EPIC-022.
- Prender AIO en producción (TASK-1341) y rotación del password DataForSEO (follow-up TASK-1265).
- UI/reportes/scoring del grader.

## Detailed Spec

Los tres defectos, con evidencia de código (revisión 2026-08-06 con skill `dataforseo-operator`):

1. **`location_name` ISO-2 inválido.** `locationFromMarket` (`google-ai-overview-adapter.ts:150-154`) pasa `input.market` trim-eado como `location_name`. DataForSEO exige nombre completo (`"Chile"`) o `location_code` numérico; `"CL"` produce error per-task (~`40501`) con `result: null` bajo HTTP 200 batch. Caminos productivos que generan ISO-2: `provision-profile.ts:8-11` y `public-intake/aeo-form-grader-adapter.ts:46-57`. Fix: mapa cerrado → `location_code` + fallback observado.
2. **Sin gate per-task.** `usageFromDataForSeo` (`:161-169`) lee `status_code` del primer task solo para telemetría. Regla del proveedor: cada task trae su propio `status_code`; `20000` = ok. Fix: ramificar la clasificación por ese código antes de intentar parsear.
3. **Citas anidadas.** `collectResultItems` (`:73-93`) solo recorre `task.result[].items[]`. Doc AI Mode (§4.1 de `references/01-serp.md`): el item `ai_overview` trae `markdown` + `items` anidados (`ai_overview_element` con `references[]`: source/domain/url/title/text). El filtro del parser ya acepta `ai_overview_element` como tipo pero esos items nunca llegan porque no hay descenso. Fix: descender un nivel adicional dentro de los items `ai_overview` (no recursión ilimitada) recolectando texto/citas de los elementos; el texto principal sigue prefiriendo el `markdown` del bloque padre para no duplicar contenido en el hash.

Orden interno: el gate (2) primero que el mapa (1) en el código (la clasificación protege cualquier error futuro de request), pero ambos van en el mismo slice/PR porque (1) sin (2) seguiría fallando en silencio ante el próximo drift.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 (request + gate) → Slice 2 (parser + fixture real) → Slice 3 (evidencia runtime + dimensionamiento).
- Slice 3 NUNCA antes que 1: el smoke con market `CL` sin el mapa reproduciría el bug, no lo verificaría.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| `location_code` incorrecto en el mapa (código de otra región) | grader / DataForSEO | low | Verificar contra apéndice gratuito `/v3/serp/google/locations` en Discovery + smoke real Slice 3 | Observaciones `failed` o resultados geo-incoherentes en el smoke |
| Task-error legítimo transitorio (`40602` en cola) clasificado `failed` en live | grader | low | AI Mode live no encola en condiciones normales; si Discovery encuentra códigos transitorios, mapearlos explícitos | `failed` rate del provider en staging |
| Doble conteo de citas si el proveedor duplica references arriba y anidado | grader / SoV | medium | Dedupe existente de `buildCitations` + fixture del shape real (Slice 2) | Test del fixture real |
| Cambio de clasificación aumenta `failed` visibles en reportes staging | reportes Think | low | Es el comportamiento honesto deseado; comunicar en Handoff | N/A — esperado |

### Feature flags / cutover

Sin flag nueva — corrección de correctitud bajo los flags existentes `GROWTH_AI_VISIBILITY_GRADER_ENABLED` + `GROWTH_AI_VISIBILITY_GOOGLE_AIO_ENABLED` (AIO prod OFF hoy; el fix llega a producción inerte hasta que TASK-1341 habilite).

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | revert PR + redeploy | <15 min | sí |
| Slice 2 | revert PR + redeploy | <15 min | sí |
| Slice 3 | N/A (evidencia, no código) | — | — |

### Production verification sequence

N/A en esta task — AIO en producción permanece OFF (gated por TASK-1341). Evidencia canónica: staging ops-worker + tests + query PG staging. Al prenderse producción (TASK-1341), su smoke hereda estos fixes.

### Out-of-band coordination required

N/A — repo-only change (credenciales y deploy guard son de TASK-1341).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [x] Un run con `market: 'CL'` envía a DataForSEO un task con `location_code` numérico válido de Chile (test con assert del payload; código verificado contra el apéndice locations).
- [x] Market no mapeado cae al fallback documentado con `captureWithDomain` informativo (test).
- [x] Un task DataForSEO con `status_code != 20000` produce observación `failed` con el `status_code` en `usage`; NUNCA `skipped:no_ai_overview_block` (test con fixture `40501`).
- [x] Un task `20000` sin bloque AI sigue produciendo `skipped:no_ai_overview_block` (regresión cubierta).
- [x] Las `references[]` anidadas en elementos internos del bloque `ai_overview` aparecen en `observation.citations`, sin duplicados (test con fixture derivado de una respuesta real/sandbox).
- [x] Smoke staging/local: observación real con `dataforseo_status_code = 20000` y estado `succeeded` o skip honesto, con market ISO-2.
- [x] Query de dimensionamiento histórico ejecutada en staging y resultado documentado en esta task (Delta o sección de cierre).
- [x] `## Delta` agregado en TASK-1311 notificando la corrección upstream del parser de citas.

## Verification

- `pnpm lint`
- `pnpm typecheck`
- `pnpm vitest run src/lib/growth/ai-visibility`
- `pnpm test` (full) + `pnpm build` como gate de cierre (Task Closing Quality Gate)
- Smoke runtime per Slice 3

## Closing Protocol

- [x] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [x] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [x] `docs/tasks/README.md` quedo sincronizado con el cierre
- [x] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [x] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [x] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas (mínimo: TASK-1311, TASK-1341)
- [x] Decisión de regrade histórico registrada (hacer follow-up task o descartar con el dato del dimensionamiento)

## Follow-ups

- Posible task de regrade/backfill de runs históricos mal clasificados, si el dimensionamiento (Slice 3) muestra volumen material — usar el módulo `regrade/` existente.
- Candidata EPIC-022: presencia AEO longitudinal vía `labs ranked_keywords` con `item_types: ai_overview_reference` (en qué keywords el dominio es citado por AI Overviews).
- Atribución de gasto `serp` del grader (`organizationId` en el adapter) — limitación conocida TASK-1243, no scope acá.

## Open Questions

- ¿Los `location_code` candidatos (CL=2152, US=2840, MX=2484, CO=2170, PE=2604) son los vigentes en el apéndice DataForSEO? Verificar en Discovery con el endpoint gratuito antes de fijar el mapa.
- ¿El proveedor duplica `references[]` en el nivel superior del item `ai_overview` además de los elementos anidados? La respuesta real (Slice 2) decide si el fix (3) corrige un bug activo o instala defensa; en ambos casos el descenso queda.
