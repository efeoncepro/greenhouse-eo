---
paths:
  - "scripts/foto/**"
  - "docs/operations/brand-photography/**"
  - "ai-generations/**"
---

# Fotografía de marca Efeonce — invariantes (auto-load por path)

Carga [`design-studio` → lenguaje fotográfico](../skills/design-studio/references/efeonce-photographic-language.md)
y el [índice del canon](../../docs/operations/brand-photography/README.md) **antes de escribir un prompt**. La
sesión que reconstruyó el oficio a pedazos en vez de cargar la skill perdió un día entero y ~USD 5
(`ai-generations/2026-09-20_formatos-catalogo/ESTADO.md`).

## Los tres comandos. NUNCA a mano

```bash
pnpm foto:doctor                    # ¿puede esta máquina generar? seis chequeos, sin costo
pnpm foto:prompt <ficha.json>       # arma el prompt desde la ficha
pnpm foto:validar <plate.png>       # mide las seis reservas sobre el plate limpio
pnpm foto:componer <piezas.json>    # la CAPA GRÁFICA encima: voces, selección AXIS, firma y QA
pnpm foto:emblema <plate.png>       # amplía el bordado para mirarlo al 100% (no decide: quita la excusa)
pnpm foto:lanyard --nombre … --cargo … --foto …   # arma el lanyard determinístico; el modelo sólo lo termina
```

**Dos categorías de pieza, y la diferencia se decide ANTES de generar:**

| | Pieza **muda** | Pieza **con voz** |
|---|---|---|
| Qué lleva | Sólo foto + firma | Titular, copy, cursores, selección |
| Para qué | **Descanso visual**: relaja el feed | Dice algo concreto |
| Reserva | No necesita | **Obligatoria, declarada en la toma** |
| Cómo | `foto:prompt` → `foto:validar` | `foto:prompt` con `reservas` → `foto:validar --zona-texto` → `foto:componer` |
| Estado | **aprobada** | **capa SIN aprobar** (2026-09-19) |

**NUNCA escribas un compositor nuevo.** `foto:componer` es el de «Nivel de búsqueda» con su gramática de voces
intacta; escribir otro ya se intentó y el operador rechazó las piezas enteras.

**NUNCA armes un prompt de foto de marca concatenando bloques a mano.** Es la vía por la que «Vertical 4:5.»
vivió dentro del bloque de realismo compartido sin que nadie lo viera. El comando resuelve desde tablas:

| Campo de la ficha | Qué resuelve |
|---|---|
| `formato` | tamaño, % del lecho y límite de sujetos, de UNA tabla |
| `identidad` | bloques `IDENTITY` + `REFERENCES` verbatim, con **vista por ángulo** (`{ persona, vista }`) |
| `objetos` | kits de marca como **referencia de forma** (logo, mascota, prenda, merch), numerados tras la identidad |
| `palanca` | **una sola** de las **23 de encuadre** → [catálogo de palancas](../../docs/operations/brand-photography/EFEONCE_PHOTO_LEVERS_CATALOG_V1.md) |
| `atmosfera` | `polvo` · `bruma` · `vapor` · `humo` — aire con materia que hace visible la luz. **Exige haz** |
| `suspendido` | qué está congelado en el aire |
| `lecho` | objeto y **tono declarado** del primer plano desenfocado |

## Reglas duras que el comando ya hace cumplir (no las repitas a mano, no las esquives)

- **Identidad:** el set de Julio es `2026-09-20_identidad-julio-nexa/refs-aprobadas/` (+ 6 ángulos derivados).
  El set viejo de `2026-09-17_equipo-vestuario/` **idealizaba el rostro** y arrastraba deriva.
- 🔴 **Dos identidades conviven bajo el nombre «Nexa». La canónica es la A** **[decisión del operador, 2026-09-21]**.
  Conviven **dentro de la misma carpeta** `01. Avatar/`: los bustos con hoodie son **A** (la del KV «Tu IA no conoce
  tu negocio», aprobado el 2026-09-17); los `hf_*` con blazer son **B** (la del turnaround de 9 vistas, `Poses y
  expresiones/` y `Vestuario/`). Las separa la **estructura** —óvalo, cejas, labios, delineado con rabillo—, **no el
  iris**: medido **A rgb(64,49,34) · B rgb(51,43,36)**, y dentro de una misma cara el iris varía más por LUZ
  (rgb(47,37,27) en sombra contra rgb(95,67,53) iluminado, el mismo ojo) que entre las dos identidades. **Verifica
  cuál estás usando antes de anclar una pieza:** generar con una y validar contra la otra costó ~20 pasadas, con el
  QA diciendo «la identidad coincide» mientras el operador veía que no.
  **Consecuencia:** el set de ángulos se construye **editando desde `nexa-avatar-34-v2`**, no recortando el
  turnaround, que es B; y `nexa-the-point` y `nexa-the-breakdown` son B, así que **no pueden estar en `refs`**
  del bloque `nexa`. B no se borra: queda como **banco de material** —poses, vestuario, escenarios, gesto—,
  todo lo que NO sea rostro.
