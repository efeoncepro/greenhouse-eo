# Firma fotográfica Efeonce V1 — primer plano planeado y logo

> **Tipo de documento:** Especificación técnica y funcional de marca
> **Versión:** 1.0
> **Creado:** 2026-09-19 por Claude
> **Última actualización:** 2026-09-20
> **Estado:** Aprobado por el operador el 2026-09-19 (con pendientes en §8)
> **Documentación relacionada:** [Lenguaje fotográfico V1](./EFEONCE_PHOTOGRAPHIC_LANGUAGE_V1.md) · [Cámaras](./EFEONCE_PHOTO_CAMERA_LENS_ANGLE_CATALOG_V1.md) · [Colorimetría](./EFEONCE_PHOTO_COLORIMETRY_V1.md) · [Prompts y pipeline](./EFEONCE_PHOTO_PROMPT_BLOCKS_AND_PIPELINE_V1.md) · [Marca en escena (regla previa)](../../../.claude/skills/social-media-studio/references/brand-in-scene.md) · [Bitácora](../social/2026-09-19-efeonce-photographic-language-production-method.md) · Scripts `ai-generations/2026-09-19_lenguaje-fotografico-efeonce/scripts/{medir.mjs,componer.mjs}`

Convenciones: **[medido]** · **[decisión del operador]** · **[criterio]** · **[pendiente]**.

## 1. Principio

> «un leve desenfoque que consista en un elemento superpuesto entre la cámara y adonde va a enfocar como excusa para
> que allí siempre vaya el logo que va en el centro; el objeto NO debe ser forzado sino planeado y natural desde el
> inicio» — Julio Reyes, 2026-09-19 **[decisión del operador]**

La firma de Efeonce es una **combinación**: un primer plano desenfocado que pertenece a la escena y el logo oficial
centrado sobre ese primer plano. El primer plano:

1. Es una **herramienta o superficie propia del oficio o de la escena** que está entre la cámara y el sujeto: el borde
   de la mesa del cliente, el matte box del rig, la consola de color, la mesa de luz, la maleta de equipo.
2. Se **planifica en la toma** (en el prompt, como parte del punto de vista), nunca se añade después.
3. Cruza **todo el ancho** del borde inferior, con desenfoque **gradual** y tono **declarado**.
4. Sostiene el logo sin que el ojo lea que existe para sostenerlo: tiene razón de estar.

La lectura para quien mira: **la foto está tomada desde un lugar en el trabajo** (el asiento del cliente, detrás de la
cámara del rodaje, junto a la consola). Eso conecta la firma con el Why de co-creación («lo construimos contigo») sin
decirlo **[criterio]**.

## 2. Catálogo de lechos

Texto de prompt: se usa la plantilla canónica (§3) cambiando `<objeto>` y `<tono>`. Las mediciones son de la corrida
del 2026-09-19. «p99» = percentil 99 del gradiente Sobel dentro del lecho (`medir.mjs`); el rostro típico mide
200–780 de máximo.

