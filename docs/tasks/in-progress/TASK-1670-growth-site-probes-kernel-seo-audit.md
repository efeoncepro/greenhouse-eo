# TASK-1670 — Growth: hallazgos de sitio (crawlers IA, JSON-LD, sitemap) en el audit SEO

## Delta 2026-09-01 — desbloqueada

El blocker eran los Slices 1+2 de `TASK-1697` (el `git mv` del sustrato + su test de frontera).
Esa task cerró el 2026-08-27: `src/lib/growth/site-substrate/` existe con su carta y su rule angosta.
El campo queda en `none`; la razón vive acá y no en el campo, porque el guard `stale-blocker` lee la
línea completa y una explicación que nombre al blocker cerrado se reporta como bloqueo vigente.


## Delta 2026-08-27 (2) — DESBLOQUEADA: TASK-1697 cerró (Slices 1+2 y también 3+4)

El sustrato existe en `@/lib/growth/site-substrate` (barrel: `createSiteFetcher`,
`resolveSubjectSite`, parseo HTML/robots, tipos `Site*`) con carta verificable y la lint rule
`greenhouse/growth-substrate-boundary` en `error` — el deep import a `ai-visibility/probes/**`
que esta task podía escribir mañana hoy rompe el build. Esta task consume el sustrato por el
barrel; su bloqueante de CIERRE sigue siendo `TASK-1671` (el flip, no el merge).

## Delta 2026-08-27 — el chequeo de borde vuelve a ser implementable: TASK-1778 Slice 4b entregó el override

- `ProbeFetchInit.userAgent` existe (TASK-1778, **ya desplegada**: rollout ejecutado 2026-08-27 en el
  ops-worker con `GROWTH_PROBE_FETCH_STRICT_NETWORK_ENABLED` ON, también ON en Vercel staging): el
  chequeo de borde se
  implementa variando **nuestro** token (p.ej. `GreenhouseAEOGrader-EdgeCheck/1.0`), y lo que se mide
  es si el borde nos trata **distinto**, no si podemos hacernos pasar por otro bot. Suplantar
  `GPTBot`/`OAI-SearchBot` sigue prohibido (postura declarada en el contrato del fetcher).
- El punto del sitemap del Delta 2026-08-26 también quedó resuelto: `resolveProbeUrl` ya acepta la
  **familia del sujeto** (`apex ↔ www` + upgrade `http → https`) **y los subdominios descendientes
  del sujeto** (regla extendida con evidencia real de cartera:
  `www.bancochile.cl → 301 → sitiospublicos.bancochile.cl`), así que un `<loc>` en `www.` sobre
  sujeto apex ya no reporta «no verificado» falso.
- Ojo adicional heredado de 1778: el fetcher ahora **obedece `robots.txt`** (matching contra nuestro
  token, fallback `*`). Un chequeo de esta task sobre una ruta que el sitio nos prohíba volverá
  `blocked_robots` — eso es un hallazgo del carril, no un bug del kernel.

## Delta 2026-08-15 (2) — decisión de secuencia verificada: se desbloquea parcialmente, y dos correcciones de oficio

Cuatro especialistas resolvieron la secuencia del lote. Cuatro cambios, en orden de peso.

### 1. `Blocked by: TASK-1697` se acota a **sus Slices 1+2**

`TASK-1697` se recortó a la mitad A: `git mv` del sustrato + test de frontera + una lint rule
angosta. **Lo único que esta task necesita de allá son los Slices 1+2** —que el sustrato exista en
`src/lib/growth/site-substrate/` con su carta—, y eso son **horas de trabajo**, no semanas. El Slice
3 (la lint rule) y el Slice 4 (documentación) de 1697 **corren en paralelo** con esta task.

Se declara explícito porque la lectura perezosa del `Blocked by` cuesta caro: bloquear esta task
contra los cuatro slices de 1697 sería **pagar el riesgo de una lint rule con retraso de la señal de
producto**, y la señal de producto acá es que un sitio invisible para los motores de IA deje de
puntuar 95/100.

### 2. 🔴 El bloqueante REAL del cierre del agujero es `TASK-1671`, no `TASK-1697`

Esta task nace con **flag default OFF**, y su propia regla dice que el flag no se prende hasta que
`TASK-1671` (superficie de hallazgos de sitio) esté desplegada. Consecuencia que hay que decir en voz
alta: **mergear esta task sin `TASK-1671` compra código con el detector apagado.** El agujero
—"un sitio con crawlers de IA bloqueados puntúa 95/100"— **sigue abierto** hasta el flip, no hasta el
merge. `Blocks` += `TASK-1671`, y el flip es el hito de cierre real.

### 3. 🔴 Retrieval ≠ training: la severidad heredada es incorrecta

El evaluador que esta task hereda (`evaluateRobotsForAiBots`) mete los 10 bots en una bolsa y saca un
score proporcional. Con la severidad que esta task declaraba —*"robots bloqueando retrieval →
`critical`"*— un sitio con el **retrieval completamente abierto** que sólo bloquea bots de
entrenamiento saldría `critical`. Eso es un falso positivo caro: bloquear `GPTBot` o
`Google-Extended` es una **postura de derechos legítima y frecuente**, no un defecto técnico, y
marcarla `critical` entrena al cliente a ignorar la severidad más alta del informe.

Corte correcto, que esta task debe implementar:

| Familia | Bots | Bloqueada ⇒ severidad |
|---|---|---|
| **Retrieval** (responder citando el sitio) | `OAI-SearchBot`, `PerplexityBot`, `ClaudeBot`, `Claude-SearchBot` | **`critical`** |
| **Training** (entrenar modelos) | `GPTBot`, `Google-Extended`, `CCBot`, `anthropic-ai` | **`notice`**, con lectura de postura — **nunca `critical`** |

Un bot que no cae limpio en una familia se clasifica explícitamente en Discovery; no se reparte por
defecto a `critical`.

### 4. 🔴 El chequeo de `robots.txt` no detecta la forma más común del bloqueo

