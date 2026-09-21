# Hechos medidos — corrida `copiloto` (Nexa + Clawd), 2026-09-21

Inventario verbatim de lo aprendido en una corrida de ~20 generaciones. **Es la fuente para documentar;
cada línea es un hecho verificado en esta sesión, con su ruta y su número.** No inventar nada fuera de acá.

---

## 1. Dos identidades conviven bajo el nombre «Nexa» **[medido · DECISIÓN PENDIENTE del operador]**

Hallazgo iniciado por la sesión peer «Poses de Nexa en advertising y design studio» (comparación por hash
contra OneDrive) y **verificado de forma independiente en esta sesión** recortando los rostros al mismo
tamaño y poniéndolos lado a lado.

| | **Identidad A** | **Identidad B** |
|---|---|---|
| Rostro | cara ancha, cejas gruesas y rectas, delineado marcado, labios llenos | cara larga y angulosa, cejas finas arqueadas, sin delineado, labios medianos |
| Dónde vive | `5. Contenidos/10. Nexa (Influencer IA)/01. Material/01. Avatar/`: `01-GPT-Image-2-empatica.png`, `02..05-NanoBanana-*.png` (bustos con hoodie, fondo neutro) + `Avatar 3,4 v2` + `Avatar Cuerpo Completo v2` | mismo `01. Avatar/` (los `hf_2026*` con blazer) + `Poses y expresiones/` (24 img) + `Vestuario/` (23 img) |
| Aprobación | **la del KV «Tu IA no conoce tu negocio» aprobado el 2026-09-17** | sin aprobación documentada como identidad canónica |
| Material | poco | mucho, **incluido un turnaround de 9 vistas** |

- **Las dos conviven DENTRO de la misma carpeta `01. Avatar/`**: los bustos con hoodie son A, los `hf_*` con blazer son B.
- **El color de iris NO las distingue** (hipótesis descartada, medida): **A rgb(64,49,34) · B rgb(51,43,36)**, ambas
  castaño muy oscuro. Lo que las separa es la ESTRUCTURA (óvalo, cejas, labios, delineado).
- Consecuencia que causó ~20 pasadas: **se generaba con una y se validaba contra la otra**, así que el QA
  decía «la identidad coincide» mientras el operador veía que no.

## 2. Existe un turnaround de Nexa de 9 vistas — no hay que construirlo **[medido]**

`5. Contenidos/10. Nexa (Influencer IA)/01. Material/01. Avatar/hf_20260327_182342_3bd94421-25ee-4f45-bc2c-5e30d1acfbe1.png`

- **3072×5504**, grilla **3×3**, celdas de **1024×1835**.
- Vistas: frontal cuerpo entero · tres cuartos busto · **perfil** · frontal · espalda girada · tres cuartos
  opuesto · **cabeza inclinada hacia abajo** · espalda de perfil · **macro del rostro**.
- **Pertenece a la identidad B** (verificado recortando la celda (1,2) contra `nexa-avatar-34-v2` y `nexa-the-point`).
- Si el operador elige B, el set de ángulos se obtiene **recortando**, sin que intervenga ningún modelo.

## 3. El catálogo de identidad de Nexa no tenía ningún retrato cercano **[corregido, commit `cdb1fabad`]**

Las tres referencias eran planos generales donde el rostro ocupa pocos píxeles → el modelo lo **reconstruye**.
La primera pasa a ser `nexa-avatar-34-v2.png` (retrato cercano en tres cuartos), copiada de
`ai-generations/2026-09-17_kv-tu-ia-no-conoce/refs/`.

🔴 **El brief del KV aprobado estaba guardado y no se leyó**: `ai-generations/2026-09-17_kv-tu-ia-no-conoce/brief/plate-kv-4x5.prompt.txt`.
Traía resueltos el encuadre, la escala de la mascota (20 % del ancho), el lente y la pose. **Antes de
reconstruir un encargo de memoria, buscar el brief de la pieza aprobada equivalente.**

## 4. Lente: **85 mm f/2**, nunca 35 mm de cerca **[del brief aprobado]**

El gran angular a distancia de retrato **ensancha y distorsiona el rostro**. Parte de lo que se leía como
«no es ella» era distorsión de lente, no deriva de identidad. La pieza aprobada usa *chest-up medium
close-up, 85 mm f/2*.

