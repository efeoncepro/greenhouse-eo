# Recetas por lámina del deck Efeonce «La órbita» — brief para agentes (2026-09-27)

El operador aprobó el 2026-09-27 **las 69 láminas** del canvas de Deck (portadas, contraportadas, secciones,
contenido, propuestas por línea, cine, cotización, cierre). Ahora cada lámina necesita su **receta**:
qué es, cuándo se usa, cuándo no (y qué conviene en su lugar), qué elementos son **data slots** del
Artifact Composer, qué queda fijo y con qué prompt se reproduce.

## Material de entrada (todo local)

- `deck-inventory.json` (esta carpeta): una fila por lámina con `board`, `title` (título aprobado en el
  canvas, ya sin prefijos), `originalTitle` (el título previo, trae matices del operador: «foto de EJEMPLO»,
  «variante», «alternativa», «pareja de…»), `alt` (descripción exacta de lo que muestra) y `reference`.
- Referencia visual aprobada de cada lámina: `references/<board>.jpg` (MÍRALA con Read antes de escribir
  la receta: los slots salen de lo que se ve, no del título).
- Código que la compuso: `render-src/*.mjs` (prototipos de dirección, Playwright + sharp). Busca la lámina
  por su texto (`grep -l "<frase de la lámina>" render-src/*.mjs`) y anota script + id de lámina.
  Scripts principales: `vive.mjs` (láminas «con impacto» 3D: stack, día a día, vívelo, equipo, plan,
  próximos pasos, cotización escena/vivo), `deck-interior.mjs` (texto, viñetas, equipo, día a día,
  cotización, clientes, partners, stack), `deck2.mjs` (seguro, caso, plan, gráfico, testimonio, agenda,
  próximos pasos, híbrido, BeX, grader, líneas, por qué, propuestas por línea y cine), `propuesta.mjs`,
  `portadas*.mjs`, `lineas.mjs`, `amanecer.mjs`, `brochure.mjs`, `quienes.mjs`, `secciones-*.mjs`,
  `triptico4.mjs`, `mosaico.mjs`, `contenido2.mjs`, `foco2.mjs`; `voz.mjs` y `sel.mjs` son helpers (voz de
  la línea gráfica y selección/cursores con el contrato AXIS `efeonce.collaboration-selection`).
- Fotos: la ficha de cada plate vive en `ai-generations/2026-09-2{6,7}_*/fichas/*.json` y, si existe, el
  prompt compilado en `…/prompts/*.txt`. Si no hay `.txt`, compílalo SIN costo con
  `pnpm foto:prompt <ficha.json>` (no llama al modelo). Relaciona la foto con la lámina mirando la imagen y
  buscando el nombre del plate en `render-src/`. **Nunca generes imágenes** (cuesta dinero y no se pidió).

## Canon que manda (léelo antes de escribir)

- `docs/operations/brand-graphic-line/EFEONCE_SURFACE_COMPOSITION_V1.md` (§4 deck, §4.6 portadas y
  contraportadas) y `EFEONCE_GRAPHIC_LINE_V1.md` (voz pregunta→respuesta, órbita, firma, eslogan).
- Skill `.claude/skills/deck-studio/SKILL.md` + `composition.md` (catálogo cerrado, slots, Artifact Composer).
- AXIS: `/Users/jreye/Documents/axis-design-system/packages/tokens/src/graphic-line/*` (busca
  `surfaces` → `deck`: recetas ya publicadas `cover-brochure`, `cover-proposal`, `close-brochure`,
  `close-proposal`, `section-cine`, `proposal-cinematic`, `method-staircase`, etc.) y
  `apps/lab/src/data/surfaces.ts` + `apps/lab/public/references/surfaces/deck/*.jpg` (ids ya usados:
  `content-pricing`, `cover-proposal-dawn`, `close-brochure-orbit`…). **Reutiliza el id de AXIS cuando la
  lámina ya existe allí**; si es nueva, crea un id kebab-case en inglés con la misma convención.

