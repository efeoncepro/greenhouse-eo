# TASK-1665 — Dirección visual: workbench diario de keyword discovery

- Modo: `repo-native-benchmark`
- Superficie: `/admin/growth/seo/keywords` · lente `Descubrir`
- Benchmark primario: `growth.seo.keywords` de TASK-1308
- Benchmark de chrome: `SurfaceRecipe kind='analyticsReport'` + `WorkbenchHeader kind='report'`
- Targets: desktop 1440×900 · mobile 390×844
- Estado: **seleccionada — Dirección A**

## Qué problema visual resuelve

La pantalla no debe parecer un formulario para llamar a un proveedor. El operador necesita sentir que
está frente a una mesa de decisión: primero define la pregunta, luego ve el costo, después observa una
corrida que puede quedar parcial y finalmente elige una acción por candidato.

El peligro visual es doble:

1. Un builder lleno de selects puede ocupar todo el primer fold y esconder el resultado.
2. Una tabla de keywords puede hacer que una sugerencia estimada parezca un dato medido o una acción
   ya tomada.

La dirección elegida hace visible la causalidad `input → costo → evidencia → decisión` y reserva el
mayor peso visual para el conjunto de candidatos, no para el proveedor.

## Alternativas comparadas

### Dirección A — Decision Canvas / seleccionada

El builder es una banda de comando compacta en el header extendido de la lente. Debajo, un carril de
estado narra la corrida. El canvas de candidatos ocupa el plano principal y el drawer conserva el
detalle/provenance sin sacar al operador de la tabla.

```text
┌─────────────────────────────────────────────────────────────┐
│ Chrome canónico: SEO / Keywords · Space · freshness         │
│ Oportunidades · Objetivos · Descubrir                       │
├─────────────────────────────────────────────────────────────┤
│ DESCUBRIR KEYWORDS                         [última corrida] │
│ Seeds [.................]  Fuentes  Métodos  Mercado       │
│ Costo estimado · llamadas · cupo              [Descubrir]  │
├─────────────────────────────────────────────────────────────┤
│ Estado: completada · 42 candidatos · costo real · as-of    │
├─────────────────────────────────────────────────────────────┤
│ Filtros/contexto       CANVAS DE CANDIDATOS                │
│                       keyword · origen · mercado · acción │
│                       keyword · origen · mercado · acción │
└─────────────────────────────────────────────────────────────┘
```

**Por qué gana:** conserva la gramática de S3, hace el costo imposible de ignorar, escala a resultados
densos y deja un solo momento flotante para el detalle. En 390px el builder se convierte en una columna
y el canvas en cards sin perder el orden de decisión.

### Dirección B — Research Split / rechazada

Un layout de dos paneles: builder permanente a la izquierda y tabla de resultados a la derecha. Es
eficiente en escritorio, pero convierte el panel de inputs en una columna fija de controles, reduce el
ancho útil de candidates y colapsa mal a 390px: el operador termina desplazándose entre dos contextos
que ya no están juntos. También compite con el `masterDetail` de las pantallas que lo rodean.

### Dirección C — Editorial Keyword Notebook / rechazada

Una secuencia vertical de grupos por seed, con cada seed como capítulo y sus sugerencias como lista
curada. Es legible y tiene personalidad editorial, pero hace difícil comparar volumen/difficulty,
filtrar por intención y ejecutar acciones por lote. Puede servir para un report futuro, no para el
workbench operativo multi-Space.

## Tesis seleccionada

**La pregunta controla el costo; la evidencia controla la acción.**

La jerarquía es innegociable:

1. Contexto de Space/mercado/frescura heredado.
2. Builder: seeds, fuentes, métodos y límite.
3. Preview: llamadas, costo estimado y cupo.
4. Status de la corrida: queued/running/partial/succeeded.
5. Candidatos: procedencia, as-of, datos y acción.
6. Drawer: detalle y confirmación específica.

El CTA principal es `Descubrir keywords`, pero no es el héroe visual. El héroe es el decision canvas
con una tabla densa y una lectura dominante del run. El costo es una banda de seguridad persistente,
no un tooltip.

## Mapping visual

### Densidad

- El builder usa controles agrupados en una sola superficie semántica, sin card dentro de card.
- Los controles de alcance se mantienen en una fila en desktop y ocupan el ancho completo en `xs`.
- La tabla usa columnas de alta señal; valores auxiliares viven en disclosure de card móvil.
- El resultado no muestra filas ilimitadas: usa el límite del reader y paginación/cursor visible.
- El estado partial no se esconde en un banner al final: aparece pegado al run y también junto a la
  fuente afectada.

### Depth y superficie

- Base: canvas neutral del `analyticsReport` existente.
- Contained: builder y resultado, cada uno con una función distinta.
- Selected/context: fila o candidate seleccionado, con el tratamiento semántico del theme.
- Floating: sólo drawer de candidate/acción; no crear un segundo panel flotante para el costo.
- No se usa wallpaper de tarjetas blancas ni un borde por cada control.

### Tipografía y numerales

- Título de lente con la variante de page/surface title del theme.
- Labels de control con variante label canónica.
- Costo, calls, filas, volumen y difficulty usan numerales tabulares del theme.
- Keyword se mantiene en body/label legible y puede envolver; nunca se corta sin disclosure.
- Los estados operativos son texto visible además de cualquier chip o icono.

