# ISSUE-094 — Dev server degradado: render SSR de 12-66s en TODOS los routes por PG pool cerrado tras HMR (`Cannot use a pool after calling end on the pool`)

## Ambiente

local dev (`pnpm dev`, Next.js 16 Turbopack) — afecta GVC `--env=local` y cualquier navegación autenticada. NO afecta producción ni staging (prod build no hace HMR; pool estable).

## Detectado

2026-06-13, durante la verificación GVC byte-idéntica de TASK-1108 (migración del proof de `/knowledge`). Síntoma: `pnpm fe:capture <scenario> --env=local` abortaba con `page.goto: Timeout 60000ms exceeded` repetidamente.

## Síntoma

Tras una sesión larga de desarrollo (muchas ediciones → muchos HMR reloads, + un `pnpm build` en paralelo, + muchas capturas GVC), el dev server entra en un estado donde **el render SSR de cualquier route autenticado tarda 12-66s** (oscilante, sin cambiar el código). El compile es rápido (50-200ms); lo lento es `render:`. GVC `page.goto` (timeout 60s) entonces falla intermitentemente.

Clave: la lentitud afecta **TODOS los routes** — `/home` (51s), `/design-system/border-beam` (47s), `/knowledge/mockup/answer-trace` (59s) — incluidos routes que el cambio en curso NO tocó. Eso es la firma de que es un problema **global del dev server**, no del código que se está editando.

## Causa raíz

El log del dev server muestra, en loop, durante cada render lento:

```text
Retrying Greenhouse Postgres query after retryable connection failure
(attempt 1/3, delay 1000ms). Error: Cannot use a pool after calling end on the pool
```

El **pool de PostgreSQL singleton** (`src/lib/postgres/client.ts`) quedó **cerrado** (`pool.end()` fue llamado, o un HMR re-evaluó el módulo del client dejando el singleton apuntando a un pool terminado). Cada request que toca PG (auth/session/data) entonces:

1. Intenta usar el pool cerrado → falla con `Cannot use a pool after calling end on the pool`.
2. El retry canónico reintenta **3× con 1000ms de delay** cada uno.
3. Multiplicado por los N queries PG que un route hace al renderizar (auth + session + data por bloque) → **decenas de segundos de delays acumulados** → `render: 12-66s`.

Qué cierra el pool en dev: típicamente HMR re-evaluando el módulo de PG (o un proceso hermano que llamó `pool.end()` — p.ej. el final de un `pnpm build` o un script que importó el client y lo cerró). Es un artefacto de **estado stale del singleton tras hot-reload**, hermano de ISSUE-085 (degradación Turbopack de CPU alto en dev).

## Impacto

- **Falsos timeouts de GVC** en `--env=local`: las capturas abortan en `page.goto` 60s aunque el código esté bien.
- **A/B de performance confundidos**: medir "render time" antes/después de un cambio es **inválido** mientras el pool está degradado — el mismo código rinde 12s o 66s según el estado del pool, no según el código. (En TASK-1108 esto me hizo sospechar erróneamente que mi cambio había metido una regresión de SSR de 60s; el log probó que era el pool.)
- **Pérdida de tiempo de diagnóstico**: sin mirar el log del dev por el error de pool, uno persigue al código equivocado.

NO hay impacto productivo: prod/staging usan build (sin HMR), el pool es estable, los routes rinden en su tiempo normal (segundos).

## Solución

**Resolución canónica: reiniciar el dev server** (pool fresco):

```bash
pkill -9 -f "next-server"; pkill -9 -f "next dev"; pkill -9 -f "pnpm dev"
sleep 3
nohup pnpm dev > /tmp/gh-dev.log 2>&1 &
```

Tras el restart, `render:` vuelve a su tiempo normal (segundos) y GVC pasa.

**Diagnóstico canónico (antes de culpar al código)**: cuando un route local rinde lento o GVC hace timeout en `page.goto`, **mirar el log del dev server** por `Cannot use a pool after calling end on the pool`:

```bash
grep -i "Cannot use a pool" /tmp/gh-dev.log | tail
# y comparar el render time de un route que NO tocaste:
grep -E "GET /home 200|render:" /tmp/gh-dev.log | tail
```

Si el error de pool aparece, o si un route ajeno también rinde 30-60s → es esta degradación del dev (ambiental), NO el código. Restart y re-medir.

**Regla operativa (lección)**:

- **NUNCA** hacer un A/B de render-timing local (stash el cambio → medir → pop → medir) sin verificar primero que el pool del dev está sano en **ambas** mediciones. El estado del pool confunde la medición más que el código.
- **SIEMPRE** que el render SSR local sea anómalo, primero `grep "Cannot use a pool"` + comparar un route ajeno; recién después sospechar del código en curso.
- Verificación de regresión de SSR del código → mejor contra **`pnpm build`** (prod, pool estable) o staging, no contra el dev server bajo carga.

