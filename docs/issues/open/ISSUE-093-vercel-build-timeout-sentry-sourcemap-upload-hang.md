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

Pendiente (registro + mitigación propuesta). Opciones, de menos a más invasivas:

1. **Timeout defensivo en el upload de source-maps** — configurar el plugin de Sentry para que la subida tenga un límite (p.ej. `sourcemaps` con tiempo acotado o `errorHandler` que no bloquee), de modo que un upload lento **falle/skipee rápido** en vez de colgar el build 45 min. El build debe poder terminar `Ready` aunque el upload de source-maps falle (los source-maps son observabilidad, no deben gatear el deploy).
2. **Hacer el upload de source-maps condicional/no-bloqueante en staging** — gatear `sourcemapsReady` también por entorno (subir source-maps solo en Production releases, no en cada push a `develop`), reduciendo la superficie del hang en staging.
3. **Desacoplar el upload del build** — subir source-maps en un step separado del pipeline (post-deploy) en vez de dentro de `runAfterProductionCompile`.

Decisión de cuál aplicar = pendiente de revisión del operador (toca `next.config.ts` + observabilidad Sentry; verificar que Production siga teniendo source-maps para el debugging real). Mientras tanto, **mitigación operativa**: tratar un `Error` de build con duración ~45m + último log `runAfterProductionCompile` como este hang flaky (no una regresión de código); re-disparar el deploy (un push nuevo o redeploy desde Vercel) suele pasar.

## Verificación

Cómo confirmar que se resolvió: tras aplicar la mitigación, una serie de pushes a `develop` deploya consistentemente `Ready` en 6-8 min sin corridas de 45m; y si el upload de source-maps a Sentry falla, el build **degrada honesto** (deploy `Ready` + warning de source-maps) en vez de colgarse hasta el timeout. Confirmar también que Production conserva source-maps válidos en Sentry para el stack-trace mapping.

## Estado

open

## Relacionado

- `next.config.ts` (`withSentryConfig`, `sourcemapsReady`, `runAfterProductionCompile`).
- Local-First Development Workflow (`docs/operations/LOCAL_FIRST_DEVELOPMENT_WORKFLOW_V1.md`) — reduce la frecuencia de builds de staging (menos exposición al hang) trabajando local-first.
- Task Closing Quality Gate (CLAUDE.md) — `pnpm build` local como gate; nota: el build local **no** ejecuta el upload de source-maps a Sentry (sin tokens), por lo que este hang solo emerge en Vercel.
- Detectado durante la sesión TASK-1104/1105 (push a `develop`); el `Ready` de `q32gd9r6c` (1104) confirma que el código compila — el Error es el hang de Sentry, no el cambio.
