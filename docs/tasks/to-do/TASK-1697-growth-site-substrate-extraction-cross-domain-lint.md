# TASK-1697 — Growth: sustrato de sitio compartido, barrel de dominio AEO y detector de imports cross-dominio

## Delta 2026-08-15 (2) — decisión de secuencia verificada: esta task se recorta a la **mitad A**

Cuatro especialistas resolvieron la secuencia del lote. Esta task **se parte**, y se queda con la
mitad barata y desbloqueante.

**Alcance vigente: Slice 1 (el `git mv` del sustrato) + Slice 2 (test de frontera) + una lint rule
ANGOSTA.** El barrel de dominio AEO y la lint rule **universal** salen a la task hermana `TASK-1713`. El H1 de
este archivo conserva su nombre histórico; lo que manda es este alcance.

🔴 **La lint rule universal sale de esta task.** Razón medida, no estética: contra `develop` el
2026-08-15 hay **30 deep imports cross-dominio vivos** en `src/lib/growth/**` (código de producción,
sin tests), no 14 — y **18 de ellos están fuera del par `seo↔ai-visibility`**:

| Origen → destino | Deep imports |
|---|---|
| `seo` → `ai-visibility` | 12 |
| `ai-visibility` → `forms` | 8 |
| `ctas` → `forms` | 5 |
| `ctas` → `meetings` | 1 |
| `meetings` → `forms` | 1 |
| `meetings` → `public-submission` | 1 |
| `forms` → `public-submission` | 1 |
| `ai-visibility` → `public-submission` | 1 |

Hacer legales esos 18 exige **decisiones de frontera** (qué es superficie pública de `forms`, de
`meetings`, de `public-submission`), no un sweep de imports. Con ellos vivos la regla universal **no
puede nacer en `error` con cero violaciones**, y el patrón canónico #7 prohíbe resolverlo con una
lista de exenciones que se pudre. Una regla de frontera que nace debiendo una lista de exenciones ya
perdió.

🔴 **La regla que SÍ sale acá es angosta y se apoya en dos invariantes HOY ciertos** (verificados con
`grep` sobre `develop` el 2026-08-15, alias `@/` y rutas relativas):

1. **Ningún archivo fuera de `src/lib/growth/ai-visibility/**` importa
   `@/lib/growth/ai-visibility/probes/**`** — cero ocurrencias en `src/`, `services/` y `scripts/`.
2. **`src/lib/growth/site-substrate/**` no importa `@/lib/growth/*`** — trivialmente cierto porque el
   directorio nace en esta task, y la carta lo fija desde el primer commit.

Cero violaciones hoy ⇒ la regla nace en **`error`**, sin exención y **sin fecha de saldo**. Y bloquea
exactamente el commit que `TASK-1670` / `TASK-1701` podrían escribir mañana: ir a buscar el fetcher a
las tripas del grader en vez de al sustrato.

🔴 **Corrección de spec — un criterio de aceptación era inalcanzable.** Esta task pedía
`htmlToReadableText` en el barrel del sustrato, pero esa función **no vive en `probes/html.ts`**: está
en `src/lib/growth/ai-visibility/brand-intelligence/fetch-site-content.ts:21` y se re-exporta por
`brand-intelligence/index.ts:8`. `probes/html.ts` exporta `extractJsonLdBlocks`,
`flattenJsonLdNodes`, `jsonLdTypes`, `DomSemanticsSnapshot` y `analyzeDomSemantics`, y nada más. Como
estaba, el AC no se podía cumplir sin un tercer movimiento no declarado. **Se resuelve sacándola del
alcance**: `TASK-1670` no la necesita (evalúa `robots.txt`, JSON-LD y sitemap, no extrae prosa), y su
único consumidor vivo está dentro del propio `brand-intelligence`. Si un tercer consumidor la pide,
es un movimiento aparte con su propio diff.

**`Blocks` += `TASK-1670`** (sólo sus Slices 1+2 la bloquean, ver el delta de 1670) **y `TASK-1713`**
(mitad B: lint rule universal + barrel de dominio AEO).

