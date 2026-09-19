# Zonas de composición (texto, selección y cursores) y formatos nativos — Lenguaje Fotográfico Efeonce

> **Tipo de documento:** Especificación técnica y operativa
> **Versión:** 1.0
> **Creado:** 2026-09-19 por Claude
> **Documentación relacionada:** [maestro](EFEONCE_PHOTOGRAPHIC_LANGUAGE_V1.md) · [firma](EFEONCE_PHOTO_SIGNATURE_FOREGROUND_V1.md) · [cámaras](EFEONCE_PHOTO_CAMERA_LENS_ANGLE_CATALOG_V1.md) · [prompts y pipeline](EFEONCE_PHOTO_PROMPT_BLOCKS_AND_PIPELINE_V1.md)
> **Evidencia:** `ai-generations/2026-09-19_lenguaje-fotografico-efeonce/rondas/texto/` · OneDrive `referencias/08-espacio-texto-y-formatos/`

Pedido del operador: «las imágenes deben dejar espacio a veces para donde se vaya a agregar los textos». Esta ronda
probó la reserva de espacio para titular y los formatos **nativos** 4:5, 9:16 y 16:9 (nunca recortados de otro).

## 1. Resultado

Tres escenas × tres formatos = 9 piezas con titular de prueba y firma. Todas pasan tras la corrección
**[medido]**:

| Escena | 4:5 (1152×1440) | 9:16 (1152×2048) | 16:9 (2048×1152) |
|---|---|---|---|
| Panadería, haz de sol · «El oficio, a la vista.» | titular 6,35:1 · firma 20,3:1 | 14,4:1 · 18,9:1 | 15,2:1 · 19,1:1 |
| Pipeline Bogotá · «Tu pipeline, en vivo.» | 7,99:1 · 14,6:1 | 7,24:1 · 15,4:1 | 11,0:1 · 8,6:1 |
| Julio y Nexa · «Lo construimos contigo.» | 9,29:1 · 12,8:1 | 5,66:1 · 8,8:1 | 12,4:1 · 5,4:1 |

Contraste del titular medido contra el percentil 98 (blanco) o 2 (tinta `#00284d`) de la zona real del texto.

## 2. Qué falló primero y por qué **[medido]**

| Síntoma (v1) | Causa | Regla |
|---|---|---|
| Titular sobre pared de tono medio: 2,7–4,3:1 | La zona se pidió «calma» sin tono | **Declarar el tono de la zona** igual que el del lecho: «DEEP warm shadow… dark enough for white text» o «VERY LIGHT warm-white wall… light enough for dark text» |
| Cabezas dentro de la zona del titular (pipeline 4:5, Julio y Nexa 9:16): 1,3–2,8:1 | El modelo sube a los sujetos | **Límite de cabezas**: «All heads and hands stay BELOW 36% of the frame height» (verticales) / «All people and objects stay entirely inside the RIGHT 55%» (16:9) |
| Ventana o fotos colgadas dentro de la zona | El set trae elementos al fondo | Nombrar lo prohibido en la zona: «no windows, frames, prints, plants, light beams or bright spots» |
| Titular chocando con un borde luminoso aun con tono correcto | La caja fija no se adapta | **Autoajuste** en el compositor (§4) |

La zona de texto es a la parte alta lo que el lecho es a la baja: **se planifica en la toma, con tono declarado.**

## 3. Zonas por formato (valores usados)

| Formato | Tamaño | Zona de titular (x0,y0,x1,y1 en fracciones) | Sujeto | Lecho | Firma (centro, ancho) |
|---|---|---|---|---|---|
| 4:5 feed | 1152×1440 | 0,08 · 0,05 · 0,92 · 0,29 (tercio superior) | 30–80% alto | 18% inferior | y 0,935 · 15% del lado corto |
| 9:16 Stories/Reels | 1152×2048 | 0,08 · 0,11 · 0,92 · 0,31 (bajo la barra superior de la red) | 35–75% alto | 22% inferior | y 0,875 (sobre la interfaz inferior) · 15% del lado corto |
| 16:9 web/YouTube/LinkedIn | 2048×1152 | 0,06 · 0,20 · 0,42 · 0,62 (costado izquierdo) | mitad derecha | 16% inferior | y 0,92 · 15% del lado corto |

