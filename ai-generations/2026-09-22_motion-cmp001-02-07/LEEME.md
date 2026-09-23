# CMP-001 · Motion de los pilotos 02–07 — paquete de preparación

> **Estado (2026-09-22, sesión nocturna):** **preparado, nada generado, USD 0 gastado.** El operador pidió
> preparar sin gastar. Todo lo que sigue es ejecutable a la mañana con un comando por toma, previa
> aprobación del gasto.
> **Receta madre:** el piloto 01 «No fuiste tú» (aprobado 2026-09-22),
> `ai-generations/2026-09-22_motion-codex-rueda-prensa/` + su LEEME en
> `Paid Media/01. Recursos/CMP-001 - Produccion y editables/2026-09-22_SEO-AEO_motion_vocero-no-autorizado/`.
> **No autoriza publicar ni pautar.** Aprobado creativo ≠ autorizado a pautar (CDR-006 sigue Proposed).

![tablero](TABLERO-REFERENCIAS.png)
*Por fila (02→07): referencia 1 sin logo (9:16) · plate limpio · las dos referencias de sujeto.*

## 1. Qué hace cada motion: el movimiento EJECUTA la tesis

Igual que en el 01 (la barra de búsqueda que sigue vacía = «ni te preguntó nada»), cada pieza tiene **un
remate que se entiende sin sonido** y que el QA revisa primero.

| Pieza | Sujeto | Qué pasa en 15 s | 🎯 El remate (prueba sin sonido) |
|---|---|---|---|
| **02 Sin tu nombre** | Gigi con cono, teclado, monitor | Levanta el cono, salen anillos de luz, en la tarjeta se llenan **tres** entradas | La **cuarta ranura queda vacía** los 15 s |
| **03 No te leyó** | Clawd parado sobre un laptop cerrado | Gesto de «idea», la tarjeta del monitor se llena de un tirón, golpea dos veces la tapa | **La tapa nunca se abre** |
| **04 ¿Sales tú?** | Codex junto al monitor | Presenta: se encienden dos miniaturas, mira el tercer espacio punteado y se da vuelta | **El espacio punteado nunca se llena** |
| **05 ¿Te reconoces?** | Nexa, tablet y pantalla de pared | Levanta la tablet junto a la pantalla: torre de vidrio contra bodega vieja | **Las dos imágenes nunca coinciden** (ni se transforman) |
| **06 Sé la referencia** | Nexa ante la proyección | Una fila de la lista **crece** hasta ser la tarjeta azul destacada; ella levanta la vista | El crecimiento de esa única fila |
| **07 Que te elijan** | Dedo sobre la tablet, Codex mirando | El dedo duda sobre las fuentes y toca la destacada; Codex hace ojos felices un instante | El toque deliberado |

**Tono de los personajes, heredado de la lección 11 del piloto:** 02, 03 y 04 son la IA *hablando de ti sin
ti*, así que **no celebran**: Gigi está complacida y nunca mira el resultado, Clawd es expeditivo y Codex es
burocrático. **07 es la excepción deliberada:** es MOFU aspiracional (el resultado deseado), así que Codex sí
reacciona con ojos felices, y sólo por un instante.

## 2. La receta heredada y los tres deltas deliberados

**Idéntico al 01:** `h3max-r2v` 1080P 15 s · marco de **cine mudo** (room tone + foley puntual, sin score ni
voz) · **sin inductores de voz** en el texto de escena (el lint de `preparar-prompts.py` los cuenta: 0 en las
18) · cámara fija · entrada a ritmo → **sostén quieto 7,5–13 s** → fade lento → cuadro limpio = primer cuadro
(loop) · tipografía y CTA **dentro** del video, con la pieza compuesta como referencia 1 · poses del kit
pasadas como imagen, no pedidas.

**Deltas, cada uno con su causa:**