Reglas aprobadas que deben aparecer donde apliquen (no las inventes, no las contradigas):
una sola órbita por lámina; ningún texto cruza la órbita ni el sujeto; voz = eyebrow + pregunta (anillo)
+ respuesta (esfera, ≥3× la pregunta) + evidencia con UNA palabra en negrita; portada con foto ⇄
contraportada sin foto (y al revés); propuesta: portada SIN foto (órbita con el logo del cliente) y
contraportada CON foto con «Empower your Growth» (en propuesta «¿Conversamos?» no aplica: se envía después
de conversar); brochure: portada con foto por línea de servicio y contraportada con «¿Conversamos?»;
logo de 500 px en portadas; láminas con foto a sangre sin logo; el pie de las láminas lleva sólo la burbuja
URL; registro cine sólo con Nexa protagonista o en la receta `proposal-cinematic`; isotipo del uniforme
siempre compuesto (`pnpm foto:isotipo`), nunca el del modelo; montos como `[MONTO]` hasta la propuesta;
fotos de ejemplo marcadas para reemplazo (Caso Sky); selección/cursores sólo con el contrato AXIS.

## Esquema de salida (una entrada por lámina, JSON válido, español neutro sin voseo)

```json
{
  "id": "content-next-steps-live",
  "board": "DeckProximosPasos",
  "name": "Próximos pasos · la agenda del diagnóstico abierta",
  "family": "cover | close | section | content | proof | method | proposal-service | pricing | next-steps | breather | about",
  "documents": ["proposal", "brochure", "pitch", "qbr"],
  "surface": "dark | paper | photo-bleed | split-paper-photo | cine",
  "status": "approved",
  "approvedAt": "2026-09-27",
  "reference": "references/DeckProximosPasos.jpg",
  "communicates": "Una frase: qué idea deja en quien la ve.",
  "useWhen": ["…"],
  "avoidWhen": ["…"],
  "preferInstead": [{ "recipe": "otro-id", "when": "…" }],
  "pairsWith": [{ "recipe": "otro-id", "relation": "cover↔close | sequence | variant" }],
  "slots": [
    { "name": "question", "type": "text", "required": true, "maxChars": 28, "example": "¿Y ahora qué sigue?", "notes": "…" }
  ],
  "fixed": ["Qué NO es editable: órbita, firma, burbuja URL, grilla, estilo de las fichas…"],
  "selection": { "kind": "none | collaborator | local-cta | multi", "label": "Finanzas", "target": "qué se selecciona" },
  "photo": {
    "uses": true,
    "register": "documental | puesta-en-escena | cine | none",
    "plate": "ai-generations/…/plates/X.png",
    "ficha": "ai-generations/…/fichas/X.json",
    "prompt": "texto del prompt compilado (o ruta al .txt)",
    "postprocess": ["foto:isotipo …"],
    "replaceable": "qué se cambia por cliente (p. ej. foto de ejemplo)"
  },
  "prompts": {
    "composition": "Prompt para que un agente componga ESTA lámina desde datos (qué elementos, dónde, qué reglas; sin HEX ni px crudos: nombra tokens AXIS y medidas del canon)."
  },
  "renderSource": { "script": "render-src/vive.mjs", "slideId": "PP-proximos-impacto" },
  "rules": ["reglas específicas que esta lámina hace cumplir"],
  "notes": "matices del operador (del originalTitle o del canon)"
}
```

Tipos de slot admitidos: `text`, `richText` (una palabra en negrita), `number`, `metric` (valor + etiqueta
+ fuente), `list`, `image` (plate o foto del cliente), `logo` (logo del cliente), `person` (foto + nombre +
cargo), `money` (`[MONTO]`), `date`, `enum`, `section` (número y total de la navegación).
Pon `maxChars` medido de la referencia (lo que cabe sin romper la composición), no un número al azar.
