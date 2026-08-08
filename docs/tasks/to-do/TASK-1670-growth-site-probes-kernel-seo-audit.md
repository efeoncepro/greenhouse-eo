# TASK-1670 — Growth: hallazgos de sitio (crawlers IA, JSON-LD, sitemap) en el audit SEO

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
`robots.txt`, **ausencia** de JSON-LD y salud de sitemap. Los tres probes ya existen probados
en el motor AEO; en vez de moverlos, AEO **declara una superficie pública** (archivo nuevo,
aditivo) y el collect del site audit los consume desde ahí como **hallazgos de SITIO**, detrás
de flag. Cierra el punto ciego más caro del audit: hoy un sitio que bloquea a los crawlers de
IA puntúa 95/100 y se presenta como sano.

## Why This Task Exists

El site audit (TASK-1304/1309) es un passthrough de DataForSEO OnPage, y OnPage **no cubre**
tres cosas que la doctrina 2026 pone en Capa 1:

1. **Acceso de crawlers de IA en `robots.txt`.** Bloquear `OAI-SearchBot` / `PerplexityBot` /
   `ClaudeBot` saca al sitio de las respuestas de los motores de IA. Evidencia medida:
   **−23,1% de tráfico total** en publishers que bloquearon crawlers IA, *sin* reducir de forma
   fiable las citas (Rutgers/Wharton, dic-2025). Para un módulo que se vende como
   **Search Visibility 360** —SEO *y* AEO— es la falla que invalida la mitad de la promesa.
2. **Ausencia de JSON-LD.** El allowlist de `findings-map.ts` sólo detecta *errores* en marcado
   existente (`has_micromarkup_errors`), no su ausencia — y a propósito: la regla del módulo
   prohíbe invertir checks positivos del proveedor por passthrough.
3. **Salud de sitemap.**

Los tres **ya existen, probados**, en el probe layer del grader AEO (TASK-1266, `complete`).

Y hay una razón de secuencia: el entregable descargable/compartible de la auditoría (que el
cliente reenvía a una agencia) **no debe nacer omitiendo esto**. Un artefacto con nuestro
nombre que declara sano un sitio invisible para la IA es peor que no tener artefacto.

## Goal

- El audit detecta los tres hallazgos, **sin tocar un solo archivo existente del grader AEO**.
- Degradación honesta: un fetch fallido dice "no pudimos verificar", NUNCA "pasó".
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
  contrato `Probe` / `ProbeContext` / `ProbeOutcome` que se expone.
- `docs/operations/MODULAR_MIGRATION_NEW_WORK_OPERATING_MODEL_V1.md`
- `.claude/skills/seo-aeo/modules/01_SEO_TECHNICAL.md` — §6 (crawlers IA), §5 (datos
  estructurados), §2 (indexación/sitemaps).

Reglas obligatorias:

- 🔴 **NUNCA deep import**: `growth/seo/**` consume EXCLUSIVAMENTE la superficie pública
  declarada por el probe layer. Nada de `ai-visibility/probes/structural/robots-txt` ni de
  `.../contracts` directo. La doctrina de modularidad lo nombra: *cross-module deep import;
  public surface only*.
- 🔴 **NUNCA mover ni editar archivos existentes del probe layer en esta task.** La superficie
  pública es **aditiva**: un archivo nuevo que re-exporta. Cualquier cambio dentro de
  `ai-visibility/probes/**` está fuera de alcance (ver Follow-ups).
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

- `TASK-1266` — probe layer estructural (`complete`, EPIC-021). Es lo que se expone.
- `TASK-1304` — `collectSiteAuditRuns` + `seo_site_audit_findings` (`complete`).

### Blocks / Impacts

- `TASK-1671` `[por crear]` — consumer UI: los hallazgos de sitio necesitan tratamiento propio
  en `/admin/growth/seo/audit` (hoy la lista cuenta "páginas afectadas" y un hallazgo de sitio
  mostraría "1 página afectada", que es falso). **Ese es el motivo del flag**: sin la UI, los
  hallazgos nuevos no deben aparecer.
