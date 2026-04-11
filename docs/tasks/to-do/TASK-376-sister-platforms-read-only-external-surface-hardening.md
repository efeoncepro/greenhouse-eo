# TASK-376 — Sister Platforms Read-Only External Surface Hardening

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Alto`
- Type: `implementation`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `platform`
- Blocked by: `TASK-375`
- Branch: `task/TASK-376-sister-platforms-read-only-external-surface-hardening`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Endurecer la surface read-only con la que Greenhouse debe exponer contexto operativo a sister platforms. Esta task toma la direction ya planteada en `TASK-039` y la convierte en una foundation enterprise para consumers externos del ecosistema: auth, tenancy binding, rate limiting, observabilidad y shape estable de lectura.

## Why This Task Exists

`TASK-039` y `TASK-040` ya dejaron planteado que Greenhouse debe tener API v1 y un MCP downstream como adapter. El nuevo contrato de sister platforms sube el nivel de exigencia: esa surface ya no debe pensarse solo como export o AI tooling, sino como carril institucional para plataformas hermanas. Sin hardening, el primer consumer serio terminaria mezclando tenant inference, auth improvisada y response shapes frágiles.

## Goal

- Convertir la read surface externa de Greenhouse en una capability defendible para sister platforms.
- Reusar la foundation de tenancy binding antes de abrir consumers concretos.
- Dejar el camino listo para MCP y para operator consoles externas como Kortex.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_SISTER_PLATFORMS_INTEGRATION_CONTRACT_V1.md`
- `docs/architecture/GREENHOUSE_KORTEX_INTEGRATION_ARCHITECTURE_V1.md`
- `docs/tasks/to-do/TASK-039-data-node-architecture-v1.md`
- `docs/tasks/to-do/TASK-040-data-node-architecture-v2.md`
- `docs/architecture/GREENHOUSE_IDENTITY_ACCESS_V2.md`

Reglas obligatorias:

- La surface debe ser read-only por defecto.
- El auth model debe ser explicito y auditable.
- La tenancy no puede resolverse sin pasar por la foundation de bindings.
- MCP sigue siendo adapter downstream y no foundation base.

## Normative Docs

- `docs/operations/GREENHOUSE_REPO_ECOSYSTEM_V1.md`
- `docs/tasks/to-do/TASK-375-sister-platforms-identity-tenancy-binding-foundation.md`
- `docs/tasks/complete/TASK-374-sister-platforms-integration-program.md`

## Dependencies & Impact

### Depends on

- `TASK-375`
- `docs/tasks/to-do/TASK-039-data-node-architecture-v1.md`
- `docs/tasks/to-do/TASK-040-data-node-architecture-v2.md`

### Blocks / Impacts

- `TASK-377`
- MCP downstream para sister platforms
- futuros consumers externos del ecosistema

### Files owned

- `src/app/api/v1/`
- `src/lib/sister-platforms/`
- `src/lib/tenant/authorization.ts`
- `docs/tasks/to-do/TASK-039-data-node-architecture-v1.md`
- `docs/api/`

## Current Repo State

### Already exists

- `TASK-039` ya define el shape conceptual de una API v1 y del MCP read-only downstream.
- Greenhouse ya tiene tenant context y authorization helpers maduros.
- El contrato marco ya define read API y MCP como carriles permitidos.

### Gap

- La API v1 sigue siendo plan, no capability endurecida para sister platforms.
- No existe todavia un auth/consumer model canonico para plataformas hermanas.
- No existe request logging o governance institucional especifica para este carril.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     "Que construyo exactamente, slice por slice?"
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Consumer auth and tenancy resolution

- Amarrar la read surface externa al binding canonico de sister platforms.
- Formalizar auth, scope resolution y consumer metadata.

### Slice 2 — Stable read endpoints

- Materializar el baseline minimo de endpoints read-only que puedan consumir sister platforms.
- Asegurar response shapes estables y auditables.

### Slice 3 — Governance and observability

- Agregar rate limiting, request logging y trazabilidad de consumer cross-platform.
- Dejar la surface lista para que MCP la consuma sin bypassar estas reglas.

## Out of Scope

- Implementar todavia el MCP server completo.
- Escribir flows de mutacion cross-platform.
- Resolver Kortex-specific UX o deep links.

## Detailed Spec

La task debe aterrizar la regla:

`sister platform consumer -> auth explicita -> tenancy binding -> read-only API -> optional MCP adapter`

La read surface debe nacer reusable para:

- Kortex hoy
- futuras apps hermanas despues

y no como integration point ad hoc solo para un consumer.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Existe una read surface externa formalmente ligada al binding de sister platforms.
- [ ] El auth model, tenant resolution y request logging quedan definidos y ejecutables.
- [ ] La surface es read-only por defecto y no abre mutaciones laterales.
- [ ] La task deja el carril listo para un adapter MCP downstream.

## Verification

- `pnpm lint`
- `pnpm tsc --noEmit`
- `pnpm test`
- Smoke manual de endpoints read-only con consumer scope controlado

## Closing Protocol

- [ ] Actualizar `TASK-039` o dejar delta si algun supuesto de esa spec cambia al aterrizar la surface real.
- [ ] Documentar el auth model final en la doc canonica que corresponda.

## Follow-ups

- `TASK-377` — bridge Kortex sobre esta surface.
- MCP server downstream una vez cerrada la read API base.

## Open Questions

- Si conviene un auth model unico para sister platforms o separar internal trusted consumers vs tenant-scoped consumers.