⚠️ **La mitad B es `TASK-1713`, NO `TASK-1710`.** El brief la nombró `TASK-1710`, pero ese ID ya está
tomado por el umbrella P0 de remediación de confiabilidad
(`docs/tasks/to-do/TASK-1710-reliability-remediation-control-plane-delivery-data.md`); `TASK-1711` y
`TASK-1712` quedaron tomados en la misma sesión por otro agente trabajando en paralelo sobre el
workspace compartido. La mitad B se registró como
`docs/tasks/to-do/TASK-1713-growth-cross-domain-import-lint-and-aeo-barrel.md`, que además declara
`Blocked by: TASK-1695`. **Nunca citar `TASK-1710` para este trabajo: apunta a otra cosa.**

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

**(Alcance vigente = mitad A; ver `## Delta 2026-08-15 (2)`.)** El **sustrato** —fetcher con guarda
SSRF + parseo HTML— se muda a `growth/site-substrate/` con re-export shim, así que **ningún
dependiente cambia una línea**, y nace con **carta verificable** (test de frontera por allowlist:
no importa `growth/*`, no persiste). Lo blinda una lint rule **angosta** que nace en `error` con cero
violaciones y sin exenciones: nadie fuera del dominio AEO entra a `ai-visibility/probes/**`, y el
sustrato no importa `growth/*`.

El **barrel de dominio AEO** y la lint rule **universal** de fronteras `growth/*` **salieron** a la
`TASK-1713`: hay 30 deep imports cross-dominio vivos y 18 fuera del par `seo↔ai-visibility`, así que
la regla universal no puede nacer limpia hoy y el barrel no desbloquea a nadie de este lote.

## Why This Task Exists

Es el §1.3 de la auditoría
`docs/audits/platform/2026-08-15-growth-seo-aeo-module-opportunity-audit.md`, y son dos problemas
que comparten un único detector.

> ⚠️ **Leer con el `## Delta 2026-08-15 (2)` puesto.** El **Problema 1** (deep imports
> `seo → ai-visibility` y su detector universal) **salió de esta task** a `TASK-1713`: la
> medición real es 30 deep imports cross-dominio, 18 de ellos ajenos a este par, y la regla universal
> no puede nacer limpia hoy. Lo que se queda acá es el **Problema 2** —el sustrato sin dueño— más una
> rule **angosta** que blinda el resultado. La tabla de abajo se conserva como la medición que
> justifica el corte, no como alcance.

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
- La **carta del sustrato es verificable por lint y por test**, no por buena voluntad: no importa nada
  de `growth/*` y no persiste nada (cero Postgres, cero outbox, cero flags de dominio) — mismo
  contrato que `artifact-composer` ya tiene.
- `greenhouse/growth-substrate-boundary` (rule **angosta**) vive en `error` **desde el primer commit**,
  con **cero violaciones** y **sin una sola exención**: nadie fuera de `ai-visibility/**` importa
  `ai-visibility/probes/**`, y `site-substrate/**` no importa `@/lib/growth/*`.
- §17.3 de la arquitectura SEO y `.claude/rules/growth-seo.md` dejan de describir una aspiración y
  pasan a describir el invariante que **sí** tiene detector hoy, nombrando explícitamente que el
  detector universal es de `TASK-1713`.
- **Fuera de alcance (`TASK-1713`):** el barrel de dominio AEO con los símbolos que `growth/seo`
  consume, y la lint rule universal `no-cross-domain-import-in-growth`.

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

- **`TASK-1670`** (`to-do`) — **bloqueada sólo por los Slices 1+2 de esta task** (el `git mv` + su
  test de frontera; horas de trabajo). El resto de esta task puede correr en paralelo con 1670: la
  rule angosta y el cierre documental no le entregan nada que 1670 necesite para compilar.
- **`TASK-1713`** — lint rule universal + barrel de dominio AEO (la **mitad B** de esta task; **no** `TASK-1710`, ver el Delta): hereda el barrel de `ai-visibility/index.ts`, la reescritura de imports de
  `grounded-query-bridge.ts` / `grounded-query-reader.ts` y la rule universal
  `no-cross-domain-import-in-growth` con los 18 deep imports fuera del par `seo↔ai-visibility`.
  Depende de que el sustrato exista (esta task) y de `TASK-1695` (los archivos que reescribe).
- **`TASK-1701`** (`to-do`, análisis de contenido por URL): es el tercer consumidor externo del
  sustrato y el disparo legítimo del movimiento (§5.3 de la auditoría). Nace apuntando a
  `growth/site-substrate/`, no a `probes/` — y la rule angosta se lo impone.