### Color y semántica

- `●` GSC = medido y `◑` Labs = estimado; los roles semánticos salen de theme/AXIS.
- Success sólo comunica una corrida completada o una acción confirmada; no significa que una keyword
  rankee bien.
- Warning comunica estimación, stale, partial o costo pendiente; no se usa como decoración.
- Error comunica bloqueo/falla; no colorea una fila que sólo tiene dificultad alta.
- Intención/procedencia llevan label además de color; la paleta debe ser colorblind-safe.
- No se copian valores de color del benchmark: cada rol se mapea a `theme.palette.*`/`theme.axis.*`.

### Responsive transformation

Desktop 1440:

- Header canónico completo.
- Builder en dos filas máximas: seeds y opciones; preview/CTA alineados al extremo de acción.
- Resultado con filtro lateral ligero y tabla densa.
- Drawer de detalle con ancho tokenizado; la tabla permanece visible como contexto.

Mobile 390:

- Header y tabs siguen el patrón hermano; el scope ocupa filas completas y el valor activo nunca se
  trunca.
- Builder se apila: seeds → fuentes/métodos → mercado/límite → preview → CTA full width.
- Status queda visible antes de los filtros.
- Filtros pasan a drawer; la tabla se transforma en cards con el mismo orden: keyword → provenance/as-of
  → metrics → state → action.
- El candidate drawer se convierte en sidecar vertical; `Escape`/back y focus restore quedan definidos
  en el flow.
- No se usa scroll horizontal como solución para la tabla.

## Signature details

- **Cost-to-action rail:** una sola banda que muestra calls, filas estimadas, costo y cupo; se actualiza
  al cambiar seeds/métodos y se anuncia sólo cuando el usuario cambió el input.
- **Provenance spine:** cada candidate conserva un pequeño rastro legible (`Seed manual → Sugerencias →
  Labs · fecha`) en la tabla/card, no sólo en un tooltip.
- **Honesty markers:** `●/◑` permanecen junto al número y el label completo aparece en el drawer; no
  desaparecen al pasar a mobile.
- **Action language:** `Declarar objetivo`, `Seguir oportunidad` y `Preparar grounded queries` son tres
  verbos distintos y nunca se agrupan bajo un ambiguo `Agregar`.
- **Partial narrative:** un run parcial muestra qué fuente terminó y cuál no, sin un spinner infinito ni
  una falsa barra de porcentaje.

## Anti-patterns explícitos

- No agregar un chart de volumen × difficulty: la tabla/provenance/action es el contrato primario y los
  datos pueden estar ausentes.
- No poner el costo en un tooltip, debajo del fold ni después del CTA.
- No usar un único chip `Success` para una corrida con outcomes mixtos.
- No convertir cada row en un mini-card dentro de una card contenedora.
- No crear una tab local que parezca una ruta distinta de `Keywords`.
- No mostrar `0`, `—`, `N/A` genérico ni `position=100` cuando falta medición.
- No ocultar actions por color/hover; deben ser keyboard reachable.
- No usar `fullPage` como evidencia única: medir el DOM y capturar markers.

## Token / primitive mapping

| Necesidad | Reuso canónico | Regla |
|---|---|---|
| Shell/header | `SurfaceRecipe kind='analyticsReport'` + `WorkbenchHeader kind='report'` | chrome en `header`, no en `primary` |
| Hierarchy | `GreenhouseBreadcrumbs kind='workbenchHierarchy'` | ancestros como links reales |
| Lente | `CustomTabsNav`/links existentes de Keywords | no `TabPanel` paralelo |
| Command controls | `GreenhouseAsyncActionButton`, inputs MUI/Custom existentes | label, pending, disabled reason |
| Source/status | `GreenhouseChip` con kind semántico | label + icon/aria, no color único |
| Result | `DataTableShell` + compact card density | misma superficie de datos desktop/mobile |
| Detail | sidecar/drawer canónico | focus trap, Escape, restore |
| Empty/error | `EmptyState`/error contract existente | copy centralizado |
| Motion | tokens de `motion/core/tokens.ts` | reduced motion conserva estado final |
| Color/type/spacing | theme/AXIS + 4n scale | cero valores literales |

## Acceptance signature

La dirección se considera preservada si el primer fold desktop responde, sin scroll adicional:

- qué Space/mercado se está investigando;
- qué seeds/métodos se enviarán;
- cuánto puede costar;
- qué ocurrió con la última corrida;
- dónde se ve el primer candidato o el estado honesto de ausencia.

En 390px debe responder las mismas preguntas en el mismo orden, sin truncar el mercado/costo activo ni
desplazar horizontalmente la superficie.

## Design Decision Log

- Decision: Dirección A sobre benchmark S3. Reason: continuidad de shell + claridad de acción + costo
  visible.
- Decision: el resultado es un canvas de tabla/cards, no un chart. Reason: provenance y action son
  parte del dato, no adornos.
- Decision: el drawer sólo contiene contexto/action. Reason: evita perder la lista y conserva un único
  plano flotante.
- Decision: la transformación compacta recompone, no serializa. Reason: el operador móvil necesita
  input/costo/status antes del detalle, no seis cards de chrome.
- Reuse/extend/new: `reuse` de primitives; `extend` sólo si la tabla requiere una variante reutilizable;
  `new` no aprobado.