## 5. La cabeza casi NO gira: giran los ojos **[del brief aprobado + medido]**

Pedir «gira la cabeza hacia el hombro» = pedir un **tres cuartos marcado**, ángulo que el set de referencias
**no cubre** → reconstrucción del rostro. En la pieza aprobada la cabeza está casi frontal y **sólo los ojos**
van hacia la mascota. Marcadores que funcionan: ambos ojos y ambas cejas visibles, ambas mejillas visibles,
la oreja lejana en cuadro, el puente de la nariz NO corta la mejilla lejana.

## 6. Mirada muy descendida destruye los ojos **[medido]**

Con la cabeza en tres cuartos y la mirada muy abajo, el párpado superior baja con el globo ocular y **devora
el iris**; el ojo lejano queda como **ranura sin globo**. Es anatómicamente correcto y fotográficamente el
peor caso. Agravante medido: **editar «cejas altas» sobre esa pose lo empeora** — el modelo sube la ceja pero
no reconstruye el párpado, y queda un párpado largo sin pliegue con la línea de pestañas fundida en la sombra.

Marcadores de ojo que sí funcionaron: el iris del ojo cercano se ve **como círculo completo**, nunca media
luna recortada por el párpado; **esclerótica visible a ambos lados**; el párpado superior por encima del iris
con **su pliegue como línea propia**, bien por debajo de la ceja; línea de pestañas como **borde oscuro
definido**, nunca fundida; el ojo lejano **abierto con su propio iris**, nunca una ranura oscura.

## 7. Pedirle una POSE al modelo sobre un kit = redibuja el asset **[medido, 5 pasadas]**

Clawd salió con cinco formas distintas mientras se le pedía una pose que la referencia no tenía (patas largas,
cuerpo cuadrado, ojos chicos). **Se resolvió pasando la pose del kit que ya existía**: la
`efeonce-clawd-3d-07-salto-en-el-aire` ya trae **los dos brazos levantados y separados** — el encogimiento que
la pieza necesitaba. Regla: **elegir la pose del kit antes de pedirle una al modelo.**

## 8. Un adjetivo es una instrucción sin control; un número medido, no **[medido]**

El prompt decía «*roughly one and a half times wider than it is high… widen it and LOWER it*» y el modelo
**lo aplastó**. El operador lo cazó a la primera («quedó achatado»).

- Proporción real del bloque de Clawd: **1,45 de ancho/alto** (kit 01 = 1,43 · kit 07 = 1,46).
- **Método para medirla**: erosionar el canal alfa (`blur(14)` + `threshold(215)`) elimina apéndices finos
  (brazos, patas) y deja el bloque; el bbox del resultado da la proporción. Contar píxeles por fila sin
  erosionar da 7,69 y 9,15 porque incluye los brazos.

## 9. Pegar un render 3D sobre una foto se ve pegado **[medido, camino descartado]**

Se probó el camino determinístico completo (plate limpio + composición del kit + sombra) y **no sirvió aquí**:

- El kit trae **luz de estudio frontal** y la foto **luz dura lateral** → el objeto no pertenece a la escena.
- Exige además que el plate tenga el hombro en el sitio: medido en ese plate, el hombro cae en **y≈1045** y la
  cara empieza en **x≈621**, así que a escala real la figura o queda flotando o invade la mejilla.
- La escala sí se calcula bien así: **cara pómulo a pómulo 160 px ≈ 13,5 cm → 11,85 px/cm**, comprobado contra
  la cabeza (260 px ≈ 22,4 cm).
- **Cuándo sí**: piezas donde el asset es plano o el plate se diseñó para recibirlo. **Cuándo no**: integrar un
  render 3D con luz propia dentro de una escena fotográfica con luz de carácter.
- Bug propio a evitar: construir la sombra con `dest-in` sobre un lienzo creado **devuelve un rectángulo
  opaco**. Lo correcto es **teñir la silueta**: 3 canales planos + `joinChannel(alfa)` + blur.

## 10. El signo unido a la cabeza por una varilla: el modelo no la suelta **[medido]**

