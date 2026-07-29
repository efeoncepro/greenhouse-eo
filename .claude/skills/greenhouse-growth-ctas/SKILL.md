---
name: greenhouse-growth-ctas
description: >-
  Operate the Greenhouse Growth CTA & Popup Engine — governed conversion prompts (CTAs/banners/
  popups) authored and versioned in Greenhouse, arbitrated server-side, rendered anywhere by the
  portable `greenhouse-cta` web component, measured via the `greenhouse_cta_*` dataLayer family and
  an audit-grade conversion ledger. Invoke when touching `src/lib/growth/ctas/**`,
  `src/growth-cta-renderer/**`, the public `/api/public/growth/ctas/**` or admin
  `/api/admin/growth/ctas/**` routes, the governance surface `/growth/ctas`, CTA embedding
  (WordPress/Think/Astro), CTA telemetry/GTM, or the `growth.cta.*` reliability signals.
---

# Greenhouse Growth CTA & Popup Engine

You are a senior engineer for the Greenhouse **Growth CTA engine**: the governed CRO platform for
conversion prompts across public surfaces. CTAs are **authored, versioned and published inside
Greenhouse** (immutable published snapshots); a **server-side arbiter** decides what renders on each
surface+route (the browser NEVER sees the candidate set or policy); a **portable renderer**
(`<greenhouse-cta>`) paints the arbitrated contract on any host; actions route to governed
destinations (`open_growth_form`, governed navigation and the additive native
`open_meeting_scheduler` task surface); and evidence lands in an **append-only Tier A conversion
ledger** where only `server_confirmed` counts as conversion truth.

> **Full API Parity:** a CTA is a capability with a governed programmatic contract
> (`greenhouse-growth-cta-popup.v1`). The renderer, the governance surface `/growth/ctas`, Nexa,
> MCP and any host are all **clients of the same primitive** (`src/lib/growth/ctas/`).

## When to invoke

- Authoring/lifecycle of CTAs (`draft → review → published → paused → deprecated → archived`),
  versions, campaign copy, style variants, targeting/priority policies.
- The portable renderer `<greenhouse-cta>` (attributes, `--gh-cta-*` tokens, variants
  `default|spotlight|minimal`, states, anti-CLS skeleton, a11y, reduced-motion).
- Public API (`GET /render` + `POST /events`), CORS data-driven, embed keys, forged-write hardening.
- The governance surface `/growth/ctas` (menú Growth; viewCode `gestion.growth_ctas`).
- Telemetry/measurement: the `greenhouse_cta_*` dataLayer family + allowlist + GTM tags + GA4
  custom dimensions. **MANDATORY:** register/update the CTA row in
  `docs/reference/measurement-gtm-ga4/TRACKING-PLAN.md` §CTAs when creating/changing a CTA's
  measurement. To build/publish GTM tags → skill `greenhouse-gtm-ga4-operator`.
- Embedding on a host (Think dock, WordPress snippet), rollout/flags, `growth.cta.*` signals.

## Mental model — end to end

```text
operador (/growth/ctas o API admin, capability growth.cta.*)
  → author draft → review → publish (ATÓMICO: gate de acción resoluble + snapshot inmutable
                                     + deprecia la published anterior; 1 published viva por CTA)
  → arbiter server-side por (surface, route): elegibilidad targeting (fail-closed) → priority
      → 0–1 interruptivo + N no-interruptivos, compilados browser-safe
  → <greenhouse-cta> pinta el contrato (variante visual elegida por cta_version.style_variant)
  → click → open_growth_form monta <greenhouse-form>, o open_meeting_scheduler abre la task surface
      nativa; cada dominio conserva su command y su verdad de conversión
  → evidencia: dataLayer greenhouse_cta_* (direccional) + POST /events → ledger Tier A
      (browser_reported; solo server_confirmed es verdad de conversión)
  → GTM v4 reenvía a GA4 (tags por evento + DLVs; conversión sigue siendo generate_lead del form)
```

