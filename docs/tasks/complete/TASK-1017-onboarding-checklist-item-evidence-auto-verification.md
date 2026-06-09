# TASK-1017 — Onboarding checklist: auto-verificación de ítems contra el estado real (capa de evidencia)

## Status

- Lifecycle: `complete`
- Priority: `P2`
- Impact: `Medio` (hoy el operador marca a mano ítems cuyo estado real ya es queryable → fricción + drift entre "marcado" y "realidad")
- Effort: `Medio`
- Type: `implementation`
- Epic: `EPIC-CLIENT-360`
- Domain: `commercial|integrations|ui|api`
- Blocked by: `none` (extiende el patrón de TASK-1009 ya en prod)
- Derived from: feedback del operador sobre TASK-1013/1015 (2026-06-05): "Notion ya está provisionado y en BigQuery pero sale 'en curso'; Nubox tiene OC registrada pero el onboarding no lo verifica"
- Creada: 2026-06-05
- Completada: 2026-06-05 (code complete, local-first en `develop`)

## Implementación (2026-06-05)

Los 4 slices entregados, extendiendo el patrón thin + reuse-first de TASK-1009. **Cero migración / capability / outbox / tabla** (todo aditivo + flag-gated).

- **Slice 1 — registry + resolvers** (`src/lib/client-lifecycle/evidence/`): `evidence-types.ts` (shared: `ItemEvidenceStatus`, `AUTO_DERIVABLE_ITEM_CODES`, `isAutoDerivableItem`, `canAutoCompleteFromEvidence`), `resolvers.ts` (server-only: 6 clasificadores **puros** + gatherers IO `settle`-wrapped, reusan `getClientLifecycleStage`/`getNotionOnboardingReadiness`/tablas canónicas), `composer.ts` (`resolveOnboardingEvidence(caseId)` batched, scope resuelto 1 vez). 26 tests focales.
- **Slice 2 — endpoint + UI**: `POST .../cases/[caseId]/verify-evidence` (auth `client.lifecycle.case.advance`, scope server-side anti-tamper, `mapLifecycleError`). UI `OnboardingEvidence.tsx` (hook + `EvidenceVerifyButton` + `EvidenceRow`) wired en `LifecycleTimeline` — botón en el header del checklist + chip de evidencia **solo en pasos no resueltos** (GVC enterprise loop sobre Berel). Copy `GH_CLIENT_ONBOARDING.evidence`. Scenario GVC `client-lifecycle-evidence`.
- **Slice 3 — auto-complete gated**: flag `ONBOARDING_ITEM_EVIDENCE_AUTOCOMPLETE_ENABLED` (default OFF). Decisión pura `canAutoCompleteFromEvidence` (anti-fake-green + respeta override manual + `requires_evidence` queda manual). Resiliente per-ítem (`captureWithDomain`).
- **Slice 4 — signal**: `client.lifecycle.evidence_detected_not_marked` (commercial, drift, PG-only, steady=0), wired en `get-reliability-overview.ts`. SQL validado contra PG real.

**Open Questions resueltas**: OQ1 → on-demand (no N+1 en el read del timeline). OQ2 → billing detected ⇔ `payment_currency` + (`!requires_po` o hay `current_po_number`). OQ3 → team detected ⇔ ≥1 `client_team_assignment` activo (FTE>0 no requerido).

**Gates**: tsc 0 · eslint 0 · 26 tests focales + suite full 862 passed · build OK · smoke live (Berel: Notion/HubSpot/billing-MXN detected). Falla ajena pre-existente en develop (`notifications/preferences/route` pin 13≠14, de TASK-1014) — fuera de scope.

**Pendiente operativo**: activar `ONBOARDING_ITEM_EVIDENCE_AUTOCOMPLETE_ENABLED` tras validar la evidencia contra la realidad por resolver (la exposición read ya va sin flag).

## Summary

Hoy el **estado de cada ítem del checklist de onboarding** (`standard_onboarding_v1`, TASK-992) es **manual**: el operador lo marca a mano. Pero varios ítems tienen un **estado real ya queryable en runtime** (HubSpot sincronizada, equipo asignado, Notion fluyendo, canal de Teams, usuarios del portal, facturación Nubox). El cockpit/timeline muestra el estado guardado, no la realidad → un ítem puede salir "en curso" o "pendiente" aunque la pieza ya esté lista (caso real: Notion de Berel provisionado + en BigQuery, pero el ítem seguía "en curso").

Esta task extiende el patrón **thin + reuse-first** de TASK-1009 (`verify_notion_flowing`): una **capa de evidencia read-time** que, por cada ítem auto-derivable, lee el estado real desde los readers canónicos existentes, lo muestra **honesto** junto al ítem ("✓ detectado" / "pendiente" / "no pudimos verificar"), y **auto-completa el ítem solo cuando la evidencia está verde** (mirror del `verify_notion_flowing` que ya auto-completa solo si `readyToOnboard`). NO flipea estado a ciegas ni inventa: degradación honesta cuando una fuente está caída.

## Why

