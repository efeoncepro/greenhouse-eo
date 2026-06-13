# ISSUE-093 — Builds de staging fallan por timeout (45m) colgados en la subida de source-maps a Sentry

## Ambiente

staging (y potencialmente production/preview — cualquier build con `withSentryConfig` source-map upload activo)

## Detectado

2026-06-13, email de Vercel `Failed preview deployment on team 'efeonce'` (greenhouse-eo) + verificación de los build logs vía `vercel inspect --logs --scope efeonce-7670142f`.

## Síntoma

Deployments de `greenhouse-eo` quedan en estado `● Error` con una **duración de ~45-46 minutos** (= el build-timeout de Vercel), e envían el email de "Failed deployment" al operador. El comportamiento es **intermitente**: el mismo SHA-vecino y el mismo código compilan y deployan `Ready` en 6-8 min en otras corridas.

Ejemplos live 2026-06-13: `greenhouse-2plv8962p` (staging, Error, 45m) · `greenhouse-lnbyv7gg0` (Preview, Error, 46m). En contraste, `greenhouse-q32gd9r6c` (mismo periodo, staging) deployó `Ready` en 7m.

## Causa raíz

El build de Next.js **compila correctamente** — los logs muestran:

```
✓ Compiled successfully in 3.3min
Running next.config.js provided runAfterProductionCompile ...
<el log termina acá; el build queda colgado ~42 min hasta que Vercel lo mata por timeout>
```

`runAfterProductionCompile` es el hook de **`withSentryConfig`** (`@sentry/nextjs`, `next.config.ts`) que **sube los source-maps a Sentry** después de compilar. Está gated por `sourcemapsReady` (`SENTRY_AUTH_TOKEN` + `SENTRY_ORG` + `SENTRY_PROJECT` presentes). Cuando esa subida externa a Sentry se cuelga (red lenta/inestable hacia Sentry, rate-limit, o un upload grande sin timeout propio), el paso queda bloqueado indefinidamente hasta que Vercel mata el build a los ~45 min → `Error`.

**NO es un error de compilación ni de código del producto** — es un *hang flaky de una dependencia externa* (Sentry source-map upload) sin timeout defensivo en el paso post-compile.

## Impacto

- **Emails de "Failed deployment"** al operador (ruido + alarma falsa: parece un build roto cuando el código compila bien).
- **~45 min de build-minutes desperdiciados** por cada corrida que cae en el hang (costo Vercel).
- El deploy de staging del SHA afectado **no queda disponible** hasta que un push posterior (que no caiga en el hang) lo reemplace.
- Falso positivo de "regresión": un agente/operador puede creer que su cambio rompió el build cuando en realidad fue el hang de Sentry.

## Solución

Code complete local (2026-06-13): se agregó un guardrail build-time alrededor del hook `compiler.runAfterProductionCompile` que inyecta `withSentryConfig`.

- `next.config.ts` ya no exporta directamente el resultado de `withSentryConfig`; captura el hook generado y lo ejecuta a través de `runSentrySourcemapUploadWithTimeout()`.
- `src/lib/build/sentry-sourcemap-upload-timeout.ts` aplica un presupuesto acotado al upload de source maps y, durante esa ventana, intercepta los subprocess `sentry-cli` para terminarlos con `SIGTERM` si exceden el presupuesto. Esto evita el falso `Promise.race` que "continúa" pero deja el proceso hijo vivo.
- Timeout default: `60_000ms`.
- Override: `SENTRY_SOURCEMAP_UPLOAD_TIMEOUT_MS`, clamp `5_000ms..240_000ms`.
- Vercel `staging`: `SENTRY_SOURCEMAP_UPLOAD_TIMEOUT_MS=30000` configurado el 2026-06-13 para reducir el peor caso de cada build de staging mientras se mantiene el upload sano de source maps.
- Si Sentry responde dentro del presupuesto, los source maps se suben como antes.
- Si Sentry falla o se cuelga, el build degrada con warning (`[sentry-build] ... Continuing deployment.`) y continúa. La observabilidad de source maps queda incompleta para ese deployment, pero el despliegue no se quema 45 min ni falla por una dependencia externa.
- `errorHandler` de Sentry queda configurado como backstop para errores explícitos del upload; el timeout propio cubre el caso de hang.

No se desactivó Sentry ni se movió el upload fuera del build en esta iteración. Desacoplar source maps a un job post-deploy sigue siendo una mejora futura posible, pero el guardrail actual cierra el bug class operativo sin sacrificar los uploads sanos.

## Verificación

- Vercel evidencia pre-fix:
  - `greenhouse-bu3i14eap` (`develop`, commit `310ae87`) compiló en 2.6 min y quedó colgado en `Running next.config.js provided runAfterProductionCompile ...` hasta `Error` a los 46m.
  - `greenhouse-456owabqd` (`develop`, commit `606e07c`) completó el mismo hook en 14.151s y deployó `Ready` en 7m.
- Tests locales:
  - `pnpm exec vitest run src/lib/build/sentry-sourcemap-upload-timeout.test.ts` → 4/4 pass.
  - `pnpm exec eslint next.config.ts src/lib/build/sentry-sourcemap-upload-timeout.ts src/lib/build/sentry-sourcemap-upload-timeout.test.ts` → pass.
  - `pnpm exec tsc --noEmit --pretty false` → pass.
- Build local:
  - `pnpm build` reprodujo el hang de Sentry local y el wrapper lo degradó en `60046ms`: `Source-map upload degraded ... Continuing deployment.` El build avanzó a TypeScript; luego falló por OOM local de Next worker con heap 4GB, un límite local posterior y distinto al incidente Vercel.
  - `NODE_OPTIONS=--max-old-space-size=8192 SENTRY_SOURCEMAP_UPLOAD_TIMEOUT_MS=5000 pnpm build` → pass. El hook degradó en `5028ms` y el build completo terminó exit 0.

Verificación remota pendiente: después de push/deploy a `develop`, confirmar que un staging build con Sentry lento no supera el presupuesto configurado y termina `Ready` con warning, no `Error` a los 45m.

## Estado

code complete local / rollout pendiente

## Relacionado

- `next.config.ts` (`withSentryConfig`, `sourcemapsReady`, `runAfterProductionCompile`).
- `src/lib/build/sentry-sourcemap-upload-timeout.ts`.
- Local-First Development Workflow (`docs/operations/LOCAL_FIRST_DEVELOPMENT_WORKFLOW_V1.md`) — reduce la frecuencia de builds de staging (menos exposición al hang) trabajando local-first.
- Task Closing Quality Gate (CLAUDE.md) — `pnpm build` local como gate; nota: el build local **no** ejecuta el upload de source-maps a Sentry (sin tokens), por lo que este hang solo emerge en Vercel.
- Detectado durante la sesión TASK-1104/1105 (push a `develop`); el `Ready` de `q32gd9r6c` (1104) confirma que el código compila — el Error es el hang de Sentry, no el cambio.
