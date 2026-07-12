# Componer el deck de una licitación

> **Tipo de documento:** Manual de uso / runbook
> **Version:** 1.1
> **Creado:** 2026-07-12 por Claude (con Julio Reyes)
> **Documentacion funcional:** [tender-deck-composer.md](../../documentation/comercial/tender-deck-composer.md)
> **Documentacion tecnica:** [GREENHOUSE_TENDER_DECK_COMPOSER_V1.md](../../architecture/GREENHOUSE_TENDER_DECK_COMPOSER_V1.md)
> **Última actualización:** 2026-07-12 — `TimelineFull` data-driven y `barLabel` editable
> **Método del bid:** skill `greenhouse-public-private-tenders` → `deck-visual-system.md`

## Para qué sirve

Producir el **deck de una propuesta** (técnica o de presentación ejecutiva) a partir de un archivo de
contenido. El resultado es un **PDF de N páginas** listo para revisar y entregar.

## Antes de empezar

- El deck se **compone**, no se dibuja: se elige entre **25 plantillas** del catálogo.
- Necesitas el contenido **ya decidido** (qué dice cada lámina, con qué datos y con qué evidencia).
- Las cifras deben ser **reales del proceso** o **ilustrativas marcadas**. El composer rechaza una
  métrica sin su fuente.

## Paso a paso

### 1. Escribir el plan del deck

Un archivo `.json` con las láminas. Cada lámina declara **qué tipo de contenido es** y **su
contenido**:

```json
{
  "tenderId": "TND-000123",
  "slides": [
    {
      "slideId": "diagnostico",
      "contentType": "one-metric",
      "template": "StatSplit",
      "slots": {
        "eyebrow": "EL DIAGNÓSTICO",
        "title": "Su marca es <em>legible</em>, pero no la <em>citan</em>",
        "goals": [
          {
            "kind": "visibility",
            "title": "Ser encontrada",
            "metric": "40/100",
            "body": "La marca aparece, pero <strong>pierde el primer plano</strong>.",
            "evidenceRef": "aeo-run-sky-2026-07"
          }
        ]
      }
    }
  ]
}
```

**Ejemplos completos y funcionando** (copia de ahí):

- `docs/architecture/tender-deck-composer-prototypes/examples/sky-deck-plan.json` — diagnóstico ·
  método · matriz de cumplimiento · económica.
- `.../examples/sky-deck-plan-full.json` — agenda · equipo.

#### Si la lámina es un cronograma (`TimelineFull`)

El cronograma se declara como un schedule discreto; no se editan porcentajes ni conectores en HTML.
Indica la unidad temporal (`day`, `week`, `month`, `quarter` o `custom`), entre 3 y 8 labels ordenados,
fases con límites enteros inclusivos y hitos en el cierre de una unidad:

```json
{
  "timeUnit": "week",
  "timeAxis": ["Semana 1", "Semana 2", "Semana 3"],
  "milestones": [{ "at": 1, "label": "Baseline", "caption": "Fin Semana 1" }],
  "phases": [
    {
      "kind": "work",
      "startUnit": 1,
      "endUnit": 2,
      "title": "Preparación",
      "description": "Línea base y prioridades",
      "barLabel": "Movimiento desde la primera semana"
    },
    {
      "kind": "continuous",
      "startUnit": 2,
      "endUnit": 3,
      "title": "Seguimiento",
      "description": "Medición y optimización",
      "barLabel": "La tracción empieza a verse"
    }
  ]
}
```

`barLabel` es opcional y **editable por el agente** en ambas clases de barra (sólida `work` y punteada
`continuous`), incluso en una fase de una unidad. La grilla, barras, diamantes y conectores se calculan desde
ese mismo schedule. Un hito entre unidades, un rango fuera del eje o un texto de barra que no cabe hace fallar
la composición; no se corrige a mano ni se borra la etiqueta para pasar el render.

### 2. Componer

```bash
pnpm deck:compose <plan.json> [--out <carpeta>]
```

Salida:

```text
componiendo "TND-000123" — 4 láminas

  ✓ one-metric           → StatSplit              01-diagnostico.png
  ✓ four-pillars         → FourPillarsFull        02-metodo.png
  ✓ requirements-table   → RequirementsTableFull  03-cumplimiento.png
  ✓ pricing              → PricingFull            04-economica.png

  📄 TND-000123.pdf — 4 páginas · 1.1 MB
```

### 3. Revisar

**Mira las láminas PNG, una por una.** El composer garantiza que el contenido es el tuyo y que las
reglas se cumplen — **no** que el deck sea persuasivo. Eso lo juzga una persona.

### 4. Entregar

**La oferta la sube un humano.** El composer prepara; nunca envía ni firma.

## Qué significan los mensajes

