# ISSUE-177 — Una función de Vercel puede superar los 250 MB y nada lo detecta antes del build remoto

## Ambiente

staging (el deploy de `develop` falla); el mismo commit habría bloqueado un release a producción.

## Detectado

2026-09-22, deploy de staging `greenhouse-okyodjbgq` en `Error` durante el rollout de TASK-1847 (Claude, sesión
"Task 1846"). Es la **tercera vez en tres semanas**: el 2026-09-02 (TASK-1804) tres builds de staging fallaron con
`The Vercel Function "api/mcp/greenhouse" is 397mb uncompressed (limit 250mb)`, y el 2026-09-16 (TASK-1846) la función
`insights/catalog` llegó a 434 MB por importar el catálogo como valor (documentado en
`src/lib/efeonce-insights/render/contracts.ts`).

## Síntoma

`pnpm local:check`, el pre-push hook, `pnpm test` y `pnpm build` local pasan en verde. El deploy de Vercel falla
recién al empaquetar las funciones, porque una supera el límite de 250 MB sin comprimir. Mientras tanto `develop`
queda sin deploy para todas las sesiones que empujan encima.

Log del build del 2026-09-22 (`vercel inspect --logs`):

```text
The Vercel Function "api/platform/app/insights/catalog" is 441.09mb uncompressed which exceeds the maximum
uncompressed size limit of 250mb.
```

Es la **misma función** que falló el 2026-09-16 (434 MB). No es casualidad: todas las rutas
`src/app/api/platform/app/insights/**` importan `src/lib/api-platform/resources/app-insights.ts`, que importa todos los
commands de `@/lib/efeonce-insights/commands` —incluido el render—. Por eso cualquier import pesado dentro del render
entra en TODAS las funciones de Insights; `catalog` es la primera que Vercel reporta antes de cortar el build
(inferencia: el log sólo nombra una función).

## Causa raíz

Dos causas distintas, un mismo agujero:

1. **2026-09-22:** `src/lib/efeonce-insights/render/report-mapper.ts` se ejecuta en Vercel (al encolar un render) e
   importaba el **valor** `paginateFlow` desde el barrel `@/lib/artifact-composer`. El barrel re-exporta el motor
   completo (Playwright, pdf-lib, los catálogos con sus fuentes y assets), y el trazado de archivos lo metió todo en la
   función. Importar un **tipo** desde el barrel es inocuo; importar un valor, no.
2. **2026-09-02:** un módulo alcanzable desde una ruta usaba `node:fs` con rutas derivadas de `process.cwd()`, y el
   análisis estático de Turbopack incluyó el proyecto entero en la función.

El agujero común: **ningún gate local o de CI mide el tamaño trazado de cada función**. `pnpm build` local no lo
reporta (y consume ~30 GB de RAM, por eso casi nunca se corre); la única prueba hoy es el build de Vercel.

## Impacto

- Cualquier sesión puede dejar `develop` sin deploy de staging con un solo import mal dirigido, y las demás sesiones
  heredan el rojo sin saber por qué.
- En una promoción a `main`, el release fallaría en el build de producción.
- El diagnóstico es caro: `vercel inspect --logs` trunca a 10.000 líneas y la función culpable puede quedar fuera.

## Solución

Resuelto el 2026-09-22 con cuatro capas independientes (discovery y ejecución con subagentes; diseño con la skill de
arquitectura). Cada una atrapa lo que las otras no ven:

1. **Entrada pública liviana del composer + regla ESLint.** `src/lib/artifact-composer/pure.ts` es la segunda entrada
   pública declarada del motor (paginate, chart-geometry, bar-figure, manifest-hash y tipos): el código de Vercel
   importa valores sólo de ahí, y el ADR del composer («cero deep-imports desde consumers») se respeta porque es un
   punto de entrada declarado, como un subpath export (delta 2026-09-22 en
   `GREENHOUSE_ARTIFACT_COMPOSER_PLATFORM_DECISION_V1.md` §6). La regla
   `greenhouse/no-worker-only-module-in-vercel-code` (`error`, `src/**`) prohíbe el valor del barrel, cualquier otra
   ruta interna del motor y `playwright`/`pdf-lib`/`puppeteer`/`@sparticuz/chromium` como valor. Un test de frontera
   (`pure-entry-boundary.test.ts`) prueba que `pure` no alcanza nada pesado, con control positivo sobre el barrel.
