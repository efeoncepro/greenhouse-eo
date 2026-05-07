# ISSUE-067 — Vitest jsdom warning por Lottie en `ServicesListView` empty state

## Ambiente

local test suite + GitHub Actions CI logs

## Detectado

2026-05-07, durante verificacion local de `pnpm test` tras el fix de CI post TASK-556.

Canal de deteccion:

- `pnpm test` local completo
- observacion conversacional del agente: warning no bloqueante en stdout

## Sintoma

La suite completa pasa, pero imprime una advertencia de jsdom:

```txt
Not implemented: HTMLCanvasElement's getContext() method: without installing the canvas npm package
```

Resultado observado en la corrida completa:

```txt
Test Files  598 passed (598)
Tests       3468 passed | 5 skipped (3473)
```

El warning no aparece como failure ni annotation de GitHub Actions, pero ensucia el log de CI/local y puede ocultar advertencias reales si se normaliza como ruido aceptado.

## Causa raiz

El warning lo dispara el test:

```txt
src/views/greenhouse/agency/services/ServicesListView.test.tsx
```

Caso especifico:

```txt
ServicesListView > shows the empty state when the API returns no services
```

Cadena confirmada:

1. `ServicesListView` renderiza `EmptyState` cuando la API devuelve `items: []`.
2. Ese `EmptyState` recibe `animatedIcon='/animations/empty-inbox.json'`.
3. `EmptyState` intenta cargar la animacion via `fetch(src)`.
4. El test stubbea `global.fetch` con un mock unico para todo.
5. Ese mismo mock responde tanto al API `/api/agency/services?...` como al asset `/animations/empty-inbox.json`.
6. Al recibir data desde el mock, `EmptyState` monta `Lottie`.
7. `lottie-react` / `lottie-web` ejecuta feature detection y llama `HTMLCanvasElement.getContext()`.
8. `jsdom` no implementa canvas real y emite el warning.

No es una falla de runtime productivo: navegadores reales si implementan canvas. Tampoco es un fallo de charts/ApexCharts/Recharts ni del QR de PDF.

## Investigacion ejecutada

### 1. Reproduccion de suite completa

Comando:

```bash
pnpm test
```

Resultado:

```txt
Not implemented: HTMLCanvasElement's getContext() method: without installing the canvas npm package
Test Files  598 passed (598)
Tests       3468 passed | 5 skipped (3473)
```

### 2. Busqueda de usos directos de canvas

Comando:

```bash
rg -n "getContext\\(|HTMLCanvasElement|<canvas|canvas" src -S
```

Resultado relevante:

- No se encontro un uso directo de `canvas.getContext()` en codigo productivo Greenhouse.
- Aparecieron referencias cosmeticas/clases de ApexCharts (`apexcharts-canvas`) y dependencias en lockfile, pero no un caller directo.

### 3. Descartes focales

Se probaron candidatos que podian usar canvas:

```bash
pnpm test src/lib/finance/pdf/__tests__/qr-verification.test.ts
pnpm test src/views/greenhouse/GreenhouseDashboard.test.tsx
pnpm test src/views/agency/AgencyCampaignsView.test.tsx src/views/agency/AgencyTeamView.test.tsx
```

Resultado:

- QR verification: sin warning.
- GreenhouseDashboard: sin warning.
- AgencyCampaigns/AgencyTeam: sin warning.

### 4. Barrido por suites jsdom

Comando ejecutado:

```bash
for f in $(rg -l "@vitest-environment jsdom" src); do
  out=$(pnpm exec vitest run "$f" 2>&1)
  if printf '%s' "$out" | rg -q "HTMLCanvasElement's getContext|canvas-getContext"; then
    echo "CANVAS_WARNING $f"
    printf '%s\n' "$out" | rg -n -C 3 "HTMLCanvasElement's getContext|canvas-getContext"
  fi
done
```

Resultado:

```txt
CANVAS_WARNING src/views/greenhouse/agency/services/ServicesListView.test.tsx
Not implemented: HTMLCanvasElement's getContext() method: without installing the canvas npm package
```

### 5. Aislamiento por test case

Comandos:

```bash
pnpm exec vitest run src/views/greenhouse/agency/services/ServicesListView.test.tsx -t "renders services"
pnpm exec vitest run src/views/greenhouse/agency/services/ServicesListView.test.tsx -t "empty state"
```

Resultado:

- `renders services`: sin warning.
- `empty state`: reproduce el warning.

Esto confirma que el disparador no es la tabla, TanStack, MUI ni los KPIs; es el empty state animado.

## Impacto

Impacto actual:

- No rompe build.
- No rompe runtime browser.
- No falla `pnpm test`.
- No implica que falte una feature en produccion.

Riesgo operativo:

- Log noise en CI/local.
- Normaliza warnings no accionados.
- Puede ocultar una advertencia real futura en la misma zona.
- El test no modela correctamente el contrato de `fetch`: confunde el API JSON de services con el asset JSON de Lottie.

## Solucion esperada

Solucion recomendada, segura y acotada:

1. Hacer que `ServicesListView.test.tsx` use un `fetchMock` URL-aware.
2. Para `/api/agency/services?...`, responder con el payload esperado por el caso.
3. Para `/animations/empty-inbox.json`, responder de forma explicita:
   - opcion A: `ok:false` para forzar fallback estatico de `EmptyState`, o
   - opcion B: animacion minima valida si el test quiere cubrir Lottie.
4. Mantener el test enfocado en la surface `ServicesListView`, no en render real de Lottie.

Decision recomendada:

- Usar opcion A (`ok:false`) o mock de `Lottie` local/global si el objetivo del test no es validar animaciones.
- No instalar `canvas` solo para apagar este warning.
- No agregar mock global de `HTMLCanvasElement.getContext()` todavia, porque el problema confirmado esta acotado a un test con `fetch` demasiado amplio.

## No hacer

- No instalar `canvas` como dependencia nativa por este caso.
- No silenciar `console.error` globalmente.
- No cambiar `EmptyState` productivo para satisfacer jsdom.
- No eliminar `animatedIcon` de la UI real sin decision de producto/diseño.
- No convertirlo en "warning conocido" sin issue ni owner.

## Verificacion para cerrar

Antes de mover este issue a `resolved/`:

- [ ] `pnpm exec vitest run src/views/greenhouse/agency/services/ServicesListView.test.tsx -t "empty state"` no imprime `HTMLCanvasElement.getContext`.
- [ ] `pnpm test src/views/greenhouse/agency/services/ServicesListView.test.tsx` queda verde y sin warning canvas.
- [ ] `pnpm test` completo queda verde y sin warning canvas.
- [ ] `pnpm lint` queda verde si se modifica el test.
- [ ] La UI productiva de `ServicesListView` conserva el empty state animado.

## Estado

open

## Relacionado

- `src/views/greenhouse/agency/services/ServicesListView.test.tsx`
- `src/views/greenhouse/agency/services/ServicesListView.tsx`
- `src/components/greenhouse/EmptyState.tsx`
- `src/libs/Lottie.tsx`
- `vitest.config.ts`
- `src/test/setup.ts`
