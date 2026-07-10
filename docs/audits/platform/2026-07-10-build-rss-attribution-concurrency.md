# Build RSS Attribution & Concurrency — TASK-1380

## Verdict

`proceed` con confidence `low-to-medium` hacia una única task posterior: diseñar y verificar un modo local low-memory/adaptativo basado en `NEXT_BUILD_CPUS=1`, manteniendo `cpus=2` como baseline rápido hasta que esa task cierre UX, CI/Vercel y rollback. No cambiar producción ni reabrir EPIC-026 desde esta evidencia.

## Scope y método

- Apple M5, 10 CPU, 16 GiB; Node 24.17; Next 16.1.1/Turbopack; heap ceiling 8 GiB.
- Tooling local `scripts/architecture/build-baseline/**`; artifacts gitignored.
- Sampler cada 500 ms sobre snapshots simultáneos de `ps`: root + descendientes por PPID, RSS y process class allowlisted; nunca persiste argv/env.
- Fases derivadas de markers públicos de salida: `prebuild`, `compile`, `typecheck`, `collect-page-data`, `static-generation`, `tracing`; evidencia no clasificada queda `unknown`.
- Builds seriales, mismo checkout/host. `cpus=1` y `cpus=2`: n=3; `cpus=4`: discovery n=1. p95 no se afirma con n<5.
- Control de overhead: comando CPU-bound de 2 s, n=5 por variante; p50 sin profiler 2.667 ms vs perfilado 2.659 ms (-0,3%, ruido; gate ≤3% PASS).

## Corrección de semántica de memoria

El campo histórico `peakRssBytes` de `/usr/bin/time -l` no es el RSS del wrapper `/usr/bin/time`: el sampler observa ese root alrededor de 1,2 MB. En macOS, el valor reportado se comporta como máximo de un proceso medido/descendiente y no expresa suma simultánea del árbol. TASK-1380 agrega `processProfile.summary.peakTreeRssBytes`, calculado por snapshot, que es la métrica correcta para presión total concurrente. Se conserva el campo legacy por backward compatibility y se resume por separado.

## Discovery 1/2/4 workers

| Workers | n | Duración observada | Tree peak observado | Fase dominante | Decisión |
|---:|---:|---:|---:|---|---|
| 1 | 1 discovery | 128,4 s | 3,98 GB | typecheck | promover a cohorte |
| 2 | 1 discovery | 92,0 s | 7,94 GB | compile | baseline |
| 4 | 1 discovery | 90,3 s | 8,29 GB | compile | descartar: +4,3% memoria por ~1,8% tiempo |

Static generation dura ~0,1 s para 22 páginas dinámicas y sus peaks observados (cuando el intervalo logró capturarla) quedaron alrededor de 2,09 GB: no es el hotspot dominante. Compile/typecheck concentran los máximos.

## Cohorte promovida

| Métrica p50 (n=3) | `cpus=1` | `cpus=2` | Delta 1 vs 2 | Gate |
|---|---:|---:|---:|---|
| Duración | 106.090 ms | 96.922 ms | +9,46% | PASS (≤+10%) |
| Legacy timed peak RSS | 6.027.558.912 B | 7.369.162.752 B | -18,21% | favorable |
| Aggregate tree peak RSS | 6.584.156.160 B | 7.944.749.056 B | **-17,13%** | PASS (material) |
| Files de output | 21.471 | 21.471 | parity | PASS |
| NFT traces | 1.232 | 1.232 | parity | PASS |
| Output bytes (muestras pos-fix) | ~615,57 MB | ~615,57 MB | parity práctica | PASS |

Muestras tree RSS individuales:

- `cpus=1`: 3,98 / 6,58 / 7,85 GB.
- `cpus=2`: 7,94 / 7,71 / 8,45 GB.

La dispersión de `cpus=1` es alta y n=3 solo permite p50/low confidence; no se presenta p95 ni se convierte el resultado en default productivo.

## Atribución

1. La presión dominante vive en procesos Next/worker durante compile y typecheck.
2. El número de build CPUs altera no solo static generation: el árbol observado cambia aproximadamente de 12 a 15–16 procesos y el peak de compile escala materialmente.
3. Roadmap sigue generando el warning dinámico de ~30,4k files, pero TASK-1379 ya probó que retirarlo de traces no reduce memoria; no es la siguiente palanca.
4. `cpus=4` ofrece retorno negativo para este host. `cpus=1` compra ~17% menos tree RSS con ~9,5% más tiempo p50.

## Decisión y siguiente task propuesta

Proponer, no registrar todavía, `TASK-1381 — Adaptive Local Low-Memory Build Mode`:

- exponer un comando explícito local `build:low-memory` con `NEXT_BUILD_CPUS=1`;
- no cambiar por defecto CI/Vercel/production ni `pnpm build` hasta medir sus constraints;
- documentar selector/adaptación por RAM disponible, no por CPU count solamente;
- ejecutar n≥5 clean/warm o cohorts equivalentes en host estable, con p95 tree RSS y duración;
- target: ≥15% reducción tree RSS p50/p95, regresión tiempo ≤10%, output parity y cero OOM;
- rollback inmediato al command/config actual.

El `cpus` usado por este repo vive bajo `experimental.cpus` y no aparece como opción pública dedicada en el índice oficial vigente de configuración Next.js consultado el 2026-07-10; por eso una task posterior debe tratarlo como implementation detail experimental y no como contrato estable. Referencia oficial: <https://nextjs.org/docs/app/api-reference/config/next-config-js>.

## Rollback y runtime

- Ninguna variante quedó aplicada a `next.config.ts`, `package.json`, Vercel o CI.
- No hubo push, deploy, DB, API, UI, env/secret ni proyecto nuevo.
- Builds aislados permanecen bajo `.next-local/**`; artifacts bajo `artifacts/**`, ambos locales/ignorados.
- TASK-1377 extraction-ready sigue vigente; ADR modular permanece `Rejected` y EPIC-026 cerrado.

## Self-critique

- `ps` a 500 ms puede perder spikes sub-intervalo; `/usr/bin/time` complementa, pero no suma el árbol.
- La fase se deriva de output y puede retrasarse un chunk; `unknown`/confidence evitan falsa precisión.
- La máquina sufrió builds consecutivos y macOS conserva cache/presión; la dispersión exige n≥5 antes de cambiar defaults.
- Los artifacts cambiaron levemente por el propio dirty tree documental/tooling; parity se juzga por counts/traces y tamaño equivalente, no byte-identidad.
- Una actualización de Next puede cambiar markers, child process shape o `experimental.cpus`; los tests del parser no sustituyen una revalidación tras upgrade.
