# Composición — el deck se COMPONE, no se dibuja

> **La regla que gobierna todo:** el deck es una **composición desde un catálogo cerrado de
> plantillas**. Se elige la plantilla por el **tipo de contenido** y se llenan sus **slots**.
> **Nunca** se inventa un layout para una lámina puntual.
>
> **Fuente de verdad técnica:** `docs/architecture/GREENHOUSE_TENDER_DECK_COMPOSER_V1.md` ·
> ADR: `GREENHOUSE_ARTIFACT_COMPOSER_PLATFORM_DECISION_V1.md`

---

## Por qué el catálogo es CERRADO (y el motivo no es estético)

> Si ningún tipo de contenido calza con lo que quieres decir, **eso es un GAP del catálogo** — ábrelo
> y diseña la plantilla con el molde. **No es una licencia para improvisar.**

**El motivo es comercial:** una propuesta la lee un **comité que COMPARA**. La cohesión visual es
**señal de rigor**; un deck que cambia de lenguaje cada tres láminas **se lee como un collage y
resta**.

**Y el motivo es de ingeniería:** el motor es **fail-closed**. Todo su diseño asume un contrato de
plantilla cerrado. Abrir la autoría a "ensamblar primitivas" **rompe el fail-closed** y reabre el
freehand por la puerta de atrás.

> ⚠️ **Las primitivas del molde son detalle INTERNO del catálogo, NO una superficie de autoría.**
> El `Plan` elige **una plantilla por nombre**. Nunca ensambla primitivas.
> **Modularizar por dentro es lo contrario de abrir por fuera.**

---

## Cómo se compone

```bash
pnpm deck:compose <plan.json> --out <dir>
```

El `Plan` (el JSON) es **el artefacto auditable**. El PDF es **derivado y re-componible** — si el
molde se corrige, el deck **se re-emite** sin re-autorarlo.

**El entregable es UN PDF de N páginas**, no un puñado de PNGs. El merge y el **gate de peso** son
parte del contrato: **los portales rechazan adjuntos sobre su límite** — el peso es **admisibilidad**,
no cosmética. *(Y el límite lo fijan **las bases**, no el portal. Ver [`evidence-integrity.md`](evidence-integrity.md).)*

---

## Las bug classes del motor — lecciones que costaron caro

**Léelas.** Todas se descubrieron **en producción**, sobre una licitación real, y **todas pasaban los
tests**.

### 1ª — El FALLO SILENCIOSO

**El peor bug posible acá:** la lámina sale con **el contenido de ejemplo del prototipo** y nadie se
entera. Un deck llegando al comité con el copy de relleno.

Apareció tres veces: un campo sin `data-slot-field` → el filler no escribía. Un tipo no implementado
→ el KPI decía **"3/3"** cuando el dato era **"4/4"**. El tono del blueprint contagiando a los items
→ **los dos planes marcados como "el propuesto"**.

> **Cerrada de raíz: cualquier tipo o campo que el filler no sepa llenar ABORTA el deck.**
> **NUNCA** agregues un `default:` silencioso ni un `continue` que deje pasar un slot sin escribir.

### 2ª — El contrato que MIENTE sobre lo que CABE

La tesis de una lámina salió **amputada a media palabra** en el PDF (`…se vuelve sosteni|`) y el
composer lo dio por bueno. **El copy había pasado validación con holgura** (100 de 150 caracteres).

La causa era **aritmética**: `grid-template-columns: 30% 35% 35%` + `gap: 46px`. **Los porcentajes de
Grid no descuentan el gap** → los tracks se salían 20px del lienzo y `overflow:hidden` los cortaba
**sin emitir nada**.

> **NUNCA asumas que "pasó `maxCharacters`" significa "cabe".** El contrato declara una intención;
> **el único juez de la geometría es el layout real.**
> **Y NUNCA dejes que un recorte sea silencioso: un PDF con una palabra guillotinada es PEOR que un
> fallo, porque parece terminado y nadie lo revisa dos veces.**

### 3ª — "Tiene contrato" ≠ "es componible"

El catálogo se declaraba **25/25 con contrato ✅** y la doc prometía que el composer podía llenarlas
todas. **Era falso: 7 de 25 reventaron** al componer la primera oferta real. **Nadie las había
ejercitado.**

> **Tener un `slots.json` no es ser componible.** Hoy hay un guard en CI que **sintetiza un payload
> desde cada contrato e intenta llenar las 25**. "Componible" pasó de promesa de la doc a **hecho
> verificable**.

### 4ª — El chrome que depende de DÓNDE vive en el DOM

Una plantilla **puede verse bien y estar mal armada**, y solo se nota en el frame. La firma de URL
perdía su blend según la lámina: `mix-blend-mode` se mezcla con el backdrop de **su** contexto de
apilamiento, y **21 de 22** plantillas la tenían fuera del `.slide`.

Y un hito de timeline rotulado *"Semana 1"* con `at: 1` **caía en el cierre del Mes 1** → **la lámina
afirmaba una fecha falsa**. Eso no es un bug de layout: **es fabricación.**

---

## ⚠️ La lección operativa que manda sobre todas

