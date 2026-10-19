---
name: greenhouse-growth-meetings
description: "Operate the Greenhouse native meeting scheduler end to end: provider-neutral public contracts backed by HubSpot Scheduler, visitor-timezone availability, corporate-email validation, idempotent booking, portable adaptive renderer, Growth CTA activation, receipt-gated GTM/GA4 measurement, WordPress/Think embedding, rollout and reliability. Use when touching `src/lib/growth/meetings/**`, `src/growth-meeting-renderer/**`, `/api/public/growth/meetings/**`, `greenhouse_growth.meeting_*`, the `efeonce-meeting-scheduler` custom element, the `open_meeting_scheduler` CTA action, `gh_meeting_*` telemetry, scheduler flags/bindings, or `growth.meeting.*` signals."
---

# Greenhouse Growth Meetings

Operate the native Efeonce booking experience without creating a second calendar. Keep HubSpot,
Office 365 and Teams behind a provider-neutral, server-governed Greenhouse contract.

## Load first

Read only the sources required by the change:

1. `project_context.md`, `Handoff.md` and the active task.
2. `docs/architecture/GREENHOUSE_GROWTH_MEETINGS_SCHEDULER_ARCHITECTURE_V1.md` for every contract,
   provider, security, renderer or measurement change.
3. `docs/public-site/decisions/PDR-009-hubspot-scheduler-native-booking.md` for product direction.
4. `docs/documentation/growth/scheduler-reuniones-nativo.md` and the matching runbook/manual for
   operator-facing behavior.
5. `docs/reference/measurement-gtm-ga4/TRACKING-PLAN.md` when telemetry or conversion changes.
6. The host skill and landing reference when embedding on WordPress or Think.

## Ownership map

| Concern | Canonical owner |
|---|---|
| Public schemas, provider policy, idempotency, booking receipt | `src/lib/growth/meetings/**` |
| Public transport | `/api/public/growth/meetings/**` |
| Portable UI and client state | `src/growth-meeting-renderer/**` |
| CTA launcher/task surface | `greenhouse-growth-ctas`; action `open_meeting_scheduler` |
| HubSpot availability and booking | Server-only HubSpot Scheduler adapter |
| Calendar event and video conference | Office 365 + Microsoft Teams through HubSpot |
| Browser measurement | `MEETING_GTM_EVENTS` and `MEETING_TELEMETRY_PAYLOAD_KEYS` |
| Conversion truth | Meeting execution ledger and one-time server-confirmed receipt |

Do not route this capability through `hubspot-greenhouse-integration`; that Cloud Run bridge owns a
different CRM write/webhook contract.

## AXIS visual composition — approved source, adoption pending (2026-10-05)

The native AXIS scheduler was approved visually and its source pushed previously. Growth CTA's
final AXIS presentation, including both banner recipes and `meetingPresentation: 'dialog' | 'inline'`,
is now approved by the operator. The two surfaces share the same adapter and retained state; they
never create another booking operation. Calendar cells show day number plus calendar/count and
an explicit unavailable marker; fields retain labels/icons and confirmation celebrates only an
explicit confirmed receipt, with static reduced-motion behavior.

AXIS owns tokens and portable presentation (`axisScheduler`, `/scheduler`, `/growth-cta`); Growth
Meetings retains its controller, config/availability/booking contracts, provider, CAPTCHA,
idempotency and receipt-gated conversion. Current `src/growth-meeting-renderer` is unchanged:
no adoption or public-host rollout is implied by approval or push. New composition exports require
release/install and a separately verified adapter before replacing that renderer.
Load `axis-design-system` and `efeonce-graphic-line`; details and evidence live in sibling AXIS
`SCHEDULER_COMPOSITION_DECISION_V1.md`, `GROWTH_CTA_COMPOSITION_DECISION_V1.md` and their
`docs/quality/` dossiers. Greenhouse continuity: TASK-2007.

## Planned consumer: global site header (EPIC-055 / TASK-2042)

**Planned, not built** (architecture proposed 2026-10-18). The «Agenda tu diagnóstico» button in the global header of
`efeoncepro.com` will open this scheduler through `<greenhouse-cta>` with the `open_meeting_scheduler` action; there
will be no other booking path. When implementing it in
[TASK-2042](../../../docs/tasks/to-do/TASK-2042-site-nav-wordpress-rollout.md):

- `cta-location` per entry point: `menu_header`, `menu_mega` or `menu_onepage`, to measure by entry point.
- The menu closes its panel (mega or onepage) and releases its scroll lock **before** opening the dialog, so the native
  `<dialog>` is the only owner of scroll lock and focus; the launcher stays mounted so focus returns to it on close.