- **`TASK-1709`** (`to-do`, diagnóstico de prospecto) — **cuarto consumidor externo, agregado
  2026-08-26.** Su `Delta 2026-08-26` levantó la prohibición de fetch sobre el sitio del prospecto y
  la reemplazó por delegación: su `Slice 2b` consume `@/lib/growth/site-substrate` y **declara esta
  task como su único blocker externo** (`Blocked by: TASK-1697`). Refuerza la prioridad `P0`: sin la
  extracción, la evidencia de sitio del carril comercial no tiene forma correcta de existir.
- **`TASK-1695`** (`to-do`, autoría grounded): **ya no está bloqueada por esta task.** Con el recorte,
  la mitad A **no toca** `grounded-query-bridge.ts` ni `grounded-query-reader.ts`. El bloqueo se
  invierte: `TASK-1713` declara `Blocked by: TASK-1695`, porque su reescritura al barrel debe
  caer sobre el archivo ya modificado por 1695.
- **`TASK-1666`** (cerrada): dueña original de `grounded-query-bridge.ts` /
  `grounded-query-reader.ts` — archivos que esta task **ya no toca**.
- Cualquier task futura de `growth/*` hereda el detector angosto: entrar a `ai-visibility/probes/**`
  desde fuera del dominio AEO pasa a romper el build.

### Files owned

- `src/lib/growth/site-substrate/` (nuevo: `index.ts`, `site-fetch.ts`, `html.ts`, `contracts.ts`)
- `src/lib/growth/ai-visibility/probes/safe-fetch.ts` (pasa a re-export shim)
- `src/lib/growth/ai-visibility/probes/html.ts` (pasa a re-export shim)
- `src/lib/growth/ai-visibility/probes/contracts.ts` (re-exporta los 3 tipos del sustrato)
- `eslint-plugins/greenhouse/rules/growth-substrate-boundary.mjs` (nuevo, rule **angosta**) + su test
- ~~`src/lib/growth/ai-visibility/index.ts`~~ · ~~`growth/seo/grounded-query-bridge.ts`~~ ·
  ~~`growth/seo/grounded-query-reader.ts`~~ — **owned por `TASK-1713`** desde el recorte del
  2026-08-15 (2). Esta task no los toca, y por eso `TASK-1695` queda desbloqueada.
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
  `ai-visibility`, y **ninguno cambia** gracias al shim). `grounded-query-bridge.ts` y
  `grounded-query-reader.ts` salieron del alcance con el recorte: sus imports los reescribe la task
  hermana.
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
    `analyzeDomSemantics`, `extractJsonLdBlocks`, `flattenJsonLdNodes`, `jsonLdTypes`,
    `DomSemanticsSnapshot`). **`htmlToReadableText` NO entra** — no vive en `probes/html.ts` sino en
    `brand-intelligence/fetch-site-content.ts:21`; ver el Delta 2026-08-15 (2).
  - `probes/safe-fetch.ts`, `probes/html.ts` y `probes/contracts.ts` conservan sus exports actuales
    como **alias re-exportados** del sustrato.
  - ~~`ai-visibility/index.ts` agrega los re-exports que `growth/seo` necesita~~ → `TASK-1713`.
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
  - **Los shims re-exportan, no envuelven.** `probes/safe-fetch.ts` / `probes/html.ts` /
    `probes/contracts.ts` re-exportan alias; no introducen una capa de adaptación con lógica propia,
    que sería un tercer lugar donde el comportamiento puede divergir. (La misma regla aplicada al
    barrel de dominio AEO viaja con `TASK-1713`.)
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
  `flattenJsonLdNodes`, `jsonLdTypes`, `DomSemanticsSnapshot`, los 3 tipos del fetcher).
  **Sin `htmlToReadableText`**: no está en `probes/html.ts` (vive en
  `brand-intelligence/fetch-site-content.ts:21`) y ningún consumidor de este lote la pide.
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

### Slice 3 — `greenhouse/growth-substrate-boundary` (rule **angosta**), en `error` desde commit-1

Molde: `no-cross-domain-import-from-client-portal.mjs` (`ImportDeclaration` + `ImportExpression` +
`require` + `export ... from`, `HELPER_HINT` con las salidas legítimas, `meta.docs.url` a §17.3).

