# Greenhouse Public AI Visibility Report — Headless Render Decision V1

> **Tipo:** ADR / Decision record · **Estado:** Accepted (2026-06-28) · **Dominio:** growth · ai-visibility · EPIC-020
> **Repos:** `efeoncepro/greenhouse-eo` (data owner) · `efeoncepro/efeonce-think` (render live — hub de lead magnets, `think.efeoncepro.com`; ver Delta de infra 2026-07-03) · `efeoncepro/efeonce-web` (convergencia futura) · `efeoncepro/efeonce-public-site-runtime` (WordPress, queda fuera de este flujo)

## Decisión

El **informe en pantalla** del AI Visibility Grader (lead magnet, EPIC-020) **se renderiza nativamente en `efeonce-web` (Astro + Tailwind)**, consumiendo a **Greenhouse como headless**: Greenhouse expone el **modelo render-ready público** (`ReportArtifactModel`, variant `publicWeb`) por API token-gated, y `efeonce-web` lo pinta con su propio stack y marca pública.

- **NO iframe.** **NO** se reconstruye el scoring/derivación en Astro. **NO** se trae MUI/AXIS al sitio público.
- El **formulario + landing** del lead magnet viven en `efeonce-web`; postean al intake gobernado de Greenhouse.
- El **PDF + email** (TASK-1273/1250) y el **portal cliente** (variant `clientPortal`) siguen en Greenhouse/React sin cambio.

## Contexto

El formulario del lead magnet vive en el sitio público (hoy WordPress; estratégicamente `efeonce-web` en Astro, que ya consume WordPress headless y deploya en Vercel). El resultado debe abrir el **informe en pantalla** (no el PDF) en una superficie **medible con Google Tag Manager**, con marca pública, sin login.

Greenhouse es un app Next.js con login para clientes (`(dashboard)`), pero **ya sirve superficies públicas sin sesión y token-gated** (`src/app/public/quote/[…]/[token]` — cotizador). El informe público ya existe como contrato de datos: `GET /api/public/growth/ai-visibility/report/[token]` devuelve `{ report: PublicGraderReport, asOf, expiresAt }` (JSON, snapshot congelado, no-leak, 256-bit token = auth).

## Alternativas rechazadas

| Alternativa | Por qué NO |
|---|---|
| **iframe del informe Greenhouse en el sitio público** | GTM/medición rota: iframe cross-origin tiene dataLayer separado, eventos atrapados, atribución de conversión inservible. Razón decisiva del operador. |
| **Reconstruir el informe desde cero en Astro** | Duplica el diseño + drift; el informe es "diseño", no "datos" — no se re-deriva de un JSON simple como un form. |
| **Web component envolviendo el React/MUI** | Arrastra MUI+emotion al sitio Astro; shadow DOM atrapa eventos de GTM (mismo problema que el iframe) o filtra estilos sin shadow. Stack equivocado para marketing. |
| **Paquete React compartido (MUI) importado como isla Astro** | Mete MUI/AXIS en un sitio Tailwind de marketing — pesado, complejo, stack equivocado. Reservado solo si un día se exige paridad visual 1:1 con el portal (no es el caso: el informe público debe verse como el sitio público). |

## El contrato headless (lo que ambos repos acuerdan)

**Greenhouse = dueño del dato/modelo. `efeonce-web` = render tonto (presentación).** La lógica de scoring/derivación (niveles, severidad, gaps, recomendaciones) vive SOLO en Greenhouse.

### Endpoints (Greenhouse, públicos, sin sesión)

| Paso | Endpoint | Hoy | Acción |
|---|---|---|---|
| Intake | `POST /api/public/growth/ai-visibility/run` | ✅ existe | reusar |
| Poll status | `GET /api/public/growth/ai-visibility/run/[handle]` | ✅ existe (`queued/running/ready/in_review/unavailable`; `ready`→`reportToken`) | reusar |
| Informe | `GET /api/public/growth/ai-visibility/report/[token]` | ✅ existe (devuelve `PublicGraderReport`) | **extender:** exponer el **`ReportArtifactModel` render-ready** (variant `publicWeb`) como contrato, no el DTO crudo |

### Por qué exponer `ReportArtifactModel` y no `PublicGraderReport` crudo

