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

Mitigación aplicada (2026-09-22): `report-mapper.ts` usa el deep-import `@/lib/artifact-composer/paginate` (módulo puro,
sin imports). La lección quedó en `.claude/skills/efeonce-insights/references/lessons.md`.

**No es solución** `VERCEL_SUPPORT_LARGE_FUNCTIONS=1`, que el propio log sugiere: sube el límite y deja funciones de
más de 400 MB (arranque en frío lento) sin corregir la causa, y la próxima regresión ya no la ve nadie.

Pendiente, dos capas independientes (más una de diseño):

1. **Frontera de imports (barata, local):** una regla `no-restricted-imports` que prohíba importar **valores** desde
   `@/lib/artifact-composer` (con `allowTypeImports`) en código alcanzable desde rutas de Vercel. Los deep-imports de
   módulos puros declarados (`paginate`, `chart-geometry`) quedan permitidos. Mismo criterio para otros barrels
   pesados que se identifiquen.
2. **Gate de tamaño trazado (CI):** leer los `*.nft.json` que produce el build de Next y sumar el tamaño de los archivos
   trazados por función; fallar por sobre un umbral con margen (por ejemplo 200 MB) e imprimir las dependencias más
   grandes de la función culpable. Esto cubre también la causa del 2026-09-02, que ninguna regla de imports ve.

3. **Grafo de imports de la capa de recursos (diseño):** que una ruta de lectura (`catalog`) no cargue los commands de
   escritura ni el render. Hoy un módulo de recursos único los reúne a todos; separar lectura, comandos y render
   acota el daño de cualquier import pesado a la ruta que lo necesita.

Si la solución requiere tocar CI y reglas de lint compartidas, derivarla a una TASK.

## Verificación

- Un import de valor desde el barrel en un archivo alcanzable desde una ruta rompe `pnpm lint`.
- Reintroducir el import del 2026-09-22 en una rama hace fallar el gate de CI con el nombre de la función y su tamaño,
  antes de llegar al build de Vercel.

## Estado

open (mitigado para el caso de Insights; sin gate)

## Relacionado

- TASK-1847 (rollout donde se detectó) · TASK-1804 (precedente 2026-09-02).
- `docs/architecture/agent-invariants/MCP_TOOL_SURFACE_INVARIANTS.md` §8 (causa de `node:fs`).
- Commit de la mitigación: el deep-import en `report-mapper.ts` (TASK-1847, 2026-09-22).
