# TASK-1157 — Optimizar memoria del build de Vercel (matar el OOM flaky sin pagar)

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Execution profile: `standard`
- UI impact: `none`
- Backend impact: `none`
- Epic: `optional`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `platform|ops`
- Blocked by: `none`
- Branch: `task/TASK-1157-vercel-build-memory-optimization`
- Legacy ID: `none`
- GitHub Issue: `optional`

## Summary

El `next build` (Turbopack) de la app OOM-ea de forma **flaky** en el builder default de Vercel (~8 GB):
el pico de RAM queda al borde del techo del container y a veces se pasa → SIGKILL (`npx exited with code
null`). Es **estructural** (1106 entrypoints + sourcemaps de Sentry en el build), NO por un cambio puntual,
y bloquea **cualquier** deploy de staging/prod cuando cae. Esta task baja el pico de RAM del build con
palancas de **costo $0** (capar paralelismo + recortar sourcemaps de Sentry en staging); Enhanced Builds
(pago) queda como último recurso **solo si** después de eso el build sigue sin entrar.

## Why This Task Exists

Detectado live (2026-06-16) al redeployar staging: 2 builds OOM-earon seguidos, 1 pasó raspando. El reporte
del propio Vercel confirma *"Out of Memory event detected... SIGKILL"*. Causa: la app tiene **258 páginas +
848 rutas API = 1106 entrypoints** que Turbopack compila + Next recolecta page-data, **más** el plugin de
Sentry procesando/subiendo sourcemaps durante el build (`SENTRY_AUTH_TOKEN/ORG/PROJECT` están seteados en
staging → `sourcemaps` activo en `next.config.ts`). El pico de RAM vive al borde del techo → OOM
no-determinístico (depende del paralelismo de Turbopack + carga/co-tenancy del builder). Pagar Enhanced
Builds resolvería el síntoma con **costo recurrente por build**; primero hay que agotar los fixes $0 que
atacan la causa (que el build entre en la caja).

## Goal