Cubre **exactamente dos invariantes**, ambos verificados con cero violaciones el 2026-08-15:

1. **Nadie fuera de `src/lib/growth/ai-visibility/**` importa `@/lib/growth/ai-visibility/probes/**`**
   (ni por alias ni por ruta relativa que escape del dominio). Ésa es la puerta que `TASK-1670` y
   `TASK-1701` podrían empujar mañana: ir a buscar el fetcher a las tripas del grader.
2. **`src/lib/growth/site-substrate/**` no importa `@/lib/growth/*`** — la carta, en la dirección
   inversa, expresada también como lint y no sólo como test.

- Override block en `eslint.config.mjs` para el archivo de la rule y sus tests;
  `'greenhouse/growth-substrate-boundary': 'error'` junto a la de client-portal.
- Test de la rule con casos válidos e inválidos en **ambas direcciones**.
- 🔴 **`pnpm lint` con cero violaciones y CERO exenciones en el mismo commit.** No hay lista de
  excepciones ni fecha de saldo: si hiciera falta una, la regla no es angosta y el trabajo es de la
  `TASK-1713`.
- 🔴 **Lo que esta rule NO hace:** no prohíbe deep imports entre dominios `growth/*` en general. Esa
  es la rule universal `no-cross-domain-import-in-growth`, y no puede nacer hoy en `error` porque hay
  **30 deep imports cross-dominio vivos**, 18 fuera del par `seo↔ai-visibility` (tabla en el Delta).
  Legalizar esos 18 exige decidir la superficie pública de `forms`, `meetings` y `public-submission`:
  es trabajo de frontera, no un sweep, y el patrón canónico #7 prohíbe cerrarlo con exenciones.

### Slice 4 — Cierre documental

- §17.3 de `GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md`: la regla "NUNCA importar desde otros dominios"
  gana **su primer detector real** (`greenhouse/growth-substrate-boundary`) y la excepción nombrada
  (`growth/site-substrate`, con su carta). Se declara explícito que el detector universal **todavía no
  existe** y que su dueña es `TASK-1713`, con la cifra medida (30 / 18) — para que nadie lea §17.3
  como si ya estuviera cubierta.
- `GREENHOUSE_PUBLIC_AI_VISIBILITY_GRADER_ARCHITECTURE_V1.md`: delta declarando que el sustrato salió
  de `probes/` con shim y que `ai-visibility/probes/**` es privado del dominio, con detector.
- `.claude/rules/growth-seo.md`: la regla nueva en una línea, para que cargue por path.
- Doc funcional / manual: proporcional. No hay superficie de operador nueva; basta el delta técnico.

## Out of Scope

- 🔴 **No se abre el barrel de dominio AEO** (`ai-visibility/index.ts`) ni se reescriben los imports
  de `grounded-query-bridge.ts` / `grounded-query-reader.ts`. Es de `TASK-1713`, que además debe
  entrar **después** de `TASK-1695` para no reescribir un archivo que 1695 va a mover.
- 🔴 **No se crea la lint rule universal `no-cross-domain-import-in-growth`.** Task hermana. Motivo
  medido: 30 deep imports cross-dominio vivos, 18 fuera del par `seo↔ai-visibility`.
- **No se mueve `htmlToReadableText`.** No vive en `probes/html.ts` y ningún consumidor de este lote
  la necesita; moverla sería un tercer movimiento no declarado dentro del mismo PR.
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

## Detailed Spec

### Por qué el detector angosto va con el sustrato, y el universal no

El sustrato y su detector son el mismo invariante mirado desde dos lados: **qué puede cruzar la
frontera del dominio AEO**. Sin la rule, mover el sustrato es higiene reversible en el próximo PR
—alguien vuelve a entrar a `probes/` y nadie se entera—; sin el sustrato, la rule tendría una
violación legítima el día uno (el análisis de contenido de `TASK-1701` necesitaría el fetcher y no
tendría de dónde tomarlo). Por eso van juntos, y por eso la rule llega **al final**: cuando ya no
queda ninguna violación que justifique bajarla a `warn`.

