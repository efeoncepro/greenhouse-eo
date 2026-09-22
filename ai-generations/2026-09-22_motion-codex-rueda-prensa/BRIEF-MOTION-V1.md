# Motion ad · «No fuiste tú» — loop de rueda de prensa

> **Qué es.** El **primer motion del registro C**. Hasta hoy el lenguaje fotográfico está probado sólo en
> estático; esta pieza lo lleva a video sin inventar un lenguaje paralelo: mismo plate, misma tesis, misma
> capa AXIS — sólo que ahora se mueven.
> **Estado:** dirección aterrizada, **nada producido**. Dos decisiones abiertas al final.
> **Origen:** `ai-generations/2026-09-21_registro-c-respuesta/` (pieza `p1-atril-vocero` / `p1-cta-contorno`).

## 1. 🔴 Corrección de rumbo: qué recibe Seedance y qué NO

El encargo pedía pasarle a Seedance «texto, cursor multiplayer y standalone, bounding box, CTA y fondo».
**El fondo sí. Los otros cinco no**, y no es criterio — son tres reglas con causa medida:

| Regla | Dónde vive |
|---|---|
| «El modelo entrega **sólo el medio limpio**; texto, logo, CTA y legal se componen con AXIS, **nunca se generan**» | `efeonce-advertising-creative` §Motor |
| «La marca **no se anima dentro del plano generado** (se compone)» | `motion-design-studio` §Marca física en video |
| «**Motion con marca o personas → Flux 3 o Wan 3.0, no Seedance**: su filtro rechaza **tras encolar y cobra**» | contrato de selección de motor |

Y hay un cuarto motivo, el más terco: **el texto exacto no sobrevive a un generador.** «No fuiste tú.» en
Bricolage a 168 px con tracking −0,02 no es un pedido, es un archivo. Un modelo lo devuelve parecido.

**Lo que sí vale de la intuición original**, y lo recojo: las referencias sirven para que el video **respete
las reservas**. El plate 9:16 ya tiene la mitad superior vacía a propósito. Seedance no recibe el texto, pero
sí recibe la instrucción de que **ese espacio no se invade y la cámara no deriva hacia él**.

→ **Seedance anima el mundo. AXIS anima el mensaje. Y el mensaje, al animarse en post, hace algo que el
modelo no sabría hacer: actuar.**

## 2. El concepto

La tesis de la pieza estática es: *Hoy alguien habló en nombre de tu empresa. No fuiste tú. Ni te preguntó nada.*

El video no la ilustra: **la ejecuta**. Codex da una conferencia de prensa sobre tu marca con la autoridad
de un vocero oficial —se inclina al micrófono, gesticula, remata— y lo que sale es **balbuceo**. Habla con
seguridad total de algo que no sabe.

🎯 **Y el remate está en el atril, no en el personaje: la barra de búsqueda sigue VACÍA.** Todo el loop, el
cursor parpadea en un campo en blanco mientras el vocero perora. Nadie escribió la pregunta. Nadie consultó.
Eso es «ni te preguntó nada» **hecho movimiento**, y se entiende con el sonido apagado — que es como se ve el
90% del feed.

La comedia es el vehículo; el argumento comercial es que **la seguridad del vocero no depende de saber**.

## 3. La gestualización — de dónde sale el gesto

🔴 **La pose NO se le pide al modelo: se le pasa.** Está medido en el canon con Clawd: pedir una pose que la
referencia no tiene hace que el modelo **redibuje el asset** — volvió con cinco formas distintas (patas largas,
cuerpo cuadrado, ojos chicos). En estático eso arruina una imagen; **en video son 144 cuadros de deriva.**

Y tenemos de dónde sacarla. Codex ya tiene kit propio en `ai-generations/2026-09-17_codex-poses-3d/`, con dos
niveles de fuente:

| Fuente | Qué aporta al vocero |
|---|---|
| **Spritesheet oficial** (extraído de ChatGPT macOS 26.911, atlas 8×11) | **9 filas de ESTADOS** + 16 direcciones de mirada. Es la verdad de la forma |
| **Poses 3D renderizadas** (`out/codex-3d-*.png`) | El gesto ya construido en el material correcto |

**Las cuatro que sirven a una rueda de prensa:**

