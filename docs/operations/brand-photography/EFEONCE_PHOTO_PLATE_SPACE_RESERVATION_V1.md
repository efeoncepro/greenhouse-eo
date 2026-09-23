# Reserva de espacio en la toma — Lenguaje Fotográfico Efeonce

> **Tipo de documento:** Especificación técnica (capa fotográfica)
> **Versión:** 1.0 · **Creado:** 2026-09-19 por Claude
> **Estado:** parte de la capa **fotográfica aprobada** el 2026-09-19. No cubre la composición gráfica
> (titulares, jerarquía, cursores), que **no está aprobada**: ver el aviso de
> [zonas de composición y formatos](EFEONCE_PHOTO_TEXT_SPACE_AND_FORMATS_V1.md).
> **Relacionado:** [maestro](EFEONCE_PHOTOGRAPHIC_LANGUAGE_V1.md) · [firma](EFEONCE_PHOTO_SIGNATURE_FOREGROUND_V1.md) · [cámaras](EFEONCE_PHOTO_CAMERA_LENS_ANGLE_CATALOG_V1.md) · [prompts y pipeline](EFEONCE_PHOTO_PROMPT_BLOCKS_AND_PIPELINE_V1.md)

Una foto de marca puede tener que alojar después texto, una caja de selección, cursores o un dato. **Eso se
decide en la toma, no al componer.** Este documento cubre sólo lo que el plate debe traer; cómo se compone
encima pertenece a `efeonce-advertising-creative` y a su ficha tipográfica.

## 1. Las seis reservas posibles

| Reserva | Cuándo se pide | Qué debe traer el plate |
|---|---|---|
| **Zona de texto** | la pieza llevará etiqueta, titular o dato | área **pareja, sin objetos** y con **tono declarado** (sombra profunda o muro claro) |
| **Objeto para enmarcar** | la pieza llevará caja de selección | un objeto **aislado y completo** (la obra en revisión, el resultado), con aire alrededor para la caja y las etiquetas de cursores, **recortado contra un campo OSCURO Y PAREJO por escenografía en los CUATRO lados de su perímetro** (ver §2 regla 7) |
| **Lecho de la firma** | siempre | el primer plano desenfocado planeado, con su tono declarado (ver doc de firma) |
| **Aire para cursores** | la pieza llevará cursores | espacio libre al costado del objeto: las etiquetas viven **fuera** de la caja y con dos colaboradores el aire se paga dos veces |
| **Campo profundo al margen** | la pieza llevará una voz secundaria tipo cita | una **banda vertical** de tono declarado y parejo al margen izquierdo, que arranque en la zona de texto y siga libre **hasta al menos el 40% del alto**, sin que la escena la interrumpa (ver §2 regla 8) |
| **Lecho por formato** | siempre | el lecho de la firma **no mide igual en los tres formatos**: 4:5 → 18%, 9:16 → 22%, 16:9 → 16% **[medido en `rondas/texto/bv2-{45,916,169}.json`]** |

## 2. Reglas duras (todas verificadas en esta corrida)

1. **El tono se declara siempre.** «Calma» no basta: una pared de tono medio no deja leer ni texto blanco ni
   oscuro. Se pide «DEEP, warm, evenly toned shadow… dark enough for white text» o «plain, evenly lit, VERY LIGHT
   warm-white wall… light enough for dark text». Sin tono declarado, el plate falla **[medido: 1,3–4,3:1]**.
2. **Límite de sujetos.** En verticales: «All heads and hands stay BELOW 36% of the frame height». En 16:9:
   «All people and objects stay entirely inside the RIGHT 55%». Sin esto, el modelo sube las cabezas a la zona.
3. **Nombrar lo prohibido dentro de la zona:** «no windows, frames, prints, plants, light beams or bright spots».
4. **Formato nativo.** Se genera en el tamaño final (4:5 1152×1440, 9:16 1152×2048, 16:9 2048×1152). **NUNCA**
   se recorta un formato desde otro: el recorte se come la reserva.
5. **NUNCA un scrim.** Si la zona no da contraste, se **regenera el plate** o se mueve el texto. Oscurecer la foto
   está prohibido (decisión del operador: «es muy 2010, le resta limpieza»).
6. **Se mide antes de componer.** Sobre el plate limpio: nitidez de la zona (debe ser pareja) y contraste contra
   la tinta prevista (≥ 4,5:1). Si no pasa, el plate se rehace; no se parcha al componer.
