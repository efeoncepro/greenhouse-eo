# TASK-1670 — Growth: kernel compartido de site probes + hallazgos de sitio en el audit SEO

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
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

Extrae los probes estructurales (`robots-txt`, `json-ld`, `sitemap`) del motor AEO a un
kernel compartido `src/lib/growth/site-probes/` `[verificar nombre final]`, y los conecta al
collect del site audit SEO como **hallazgos de SITIO** (no de página), detrás de flag.
Cierra el punto ciego más caro del audit técnico: hoy un sitio que bloquea a los crawlers de
IA en su `robots.txt` puntúa 95/100 y se presenta como sano.

## Why This Task Exists

El site audit (TASK-1304/1309) es un passthrough de DataForSEO OnPage, y OnPage **no cubre**
tres cosas que la doctrina 2026 considera de Capa 1:

1. **Acceso de crawlers de IA en `robots.txt`.** Bloquear `OAI-SearchBot` / `PerplexityBot` /
   `ClaudeBot` saca al sitio de las respuestas de los motores de IA. Evidencia medida:
   **−23,1% de tráfico total** en publishers que bloquearon crawlers IA, *sin* reducir de
   forma fiable las citas (Rutgers/Wharton, dic-2025). Para un módulo que se vende como
   **Search Visibility 360** —SEO *y* AEO— es la falla que invalida la mitad de la promesa.
2. **Ausencia de JSON-LD.** El allowlist de `findings-map.ts` sólo detecta *errores* en
   marcado existente (`has_micromarkup_errors`), no su ausencia — y a propósito: la regla del
   módulo prohíbe invertir checks positivos del proveedor por passthrough.
3. **Salud de sitemap.**

Los tres **ya existen, probados**, en el probe layer del grader AEO (TASK-1266, `complete`).
No hay que construirlos: hay que dejar de tenerlos encerrados en un motor.

Y hay una razón de secuencia: el entregable descargable/compartible de la auditoría (que el
cliente reenvía a una agencia) **no debe nacer omitiendo esto**. Un artefacto con nuestro
nombre que declara sano un sitio invisible para la IA es peor que no tener artefacto.

## Goal

- Un kernel de probes de sitio con **una sola superficie pública**, consumible por AEO y SEO
  sin que ninguno importe internals del otro.
- El collect del site audit materializa hallazgos de sitio con **degradación honesta**: un
  fetch fallido dice "no pudimos verificar", NUNCA "pasó".
