# TASK-1438 — Link Hub Efeonce Instagram and TikTok pilot

<!-- ZONE 0 — IDENTITY & TRIAGE -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Muy alto`
- Effort: `Medio`
- Type: `implementation`
- Execution profile: `standard`
- UI impact: `none`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `none`
- Epic: `EPIC-030`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `growth|social|ops|public-site`
- Blocked by: `TASK-1433|TASK-1434|TASK-1435|TASK-1437`
- Branch: `task/TASK-1438-link-hub-efeonce-instagram-tiktok-pilot`
- Legacy ID: `none`
- GitHub Issue: `n/a`

## Summary

Cierra el primer vertical real: crea/publica Efeonce desde Greenhouse, provisiona `links.efeoncepro.com/efeonce`, valida rendimiento/accesibilidad/medición en dispositivos y navegadores in-app, y sólo después cambia los enlaces de perfil de Instagram y TikTok con aprobación humana, snapshot y rollback.

## Why This Task Exists

Código y DNS no prueban el job real. La capacidad existe para abrirse desde perfiles sociales; debe verificarse con contenido/destinos reales, eligibility de cuenta, cache/preview social, dispositivos, GA4/HubSpot y una ventana de observación. Cambiar la bio antes de esa evidencia arriesga romper el canal principal.

## Goal

- Publicar una página Efeonce brand-correct desde Greenhouse, sin hardcodes.
- Verificar URL/HTTPS/performance/a11y/in-app y links/forms reales.
- Actualizar Instagram/TikTok sólo con confirmación humana y rollback inmediato.
- Observar 7 días y documentar baseline de views/clicks/conversiones con limitaciones.

<!-- ZONE 1 -->

## Architecture Alignment

- `docs/architecture/GREENHOUSE_LINK_HUB_CONTROL_PLANE_DECISION_V1.md`
- `docs/epics/to-do/EPIC-030-greenhouse-link-hub-control-plane.md`
- `docs/operations/LOCAL_FIRST_DEVELOPMENT_WORKFLOW_V1.md`

Reglas obligatorias:

- No modificar perfiles sociales antes de sign-off explícito y smoke live.
- Capturar URL anterior/screenshot/texto de bio antes del cambio y mantenerla como rollback.
- TikTok website-link eligibility se verifica en la cuenta real; no se asume por docs.
- No publicar destinos placeholders, rotos o no autorizados.
- Analytics baseline es best-effort; no prometer atribución completa.

## Normative Docs

- `.codex/skills/social-media-studio/efeonce/EFEONCE_OVERLAY.md`
- `.codex/skills/social-media-studio/modules/09_ANALYTICS_MEASUREMENT.md`
- `docs/context/09_marca-agencia.md`
- `docs/context/05_voz-tono-estilo.md`

## Dependencies & Impact

### Depends on

- TASK-1433/1434/1435/1437 complete and production-ready.
- TASK-1436 for base domain/DNS/SSL status as applicable.
- Owner access to Efeonce Instagram/TikTok and explicit publish approval.

### Blocks / Impacts

- Evidence gate for `TASK-1439` client rollout.

### Files owned

- `docs/operations/link-hub-efeonce-pilot-runbook.md`
- `docs/audits/growth/**link-hub**`
- lifecycle/docs only; runtime files remain owned by foundation tasks

## Current Repo State

### Already exists

- Social channels/brand context, GA4/HubSpot infrastructure and DNS/Vercel operations.

### Gap

- No live Efeonce Link Hub or verified social-profile cutover baseline.

## Modular Placement Contract

- Topology impact: `none`
- Current home: production runtime delivered by TASK-1433…1437; this task owns rollout evidence/runbook.
- Future candidate home: `remain-shared`
- Boundary: Greenhouse publish/domain/analytics commands plus human-approved external profile mutation.
- Server/browser split: n/a; no new runtime code expected.
- Build impact: `none`.
- Extraction blocker: external account eligibility/ownership and propagation/cache in social apps.

<!-- ZONE 2 intentionally empty -->

<!-- ZONE 3 -->

## Scope

### Slice 1 — Content and live URL readiness

- Create Efeonce page/blocks/brand pack through Greenhouse; review all destinations/copy/assets/legal.
- Provision standard host/path, publish, HTTPS/cache/rollback smoke and production GVC.

### Slice 2 — Real-device and measurement proof

- Test Instagram/TikTok in-app, iOS/Android representative, keyboard/accessibility and Growth Form/HubSpot path.
- Confirm GA4/GTM/Greenhouse event reconciliation and error-free navigation.

### Slice 3 — Human-approved profile cutover

- Snapshot current bios/links; verify TikTok eligibility; propose exact new URL.
- After explicit approval, update one profile at a time, smoke from profile and observe before the second.

### Slice 4 — Seven-day pilot closure

- Monitor availability, click destinations, event freshness and conversions for seven days.
- Record baseline/limits, incidents and go/no-go for client productization.

## Out of Scope

- Creating social posts/campaigns, changing account type to gain eligibility, buying followers, custom client domain or client onboarding.

## Detailed Spec

Recommended sequence: Instagram first if its website field is available and verified, then TikTok after account eligibility. If either platform rejects or suppresses the link, keep the live URL but do not force account changes; document blocker and continue with the eligible platform.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Live URL -> real-device/measurement -> explicit approval -> one-profile cutover -> observation -> second profile -> 7d close.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| bio link unavailable/ineligible | TikTok/Instagram | medium | account check before cutover | edit-profile field absent |
| broken destination | public | low | full link smoke + rollback URL | 4xx/5xx/manual fail |
| in-app incompatibility | UI | medium | real-device test | render/form failure |
| bad attribution | analytics | medium | evidence labels/reconciliation | event mismatch |

### Feature flags / cutover

- Allowlist Efeonce page under `GROWTH_LINK_HUB_ENABLED`; retain global kill/fallback path.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| 1 | restore prior published version/flag OFF | <10 min | sí |
| 2 | disable analytics only; page stays | <10 min | sí |
| 3 | restore captured previous profile URL | <5 min/profile | sí |
| 4 | end pilot and preserve evidence | inmediato | sí |

### Production verification sequence

1. Anonymous URL/HTTPS/headers/links.
2. In-app + Growth Form/HubSpot + GA4.
3. Instagram cutover/smoke/cooldown.
4. TikTok eligibility/cutover/smoke.
5. 24h/7d monitoring and closure.

### Out-of-band coordination required

Human owner of Efeonce Instagram/TikTok must approve and execute/authorize profile mutations; GTM publish approval if tags change.

<!-- ZONE 4 -->

## Acceptance Criteria

- [ ] Given Greenhouse, When Efeonce page is edited/published/rolled back, Then no DB/Vercel content operation is needed.
- [ ] Given live URL, When opened on mobile/in-app, Then all approved links/forms work with no overflow/login/raw error.
- [ ] Given social profile change, When executed, Then prior state is captured and explicit human approval is recorded.
- [ ] Given TikTok account, When eligibility is checked, Then the result is documented without changing account type automatically.
- [ ] Given seven days of evidence, When reported, Then views/clicks/conversions include freshness/confidence/dark-social caveat and no PII.

## Verification

- `pnpm task:lint --task TASK-1438`
- production GVC + real-device Instagram/TikTok checklist
- anonymous HTTPS/link/form smoke
- GA4/GTM/Greenhouse/HubSpot reconciliation
- 24h and 7d reliability observation

## Closing Protocol

- [ ] Lifecycle/index/Handoff/changelog/runbook/audit synchronized.
- [ ] Profile snapshots/approval/rollback evidence stored without secrets.
- [ ] `pnpm qa:gates --changed` and `pnpm docs:closure-check` executed.

## Follow-ups

- `TASK-1439` client productization.

## Open Questions

- Exact Efeonce destinations/order/copy require operator content approval during Slice 1; architecture and task execution do not invent them.