> # Los tests verdes NO son el gate de un deck.
>
> Cuatro pasos numerados todos como **"01"**. Párrafos aplanados **con las comas del join a la
> vista**. La firma sin blend. **Todo eso pasaba los 92 tests.**
>
> **Los encontró una revisión VISUAL.**

**SIEMPRE mirar los frames. TODOS. No una muestra.**

Y el corolario que vale para todo este oficio: un artefacto que **parece terminado** es más peligroso
que uno que falla, porque **nadie lo revisa dos veces**.

---

## La geometría se deriva del DATO, siempre

**Los prototipos tienen barras con anchos hardcodeados.** Si el composer solo cambiara los NÚMEROS,
**la barra seguiría midiendo lo del ejemplo** — un gráfico que exagera (o esconde) la mejora real.

> **En una oferta eso no es un bug de layout: es FABRICACIÓN GRÁFICA.**

Por eso existen los **resolvers de geometría**: el ancho de la barra sale de su valor, la posición del
hito sale de su fecha, la brecha sale de la diferencia real. **Si el resolver no se aplica, el
composer DEBE abortar la lámina.**

**Una barra sin dato es una barra que miente.**

### Colecciones y brechas derivadas — el contrato gobierna el DOM

Un array no se rellena tomando “el primer hijo que haya” en el HTML. Si el contrato declara
`itemSelector`, ese es el blueprint repetible; si declara `fixedChildren`, esos nodos se preservan al
reconstruir la colección. Un selector o fijo que no matchea el DOM **aborta**: el orden casual del
prototipo no es un fallback válido.

El chrome que el dato no sostiene se elimina mediante una operación **explícita del resolver**, nunca se
deja como residuo del blueprint. En un gráfico comparativo:

- el valor visible debe coincidir con el número que determina la barra;
- el callout de brecha se deriva de las mismas series, no lo escribe el autor;
- si la serie destacada ya lidera, la brecha es cero y **no se dibuja** un callout ficticio;
- si falta una serie destacada única, el dato no puede explicarse y el composer aborta.

El caso canónico es `ChartSplit` (TASK-1394): 25/25 plantillas componibles, con fixtures revisados
visualmente para brecha positiva y cero. Esta regla es del **Composer**, no de una plantilla concreta.

---

## `TimelineFull` — cronograma data-driven

Use `TimelineFull` cuando la lámina comunica **duración, solapes, entregables o hitos en el tiempo**.
Un proceso lógico sin duración pertenece a `ProcessStepsFull`; no se simula un Gantt para hacerlo más
ornamental.

El `DeckPlan` expresa el schedule, no su dibujo:

```ts
{
  timeUnit: 'day' | 'week' | 'month' | 'quarter' | 'custom',
  timeAxis: ['Mes 1', 'Mes 2', 'Mes 3'], // 3..8 unidades ordenadas
  phases: [{
    kind: 'work' | 'continuous',
    startUnit: 1,                         // entero, inclusivo
    endUnit: 2,                           // entero, inclusivo
    title: 'Diagnóstico',
    description: '...',
    barLabel: 'Movimiento desde la primera semana' // opcional, editable
  }],
  milestones: [{ at: 1, label: 'Baseline', caption: 'Fin Mes 1' }]
}
```

- `startUnit`, `endUnit` y `at` son fronteras enteras del eje (`1..N`); un hito se sitúa al **fin** de
  su unidad.
- `barLabel` es contenido estructurado, no texto metido en el HTML. Puede usarse en barras sólidas y
  punteadas, incluso si la fase ocupa una sola unidad.
- El compiler deriva de ese único schedule la grilla, el rango de cada barra, los diamantes, sus
  conectores y los anclajes de etiquetas de borde. No se editan porcentajes ni líneas a mano.
- `assertSlideFitsCanvas` mide el resultado real: si el `barLabel` (u otro texto) se recortaría, el
  compose aborta. No se borra la etiqueta para “hacerlo pasar”; se acorta el copy o se corrige el plan.

Fuentes canónicas: `docs/architecture/GREENHOUSE_TENDER_DECK_COMPOSER_V1.md` → `TimelineFull`,
`docs/architecture/tender-deck-composer-prototypes/timeline-full.slots.json` y el ejemplo real
`docs/commercial/tenders/sky-blog-2026/deck-plan.json`.

---

## Hard rules

- **NUNCA** dibujes una lámina freehand. Si no hay plantilla, **hay un gap de catálogo**.
- **NUNCA** el `Plan` ensambla primitivas. **Elige una plantilla por nombre.** El catálogo es cerrado.
- **NUNCA** un `default:` silencioso en el filler. **Fail-closed o nada.**
- **NUNCA** asumas que pasó la validación de caracteres = cabe.
- **NUNCA** geometría dibujada a mano. **Se deriva del dato, siempre.**
- **NUNCA** edites porcentajes, grilla o conectores de `TimelineFull`; escribe el schedule y deja que el
  compiler los derive.
- **NUNCA** borres `barLabel` para pasar una fase corta. Es copy editable; si no cabe, el renderer debe
  rechazarlo y el autor debe resolver el contenido o el schedule.
- **NUNCA** declares un deck listo sin **MIRAR TODOS LOS FRAMES**. Los tests verdes no son el gate.
- **SIEMPRE** el `Plan` es el artefacto auditable; el PDF es derivado y re-componible.