| Cuadro | Referencia del kit | Gesto |
|---|---|---|
| reposo | el plate mismo · `codex-3d-01-frente-heroe` | frontal, brazos abajo, cara `>_` |
| «punto uno» | `codex-3d-08-idea-tres-cuartos-derecha` | un brazo levantado, cuerpo inclinado al micrófono |
| **pico** | `codex-3d-04-contrapicado-celebrando` | **los dos brazos arriba y abiertos**, ojos `^^` |
| vocero | `codex-3d-03-megafono` · `codex-3d-05-audifonos-microfono` | la postura de quien está declarando |

🎯 **Y la expresividad real no está en los brazos: está en la CARA, que es una pantalla.** En reposo muestra
`>_`; en el pico, el kit ya la trae con **ojos `^^`**. Esa pantalla es su único músculo facial y cambia de
estado sin deformar nada — es la gestualización más barata, más fiel y más expresiva que tiene el personaje.
El cursor `_` parpadeando rápido son sus sílabas. **Nadie necesita una boca.**

## 4. El loop — 6 s, 24 fps

Primer y último cuadro **idénticos**: el loop cierra sin costura.

| t | cuadro | Codex | Atril |
|---|---|---|---|
| 0,0 | **clave A** = el plate | reposo, cara `>_`, brazos abajo | cursor de la barra parpadea |
| 0,6–2,2 | → **clave B** | se inclina al micrófono, un brazo sube: «punto uno» | el `_` de su cara parpadea rápido |
| 2,2–3,4 | → **clave C** | **pico**: los dos brazos se abren, se yergue, ojos `^^` | los micrófonos rebotan levemente |
| 3,4–4,6 | sostiene C→A | **pausa de vocero**: se queda quieto, esperando la repregunta | la barra sigue **vacía** |
| 4,6–6,0 | → **clave A** | vuelve a reposo exacto, cara `>_` | cámara sin deriva → empata con el cuadro 0 |

**Reglas de la toma:** cámara **fija** · el personaje **no cruza la mitad superior** · la barra **nunca recibe
texto** · sin boca, sin dedos, sin ropa (invariantes del kit).

## 5. La capa AXIS, animada en post

Todo determinístico, sobre el video ya renderizado. Aquí el texto no sólo aparece: **actúa**.

| t | Capa | Acción |
|---|---|---|
| 0,0 | lead + dominante + cierre | ya presentes desde el cuadro 0 (es un loop: nada «entra» en el segundo pase) |
| 1,0–1,6 | **cursor multiplayer `IA`** (`#12afa2`) | entra desde la derecha y **selecciona «No fuiste tú.»** |
| 1,6 | **bounding box** `eight-handles` | se dibuja sobre el dominante y **queda** |
| 3,8–4,4 | **cursor standalone** (flecha blanca) | recorre hasta el CTA |
| 4,4 | CTA `outline` lima | **pulso de clic** (el borde late una vez) |
| 4,6–6,0 | ambos cursores | salen; el box se desvanece → estado del cuadro 0 |

El cursor `IA` seleccionando la frase mientras el vocero habla **dice quién está hablando**. Es la misma
gramática de selección colaborativa de la estática, ahora con la línea de tiempo que siempre le faltó.

**Se resuelve con el contrato, no a mano**: `AxisCollaborationSelectionIntent` → `efeonce.collaboration-selection`
por cuadro clave. Coordenadas decorativas están prohibidas por la skill.

## 6. Audio

Seedance se encola con **`--no-audio`**: su pista es provisional y acá hay diseño sonoro.

- **Música** — marcha de charanga breve, tuba y platillo, tempo alegre, 6 s loopables sin costura.
  Registro: noticiero de pueblo, no corporativo.
- **Voz del vocero** — balbuceo agudo pitcheado, **sin una sola palabra real**, con la cadencia de alguien
  que está dando una declaración importante: sube en el «punto uno», remata fuerte en el pico, y calla en la
  pausa. La comedia está en la **prosodia**, no en el timbre.
- **Foley** — clic de micrófono al inicio · zumbido bajo de la barra encendida · el parpadeo del cursor **no
  suena** (el silencio del campo vacío es el punto).
- **Mezcla** — el 90% del feed lo verá mudo: la pieza **debe funcionar sin audio**. El sonido premia, no sostiene.

⚠️ **«Minion» no se pide como tal.** Es IP de Illumination y ningún generador debe recibir ese nombre. Lo que
queremos es la **cualidad**: gibberish agudo y pitcheado con prosodia de adulto serio. Eso se describe
funcionalmente y se obtiene igual.