1. 🔴 **La firma se compone, no se genera.** La referencia 1 va **sin logo** (`quitar-logo.mjs` lo reemplaza
   por los píxeles del plate; fuera del logo la composición y el plate difieren 0,0–1,3/255, así que el parche no deja costura, verificado a ojo en la tira) y el prompt deja la franja inferior vacía.
   `post.sh` compone `logo-negative.svg` al **20 % del lado corto**, a la altura medida en cada estático.
   **Causa, medida esta noche:** al pasar el post por el crudo 3:4 del piloto 01 apareció un **segundo
   logotipo, dibujado por el modelo, con la órbita deformada**. El 01 se aprobó así; el canon dice «texto
   sí, marca no». `qa.py` ya lo detecta (`firma_zona_lum_pico`: 255 en ese crudo).
2. **El 3:4 se genera pensando en el recorte a 4:5.** El prompt 3:4 declara que el 4 % de arriba y el 4 %
   de abajo se van a cortar. En el 01 el recorte se validó *después* («90 px de negro medido»); acá se pide
   de antemano y `qa.py` lo mide en todo el clip.
3. **Guardas de la regla de fotografía de marca:** con **Clawd**, el cuadro se declara frío (sin esa
   declaración, una criatura cálida tiende a arrastrar la luz a ámbar retro). Con **Nexa**, el emblema del
   polo nunca se ve (el emblema bordado no se genera), el ancla de perfil aporta **sólo rostro y pelo** (lleva
   polera gris) y los labios quedan cerrados.

## 3. Referencias (todas copiadas en `refs/`, hash en `tomas.json`)

| Pieza | Imagen 1 | Imagen 2 | Imágenes 3–4 | Origen |
|---|---|---|---|---|
| 02 | compuesta sin logo | plate `p3-megafono-*-v2/v3` | Gigi `acc-03-megafono-v02` (alzado) · `-v01` (reposo) | `2026-09-21_registro-c-respuesta` · `2026-09-21_gigi-poses-3d` |
| 03 | ídem | plate `p2-expediente-*-v2/v3` | Clawd `08-idea` · `01-frente` | ídem · `2026-09-17_clawd-poses-3d` |
| 04 | ídem | plate `01-fuera-*` | Codex `08-idea` · `01-frente` | `2026-09-22_aeo-final-safe-v07` · `codex-poses-3d` |
| 05 | ídem | plate `02-reconoces-*` | recorte de Nexa del plate · `nexa-ancla-3-rostro-perfil` | ídem · `_identidad-nexa/1-anclas` |
| 06 | ídem | plate `03-referencia-*` | ídem | ídem |
| 07 | ídem | plate `04-elegida-*` | Codex `02-saludo` (ojos felices) · `01-frente` | ídem |

Las piezas compuestas salen de `03. Finales/CMP-001 - Lo que la IA dice de ti/01 - Imagenes/`.
**02 y 03 no tienen estático 1:1 aprobado** (`missing_formats` del manifiesto): su prompt 1:1 recompone
desde el 4:5, como hizo el 01.

## 4. Plan de producción y gasto (para aprobar a la mañana)

Tarifa: H3 Max 1080P **USD 0,08/s** [guía de modelos §3, oficial; rotulada «50 % off», promo o lista sin
dato] → **USD 1,20 por toma de 15 s**. El CLI imprime el costo antes de encolar y `generar.sh` fija
`--max-usd 1.5` por toma.

| Tanda | Tomas | USD | Condición para pasar |
|---|---|---|---|
| **1 · masters de mascotas** | `02-9x16 03-9x16 04-9x16 07-9x16` | 4,80 | — |
| **2 · sonda Nexa** | `05-9x16` | 1,20 | identidad, manos y labios revisados al 100 % |
| **2b** | `06-9x16` | 1,20 | la sonda 05 pasó |
| **3 · formatos** | `3x4` + `1x1` **sólo de los 9:16 aprobados** | hasta 14,40 | aprobación del operador por pieza |
| **Primer pase completo** | 18 tomas | **21,60** | |
| **Con ~50 % de reintentos** | | **≈ 32** | el 01 costó 25,39 *inventando* la receta; ésta ya existe |

La tanda 2 va separada porque **H3 Max con una persona real en cuadro no está verificado** en el carril
(el filtro de Seedance rechaza personas **después de encolar y cobra**; el de H3 no está medido con Nexa).

