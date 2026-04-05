# TASK-249 — Test Observability MVP

## Delta 2026-04-05 — implementación

- Priority ajustada de `P2` a `P1`: la observabilidad del suite impacta la calidad de merge y promoción cross-repo, no solo la ergonomía local.
- Lifecycle movido a `in-progress` para formalizar discovery + issue draft + plan de ejecución.
- GitHub issue draft y `plan.md` ya quedaron preparados como parte del takeover inicial de la task.

## Delta 2026-04-05

- MVP implementado y validado sin backend admin: inventario automático, resultados machine-readable, coverage, summary y artifacts de CI ya quedaron operativos.
- `package.json`, `vitest.config.ts` y `.github/workflows/ci.yml` quedaron alineados con el layout estable `artifacts/tests/*` y `artifacts/coverage/*`.
- La policy inicial de coverage quedó explícita como advisory baseline visible en artifacts y GitHub Actions Summary, sin gate blocking adicional en esta primera iteración.
- Validación final: `pnpm test:inventory`, `pnpm test:results`, `pnpm test:coverage`, `pnpm test:observability:summary`, `pnpm lint`, `npx tsc --noEmit`, `pnpm build`.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `complete`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Status real: `Implementada`
- Rank: `TBD`
- Domain: `platform / ops`
- Blocked by: `none`
- Branch: `task/TASK-249-test-observability-mvp`
- GitHub Issue: `draft prepared — [TASK-249] Test Observability MVP`

## Summary

Institucionalizar una capa mínima de observabilidad de tests para Greenhouse sin crear un admin backend. El MVP debe generar inventario automático del suite, resultados machine-readable, coverage y artifacts consumibles en CI para que el equipo pueda saber cuántos tests existen, dónde viven, si pasaron y qué falló en la última corrida sin depender solo de logs crudos.

## Why This Task Exists

Greenhouse ya tiene un suite grande y sano de Vitest, pero no tiene una fuente viva y operable del estado de testing. Hoy el conocimiento queda repartido entre `pnpm test`, logs de GitHub Actions y documentos que pueden quedar desactualizados. La task `TASK-172` menciona coverage y artifacts, pero mezcla CI, logging y security en un solo frente demasiado amplio; la observabilidad del suite necesita una lane ejecutable propia para no seguir difuminada.

## Goal

