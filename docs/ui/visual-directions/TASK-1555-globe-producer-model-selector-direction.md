# Visual Direction — Globe Producer Model Selector (TASK-1555)

> **Direction mode:** `repo-native-benchmark` (design-studio Step 1-2). Documento de dirección visual: 2-3
> direcciones materialmente distintas, tesis elegida, targets desktop/mobile, mapeo a tokens, detalles de firma y
> anti-patrones. **La task no pasa a `UI ready: yes` sin esta decisión.**
>
> **Base aprobada:** [`TASK-1505-globe-creative-producer-approved-direction.md`](TASK-1505-globe-creative-producer-approved-direction.md) — hereda su lenguaje (premium, oscuro, cinematográfico, jerarquía fuerte, un momento visual dominante).
> **Wireframe (layout/estado):** [`../wireframes/TASK-1555-globe-producer-model-selector.md`](../wireframes/TASK-1555-globe-producer-model-selector.md).
> **Dato:** `globe.producer.fleet.list` (TASK-1554, **reader live-verificado** `c3b6bf4`).
> **Tesis del brief:** la flota es una **decisión creativa dominante**, no un dropdown técnico.

## Principio rector

El operador **elige con qué inteligencia crear**. Ese momento merece peso visual: la galería es el corazón del
composer cuando toca elegir modelo, no un control secundario escondido. Premium = jerarquía clara + un solo momento
dominante + honestidad de estados (disponible vs. próximamente vs. bloqueado), **sin** exponer el proveedor.

## Las 3 direcciones

### Dirección A — "Galería de láminas" (poster-first) ✅ ELEGIDA

Cada modelo es una **lámina/tarjeta alta** (ratio ~3:4) con el nombre+versión como título tipográfico fuerte, un
campo de textura/acento propio del tier (sin logo de proveedor), y el estado como badge. El recomendado ocupa la
primera posición con un realce persistente (✦ + acento). La flota se lee como una **grilla de opciones curadas** —
un momento visual, no una lista.

- **First-fold reading order:** título de región → recomendado (✦) → grilla de láminas → helper.
- **Jerarquía/acción:** una sola acción (elegir); la lámina seleccionada gana acento; `gated`/`blocked` atenuadas.
- **Densidad/profundidad:** media-alta; profundidad por elevación sutil de la lámina, no card-on-card.
- **Tipografía/color:** título del modelo en display (Poppins-equivalente de Globe), estado en texto secundario; acento del tema Globe para selección/recomendado.
- **Responsive:** grilla 2-3 columnas desktop → **columna única** de láminas en 390px (no compресión).
- **Firma:** la lámina-poster (la flota se siente como un "cast" de inteligencias curadas).
- **Riesgo de template genérico:** **bajo** — no es un dropdown ni un grid de chips.

### Dirección B — "Riel curado" (horizontal rail)

Un **riel horizontal** de tarjetas compactas con snap, recomendado anclado a la izquierda. Elegante y económico en
altura, bueno si el composer prioriza el prompt sobre el modelo.

- Pros: compacto, no roba altura al prompt (alinea con TASK-1552). Firma: el "carousel curado".
- Contras: en 390px el riel horizontal compite con el scroll vertical del composer; **descubribilidad** de modelos fuera del viewport más débil; menos "momento dominante".
- Riesgo template: medio (riel es patrón común).

### Dirección C — "Segmento + lista rica"

Segmento por modalidad + **lista vertical rica** (fila por modelo con nombre, estado, meta). Técnica, legible,
escalable a muchos modelos.

- Pros: escala a N modelos sin scroll horizontal; muy legible; clara para estados.
- Contras: **se siente técnica** (lista = dropdown expandido), contradice "decisión creativa dominante"; menor impacto visual.
- Riesgo template: **alto** (lista es el patrón más genérico).

## Decisión revisada (2026-07-25) — el operador revierte a un desplegable compacto

> **Esta sección manda sobre la decisión original de abajo.** La Dirección A se implementó
> (`efeonce-globe` `78a1863`) y el operador la rechazó al verla: *"¿para qué cards gigantes y poner
> 'Ruta y modelo' si con isotipo REAL del modelo y el label está ok en un desplegable?"*.

**Dirección vigente: desplegable compacto con isotipo real del modelo** (`a45954f`, `0258534`).
Materialmente cerca de la Dirección C, pero con dos correcciones que la rescatan de "genérica":

- **Isotipo real del proveedor del modelo**, no un monograma ni un glyph decorativo. Es lo que
  convierte una lista en un roster reconocible de inteligencias. Fuentes y licencias en
  `efeonce-globe/apps/studio-web/public/models/README.md` (Iconify `logos` para OpenAI —
  el mismo asset que ya usa Greenhouse—, simple-icons CC0 para Gemini/ByteDance/ElevenLabs).