| Lecho | Cuándo usarlo | Tono | `<objeto>` en el prompt (verbatim de la corrida) | Resultado |
|---|---|---|---|---|
| Borde cercano de la mesa, a ras del lente («asiento en la mesa») | Co-creación, sesiones, revisión con el cliente. Base del sistema | Declarar siempre: claro u oscuro | `the edge of the pale oak table on the camera side` / `the client's side of the oak table` / `the dark walnut corner of the meeting table` | Funciona en claro y oscuro; con madera de tono medio falla el contraste (§4.3) |
| Respaldo de la silla del espectador («tu lugar en la mesa») | Presentación, sala; la silla vacía es el lugar del cliente | Oscuro (tela carbón) o gris cálido | `the TOP OF THE BACKREST OF THE EMPTY CHAIR in front of the camera, dark charcoal fabric upholstery, a soft gentle curve (not a straight line)` | Ronda `asiento/B` |
| Escritorio del visitante | Retrato de una persona sentada | Claro | `the NEAR EDGE OF THE DESK on the visitor's side, a calm, empty, continuous light oak surface` | Ronda `asiento/C`, `C2` |
| Matte box / rig de cámara | Rodaje, audiovisual, Run & Gun | Oscuro, casi negro | `the matte-black matte box of the cinema camera rig we shoot past` | `oficio/01-rodaje`: logo blanco |
| Consola de corrección de color | Postproducción | Oscuro | `the edge of the dark grading control panel with its trackballs` | `oficio/02-color` |
| Borde de la mesa de luz | Arte, revisión de pruebas impresas, KV | Muy claro, luminoso | `the glowing near edge of the white light table surface` | `oficio/03-kv`: logo navy |
| Fila de latas o botellas en el estante cercano | Retail, góndola, bebidas | Oscuro | `the lens is almost touching a row of plain dark glass bottles on the near low shelf, shot wide open at f/1.4, so they dissolve completely into a smooth, abstract, creamy dark blur with no shapes, highlights, edges or details at all` | Falló 2 veces con la redacción corta: p99 90 y 47 **[medido]**. Exige «casi tocando el lente, f/1.4, sin bordes» |
| Asa de carro de supermercado | Retail, comprador | Oscuro carbón | `the dark charcoal handle of a shopping cart` | Ronda `oficio/05-gondola` |
| Mesa alta o marco del vidrio | Estrategia, journey sobre vidrio, reflejo | Oscuro | `the lower frame of the glass wall (matte charcoal mullion and sill)` / `the dark walnut edge of a standing high table in the corridor` | `camaras/5-reflejo`, `personas/N2` |
| Consola del pasillo | Marco dentro del marco | Oscuro | `the edge of a low dark walnut console in the corridor` (pedir `dissolves into a soft abstract dark blur`) | `impacto/I3b-marco` |
| Maleta de equipo en el piso | Contrapicado, dirección en rodaje | Oscuro, casi negro | `a matte-black equipment case on the floor right in front of the lens` | `camaras/4-contrapicado`, `personas/J2` |
| Techo de un auto sin logos | Tele 200 mm en calle | Oscuro | `the roof of a plain dark-grey passing car (no logos)` | `camaras/6-tele-200`, `personas/JN3` |
| Cabezas del público | Escenario, charla (tele 200 mm) | Siluetas oscuras | `the heads and shoulders of the audience in the front rows` | `personas/J3` |
| Parte superior de la cámara de estudio | Podcast propio | Oscuro, casi negro | `the matte-black top of the studio camera we shoot past` | `personas/JN2` |
| Hombro y espalda del fotógrafo | Sesión de fotos, set | Oscuro | `the dark shoulder and back of the photographer's black T-shirt, whose camera points at the model` | `impacto/I2-set-azul` (luego fuera del set por ser pintura) |
| Borde del mostrador de fruta | Mercado, gastronomía | Oscuro (madera en sombra) | `the out-of-focus edge of a fruit stall counter with dark wood` | Mercado del set curado |
| Piso de concreto pulido | Escala, espacio | Muy claro | `the pale polished concrete floor close to the lens` | `impacto/I4-escala` |
| Borde de plinto de yeso | Objeto, bodegón | Muy claro | `the edge of the pale plaster plinth` | `impacto/I6b-objeto` |
| Desenfoque óptico del tilt-shift | Rodaje de calle visto desde balcón | Muy claro (pavimento al sol) | `the pale sunlit pavement dissolved in the tilt-shift blur` | **Mejor lecho natural** **[criterio]**: 7,8–9,3:1 **[medido]** |
| Borde curvo de la mesa en ojo de pez | Taller, energía | Muy claro, «almost white» | `the curved near edge of the pale oak table` + `VERY LIGHT, bleached pale oak lit directly by daylight, almost white, the brightest surface in the lower frame` | N1b 6,16:1; N1 original 3,70:1 (tono medio, falló) **[medido]** |
| Dron cenital (sin lecho) | Activación, evento | Muy claro | Pavimento sereno claro (no hay desenfoque) | Excepción: 3,11:1 → 7,5:1 al pedir pavimento casi blanco, pero la franja se ve algo puesta **[pendiente, §8]** |

## 3. Plantilla del prompt FOREGROUND

Evolución observada en los `batch*.json` de la corrida:

| Versión | Redacción | Problema |
|---|---|---|
| 1 (`asiento/`) | «the near edge of the table … renders as a strongly out-of-focus soft band across the ENTIRE width of the bottom 13%» | Invita a una banda |
| 2 (`territorios/`, `v2/`) | «planned from the start, part of the point of view … falls out of focus GRADUALLY with a smooth, natural optical falloff over the bottom quarter» | Correcto en intención; tono no siempre declarado |
| 3 (`oficio/`) | «planned, a real tool of this craft that naturally sits between the camera and the subject … bottom 20% … GRADUALLY (smooth optical falloff, never a hard band)» | Ancla el lecho en el oficio |
| 4 (vigente, `camaras/` en adelante) | Ver abajo | — |

