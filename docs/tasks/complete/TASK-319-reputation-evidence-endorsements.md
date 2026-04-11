# TASK-319 — Reputation, Evidence & Endorsements for Talent Profiles

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `complete`
- Priority: `P2`
- Impact: `Medio`
- Effort: `Alto`
- Type: `implementation`
- Status real: `Complete`
- Rank: `TBD`
- Domain: `identity`
- Blocked by: `TASK-315`, `TASK-316`
- Branch: `task/TASK-319-reputation-evidence-endorsements`
- Legacy ID: `none`
- GitHub Issue: `none`

## Delta 2026-04-11 (TASK-318)

- TASK-318 completada — reader client-safe y ClientSafeTalentCard existen. Endorsements client-safe pueden extender este componente.

## Delta 2026-04-11 (TASK-317)

- TASK-317 completada — discoveryScore pondera verification (30%) y cert freshness (15%). Endorsements podrían agregar un nuevo factor al score.

## Delta 2026-04-11 (TASK-316)

- TASK-316 completada — modelo de verificacion unificado (skills/tools/certs). Endorsements pueden construirse sobre verification_status.

## Delta 2026-04-11

- TASK-313 completada — ahora existe: evidencia de certificaciones vía assets privados con `CertificatePreviewDialog` (PDF/imagen embebido), `VerifiedByEfeonceBadge` como señal de confianza reutilizable, campo `credential_url` en certifications
- Impacto: la evidencia documental de certificaciones y el badge de verificación ya son componentes reusables; esta task extiende hacia endorsements internos, highlights de proyecto y evidence layer más amplia

## Summary

Agregar la capa de reputación del talento: evidencia de trabajo, endorsements internos, highlights reutilizables y señales de credibilidad más allá de la autodeclaración. Esta task hace que el perfil profesional se sienta más cercano a un marketplace serio y menos a una ficha administrativa.

## Why This Task Exists

Un perfil enterprise necesita algo más que skills y certificados:

- evidencia de experiencia
- señales de calidad
- contexto de trabajo real
- validación social/operativa interna

Sin esta capa, el perfil puede ser correcto pero sigue siendo plano.

## Goal

- Registrar evidencia reusable del trabajo o experiencia
- Permitir endorsements o validaciones internas estructuradas
- Preparar insumos para perfiles cliente-safe y ranking futuro

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_UI_PLATFORM_V1.md`

Reglas obligatorias:

- La reputación no reemplaza la verificación; la complementa.
- Evidence y endorsements deben poder distinguirse de claims autodeclarados.
- No exponer feedback interno sensible en surfaces cliente sin filtro explícito.

## Normative Docs

- `docs/tasks/to-do/TASK-315-talent-taxonomy-canonical-model.md`
- `docs/tasks/to-do/TASK-316-talent-trust-ops-verification-governance.md`

## Dependencies & Impact

### Depends on

- `TASK-315`
- `TASK-316`
- `src/views/greenhouse/my/my-profile/**`
- `src/views/greenhouse/admin/users/**`
- `src/views/greenhouse/people/**`

### Blocks / Impacts

- `TASK-318`
- `TASK-320`

### Files owned

- `src/views/greenhouse/my/my-profile/**`
- `src/views/greenhouse/admin/users/**`
- `src/views/greenhouse/people/**`
- `src/lib/[verificar]`
- `docs/architecture/GREENHOUSE_UI_PLATFORM_V1.md`

## Current Repo State

### Already exists

- perfiles internos con tabs
- assets privados y links
- base de skills y certificaciones

### Gap

- no hay reputación estructurada ni evidence layer
- no hay endorsements internos ni highlights reutilizables

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Evidence model

- Definir cómo una persona puede asociar evidencia:
  - proyecto/caso
  - extracto o highlight
  - asset o link
  - visibilidad

### Slice 2 — Endorsements

- Permitir endorsements internos estructurados:
  - quién endorsó
  - qué skill/área valida
  - cuándo
  - visibilidad y moderación

### Slice 3 — Surfacing

- Mostrar evidencia y endorsements en self/admin y dejar reader reusable para cliente-safe

## Out of Scope

- scoring algorítmico de reputación público
- feedback libre no moderado estilo red social

## Detailed Spec

La capa de reputación debe responder:

- qué evidencia concreta respalda este perfil
- qué parte fue validada por terceros internos
- qué puede mostrarse externamente

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Existe un modelo de evidencia reusable y separable de skills/certificaciones
- [ ] Existen endorsements internos estructurados y moderables
- [ ] La UI distingue evidencia, verificación y endorsement como señales distintas

## Verification

- `pnpm lint`
- `pnpm exec tsc --noEmit --incremental false`
- `pnpm build`
- validación manual de surfacing en self/admin

## Closing Protocol

- [ ] Documentar qué señales son internas y cuáles pueden volverse client-safe

## Follow-ups

- score compuesto de reputación si el negocio realmente lo necesita

## Open Questions

- si endorsements deben permitirse solo a managers/admins o también a peers
