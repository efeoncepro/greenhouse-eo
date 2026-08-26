# EPIC-020 — Public AI Visibility Lead Magnet Program

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Muy alto`
- Effort: `Alto`
- Status real: `Cara pública LIVE en think.efeoncepro.com (verificado runtime 2026-08-05); registro reconciliado: 49 childs reales — 33 complete, 16 abiertas (paridad Epic:↔child list verificada por `pnpm epic:lint`). Falta el smoke E2E del loop`
- Rank: `TBD`
- Domain: `cross-domain`
- Owner: `unassigned`
- Branch: `epic/EPIC-020-public-ai-visibility-lead-magnet-program`
- GitHub Issue: `none`

> **Estado y qué sigue de TODO el programa AEO** (no solo este epic): [`../AEO_PROGRAM_STATUS.md`](../AEO_PROGRAM_STATUS.md). El trabajo pendiente vive repartido en EPIC-020/021/022/024 + tasks sueltas. Empezar ahí para recuperar visibilidad, y leer su **Delta 2026-08-05 (b)** antes que nada: reconcilia 27 childs huérfanas y corrige el estado (`TASK-1276` está `complete`; la cara pública está live).

## Summary

Convertir el AI Visibility Grader (motor interno ya construido: medir → puntuar → reportar → tendencia → señales) en un **lead magnet público real**: el flujo `input público → consent + email → run async → reporte → HubSpot handoff`, consumido por **3 superficies** (sitio público, Greenhouse admin interno, portal cliente) sobre el **mismo primitive gobernado** (`buildGraderReport`), sin lógica paralela. Cierra el gap entre "tenemos el motor" y "tenemos la máquina de adquisición + Full API Parity de 3 consumers".

## Why This Epic Exists

El motor del grader está completo y verificado (TASK-1226/1227/1234/1235/1236/1237). Pero hoy **todo el surface es `/api/admin/**`**: el sitio público y el portal cliente no tienen ningún contrato que consumir, no existe el snapshot inmutable tokenizado (un link público no puede cambiar si el score recomputa), no existe el write path público (create→consent→run) ni el control de abuso/costo (gasto LLM expuesto), ni el HubSpot handoff. Es un programa cross-domain (growth + public_site + client + commercial) que no cabe en una sola task: cada superficie y cada capa (snapshot, intake, página, handoff, cliente, review) es una task con su propio contrato y rollout. El veredicto Full API Parity hoy es **parcial** (la base es parity-correcta — un primitive + DTO público/interno — pero solo 1 de 3 consumers lo alcanza). Este epic lleva la parity a real.

## Outcome

- Los **3 consumers** (público, admin, cliente) consumen el MISMO `buildGraderReport` vía contratos gobernados: público = token-reader sobre snapshot inmutable; admin = `report.read` (ya existe); cliente = reader client-scoped. Cero builders paralelos.
- **Lead magnet end-to-end live**: un prospecto ingresa su marca + consent + email en el sitio público, recibe el reporte, y el lead + su `primary_gap`/`recommended_motion` llegan a HubSpot.
- **Escalera de 3 artefactos** operativa (Bow-tie): AI Visibility Grader (público, acquisition) → AI Visibility Snapshot (sales/HubSpot, conversión a SQL) → Surround Discovery Audit (pagado, primer land).
- Control de **abuso/costo** del path público (rate-limit + cost ceiling + modo `light`) — sin esto el lead magnet es un vector de gasto LLM no acotado.

## Architecture Alignment

- `docs/architecture/GREENHOUSE_PUBLIC_AI_VISIBILITY_GRADER_ARCHITECTURE_V1.md` — §7.7 (`grader_report`), §9 (public experience: flow/input/states/trust), §11 (programmatic contract + parity: `readPublicGraderReport(reportToken)`, `createAiVisibilityRun`, `syncAiVisibilityRunToHubSpot`).
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md` — un primitive, muchos consumers (el norte del epic).
- `docs/architecture/GREENHOUSE_GROWTH_DOMAIN_ARCHITECTURE_V1.md` · `GREENHOUSE_CLIENT_PORTAL_DOMAIN_V1.md` (anti-corruption layer del portal cliente) · `GREENHOUSE_HUBSPOT_SERVICES_INTAKE_V1.md` (handoff).
- Skill `seo-aeo` `efeonce/AI_VISIBILITY_GRADER.md` (naming canónico + frame Surround Discovery) + `modules/07/04`.

## Child Tasks

> **Estado real (reconciliado 2026-08-05; +`TASK-1652` registrada al crearse, 2026-08-06):** **50 childs — 33 `complete`, 17 abiertas** (conteo canónico: tasks cuyo campo `Epic:` dice EPIC-020; paridad verificada por el gate `epic-child-parity`). La lista A–M de abajo son los 13 hijos originales del diseño del epic; debajo de ella está el **bloque reconciliado** con las **22 tasks que declaran `Epic: EPIC-020` en su propia cabecera y nunca fueron registradas acá**. (Fueron 25: tres salieron el 2026-08-05 hacia su dueño correcto — `TASK-1335`/`1359` a [`EPIC-040`](EPIC-040-growth-public-forms-engine.md), `TASK-1326` a EPIC-019.)
>
> El conteo previo ("12/13 `complete`, sólo `TASK-1246` abierta") era una **ficción contable**: contaba únicamente el denominador original. El epic no está a una task de cerrar, está a **dieciséis**. Método de la reconciliación y falsos positivos descartados: [`../AEO_PROGRAM_STATUS.md`](../AEO_PROGRAM_STATUS.md) § Delta 2026-08-05 (b).

- `TASK-1778` 📋 **to-do** — **Endurecer el fetcher de sitio para uso comercial.** Dueña de `ISSUE-164`. `probes/safe-fetch.ts` promete una contención de redirects que no implementa y no resuelve DNS al validar el host: con intake público de dominios eso es SSRF. Suma dos defectos de exactitud: el tope no protege memoria y el truncado no deja rastro, así que un sitio grande produce «no tiene datos estructurados» siendo falso. 🔴 **Bloquea el flip a `prod: ON`** de `GROWTH_AI_VISIBILITY_PROBES_ENABLED` y `..._BRAND_INTELLIGENCE_ENABLED`. **P1.**
- `TASK-1239` ✅ **complete (dev)** — **(A) Public Grader Report Snapshot + Token Reader** — `grader_reports` inmutable (run_id + score_version + report_version + recommendation_pack_version + as_of + DTO público congelado + token NO enumerable 256-bit + expires_at) + `readPublicGraderReport(reportToken)` + `publishGraderReportSnapshot` (idempotente, no publica gateados) + capability `report.publish` + endpoints admin/público. Foundation de parity pública. **P1.**
- `TASK-1240` ✅ **code complete (dev); rollout pendiente** — **(B) Public Grader Run Intake + abuse/cost controls** — `createPublicGraderRun` (§9.2 input + consent + work email, **email nunca a providers**) → captcha (Turnstile) + rate-limit (per-IP 10/email 3) + presupuesto global diario (circuit breaker) + modo `light` → enqueue al worker async (TASK-1234). Lead dedicado `grader_leads` + `grader_intake_events`. Flag `GROWTH_AI_VISIBILITY_PUBLIC_INTAKE_ENABLED` default OFF. **P1. Pendiente:** sign-off legal consent + secret captcha + flag ON staging.
- `TASK-1241` ✅ **complete** — **(C) Public Lead Magnet Page** (ui-ux): landing + form §9.2 + consent + Turnstile + estados async honestos (§9.3) + render del reporte usando el artifact design system de `TASK-1252` (table-fallback + a11y WCAG 2.2 AA). Cliente puro de A (token-reader) + B (intake). **P1.**
- `TASK-1242` ✅ **complete** — **(D) HubSpot Lead Handoff** (backend, integration): `syncAiVisibilityRunToHubSpot` upserta contact/company + props `ai_visibility_*` + lifecycle desde `primary_gap`/`recommended_motion`, vía outbox + reactive. **P2.**
- `TASK-1243` ✅ **complete** (2026-06-26, code complete dev) — **(E) Client-Scoped Report Access** (backend, reader): reader client-scoped (binding additive `grader_profiles.organization_id`) gateado por capability dedicada `growth.ai_visibility.report.read_client`, mismo `buildGraderReport` (reusa `readGraderReport`). DTO `ClientGraderReport` leak-safe; tenant boundary A≠B (test + SQL live); endpoint BFF `GET /api/client-portal/growth/ai-visibility/report`. **Tercer consumer de la parity cerrado.** Desbloquea `TASK-1248` (UI). Rollout: poblar `organization_id` = intake cliente. **P2.**
- `TASK-1244` ✅ **code complete (dev); rollout pendiente** — **(F) Admin Evidence Review** (backend, command): cola (`listPendingReportReviews`) + `approveAiVisibilityReport`/`rejectAiVisibilityReport` (log append-only `grader_report_reviews` = state machine + CHECK + audit; el LLM nunca aprueba) de `review_required` antes del release público; `publishGraderReportSnapshot` honra la aprobación (approved → publicable; pending/rejected → 409). Approve publica snapshot + delivery `ready` + HubSpot handoff; reject → `unavailable`. Capability `report.review` + grant. Signal `report_review_pending`. Gate humano YMYL. **P2. Pendiente:** UI admin (TASK-1247) + dry-run aprobar→publish sobre un `review_required` real en staging.
- `TASK-1245` ✅ **complete** — **(G) Public Run Status + Delivery Orchestrator** (backend, api): endpoint público de poll por `runPublicId`, estados public-safe y delivery idempotente de `reportToken` cuando existe snapshot publicable. **P1.**
- `TASK-1246` 🚧 **in-progress — ÚNICA TASK ABIERTA DEL EPIC** — **(H) Public Launch Readiness + Rollout** (ops/backend): legal consent + Turnstile + flags/envs + staging smoke end-to-end + release control plane + rollback. **P1.** Residual central = **decisión de arquitectura abierta**: ¿la cara pública se embebe vía `<greenhouse-form>` (candidato `TASK-1321`, `/aeo-2/`) o se hace en el hub público Astro (candidato `TASK-1327`, `think/brand-visibility`)? Hoy 0 tráfico self-serve real. Ver [`../AEO_PROGRAM_STATUS.md`](../AEO_PROGRAM_STATUS.md) §6 Ola 3.
- `TASK-1247` ✅ **complete** — **(I) Admin Review UI** (ui-ux): cola y detalle interno para operar approve/reject de `review_required` usando `TASK-1244`. **P2.**
- `TASK-1248` ✅ **complete** — **(J) Client Report UI** (ui-ux): superficie del portal cliente sobre el reader client-scoped de `TASK-1243`, consumiendo el artifact design system de `TASK-1252`. **P2.** ⚠️ Rollout pendiente: la ruta `/aeo` es **deep-link (no está en nav)** y falta poblar `grader_profiles.organization_id` para que un cliente real la vea. Ver `AEO_PROGRAM_STATUS.md` §2.A.
- `TASK-1249` ✅ **complete** — **(K) Calibration + Provider Completion** (backend, data-quality): Perplexity, prompt pack v2 y recalibración/golden eval; calidad del motor no bloqueante del MVP. **P2.**
- `TASK-1250` ✅ **code complete (dev); rollout pendiente** — **(L) Email Report Delivery** (backend, communications): email transaccional al lead con resumen breve + insight prioritario + link tokenizado + **PDF completo adjunto** (TASK-1273), disparado write-side (reactive consumer del snapshot publicado) con idempotencia DB-level + consent-gate. Marca **Efeonce** (agencia), no el portal. Flag `GROWTH_AI_VISIBILITY_REPORT_EMAIL_ENABLED` default OFF. **P1. Pendiente:** redeploy ops-worker + flip flag dual-location + smoke staging (gated por TASK-1246).
- `TASK-1252` ✅ **complete** — **(M) Report Artifact Design System** (ui-ux): visual y sistema reusable del informe completo del grader, con componentes/variants para web publica, portal cliente, attachment y admin preview. **P1.**

### Childs reconciliadas (2026-08-05) — declaran `Epic: EPIC-020` y no estaban registradas

> Las 22 de abajo salieron de un barrido del corpus completo de tasks (`docs/tasks/{to-do,in-progress,complete}`) cruzando el campo `Epic:` de cada archivo contra esta lista. Todas se declaran hijas de este epic; ninguna aparecía acá. **6 están abiertas.**

**Motor, scoring y contrato del reporte** (todas `complete`):

- `TASK-1257` ✅ — captura de Nombre + Apellido en el intake público (el handoff a HubSpot necesitaba el lead con nombre real).
- `TASK-1263` ✅ — gate de correo corporativo aplicado al form del grader (`emailPolicy.mode=block_field`).
- `TASK-1265` ✅ — **answer-engine coverage: Google AI Overviews / AI Mode** (~48-50% del mercado de respuesta que el grader no medía).
- `TASK-1268` ✅ — citation source domain breakdown (qué dominios alimentan las respuestas → targeting de digital PR).
- `TASK-1271` ✅ — router de extracción de prosa cost-efficient (desacopla el hook de un solo provider).
- `TASK-1272` ✅ — category taxonomy + brand categorization contract (**cómo** categoriza el motor a la marca, no sólo si aparece).
- `TASK-1280` ✅ — **public report model contract** (view-model headless; desbloqueó el render público).

**Producto AEO en el portal cliente** (todas `complete`):

- `TASK-1277` ✅ — **AEO Entitlement & Metering Platform**: per-org tiers + chokepoint gobernado de run. Corrige el error de plano de `TASK-1248` (viewCode prendido a todos los roles cliente).
- `TASK-1278` ✅ — tiering + PLG trial UX sobre el workbench `/aeo` (contratado / trial / locked).

**Hub público `efeonce-think` — render del informe:**

- `TASK-1324` ✅ — repoint del link del email al hub público (todo correo del grader llevaba un enlace roto).
- `TASK-1325` ✅ — levantar el hub (repo + Vercel) que renderiza el informe en `think.efeoncepro.com`.
- `TASK-1328` ✅ — completitud de señales del reporte público (las que el grader ya producía y se perdían).
- `TASK-1329` ✅ — polish visual/editorial del informe.
- `TASK-1331` ✅ — endurecimiento del contrato view-model headless.
- `TASK-1333` ✅ — señales productivas de categoría percibida (sección `06`).
- `TASK-1334` ✅ — renderer Think de categoría percibida.
- `TASK-1332` 📋 `to-do` — `ReportIcon` de Think a librería de iconos gobernada.
- `TASK-1338` 📋 `to-do` — extracción del view-model del report (`[token].astro` ~1873 líneas → `report-view.ts`).

**Abiertas de AEO puro:**

- `TASK-1336` 🚧 `in-progress` — **contrato submit → `reportToken`/`reportUrl`**: Greenhouse como SSOT del submit, el estado del run, el token y la URL pública. Es el contrato que cierra el loop self-serve.
- `TASK-1424` 📋 `to-do` — **Share of Voice per-motor** en el `ReportArtifactModel` (marca vs competidores por engine). Foundation.
- `TASK-1425` 📋 `to-do` — panel **"Cómo te ve cada motor"** (UI del SoV per-motor) + estado honesto de run sin score.

**Residuo de ops (no es AEO puro, pero lo toca):**

- `TASK-1293` 📋 `to-do` — post-flag-rollout completion & hardening del release `056c2dde8`. Su alcance excede al AEO (rota credenciales y toca flags de Growth/Kortex/Notion/PPM); se conserva acá porque los flags AEO son parte de su deuda.

**Formularios del AEO** (el motor es de [`EPIC-040`](EPIC-040-growth-public-forms-engine.md); estas son las tasks del formulario **que el AEO usa**, y sí le pertenecen):

- `TASK-1257` ✅ · `TASK-1263` ✅ · `TASK-1296` ✅ · `TASK-1298` ✅ · `TASK-1336` 🚧 — intake, gate de correo corporativo, contrato Turnstile, migración de `/aeo-2/` y contrato submit→token del grader.

> **Movidas fuera de este epic el 2026-08-05:** `TASK-1335` (CORS/allowlist) y `TASK-1359` (funnel → GA4) pasaron a **EPIC-040 — Growth Public Forms Engine**: son capacidades del motor, no del AEO; colgaban acá sólo porque el AEO fue su primer consumer. `TASK-1326` (control plane Astro multi-repo) pasó a **EPIC-019**, que es el control plane del sitio público.

### Childs reconciliadas — segunda pasada (2026-08-05, gate `epic-child-parity`)

> El gate nuevo `epic-child-parity` de `pnpm epic:lint` encontró 11 más: declaraban `Epic: EPIC-020` y sólo aparecían en la **prosa** del epic (secciones de estado, olas, blockers), nunca en esta lista. Un lector — o un conteo — que mirara `## Child Tasks` no las veía.

**Operabilidad interna del AEO** (el cockpit y sus primitives; `complete`):

- `TASK-1275` ✅ — capability de estado de ejecución de las recomendaciones (avance del Plan AEO).
- `TASK-1276` ✅ — **AEO Operator View**: cockpit `/growth/aeo` + facet AEO en Account 360. *(El doc de programa lo declaró "gap #1 `to-do`" hasta el 2026-08-05; ya estaba construido.)*
- `TASK-1287` ✅ — readers operator-scoped (cockpit cross-org + detalle).

**Abiertas:**

- `TASK-1251` 🚧 `in-progress` — convergencia Growth Forms ↔ Grader (wiring del intake sobre el motor).
- `TASK-1269` 🚧 `in-progress` — **Fix-It Artifacts** (JSON-LD / `llms.txt` / briefs): los entregables accionables del diagnóstico.
- `TASK-1270` 🚧 `in-progress` — Share-of-Voice recurrente + re-grade programado (la cadencia del cliente contratado).
- `TASK-1330` 🚧 `in-progress` — short links del reporte (distribución comercial).
- `TASK-1281` 📋 `to-do` — headless probe runtime (Chromium en `ops-worker`: CWV + WebMCP).
- `TASK-1341` 📋 `to-do` — guard de config runtime de DataForSEO AI Overview.
- `TASK-1652` 📋 `to-do` — corrección del request AI Mode DataForSEO en el adapter `google_ai_overview` (market ISO-2 → `location_code`, gate per-task por `status_code`, citas anidadas en `ai_overview_element`). Complementaria a `TASK-1341` (aquella cubre creds/deploy; ésta la correctitud del request/parseo).
- `TASK-1717` 📋 `to-do` — **superficie de consumidor (`llm_scraper`) como TERCER eje del grader, sin tocar el score.** Hoy los 4 motores se miden **sólo por API**, y los 4 incumbentes que publican su método (Semrush, Ahrefs, Sistrix, Botify) rechazan ese carril: a la respuesta de API le falta el system prompt de consumidor y la navegación por defecto, así que no reproduce citaciones ni fuentes. Agrega `consumer_surface` para ChatGPT y Gemini —los únicos con superficie scrapeable en el mercado— comprándosela a DataForSEO (USD 0,0012/pág), que además devuelve `sources[]` reales, `brand_entities` y `fan_out_queries`. **Convive con `answer_engines`, no lo reemplaza** (diseño Evertune: modelo base ≠ producto de consumidor). 🔴 **El score vigente no se mueve**: nace en shadow y fuera del cálculo, con test que lo congela — meterlo al score exigiría bump de `score_version` y re-baseline, y es follow-up. Blocked by `TASK-1651` (allowlist `ai_optimization`; lo consume, no lo amplía). Hermana de `TASK-1652`, mismo proveedor y defecto distinto. Origen: §4.4 de la auditoría Growth SEO/AEO + benchmark de ~30 suites.
- `TASK-1282` 🚧 / `TASK-1283` 🚧 `in-progress` — conexión Search Console multi-tenant (OAuth + per-org) y su UI. Declaran `Epic: EPIC-020`; **EPIC-022 depende de su rollout** (`TASK-1302`). Si el programa decide que GSC es infraestructura de SEO, mover ambas a EPIC-022 — decisión de alcance, no de higiene.

> **Corregido en la misma pasada:** `TASK-1266`, `1267`, `1279` y `1286` declaraban `Epic: EPIC-020` pero son hijas registradas de **EPIC-021**. Se corrigió su campo `Epic:`, no esta lista.

### Anexo — trabajo AEO ejecutado sin registro (`Epic: none`)

> No se re-registran como childs (están `complete` y su alcance ya fue absorbido), pero quedan acá para trazabilidad: fueron trabajo AEO real que ningún epic contabilizó.

`TASK-1227` (normalization + scoring engine V1) · `TASK-1228` (discovery & eval spike que validó empíricamente el modelo de medición) · `TASK-1233` (provider Gemini) · `TASK-1236` (tendencia temporal) · `TASK-1237` (signal enrichment) · `TASK-1296` (contrato Turnstile del form AEO) · `TASK-1298` (migración de `/aeo-2/` a `<greenhouse-form>`) · `TASK-1410` (Radiografía AEO — muestra de trabajo publicada en Think).

**Pendiente de decisión (no lo hice por mi cuenta):** `TASK-1284` (conexión GA4 multi-tenant como **nueva señal del grader**) está `to-do` con `Epic: none`. Es AEO-core y sin dueño. Asignarlo a este epic o a EPIC-022 es una decisión de alcance, no de higiene documental.

## Estado actual y qué sigue (2026-08-05)

**La cara pública ya está encendida; lo que falta es evidencia y las 16 childs abiertas.** Verificado en runtime el 2026-08-05:

- `https://think.efeoncepro.com/brand-visibility` → **HTTP 200**, sirviendo el `<greenhouse-form>` gobernado (`surface=fhsf-ai-visibility-grader`, `base-url=greenhouse.efeoncepro.com`).
- `GET /api/public/growth/forms/<formKey>` en **producción** → **200**, con campos (`brandName`, `websiteUrl`…), **Turnstile `required`** con site key real y `consentPolicyVersion: ai-visibility-grader-consent-v1`.

Por tanto la hipótesis histórica del epic —"no existe puerta pública self-serve"— está **superseded** (ya lo declaraba el Delta 2026-07-27 de `TASK-1246`, sin propagarse a esta spec). `TASK-1246` dejó de ser "construir el lanzamiento" y es hoy el **gate de evidencia y cierre**.

**Lo que resta para cerrar el epic:**

1. **Smoke E2E real** `submit → run async → status → token → informe público → email → props `ai_visibility_*` en HubSpot`. Que el form renderice no prueba que el loop cierre; nadie registró ese smoke. Es el único residuo duro de `TASK-1246`.
2. **Gobernanza del path público:** sign-off legal del consent (ojo: la definición publicada trae `consent.checkboxes` **vacío** — hay versión de política pero ningún checkbox renderizado; confirmar si es por diseño o es hueco), follow-ups de retención/PII, y revisar signals de costo/abuso con tráfico real (el path público es gasto LLM expuesto).
3. **Las 16 childs abiertas restantes** (ver § Childs reconciliadas, ambas pasadas): `TASK-1336` (contrato submit→token) · `TASK-1424`/`1425` (SoV per-motor) · `TASK-1332`/`1338` (hub Think) · `TASK-1269` (Fix-It Artifacts) · `TASK-1270` (re-grade recurrente) · `TASK-1330` (short links) · `TASK-1281` (headless probe) · `TASK-1341` (DataForSEO AIO) · `TASK-1251` (convergencia Forms) · `TASK-1282`/`1283` (Search Console) · `TASK-1321` (self-serve de `/aeo-2/`: submit → grader → email con PDF + dedupe HubSpot; capacidad propia, NO duplicado de la landing de Think) · `TASK-1293` (residuo de ops).
4. `TASK-1341` — DataForSEO AIO: confirmar con un run real que el secret resuelve (las creds ya están en la revisión activa del `ops-worker`; el `missing_secret` que citaba la versión previa de esta sección era stale).
5. Poblar `grader_profiles.organization_id` para el consumer cliente (J).

**Corrección de estado (2026-08-05):** `TASK-1276` (cockpit operador `/growth/aeo` + facet AEO en Account 360) está **`complete`**, no `to-do`. La versión previa de esta sección y el doc de programa lo declaraban "gap #1 de operabilidad interna" cuando ya estaba construido. La property HubSpot `aeo_check_result` **existe** (verificada live 2026-07-16); el bullet que pedía provisionarla también era stale.

**Secuencia recomendada:** ver [`../AEO_PROGRAM_STATUS.md`](../AEO_PROGRAM_STATUS.md) § Delta 2026-08-05 (b).

## Existing Related Work

- `TASK-1226/1227/1234` (complete) — provider foundation + scoring + worker async (el motor).
- `TASK-1235/1236/1237` (complete) — report builder + tendencia + señales (qué se muestra; DTO público/interno ya separados).
- `TASK-1238` (to-do) — brand accuracy/hallucination monitoring (alimenta el gate `review_required` que (F) revisa).
- `EPIC-019` (to-do) — Public Website / Landing Control Plane: **dónde se hospeda la página pública (C)** — coordinar, no duplicar el runtime de landing.
- ADR `GREENHOUSE_PUBLIC_AI_VISIBILITY_GRADER_DECISION_V1.md`.

## Exit Criteria

- [ ] Los 3 consumers (público/admin/cliente) consumen `buildGraderReport` vía contrato gobernado; cero lógica de reporte duplicada por superficie (parity verificada).
- [ ] Snapshot inmutable tokenizado: un link público no cambia si el score recomputa; `expires_at` respetado.
- [ ] Flujo público end-to-end live en staging: input + consent → run async → reporte → lead en HubSpot con `primary_gap`/`recommended_motion`.
- [ ] El prospecto recibe email transaccional con resumen breve, link tokenizado e informe completo adjunto.
- [ ] El informe completo tiene direccion visual aprobada y sistema reusable de componentes/variants antes de implementarse en web, portal cliente y adjunto.
- [ ] Poll público `runPublicId → status → reportToken` existe como contrato backend gobernado, sin lógica de status dentro de la UI.
- [ ] Control de abuso/costo activo (rate-limit + cost ceiling + modo `light`); sin gasto LLM no acotado.
- [ ] `review_required` no se auto-publica: gate humano (F) antes de exponer al público (seguridad YMYL).
- [ ] Launch readiness con consent legal, captcha, flags, smoke staging y rollback documentado.
- [ ] Triple documentación + reliability signals por capa; rollout proporcional (prod via release control plane).

## Non-goals

- Re-construir el motor (TASK-1226/1227/1234/1235/1236/1237 ya están).
- El runtime de hosting de la landing pública (lo cubre EPIC-019; este epic consume, no duplica).
- Pricing/checkout del Surround Discovery Audit pagado (motion comercial separado).
- Nexa/MCP exposure (sigue por construcción una vez existe el contrato gobernado; no es trabajo Nexa-específico).

## Delta 2026-06-24

- Epic creado desde el análisis con skills `commercial-expert` + `arch-architect` + `seo-aeo` + product design sobre el estado del grader. Veredicto parity = parcial (base correcta, 2 de 3 consumers sin contrato). Se crean A (`TASK-1239`) y B (`TASK-1240`) como foundation P1; C–F quedan trazadas como child tasks a crear.