`modelFromPublicReport(publicReport, 'publicWeb')` ya construye el modelo render-ready (niveles, severidad, ejes, gaps, recomendaciones) en Greenhouse. Si el endpoint entrega **ese modelo**, `efeonce-web` solo mapea modelo→componentes Tailwind, **sin re-implementar la derivación** (que es justo lo que causaría drift). El builder queda como SSOT único.

- **Versionado:** el payload lleva `modelVersion` (semver del contrato) para que los dos repos evolucionen seguro. Cambios additive no rompen; breaking changes suben major + el render lo maneja.
- **Header render-ready:** el `ReportArtifactModel` NO carga el nombre de la marca ni las fechas — el payload agrega un bloque `header { organizationName, reportDate, periodLabel }` (masthead) resuelto server-side (`grader_profiles.brand_name` de la marca evaluada + `formatReportDate(asOf)` + copy plantilla único). Sin él, `efeonce-web` no podría pintar el encabezado ni tener contexto de marca en un link compartido.
- **No-leak por construcción de tipo:** el endpoint solo serializa el modelo `publicWeb`, derivado de `PublicGraderReport` — un TIPO que estructuralmente NO carga `providerFindings` (narrativa cruda por motor), `accuracyFindings`, raw provider text, prompts ni citation URLs. `efeonce-web` **no puede filtrar lo que nunca recibe** — la frontera de no-filtración vive en el tipo (más fuerte que confiar en el render). **`engineSnapshot`/`providerPresence` (conteos de visibilidad por motor) SÍ va al payload público: es el headline del lead magnet (TASK-1252), no un leak.** Tests no-leak (`report-artifact-no-leak.test` + el test de contrato del endpoint TASK-1280) cubren modelo y payload.
- **Auth:** el `reportToken` (256 bits, no enumerable) ES la autenticación. Sin sesión. Expirado/inexistente → 404 indistinto.

### Transporte: fetch server-side (sin CORS)

`efeonce-web` es Astro SSR en Vercel → **fetchea el modelo server-side** (en su page/endpoint Astro), no desde el browser. Beneficios: sin CORS, el `reportToken` no se expone al cliente, y el HTML llega listo (mejor LCP + GTM ve contenido real). El intake POST del form también vía un endpoint Astro server-side (proxy) → no se expone la API pública a CORS abierto.

## División de responsabilidades

| | Greenhouse (`greenhouse-eo`) | efeonce-web (Astro) |
|---|---|---|
| Motor (run/scoring/snapshot/token) | ✅ dueño | — |
| `ReportArtifactModel` (builder + versionado + no-leak) | ✅ SSOT | consume |
| Render del informe (HTML/CSS/animación) | — | ✅ dueño (Tailwind + marca pública + React islands/framer-motion) |
| Form + landing | contrato intake | ✅ render + GTM |
| PDF + email + portal cliente | ✅ sin cambio | — |
| Medición (GTM/dataLayer/conversión) | — | ✅ DOM nativo |

## 4 pilares

- **Safety:** token-gated; el modelo público es lo único que cruza (no-leak server-side); `efeonce-web` nunca recibe evidencia cruda. Rate-limit por IP ya existe.
- **Robustness:** run async + poll + degradación honesta (`in_review`/`unavailable` sin token) ya implementados; el modelo versionado evita rupturas silenciosas.
- **Resilience:** snapshot inmutable + token reader; `efeonce-web` degrada a estado "preparando/enlace expiró" según status; observabilidad del run en Greenhouse.
- **Scalability:** informe = read de snapshot cacheable; `efeonce-web` estático/edge; Greenhouse sirve JSON. El cuello (el run) ya es async.

## Roadmap por slices

**Greenhouse:**
1. Exponer `ReportArtifactModel` (publicWeb) + `modelVersion` en `GET /report/[token]` (o `?format=model` / endpoint `/model` paralelo, manteniendo back-compat del DTO crudo si algún consumer lo usa).
2. Test de contrato: el payload público nunca incluye campos internos (`engineSnapshot`/raw); snapshot del JSON versionado.

**efeonce-web:**
3. Page del informe (Astro SSR, fetch server-side por token) → render del modelo con Tailwind + marca pública + islands para la animación "se arma" (framer-motion).
4. Form del lead magnet + endpoint proxy al intake + pantalla de status/poll ("preparando tu análisis").
5. Wiring GTM/dataLayer (view del informe, scroll, CTA, conversión).

## Hard rules (anti-regresión)

