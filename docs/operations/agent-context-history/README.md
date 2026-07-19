# Agent Context History

Archivo histórico de los documentos de arranque y continuidad de agentes. No es lectura obligatoria de
sesión: usar los routers activos y buscar aquí por keyword solo cuando haga falta reconstruir una decisión.

## Cortes íntegros

- [2026-07-19 — migración router-first](2026-07-19/README.md): snapshots de `AGENTS.md`,
  `project_context.md`, `Handoff.md` y `Handoff.archive.md`, con manifest SHA-256.

## Handoff incremental

Las sesiones que excedan la ventana activa se guardan en `handoff/YYYY-MM.md` mediante
`pnpm docs:context-rotate --apply`. Cada bloque lleva hash para que la rotación sea idempotente.

## Regla de consumo

1. Buscar primero task, issue, ADR, arquitectura, código y runtime.
2. Buscar aquí con `rg -n '<keyword>' docs/operations/agent-context-history`.
3. No tratar una entrada histórica como instrucción vigente sin revalidarla.
4. Si una regla recuperada sigue vigente, promoverla a su dueño canónico y actualizar el router.
