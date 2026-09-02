# Handoff archive

Este archivo es un índice histórico, no una lectura obligatoria de arranque. La continuidad activa vive en
[Handoff.md](Handoff.md). Las fuentes canónicas siguen siendo task, issue, ADR, arquitectura, código y runtime
verificado.

- [Handoff previo al release 2026-07](docs/operations/agent-context-history/handoff/2026-07-pre-release.md)
- [Handoff incremental 2026-07](docs/operations/agent-context-history/handoff/2026-07.md)
- [Archivo histórico preservado 2026-07-19](docs/operations/agent-context-history/2026-07-19/Handoff.archive.legacy.md)
- [Archivo histórico preservado 2026-07-29](docs/operations/agent-context-history/2026-07-19/Handoff.archive.legacy-2026-07-29.md)

- [2026-08](docs/operations/agent-context-history/handoff/2026-08.md)
- [Home: checkpoint previo a consolidación](docs/operations/agent-context-history/handoff/2026-08-30-home-before-consolidation.md)

- [2026-09](docs/operations/agent-context-history/handoff/2026-09.md)

No volver a pegar historia completa en este índice.

## Entradas archivadas desde Handoff activo

Punteros, no contenido: el detalle canónico de cada una vive en la spec de su task.

- **EPIC-042 / TASK-1764 — baseline aprobado de footers** (2026-08-23). Documentación y skill
  completas; runtime intacto, ADR `Proposed` y child foundation pendiente. Canon:
  `docs/tasks/to-do/TASK-1764-governed-email-footer-profile-migration.md`.

- **TASK-1302 — serie GSC propia LIVE** (2026-08-05). 26.192 filas reales de
  `sc-domain:berel.com` materializadas, scheduler `ops-seo-gsc-snapshot` ACTIVO, 375
  keywords en striking-distance. El rollout destapó dos defectos invisibles en tests: el
  ops-worker no tenía config de Search Console (habría degradado todo en silencio) y GSC
  no publica D-1 (ventana móvil de 5 días). Spec:
  `docs/tasks/complete/TASK-1302-growth-seo-gsc-daily-snapshot-materializer.md`.
- **TASK-1300 — registry de familias DataForSEO + ledger de gasto** (2026-08-05).
  Allowlist de familias, breaker y spend guard; el ledger lo escribe el transporte, nunca
  el caller. Spec: `docs/tasks/complete/TASK-1300-growth-seo-dataforseo-family-registry.md`.