## 7. Producción — y por qué el gesto cambia el motor

Pedir más gestualización empuja al mismo sitio al que el contrato ya apuntaba para marca. La doctrina del
estudio es **«keyframes primero, luego image-to-video»**, y el árbol de motores dice: *pasar por varios cuadros
clave → `flux3-keyframes` (1–10 `--keyframe img@frame_index`)*. Flux 3 es además **el motor que el contrato
manda cuando hay marca en cuadro** — y Codex es marca de OpenAI.

| Paso | Cómo |
|---|---|
| 1. Cuadros clave B y C | `pnpm ai:image --model gpt-image-2.5-sunburst` **editando el plate**, con la pose del kit como referencia. A = el plate, ya existe |
| 2. Toma | `flux3-keyframes` con A@0, B@52, C@82, A@143 → gesto controlado **y** loop cerrado |
| 3. Alternativa Seedance | `seedance25-r2v` (acepta 30 imágenes de referencia) o `i2v --end-image`. **Sonda de 5 s primero**: su filtro rechaza marcas *tras encolar y cobrando* |
| 4. Capa AXIS | compositor + `collaboration-selection` por cuadro clave, sobre el render |
| 5. Audio | ElevenLabs; el video se encola con `--no-audio` |
| 6. QA | primer, último y dos intermedios · **+ reproducir 3 vueltas** y mirar la costura |

**Por qué keyframes y no prompt:** con los cuadros clave producidos como imagen, el gesto ya está **aprobado
antes de gastar en video**, y el modelo sólo interpola. Es el mismo principio del canon fotográfico —lo
sensible se compone, el modelo sólo termina— aplicado al tiempo.

## 8. Los cuatro formatos

Al aprobar, la pieza se entrega en **9:16, 4:5, 1:1 y 16:9** (canon de Paid Media multiformato).

🔴 **No se recortan de un master: es recomposición nativa por ratio.** Un crop mueve las reservas, descuadra
el lecho y saca los cursores del lienzo — ya pasó en estático.

| Ratio | Plate | Estado |
|---|---|---|
| 9:16 | `p1-atril-busqueda-9x16-v3-plate.png` | ✅ existe |
| 4:5 | `p1-atril-busqueda-45-v2-plate.png` | ✅ existe — **es el de la pieza aprobada** |
| 16:9 | `p1-atril-busqueda-16x9-plate.png` | ✅ existe |
| 1:1 | — | ❌ **falta**: hay que producirlo |

**Orden propuesto:** cerrar **uno** de punta a punta —cuadros clave, toma, capa AXIS, audio, QA— y recién con
ese aprobado abrir los otros tres. El loop, el copy y el diseño sonoro se reusan; lo que se rehace por formato
son los cuadros clave y la composición. **Costo ×4 en generación**, no en dirección.

⚠️ Aclaración: el brief está escrito sobre **9:16** (el plate que revisé, vertical). Si prefieres arrancar por
16:9, cambia sólo el plate de partida — todo lo demás se mantiene.

## 9. Riesgos

1. **El filtro de marca** — el más probable. Mitigado por la sonda del paso 1.
2. **La deriva del loop** — si la cámara se mueve un pixel, la costura se ve. Mitigado con `--end-image` y
   cámara fija declarada; se verifica reproduciendo, no mirando cuadros sueltos.
3. **Que se vea render** — es la familia de riesgo que medimos anoche: el motor resuelve lo imposible en
   idioma de CGI. Acá el plate ya es fotográfico y la acción es plausible, pero **la imperfección se pide igual**
   (grano, micro-vibración de los micrófonos, foco real).
4. **Que la gracia tape el argumento** — si el balbuceo es lo único que queda, la pieza es un meme. El control
   es la barra vacía: si en el QA alguien no la nota, hay que subirle presencia.

## 10. Decisiones abiertas

1. **¿Seedance con sonda, o directo al motor que el contrato manda para marca (Flux 3 / Wan 3.0)?**
   Pediste Seedance 2.5 y es el mejor en física y adherencia; el contrato dice que con marca en cuadro no es
   la primera mano. La sonda de 5 s resuelve la duda por centavos.
2. **¿9:16 primero, o 9:16 + 16:9?** El canon de paid pide los cuatro ratios, pero para el **primer** motion
   propongo cerrar uno bien y recién después abrir la matriz.