- **Reduce fricción + drift**: el operador no re-confirma a mano algo que el sistema ya sabe; y desaparece el desfase "marcado ≠ realidad".
- **Reuse-first**: los readers ya existen (HubSpot sync, `space_notion_sources` + preflight TASK-1009, `teams_notification_channels`, `client_users`, `client_profiles`/Nubox, `client_team_assignments`). No es un sync nuevo — es componer lo que ya hay.
- **Honesto por construcción**: extiende la doctrina de TASK-1009 (evidencia real, advisory vs crítico, `readyToOnboard` conservador, nunca auto-fake-green).

## Goal

1. Cada ítem **auto-derivable** del checklist muestra, junto a su estado, la **evidencia real** leída del runtime (detectado / pendiente / no verificable), sin pisar una edición manual del operador.
2. Un ítem auto-derivable se **auto-completa** cuando su evidencia está verde (igual que `verify_notion_flowing`), con trazabilidad de que lo completó la verificación (no un humano).
3. Los ítems **declarativos** (sin fuente automática) siguen siendo manuales — no se inventa evidencia para ellos.
4. Degradación honesta: fuente caída → "no pudimos verificar", nunca un falso "pendiente"/"listo".

## Architecture Alignment / Normative Docs

- `docs/architecture/GREENHOUSE_CLIENT_LIFECYCLE_V1.md` (modelo del caso + checklist; §5.5 ítems).
- `docs/tasks/complete/TASK-1009-notion-onboarding-flow-preflight.md` — **patrón fuente** (composer thin + evaluador puro + auto-complete solo si verde + degradación honesta + reliability signal).
- TASK-706/536 (HubSpot company sync), TASK-998/1003 (Notion per-space + sync), TASK-716 (Teams channels), TASK-1001 (portal users), TASK-1004/1006 (client_profiles billing).

## Current Repo State

**Ya existe (reuse-first — NO reconstruir):**
- Checklist + estado: `greenhouse_core.client_lifecycle_checklist_items` + comandos `advanceChecklistItem` (`src/lib/client-lifecycle/commands/advance-checklist-item.ts`).
- Patrón de auto-complete: `getNotionOnboardingReadiness` (`src/lib/integrations/notion-onboarding-preflight.ts`) + endpoint `POST .../cases/[caseId]/notion-preflight` que auto-completa `verify_notion_flowing` solo si `readyToOnboard` (TASK-1009).
- Readers de estado real (a confirmar firma exacta en Discovery):
  - HubSpot company sync → `clients.hubspot_company_id` + estado de sync (`[verificar]` reader canónico).
  - Notion fluyendo → `getNotionOnboardingReadiness` (TASK-1009) + `space_notion_sources`.
  - Teams channel → `greenhouse_core.teams_notification_channels` (`[verificar]` reader).
  - Usuarios del portal → `client_users` por `client_id` (`[verificar]` reader).
  - Facturación Nubox / payment terms → `client_profiles` (TASK-1006) + Nubox (`[verificar]` fuente de la OC).
  - Equipo asignado → `client_team_assignments` por cliente (`[verificar]` reader).
- Timeline reader (donde se muestra el checklist): `src/lib/client-lifecycle/timeline-reader.ts` + inbox reader `src/lib/client-lifecycle/inbox-reader.ts` (TASK-1013).

**Gap (lo que falta):**
- No hay una capa que mapee `item_code → evidencia real` ni que la lea/exponga.
- El estado del ítem no refleja la realidad runtime (solo lo manual).
- No hay auto-complete para los ítems auto-derivables (solo `verify_notion_flowing`).

## Scope (slices)

### Slice 1 — Registry declarativo `item_code → evidence resolver`
- Mapa canónico (server-only) que declara, por cada `item_code` **auto-derivable**, su `evidenceResolver(caseId, organizationId, clientId) → { status: 'detected' | 'pending' | 'unverifiable', detail }`. Ítems declarativos no tienen entry (quedan manuales).
- Auto-derivables (V1): `verify_hubspot_company_synced`, `assign_team_members`, `provision_notion_workspace` (reusa preflight TASK-1009), `provision_communication_channels`, `provision_client_users_access`, `confirm_billing_setup`.
- Manuales (sin fuente): `confirm_legal_documents`, `declare_engagement_kind`, `declare_commercial_terms`, `declare_engagement_phases`.
- Cada resolver **reusa** el reader canónico existente (no SQL nuevo si ya hay reader). Degradación honesta: error/fuente caída → `unverifiable`.

### Slice 2 — Exponer la evidencia en timeline + cockpit (read, honesto)
- El timeline-reader (y opcionalmente el inbox-reader) compone la evidencia por ítem y la expone en el VM.
- UI: junto al estado del ítem, chip/indicador de evidencia ("✓ detectado en el sistema" / "pendiente" / "no pudimos verificar"), sin pisar el estado manual. Diseño con skills product-design (greenhouse-ux + state-design + ux-writing) + GVC.