- Generar inventario automático del suite por dominio, tipo y entorno.
- Emitir resultados y coverage en formatos machine-readable reutilizables por CI.
- Publicar artifacts y summary de testing en GitHub Actions sin agregar tablas, APIs ni una superficie admin en el portal.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/12-testing-development.md`

Reglas obligatorias:

- La fuente de verdad del MVP debe vivir en CI + artifacts; no crear tablas PostgreSQL, APIs runtime ni un admin backend para esta primera iteración.
- El inventario debe escanear paths reales del repo operativo y excluir árboles de referencia o scratch local (`full-version`, `.claude`, worktrees auxiliares, artifacts temporales).
- Los outputs deben ser consumibles por humanos y máquinas (`json` + resumen legible), y no depender de inspeccionar logs multilinea manualmente.
- El MVP no debe cambiar el contrato funcional del portal ni mezclar esta lane con logging estructurado, security headers o despliegue.

## Normative Docs

- `AGENTS.md`
- `docs/tasks/to-do/TASK-172-platform-hardening-ci-observability-security.md`

## Dependencies & Impact

### Depends on

- `.github/workflows/ci.yml` — pipeline CI actual (`lint -> test -> build`)
- `package.json` — scripts canónicos (`test`, `test:watch`)
- `vitest.config.ts` — configuración base del runner
- `src/test/setup.ts`
- `src/test/render.tsx`

### Blocks / Impacts

- `TASK-172` — esta task extrae y vuelve ejecutable la lane de observabilidad/coverage del broad hardening
- Todos los módulos con tests existentes, porque la salud y el inventario del suite pasarán a ser visibles en CI
- PR ergonomics y handoff técnico, porque el equipo podrá revisar resúmenes y artifacts en vez de logs crudos

### Files owned

- `.github/workflows/ci.yml`
- `package.json`
- `vitest.config.ts`
- `scripts/test-inventory.ts`
- `scripts/test-observability-summary.ts`
- `docs/architecture/12-testing-development.md`

## Current Repo State

### Already exists

- `pnpm test` ejecuta Vitest desde `package.json`
- `.github/workflows/ci.yml` corre `pnpm lint`, `pnpm test` y `pnpm build`
- `vitest.config.ts` ya define patterns de descubrimiento para `src/**` y `scripts/**`
- `src/test/setup.ts` y `src/test/render.tsx` ya soportan la capa base de testing UI
- El repo operativo ya tiene ~220 archivos de test y una corrida completa verde reciente (`220 passed`, `923 passed`, `2 skipped`)

### Gap

- No existe inventario automático versionable o reproducible del suite por dominio/tipo/entorno
- CI no publica artifacts de testing ni resúmenes estructurados reutilizables
- No hay coverage configurado en Vitest ni artifacts de coverage en GitHub Actions
- No existe un resumen corto de última corrida para handoff o revisión rápida de PR
- La documentación puede driftar respecto al suite real; hoy no hay una fuente viva que sincronice esos conteos
- No hay una decisión operativa explícita que congele “sin backend admin” como alcance del MVP

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     "Que construyo exactamente, slice por slice?"
     El agente solo lee esta zona DESPUES de que el plan este
     aprobado. Ejecuta un slice, verifica, commitea, y avanza.
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Test inventory baseline

- Crear `scripts/test-inventory.ts` para escanear `src/` y `scripts/` y clasificar tests por dominio, tipo y entorno
- Emitir al menos dos salidas: una machine-readable (`json`) y una legible (`md` o `txt`)
- Excluir paths no operativos del inventario (`full-version`, `.claude`, worktrees auxiliares, outputs temporales)
- Agregar un script npm/pnpm dedicado para regenerar el inventario localmente

### Slice 2 — Structured results & coverage outputs

- Extender `vitest.config.ts` y/o scripts para producir resultados machine-readable del suite y coverage reutilizable
- Definir un layout estable de outputs para artifacts de CI (por ejemplo, bajo `artifacts/tests/` y `artifacts/coverage/`)
- Documentar la policy inicial de coverage del MVP: threshold baseline, advisory o blocking, pero explícita y verificable

### Slice 3 — CI artifacts & job summary

- Actualizar `.github/workflows/ci.yml` para ejecutar inventario, suite y coverage con outputs persistibles
- Publicar artifacts de testing/coverage en GitHub Actions
- Escribir un job summary corto con totales, duración, tests skipped/failed y links/nombres de artifacts

### Slice 4 — Operating contract

- Actualizar `docs/architecture/12-testing-development.md` con la nueva fuente de verdad de observabilidad del suite
- Dejar explícito que este MVP no crea admin backend, tablas, APIs ni ejecución de tests desde el portal
- Documentar cómo un agente o developer inspecciona inventario, artifacts, coverage y última corrida sin abrir logs crudos

## Out of Scope

- Crear una UI admin dentro del portal para ver tests
- Persistir corridas de test en PostgreSQL, BigQuery o cualquier store runtime
- Introducir Playwright/Cypress u otra capa E2E nueva en esta task
- Reescribir o expandir cobertura funcional de módulos específicos; esta task observa el suite, no aumenta coverage de dominio
- Mezclar esta lane con structured logging, security headers o hardening de auth fuera de lo estrictamente necesario para CI/testing

## Detailed Spec

El MVP debe producir una capa mínima de observabilidad basada en artifacts de CI, no en runtime del portal.

### Outputs mínimos esperados

- `inventory.json` — conteos por dominio, tipo, entorno y lista de archivos
- `inventory.md` o `inventory.txt` — resumen legible para humanos
- `results.json` — resultado machine-readable de la corrida Vitest
- `coverage-summary.json` — resumen agregado de coverage
- `summary.md` — resumen corto para GitHub Actions Summary

### Clasificación mínima del inventario

- **Dominio**: por path operativo (`payroll`, `finance`, `sync`, `api`, `views`, `components`, `emails`, `config`, `scripts`, etc.)
- **Tipo**: `domain`, `api`, `ui`, `email`, `script`, `infra` u otra taxonomía explícita derivada de path + convenciones del repo
- **Entorno**: al menos `node` vs `jsdom`, detectando overrides explícitos como `@vitest-environment jsdom`

### Criterios de diseño para CI summary

El resumen de Actions debe responder sin abrir logs completos:

- cuántos archivos/tests corrieron
- cuántos pasaron/fallaron/skipped
- duración total
- dominios con mayor volumen de tests
- artifacts generados
- nota corta si hubo warnings no fatales relevantes

### Regla de no-backend-admin

Si la implementación detecta la tentación de crear endpoints, tablas o un panel admin, la decisión del MVP es no hacerlo. La iteración correcta es artifacts de CI + documentación operativa. Cualquier UI futura debe nacer como follow-up explícito.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [x] Existe un script reproducible que inventaria los tests del repo operativo y emite al menos una salida `json` y una salida legible
- [x] CI publica artifacts reutilizables de inventario, resultados y coverage para cada corrida relevante
- [x] GitHub Actions genera un summary corto de testing consumible sin leer el log completo
- [x] La policy inicial de coverage del MVP quedó implementada y documentada en el repo
- [x] El diseño final deja explícito que el MVP no usa backend admin ni persistence runtime

## Verification

- `pnpm lint`
- `npx tsc --noEmit`
- `pnpm test`
- `pnpm test --coverage`
- Validación manual en GitHub Actions: confirmar artifacts + job summary en un PR o push de prueba

## Closing Protocol

- [x] Registrar un delta en `TASK-172` indicando que la lane de test observability quedó extraída a `TASK-249`
- [x] Actualizar `docs/tasks/README.md` si la policy de source of truth del suite cambia durante la implementación
- [x] Dejar documentados los nombres/paths finales de artifacts y comandos operativos en la arquitectura de testing

## Follow-ups

- Admin read-only de testing si el equipo necesita una superficie interna después de validar el MVP por artifacts
- Thresholds de coverage más estrictos por dominio una vez que exista baseline confiable
- Lane separada para warnings no fatales recurrentes del suite (`React keys`, `canvas`, etc.) si siguen apareciendo como ruido operativo

## Open Questions

- ¿El threshold inicial de coverage debe ser blocking o advisory en la primera iteración?
- ¿Conviene que `results.json` y `summary.md` se generen en el mismo job `quality` o en un sub-step separado para facilitar debugging?