- **NUNCA** renderizar el informe público dentro de un iframe (rompe GTM) ni dentro del grupo `(dashboard)` de Greenhouse (eso pide login).
- **NUNCA** re-implementar la derivación del modelo (niveles/severidad/gaps) en `efeonce-web` — consumir el `ReportArtifactModel` que Greenhouse construye (SSOT único).
- **NUNCA** exponer en el endpoint público campos internal-only (`providerFindings` = narrativa cruda por motor, `accuracyFindings`, raw provider text, prompts, citation URLs, reasons internos). El contrato es el modelo `publicWeb` (que estructuralmente no los tiene). **`engineSnapshot`/`providerPresence` (conteos de visibilidad por motor) SÍ es público** — headline del lead magnet (TASK-1252), NO removerlo del payload.
- **NUNCA** fetchear el reporte client-side con el token expuesto si se puede server-side (Astro SSR) — token server-side, sin CORS abierto.
- **SIEMPRE** versionar el payload (`modelVersion`); breaking change = major + render adaptado en el mismo ciclo.

## Decisiones de superficie (operador, 2026-06-28)

- **Hub de lead magnets, no solo el informe.** El render vive en un **hub** que hospedará TODOS los lead magnets (el AI Visibility Grader y los futuros). Un property, muchas herramientas, un diseño, un GTM.
- **Subdominio `think.efeoncepro.com`** (Astro en Vercel). **Forzado por infra:** `efeoncepro.com` (root) está en **Kinsta/WordPress sin reverse proxy** → la subcarpeta `efeoncepro.com/think` NO es viable. El subdominio apunta a Vercel, independiente de Kinsta. Canónico bajo `efeoncepro.com`; si se usa `efeonce.org`, 301 → canónico (nunca dos indexables).
- **Consecuencia SEO (aceptada):** un subdominio construye autoridad desde cero (Google lo trata como sitio aparte). Mitigación: interlink desde el sitio WP, landing pages indexables del hub por herramienta, y autoridad propia de cada lead magnet. (El informe per-lead es `noindex`; lo indexable son las landings de las herramientas.)
- **Marca: blend AXIS + marca pública.** El informe (y el hub) usan un token layer que **mezcla AXIS con la marca pública** (midnight/azure/royal) para que "se sienta producto". Capa de diseño compartida una vez, reusada por todos los lead magnets. Tarea de design system.
- **Primera superficie Astro productiva.** `think.efeoncepro.com` es un buen primer surface Astro en producción bajo la marca, consistente con la estrategia de cutover incremental gobernado (TASK-1158), sin tocar el root WP/Kinsta.

## Open questions (deliberadamente no decididas)

1. **Forma de exponer el modelo:** ✅ **Resuelto (TASK-1280, 2026-07-01): extender `GET /report/[token]`** con `model` (variant `publicWeb`) + `modelVersion` + `header` top-level en el payload por defecto (aditivo, back-compat; se conserva el DTO crudo `report`). No se creó endpoint `/model` paralelo ni `?format=model`. Contrato + no-leak cubiertos por `route-contract.test.ts`.
2. **App del hub:** ✅ **Resuelto — SUPERSEDED (operador, 2026-07-03): repo/proyecto Vercel dedicado `efeoncepro/efeonce-think`** (NO `efeonce-web`; ver "Decisión de infra 2026-07-03" arriba). La premisa 2026-06-28 (`efeonce-web`, "no se crea repo nuevo") quedó reemplazada por el hub dedicado, con convergencia futura en `efeonce-web`.
3. **Ruta del informe dentro del hub:** ✅ **Resuelto (TASK-1325/1324, 2026-07-03): `think.efeoncepro.com/brand-visibility/r/<token>`**, llave del path = `report_token` (no `[publicId]`). El helper `buildPublicReportUrl` (`src/lib/growth/ai-visibility/hubspot/report-link.ts`) genera esta URL, resuelta por env var `PUBLIC_GRADER_HUB_URL` (default = hub prod); es fuente única del correo + HubSpot `report_url`. Los links viejos `/grader/r/<token>` del portal se recuperan con un redirect puente 307 en `next.config.ts`.
4. **Landing del grader:** ¿se construye en el hub Astro, o el form sigue en WP posteando al mismo intake? (No bloquea el contrato.)

## Delta 2026-07-01 — TASK-1280 (contrato headless implementado en Greenhouse)

