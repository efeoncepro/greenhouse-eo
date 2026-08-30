# Wireframe — TASK-1798 · El canvas de candidatos no tiene un momento visual propio

> ⚠️ **Este documento NO trae la dirección visual resuelta, y eso es deliberado.** Elegirla es el
> Slice 1 de la task, con 2–3 alternativas comparadas y una versionada bajo
> `docs/ui/visual-directions/`. Lo que sí trae es **el defecto medido**, las **restricciones duras**
> que cualquier dirección tiene que respetar y los **anti-patrones con su caso**. Un agente que tome
> la task no debe inventar la dirección desde acá: debe explorarla y volver a escribir este archivo
> con las diez secciones que el readiness gate exige.
>
> `UI ready` permanece **`no`** hasta entonces. Ver la regla en la skill del task-planner: un doc
> escrito para pasar el gate es exactamente lo que el operador rechaza.

- Visual direction mode: pendiente — se decide en el Slice 1 (`repo-native-benchmark` o `source-led`)
- Product Design asset: pendiente — el Slice 1 lo persiste bajo `docs/ui/visual-directions/`

## El defecto, medido

`TASK-1693` cerró con `pnpm ui:quality` en **`BLOCK`**. El scorecard
([`TASK-1693-…scorecard.json`](../reviews/TASK-1693-growth-seo-discovery-pagination-seed-sources.scorecard.json))
no fue inflado para pasar, así que el número es utilizable como línea base:

| Dimensión | Nota | Umbral del gate |
|---|---|---|
| `visualImpact` | **4.2** | 4.5 |
| `iconography` | 4.3 | — |
| `motion` | 4.2 | — |
| average | **4.41** | 4.5 |

El rationale registrado en esa dimensión dice el problema con precisión:

> «El momento dominante sigue siendo la banda de costo con su CTA — correcto, porque es la decisión
> que cuesta dinero. Los controles nuevos son deliberadamente sobrios […] Es la nota más baja del set
> y es una elección, no una omisión.»

Y su `nextAction`:

> «El techo de impacto lo fija el canvas de TASK-1665, que esta task declara explícitamente fuera de
> alcance ("no se rediseña el canvas ni el drawer"). Subirlo pide una task de superficie con
> dirección visual propia: la tabla de nueve columnas podría ganar una codificación visual del
> volumen y la barrera en vez de texto.»

**Esa task es ésta.**

## Qué se ve hoy

Frame de referencia:
`.captures/2026-08-30T09-06-52_growth-seo-keyword-discovery/01-desktop/frames/05-results.png`
(sobre la corrida real `seokdr-761a9689-…`, 334 candidatos / 284 keywords distintas).

El canvas es una `DataTableShell` de nueve columnas donde **todo dato cuantitativo se comunica como
texto**:

| Columna | Cómo se lee hoy |
|---|---|
| Keyword | texto + `Seed: …` debajo |
| Procedencia | texto («Sugerencias») |
| Agrupador | texto |
| Intención | texto («Transaccional») |
| **Volumen** | `◑ 8.100/mes` + fecha de captura — **número plano** |
| **Barrera de enlaces** | `◗ Baja` / `Sin dato` — **etiqueta plana** |
| Presencia propia | `● Posición 11` o «Sin medición propia» |
| Estado | chip |
| Detalle | trigger |

Con 50 filas por página, las dos columnas que **deciden** —volumen y barrera— exigen leer 50 números
uno por uno para formarse una idea de dónde está la oportunidad. La tabla es honesta y densa; lo que
no tiene es una lectura de un vistazo.

## Restricciones duras — cualquier dirección las respeta

Salen de invariantes ya pagados con incidentes. **NUNCA** relajarlas para ganar impacto visual.

- 🔴 **La jerarquía de gasto no se toca.** «Descubrir keywords» es el único `contained` de la
  pantalla y vive pegado a la cifra de costo; «Ver N candidatos más» es `outlined` porque sólo lee.
  Dos botones llenos, uno que cuesta dinero y otro que no, es cómo alguien confirma un gasto creyendo
  que pagina. Cualquier elemento visual nuevo entra **por debajo** de esa jerarquía.
- 🔴 **`◑` estimado y `●` medido no se mezclan ni se promedian.** `◑` marca procedencia de un dato de
  mercado, no «número aproximado». Una codificación visual que trate ambos con el mismo lenguaje
  rompe la distinción que sostiene todo el módulo (§1.1 de la arquitectura SEO).
- 🔴 **«Sin dato» no es «Baja» ni cero.** La barrera sin medir se nombra; jamás se pinta como el
  extremo bueno de una escala ni se colapsa al mínimo. `ISSUE-152` documenta el caso.
- 🔴 **La columna es «Barrera de enlaces», NUNCA «Dificultad».** `keyword_difficulty` colapsa a 0 en
  SERPs es-LATAM y `TASK-1694` la declaró no-op.
- **Sin paleta semáforo como sistema.** Semantic color es ayuda puntual de estado, no el lenguaje de
  la tabla ni identidad de KPI.
- **Sin card soup ni una cuarta superficie contenida.** El cuerpo ya define builder + estado + canvas;
  el presupuesto de chrome del primer fold está al límite.
- **La densidad no se sacrifica.** El canvas es de **comparación**: el operador contrasta candidatos
  entre sí. Una dirección que muestre 8 filas «bonitas» donde hoy hay 50 empeora el trabajo real.
- **390px conserva la card list** y la afordancia de paginación única fuera de tabla y cards.

## Anti-patrones, con su caso

- **NUNCA** un chart grande sobre datos ricos. El estándar pide tratamiento de evidencia para datos
  ESCASOS; acá sobran datos y lo que falta es codificarlos, no ilustrarlos.
- **NUNCA** un scatter volumen × dificultad. Ya fue rechazado por la dirección de `TASK-1665`
  (wireframe §Región R3): los candidatos requieren decisión por fila, no exploración en nube.
- **NUNCA** rails laterales de color ni stripe cards como lenguaje de estado primario.
- **NUNCA** subir el impacto agregando movimiento a una lista que crece: un stagger sobre filas
  paginadas es ruido en la superficie donde se compara.

## Qué tiene que producir el Slice 1

2–3 direcciones materialmente distintas, comparadas por: orden de lectura del primer fold · jerarquía
y modelo de acción · densidad y profundidad · rol de tipografía y color · transformación responsive ·
detalle de firma · riesgo de plantilla genérica. Una se elige y las rechazadas quedan registradas.

Sólo entonces este archivo se reescribe con `Desktop Target`, `Mobile Target`, `Action Hierarchy`,
`Visual Fidelity Mapping`, `Copy Ledger`, `State Copy`, `Accessibility Contract`,
`Implementation Mapping`, `GVC Scenario Plan` y `Design Decision Log`, y `UI ready` pasa a `yes`.

## Cómo se sabrá que funcionó

`pnpm ui:quality --task TASK-1798` en **PASS**: average ≥ 4.5 con piso 4.5 en `hierarchy`,
`surfaceEconomy`, `visualImpact`, `fidelity` y `genericTemplateResistance` — **con las notas
argumentadas contra frames reales, no subidas para pasar**. Y el operador, mirando el canvas, puede
decir dónde está la oportunidad sin leer 50 números uno por uno.
