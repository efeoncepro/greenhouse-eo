# TASK-337 — Person ↔ Legal Entity Relationship Runtime Foundation

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `complete`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Alto`
- Type: `implementation`
- Status real: `Cerrada`
- Rank: `TBD`
- Domain: `identity`
- Blocked by: `none`
- Branch: `task/TASK-337-person-legal-entity-relationship-runtime-foundation`
- Legacy ID: `follow-on de GREENHOUSE_PERSON_LEGAL_ENTITY_RELATIONSHIPS_V1`
- GitHub Issue: `none`

## Summary

Materializar la foundation runtime mínima para relaciones `persona ↔ entidad legal`, reutilizando `identity_profiles` y la institucionalización actual de `Efeonce Group SpA`, sin colgar la semántica legal de `user`, `member`, `space` o `organization_type`.

## Delta 2026-04-18 — spec corregida contra runtime real

- `Efeonce Group SpA` ya está institucionalizada como `operating entity` sobre `greenhouse_core.organizations` y se sincroniza a `person_memberships` vía:
  - `src/lib/account-360/organization-identity.ts`
  - `src/lib/account-360/operating-entity-membership.ts`
  - `src/lib/sync/projections/operating-entity-membership.ts`
- La semántica `person ↔ legal entity` sigue siendo documental; **no existe todavía** una tabla canónica `legal_entity` ni un `legal_entity_id` explícito en runtime.
- `greenhouse_core.person_memberships` ya cubre vínculo persona ↔ organización, pero no agota la semántica legal/económica que esta task debe formalizar.
- El `schema-snapshot-baseline.sql` sirve como referencia histórica, pero el carril real también requiere leer la migración de `TASK-193` y el runtime `account-360` ya mergeado.
- Esta task es foundation **backend/data-only**. No incluye UI nueva ni una surface pública obligatoria en este slice.

## Why This Task Exists

La spec ya formalizó la semántica, pero hoy no existe un objeto runtime explícito para expresar que una persona puede ser simultáneamente `shareholder`, `founder`, `executive` o `legal_representative` de una entidad legal. El repo sí tiene piezas útiles:

- `identity_profiles`
- `organizations`
- `person_memberships`
- `operating entity`

pero ninguna de ellas, por sí sola, cubre el contrato `person ↔ legal entity` con tipos, vigencia y source of truth.

## Goal

- Crear el runtime mínimo y auditable de relaciones `person ↔ legal entity`
- Reutilizar anchors canónicos existentes en vez de inventar una identidad humana o empresarial paralela
- Preparar la base para `CompensationArrangement`, CCA semántica y futuros readers privados

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_PERSON_ORGANIZATION_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_PERSON_IDENTITY_CONSUMPTION_V1.md`
- `docs/architecture/GREENHOUSE_PERSON_LEGAL_ENTITY_RELATIONSHIPS_V1.md`
- `docs/architecture/GREENHOUSE_POSTGRES_CANONICAL_360_V1.md`

Reglas obligatorias:

- la raíz humana canónica sigue siendo `greenhouse_core.identity_profiles.profile_id`
- la relación legal/económica no debe depender de `client_users.user_id`
- si se reutiliza `greenhouse_core.organizations` como soporte de `LegalEntity`, la task debe dejar explícito el boundary semántico y no seguir mezclándolo con `space`

## Normative Docs

- `project_context.md`
- `Handoff.md`
- `docs/tasks/complete/TASK-193-person-organization-synergy-activation.md`

## Dependencies & Impact

### Depends on

- `docs/architecture/GREENHOUSE_PERSON_LEGAL_ENTITY_RELATIONSHIPS_V1.md`
- `migrations/20260402094316652_task-193-operating-entity-session-canonical-person.sql`
- `src/lib/account-360/organization-identity.ts`
- `src/lib/account-360/operating-entity-membership.ts`

### Blocks / Impacts