Medición real sobre **12 dominios LatAm/CL** (2026-08-15): 3 con problema de acceso IA, y **2 de esos
3 bloquean en el borde/WAF, no en `robots.txt`** — devuelven **403 a `OAI-SearchBot`** con un
`robots.txt` perfectamente limpio. Un audit que sólo parsea `robots.txt` les diría **"acceso
correcto"**: exactamente el falso sano que esta task existe para cerrar, reproducido con nuestro
nombre encima.

Se agrega un chequeo barato al alcance: **`GET` del home con User-Agent de un bot de retrieval y
comparación del status contra el fetch normal.** Dos requests, cero gasto de proveedor. Si el fetch
con UA de bot devuelve 403/429 y el normal 200, el hallazgo es de **bloqueo en el borde**, con su
propio `issue_type` y su ficha es-CL — no se disfraza de hallazgo de `robots.txt`, porque la
remediación es distinta (WAF/CDN, no un archivo de texto).

### 5. Respuesta a la Open Question del sitemap: `notice`, no `warning`

En la misma muestra de 12 dominios, **3 de 12 devuelven 404 en `/sitemap.xml`** y declaran su índice
en la directiva `Sitemap:` del `robots.txt` — es decir, están **bien** y un `warning` sobre ellos
sería ruido. Regla: **`notice`** por defecto; **`warning`** sólo si el sitemap **declarado en
`robots.txt` está roto** (404/5xx/no parseable). La Open Question 3 queda resuelta.

`llms.txt` sigue correctamente **fuera** de alcance (97% de los sitios sin un solo request, Google no
lo usa). No se agrega.

## Delta 2026-08-08 — TASK-1309 cerrada

`TASK-1309` (Auditoría del sitio, `/admin/growth/seo/audit`) pasó a `complete`: suite completa en
10377/0, `pnpm build` de producción verde, `ui:quality` PASS 4.63. Lo que esta task da por existente
de 1309 —`groupAuditIssues`, las fichas es-CL de los checks con su drift test, `readSiteAuditReport`
con `run`/`findings`/`totals`/`previous`— **ya está en `develop` y verificado con datos reales de
Grupo Berel**, no es supuesto.

## Delta 2026-08-15 — la premisa de "cero deep imports" es falsa, y la superficie no es `probes/public.ts`

Fuente: `docs/audits/platform/2026-08-15-growth-seo-aeo-module-opportunity-audit.md` §1.3, §5.1,
§5.4 y §8.

🔴 **Se retira la premisa de "cero deep imports".** Verificado con `grep` sobre `develop` el
2026-08-15: `growth/seo` **ya importa hoy 10 símbolos internos** de `growth/ai-visibility`, desde dos
archivos productivos:

- `src/lib/growth/seo/grounded-query-reader.ts:15-19` → `ai-visibility/flags`,
  `.../prompt-packs/authoring/author-system-prompt`, `.../prompt-packs/prompt-set-command`,
  `.../prompt-packs/prompt-set-store`, `.../store`.
- `src/lib/growth/seo/grounded-query-bridge.ts:23-37` → esos mismos módulos más
  `.../brand-intelligence/store` y `.../prompt-packs/authoring/author-prompt-set`.

Cero imports en reversa —el DAG es direccionalmente limpio (SEO → AEO)—, pero **son deep imports, no
superficie pública**, y ninguna lint rule los vigila: la única regla cross-domain del repo
(`eslint.config.mjs:333`) protege al client-portal. La regla que esta task declaraba
—*"`growth/seo` consume EXCLUSIVAMENTE la superficie pública"*— describía una aspiración, no el
repo. Esta task **no amplía** ese acoplamiento; deja de fingir que no existe.

🔴 **La superficie tampoco es `probes/public.ts`.** Con `TASK-1697` —extracción del
sustrato (`safe-fetch.ts` + `html.ts` + sus tipos) a `src/lib/growth/site-substrate/` con re-export
shim, más la lint rule que lo blinda— esta task **deja de agregar archivo alguno al motor AEO**:
consume `@/lib/growth/site-substrate`. Y lo que consume no es "el probe layer" sino el **sustrato**,
exportado con nombres que lo digan (`SiteFetcher`, `analyzeDomSemantics`), **nunca `Probe`**. La
regla del audit §5.1 que ordena el corte: *se comparte cómo se OBTIENE la evidencia; nunca cómo se
JUZGA* — el juicio de los tres hallazgos se escribe en `growth/seo`.

Cambios aplicados al cuerpo: `Blocked by: TASK-1697`; `Files owned` sin archivo nuevo en
`ai-visibility/**`; Slice 1 reescrito; risk matrix con la lint rule de 1697 en lugar de "revisión de
código" —patrón canónico #7: **un deep import lo crea un commit, así que el detector es de CI**, no
de revisión humana—; y se retira el follow-up "extracción a `search-visibility/`", que la auditoría
§5.4 declara sobredimensionado y por eso condenado a no pasar nunca.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
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
- Epic: `EPIC-022`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `growth|data`
- Blocked by: `none`
- Branch: `Greenhouse develop; local-first, sin worktrees`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

El audit SEO pasa a detectar tres cosas que hoy no ve: **acceso de crawlers de IA** en
`robots.txt`, **ausencia** de JSON-LD y salud de sitemap. La evidencia se obtiene con el **sustrato
de sitio** que extrae `TASK-1697` (`@/lib/growth/site-substrate`: fetcher con guarda SSRF + parseo
HTML/texto) y el **juicio se escribe en `growth/seo`**: el collect del site audit los materializa
como **hallazgos de SITIO**, detrás de flag. Esta task **no agrega ni edita un solo archivo del
motor AEO**. Cierra el punto ciego más caro del audit: hoy un sitio que bloquea a los crawlers de
IA puntúa 95/100 y se presenta como sano.

## Why This Task Exists

El site audit (TASK-1304/1309) es un passthrough de DataForSEO OnPage, y OnPage **no cubre**
tres cosas que la doctrina 2026 pone en Capa 1:

