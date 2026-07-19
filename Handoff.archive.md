# Handoff archive

Este archivo es un índice histórico, no una lectura obligatoria de arranque. La continuidad activa vive en
[Handoff.md](Handoff.md). Las fuentes canónicas de una implementación siguen siendo task, issue, ADR,
arquitectura, código y runtime verificado.

## Corte legado 2026-07-19

- [Handoff completo antes de la compactación](docs/operations/agent-context-history/2026-07-19/Handoff.legacy.md)
- [Handoff.archive previo a la compactación](docs/operations/agent-context-history/2026-07-19/Handoff.archive.legacy.md)
- [Manifest de integridad](docs/operations/agent-context-history/2026-07-19/manifest.json)
- [Mapa y protocolo de recuperación](docs/operations/agent-context-history/2026-07-19/README.md)

Los snapshots son inmutables y se verifican por SHA-256 con `pnpm docs:context-check:strict`.

## Archivo incremental posterior

Las sesiones que salgan de la ventana activa se archivan en
`docs/operations/agent-context-history/handoff/YYYY-MM.md` mediante `pnpm docs:context-rotate --apply`.

- [2026-07](docs/operations/agent-context-history/handoff/2026-07.md)

No volver a pegar historia completa en este índice.
