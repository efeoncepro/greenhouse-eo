# Agent context history — corte 2026-07-19

## Propósito

Preservar íntegramente el contexto anterior a la migración router-first sin mantener más de un millón de tokens
en la lectura obligatoria de cada agente.

## Contenido

- `AGENTS.legacy.md`: contrato genérico completo anterior.
- `project_context.legacy.md`: estado + deltas históricos anteriores.
- `Handoff.legacy.md`: las 1.357 sesiones y contenido completo anterior.
- `Handoff.archive.legacy.md`: archivo histórico previo.
- `manifest.json`: líneas, caracteres, tokens estimados y SHA-256 de cada snapshot.

## Recuperación segura

1. Buscar primero task, issue, ADR, arquitectura, skill y runtime vigente.
2. Buscar una keyword, no cargar el snapshot entero:
   `rg -n '<keyword>' docs/operations/agent-context-history/2026-07-19`.
3. Tratar el resultado como evidencia histórica y contrastarlo contra el estado actual.
4. Si una regla sigue vigente pero no tiene hogar canónico, moverla a la spec/invariante correcta y añadir el
   pointer a `AGENTS.md`.

## Integridad

`pnpm docs:context-check:strict` recalcula los hashes del manifest. Estos archivos son inmutables: una
corrección posterior se documenta en el dueño vigente, no reescribiendo el snapshot.