7. **Un objeto que se va a enmarcar necesita perímetro oscuro en los cuatro lados.** La caja de selección AXIS usa trazo
   `#a6cdf5` con tiradores blancos: está diseñada para fondo oscuro y **desaparece sobre claro**. El campo oscuro se
   consigue por **escenografía de la escena**, nunca por degradado ni scrim. Piso: **≥ 3:1 del trazo contra la foto en el
   perímetro completo**, medido en los cuatro lados por separado. Arriba y abajo no bastan: el caso que parecía pasar
   (objeto del set contra pared oscura) **cayó a 1,81:1 al medir los costados** **[medido por la sesión de capa gráfica,
   2026-09-19]**. Sin este pedido explícito en el prompt, ninguna toma lo cumple: los plates existentes dan 1,0–2,5:1.
8. **Una voz secundaria tipo cita necesita campo profundo al margen.** No basta una zona calma: la banda debe ser
   **vertical**, de tono declarado y parejo, arrancar en la zona de texto y **seguir libre hacia abajo hasta al menos el
   40% del alto**. Todos los plates actuales **cambian de tono antes del 33%** y dan ≤ 1,7:1; el caso aprobado
   «¿Claude o Codex?» da 10,09:1 ahí **[medido por la sesión de capa gráfica, 2026-09-19]**.

## 3. Geometría por formato (punto de partida verificado)

| Formato | Zona de texto | Sujeto | Lecho de firma |
|---|---|---|---|
| 4:5 (feed) | 30% superior | 30–80% del alto | 18% inferior |
| 9:16 (Stories/Reels) | banda 10–32% del alto (bajo la barra de la red) | 35–75% del alto | 22% inferior |
| 16:9 (web, YouTube, LinkedIn) | 42% izquierdo | mitad derecha | 16% inferior |

Son puntos de partida medidos en esta corrida, **no una retícula aprobada**: la retícula definitiva debe salir de
una pieza compuesta y aprobada, no de estas pruebas.

**Delta 2026-09-23 · 16:9 con CTA y el piso de legibilidad.** Desde el piso de legibilidad del compositor de CTA (en un
teléfono, CTA ≥ 11 CSS px y las demás voces ≥ 9), el texto de un 16:9 nuevo ocupa cerca del **57 % izquierdo** del ancho:
la receta verificada, en un lienzo de 2048, es entrada, cierre y descriptor de 48 px, CTA de 60 y titular de 160, sin
nota. Con la reserva de 42 % sólo 3 de los 17 plates 16:9 actuales certifican (el resto choca con el sujeto). **Pendiente
de decisión del operador:** reservar ~58 % izquierdo en los plates 16:9 de piezas con CTA, o llevar menos texto en 16:9.
`foto:prompt` sigue pidiendo el 42 % hasta que se decida.

## 3.1 El tono no es el problema: la materia lo es **[decisión del operador, 2026-09-20]**

> **«No, no todo tiene que ser claro; de hecho faltaba probar los oscuros. El tema era que el modelo estaba poniendo
> un objeto sin sentido para lograrlo.»** — el operador, corrigiendo a las dos sesiones a la vez.

Las dos sesiones llegamos al error por caminos opuestos y el mismo vicio: **decidir el tono por regla global en vez
de por la escena.** Primero un armador impuso «oscuro» siempre; después se propuso «entonces claro por defecto». Las
dos son la misma equivocación.

**Una reserva oscura está perfecta cuando la superficie oscura existe de verdad y tiene nombre.** Lo que se prohíbe
es la reserva **sin materia**, en cualquier tono: un prompt que pide un tono sin decir de qué está hecha la cosa
obliga al modelo a inventar el objeto, y lo que inventa es un panel liso flotando — la «losa» que el operador
rechazó por «extremadamente forzado».

Probado el 2026-09-20 aislando la variable (misma toma, mismo tono oscuro, misma geometría; sólo cambió que la
materia tuviera nombre y una razón para estar en sombra):

| Toma | Materia nombrada | Resultado |
|---|---|---|
| T15 Noche | «the unlit interior studio wall beside the night window, in deep shadow but keeping visible texture (never pure black)» | reserva oscura natural, sin losa |
| T13 Escala (clara por diseño; su versión oscura anterior fue rechazada) | «the shadowed side of a deep concrete structural pier that the gallery daylight does not reach» | se lee como arquitectura, no como panel flotante |

**Ninguna métrica de píxel detecta la losa.** Planitud, dureza de canto y calma en L\* fallan las tres: la versión
buena de T13 tiene el canto **el doble de duro** que la rechazada. La diferencia es **semántica** —si la cosa oscura
es identificable como algo—, y eso se ataja en la **entrada**: `pnpm foto:prompt` aborta si la materia falta o es
genérica («a wall», «the surface»).