- `GET /api/public/growth/ai-visibility/report/[token]` ahora devuelve `{ report, model, modelVersion, header, asOf, expiresAt }` (aditivo, back-compat). `model` = `modelFromPublicReport(publicReport, 'publicWeb')` (SSOT único, el endpoint no re-deriva); `modelVersion = '1.0.0'` (`GROWTH_AI_VISIBILITY_PUBLIC_REPORT_MODEL_VERSION`); `header` = masthead render-ready (`organizationName` = marca evaluada por `grader_profiles.brand_name`, `reportDate`, `periodLabel`), armado con el SSOT `buildReportHeader` (reusado por email/operador).
- **Corrección de framing (era drift):** este ADR decía "NUNCA exponer `engineSnapshot`". Falso desde TASK-1252 (Delta 2026-06-27): `engineSnapshot`/`providerPresence` (conteos de visibilidad por motor) es **público-safe** — el headline del lead magnet — y va en el payload. Lo internal-only es `providerFindings` (narrativa cruda) + `accuracyFindings`, que estructuralmente no existen en `PublicGraderReport` (no-leak por construcción de tipo). También se corrigió el docstring stale de `ProviderPresence` en `contracts.ts`.
- Cobertura: `route-contract.test.ts` (payload: model+modelVersion+header, engineSnapshot presente, sin `providerFindings`/`accuracyFindings`/`INTERNAL`) + `report-snapshot.test.ts` (JOIN → `brandName`).

## ⚠️ Delta 2026-07-01 — la decisión de RENDER/FORM (efeonce-web) está SIN CONSTRUIR / posiblemente superseded

Verificación en código (TASK-1246, 2026-07-01): **la parte de este ADR que decide "el form + render del lead magnet viven en `efeonce-web` (Astro)" NO se construyó** y quedó desalineada con la realidad del runtime. Estado real:

- **No existe ninguna superficie pública del grader self-serve.** El form del grader es `fdef-ai-visibility-grader` (surface `fhsf-ai-visibility-grader`), un **form gobernado del motor Growth Forms** (TASK-1251), NO una page Astro. No está embebido en ningún lado: no hay `page.tsx` pública en greenhouse-eo, no está en efeonce-web (confirmado por el operador), y **`/aeo-2/` es OTRO form** (`efeonce-aeo-diagnostic`, servicio comercial → HubSpot) que **NO corre el grader**.
- **Tensión con el approach forms-engine:** el grader ya es embebible con el mismo web component `<greenhouse-form>` que `/aeo-2/` usa live en WordPress (TASK-1298). Eso hace que "reconstruir el render en Astro/efeonce-web" sea **redundante** para el form (no para el render rico del informe, que sí es distinto). La parte **de datos** de este ADR (contrato headless `model`/`modelVersion`/`header`) sí se implementó (TASK-1280) y es válida; la parte de **dónde se pinta** quedó abierta.

