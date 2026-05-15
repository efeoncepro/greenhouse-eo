# TASK-884 — Ecosystem Access Control Plane Architecture

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Muy alto`
- Effort: `Medio`
- Type: `policy`
- Epic: `none`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `platform|identity`
- Blocked by: `none`
- Branch: `task/TASK-884-ecosystem-access-control-plane-architecture`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Define la arquitectura canonica para que Greenhouse sea el control plane de gobierno de acceso del ecosistema Efeonce. Kortex, Verk, el sitio publico y futuras plataformas pueden mantener provisioning local, pero deben converger a un estado aprobado, visible, auditable y asignable desde Greenhouse.

## Why This Task Exists

Greenhouse ya tiene foundation para `sister_platform_bindings`, API Platform, entitlements y Person Identity, pero aun no existe una decision arquitectonica que gobierne el acceso cross-platform completo: estado deseado desde Greenhouse, provisioning local opcional en cada plataforma, observed state, drift, aprobacion, revocacion y reconciliacion. Sin este contrato, cada portal terminara creando su propio gobierno de colaboradores, clientes y capacidades.

## Goal

- Crear la spec/ADR `GREENHOUSE_ECOSYSTEM_ACCESS_CONTROL_PLANE_V1.md`.
- Definir el modelo `desired_state` vs `observed_state` vs `applied_state`.
- Definir modos por plataforma: `greenhouse_managed`, `hybrid_approval`, `platform_managed_observed`, `read_only_observed`.
- Definir como se separan `views`, `entitlements`, `sister platform capabilities`, `assignments` y `startup policy`.
- Actualizar `DECISIONS_INDEX.md`, `GREENHOUSE_ARCHITECTURE_V1.md` y anexos sister-platform si aplica.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_IDENTITY_ACCESS_V2.md`
- `docs/architecture/GREENHOUSE_ENTITLEMENTS_AUTHORIZATION_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_PERSON_IDENTITY_CONSUMPTION_V1.md`
- `docs/architecture/GREENHOUSE_SISTER_PLATFORMS_INTEGRATION_CONTRACT_V1.md`
- `docs/architecture/GREENHOUSE_SISTER_PLATFORM_BINDINGS_RUNTIME_V1.md`
- `docs/architecture/GREENHOUSE_API_PLATFORM_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_WEBHOOKS_ARCHITECTURE_V1.md`

Reglas obligatorias:

- Greenhouse gobierna el estado deseado de acceso del ecosistema; las plataformas hermanas siguen siendo peer systems.
- No compartir Cloud SQL, secrets, runtime ni usuarios internos como atajo entre plataformas.
- No inferir tenancy, cliente o scope por nombres visibles; usar bindings explicitos.
- Diferenciar `identity_profile`, `member` y `client_user` segun el contrato Person Identity.
- Todo cambio de acceso debe declarar si vive en `views`, `entitlements`, sister-platform capabilities, assignments o startup policy.

## Normative Docs

- `docs/operations/ARCHITECTURE_DECISION_RECORD_OPERATING_MODEL_V1.md`
- `docs/operations/SOLUTION_QUALITY_OPERATING_MODEL_V1.md`
- `docs/operations/DOCUMENTATION_OPERATING_MODEL_V1.md`

## Dependencies & Impact

### Depends on

- `greenhouse_core.sister_platform_bindings`
- `greenhouse_core.sister_platform_consumers`
- `src/lib/sister-platforms/bindings.ts`
- `src/lib/sister-platforms/external-auth.ts`
- `src/config/entitlements-catalog.ts`
- `src/lib/entitlements/runtime.ts`
- `src/lib/api-platform/core/**`
- `src/app/api/platform/ecosystem/**`

### Blocks / Impacts

- `TASK-885`
- `TASK-886`
- `TASK-887`
- `TASK-888`
- `TASK-889`
- Kortex, Verk y sitio publico como consumers de gobierno de acceso.

### Files owned

