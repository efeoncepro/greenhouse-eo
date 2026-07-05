# Sistema visual de campaña

> **Cómo usar.** Un KV solo no es campaña: campaña es un **master + reglas de derivación**
> que dicen qué es fijo y qué flexa. Define el master, congela lo invariante, libera lo
> variable y baja specs por formato. Sin la columna "fijo vs flexa", cada formato lo
> reinventa alguien distinto y la campaña se desarma. Se apoya en `modules/04_KEY_VISUAL_SYSTEMS.md`.

- **Campaña:** [nombre]
- **Fecha / versión:** [YYYY-MM-DD · v1]
- **Marca:** [Efeonce / Greenhouse / cliente]
- **Vigencia:** [desde–hasta]

## 1. KV master

- **Descripción del master:** [el visual raíz del que todo deriva]
- **Concepto que sostiene:** [la idea que se repite en cada pieza]
- **Archivo master:** [link]
- **Auditado:** [score `key-visual-audit-scorecard.md` ≥ __/50]

## 2. Reglas de derivación (lo que hace sistema)

| Elemento | Estado | Regla |
|---|---|---|
| **Concepto / metáfora** | 🔒 Fijo | [nunca cambia] |
| **Logo / lockup** | 🔒 Fijo | [posición y clear space constantes] |
| **Paleta core** | 🔒 Fijo | [primario+acento invariantes] |
| **Tipografía** | 🔒 Fijo | [familias y jerarquía] |
| **Elemento gráfico recurrente** | 🔒 Fijo | [la forma/textura que hila todo] |
| **Encuadre / crop del sujeto** | 🔓 Flexa | [se adapta al ratio] |
| **Copy / headline** | 🔓 Flexa | [por pieza] |
| **Densidad de layout** | 🔓 Flexa | [más aire en grande, más compacto en chico] |
| **Color secundario** | 🔓 Flexa | [rota dentro de la familia] |

## 3. Paleta + tipo + elemento recurrente

- **Paleta:** [primario / secundario / acento / neutros — tokens si va a UI]
- **Proporción:** [60/30/10]
- **Tipografía:** [display / texto / rol — `typography-design`]
- **Elemento recurrente:** [descripción + cómo aparece en cada formato]

## 4. Specs por formato

> Detalle de color-space, DPI y naming va en `asset-delivery-spec.md`. Acá: composición.

| Formato | Ratio / tamaño | Sujeto / crop | Copy | Logo | Safe zone |
|---|---|---|---|---|---|
| **Hero web** | [16:9 · 1920×1080] | [wide, sujeto a un tercio] | [headline grande] | [esquina] | [___] |
| **Social feed** | [4:5 / 1:1] | [más cerrado] | [corto] | [visible] | [márgenes UI] |
| **Story / reel** | [9:16] | [vertical, sujeto centrado-dinámico] | [mínimo, top-safe] | [top/bottom] | [zona segura vertical] |
| **Banner display** | [varios] | [muy cerrado] | [1 línea] | [pequeño] | [___] |
| **Print** | [A4 / valla] | [alta res, bleed] | [según distancia] | [___] | [bleed + margen] |
| **Email header** | [600px ancho] | [simple, liviano] | [en HTML, no en imagen] | [___] | [___] |

## 5. Ejemplos de aplicación

- **Pieza 1 — [formato]:** [qué se fija, qué flexó, link]
- **Pieza 2 — [formato]:** [___]
- **Pieza 3 — [formato]:** [___]

## 6. Matriz formato → spec (referencia rápida)

| Formato | Ratio | Fijo aplicado | Flexa aplicado | Estado |
|---|---|---|---|---|
| [Hero] | [16:9] | [concepto+logo+paleta] | [crop+copy] | [✅/⏳] |
| [Feed] | [4:5] | [___] | [___] | [___] |
| [Story] | [9:16] | [___] | [___] | [___] |
| [Banner] | [___] | [___] | [___] | [___] |
| [Email] | [___] | [___] | [___] | [___] |

## 7. Handoff

- **Quién produce cada formato:** [`greenhouse-ai-image-generator` UI / diseñador / social-media-studio]
- **Reglas que NO se negocian por pieza:** [la columna 🔒 de arriba]
- **Dónde vive el master + tokens:** [link / SSOT]