- El artefacto descargable de la auditoría (aún sin task) — no debería nacer sin esta cobertura.
- `TASK-1281` (headless runtime) — NO se toca: `core_web_vitals` queda **fuera de alcance**.

### Files owned

- `src/lib/growth/ai-visibility/probes/public.ts` `[archivo NUEVO; nombre a confirmar]` — la
  superficie pública. Único archivo que esta task agrega al motor AEO.
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
  23 archivos del probe layer** (agentic, entity, gatherer, registry, store, command).
- `src/lib/growth/seo/site-audit/collect.ts` — el paso donde se materializan findings.
- `GH_GROWTH_SEO_AUDIT_ISSUES` (`src/lib/copy/growth.ts`) + su test de drift bidireccional
  contra `findings-map.ts`: **un check nuevo sin ficha rompe el test**, por diseño.
- Red de seguridad del motor AEO: **643 tests en 89 archivos**, verdes al 2026-08-08.

### Gap

- El probe layer **no declara superficie pública**: hay `structural/index.ts`, `agentic/index.ts`
  y `entity/index.ts`, pero ningún `index`/`public` de nivel superior. Sin eso, cualquier
  consumidor externo tendría que hacer deep import.
- El collect del site audit sólo materializa findings de PÁGINA desde OnPage.
- `seo_site_audit_findings` no distingue hallazgo de sitio vs de página.

## Modular Placement Contract

- Topology impact: `none`
- Current home: `src/lib/growth/ai-visibility/probes/` (server-side; los probes se quedan donde
  están) + `src/lib/growth/seo/site-audit/` (el consumidor)
- Future candidate home: `remain-shared`
- Rationale del candidate home: mover el sustrato a un paquete neutral obligaría a re-apuntar
  23 archivos de un motor que funciona, a cambio de ubicación. Se difiere hasta que exista una
  razón real (ver Follow-ups).
- Boundary: la superficie pública nueva del probe layer. Consumers autorizados: `growth/seo`.
  Los internals de `probes/**` siguen siendo privados.
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

- Contrato existente a respetar: `Probe`/`ProbeContext`/`ProbeOutcome` (TASK-1266) —
  **se re-exporta, no se modifica**; `readSiteAuditReport` (TASK-1304), cuyo shape **no cambia**:
  los hallazgos de sitio son filas más de `seo_site_audit_findings`.
- Contrato nuevo o modificado: la superficie pública del probe layer (aditiva) + `issue_type`
  nuevos en el allowlist + marca de alcance sitio/página.
- Backward compatibility: `gated` — flag default OFF; apagado, el collect se comporta como hoy.
- Full API parity: sin ruta ni tool nuevas. Los hallazgos viajan por el reader canónico, así que
  UI, Nexa y el lane MCP los reciben por construcción.

### Datos e invariantes

- Entidades/tablas/views afectadas: `greenhouse_growth.seo_site_audit_findings`
- Invariantes que no se pueden romper:
  - un probe `skipped`/`failed` **NUNCA** se materializa como ausencia de problema;
  - los hallazgos de sitio **no** se cuentan como "páginas afectadas";
  - `seo_site_audit_findings` sigue append-only por run (triggers de TASK-1299);
  - la superficie pública no persiste nada.
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
- Confirmar que la suite del motor AEO sigue en 643/643 **sin haber editado ninguno de sus
  archivos**.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE (no llenar al crear)
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Superficie pública del probe layer (aditiva)

- Archivo NUEVO en `ai-visibility/probes/` que exporta **sólo** lo que un consumidor externo
  necesita: los 3 probes estructurales + los tipos `Probe`/`ProbeContext`/`ProbeOutcome` + el
  constructor del contexto con fetcher SSRF-guarded.
- **Cero ediciones** a archivos existentes. Prueba: `git diff --stat` sobre
  `ai-visibility/**` muestra exactamente un archivo, y es nuevo.
- Los 643 tests del motor siguen verdes sin tocarse.

### Slice 2 — Hallazgos de sitio en el collect del audit

- Tras materializar los findings de página, el collect corre los 3 probes contra el dominio del
  target y materializa sus outcomes como hallazgos de sitio, detrás de flag.
