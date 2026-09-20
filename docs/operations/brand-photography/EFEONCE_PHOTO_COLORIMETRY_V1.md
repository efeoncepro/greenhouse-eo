# Colorimetría de la fotografía de marca Efeonce — V1

> **Tipo de documento:** Especificación técnica de marca (colorimetría y medición)
> **Versión:** 1.0
> **Creado:** 2026-09-19 por Claude
> **Última actualización:** 2026-09-20
> **Documentación relacionada:** [Índice](./README.md) · [Lenguaje fotográfico (maestro)](./EFEONCE_PHOTOGRAPHIC_LANGUAGE_V1.md) · [Firma: primer plano y logo](./EFEONCE_PHOTO_SIGNATURE_FOREGROUND_V1.md) · [Cámaras, lentes y ángulos](./EFEONCE_PHOTO_CAMERA_LENS_ANGLE_CATALOG_V1.md) · [Bloques de prompt y pipeline](./EFEONCE_PHOTO_PROMPT_BLOCKS_AND_PIPELINE_V1.md) · [Personas, identidad y vestuario](./EFEONCE_PHOTO_PEOPLE_IDENTITY_WARDROBE_V1.md) · [Manual de uso](../../manual-de-uso/marketing/fotografia-de-marca-efeonce.md)

Este documento fija **cómo se ve el color** en una foto de marca propia de Efeonce y **cómo se mide**. El objetivo
del operador fue que «incluso al ver una foto y su colorimetría se pueda sentir que es un elemento o foto de la
agencia» **[decisión del operador]**. La respuesta no es un filtro: es **color natural + roles de color + luz
controlada + medición**.

Convención de marcas: **[medido]** = número obtenido con los scripts de la corrida del 2026-09-19 (se re-midió al
escribir este documento); **[decisión del operador]** = lo decidió Julio Reyes; **[criterio]** = recomendación
técnica propia, revisable; **[pendiente]** = no resuelto.

Evidencia: `ai-generations/2026-09-19_lenguaje-fotografico-efeonce/` (en adelante «la corrida»). Todas las rutas de
imágenes son relativas a esa carpeta.

---

## 1. Principios en una tabla

| # | Principio | Tipo |
|---|---|---|
| 1 | **Sin grade.** Color natural, fiel a la escena. El grade V0 «Navy Shadow» se descartó. | [decisión del operador] |
| 2 | **El azul activo `#0375DB` es la casa** y aparece en todas las piezas integrado en la composición; no necesita un objeto propio. | [decisión del operador; aclaración 2026-09-20] |
| 3 | **Naranja `#F55D01` = la idea; lima `#6EC207` = el resultado.** Uno solo de los dos por pieza, además del azul. | [decisión del operador] |
| 4 | El acento **nace de la situación y de la composición**, no de una obligación de colocar utilería de color. Puede vivir en luz, reflejo, material, superficie o relación entre planos. | [decisión del operador; aclaración 2026-09-20] |
| 5 | «La colorimetría no es vestir de navy»: el navy en ropa no es la firma de color. | [decisión del operador] |
| 6 | Balance neutro-cálido (~5200 K), sombras neutras (nunca azules), exponer para altas luces. | [criterio, medido] |
| 7 | Si el color falla, **se regenera**; la corrección técnica es mínima y excepcional. | [decisión del operador] |
| 8 | Toda pieza se mide con `metricas.cjs` antes de entrar al set. | [criterio] |

---

## 2. Paleta de marca con valores Lab

SSOT de la paleta: `.claude/skills/content-marketing-studio/efeonce/EFEONCE_EDITORIAL_INFOGRAPHIC_SYSTEM.md` §2.
Los valores Lab se calcularon con la misma conversión que usa `metricas.cjs` (sRGB → lineal → XYZ D65 → CIELAB)
**[medido]**.

| Rol | Nombre | HEX | L* | a* | b* | C* | h° |
|---|---|---|---:|---:|---:|---:|---:|
| Primario | Tinta | `#022A4E` | 16,6 | 2,6 | −25,9 | 26,0 | 276 |
| Primario | Navy (logo) | `#023C70` | 25,0 | 5,0 | −34,7 | 35,1 | 278 |
| Primario | Azul medio | `#024C8F` | 32,2 | 7,4 | −42,5 | 43,2 | 280 |
| **Primario / la casa** | **Azul activo** | **`#0375DB`** | **49,3** | **11,7** | **−59,5** | **60,7** | **281** |
| **Acento / la idea** | **Naranja** | **`#F55D01`** | **59,2** | **55,4** | **68,6** | **88,2** | **51** |
| Neutro | Plomo oscuro | `#263448` | 21,3 | 0,4 | −14,2 | 14,2 | 272 |
| Neutro | Plomo | `#505964` | 37,4 | −0,9 | −7,5 | 7,6 | 263 |
| Neutro | Blanco | `#FFFFFF` | 100 | 0 | 0 | 0 | — |
| **Secundario / el resultado** | **Lima (verde)** | **`#6EC207`** | **70,8** | **−50,6** | **69,8** | **86,2** | **126** |
| Secundario | Teal | `#12AFA2` | 64,5 | −39,4 | −3,8 | 39,6 | 186 |
| Secundario | Magenta | `#BB1954` | 41,1 | 63,1 | 9,7 | 63,8 | 9 |
| Secundario | Púrpura | `#633F93` | 34,6 | 33,9 | −40,7 | 53,0 | 310 |
| Línea Reach | Naranja Reach | `#FF6500` | 62,1 | 55,4 | 71,2 | 90,3 | 52 |
| Cursor Nexa (AXIS) | Nexa | `#D6246E` | 47,9 | 69,6 | 3,8 | 69,7 | 3 |