Plantilla vigente:

```text
FOREGROUND (planned): <objeto>, so close to the lens that it dissolves into a soft abstract blur with no visible
edges or details, spanning the ENTIRE width of the bottom 18% of the frame (never a hard band), <tono>; its center
calm and even.
```

`<tono>` se escribe siempre y en mayúsculas: `DARK near black`, `DARK in shadow`, `DARK charcoal`,
`VERY LIGHT, … almost white`. Nunca se deja el tono al modelo.

## 4. Reglas medibles

### 4.1 Nitidez del lecho

| Regla | Umbral | Cómo se mide |
|---|---|---|
| Lecho desenfocado | p99 ≤ ~20 (máximo ≤ ~25), muy por debajo del rostro (200–780) **[medido]** | `node scripts/medir.mjs <plate> '{"lecho":[x0,y0,x1,y1],"rostro":[...]}'` con cajas en fracción del lienzo. Imprime máximo, p99 y luminancia media |
| Caja limpia | La caja del lecho no toca manos, bordes de mesa ni planos en foco | Una caja que toca un plano en foco dispara el número y miente (lección previa en `brand-in-scene.md`: 278 en una caja que tocaba la mesa) |
| Si falla | p99 > ~20 → regenerar con redacción más fuerte, nunca desenfocar en post | Caso latas/botellas: p99 90 y 47 hasta pedir «almost touching, f/1.4, no edges» |

### 4.2 Transición

| Regla | Umbral | Evidencia |
|---|---|---|
| Transición gradual entre lecho y escena | ≥ 5% del alto **[criterio]** | El subagente de composición midió cortes de 1–3% del alto que se leían como «banda» |
| Nunca una franja recta | «never a hard band» en el prompt | Los cinco soportes rechazados del 2026-09-17 (§7) |

### 4.3 Tono del lecho

- El tono **se declara siempre** («DARK near black» o «VERY LIGHT almost white»).
- **Fallos [medido]:** 6+ piezas con madera de tono medio (luminancia media 139–171 de 255): el logo no pasaba 4,5:1
  ni en blanco ni en navy. N1 original (ojo de pez, borde de mesa en tono medio): 3,70:1.
- Corrección: regenerar con el tono declarado. N1b (mismo ángulo, mesa «almost white»): 6,16:1.

### 4.4 Variación en el feed

Un feed con el mismo lecho repetido se lee como una banda de marca. **Alternar lechos claros y oscuros y cambiar de
material** entre piezas consecutivas (hallazgo del revisor adversarial) **[criterio]**.

## 5. El logo

| Parámetro | Valor | Fuente |
|---|---|---|
| Archivo | SVG oficial: `public/branding/logo-negative.svg` (blanco) o `public/branding/logo-full.svg` (navy `#023c70`) | Nunca generado por el modelo |
| Composición | Determinística con `scripts/componer.mjs` (sharp), rasterizado a densidad 600 | — |
| Posición horizontal | Centrado | `left = (W − ancho) / 2` |
| Posición vertical | Centro del logo ≈ **94%** del alto (4:5) | `top = 0,94·H − alto/2`. Las piezas al 20% usaron 94% (territorios) y 91,5% (asiento); las de personas, 93,5% |
| Ancho | **20% del lado corto** del lienzo | Cerrada la revisión: el operador eligió 20% el 2026-09-20 sobre piezas con identidad **[decisión del operador]**. Ver el delta de abajo: la frase «al 20% se leía como sello» no describía lo aprobado |
| Proporción | Alto = ancho × 196,68 / 837,07 (proporción del SVG) | `componer.mjs` |
| Color | Por contraste medido: blanco contra el píxel **más claro** del área del logo; navy contra el píxel **más oscuro**; gana el mayor | `componer.mjs` calcula ambos con luminancia relativa WCAG |
| Contraste mínimo | **≥ 4,5:1** | Si ninguno pasa, se regenera el plate (no se oscurece el lecho en post) |
| Rango logrado | **4,9–20,2:1** **[medido]** en las piezas aprobadas | Salida del script por pieza |
| Nitidez | Ninguna degradación: el desenfoque es del lecho, la marca se lee | `brand-in-scene.md` |
| Apariciones | Una por pieza | — |

Uso:

```bash
LOGO=0.20 node ai-generations/2026-09-19_lenguaje-fotografico-efeonce/scripts/componer.mjs <plate.png> <final.png>
# salida: <final.png> logo blanco|navy <contraste>:1
```

