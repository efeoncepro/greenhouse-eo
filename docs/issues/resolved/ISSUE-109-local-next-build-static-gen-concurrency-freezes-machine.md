# ISSUE-109 — `next build` local congela la máquina (concurrencia de static-generation sin cap en local)

> **Estado:** Resolved
> **Detectado:** 2026-06-28 (reportado por el operador durante el cierre de TASK-1277)
> **Resuelto:** 2026-06-28
> **Ambiente:** Local (desarrollo; macOS, 10 cores / 16 GB)
> **Severidad:** Media (no corrompe data; degrada gravemente la DX — la máquina entera se traba en cada `pnpm build`)

## Síntoma

Cada `pnpm build` local "tranca todo el equipo": el sistema se vuelve no-responsivo varios minutos. Empeora cuando hay un segundo build en paralelo (ej. Codex corriendo `pnpm build` a la vez).

## Causa raíz

El `next build` (Turbopack) tiene **dos picos de RAM**: la compilación de Turbopack y los **workers de static-generation**, que por default son `os.cpus().length` (= **10** en esta máquina). Cada worker es un proceso Node que **hereda `--max-old-space-size=8192`** (lo setea `scripts/run-next-build.mjs` como `NODE_OPTIONS` para evitar OOM del grafo de build, 1106+ entrypoints). 10 workers con techo de heap de 8 GB c/u + Turbopack, sobre **16 GB de RAM**, sobre-suscriben la memoria física → swap → **la máquina entera se congela**.

El cap de workers existía (`experimental.cpus: 4`, TASK-1157) pero **se aplicaba SOLO en Vercel** (`VERCEL === '1'`). En local no había cap → 10 workers.

**No es un problema de Turbopack vs Webpack:** `next dev` ya usa `--webpack`; el freeze es del build de producción y su causa es **concurrencia × memoria**, no el bundler. Cambiar el build a Webpack sería más lento y también memory-heavy; la palanca real es la concurrencia.

## Solución

`next.config.ts`: el cap de `experimental.cpus` ahora se aplica **también en local** (no solo en Vercel), con default conservador **4** (valor ya medido en TASK-1157: ~2x menos pico de RAM con poca penalidad de tiempo) y **override por env `NEXT_BUILD_CPUS`**.

Escape hatch: script `build:fast` (`NEXT_BUILD_CPUS=2 node scripts/run-next-build.mjs`) para impacto mínimo de máquina cuando se necesita seguir trabajando durante el build.

No se usa `turbopackMemoryLimit` (TASK-1157 lo midió: un tope por debajo del working set de Turbopack fuerza GC agresivo → el build se cuelga 25 min+, peor que el OOM flaky).

## Verificación

- `pnpm build` local con el cap default (4) → completa exit 0 sin congelar la máquina.
- `NEXT_BUILD_CPUS=2 pnpm build:fast` → menor pico aún.
- Vercel sigue en 4 (sin cambio de comportamiento; el default coincide con el valor previo).

## Recomendación operativa

- No correr dos builds en paralelo (ej. Codex + Claude) — duplica el pico.
- Para iterar mientras el build corre, usar `pnpm build:fast`.

## Archivos

- `next.config.ts` (`resolveBuildCpus` + `buildMemoryCaps`)
- `package.json` (`build:fast`)
- `scripts/run-next-build.mjs` (contexto: setea el heap de 8 GB heredado por los workers)