### Slice 3 — Auto-complete gated (mirror `verify_notion_flowing`)
- Endpoint/acción que, por ítem auto-derivable con evidencia `detected`, completa el ítem vía `advanceChecklistItem` con `completed_by` que distinga "verificación automática" de un humano. Nunca completa con evidencia `pending`/`unverifiable`.
- Idempotente; respeta override manual (si el operador ya lo marcó, no lo revierte).
- Opcional: correr la verificación on-demand (botón "Verificar ahora") y/o como tail no-bloqueante al abrir el caso.

### Slice 4 — Reliability signal de drift (opcional)
- Signal que cuente ítems con evidencia `detected` pero estado del checklist aún `pending` > N días (drift "ya está listo pero nadie lo marcó"). Mirror de los signals de TASK-1009. Steady = 0.

## Out of Scope

- Crear sync nuevo de cualquier integración (solo se componen readers existentes).
- Auto-derivar los ítems **declarativos** (engagement_kind, commercial_terms, engagement_phases, legal docs) — no tienen fuente automática; siguen manuales.
- Cambiar el modelo del caso/checklist (`client_lifecycle_cases`/templates) más allá de leer evidencia.
- El tema "todo caso debe tener deal" + backfill del deal de Berel (es otro follow-up de modelo, NO esta task).
- Escribir a las integraciones (HubSpot/Notion/Teams/Nubox) — esta task es read + auto-complete del checklist interno.

## Rollout Plan & Risk Matrix

- **Slice ordering hard rule**: Slice 1 (registry + resolvers) → Slice 2 (exponer read) → Slice 3 (auto-complete) → Slice 4 (signal). El auto-complete (3) NO antes de validar la evidencia (1-2) en casos reales.
- **Risk matrix**:

| Riesgo | Sistema | Prob | Mitigación | Signal |
|---|---|---|---|---|
| Falso "detected" auto-completa un ítem que no está listo | checklist/onboarding | Media | Evidencia conservadora (mirror `readyToOnboard`); `unverifiable` nunca completa; tests por resolver | drift signal Slice 4 |
| Fuente caída marca "pendiente" falso | integrations | Media | Degradación honesta `unverifiable` (≠ pending); nunca pisa estado manual | reliability del reader |
| Auto-complete pisa una decisión manual del operador | onboarding | Baja | Idempotente + no revierte manual; `completed_by` distingue auto vs humano | audit del case_event |
| N+1 al resolver evidencia de muchos ítems/casos | perf | Baja | Resolver batched por caso; cachear; correr on-demand/tail, no en hot path de lista | — |

- **Feature flags / cutover**: flag `ONBOARDING_ITEM_EVIDENCE_AUTOCOMPLETE_ENABLED` (default OFF) para el auto-complete (Slice 3); la **exposición read** (Slice 2) puede ir sin flag (es informativa + honesta). Activar auto-complete tras validar evidencia en casos reales.
- **Rollback plan per slice**: todos `revert PR + redeploy` (aditivo, sin migración destructiva; el auto-complete detrás de flag → flip OFF). Reversible.
- **Production verification sequence**: validar la evidencia mostrada contra la realidad en ≥1 caso real (Berel) por cada resolver antes de activar el auto-complete.

## Acceptance Criteria

- [ ] Cada ítem auto-derivable muestra su evidencia real (detected/pending/unverifiable) junto al estado, sin pisar ediciones manuales.
- [ ] Un ítem auto-derivable se auto-completa **solo** con evidencia `detected` (nunca pending/unverifiable), idempotente, con `completed_by` que distingue verificación automática.
- [ ] Los 4 ítems declarativos siguen manuales (sin evidencia inventada).
- [ ] Fuente caída → "no pudimos verificar", no un falso estado.
- [ ] Reusa readers canónicos existentes (cero sync nuevo); `verify_notion_flowing` reusa el preflight TASK-1009.
- [ ] Estados honestos verificados con GVC; copy es-CL validado con `greenhouse-ux-writing`.
- [ ] (Si Slice 4) reliability signal de drift en steady=0.

## Verification

`pnpm local:check` + tests focales por resolver + GVC del timeline/cockpit con evidencia + verificación en caso real (Berel) por resolver.

## Closing Protocol

Lifecycle → complete; sync README/Handoff/changelog; doc funcional (`docs/documentation/agency/alta-de-cliente.md` — sección evidencia) + manual; CLAUDE.md si emerge invariante (p.ej. "el estado de ítem auto-derivable se deriva de evidencia real, no se marca a ciegas").

## Open Questions (resolver en Discovery)

- ¿La evidencia se computa en el read del timeline (siempre) o solo on-demand (botón "Verificar ahora")? Recomendado: on-demand + tail no-bloqueante para no cargar el hot path.
- ¿La fuente canónica de la OC/billing de Nubox para `confirm_billing_setup`? (`[verificar]` — el operador mencionó una OC registrada desde Nubox).
- ¿`assign_team_members` se considera "detected" con ≥1 `client_team_assignment` activo, o requiere FTE > 0? (decisión de negocio).

## Follow-ups

- "Todo caso de onboarding debe tener deal" + captura/vínculo del deal en el alta + backfill del caso de Berel (task de modelo separada — NO esta).
