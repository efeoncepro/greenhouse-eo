# Repository Shared Workspace Agent Invariants

## Estado

Activo desde 2026-08-01. Esta es la fuente canónica para el manejo del checkout de
`greenhouse-eo` por agentes y herramientas.

## Invariantes operativos

- El checkout compartido actual es el único entorno autorizado para ejecutar trabajo del repo.
- **NUNCA** crear, usar, copiar hacia, mover trabajo a, ni operar desde un `git worktree`, un checkout aislado o
  una carpeta clonada para sortear divergencias, WIP, hooks, pushes o conflictos.
- **NUNCA** cambiar de rama, hacer `stash`, `clean`, `restore`, reset, mover archivos ajenos ni ampliar un commit
  para “despejar” el checkout compartido.
- Si el estado compartido bloquea una operación, detenerse, reportar rutas/estado exactos y esperar una decisión
  del operador. No crear un entorno alternativo como workaround.
- Un worktree preexistente es estado ajeno: no inspeccionarlo, modificarlo, integrarlo, podarlo ni eliminarlo.
  La única excepción es una autorización explícita del operador que nombre su ruta exacta y la acción concreta
  (por ejemplo, remover un temporal identificado).
- La regla aplica por igual a Codex, Claude, subagentes, scripts, skills y automatizaciones locales.

## Integración

Los routers `AGENTS.md` y `CLAUDE.md`, las skills de arquitectura/ejecución y los prompts Codex deben apuntar a
este documento. El modelo operativo detallado para coordinación sin aislamiento vive en
[`MULTI_AGENT_SHARED_WORKSPACE_OPERATING_MODEL_V1.md`](../../operations/MULTI_AGENT_SHARED_WORKSPACE_OPERATING_MODEL_V1.md).

Los documentos históricos pueden describir worktrees usados anteriormente como evidencia; no autorizan recrear
esa práctica.
