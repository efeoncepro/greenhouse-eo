# TASK-1278 / AEO Client Portal Tiering + PLG Trial

## Meta

- Status: `draft`
- Owner task: TASK-1278
- Product Design asset: reusa el workbench de TASK-1248 (`/aeo`) + estados de tiering nuevos
- Intended consumers: clientes del portal (contratado · trial PLG · sin acceso)
- Copy source: `src/lib/copy/growth.ts`
- Primitive decision: `reuse` (workbench `/aeo` TASK-1248) + `new` estados de allowance/locked/upsell (cards)
- UI ready target: `no`

## Brief

- Primary user: cliente del portal (rol `client_*`)
- User moment: entra al portal; según su tier ve AEO completo, su trial mensual, o el upsell
- Job to be done: contratado → consume su AEO; trial → corre su revisión mensual y entiende el valor; sin acceso → conoce y pide AEO
- Primary decision signal: "¿cómo me ve la IA?" + (trial) "¿cuántas revisiones me quedan este mes?"
- Non-goals: no es self-checkout (el cierre lo hace el equipo comercial); no expone costo/engine interno; no freepass de runs

## Layout Skeleton

| Region | Slot | Purpose | Component candidate | Data source |
|---|---|---|---|---|
| 0 | Header | Breadcrumb "Inicio / AEO" + título | `GreenhouseBreadcrumbs` | nav |
| 1 | Tier banner | estado del tier (contratado / trial: "Te quedan N de 3 este mes" / agotado) | card/alert | `resolveAeoEntitlement` (TASK-1277) |
| 2 | Run CTA | botón self-serve "Generar revisión" (trial/contratado con cupo) | `GreenhouseButton` | chokepoint (TASK-1277) |
| 3 | Workbench | reporte AEO (master-detail) cuando hay run | TASK-1248 view | report model |
| 4 | Upsell | card "Activá AEO recurrente / Hablá con tu equipo" (trial agotado o sin acceso) | upsell card + Nexa CTA | copy |
| 5 | Locked/teaser | clientes sin entitlement: teaser "Descubrí cómo te ve la IA" + CTA (GRATIS, no corre motor) | locked card | copy |

## Copy Ledger

| Copy id | Region | Text | Dynamic values | Notes |
|---|---|---|---|---|
| `growth.aeo.tier.trial.remaining` | 1 | Te quedan {n} de {total} revisiones este mes | n, total | reset mensual |
| `growth.aeo.tier.trial.resets` | 1 | Se renuevan el {date} | date | honesto |
| `growth.aeo.run.cta` | 2 | Generar revisión | — | self-serve |
| `growth.aeo.trial.exhausted.title` | 4 | Usaste tus revisiones de este mes | — | no error, es estado |
| `growth.aeo.upsell.cta` | 4 | Activá AEO recurrente | — | CTA a comercial (Nexa/equipo) |
| `growth.aeo.locked.title` | 5 | Descubrí cómo te ve la IA | — | teaser gratis |
| `growth.aeo.locked.cta` | 5 | Hablá con tu equipo | — | sin self-checkout |

## State Copy

| State | Title | Body | CTA / recovery | Notes |
|---|---|---|---|---|
| ready (contratado) | — | workbench completo | — | tier active |
| trial-available | Te quedan N de 3 | corré tu revisión del mes | Generar revisión | consume allowance |
| trial-exhausted | Usaste tus revisiones de este mes | se renuevan el {date} | Activá AEO recurrente | upsell, no error |
| locked (sin acceso) | Descubrí cómo te ve la IA | teaser de valor | Hablá con tu equipo | gratis, no corre motor |
| preparing | Tu revisión se está preparando | — | — | reusa TASK-1248 |
| empty | Aún no generaste una revisión | — | Generar revisión | |
| error | No pudimos generar la revisión | — | Reintentar (si actionable) | canonical error |
| denied | — | sin acceso (tenant/cap) | — | |

## Accessibility Contract

- Heading order: h1 (AEO) → h2 (tier/estado) → h3 (foco del workbench)
- Chart/table alternatives: heredadas de TASK-1248
- Aria labels: allowance restante anunciado; botón run con label explícito
- Focus notes: tras correr, foco al estado "preparando" → al workbench cuando llega
- Color-independent state labels: tier/allowance como texto, no solo color

## Implementation Mapping

- Route / surface: `/aeo` (mismo, gateado por módulo TASK-1277) — estados de tier alrededor del workbench existente
- Primitive / variant / kind: reuse workbench TASK-1248 + cards de tier/upsell/locked
- Component candidates: `AeoTierBanner`, `AeoRunCta`, `AeoUpsellCard`, `AeoLockedCard` + `AiVisibilityClientReportView`
- Copy source: `src/lib/copy/growth.ts`
- Data reader / command: `resolveAeoEntitlement` (read) + `requestGraderRunForOrganization` (write, chokepoint TASK-1277)
- API parity: el run es el command gobernado de TASK-1277; la UI es cliente
- Access / capability: módulo `ai_visibility_v1` asignado + capability del run de portal
- Runtime consumers: cliente UI (trial/contratado) · Nexa (puede correr/leer por construcción)
- Print/email/PDF considerations: reusa el PDF de TASK-1273
- GVC markers: `data-capture="aeo-tier-banner"`, `data-capture="aeo-locked"`, `data-capture="client-ai-visibility-report"`

## GVC Scenario Plan

- Scenario file: `scripts/frontend/scenarios/growth-aeo-client-tiering.scenario.ts` (nuevo)
- Route: `/aeo` (o mockup harness con los 3 tiers)
- Viewports: desktop 1440 + mobile 390
- Required steps: render tier contratado → trial-available → trial-exhausted (upsell) → locked
- Required captures: contratado, trial-available, trial-exhausted, locked
- Required `data-capture` markers: `aeo-tier-banner`, `aeo-locked`, `client-ai-visibility-report`
- Assertions: noLoginRedirect, noErrorBoundary
- Scroll-width checks: sin scroll horizontal desktop + 390
- Accessibility/focus checks: allowance anunciado; tier color-independiente
- Reduced-motion evidence: estados sin motion gratuito

## Design Decision Log

- Decision: **teaser/upsell GRATIS para todos los sin-AEO** (estado Locked, state-design) + **run detrás del allowance** (trial PLG N/mes o contratado)
- Alternatives considered: ocultar AEO a no-contratados (pierde el cross-sell, Motor 1); freepass de runs (quema costo — rechazado por el operador)
- Why this pattern: exposición total al upsell con costo $0; el motor solo corre con allowance → PLG sin blowout de costo
- Reuse / extend / new primitive: `reuse` workbench TASK-1248; `new` cards de tier/upsell/locked
- Open risks: si el trial necesita un intake de dominio la primera vez (Open Q de TASK-1277), agregar mini-form antes del primer run
- Follow-up: upsell que dispare señal de expansión a HubSpot (Motor 1)

## Acceptance Checklist

- [ ] All visible strings are in the copy ledger.
- [ ] Dynamic values are named and bounded.
- [ ] Partial/degraded states are explicit.
- [ ] No copy implies a guarantee when data is estimated.
- [ ] Charts have table/text alternatives.
- [ ] State and aria copy is ready for implementation.
- [ ] Implementation mapping names primitive, copy source, data contract and route/surface.
- [ ] GVC scenario plan is specific enough for `pnpm fe:capture` or a new scenario file.
- [ ] Design decision log explains reuse/extend/new before JSX starts.