Lecturas técnicas:

- **Tinta y navy casi no se separan** en foto: ΔE76 navy↔tinta = **12,4** **[medido]**. Por eso un uniforme navy sobre
  un set tinta se funde (§6).
- El azul activo tiene **croma 60,7**: es el único color «de marca» con croma suficiente para funcionar como punto
  gráfico en una foto de color natural. Tinta y navy funcionan como material o sombra, no como acento.
- Naranja (C 88) y lima (C 86) son **colores de señal**: a 1–5 % del cuadro ya dominan la lectura; por eso uno solo.

---

## 3. Roles de color

### 3.1 Azul activo `#0375DB` — la casa

Aparece **en todas las piezas** como una relación cromática propia de la escena: luz, reflejo, material, superficie,
profundidad o elemento existente. No se añade un objeto sólo para alcanzar un porcentaje. Los dos modos siguientes
describen patrones de las fotos aprobadas, **no cuotas ni formas obligatorias** **[decisión del operador; aclaración
2026-09-20]**:

| Modo | Área del cuadro (métrica `azul`) | Ejemplos de la corrida | Área medida |
|---|---|---|---:|
| **Acento** | 3–10 % (en la práctica 0,1–7 %) | Taza azul (`impacto/I5-retrato-persianas`), gorro del camarógrafo (`cruce/X4-tiltshift-mediodia`), botellas héroe (`curado/K2b-retail-bebidas`), marcador en vidrio (`cruce/X3-reflejo-dorado`) | 1,1 % · 1,5 % · 3,5 % · 0,4 % |
| **Campo protagonista** | ≥ 18 % | Set de papel azul (`impacto/I2-set-azul`), pantalla gigante (`impacto/I4-escala`), instalación en dron (`camaras/2-drone-cenital`), pantalla del escenario (`personas/J3-escenario`), pintura macro (`palancas/T1-macro-pintura`) | 52,1 % · 18,4 % · 35,8 % · 23,5 % · 43,3 % |
| **Prohibido: intermedio en ropa grande** | 10–18 % en una prenda | Camisa azul en Miami (`oficio3/1-aeo-miami-final-plate`), hoodie del contrapicado (`camaras/4-contrapicado`) | 15,9 % · 17,0 % |

Una prenda azul que ocupa un sexto del cuadro se leyó como vestuario de catálogo en esa ronda **[criterio,
validado por el operador]**. La lectura final depende de cómo se relaciona el azul con luz, espacio y oficio.

Nota de medición: la métrica `azul` (h 250–300°, C > 30) **también cuenta el navy** (C 35) si está bien iluminado; un
uniforme navy iluminado sube la cifra sin ser azul activo. Interpretar con la foto a la vista.

### 3.2 Naranja `#F55D01` — la idea

El momento creativo, **dentro de la obra**. Ejemplos aprobados: la manga de la directora (`impacto/I1-harina`), la
luz REC del rig (`oficio2/A-rodaje-macro-plate`), el lápiz graso sobre la prueba (`curado/K1-kv-cafe`), la bolsa de
arena del trípode (`camaras/3-tilt-shift`, `cruce/X4`), la bufanda (`camaras/6-tele-200`), el cajón de fruta
(`palancas/M1-movimiento`), el marcador (`personas/N1b`).

| Pieza | `naranja` medido |
|---|---:|
| `palancas/M1-movimiento` (cajón de fruta) | 1,02 % |
| `oficio2/A-rodaje-macro` (manga + luz REC) | 0,98 % |
| `curado/K1-kv-cafe` (lápiz graso) | 0,12 % |
| `camaras/6-tele-200` (bufanda) | 0,11 % |
| `impacto/I1-harina` (manga en sombra) | 0,09 % |

La métrica `naranja` exige L > 40 y C > 60: **un naranja en sombra no se cuenta** (la manga de I1 se lee a ojo pero
mide 0,09 %). La cifra sirve para detectar exceso, no para confirmar presencia **[criterio]**.

### 3.3 Lima `#6EC207` — el resultado

Lo que se ganó o aprobó: la tarjeta «Ganado» del pipeline (`cruce/X1-final-plate`, 0,49 %), el post-it con check en
el vidrio (`camaras/5-reflejo` 0,43 %, `personas/N2-reflejo` 0,57 %), la card «Recomendado» del celular
(`oficio3/1-aeo-miami`), el cursor «Cliente» que aprueba en la selección AXIS.

### 3.4 Reglas de área y de origen

| Regla | Valor | Tipo |
|---|---|---|
| Acentos por pieza | Azul + **uno** (naranja **o** lima) | [decisión del operador] |
| Área del acento de historia | 1–5 % del cuadro a ojo como orientación compositiva; métrica típica 0,1–1 %, nunca umbral único de aprobación | [criterio, medido] |
| Origen | La situación y la relación entre luz, superficies, reflejos y planos; un objeto concreto es opcional, nunca decoración añadida | [decisión del operador; aclaración 2026-09-20] |
| Objetos de marca | Válidos si pertenecen al oficio o al lugar y aportan acentos sutiles y elegantes; evaluar su función visual, no usarlos por cuota | [decisión del operador; aclaración 2026-09-20] |
| Utilería rechazada | Jarrón o libro naranja «puesto» | [decisión del operador] |
| Repetición | La **taza azul** apareció en 4 piezas (I5, K3, K1, JN1): sesgo a evitar; variar el portador del azul | [criterio, revisor adversarial] |
| Paneles azules de fondo | Se repitieron en escenario y podcast: variar | [criterio] |

