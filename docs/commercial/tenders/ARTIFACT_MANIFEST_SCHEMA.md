# `artifact-manifest.json` — schema

SSOT de los artefactos **vivos/externos** de un deal (los que no son archivos de la carpeta). Uno por
workspace de licitación. Ver `TENDER_WORKSPACE_TEMPLATE.md`.

## Forma

```jsonc
{
  "deal": "<slug>",                       // = nombre de la carpeta
  "artifacts": [
    {
      "id": "radiografia-sky",            // kebab-case, único en el deal
      "type": "aeo_xray",                 // ver enum abajo
      "url": "https://think.efeoncepro.com/muestras/sky-<token>",  // el enlace vivo
      "run_id": "EO-GRUN-00046",          // opcional: referencia reproducible (runs del Grader)
      "as_of": "2026-07",                 // cuándo se generó/capturó (YYYY-MM)
      "audience": "client_facing",        // client_facing | internal
      "render": "by_link",                // SIEMPRE by_link — nunca screenshot (invariante)
      "backs_evidence": ["E1", "E4"],     // refs del ledger de evidencia que respalda
      "used_in": ["deck:muestra", "oferta-tecnica §9"]  // dónde se referencia
    }
  ]
}
```

## Campos

| campo | req | nota |
|---|---|---|
| `deal` | sí | slug del workspace |
| `artifacts[].id` | sí | kebab-case único |
| `artifacts[].type` | sí | `aeo_xray` · `ai_visibility_report` · `dashboard` · `demo` · `other` |
| `artifacts[].url` | sí | el enlace vivo (token-gated si aplica) |
| `artifacts[].run_id` | no | referencia reproducible (ej. run del Grader) — la hace **evidencia válida** |
| `artifacts[].as_of` | sí | `YYYY-MM` — la frescura importa; el evaluador la verifica |
| `artifacts[].audience` | sí | `client_facing` (va al deck/oferta) o `internal` |
| `artifacts[].render` | sí | **`by_link`** — invariante duro; una pieza viva se enlaza, nunca se captura |
| `artifacts[].backs_evidence` | no | refs (`E1`…) del ledger de `oferta-tecnica.md` que este artefacto sustenta |
| `artifacts[].used_in` | no | dónde se usa (lámina del deck, sección de la oferta) |

## Por qué importa

- **Evidencia:** un `run_id` de un run del Grader es fuente **reproducible** → cifra citable en el
  ledger sin miedo a que el comité "vaya a buscar la fuente".
- **Deck:** los content-types `artifact-showcase`/`highlight` referencian estas piezas **por enlace**.
- **DSR externo (futuro):** cuando se pilotee la sala del comprador, estas piezas se embeben/enlazan
  desde este manifiesto — es el puente al `client_facing` de la proyección.

## Distinción necesaria: artefacto vivo vs. mockup del deck

Un mockup conceptual de una herramienta no entra al manifiesto como si fuera evidencia. Por ejemplo, una
lámina puede mostrar un **AEO Grader**, un **X-Ray** o un **dashboard Greenhouse** para explicar el método
propuesto para un cliente que aún no tiene medición. Ese visual pertenece al `deck-plan.json`, se rotula como
“mockup conceptual” o “cifras ilustrativas” y no recibe un `run_id` ficticio.

Solo cuando exista una ejecución real, una URL navegable o una pieza externa verificable se registra como
artefacto vivo, con fecha, procedencia y audiencia. Esta separación evita que el comité confunda la demostración
de una capacidad con un resultado ya obtenido.

La experiencia de Brightcell formalizó esta regla: Grader = línea base, X-Ray = intervención de página,
Greenhouse = operación mensual. Los tres pueden aparecer en la narrativa, pero cada uno debe declarar si es
mockup conceptual o evidencia viva.

## Reglas duras

- **NUNCA** `render` distinto de `by_link`. Una pieza viva (Radiografía, informe del Grader) **jamás**
  se mete como captura: un PNG estático mata lo interactivo que demuestra; se defiende sola.
- **NUNCA** un artefacto `internal` en un deck/oferta `client_facing` (audience gate).
- **SIEMPRE** `as_of` + (si existe) `run_id`: sin procedencia verificable, no es evidencia.