- **Estados honestos en la fila**: `Disponible` · `Próximamente` · `Requiere habilitación del
  proveedor` · `Necesita cuadros`/`Necesita referencias`.

**Por qué la Dirección A estaba mal, en retrospectiva:** elegir el modelo es **una** decisión dentro
del composer, no su momento dominante. La galería ocupaba 515px y empujaba el prompt y el CTA de
generar fuera del fold; el desplegable ocupa 121px. La tesis "la flota es una decisión creativa
dominante" sobrevalora la frecuencia de esa decisión: se elige el modelo una vez y se itera el prompt
muchas veces. El momento dominante del composer es el **prompt**, no el selector.

**Lo que sí sobrevive de la tesis original:** que la flota completa sea **visible**. El desplegable
lista todos los modelos de la modalidad activa —incluidos los que necesitan otro modo del composer—
en vez de esconderlos detrás de un chip que hay que adivinar. Esa era la parte correcta del brief.

**Anti-patrones que siguen vigentes:** card-on-card, exponer slug/costo/margen, `gated`/`blocked` con
apariencia ejecutable, mobile como desktop comprimido.

**Anti-patrón retirado:** "logos de terceros". El nombre del modelo ya es público por ADR-003
(*"GPT Image 2"* ya identifica a OpenAI), así que el isotipo no agrega exposición; lo prohibido sigue
siendo el **slug de wire, el costo vendor y el margen**. Regla operativa: **NUNCA** transcribir a mano
ni inventar un logo — se usa un set curado y licenciado, o se cae a monograma.

---

## Decisión original (2026-07-24) — superada por la de arriba

**Se elige la Dirección A ("Galería de láminas").** Es la única que cumple la tesis del brief (flota = momento
creativo dominante, no dropdown técnico), hereda la dirección premium aprobada de TASK-1505, y da el mayor
impacto/resistencia a template. B queda como **fallback de densidad** si en implementación el fold obliga a ceder
altura al prompt (TASK-1552); C se rechaza por técnica/genérica.

**Rechazadas:** B (riel) — descubribilidad + menor momento dominante; C (lista) — genérica, contradice la tesis.

## Mapeo a tokens (Globe — intención, nunca HEX/px/font literal)

- Superficie/elevación de la lámina, acento de selección/recomendado, badges de estado → **tokens del tema de Globe**
  (los de la dirección aprobada TASK-1505); NO transcribir HEX. Tipografía display para el nombre del modelo por la
  variante de Globe; numéricos/meta en el cuerpo. `[verificar los nombres de token exactos de Globe en implementación]`.
- Estados: `available` = acento + elegible; `gated` = atenuado + "Próximamente"; `blocked` = atenuado + razón + `ⓘ`.
- Spacing/radius por la escala de Globe; targets 44px; contraste AA.

## Detalles de firma

- La lámina-poster con el nombre del modelo como protagonista tipográfico (la "inteligencia" nombrada).
- El recomendado ✦ como ancla persistente (estado, no animación).
- Transición de selección reusando el token de estado de Globe (ver motion contract), sin morph espacial.

## Anti-patrones (BLOCK)

- **Card-on-card** / card wallpaper: la galería NO va dentro de otra tarjeta contenedora con su propio chrome.
- **Dropdown técnico** o lista genérica como look final (Dirección C rechazada por esto).
- Exponer **slug/costo/margen** del proveedor, o logos de terceros.
- `gated`/`blocked` con apariencia ejecutable.
- Mobile = desktop comprimido (debe transformar a columna única de láminas).

## Targets

- Desktop `1440×1000`: grilla 2-3 columnas de láminas; el momento dominante es la galería.
- Mobile `390×844`: columna única de láminas; sin overflow horizontal; targets 44px.

## Próximos pasos del loop (design-studio)

3. Map a recipe/primitives de Globe (patrón propio, NO Composition Shell de Greenhouse) — en implementación.
4-5. Wireframe ya robusto; readiness gate.
6. First-fold checkpoint (desktop+mobile) con fixtures reales del reader.
8-9. GVC premium + scorecard 14 dimensiones (≥4.5 promedio, pisos ≥4.5 en jerarquía/economía/impacto/fidelidad/anti-template).
10. Enterprise review; `BLOCK` frena el cierre.

> Nota: si quieres **ver** las direcciones como imágenes (no solo el benchmark repo-native), se puede generar un set
> de conceptos con la lane `ai-ui-generation-director` sobre esta dirección A — es opcional; el contrato acepta este
> documento como fuente de dirección válida.
