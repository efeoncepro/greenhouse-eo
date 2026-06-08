# ISSUE-085 — Local dev queda en `Compiling...` por chunk huerfano ApexCharts/Turbopack

> **Estado:** Resuelto
> **Ambiente:** local dev (`localhost:3000`, Next.js 16.1.1 / Turbopack)
> **Detectado:** 2026-06-07 (operador reporta `Compiling...` persistente en Chrome)
> **Resuelto:** 2026-06-07
> **Severidad:** Media-alta para desarrollo local (portal inutilizable en dev; sin impacto productivo confirmado)

## Sintoma

`localhost:3000/home` quedaba con el indicador **Compiling...** y el proceso `next-server (v16.1.1)` sostenia CPU alto (~480-525%). Requests nuevas quedaban sin bytes y Playwright no llegaba a `domcontentloaded`.

La evidencia de browser mostraba 404 sobre chunks `/_next/static/chunks/node_modules_react-apexcharts_dist_react-apexcharts_min_*.js` y Fast Refresh entraba en rebuild permanente.

## Causa raiz

Habia una doble frontera `next/dynamic` alrededor de ApexCharts:

- `src/libs/styles/AppReactApexCharts.tsx` importaba el wrapper legacy `@/libs/ApexCharts`.
- `@/libs/ApexCharts` hacia `dynamic(() => import('react-apexcharts'), { ssr: false })`.
- 23 consumers volvían a envolver `AppReactApexCharts` con `dynamic(() => import('@/libs/styles/AppReactApexCharts'), { ssr: false })`.

Con Turbopack dev, esa frontera nested dejo `react-loadable-manifest.json` apuntando a hashes que no existian en `.next/dev/static/chunks`. El navegador pedia chunks huerfanos, recibia 404 y el runtime de dev intentaba reconstruir indefinidamente.

## Impacto

- Local dev del portal quedaba practicamente inutilizable.
- No era un problema de datos, auth, DB ni produccion; el build fresco pasaba una vez corregida la frontera canonica.
- El riesgo real era reintroducir el patron en otros charts porque el sintoma parecia "cache rota" y podia ocultar la causa de import/runtime.

## Solucion

- `src/libs/styles/AppReactApexCharts.tsx` queda como unico owner de `dynamic<Props>(() => import('react-apexcharts'), { ssr: false })`.
- Se retiro `src/libs/ApexCharts.tsx`.
- Los consumers importan `AppReactApexCharts` directo, sin `dynamic()` adicional.
- Se agrego la lint rule `greenhouse/no-dynamic-app-react-apexcharts` en modo `error`, con tests, para bloquear doble dynamic y el import legacy.

## Verificacion

- `pnpm clean && pnpm dev`, luego Playwright local:
  - `/home` cargo sin cuelgue, consola 0 errores y chunk `react-apexcharts_min_5c90e618.js` respondio `200 OK`.
  - `/admin/design-system/colors` cargo sin cuelgue, consola 0 errores.
- `pnpm test:lint-rules` OK.
- `pnpm exec tsc --noEmit --pretty false` OK.
- `pnpm lint` OK (0 errores; 9 warnings HEX preexistentes fuera del fix).
- `pnpm build` OK.

## Aprendizaje / runbook corto

Cuando Next dev local queda en `Compiling...`:

1. No asumir primero "cache rota"; `pnpm clean` sirve para confirmar, no como fix.
2. Revisar CPU/proceso (`ps`) y comparar `curl -I` contra navegador real.
3. Usar Playwright/Chromium para consola + network; filtrar `_next/static/chunks`, HMR/Fast Refresh y 404/500.
4. Si hay chunk huerfano, comparar `.next/dev/server/app/**/react-loadable-manifest.json` contra `.next/dev/static/chunks`.
5. Buscar fronteras `dynamic()`/imports nested en wrappers compartidos. El fix robusto vive en el owner canonico del wrapper, no en cada consumer.
6. Si el bug class puede repetirse, agregar guardrail mecanico (lint/test) junto al fix.

## Relacionado

- Arquitectura UI: `docs/architecture/ui-platform/PRIMITIVES.md` → `ApexCharts Runtime Wrapper`.
- Historial UI: `docs/architecture/ui-platform/HISTORIAL.md` → `Delta 2026-06-07l`.
- Guardrail: `greenhouse/no-dynamic-app-react-apexcharts`.