Tres pedidos explícitos de «sin tallo, sin antena, sin hilo» y la varilla seguía. Se resolvió
**determinísticamente**:

- **Detección**: comparar cada píxel con la **mediana de su fila** en una ventana ancha; lo que se desvía es la
  varilla. Medida: **2 px de ancho (x 495–497), de y=684 a y=702**.
- **Parche**: copiar muro vecino **de la izquierda** (la derecha ya tenía la cabeza), caja 13×24 en (490,679),
  alfa con `blur(0.6)`.
- Los dos parches anteriores fallaron por **estimar el tamaño a ojo** en vez de medirlo: uno se comió el punto
  del signo y tapó la cabeza; el otro dejó restos arriba y abajo.

## 11. En un plate limpio, no sugerir criaturas ni siquiera de refilón **[medido]**

La frase «*as if something small were there asking her a question*» hizo que el modelo **materializara un robot
blanco flotando**. En un plate que nacerá sin la criatura, la mirada se describe como **geometría** y el vacío
se declara: «*the air above that shoulder is EMPTY: no object, no creature, no robot, no toy, no figure*».

## 12. El haz de luz sube al tercio superior y rompe la banda de texto **[medido]**

Reservas medidas en la misma ficha según dónde entra la luz: **0,06** y **0,22** del alto cuando el haz o la
ventana alcanzan el tercio superior, contra **0,30–0,36** cuando entran bajo. Corrección que funcionó dos veces:
declarar que la ventana, la diagonal iluminada y **cada mancha que proyecta** quedan **bajo la mitad del cuadro**,
y que el tercio superior es un campo de azul tinta sin interrupción.

## 13. Recorrido de la vista **[criterio nuevo del operador, 2026-09-21]**

> «Tienes que añadir o entrenar un criterio, y es la capacidad de ver hacia dónde se guía la vista del lector.»

La mirada entra por el titular, baja por el **eje central** a la escena y sale por la firma. Un elemento al
**margen y a media altura** queda fuera de ese recorrido: es un desvío lateral sin destino y se lee como un
adorno pegado, **aunque no tape nada y aunque su contraste pase**. Si va, va **sobre el eje**, como escalón
entre el titular y la escena. Confirmado por la pieza aprobada: el chip «Contexto: 0 %» está **centrado bajo el
titular**.

## 14. Guarda medida para un elemento gráfico sobre la foto **[implementada]**

La condición «no puede tapar a Nexa» no se afirma: se mide. Se extrae del plate la caja del elemento **más un
aire de la mitad de su alto** y se promedia el gradiente horizontal; muro liso da **< 3** (medido 0,76–1,67), un
rostro o una figura dan bordes. Sobre 3, **aborta**. El aire importa: la primera versión pasó la caja estricta
y el borde del chip **rozaba** el signo de interrogación.

## 15. Palanca `copiloto` **[nueva, en `build-prompt.mjs`, commit `cdb1fabad`]**

La criatura de un partner acompaña a la persona y **las dos comparten el gesto**. Requiere `criatura`. Lleva
guarda `contradice` contra hologramas y circuitos, que la volvían ciencia ficción. Nace de una pieza
pre-canon aprobada por el operador (el KV del 17/09) y de su encargo de convertirla en palanca.

---

## Archivos de esta corrida

- `ai-generations/2026-09-21_copiloto/fichas/` — fichas de toma · `prompts/` — prompts verbatim
- `componer.mjs` — capa gráfica (copia del compositor de «Nivel de búsqueda») con el chip opcional + la guarda medida
- `componer-clawd.mjs` — composición determinística del kit (camino descartado, se conserva como evidencia)
- `clawd-pregunta.mjs` — compone Clawd + «?» desde el kit, para pasarlo como referencia de forma
- `dos-identidades-nexa.jpg` — la lámina de decisión entregada al operador
- `plates/` — v1…v16 (gitignoreados)

---

## Delta de la sesión peer «Poses de Nexa en advertising y design studio» **[verificado por ambas sesiones]**

### 16. El turnaround NO cubre el contrato de 6 vistas

Lectura de las 9 celdas contra la convención del set de Julio:

| Celda | Vista | Estado |
|---|---|---|
| (1,2) | `45-der` | ✓ cubierta |
| (1,3) | `perfil-izq` | ✓ cubierta |
| (2,2) | `135-trasero` | ✓ cubierta |
| (3,2) | trasero del otro lado | aprovechable |
| (1,1) · (2,1) | frontales | extra |
| (2,3) | tres cuartos suave | extra |
| (3,1) | cabeza inclinada | extra valioso |
| (3,3) | macro del rostro | extra valioso (base de edición: tiene píxeles de sobra) |

**Faltan `45-izq`, `perfil-der` y espalda pura a 180°.** Incluso eligiendo la identidad B hay que producir
tres ángulos, editando desde el macro (3,3) o desde (1,1), que son de la misma identidad.

### 17. El iris varía más por LUZ dentro de una cara que entre las dos identidades **[medido]**

En `nexa-avatar-34-v2`, el mismo ojo da **rgb(47,37,27) en sombra** y **rgb(95,67,53) iluminado**. Por eso el
color de iris **no discrimina identidades** — pero **sí sirve como QA de salida**: un ángulo generado salió en
rgb(117,78,61) contra rgb(95,67,53) del mismo ojo en la referencia, visiblemente más miel, y hubo que
endurecer el prompt.

**Formulación que bajó el iris** (la vaga no alcanzaba): «marrón plano y uniforme, tan oscuro que la pupila
apenas se distingue del iris, **sin anillo más claro ni brillo limbal**». «Muy oscuro, nunca miel» NO alcanza.

### 18. «45 degrees» no gira la cabeza **[medido, confirma la regla de marcadores]**

Una primera pasada volvió con la cabeza **en el mismo ángulo de la referencia**. Lo que sí la movió:

1. **Declarar la inversión explícita**: «en la referencia está girada hacia SU DERECHA; aquí debe girar al lado OPUESTO».
2. **Marcador de destino**: «su nariz apunta al BORDE DERECHO del cuadro».

### 19. Rasgos que discriminan A de B **[los cuatro que la peer verificó en el macro]**

1. **Delineado del párpado superior con rabillo**: A lo tiene, B no.
2. **Nariz**: B más larga y con el puente más alto.
3. **Labios**: B más finos.
4. **Óvalo**: B más largo.

Matiz honesto: la ceja del turnaround es más gruesa que la de `the-point`, así que **no es un clon exacto de B**
— pero en el eje A/B cae claramente del lado B.

### 20. Trabajo ya producido en identidad A

`ai-generations/2026-09-21_nexa-angulos/salidas/`: `nexa-45-izq-v02` y `nexa-perfil-izq-v02`, verificados
(fondo gris, camiseta gris, giro correcto, consistentes con la convención de Julio). Prompts v02 versionados
en `prompts/`. Quedan cuatro ángulos si se elige A; se descartan si se elige B.

### 21. Por qué la mezcla de identidades no se notó en el KV aprobado **[medido por la peer]**

La cara publicada en `kv-tu-ia-no-conoce-clawd-4x5-v05.png` **es la identidad A**, pese a que esa corrida llevó
las tres referencias mezcladas. Razón: **2 de 3 referencias eran A**, así que el promedio cayó del lado A. La
mezcla no dejó de existir — simplemente ganó por mayoría en esa pieza concreta. Es la explicación de por qué el
defecto estuvo latente desde abril sin que nadie lo cazara.

### 22. Identidad canónica: **A (serie Avatar)** **[decisión del operador, 2026-09-21]**

Tomada en la sesión «Poses de Nexa en advertising y design studio», con las dos caras lado a lado y el dato de
que el KV aprobado muestra A. Consecuencias:

- El set de ángulos se construye **editando desde `nexa-avatar-34-v2`**, no recortando el turnaround (que es B).
- De los 6 ángulos del contrato: `45-izq` y `perfil-izq` ya producidos y verificados; faltan `45-der`,
  `perfil-der`, `135-trasero` y `espalda`.
- **B no se borra: pasa a banco de material** — poses corporales, vestuario, escenarios, gesto, encuadres —
  todo lo que NO sea rostro. Esa parte (combinar el material) sigue **abierta** y es decisión aparte.
- `nexa-the-breakdown` y `nexa-the-point` son B: **no pueden seguir en `refs` del catálogo de identidad**.