- 🔴 **Antes de reconstruir un encargo de memoria, busca el brief de la pieza aprobada equivalente.** El del KV estaba
  guardado en `ai-generations/2026-09-17_kv-tu-ia-no-conoce/brief/plate-kv-4x5.prompt.txt` y no se leyó: traía
  resueltos el encuadre, la escala de la mascota (20 % del ancho), el lente y la pose.
- 🔴 **Antes del prompt, abre el `LEEME.md` y el manifiesto del kit de la prenda.** El manifiesto declara
  `cuando_usarla` por vista: la variante se elige por el **rol de la escena** (la gorra de terreno es la trucker,
  no la del sitio). **El tipo de marca va por VARIANTE, no por kit** —una prenda puede existir con logotipo y con
  isotipo, y la trasera puede no llevar marca—. Si el kit trae **pruebas en persona**, ésas son el punto de
  partida. El 2026-09-20 se falló tres veces seguidas teniendo las tres respuestas en el LEEME.
- 🔴 **Al declarar `objetos` con una PRENDA, carga primero**
  [`garment-reference-kit.md`](../skills/greenhouse-ai-image-generator/references/garment-reference-kit.md):
  tiene la geometría verbatim del emblema (se espeja: 6 de 21 vistas del polo volvieron invertidas), cómo se
  pide un bordado (`satin-stitch`, no tinta plana), que el emblema **no se redimensiona**, y que **vestir a una
  persona real exige una foto de CUERPO ENTERO** además del rostro. Reconstruirlo de memoria costó una jornada
  el 2026-09-20 y el resultado fue un emblema inventado en cinco piezas.
- 🔴 **El emblema bordado NO se genera.** Medido 2026-09-20: tres prendas dieron **tres emblemas distintos y
  ninguno era el de Efeonce** (una espiral, dos barras, otras dos). Es el mismo hecho que gobierna la firma. En
  orden: que **no se lea** (de espaldas, en sombra, pequeño) · **componerlo** después · **editar con máscara**.
  **NUNCA** publicar el emblema tal como sale del generador, y **NUNCA** cerrar sin `pnpm foto:emblema`: el QA
  sobre una hoja de contacto no sirve, a 520 px un bordado no se lee y pasa por bueno.
- **Código de vestuario Efeonce** **[operador, 2026-09-20]**: la prenda dice el REGISTRO de la escena.
  **Polera piqué** = oficina casual · **Chaqueta** = reunión o instancia importante · **Gorra + polo** = terreno ·
  **Hoodie** = terreno · **Lanyard y carnet** = transversales, van en casual y en formal por igual. Se elige por
  el registro de la escena, NUNCA por variedad visual: una reunión importante en hoodie dice lo contrario de lo
  que la foto cuenta.
- **`ignore their clothing` NO alcanza:** con identidad, **declara el vestuario en la escena** o el modelo copia
  la ropa de las referencias. El comando avisa.
- **Editar conserva, generar reconstruye.** Para un ángulo nuevo de una persona, **edita su foto aprobada**;
  generar desde cero redondea el rostro (cuatro iteraciones lo probaron).
- **Retrato: 85 mm f/2, nunca 35 mm de cerca** **[del brief aprobado]**. El gran angular a distancia de retrato
  **ensancha y distorsiona el rostro**: parte de lo que se lee como «no es ella» es el lente, no deriva de identidad.
  La pieza aprobada es *chest-up medium close-up, 85 mm f/2*.
- 🔴 **La cabeza casi no gira: giran los ojos.** Pedir «gira la cabeza hacia el hombro» es pedir un **tres cuartos
  marcado**, y **pedir un ángulo que el set de referencias no cubre hace que el modelo reconstruya el rostro**. En la
  pieza aprobada la cabeza está casi frontal y **sólo los ojos** van hacia la mascota. Marcadores del casi-frontal:
  **ambos** ojos y **ambas** cejas visibles, ambas mejillas visibles, la oreja lejana **en cuadro**, el puente de la
  nariz **NO** corta la mejilla lejana.
- 🔴 **La mirada muy descendida destruye los ojos** **[medido 2026-09-21]**. Con la cabeza en tres cuartos y la mirada
  muy abajo, el párpado superior baja con el globo ocular y **devora el iris**; el ojo lejano queda como **ranura sin
  globo**. Editar «cejas altas» sobre esa pose **lo empeora**: sube la ceja y no reconstruye el párpado. Marcadores de
  ojo que sí funcionaron: el iris del ojo cercano **como círculo completo**, nunca media luna recortada por el
  párpado; **esclerótica visible a ambos lados**; el párpado superior por encima del iris con **su pliegue como línea
  propia**; línea de pestañas como **borde oscuro definido**, nunca fundida; el ojo lejano **abierto con su propio
  iris**, nunca una ranura oscura.