### Lo que sigue abierto, ya más chico **[pendiente — decisión del operador]**

Sólo la **reserva 2**: la caja de selección exige perímetro oscuro por canon (el trazo `#a6cdf5` desaparece sobre
claro) y eso sí choca cuando el lecho de la firma es claro en la misma zona. Sigue siendo decisión del operador:

La reserva del **objeto para enmarcar** pide campo oscuro en los cuatro lados. La reserva del **lecho de la firma** pide
tono declarado en el 16–22% inferior, y en cinco tomas aprobadas del catálogo ese lecho es **claro**: 11 (retrato
105–135, borde de escritorio claro), 13 (escala, piso de concreto claro), 17 (mesa larga, mesa clara), 18 (por encima del
hombro, borde de mesa claro) y 19 (picado 60°, mesa de luz clara).

Si el objeto a enmarcar está sobre la mesa y el lecho de la firma es el borde claro de esa misma mesa, **las dos reservas
piden tonos opuestos en zonas contiguas**. Salidas posibles, ninguna decidida:

- objeto enmarcado en la mitad superior contra campo oscuro, lecho claro abajo con firma en tinta;
- lecho oscuro y firma en blanco, cediendo el registro claro de esas cinco tomas.

**No generar plates que pidan las dos cosas a la vez hasta que el operador elija.** El prompt saldría con el conflicto
horneado y el plate no serviría para ninguna de las dos. Esto ya NO alcanza a la reserva de texto ni a la del margen:
ésas se resuelven con materia nombrada, en el tono que pida la escena.

## 4. Qué NO define este documento

