# Investigation gap — External Agents API alpha access — STUB

> **Status**: ABIERTO al 2026-05-17 — Alpha waitlist
> **Next review trigger**: Notion ship External Agents → Beta, o operator firma para waitlist signup
> **Last verified**: 2026-05-17

## Questions abiertas

1. ¿Notion permite scoped permissions per External Agent? (e.g. "puede leer X, no puede leer Y")
2. ¿Auth flow detail — OAuth? PAT? Custom JWT?
3. ¿Rate limits aplican igual a External Agents que Custom Agents?
4. ¿Audit log Notion captura todas las acciones del agent o solo high-level?
5. ¿Pricing model — credits-like Workers, o separado?
6. ¿Multi-workspace support per agent?
7. ¿Sandbox isolation entre external agents?
8. ¿Cómo Notion valida el "external" agent es trusted (no impersonation)?

## Decision blockers para Greenhouse

Hasta que estas questions respondan:
- **NO** comprometer use case operativo con External Agents
- **NO** exponer Greenhouse REST API a External Agent sin federation auth audit
- **NO** signup waitlist sin operator approval

## Acción canonical (cuando esté el momento)

1. Operator decide signup waitlist
2. Discovery sesión: read full docs cuando Notion publish
3. PoC en demo teamspace (TASK-910 sandbox)
4. ADR design federation auth Notion ↔ Greenhouse
5. Update este archivo + decision-frameworks/agent-tool-vs-traditional.md
6. SKILL.md §0 estado canónico update

## Cross-refs

- `developer-platform-2026/external-agents-api.md` — what we know hoy
- `developer-platform-2026/agent-tools.md` — Workers tools alternative
- TASK-879 (Greenhouse) — Developer Platform readiness eval framework