- 16:9 es el formato que mejor reserva espacio: el costado queda limpio casi siempre.
- 9:16 comparte el problema de 4:5 (cabezas que suben) y necesita el límite de cabezas.
- El 15% se calcula sobre el **lado corto** para que la firma pese igual en los tres formatos.

## 4. Compositor de titular (`scripts/titular.mjs`)

```bash
node ai-generations/2026-09-19_lenguaje-fotografico-efeonce/scripts/titular.mjs <plate> <out> \
  '{"text":"Línea 1|Línea 2","zone":[0.08,0.05,0.92,0.29],"align":"center","logoCy":0.935,"logoW":0.15}'
```

- Tipografía: Bricolage Grotesque variable con la receta AXIS `ideaImpact` (peso 780, ancho 96, opsz 88, tracking
  −0,035 em, interlineado 0,9), a trazos con fontkit (letras exactas; nunca generadas).
- Tamaño: el mayor que cabe en 96% del ancho y 90% del alto de la zona.
- Color: blanco (`inkOnDark`) o tinta (`inkOnLight #00284d`) según el contraste medido en la zona.
- **Autoajuste (por defecto):** si la zona no llega a 4,5:1, la recorta desde el lado más cargado y desde abajo, en
  pasos de 5%, hasta encontrar una subzona que pase (mínimo 55% del área original). Si ninguna pasa, avisa
  «regenerar el plate». Desactivar con `"autofit": false`.
- La firma se compone en el mismo paso (color por contraste, SVG oficial).

El titular de estas pruebas es **de validación de espacio**, no copy aprobado: la tipografía final de una pieza sigue
el flujo de `efeonce-advertising-creative` (jerarquía por voces, QA a 390 px).

## 5. Bloques de prompt

```text
VERTICAL 4:5 composition. All heads and hands stay BELOW 36% of the frame height. TEXT SPACE (planned, essential):
the UPPER 30% of the frame is <TONO>, reserved for a headline; the subject sits in the middle band (30%–80% of the height).

VERTICAL 9:16 composition for Stories/Reels. All heads and hands stay BELOW 36% of the frame height. TEXT SPACE
(planned, essential): the band from 10% to 32% of the height is <TONO>, reserved for a headline; the top 10% can hold
soft ceiling/wall; the subject sits between 35% and 75% of the height.

HORIZONTAL 16:9 composition. All people and objects stay entirely inside the RIGHT 55% of the frame. TEXT SPACE
(planned, essential): the LEFT 42% of the frame is <TONO>, reserved for a headline; the subject sits in the right half.

<TONO> oscuro: a DEEP, warm, evenly toned shadow on a plain wall (dark enough for white text), with no objects,
windows, light beams or bright spots in it
<TONO> claro: a plain, evenly lit, VERY LIGHT warm-white wall (light enough for dark text), with no windows, objects,
frames or shadows in it
```

El lecho usa el mismo `FOREGROUND` de siempre con la franja del formato (18% / 22% / 16% inferior).

## 6. Costos y motor

Flare `high` para escenas sin identidad y Sunburst `high` para Julio y Nexa (4 referencias). 18 plates (v1 + v2)
≈ USD 1,2 (los 9:16 y 16:9 cuestan ~1,5× el 4:5 por área).

## 7. Pendientes

- Aplicar la reserva a más escenas y cámaras (ojo de pez, tele, macro) antes de fijar reglas por cámara.
- La taza azul volvió a aparecer en la escena de Julio y Nexa: variar el objeto de acento.
- 1:1 no se probó.

## 8. La capa no es sólo texto: composición completa

Corrección del operador (2026-09-19): «a veces no es solo texto… puede tener también bounding box, cursor standalone
y cursor multiplayer, distintas voces o tipografías como Guttery y Poppins». Lo que se reserva en la toma son
**zonas de composición**, no una zona de titular.

### 8.1 Capas disponibles (todas opcionales, contrato AXIS de `efeonce-advertising-creative`)