La rule **universal** no cumple esa condición y por eso salió. Medido el 2026-08-15: 30 deep imports
cross-dominio vivos en `src/lib/growth/**`, de los cuales **18 no tienen nada que ver con este lote**
(`ai-visibility→forms` 8, `ctas→forms` 5, `ctas→meetings` 1, `meetings→forms` 1,
`meetings→public-submission` 1, `forms→public-submission` 1, `ai-visibility→public-submission` 1).
Cada uno exige decidir qué es superficie pública de esos dominios — trabajo real, con riesgo propio,
que no debe montarse sobre un `git mv` que quiere ser un diff auditable de una guarda SSRF.
Mezclarlos tendría exactamente dos salidas, ambas malas: retrasar semanas un movimiento de una tarde,
o parir la regla con una lista de exenciones que se pudre (patrón canónico #7).

### Por qué el shim y no reescribir los 7 dependientes

Dos razones, en orden de peso:

1. **El diff tiene que ser auditable.** Si el mismo PR mueve una guarda SSRF y reescribe 7 archivos,
   nadie puede afirmar con la vista que la guarda no cambió. Con shim, `git diff --stat` del Slice 1
   muestra exactamente 5 archivos y el movimiento es verificable en un minuto.
2. **El movimiento tiene que ser barato de revertir.** Un shim se borra en un commit posterior,
   cuando el sustrato ya lleva un tiempo en su lugar. Reescribir 7 archivos hace el revert tan caro
   como el movimiento.

La limpieza de los shims es un follow-up explícito, no deuda olvidada.

### Forma de la rule angosta

```js
// (1) probes/** es privado del dominio AEO: sólo archivos bajo
//     src/lib/growth/ai-visibility/** pueden importarlo.
const AEO_PROBES_IMPORT = /^@\/lib\/growth\/ai-visibility\/probes(?:\/|$)/
const AEO_DOMAIN_FILE   = /[/\\]src[/\\]lib[/\\]growth[/\\]ai-visibility[/\\]/

// (2) la carta del sustrato, en la otra dirección:
//     un archivo bajo src/lib/growth/site-substrate/** no importa NINGÚN @/lib/growth/*
const SUBSTRATE_FILE  = /[/\\]src[/\\]lib[/\\]growth[/\\]site-substrate[/\\]/
const GROWTH_IMPORT   = /^@\/lib\/growth\//
```

Casos que la rule debe cubrir además del `import` estático: `import()` dinámico, `require()` y
`export ... from`. El molde de client-portal cubre los tres primeros; el cuarto se agrega porque un
barrel que re-exporta de otro dominio es el mismo agujero con otra sintaxis. También debe atrapar la
ruta **relativa** que escapa del dominio (`../../ai-visibility/probes/...`), no sólo el alias `@/`.

### Verificación previa de que la rule nace limpia

Ambos invariantes se midieron contra `develop` el 2026-08-15 y dieron **cero**:

- `grep -rn "growth/ai-visibility/probes"` sobre `src/`, `services/` y `scripts/`, excluyendo
  `src/lib/growth/ai-visibility/**` → cero ocurrencias, alias y relativas.
- No hay imports relativos que escapen de un dominio `growth/*` hacia otro (`../../<otro-dominio>`) →
  cero ocurrencias, así que el alias `@/` es la única superficie que la rule necesita vigilar.
- `site-substrate/**` no existe todavía: nace en el Slice 1 y con la carta puesta desde el primer
  commit, así que el segundo invariante no puede violarse "de arrastre".

Excluidos por path, igual que en el molde: `src/app/**`, `src/views/**`, `src/components/**`,
`src/mcp/**`, `services/**`, tests y fixtures del propio dominio AEO.

### Nombres: por qué `SiteFetcher` y no `ProbeFetcher`

Un "probe" es una pieza del grader: mide una propiedad y produce un `probe_result` con status. El
sustrato no mide nada — trae bytes y los parsea. Exportarlo con nombre de probe le dice al próximo
consumidor que está usando maquinaria del grader, que es justo lo que la separación de dominios
quiere evitar. §5.4 de la auditoría lo pide explícito: *"exportarlo con nombres que lo digan
(`SiteFetcher`, `analyzeDomSemantics`), no `Probe`"*.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- **Slice 1 → Slice 2**: la carta se escribe sobre un directorio que ya existe.
- **Slice 3 (la rule) es SIEMPRE el último de código.** Subirla a `error` con violaciones vivas
  obliga a la decisión errada (bajarla a `warn`) y la task pierde su razón de ser.
- 🔴 **Coordinación con `TASK-1670`: sólo los Slices 1+2 la bloquean.** Apenas el sustrato existe con
  su carta, 1670 puede arrancar; los Slices 3 y 4 corren en paralelo. Bloquear 1670 contra los cuatro
  slices sería pagar el riesgo de la lint rule con retraso de la señal de producto, y la señal de
  producto acá es "un sitio invisible para la IA deja de puntuar 95/100".
- 🔴 **Coordinación con `TASK-1713`.** El barrel de dominio AEO y la rule universal viven allá, y
  esa task entra **después de `TASK-1695`** (reescribe archivos que 1695 modifica). Esta task no toca
  esos archivos, así que **no hay conflicto de merge con 1695** y 1695 queda desbloqueada.
- **Slice 4 al final**: la doc describe el estado final, no el intermedio.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| El movimiento de `safe-fetch.ts` cambia sin querer un umbral, un host bloqueado o el redirect, y la guarda SSRF se debilita en silencio | growth/seguridad | medium | `git mv` (no copy-paste) + regla de "diff puro" + revisión del diff del Slice 1 aislado + tests de `probes-substrate.test.ts` sin modificar | `growth.ai_visibility.probe_failure_rate`; y un host no público que deje de bloquearse **no** dispara señal — por eso el diff aislado es la mitigación principal |
| Alguien reintroduce la rule universal dentro de esta task "ya que estamos", y aparece con 18 violaciones que se silencian con exenciones | tooling/CI | medium | Alcance recortado y escrito en `## Out of Scope`; la rule angosta tiene su nombre propio (`growth-substrate-boundary`) para que no se confunda con la universal | Cualquier exención en el archivo de la rule — la angosta nace con cero |
| El movimiento del sustrato deja viva alguna ruta a `probes/**` que la rule angosta no cubre (relativa, dinámica, `export … from`) | tooling/CI | medium | Los 4 patrones del molde + test de la rule con casos relativos; barrido verificado en cero antes de subirla | `pnpm lint` verde con un deep import vivo — se detecta en el test de la rule, no en el repo |
| `site-substrate` se vuelve un tercer dominio por acreción (alguien le agrega una query o un flag) | growth | medium | Carta verificable por test de frontera **y** por lint, desde el mismo PR en que nace | El test de `package-boundary` rompe el build |
| `TASK-1670` arranca antes de que exista el sustrato e improvisa una superficie dentro del motor AEO | planificación | medium | Bloqueo declarado a Slices 1+2 (horas, no semanas) + la rule angosta que lo rompería en CI | Un archivo nuevo bajo `ai-visibility/**` en el PR de 1670 |
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
| Slice 3 | `revert PR` del commit de la rule. **Bajarla a `warn` NO es rollback: es abandonar la task**; si hace falta, revertir el commit entero | ~2 min | si |
| Slice 4 | `revert PR` — doc-only | ~2 min | si |

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
9. ~~Ejercitar el bridge grounded~~ — fuera de alcance con el recorte: esta task ya no reescribe
   imports de `grounded-query-*`. Esa verificación viaja con `TASK-1713`.

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
- [ ] El barrel del sustrato **no** exporta `htmlToReadableText`, y esa función sigue viviendo intacta
      en `brand-intelligence/fetch-site-content.ts`.
- [ ] `eslint-plugins/greenhouse/rules/growth-substrate-boundary.mjs` existe, cubre
      `ImportDeclaration`, `ImportExpression`, `require` y `export ... from`, atrapa también rutas
      relativas que escapan del dominio, y tiene test con casos válidos e inválidos en **ambas
      direcciones**.
- [ ] La rule está en `'error'` en `eslint.config.mjs`, `pnpm lint` reporta **cero** violaciones en el
      mismo commit y el archivo de la rule **no contiene ninguna exención** ni fecha de saldo.
- [ ] Ningún archivo fuera de `src/lib/growth/ai-visibility/**` importa
      `@/lib/growth/ai-visibility/probes/**`, y `site-substrate/**` no importa `@/lib/growth/*`:
      ambos verificados por la rule en CI.
- [ ] Esta task **no** creó `no-cross-domain-import-in-growth` ni tocó `ai-visibility/index.ts`,
      `grounded-query-bridge.ts` ni `grounded-query-reader.ts` (`git diff --stat` lo prueba).
- [ ] `pnpm vitest run src/lib/growth` pasa sin haber modificado ningún test preexistente de
      `ai-visibility`.
- [ ] `pnpm worker:runtime-deps-gate` verde.
- [ ] Una corrida real de probes contra un dominio público en staging devuelve el mismo status,
      `finalUrl` y `errorCode` que antes del cambio, con la evidencia registrada en el cierre.
- [ ] §17.3 de `GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md` nombra el detector angosto y la excepción
      del sustrato, **y declara explícito que el detector universal todavía no existe** (30 deep
      imports vivos, 18 fuera del par `seo↔ai-visibility`) con `TASK-1713` como dueña;
      `.claude/rules/growth-seo.md` lo refleja en una línea.
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

- [x] `TASK-1670` recibió su `## Delta 2026-08-15 (2)`: bloqueo acotado a Slices 1+2 de esta task,
      y el bloqueante real del cierre del agujero declarado (`TASK-1671`, no esta task).
- [x] `TASK-1695` recibió su `## Delta 2026-08-15 (2)`: **se desbloquea** — con el recorte esta task
      no toca `grounded-query-bridge.ts` ni `grounded-query-reader.ts`, y el bloqueo se invierte
      hacia `TASK-1713`.
- [ ] La mitad B se cita por su ID real, **`TASK-1713`**, en todo el archivo; no queda ninguna
      referencia a `TASK-1710` como si fuera este trabajo (ese ID es el umbrella de remediación de
      confiabilidad).
- [ ] Cualquier deep import a `ai-visibility/probes/**` hallado durante Discovery fuera de
      `ai-visibility/**` queda resuelto en esta task, **nunca** con exención.

## Follow-ups

- **Retirar los shims** de `probes/safe-fetch.ts` / `probes/html.ts` / los tipos de
  `probes/contracts.ts`, reescribiendo los 7 dependientes de producción a
  `@/lib/growth/site-substrate`. Task chica, después de una release con el sustrato asentado.
- **Análisis de contenido por URL** (`analyzeUrlContent`, §5.3 de la auditoría): es el tercer
  consumidor externo del sustrato y su disparo. Emite **hechos, no veredictos** — cero score; SEO los
  convierte en `priority_score` con su config versionada y AEO en evidencia de `citation_quality` con
  la suya. Depende del gate de tokens per-org (`TASK-1696` follow-up) antes de correr a escala de
  sitio.
- **Rule universal `no-cross-domain-import-in-growth` + barrel de dominio AEO** → **`TASK-1713`**. Ahí se decide la superficie pública de `forms`, `meetings` y
  `public-submission` para poder legalizar los 18 deep imports que hoy la harían nacer sucia.
- **Extender la rule al resto de `src/lib/**`** (`finance`, `payroll`, `commercial`): sólo después de
  un ciclo con la universal de `growth`, para no descubrir 200 violaciones legítimas de una vez.
- **Barrel de `growth/seo`**: hoy `growth/seo` no tiene `index.ts`. Cuando otro dominio lo consuma,
  la rule universal lo exigirá; conviene crearlo antes de que sea urgente.

## Open Questions

- ¿`site-substrate` debe vivir bajo `src/lib/growth/` o directamente en `src/lib/`? La auditoría lo
  nombra `growth/site-substrate` y la task lo respeta, pero el sustrato no tiene nada de "growth" —
  es fetch + parse de un sitio. Dejarlo en `growth/` mantiene el blast radius acotado y evita
  discutir hoy una frontera que `EPIC-026` va a discutir igual; si mañana lo consume un dominio de
  fuera de growth, el movimiento es un `git mv` más.
- ~~¿El barrel de AEO debe exportar `getGraderProfile` y `getActiveBrandIntelligence` tal cual, o
  conviene un reader acotado (`readGraderContextForSeoBridge`)?~~ → **movida a `TASK-1713`** con
  el recorte del 2026-08-15 (2); acá ya no se abre el barrel.
- ¿La rule angosta debe permitir imports de subpath **de tipos** (`import type`) desde
  `ai-visibility/probes/**`? Serían inocuos en runtime pero igual acoplan la forma interna. La task
  propone prohibirlos igual, y hoy es gratis: hay **cero** de ellos en el repo, así que no cuesta
  nada nacer estricto y sí costaría mucho relajarlo después.
