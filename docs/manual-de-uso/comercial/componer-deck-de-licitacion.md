# Componer el deck de una licitación

> **Tipo de documento:** Manual de uso / runbook
> **Version:** 1.0
> **Creado:** 2026-07-12 por Claude (con Julio Reyes)
> **Documentacion funcional:** [tender-deck-composer.md](../../documentation/comercial/tender-deck-composer.md)
> **Documentacion tecnica:** [GREENHOUSE_TENDER_DECK_COMPOSER_V1.md](../../architecture/GREENHOUSE_TENDER_DECK_COMPOSER_V1.md)
> **Método del bid:** skill `greenhouse-public-private-tenders` → `deck-visual-system.md`

## Para qué sirve

Producir el **deck de una propuesta** (técnica o de presentación ejecutiva) a partir de un archivo de
contenido. El resultado es un **PDF de N páginas** listo para revisar y entregar.

## Antes de empezar

- El deck se **compone**, no se dibuja: se elige entre **25 plantillas** del catálogo.
- Necesitás el contenido **ya decidido** (qué dice cada lámina, con qué datos y con qué evidencia).
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

**Ejemplos completos y funcionando** (copiá de ahí):

- `docs/architecture/tender-deck-composer-prototypes/examples/sky-deck-plan.json` — diagnóstico ·
  método · matriz de cumplimiento · económica.
- `.../examples/sky-deck-plan-full.json` — agenda · equipo.

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

**Mirá las láminas PNG, una por una.** El composer garantiza que el contenido es el tuyo y que las
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

## Los errores más comunes (y qué significan de verdad)

### `too_long` — "el renderer NO trunca"

El texto excede el espacio de la lámina. **Reescribilo más corto.**

El composer no lo recorta a propósito: una frase mutilada en una oferta contractual es peor que un
error visible, porque el evaluador la lee así y nadie se entera.

### `missing_evidence_ref` — "una cifra sin fuente no se compone"

Una lámina afirma un número sin decir de dónde salió. **Agregá el `evidenceRef`** (la corrida del
grader, el anexo, el documento).

Si el número es ilustrativo, decilo en la lámina (como en `sky-deck-plan.json`, donde la económica
dice "cifras ilustrativas, no cotizadas").

### `unknown_slot` / `UnknownContentTypeError`

El contenido no calza con ninguna plantilla. **Esto no significa "improvisá un layout":** significa
que **falta una plantilla en el catálogo**. Abrí el gap.

### `el campo X no tiene [data-slot-field]` — el fallo silencioso

La plantilla no tiene dónde escribir ese dato, así que la lámina **saldría con el copy de ejemplo del
prototipo**. El composer **aborta** en vez de dejar pasar un deck con contenido de relleno.

Se arregla anotando la plantilla (es trabajo de plantilla, no de contenido).

### `⚠️ El PDF supera el límite` — esto es ADMISIBILIDAD

**No es un problema de rendimiento.** Los portales (Mercado Público, Wherex) rechazan archivos sobre
cierto peso: **si el archivo no sube, la oferta queda fuera del proceso.**

Causa habitual: el mismo asset repetido en muchas láminas se embebe muchas veces. Bajá el peso de
las imágenes o dividí el deck. El límite se ajusta al que diga el pliego:

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
