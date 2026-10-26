# Plan — TASK-2058 Rooms

> Estado posterior26Oct: consultar la [task vigente](../complete/TASK-2058-rooms-foundation-and-permissions.md) y sus criterios/evidencias. Este plan conserva la secuencia e hipótesis de su fecha; sus pendientes históricos no sustituyen el estado actual. Auth retenido en PR; interfaz Claude Design y activación general separadas.

Fecha 2026-10-25. Objetivo/primera entrega aprobados por Julio («Vamos»), ampliados con permisos can y subagentes explícitos. No requiere otro checkpoint para el mismo alcance.

## Discovery summary

Checkout Greenhouse develop limpio al inicio; runtime hermano ausente. Logo oficial 18 SVG en AXIS, distribución publicada verificada en registry. Next 16.4.3/React 19.3.1/Tailwind 4.3.3; TS7 con API TS6 y ESLint9 temporal por peers de plugins. Probar antes de fijar compatibilidad.

## Access model

Can por capacidad+recurso, roles cliente/operador/admin con grants intersectados y expiración/revocación. DTO cliente allowlist sin notas ni grants internos. La demo contiene sólo datos sintéticos y personas conocidas, nunca autentica a clientes reales. Adaptador de sesión real fail-closed hasta integración Efeonce ID.

## Architecture decision

ADR Rooms y addendum de arranque de 2026-10-25. Repo independiente autorizado, main; docs Greenhouse develop. Domain/browser-safe y server readers separados. Runtime local, sin migraciones, cloud, push ni despliegue.

## Backend/data contract

src/domain/contracts.ts y permissions.ts; reader y fixtures en servidor. Manifest de operaciones sólo anuncia readers implementados, no writes futuros. UI y CLI comparten reader; HTTP real requiere identidad verificada.

## Skills

Arquitectura, task planner/hook, La órbita/AXIS, UI orchestrator, secret hygiene, browser diagnostics y QA/cierre proporcional.

## Subagent strategy

fork autorizado por Julio. Backend: src/domain/**, src/server/**, tests/domain*.test.ts. UI: src/components/**, src/app/** salvo API, src/lib/copy/**, src/styles/**. QA: tests/experience.spec.ts y playwright.config.ts. Principal: package/config/scripts, API y CLI adapters, docs/índices y verificación combinada. Nadie modifica archivos de otro sin coordinación. Sin worktrees.

## Execution order

1. Manifest/runtime y contrato tipado mínimo: principal + backend. 2. UI contra ese contrato estable; no espera toda persistencia. 3. Tests permisos y navegación. 4. Integración, instalación frozen, lint negativo, typecheck/build, capturas inspeccionadas. 5. Docs y entrega para revisión visual humana.

## Files to create

Runtime ../efeonce-rooms bajo ownership anterior. Evidencia en docs/ui/reviews/TASK-2059-rooms-first-experience/ y docs/audits/rooms/.

## Files to modify

Tasks/epic, índice de decisiones, dossier, Handoff/changelog. No cambios a código Greenhouse ni fuente AXIS.

## Files to delete

Ninguno. Sólo movimientos lifecycle de artefactos propios.

## Risk flags

Cruce de tenants y filtración de notas: tests negativos. Compatibilidad TS7/ESLint: no force ni supresiones. UI no aprobada: baseline candidato. Datos de demostración siempre rotulados.

## Open questions

Sin bloqueos para la entrega local. Identidad real, persistencia, infraestructura y aceptación visual del operador quedan explícitamente pendientes.
