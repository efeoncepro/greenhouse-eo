# ISSUE-104 — `pnpm build` hace OOM sistemático bajo el Node 20 al que Volta ata pnpm

## Ambiente

local (cualquier máquina con Volta) + cualquier agente que corra `pnpm build` / `pnpm local:check:full` / `pnpm local:check:ui` como gate de cierre.

## Detectado

2026-06-20, durante el gate de cierre de TASK-1187 (`pnpm build` falló con OOM bajo el toolchain default; el build solo pasaba con el workaround manual nvm Node 24 + `NODE_OPTIONS`).

## Síntoma

`pnpm build` compila bien (`✓ Compiled successfully`) pero **aborta en la fase post-compile** (type-gen / generación de páginas estáticas) con:

```
FATAL ERROR: Ineffective mark-compacts near heap limit Allocation failed - JavaScript heap out of memory
Next.js build worker exited with code: null and signal: SIGABRT
```

Ocurría **sistemáticamente** — el build solo pasaba forzando manualmente `nvm use 24 && export NODE_OPTIONS=--max-old-space-size=8192`. Eso convertía un gate de cierre obligatorio en un paso frágil dependiente de un workaround por shell.

## Causa raíz

Dos condiciones combinadas:

1. **Volta ata el tool `pnpm` a Node 20.20.1** (`volta list` → `package pnpm@10.32.1 / pnpm, pnpx / node@20.20.1`), aunque el runtime default de Volta sea mayor (Node 22). Por eso todo `pnpm <script>` — incluido `pnpm build` — corre bajo Node 20, y el `next build` hijo hereda Node 20.
2. **El build tiene runner propio (`scripts/run-next-build.mjs`) que NO pasaba por el flag de heap.** El fix durable de heap de 2026-06-17 (commit `445f0e721`) horneó `--max-old-space-size=8192` en el script `local:check` (tsc), pero `pnpm build` no pasa por ahí → quedaba con el old-space default de Node 20 (~2 GB), insuficiente para el grafo de build de la app.

Resultado: pnpm-bajo-Node-20 + build sin techo de heap = OOM determinista en cada `pnpm build`.

## Impacto

- **Para quién:** todo dev/agente que corra el gate de build de cierre (`pnpm build`, `local:check:full`, `local:check:ui`).
- **Severidad:** media — no es runtime productivo, pero rompía un gate de cierre obligatorio y empujaba a workarounds frágiles o, peor, a saltarse el gate.

## Solución

Resuelto en **commit `11ac6adf9`** (2026-06-20): el build runner `scripts/run-next-build.mjs` inyecta `--max-old-space-size=8192` en `NODE_OPTIONS` del `next build` (preservando un `NODE_OPTIONS` existente, sin pisarlo). Espeja el flag que `local:check` ya aplica a `tsc`. Es **independiente de la versión de Node**, así que resuelve el OOM incluso bajo el Node 20 al que Volta ata pnpm — sin imponerle una versión de Node a nadie (la app deliberadamente no pinea Node).

## Verificación

- `pnpm build` completo (`✓ Compiled successfully` + `Generating static pages 22/22` + exit 0) bajo el **toolchain DEFAULT** (Volta con pnpm→Node 20), **sin** nvm ni `NODE_OPTIONS` manual. El OOM ya no ocurre.

## Estado

resolved (2026-06-20)

## Relacionado

- Fix hermano previo: tsc/`local:check` OOM durablemente resuelto 2026-06-17 (commit `445f0e721`). Este ISSUE cierra el hueco gemelo en `pnpm build`.
- Causa raíz subyacente (no tocada, es policy de máquina): Volta ata `pnpm` a Node 20.20.1. Alinear la versión (rebind `volta install pnpm` con default Node 22/24, o pin `volta` en `package.json`) sería el fix de versión — diferido porque la app deliberadamente no pinea Node y los flags de heap resuelven el síntoma. Node 20 está deprecado en GH Actions (removal 2026-09-16 per CLAUDE.md), así que migrar a Node 24 vale la pena oportunamente.
- Código: `scripts/run-next-build.mjs`.