- Severidades: `robots.txt` bloqueando retrieval de IA → **`critical`**; JSON-LD ausente →
  `warning`; sitemap ausente/roto → `warning`.
- `skipped`/`failed` se materializan como "no verificado" con su razón, distinguible de
  "verificado y sano".
- Fichas es-CL de los `issue_type` nuevos en `GH_GROWTH_SEO_AUDIT_ISSUES` (el test de drift de
  TASK-1309 falla hasta que existan — es el guardrail, no un obstáculo).

### Slice 3 — Verificación runtime + ledger

- Ejercitar contra Berel y efeoncepro.com; comparar contra el `robots.txt` real de cada uno.
- Camino de degradación verificado con un dominio inalcanzable.
- Fila del flag en `FEATURE_FLAG_STATE_LEDGER.md` + runbook de qué runtime lo lee.

## Out of Scope

- **Mover o refactorizar el probe layer.** Medido: `contracts`/`safe-fetch`/`html` los usan 23
  archivos de AEO. Reubicarlos obligaría a re-apuntar el motor entero a cambio de estética de
  carpetas. Se difiere (ver Follow-ups).
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

**Por qué superficie pública y no extracción.** La primera versión de esta task proponía mover
el sustrato (`contracts` + `safe-fetch` + `html` + los 3 probes) a un paquete neutral. La
medición lo desmintió: ese sustrato lo consumen **23 archivos** del probe layer — todos los
probes agentic, todos los de entidad, el gatherer, el registry, el store y `command.ts`. Mover
eso no es "movimiento puro de tres archivos": es re-apuntar la fundación de un motor que
funciona y tiene 643 tests, a cambio de ubicación bonita.

La doctrina de modularidad exige *"public surface only"* — prohíbe meter la mano en las
entrañas de otro módulo, **no** obliga a mudarse. Una superficie pública declarada satisface la
regla con un archivo aditivo y riesgo cero para el grader.

Costo declarado: `growth/seo` pasa a depender de `growth/ai-visibility`. La dirección es
SEO → AEO, no circular. Si algún día se extrae AEO a paquete propio, esa dependencia hay que
resolverla — y ahí sí corresponde la extracción al paraguas (ver Follow-ups).

**Por qué los hallazgos son de SITIO.** Un `robots.txt` no pertenece a una página: es del
dominio. Materializarlo con la URL raíz y contarlo como "1 página afectada" sería falso, y por
eso el consumidor UI es prerequisito del flip del flag.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 (superficie) → Slice 2 (collect) → Slice 3 (verificación).
- Slice 2 **NO** puede shippear sin su flag: sin `TASK-1671`, la UI renderizaría un hallazgo de
  sitio como "1 página afectada", que es falso.
- El flag **NO** se prende hasta que `TASK-1671` esté desplegada.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Romper el grader AEO | AEO / grader | **low** | La superficie es aditiva: cero ediciones a archivos existentes, verificable con `git diff --stat`. Los 643 tests del motor corren sin tocarse | suite `ai-visibility` en CI |
| Alguien "arregla" el acoplamiento moviendo archivos dentro del alcance de esta task | AEO / grader | medium | Regla dura explícita en Architecture Alignment + criterio de aceptación que exige un solo archivo nuevo | revisión de código |
| Un probe lento cuelga el collect y el cron se pasa de ventana | cron / ops-worker | medium | Presupuesto de tiempo por probe + contrato "nunca lanza" | `seo.audit.stuck_tasks` |
| Un fetch fallido se lee como "sitio sano" | data quality | **high si no se cuida** | Estado "no verificado" explícito, distinto de verificado-y-sano; invariante declarada | verificación runtime del slice 3 |
| Hallazgo de sitio contado como "1 página afectada" | UI | high | Flag OFF hasta que `TASK-1671` renderice el alcance correcto | GVC de 1671 |
| Fetch saliente a un host no deseado (SSRF) | seguridad | low | Se reusa el fetcher guarded tal cual; el dominio lo resuelve el caller desde `seo_targets` | revisión de código |