**Fix de fondo (follow-up, no urgente)**: hacer el singleton del pool de `src/lib/postgres/client.ts` resiliente a un `end()` accidental en dev — detectar `pool.ended`/`pool.ending` y re-crear el pool en vez de reintentar 3× contra uno muerto. Eso degradaría el síntoma de "render 60s" a "un reconnect rápido". Queda como mejora opcional; la resolución operativa (restart) es suficiente y el blast radius es solo dev local.

## Cómo se diagnosticó y resolvió (proceso real, paso a paso)

Lo dejo documentado porque el **camino de diagnóstico** es la parte reutilizable — me llevó por una pista falsa antes de la causa real.

1. **Síntoma inicial**: `pnpm fe:capture knowledge-answer-trace --env=local` abortaba con `page.goto: Timeout 60000ms exceeded`. Cero frames.
2. **Primera hipótesis (incorrecta) — compile lento**: `curl` a la ruta → 307 (redirect de auth) en 26s. Pensé "Turbopack compila lento, primer hit". Reinicié el dev server y reintenté → siguió fallando. **Falsa: el 307 es el redirect de auth ANTES del compile; el route real solo compila con un request autenticado (el de GVC, que tiene la cookie).**
3. **Leí el dev log con el detalle del render**: `GET /knowledge/mockup/answer-trace 200 in 65s (compile: 182ms, render: 65s)`. Clave: **compile rápido (182ms), render lento (65s)**. El problema NO era compilar; era renderizar (SSR).
4. **Segunda hipótesis (incorrecta) — mi código metió una regresión de SSR**: ambos routes que tocó la task (`answer-trace` + `nexa-chat`, vía `NexaKnowledgeAnswerSurface`) rendían lento; `nexa-answers` (que NO toqué) rendía rápido. Correlacionaba con mi cambio.
5. **A/B con `git stash` (el que me confundió)**: stash de SOLO mis archivos de la task → render del answer-trace en código viejo → **3.6s** (rápido). Pop → render en código nuevo → **65s**. Conclusión aparente: "mi cambio mete 60s de SSR". **Falsa — el A/B estaba confundido por el estado del pool (ver paso 7).**
6. **Sospeché del A/B porque 65s ≈ el timeout de 60s** (huele a un timeout, no a render genuino) y porque el Lab de la primitive (`/design-system/nexa-provenance`) usa el MISMO panel+Collapse y renderizaba rápido. Eso no cuadraba con "mi código es 60s lento".
7. **Leí el log COMPLETO sin filtrar durante un render lento** — y ahí estaba, en loop: `Retrying Greenhouse Postgres query ... Error: Cannot use a pool after calling end on the pool`. Y, decisivo: **`/home` rendía 51s y `/design-system/border-beam` 47s** — routes que NO toqué. **Si routes ajenos también son lentos, no es mi código: es el dev server.**
8. **Causa raíz confirmada**: el pool de PG estaba cerrado; cada query reintentaba 3×1s; ×N queries por route = 60s de render. El A/B del paso 5 fue confundido: el "viejo" lo medí con pool fresco (post-restart), el "nuevo" con pool ya cerrado (los HMR del `stash pop` lo cerraron).
9. **Resolución**: `pkill` del árbol del dev server + `pnpm dev` fresco → render del answer-trace bajó a ~12s (cold), sin el error de pool en el log → GVC capturó el frame del proof migrado → **byte-idéntico confirmado**. La task quedó verificada.

**La lección dura**: cuando un render local es anómalo, el primer reflejo NO es `git stash` para A/B-ear tu código — es `grep "Cannot use a pool"` en el log + comparar el render de un route ajeno. Un A/B de timing sobre un dev server con el pool degradado miente.

## Verificación

Tras restart del dev server con pool fresco: `/knowledge/mockup/answer-trace` rindió en ~12s la primera vez (cold) y el GVC capturó el frame del proof migrado — byte-idéntico. Sin el error `Cannot use a pool` en el log, los routes rinden en su tiempo normal. El A/B inicial (que daba 3.6s viejo vs 65s nuevo) se explicó: el "viejo" se midió con pool fresco, el "nuevo" con pool cerrado — confundido, no real.

## Estado

resolved

## Relacionado

- Hermano de `ISSUE-085` (`resolved/ISSUE-085-local-dev-turbopack-apexcharts-chunk-loop.md`) — degradación de Turbopack en dev (CPU alto / `Compiling...`). Misma familia: estado stale del dev server tras sesión larga; la resolución es diagnóstico + restart, no `pnpm clean`.
- Detectado durante `TASK-1108` (convergencia answer-trace → `NexaProvenanceTrace` panel tabbed). El código de la task era correcto (tsc/lint/8 tests/`pnpm build` + GVC byte-idéntico); la lentitud era 100% este issue.
- `src/lib/postgres/client.ts` (pool singleton + retry canónico) — candidato del fix de fondo opcional.
- CLAUDE.md → "Vercel Deployment Protection" → "Diagnóstico local `Compiling...` / Turbopack" (secuencia canónica de diagnóstico de dev degradado: `ps`/CPU → `curl -I` vs browser → logs).