| Capa | Voz / receta | Rol | Notas |
|---|---|---|---|
| Etiqueta | Poppins SemiBold/Bold, `structureLabel` (tracking 0,08 em), mayúsculas | nombra la misión, el servicio o el capítulo | corta; nunca lleva el acento naranja |
| Entrada | Bricolage `ideaLead` (peso 420) | prepara la tesis | |
| Dominante | Bricolage `ideaImpact` (780 / ancho 96 / opsz 88) | la tesis, 1–3 palabras clave | acepta `[[acento]]` naranja y `**negrita**` |
| Cierre | Bricolage `ideaMedium` (620) | completa la frase | |
| Tarjeta HUD | Poppins Regular + remate Bold, `structureCopy` | dato o giro sobre la escena | |
| Gesto | Guttery (`~/Library/Fonts/Guttery.otf`, no versionada) | voz humana breve, 1 por pieza, ≤ 3 palabras | si falta la fuente, la capa se omite |
| Selección | AXIS `renderCollaborationSelection` | enmarca el objeto real | variantes válidas: `eight-handles`, `four-corners`, `open-brackets` |
| Cursor solo | selección con **un** cursor y `local: false` | presencia de un rol o de Nexa | |
| Cursores multiplayer | 2–3 cursores + cursor local | co-creación cliente ↔ Efeonce | colores por rol: Cliente lima `#6ec207` o azul, Arte naranja `#f55d01`, RevOps/Efeonce `#0375db`, Nexa `#d6246e` |
| Firma | SVG oficial | cierre | 15% del lado corto |

### 8.2 Qué reservar en la toma

Además del tono de la zona de texto y del límite de cabezas (§2), el plate debe traer:
- **un objeto aislado y completo** para enmarcar (una prueba impresa, una tarjeta en el muro, un portátil), con
  espacio libre alrededor para la caja y las etiquetas de los cursores;
- **una zona pareja para la tarjeta HUD** cuando la pieza lleva dato;
- **una zona pareja para el gesto** (la caligrafía necesita ≥ 4,5:1 igual que el resto).

### 8.3 Compositor `scripts/composicion.mjs`

```bash
node ai-generations/2026-09-19_lenguaje-fotografico-efeonce/scripts/composicion.mjs <plate> <out> plan.json
```

El plan declara `label`, `lead`, `dominant`, `closing`, `hud`, `gesture`, `selection` y `logo`. El script:
mide el contraste de **cada capa** contra los píxeles reales y elige tinta blanca o `#00284d`; autoajusta la zona
cuando no llega a 4,5:1; convierte todo a trazos (nunca `<text>`); valida que la selección quede dentro del lienzo;
**falla si una fuente no tiene el glifo pedido** y **falla si el gesto queda bajo 4,5:1** (`"force": true` lo permite
con aviso).

### 8.4 Pruebas (rondas `rondas/capas/`, OneDrive `referencias/09-capa-composicion/`) **[medido]**

| Pieza | Capas | Resultado |
|---|---|---|
| 4:5 arte final | etiqueta + dominante con acento + gesto Guttery + selección `open-brackets` con 2 cursores y cursor local | etiqueta 13,4:1 · dominante 4,7:1 · gesto 7,1:1 · firma 16,6:1 |
| 9:16 Search Visibility | etiqueta + dominante + **cursor solo** (`four-corners`, un cursor Nexa, sin cursor local) | etiqueta 13,4:1 · dominante 11,7:1 · firma 12,9:1 |
| 16:9 RevOps | dominante con acento + tarjeta HUD + **multiplayer** (`eight-handles`, RevOps + Cliente + local) | dominante 14,5:1 · HUD 16,7:1 · firma 15,6:1 |

### 8.5 Fallos de esta ronda y su regla **[medido]**

| Fallo | Causa | Regla |
|---|---|---|
| `variant: "outline"` rechazado | no existe en el contrato | sólo `eight-handles`, `four-corners`, `open-brackets` |
| Etiqueta de cursor fuera del lienzo | ancla hacia el borde con el objeto pegado a él | anclar hacia el espacio libre; el render falla si se sale |
| «→» salió como caja | Poppins no tiene ese glifo | el compositor ahora **falla** con glifos inexistentes; usar caracteres soportados o componer el símbolo aparte |
| Gesto Guttery en 1,76:1 | caligrafía sobre madera de tono medio | el compositor **falla** bajo 4,5:1; mover el gesto a una zona pareja |
