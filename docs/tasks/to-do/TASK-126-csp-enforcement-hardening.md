# TASK-126 - CSP Enforcement Hardening

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Medio`
- Effort: `Medio`
- Status real: `Diseño`
- Rank: `TBD`
- Domain: `platform / security`

## Summary

Derivar el endurecimiento real de `Content-Security-Policy` a una lane propia después del baseline seguro de `TASK-099`. El objetivo ya no es introducir `CSP` por primera vez, sino pasar desde `Content-Security-Policy-Report-Only` hacia una política más estricta y verificable sin romper login, MUI, observabilidad, uploads ni integraciones.

## Why This Task Exists

`TASK-099` ya cerró la baseline de headers cross-cutting con `CSP-Report-Only`, pero dejó intencionalmente fuera el enforcement real porque ese cambio tiene riesgo transversal:

- `MUI` / `Emotion` todavía requieren `unsafe-inline` en varias superficies
- `OAuth` (`Azure AD`, `Google`) usa redirects, frames y flujos que deben ser validados explícitamente
- `Sentry`, assets, uploads e integraciones externas consumen varios `connect-src`, `img-src` y `frame-src`
- endurecer `CSP` sin evidencias previas puede romper el portal en runtime aunque el build pase

Esta deuda ya no debe seguir mezclada con `TASK-099`, porque ahora tiene objetivos, validaciones y ownership propios.

## Goal

- Pasar de `Content-Security-Policy-Report-Only` a una estrategia de enforcement segura y validada
- Reducir allowlists amplias (`https:`, `unsafe-*`) donde sea posible
- Documentar el contrato final de `CSP` y su rollout por entorno

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_CLOUD_SECURITY_POSTURE_V1.md`

Reglas obligatorias:

- no romper login ni navegación principal por endurecer headers
- preferir rollout incremental (`Report-Only` → tighten → enforce), no bigbang
- no mezclar este hardening con auth, rate limiting ni refactors de layout

## Dependencies & Impact

### Depends on

- `TASK-099` cerrada con baseline de `proxy.ts`
- `src/proxy.ts` ya exponiendo `Content-Security-Policy-Report-Only`

### Impacts to

- Login (`Azure AD`, `Google`, credentials)
- Dashboard y shells con `MUI` / `Emotion`
- Observability (`Sentry`)
- Uploads/media e integraciones externas

### Files owned

- `src/proxy.ts`
- `src/proxy.test.ts`
- `docs/architecture/GREENHOUSE_CLOUD_SECURITY_POSTURE_V1.md`
- `docs/tasks/to-do/TASK-126-csp-enforcement-hardening.md`

## Current Repo State

### Ya existe

- `src/proxy.ts` con:
  - `X-Frame-Options`
  - `X-Content-Type-Options`
  - `Referrer-Policy`
  - `Permissions-Policy`
  - `X-DNS-Prefetch-Control`
  - `Strict-Transport-Security` solo en `production`
  - `Content-Security-Policy-Report-Only`
- tests unitarios del proxy
- baseline validada con:
  - `pnpm exec vitest run src/proxy.test.ts`
  - `pnpm exec eslint src/proxy.ts src/proxy.test.ts`
  - `pnpm exec tsc --noEmit --pretty false`
  - `pnpm build`

### Gap actual

- la política actual sigue siendo amplia y observacional
- no existe inventario operativo de violaciones/reportes
- no hay versión enforce ni allowlist endurecida por superficie
- no hay validación explícita de login, dashboard, uploads y cron routes bajo una política más estricta

## Scope

### Slice 1 - Inventario y tuning de policy

- listar dominios/fuentes realmente necesarios por categoría:
  - `script-src`
  - `style-src`
  - `connect-src`
  - `img-src`
  - `font-src`
  - `frame-src`
  - `form-action`
- reducir allowlists amplias cuando el repo y el runtime lo permitan
- decidir si conviene introducir endpoint de reportes `CSP` o solo logging/manual verification

### Slice 2 - Rollout controlado

- desplegar policy endurecida primero en `Report-Only`
- validar:
  - `/login`
  - `/dashboard`
  - `/admin/ops-health`
  - uploads/media
  - flujos de auth social
- recién después decidir si se promueve una versión enforce

### Slice 3 - Documentación y cierre

- actualizar `GREENHOUSE_CLOUD_SECURITY_POSTURE_V1.md`
- documentar el contrato final por entorno
- dejar explícito qué partes siguen dependiendo de `unsafe-inline`, `unsafe-eval` o allowlists amplias

## Out of Scope

- rate limiting o bot protection
- auth middleware centralizado
- CORS por ruta
- cambios visuales de UI no relacionados a `CSP`
- refactors de MUI/Emotion no estrictamente necesarios para el hardening

## Acceptance Criteria

- [ ] existe inventario de fuentes externas realmente necesarias para `CSP`
- [ ] la política `Report-Only` se endurece respecto del baseline actual
- [ ] login con `Azure AD`, `Google` y credentials sigue sano
- [ ] dashboard/admin surfaces siguen sanas sin regresión visible
- [ ] uploads/media y observability no se rompen
- [ ] queda decisión explícita sobre si el enforce entra en esta task o en una follow-up adicional
- [ ] `pnpm exec vitest run src/proxy.test.ts` pasa
- [ ] `pnpm exec eslint src/proxy.ts src/proxy.test.ts` pasa
- [ ] `pnpm exec tsc --noEmit --pretty false` pasa
- [ ] `pnpm build` pasa

## Verification

- `pnpm exec vitest run src/proxy.test.ts`
- `pnpm exec eslint src/proxy.ts src/proxy.test.ts`
- `pnpm exec tsc --noEmit --pretty false`
- `pnpm build`
- validación manual en `staging` de `/login`, `/dashboard`, `/admin/ops-health` y uploads
