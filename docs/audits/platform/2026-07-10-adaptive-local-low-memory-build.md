# Adaptive Local Low-Memory Build — TASK-1381

## Verdict

`keep-explicit-only`.

Conservar `pnpm build:low-memory` como escape hatch manual (`NEXT_BUILD_CPUS=1`), pero retirar/no publicar `build:local` adaptativo. La cohorte n=5 no confirmó el target de memoria que justificaba selección automática.

## Implementación evaluada

- Resolver/wrapper Node local que delega a `scripts/run-next-build.mjs`; no duplica heap, dist aislado, tsconfig restore ni cleanup.
- Perfiles evaluados: `low=1 CPU`, `balanced=2 CPU`.
- Guard fail-closed: CI o Vercel devuelve `local_build_profile_forbidden`.
- Output bounded: profile, CPUs, memory bucket y source; no memoria exacta, argv ni env values.
- `pnpm build` y `build:fast` no cambiaron.

Tras el veredicto, la selección adaptativa fue retirada: el resolver final exige profile explícito y el único comando nuevo público es `build:low-memory`.

## Método

- Apple M5, 10 CPU, 16 GiB; Node 24.17; Next 16.1.1/Turbopack; heap 8 GiB.
- 10 builds completos seriales y alternados: `low1 → balanced1 → ... → low5 → balanced5`.
- Cada comando ejecutó prebuild completo y runner real.
- Profiler TASK-1380 cada 500 ms; nearest-rank p50/p95 con n=5.
- Mismo checkout/host; cache state declarado `clean`; output aislado.

## Resultados

| Métrica | Low `cpus=1` | Balanced `cpus=2` | Delta low vs balanced | Gate |
|---|---:|---:|---:|---|
| Duración p50 | 130.862 ms | 125.194 ms | +4,53% | PASS (≤+10%) |
| Duración p95 | 135.411 ms | 128.047 ms | +5,75% | informativo |
| Tree RSS p50 | 6.181.797.888 B | 6.169.673.728 B | **+0,20%** | **FAIL (requería ≤-15%)** |
| Tree RSS p95 | 6.695.550.976 B | 7.181.664.256 B | **-6,77%** | **FAIL (requería ≤-15%)** |
| Legacy timed RSS p50 | 5.632.753.664 B | 5.533.122.560 B | +1,80% | informativo |
| Legacy timed RSS p95 | 6.049.611.776 B | 6.540.181.504 B | -7,50% | informativo |
| Builds exitosos | 5/5 | 5/5 | parity | PASS |
| Files / NFT traces | 21.471 / 1.232 | 21.471 / 1.232 | parity | PASS |
| Output bytes | 615.575.343–615.577.557 | 615.575.238–615.577.523 | equivalente | PASS |

Tree RSS individual:

- low: 4,59 / 6,70 / 6,40 / 6,10 / 6,18 GB.
- balanced: 7,18 / 6,17 / 6,32 / 5,78 / 5,87 GB.

La alternancia revela que la dispersión del host/cache domina más de lo que sugería la cohorte n=3 de TASK-1380. Low mejora el peor valor observado, pero no mueve p50 y no llega al target p95; eso no justifica una heurística automática basada solo en RAM total.

## Decisión final

1. No existe `build:local` adaptativo.
2. `pnpm build:low-memory` queda como escape hatch explícito para cuando el operador prioriza reducir concurrencia o recuperarse de OOM/swap.
3. No se afirma que low siempre use menos memoria; el nombre describe el perfil de concurrencia, no una garantía estadística.
4. `pnpm build`, `build:fast`, next.config, CI y Vercel permanecen intactos.
5. No abrir otra optimización por defecto desde esta evidencia. Reconsiderar solo con profiling controlado del host/cache o evidencia remota nueva.

## Rollback

- Retirar `build:low-memory`, `scripts/build-memory-profile.mjs` y su test.
- El rollback operativo inmediato siempre es `pnpm build` o `pnpm build:fast`.
- Sin DB, flags, env persistidas, deploy, push, apps/packages ni runtime productivo.

## Self-critique

- `cacheState=clean` describe dist aislado, pero macOS/filesystem caches y presión térmica sobreviven entre builds.
- n=5 habilita p95 nearest-rank, pero sigue siendo una muestra pequeña y local.
- Los outputs cambian unos KB porque task/docs/tooling estaban dirty; counts/traces y tamaño equivalente prueban parity práctica, no byte-identidad.
- `experimental.cpus` puede cambiar con Next; el wrapper aislado y el comando opt-in reducen el blast radius.
