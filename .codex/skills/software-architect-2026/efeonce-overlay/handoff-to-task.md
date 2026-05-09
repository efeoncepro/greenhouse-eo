# Handoff to TASK Format

> When the user asks the skill for output that will go to a Claude Code or Codex agent for implementation in an Efeonce repo, the output should be in TASK doc format compatible with `TASK_TEMPLATE_v2.md` and `TASK_PROCESS.md`.
>
> This file shows the conversion: how skill artifacts (architecture spec, component spec, ADR) map to TASK doc structure.

## When to produce a TASK doc instead of an architecture spec

Produce a TASK doc when:

- The user explicitly asks for one ("genera el TASK", "create the TASK doc")
- The output is going directly to an agent for implementation
- The work is bounded, single-PR or small-PR scope (component-level, not system-level)
- The work is happening in an Efeonce repo (`greenhouse-eo`, `kortex`, `efeonce-web`, etc.)

Produce an architecture spec or ADR when:

- The work is system-level or cross-component
- The output is for human review and decision before implementation
- The discussion is exploratory, not yet ready for execution

For larger work, the pattern is: **architecture spec first → ADRs for decisions → TASK doc per implementation slice**. The TASK doc references the architecture spec.

## TASK doc structure (TASK_TEMPLATE_v2)

```markdown
# TASK-NNN — [Imperative title]

## Zone 0: Header (always loaded)

- **TASK ID**: TASK-NNN
- **Repo**: `greenhouse-eo` | `kortex` | `efeonce-web` | etc.
- **Priority**: P0 | P1 | P2 | P3
- **Effort**: Low | Medium | High
- **Status**: Specified | In Plan | In Build | In Review | Done
- **Branch**: `task/TASK-NNN-short-name`
- **Plan checkpoint**: human (for P0/P1/Effort-High) | auto-approvable (otherwise)
- **Architect**: [name]
- **Implementation owner**: Claude Code | Codex | [engineer]
- **Created**: YYYY-MM-DD
- **Related**: ADR-NNNN, architecture spec link, dependency TASK IDs

## Zone 1: Context (loaded in plan + build)

### Resumen
[1-2 sentences on what this TASK does and why]

### Contexto del producto
[Where in the product this fits; which module / domain]

### Dependencias
- TASK-XXX must be Done first (and why)
- External: [vendor / service must be configured / available]
- Internal: [must reuse module Y from TASK-XXX]

### Reuse-before-create check
- Existing components / tables / helpers this TASK uses: [list]
- New components / tables / helpers this TASK creates: [list with rationale]

## Zone 2: Schema and data (loaded in build for data-touching tasks)

### Tablas / vistas afectadas
- New: `schema.table_name` — [purpose, key fields]
- Modified: `schema.table_name` — [diff]
- Read-only: `schema.table_name` — [purpose]

### Migraciones
- File: `migrations/YYYYMMDD-HHmm-task-NNN-description.sql`
- Idempotent: yes
- Rollback strategy: [how to reverse]

### RLS policies (multi-tenant tables only)
```sql
-- Example
ALTER TABLE schema.new_table ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON schema.new_table
  FOR ALL USING (space_id = current_setting('app.current_tenant')::uuid);
```

## Zone 3: Vista specs and API surface (loaded in build for UI/API tasks)

### Vista: `/path/to/route`

```
+-------------------------------------------------------+
| Header: [Page title]                                  |
+-------------------------------------------------------+
| [ASCII layout of major UI elements]                   |
|                                                       |
+-------------------------------------------------------+
```

### Components used (Vuexy / MUI)
- `<DataGrid>` for the table
- `<DateRangePicker>` for filter
- `<Drawer>` for the detail view

### State management
- React Query for server state
- React Hook Form + Zod for the form

### API routes affected
| Method | Path | Purpose |
|---|---|---|
| GET | `/api/things` | List with cursor pagination |
| POST | `/api/things` | Create |

## Zone 4: Acceptance criteria + agent notes (loaded in build + review)

### Acceptance criteria (Given / When / Then)

- Given a logged-in user with the `hr_admin` role
- When they navigate to `/hr/contracts/new`
- Then the form renders with empty fields and the contract type selector defaulting to `indefinido`

- Given the form is filled with valid data
- When the user submits
- Then a row is created in `greenhouse_hr.contracts`, an event is emitted to `greenhouse_notifications`, and the user is redirected to the contract detail view

(continue for all acceptance criteria — testable, specific, no ambiguity)

### Test strategy
- Unit: contract validation logic, KPI matching helper
- Integration: full form submission flow, including event emission
- Cross-tenant: confirm space-A user cannot read space-B contracts

### Notas para el agente

- Reuse `@/lib/db` — no `new Pool()` anywhere
- Reuse existing notification helper at `@/lib/notifications`
- Follow existing form patterns from `/hr/employees/new`
- Do NOT calculate any metrics inline — read from `greenhouse_ico.*` views
- All commits on branch `task/TASK-NNN-short-name`; do NOT merge to develop
- Open PR against `develop` with the `[NEEDS CLARIFICATION]` markers resolved
- If you discover a missing convention or invariant during build, raise it before continuing rather than improvising

### Plan checkpoint
This TASK is P1 / Effort-High. Plan Mode runs first. STOP at `human` checkpoint before executing. `plan.md` committed to `docs/tasks/plans/TASK-NNN-plan.md`.
```