## 6. Cuándo NO firmar

| Caso | Por qué | Qué hacer |
|---|---|---|
| Un emblema bordado se lee a tamaño de consumo (polo del equipo) | Dos marcas compiten; **una sola marca protagonista por foto** | Pieza sin logo compuesto. Nota: las grillas de exploración `personas/julio-nexa-firmadas.jpg` (J2) y `curado/set-curado-12.jpg` (retrato con polo) muestran esas piezas firmadas; la versión publicable va **sin** firma **[criterio derivado de la regla]** |
| Un 3D de marca es protagonista (nave o logo 3D) | La marca ya es el sujeto | Sin firma (grilla V2, pieza de la nave) |
| Otra marca es protagonista | Una sola marca protagonista | No firmar o no producir |
| Toma todo enfocada (dron) | No hay lecho real | Excepción abierta **[pendiente]** |

## 7. Selección colaborativa AXIS

Recurso distintivo complementario: cursores con nombre y caja de selección de ocho tiradores **sobre el objeto real**
de la escena, como en una herramienta de diseño multiplayer. Muestra la co-creación en vivo.

| Tema | Regla |
|---|---|
| Frecuencia | ~1 de cada 3 piezas **[criterio]**; no en todas |
| Renderer | Oficial: `resolveCollaborationSelectionIntent` (`@efeoncepro/axis-ui-contracts`) + `renderCollaborationSelection` (`scripts/creative/layout-compiler/axis-advertising.mjs`). Nunca dibujado a mano |
| Etiquetas | Convertidas a trazos con fontkit (Poppins Bold); el script aborta si queda un `<text>` |
| Escala | `CSCALE` (por defecto 1,8) para los colaboradores, 1,2 para el cursor local |
| Padding | `padding: 'compact'` disponible para objetos ajustados |
| Textos | Cortos: Arte, Cliente, SEO, RevOps, Nexa, Dirección de arte |
| Nombre de cliente | **Nunca** un cliente real. Se corrigió «Berel» → «Cliente» |
| Anclas | Hacia el espacio libre de la escena. Anclas hacia el borde sacaron las etiquetas del lienzo; el script aborta si `withinCanvas` es falso |
| Dónde funciona | Mejor sobre objetos grandes (prueba impresa en `oficio/03-kv`) que sobre UI pequeña (la tarjeta del pipeline se recargó) |

Colores de cursor por rol:

| Rol | Color | Lógica |
|---|---|---|
| Cliente | Lima `#6EC207` | Aprueba = resultado |
| Arte / Dirección de arte | Naranja `#F55D01` | La idea |
| RevOps / Efeonce | Azul `#0375DB` | La casa |
| Nexa | `#d6246e` | Personaje propio |
| SEO | Teal `#12afa2` | Secundario de la paleta |

Nota de coherencia: en `oficio/oficio-a-la-vista.jpg` la etiqueta «Cliente» aparece en teal y «Dirección de arte» en
azul; esa ronda es anterior a la asignación de colores por rol, que es la vigente.

## 8. Pendientes

- Firma en dron y tomas todo-enfocadas: decidir si se usa una firma alternativa (url-lum) **[pendiente]**.
- Ajuste de la posición del logo en 9:16 y 16:9 sobre piezas finales, y validación de 1:1 **[pendiente]**. Las
  propuestas históricas de lecho anteriores a `foto:prompt` no sustituyen los valores medidos: 18%, 22% y 16%.
- Convivencia con el espacio para texto que pidió el operador **[pendiente]**.
- Promover `medir.mjs` y `componer.mjs` a comando `pnpm` **[pendiente]**.

## 9. Relación con `brand-in-scene.md`

La regla previa ([`brand-in-scene.md`](../../../.claude/skills/social-media-studio/references/brand-in-scene.md),
§«Primer plano desenfocado como lecho de la marca», 2026-09-17) nació de una pieza ya fotografiada («¿Claude o
Codex?»), donde se aprendió que añadir un objeto a posteriori se lee forzado.

| Tema | Regla previa (2026-09-17) | Esta firma (2026-09-19) |
|---|---|---|
| Momento | Medir el plate terminado y **no añadir objeto** si la superficie ya está desenfocada | El primer plano **se planifica en el prompt** desde la toma: no hay plate «sin primer plano» |
| Objeto | Añadir sólo si la medición lo exige, con reglas de forma | El objeto es una herramienta o superficie del oficio; si el plate no lo trae desenfocado, se regenera, no se añade |
| Medición | Gradiente máximo en el lecho vs rostro | Se mantiene (p99 y máximo con `medir.mjs`) |
| Color del logo | Por luminancia del lecho | Se mantiene, con umbral 4,5:1 y cálculo contra el píxel extremo |
| Límites | Una aparición, nunca sobre la cara | Se mantienen |
| Máscara | La máscara no preserva píxeles | Se mantiene |