- Bajar el pico de RAM del `next build` para que **entre con margen** bajo el techo del builder default.
- Eliminar el OOM flaky → builds de staging/prod **determinísticos** (no más fallos por memoria).
- **Costo $0 recurrente** (no Enhanced Builds) salvo que se demuestre que ni con los fixes alcanza.
- Conservar lo que importa (sourcemaps de Sentry en **producción**; solo recortar en staging).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/operations/LOCAL_FIRST_DEVELOPMENT_WORKFLOW_V1.md` (costo de CI/Vercel)
- `docs/architecture/GREENHOUSE_CLOUD_INFRASTRUCTURE_V1.md` (deploy topology)
- Análisis de arquitectura (arch-architect) en la Delta de esta task.

Reglas obligatorias:

- **NO** prender Enhanced Builds (costo recurrente) antes de agotar los fixes $0. Pagar solo cuando se
  demuestre que el build no entra ni capando paralelismo ni recortando sourcemaps.
- `NODE_OPTIONS=--max-old-space-size` **NO es el fix** (el OOM es RAM del container / Turbopack nativo, no
  el heap de Node). No cargo-cultear.
- Conservar sourcemaps de Sentry en **producción** (solo evaluar recortarlos en staging).
- Cambios solo de build/config — cero impacto en runtime de la app.
- Verificar el knob real de paralelismo de Next 16 + Turbopack ANTES de asumirlo (puede diferir de webpack).

## Normative Docs

- Evidencia del OOM: reporte de build de Vercel (deployment `greenhouse-3racob54s` / `7ef2uiwtv`, 2026-06-16).
- `scripts/run-next-build.mjs` (invoca `npx next build`, sin tuning de memoria).
- `next.config.ts` (Turbopack `viewTransition` + `withSentryConfig` con `sourcemaps.disable: !sourcemapsReady`).

## Dependencies & Impact

### Depends on

- `scripts/run-next-build.mjs`
- `next.config.ts`
- Env vars de Vercel (`SENTRY_*` en staging).

### Blocks / Impacts

- **Todos** los deploys de staging y producción (el OOM bloquea cualquiera cuando cae).
- El flip del híbrido a prod (TASK-1151) y cualquier release pasan por este build.

### Files owned

- `scripts/run-next-build.mjs`
- `next.config.ts`
- (config Vercel: env `SENTRY_AUTH_TOKEN` en staging — fuera del repo)

## Current Repo State

### Already exists

- `run-next-build.mjs` corre `npx next build` sin flags de memoria/paralelismo.
- `next.config.ts` gatea sourcemaps de Sentry por `sourcemapsReady` (los 3 `SENTRY_*`).
- Staging buildea en cada push a develop (flaky OOM).

### Gap

- Sin cap de paralelismo del build → pico de RAM al borde del techo.
- Sourcemaps de Sentry activos en staging (memoria + tiempo de build innecesarios ahí).
- Sin medición del pico de RAM del build (no sabemos cuánto margen falta).

<!-- ZONE 2 — PLAN MODE: no llenar al crear la task -->

<!-- ZONE 3 — EXECUTION SPEC -->

## Scope

### Slice 1 — Medir el pico de RAM del build

- Activar `VERCEL_BUILD_SYSTEM_REPORT=1` (env) para ver el reporte completo de memoria del build.
- Establecer el baseline: cuánto RAM pico vs el techo del container default. Define cuánto hay que bajar.

### Slice 2 — Recortar sourcemaps de Sentry en staging ($0)

- Desactivar el procesamiento/subida de sourcemaps de Sentry **solo en staging** (quitar `SENTRY_AUTH_TOKEN`
  de staging → `sourcemapsReady=false` → `sourcemaps.disable: true`), conservándolos en producción.
- Re-medir el pico de RAM (Slice 1) → cuantificar la reducción.

### Slice 3 — Capar paralelismo del build ($0)

- Verificar y aplicar el knob real de Next 16 + Turbopack para limitar workers/concurrencia (candidatos:
  `experimental.cpus`, `experimental.workerThreads`, variable de entorno de Turbopack). Bajar el pico de RAM
  a cambio de algunos minutos de build.
- Re-medir → confirmar que el build entra **con margen** y de forma determinística.

### Slice 4 — Decisión Enhanced Builds (solo si hace falta)

- Si tras Slices 2-3 el build sigue sin entrar con margen → documentar el caso y recomendar Enhanced Builds
  (con su costo). Si entra → cerrar como no-go de Enhanced Builds (ahorro confirmado).

## Out of Scope

- Reducir el número de rutas (1106 entrypoints) — disciplina de route-count es otra línea de trabajo.
- Cambios de runtime de la app.
- Migrar de Turbopack a webpack (regresión de DX).

## Detailed Spec

Causa raíz + palancas en la Delta de arquitectura (abajo). El orden es: **medir → recortar sourcemaps
(staging) → capar paralelismo → recién ahí evaluar pagar**. Cada Slice re-mide el pico para decidir si el
siguiente hace falta (no aplicar todo a ciegas).

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 (medir) → Slice 2 (sourcemaps) → Slice 3 (paralelismo) → Slice 4 (decisión pago). Cada paso
  re-mide; si el build ya entra con margen tras un Slice, los siguientes son opcionales.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Capar paralelismo alarga mucho el build | ops/cost | medium | medir el trade-off; elegir el cap mínimo que dé margen | duración del build |
| Perder sourcemaps de Sentry donde importan | observability | low | recortar SOLO en staging; conservar en prod | stacktraces de prod siguen mapeados |
| El knob de Turbopack no existe/diferente en Next 16 | platform | medium | verificar en Discovery antes de asumir; fallback a otra palanca | build sigue OOM |
| Ni con los fixes el build entra | ops/cost | low | Slice 4: Enhanced Builds documentado como último recurso | OOM persiste post-fix |

### Feature flags / cutover

- Sin flags de runtime (cambios de build/config). Reversibles por revert del PR / re-set del env var.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | quitar `VERCEL_BUILD_SYSTEM_REPORT` | < 5 min | si |
| Slice 2 | volver a setear `SENTRY_AUTH_TOKEN` en staging | < 5 min | si |
| Slice 3 | revert del cambio de config de paralelismo | < 10 min | si |
| Slice 4 | N/A (decisión) | N/A | si |

### Production verification sequence

1. Medir baseline (Slice 1) en staging.
2. Aplicar Slice 2 → re-medir → confirmar reducción.
3. Aplicar Slice 3 → varios builds de staging seguidos sin OOM (confirmar determinismo).
4. Recién con staging estable, el mismo build protege producción.

### Out-of-band coordination required

- Env vars de Vercel (`SENTRY_AUTH_TOKEN` staging, `VERCEL_BUILD_SYSTEM_REPORT`) — config de Vercel, no repo.
- Enhanced Builds (si Slice 4 lo recomienda) = decisión de plan/billing del operador.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] El `next build` entra **con margen** bajo el techo del builder default (medido, no asumido).
- [ ] Varios builds de staging seguidos sin OOM (determinismo confirmado).
- [ ] Sourcemaps de Sentry conservados en producción; recortados solo en staging (si se aplicó).
- [ ] Costo $0 recurrente — Enhanced Builds NO habilitado, salvo que Slice 4 demuestre que es necesario (documentado).
- [ ] Cero impacto en runtime de la app.

## Verification

- Build de staging exitoso N veces seguidas (sin OOM).
- Reporte `VERCEL_BUILD_SYSTEM_REPORT` mostrando margen de RAM.
- `pnpm build` local sigue verde.

## Closing Protocol

- [ ] `Lifecycle` sincronizado
- [ ] archivo en la carpeta correcta
- [ ] `docs/tasks/README.md` sincronizado
- [ ] `Handoff.md` actualizado
- [ ] `changelog.md` actualizado si cambia comportamiento de build visible
- [ ] chequeo de impacto cruzado

## Follow-ups

- Disciplina de route-count (1106 entrypoints) como línea de trabajo separada si el build vuelve a crecer.

## Delta 2026-06-16 — Análisis de arquitectura (arch-architect)

**Causa raíz:** OOM del **container de build** (no del heap de Node) durante `next build` (Turbopack). Driver:
**1106 entrypoints** (258 páginas + 848 rutas API) + **sourcemaps de Sentry** procesados en el build. Pico de
RAM al borde del techo default (~8 GB) → flaky (depende del paralelismo de Turbopack + carga del builder).
**No** lo causó ningún cambio puntual (verificado: un flag booleano de runtime + 2 helpers puros no mueven
la memoria del build; el mismo commit buildeó Ready y OOM-eó en redeploys consecutivos).

**Palancas $0 (ordenadas):** (1) capar paralelismo del build → baja el pico a cambio de tiempo; (2) recortar
sourcemaps de Sentry en staging; (3) [mayor esfuerzo] disciplina de route-count. **NO** sirve
`--max-old-space-size` (RAM de container, no heap). **Enhanced Builds (pago)** solo si tras (1)+(2) no entra.

**4-pilar:** Safety = build-only, reversible, cero runtime. Robustez/Resiliencia = saca el OOM flaky → deploys
determinísticos (le pega a TODOS los deploys). Escalabilidad = compra headroom; cuando los entrypoints crezcan
mucho más, recién ahí Enhanced Builds se justifica (trigger declarado).

## Open Questions

- Knob exacto de paralelismo en Next 16 + Turbopack (verificar en Discovery — puede diferir del de webpack).
- ¿Cuánto margen real falta? (depende del baseline del Slice 1).