| Mensaje | Qué pasó | Qué hacer |
|---|---|---|
| `✓ <content-type> → <Plantilla>` | La lámina se compuso | Revisar el PNG |
| `📄 <deck>.pdf — N páginas · X MB` | El entregable está listo | Revisar y entregar |
| `⚠️ El PDF pesa X MB y supera el límite` | **Riesgo de admisibilidad** | Ver abajo |
| `✗ El deck no pasa la validación de slots` | Hay contenido que rompe una regla | Ver abajo |
| `✗ La lámina "X" no cabe en su lienzo` | El layout **recortaría** el texto | Ver abajo |

> **¿Dónde quedó el PDF?** Si no pasas `--out`, todo se escribe en **`.captures/tender-deck/`**:
> el PDF del deck (`<tenderId>.pdf`), un PNG por lámina y el `deck-plan.json` (el artefacto que
> permite volver a componer el mismo deck, idéntico).

## Los errores más comunes (y qué significan de verdad)

### `too_long` — "el renderer NO trunca"

El texto excede el presupuesto de caracteres del slot. **Reescríbelo más corto.**

El composer no lo recorta a propósito: una frase mutilada en una oferta contractual es peor que un
error visible, porque el evaluador la lee así y nadie se entera.

### `La lámina "X" no cabe en su lienzo` — el layout recorta

**Este NO es el mismo error que `too_long`, y la diferencia importa.** Acá el copy **sí pasó** el límite
de caracteres — y aun así **no cabe físicamente** en la lámina: el texto se saldría del borde y quedaría
cortado a media palabra.

El mensaje te dice el slot, cuántos píxeles se sale y qué texto quedaría amputado:

```text
✗ La lámina "metodo" no cabe en su lienzo: 1 slot(s) quedan recortados.
  - slot "thesis": 20px fuera del borde derecho — «El crecimiento se vuelve sostenible cuando la evidencia guía»
```

Dos causas posibles, y conviene distinguirlas antes de tocar nada:

1. **El copy es más largo de lo que esa lámina aguanta** → acórtalo (aunque el contador de caracteres
   diga que "cabía"). El presupuesto de caracteres es una aproximación; el juez real es el layout.
2. **La plantilla tiene mal la geometría** → si el texto es razonable y aun así se sale, el problema es
   la lámina, no tu copy. Es un bug de plantilla: repórtalo (pasó de verdad — ver el caso del `%` + `gap`
   en la documentación técnica). **No lo resuelvas mutilando el mensaje que quieres dar.**

Por qué el composer prefiere fallar: un PDF con una palabra guillotinada **parece terminado**, y nadie
lo revisa dos veces. Un error, sí.

### `missing_evidence_ref` — "una cifra sin fuente no se compone"

Una lámina afirma un número sin decir de dónde salió. **Agrega el `evidenceRef`** (la corrida del
grader, el anexo, el documento).

Si el número es ilustrativo, dilo en la lámina (como en `sky-deck-plan.json`, donde la económica
dice "cifras ilustrativas, no cotizadas").

### `unknown_slot` / `UnknownContentTypeError`

El contenido no calza con ninguna plantilla. **Esto no significa "improvisa un layout":** significa
que **falta una plantilla en el catálogo**. Abre el gap.

### `el campo X no tiene [data-slot-field]` — el fallo silencioso

La plantilla no tiene dónde escribir ese dato, así que la lámina **saldría con el copy de ejemplo del
prototipo**. El composer **aborta** en vez de dejar pasar un deck con contenido de relleno.

Se arregla anotando la plantilla (es trabajo de plantilla, no de contenido).

### `⚠️ El PDF supera el límite` — esto es ADMISIBILIDAD

**No es un problema de rendimiento.** Los portales (Mercado Público, Wherex) rechazan archivos sobre
cierto peso: **si el archivo no sube, la oferta queda fuera del proceso.**

Causa habitual: el mismo asset repetido en muchas láminas se embebe muchas veces. Baja el peso de
las imágenes o divide el deck. El límite se ajusta al que diga el pliego:

```ts
composeDeck(assets, plan, outDir, { maxPdfMb: 10 })
```

## Qué NO hacer

- **NUNCA** dibujar una lámina a mano por fuera del catálogo.
- **NUNCA** poner una cifra sin su fuente.
- **NUNCA** usar una cara generada por IA como parte del equipo. El evaluador cruza el CV contra la
  persona: eso es tergiversación. Si falta una foto, **se pide la foto**.
- **NUNCA** entregar sin mirar las láminas.

## Referencias

- Método del bid: skill `greenhouse-public-private-tenders` (`deck-visual-system.md`)
- Catálogo + molde: `docs/architecture/GREENHOUSE_TENDER_DECK_COMPOSER_V1.md`
- Topología (qué es determinista, qué usa IA): ADR §5-ter del spec del Studio
- Motor: `src/lib/commercial/tenders/deck/`
