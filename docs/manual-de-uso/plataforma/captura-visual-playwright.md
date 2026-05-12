# Capturar visuales + microinteractions con Playwright

> **Tipo de documento:** Manual de uso
> **Version:** 1.0
> **Creado:** 2026-05-12
> **Modulo:** Plataforma (frontend tooling)
> **Ruta en portal:** Transversal (uso desde CLI local o CI)
> **Documentacion relacionada:** [scripts/frontend/README.md](../../../scripts/frontend/README.md) · [Agent Auth canónico](../../../CLAUDE.md#agent-auth-acceso-headless-para-agentes-y-e2e)

## Para que sirve

Esta guía explica cómo usar el helper canónico `pnpm fe:capture` para grabar una sesión Playwright contra una ruta del portal y obtener:

- `recording.webm` — video continuo del lifecycle
- `frames/NN-<label>.png` — stills PNG sync en momentos clave (marker-based)
- `manifest.json` — scenario metadata + timings + frame paths
- `flipbook.gif` — opcional, requiere `ffmpeg` instalado

Casos de uso:

- Validar microinteractions (hover, click, transitions) que no se ven en captura estática
- Documentar visualmente un cambio de UI para PR review
- Capturar evidencia para auditorías de QA / accesibilidad
- Reproducir bugs visuales con artifacts adjuntables

Reemplaza el patrón de cada agente escribiendo su `_cap.mjs` ad-hoc.

## Antes de empezar

Verificá que están las variables en `.env.local`:

```bash
AGENT_AUTH_SECRET=...
AGENT_AUTH_EMAIL=agent@greenhouse.efeonce.org
VERCEL_AUTOMATION_BYPASS_SECRET=...
```

Si vas a generar GIFs, instalá ffmpeg:

```bash
# macOS
brew install ffmpeg

# Linux
sudo apt install ffmpeg
```

Sin ffmpeg, el helper sigue funcionando — solo salta el GIF con un warning.

## Paso a paso

### Caso 1 — Captura simple de una ruta (sin scenario)

Útil para screenshot rápido sin interacciones:

```bash
set -a; source .env.local; set +a
pnpm fe:capture --route=/hr/offboarding --env=staging --hold=3000
```

Resultado: `recording.webm` (~3 segundos) + `frames/01-snapshot.png` (1 still).

### Caso 2 — Captura con scenario predefinido

Para microinteractions, usá un scenario que actúa la página:

```bash
set -a; source .env.local; set +a
pnpm fe:capture offboarding-queue-microinteractions --env=staging
```

El scenario hace hover, click, etc., y marca frames PNG en cada momento clave. Output completo:

```
.captures/2026-05-12T04-35-12_offboarding-queue-microinteractions/
├── recording.webm
├── frames/
│   ├── 01-initial-loaded.png
│   ├── 02-kpi-tile-hover.png
│   ├── 03-kpi-filter-active.png
│   ├── 04-kpi-back-to-all.png
│   ├── 05-row-hover.png
│   └── 06-inspector-cross-fade.png
├── manifest.json
└── stdout.log
```

### Caso 3 — Con GIF flipbook

Para revisar las microinteractions como video sin abrir un reproductor:

```bash
pnpm fe:capture offboarding-queue-microinteractions --env=staging --gif
```

Genera `flipbook.gif` (~800px ancho, 12 fps). Adjuntable a PRs / issues GitHub directamente.

### Caso 4 — Headed (para debug visual local)

Si querés ver el browser mientras se ejecuta:

```bash
pnpm fe:capture offboarding-queue-microinteractions --env=staging --headed
```

Útil cuando algo falla y querés ver qué pasa en tiempo real.

### Caso 5 — Crear un scenario nuevo

1. Crear archivo `scripts/frontend/scenarios/<nombre>.scenario.ts`
2. Estructura mínima:

```ts
import type { CaptureScenario } from '../lib/scenario'

export const scenario: CaptureScenario = {
  name: 'mi-feature-microinteractions',
  route: '/finance/cash-out',
  viewport: { width: 1440, height: 900 },
  initialHoldMs: 1500,
  steps: [
    { kind: 'wait', selector: 'h4', timeout: 5000 },
    { kind: 'mark', label: 'initial' },
    { kind: 'hover', selector: '[role="tab"]:nth-child(2)' },
    { kind: 'sleep', ms: 300 },
    { kind: 'mark', label: 'tab-hover' }
  ]
}
```

3. Ejecutar:

```bash
pnpm fe:capture mi-feature-microinteractions --env=staging
```

Ver el DSL completo en `scripts/frontend/scenarios/_README.md`.

### Caso 6 — Purgar capturas viejas

```bash
pnpm fe:capture:gc                    # dry-run, lista qué borraría (>30d)
pnpm fe:capture:gc --apply            # borra de verdad
pnpm fe:capture:gc --apply --days=7   # threshold custom
```

## Que significan los estados / señales

| Indicador | Significado |
|---|---|
| `✓ mark[N] "<label>" (+Xms)` | Frame PNG capturado correctamente |
| `✗ step N failed: <error>` | Step falló — debug screenshot generado en `frames/99-step-N-failed.png` |
| `⚠️ stale auth detectado, forzando refresh…` | Cookie de agent expiró; el helper llamó al setup canónico |
| `⚠️ ffmpeg no instalado` | GIF saltado, recording + frames intactos |
| `✅ capture OK` | Run completo, todos los marks emitidos |
| `❌ capture FALLÓ` | Hubo error mid-scenario; manifest + frames parciales preservados |

## Que no hacer

- **NUNCA** ejecutar contra production sin Triple Gate: `GREENHOUSE_CAPTURE_ALLOW_PROD=true` env + `--prod` flag + capability (futuro). Para visualizar production usá production directamente con un browser real.
- **NUNCA** committear `.captures/` — ya está en `.gitignore`. Si necesitás compartir un artifact, pegalo en un Notion/Drive o adjuntalo a un comentario en PR/GitHub directamente.
- **NUNCA** crear scenarios con `mutating: true` que toquen surfaces irreversibles (Pagos, Finiquitos, Releases) sin coordinar primero. Esos scenarios crean entidades reales en staging.
- **NUNCA** invocar `tsx scripts/frontend/capture.ts` directo — usá siempre `pnpm fe:capture` para que el script entrypoint del package corra el resolve correcto.
- **NUNCA** reinventar la generación del cookie de agent — el helper delega a `scripts/playwright-auth-setup.mjs` canónico.

## Problemas comunes

| Problema | Solucion |
|---|---|
| `VERCEL_AUTOMATION_BYPASS_SECRET ausente` | Cargá `.env.local` con `set -a; source .env.local; set +a` antes de correr |
| Captura redirigida a `/login` | El helper detecta y auto-refresca el storage state. Si persiste, corré manual: `AGENT_AUTH_BASE_URL=https://greenhouse-eo-env-staging-efeonce-7670142f.vercel.app AGENT_AUTH_EMAIL=agent@greenhouse.efeonce.org AGENT_AUTH_STORAGE_PATH=.auth/storageState.staging.json node scripts/playwright-auth-setup.mjs` |
| `ffmpeg not found` con `--gif` | Instalá ffmpeg (`brew install ffmpeg`). El webm + frames quedan intactos sin el GIF. |
| Step `hover` / `click` falla con timeout | Verificá el selector — usa DevTools del browser (con `--headed`) para inspeccionar y ajustar el selector |
| GIF muy grande / muy lento | Reducir el `--gif` workflow — el helper produce 12 fps 800px por default. Para casos pesados, abrir `flipbook.gif` y comprimirlo con `gifsicle` después |
| Tests vitest fallan luego de agregar steps | Los tests usan `getByText`/`getByRole`; al agregar elementos nuevos podés introducir duplicados. Cambiar a `findByText`/`getAllByText` |

## Referencias técnicas

- **Spec canónica**: el helper fue diseñado vía `arch-architect` skill con 4-pillar scoring + 5-layer defense-in-depth Safety
- **DSL types**: [scripts/frontend/lib/scenario.ts](../../../scripts/frontend/lib/scenario.ts)
- **Auth canónico**: [scripts/playwright-auth-setup.mjs](../../../scripts/playwright-auth-setup.mjs)
- **Convención storage state**: `.auth/storageState.<env>.json` (gitignored)
- **CLAUDE.md** sección "Agent Auth": permisos + variables canónicas