- `robots.txt` bloqueando retrieval de IA entra como **`critical`**.
- Cero gasto de proveedor: son fetches propios, no DataForSEO.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md` — §1.1 (boundary SEO↔AEO),
  §3/§6 (site audit OnPage, degradación honesta), §10.6 (superficie de auditoría, TASK-1309).
- `docs/tasks/complete/TASK-1266-growth-ai-visibility-site-readiness-probe-layer.md` — el
  contrato `Probe` / `ProbeContext` / `ProbeOutcome` que se extrae.
- `docs/operations/MODULAR_MIGRATION_NEW_WORK_OPERATING_MODEL_V1.md`
- `.claude/skills/seo-aeo/modules/01_SEO_TECHNICAL.md` — §6 (gestión de crawlers IA),
  §5 (datos estructurados), §2 (indexación/sitemaps).

Reglas obligatorias:

- 🔴 **La frontera §1.1 se mantiene por lo que el kernel NO hace: no persiste nada.** Prohíbe
  JOIN/VIEW/FK entre tablas `seo_*` y `grader_*`; el kernel es de funciones **puras** sobre
  HTTP y **no posee datos**. Cada consumer persiste el outcome en SUS tablas
  (`grader_*` para AEO, `seo_site_audit_findings` para SEO). **NUNCA** darle una tabla propia
  al kernel: ahí sí nacería el cruce que la frontera prohíbe.
- **NUNCA** deep imports entre módulos: SEO no importa de `ai-visibility/probes/**` ni AEO de
  `seo/**`. Sólo la superficie pública del kernel.
- **NUNCA** un fetch fallido se materializa como ausencia de problema. `skipped`/`failed`
  llegan al reporte como "no verificado", con su razón.
- **NUNCA** sumar el kernel al presupuesto de proveedor: no toca DataForSEO.
- El fetcher conserva la **guarda SSRF** y el acotamiento al dominio del sujeto.

## Normative Docs

- `docs/tasks/TASK_BACKEND_DATA_ADDENDUM.md`
- `docs/architecture/GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_CANONICAL_PATTERNS_V1.md` — patrón flag default-OFF + shadow + flip.

## Dependencies & Impact

### Depende de

- `TASK-1266` — probe layer estructural (`complete`, EPIC-021). Es lo que se extrae.
- `TASK-1304` — `collectSiteAuditRuns` + `seo_site_audit_findings` (`complete`).

### Blocks / Impacts

- `TASK-1671` `[por crear]` — consumer UI: los hallazgos de sitio necesitan tratamiento propio
  en `/admin/growth/seo/audit` (hoy la lista cuenta "páginas afectadas" y un hallazgo de sitio
  mostraría "1 página afectada", que es falso). **Ese es el motivo del flag**: sin la UI, los
  hallazgos nuevos no deben aparecer.
- El artefacto descargable de la auditoría (aún sin task) — no debería nacer sin esta cobertura.
- `TASK-1281` (headless runtime) — NO se toca: `core_web_vitals` queda **fuera de alcance**.

### Files owned

- `src/lib/growth/site-probes/**` `[nombre a confirmar en Discovery]` — kernel extraído
- `src/lib/growth/ai-visibility/probes/**` — pasa a consumir el kernel (sin cambio de conducta)
- `src/lib/growth/seo/site-audit/collect.ts` — materializa hallazgos de sitio
- `src/lib/growth/seo/site-audit/findings-map.ts` — allowlist de los `issue_type` nuevos
- `src/lib/copy/growth.ts` — fichas es-CL de los checks nuevos (el drift test de TASK-1309 las exige)

## Current Repo State

### Already exists

- `src/lib/growth/ai-visibility/probes/structural/{robots-txt,json-ld,sitemap,llms-txt,core-web-vitals}.ts`
- `src/lib/growth/ai-visibility/probes/contracts.ts` — `Probe`/`ProbeContext`/`ProbeOutcome`,
  con `ProbeFetcher` SSRF-guarded y outcomes canónicos de degradación honesta.
- `AI_CRAWLERS` con `GPTBot`, `OAI-SearchBot`, `PerplexityBot`, `ClaudeBot`, `Google-Extended`
  y `evaluateRobotsForAiBots` en `robots-txt.ts`.
- `src/lib/growth/seo/site-audit/collect.ts` — el paso donde se materializan findings.
- `GH_GROWTH_SEO_AUDIT_ISSUES` (`src/lib/copy/growth.ts`) + su test de drift bidireccional
  contra `findings-map.ts`: **un check nuevo sin ficha rompe el test**, por diseño.

### Gap

- No existe hogar neutral: los probes viven dentro del motor AEO.
- El collect del site audit sólo materializa findings de PÁGINA desde OnPage.
- `seo_site_audit_findings` no distingue hallazgo de sitio vs de página.

## Modular Placement Contract

- Topology impact: `domain-package`
- Current home: `src/lib/growth/site-probes/**` (server-side, consumido por Vercel y ops-worker)
- Future candidate home: `domain-package`
- Rationale del candidate home: no posee datos ni depende de dominio, así que es el candidato natural.
- Boundary: superficie pública = registry de probes + contratos (`Probe`, `ProbeContext`,
  `ProbeOutcome`). Los probes individuales quedan internos. Consumers autorizados: `growth/seo`
  y `growth/ai-visibility`.
- Server/browser split: **server-only** — hace fetch saliente con guarda SSRF; nunca al bundle cliente.
- Build impact: `none` — el alcance excluye `core_web_vitals`, que es el único que arrastra
  Chromium/Lighthouse.
- Extraction blocker: `none` — el kernel no posee datos ni transacciones; es justamente lo que
  hace la extracción barata.

## Backend/Data Contract

- Backend rigor: `backend-standard`
- Impacto principal: `integration`
- Source of truth afectado: `greenhouse_growth.seo_site_audit_findings` (escritura nueva);
  el kernel **no** es source of truth de nada.
- Consumidores afectados: `cron` (collect en ops-worker), `UI` (TASK-1309), `MCP`/lane
  ecosystem (`site-audit-report`, vía el mismo reader), AEO gatherer.
- Runtime target: `worker` (el collect corre en ops-worker) + `local`/`staging` para verificación.

### Contrato

- Contrato existente a respetar: `Probe`/`ProbeContext`/`ProbeOutcome` (TASK-1266);
  `readSiteAuditReport` (TASK-1304) — su shape **no cambia**: los hallazgos de sitio son filas
  más de `seo_site_audit_findings`, con `issue_type` propio.
- Contrato nuevo o modificado: `issue_type` nuevos en el allowlist + marca de alcance
  (sitio vs página) `[decidir en Discovery: columna nueva vs convención en detail]`.
- Backward compatibility: `gated` — flag default OFF; con el flag apagado el collect se
  comporta exactamente como hoy.
- Full API parity: sin ruta ni tool nuevas. Los hallazgos viajan por el reader canónico, así
  que UI, Nexa y el lane MCP los reciben por construcción.

### Datos e invariantes

- Entidades/tablas/views afectadas: `greenhouse_growth.seo_site_audit_findings`
- Invariantes que no se pueden romper:
  - un probe `skipped`/`failed` **NUNCA** se materializa como ausencia de problema;
  - los hallazgos de sitio **no** se cuentan como "páginas afectadas" (su alcance es el sitio);
  - `seo_site_audit_findings` sigue siendo append-only por run (triggers de TASK-1299);
  - el kernel no escribe en ninguna tabla.
- Tenant/space boundary: hereda la del run — `seo_target_id` → `organization_id`. El kernel
  sólo recibe un dominio ya resuelto por el caller.
- Idempotency/concurrency: el collect ya es idempotente por `audit_run_id`; los hallazgos de
  sitio entran en la misma pasada, con `ON CONFLICT DO NOTHING` (los triggers de 1299 prohíben
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

- Auth/access gate: sin superficie nueva. El collect corre con el actor del cron; la lectura
  sigue gateada por `growth.seo.observation.read` + `module_assignment`.
- Sensitive data posture: sin PII. Se fetchea contenido público del sitio del cliente.
- Error contract: los probes **nunca lanzan** (contrato de TASK-1266); errores a
  `captureWithDomain(err, 'growth', ...)`. Sin prosa cruda al cliente.
- Abuse/rate-limit posture: fetcher SSRF-guarded acotado al dominio del sujeto, con timeout.
  Un probe lento **no puede** colgar el collect: presupuesto de tiempo por probe.

### Evidencia runtime

- Ejercitar los 3 probes contra un dominio real (Berel y efeoncepro.com) y verificar que el
  outcome materializado coincide con lo que devuelve el sitio.
- Verificar el camino de degradación: dominio inalcanzable → "no verificado", no "sano".
- Confirmar que con el flag OFF el collect materializa exactamente lo mismo que hoy.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE (no llenar al crear)
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Extraer el kernel (movimiento puro, cero cambio de conducta)

- Mover `contracts.ts` + `robots-txt.ts` + `json-ld.ts` + `sitemap.ts` (y su fetcher SSRF) a
  `src/lib/growth/site-probes/`, con `index.ts` como **única** superficie pública.
- `ai-visibility` pasa a consumir el kernel. Sus probes de entidad/agentic y `llms-txt` /
  `core_web_vitals` **quedan donde están**: son del motor AEO, no compartidos.
- Prueba de que es movimiento puro: la suite de `ai-visibility` queda verde **sin editar sus
  tests de conducta**.

### Slice 2 — Hallazgos de sitio en el collect del audit

- Tras materializar los findings de página, el collect corre los 3 probes contra el dominio
  del target y materializa sus outcomes como hallazgos de sitio, detrás de flag.
- Severidades: `robots.txt` bloqueando retrieval de IA → **`critical`**; JSON-LD ausente →
  `warning`; sitemap ausente/roto → `warning`.
- `skipped`/`failed` se materializan como estado "no verificado" con su razón, distinguible de
  "verificado y sano".
- Fichas es-CL de los `issue_type` nuevos en `GH_GROWTH_SEO_AUDIT_ISSUES` (el test de drift de
  TASK-1309 falla hasta que existan — es el guardrail, no un obstáculo).

### Slice 3 — Verificación runtime + ledger

- Ejercitar contra Berel y efeoncepro.com; comparar contra el `robots.txt` real de cada uno.
- Camino de degradación verificado con un dominio inalcanzable.
- Fila del flag en `FEATURE_FLAG_STATE_LEDGER.md` + runbook de qué runtime lo lee.

## Out of Scope

- **`core_web_vitals`**: es Lighthouse (**laboratorio**), igual que lo que OnPage ya da. La
  doctrina es explícita en que Google rankea con datos de **campo** (CrUX), y la señal de campo
  del módulo viene de GSC. Sumarlo agregaría una segunda medición de lab, cero verdad nueva, y
  arrastraría Chromium headless al alcance.
- **`llms-txt`**: la doctrina lo marca como ROI marginal y Google no lo usa.
- **La UI de los hallazgos de sitio** → `TASK-1671`. Por eso el flag.
- El artefacto descargable de la auditoría (task aparte).
- Tocar el scoring del grader AEO o sus ejes.
- Reprocesar runs históricos.

## Detailed Spec

La decisión de fondo es **por qué kernel y no import directo**. `ai-visibility/probes/structural/`
es la capa INTERNA del motor AEO; que SEO importara de ahí sería el anti-patrón con nombre
propio de la doctrina de modularidad (*cross-module deep import*, "public surface only"). Y la
misma doctrina da el test de kernel: *si dos módulos comparten algo que cambia en lockstep con
ninguno de los dos, es un kernel que debe hacerse explícito*. Estos probes cambian **cuando
cambia la web** (aparece un crawler de IA nuevo, un tipo de schema empieza a pesar), no con las
reglas de negocio de SEO ni de AEO.

La doctrina `seo-aeo` llega al mismo lugar por su lado: `robots.txt`, datos estructurados y
descubribilidad son **Capa 1 — fundamentos compartidos**, declarados como alimento de las tres
capas. Que hoy vivan dentro del grader es un accidente de quién los necesitó primero.

Nombre por responsabilidad, **nunca** `shared/` ni `utils/` (anti-patrón explícito de la
doctrina: "the utils module, a dumping ground for code that has no obvious home").

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 (kernel) → Slice 2 (collect) → Slice 3 (verificación).
- Slice 2 **NO** puede shippear sin su flag: sin `TASK-1671`, la UI renderizaría un hallazgo de
  sitio como "1 página afectada", que es falso.
- El flag **NO** se prende hasta que `TASK-1671` esté desplegada.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| La extracción cambia conducta del grader AEO en silencio | AEO / grader | medium | Movimiento puro en slice propio; la suite de `ai-visibility` queda verde sin tocar sus tests de conducta | suite `ai-visibility` en CI |
| Un probe lento cuelga el collect y el cron se pasa de ventana | cron / ops-worker | medium | Presupuesto de tiempo por probe + el contrato "nunca lanza" | `seo.audit.stuck_tasks` |
| Un fetch fallido se lee como "sitio sano" | data quality | **high si no se cuida** | Estado "no verificado" explícito, distinto de verificado-y-sano; invariante declarada | revisión de código + verificación runtime del slice 3 |
| Hallazgo de sitio contado como "1 página afectada" | UI | high | Flag OFF hasta que `TASK-1671` renderice el alcance correcto | GVC de 1672 |
| Fetch saliente a un host no deseado (SSRF) | seguridad | low | Se conserva el fetcher guarded del kernel; el dominio lo resuelve el caller desde `seo_targets` | revisión de código |
| El kernel acumula responsabilidades y se vuelve "utils" | arquitectura | medium | Superficie pública mínima (registry + contratos); probes internos | revisión de código |

### Feature flags / cutover

- Flag nuevo `[nombrar en Discovery]`, default **OFF**, leído por el **ops-worker** (donde
  corre el collect). ⚠️ Declararlo en `services/ops-worker/deploy.sh` (SoT declarativo:
  `--set-env-vars` es destructivo y borra lo agregado out-of-band) **y** aplicarlo en vivo con
  `gcloud run services update` para efecto inmediato. Fila en `FEATURE_FLAG_STATE_LEDGER.md`.
- Cutover: OFF → shadow (materializa, UI no muestra) → flip cuando `TASK-1671` esté viva.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | revert PR (movimiento puro, sin datos) | <5 min | si |
| Slice 2 | flag a OFF + redeploy worker | <10 min | si (los hallazgos ya escritos quedan; son append-only) |
| Slice 3 | sin rollback propio: sólo verifica y documenta, additive y sin impacto de runtime | — | no aplica |

### Production verification sequence

1. Flag OFF en producción: confirmar que el collect materializa lo mismo que antes.
2. Flag ON en staging: correr el collect contra Berel; comparar los hallazgos contra el
   `robots.txt` y el sitemap reales del sitio.
3. Verificar degradación honesta con un dominio inalcanzable.
4. Confirmar `seo.audit.stuck_tasks` en estado estable tras varios ciclos.
5. Recién entonces, con `TASK-1671` desplegada, flip en producción.

### Out-of-band coordination required

- Env var del flag en ops-worker (`deploy.sh` + `gcloud run services update`).
- Ninguna configuración de proveedor: el kernel no toca DataForSEO ni suma gasto.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Se declaró `Execution profile: backend-data` y `Backend impact: integration`.
- [ ] Existe `src/lib/growth/site-probes/` (o el nombre confirmado) con **una sola** superficie
      pública; ni `seo/**` ni `ai-visibility/**` importan internals del otro.
- [ ] El kernel **no** escribe en ninguna tabla y no tiene tablas propias.
- [ ] La suite de `ai-visibility` queda verde **sin editar sus tests de conducta** (prueba de
      que el slice 1 fue movimiento puro).
- [ ] El collect materializa los 3 hallazgos de sitio detrás de flag; con el flag OFF el
      comportamiento es idéntico al actual.
- [ ] `robots.txt` que bloquea retrieval de IA se materializa como **`critical`**.
- [ ] Un probe `skipped`/`failed` se materializa como "no verificado" con razón, y es
      distinguible de "verificado y sano" — verificado contra un dominio inalcanzable.
- [ ] Los `issue_type` nuevos tienen ficha es-CL en `GH_GROWTH_SEO_AUDIT_ISSUES` y el test de
      drift bidireccional de TASK-1309 pasa.
- [ ] Los hallazgos de sitio NO se cuentan como "páginas afectadas".
- [ ] Evidencia runtime contra Berel y efeoncepro.com, comparada con el `robots.txt` real.
- [ ] Fila del flag en `FEATURE_FLAG_STATE_LEDGER.md` con el runtime que lo lee declarado.
- [ ] `core_web_vitals` y `llms-txt` siguen fuera del kernel compartido.

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

## Follow-ups

- `TASK-1671` `[por crear]` — consumer UI de los hallazgos de sitio en `/admin/growth/seo/audit`.
- Artefacto descargable/compartible de la auditoría (task aparte, ya conversada): el cliente no
  ejecuta, reenvía a una agencia; el documento debe llevar la procedencia consigo y no debería
  nacer sin esta cobertura.
- Drift del registry detectado al barrer: `TASK-1266` figura `to-do` en
  `TASK_ID_REGISTRY.md` pero su archivo vive en `complete/` con `Lifecycle: complete`.

## Open Questions

1. **Nombre del kernel.** `site-probes` mantiene el vocabulario del repo; `site-evidence`
   nombra lo que produce. Propuesta: `site-probes`. Debe decidirse antes del slice 1 — renombrar
   después cuesta más.
2. **Cómo se marca el alcance sitio vs página.** ¿Columna nueva en `seo_site_audit_findings`
   (migración aditiva) o convención en `detail`? La columna es más honesta y consultable; el
   `detail` evita migración. Propuesta: columna, porque el alcance es una propiedad del hallazgo
   y esconderlo en un JSON lo vuelve invisible para cualquier consumer que no lo sepa leer.
3. ¿`sitemap` merece `warning` o `notice`? Un sitemap ausente en un sitio chico bien enlazado
   es casi irrelevante; en uno grande es un problema de descubrimiento real.
