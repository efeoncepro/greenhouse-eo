# Wireframe — TASK-1559 · Feed + Viewer del Producer (port, no rediseño)

> **Superficie:** feed vivo y viewer del Creative Producer, `efeonce-globe`.
> **ADR:** ADR-014 **Slice 4**. **Foundation:** `TASK-1556` (cerrada). **Primitives:** nacen en `TASK-1558`.

## Este documento NO propone un diseño

Es un **port**. El diseño ya está aprobado y verificado en vivo: el source de `TASK-1505`, la
implementación de `TASK-1526` y el trabajo de `TASK-1555`. **El resultado visual debe ser
indistinguible del actual**, y el criterio de aceptación es un before/after donde no se note la
diferencia.

Lo que este documento sí fija es lo único genuinamente nuevo: **cómo se cubren con tests los
invariantes temporales** que hoy sólo están verificados por haber funcionado en vivo.

## Regiones (existentes, se preservan)

```
┌─ PRODUCER ────────────────────────────────────────────────┐
│ composer (TASK-1552, no es de esta task)                  │
├───────────────────────────────────────────────────────────┤
│ FEED — lista viva                                          │
│  ├ run activo      · progreso honesto, nunca % inventado  │
│  ├ run terminal    · éxito o fallo explícito              │
│  └ asset retenido  · card con displayTitle client-safe    │
├───────────────────────────────────────────────────────────┤
│ VIEWER — inspección del candidato seleccionado            │
│  media por el path gobernado · lineage · acciones         │
└───────────────────────────────────────────────────────────┘
```

`data-capture` vigentes que el port **no puede perder** — el escenario GVC de Greenhouse depende de
ellos, y varios los asigna el controlador **en runtime** (`element.dataset.capture`), no el markup:
`producer-console`, `producer-composer`, `producer-first-fold`, `producer-full-page`,
`producer-model-picker`, `producer-model-trigger`, `producer-model-state`, `producer-fleet-state`,
`producer-model-needs-mode`.

## Los tres invariantes temporales — el corazón de esta task

| Invariante | Qué garantiza | Cómo se rompe | Test que lo cubre |
|---|---|---|---|
| **Watermark** (`feed.live.changes`) | La reanudación no duplica ni saltea items | Perder o resetear la marca al reconectar | Reanudar desde una marca conocida con items nuevos intercalados; assert de conjunto exacto |
| **Epoch por operación** | Elegir B nunca se sobrescribe con la respuesta tardía de A | Aplicar la respuesta sin comparar el epoch vigente | Disparar A, disparar B, resolver A **después**; assert de que se muestra B |
| **Refresh single-flight, ≤1 reintento** | Un `execute` que **gasta** no se ejecuta dos veces | Reintentar a ciegas tras un timeout de cliente | N llamadas concurrentes con sesión rotada → **un** refresh, **un** reintento, body/correlation/idempotency preservados |

**Regla dura:** ante un timeout de un command que gasta, **primero leer el estado** (`get`/`status`),
después decidir. Un timeout de transporte del cliente no es un fallo del servidor.

## Estados

Default · Loading · Empty · run activo · run terminal · `authentication_required` (reautenticación,
**nunca** "falta el medio") · `not_found` · `access_denied` · `dependency_unavailable` (**único
retryable**) · Long content · Mobile 390px · Keyboard/focus · Reduced motion.

**El feed NUNCA roba el foco** al llegar un item: se anuncia por live region y el usuario decide.

## Implementation Mapping

- **Transporte primero**: `apps/studio-web/src/producer-client.ts` → `apps/studio-client/src/data/`,
  tipado desde `packages/contracts`. **Los tests de los tres invariantes se escriben acá, antes de
  tocar render.**
- **Render después**: `apps/studio-client/src/surfaces/producer/{feed,viewer}/`, sobre las primitives
  de `TASK-1558`.
- **Copy**: `apps/studio-client/src/copy/index.ts` — absorbe lo que corresponda de `producer-copy.ts`
  moviéndolo, nunca duplicándolo.
- **Readers**: `globe.producer.feed.live.list` / `.changes`. Sin cambios de contrato.

## GVC Scenario Plan

- **Scenario:** canary propio, patrón `seam-smoke-server.mjs` + driver Playwright en `scripts/frontend/`.
- **Viewports:** `1440×1000` y `390×844`.
- **Escenarios obligatorios:** llegada de item nuevo sin robo de foco · selección concurrente
  (A luego B, A resuelve tarde) · sesión rotada durante una operación · `dependency_unavailable`.
- **Assertions:** los `data-capture` de arriba siguen presentes · `scrollWidth <= clientWidth` ·
  sin slug/costo/margen en el DOM.
- **Baseline:** el feed actual, capturado **antes** de tocar nada.

## Design Decision Log

- **Decision:** portar sin rediseñar. El resultado visual es indistinguible; lo que cambia es el sustrato.
- **Alternatives considered:** *aprovechar el port para mejorar el feed* — rechazado: mezcla dos riesgos
  (regresión de concurrencia + cambio visual) y vuelve imposible atribuir un problema a su causa.
- **Why this pattern:** el before/after como criterio hace falsable la promesa "no cambió nada".
- **Open risks:** los markers que el controlador asigna en runtime son el punto ciego — un port a JSX
  puede perderlos sin que nada falle en Globe, porque el consumidor vive en Greenhouse.

## Visual verification

Before/after desktop y 390px del feed y del viewer. Scorecard sólo como **no-regresión**: el objetivo
no es subir el score, es no bajarlo.