## Mapping from skill artifacts to TASK zones

| Skill artifact section | TASK zone | Notes |
|---|---|---|
| Architecture spec § Problem statement | Zone 1 § Resumen, § Contexto | |
| Architecture spec § Solution archetype, Stack | Reference (link) | TASK doesn't repeat — references the parent architecture spec |
| Architecture spec § Multi-tenancy, Security, Compliance | Mostly references | TASK assumes invariants from CONSTITUTION are followed |
| Component spec § Inputs / Outputs | Zone 3 § API routes | |
| Component spec § Data model | Zone 2 § Tablas, § Migraciones, § RLS | |
| Component spec § Behavior + Edge cases | Zone 1 § Reuse + Zone 4 § Acceptance | Behavior maps to acceptance criteria; edge cases become specific Given/When/Then |
| Component spec § NFRs | Zone 4 § Test strategy + observability spec | |
| Component spec § Testing | Zone 4 § Test strategy | |
| ADR | Referenced in Zone 0 § Related | TASK doesn't repeat the decision — links to ADR |
| Threat model § AI-specific | Zone 4 § Notas para el agente (security mitigations) | |
| Cost estimate | Architecture spec — typically not in TASK | TASK is implementation-scoped, not cost-modeling |

## Style conventions

- **Spanish-LATAM with English code-switching** for technical terms (matches Julio's communication style)
  - "Reuse" stays in English; "Resumen" stays in Spanish; "Acceptance criteria" can be either; ICO terms (RpA, OTD%, FTR%, FTE) always English
  - Mixed prose: "El módulo HR Payroll lee desde `greenhouse_ico.kpi_summary` para hacer el matching de KPIs por `identity_profile_id`. Reuses el bonus calculator de TASK-145."
- **`Tú` treatment** in any user-facing text or instructions
- **Code blocks** use proper language tags
- **ASCII layouts** in Zone 3 for views — gives agent and reviewer visual without designer involvement

## Spanish-Spanglish vocabulary cheat sheet

These terms stay in English (don't translate):
- Stack: framework, runtime, ORM, query builder, container, deploy
- Patterns: strangler fig, expand-and-contract, branch by abstraction, dual-write, RLS, RBAC
- AI: prompt, eval, agent, tool call, autonomy tier, MCP, RAG, embedding, context window
- Observability: span, trace, baggage, OTel, SLO, p95, DORA
- Efeonce-specific: ICO Engine, RpA, OTD%, FTR%, FTE, Surround, Praxis, IDD, Nested Loops, SOLVE
- Roles: admin, owner, viewer, editor, contractor

These terms typically translate:
- Decision → decisión
- Module → módulo
- Schema → esquema
- Migration → migración
- Tenant → tenant (often kept) or "espacio" (in Greenhouse context where `space_id` is the boundary)

## Plan Mode Protocol mention

For any TASK that is P0 / P1 / Effort-High, the `Notas para el agente` section must include:

> This TASK is [priority]. Plan Mode runs first per `TASK_PROCESS.md`. STOP at the `human` checkpoint after producing `docs/tasks/plans/TASK-NNN-plan.md`. Wait for human review before executing.

For P2/P3 / lower-effort TASKs, plan can be auto-approvable but still committed:

> This TASK is [priority]. Plan Mode produces `docs/tasks/plans/TASK-NNN-plan.md` and proceeds without checkpoint unless `[NEEDS CLARIFICATION]` markers remain unresolved.

## When NOT to produce a TASK doc

- For exploratory architecture discussions — use the architecture spec template instead
- For decision-only outputs — use ADR template
- For threat modeling — use threat-model template
- For cost estimates — use cost-estimate template

The TASK doc is for **execution-ready, repo-bound, single-PR-scope** work. It's the handoff format, not the design format.