## Schema — `greenhouse_growth.cta_*` (migraciones TASK-1339)

| Tabla | Claves |
| --- | --- |
| `cta_definition` | slug UNIQUE, status active/archived |
| `cta_version` | state machine CHECK; **UNIQUE parcial: 1 published por cta**; trigger de inmutabilidad post-publish (contenido/policies/published_at congelados; solo status transiciona) |
| `cta_surface_binding` | origin_allowlist_json + allowed_cta_slugs_json + embed_key_id/hash (solo hash; secreto se entrega UNA vez) |
| `cta_conversion_event` | **append-only por trigger** (sin UPDATE/DELETE; runtime solo SELECT/INSERT); `trust_level` browser_reported/server_confirmed; `ingest_status` accepted/**rejected** (rechazos de forja sin PII = fuente del signal); CHECKs: accepted exige refs reales, rejected exige reason_class |
| `cta_visitor_state` (TASK-1428) | estado pseudónimo por sujeto (`visitor` durable consent-gated \| `session` fallback); **UNIQUE NULLS NOT DISTINCT (subject_kind, subject_hash, cta_id)** — la fila `cta_id IS NULL` es la ventana GLOBAL interruptiva del sujeto; retención visitor 180d / session 48h (purga oportunista) |
| `cta_exposure_rollup` (TASK-1428) | **Tier B AGREGADO horario** (jamás 1 fila por pageview); dims bucket×cta×surface×placement×kind×reason×source×**enforced** (shadow=false); `observed_count` + `estimated_count` (sampling); reason_class = enum cerrado CHECK; retención 400d |
| `cta_kill_switch_event` (TASK-1428) | kill switch global/per-surface **append-only por trigger**; estado vigente = último evento (`engage`\|`release`) por scope; `reason` obligatorio + `actor_ref`; outbox `growth.cta.kill_switch_changed` in-tx |

Tier B (exposición `eligible/suppressed/viewed` masiva) NUNCA entra a OLTP — arch §9.4. Desde
TASK-1428 `viewed` SÍ tiene ingest server (misma cadena de defensa → rollup agregado, nunca el
ledger); `eligible/suppressed` los observa el server en el render path. El dataLayer sigue igual.

## Domain code map

- `src/lib/growth/ctas/` — primitive canónico: `contracts.ts` (zod + enums + **SoT de telemetría**:
  `CTA_GTM_EVENT_NAMES` + `CTA_TELEMETRY_ALLOWED_PAYLOAD_KEYS` + outbox constants), `store.ts`
  (SQL + outbox in-tx; ojo: `query()` de `@/lib/db` retorna `rows` directo, NO `{rows}`),
  `arbiter.ts` (matcher glob-lite + priority + 0–1 interruptivo; targeting ausente/inválido =
  NO elegible, fail-closed), `render-contract.ts` (compiler browser-safe), **TASK-1431**: `action-registry.ts`
  (Action Registry canónico server-only — un entry por kind: policy schema zod + resolver +
  proyección browser-safe; metadata pública `CTA_ACTION_KIND_METADATA` vive en `contracts.ts`,
  browser-safe para cockpit/preview/tests; taxonomía de fallo `action_policy_invalid|
  action_kind_unsupported|action_destination_invalid|action_destination_unavailable`) y
  `action-router.ts` (fachada estable `resolveCtaAction` → delega al registry; publish gate y
  render path fail-closed por la misma puerta). Kinds V1: `open_growth_form` (via
  `getPublishedRenderContractByRef` de forms) + navegación gobernada `link_url` (root-relative o
  https sin credenciales/protocol-relative) / `open_think_tool` (PATH sobre hub gobernado
  `GROWTH_CTA_THINK_HUB_URL`∥`PUBLIC_GRADER_HUB_URL`∥think.efeoncepro.com + campaign context
  UTM-allowlisted strict) / `book_meeting` (https en `meetings*.hubspot.com` + env
  `GROWTH_CTA_BOOKING_URL_HOSTS`; navegación-only, CERO write CRM) / `open_meeting_scheduler`
  (binding activo por `meetingSurfaceId` + `schedulerKey`; familia `meeting_scheduler`, sin URL de
  provider elegida por el autor),
  `ingest.ts` (pipeline forjable-hardened + routing Tier B + hooks dismiss/conversión),
  `commands.ts` (lifecycle + surfaces), `readers.ts` (arbitraje + suppression + kill switch),
  `suppression.ts` (decisión PURA: taxonomía + policy zod, fail-closed), `visitor-state.ts`
  (store consent-aware + claim atómico FOR UPDATE + purga), `exposure.ts` (adapter Tier B
  fail-open + sampling + summary reader), `kill-switch.ts` (estado en DB + command idempotente-
  observable + audit) — todo TASK-1428.
- `src/growth-cta-renderer/` — bundle público (vanilla TS ~34KB, light DOM + ElementInternals):
  `element.ts` (`<greenhouse-cta>`; attrs `surface`/`embed-key`/`base-url`/`route`/`cta`/
  `form-surface`/`cta-location`/`locale`/`color-scheme`/`appearance` + TASK-1429
  `consent-state`/`consent-source`), `styles.ts` (**paridad preview↔público POR CONSTRUCCIÓN**:
  todo selector es `:is(greenhouse-cta, .ghc-scope)`; geometría del overlay en `.ghc-slidein`,
  density/card del interruptivo keyed por `[data-ghc-placement='slide_in']` — aplica igual en
  overlay y preview), `telemetry.ts` (espejo del SoT; sanitize allowlist antes de CustomEvent +
  dataLayer), `action.ts` (monta el form, carga lazy del bundle forms), `meeting-action.ts` (task
  surface nativa: carga lazy, dialog bounded/full-screen, una instancia conectada y recovery por
  `Reintentar`), `fixtures.ts`
  (preview/tests, pairwise slide_in), **TASK-1429**: `slide-in.ts` (`SlideInController` — único
  interruptivo V1: no modal `role=complementary` sin `aria-modal`/trap, trigger gobernado del
  bundle dwell 8s O scroll 35%, apertura pasiva sin focus steal, Escape + focus return, dismiss
  persistido ANTES de la salida `allow-discrete`, density `full|condensed|peek` por container
  query del PROPIO shell, `observeVisibleOnce` para viewed IO ≥50% + dwell 300ms) y `visitor.ts`
  (identidad pseudónima consent-aware: `sessionKey` sessionStorage siempre; `visitorKey`
  localStorage SOLO con `consent-state="granted"`; guard local de dismiss por sesión — defensa
  en profundidad, la autoridad de suppression es server-side TASK-1428).
  Build: `pnpm renderer:cta:build` → `public/growth-cta/renderer-<canal>.js` (prebuild lo corre).
- Gobernanza/cockpit (TASK-1430): `src/app/(dashboard)/growth/ctas/` + `GrowthCtasGovernanceView`
  (orquestador CompositionShell `split` + lead) con `src/views/greenhouse/growth/ctas/cockpit/`:
  `cta-cockpit-meta.ts` (draft model + builders payload/preview-contract; presentación de enums
  canónicos — cero enum paralelo), `CtaInventoryPanel` (filtros + listbox ↑↓), `CtaDetailPanel`
  (lifecycle bar + kill switch global/surface con reason auditado + métricas con trust tags +
  bindings vía `surfaceAllowsCtaSlug` + supresión + versiones), `CtaAuthoringDrawer` (8 pasos;
  submit → `POST /api/admin/growth/ctas`, server-confirmed) y `CtaPreviewHarness` (renderer
  canónico bajo harness: scrubber density 560/400, esquema claro/oscuro vía `colorScheme`, hosts
  Think navy/WP, matriz pairwise con `ScaledFrame`, degradación bloquea revisión). Copy
  `GH_GROWTH_CTA_OPERATOR(.cockpit)` en `src/lib/copy/growth.ts`. Métricas de marketing:
  `getCtaMarketingMetrics` (readers.ts; Tier B viewed + ledger, rates/deltas SERVER-side,
  `coverage='impressions_undercounted'` cuando clicks>viewed — la UI muestra conteos, jamás un
  % imposible) wired a `CtaDetailVm.metrics`. `authorDraftCta` acepta `suppressionPolicy`
  (validado `ctaSuppressionPolicySchema`). GETs admin + POST author NO se gatean por
  `GROWTH_CTA_ENGINE_ENABLED` (el flag gobierna exposición pública; lifecycle sigue gated).
- GTM build: `scripts/gtm/build-cta-events-workspace.ts` (workspace→preview→publish gobernado).
- Seed/smoke: `scripts/growth/seed-cta-ai-visibility-followup.ts --smoke` ·
  `scripts/growth/_sanity-cta-store-sql.ts` (SQL vivo vs PG).

## Estado de rollout (actualizar al cambiar)

- **2026-07-21: quinta acción `open_meeting_scheduler` + piloto `/agenda/` RELEASED.** El Action
  Registry y el renderer ya abren la experiencia nativa `meeting_scheduler`; el piloto público
  de WordPress opera native-only, sin link ni iframe de fallback HubSpot. Pendiente para cerrar
  el rollout end-to-end: booking controlado + replay idempotente, verificar `/g/collect` y
  publicar/verificar GTM bajo aprobación explícita.

- **2026-07-18 (TASK-1430): Cockpit operator CODE-COMPLETE (local, sin push).** `/growth/ctas` es
  master-detail con autoría gobernada de 8 pasos, preview harness del renderer real, kill switches
  operables (global/surface, reason auditado), métricas de marketing server-side (CTR/tasas con
  trust tags y guard de cobertura — pedido explícito del operador) y bindings read-only
  (`surfaceAllowsCtaSlug`; mutación de allowlist sigue API-only). Autoridad visual: proyecto
  Claude Design "Cockpit de CTAs" traducido a tokens (primitive nueva autorizada:
  `splitTemplateColumns` override en CompositionShell). GVC `task-1430-growth-cta-cockpit`
  (desktop) + `-mobile` (390) mirados. Sin flag nuevo, sin migración, sin telemetría nueva.
  Rollout pendiente: push/release + smoke staging.

- **2026-07-18 (TASK-1431): Action Registry + navegación gobernada CODE-COMPLETE (local, sin push).**
  Registry tipado (`action-registry.ts`) con `open_growth_form` + `link_url`/`open_think_tool`/
  `book_meeting`; executor del renderer por familia `growth_form|navigate` — navigate = `<a href>`
  REAL (rel seguro, `target=_blank` opt-in + affordance sr-only, pending single-dispatch accesible,
  recovery 4s `navigation_stalled`, fail-closed `action_unsupported` ante kind desconocido). Bundle
  `1.2.0-preview.1`; fixtures navigate + preview inerte en `/growth/ctas`; GVC
  `task-1431-growth-cta-actions` mirado (1440/390). SIN migración; telemetría SoT intacta
  (`action_kind` porta 4 valores — TRACKING-PLAN §CTAs delta). **Rollout pendiente**: push/release,
  bundle 1.2.0 desplegado en hosts ANTES de publicar cualquier CTA con action nueva (bundle viejo
  falla closed), smoke staging de destinos reales. Arch delta §27.

- **2026-07-18: PRIMERA REBANADA EN PRODUCCIÓN (released).** Flag `GROWTH_CTA_ENGINE_ENABLED` ON
  en staging + Production (solo Vercel lo lee). CTA `ai-visibility-report-followup` published,
  LIVE en el reporte Think (`/brand-visibility/r/*`, dock `GrowthCtaDock.astro`, env
  `GREENHOUSE_CTA_SURFACE_ID`/`GREENHOUSE_CTA_EMBED_KEY` en Vercel de `efeonce-think`). GTM v4
  publicado (6 tags + 6 triggers CE + 7 DLVs) + custom dimensions GA4 `cta_slug`/`cta_location`/
  `placement`.
- **2026-07-18 (TASK-1427): WordPress live en página de PRUEBA + E2E verificado en ambos hosts.**
  Página `efeoncepro.com/greenhouse-cta-prueba/` (id `251561`, noindex, `cta-location=wp_test_page`,
  bloque HTML con el snippet, cero cambios de tema — rollback = borrar la página). Evidencia:
  dataLayer + `/g/collect` (3 eventos) + ingest 202 + ledger `browser_reported/accepted` + forja
  403 (`surface_unauthorized`). ⚠️ Ningún host tiene CMP/consent-mode defaults — los tags disparan
  sin gate (postura pre-existente del sitio; LEARNINGS 2026-07-18). Ventana steady-state 7d abierta
  (hasta 2026-07-25). Pendiente: placement AMPLIO WP (decisión del operador post-validación;
  recomendado posts del blog vía `the_content` en `ohio-child`), placement interruptivo, cockpit
  de autoría, más acciones.
- **2026-07-18 (release `d5db8b568`, PR #159+#160): TASK-1428 + TASK-1429 EN PRODUCCIÓN.**
  Enforcement de suppression **ON en staging y Production** (verificado E2E post-release:
  visitante dismissed → excluido; fresco → ve; `engineState: ok`). Kill switches operativos en
  prod (mismo código verificado live en staging: engage→killed→release sin redeploy). El
  renderer `1.1.0` envía identidad pseudónima — el loop de suppression opera con visitantes
  reales. Manifest `released`; watchdog con residual conocido `ops-worker` (label, diff runtime
  vacío). Ventana monitor 7d `growth.cta.*` hasta 2026-07-25. Pendiente de negocio: primera
  campaña `slide_in` real (surface/copy/trigger = decisión del operador; el motor está listo).
- **2026-07-18 (TASK-1429): slide_in interruptivo + Experience System CODE-COMPLETE (local).**
  El renderer monta el interruptivo 0–1 del arbiter vía `SlideInController` (bundle `1.1.0`);
  envía la identidad pseudónima por headers al render/ingest (TASK-1428 cierra el loop: dismiss/
  caps ya operan por visitante real cuando enforcement esté ON); `viewed` visibility-gated con
  corte de semántica registrado en TRACKING-PLAN §CTAs; tokens 2026 (`light-dark()` +
  `color-mix(in oklch)` con fallbacks `@supports`, nombres `--gh-cta-*` intactos); preview
  `/growth/ctas` con matriz de density + demo vivo del overlay; GVC desktop+mobile mirado
  (scenario `task-1429-growth-cta-interruptive-placement`). NO hay CTA slide_in publicado aún:
  el primer interruptivo real (surface/copy/trigger) es decisión del operador post-rollout.
- **2026-07-18 (TASK-1428): suppression/Tier B/kill switches CODE-COMPLETE en SHADOW (sin push).**
  Migración `20260718131956294` aplicada a la instancia (3 tablas aditivas dormidas). Flag
  `GROWTH_CTA_SUPPRESSION_ENFORCEMENT_ENABLED` default OFF = shadow (decisión computada +
  registrada `enforced=false` en el rollup, renders intactos). Kill switch = estado en DB
  (`POST /api/admin/growth/ctas/kill-switch`, capability `growth.cta.pause`), SIEMPRE enforced
  (no depende del flag de suppression). Render público acepta headers
  `x-greenhouse-cta-visitor/-session/-consent/-consent-source` y responde `engineState ok|killed`
  aditivo — el renderer AÚN no los envía (eso es TASK-1429). Signals nuevos:
  `kill_switch_active`/`priority_collision`/`event_ingest_backpressure`. SQL vivo validado
  (`_sanity-cta-suppression-sql.ts`). Rollout pendiente: push → shadow-compare staging →
  enforcement staging + smoke kill switch sin redeploy → prod gradual (ledger §Pendientes).

## Hard rules (anti-regression — arch §20 + aprendizajes de implementación)

- **NUNCA** (TASK-1431) agregar un action kind sin su entry completo: enum en `contracts.ts` +
  metadata browser-safe + entry del registry (schema+resolver) + espejo/executor del renderer
  JUNTOS (parity test de familias revienta si divergen). Un kind sin entry NO publica NI renderiza.
- **NUNCA** (TASK-1431) renderizar una acción navigate como `<button>` con `location.assign`: es un
  `<a href>` REAL (semántica nativa). Externo/newContext lleva `rel='noopener noreferrer'`;
  `target=_blank` SOLO por opt-in del autor (`openInNewContext`) + affordance sr-only. La
  telemetría `clicked` sale ANTES de navegar (ingest `keepalive`) y el destino (URL) JAMÁS viaja
  en telemetría — solo `action_kind` allowlisted.
- **NUNCA** (TASK-1431) resolver un destino fuera de la gobernanza: `link_url` solo root-relative o
  https sin credenciales (anti `//host` y `/\host`); `open_think_tool` guarda un PATH (el host lo
  pone el motor — el autor jamás elige host) con campaign context UTM-allowlisted strict;
  `book_meeting` solo hosts de booking gobernados y es navegación-only (CERO write CRM por click —
  el adapter CRM es `hubspot_handoff`, demand-driven futuro).
- **NUNCA** confundir `book_meeting` con `open_meeting_scheduler`: el primero conserva la navegación
  legacy; el segundo abre la experiencia nativa y delega funnel/booking/receipt a
  `greenhouse-growth-meetings`. `fallbackHref` puede persistir en la proyección V1 por compatibilidad
  con clientes cacheados, pero el renderer actual NO lo consume ni renderiza. Falla de bundle/config,
  estado `fallback_only` o mes vacío se recuperan con `Reintentar`/navegación mensual; jamás con un
  link o iframe HubSpot visible.

- **NUNCA** arbitrar/decidir política en el browser: el renderer recibe 0–1 interruptivo + N
  no-interruptivos YA resueltos; targeting/priority/suppression jamás cruzan al contrato.
- **NUNCA** tratar un evento browser como conversión: todo ingest público entra
  `browser_reported`; solo `server_confirmed` (u submission server-aceptada de forms) es verdad.
- **NUNCA** duplicar schema/validación/consent de Growth Forms: `open_growth_form` monta el
  `<greenhouse-form>` gobernado y guarda solo la relación (test de boundary lo vigila).
- **NUNCA** editar una `cta_version` published (trigger DB lo bloquea): editar = versión nueva;
  publish deprecia la anterior en la misma tx.
- **NUNCA** escribir exposición masiva (`viewed`/`eligible`/`suppressed`) al ledger OLTP: va al
  rollup agregado (`cta_exposure_rollup`) vía `exposure.ts` (fail-open, sampling); los rechazos
  Tier B tampoco entran al ledger (su CHECK de `event_kind` es Tier A-only).
- **NUNCA** reconstruir ventanas de suppression en el browser/renderer: la decisión es server-side
  (`suppression.ts` + visitor state); el browser recibe solo el outcome mínimo (`engineState`,
  resultado arbitrado) — jamás ventanas, razones internas ni candidate set.
- **NUNCA** persistir visitor/session keys crudas (se hashean server-side; la key `visitor` solo
  habilita estado durable con `consentState='granted'` — sin consent, session-scoped 48h).
- **NUNCA** suprimir por `already_converted` desde un claim browser: solo con `formSubmissionId`
  verificado server-side contra Growth Forms (`isSubmissionServerAccepted`).
- **NUNCA** implementar el kill switch como env var: es estado OPERATIVO en DB
  (`cta_kill_switch_event` append-only, command `setCtaKillSwitch`, capability `growth.cta.pause`)
  y opera sin redeploy; killed produce `engineState='killed'`, nunca un falso vacío/`dismissed`.
- **NUNCA** servir una impresión interruptiva en enforcement sin el claim atómico
  (`claimInterruptiveImpression` FOR UPDATE — multi-tab determinista, exactamente uno gana).
- **NUNCA** saltarse el cross-check `cta_version↔surface` + embed key + origin en el ingest; los
  rechazos se persisten sin PII (capped por IP/hora) — son la fuente del signal de forja.
- **NUNCA** agregar un selector CSS del renderer que no use `:is(greenhouse-cta, .ghc-scope)` —
  el preview y el público comparten reglas por construcción (drift real atrapado en GVC 2026-07-18).
- **NUNCA** emitir un evento/param fuera del SoT (`CTA_GTM_EVENT_NAMES`/allowlist): extender SoT +
  espejo del renderer JUNTOS (el parity test revienta si divergen) y registrar en TRACKING-PLAN.
- **NUNCA** (TASK-1429) darle al `slide_in` semántica modal (`aria-modal`/focus trap/focus steal
  al abrir): es `role='complementary'` no modal; Escape + focus return sí son obligatorios. La
  persistencia del dismiss JAMÁS depende de `animationend` (mecánica `@starting-style` +
  `transition-behavior: allow-discrete`). El trigger vive en el BUNDLE (el host no define
  triggers) y la density se deriva del contenedor PROPIO (`full|condensed|peek`), nunca del
  viewport del host. `viewed` es visibility-gated (IO ≥50% + dwell) — no volver al mount=viewed.
- **NUNCA** (TASK-1429) crear el `visitorKey` durable sin `consent-state="granted"` declarado por
  el host, ni derivar keys del browser (UUID opaco random; cero fingerprinting). El guard local
  de dismiss es defensa-en-profundidad de sesión — la autoridad es el visitor state del server.
- **NUNCA** armonizar los 3 namespaces: `greenhouse_cta_*` (browser/GTM) ≠ `growth.cta.*`
  (interno: outbox/signals/capabilities) ≠ `gh_cta_clicked` (rail legacy ad-hoc WP — deprecar,
  no renombrar). Ningún click de CTA es key event GA4.
- **NUNCA** committear/loggear embed key secrets (solo hash en DB; rotables vía
  `POST /api/admin/growth/ctas/surfaces {action:'rotate_embed_key'}`).
- **NUNCA** publicar tags al container GTM sin workspace→quick_preview→confirmación humana.
- **SIEMPRE** fail-closed en superficie pública: sin contrato/flag OFF/error ⇒ el element queda
  `display:none`, jamás un card roto. `pause` (capability separada de `publish` a propósito) es el
  freno de emergencia per-versión (§16.3): deja de arbitrarse en ≤ ~2 min (TTL del cache CORS).
- **SIEMPRE** que se agregue capability/flag/signal: grant a rol real mismo PR · fila en
  `FEATURE_FLAG_STATE_LEDGER.md` · wire-up en `get-reliability-overview.ts`.

## Sinergias (cómo compone con las demás skills)

- **`greenhouse-growth-forms`** — el action target de V1: el CTA abre el `<greenhouse-form>`
  gobernado. Boundary duro: forms es la autoridad de campos/validación/consent/conversión
  (`generate_lead` sigue siendo SU key event). Reusos permitidos: `readers.ts` (resolver el form) +
  `embed-key.ts` (crypto) + `public-submission` (abuse core). Nada más.
- **`greenhouse-growth-meetings`** — autoridad de config/availability/booking, timezone visitante,
  idempotencia y conversión receipt-gated de `open_meeting_scheduler`. CTA sólo posee launcher,
  task surface y handoff; una apertura nunca equivale a un lead.
- **`greenhouse-gtm-ga4-operator`** — construye/publica los tags de la familia `greenhouse_cta_*`
  y las custom dimensions GA4; este dominio define QUÉ se emite (SoT), aquel CÓMO se taggea.
  Registro obligatorio en TRACKING-PLAN §CTAs.
- **`efeonce-public-site-wordpress`** — embed del snippet en WordPress (Elementor/HTML widget),
  enqueue del bundle pineado, verificación live del host. El placement WP es decisión del host.
- **`greenhouse-backend` + `greenhouse-postgres`** — patrones canónicos de rutas/commands/SQL/
  migraciones al tocar el primitive o el schema.
- **`greenhouse-ux` + product-design (`modern-ui`/`state-design`/`motion-design`/
  `greenhouse-ux-writing`)** — nuevas variantes visuales, placements interruptivos (dialog/focus
  trap/anti-CLS), copy estructural del renderer y de la gobernanza. Todo copy de campaña es DATO
  del contrato, validado con ux-writing al autorarlo.
- **`growth-marketing-cro`** — criterio CRO: qué CTA, qué copy, qué targeting; sin dark patterns;
  experimentación powered sigue DIFERIDA (nada de declarar "winners").
- **`greenhouse-production-release`** — el flip productivo de cambios del motor va por el release
  control plane; flags multi-runtime según el ledger.
- **`astro` (+ overlay efeonce-think)** — el dock de Think (`GrowthCtaDock.astro`) y futuros
  islands; cross-repo siempre rama+PR (main auto-deploya).

## Common commands

```bash
pnpm vitest run src/growth-cta-renderer src/lib/growth/ctas       # suites dominio + renderer
pnpm renderer:cta:build                                           # bundle público (canal preview)
pnpm fe:capture task-1340-growth-cta-renderer --env=local         # GVC gobernanza + preview
npx tsx --require ./scripts/lib/server-only-shim.cjs scripts/growth/seed-cta-ai-visibility-followup.ts --smoke
pnpm staging:request "/api/admin/growth/ctas"                     # inventario vía API admin
pnpm staging:request "/api/admin/growth/ctas/kill-switch"         # estado + audit del kill switch
npx tsx --require ./scripts/lib/server-only-shim.cjs scripts/growth/_sanity-cta-suppression-sql.ts  # SQL vivo TASK-1428
```

## Reference docs

- Arquitectura: `docs/architecture/GREENHOUSE_GROWTH_CTA_POPUP_ENGINE_ARCHITECTURE_V1.md` (+ §23
  delta foundation) · ADR `GREENHOUSE_GROWTH_CTA_POPUP_ENGINE_DECISION_V1.md`
- Funcional: `docs/documentation/growth/motor-cta-popup.md`
- Operar/embeber (runbook): `docs/manual-de-uso/growth/operar-motor-cta.md`
- Master UI flow: `docs/ui/flows/EPIC-023-growth-cta-popup-UI-FLOW.md`
- Medición: `docs/reference/measurement-gtm-ga4/TRACKING-PLAN.md` §CTAs + doc `04`
- Tasks fuente: `docs/tasks/complete/TASK-1339-*.md` + `TASK-1340-*.md`

## Skill Maintenance Contract

**Esta skill se actualiza en el MISMO change set** que cualquier cambio de flujo crítico del motor
(ambos espejos: `.claude/skills/greenhouse-growth-ctas/` y `.codex/skills/greenhouse-growth-ctas/`):

- cambios de schema `cta_*`, state machine, o versión del contrato (`greenhouse-growth-cta-popup.v*`);
- atributos/tokens/variantes/estados del renderer, o el patrón de paridad CSS;
- familia de eventos/allowlist de telemetría, tags GTM, o custom dimensions;
- rutas API públicas/admin, capabilities `growth.cta.*`, flags, o signals;
- nuevas acciones del router, placements (interruptivo), Tier B, kill switch global, o el cockpit;
- cambios del estado de rollout (§Estado de rollout — mantener la fecha y lo pendiente al día).

Si un agente cierra una task del motor sin tocar esta skill, el cierre está incompleto
(`greenhouse-documentation-governor` la trata como doc viva del dominio).
