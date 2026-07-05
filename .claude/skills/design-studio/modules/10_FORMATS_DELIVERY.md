# 10 · Formatos y entrega

> **Qué es esto.** El módulo de **entregables**: specs por destino, screen vs print, tipos de
> archivo, retina, naming y empaquetado, y el checklist de pre-entrega. Un diseño excelente
> mal exportado llega roto — este módulo cierra ese hueco. Formato/algoritmo **por red social**
> vive en `social-media-studio`; acá está el marco general y lo no-social.

> **Sello de frescura.** Los **tamaños por red** son VOLÁTIL *(as-of 2026-07 — reverificar en
> `social-media-studio`)*; los principios de color-space, DPI, sangrado y tipos de archivo son
> **estables**. Cierra con `templates/asset-delivery-spec.md`.

---

## 1. Specs por destino

| Destino | Ratio típico | Resolución / DPI | Color | Notas |
|---|---|---|---|---|
| **Web hero** | 16:9 / 21:9 / 3:2 | 2x (retina), ~72–96 ppi nominal | sRGB | Pesa lo mínimo viable; art-direct por breakpoint |
| **Banner display** | por slot (IAB) | 2x | sRGB | Peso acotado por la red publicitaria |
| **OG / social share image** | **1200×630** | 1x basta (se recomprime) | sRGB | Texto grande, safe-zone central, legible en miniatura |
| **Social feed/story** | 1:1 / 4:5 / 9:16 | según red | sRGB | Tamaños y safe zones → `social-media-studio` |
| **Email** | ancho ~600px | 2x para retina, peso bajo | sRGB | Peso total controlado; no depender de imágenes para el mensaje |
| **Presentación** | 16:9 (1920×1080) | 1x–2x | sRGB | Contraste alto para proyección; evitar texto fino |
| **Print A4/afiche** | tamaño real + sangrado | **300 dpi** al tamaño final | **CMYK** | Sangrado + márgenes de seguridad (§3) |
| **OOH / gran formato** | según soporte | menor dpi por distancia de visión | CMYK | A mayor distancia, menor dpi aceptable; diseñar al 10–25% con dpi escalado |

> **Regla:** el ratio y la resolución se deciden **por destino, antes** de producir la imagen
> (`modules/08` §1). Exportar a un ratio que no era el del canvas = recorte o deformación.

## 2. Screen vs print (la distinción que rompe entregas)

| | Screen | Print |
|---|---|---|
| **Color** | RGB (sRGB default; P3 solo si toda la cadena lo soporta) | CMYK (perfil según imprenta; pedir el ICC) |
| **Resolución** | DPI es nominal; lo que manda son **píxeles** + retina 2x | **300 dpi al tamaño físico final** (150 dpi para gran formato lejano) |
| **Negro** | #000 puro está bien | Negro rico (ej. C60 M40 K100) para masas; K100 puro para texto |
| **Sangrado** | no aplica | **3 mm** de bleed + margen de seguridad interno |
| **Transparencia** | PNG/SVG con alpha | aplanar; la transparencia se resuelve en pre-prensa |

**Trampa clásica:** diseñar en RGB y mandar a imprenta sin convertir → los colores viran
(sobre todo saturados y azules/verdes). Convierte a CMYK y **revisa** con el perfil de la
imprenta antes de entregar. Si el cliente Globe imprime, pide el perfil ICC primero.

## 3. Sangrado, márgenes y safe zones

- **Bleed (sangrado):** extiende el arte **3 mm** más allá del corte por cada lado, para que
  al guillotinar no aparezca borde blanco. Estándar; confirmar con la imprenta.
- **Margen de seguridad:** todo lo que no puede cortarse (texto, logo) vive a **≥3–5 mm** del
  filo de corte, hacia adentro.
- **Safe zone digital:** en OG/social/video, el mensaje central va en la zona segura — las
  redes recortan bordes y superponen UI. Detalle por red → `social-media-studio`.

## 4. Tipos de archivo (cuándo cada uno)

