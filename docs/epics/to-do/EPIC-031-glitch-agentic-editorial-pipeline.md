# EPIC-031 — Glitch Agentic Editorial Pipeline

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Muy alto`
- Effort: `Alto`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `cross-domain`
- Owner: `unassigned`
- Branch: `epic/EPIC-031-glitch-agentic-editorial-pipeline`
- GitHub Issue: `none`

## Summary

Convierte la operación editorial Glitch —Daily, Flash y Weekly— en un pipeline agéntico gobernado dentro de Greenhouse. Conserva el juicio editorial y la cadencia de Notion, pero mueve estado, idempotencia, integración, observabilidad y borradores WordPress al control plane canónico.

## Why This Epic Exists

El flujo cruza doctrina editorial, skills, datos, API, Notion, scheduler/worker, Content Factory, WordPress, QA y aprobación humana. No cabe responsablemente en una task vertical ni debe resolverse copiando el starter local de Claude Cowork.

## Outcome

- Glitch #16 sirve como primer piloto controlado sin arriesgar la fecha editorial.
- Greenhouse conserva candidatas, ediciones, runs, evidencia y mappings con contratos idempotentes.
- Un agente editorial único opera Daily, Flash y Weekly con evals y golden examples.
- Notion y WordPress funcionan como adapters gobernados; el draft llega a `private` y el publish sigue humano.
- La operación semanal corre con scheduler, recovery, señales y kill switch documentados.

## Architecture Alignment

- `docs/architecture/GREENHOUSE_GLITCH_AGENTIC_EDITORIAL_PIPELINE_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_API_PLATFORM_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_PUBLIC_SITE_SKILL_ROUTER_ARCHITECTURE_V1.md`
- `docs/public-site/decisions/PDR-003-layering-ecosistema-digital-efeonce.md`

## Child Tasks

- `TASK-1440` — formaliza y acepta arquitectura, producto y gobierno editorial.
- `TASK-1441` — ejecuta Glitch #16 como piloto agéntico controlado.
- `TASK-1442` — crea la foundation de dominio, persistencia y API.
- `TASK-1443` — crea la skill editorial y su suite de evals.
- `TASK-1444` — implementa adapters Notion + Content Factory/WordPress privado.
- `TASK-1445` — implementa scheduler, orquestación y reliability.
- `TASK-1446` — ejecuta rollout gradual y cierre operativo/documental.

## Existing Related Work

- `TASK-1123` — Greenhouse AI Content Factory Agent Kit.
- `TASK-1337` — bloque Gutenberg `efeoncepro/glitch-drop`.
- `TASK-1323` — auto-publish guardrails; relacionado pero explícitamente fuera del camino crítico.
- `docs/operations/public-site-content-factory/AGENTIC_BLOGPOST_END_TO_END_RUNBOOK_V1.md`.
- `/Users/jreye/Documents/glitch-context/` — export editorial y corpus histórico de discovery.

## Exit Criteria

- [ ] ADR aceptado y PDR-003 actualizado sin duplicar arquitectura.
- [ ] Piloto #16 produce ficha Notion completa y un único draft WordPress `private`, con aprobación pública humana.
- [ ] Foundation, skill, adapters y scheduler cumplen idempotencia, audit, recovery y Full API Parity.
- [ ] Shadow runs y golden evals demuestran calidad editorial suficiente para activar Daily/Weekly.
- [ ] Runbook, manual, documentación funcional, changelog y handoff quedan sincronizados.

## Non-goals

- Auto-publicación pública de Glitch.
- Cockpit/editor visual nuevo en Greenhouse.
- Migración automática de Gutenberg histórico #12/#13.
- Reemplazar Notion como calendario del equipo.
- Resolver el rediseño completo de la categoría pública Glitch.