```bash
cd ai-generations/2026-09-22_motion-cmp001-02-07
python3 preparar-prompts.py                          # recompila y audita los 18 prompts (0 USD)
./generar.sh 02-9x16 03-9x16 04-9x16 07-9x16         # SIMULACIÓN: comandos + costo (0 USD)
CONFIRMAR_GASTO=1 ./generar.sh 02-9x16 03-9x16 04-9x16 07-9x16   # ejecuta: USD 4,80
python3 qa.py out/CMP001-02-9x16.mp4                 # QA medido + tira de 8 cuadros
./post.sh CMP001-02-9x16                             # firma + room tone (+ recorte si es 3x4) (0 USD)
python3 qa.py finales/CMP001-02-9x16-final.mp4
```

## 5. QA por toma: qué mide la máquina y qué mira una persona

| Chequeo | Cómo | Meta |
|---|---|---|
| Loop | `qa.py`: primer cuadro contra último cuadro reales | ≤ 1,5/255 (01: 0,68) |
| Sostén quieto | movimiento 7,5 → 13 s | bajo (01: 0,44) y **mirar la tira** |
| Audio | pico/media en el sostén; silencio digital | sin silencio digital tras `post.sh`; **sin habla: lo juzga un oído** |
| Recorte 3:4 → 4:5 | luminancia de las franjas de 45 px en todo el clip | bajas (01: 3,6/0,8) **y** nada cortado en la tira |
| Firma generada | `firma_zona_lum_pico` en el crudo | alto = revisar si el modelo dibujó un logo |
| 🎯 Remate | tira, §1 | la ranura, la tapa, el espacio punteado, las imágenes: **intactos** |
| Texto | al 100 % | ortografía y tildes exactas, titular grande (no encogido) |
| Identidad | Gigi/Clawd/Codex contra el kit; Nexa contra el ancla | sin deriva; bloques rígidos en Clawd |
| Manos (05, 06, 07) | al 100 % | cinco dedos, el dedo no atraviesa el vidrio |
| Temperatura (03) | tira | sin ámbar ni tungsteno |

## 6. Decisiones abiertas para el operador

1. **Aprobar el gasto** (tanda 1 = USD 4,80) y el tope total.
2. **Firma compuesta** en vez de dentro del video (recomendado, ver §2.1). Si prefieres el método del 01, se
   usa `compuesta-*.png` como imagen 1 y se salta la firma en `post.sh`.
3. **16:9** queda estático, como decidiste en el 01 (asumido; no hay prompt 16:9).
4. **06 arranca sin la tarjeta destacada** (la fila crece): el primer cuadro difiere del estático. La portada
   del reel debe ser el PNG final, no el primer cuadro.
5. **Nexa en video**: declarar `isAiGenerated` al programar, como se hizo con el 01.

## 7. Archivos

| Archivo | Qué es |
|---|---|
| `piezas-motion.json` | 🎯 la dirección de las seis piezas: set, beats, remate, capa gráfica, layout y foley |
| `preparar-prompts.py` | compila `prompts/` + `tomas.json` y audita (inductores de voz, sostén, loop, franja de firma, marca) |
| `prompts/CMP001-0X-{9x16,3x4,1x1}.prompt.txt` | los 18 prompts resueltos, el artefacto portable |
| `tomas.json` | por toma: aspect, prompt, imágenes en orden y **sha256** de cada referencia |
| `quitar-logo.mjs` | arma la referencia 1 sin logo (versionada: `BAND_TOP` para la firma alta del 9:16 de 02/03) |
| `generar.sh` · `post.sh` · `qa.py` | generar (simulación por defecto) · post determinístico · QA medido |
| `refs/` · `out/` · `finales/` · `qa/` | binarios, fuera de git (`.gitignore`) |

Al terminar: copiar finales a `03. Finales/CMP-001 …/02 - Videos/<ratio>/` con el nombre `CMP001-0X - <Título> - <ratio>.mp4`,
registrar MP4, ratio, duración y sha256 en `MANIFIESTO-PAUTA.json` (regenerar vistas con `actualizar-catalogo.py`)
y dejar esta receta en `01. Recursos/CMP-001 - Produccion y editables/`.