- **Marcadores verificables, no magnitudes.** «Gira 45 grados» da una cabeza inclinada; «la oreja lejana no se ve,
  el puente de la nariz corta la mejilla lejana» da el tres cuartos real. El casi-frontal se pide con los marcadores
  **inversos** (ver arriba), y antes de pedir cualquier giro, revisa si el set cubre ese ángulo.
- **Una palanca DE ENCUADRE dominante por pieza.** Combinar dos las diluye: cada una pide el control de la escena.
  Las otras tres familias sí se combinan con ella: **34 palancas en total** —5 siempre activas (bloque de impacto,
  incluido el sistema de color) · 4 atmósferas · 1 acción suspendida · **24 de encuadre**— más las **20 tomas de
  cámara** (ojo de pez, dron, tilt-shift, contrapicado, macro, tele, barrido…), que dicen *con qué* se fotografía
  y **no** son palancas. Índice: [catálogo de palancas](../../docs/operations/brand-photography/EFEONCE_PHOTO_LEVERS_CATALOG_V1.md).
- **La atmósfera exige un haz declarado** (el comando aborta sin él) y **la acción suspendida tiene dosis: 1 de
  cada 4 piezas** (el comando cuenta la tanda y avisa con el número).
- **El acento cálido también tiene dosis: 1 de cada 2** **[auditoría ciega 2026-09-20]**. El azul portador es
  estructura y va en TODAS; el acento es puntuación. Dos evaluadores ciegos lo contaron en 9 y en 12 de 12 y lo
  leyeron como un tic que delata que la serie se armó con una receta.
- **Si la pieza va a llevar titular, copy o cursores, declara `reservas` EN LA TOMA** y valida con
  `pnpm foto:validar <plate> --zona-texto`. Medido: las 12 piezas auditadas reprobaron la banda de texto (mejor
  caso 0,10 del alto contra 0,28 exigido) porque ninguna la declaró. **Reservar después de generar no existe.**
- **El texto de la escena EXISTE y es ilegible por causa física** (pequeño, fuera de foco, cortado, en ángulo),
  **nunca por estar en blanco**: doce piezas sin una sola letra delataron la generación (`bloque-realismo-v3`).
- **La luz con carácter va sobre el SUJETO; la reserva vive en la sombra que esa luz deja, nunca en su camino.**
  Vale también para el **lecho**: medido, 3,16 → 3,93 → **11,55:1** sólo por sacarlo del haz.
- 🔴 **El haz que sube al tercio superior rompe la banda de texto** **[medido 2026-09-21]**. En la misma ficha, la
  reserva cayó a **0,06** y **0,22** del alto cuando el haz o la ventana alcanzaban el tercio superior, contra
  **0,30–0,36** cuando entraban bajo. Corrección que funcionó dos veces: declarar que la ventana, la diagonal
  iluminada y **cada mancha que proyecta** quedan **bajo la mitad del cuadro**, y que el tercio superior es un campo
  de azul tinta sin interrupción.
- **Nunca un scrim.** Si el contraste no da, se **regenera** el plate; no se oscurece en post.
- **El plate nace sin logo ni texto.** La firma es el SVG oficial compuesto después, **20% del lado corto del lienzo**
  (decisión del operador 2026-09-20), contraste ≥ 4,5:1 medido.
- 🔴 **En un plate limpio, no sugieras criaturas ni siquiera de refilón** **[medido 2026-09-21]**. La frase «*as if
  something small were there asking her a question*» hizo que el modelo **materializara un robot blanco flotando**.
  Si la criatura se compone después, la mirada se describe como **geometría** y el vacío se **declara**: «*the air
  above that shoulder is EMPTY: no object, no creature, no robot, no toy, no figure*».
- 🔴 **Recorrido de la vista** **[operador, 2026-09-21]**: la mirada entra por el titular, baja por el **eje central**
  a la escena y sale por la firma. Un elemento al **margen y a media altura** queda fuera de ese recorrido: es un
  desvío lateral sin destino y se lee como adorno pegado, **aunque no tape nada y aunque su contraste pase**. Si va,
  va **sobre el eje**, como escalón entre titular y escena — la pieza aprobada lleva el chip «Contexto: 0 %»
  **centrado bajo el titular**.
- **Tope de tanda:** más de 6 fichas exige que cada una declare un `piloto` ya generado en disco. La calidad sale
  de generar poco y **mirar cada plate**.