1. **Acceso de crawlers de IA (en `robots.txt` y en el borde).** Bloquear `OAI-SearchBot` /
   `PerplexityBot` / `ClaudeBot` saca al sitio de las respuestas de los motores de IA. Evidencia
   medida: **−23,1% de tráfico total** en publishers que bloquearon crawlers IA, *sin* reducir de
   forma fiable las citas (Rutgers/Wharton, dic-2025). Para un módulo que se vende como
   **Search Visibility 360** —SEO *y* AEO— es la falla que invalida la mitad de la promesa.
   ⚠️ Dos precisiones del Delta 2026-08-15 (2), ambas medidas: **(a)** bloquear *training* no es lo
   mismo que bloquear *retrieval* y no puede compartir severidad; **(b)** la forma más común del
   bloqueo **no está en `robots.txt`** sino en el borde/WAF (403 al UA del bot con `robots.txt`
   limpio) — 2 de los 3 casos con problema en una muestra de 12 dominios LatAm/CL.
2. **Ausencia de JSON-LD.** El allowlist de `findings-map.ts` sólo detecta *errores* en marcado
   existente (`has_micromarkup_errors`), no su ausencia — y a propósito: la regla del módulo
   prohíbe invertir checks positivos del proveedor por passthrough.
3. **Salud de sitemap.**

Los tres **ya se evalúan, probados**, en el probe layer del grader AEO (TASK-1266, `complete`), y su
insumo —fetch guardado + parseo— es exactamente el sustrato que `TASK-1697` deja disponible para
ambos motores.

Y hay una razón de secuencia: el entregable descargable/compartible de la auditoría (que el
cliente reenvía a una agencia) **no debe nacer omitiendo esto**. Un artefacto con nuestro
nombre que declara sano un sitio invisible para la IA es peor que no tener artefacto.

## Goal

- El audit detecta los hallazgos, **sin agregar ni tocar un solo archivo del grader AEO**.
- Degradación honesta: un fetch fallido dice "no pudimos verificar", NUNCA "pasó".
- **Bloqueo de retrieval** (`OAI-SearchBot`, `PerplexityBot`, `ClaudeBot`, `Claude-SearchBot`) entra
  como **`critical`**; bloqueo de **training** (`GPTBot`, `Google-Extended`, `CCBot`,
  `anthropic-ai`) entra como **`notice`** con lectura de postura, **nunca `critical`**.
- El audit detecta también el **bloqueo en el borde/WAF** —403 al UA de un bot de retrieval con
  `robots.txt` limpio—, que es la forma más común del problema en la muestra medida.
