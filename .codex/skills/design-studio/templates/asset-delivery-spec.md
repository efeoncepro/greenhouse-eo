# Spec de entrega de assets

> **Cómo usar.** La entrega es donde un buen diseño se arruina: color-space equivocado,
> DPI de web para print, naming caótico, safe zone ignorada. Llena la lista de assets y
> la matriz por destino, corre el checklist de pre-entrega y empaqueta. Regla dura: el
> color-space y el DPI se deciden por **destino** (web/social ≠ print), no por comodidad.
> Composición por formato viene de `campaign-visual-system.md`.

- **Proyecto / campaña:** [nombre]
- **Fecha / responsable:** [YYYY-MM-DD · quién]
- **Destinatario:** [equipo / cliente / plataforma]

## 1. Lista de assets

| # | Asset | Formato destino | Estado |
|---|---|---|---|
| 1 | [Hero web] | [web] | [⏳/✅] |
| 2 | [Post feed] | [social] | [___] |
| 3 | [Story] | [social vertical] | [___] |
| 4 | [Aviso print] | [print] | [___] |
| 5 | [Email header] | [email] | [___] |

## 2. Specs por destino

| Destino | Formato archivo | Tamaño / ratio | Color-space | DPI | Peso máx |
|---|---|---|---|---|---|
| **Web** | [WebP/PNG/JPG] | [1920×1080 · 16:9] | [sRGB] | [72] | [< 300 KB] |
| **Social** | [PNG/JPG] | [1080×1350 · 4:5] | [sRGB] | [72] | [según red] |
| **Print** | [PDF/X · TIFF] | [A4 + 3mm bleed] | [CMYK] | [300] | [—] |
| **Email** | [PNG/JPG] | [600px ancho] | [sRGB] | [72] | [< 100 KB] |
| **Transparente (UI)** | [PNG/SVG] | [según slot] | [sRGB + alpha] | [72/@2x] | [—] |

> Assets de UI de Greenhouse: los produce y valida `greenhouse-ai-image-generator`
> (transparencia + DESIGN.md/AXIS). Esta spec cubre el resto.

## 3. Naming

- **Convención:** `[marca]_[campaña]_[formato]_[ratio]_[version]_[idioma].[ext]`
- **Ejemplo:** `efeonce_grader_hero_16x9_v2_es.webp`
- **Reglas:** [kebab/snake · minúsculas · sin espacios · sin acentos · versión explícita]

## 4. Versiones requeridas

| Variante | ¿Necesaria? | Nota |
|---|---|---|
| Positivo (sobre claro) | [sí/no] | [___] |
| Negativo (sobre oscuro) | [sí/no] | [___] |
| Monocromo / B&N | [sí/no] | [fallback print/fax] |
| Idioma es-CL | [sí/no] | [___] |
| Idioma en-US | [sí/no] | [clientes Globe] |
| @1x / @2x | [sí/no] | [pantallas retina] |

## 5. Safe zones

- **Social vertical (9:16):** [top ___px y bottom ___px libres de UI de la app]
- **Feed (4:5/1:1):** [márgenes de recorte y de overlay]
- **Print:** [bleed ___mm + margen de seguridad ___mm]
- **Logo clear space:** [X unidades alrededor]

## 6. Checklist de pre-entrega

- [ ] Color-space correcto por destino (sRGB web / CMYK print).
- [ ] DPI correcto (72 pantalla / 300 print).
- [ ] Peso dentro del límite de cada plataforma.
- [ ] Naming aplicado y consistente.
- [ ] Todas las versiones/idiomas presentes.
- [ ] Safe zones respetadas (nada crítico en zonas de recorte).
- [ ] Texto legible en el tamaño real de uso (no solo al 100% en pantalla).
- [ ] Bleed y marcas de corte en print.
- [ ] Transparencia limpia en PNG/SVG de UI (sin halo).
- [ ] Disclosure de IA / derechos resueltos si aplica.

## 7. Empaquetado

- **Estructura de carpetas:** `[campaña]/[destino]/[archivos]`
- **Formato de entrega:** [ZIP / Drive / link]
- **Incluye:** [assets finales + master editable + tokens/paleta + esta spec]
- **Link de entrega:** [___]