**Decisión abierta (reabre la Open Question #4):** la cara pública del grader self-serve puede ser (a) embed `<greenhouse-form>` del form `fdef-ai-visibility-grader` en WordPress (como `/aeo-2/`) + render del informe consumiendo el contrato headless, o (b) efeonce-web (Astro) como decía este ADR. **Resolver antes de "lanzar" el lead magnet self-serve** — hoy simplemente no hay dónde llenarlo. No tratar el render efeonce-web como hecho.

## ✅ Delta 2026-07-03 — RESUELTO: hub dedicado `efeonce-think` + plan de 2 superficies

Cierra la Open Question reabierta el 2026-07-01 ("dónde se pinta la cara pública"). **La parte de datos de este ADR (contrato headless `model`/`modelVersion`/`header`, TASK-1280) sigue válida; lo que se resuelve acá es el DÓNDE y el CÓMO.**

### Decisión de infra (operador, 2026-07-03)

El render + la landing del lead magnet **NO viven en `efeonce-web`** sino en un **repo + proyecto Vercel dedicado: `efeoncepro/efeonce-think` → `think.efeoncepro.com`** (hub de lead magnets). Razón: desacoplar el lanzamiento del lead magnet de la migración completa del sitio raíz (más lenta) + aislar blast radius. **Convergencia planificada en `efeonce-web` más adelante** → por eso nace con **mismo stack (Astro 7), marca compartida y URL final** para que el merge no obligue a re-trabajo ni rompa links. El repo es **gobernable desde Greenhouse** (lleva `greenhouse.repo.json`, schema `greenhouse.externalRepo.v1`; cableado del control plane multi-repo = TASK-1326).

### El hub tiene 2 superficies públicas

| Superficie | Ruta | Rol | Index |
|---|---|---|---|
| **A. Render del informe** | `think.efeoncepro.com/brand-visibility/r/<token>` | el lead **VE** su reporte (llega desde el email) | **noindex** |
| **B. Landing + form** | `think.efeoncepro.com/brand-visibility` | usuario nuevo **DEJA sus datos** (intake self-serve) | sí |

Loop completo: `landing (B) → form → grader corre async → email con enlace → clic → render (A)`.

### Cómo se construye cada una (qué ya existe)

- **A — Render:** el **diseño + modelo del informe YA existen** (TASK-1252: `report-artifact/model.ts` = `ReportArtifactModel` con score, niveles percepción/agentic, `primaryGap`, recomendaciones, `engineSnapshot`; `report-artifact/web/*` = render React/MUI; + print/PDF/no-leak tests). El hub **NO rediseña**: **porta ese layout a Astro + Tailwind** y pinta el mismo modelo que sirve TASK-1280 (render "tonto", fetch server-side, token no expuesto). No se importa MUI al sitio público (hard rule del ADR).
- **B — Landing/form:** el form del grader **ya es gobernado** (`fdef-ai-visibility-grader`, formKey `69cd5269…`, surface `fhsf-ai-visibility-grader`). La landing **NO construye un form nuevo**: **embebe `<greenhouse-form form-key="69cd5269…">`** (renderer portable), heredando validación, consent, Turnstile, telemetry y el path submission→outbox→pipeline. Es el mismo web component que `/aeo-2/` usa live (TASK-1298). Esto **resuelve la tensión** que notaba el Delta 2026-07-01: no se reconstruye el form, se embebe; el render rico del informe (que sí es distinto) se porta a Tailwind.

### Marca compartida (decisión práctica)

Para pintar el informe con la identidad AXIS sin bloquear: **copiar los tokens AXIS al Tailwind del hub ahora** (config CSS-first) y **formalizar un paquete compartido después** (consumible por hub + efeonce-web al converger). No duplicar lógica; solo los valores de token, con plan de consolidación.

### Secuencia y mapa de tasks

1. **TASK-1325** (in-progress) — hub + **Slice 2 = render (A)**. Prioridad: desbloquea el bug del email. Slice 1 (repo+Vercel+deploy+dominio+SSL) ✅.
2. **TASK-1324** — repuntar el enlace de los correos a `/brand-visibility/r/<token>` (arregla el 404). Se destraba cuando A esté verificado.
3. **TASK-1326** — control plane multi-repo (gobernar `efeonce-think` desde el portal).
4. **TASK-1327** — landing + embed del form (**B**), self-serve. Task nueva (creada 2026-07-03).

**Hard rule que se mantiene:** Greenhouse = dueño del dato/modelo; el hub = render tonto. Ni scoring ni derivación en Astro. `engineSnapshot` es público (headline), no leak.

### Delta 2026-07-03 (live) — Superficie A desplegada y enterprise (TASK-1325 COMPLETE)

La **Superficie A (render del informe)** está **viva en producción**: `https://think.efeoncepro.com/brand-visibility/r/<token>` → 200 con token real, `noindex`, fetch server-side (token no expuesto), sin re-derivar scoring. DNS resuelto + SSL emitido. Se llevó de skeleton a **acabado enterprise** en loop GVC + skills product-design (4 pasadas: tipografía · motion/microinteracciones · copywriting · SEO/AEO), con narrativa de arriba a abajo (hero gauge navy → evidencia por motor → benchmark → **escalera de madurez** → brecha + qué hacer → detalle + radar → CTA) y motion GSAP robusto (reduced-motion + fail-safe).

**Primitiva canónica del hub — `MaturityLadder` (la "escalera"):** el render de la escalera 5-Be se canonizó como **primitiva reutilizable** del hub: contrato tipado desacoplado del modelo del grader (`src/lib/primitives/ladder.ts`, `LadderRung`) + componente self-contained (estilos + motion propios) en `src/components/primitives/MaturityLadder.astro`; el informe la consume vía adapter (`Level[] + LEVEL_COPY → LadderRung[]`). Patrón replicable por lead magnets futuros (SEO/otros). Catálogo: `efeonce-think/src/components/primitives/README.md`.

**Marca:** los tokens AXIS se copiaron al hub (`efeonce-think/src/lib/report-tokens.ts` — `axis` + `severityMeta`), duplicación temporal por la decisión práctica de arriba; consolidación a paquete compartido al converger en `efeonce-web`.

**Estado del loop:** falta sólo el repoint del enlace de los correos = **TASK-1324** (ahora desbloqueada; la URL final `/brand-visibility/r/<token>` está viva y estable). Superficie B (landing + form) = **TASK-1327**.

## Delta 2026-07-03 — TASK-1328 signal completeness (code complete local, rollout pendiente)

El contrato headless se mantiene como `GET /api/public/growth/ai-visibility/report/[token]` → `{ report, model, modelVersion, header, asOf, expiresAt }`, pero el `model publicWeb` ahora incluye señales public-safe adicionales que el grader ya producía y el render público no mostraba:

- `readiness` como eje ortogonal de operabilidad (`structural` + `agentic`) y `agenticAxisScore`/nivel `Be Actionable` alimentado por `readiness.agentic.overallScore`. El score de percepción no se mezcla con readiness.
- `citationSourceBreakdown` como evidencia bounded de dominios citados. El hub muestra dominios agregados/top-N, no URLs completas ni texto crudo.
- `categoryTaxonomySummary` como sección condicional; `unknown` o `categories=[]` no genera narrativa.
- `engineSnapshot` conserva denominadores `present/resolved` por motor, de forma que `0 resolved` no se confunda con `0 mentions`.
- `provenance` alimenta una banda metodológica compacta (prompts, providers, corte de evidencia).

La corrección de lifecycle mueve `gatherRunProbes()` antes de `finalizeRunDelivery()` para que snapshots nuevos puedan congelar readiness/probes antes de entregar el token. **Snapshots existentes quedan `new-runs-only` por defecto**: no se republish/version-bump sin una task gobernada que defina alcance, idempotencia y comunicación.

Estado operativo: code complete local en Greenhouse + `efeonce-think`, sin push/deploy. Evidencia local en TASK-1328: focal tests, typecheck/lint, Astro `type-check`/`build`, capturas desktop/mobile y assertion de no-overflow/no-leak. Producción requiere deploy Greenhouse + hub y smoke con token nuevo antes de prometer disponibilidad real.

## Delta 2026-07-03 — TASK-1329 portable PDF download (code complete local)

El informe público del hub `efeonce-think` puede ofrecer una descarga portable del mismo diagnóstico sin convertir al hub en dueño del PDF ni duplicar lógica de render.

Decisión: Greenhouse expone un endpoint público read-only adicional bajo el mismo contrato token-gated:

- `GET /api/public/growth/ai-visibility/report/[token]/pdf`

El endpoint:

- reusa `readPublicGraderReport(token)` como reader de snapshot público;
- reusa `buildReportHeader(...)` y `buildAiVisibilityReportAttachment(...)`, el renderer PDF ya gobernado por TASK-1273/TASK-1250;
- devuelve `application/pdf` como attachment;
- aplica el rate guard público existente para reportes;
- no modifica `ReportArtifactModel`, scoring, lifecycle del run ni `executeClaimedGraderRun`;
- no persiste un asset nuevo ni crea short links; aliases cortos persistentes quedan en TASK-1330.

Responsabilidad de superficie:

- Greenhouse sigue siendo dueño del dato, snapshot y PDF public-safe.
- `efeonce-think` sólo construye el href server-side hacia ese endpoint y pinta una acción secundaria `PDF` en el dock flotante del informe.

Estado operativo: code complete local, sin push/deploy productivo. Evidencia: test de contrato del endpoint (`route-contract.test.ts`) cubre 200 PDF, 429 y 404; `pnpm typecheck` + `pnpm build` verdes en Greenhouse. Think valida `pnpm type-check` + `pnpm build`, `scrollWidth == clientWidth` en 1440/1280/390 y no-leak checks. Caveat local: el mock server de `127.0.0.1:3337` todavía responde JSON para `mock-token/pdf` hasta reiniciar/ajustar ese runtime; la ruta Next real está implementada y testeada.

### Delta menor — display id del run en el informe

El payload JSON público suma `runPublicId` (`EO-GRUN-#####`) como metadata de trazabilidad para el render/pantalla/PDF compartido. Es un **display/admin id secuencial**, no un handle de autenticación ni de polling. El token no enumerable (`grt-*`) sigue siendo la única auth del informe público; `runPublicId` sólo sirve para que el lector cite el snapshot auditado sin mostrar el token.
