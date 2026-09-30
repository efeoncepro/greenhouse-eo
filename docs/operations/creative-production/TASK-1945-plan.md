# TASK-1945 — plan de foundation neutral

Goal confirmado por Julio con «Vamos», 2026-09-29, tras el plan multimarcas y multipersona.
Checkpoint humano cubierto por esa autorización: foundation común primero, SKY como onboarding.
Rama: checkout compartido develop; no cambio de rama, worktrees o subagentes.

## Audit

- Correcto: workbench gobernado desde Greenhouse; persona, marca y ejecución son identidades distintas.
- Drift: `control.json` local tiene members vacío. No ejecutar access apply ni inferir permisos actuales.
- Reuso: template y sync sellado, piece metadata, Node crypto/fs. Sin dependencias nuevas.
- Scope: preflight local neutral. Integración IA, permisos efectivos y sitios se verifican después.
- Riesgo: direct CLI bypass y pixel drift no cubiertos por validación de procedencia.
- ADR: `EFEONCE_CREATIVE_WORKBENCH_MULTIBRAND_ISOLATION_DECISION_V1.md`.

## Slices

1. Catálogo de las tres marcas, packs gated, resolver que verifica identidad, versión y bytes.
2. Corridas exclusivas y lock; tests de cruces, paths, symlinks, bytes y concurrencia.
3. CLI opt-in exportable y guía operacional. No editar el workbench sellado ni publicar WIP.

## Skills

software-architect-2026: fronteras; greenhouse-task-planner: registro canónico;
axis-design-system: ownership de valores y paquetes; QA y documentación: verificación y continuidad.

## Subagent strategy

Sequential: resolver y tests tienen dependencia causal y archivos comunes. Sin delegación autorizada.

## Verification

Node tests de rechazo y corridas, CLI sin pack habilitado, task lint, diff check. Estado code/local,
sin claim de rollout hasta sync desde commit y verificación del consumer.