---

## 4. Sin grade: por qué se descartó el grade V0

En la ronda 1 (`rondas/ejemplos/`) se comparó la misma foto sin grade y con el grade determinístico V0 «Navy Shadow»
(`scripts/efeonce-look.mjs`: levanta el punto negro a ~5 %, tiñe las sombras hacia navy h≈278°, baja saturación
global a 0,87 y agrega grano). El operador eligió **color natural** («los de la izquierda me gustan más»)
**[decisión del operador]**.

Lo que el grade hacía, medido hoy **[medido]**:

| Pieza | Versión | p1 (negro) | b* sombras | Disp. tono | Quemado |
|---|---|---:|---:|---:|---:|
| `ej1-retrato-oficio` | sin grade | 2,5 | −4,7 | 74° | 1,07 % |
| | grade V0 | **8,0** | **−16,0** | 87° | 2,01 % |
| `ej2-mesa-trabajo` | sin grade | 2,4 | −1,8 | 80° | 0,07 % |
| | grade V0 | **7,9** | **−13,4** | 67° | 0,13 % |

Lectura: el grade **lavaba los negros** (p1 de 2,5 a 8) y **teñía las sombras de azul** (b* sombras −13 a −16), lo
contrario de «sombras neutras, nunca azules». El resultado se leía como filtro de app, no como agencia premium
**[criterio]**. `efeonce-look.mjs` queda sólo como registro histórico: **no se usa**.

---

## 5. Balance de blancos, exposición y luz

### 5.1 Reglas

| Parámetro | Regla | Tipo |
|---|---|---|
| Temperatura | Luz de día neutro-cálida, ~5200 K; blancos levemente cálidos, nunca azulados | [criterio, medido] |
| Sombras | Neutras (b* sombras −3 a +3), nunca azules ni cian | [criterio, medido] |
| Exposición | **Para las altas luces**: las superficies claras conservan textura; nada blanco puro salvo destellos especulares | [criterio, medido] |
| Contraste | Moderado en tomas serenas (~53); 70–90 en piezas de impacto | [criterio, medido] |
| Llave | Luz de ventana o un haz de sol dirigido; nunca flash plano | [criterio] |

### 5.2 Efecto medido del bloque de balance y exposición

