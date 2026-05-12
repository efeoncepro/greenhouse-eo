# Frontend Capture Helper

CLI canónico para capturar visuales + microinteractions de cualquier ruta del portal usando Playwright + agent auth.

Reemplaza el patrón "cada agente escribe su `_cap.mjs` ad-hoc".

## Uso rápido

```bash
# Scenario predefinido (recomendado)
pnpm fe:capture offboarding-queue-microinteractions --env=staging

# Captura simple de una ruta (sin scenario)
pnpm fe:capture --route=/hr/offboarding --env=staging --hold=3000

# Con GIF (requiere ffmpeg instalado)
pnpm fe:capture offboarding-queue-microinteractions --env=staging --gif

# Headed para debug visual
pnpm fe:capture offboarding-queue-microinteractions --env=staging --headed
```

Output: `.captures/<ISO>_<scenario>/` (gitignored).

Ver doc completa: [docs/manual-de-uso/plataforma/captura-visual-playwright.md](../../docs/manual-de-uso/plataforma/captura-visual-playwright.md).

## Estructura

```
scripts/frontend/
├── capture.ts                 # CLI entrypoint (tsx)
├── gc.ts                      # purga capturas > 30 días
├── README.md                  # este archivo
├── lib/
│   ├── env.ts                 # 3 envs: local | staging | dev-agent | production
│   ├── auth.ts                # delega a scripts/playwright-auth-setup.mjs
│   ├── browser.ts             # chromium + viewport + bypass + recordVideo
│   ├── scenario.ts            # DSL tipado + runner de steps
│   ├── recorder.ts            # ciclo webm + frames marker-based + manifest
│   ├── manifest.ts            # CaptureManifest writer
│   ├── gif.ts                 # ffmpeg compose (opcional)
│   ├── audit.ts               # JSONL append
│   └── safety.ts              # prod gate triple + secret mask
└── scenarios/
    ├── _README.md             # cómo escribir un scenario
    └── offboarding-queue-microinteractions.scenario.ts
```

## Crear un scenario nuevo

Ver `scenarios/_README.md` para el DSL completo.

## Garbage collection

```bash
pnpm fe:capture:gc              # dry-run, lista qué borraría (>30d)
pnpm fe:capture:gc --apply      # ejecuta
pnpm fe:capture:gc --apply --days=7  # threshold custom
```
