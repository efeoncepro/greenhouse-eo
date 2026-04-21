# EPIC-003 — Ops Registry Federated Operational Framework

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Muy alto`
- Effort: `Alto`
- Status real: `Diseño`
- Rank: `TBD`
- Domain: `platform`
- Owner: `unassigned`
- Branch: `epic/EPIC-003-ops-registry-federated-operational-framework`
- GitHub Issue: `[optional]`

## Summary

Crear `Ops Registry` como capa operativa repo-native para Greenhouse: indexa, valida y relaciona artefactos vivos del framework de desarrollo, expone surfaces amigables para humanos y agentes, y deja un contrato federable para repos hermanos.

## Why This Epic Exists

Greenhouse ya tiene un framework operativo fuerte en markdown, pero operarlo a escala es costoso. La fricción no está en crear más documentos, sino en descubrirlos, relacionarlos, detectar drift y responder rápido qué documento gobierna qué zona.

Resolver eso bien requiere más de una task porque mezcla:

- arquitectura y schema compartido
- parser/indexador/validator/query layer
- surfaces humano + agente
- contrato federado para repos hermanos

## Outcome

- Greenhouse EO cuenta con una capa operativa derivada y consultable sobre su documentación viva.
- Humanos encuentran rápido source of truth, blockers, dependencias y drift.
- Agentes consumen salidas JSON y endpoints internos en vez de adivinar contexto.
- El framework queda listo para extenderse a repos hermanos sin duplicar el diseño.

## Architecture Alignment

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_OPS_REGISTRY_ARCHITECTURE_V1.md`
- `docs/operations/DOCUMENTATION_OPERATING_MODEL_V1.md`
- `docs/operations/EPIC_OPERATING_MODEL_V1.md`
- `docs/operations/MINI_TASK_OPERATING_MODEL_V1.md`
- `docs/operations/ISSUE_OPERATING_MODEL_V1.md`
- `docs/operations/GREENHOUSE_REPO_ECOSYSTEM_V1.md`

## Child Tasks

- `TASK-558` — schema, parser y repo config foundation
- `TASK-559` — validation, query CLI y generated outputs
- `TASK-560` — surfaces humano + agente
- `TASK-561` — federation contract para repos hermanos

## Existing Related Work

- `docs/operations/DOCUMENTATION_OPERATING_MODEL_V1.md`
- `docs/operations/EPIC_OPERATING_MODEL_V1.md`
- `docs/operations/MINI_TASK_OPERATING_MODEL_V1.md`
- `docs/operations/ISSUE_OPERATING_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_OPS_REGISTRY_ARCHITECTURE_V1.md`

## Exit Criteria

- [ ] Existe un schema común de artefactos y relaciones para el framework operativo
- [ ] El repo puede generar outputs derivados consultables (`registry`, `graph`, `validation`, `stale`)
- [ ] Hay una surface legible para humanos y una surface estructurada para agentes
- [ ] El contrato deja explícito cómo escalarlo a repos hermanos

## Non-goals

- Reemplazar markdown o Git como source of truth
- Mover tasks/specs/arquitectura a Notion como base canónica
- Construir un clon interno de Jira o Linear
- Hacer authoring rich-text desde UI en la primera iteración

## Delta 2026-04-21

Epic creado para formalizar `Ops Registry` como framework operativo federado. Se declara explícitamente que el sistema debe montarse sobre el repo, ser friendly para humanos y agentes, y escalar a repos hermanos con schema común + config local por repo.