El bloque `WHITE BALANCE AND EXPOSURE` (texto verbatim en
[bloques de prompt](./EFEONCE_PHOTO_PROMPT_BLOCKS_AND_PIPELINE_V1.md#34-balance-de-blancos-y-exposición-versión-fuerte))
se agregó tras dos fallos:

| Caso | Antes | Después | Cambio de prompt |
|---|---|---|---|
| Estudio en Lima sin personas | `oficio3/4-lima-sin-personas`: b* altas **−7,2** (blancos azulados), disp. tono 102° | `oficio3/4b-lima`: b* altas **0,0**, disp. tono 75° | Bloque WB/exposición + lecho «bleached pale ash … the brightest surface» |
| KV sobre mesa de luz | `oficio2/C2-kv-limpio`: quemado **31,52 %**, b* altas 0,4 | `oficio3/C3-kv`: quemado **0,05 %**, b* altas **+6,7** | Bloque WB/exposición + «light table with its backlight dimmed to a soft glow» |

### 5.3 Lámparas prácticas

Las lámparas encendidas en cuadro empujan las altas luces a amarillo y dan look de podcast de stock:
`paleta/P2-podcast` mide **b* altas +20,1** **[medido]**. Regla: en sets oscuros, lámparas **apagadas** o una sola
lámpara puntual pequeña; la llave es la ventana **[criterio]**.

### 5.4 Regla de noche

Primer intento (`palancas/N1-noche`): **18,5 % aplastado**, contraste 45 — negros sin información. Fix
(`curado/K3-noche`): se agregó «shadows deep but ALWAYS with visible texture and detail in clothes, desk and room (no
pure black areas)» → **7,1 % aplastado** **[medido]**. Texto completo de la regla en
[bloques de prompt §3.5](./EFEONCE_PHOTO_PROMPT_BLOCKS_AND_PIPELINE_V1.md#35-regla-de-noche).

| Parámetro de noche | Valor objetivo | K3 medido |
|---|---|---|
| Aplastado | ≤ 8 % | 7,1 % |
| b* altas | Se tolera cálido alto (luces de ciudad, lámpara) | +18,1 |
| Piel | Natural y cálida | L 50 / C 28 |
| Prohibido | Teal-and-orange, neón | — |

### 5.5 Contraluz

Contraluz real quema con facilidad. `cruce/X2-gondola-contraluz` midió **9,55 % quemado** (p99 = 100). El fix
(`curado/K2b-retail-bebidas`) pidió explícitamente «the exterior and highlights keep detail (no pure white areas)» →
**1,64 %** **[medido]**. En contraluz se aceptan hasta 2–3 % **[criterio]**. Costo lateral: K2b sube el aplastado a
9,2 % (sombra de la góndola en primer plano); se acepta porque el primer plano es el lecho oscuro de la firma.

Otros contraluces a vigilar: `camaras/4-contrapicado` (tragaluz) **6,51 %**, `personas/J2-rodaje-polo` (mismo
ángulo) **5,23 %**. Ambos fuera de rango: el contrapicado hacia un tragaluz exige pedir «skylight keeps detail»
**[criterio, pendiente de probar]**.

---

## 6. Navy: dónde sí y dónde no

| Situación | Regla | Evidencia |
|---|---|---|
| Navy en pared + ropa + logo a la vez | **Nunca** | [decisión del operador] «la colorimetría no es vestir de navy» |
| Uniforme navy (polo) | Sobre set claro o cálido, **nunca sobre set azul/tinta** | ΔE navy↔tinta 12,4 **[medido]**: se funde |
| Paredes tinta | Pedirlas **por material** («dusty matte deep ink blue, low sheen»), no por HEX | §8 |
| Logo navy `#023C70` | Sobre lecho claro; su contraste se mide (§7.4) | [criterio] |

---

## 7. Métricas: definición exacta

### 7.1 `metricas.cjs` — métricas Lab por pieza

Script: `scripts/metricas.cjs` de la corrida. Uso (desde la carpeta de la corrida):

```bash
node scripts/metricas.cjs nombre1=rondas/<ronda>/<pieza>-plate.png nombre2=...
```

Procedimiento, tal como está en el código:

1. Quita el canal alfa y **redimensiona a 576 px de ancho** (`sharp.resize(576)`), para que todas las piezas se midan
   con la misma densidad.
2. Convierte cada píxel sRGB → lineal (gamma 2,4 con tramo lineal ≤ 0,04045) → XYZ (matriz sRGB D65, normalizado
   por Xn 0,95047 y Zn 1,08883) → **CIELAB D65**. Calcula C* = √(a*² + b*²) y h = atan2(b*, a*) en grados 0–360.
3. Calcula las métricas de la tabla.

| Métrica (columna) | Definición exacta | Qué dice |
|---|---|---|
| `Lmedia` | Media de L* de todos los píxeles | Clave alta / baja |
| `p1` | Percentil 1 de L* | Profundidad del negro (un grade que levanta negros lo sube) |
| `p99` | Percentil 99 de L* | Techo de altas luces |
| `quemado` | % de píxeles con **L* > 97** | Altas luces sin textura |
| `aplastado` | % de píxeles con **L* < 2** | Negros sin información |
| `contraste` | **p95 − p5** de L* | Rango tonal útil |
| `Cmedia` | Media de C* | Saturación general |
| `Cp95` | Percentil 95 de C* | Saturación de los colores más vivos |
| `dispTono` | Desviación estándar **circular** del tono de los píxeles con **C* > 8**: R = ‖Σ(cos h, sin h)‖ / n; disp = √(−2 ln R) en grados | Cuántas familias de color conviven (0° = una sola) |
| `bAltas` | Media de b* de los píxeles con L* ≥ p95 (top 5 %) | Temperatura de las altas luces (+ = cálido, − = azulado) |
| `bSombras` | Media de b* de los píxeles con L* ≤ p10 (bottom 10 %) | Tinte de las sombras (− = azules) |
| `azul` | % de píxeles con **h ∈ (250°, 300°) y C* > 30** | Área de azul (incluye navy iluminado) |
| `naranja` | % con **h ∈ (45°, 62°), C* > 60, L* > 40** | Área de naranja vivo iluminado |
| `lima` | % con **h ∈ (110°, 135°), C* > 40** | Área de lima |
| `piel` | Media L*/C* de píxeles con a* > 8, b* > 10, 35 < L* < 85, 40° < h < 70°, C* < 40; «—» si hay ≤ 200 píxeles | Consistencia de la piel entre piezas |

Límites conocidos **[criterio]**:

- `piel` es una máscara de color, no un detector de rostros: madera cálida o cuero también entran. Sirve para ver
  deriva entre piezas, no como verdad absoluta.
- `naranja` no ve un naranja en sombra; `azul` cuenta navy iluminado.
- La métrica mide el **plate** (sin logo). Medir la pieza firmada mete el logo en las cifras.

### 7.2 `medir.mjs` — nitidez del lecho (firma)

Script: `scripts/medir.mjs`. Uso:

```bash
node scripts/medir.mjs rondas/<ronda>/<pieza>-plate.png '{"lecho":[0.30,0.87,0.70,0.995],"rostro":[x0,y0,x1,y1]}'
```

- Convierte a **escala de grises** (luminancia de sharp), recorre cada caja (coordenadas relativas 0–1:
  x0, y0, x1, y1) y calcula la **magnitud Sobel** (kernels 3×3 Gx, Gy; √(Gx²+Gy²)) de cada píxel interior.
- Imprime: `max` (gradiente máximo), `p99` (percentil 99 del gradiente) y `lum media` (0–255) de la caja.
- Umbrales: lecho **p99 ≤ ~20 y max ≤ ~25**, muy por debajo del rostro (rostro típico 200–780 de max) **[criterio,
  medido]**. Tono del lecho: **oscuro ≤ ~60 o claro ≥ ~180** de `lum media`; el tono medio (139–171) falló el
  contraste del logo 6+ veces **[medido]**. Detalle del lecho en [Firma](./EFEONCE_PHOTO_SIGNATURE_FOREGROUND_V1.md).

### 7.3 Contraste del logo (`componer.mjs`)

`componer.mjs` recorta el área exacta donde irá el logo (ancho = `LOGO` × ancho del lienzo, proporción del SVG
837,07 × 196,68, centro vertical en 93,5 % del alto) y calcula la luminancia relativa WCAG de cada píxel:

- contraste blanco = 1,05 / (L_más_claro + 0,05);
- contraste navy = (L_más_oscuro + 0,05) / (L(#023C70) + 0,05);
- elige el mayor y lo reporta. Es el **peor caso** (el píxel más desfavorable), no el promedio.
- Mínimo **4,5:1** **[criterio, WCAG AA texto]**. Rango logrado en el set: 4,9–20,2:1 **[medido]**.

### 7.4 Rangos objetivo por contexto

Derivados de las piezas aprobadas **[criterio, medido]**. Son **guías de control**, no puertas automáticas: una pieza
fuera de rango se mira; no se rechaza sólo por el número.

| Contexto | Quemado | Aplastado | Contraste | Cp95 | b* altas | b* sombras | Disp. tono | Ejemplo de referencia |
|---|---|---|---|---|---|---|---|---|
| Set sereno oscuro (tonal) | ≤ 0,5 % | ≤ 5 % | 50–60 | ≤ 25 | +5 a +12 | −3 a +3 | ≤ 30° | `territorios/T3-tonal` (18/0,00/2,6/53/19/+11,4/+1,7/23°) |
| Set claro de día | ≤ 1 % | ≤ 2 % | 75–90 | ≤ 35 | +2 a +8 | −3 a +3 | libre | `curado/K1-kv-cafe` (0,33 %/0,2 %/79/31/+3,4) |
| Impacto con haz de sol | ≤ 1,5 % | ≤ 5 % | 70–93 | ≤ 35 | +2 a +12 | −3 a +3 | 14–30° ideal | `impacto/I3b-marco` (0,54 %/1,2 %/69/17/+7,5/14°) |
| Contraluz | ≤ 2–3 % | ≤ 10 % | 85–95 | ≤ 35 | 0 a +5 | −3 a +3 | libre | `curado/K2b-retail-bebidas` (1,64 %/9,2 %/92) |
| Hora dorada | ≤ 1 % | ≤ 2 % | 65–90 | ≤ 35 | hasta **+21** intencional | ≈ 0 | ≤ 20° | `cruce/X3-reflejo-dorado` (+21,3 / −0,2 / 17°) |
| Clave baja / amanecer | ≤ 1 % | ≤ **10 %** (límite) | 75–85 | ≤ 25 | +4 a +8 | ≈ 0 | ≤ 25° | `impacto/I1-harina` (0,71 %/10,4 %/80) |
| Noche | ≤ 0,5 % | ≤ **8 %** | 45–55 | ≤ 30 | cálido alto tolerado | ≈ 0 | libre | `curado/K3-noche` (0,05 %/7,1 %/49/+18,1) |
| Macro de material | ≤ 0,5 % | ≤ 1 % | ~70 | hasta 57 | +5 | libre (sombra del material) | libre | `palancas/T1-macro-pintura` |
| Campo azul protagonista | ≤ 0,5 % | ≤ 1 % | 55–80 | **58–71** | −4 a +4 | ≈ 0 | libre | `impacto/I2-set-azul` (Cp95 58, azul 52 %), `impacto/I4-escala` (Cp95 71) |
| Piel (todas) | — | — | — | — | — | — | — | **L 44–61, C 18–31** en todo el set |

Sobre la dispersión de tono: es **control, no bloqueo**. En piezas monocromas debe quedar ≤ 30°; 40–100° es
legítimo cuando el azul convive con piel y madera cálidas. El nivel +1 bajó la dispersión a 14–30° en 4 de 6
piezas (I1 24°, I2 30°, I3b 14°, I6b 27°; I4 52° e I5 69° quedaron altas) **[medido]**.

---

## 8. Tabla completa de métricas del set

Re-medido el 2026-09-19 sobre los plates (`*-plate.png`, sin firma). Columnas: Lm = L* media; Q = % quemado;
A = % aplastado; Con = contraste; Cp95; Disp = dispersión de tono; bA/bS = b* altas/sombras; Az/Na/Li = área
azul/naranja/lima; Piel = L/C. Logo = color y contraste peor caso de la corrida histórica con `LOGO=0.15` (la firma vigente usa `0.20`). Lecho = `max`/`p99`/`lum` de
Sobel en la caja estándar x 0,30–0,70 × y 0,87–0,995 **[medido]**.

### 8.1 Set curado de 12 (`curado/set-curado-12.jpg`)

| Pieza (ruta del plate) | Lm | Q | A | Con | Cp95 | Disp | bA | bS | Az | Na | Li | Piel | Logo | Lecho max/p99/lum |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|---|---|
| `impacto/I1-harina` | 24 | 0,71 | 10,4 | 80 | 24 | 24 | 4,2 | 0,4 | 0,2 | 0,09 | 0 | 46/22 | blanco 19,9:1 | 9/6/8 |
| `cruce/X1-final` (pipeline, pantalla curada) | 42 | 1,31 | 0,1 | 87 | 30 | 52 | 7,2 | 2,1 | 0,1 | 0,01 | 0,49 | 46/29 | blanco 18,8:1 | 13/8/14 |
| `curado/K1-kv-cafe` | 62 | 0,33 | 0,2 | 79 | 31 | 28 | 3,4 | 4,1 | 0,9 | 0,12 | 0 | 54/27 | navy 8,9:1 | 12/6/234 |
| `cruce/X3-reflejo-dorado` | 36 | 0,14 | 0,0 | 71 | 35 | 17 | 21,3 | −0,2 | 0,4 | 0 | 0,01 | 47/24 | blanco 18,2:1 | 14/7/19 |
| `impacto/I3b-marco` | 25 | 0,54 | 1,2 | 69 | 17 | 14 | 7,5 | 1,8 | 0,5 | 0 | 0,01 | 45/27 | blanco 16,8:1 | 12/7/23 |
| `curado/K2b-retail-bebidas` | 43 | 1,64 | 9,2 | 92 | 34 | 36 | 3,9 | 1,2 | 3,5 | 0 | 0 | 48/26 | blanco 19,6:1 | 22/11/8 |
| `cruce/X4-tiltshift-mediodia` | 54 | 0,15 | 1,7 | 88 | 29 | 75 | 3,2 | −0,9 | 1,5 | 0,05 | 0,10 | 51/25 | navy 9,3:1 | 24/14/235 |
| `palancas/M1-movimiento` | 36 | 2,84 | 1,7 | 91 | 41 | 59 | 1,6 | 1,5 | 1,5 | 1,02 | 0,04 | 50/27 | blanco 19,1:1 | 16/9/14 |
| `impacto/I5-retrato-persianas` | 46 | 1,38 | 3,4 | 93 | 25 | 69 | 4,3 | 0,4 | 1,1 | 0 | 0 | 57/27 | navy 8,5:1 | 17/11/238 |
| `curado/K3-noche` | 16 | 0,05 | 7,1 | 49 | 30 | 69 | 18,1 | 0,4 | 0,7 | 0 | 0 | 50/28 | blanco 18,4:1 | 15/9/15 |
| `impacto/I4-escala` | 56 | 0,02 | 0,3 | 57 | 71 | 52 | −4,4 | 1,9 | 18,4 | 0 | 0 | — | navy 4,9:1 | 13/8/183 |
| `palancas/R1-retrato-polo` | 54 | 0,18 | 1,7 | 85 | 31 | 56 | 11,7 | −6,2 | 0,0 | 0 | 0 | 59/29 | navy 8,1:1 | 15/8/223 |

Observaciones: M1 quema 2,84 % (mercado a pleno sol, aceptado como contraluz lateral); R1 tiene b* sombras −6,2
(sombra del marco de ventana levemente fría; vigilar); I4 es el contraste de logo más bajo del set (4,9:1, pasa).

### 8.2 Cámaras (`rondas/camaras/`) y otras palancas

| Pieza | Lm | Q | A | Con | Cp95 | Disp | bA | bS | Az | Na | Li | Logo | Lecho max/p99/lum |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|---|
| `camaras/1-ojo-de-pez` (grupo 8 mm) | 58 | 1,55 | 0,3 | 75 | 21 | 45 | −0,7 | −2,9 | 1,1 | 0,12 | 0 | navy 5,3:1 | 15/9/184 |
| `camaras/2-drone-cenital` | 60 | 0,01 | 0 | 57 | 61 | 51 | 3,6 | −0,7 | 35,8 | 0,18 | 0,19 | navy **3,1:1 falla** | 182/102/189 |
| `camaras/2b-drone` (pavimento casi blanco) | 65 | 0,01 | 0 | 65 | 59 | 84 | 3,1 | −6,2 | 24,7 | 0,06 | 0,01 | navy 7,5:1 | 89/35/224 |
| `camaras/3-tilt-shift` | 52 | 0,04 | 0,9 | 81 | 31 | 26 | 11,2 | 1,3 | 0,7 | 0,08 | 0,21 | navy 7,8:1 | 15/8/220 |
| `camaras/4-contrapicado` | 42 | **6,51** | 0 | 93 | 48 | 86 | 0,0 | −2,0 | 17,0 | 0 | 0 | blanco 17,3:1 | 13/7/24 |
| `camaras/5-reflejo` | 52 | 0 | 0 | 80 | 19 | 41 | 1,1 | −0,7 | 0,3 | 0 | 0,43 | blanco 17,5:1 | 12/7/23 |
| `camaras/6-tele-200` | 36 | 0,06 | 0 | 69 | 42 | 70 | 10,3 | −2,6 | 7,0 | 0,11 | 0 | blanco 16,8:1 | 13/7/27 |
| `impacto/I2-set-azul` | 37 | 0,05 | 0,3 | 79 | 58 | 30 | 1,6 | −1,1 | 52,1 | 0 | 0 | blanco 19,0:1 | 10/6/14 |
| `impacto/I6b-objeto` (sin personas) | 71 | 0 | 1,8 | 81 | 15 | 27 | 8,7 | −0,8 | 3,1 | 0 | 0 | navy 7,0:1 | 13/8/208 |
| `palancas/R2-retrato-cdmx` | 37 | **3,05** | 5,6 | 90 | 29 | 43 | 4,3 | 0,1 | 0 | 0 | 0 | navy 6,2:1 | 35/13/198 |
| `palancas/T1-macro-pintura` | 63 | 0,09 | 0,1 | 71 | 57 | 51 | 5,8 | −37,7* | 43,3 | 0 | 0 | navy 8,7:1 | 11/6/230 |
| `oficio3/C3-kv` | 65 | 0,05 | 0 | 81 | 45 | 92 | 6,7 | −2,2 | 17,2 | 0,12 | 0 | navy 8,6:1 | 13/8/226 |
| `oficio3/4b-lima` | 72 | 0,16 | 1,0 | 85 | 28 | 75 | 0,0 | 1,0 | 3,5 | 0,26 | 0,01 | navy 8,3:1 | 14/8/227 |
| `oficio3/2-gondola-cdmx-v2` | 42 | 2,43 | 0 | 83 | 37 | 55 | −0,4 | −3,5 | 5,4 | 0,08 | 0 | blanco 15,7:1 | 14/9/31 |
| `oficio3/1-aeo-miami-final-plate` | 60 | 0,37 | 0,2 | 81 | 56 | 82 | −3,6 | **−11,7** | **15,9** | 0 | 0,03 | navy 6,9:1 | 12/8/205 |
| `oficio2/A-rodaje-macro` | 32 | 0,79 | 5,3 | 75 | 43 | 48 | 1,8 | 0,2 | 3,5 | 0,98 | 0 | blanco 18,2:1 | 18/9/10 |

\* En T1 las sombras son la propia pintura azul húmeda: el b* sombras negativo es el material, no un tinte.

### 8.3 Personas (`rondas/personas/`)

| Pieza | Lente | Lm | Q | A | Con | Cp95 | Disp | bA | bS | Az | Piel | Logo | Lecho max/p99/lum |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|---|---|
| `J1-retrato` (persianas) | 135 | 45 | 0,10 | 1,0 | 84 | 34 | 27 | 11,5 | −0,1 | 1,0 | 65/28 | navy 5,3:1 | 27/18/195 |
| `J2-rodaje-polo` (contrapicado) | 24 | 38 | **5,23** | 0,5 | 93 | 24 | 81 | −0,3 | −0,8 | 0 | 53/24 | blanco 18,6:1 | 13/8/16 |
| `J3-escenario` | 200 | 28 | 0,36 | 4,5 | 72 | 59 | 61 | −3,6 | −0,1 | 23,5 | 53/30 | blanco 15,1:1 | 17/9/16 |
| `JN1-mesa` | 50 | 49 | 2,10 | 0,3 | 85 | 33 | 31 | 1,2 | 3,9 | 1,8 | 52/26 | blanco 13,8:1 | 14/9/39 |
| `JN2-podcast` | 135 | 32 | 0,08 | 0,1 | 75 | 34 | 58 | 11,7 | −0,3 | 4,5 | 57/28 | blanco 19,0:1 | 23/9/14 |
| `JN3-calle` | 200 | 40 | 0,36 | 0,1 | 68 | 26 | 53 | 9,7 | −0,7 | 0 | 51/23 | blanco 12,7:1 | 22/13/53 |
| `N1-ojo-pez` (a ras, 10 mm) | 10 | 62 | 1,17 | 0,3 | 81 | 23 | 45 | 2,2 | 1,4 | 0,5 | 50/22 | blanco **3,7:1 falla** | 18/12/**127** |
| `N1b-ojo-pez` (fuerte, 8 mm) | 8 | 62 | 2,34 | 0 | 82 | 21 | 35 | 0,3 | 2,0 | 0,1 | 55/22 | navy 6,2:1 | 28/21/186 |
| `N2-reflejo` | 50 | 46 | 2,27 | 0 | 85 | 27 | 18 | 6,8 | −1,0 | 0,1 | 54/24 | blanco 9,5:1 | 42/13/56 |

Lecturas: la piel se mantuvo en L 50–65 / C 22–30 en las cinco tomas de Julio y las de Nexa **[medido]**. J1 tiene la
piel más luminosa (65) por el haz de sol directo. Los lechos con `max` > 25 (J1, N1b, N2, R2) conviene revisarlos al
zoom: la caja estándar puede tocar bordes del sujeto; la medición de sesión usó cajas ajustadas por pieza.

---

## 9. Casos antes / después con números

| # | Problema | Antes | Después | Fix | Fuente |
|---|---|---|---|---|---|
| 1 | Blancos azulados | `oficio3/4-lima-sin-personas` b* altas −7,2 | `oficio3/4b-lima` 0,0 | Bloque WB/exposición | §5.2 |
| 2 | Prueba quemada | `oficio2/C2-kv-limpio` 31,52 % | `oficio3/C3-kv` 0,05 % | Mesa de luz atenuada + exponer para altas luces | §5.2 |
| 3 | Noche aplastada | `palancas/N1-noche` 18,5 % | `curado/K3-noche` 7,1 % | «shadows deep but ALWAYS with visible texture» | §5.4 |
| 4 | Contraluz quemado | `cruce/X2-gondola-contraluz` 9,55 % | `curado/K2b-retail-bebidas` 1,64 % | «exterior and highlights keep detail (no pure white areas)» | §5.5 |
| 5 | Logo sin contraste (dron) | `camaras/2-drone-cenital` navy 3,11:1 (pavimento gris medio) | `camaras/2b-drone` 7,50:1 | Pavimento «very pale, almost white limestone» | [Firma](./EFEONCE_PHOTO_SIGNATURE_FOREGROUND_V1.md) |
| 6 | Logo sin contraste (lecho tono medio) | `personas/N1-ojo-pez` 3,70:1, lum lecho 127 | `personas/N1b-ojo-pez` 6,16:1, lum 186 | «bleached pale oak … the brightest surface in the lower frame» | [Firma](./EFEONCE_PHOTO_SIGNATURE_FOREGROUND_V1.md) |
| 7 | Grade tiñe sombras | `ejemplos/ej1` b* sombras −4,7 | (grade) −16,0 → **se descartó el grade** | — | §4 |
| 8 | Lámparas encendidas | `paleta/P2-podcast` b* altas +20,1 | Regla: lámparas apagadas | — | §5.3 |

---

## 10. Vocabulario de prompt: qué funciona y qué no

### 10.1 HEX en el prompt se interpreta laxo

El modelo trata el HEX como una **intención de familia**, no como un valor: el azul tinta pedido en `paleta/P1` salió
con L* 7–8 contra el 16,6 del tinta real (C/L 1,95), con ΔE 15–19 respecto del pedido **[medido por el subagente de
colorimetría]**. Regla **[criterio]**:

- **Acentos vivos** (azul activo, naranja, lima): el HEX ayuda, acompañado de un nombre («bright azure blue
  (#0375DB)», «signal-orange (#F55D01)», «lime (#6EC207)»).
- **Superficies grandes y oscuras** (tinta, navy): pedir **por material**, no por HEX.

### 10.2 Frases que funcionaron

| Objetivo | Frase (verbatim de la corrida) |
|---|---|
| Pared tinta | «a dusty, matte, very deep ink blue (like dark blue-black fountain-pen ink, desaturated, low sheen, NOT electric blue, NOT royal blue, NOT glossy lacquer)» |
| Sin grade | «Natural true-to-life color with no color grading; highlights keep detail, shadows open» |
| Azul como acento | «ONE vivid accent of bright azure blue (#0375DB) from light or a single object (never walls), covering only a small part of the frame» |
| Balance | «warm-neutral daylight (about 5200K), whites very slightly warm, never bluish; shadows neutral, never blue» |
| Exposición | «exposed for the highlights, bright surfaces keep texture and detail» |
| Contraluz | «the exterior and highlights keep detail (no pure white areas)» |
| Noche | «shadows deep but ALWAYS with visible texture and detail … (no pure black areas)» |
| Lecho claro | «VERY LIGHT … almost white … the brightest surface in the lower frame» |
| Lecho oscuro | «DARK near black; its center calm and even» |
| Paleta sin azul en sala cálida | «a single warm-neutral tonal family of limewashed stone-grey plaster, travertine, pale oak, oatmeal linen and off-white paper; NO blue elements in the room at all» |

### 10.3 Frases que no funcionaron o se retiraron

| Frase | Problema |
|---|---|
| HEX solo para paredes (`#022A4E`) | Tono más oscuro y saturado que el pedido |
| «lived-in clutter (cables, tape, mugs, scraps)», «coffee rings», «fingerprints and smudges» (realismo v1) | Suciedad; el operador lo rechazó («tanto desorden y suciedad tampoco se ve bien») |
| Lecho sin tono declarado («the near edge of the table») | Madera de tono medio (lum 139–171) → logo sin contraste |
| «No orange objects» + naranja pedido en otra línea | Contradicción; se reemplazó por «at most ONE small story accent described in the scene» |
| Lámparas prácticas encendidas | b* altas +20, look de stock |

---

## 11. Cómo corregir: regenerar o corrección técnica

| Situación | Acción | Por qué |
|---|---|---|
| Blancos azulados, sombras azules, grade aparente | **Regenerar** con el bloque WB/exposición | El color natural no se fabrica con curvas sin que se note |
| Quemado > rango del contexto | **Regenerar** pidiendo detalle en altas luces | Lo quemado no tiene información que recuperar |
| Aplastado > rango | **Regenerar** con la regla de noche o «shadows open» | Ídem |
| Lecho de tono medio o nítido | **Regenerar** declarando tono y «so close … no visible edges» | Es la firma; ver [Firma](./EFEONCE_PHOTO_SIGNATURE_FOREGROUND_V1.md) |
| Azul intermedio en ropa grande | **Regenerar** reduciendo la prenda o moviendo el azul a objeto/luz | Regla de dos modos |
| Acento repetido (taza azul) | **Regenerar** cambiando el portador | Sesgo de serie |
| Desvío leve y global de exposición (< ⅓ de paso) en un master aprobado | **Corrección técnica mínima** permitida (exposición global), sin tocar tono ni saturación | [decisión del operador]: «corrección técnica mínima sólo si es imprescindible» |
| Cualquier otra cosa | Regenerar | — |

Nunca: aplicar LUT, curvas de color, split-toning o el grade V0 **[decisión del operador]**.

---

## 12. Pendientes

| # | Pendiente |
|---|---|
| 1 | Validar los rangos colorimétricos por contexto en 9:16 y 16:9; existen plates nativos, pero esta tabla de métricas se midió en 4:5 **[pendiente]** |
| 2 | Contrapicado hacia tragaluz: probar «skylight keeps detail» para bajar el quemado de 5–6,5 % **[pendiente]** |
| 3 | Promover `metricas.cjs` y `medir.mjs` a comando `pnpm` con umbrales por contexto **[pendiente]** |
| 4 | Prueba de reconocimiento (n ≥ 100) antes de llamar a la colorimetría «activo distintivo» **[pendiente]** |
