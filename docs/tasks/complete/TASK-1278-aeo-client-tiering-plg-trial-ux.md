# TASK-1278 — AEO Client Portal Tiering + PLG Trial UX

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `complete`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Execution profile: `ui-ux`
- UI impact: `interaction`
- UI ready: `yes`
- Wireframe: `docs/ui/wireframes/TASK-1278-aeo-client-tiering-plg-trial.md`
- Flow: `none`
- Motion: `none`
- Backend impact: `none`
- Epic: `EPIC-020`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `ui`
- Blocked by: `TASK-1277`
- Branch: `task/TASK-1278-aeo-client-tiering-plg-trial-ux`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

UX por tier de AEO en el portal cliente, sobre el workbench `/aeo` de TASK-1248: **contratado** ve el reporte completo; **trial PLG** ve "te quedan N de 3 revisiones este mes" + botón self-serve para generar su revisión + upsell al agotarse; **sin acceso** ve un teaser/locked gratis "Descubrí cómo te ve la IA → Hablá con tu equipo". El teaser es gratis (no corre el motor); el run pasa por el chokepoint gobernado de TASK-1277.

## Why This Task Exists

TASK-1277 construye el plano de entitlement + allowance + el run gobernado, pero sin superficie el cliente no puede consumir su tier ni el trial PLG impulsa la compra. El objetivo del operador es **Product-Led Growth**: el cliente existente prueba 1–3 revisiones/mes, ve el valor, y se siente impulsado a contratar AEO recurrente. Para eso la UI debe exponer el tier con honestidad (cupo restante, reset), permitir el run self-serve dentro del cupo, y reencuadrar el agotamiento como upsell (no error).

## Goal

