# TASK-1697 — Growth: sustrato de sitio compartido, barrel de dominio AEO y detector de imports cross-dominio

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P0`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `none`
- Epic: `EPIC-022`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `growth`
- Blocked by: `none`
- Branch: `Greenhouse develop; local-first, sin worktrees`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

`growth/seo` importa hoy de las **tripas** de `growth/ai-visibility` contra una regla que la propia
arquitectura del módulo declara, y nada lo vigila. Esta task cierra **dos acoplamientos distintos con
un solo detector**: (1) el **sustrato** —fetcher con guarda SSRF + parseo HTML— se muda a
`growth/site-substrate/` con re-export shim, así que ningún dependiente cambia una línea; (2) los
símbolos que `growth/seo` consume del dominio AEO pasan a salir por su **barrel público**. La regla
la fija una lint rule nueva en modo `error` desde el primer commit y con cero violaciones.

## Why This Task Exists

Es el §1.3 de la auditoría
`docs/audits/platform/2026-08-15-growth-seo-aeo-module-opportunity-audit.md`, y son dos problemas
que comparten un único detector.

**Problema 1 — deep imports cross-dominio contra una regla declarada, sin detector.**
`GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md` §17.3 dice, textual: *"NUNCA importar desde
`src/lib/growth/seo/**` módulos de otros dominios de Greenhouse, salvo primitives transversales
canónicas (postgres client, entitlements runtime, copy, observabilidad)"*, y `ai-visibility` no es
una primitive transversal. Verificado en el repo, `growth/seo` importa **14 símbolos** desde **6
rutas internas** de `ai-visibility`, sin pasar por ninguna superficie pública:

| Archivo | Línea | Ruta interna |
|---|---|---|
| `grounded-query-bridge.ts` | :23 | `ai-visibility/brand-intelligence/store` (`getActiveBrandIntelligence`) |
| `grounded-query-bridge.ts` | :24 | `ai-visibility/flags` (`isGraderEnabled`, `isPromptAuthoringEnabled`) |
| `grounded-query-bridge.ts` | :28 | `ai-visibility/prompt-packs/prompt-set-command` (`authorGraderPromptSetDraft`, `readGraderPromptSets`) |
| `grounded-query-bridge.ts` | :34 | `ai-visibility/prompt-packs/authoring/author-system-prompt` (`AUTHOR_SEO_GROUNDED_SYSTEM_PROMPT_VERSION`, `computeSeoSeedCoverage`, `SeoGroundedKeywordContext`, `SeoSeedCoverage`) |
| `grounded-query-bridge.ts` | :35 | `ai-visibility/prompt-packs/prompt-set-store` (`GraderPromptSetRow`) |
| `grounded-query-bridge.ts` | :36 | `ai-visibility/prompt-packs/authoring/author-prompt-set` (`AuthorPromptSetStatus`) |
| `grounded-query-bridge.ts` | :37 | `ai-visibility/store` (`getGraderProfile`) |
| `grounded-query-reader.ts` | :15-19 | `flags`, `prompt-packs/authoring/author-system-prompt`, `prompt-packs/prompt-set-command`, `prompt-packs/prompt-set-store`, `store` |

Cero imports en reversa: el DAG es **direccionalmente limpio**, lo que falta es que la dirección
correcta entre por la puerta y no por la ventana. La única lint rule cross-domain del repo
(`eslint.config.mjs:333`, `greenhouse/no-cross-domain-import-from-client-portal`) protege al
client-portal; nada vigila `growth/*`.

**Consecuencia de planificación, no estética.** La premisa de `TASK-1670` —*"`growth/seo` consume
EXCLUSIVAMENTE la superficie pública, nada de deep import"*— describe una aspiración, no el repo. Y
su risk matrix pone "revisión de código" como mitigación, que es exactamente lo que el patrón
canónico #7 prohíbe: **un deep import lo crea un commit, así que el detector es de CI.** Sin
detector, la superficie pública que 1670 declare se erosiona en el siguiente PR y nadie se entera.

**Problema 2 — el sustrato tiene tres consumidores y ningún dueño.** Lo que `growth/seo` y el propio
grader comparten no es "el probe layer": es un primitive mucho más chico —fetcher con guarda SSRF +
parseo HTML/texto—, que la auditoría §5.1 nombra `site-substrate` y para el que fija la regla de
corte: **se comparte cómo se OBTIENE la evidencia; nunca cómo se JUZGA**. Los dos archivos ya son
puros río arriba del juicio: `probes/safe-fetch.ts` es `server-only` sobre HTTP y no menciona
`grader_*`; `probes/html.ts` no importa nada. El tercer consumidor ya existe **dentro** del propio
grader: `brand-intelligence/fetch-site-content.ts:15` importa `createProbeFetcher` desde
`../probes/safe-fetch` y su docstring dice *"el probe es TÉCNICO y no extrae prosa — this is the
missing piece"*. Tres consumidores es el umbral canónico de primitive.

El costo de no hacerlo es asimétrico: divergencia silenciosa de una guarda SSRF es **alta y no
observable** (§5.1, tabla de veredictos). El costo de hacerlo es una tarde: dos archivos puros más
tres tipos, con re-export shim.

**Por qué el follow-up de 1670 no iba a pasar nunca.** 1670 dejó la extracción como
"mover a `search-visibility/`" — ~70 archivos por estética, que es un proyecto y no una tarde. El
disparo legítimo del movimiento es el tercer consumidor, y ya existe.

## Goal

- Existe `src/lib/growth/site-substrate/` con el fetcher SSRF-guarded y el parseo HTML/texto, con
  nombres que dicen lo que son (`SiteFetcher`, `createSiteFetcher`, `analyzeDomSemantics`), y **cero
  archivos dependientes modificados** gracias a los re-export shim.
- La **carta del sustrato es verificable por lint**, no por buena voluntad: no importa nada de
  `growth/*` y no persiste nada (cero Postgres, cero outbox, cero flags de dominio) — mismo contrato
  que `artifact-composer` ya tiene.
- Los 14 símbolos que `growth/seo` consume de `ai-visibility` salen por el barrel de dominio
  (`ai-visibility/index.ts`), y `grounded-query-bridge.ts` / `grounded-query-reader.ts` importan una
  sola ruta pública cada uno.
- `greenhouse/no-cross-domain-import-in-growth` vive en `error` **desde el primer commit** y con
  **cero violaciones** en el repo.
- §17.3 de la arquitectura SEO y `.claude/rules/growth-seo.md` dejan de describir una aspiración y
  pasan a describir un invariante con detector.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md` (§1.1 boundary SEO↔AEO, §17.3 reglas
  de extracción — es la regla que esta task pasa a hacer verificable)
- `docs/architecture/GREENHOUSE_PUBLIC_AI_VISIBILITY_GRADER_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_CANONICAL_PATTERNS_V1.md` (patrón #7: el detector es de CI, no de
  revisión de código)
- `docs/architecture/GREENHOUSE_CLIENT_PORTAL_DOMAIN_V1.md` §3.2 (spec de la única lint rule
  cross-domain existente, cuyo molde se reusa)
- `docs/operations/MODULAR_MIGRATION_NEW_WORK_OPERATING_MODEL_V1.md`
- `.claude/rules/growth-seo.md` (invariantes auto-load del dominio)

Reglas obligatorias:

- **Se comparte cómo se OBTIENE la evidencia; nunca cómo se JUZGA.** El sustrato es fetch + parse.
  El scoring versionado, la autoría de prompts y los review gates **no se mueven** — §5.1 de la
  auditoría los marca `duplicar deliberadamente` / `no mover` / `no compartir`, y el costo de
  equivocarse en el primero es **máximo**: un `score_version` compartido haría que recalibrar SEO
  invalide reportes AEO ya entregados a clientes. Es una puerta de una sola dirección.
- **El sustrato NO importa nada de `growth/*` y NO persiste nada.** Cero Postgres, cero outbox, cero
  flags de dominio. Verificable por lint + test de frontera; si lo necesita, no es del sustrato.
- **NUNCA se toca la lógica de la guarda SSRF.** Esta task **mueve** `safe-fetch.ts`, no lo mejora:
  los hosts no públicos, el timeout, el tope de bytes, el User-Agent de cortesía y el
  `redirect: 'follow'` acotado al mismo host registrable quedan byte por byte. Cualquier mejora es
  otra task, con su propio diff legible.
- **NUNCA se cruza el bloqueo cross-host de `resolveProbeUrl`** (`safe-fetch.ts:58-79`). Fetchear el
  sitio de un competidor es una decisión legal y reputacional, no de implementación (§4 de la
  auditoría).
- **La lint rule nace en `error`, nunca en `warn`.** Una rule de frontera en `warn` es una rule que
  no existe: el molde `no-cross-domain-import-from-client-portal` documenta explícitamente por qué
  arranca en `error` desde commit-1 (cero violaciones legítimas verificadas al momento del commit).
- **NUNCA se crea `search-visibility/`.** La reorganización de ~70 archivos está en §6 de la
  auditoría, "lo que no se debe construir todavía".

## Normative Docs

- `docs/audits/platform/2026-08-15-growth-seo-aeo-module-opportunity-audit.md` (§1.3 defecto fuente,
  §5.1 veredicto de qué se comparte y qué no, §5.4 las dos correcciones a `TASK-1670`, §5.5
  red-team del sustrato por acreción) — **fuente de contenido de esta task**
- `docs/tasks/to-do/TASK-1670-growth-site-probes-kernel-seo-audit.md` — la task cuyo follow-up esta
  task ejecuta y cuya premisa corrige
- `eslint-plugins/greenhouse/rules/no-cross-domain-import-from-client-portal.mjs` — molde exacto de
  la rule nueva
- `src/lib/artifact-composer/__tests__/package-boundary.test.ts` — molde exacto del gate de pureza
  por allowlist

## Dependencies & Impact

### Depends on

- `src/lib/growth/ai-visibility/probes/safe-fetch.ts` (fetcher SSRF-guarded, `server-only`)
- `src/lib/growth/ai-visibility/probes/html.ts` (parseo tolerante; sin imports)
- `src/lib/growth/ai-visibility/probes/contracts.ts:99-124` (`ProbeFetchResult`, `ProbeFetchInit`,
  `ProbeFetcher` — los 3 tipos del fetcher)
- `src/lib/growth/ai-visibility/index.ts` (barrel del dominio, ya existente desde TASK-1226)
- `eslint.config.mjs` + `eslint-plugins/greenhouse/` (registro de rules)

### Blocks / Impacts

- **`TASK-1670`** (`to-do`): esta task le entrega el sustrato con nombre propio y el barrel, y
  corrige su premisa de "cero deep imports" y el nombre de la superficie (§5.4 de la auditoría). Es
  la relación más fuerte del lote: **si 1670 shippea primero declarando `probes/public.ts`, esta
  task tiene que renombrar una superficie recién nacida.** Ver `### Slice ordering hard rule`.
- **Análisis de contenido por URL** (aún sin task): es el tercer consumidor externo del sustrato y
  el disparo legítimo del movimiento (§5.3 de la auditoría). Nace apuntando a
  `growth/site-substrate/`, no a `probes/`.
- **`TASK-1695`** (`to-do`, autoría grounded): toca `author-system-prompt.ts`, uno de los módulos
  cuyos símbolos pasan a exportarse por el barrel. Conflicto de merge probable, no de diseño.
- **`TASK-1666`** (cerrada): dueña original de `grounded-query-bridge.ts` /
  `grounded-query-reader.ts`, los dos archivos cuyos imports se reescriben.
- Cualquier task futura de `growth/*` hereda el detector: un deep import cross-dominio pasa a romper
  el build.

### Files owned

- `src/lib/growth/site-substrate/` (nuevo: `index.ts`, `site-fetch.ts`, `html.ts`, `contracts.ts`)
- `src/lib/growth/ai-visibility/probes/safe-fetch.ts` (pasa a re-export shim)
- `src/lib/growth/ai-visibility/probes/html.ts` (pasa a re-export shim)
- `src/lib/growth/ai-visibility/probes/contracts.ts` (re-exporta los 3 tipos del sustrato)
- `src/lib/growth/ai-visibility/index.ts` (barrel: agrega los símbolos que SEO consume)
- `src/lib/growth/seo/grounded-query-bridge.ts` · `src/lib/growth/seo/grounded-query-reader.ts`
- `eslint-plugins/greenhouse/rules/no-cross-domain-import-in-growth.mjs` (nuevo) + su test
- `eslint-plugins/greenhouse/index.mjs` [verificar nombre del archivo de registro del plugin]
- `eslint.config.mjs`
- `src/lib/growth/site-substrate/__tests__/package-boundary.test.ts` (nuevo)
- `docs/architecture/GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md` (§17.3)
- `docs/architecture/GREENHOUSE_PUBLIC_AI_VISIBILITY_GRADER_ARCHITECTURE_V1.md`
- `.claude/rules/growth-seo.md`

## Current Repo State

### Already exists

- **El sustrato, puro y probado.** `probes/safe-fetch.ts` (`import 'server-only'`, hosts no públicos,
  timeout 8s/20s máx, tope 1 MiB, User-Agent de cortesía, redirect acotado al mismo host
  registrable) y `probes/html.ts` (parseo tolerante de JSON-LD, `potentialAction`, landmarks DOM; sin
  una sola línea de `import`). Cobertura en
  `src/lib/growth/ai-visibility/__tests__/probes-substrate.test.ts`.
- **Los 3 tipos del fetcher** ya están separados en `probes/contracts.ts:99-124`
  (`ProbeFetchResult`, `ProbeFetchInit`, `ProbeFetcher`), distinguidos explícitamente del fetcher de
  entidad (`:149`).
- **Barrel de dominio AEO vivo** desde TASK-1226: `src/lib/growth/ai-visibility/index.ts` re-exporta
  `contracts`, `lifecycle`, `observation`, `policy`, `cost`, `fix-it`, `prompt-pack`, `providers`,
  `assign-tier`, `provision-profile`. Su docstring ya lo declara *"punto de entrada canónico del
  primitive server-side (Full API parity)"*. **No re-exporta** `flags`, `store`,
  `brand-intelligence/store` ni `prompt-packs/*` — que es justo lo que SEO consume por deep import.
- **El tercer consumidor.** `brand-intelligence/fetch-site-content.ts:15` importa
  `createProbeFetcher, resolveSubjectSite` desde `../probes/safe-fetch`.
- **Molde de lint rule cross-domain**, con override block, `ImportDeclaration` + `ImportExpression` +
  `require`, y `HELPER_HINT` que explica al desarrollador las tres salidas legítimas
  (`eslint-plugins/greenhouse/rules/no-cross-domain-import-from-client-portal.mjs`).
- **Molde de gate de pureza por allowlist**, mecánico y no de reviewer
  (`src/lib/artifact-composer/__tests__/package-boundary.test.ts`): lista los `.ts` del paquete,
  extrae specifiers con 4 patrones (import/export-from, side-effect import, dynamic import, require)
  y rompe si algo cae fuera del allowlist.
- **Dependientes del sustrato, medidos 2026-08-15** (`grep` sobre `safe-fetch`/`html`/los 3 tipos):
  **13 archivos** — 7 de producción (`brand-intelligence/fetch-site-content.ts`,
  `brand-intelligence/index.ts`, `probes/agentic/dom-semantics.ts`,
  `probes/agentic/structured-actions.ts`, `probes/command.ts`, `probes/contracts.ts`,
  `probes/structural/json-ld.ts`), 4 tests y los 2 módulos que se mueven. `TASK-1670` cita 23 sobre
  el probe layer completo; ambas cifras son ciertas y miden cosas distintas.

### Gap

- **No existe `growth/site-substrate/`.** El sustrato vive dentro de `ai-visibility/probes/`, así que
  cualquier consumidor externo tiene que hacer deep import a un dominio ajeno para usarlo.
- **El barrel de AEO no exporta lo que SEO consume**, así que la puerta pública existe y no sirve
  para el caso real.
- **Ninguna lint rule vigila `growth/*`.** `eslint.config.mjs:333` sólo tiene la de client-portal.
- **`growth/site-substrate` no tiene carta**: nada impide que mañana alguien le agregue una query a
  Postgres o un flag de dominio y lo convierta en un tercer dominio por acreción (§5.5 de la
  auditoría, segundo modo de falla).
- **Los nombres mienten sobre el alcance**: `ProbeFetcher` / `createProbeFetcher` dicen "probe", que
  es una pieza del grader; lo que SEO consume es "el sustrato de sitio".

## Modular Placement Contract

- Topology impact: `domain-package`
- Current home: `src/lib/growth/site-substrate/` (nuevo) dentro del monolito Next.js de
  greenhouse-eo, con consumers en `growth/ai-visibility` y —a futuro— `growth/seo` y el análisis de
  contenido por URL.
- Future candidate home: `domain-package`
- Boundary: el sustrato exporta **sólo** su barrel `src/lib/growth/site-substrate/index.ts`
  (`createSiteFetcher`, `resolveSubjectSite`, los 3 tipos del fetcher, y los helpers de parseo HTML).
  Consumers autorizados: cualquier módulo bajo `src/lib/growth/**`. En sentido inverso el sustrato no
  tiene consumers autorizados: **no importa nada de `growth/*`**. Para el dominio AEO, el contrato
  público es `src/lib/growth/ai-visibility/index.ts`; `growth/seo` sólo puede entrar por ahí.
- Server/browser split: `site-fetch.ts` lleva `import 'server-only'` (hace HTTP saliente con guarda
  SSRF); `html.ts` y `contracts.ts` son puros y no lo necesitan. Nada del sustrato cruza al browser.
- Build impact: none — sin dependencia nueva, sin input de filesystem, sin entrypoint global. El
  movimiento es de archivos ya existentes.
- Extraction blocker: none. El sustrato nace con la forma de paquete (allowlist de imports
  verificada por test), lo que **quita** un bloqueo de extracción en vez de agregar uno. Se conserva
  la única dependencia transversal permitida, `@/lib/observability/capture`, declarada en el
  allowlist.

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-lite`
- Impacto principal: `reader` (superficie de módulos; **no** hay `Backend impact` de runtime —
  `Backend impact: none` porque no cambia API, DB, command, sync, cron, webhook ni integración)
- Source of truth afectado: ninguno. Esta task no toca datos, schemas ni contratos de persistencia.
  Lo que cambia es **la superficie de import** entre módulos del mismo runtime.
- Consumidores afectados: los 7 archivos de producción que hoy importan el sustrato (todos dentro de
  `ai-visibility`, y ninguno cambia gracias al shim) + `grounded-query-bridge.ts` y
  `grounded-query-reader.ts` en `growth/seo` (esos sí reescriben sus imports).
- Runtime target: `local` + `production` + `worker` — el mismo código se ejecuta en Vercel y en el
  ops-worker, y el gate del worker (`pnpm worker:runtime-deps-gate`) debe seguir verde.

### Contract surface

- Contrato existente a respetar: `ProbeFetcher` / `ProbeFetchInit` / `ProbeFetchResult` en
  `probes/contracts.ts:99-124` · `createProbeFetcher(baseUrl, ...)` y `resolveSubjectSite` en
  `probes/safe-fetch.ts:81-88` · los helpers de `probes/html.ts` · el barrel
  `ai-visibility/index.ts`.
- Contrato nuevo o modificado:
  - `src/lib/growth/site-substrate/index.ts` — barrel del sustrato, con los nombres canónicos
    (`SiteFetcher`, `SiteFetchInit`, `SiteFetchResult`, `createSiteFetcher`, `resolveSubjectSite`,
    `analyzeDomSemantics`, `extractJsonLdBlocks`, `htmlToReadableText`).
  - `probes/safe-fetch.ts`, `probes/html.ts` y `probes/contracts.ts` conservan sus exports actuales
    como **alias re-exportados** del sustrato.
  - `ai-visibility/index.ts` agrega los re-exports que `growth/seo` necesita.
- Backward compatibility: `compatible`. Ningún export desaparece; los nombres viejos siguen
  resolviendo por alias. Es la condición que hace que los 7 dependientes de producción no cambien
  una línea.
- Full API parity: N/A — no capability. Esta task no introduce ni modifica una acción de negocio; es
  un refactor de fronteras con detector. Se declara explícito para no forzar un gate que no aplica.

### Data model and invariants

- Entidades/tablas/views afectadas: **ninguna**. Cero migraciones, cero DDL, cero DML.
- Invariantes que no se pueden romper:
  - **El sustrato no persiste.** Cero `@/lib/postgres/*`, cero `@/lib/db`, cero outbox, cero flags de
    dominio. Verificado por allowlist en el test de frontera.
  - **El sustrato no importa `growth/*`.** Verificado por la lint rule y por el mismo test.
  - **La guarda SSRF conserva su comportamiento exacto.** El diff del movimiento debe ser puro
    renombre + reubicación; cualquier cambio de umbral, host o header es una violación del contrato
    de esta task.
  - **El scoring versionado no se mueve, no se comparte y no se fusiona.** Ni `score_version`, ni la
    config de scoring, ni los review gates, ni la autoría de prompts (esa se queda en AEO y SEO la
    consume vía command, con su sanitizer no-leading intacto).
  - **El barrel exporta, no envuelve.** `ai-visibility/index.ts` re-exporta símbolos; no introduce
    una capa de adaptación con lógica propia, que sería un tercer lugar donde el comportamiento puede
    divergir.
- Tenant/space boundary: sin cambio. El sustrato no conoce organizaciones; recibe una URL y devuelve
  bytes/estructura.
- Idempotency/concurrency: sin cambio. El fetcher es read-only sobre superficies públicas y no muta
  nada.
- Audit/outbox/history: `none with rationale` — no hay hecho de negocio que registrar. El sustrato ya
  observa sus fallos con `captureWithDomain` y esa es la única dependencia transversal que conserva.

### Migration, backfill and rollout

- Migration posture: `none`
- Default state: `enabled with rationale` — el cambio es un refactor con shim de compatibilidad y
  cero cambio de comportamiento. Ponerlo detrás de un flag exigiría duplicar el sustrato durante la
  ventana, que es exactamente la divergencia silenciosa que la task existe para prevenir.
- Backfill plan: N/A — sin datos.
- Rollback path: `revert PR`. El movimiento es atómico por slice y cada slice compila solo.
- External coordination: N/A — repo-only change. Sin env vars, sin secrets, sin redeploy especial.

### Security and access

- Auth/access gate: sin cambio. El sustrato no autentica ni es alcanzable por HTTP; es una librería
  server-side.
- Sensitive data posture: `no sensitive data`. El sustrato lee HTML público. La guarda SSRF es
  precisamente el control de seguridad que **no se toca**, y por eso su movimiento debe ser diff
  puro: un cambio escondido en un refactor grande es la peor forma de tocar una guarda SSRF.
- Error contract: sin cambio. El fetcher **nunca lanza**: refleja el fallo en `ok=false` +
  `errorCode` y el consumer lo traduce a degradación honesta. Ese contrato viaja con el movimiento.
- Abuse/rate-limit posture: sin cambio — timeout por request, tope de bytes y User-Agent
  identificable ya existen y se conservan.

### Runtime evidence

- Local checks: `pnpm vitest run src/lib/growth src/lib/artifact-composer` ·
  `pnpm lint` (la rule nueva corre sobre todo `src/**`) · `pnpm typecheck`
- DB/runtime checks: N/A — `repo-only change` sin persistencia ni contrato de datos.
- Integration checks: una corrida real de probes del grader (`light`) contra un dominio público, para
  confirmar que el fetcher movido se comporta igual: mismo status, mismo `finalUrl`, mismo
  `errorCode` ante host no público.
- Reliability signals/logs: sin señales nuevas. `growth.ai_visibility.probe_failure_rate` (existente,
  `src/lib/reliability/queries/growth-ai-visibility-probe-signals.ts`) es el canario: si el
  movimiento rompió el fetcher, esa señal se mueve.
- Production verification sequence: ver Zone 3.

### Acceptance criteria additions

- [ ] Source of truth, contract surface and consumers are named with real paths or objects.
- [ ] Data invariants, tenant/access boundary and idempotency/concurrency posture are explicit.
- [ ] Migration/backfill/rollback posture is explicit and proportional to risk.
- [ ] Runtime or DB evidence is listed for any change beyond docs/tooling.
- [ ] Sensitive domains have canonical errors, audit/signal posture and no raw data leaks.

## Capability Definition of Done — Full API Parity gate

`N/A — no capability.` Esta task no introduce ni modifica una acción de negocio: no afecta estado,
permisos, datos, aprobaciones, exports, recoveries, reportes ni configuración. Es un refactor de
fronteras de módulo con detector de CI. Las capabilities que atraviesan los archivos tocados
(`authorGraderPromptSetDraft`, `readGraderPromptSets`, `getGraderProfile`) conservan su contrato
íntegro: cambia la ruta del `import`, no la superficie.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     "Que construyo exactamente, slice por slice?"
     El agente solo lee esta zona DESPUES de que el plan este
     aprobado. Ejecuta un slice, verifica, commitea, y avanza.
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — `growth/site-substrate/` con re-export shim

- `git mv` de `probes/safe-fetch.ts` → `src/lib/growth/site-substrate/site-fetch.ts` y de
  `probes/html.ts` → `src/lib/growth/site-substrate/html.ts`. **`git mv`, no copy-paste**: el
  historial del archivo es lo que permite auditar después que la guarda SSRF no cambió.
- Los 3 tipos del fetcher (`ProbeFetchResult`, `ProbeFetchInit`, `ProbeFetcher`) se extraen de
  `probes/contracts.ts:99-124` a `src/lib/growth/site-substrate/contracts.ts`, renombrados
  `SiteFetchResult` / `SiteFetchInit` / `SiteFetcher`.
- `src/lib/growth/site-substrate/index.ts`: barrel con los nombres canónicos
  (`createSiteFetcher`, `resolveSubjectSite`, `analyzeDomSemantics`, `extractJsonLdBlocks`,
  `htmlToReadableText`, los 3 tipos).
- Shims: `probes/safe-fetch.ts`, `probes/html.ts` y el bloque de tipos de `probes/contracts.ts`
  quedan como `export { createSiteFetcher as createProbeFetcher, ... } from '@/lib/growth/site-substrate'`.
  **Verificación de éxito del slice: `git diff --stat` no muestra ningún otro archivo modificado.**
- El diff de `site-fetch.ts` contra el `safe-fetch.ts` original debe ser **sólo** el renombre de los
  3 tipos. Cero cambios de umbral, host, header ni control de flujo.
- `pnpm vitest run src/lib/growth/ai-visibility` verde sin tocar un solo test.

### Slice 2 — La carta del sustrato, verificable

- `src/lib/growth/site-substrate/__tests__/package-boundary.test.ts`, molde exacto de
  `artifact-composer/__tests__/package-boundary.test.ts`: recorre los `.ts` del directorio (excluye
  `__tests__`), extrae specifiers con los 4 patrones y aplica **allowlist**:
  - relativo y sin escapar del directorio del paquete
  - builtins `node:*`
  - `server-only`
  - `@/lib/observability/capture` (única transversal permitida, declarada con su razón)
- Todo lo demás rompe el build: explícitamente `@/lib/growth/*`, `@/lib/postgres/*`, `@/lib/db`,
  `@/lib/sync/*` (outbox), cualquier `flags`, `next`, `@core/*`, `@/components/*`.
- El docstring del test declara la regla en una línea: **el sustrato dice cómo se OBTIENE la
  evidencia y nunca cómo se JUZGA; si necesita persistir o consultar un dominio, no es del
  sustrato.**

### Slice 3 — El barrel de dominio AEO cubre lo que SEO consume

- `ai-visibility/index.ts` agrega los re-exports de los 14 símbolos listados en
  `## Why This Task Exists`, agrupados y comentados por qué son públicos (son el contrato del bridge
  SEO→AEO de `TASK-1666`, no un volcado del dominio).
- Cuidado con las colisiones de nombre: el barrel ya hace `export *` de 10 módulos. Si algún símbolo
  colisiona, se re-exporta nominalmente, nunca con `export *` de un módulo interno nuevo.
- `grounded-query-bridge.ts:23-37` (7 imports) y `grounded-query-reader.ts:15-19` (5 imports) pasan a
  **un solo `import ... from '@/lib/growth/ai-visibility'`** cada uno.
- `pnpm typecheck` verde: es la prueba de que el barrel expone exactamente lo que hacía falta, ni
  más ni menos.

### Slice 4 — `greenhouse/no-cross-domain-import-in-growth`, en `error` desde commit-1

- `eslint-plugins/greenhouse/rules/no-cross-domain-import-in-growth.mjs`, molde
  `no-cross-domain-import-from-client-portal.mjs`: `ImportDeclaration` + `ImportExpression` +
  `require`, `HELPER_HINT` con las salidas legítimas, `meta.docs.url` apuntando a §17.3.
- Regla, en una frase: **un archivo bajo `src/lib/growth/<dominio>/**` no puede importar un subpath
  interno de otro `src/lib/growth/<otro-dominio>/**`; sólo la raíz del barrel
  `@/lib/growth/<otro-dominio>`.**
  - `@/lib/growth/ai-visibility` → permitido
  - `@/lib/growth/ai-visibility/flags` → **error**
  - `@/lib/growth/site-substrate` y sus subpaths → **permitido para todos** (es el sustrato
    compartido, exento por path en la rule con su razón escrita)
  - importar `@/lib/growth/*` **desde** `site-substrate/**` → **error** (la carta, en la otra
    dirección)
  - imports internos del propio dominio (relativos o `@/lib/growth/<mismo>/...`) → permitido
- Override block en `eslint.config.mjs` para el archivo de la rule y sus tests.
- `'greenhouse/no-cross-domain-import-in-growth': 'error'` en `eslint.config.mjs`, junto a la de
  client-portal.
- Test de la rule con casos válidos e inválidos, incluida la dirección inversa del sustrato.
- 🔴 **`pnpm lint` con cero violaciones en el mismo commit.** Si aparece una violación que los slices
  1–3 no cubrieron, **no se baja la rule a `warn`**: se corrige el import o se agrega la exención con
  su razón escrita.

### Slice 5 — Cierre documental y corrección de la premisa de `TASK-1670`

- §17.3 de `GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md`: la regla "NUNCA importar desde otros dominios"
  gana su detector (`greenhouse/no-cross-domain-import-in-growth`) y la excepción nombrada
  (`growth/site-substrate`, con su carta).
- `GREENHOUSE_PUBLIC_AI_VISIBILITY_GRADER_ARCHITECTURE_V1.md`: delta declarando que el sustrato salió
  de `probes/` y que el barrel es el contrato del bridge SEO→AEO.
- `.claude/rules/growth-seo.md`: la regla nueva en una línea, para que cargue por path.
- `## Delta` en `TASK-1670` (lo escribe el agente que ejecute esta task, **no** se toca al crearla):
  corrige la premisa de "cero deep imports" con la medición real, y cambia el nombre de la superficie
  — no va en `probes/public.ts`, el contrato es el barrel de dominio ya existente y lo que SEO
  consume es el **sustrato**, exportado con nombres que lo digan.
- Doc funcional / manual: proporcional. No hay superficie de operador nueva; basta el delta técnico.

## Out of Scope

- **No se mueve el scoring versionado.** Ni `score_version`, ni `scoring/config.ts`, ni
  `scoring/engine.ts`. §5.1 lo marca `duplicar deliberadamente` con costo de equivocarse **máximo**.
- **No se mueve la autoría de prompts.** Queda en AEO; SEO la consume vía command. El sanitizer
  no-leading que evita que el grader se autoconfirme no se toca.
- **No se comparten los review gates.** Agregarían aprobación humana a un flujo continuo, y alguien
  la desactivaría.
- **No se comparte el resolver de entitlement/gate de gasto** (eso es `TASK-1696`; acá sólo se
  respeta la regla de que la FORMA se comparte y el resolver no).
- **No se crea `search-visibility/`** ni se reorganizan los ~70 archivos de los dos dominios.
- **No se crea ningún `packages/*` ni `apps/*`.** `Future candidate home` es metadata; la extracción
  física la autoriza `EPIC-026`, no una task de feature.
- **No se mueven los otros módulos de `probes/`**: `entity-fetch.ts`, `gatherer.ts`, `registry.ts`,
  `store.ts`, `command.ts`, `structural/`, `agentic/`, `entity/` se quedan donde están. Son juicio,
  no sustrato.
- **No se mejora la guarda SSRF** ni se levanta el bloqueo cross-host de `resolveProbeUrl`.
- **No se agrega ninguna capacidad**: ni análisis de contenido, ni parseo nuevo, ni un fetcher
  adicional.
- **No se toca `TASK-1670`** al crear esta task; su `## Delta` lo escribe quien ejecute el Slice 5.

## Detailed Spec

### Por qué un solo detector cierra dos problemas

El sustrato y el barrel parecen dos trabajos y son el mismo invariante mirado desde dos lados:
**qué puede cruzar la frontera entre dos dominios de `growth`**. Sin la rule, mover el sustrato es
higiene reversible en el próximo PR; sin el sustrato, la rule tendría una violación legítima el día
uno (el análisis de contenido necesitaría el fetcher y no tendría de dónde tomarlo sin deep import).
Por eso van juntos, y por eso la rule llega **al final**: cuando ya no queda ninguna violación que
justifique bajarla a `warn`.

### Por qué el shim y no reescribir los 7 dependientes

Dos razones, en orden de peso:

1. **El diff tiene que ser auditable.** Si el mismo PR mueve una guarda SSRF y reescribe 7 archivos,
   nadie puede afirmar con la vista que la guarda no cambió. Con shim, `git diff --stat` del Slice 1
   muestra exactamente 5 archivos y el movimiento es verificable en un minuto.
2. **El movimiento tiene que ser barato de revertir.** Un shim se borra en un commit posterior,
   cuando el sustrato ya lleva un tiempo en su lugar. Reescribir 7 archivos hace el revert tan caro
   como el movimiento.

La limpieza de los shims es un follow-up explícito, no deuda olvidada.

### Forma de la rule

```js
// Un archivo bajo src/lib/growth/<A>/** que importa @/lib/growth/<B>/<subpath> es un error.
// Sólo la raíz del barrel, @/lib/growth/<B>, es superficie pública.
const GROWTH_DOMAIN_FILE = /[/\\]src[/\\]lib[/\\]growth[/\\]([a-z0-9-]+)[/\\]/
const GROWTH_IMPORT      = /^@\/lib\/growth\/([a-z0-9-]+)(?:\/(.+))?$/

// SHARED_SUBSTRATE = 'site-substrate'
//   - cualquier dominio puede importarlo, con o sin subpath
//   - él no puede importar NINGÚN @/lib/growth/*  (la carta, en la otra dirección)
```

Casos que la rule debe cubrir además del `import` estático: `import()` dinámico, `require()` y
`export ... from`. El molde de client-portal cubre los tres primeros; el cuarto se agrega porque un
barrel que re-exporta de otro dominio es el mismo agujero con otra sintaxis.

### Casos legítimos que la rule NO debe romper

Verificar en el plan, antes de subirla a `error`:

- `src/lib/growth/forms/**`, `growth/cta/**`, `growth/meetings/**`, `growth/ga4/**`,
  `growth/search-console/**` — si alguno cruza hacia otro subdominio de growth por deep import, es un
  hallazgo nuevo y hay que decidirlo (barrel o exención), no silenciar la rule.
- `src/app/**`, `src/views/**`, `src/components/**`, `src/mcp/**`, `services/ops-worker/**` — no son
  archivos de dominio; la rule no aplica (el guard `GROWTH_DOMAIN_FILE` los excluye por path).
- Tests y fixtures — excluidos igual que en el molde.

### Nombres: por qué `SiteFetcher` y no `ProbeFetcher`

Un "probe" es una pieza del grader: mide una propiedad y produce un `probe_result` con status. El
sustrato no mide nada — trae bytes y los parsea. Exportarlo con nombre de probe le dice al próximo
consumidor que está usando maquinaria del grader, que es justo lo que la separación de dominios
quiere evitar. §5.4 de la auditoría lo pide explícito: *"exportarlo con nombres que lo digan
(`SiteFetcher`, `analyzeDomSemantics`), no `Probe`"*.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- **Slice 1 → Slice 2**: la carta se escribe sobre un directorio que ya existe.
- **Slice 1 y Slice 3 son independientes** entre sí (uno mueve el sustrato, el otro abre el barrel);
  pueden ir en cualquier orden.
- **Slice 4 (la rule) es SIEMPRE el último de código.** Subirla a `error` con violaciones vivas
  obliga a la decisión errada (bajarla a `warn`) y la task pierde su razón de ser.
- 🔴 **Coordinación con `TASK-1670`.** Si `TASK-1670` todavía no shippeó, esta task debe entrar
  **antes**, o 1670 debe declarar `Blocked by: TASK-1697`. Si 1670 ya shippeó con
  `probes/public.ts`, el Slice 3 absorbe esa superficie en el barrel y deja el archivo como shim —
  **nunca dos superficies públicas conviviendo**, que es el mismo problema con una capa más.
- **Slice 5 al final**: la doc describe el estado final, no el intermedio.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| El movimiento de `safe-fetch.ts` cambia sin querer un umbral, un host bloqueado o el redirect, y la guarda SSRF se debilita en silencio | growth/seguridad | medium | `git mv` (no copy-paste) + regla de "diff puro" + revisión del diff del Slice 1 aislado + tests de `probes-substrate.test.ts` sin modificar | `growth.ai_visibility.probe_failure_rate`; y un host no público que deje de bloquearse **no** dispara señal — por eso el diff aislado es la mitigación principal |
| La rule aparece con violaciones fuera de `seo`/`ai-visibility` (forms, cta, ga4, search-console) y se baja a `warn` "temporalmente" | tooling/CI | medium | Barrido completo de `src/lib/growth/**` en Discovery, **antes** de escribir la rule; cada hallazgo se resuelve con barrel o exención razonada, nunca bajando la severidad | `pnpm lint` en rojo — es el punto, no el fallo |
| El barrel de AEO colisiona nombres al agregar re-exports sobre 10 `export *` existentes | build | medium | Re-export nominal (nunca `export *` de un módulo interno nuevo) + `pnpm typecheck` como gate del Slice 3 | Fallo de compilación inmediato |
| Ciclo de imports: el barrel de AEO re-exporta algo que termina importando `growth/seo` | build | low | El DAG está verificado direccionalmente limpio (cero imports de `seo` en `ai-visibility`); la rule lo fija a futuro en las dos direcciones | Inestabilidad de build / orden de imports |
| `site-substrate` se vuelve un tercer dominio por acreción (alguien le agrega una query o un flag) | growth | medium | Carta verificable por test de frontera **y** por lint, desde el mismo PR en que nace | El test de `package-boundary` rompe el build |
| Conflicto de merge con `TASK-1670` sobre la misma superficie pública | planificación | high | Orden duro declarado arriba + `## Delta` en 1670 como item de cierre | Dos archivos que dicen ser la superficie pública del mismo dominio |
| Conflicto de merge con `TASK-1695` sobre `author-system-prompt.ts` | planificación | medium | Coordinación de orden con el operador; el conflicto es textual, no de diseño | Conflicto en el rebase |
| El bundle del ops-worker rompe porque el sustrato quedó con un import que el worker no resuelve | cross-runtime | low | El allowlist del sustrato es más estricto que lo que el worker exige; `pnpm worker:runtime-deps-gate` en el gate de cierre | Startup crash silencioso del ops-worker |

### Feature flags / cutover

`Sin flag — refactor con shim de compatibilidad, cutover inmediato.` Un flag exigiría mantener dos
copias del sustrato durante la ventana, que es exactamente la divergencia silenciosa de una guarda
SSRF que §5.1 marca como el costo alto y no observable. La reversibilidad la da el `revert PR`, que
para un refactor sin datos es completa.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | `revert PR` — el `git mv` se deshace y los shims desaparecen. Sin datos involucrados | ~5 min | si |
| Slice 2 | `revert PR` — quitar el test de frontera. Sin efecto runtime | ~2 min | si |
| Slice 3 | `revert PR` — el barrel vuelve a su forma anterior y los dos archivos de `seo` a sus deep imports | ~5 min | si |
| Slice 4 | `revert PR` o bajar la rule en `eslint.config.mjs`. **Bajarla a `warn` NO es rollback: es abandonar la task**; si hace falta, revertir el commit entero | ~2 min | si |
| Slice 5 | `revert PR` — doc-only | ~2 min | si |

### Production verification sequence

1. `pnpm typecheck` y `pnpm lint` verdes en local, con la rule ya en `error`.
2. `pnpm vitest run src/lib/growth` verde **sin haber modificado ningún test existente** de
   `ai-visibility`. Ese "sin modificar" es la prueba de que el shim funcionó.
3. `git diff --stat` del commit del Slice 1: exactamente los 5 archivos del movimiento, ni uno más.
4. Revisión humana del diff de `site-fetch.ts` contra el `safe-fetch.ts` original: **sólo** el
   renombre de los 3 tipos.
5. `pnpm test` (suite completa) + `pnpm build` (producción) como gate de cierre, con autorización del
   operador.
6. `pnpm worker:runtime-deps-gate` verde — el sustrato viaja en el bundle del ops-worker.
7. Deploy a staging. Correr una corrida real de probes del grader (`light`) contra un dominio público
   y comparar con la corrida equivalente previa al cambio: mismo status, mismo `finalUrl`, mismo
   `errorCode` ante host no público.
8. Verificar en `/admin/operations` que `growth.ai_visibility.probe_failure_rate` no se movió
   respecto de la línea base previa.
9. Ejercitar el bridge grounded (`grounded-query-bridge`) contra staging para confirmar que la
   reescritura de imports no cambió el comportamiento del draft AEO ni su `groundingMode`.

### Out-of-band coordination required

`N/A — repo-only change.` Sin env vars, sin secrets, sin configuración de proveedor, sin
comunicación a operadores. La única coordinación es **interna de planificación**: el orden respecto
de `TASK-1670` y `TASK-1695`, que decide el operador.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Existe `src/lib/growth/site-substrate/` con `site-fetch.ts`, `html.ts`, `contracts.ts` e
      `index.ts`, y los archivos llegaron por `git mv` (el historial lo prueba).
- [ ] El diff de `site-fetch.ts` contra el `safe-fetch.ts` original contiene **sólo** el renombre de
      `ProbeFetch*` → `SiteFetch*`: ningún cambio de host bloqueado, timeout, tope de bytes,
      User-Agent, política de redirect ni control de flujo.
- [ ] El commit del Slice 1 modifica exactamente 5 archivos; ninguno de los 7 dependientes de
      producción cambió una línea.
- [ ] `probes/safe-fetch.ts`, `probes/html.ts` y los 3 tipos de `probes/contracts.ts` re-exportan
      desde el sustrato conservando sus nombres actuales.
- [ ] `src/lib/growth/site-substrate/__tests__/package-boundary.test.ts` existe, opera por
      **allowlist** y rompe el build ante `@/lib/growth/*`, `@/lib/postgres/*`, `@/lib/db`,
      `@/lib/sync/*`, cualquier `flags`, `next` o `@core/*`.
- [ ] `src/lib/growth/site-substrate/**` no contiene una sola query SQL, ni un `outbox`, ni un flag
      de dominio, verificado por ese test.
- [ ] `grounded-query-bridge.ts` y `grounded-query-reader.ts` tienen **un solo** import de
      `@/lib/growth/ai-visibility` cada uno; cero subpaths internos.
- [ ] `ai-visibility/index.ts` exporta los 14 símbolos, agrupados y con un comentario que dice por
      qué son públicos.
- [ ] `eslint-plugins/greenhouse/rules/no-cross-domain-import-in-growth.mjs` existe, cubre
      `ImportDeclaration`, `ImportExpression`, `require` y `export ... from`, y tiene test con casos
      válidos e inválidos en **ambas direcciones** del sustrato.
- [ ] La rule está en `'error'` en `eslint.config.mjs` y `pnpm lint` reporta **cero** violaciones en
      el mismo commit. No existe ninguna instancia de la rule en `warn`.
- [ ] `growth/site-substrate` está exento por path como sustrato compartido, con la razón escrita en
      el archivo de la rule.
- [ ] `pnpm vitest run src/lib/growth` pasa sin haber modificado ningún test preexistente de
      `ai-visibility`.
- [ ] `pnpm worker:runtime-deps-gate` verde.
- [ ] Una corrida real de probes contra un dominio público en staging devuelve el mismo status,
      `finalUrl` y `errorCode` que antes del cambio, con la evidencia registrada en el cierre.
- [ ] §17.3 de `GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md` nombra el detector y la excepción del
      sustrato; `.claude/rules/growth-seo.md` lo refleja en una línea.
- [ ] `TASK-1670` recibió su `## Delta` con la premisa corregida y el nombre de la superficie.
- [ ] No existe `src/lib/growth/search-visibility/` ni ningún `packages/*` nuevo.
- [ ] `pnpm task:lint --task TASK-1697` reporta `template=1 errors=0`.

## Verification

- `pnpm vitest run src/lib/growth src/lib/artifact-composer`
- `pnpm local:check` (lint + tsc; la rule nueva corre sobre todo `src/**`)
- `pnpm worker:runtime-deps-gate`
- `git diff --stat` por slice, como evidencia del alcance del movimiento
- `pnpm test` (suite completa) + `pnpm build` (producción) como gate de cierre, **con autorización
  explícita del operador antes de correr el build**.
- `pnpm task:lint --task TASK-1697` y `pnpm ops:lint --changed`
- `pnpm docs:closure-check`
- Pasos 1–9 de `### Production verification sequence`, con la corrida real de probes en staging
  documentada.

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas

- [ ] `TASK-1670` recibe un `## Delta` que (a) corrige la premisa "cero deep imports" con la
      medición real y (b) cambia el nombre y el lugar de la superficie pública: barrel de dominio,
      no `probes/public.ts`; sustrato con nombres de sustrato. Los criterios exigibles se agregan
      como checkboxes en su `## Acceptance Criteria`, no como prosa.
- [ ] `TASK-1695` recibe un `## Delta` avisando que `author-system-prompt.ts` pasa a exportarse por
      el barrel, para evitar el conflicto de merge.
- [ ] Cualquier violación de la rule hallada fuera de `seo`/`ai-visibility` durante Discovery queda
      documentada: resuelta en esta task, o con task derivada y exención razonada.

## Follow-ups

- **Retirar los shims** de `probes/safe-fetch.ts` / `probes/html.ts` / los tipos de
  `probes/contracts.ts`, reescribiendo los 7 dependientes de producción a
  `@/lib/growth/site-substrate`. Task chica, después de una release con el sustrato asentado.
- **Análisis de contenido por URL** (`analyzeUrlContent`, §5.3 de la auditoría): es el tercer
  consumidor externo del sustrato y su disparo. Emite **hechos, no veredictos** — cero score; SEO los
  convierte en `priority_score` con su config versionada y AEO en evidencia de `citation_quality` con
  la suya. Depende del gate de tokens per-org (`TASK-1696` follow-up) antes de correr a escala de
  sitio.
- **Extender la rule al resto de `src/lib/**`**: la misma forma sirve para cualquier par de dominios
  (`finance`, `payroll`, `commercial`). Evaluar después de un ciclo con la versión de `growth`, para
  no descubrir 200 violaciones legítimas de una vez.
- **Barrel de `growth/seo`**: hoy `growth/seo` no tiene `index.ts`. Cuando otro dominio lo consuma,
  la rule lo exigirá; conviene crearlo antes de que sea urgente.

## Open Questions

- ¿`site-substrate` debe vivir bajo `src/lib/growth/` o directamente en `src/lib/`? La auditoría lo
  nombra `growth/site-substrate` y la task lo respeta, pero el sustrato no tiene nada de "growth" —
  es fetch + parse de un sitio. Dejarlo en `growth/` mantiene el blast radius acotado y evita
  discutir hoy una frontera que `EPIC-026` va a discutir igual; si mañana lo consume un dominio de
  fuera de growth, el movimiento es un `git mv` más.
- ¿El barrel de AEO debe exportar `getGraderProfile` y `getActiveBrandIntelligence` tal cual, o
  conviene un reader de propósito acotado para el bridge SEO (`readGraderContextForSeoBridge`) que no
  exponga el store completo? Lo primero es más chico y honesto con lo que hoy existe; lo segundo
  reduce la superficie pública a lo que realmente se necesita. La task propone lo primero y deja lo
  segundo como decisión del plan, para no inventar un contrato antes de tener el segundo consumidor.
- ¿La rule debe permitir imports de subpath **de tipos** (`import type`) entre dominios? Serían
  inocuos en runtime pero igual acoplan la forma interna. La task propone prohibirlos igual (un tipo
  público es un export del barrel), pero es el caso donde una exención es más defendible.
