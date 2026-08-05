# Multi-Agent Shared Workspace Operating Model V1

## Estado

Activo desde 2026-08-01. Sustituye el modelo anterior basado en worktrees aislados.

## Decisión operativa

Todos los agentes trabajan únicamente en el checkout compartido actual. No se crean ni usan `git worktree`,
checkouts aislados, carpetas clonadas ni árboles alternativos como mecanismo de paralelismo, integración o
recuperación.

La fuente normativa de esta decisión es
[`REPOSITORY_SHARED_WORKSPACE_AGENT_INVARIANTS.md`](../architecture/agent-invariants/REPOSITORY_SHARED_WORKSPACE_AGENT_INVARIANTS.md).

## Coordinación segura

1. Antes de editar, revisar `git status --short`, `Handoff.md` y los artefactos activos.
2. Declarar ownership de archivos o slices antes de trabajo paralelo; si se solapan, serializar.
3. Tratar todo WIP ajeno, incluido `untracked`, como estado vivo. No usar `git stash -u`, `git clean`,
   `git restore`, resets, movimientos ni staging amplio para apartarlo.
4. Si una integración, hook o push queda bloqueado por estado ajeno o una divergencia, detenerse y pedir una
   decisión al operador. No crear una copia aislada ni cambiar de rama para evitarlo.
5. Al cerrar, documentar archivos propios, evidencia, conflictos pendientes y el siguiente paso en `Handoff.md`.

## Worktrees existentes

Un worktree existente no es un entorno de trabajo disponible. No se toca ni se elimina salvo que el operador
autorice de forma explícita la ruta exacta y la acción. Esa excepción no habilita crear uno nuevo.

## Alcance histórico

La documentación y commits anteriores que mencionan worktrees permanecen como evidencia histórica. No son
instrucciones vigentes.