Se mantienen **prohibidos** los cinco soportes rechazados el 2026-09-17, porque existen sólo para sostener la marca:

| Soporte rechazado | Por qué |
|---|---|
| Panel de acrílico al costado | Choca con la cara y con el gesto |
| Franja de acrílico de borde a borde | «Una franja forzada para desenfocar» |
| Tapa de portátil asomando sobre la mesa | «Se ve como un cuadrado allí» |
| Hojas sólo en la esquina inferior izquierda | No está donde va la marca |
| Follaje cruzando todo el borde inferior | «Parece una selva forzada» |

Actualizar `brand-in-scene.md` para apuntar a esta firma corresponde al agente que mantiene las skills.

## Delta 2026-09-19 — la caja de selección tiene propósito, no decoración

**Decisión del operador:** «hay reglas para usar el bounding box: no se pone en cualquier parte, se usa con un
propósito, para seleccionar un objeto o texto para hacer énfasis, no solo por colocar y ya».

| Regla | Detalle |
|---|---|
| **Hay objeto o no hay caja** | La caja enmarca **algo con sentido**: la obra que se está co-creando, la pieza en revisión, el resultado que alguien aprueba, o **una palabra del titular** a la que se hace énfasis. Si la foto no tiene ese objeto aislado, **no va selección** |
| **Nunca sobre el vacío** | Enmarcar una zona vacía de la mesa o un recorte arbitrario es decoración: se retira |
| **Nunca sobre una persona** | Ni sobre su cara ni recortándola; las personas no son objetos que se seleccionan |
| **El objeto se elige en la ficha de toma** | El plate se pide con ese objeto aislado y con aire alrededor para la caja y las etiquetas; no se busca «dónde poner la caja» al componer |
| **Quién selecciona dice algo** | Cliente + Efeonce sobre la misma pieza = co-creación; un solo cursor = revisión o presencia; el cursor local = el espectador |
| **Verificación** | `componer-foto.mjs` falla si la caja o una etiqueta se salen del lienzo; el objeto y el sentido los valida una persona |

Casos de esta ronda **[medido/visto]**: en 4:5 la caja enmarca la palabra «donde» del titular (énfasis, igual que en
el carrusel de GTA VI, donde enmarcaba la decisión); en la pieza de co-creación enmarca **las láminas impresas** que
ambos están mirando, con «Cliente» y «Efeonce» sobre la misma obra; en 16:9 se **retiró** porque no había objeto
aislado y caía sobre la cara de una persona.


## Delta 2026-09-20 — el tamaño de la firma tenía dos poblaciones **[medido]**

Al producir tres piezas con identidad el operador dijo que la firma se veía chica. Medido por diferencia
plate↔firmada sobre **sus propias piezas aprobadas** del 2026-09-19:

| Ronda aprobada | Ancho del logo | Centro vertical |
|---|---|---|
| Personas (J1, J3, JN1, N2) | 15,0% | 93,5% |
| Territorios (T1, T1b, T2) | **20,0%** | 94,0% |
| Asiento (A-mesa, B-silla) | **20,0%** | 91,5% |
| Asiento (C2-escritorio) | **20,0%** | 93,4% |

Este documento afirmaba que se bajó a 15% «porque al 20% se leía como sello o marca de agua». **Eso no describía
lo aprobado:** más de la mitad de las piezas firmadas que el operador aprobó están al 20%. La causa no fue una
decisión sino un accidente de herramienta: `scripts/firmar.mjs` tiene `0.2` por defecto y `scripts/componer.mjs`
tenía `0.15`, así que el tamaño dependía de qué script corrió cada ronda.

**Decisión del operador, 2026-09-20: 20%.** Evidencia de la comparación (las mismas tres piezas firmadas a 15% y
a 20%): `ai-generations/2026-09-20_identidad-julio-nexa/final/` y `final-20/`.

El default de `componer.mjs` se alineó a `0.20` el 2026-09-20. `firmar.mjs` ya usaba `0.20`; se recomienda pasar
`LOGO=0.20` explícito en cualquier receta para que la decisión quede visible.