- Sitemap ausente: **`notice`**; `warning` sólo si el sitemap declarado en `robots.txt` está roto.
- Cero gasto de proveedor: son fetches propios, no DataForSEO.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md` — §1.1 (boundary SEO↔AEO),
  §3/§6 (site audit OnPage, degradación honesta), §10.6 (superficie de auditoría, TASK-1309).
- `docs/tasks/complete/TASK-1266-growth-ai-visibility-site-readiness-probe-layer.md` — el probe
  layer del grader, del que sale el sustrato que `TASK-1697` extrae.
- `docs/audits/platform/2026-08-15-growth-seo-aeo-module-opportunity-audit.md` — §1.3 (los 10 deep
  imports medidos), §5.1 (qué se comparte y qué no), §5.4 (correcciones a esta task).
- `docs/operations/MODULAR_MIGRATION_NEW_WORK_OPERATING_MODEL_V1.md`
- `.claude/skills/seo-aeo/modules/01_SEO_TECHNICAL.md` — §6 (crawlers IA), §5 (datos
  estructurados), §2 (indexación/sitemaps).

Reglas obligatorias:

- 🔴 **El consumo es del sustrato, no del probe layer.** `growth/seo/**` importa de
  `@/lib/growth/site-substrate` (entregado por `TASK-1697`) con nombres de sustrato
  (`SiteFetcher`, `analyzeDomSemantics`), **nunca `Probe`/`ProbeContext`/`ProbeOutcome`** y nunca
  `ai-visibility/probes/**` directo. Estado medido al 2026-08-15: `growth/seo` ya arrastra 10 deep
  imports de `ai-visibility` en `grounded-query-{reader,bridge}.ts` — esta task **no suma ni uno**,
  y su limpieza es de `TASK-1697` (lint rule), no de aquí.
- 🔴 **Se comparte cómo se OBTIENE la evidencia; nunca cómo se JUZGA** (audit §5.1). El fetch y el
  parseo son sustrato compartido; la severidad, el vocabulario de `issue_type` y la ficha es-CL de
  cada hallazgo viven en `growth/seo`. Duplicar un evaluador determinista es aceptable; compartir un
  juicio versionado no lo es.
- 🔴 **Cero archivos nuevos o editados en `ai-visibility/**` en esta task.** Cualquier cambio dentro
  del motor AEO —incluida la extracción del sustrato— pertenece a `TASK-1697`.
- **La frontera §1.1 SEO↔AEO se mantiene**: prohíbe JOIN/VIEW/FK entre tablas `seo_*` y
  `grader_*`. Acá no se cruza ninguna tabla — los probes son funciones puras sobre HTTP y cada
  motor persiste su outcome en las suyas (`grader_*` para AEO, `seo_site_audit_findings` para
  SEO). **NUNCA** darle persistencia propia a la superficie compartida.
- **NUNCA** un fetch fallido se materializa como ausencia de problema. `skipped`/`failed`
  llegan al reporte como "no verificado", con su razón.
- El fetcher conserva su **guarda SSRF** y el acotamiento al dominio del sujeto.

## Normative Docs

- `docs/tasks/TASK_BACKEND_DATA_ADDENDUM.md`
- `docs/architecture/GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_CANONICAL_PATTERNS_V1.md` — patrón flag default-OFF + shadow + flip.

## Dependencies & Impact

### Depende de

- **`TASK-1697`, Slices 1+2 únicamente** — bloqueo duro pero **corto**: el `git mv` del sustrato a
  `src/lib/growth/site-substrate/` (fetcher SSRF-guarded + parseo HTML, con re-export shim para que
  los dependientes del motor AEO no cambien una línea) y su test de frontera por allowlist. Sin eso
  esta task volvería a inventar una superficie dentro del motor AEO, que es lo que la auditoría §5.4
  corrige. **El Slice 3 de 1697 (lint rule angosta) y su Slice 4 (documentación) NO bloquean**: son
  guardrail y cierre, y esta task puede arrancar en paralelo con ellos.
- ⚠️ El barrel de dominio AEO y la lint rule **universal** salieron de `TASK-1697` a una task
  hermana **`TASK-1713`** (**no** `TASK-1710`, que está tomada por el umbrella de remediación de
  confiabilidad). Nada de eso bloquea a esta task: acá el consumo es del **sustrato**, no del barrel.
- `TASK-1266` — probe layer estructural (`complete`, EPIC-021). Origen de los tres evaluadores.
- `TASK-1304` — `collectSiteAuditRuns` + `seo_site_audit_findings` (`complete`).

### Blocks / Impacts

- 🔴 **`TASK-1671`** (superficie de hallazgos de sitio) — **es el bloqueante real del cierre del
  agujero, no `TASK-1697`.** Los hallazgos de sitio necesitan tratamiento propio en
  `/admin/growth/seo/audit`: hoy la lista cuenta "páginas afectadas" y un hallazgo de sitio mostraría
  "1 página afectada", que es falso. Ése es el motivo del flag — y la consecuencia es que **mergear
  esta task sin 1671 compra código con el detector apagado**. El hito de cierre del punto ciego es el
  **flip del flag**, que ocurre con 1671 desplegada; no el merge de esta task.
- El artefacto descargable de la auditoría (aún sin task) — no debería nacer sin esta cobertura.
- `TASK-1281` (headless runtime) — NO se toca: `core_web_vitals` queda **fuera de alcance**.

### Files owned

- `src/lib/growth/seo/site-audit/site-findings.ts` `[archivo NUEVO; nombre final en Discovery]` —
  evalúa los tres hallazgos de sitio sobre el sustrato. Vive en `growth/seo`, no en el motor AEO.
- `src/lib/growth/seo/site-audit/collect.ts` — materializa hallazgos de sitio
- `src/lib/growth/seo/site-audit/findings-map.ts` — allowlist de los `issue_type` nuevos
- `src/lib/copy/growth.ts` — fichas es-CL de los checks nuevos (el drift test de TASK-1309 las exige)

## Current Repo State

### Already exists

- `src/lib/growth/ai-visibility/probes/structural/{robots-txt,json-ld,sitemap}.ts` con
  `AI_CRAWLERS` (`GPTBot`, `OAI-SearchBot`, `PerplexityBot`, `ClaudeBot`, `Google-Extended`) y
  `evaluateRobotsForAiBots`.
- `src/lib/growth/ai-visibility/probes/{contracts,safe-fetch,html}.ts` — el sustrato:
  `Probe`/`ProbeContext`/`ProbeOutcome`, fetcher SSRF-guarded, parseo HTML. **Medido: lo usan
  23 archivos del probe layer** (agentic, entity, gatherer, registry, store, command). `safe-fetch`
  es `server-only`, puro sobre HTTP y sin una sola referencia a `grader_*`; `html.ts` no importa
  nada. Por eso `TASK-1697` los puede mover con re-export shim sin tocar esos 23 archivos.
- **Deep imports ya existentes de `growth/seo` hacia `growth/ai-visibility`** (medidos 2026-08-15):
  10 símbolos internos desde `grounded-query-reader.ts:15-19` y `grounded-query-bridge.ts:23-37`.
  Contexto, no permiso: esta task no agrega ninguno.
- `src/lib/growth/seo/site-audit/collect.ts` — el paso donde se materializan findings.
- `GH_GROWTH_SEO_AUDIT_ISSUES` (`src/lib/copy/growth.ts`) + su test de drift bidireccional
  contra `findings-map.ts`: **un check nuevo sin ficha rompe el test**, por diseño.
- Red de seguridad del motor AEO: **643 tests en 89 archivos**, verdes al 2026-08-08.

### Gap

- **`src/lib/growth/site-substrate/` no existe** (verificado 2026-08-15). Sin él, cualquier
  consumidor externo tendría que hacer deep import — que es exactamente el estado actual del módulo.
- Ninguna lint rule vigila imports cross-dominio dentro de `growth/*`: la única del repo
  (`eslint.config.mjs:333`) protege al client-portal.
- El collect del site audit sólo materializa findings de PÁGINA desde OnPage.
- `seo_site_audit_findings` no distingue hallazgo de sitio vs de página.

## Modular Placement Contract

- Topology impact: `none`
- Current home: `src/lib/growth/seo/site-audit/` — el código de esta task vive completo ahí. El
  sustrato vive en `src/lib/growth/site-substrate/`, propiedad de `TASK-1697`.
- Future candidate home: `remain-shared`
- Rationale del candidate home: el sustrato es un primitive chico y domain-free (fetch + parseo) que
  ya tiene tres consumidores —site audit SEO, probe layer AEO y `fetch-site-content.ts` dentro del
  propio grader—; ese es el umbral de patrón canónico. La reorganización grande (SEO y AEO como
  sub-motores de un paraguas) queda descartada, no diferida.
- Boundary: `@/lib/growth/site-substrate` es la única superficie que esta task consume fuera de su
  dominio. Los internals de `ai-visibility/probes/**` siguen siendo privados y esta task no los
  toca.
- Server/browser split: **server-only** — hace fetch saliente con guarda SSRF; nunca al bundle cliente.
- Build impact: `none` — el alcance excluye `core_web_vitals`, único probe que arrastra
  Chromium/Lighthouse.
- Extraction blocker: `none`

## Backend/Data Contract

- Backend rigor: `backend-standard`
- Impacto principal: `integration`
- Source of truth afectado: `greenhouse_growth.seo_site_audit_findings` (escritura nueva).
- Consumidores afectados: `cron` (collect en ops-worker), `UI` (TASK-1309), `MCP`/lane ecosystem
  (`site-audit-report`, vía el mismo reader).
- Runtime target: `worker` (el collect corre en ops-worker) + `local`/`staging` para verificación.

### Contrato

- Contrato existente a respetar: el sustrato de `TASK-1697` (`SiteFetcher`, `analyzeDomSemantics`) —
  **se consume, no se modifica**; `readSiteAuditReport` (TASK-1304), cuyo shape **no cambia**: los
  hallazgos de sitio son filas más de `seo_site_audit_findings`.
- Contrato nuevo o modificado: los evaluadores de hallazgo de sitio dentro de `growth/seo` +
  `issue_type` nuevos en el allowlist + marca de alcance sitio/página.
- Backward compatibility: `gated` — flag default OFF; apagado, el collect se comporta como hoy.
- Full API parity: sin ruta ni tool nuevas. Los hallazgos viajan por el reader canónico, así que
  UI, Nexa y el lane MCP los reciben por construcción.

### Datos e invariantes

- Entidades/tablas/views afectadas: `greenhouse_growth.seo_site_audit_findings`
- Invariantes que no se pueden romper:
  - un fetch `skipped`/`failed` **NUNCA** se materializa como ausencia de problema;
  - los hallazgos de sitio **no** se cuentan como "páginas afectadas";
  - `seo_site_audit_findings` sigue append-only por run (triggers de TASK-1299);
  - el sustrato **no persiste nada, no importa nada de `growth/*` y no tiene flags de dominio**
    (regla dura de `TASK-1697`, verificable por lint; mismo patrón que `artifact-composer`).
- Tenant/space boundary: hereda la del run — `seo_target_id` → `organization_id`.
- Idempotency/concurrency: el collect ya es idempotente por `audit_run_id`; los hallazgos de
  sitio entran en la misma pasada con `ON CONFLICT DO NOTHING` (los triggers de 1299 prohíben
  `DO UPDATE` en tablas snapshot).
- Audit/outbox/history: sin evento nuevo — el run ya emite el suyo al materializar.

### Migración y rollback

- Migration posture: `additive` `[confirmar en Discovery si hace falta columna de alcance]`
- Default state: `flag OFF`
- Backfill plan: **ninguno**. Los runs históricos no se reprocesan: un run es un snapshot
  inmutable de lo que se midió ese día, y agregarle hallazgos a posteriori sería reescribir
  historia (invariante de TASK-1299).
- Rollback path: flag a OFF + redeploy del worker. Los hallazgos ya materializados quedan
  (append-only); la UI deja de mostrarlos con su propio flag.
- External coordination: env var del flag en **ops-worker (`deploy.sh`, SoT declarativo)** y en
  Vercel si el reader/lane lo consulta; fila en `FEATURE_FLAG_STATE_LEDGER.md`.

### Seguridad y errores

- Auth/access gate: sin superficie nueva de usuario. El collect corre con el actor del cron; la
  lectura sigue gateada por `growth.seo.observation.read` + `module_assignment`.
- Sensitive data posture: sin PII. Se fetchea contenido público del sitio del cliente.
- Error contract: los probes **nunca lanzan** (contrato de TASK-1266); errores a
  `captureWithDomain(err, 'growth', ...)`. Sin prosa cruda al cliente.
- Abuse/rate-limit posture: fetcher SSRF-guarded acotado al dominio del sujeto, con timeout. Un
  probe lento **no puede** colgar el collect: presupuesto de tiempo por probe.

### Evidencia runtime

- Ejercitar los 3 probes contra dominios reales (Berel y efeoncepro.com) y comparar el outcome
  materializado con el `robots.txt` y el sitemap reales.
- Verificar el camino de degradación: dominio inalcanzable → "no verificado", no "sano".
- Confirmar que con el flag OFF el collect materializa exactamente lo mismo que hoy.
- Confirmar que la suite del motor AEO sigue en 643/643 **sin haber editado ni agregado ninguno de
  sus archivos** (`git diff --stat -- src/lib/growth/ai-visibility` vacío).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE (no llenar al crear)
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Evaluadores de hallazgo de sitio sobre el sustrato

- Archivo NUEVO **en `growth/seo/site-audit/`** que consume `@/lib/growth/site-substrate`
  (`SiteFetcher` + `analyzeDomSemantics`, entregados por los Slices 1+2 de `TASK-1697`) y evalúa los
  hallazgos: acceso de crawlers de IA en `robots.txt`, **acceso real en el borde**, ausencia de
  JSON-LD y salud de sitemap.
- 🔴 **Clasificación por familia, no bolsa única.** El evaluador separa **retrieval**
  (`OAI-SearchBot`, `PerplexityBot`, `ClaudeBot`, `Claude-SearchBot`) de **training** (`GPTBot`,
  `Google-Extended`, `CCBot`, `anthropic-ai`) y emite un resultado por familia. El score proporcional
  sobre los 10 bots juntos que hereda de `evaluateRobotsForAiBots` **no se reusa tal cual**: es el que
  haría que un sitio con retrieval abierto salga `critical` por bloquear entrenamiento.
- 🔴 **Chequeo de acceso en el borde** (nuevo, barato): `GET` del home con User-Agent de un bot de
  retrieval y comparación del status contra el fetch normal. Dos requests, cero gasto de proveedor.
  403/429 con UA de bot + 200 normal ⇒ hallazgo **de borde/WAF**, con `issue_type` propio — nunca
  disfrazado de hallazgo de `robots.txt`, porque la remediación es otra (CDN/WAF, no un archivo).
- **Cero archivos** agregados o editados en `ai-visibility/**`. Prueba:
  `git diff --stat -- src/lib/growth/ai-visibility` sale vacío.
- Los 643 tests del motor siguen verdes sin tocarse.

### Slice 2 — Hallazgos de sitio en el collect del audit

- Tras materializar los findings de página, el collect evalúa los hallazgos contra el dominio del
  target y los materializa como hallazgos de sitio, detrás de flag.
- **Severidades canónicas** (corregidas por el Delta 2026-08-15 (2)):

  | Hallazgo | Severidad |
  |---|---|
  | Retrieval bloqueado en `robots.txt` | **`critical`** |
  | Retrieval bloqueado en el borde (403/429 al UA de bot) | **`critical`** |
  | Training bloqueado (sólo), retrieval abierto | **`notice`** con lectura de postura |
  | JSON-LD ausente | `warning` |
  | Sitemap ausente en `/sitemap.xml` | **`notice`** |
  | Sitemap **declarado en `robots.txt`** y roto (404/5xx/no parseable) | `warning` |

- Un fetch `skipped`/`failed` se materializa como "no verificado" con su razón, distinguible de
  "verificado y sano".
- Fichas es-CL de los `issue_type` nuevos en `GH_GROWTH_SEO_AUDIT_ISSUES` (el test de drift de
  TASK-1309 falla hasta que existan — es el guardrail, no un obstáculo). La ficha de **training
  bloqueado** se redacta como postura, no como defecto: bloquear entrenamiento es una decisión de
  derechos legítima y el copy no puede sonar a error.

### Slice 3 — Verificación runtime + ledger

- Ejercitar contra Berel y efeoncepro.com; comparar contra el `robots.txt` real de cada uno.
- **Verificar el caso de borde con un dominio que responde 403 al UA de bot con `robots.txt` limpio**
  — es la forma más común del problema en la muestra medida (2 de los 3 casos), y es exactamente el
  falso sano que esta task existe para cerrar.
- Camino de degradación verificado con un dominio inalcanzable.
- Fila del flag en `FEATURE_FLAG_STATE_LEDGER.md` + runbook de qué runtime lo lee.

## Out of Scope

- **Extraer o mover el sustrato.** Eso es `TASK-1697` y es su bloqueo duro: mover
  `safe-fetch`/`html` a `growth/site-substrate/` con re-export shim (los 23 archivos del motor AEO
  no cambian una línea) + la lint rule. Esta task lo **consume**, no lo mueve.
- **Limpiar los 10 deep imports existentes** de `grounded-query-{reader,bridge}.ts`. Son previos a
  esta task y su dueño es la lint rule de `TASK-1697`; arrastrarlos acá mezclaría dos cambios de
  riesgo distinto.
- **`core_web_vitals`**: es Lighthouse (**laboratorio**), igual que lo que OnPage ya da. La
  doctrina es explícita en que Google rankea con **campo** (CrUX), y la señal de campo del
  módulo viene de GSC. Sumarlo agregaría una segunda medición de lab, cero verdad nueva, y
  arrastraría Chromium headless al alcance.
- **`llms-txt`**: la doctrina lo marca como ROI marginal y Google no lo usa.
- **La UI de los hallazgos de sitio** → `TASK-1671`. Por eso el flag.
- El artefacto descargable de la auditoría (task aparte).
- Tocar el scoring del grader AEO o sus ejes.
- Reprocesar runs históricos.

## Detailed Spec

**Por qué sustrato y no superficie pública del motor AEO.** La versión previa de esta task proponía
declarar una superficie pública **dentro** de `ai-visibility/probes/` (`probes/public.ts`). La
auditoría del 2026-08-15 (§5.4) la corrigió por dos razones concretas:

1. **El nombre miente sobre lo que se comparte.** Un `Probe`/`ProbeOutcome` es vocabulario del
   grader: trae consigo un contrato de ejecución episódico con review gate humano. Lo que el site
   audit necesita es mucho más chico —fetch guardado y parseo de DOM/texto— y se llama
   `SiteFetcher` / `analyzeDomSemantics`. Compartir el nombre grande invita a compartir el juicio,
   que es justo lo que **no** debe compartirse: un `score_version` común haría que recalibrar SEO
   invalidara reportes AEO ya entregados a clientes. Puerta de una sola dirección.
2. **La extracción real es barata y ya tiene su tercer consumidor.** No son "23 archivos movidos":
   son 2 archivos puros + sus tipos a `growth/site-substrate/` con re-export shim, y los 23 archivos
   del motor **no cambian una línea**. El disparador ya existe dentro del propio grader:
   `fetch-site-content.ts:15` reusa `createProbeFetcher` y su docstring declara que el probe es
   técnico y no extrae prosa. Tres consumidores = umbral de patrón canónico. Eso es `TASK-1697`.

Costo declarado: `growth/seo` pasa a depender de `growth/site-substrate`, que es domain-free y no
persiste nada — a diferencia de la dependencia SEO → AEO que la versión anterior habría formalizado.
Los 10 deep imports que hoy existen entre esos dos dominios (medidos, §1.3 del audit) siguen ahí y
son problema de `TASK-1697`, no de esta task.

**Por qué los hallazgos son de SITIO.** Un `robots.txt` no pertenece a una página: es del
dominio. Materializarlo con la URL raíz y contarlo como "1 página afectada" sería falso, y por
eso el consumidor UI es prerequisito del flip del flag.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- **Slices 1+2 de `TASK-1697` mergeados** (sustrato + su carta) → Slice 1 (evaluadores) → Slice 2
  (collect) → Slice 3 (verificación). Empezar el Slice 1 sin el sustrato obliga a improvisar una
  superficie dentro del motor AEO, que es el error que el delta del 2026-08-15 corrige. El Slice 3 de
  1697 (lint rule angosta) puede entrar antes, después o en paralelo: es guardrail, no dependencia.
- Slice 2 **NO** puede shippear sin su flag: sin `TASK-1671`, la UI renderizaría un hallazgo de
  sitio como "1 página afectada", que es falso.
- 🔴 **El flag NO se prende hasta que `TASK-1671` esté desplegada — y hasta ese momento el punto
  ciego sigue abierto.** Mergear esta task no cierra el agujero; lo cierra el flip. No declarar el
  agujero cerrado en Handoff/changelog antes del flip verificado en producción.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Romper el grader AEO | AEO / grader | **low** | Cero archivos agregados o editados en `ai-visibility/**`, verificable con `git diff --stat`. Los 643 tests del motor corren sin tocarse | suite `ai-visibility` en CI |
| Un deep import cross-dominio se cuela (a `ai-visibility/**` o desde el sustrato hacia `growth/*`) | AEO / grader | medium | **Lint rule de `TASK-1697`** en CI, no revisión humana: un deep import lo crea un commit, así que el detector es de CI (patrón canónico #7). La regla dura de Architecture Alignment es la doctrina; el gate es la lint | `pnpm lint` en CI (regla cross-domain de `growth/*`) |
| Un fetch lento cuelga el collect y el cron se pasa de ventana | cron / ops-worker | medium | Presupuesto de tiempo por hallazgo + contrato "nunca lanza" | `seo.audit.stuck_tasks` |
| Un fetch fallido se lee como "sitio sano" | data quality | **high si no se cuida** | Estado "no verificado" explícito, distinto de verificado-y-sano; invariante declarada | verificación runtime del slice 3 |
| **Un sitio bloqueado en el borde/WAF sale "acceso correcto"** porque el audit sólo parsea `robots.txt` | data quality / reputación | **high** — medido: 2 de los 3 casos con problema en una muestra de 12 dominios LatAm/CL (2026-08-15) | Chequeo de acceso real: `GET` del home con UA de bot de retrieval vs fetch normal, con `issue_type` propio | Un dominio con `robots.txt` limpio y 403 al UA de bot que el audit declara sano |
| **Un sitio que sólo bloquea training sale `critical`** y el cliente aprende a ignorar la severidad más alta | data quality / reputación | **high si se hereda el evaluador tal cual** | Separación explícita retrieval vs training, con `notice` + lectura de postura para training | Un hallazgo `critical` en un sitio con `OAI-SearchBot` permitido |
| El flag se prende antes de `TASK-1671` y la UI muestra "1 página afectada" | UI / confianza | medium | Orden duro declarado; el flip es el hito de cierre, no el merge | GVC de 1671 antes del flip |
| Hallazgo de sitio contado como "1 página afectada" | UI | high | Flag OFF hasta que `TASK-1671` renderice el alcance correcto | GVC de 1671 |
| Fetch saliente a un host no deseado (SSRF) | seguridad | low | Se reusa el `SiteFetcher` guarded tal cual —un solo dueño, sin copia: una guarda SSRF divergente es alta y no observable—; el dominio lo resuelve el caller desde `seo_targets` | tests del sustrato en CI + lint que prohíbe un fetcher paralelo |

### Feature flags / cutover

- Flag nuevo `[nombrar en Discovery]`, default **OFF**, leído por el **ops-worker** (donde corre
  el collect). ⚠️ Declararlo en `services/ops-worker/deploy.sh` (SoT declarativo:
  `--set-env-vars` es destructivo y borra lo agregado out-of-band) **y** aplicarlo en vivo con
  `gcloud run services update` para efecto inmediato. Fila en `FEATURE_FLAG_STATE_LEDGER.md`.
- Cutover: OFF → shadow (materializa, UI no muestra) → flip cuando `TASK-1671` esté viva.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | borrar el archivo nuevo de `growth/seo/site-audit/`; nada más lo referencia todavía | <5 min | si |
| Slice 2 | flag a OFF + redeploy worker | <10 min | si (los hallazgos ya escritos quedan; son append-only) |
| Slice 3 | sin rollback propio: sólo verifica y documenta, additive y sin impacto de runtime | — | no aplica |

### Production verification sequence

1. Flag OFF en producción: confirmar que el collect materializa lo mismo que antes.
2. Flag ON en staging: correr el collect contra Berel; comparar los hallazgos contra el
   `robots.txt` y el sitemap reales del sitio.
3. Verificar degradación honesta con un dominio inalcanzable.
4. Confirmar `seo.audit.stuck_tasks` estable tras varios ciclos.
5. Recién entonces, con `TASK-1671` desplegada, flip en producción.

### Out-of-band coordination required

- Env var del flag en ops-worker (`deploy.sh` + `gcloud run services update`).
- Ninguna configuración de proveedor: no toca DataForSEO ni suma gasto.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Se declaró `Execution profile: backend-data` y `Backend impact: integration`.
- [ ] `git diff --stat -- src/lib/growth/ai-visibility` sale **vacío**: cero archivos agregados o
      editados en el motor AEO.
- [ ] La suite del motor AEO sigue verde (643 tests) **sin tocar ninguno de sus archivos**.
- [ ] `growth/seo/**` no importa nada de `ai-visibility/probes/**`: el consumo es de
      `@/lib/growth/site-substrate`, y la lint rule de `TASK-1697` lo verifica en CI.
- [ ] El código nuevo usa vocabulario de sustrato (`SiteFetcher`, `analyzeDomSemantics`) y **no**
      `Probe`/`ProbeContext`/`ProbeOutcome`.
- [ ] El sustrato no persiste nada, no importa nada de `growth/*` y no recibe tablas propias.
- [ ] El collect materializa los hallazgos de sitio detrás de flag; con el flag OFF el
      comportamiento es idéntico al actual.
- [ ] `robots.txt` que bloquea **retrieval** se materializa como **`critical`**.
- [ ] Un sitio que bloquea **sólo training** con retrieval abierto se materializa como **`notice`**
      con lectura de postura, y **jamás** como `critical` — verificado con un caso real.
- [ ] Existe el chequeo de **acceso en el borde**: `GET` del home con UA de bot de retrieval
      comparado contra el fetch normal, con `issue_type` propio, distinto del de `robots.txt`.
- [ ] Un dominio con `robots.txt` limpio que devuelve 403/429 al UA de un bot de retrieval **no**
      se declara sano — verificado contra un caso real de la muestra.
- [ ] Sitemap ausente en `/sitemap.xml` es **`notice`**; sólo el sitemap declarado en `robots.txt` y
      roto es `warning`.
- [ ] Un fetch `skipped`/`failed` se materializa como "no verificado" con razón, distinguible de
      "verificado y sano" — verificado contra un dominio inalcanzable.
- [ ] Los `issue_type` nuevos tienen ficha es-CL en `GH_GROWTH_SEO_AUDIT_ISSUES` y el test de
      drift bidireccional de TASK-1309 pasa.
- [ ] Los hallazgos de sitio NO se cuentan como "páginas afectadas".
- [ ] Evidencia runtime contra Berel y efeoncepro.com, comparada con el `robots.txt` real.
- [ ] Fila del flag en `FEATURE_FLAG_STATE_LEDGER.md` con el runtime que lo lee declarado.
- [ ] El cierre distingue **merge** de **flip**: mientras el flag esté OFF, el estado declarado es
      `code complete, rollout pendiente` y el punto ciego **sigue abierto**. El agujero se declara
      cerrado sólo con `TASK-1671` desplegada y el flip verificado en producción.
- [ ] `core_web_vitals` y `llms-txt` NO entran al alcance.

## Verification

- `pnpm local:check`
- `pnpm test`
- `pnpm vitest run src/lib/growth/ai-visibility src/lib/growth/seo`
- `pnpm task:lint --task TASK-1670`
- `pnpm docs:closure-check`

## Closing Protocol

- [ ] `Lifecycle` sincronizado (`in-progress`/`complete`)
- [ ] archivo en la carpeta correcta
- [ ] `docs/tasks/README.md` + `TASK_ID_REGISTRY.md` sincronizados
- [ ] `Handoff.md` + `changelog.md` actualizados
- [ ] `GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md` §10.6 actualizado (la cobertura declarada como
      faltante pasa a existir)
- [ ] `FEATURE_FLAG_STATE_LEDGER.md` con el flag y su runtime

## Delta 2026-08-26 — el chequeo de borde, como está escrito, no es implementable y además contradice una postura declarada

Dos bloqueadores externos, verificados contra el código:

1. **`ProbeFetchInit` no acepta override de User-Agent.** El UA es constante de módulo
   (`safe-fetch.ts:25`, `COURTESY_USER_AGENT`) y el contrato sólo expone `accept`, `timeoutMs` y
   `maxBytes`. Esta task declara **cero ediciones sobre `ai-visibility/**`**, y `TASK-1697` prohíbe
   tocar comportamiento en su diff de movimiento. El parámetro se agrega en **`TASK-1778` Slice 4b**,
   que es la task que sí cambia comportamiento sobre ese archivo.
2. 🔴 **La postura contradice el Slice 1.** `TASK-1778` declara que matchea **nuestro** token de UA y
   **nunca** los de los bots de IA que auditamos — *«o "actuar como" GPTBot para probar»* está
   explícitamente descartado: es suplantación, algunos WAF la verifican por DNS inverso, y aparecer
   como evasor tiene costo reputacional. El Slice 1 de esta task dice hacer `GET` del home **con UA
   de un bot de retrieval**. Las dos no pueden ser ciertas.

**Corrección de alcance:** el chequeo de borde se hace con **nuestro token variado**, y lo que mide es
si el borde nos trata distinto que a un navegador — no si podemos hacernos pasar por otro. Si el
negocio necesita responder *«¿está ChatGPT bloqueado en este sitio?»* con certeza, eso se responde
leyendo `robots.txt` y las reglas del WAF cuando el cliente las comparte, no suplantando.

**Y el sitemap cross-host.** `resolveProbeUrl` exige igualdad exacta de hostname, así que un sitemap
declarado como `https://www.ejemplo.com/sitemap.xml` con target `ejemplo.com` devuelve `blocked` y el
chequeo reporta «no verificado» sobre un sitemap sano. `TASK-1778` Slice 1 ya lo resuelve aceptando la
familia `apex ↔ www`; esta task lo **consume**, no lo implementa.

Origen: `docs/audits/platform/2026-08-26-openseo-competitive-teardown-growth-seo-aeo.md` §3.9.

## Follow-ups

- `TASK-1671` `[por crear]` — consumer UI de los hallazgos de sitio en `/admin/growth/seo/audit`.
- Artefacto descargable/compartible de la auditoría: el cliente no ejecuta, reenvía a una
  agencia; el documento debe llevar la procedencia consigo y no debería nacer sin esta cobertura.

> **Retirado el 2026-08-15:** el follow-up *"extracción del sustrato al paraguas
> `search-visibility/`"*. La auditoría §5.4 y §6 lo declaran **sobredimensionado** —mover ~70
> archivos por estética, con SEO y AEO como sub-motores de un paraguas— y por eso condenado a no
> pasar nunca. El movimiento que sí corresponde es chico y ya tiene dueño: `TASK-1697` mueve 2
> archivos puros + sus tipos a `growth/site-substrate/` con re-export shim. El veredicto de la
> auditoría es **dominios separados para siempre**: lo único compartible es cómo se obtiene la
> evidencia.

## Open Questions

1. **¿`evaluateRobotsForAiBots` se duplica o se comparte?** El evaluador de `robots.txt` para bots
   de IA es determinista, chico y hoy vive en `ai-visibility/probes/structural/robots-txt.ts`. La
   regla del audit §5.1 dice que se comparte cómo se obtiene la evidencia y nunca cómo se juzga,
   pero este evaluador está en la frontera: no puntúa nada, sólo lee directivas. Propuesta:
   **duplicarlo en `growth/seo`** —el costo de que diverja es bajo y observable, mientras que el
   costo de que SEO herede el vocabulario `Probe` del grader es el acoplamiento que este delta
   acaba de retirar—. Decidir en Discovery, con `TASK-1697` ya mergeada y su frontera a la vista.
2. **Cómo se marca el alcance sitio vs página.** ¿Columna nueva en `seo_site_audit_findings`
   (migración aditiva) o convención en `detail`? La columna es más honesta y consultable; el
   `detail` evita migración. Propuesta: columna, porque el alcance es una propiedad del hallazgo
   y esconderlo en un JSON lo vuelve invisible para cualquier consumer que no lo sepa leer.
3. ~~¿`sitemap` merece `warning` o `notice`?~~ **RESUELTA — `notice`** (Delta 2026-08-15 (2)). En una
   muestra medida de 12 dominios LatAm/CL, **3 de 12** devuelven 404 en `/sitemap.xml` y declaran su
   índice en la directiva `Sitemap:` del `robots.txt`: están bien, y un `warning` sobre ellos sería
   ruido que erosiona la lista priorizada. `warning` queda reservado para el sitemap **declarado en
   `robots.txt` y roto**, que sí es un defecto verificable.
4. ¿Qué familia le corresponde a un bot que no es limpiamente retrieval ni training (p. ej.
   `Bytespider`, `Amazonbot`)? Se clasifica explícitamente en Discovery, con su razón escrita; el
   default **nunca** es `critical`.