- `TASK-338`
- `TASK-339`
- `TASK-340`
- `TASK-341`

### Files owned

- `migrations/[nuevo person-legal-entity relationship foundation]`
- `src/lib/account-360/organization-identity.ts`
- `src/lib/identity/canonical-person.ts`
- `src/lib/account-360/operating-entity-membership.ts`
- `src/types/[nuevo o extensión de tipos identity/account-360]`
- `docs/architecture/GREENHOUSE_PERSON_LEGAL_ENTITY_RELATIONSHIPS_V1.md`

## Current Repo State

### Already exists

- `greenhouse_core.identity_profiles`
- `greenhouse_core.organizations`
- `greenhouse_core.person_memberships`
- `Efeonce Group SpA` como `operating entity` en runtime
- readers canónicos de persona y organización:
  - `src/lib/identity/canonical-person.ts`
  - `src/lib/account-360/organization-identity.ts`
  - `src/lib/account-360/operating-entity-membership.ts`
  - `src/lib/person-360/person-complete-360.ts`
  - `src/lib/person-360/facets/organization.ts`

### Gap

- no existe relación runtime tipada y vigente para `shareholder`, `executive`, `founder`, `legal_representative`, etc.
- `person_memberships` cubre contexto organizacional, pero no agota la semántica legal/contractual/económica
- `organizations` hoy sirve como soporte runtime de `operating entity`, pero todavía no deja explicitado por sí solo el boundary de `LegalEntity`

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Relationship contract + schema

- Diseñar e implementar el storage mínimo para relaciones `person ↔ legal entity`
- Cubrir al menos:
  - `relationship_type`
  - `person_profile_id`
  - `legal_entity_id`
  - vigencia
  - estado
  - source of truth
  - audit metadata

### Slice 2 — Services + readers

- Publicar helpers/readers para resolver relaciones activas por persona y por entidad
- Mantener compatibilidad con `identity_profile`, `member_id` y la institutionalización actual de operating entity
- Evitar que consumers infieran la relación desde `person_memberships`, `user`, `member` o `space` cuando el vínculo real es legal/económico

### Slice 3 — Documentation + seeds mínimos

- Documentar cómo representar el caso actual `Julio ↔ Efeonce Group SpA`
- Dejar seed o bootstrap mínimo para relaciones del caso base si aplica

## Out of Scope

- `CompensationArrangement`
- bridge a `Payroll`
- cambios de UI
- rediseño completo de `organizations`
- crear un objeto `LegalEntity` separado de `organizations` si la solución v1 puede vivir como layer explícita sobre `organization_id`

## Detailed Spec

La task debe responder explícitamente:

- dónde vive runtime-wise la relación `person ↔ legal entity`
- cómo convive con `person_memberships`
- cómo se identifica una `legal entity` sin confundirla con `space`
- cómo se resuelve una relación activa en consumers sin joins ad hoc repetidos

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Existe un storage/runtime mínimo para relaciones `person ↔ legal entity`
- [ ] La task deja explícito cómo convive con `identity_profiles`, `organizations` y `person_memberships`
- [ ] Un consumer puede resolver relaciones activas sin inferirlas desde `user`, `member` o `space`
- [ ] El caso base `Efeonce Group SpA` queda representable sin semántica ambigua

## Verification

- `pnpm lint`
- `pnpm exec tsc --noEmit --incremental false`
- `pnpm build`
- revisión manual de schema y readers contra la spec nueva

## Closing Protocol

- [ ] Actualizar `docs/architecture/GREENHOUSE_PERSON_LEGAL_ENTITY_RELATIONSHIPS_V1.md` si el runtime final obliga a ajustar la semántica publicada
- [ ] Actualizar `project_context.md` con el placement real del runtime

## Follow-ups

- `TASK-338`
- `TASK-339`

## Open Questions

- si el storage final vive como tabla dedicada o como especialización explícita de relaciones/memberships ya existentes
