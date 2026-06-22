# ISSUE-100 — Local dev queda en skeleton/`Compiling...` en Nexa Insight por Turbopack

## Ambiente

local dev (`localhost:3002`, `/nexa/insights/[id]`, Next.js 16.1.1 / Turbopack)

## Detectado

2026-06-20, reporte visual del operador: la ruta `/nexa/insights/EO-AIS-0B48FAC9DBBA` quedaba cargando indefinidamente con skeletons y el indicador `Compiling...`.

## Síntoma

La página renderizaba el shell y el `loading.tsx` de Nexa Insight, pero el contenido real no reemplazaba los skeletons. En Chrome se veía el portal con placeholders permanentes y el dev overlay seguía en `Compiling...`.

En el proceso local, `next-server (v16.1.1)` quedaba con CPU muy alto. Se observaron renders autenticados lentos y/o abortados:

- Turbopack: request autenticada a `/nexa/insights/[id]` podía tardar ~52s y quedarse pegada para el navegador.
- `ps`: `next-server` llegó a consumir más de 500-600% CPU.
- `pg:doctor`: GCP CLI, ADC y Cloud SQL estaban sanos, descartando auth/DB como causa primaria.

## Causa raíz

El incidente fue una degradación de dev server local con Turbopack en rutas grandes del App Router, no una falla de los skeletons ni del reader de Nexa.

El fallback visible era correcto: `src/app/(dashboard)/nexa/insights/[id]/loading.tsx` debe aparecer mientras el Server Component resuelve sesión, tenant, autorización y datos. Lo incorrecto era que Turbopack mantenía el proceso en compilación/render con CPU alto, dejando el fallback pegado para la pestaña.

Este issue pertenece a la familia de `ISSUE-085` y `ISSUE-094`, pero el síntoma operativo fue distinto: skeletons de Nexa Insight permanentes aunque DB/GCP estuvieran sanos.

## Impacto

- Bloqueaba revisión local de `/nexa/insights/[id]` y del CTA "Pregúntale a Nexa".
- Podía hacer parecer que los skeletons eran el problema, cuando en realidad los skeletons eran el estado honesto de carga.
- Confundía el diagnóstico con gcloud/Cloud SQL, aunque `pnpm pg:doctor` confirmaba conectividad sana.
- No se confirmó impacto en staging o production; el cambio es de ergonomía y estabilidad local.

## Solución

Se mataron los dev servers colgados y se dejó un único server limpio en `localhost:3002`.

El contrato operativo local cambió para usar webpack como dev server estable por defecto:

```json
"dev": "next dev --webpack",
"dev:turbo": "next dev --turbopack"
```

Turbopack queda disponible explícitamente con `pnpm dev:turbo` para diagnóstico o pruebas puntuales, pero `pnpm dev` prioriza estabilidad diaria del portal.

Importante: no se quitaron los skeletons. La verificación correcta es que aparezcan durante la carga inicial y desaparezcan cuando llega el contenido real.

## Verificación

Comandos/evidencia ejecutados el 2026-06-20:

- `kill` del árbol local previo `next dev`/`next-server`.
- `pnpm pg:doctor` OK: GCP CLI auth vigente, ADC vigente, credenciales alineadas para `efeonce-group`, Cloud SQL dev accesible.
- `PORT=3002 pnpm dev` arranca como `Next.js 16.1.1 (webpack)`.
- Playwright autenticado contra `http://localhost:3002/nexa/insights/EO-AIS-0B48FAC9DBBA`:
  - `elapsedMs=5819`
  - `skeletonGone=true`
  - `hasRoot=true`
  - `hasSuggestedAction=true`
- `ps` posterior: un solo listener en `:3002`, `next-server` idle `0.0%` CPU tras compilar.
- `node -e "JSON.parse(require('fs').readFileSync('package.json','utf8'))"` OK.
- `git diff --check -- package.json` OK.

## Estado

resolved

## Relacionado

- `ISSUE-085`
- `ISSUE-094`
- `ISSUE-099`
- `package.json`
- `src/app/(dashboard)/nexa/insights/[id]/loading.tsx`
- `src/app/(dashboard)/nexa/insights/[id]/page.tsx`
