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

## Hook operativo para agentes

Toda verificación visual de UI Greenhouse debe pasar primero por este helper:

- `pnpm fe:capture <scenario> --env=staging` si existe un scenario.
- `pnpm fe:capture --route=/path --env=staging --hold=3000` para evidencia rápida sin scenario.
- `pnpm fe:capture:review <scenario|capture-dir>` cuando la captura alimenta una revisión UI/UX.
- `pnpm fe:capture:diff <prev> <curr>` para comparar before/after.
- `pnpm fe:capture:health` para revisar salud local del pipeline de capturas.

Playwright ad-hoc queda como complemento para consola/red/API payloads o pasos que el DSL no soporte. Si se usa, guardar artifacts bajo `.captures/` y documentar por qué no bastó `fe:capture`. Si el flujo se repetirá, agregar o actualizar un scenario en `scripts/frontend/scenarios/`.

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