| Formato | Úsalo para | Evítalo cuando |
|---|---|---|
| **SVG** | Logos, iconos, ilustración vectorial, cualquier cosa que escale sin perder | Fotografía / raster complejo |
| **PNG** | Raster con **transparencia**, UI, capturas nítidas, line-art | Fotos grandes (pesa mucho) |
| **JPG** | Fotografía sin transparencia, correo, donde el peso importa | Necesitas alpha o texto nítido |
| **WebP** | Web moderna: mejor peso que JPG/PNG, soporta alpha | Print; clientes muy legacy |
| **AVIF** | Web de punta: mejor compresión aún; verificar soporte | Cuando la cadena/cliente no lo soporta |
| **PDF** | Print, entregables de documento, vector + texto seleccionable, pruebas de color | Web (usa raster/SVG) |

**Reglas rápidas:**
- **Transparencia** → PNG (raster) o SVG (vector) o WebP/AVIF (web con alpha). Nunca JPG.
- **Web:** ofrece AVIF/WebP con fallback; el `<picture>`/optimizador lo resuelve.
- **Retina/2x:** exporta al doble de las dimensiones de display y deja que el CSS lo baje.
  Un asset 1x en pantalla retina se ve blando.
- **Print:** PDF/X con fuentes embebidas o convertidas a curvas; nunca fuentes sueltas.

## 5. Naming y empaquetado

Nombres **predecibles, sin espacios, en kebab-case**, con los ejes que importan:

```
{proyecto}-{pieza}-{destino}-{ratio}-{version}@{escala}.{ext}
p.ej.  grader-hero-web-16x9-v2@2x.webp
       sky-afiche-print-a4-v1.pdf
       aeo2-og-share-1200x630-v3.png
```

- **Versiona explícito** (`v1`, `v2`) — nunca "final", "final-final", "ok".
- **Agrupa el entregable** por destino: `/web`, `/print`, `/social`, `/source`.
- **Incluye los `source`** (archivo editable / prompt sheet / capas) cuando el cliente o el
  equipo va a iterar. Ver `templates/image-prompt-sheet.md` para el prompt de origen.
- **Un manifiesto** breve (qué es cada archivo, para qué destino, color space) evita que el
  receptor abra a ciegas.

## 6. Checklist de pre-entrega

> - [ ] **Resolución** correcta por destino (px + retina 2x en screen; 300 dpi al tamaño en print).
> - [ ] **Color space** correcto (sRGB en screen; CMYK con perfil ICC en print) y revisado.
> - [ ] **Ratio** = el del destino, sin recorte/deformación no intencional.
> - [ ] **Safe zone / margen** respetados (mensaje no se corta; bleed 3 mm en print).
> - [ ] **Transparencia** en el formato correcto (PNG/SVG/WebP-AVIF, nunca JPG con alpha falso).
> - [ ] **Peso** acotado por destino (web/email liviano; sin sobre-comprimir el héroe).
> - [ ] **Tipo de archivo** adecuado (§4); web con AVIF/WebP + fallback.
> - [ ] **Versiones** nombradas en kebab-case con eje de destino/ratio/escala (§5).
> - [ ] **Source / editable / prompt sheet** incluidos si habrá iteración.
> - [ ] **Legibilidad** del texto en el tamaño real de consumo (miniatura, proyección, lejanía).
> - [ ] Tamaños **por red** verificados en `social-media-studio` *(as-of — reverificar)*.
> - [ ] Cerrado con `templates/asset-delivery-spec.md`.

---

## 7. Boundaries de entrega

- **NUNCA** entregues print en RGB sin convertir a CMYK con el perfil de la imprenta.
- **NUNCA** entregues un asset UI de Greenhouse por este canal — va por
  `greenhouse-ai-image-generator` con sus specs (DESIGN.md/AXIS/transparencia).
- **NUNCA** exportes 1x para pantallas retina; **NUNCA** JPG donde se necesita alpha.
- **NUNCA** cites tamaños de red social de memoria — reverifica en `social-media-studio`.
- **NUNCA** nombres "final" sin versión; **NUNCA** entregues sin color space declarado.

> **Cierre.** El formato correcto por destino, el color space correcto, la safe zone y el
> naming versionado son la diferencia entre "diseño bueno" y "entrega que se usa sin
> retrabajo". Cierra siempre con `templates/asset-delivery-spec.md`; para social, delega el
> tamaño a `social-media-studio`.