- Banner de tier (contratado / trial con cupo restante + fecha de reset / agotado) sobre `/aeo`, alimentado por `resolveAeoEntitlement` (TASK-1277).
- Run self-serve dentro del cupo (botón → chokepoint `requestGraderRunForOrganization`), con estados honestos (preparando/ready/quota agotado/costo bloqueado).
- Teaser/locked gratis para clientes sin entitlement + upsell al agotar el trial — ambos como cross-sell, sin self-checkout (cierre vía equipo/Nexa).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/ui-platform/README.md` + `PATTERNS.md`/`STATE.md` (estados, Locked + CTA)
- `docs/architecture/GREENHOUSE_PUBLIC_AI_VISIBILITY_GRADER_ARCHITECTURE_V1.md`
- `docs/tasks/complete/TASK-1248-growth-ai-visibility-client-report-ui.md` (workbench reusado)
- `docs/context/08_estrategia-comercial.md` (cross-sell Motor 1; tono de upsell)

Reglas obligatorias:

- El run NUNCA se dispara fuera del chokepoint de TASK-1277 (la UI es cliente del command).
- El **teaser/locked es gratis** (no corre el motor); solo el run consume allowance.
- Estados honestos: cupo agotado = upsell, no error; nunca prometer monitoreo que el tier no da; nunca exponer costo/engine interno.
- Copy es-CL en `src/lib/copy/growth.ts` (invocar `greenhouse-ux-writing`; touchpoint cliente, cuidar tono/marca).
- GVC desktop + mobile mirado; sin scroll horizontal; severidad/tier color-independiente.
- Botón/CTA de Nexa (si se usa para "seguir con Nexa") = Nexa Mark + Shiny Button navy (convención de marca).

## Normative Docs

- `docs/ui/wireframes/TASK-1278-aeo-client-tiering-plg-trial.md`
- TASK-1277 (chokepoint + `resolveAeoEntitlement` + run route de portal)

## Dependencies & Impact

### Depends on

- **TASK-1277** (entitlement resolver + run chokepoint + run route de portal + módulo) — bloqueante.
- TASK-1248 (workbench `/aeo` + report model) — existe.

### Blocks / Impacts

- Habilita el cross-sell PLG en el portal (Motor 1). Cross-impact con TASK-1276 (operador ve tiers) y el follow-up de señal HubSpot.

### Files owned

- `src/views/greenhouse/growth/ai-visibility/client/**` (banner de tier, run CTA, upsell, locked) `[verificar]`
- `src/lib/copy/growth.ts` (copy de tier/trial/upsell/locked)
- `scripts/frontend/scenarios/growth-aeo-client-tiering.scenario.ts`

## Current Repo State

### Already exists

- Workbench `/aeo` (TASK-1248) con estados empty/preparing/error.
- (Tras TASK-1277) `resolveAeoEntitlement` + `requestGraderRunForOrganization` + módulo gate.

### Gap

- No hay banner de tier, run self-serve, upsell ni teaser/locked; el cliente no puede consumir su trial ni entender su cupo.

## UI/UX Contract

### Experience brief

- UI rigor: `ui-standard`
- Usuario / rol: cliente del portal (`client_*`), 3 tiers (contratado / trial / sin acceso)
- Momento del flujo: entra a AEO en el portal
- Resultado perceptible esperado: contratado consume su reporte; trial corre su revisión y ve cupo; sin acceso conoce y pide AEO
- Friccion que debe reducir: hoy AEO no existe como experiencia gobernada por tier en el portal
- No-goals UX: self-checkout, exponer costo/engine, freepass de runs

### Surface & system decision

- Surface: `/aeo` (mismo, gateado por módulo TASK-1277) + estados de tier alrededor del workbench
- Composition Shell: `aplica` (reusa el `masterDetail` del workbench)
- Primitive decision: `reuse` (workbench TASK-1248) + `new` cards de tier/upsell/locked
- Adaptive density / The Seam: `aplica` (cards condensan por ancho)
- Floating/Sidecar/Dialog decision: no aplica — banner + cards in-page; el run es estado in-page, no superficie flotante
- Copy source: `src/lib/copy/growth.ts`
- Access impact: `entitlements` (módulo `ai_visibility_v1` + capability del run, definidos en TASK-1277)

### State inventory

- Default: contratado → workbench completo
- Loading: skeleton del banner + workbench
- Empty: trial sin revisión aún → CTA "Generar revisión"
- Error: run falló → reintentar si actionable
- Degraded / partial: reporte parcial (heredado de TASK-1248)
- Permission denied: sin entitlement → teaser/locked (no error duro)
- Long content: workbench con scroll interno (heredado)
- Mobile / compact: banner + cards apiladas; workbench compacto (heredado de TASK-1248)
- Keyboard / focus: CTA run accesible; foco al estado "preparando" tras correr
- Reduced motion: estados sin motion gratuito

### Interaction contract

- Primary interaction: (trial/contratado con cupo) generar revisión → preparando → workbench; (sin acceso) CTA a equipo
- Hover / focus / active: botón run + cards
- Pending / disabled: botón run disabled mientras corre o si cupo=0
- Escape / click-away: no aplica (sin superficie flotante)
- Focus restore: foco al resultado cuando la revisión llega
- Latency feedback: estado "preparando" (reusa TASK-1248) + cupo decrementa al confirmar
- Toast / alert behavior: errores in-page; cupo agotado = card de upsell, no toast de error

### Motion & microinteractions

- Motion primitive: `none` (reusa el motion existente del workbench; sin motion nuevo)
- Enter / exit: heredado
- Layout morph: heredado del workbench
- Stagger: n/a
- Timing / easing token: tokens existentes
- Reduced-motion fallback: heredado
- Non-goal motion: no agregar motion al banner/cta

### Implementation mapping

- Route / surface: `/aeo` (gateado por módulo TASK-1277)
- Primitive / variant / kind: workbench TASK-1248 + cards `AeoTierBanner`/`AeoRunCta`/`AeoUpsellCard`/`AeoLockedCard`
- Component candidates: ver wireframe
- Copy source: `src/lib/copy/growth.ts`
- Data reader / command: `resolveAeoEntitlement` (read) + `requestGraderRunForOrganization` (write, TASK-1277)
- API parity: el run es el command gobernado de TASK-1277; UI = cliente
- Access / capability: módulo `ai_visibility_v1` + capability del run de portal
- States to implement: contratado/trial-available/trial-exhausted/locked/preparing/empty/error/denied/mobile

### GVC scenario plan

- Scenario file: `scripts/frontend/scenarios/growth-aeo-client-tiering.scenario.ts`
- Route: `/aeo` (o mockup harness con los 3 tiers)
- Viewports: desktop 1440 + mobile 390
- Required steps: render contratado → trial-available → trial-exhausted (upsell) → locked
- Required captures: contratado, trial-available, trial-exhausted, locked
- Required `data-capture` markers: `aeo-tier-banner`, `aeo-locked`, `client-ai-visibility-report`
- Assertions: noLoginRedirect, noErrorBoundary
- Scroll-width checks: sin scroll horizontal desktop + 390
- Reduced-motion / focus evidence: estados sin motion gratuito; foco al resultado

### Design decision log

- Decision: teaser/upsell gratis para sin-AEO + run detrás del allowance (trial PLG / contratado)
- Alternatives considered: ocultar AEO (pierde cross-sell); freepass de runs (quema costo, rechazado)
- Why this pattern: exposición total al upsell con costo $0; el motor solo corre con cupo → PLG sin blowout
- Reuse / extend / new primitive: reuse workbench; new cards de tier
- Open risks: si el trial pide intake de dominio la primera vez (Open Q de TASK-1277), agregar mini-form antes del primer run

### Visual verification

- GVC scenario: `growth-aeo-client-tiering`
- Viewports: desktop + mobile
- Required captures: contratado, trial-available, trial-exhausted, locked
- Required `data-capture` markers: `aeo-tier-banner`, `aeo-locked`, `client-ai-visibility-report`
- Scroll-width check: desktop + 390
- Accessibility/focus checks: cupo anunciado; tier color-independiente
- Before/after evidence: workbench previo (TASK-1248) → con tiering
- Known visual debt: ninguna conocida al diseñar

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Banner de tier + estados

- `AeoTierBanner` alimentado por `resolveAeoEntitlement`: contratado / trial ("te quedan N de 3", reset) / agotado. Copy en `growth.ts`.

### Slice 2 — Run self-serve (chokepoint)

- `AeoRunCta` → `requestGraderRunForOrganization`; estado preparando→ready (reusa TASK-1248); decremento de cupo; errores honestos (quota/costo).

### Slice 3 — Upsell + locked/teaser

- `AeoUpsellCard` (trial agotado) + `AeoLockedCard` (sin entitlement, gratis) con CTA a equipo/Nexa (Nexa Mark + Shiny navy si aplica). Sin self-checkout.

### Slice 4 — GVC + cierre

- Scenario `growth-aeo-client-tiering`; GVC desktop + mobile mirado de los 4 estados; gates + docs.

## Out of Scope

- El plano de entitlement/allowance/chokepoint (TASK-1277).
- Vista operador (TASK-1276) y señal de expansión HubSpot (follow-up de TASK-1277).
- Corporate-email gate / lead magnet público (TASK-1254/1263).

## Detailed Spec

Ver el wireframe. La UI envuelve el workbench de TASK-1248 con un banner de tier y, para no-contratados, lo reemplaza por teaser/locked. El run self-serve es un estado in-page (no superficie flotante): CTA → preparando → workbench. Todo run pasa por el chokepoint de TASK-1277.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Bloqueada por TASK-1277. Slice 1 (banner) → Slice 2 (run self-serve) → Slice 3 (upsell/locked) → Slice 4 (GVC/cierre).

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Run disparado fuera del chokepoint | growth/cost | low | la UI solo llama `requestGraderRunForOrganization`; review | runs sin entitlement (signal TASK-1277) |
| Cupo agotado leído como error | UX | medium | estado dedicado de upsell, no error boundary | feedback cliente |
| Teaser que parezca correr el motor | cost | low | teaser 100% estático (sin run) | costo inesperado |

### Feature flags / cutover

- Gateado por los flags de TASK-1277 (`PORTAL_RUN_ENABLED`/`TRIAL_ENABLED`); la UI degrada a "no disponible" si OFF. Sin flag propio.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | revert PR (banner) | <5 min | sí |
| Slice 2 | revert PR (run CTA) / flag OFF TASK-1277 | <5 min | sí |
| Slice 3 | revert PR (upsell/locked) | <5 min | sí |
| Slice 4 | n/a (scenario/docs) | — | sí |

### Production verification sequence

1. Con TASK-1277 en staging: render `/aeo` para Berel (contratado) → workbench.
2. Org trial → banner "N de 3" + run self-serve → preparando → reporte; agotar → upsell.
3. Org sin entitlement → teaser/locked (sin run).
4. GVC desktop + mobile de los 4 estados.
5. Repetir en prod tras TASK-1277.

### Out-of-band coordination required

- N/A — repo-only (depende de la provisión comercial de TASK-1277).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] `/aeo` muestra el tier correcto: contratado (workbench), trial (cupo "N de 3" + reset + run self-serve), agotado (upsell), sin acceso (teaser/locked gratis).
- [ ] El run self-serve pasa SOLO por `requestGraderRunForOrganization` (TASK-1277); el teaser/locked NO corre el motor.
- [ ] Estados honestos: cupo agotado = upsell (no error); nada promete monitoreo fuera del tier; no se expone costo/engine.
- [ ] Copy es-CL en `growth.ts`; tier/allowance color-independiente; cupo anunciado (a11y); foco al resultado.
- [ ] GVC desktop + mobile de los 4 estados mirado, sin scroll horizontal.
- [ ] `UI ready` pasó a `yes` solo cuando `pnpm task:lint --task TASK-1278` queda sin findings.

## Verification

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm task:lint --task TASK-1278` + `pnpm ui:wireframe-check --task TASK-1278`
- `pnpm fe:capture growth-aeo-client-tiering` (desktop + mobile) mirado

## Closing Protocol

- [ ] `Lifecycle` sincronizado (`in-progress` al tomar, `complete` al cerrar)
- [ ] archivo en la carpeta correcta
- [ ] `docs/tasks/README.md` sincronizado
- [ ] `Handoff.md` actualizado
- [ ] `changelog.md` actualizado
- [ ] chequeo de impacto cruzado (TASK-1277, TASK-1248, TASK-1276)
- [ ] copy nuevo registrado en `src/lib/copy/growth.ts`

## Follow-ups

- Señal de expansión a HubSpot cuando el cliente agota trial / engancha (Motor 1) — follow-up de TASK-1277.

## Open Questions

- ¿El primer run de trial pide un intake liviano de dominio si la org no tiene `grader_profile`? (depende de la decisión de TASK-1277).
- Número trial visible (1 vs 3): se toma de la config de TASK-1277.

## Delta 2026-06-28 — conectada al Master UI Flow del programa AEO

- Esta task es el nodo **S6** — tiering cliente + PLG trial (teaser/locked/trial/upsell) del flujo cross-surface del programa AEO. Su UI/flujo se conecta con todas las demás superficies (público → email/PDF → portal cliente tiers/PLG → operador cross-sell → Account 360) en el doc maestro **`docs/ui/flows/EPIC-020-AEO-PROGRAM-UI-FLOW.md`** (info-architecture + state-design + ux-writing + modern-ui). Toda UI del programa renderiza el `ReportArtifactModel` compartido (TASK-1252) y deriva su visibilidad del **entitlement** (TASK-1277), nunca del rol; cada acción mapea a un command gobernado (Full API Parity → Nexa por construcción).

## Delta 2026-06-29 — cierre (code complete, rollout pendiente)

- **Implementado y verificado.** Ruta real `/aeo` ([page.tsx](../../../src/app/(dashboard)/aeo/page.tsx)) resuelve la superficie por `resolveAeoEntitlement` (server-side, nunca por rol): sin módulo → `AeoLockedCard` (teaser gratis); contratado → workbench; trial/pilot → `AeoTierBanner` + `AeoRunCta` (run self-serve vía el ÚNICO command de portal de TASK-1277) + variante upsell al agotar cupo. Estados honestos (preparing/empty/error/denied) sin exponer costo/engine. Componentes en `src/views/greenhouse/growth/ai-visibility/client/`; copy es-CL tuteo en `growth.ts` (`GH_GROWTH_AI_VISIBILITY_CLIENT_TIERING`); harness GVC determinista `/aeo/mockup/tiering`.
- **Bug RSC corregido (clase boundary).** `AeoTierBanner` y `AeoLockedCard` eran server components que pasaban `sx={theme => ({...})}` (función) a clientes MUI → `Functions cannot be passed directly to Client Components` → **500 en los estados locked/trial de la ruta real**, no solo el mockup. Fix: marcar ambos `'use client'` (props 100% serializables). Detectado con `pnpm dev` + log + GVC (no lo atrapan lint/tsc).
- **GVC mirado** desktop 1440 + mobile 390 de los 4 estados (`growth-aeo-client-tiering`): sin scroll horizontal, tier/allowance como texto (color-independiente), banner se apila en mobile, run CTA accesible.
- **Gates:** `pnpm lint` + `tsc` + `pnpm test` (full) + `pnpm build` verdes; `task:lint`/`ui:wireframe-check`/`ui:readiness-check` sin findings; `route-reachability-gate` 0 huérfanos (mockup excluido).
- **Decisión vs wireframe:** el `AeoUpsellCard` separado se consolidó en la variante `blocked` de `AeoTierBanner` (un banner, dos estados honestos: cupo disponible / agotado=upsell).
- **Rollout pendiente:** depende de los flags de TASK-1277 (`PORTAL_RUN_ENABLED`/`TRIAL_ENABLED`) ON en staging + un grader run real client-scoped + provisión comercial del módulo `ai_visibility_v1` por org. Sin eso la ruta degrada a "Disponible próximamente"/teaser, pero no rompe.