### Feature flags / cutover

- Flag nuevo `[nombrar en Discovery]`, default **OFF**, leído por el **ops-worker** (donde corre
  el collect). ⚠️ Declararlo en `services/ops-worker/deploy.sh` (SoT declarativo:
  `--set-env-vars` es destructivo y borra lo agregado out-of-band) **y** aplicarlo en vivo con
  `gcloud run services update` para efecto inmediato. Fila en `FEATURE_FLAG_STATE_LEDGER.md`.
- Cutover: OFF → shadow (materializa, UI no muestra) → flip cuando `TASK-1671` esté viva.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | borrar el archivo nuevo; nada más lo referencia todavía | <5 min | si |
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
- [ ] `git diff --stat` sobre `src/lib/growth/ai-visibility/**` muestra **exactamente un archivo
      y es nuevo**. Cero ediciones al motor.
- [ ] La suite del motor AEO sigue verde (643 tests) **sin editar ninguno de sus archivos**.
- [ ] `growth/seo/**` no importa nada de `ai-visibility/probes/**` fuera de la superficie pública.
- [ ] La superficie pública no persiste nada ni recibe tablas propias.
- [ ] El collect materializa los 3 hallazgos de sitio detrás de flag; con el flag OFF el
      comportamiento es idéntico al actual.
- [ ] `robots.txt` que bloquea retrieval de IA se materializa como **`critical`**.
- [ ] Un probe `skipped`/`failed` se materializa como "no verificado" con razón, distinguible de
      "verificado y sano" — verificado contra un dominio inalcanzable.
- [ ] Los `issue_type` nuevos tienen ficha es-CL en `GH_GROWTH_SEO_AUDIT_ISSUES` y el test de
      drift bidireccional de TASK-1309 pasa.
- [ ] Los hallazgos de sitio NO se cuentan como "páginas afectadas".
- [ ] Evidencia runtime contra Berel y efeoncepro.com, comparada con el `robots.txt` real.
- [ ] Fila del flag en `FEATURE_FLAG_STATE_LEDGER.md` con el runtime que lo lee declarado.
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

## Follow-ups

- `TASK-1671` `[por crear]` — consumer UI de los hallazgos de sitio en `/admin/growth/seo/audit`.
- **Extracción del sustrato de probes al paraguas `search-visibility/`** `[sin task, sin fecha]`.
  El paraguas existe de verdad: el doc funcional declara que "el módulo SEO es la mitad
  *buscadores clásicos* de Search Visibility 360, y la otra mitad es el AI Visibility Grader".
  Si algún día se reorganiza, el hogar correcto del sustrato compartido **no** es un
  `site-probes` genérico: es `search-visibility/`, con SEO y AEO como sus dos motores, para que
  la arquitectura se lea igual que el producto. Es una reorganización de dos motores (23
  archivos re-apuntados), no un movimiento de tres — merece su propio ADR y una razón real
  (un tercer consumidor, o extraer AEO a paquete propio). **Hoy no la hay**, y por eso esta
  task NO la hace.
- Artefacto descargable/compartible de la auditoría: el cliente no ejecuta, reenvía a una
  agencia; el documento debe llevar la procedencia consigo y no debería nacer sin esta cobertura.

## Open Questions

1. **Nombre y forma de la superficie pública.** ¿`probes/public.ts` o `probes/index.ts`? El
   segundo es la convención de módulo, pero `probes/` ya tiene índices por familia
   (`structural/index.ts`, etc.) y podría confundirse. Propuesta: `public.ts`, explícito.
2. **Cómo se marca el alcance sitio vs página.** ¿Columna nueva en `seo_site_audit_findings`
   (migración aditiva) o convención en `detail`? La columna es más honesta y consultable; el
   `detail` evita migración. Propuesta: columna, porque el alcance es una propiedad del hallazgo
   y esconderlo en un JSON lo vuelve invisible para cualquier consumer que no lo sepa leer.
3. ¿`sitemap` merece `warning` o `notice`? Un sitemap ausente en un sitio chico bien enlazado es
   casi irrelevante; en uno grande es un problema de descubrimiento real.
