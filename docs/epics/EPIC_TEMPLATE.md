# Epic Template

Plantilla copiable para crear epics nuevas.

> Un epic coordina un programa cross-domain o multi-task. La implementación real sigue viviendo en tasks hijas.

---

## Instrucciones

1. Copiar el bloque de template de abajo en un archivo nuevo: `docs/epics/to-do/EPIC-###-short-slug.md`
2. Reservar el ID en `docs/epics/EPIC_ID_REGISTRY.md`
3. Llenar `## Status`, `## Summary`, `## Why This Epic Exists`, `## Outcome` y `## Child Tasks`
4. Si el epic ya tiene tasks existentes relacionadas, listarlas en `## Existing Related Work`
5. Cuando cambie de estado, sincronizar carpeta (`to-do/`, `in-progress/`, `complete/`) y `Lifecycle`

---

## Template

```md
# EPIC-### — [Short Title]

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Muy alto`
- Effort: `Alto`
- Status real: `Diseño`
- Rank: `TBD`
- Domain: `[platform|finance|hr|identity|ops|ui|cross-domain]`
- Owner: `unassigned`
- Branch: `epic/EPIC-###-short-slug`
- GitHub Issue: `[optional]`

## Summary

[Qué coordina este epic y por qué importa.]

## Why This Epic Exists

[Qué contradicción o programa multi-módulo no cabe bien dentro de una sola task.]

## Outcome

- [resultado 1]
- [resultado 2]
- [resultado 3]

## Architecture Alignment

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- [arquitectura especializada]

## Child Tasks

- `TASK-###` — [rol dentro del epic]
- `TASK-###` — [rol dentro del epic]

## Existing Related Work

- [task, issue, doc o módulo ya existente]

## Exit Criteria

- [ ] [criterio verificable]
- [ ] [criterio verificable]
- [ ] [criterio verificable]

## Non-goals

- [qué no entra en este epic]

## Delta YYYY-MM-DD

[Opcional. Cambios materiales al epic.]
```