- Tamaños, pesos, jerarquía, posición exacta del texto y de los cursores: eso es la capa gráfica, hoy **no
  aprobada**, y su canon es `efeonce-advertising-creative` (brief + ficha tipográfica + gate DO/DON'T).
- Cuándo una pieza lleva caja de selección: la caja tiene propósito (objeto con sentido o palabra con énfasis);
  si no lo hay, no va.

## 5. Evidencia

Plates y mediciones en `ai-generations/2026-09-19_lenguaje-fotografico-efeonce/rondas/texto/` (v1 sin tono
declarado = falla; v2 con tono y límite de cabezas = pasa) y `rondas/capas-v2/`. OneDrive:
`referencias/08-espacio-texto-y-formatos/`, con la hoja del primer intento fallido como material de aprendizaje.

## Delta 2026-09-20 — la zona de texto se mide a la escala de la letra, no del grano

**Dos reglas del canon se contradecían y ninguna pieza legítima podía pasar.** La zona de texto se validaba con
`calma` —gradiente de luminancia píxel a píxel, es decir **microtextura**— mientras la guarda de materia del
generador **exige** una superficie con nombre («a wall of board-formed concrete», nunca «a wall»), y toda materia
real tiene grano.

**Medido sobre `V2-marcado-45`** (`ai-generations/2026-09-20_plates-con-voz/`): la banda superior de hormigón
encofrado daba **contraste 20:1 en todo su alto** —cuatro veces el mínimo de 4,5— y reprobaba **sólo por calma**,
0,55–0,78 contra un máximo de 0,50. A ojo, el titular cabía perfecto.

**El umbral viejo no nació mal.** Se calibró con plates que pasaban a 0,24–0,29, pero eran los de superficie lisa
que el canon prohibió después como «losa». **La guarda de materia lo dejó obsoleto y nadie lo recalibró**, y por
eso «espacio para texto» llevaba un día como pendiente sin que se supiera que el instrumento era el problema.

**Corrección: cambia el instrumento, no el umbral.** Subir `CALMA_MAX` habría borrado la pregunta. Lo que estorba
a un titular no es el grano de la materia, es una variación de luminancia **a la escala de la letra**. La banda se
reduce a bloques de ~1/18 del lado corto y se mide la **desviación de L\* entre bloques**: el grano se promedia y
sobrevive lo que de verdad rompe la lectura —una ventana, un objeto claro, un degradado fuerte—.

| | Reservan de verdad (`V1`…`V5`) | No reservaron (auditoría ciega) |
|---|---|---|
| `calma` vieja (grano) | 0,00 · 0,00 · 0,44 · 0,40 · 0,08 | 0,00 · 0,00 · 0,10 · 0,00 |
| **`calmaTexto` (escala de letra)** | **0,46 · 0,54 · 0,52 · 0,40 · 0,42** | **0,00 · 0,00 · 0,20 · 0,00** |

La vieja daba cero a los dos grupos: **no discriminaba**. La nueva separa 4 de 5 contra 0 de 4 (`V4` queda en
0,40 contra el 0,42 que pide la columna del 16:9, a dos centésimas).

`CALMA_TEXTO_MAX = 12` (desviación en L\*). `CALMA_MAX = 0,5` **sigue vigente** para las demás reservas —aire de
cursores, campo profundo—, donde el gradiente fino sí es la medida correcta.

> **Regla que queda:** cuando una guarda reprueba algo que a ojo está bien y el contraste sobra por cuatro veces,
> sospecha del instrumento antes que de la pieza. Y si dos reglas del sistema no se pueden satisfacer a la vez,
> una de las dos llegó después y dejó a la otra obsoleta.

## Delta 2026-09-21 — las dos reservas compiten por el alto, y la lámpara visible se riggea baja

Dos reglas nuevas, las dos medidas sobre la tanda de `ai-generations/2026-09-21_copiloto/plates/`.

### 1. En el retrato centrado 4:5, la banda de texto y el lecho de la firma COMPITEN por el alto **[medido en 3 pasadas]**

| Pasada | Banda de texto | Lecho de la firma |
|---|---|---|
| v1 | 0,22 ✗ | 2,45 ✗ |
| v2 | **0,30 ✓** | 1,85 ✗ |
| v3 | 0,26 ✗ | 3,72 ✗ |

**Bajar al sujeto hace crecer la banda, pero las manos y la mesa invaden el borde inferior y matan el lecho;
subirlo hace respirar el lecho y mata la banda. Ninguna combinación de encuadre cierra las dos.** No es un
problema de ajuste fino: el alto del cuadro es uno solo y las dos reservas se lo disputan desde extremos
opuestos.

**Salida descartada: firmar sobre el muro.** El fieltro acústico daba **13,9:1**, de sobra para la firma
**[medido]**. El operador la rechazó **[decisión del operador]**:

> **«la puesta en escena también debe tener lecho igual que la documental»**

🔴 **Salida correcta: un objeto propio del oficio en PRIMER PLANO, fuera de toda luz.** No el canto de la mesa
—que recibe relleno y queda gris—, sino un objeto que la escena ya justifica y que se saca deliberadamente del
alcance de la llave y del rim. En el caso medido, el **micrófono del invitado** cruzando el borde inferior,
desenfocado y sin luz encima: **banda 0,34 ✓ · lecho 8,32 ✓ en la misma pieza** (`G-podcast-v5.png`)
**[medido]** — las dos reservas cerradas sin mover el encuadre del sujeto.

> **Formulación general:** el lecho **no es «la superficie de abajo»**. Es **un objeto del oficio puesto ahí a
> propósito y sacado de la luz**. Buscarlo entre las superficies que ya están abajo es lo que produce el empate:
> se declara como objeto, con su nombre y su razón para estar en sombra.

Esto se acopla con la regla ya vigente de que la luz con carácter va sobre el sujeto y la reserva vive en la
sombra que esa luz deja, nunca en su camino: el lecho se gana sacando el objeto del haz, no agrandando el
margen inferior.

### 2. Con fuente visible en cuadro, la lámpara se riggea BAJA **[medido]**

La palanca `luz-motivada` pide que **la fuente sea visible y sea lo más brillante del cuadro**; la reserva de
texto pide el **tercio superior limpio**. Las dos se cruzan en el mismo tercio y, a la altura habitual de un
softbox, gana la lámpara.

| Pieza | Altura de la fuente | Banda de texto |
|---|---|---|
| `E-estudio-v1.png` | softbox a la altura del pecho | **0,00 ✗** (inservible) |
| `E-estudio-v2.png` | riggeado entre rodilla y pecho | **0,28 ✓** (lecho 9,92 ✓) |

Riggear bajo no es una concesión a la reserva: **es como se ilumina de verdad un objeto pequeño**, así que la
corrección mejora la escena en vez de deformarla.

> **Regla que queda:** **con fuente visible en cuadro, lámpara baja, o no hay banda de texto.** Es el mismo
> mecanismo que el haz que sube al tercio superior: lo que entra a la zona reservada la rompe, sea el haz, la
> ventana, una mancha proyectada o la fuente misma.

## Delta 2026-09-23 — el lecho se valida contra la caja de la firma

**El porcentaje del lecho por formato (§1, §3) no basta.** La reserva del lecho se da por cumplida cuando la caja de la
firma, **en su posición final**, cae dentro de la materia calma del lecho, con el canto por encima. Se mide en el plate
—dónde sube la luminancia— y se mira al 100 %: ni la brief ni un contraste que pasa lo prueban **[medido 2026-09-23]**.
En una story con la zona segura de AXIS (su borde inferior está al 87 % del alto), la firma de 20 % del lado corto
pegada a ese límite ocupa **1619–1670 px de 1920** (84,3–87,0 %) y no puede bajar más: el canto tiene que quedar por
encima de esa caja.

**Caso.** Story `04-elegida-916` de «Que te elijan» (v07). La brief del plate pedía el borde superior del primer plano en
y≈79–80 % («lowest fifth») y una zona calma en 82–85 % para la firma; el plate generado dejó el canto en ≈83–84 %, y
nadie lo verificó contra la caja de la firma. Cuando la firma subió a centro 85,65 % para entrar en la zona de AXIS, su
caja (1418–1452 en el plate de 941×1672) quedó sobre el canto iluminado —la subida de luminancia iba de y≈1394 a 1420—,
junto a un apoyabrazos cromado desenfocado. El contraste medido pasaba (**6,53:1**) y la revisión visual dijo que la
firma «se apoya en la materia desenfocada del lecho»; lo vio el operador.

**Método aprobado por el operador.** Subir el primer plano completo —lecho y apoyabrazos— como **una sola capa rígida**,
60 px del plate (69 en la pieza), como si la cámara estuviera un poco más baja: lo cercano sube, el fondo no. El corte va
pegado al objeto y en zonas oscuras —6 px sobre el canto del lecho, medido columna a columna; 4 px sobre el halo del
apoyabrazos—, por una curva suave trazada sobre la medición de luminancia, sin escalones entre columnas, con 10 px de
fundido; lo que falta al pie se completa estirando la franja inferior, que es desenfoque uniforme. Sin IA y sin deformar
la forma del canto: no pinta ni oscurece nada. La firma no se movió y su contraste pasó a **11,58:1**. Script:
`ai-generations/2026-09-23_v07-lecho-04-elegida/subir-primer-plano-v4.cjs` (el halo y los rangos de búsqueda están
medidos para ese plate). Descartados: inpainting con máscara sobre la franja (panel plano de borde recto que se lee como
velo y borra objetos), levantar sólo el centro del lecho (montículo forzado, rechazado por el operador), mate por brillo
(objeto fantasma) y corte por envolvente ancha (arrastra la manga y rompe contornos). Detalle y porqués en
`.claude/rules/brand-photography.md`.

Se acopla con la [firma](EFEONCE_PHOTO_SIGNATURE_FOREGROUND_V1.md) (§ Ads: proporción del lecho y continuidad), que ya
exigía la caja completa dentro de la superficie desenfocada y, para 9:16, «elevar ligeramente el inicio del lecho»: este
caso agrega que la verificación se repite al mover la firma y que la altura del lecho se mide, no se hereda de la brief.

> **Regla que queda:** la reserva del lecho se valida contra la caja real de la firma, no contra un porcentaje ni
> contra la brief, y se vuelve a validar cada vez que la firma cambia de posición.

## Delta 2026-09-23 (tramo 16) — materia calma bajo la banda de la firma, y el compositor mide el canto

El lecho de la firma tiene que dejar **materia calma en toda la banda de la firma**: bajo su caja y un poco por encima
y por debajo, sin un escalón de luz que la cruce. Desde el tramo 16 del
[compositor de CTA](../EFEONCE_ADVERTISING_CTA_COMPOSITOR_V1.md) eso se mide: `pnpm foto:componer:cta` registra en el QA
la pendiente de luz bajo la caja real de la firma (`firmaCanto`: luma media por fila, desde el 10 % del alto de la caja
por encima hasta el 10 % por debajo, normalizada al lado corto), y sobre **18,5** el gate **bloquea en las piezas
nuevas** (regla `firma-canto`, exceptuable sólo con aprobador); en una pieza nueva, además, `logo.y: "auto"` descarta
las alturas sobre el canto. En las aprobadas sólo avisa. Calibración: la firma de «Que te elijan» sobre el canto mide
23,3 y con el lecho subido, 6,0; pasan 85 de 86 firmas aprobadas. La que no, KV-06-916 de CMP-002 (29,3), tiene el logo
sobre el canto de una mesa y queda como decisión del operador.

> **Regla que queda:** la toma deja el canto del lecho por encima de la banda de la firma. Si el plate no lo cumple, en
> una pieza nueva se rehace (§2, regla 6); subir el primer plano de un plate ya generado es un arreglo sólo para piezas
> aprobadas.
