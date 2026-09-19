# Espacio para texto y formatos nativos — Lenguaje Fotográfico Efeonce

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