2. **Gate de alcanzabilidad sin build** (`scripts/ci/vercel-function-reachability-gate.mjs`, `pnpm
   vercel:reachability-gate`): esbuild recorre el grafo desde las 1.519 entradas del App Router (~1,6 s) y falla si
   alcanza la denylist o un módulo nuevo que arma una ruta de runtime con `process.cwd()`/`__dirname`/`import.meta.url`
   más un segmento variable (el caso del 2026-09-02). Los 5 casos existentes quedan en
   `vercel-function-reachability-allowlist.json` con causa y tamaño medido. Corre en `local:check` (pre-push) y en
   `ci.yml` en todos los eventos — en `develop` Vercel es el único build, así que éste es el que llega antes.
3. **Gate de tamaño trazado** (`scripts/ci/vercel-function-size-gate.mjs`, `pnpm vercel:function-size-gate`): suma las
   trazas `*.nft.json` de cada función más el servidor mínimo compartido; falla sobre 200 MB y avisa sobre 150 MB, con
   los archivos y paquetes más grandes de la función culpable. En `ci.yml` tras el `Build` (PR/`main`/manual).
4. **Capa de recursos de Insights separada:** `app-insights-read.ts` / `ecosystem-insights-read.ts` (lectura, nunca
   cargan commands ni render) y `app-insights.ts` / `ecosystem-insights.ts` (comandos, importan el barrel de commands y
   así conectan el puerto de outputs que usa `issue`), con helpers en `*-insights-scope.ts`. 16 rutas de sólo lectura
   dejaron de cargar el grafo de comandos y render. Lo guarda `resources/insights-read-boundary.test.ts`.

**No es solución** `VERCEL_SUPPORT_LARGE_FUNCTIONS=1`, que el propio log sugiere: sube el límite y deja funciones de
más de 400 MB (arranque en frío lento) sin corregir la causa, y la próxima regresión ya no la ve nadie.

Invariantes para agentes: `docs/architecture/agent-invariants/OPS_RELIABILITY_AGENT_INVARIANTS.md` §Tamaño de las
funciones de Vercel.

## Verificación

- **Regla ESLint:** 44 casos de RuleTester; `pnpm lint` sobre el repo completo: 0 errores en 8.874 archivos. Mutación
  propia: un import relativo a `../artifact-composer/render` y un valor de `pdf-lib` en `src/` → ambos marcados; el
  `import type` del barrel, permitido.
- **Gate de alcanzabilidad:** 12 tests (`node --test`); corrida real en verde (1.519 entradas, 5.412 módulos, 1,6 s).
  Mutaciones con una ruta temporal (luego borrada): el valor de `composeArtifact` del barrel → rojo nombrando
  `playwright`/`pdf-lib` por `route → index.ts → render.ts`; el mismo import como `import type` → verde; una ruta que
  llega a un catálogo por un módulo intermedio → rojo con la cadena completa; una lectura `fs` con
  `path.join(process.cwd(), 'data', name)` → rojo como ruta de runtime nueva.
- **Gate de tamaño:** 6 tests; corrida real sobre el build local `.next-local/build-20260919232629-17169` (1.474
  funciones, 1,2 s): la mayor es `admin` con 48,5 MB; `insights/catalog` 9,5 MB; `api/mcp/greenhouse` 3,6 MB.
- **Separación de recursos:** mismas exportaciones que en HEAD (28 App, 20 Ecosystem); 185 tests de carriles y el test
  de frontera (con sus dos mutaciones fallando como corresponde).
- **Conjunto:** `pnpm typecheck` limpio; 1.625 tests de Insights, composer, licitaciones, worker, carriles y reglas.

**Riesgo residual declarado:**

- El umbral del gate de tamaño no se calibró contra un build con la regresión reintroducida (exige un `pnpm build`
  completo). La causa sí se reprodujo en el gate de alcanzabilidad, que es el que corre antes.
- El tamaño por ruta es una cota inferior: Vercel agrupa rutas en una función.
- Un `readdir` con ruta FIJA traza el directorio entero y el gate de alcanzabilidad no lo marca; lo cubre el de tamaño.
- Los 5 módulos de la allowlist siguen inflando funciones (el mayor, 22,6 MB de `public/`) por debajo del límite: se
  informan en cada corrida para que la lista baje.

## Estado

resolved (2026-09-22)

## Relacionado

- TASK-1847 (rollout donde se detectó) · TASK-1804 (precedente 2026-09-02, `MCP_TOOL_SURFACE_INVARIANTS.md` §8).
- `OPS_RELIABILITY_AGENT_INVARIANTS.md` §Tamaño de las funciones de Vercel · ADR del composer §6 (delta 2026-09-22).