- A Growth CTA surface **owned by the global header** (do not reuse a landing's surface), with its
  `meeting_surface_binding` and an origin allowlist covering every page where the menu appears. Its key is secret:
  never in docs, commits or messages.
- The dialog skin (the scheduler of `/agencia-inbound-marketing/`) lives today with landing scope in
  `scripts/public-website/inbound-source/page.css`; it moves to a shared site primitive, it is not copied.
- Without JavaScript or without a surface, the button is a plain link to `/agenda/`.

Contract: [`PUBLIC_SITE_GLOBAL_NAVIGATION_V1.md` §Agendador](../../../docs/architecture/public-site/PUBLIC_SITE_GLOBAL_NAVIGATION_V1.md#agendador).

## Operating loop

1. **Resolve the boundary.** Identify whether the change belongs to provider policy, public transport,
   renderer, CTA host, measurement or rollout. Keep route handlers thin.
2. **Preserve the contract.** Update server schemas, renderer mirrors and parity tests together. Keep
   browser DTOs allowlisted and provider-neutral.
3. **Implement native recovery.** Handle empty months, transport errors and unavailable configuration
   inside the scheduler through bounded month navigation, explicit status and `Reintentar`.
4. **Verify behavior.** Run focal tests, type/lint/build gates proportional to the change, then validate
   desktop, 390 px, keyboard, reduced motion, overflow and console state in a real host.
5. **Verify integrations only with approval.** A controlled booking must prove the same meeting in
   HubSpot, Outlook and Teams plus idempotent replay. Never create a booking during a visual smoke.
6. **Roll out through the control planes.** Coordinate flags, active surface binding, production release,
   host deployment and GTM publication as separate governed mutations.

## Hard rules

- Keep HubSpot Scheduler as server-side provider and source of truth for configuration, availability
  and booking. Never expose its token, scheduling URL, provider IDs, raw response or raw error.
- Keep the native experience native-only. `open_meeting_scheduler` must never render or follow a
  HubSpot iframe/link. Recover through retry, month navigation or an honest terminal state.
- Treat `fallbackHref`, `fallback_only` and `fallback_opened` as V1 compatibility vocabulary only.
  Current renderers do not consume/render the href and do not emit `fallback_opened`; do not revive it.
- Keep `book_meeting` navigation-only for legacy surfaces. Never silently change it into native booking
  or delete a legacy host contract before that surface is explicitly migrated.
- Preserve the semantic month grid when a month has zero slots. Show unavailable days, month-specific
  empty copy and bounded previous/next navigation; never collapse the calendar into a blank panel.
- Display and book in the visitor's canonical IANA timezone. Treat the surface timezone only as fallback
  when detection fails, and require config, availability, request and provider response to agree.
- Reuse the Growth Forms corporate-email policy and datasets for debounced client feedback, then
  revalidate server-side before Turnstile, slot read, claim or provider write. Never trust browser approval.
- Require a durable idempotency claim before the provider call. Only a pre-write failure is reclaimable.
  `provider_dispatched`, `ambiguous` and `provider_created_invalid` never auto-retry or open another path.
- Emit `gh_meeting_booking_confirmed` only from a fresh, eligible server-confirmed receipt. Replays do not
  emit another conversion. GTM maps it to `generate_lead`; it is not also sent as a custom GA4 event.
- Never place PII, exact slot/timezone, receipt, idempotency/correlation keys, provider IDs, Teams URL,
  raw attribution or provider errors in browser telemetry.
- Keep presentation recipes on one controller and one booking command. Resizing or reopening must not
  remount provider effects, clear the draft, emit duplicate steps or create another intent.
- Reload or freshly navigate the real host after a deploy/cache purge before smoke testing. An already
  open tab can retain the previous custom-element bundle and is not evidence of the new runtime.
- Do not publish GTM, flip production flags, activate a binding, promote another landing or create a real
  booking without the corresponding explicit approval.

## Measurement contract

- Use `gh_meeting_step_reached` for non-conversion funnel progress; never mark it as a key event.
- Use `gh_meeting_booking_confirmed` only as the dataLayer input that GTM transforms to
  `generate_lead` with `lead_source=meeting_booking`.
- Extend `MEETING_GTM_EVENTS`, `MEETING_STEPS`, `MEETING_TELEMETRY_PAYLOAD_KEYS`, the renderer mirror,
  parity tests and Tracking Plan together.
- Preserve server-confirmed ledger truth; GA4 remains a browser-reported mirror to reconcile.
- **Published backend matching:** Meta Lead matching originates in the backend after a
  successful provider booking and the guarded `provider_dispatched → succeeded` transition.
  `finalizeMeetingExecution` borrows one transaction for confirmation and optional encrypted
  `measurement_conversion` / delivery rows; SAVEPOINT failure cannot undo commercial success.
  Never create a second booking, backfill contacts or derive external identity from the receipt.
- Both portable renderers read `measurementContext` at POST time through
  `src/growth-measurement-context/context.ts`: resolved HubSpot categories, GPC and permitted real
  cookie identifiers only. Processing/communication consent is not advertising consent. Backend
  rejects unknown/denied advertising, GPC and context older than 10 minutes for matching.
- Eligibility comes from a reviewed/published measurement policy for the **active meeting
  binding fingerprint**, scheduler/surface and approved origin. Initial seed uses the actual
  `discovery` / `fhsf-efeonce-lead-gen-web` binding. Never revive `efeonce-discovery-30` as a
  matching constant or add schedulers to a sender list. A newly active binding alone does not
  authorize advertising; discover, validate and publish its compatible policy data.
- The original booking POST supplies visitor XFF/x-real-ip and User-Agent through
  `visitor-request.ts`. Reuse that encrypted snapshot, never worker IP/UA. Consented `_fbp`/`_fbc`
  remain raw; landing fbclid persists only after ads grant and clears on revoke/GPC. Meta
  contact fields use provider normalization/SHA-256 hex; external_id is normalized email hash
  (international-phone fallback), not executionId/receipt. Do not invent absent contact fields.
- Authenticated sGTM ingress requires schema 2 plus closed policy proof and strips proof before
  the Meta tag. Keep `website`, safe real page URL, occurrence UNIX seconds and durable UUID.
- Contact normalization/hash happens server-side using available email, international phone and
  separated first/last names. The durable backend UUID and event time are retained through retries.
  Meta ingress is authenticated and independently gated; the legacy GA4-derived Meta Lead sender
  is retired. The browser nonce can remain as safe telemetry but no longer owns Meta delivery.
- Google receives dedicated UPD only with analytics + advertising consent and a real GA4 client ID;
  UPD contains **no events**. The one browser `generate_lead` remains the GA4 conversion mirror.
  Restrict server GA4 forwarding to Client Name=GA4 to exclude the custom backend ingress.
- The existing ops-worker drains matching independently of meeting UX and HubSpot form delivery;
  up to 5 attempts/24 h, leases/CAS and 48 h encrypted-payload purge. Never treat HTTP acceptance,
  Test Events or an enabled audience as proof of real conversion processing or ads eligibility.
- Load the full current contract `docs/reference/measurement-gtm-ga4/10-growth-lead-matching-runtime.md`
  and `08-meta-conversions-api-server-side.md` before changing flags, capture, identity or destinations.
  Runtime/evidence:
  [published release](../../../docs/audits/releases/2026-10-14-scalable-measurement-agent-first-release.md).
  In that historical 14/10 cut, Server 9 strict v2 and both hosts were independently confirmed in Meta
  Test Events; compatible new-source enrollment was proven without redeploy/GTM publish. The 18/10
  checkpoint below supersedes the live version/configuration; real commercial conversion, CRM
  reconciliation and EMQ remain separate pending evidence.

## Verification proportional to the change

Use focal domain/renderer tests and the canonical CI/release gates. Documentation-only closure
needs link/mirror/context checks, not a local application build. After resource pressure, keep
local checks bounded and run mandatory full build/type/lint gates in CI; never claim a skipped
local check passed. Load `greenhouse-production-release` for promotion and hooks/CI exceptions.

```bash
NODE_OPTIONS=--max-old-space-size=512 pnpm vitest run src/lib/growth/meetings --maxWorkers=1
```

For host verification, assert the current bundle loaded, the calendar remains present for an empty month,
`a[href*="meetings.hubspot.com"]` is absent from the native surface, `scrollWidth === clientWidth`, and
there are no console errors. Exercise booking and `/g/collect` only in their separately approved gates.

## Compose with

- `greenhouse-growth-ctas` for launcher, dialog/full-screen task surface and action registry.
- `greenhouse-growth-forms` for the shared corporate-email policy only; meetings owns its form state and booking.
- `greenhouse-gtm-ga4-operator` for workspace, preview, publish and GA4 verification.
- `efeonce-public-site-wordpress` or `astro` for the host adapter.
- `hubspot-as-a-service` only when configuring a client portal; it does not own this runtime.
- `greenhouse-production-release` for Greenhouse production rollout.

## Maintenance contract

Update both `.codex` and `.claude` copies in the same change set when changing the public schema, provider
boundary, state machine, native-only recovery, renderer recipes, CTA action, telemetry, flags, bindings or
rollout gates. Update the architecture or PDR first when the durable decision changes; keep release IDs,
page backups, current availability and one-off smoke evidence in tasks, ledgers, handoff or landing references.

## Published policies: agents and panel share one contract

Use the [policy ADR](../../../docs/architecture/GREENHOUSE_GROWTH_MEASUREMENT_POLICY_DECISION_V1.md)
and [operator manual](../../../docs/manual-de-uso/growth/configurar-medicion-conversiones.md).
The policy binds stable source/version, surface, origin, typed mapping and independent destinations.
Destinations default OFF. Commercial purpose excludes subscribe/application/survey and high-risk
sources; new forms of those kinds are not automatically eligible. Only the two approved HTTPS
hosts are supported. A compatible source/version is enabled by reviewed policy data; a new
behavior, field type, provider, event or host may require code and governed publication.

### Agent operating loop

1. Use the canonical user-bound agent-session from `scripts/playwright-auth-setup.mjs` and a
   private `0600` ignored storage state. Set `GROWTH_MEASUREMENT_BASE_URL` to the exact HTTPS origin
   and `GROWTH_MEASUREMENT_STORAGE_STATE` to that file. Session expiry/denial requires refreshing
   canonical auth; never mint actor/role in JSON or copy cookies to another host/gateway. The
   CLI restricts cookies to that host/session and rejects redirects. Secrets stay out of arguments/logs.
2. Run `pnpm --silent growth:measurement --help`, then `discover`. Structured JSON includes
   `growth-measurement-policy.v1`, effective read/author/publish/disable capabilities, typed
   source fields/versions, blockers and current heads. Client users are denied; a local role
   label or an internal URL does not grant authority.
3. Build a metadata-only command from discovery; no contact values, IP, hashes or JavaScript.
   `validate comando.json` POSTs `{dryRun:true,command}` without draft/audit/conversion writes.
   Validation does not reserve state or publish; execution revalidates fresh server authority.
4. Within existing operator authorization, execute
   `apply comando.json --apply --receipt .auth/recibo.json`. Use one UUID per intended command and the discovered current
   `expectedPublishedRevisionId` (including null). Draft→review→publish uses distinct commands
   and keys; disable is separate. Publication is immutable: edits create a new revision.
5. `verify .auth/recibo.json` performs independent GET. Receipt `0600` is reserved before POST and
   the known write receipt is checkpointed before GET. Unknown outcome: retry the exact body,
   key and receipt; known receipt: retry GET only. A409 requires discovery and deliberate new
   authority, never overwrite or key reuse with changed content. The panel shares this client,
   retains unsaved values on conflict/reload and requires readback before success.

All four operations use `pnpm --silent growth:measurement …` (or
`pnpm exec tsx scripts/measurement/policy-cli.ts …`) for clean JSON. Exit 0 is success, 2 invalid, 3 conflict,
4 denied, 5 unavailable during validation, 6 potentially unknown outcome. Keep private receipts
for recovery; never print arbitrary provider errors or credentials.

Operational policy commands need no SQL or browser. They do not create forms, submit/book,
configure HubSpot mappings, write CRM contacts or send provider tests. New source provisioning
still uses its canonical Forms/Meetings commands. Growth Forms→HubSpot Forms→CRM and the
consented measurement projection retain separate mappings, outboxes and evidence. No MCP/Nexa
registration, issuer/OAuth scope expansion or new infrastructure was introduced by this CLI.
Provider delivery and real commercial outcomes require their own readback; CLI success is not
that evidence. Release proofs and pending real traffic/EMQ stay in the linked runtime/audit.


## LinkedIn Ads — preparación propuesta19/10/2026

Cargar [manual LinkedIn](../../../docs/manual-de-uso/growth/preparar-medicion-linkedin.md) y
[arquitectura Proposed](../../../docs/architecture/GREENHOUSE_LINKEDIN_ADS_MEASUREMENT_ARCHITECTURE_V1.md).
Sólo booking nuevo confirmado por proveedor y persistido; abrir agenda o escoger hora no convierte.
No existen policy/destino/recibo/bridge LinkedIn en este motor; no transformar `googleAdsConversion`,
`gh_ads_conversion` ni generate_lead genérico en permiso LinkedIn. Requiere cuenta/reglas/consentimiento
propios y eventId durable del hecho compartido con CAPI si se adopta; duplicados/polling no reemiten.
La cobertura Google no inscribe LinkedIn. No crear leads/reservas ficticios ni publicar al documentar.

## Google Ads online y EC — contrato y checkpoint 18-10-2026

Cargar [contrato/activación](../../../docs/manual-de-uso/growth/activar-conversiones-google-ads.md),
[arquitectura](../../../docs/architecture/GREENHOUSE_GOOGLE_ADS_MEASUREMENT_ARCHITECTURE_V1.md)
y [evidencia de activación](../../../docs/audits/growth/2026-10-18-google-ads-activation.md).
Para `meeting_booking`, exigir respuesta válida del proveedor, transición durable
`provider_dispatched → succeeded` y proyección de medición persistida antes de devolver
`googleAdsConversion` con UUID/key; nunca en dedupe/replay. El recibo comercial de booking y el
recibo Ads son contratos distintos. Exigir policy publicada para el binding vigente, flags de captura
y Ads habilitados (default OFF), cuatro permisos Google explícitos y GPC sin veto. Hashes sólo en el canal reservado
`user_data`, con memoria privada ≤10 s; nunca en dataLayer ni telemetría ordinaria. El evento dedicado
`gh_ads_conversion` queda excluido del forwarding GA4. No derivar Ads del `generate_lead` genérico
ni mezclar UPD/Meta. GCLID/GBRAID/WBRAID se observan con consentimiento; no se generan ni se disparan.
El circuito online sigue dependiendo del navegador y no tiene retries backend.

Checkpoint fechado 18/10: Web **6** / Server **10** publicados, Server primero; EC efectiva ON en
**6862539491**, bridge compatible publicado en WordPress/Think y flag Production true con companion
READY del mismo main liberado. Cobertura ampliada22:57Z:13 formularios comerciales y Discovery
(reserva) con Ads publicado. Son fuentes del sitio, no tipos de campaña Ads. Ambas acciones
siguen secundarias, ONE_PER_CLICK y valor de medición 0 CLP; no se modificaron pujas ni campañas.
Primera ocurrencia real, recepción proveedor y atribución siguen **sin verificar**; protocolo aislado,
negativos, tag fired, un flag o HTTP 200 no sustituyen esa evidencia. Releer estado live antes de operar.
Los drafts Web 8/Server 12 del [corte 17/10](../../../docs/audits/growth/2026-10-17-google-ads-online-conversions.md)
fueron consumidos por la publicación; no reconstruirlos ni reejecutar scripts privados históricos.
`pnpm --silent google-ads conversions bindings` relee IDs/labels saneados; el compilador offline no publica.

### Cobertura comercial por política

El alcance ratificado por el operador es sólo formularios que captan solicitudes comerciales
(contacto, cotización, diagnósticos y briefs elegibles). Excluye ebooks/descargas, newsletter,
postulaciones, soporte, encuestas y fixtures. La intención y `kind` se verifican en la fuente:
no inferir elegibilidad del nombre de la landing ni cambiar una clasificación por SQL directo.
Reutilizar `commercial_lead` y los tags genéricos; no crear un tag por formulario ni hardcodear slugs.
La agenda conserva `meeting_booking`, con confirmación proveedor y política propias.

Para ampliar: descubrir versión/surface/origen/head frescos, validar mapping y elegibilidad,
preservar destinos Meta/UPD y mapping CRM, luego draft→review→publish→readback mediante el comando
canónico dentro del alcance autorizado. El flag global no inscribe nuevas fuentes. Publicar una
versión Forms o cambiar un binding exige revisar la compatibilidad de su política; GA4 tagged no
significa Ads habilitado. La revisión al publicar es hoy un paso del operador, no una autopolicy.

[Publicación de cobertura18/10](../../../docs/audits/growth/2026-10-18-commercial-forms-policy-publication.md):
12 formularios adicionales publicados y verificados,13 Forms comerciales+Discovery activos.
AI Grader tiene intención comercial confirmada por el operador. Contacto es general y queda fueraAds.
Lead Gen Web corregido a quote_request por command/store Forms, preservando identidad y versión;
no se exceptúa globalmente lead_magnet ni se publica el plan viejo. La API nueva de clasificación
está publicada y su auditoría API Platform comparte transacción con el UPDATE Forms; usar el [manual](../../../docs/manual-de-uso/growth/corregir-clasificacion-comercial.md).
El [release de cierre](../../../docs/audits/releases/2026-10-18-grader-commercial-measurement-production-release.md)
publicó main `2559e9242`: Grader y clasificación auditada servidos, CI/Deep/smoke y manifest released.
Releyó Web6/Server10 y las14 fuentes sin nuevas publicaciones. La configuración y canarios
negativos no certifican una reserva comercial real, recepción, matching o atribución Ads.