- `docs/architecture/GREENHOUSE_ECOSYSTEM_ACCESS_CONTROL_PLANE_V1.md`
- `docs/architecture/DECISIONS_INDEX.md`
- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_SISTER_PLATFORMS_INTEGRATION_CONTRACT_V1.md`
- `docs/architecture/GREENHOUSE_KORTEX_INTEGRATION_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_SISTER_PLATFORM_BINDINGS_RUNTIME_V1.md`

## Current Repo State

### Already exists

- Foundation sister-platform read-only y binding-aware.
- API Platform ecosystem lane.
- Entitlements runtime y capabilities registry.
- Person Identity source links para vinculos cross-source.
- Event control plane ecosystem-facing.

### Gap

- Falta contrato canonico para asignar usuarios desde Greenhouse a plataformas hermanas.
- Falta modelo de observed state para provisioning local de Kortex/Verk.
- Falta drift/resolution lifecycle.
- Falta semantica versionada de platform capabilities y provisioning modes.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce plan.md.
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Architecture Spec

- Crear `GREENHOUSE_ECOSYSTEM_ACCESS_CONTROL_PLANE_V1.md`.
- Incluir C4 context/container de alto nivel.
- Definir bounded contexts, ownership y source-of-truth boundaries.

### Slice 2 — ADR & Index

- Registrar decision en `DECISIONS_INDEX.md`.
- Actualizar specs existentes que hoy describen solo read-only sister-platforms.

### Slice 3 — Implementation Handoff

- Revalidar y ajustar `TASK-885` a `TASK-889` si la arquitectura cambia algun contrato.

## Out of Scope

- Crear migrations, APIs o UI runtime.
- Integrar Kortex/Verk en produccion.
- Reemplazar Entra como fuente primaria de identidad corporativa.

## Detailed Spec

La spec debe declarar esta decision base:

> Greenhouse owns ecosystem desired access state. Sister platforms may own local provisioning mechanics, but must converge to Greenhouse-approved access state or report explicit drift.

Debe cubrir:

- Personas: `identity_profile` como raiz humana; `member` como faceta colaborador; `client_user` como principal de acceso.
- Subject types: `internal_collaborator`, `client_user`, `service_account`, `external_partner` (si se aprueba).
- Scope types: `internal`, `organization`, `client`, `space`, `platform_workspace`, `platform_installation`.
- Platform modes:
  - `greenhouse_managed`: Greenhouse crea/revoca y la plataforma aplica.
  - `hybrid_approval`: plataforma propone o crea localmente; Greenhouse aprueba/rechaza/converge.
  - `platform_managed_observed`: plataforma provisiona, Greenhouse observa y detecta drift.
  - `read_only_observed`: solo inventario y drift.
- Drift types:
  - `pending_provisioning`
  - `pending_deprovisioning`
  - `unauthorized_local_access`
  - `missing_identity_link`
  - `scope_mismatch`
  - `capability_mismatch`
  - `platform_apply_failed`

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 -> Slice 2 -> Slice 3.
- Esta policy task debe cerrar antes de ejecutar `TASK-885` en runtime.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Sobre-centralizar y romper autonomia de Kortex/Verk | platform | medium | Declarar provisioning modes por plataforma | no signal - review arquitectonico |
| Mezclar `views` Greenhouse con capabilities de plataformas hermanas | identity | high | Seccion dual-plane obligatoria | no signal - ADR check |
| Diseñar writes cross-platform sin idempotencia | webhooks/API | medium | Tasks hijas deben exigir command ids y audit | no signal - task gate |

### Feature flags / cutover

N/A — policy task sin runtime.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | Revertir doc antes de cerrar tasks hijas | <30 min | si |
| Slice 2 | Revertir indice/links | <15 min | si |
| Slice 3 | Ajustar tasks hijas antes de implementacion | <30 min | si |

### Production verification sequence

N/A — documentacion/ADR. Verificar con review manual de arquitectura y `pnpm docs:context-check`.

## Acceptance Criteria

- Existe `GREENHOUSE_ECOSYSTEM_ACCESS_CONTROL_PLANE_V1.md`.
- `DECISIONS_INDEX.md` enlaza la decision.
- La spec declara explicitamente Greenhouse-managed, hybrid y observed modes.
- La spec distingue desired/observed/applied state.
- La spec explica como Greenhouse puede asignar usuarios a Kortex/Verk sin impedir provisioning local.
- La spec lista los contratos que heredan `TASK-885` a `TASK-889`.

## Verification

- `pnpm docs:context-check`
- `git diff --check`
- Revision manual contra documentos de arquitectura listados.