- 🔴 **La `escena` NO puede contradecir al bloque de su palanca** **[medido 2026-09-21]**. Los dos viajan juntos
  en el mismo prompt y **gana la escena**, por más específica: la palanca se anula sin que nada lo delate. Así
  reprobó `ausencia` en la auditoría ciega —bloque «chair pushed back at an angle», escena «the empty chair» dos
  veces— y fue llamada la peor de las doce, «foto de inmobiliaria». No es un defecto de esa palanca sino del
  constructor: el aviso (`auditarContradicciones`) es por palanca. **Los marcadores ya estaban en el bloque**;
  lo que faltaba era impedir que la escena los contradiga.
- **`variantes` exige el campo `eje`: UNO solo.** Pedir tres a la vez producía el doble filo medido —si no se ve
  la diferencia no hay decisión; si se ve de más, dos copias del mismo archivo difieren y delatan la generación—.
- **El lecho se cuenta por FAMILIA, no por objeto** **[medido 2026-09-21]**. Los doce lechos de la serie auditada
  eran literalmente distintos (12/12) y aun así se leyó «el mismo recurso de profundidad siete veces»: lo que se
  repite es la forma —«el borde de una superficie, desenfocado, abajo»— en **7 de 12**. El catálogo tiene **21
  lechos medidos**; el comando avisa cuando una familia pasa de la mitad de la tanda.
- 🔴 **Lo sensible se COMPONE; el modelo sólo TERMINA** **[operador, 2026-09-21]**. Toda marca, texto
  exacto o arte oficial se arma aparte y determinístico, y al modelo se le pasa el armado para que
  ponga materia y luz, nunca dibujo. Un modelo no sostiene una marca: cuatro pasadas sobre la misma
  pieza dieron cuatro logotipos distintos. Comando: **`pnpm foto:lanyard`**. Dos corolarios medidos:
  las **proporciones se calculan del objeto real** (la unidad del patrón mide 7,05 veces el ancho de la
  cinta; el yoyo 1,6 veces) y el **arte plano sirve para PRODUCIR vistas del kit, la foto del producto
  terminado para USARLO en escena**.
- **Nunca ancles la serie en la categoría de un cliente** (pintura = Berel). El comando aborta.

## Los assets viven fuera de git — y el lock los vigila

Los renders de referencia y los kits pesan **640 MB** y están en `.gitignore`. Viven en la máquina y en OneDrive
(`5. Contenidos/13- Branding/` y `14. Mascotas de partners/`). Lo que **sí** está versionado es
`scripts/foto/assets.lock.json`: la huella SHA-256 de los **54** assets que el catálogo declara.

```bash
pnpm foto:assets:check   # ¿el catálogo y el lock coinciden?
pnpm foto:assets:lock    # resella el lock (tras agregar un kit o cambiar un asset a propósito)
```

Para qué sirve:

- **CI verifica el catálogo sin descargar nada.** Si agregas un kit con la ruta mal escrita, falla ahí.
- **Detecta que tu copia local difiere de la aprobada.** `pnpm foto:prompt` avisa antes de generar, y
  `pnpm foto:doctor` lo chequea entre sus pasos. Sin esto, una copia derivada produce una pieza con una
  referencia que el equipo nunca aprobó, y nada lo delata.

**Si agregas un kit o una vista al catálogo, resella el lock y commitéalo**, o el test lo marca como faltante.

## Al cerrar

`pnpm foto:validar` sobre el plate limpio y **mirar la imagen al 100%**: identidad contra la referencia **de la identidad que elegiste**, emblema
letra por letra, y que no haya texto ni marcas de terceros. Un contraste que pasa no prueba que la pieza esté bien.


🔴 **ANTES de generar una pieza con un asset de marca —ropa corporativa, lanyard, merch, logo 3D,
isotipo, nave o mascotas— carga el [contrato de selección de referencias](../../docs/operations/EFEONCE_BRAND_ASSET_REFERENCE_SELECTION_V1.md).** Hay **279 archivos en
10 kits**: el problema nunca es que falte la vista, es **elegir la correcta**. Resume tres reglas:

1. **Tres clases de asset, no intercambiables.** Arte plano → **producir** vistas del kit · pieza
   aislada → **construir** · **pieza en uso / producto terminado → USAR en una escena**. Darlos al
   revés hace que el modelo **reinvente la marca**.
2. **Lo sensible se compone; el modelo sólo termina.** Toda marca, texto exacto o arte oficial se arma
   determinístico y al modelo se le pide **sólo material y luz**. Un modelo no sostiene una marca:
   cuatro pasadas sobre la misma pieza dieron cuatro logotipos distintos.
3. **Las proporciones se calculan del objeto real**, nunca a ojo.

Y **abre el `LEEME.md` y el manifiesto del kit antes del prompt**: su `cuando_usarla` dice qué vista
corresponde, y si el kit trae **prueba en persona**, ésa es el punto de partida.
