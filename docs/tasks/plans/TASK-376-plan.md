# Plan — TASK-376 Sister Platforms Read-Only External Surface Hardening

## Discovery summary

- La task estaba desalineada con el repo real: el carril externo vigente vive en `src/app/api/integrations/v1/*`, no en `src/app/api/v1/`.
- Ya existe una foundation reusable para sister platforms en `greenhouse_core.sister_platform_bindings` y en `src/lib/sister-platforms/bindings.ts`, pero todavia no existe un auth model por consumer ni request logging/rate limiting para este carril.
- Ya existe una API externa generica con rutas activas (`catalog/capabilities`, `tenants`, `readiness`, `tenants/capabilities/sync`, `register`), pero mezcla lectura con mutacion y usa un token compartido global.
- No existe schema real para `api_keys`, `api_request_logs`, `export_logs` o `report_logs`; solo aparecen como direccion conceptual en `TASK-040`.
- La migracion de `TASK-375` existe, pero no se pudo aplicar localmente porque no hay Cloud SQL Proxy/ADC operativos en esta sesion.

## Skills

- Slice 1 (migracion + helpers backend): `greenhouse-agent`
- Slice 2 (API routes App Router): `greenhouse-agent`, `vercel:nextjs`
- Slice 3 (docs API / arquitectura): ninguna skill especializada obligatoria

## Subagent strategy

`sequential`

- La forma del contrato, la migracion y los helpers de auth/rate limit estan demasiado acoplados como para delegarlos a ciegas sin arriesgar drift.
- Si aparece trabajo documental o de verificacion independiente, se puede paralelizar despues del baseline tecnico.

## Execution order

1. Corregir la spec `TASK-376` para alinearla con el namespace y gaps reales del repo.
2. Crear migracion para consumers/credentials y request logs de sister-platform reads.
3. Crear tipos y helpers server-only para auth por consumer, binding resolution, request logging y rate limiting.
4. Crear lane read-only sister-platform-first dentro de `src/app/api/integrations/v1/*`.
5. Actualizar docs de API y arquitectura para reflejar el auth model y los endpoints endurecidos.
6. Ejecutar verificacion tecnica (`lint`, `build`, chequeo `new Pool`, intento de migracion).

## Files to create

- `docs/tasks/plans/TASK-376-plan.md`
- `migrations/[timestamp]_sister-platform-read-surface-hardening.sql`
- `src/lib/sister-platforms/external-auth.ts`
- `src/app/api/integrations/v1/sister-platforms/[...routes as needed]`

## Files to modify

- `docs/tasks/to-do/TASK-376-sister-platforms-read-only-external-surface-hardening.md` — corregir supuestos desactualizados
- `src/lib/sister-platforms/types.ts` — extender tipos si hace falta para consumers/read surface
- `docs/api/GREENHOUSE_INTEGRATIONS_API_V1.md` — documentar lane endurecido
- `docs/api/GREENHOUSE_INTEGRATIONS_API_V1.openapi.yaml` — reflejar rutas/security nuevas
- `docs/architecture/GREENHOUSE_SISTER_PLATFORM_BINDINGS_RUNTIME_V1.md` o doc hermana nueva — documentar runtime real
- `project_context.md`
- `Handoff.md`
- `changelog.md`

## Files to delete

- ninguno

## Risk flags

- La task toca surface externa y auth server-to-server; cualquier drift rompe consumers futuros.
- La migracion local no se podra aplicar si Cloud SQL Proxy/ADC siguen sin estar operativos.
- Hay que evitar mezclar el nuevo lane read-only con las rutas mutativas ya existentes bajo `/api/integrations/v1/*`.

## Open questions

- Si el baseline debe exponer un endpoint de `context` solamente o tambien uno de `tenants/capabilities` binding-aware desde el primer corte.
- Si conviene emitir eventos de credential lifecycle o dejar request logging como source of truth inicial.
