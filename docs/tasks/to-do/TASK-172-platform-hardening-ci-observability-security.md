# TASK-172 — Platform Hardening: CI Pipeline, Structured Logging, Test Coverage & Security Headers

**Status:** to-do
**Priority:** Medium
**Module:** Platform / DevOps
**Origin:** Strategic platform audit 2026-03-31

---

## Objetivo

Cerrar 4 gaps de plataforma identificados en la auditoría estratégica que no tienen task asignada. Son mejoras transversales que reducen riesgo operativo y mejoran la calidad del delivery.

---

## Slice 1 — CI Pipeline Hardening

### Estado actual
- `.github/workflows/ci.yml` ejecuta: lint → test → build
- Node 20, pnpm 10, frozen lockfile, 20 min timeout

### Gaps
- `tsc --noEmit` no corre en CI → errores de tipo llegan a producción
- Sin security scanning (dependencias vulnerables pasan)
- Sin coverage threshold → cobertura puede regresar sin que nadie lo note

### Entregables
- [ ] Agregar step `tsc --noEmit` al workflow (entre lint y test)
- [ ] Agregar `pnpm audit --audit-level=high` como step (non-blocking warning)
- [ ] Configurar vitest coverage reporter + threshold mínimo (ej: 40% para empezar, subir progresivamente)
- [ ] Documentar en AGENTS.md la expectativa de CI

### Archivos owned
- `.github/workflows/ci.yml`
- `vitest.config.ts` (agregar coverage config)

---

## Slice 2 — Structured Logging Foundation

### Estado actual
- `console.log` / `console.error` dispersos en 100+ archivos
- Sentry captura errores pero sin contexto estructurado
- Slack alerts solo para cron failures
- Sin correlation IDs, sin JSON format, sin contexto de tenant/request

### Entregables
- [ ] Crear `src/lib/logger.ts` con interface mínima: `logger.info()`, `.warn()`, `.error()`
- [ ] JSON format para Vercel logs (timestamp, level, message, context)
- [ ] Correlation ID via `crypto.randomUUID()` propagado en request context
- [ ] Migrar archivos críticos: `postgres/client.ts`, `cron/require-cron-auth.ts`, `sync/publish-event.ts`
- [ ] No migrar los 100+ archivos de golpe — progresivo

### Archivos owned
- `src/lib/logger.ts` → **NUEVO**
- Archivos críticos a migrar (primera ola, ~5 archivos)

### Decisión pendiente
- ¿Usar pino/winston o logger custom liviano? Recomendación: custom liviano (< 50 LOC) para evitar dependencia nueva en serverless.

---

## Slice 3 — Test Coverage para módulos a 0%

### Estado actual
- 169 test files, ~20K LOC de tests
- Payroll (61%), sync (56%), finance (50%), team-capacity (100%) — bien cubiertos
- 16 módulos a 0%: ai-tools, capabilities, ico-engine, operations, staff-augmentation, integrations, dashboard, my, projects, sprints, forms, home, storage, member-capacity-economics, team-admin

### Entregables
No se requiere 100% coverage. Se requiere al menos 1 test por módulo crítico:

| Módulo | Archivo a testear | Tipo de test |
|--------|-------------------|-------------|
| ico-engine | `src/lib/ico-engine/materialize.ts` | Unit: snapshot count |
| operations | `src/lib/operations/get-operations-overview.ts` | Unit: deriveHealth |
| ai-tools | `src/lib/ai-tools/shared.ts` | Unit: validation |
| cost-intelligence | `src/lib/cost-intelligence/engine.ts` | Unit: allocation calc |
| staff-augmentation | `src/lib/staff-augmentation/store.ts` | Unit: placement CRUD |

- [ ] Crear al menos 5 test files para los módulos más críticos
- [ ] Configurar CI coverage report como artifact

### Archivos owned
- Test files nuevos en los módulos listados

---

## Slice 4 — CORS & Security Headers

### Estado actual
- CSP configurado en report-only (TASK-126 existe para enforcement)
- CORS no configurado — Next.js default (same-origin)
- Rate limiting solo en auth endpoints
- Sin headers de seguridad adicionales (X-Frame-Options, etc.)

### Entregables
- [ ] Configurar CORS explícito en `src/proxy.ts` o middleware: allow solo dominios Greenhouse (`*.efeoncepro.com`)
- [ ] Agregar security headers estándar en respuestas API:
  - `X-Content-Type-Options: nosniff`
  - `X-Frame-Options: DENY`
  - `Referrer-Policy: strict-origin-when-cross-origin`
- [ ] Documentar política de CORS para futuras integraciones (mobile, widgets)

### Archivos owned
- `src/proxy.ts` o `src/middleware.ts`

---

## Dependencies & Impact

### Depende de
- Nada — todos los slices son independientes entre sí y del resto del backlog

### Impacta a
- Todo el portal (CI, logging, security son transversales)
- TASK-126 (CSP enforcement) — Slice 4 complementa pero no reemplaza

---

## Recomendación de ejecución

| Orden | Slice | Esfuerzo | Valor inmediato |
|-------|-------|----------|-----------------|
| 1 | Slice 1 — CI (tsc + audit) | Bajo (30 min) | Detecta type errors antes de deploy |
| 2 | Slice 4 — CORS + headers | Bajo (30 min) | Cierra superficie de ataque |
| 3 | Slice 2 — Structured logging | Medio (2-3h) | Mejora debuggability en producción |
| 4 | Slice 3 — Test coverage | Medio (2-3h) | Red de seguridad para módulos nuevos |

Slices 1 y 4 son quick wins que se pueden hacer en una sesión. Slices 2 y 3 son inversión progresiva.
