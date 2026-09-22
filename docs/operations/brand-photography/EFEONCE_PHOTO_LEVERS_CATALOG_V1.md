# Catálogo de palancas fotográficas Efeonce V1

> **Tipo de documento:** Catálogo canónico de oficio (maestro de palancas)
> **Versión:** 2.4 · **Creado:** 2026-09-20 por Claude · **Última actualización:** 2026-09-21 por Claude
> **Estado:** treinta y cuatro palancas en cuatro familias. Treinta y tres aprobadas por el operador tras tres rondas de prueba
> medidas el 2026-09-20; `copiloto` entra el 2026-09-21 desde una pieza aprobada (el KV «Tu IA no conoce tu negocio», 17/09).
> **Relacionado:** [maestro](./EFEONCE_PHOTOGRAPHIC_LANGUAGE_V1.md) · [prompts y pipeline](./EFEONCE_PHOTO_PROMPT_BLOCKS_AND_PIPELINE_V1.md) · [cámaras](./EFEONCE_PHOTO_CAMERA_LENS_ANGLE_CATALOG_V1.md) · [reservas](./EFEONCE_PHOTO_PLATE_SPACE_RESERVATION_V1.md)

Una **palanca** es una decisión de oficio que cambia lo que la foto *hace*, no lo que muestra.

**Hay cuatro familias y se combinan entre sí**, aunque dentro de la familia de encuadre va **una sola**:

| Familia | Cuántas | Cómo se pide | Cuántas por pieza |
|---|---|---|---|
| [A. Siempre activas](#a-las-cinco-siempre-activas-el-bloque-de-impacto) | 5 | van solas en cada prompt (`impacto: false` las apaga) | las cinco |
| [B. Atmósfera](#b-atmósfera--el-aire-que-hace-visible-la-luz) | 4 | `atmosfera` | una, opcional |
| [C. Acción suspendida](#c-acción-suspendida--lo-que-está-en-vuelo) | 1 | `suspendido` | opcional, **1 de cada 4 piezas** |
| [D. Encuadre y punto de vista](#d-las-veinticuatro-de-encuadre-y-punto-de-vista) | 24 | `palanca` | **una sola** |

Son **34 palancas**, y se combinan con las **[20 tomas de cámara](#las-veinte-tomas-del-catálogo-de-cámara)**
—ojo de pez, dron cenital, tilt-shift, contrapicado, macro, tele, barrido…— que dicen **con qué** se fotografía.
Además hay [otros ejes](#otros-ejes-que-deciden-la-pieza-y-no-son-palancas) —formato, reserva,
lecho, cámara, objetos de marca, identidad— que deciden la pieza pero tienen documento propio. Y no todas sirven
en los dos registros visuales: el [mapa palanca ↔ registro](#en-qué-registro-sirve-cada-palanca) dice cuál va en
cuál. El maestro define el
lenguaje —«El oficio a la vista», la barra de juicio, el color, la firma—; este catálogo define **con qué recursos
se construye una pieza dentro de ese lenguaje**.

Las palancas se piden con el campo `palanca` de la ficha y las emite `pnpm foto:prompt`. **Nunca se escriben a
mano en la escena**: el comando las resuelve con sus marcadores verbatim, sus campos obligatorios y sus guardas.

---

## Las tres reglas que gobiernan todo el catálogo

### 1. Una palanca **de encuadre** dominante por pieza **[medido]**

Combinar dos las diluye. En la prueba `B6` se pidieron `pov` y `luz-motivada` juntas: el POV reclama su encuadre,
la luz motivada reclama dominar la escena, y la pieza salió con **un poco de cada una y lo mejor de ninguna**. El
comando **rechaza una lista** de palancas y lo explica.

Las de encuadre **no se suman, compiten**. Las otras tres familias sí se combinan con ella: una pieza
puede llevar las cinco siempre activas + una atmósfera + una acción suspendida + **una** de encuadre.

### 2. Marcadores verificables, nunca magnitudes **[medido cuatro veces]**

Al modelo «gira 45 grados», «baño de color», «fragmento radical» o «épica» **no le dicen nada**: devuelve la
versión moderada de lo que pediste. Lo que sí obedece es **qué se ve y qué NO se ve**:

| En vez de | Se escribe |
|---|---|
| «tres cuartos a 45°» | «la oreja lejana no se ve; el puente de la nariz corta el contorno de la mejilla lejana» |
| «fragmento radical» | «el borde derecho corta su cara pasando el puente de la nariz; el ojo lejano NO está en el cuadro» |
| «perfil estricto» | «sólo un lado de la cabeza; la oreja cercana completa; el ojo lejano NO visible» |

Todos los bloques de este catálogo llevan una frase de verificación. **Si escribes una palanca nueva sin ella, no
está terminada.**

### 3. El sistema de color va en TODAS **[medido — 21 de 21 fichas lo omitieron]**

Al probar palancas nuevas es fácil concentrarse en la geometría y dejar la paleta fuera. Pasó en las tres rondas
del 2026-09-20: **las 21 fichas omitieron el color** y las piezas salieron como buena fotografía genérica en vez
de Efeonce. El operador lo detectó a simple vista.

- **El azul va en todas**, como **portador visible**: una pantalla, un panel de luz, una lona, una carpeta, la
  tinta cian de un pliego. Un HEX suelto en un bloque genérico **no basta**: el azul tiene que estar *en algo*.
- **Un solo acento** (naranja o lima), **1–5% del cuadro**, **nacido de la situación**: una cinta de marcaje, un
  post-it, un lápiz graso, un sandbag. Utilería puesta se lee falsa.

`pnpm foto:prompt` **avisa** cuando la escena no declara portador de azul o acento.

---

## A. Las cinco siempre activas (el bloque de impacto)

Van en **todos** los prompts, juntas y sin pedirlas: el comando emite `bloque-impacto-v1.txt` salvo que la ficha
diga `impacto: false`. Por eso **ninguna palanca de otra familia puede contradecirlas**, y por eso el bloque
**nunca** lleva algo volando ni una atmósfera: se emitiría en cada pieza (§C).

| # | Palanca | Qué exige | Trampa |
|---|---|---|---|
| 1 | **Una idea visual por cuadro** | Una sola, audaz | Dos ideas compiten y ninguna se lee |
| 2 | **Luz con carácter** | Haz duro y direccional de sol real o una fuente fuerte esculpiendo al sujeto, sombras gráficas, negros ricos **con detalle** | «Nunca plana, nunca pareja»: pedir zona pareja aplana la escena entera **[medido]** |
| 3 | **Momento decisivo** | El pico de la acción | Dos palancas lo apagan a propósito y está bien: `larga-exposicion` y `ausencia` |
| 4 | **Composición gráfica** | Geometría fuerte, figura-fondo clara, espacio negativo generoso y en calma | El espacio negativo es la reserva de texto, no relleno |
| 5 | **Tres planos de profundidad** | Primer plano desenfocado · sujeto nítido · fondo suave | El primer plano **es** el lecho de la firma: se planea desde la toma, no se agrega |

Y el **sistema de color**, que viaja en el mismo bloque: color natural **sin grade**, paleta contenida donde el
azul (`#0375DB`) emerge de la luz, los reflejos, los materiales reales o la relación entre planos —sin exigir un
objeto azul aparte—, todo lo demás neutro-cálido, altas luces con detalle, balance de blancos cálido-neutro y
**sombras nunca azules**. La regla 3 de arriba dice qué hacer cuando la escena no lo ofrece sola.

## B. Atmósfera — el aire que hace visible la luz

Materia en el aire cuya **única** función es que el haz se vea. Es la palanca de **mayor retorno** de todo el
catálogo **[medido 2026-09-20]**. Se pide con `atmosfera`, una por pieza.

| Valor | Qué es | Límite duro |
|---|---|---|
| `polvo` | Partículas finas a la deriva dentro del haz, que lo vuelven visible | Vive **sólo dentro de la luz**, jamás como suciedad sobre las superficies |
| `bruma` | Velo bajo y parejo: los haces se paran como columnas sólidas y la distancia se lee en capas | Limpia y delgada. **Nunca niebla, nunca smog** |
| `vapor` | Hilo de vapor tibio que sube y atrapa la luz | Breve. **Nunca una nube que tape al sujeto** |
| `humo` | Velo bajo a contraluz que hace visible el haz y perfila a las figuras | Humo de escena limpio. **Nunca humo de algo quemándose, nunca aire sucio** |

> **Exige un haz declarado y el comando aborta sin él.** Sin luz con dirección la atmósfera no tiene qué revelar:
> el modelo la pinta encima y se lee pegada. Si la escena no declara una fuente, o se declara o se saca la
> atmósfera.

## C. Acción suspendida — lo que está en vuelo

Congelar algo en el **pico de su arco**, con su peso y su trayectoria reales, cada pieza nítida y claramente en
vuelo. Se pide con `suspendido` **diciendo qué vuela, en concreto**: el comando rechaza un valor vacío o genérico
de menos de ocho caracteres, porque dejarlo abierto hace que el modelo elija, **y elige confeti**.

> **Dosis: 1 de cada 4 piezas** **[decisión del operador]**. El comando cuenta la tanda y avisa con el número.
> Es también la razón por la que no vive en el bloque siempre activo: ahí volaría algo en cada foto.

## D. Las veinticuatro de encuadre y punto de vista

### De luz y tiempo

#### `luz-motivada` — la fuente se ve
**Qué es.** La luz que baña al sujeto sale de algo que está **dentro del cuadro**: un monitor, una pantalla mural,
una lámpara práctica, una ventana. Es lo que separa luz real de un grade, que este lenguaje rechaza.
**Cómo se logra.** La caída tiene que leerse: el lado cercano a la fuente iluminado, el lejano cayendo a negro, y
la dirección inequívoca desde la fuente. El color viene de la fuente, nunca de un filtro sobre la imagen.
**Evidencia.** `B3` (monitor de calibración, Bogotá) · lecho 17,26:1.
**Evidencia 2026-09-21 — el estudio en operación.** `E-estudio-v2.png`: ciclorama con la luz montada, softbox,
alguien corrigiendo y el monitor con la toma ya tirada. Es la vía por la que el look de estudio entra al lenguaje,
porque **un retrato contra fondo liso falla cuatro de los siete criterios** (obra, mecanismo, idea y paleta en la
composición) y choca con «salas tonales genéricas» y «paneles azules grandes de fondo».
**Ojo — la altura de la lámpara.** Esta palanca pide fuente visible y que sea lo más brillante del cuadro, y la
reserva pide el tercio superior limpio: las dos chocan. Con el softbox a la altura del pecho la banda de texto
midió **0,00** (inservible); riggeado **entre rodilla y pecho** —que además es como se ilumina de verdad un objeto
pequeño— sube a **0,28**. **Con fuente visible en cuadro: lámpara baja, o no hay banda de texto.**

#### `larga-exposicion` — duración en vez de instante
**Qué es.** Personas y luces se disuelven en estelas continuas mientras **un elemento queda perfectamente nítido**
y ancla la imagen.
**Cómo se logra.** Trípode. El movimiento lee como tiempo acumulado, no como trepidación, y nadie en movimiento es
reconocible.
**Ojo.** **No tiene momento decisivo** y es correcto que no lo tenga: su tensión es la duración. El comando apaga
ese aviso para esta palanca, y sólo ese.
**Evidencia.** `B4` (montaje nocturno, Miami) · lecho 19,91:1.
**Evidencia 2026-09-21 — se adapta bien al registro de puesta en escena.** `K-larga-v1`, con la idea **«el que no
se mueve»**: el sujeto quieto mirando al lente mientras todo lo demás se disuelve. Pasa la prueba dura del
registro —**significa sin titular**—. Medido: banda **0,30 ✓** · lecho **2,27 ✗** · b\* **−0,6**, con el emblema
verificado al 100%.
**Reserva abierta — el lecho no cierra.** Mide **2,27** porque **las estelas de luz pasan por encima del road
case**. Se cierra **sacándolo del paso de los trazos**: la misma lógica que sacarlo de la llave.

#### `silueta` — contraluz que borra el rostro
**Qué es.** La figura contra la luz, reducida a contorno. **Deja el gesto y quita la identidad.**
**Cómo se logra.** Cámara de frente a la fuente; la figura casi negra **sin un solo rasgo facial visible**; bordes
de hombros y pelo con filo de luz; fondo quemado a blanco limpio. La pose debe leerse como forma.
**Para qué sirve.** Es la segunda vía —junto a `manos`— a piezas que **no dependen de identidad**.
**Evidencia.** `C1` (dirección a contraluz, Santiago).

### De punto de vista

#### `pov` — tu lugar en la mesa
**Qué es.** La cámara **ocupa el lugar de la persona con la que se trabaja**: el asiento del cliente, la silla del
visitante, el lado de la mesa donde se sienta quien recibe.
**Cómo se logra.** Altura de ojos sentado; los sujetos al otro lado dirigiéndose a ese lugar; miran la obra o
apenas pasando el lente, nunca al lente; el borde del asiento propio visible abajo.
**Por qué importa.** Es el Why de Efeonce hecho encuadre y **la que mejor pasa el test de sustitución**: otra
agencia no la copia sin tener esa idea.
**Evidencia.** `B1` (revisión desde la cabecera, Santiago) · lecho 18,84:1.
**Evidencia 2026-09-21 — la coartada narrativa más fuerte del registro de puesta en escena.** `J-pov-v1`, con la
idea **«te estoy hablando a ti»**. Es **nativa del registro B** y la que mejor lo resuelve, porque la cámara
**ocupa el asiento del cliente**: no es que el sujeto «mire al lente», es que **te habla a ti**. Pasa la prueba
dura del registro —**significa sin titular**—. Medido: banda **0,32 ✓** · lecho **5,18 ✓** · b\* **−0,6**, con el
emblema verificado al 100%.

#### `oclusion` — mirar desde detrás de algo
**Qué es.** Un objeto en primer término **cubre parcialmente** al sujeto: la cámara miró desde donde estaba y no
movió nada.
**Cómo se logra.** Debe **cubrir una parte real** —cerca de un tercio del cuadro, solapando cuerpo o borde de
cara—, estar más cerca del lente y quedar desenfocado.
**Ojo.** Pedida a medias **se anula**: en `B5` el objeto quedó al costado y la pieza se lee «hay algo delante».
Por eso exige el campo `ocluye`.
**Evidencia.** `B5` (Ciudad de México) · lecho 5,40:1.

#### `suelo-oblicuo` — la cámara en el piso, ladeada
**Qué es.** El cuerpo de la cámara **apoyado en el suelo**, inclinado y **rotado** para que el horizonte corra en
diagonal.
**Cómo se logra.** El piso ocupa el tercio inferior entero, enorme y desenfocado, con su grano al ras del lente;
piernas y objetos se alzan como columnas; el techo converge arriba; **toda vertical se inclina** por la rotación.
**Evidencia.** `E2` (set Run & Gun, Lima).

#### `dentro-del-objeto` — la cámara adentro, mirando afuera
**Qué es.** El lente vive **dentro de un contenedor** —una maleta de equipo, un rack, una caja— y mira hacia
fuera.
**Cómo se logra.** Las paredes internas enmarcan la imagen por los cuatro lados, oscuras y algo desenfocadas,
formando una ventana; alguien alcanza **hacia el lente**; dentro oscuro y afuera luminoso, así la abertura lee
como un rectángulo brillante dentro del negro. Exige el campo `objetoContenedor`.
**Evidencia.** `E6` (desmontaje, Miami).

#### `little-planet` — el mundo cerrado en esfera
**Qué es.** Proyección estereográfica de una panorámica 360°: el lugar entero se enrolla alrededor de un suelo
redondo que se lee como un pequeño planeta.
**Cómo se logra.** El suelo curva en **esfera completa** al centro; paredes y objetos **irradian** hacia fuera
inclinándose; el cielo llena las cuatro esquinas; **el horizonte es un círculo cerrado**. No es un ojo de pez
rectangular ni un recorte circular.
**Ojo.** No admite lecho: se declara `lecho: "sin-lecho"` con su razón. Formato cuadrado.
**Conservada por decisión del operador** **[2026-09-21]**. La auditoría ciega pidió decidir sobre ella: los dos
evaluadores la llamaron «un truco de lente sin idea detrás», «de 2015», «no pertenece a ninguna de las otras
once», y se sale del sistema por **tres vías a la vez** —única cuadrada, única sin lecho, única que fotografía
una proyección en vez de un oficio—. El operador la conserva: «a mí me gusta, no la descartaré». La tensión
queda **registrada y aceptada**, no resuelta: si se usa, que sea con trabajo en curso dentro de la esfera.
**Evidencia.** `E3` (estudio completo, Santiago) · `F7` (reprobada en la auditoría ciega).

### De encuadre

#### `manos` — las manos son el sujeto
**Qué es.** El cuadro lo llenan **manos trabajando**. El oficio se ve en las manos antes que en la cara.
**Cómo se logra.** Sólo manos y antebrazos; **ni una cara, ni siquiera desenfocada al fondo**; piel real con poros
y pliegues; acción concreta a mitad, no posada.
**Para qué sirve.** Da piezas **sin depender de identidad** y mata el casting de modelo.
**Evidencia.** `B2` (selección de papeles, Lima) · lecho 17,22:1.

#### `cenital` — el oficio visto desde arriba, en curso
**Qué es.** Cenital **perpendicular** sobre la superficie de trabajo, que se vuelve un plano gráfico.
**Cómo se logra.** Cámara a dos metros exactamente perpendicular, sin perspectiva en los bordes; lo que hay está
**a mitad de proceso**, no ordenado; **manos entrando por distintos bordes**; sin caras ni cuerpos.
**Ojo.** Normalmente no admite lecho (no hay plano intermedio): `lecho: "sin-lecho"` con su razón.
**Evidencia.** `D3` (selección de papeles desde arriba, Lima).

#### `fragmento` — el corte que no deja caber
**Qué es.** Un encuadre tan cerrado que **el sujeto no cabe**.
**Cómo se logra.** Declarando **por dónde corta el borde**, con el campo `corta`: «el borde derecho corta su cara
pasando el puente de la nariz, el ojo lejano NO está en el cuadro». La cara llena el cuadro entero; ni hombros ni
cuerpo ni sala alrededor.
**Ojo.** «Radical» no significa nada para el modelo; el corte declarado sí.
**Evidencia.** `D4` (Julio) y `E1` (Nexa).

#### `sombra` — la sombra es el sujeto
**Qué es.** Lo fotografiado **es la sombra**, no quien la proyecta.
**Cómo se logra.** Luz baja y dura que arroja una sombra **larga, nítida y gráfica** que ocupa el centro y la
mayor parte del cuadro, y es **la forma más detallada de la imagen**: en ella se leen la herramienta, los brazos,
la postura. De la persona sólo entra un fragmento al borde —los pies— o nada.
**Evidencia.** `E5` (azotea, Ciudad de México).

### De materia y relato

#### `instrumento` — a través de la herramienta del oficio
**Qué es.** La foto se toma **mirando a través** del instrumento: la lupa cuentahílos, el visor, un prisma, un
gel de color.
**Cómo se logra.** El vidrio llena el centro y lo que se ve dentro está nítido y magnificado o distorsionado;
fuera del barrilete todo cae en desenfoque; el barrilete es real, con su borde y su reflejo. **Distorsión óptica
real**, nunca un efecto digital ni una viñeta. Exige el campo `instrumento`.
**Por qué importa.** **Pasa el test de sustitución por construcción**: sólo la toma quien usa esa herramienta.
**Evidencia.** `D1` y `F1` (press check, Santiago).

#### `reflejo` — dos realidades en un cuadro
**Qué es.** A través de un vidrio, lo que está detrás y lo que está delante **conviven superpuestos**.
**Cómo se logra.** Lo que hay tras el vidrio, nítido y legible; **sobre el mismo vidrio**, el reflejo de lo que
está detrás de la cámara, ambos visibles **a la vez**, ninguno tapando al otro. La luz detrás de la cámara debe
ser fuerte para que el reflejo aguante.
**Por qué importa.** Es «lo construimos contigo» dicho en imagen.
**Evidencia.** `C2` (vitrina, Ciudad de México) · `A4`.

#### `ausencia` — presencia por ausencia
**Qué es.** **No hay nadie en el cuadro.** Queda la huella del trabajo que acaba de ocurrir.
**Cómo se logra.** Ni una persona, mano o cuerpo: la silla girada, las cosas donde se dejaron, el marcador
destapado, una lámpara encendida. Debe leerse como **si se hubieran ido hace un minuto**, no como una sala
ordenada y vacía.
**Ojo.** **No tiene momento** y es correcto: el punto es que nadie está. El comando apaga ese aviso.
🔴 **La escena no puede contradecir esto** **[medido 2026-09-21]**. Si nombras la silla, déjala **empujada,
corrida o girada**; una silla sólo «vacía» dice lo contrario y **gana**, porque es más específica que el bloque.
El comando lo detecta (`auditarContradicciones`) y avisa.
**Evidencia.** `C4` (funcionó) y `F4` (**reprobada por dos evaluadores ciegos**, ver abajo).

---

### De atención y de papel en la escena **[2026-09-20, ronda podcast]**

Nacieron en un estudio de podcast, que se usó como **laboratorio y no como tema**: es el único set donde el
momento real **no es hablar**. Las cuatro son domain-free — `entre-dos` se probó y salió una sala, no un estudio,
y funciona igual.

#### `escucha` — el momento de recibir
**Qué es.** Fotografiar a quien **recibe**, no a quien emite. Junto con `pov`, es el Why de Efeonce hecho
encuadre: la agencia que escucha antes de proponer.
**Cómo se logra.** Boca **cerrada** y relajada, sin dientes ni forma de media palabra; mirada baja o levemente
desenfocada que sale **fuera del cuadro** hacia quien habla, nunca al lente; cuerpo quieto e inclinado apenas
adelante, una mano cerca de la oreja o la mandíbula. La herramienta con la que hablaría —micrófono, lápiz,
teclado— **está en el cuadro y sin usar**. La tensión es la atención, no la acción.
**Por qué importa.** Es lo contrario exacto de una selfie: la persona no está actuando.
🔴 **Incompatible con el registro de puesta en escena, por construcción** **[criterio 2026-09-21]**. Ese registro
se reconoce porque el sujeto mira al lente, y acá **el sujeto no mira a nadie: está recibiendo**. Es documental
puro. No queda prohibida en una pieza de campaña, pero si se usa, **la pieza ya no se juzga con la barra de B**
([mapa palanca ↔ registro](#en-qué-registro-sirve-cada-palanca)).
**Evidencia.** `G1` (sesión de grabación, Santiago) · a la primera.
**Evidencia 2026-09-21 — resolvió el podcast que dos intentos previos habían fallado.** `F-podcast-v1.png`. Los dos
rechazos anteriores se leyeron como problemas de luz y color —`rondas/paleta/P2-podcast` por lámparas prácticas
encendidas (**b\* de altas luces +20,1**, look de podcast de stock) y `rondas/personas/JN2-podcast` por **paneles
azules grandes de fondo**—, pero la causa común era más profunda: **las dos fotografiaban la CONVERSACIÓN**, dos
personas simpáticas hablando en una mesa, que es genérica y **falla el test de sustitución**. Ninguna fotografiaba
el oficio. Fotografiar la escucha lo cierra: el sujeto no habla, el otro existe pero es **sólo una mano fuera de
foco** —no un segundo retrato—, y el mecanismo queda a la vista (micro de brazo entrando por el borde, forma de
onda corriendo en el laptop, interfaz con LEDs de nivel, fieltro acústico real). Con las dos causas del rechazo
cerradas y medidas: lámparas prácticas apagadas (llave = panel LED neutro fuera de cuadro) → **b\* −0,3** contra
los +20,1, y ningún panel azul: el azul entra sólo por el polo, que es el portador legítimo.

#### `atraviesa` — un objeto del oficio cruza el cuadro
**Qué es.** Un objeto largo y rígido del oficio —brazo articulado, riel, regla, tendido de cable, viga— **manda
la composición** en vez de la cara.
**Cómo se logra.** Corre en **diagonal dura** de una esquina hacia la opuesta, **a foco y nítido en todo su
largo**, con sus juntas y su material legibles. Pasa **entre el lente y la persona pero NO la cubre**: cruza el
aire vacío delante de ella y parte el cuadro en dos zonas.
**Ojo.** No es `oclusion` —esa **cubre** al sujeto— ni es el lecho, que va desenfocado contra el lente.
**Evidencia.** `G2` (Lima) · a la primera.

#### `entre-dos` — la cámara entre dos que trabajan juntos
**Qué es.** El sujeto es **el intercambio**, no ninguna de las dos caras.
**Cómo se logra.** Una persona en el borde **izquierdo** y otra en el **derecho**, ambas cortadas por el borde y
a la misma distancia del lente; **todo el centro del cuadro es el aire vacío** entre ellas. **Ninguna mira al
lente**: se miran **a través** de él, así que sus líneas de visión se cruzan delante de la cámara. Una acaba de
terminar y la otra empieza.
**Ojo.** No es `pov`: ahí la cámara ocupa el lugar del cliente y los sujetos se dirigen a ese lugar. Acá la
cámara es un estorbo entre dos que se hablan entre sí.
**Evidencia.** `G3` (Ciudad de México) · a la primera.

#### `quien-sostiene` — quien hace posible el momento, no quien lo protagoniza
**Qué es.** **Invierte a quién le toca el foco.** Es, con `pov`, la más Efeonce del catálogo.
**Cómo se logra.** Nítida en el primer término va la persona que **opera** —mesa, consola, panel, rig— en tres
cuartos, con una mano en un control y la vista en un medidor. Quienes **actúan** están detrás, **pequeños,
suaves y fuera de foco**, de espalda, sin un rasgo legible. **El ojo tiene que llegar primero a quien opera y
último a quien luce**: esa inversión es el punto.
**Evidencia.** `G4` (Bogotá) · a la primera; los faders dieron el azul sin poner nada.

### Del oficio de decidir **[2026-09-20, ronda oficio digital]**

> **La tesis que las une.** El oficio con IA **no está en la máquina, está en la decisión**. Generar es barato y
> no se ve; lo que cuesta es **elegir, descartar, corregir y dirigir**. Un robot, un circuito o una interfaz
> flotante fotografían la parte que no vale nada, y encima es lo que hace todo el mundo. Estas cuatro fotografían
> **el juicio**, que es lo que Efeonce vende y lo que la IA no hace.

#### `variantes` — la misma cosa repetida, y una elegida
**Qué es.** El sujeto es **la elección**, no el objeto.
**Cómo se logra.** El cuadro lo llenan **nueve a doce copias de la misma pieza** en una **rejilla regular**, y
**una sola** queda **apartada**: adelantada, levantada, girada o marcada. La repetición casi idéntica **es** el
tema. Mano y antebrazo pueden entrar por el borde; cara nunca.
🔴 **Exige el campo `eje`: UN solo eje declarado** **[corregido 2026-09-21]**. Las copias son idénticas en todo
salvo ese eje —«the weight of the type, **and nothing else**»— y el bloque **prohíbe explícitamente** que varíe
cualquier otra cosa: ni el ángulo, ni el recorte, ni las proporciones, ni la luz sobre ellas, ni la distancia.
Son impresiones de **un** archivo. El comando aborta sin `eje`.
**Por qué.** El contrato viejo pedía mover **tres ejes a la vez** (peso, recorte y color). Los dos evaluadores
ciegos se contradijeron en el dato y coincidieron en el veredicto: uno vio nueve copias idénticas —«no es un
proceso de decisión, es un patrón decorativo»— y el otro vio que **no** lo eran —«el ángulo del muro y la
proporción del cielo cambian de copia en copia; nueve impresiones del mismo archivo no pueden diferir entre
sí»—. Las dos lecturas son el mismo defecto: **si no se ve, no hay decisión; si se ve de más, delata la
generación**. Con un solo eje el doble filo desaparece.
**El eje tiene un piso duro.** Elige uno que el modelo **sostenga**: el peso de la tipografía, la calidez de un
campo de color, el tamaño del logo. **NO** sirve un eje por debajo de su control —«un encuadre unos milímetros
más cerrado»—: ahí el modelo no reproduce la diferencia, introduce **deriva**, y lo que sale es ruido en vez de
un eje. Es la razón por la que un evaluador vio que las nueve copias **no** eran idénticas: tenía razón, y lo
que veía no era el eje pedido sino lo que el modelo no controla.
**Evidencia.** `H1` (Santiago) · a la primera, y **reprobada** en la auditoría ciega.

#### `descarte` — lo que no se eligió
**Qué es.** Enseña el **volumen real** del trabajo, que es justo lo que se esconde cuando se presume de IA.
**Cómo se logra.** Una **pila honda y desordenada** de trabajo rechazado llena el centro y la mitad inferior:
decenas de piezas solapadas en todos los ángulos, algunas arrugadas, algunas boca abajo, algunas tachadas; es lo
**más grande y más detallado** del cuadro. Lo elegido **NO está**: sólo el lugar que dejó —un pin vacío, un hueco—.
**Nadie presente.** Luz baja y dura rasante, para que **cada canto** tire su propia sombra y la profundidad del
montón se lea.
**Evidencia.** `H2` (Lima) · a la primera.

#### `marcado` — la corrección es el sujeto, no la mano
**Qué es.** Dirección de arte pura: la **anotación** encima de la obra. El acento de marca deja de ser decoración
y **pasa a ser el sujeto**.
**Cómo se logra.** La obra llena el cuadro en ángulo pronunciado, con su material nítido; **encima** van las marcas
de la revisión —círculo, flecha que arrastra, tachadura firme, corchete al margen—, que son lo **más nítido,
deliberado y contrastado** de la imagen y donde el ojo cae **primero**. La herramienta queda donde se dejó.
**Cualquier mano es, como mucho, un fragmento desenfocado saliendo por el borde lejano, nunca el sujeto.** Luz
rasante para que **el relieve físico de cada trazo** tire su sombra: así las marcas se leen como materia y no como
gráficos puestos después.
**Ojo.** Es vecina de `manos` e `instrumento`; se salva exactamente por esa regla. Si sale un plano de manos, no es
esta palanca.
**Evidencia.** `H3` (Bogotá) · a la primera, y la trampa temida no apareció.

#### `proyeccion` — la obra proyectada sobre materia física
**Qué es.** Lo digital **tocando el mundo**, sin una sola pantalla.
**Cómo se logra.** Un haz desde detrás de la cámara echa **la obra misma** sobre una superficie **áspera** —yeso,
ladrillo, tela, madera— y el grano, las grietas y los desniveles de esa superficie **se ven A TRAVÉS** de la
imagen, doblándola y rompiéndola. La proyección es la **única** luz del lugar. Una persona está **dentro del haz**
de espaldas y la obra **le cae encima**, así que parte está en el muro y parte en ella; su sombra **abre un hueco
negro** en la imagen. **Ni pantalla ni monitor**: la imagen vive sobre material, no sobre vidrio.
**Ojo.** No es `luz-motivada`: ahí la fuente es luz; acá **lo que se proyecta es la obra**.
**Evidencia.** `H4` (Ciudad de México) · a la primera.
**Evidencia 2026-09-21 — se adapta bien al registro de puesta en escena.** `L-proyeccion-v1`, con la idea
**«estoy dentro de mi trabajo»**: la obra proyectada sobre la persona y el muro a la vez. Pasa la prueba dura del
registro —**significa sin titular**—. Medido: banda **0,28 ✓** · lecho **6,41 ✓** · b\* **−0,4**, con el emblema
verificado al 100%.
**Reserva abierta — el aire para cursores.** Mide **1,02**: **el muro proyectado tiene mucha estructura en los
costados**.

### De la relación con la máquina **[2026-09-21, desde una pieza aprobada]**

> **Por qué es su propia familia.** «Del oficio de decidir» fotografía el juicio humano y deja a la máquina
> fuera del cuadro. Ésta la **mete** — y la fotografía perdiendo. Comparte con ese grupo la misma prohibición:
> nunca robots, circuitos ni interfaces flotantes.

#### `copiloto` — la IA está, y no sabe
**Qué es.** La criatura de un partner **acompaña a la persona**, y **las dos comparten el gesto**. La foto trata
del **límite** de la máquina, no de su poder: la IA está presente y **no sabe**.
**Cómo se logra.** Una mascota de marca de tamaño juguete —unos 25 cm, real y física, bien hecha, con escala
correcta y sombras de contacto— **se posa SOBRE la persona**: hombro, antebrazo, o el escritorio justo al lado.
Está visiblemente **atascada**: esperando, desconcertada, fuera de su alcance. La persona reacciona a ese hueco
—encogimiento de hombros, cejas arriba, manos abiertas— y mira **a la criatura o más allá**, nunca al lente.
**Una sola criatura**, y **nunca se redibuja**: se copia de su referencia tal como es.
🔴 **Exige el campo `criatura`** y sale siempre de un kit de mascota (Clawd, Codex, **Gigi**, Nexa). El campo obliga a
declararla para que nadie invente un robot genérico. Ejemplos que el comando trae: *«Clawd, sitting on her
shoulder with a question mark floating above it»* · *«Codex, standing on the desk beside the laptop, looking up
and waiting»*.
**Gigi** (Google Gemini, kit del 2026-09-21) es la que mejor encaja en esta palanca cuando la pieza habla de
búsqueda o de motores de respuesta, porque tiene **8 poses propias de AEO** que las otras dos no tienen: la que
dice exactamente «la máquina no sabe» es `efeonce-gigi-3d-aeo-03-no-te-conoce`, donde sostiene una tarjeta
**completamente vacía**. Ahí el sujeto es el vacío de la tarjeta, no la criatura — si le pones titular, que no
repita lo que la imagen ya dijo.
**Ojo — la POSE se elige del kit, no se pide** **[medido, 5 pasadas]**. Pedirle al modelo una pose que la
referencia no tiene lo hace **redibujar el asset**: Clawd volvió con cinco formas distintas (patas largas, cuerpo
cuadrado, ojos chicos). Se resolvió pasando la pose que el kit **ya tenía**: `efeonce-clawd-3d-07-salto-en-el-aire`
trae **los dos brazos levantados y separados** — exactamente el encogimiento que la pieza necesitaba. La
interacción puede derivarse; la **forma** se copia del kit.
**Guarda `contradice`.** El bloque aborta si la escena mete *hologram*, *holographic*, *glowing interface*,
*floating ui/interface/screen*, *circuit*, *neural network* o *data stream*: son la parte que no vale nada y la
que hace todo el mundo, y acá lo que se fotografía es que la máquina **no** sabe. Sin esa guarda la pieza se iba
a ciencia ficción.
**Evidencia.** Nace de una pieza **pre-canon aprobada por el operador** —el KV «Tu IA no conoce tu negocio»,
2026-09-17— y de su encargo de convertirla en palanca. Implementada en `build-prompt.mjs`, commit `cdb1fabad`.

## En qué registro sirve cada palanca **[criterio, derivado del marcador de la mirada]**

Efeonce tiene **dos registros visuales**: el **documental** —«el oficio a la vista», donde la foto *es* el
mensaje y **nadie mira al lente**— y el de **puesta en escena** (**B**), donde la foto es **soporte de una idea**
y **el sujeto sí mira al lente**. Esa mirada es el marcador visible del registro, y **ordena el catálogo entero**:
decide qué palanca sirve en B, cuál se adapta y cuál no cabe ahí.

### Nativas de B — la mirada al lente está justificada por la propia palanca

| Palanca | Por qué es nativa |
|---|---|
| `pov` | La cámara ocupa el asiento del cliente: no «mira al lente», **te habla a ti**. La coartada narrativa más fuerte del registro |
| `oclusion` | Algo cubre un tercio y el sujeto sigue mirando: da intriga, **y el objeto que ocluye puede ser el lecho** |
| `fragmento` | Crop extremo del rostro mirando al lente: la que más golpea a 390 px |
| `copiloto` | Nació en B: la criatura del partner comparte el gesto |

### Se adaptan bien a B

`larga-exposicion` (el sujeto quieto mirando al lente mientras todo se disuelve) · `reflejo` (mira al lente a
través del vidrio, con dos realidades superpuestas) · `proyeccion` (la obra proyectada sobre él y el muro) ·
`instrumento` · `cenital` · `suelo-oblicuo` · `atraviesa`.

### Sin personas y aun así registro B

`variantes` (la decisión como sujeto: nueve a doce copias idénticas salvo un eje) · `descarte` (la pila de lo no
elegido) · `ausencia`.

### 🔴 Incompatibles con B, por construcción

`escucha` — **el sujeto no mira a nadie: está recibiendo**, es documental puro. Más `manos`, `sombra`,
`silueta`, `marcado` y `quien-sostiene`: **pierden el marcador de la mirada**.

**No están prohibidas en una pieza de campaña**, pero si se usan, **la pieza ya no se juzga con la barra de B**.

## Las cinco descartadas y por qué **[medido]**

Valen tanto como las aprobadas: evitan repetir el gasto.

| Descartada | Qué pasó |
|---|---|
| **Baño de color** (toda la escena teñida del azul de marca) | **El modelo se niega.** Con marcadores explícitos —«su piel es azul», «el suéter blanco se lee azul»— oscureció el cuarto pero **mantuvo la piel natural**. Su sesgo es más fuerte que la instrucción. Lo que sí produce ya existe: es `luz-motivada`. |
| **Split diopter** (dos planos nítidos a distinta distancia) | **Descartada dos veces.** Devuelve **profundidad de campo normal** sin la costura característica: pliego nítido + persona nítida + fondo suave es lo que da cualquier lente a f/5.6, así que la palanca no existe en el resultado. Reintentada con el sistema de color el 2026-09-20 y **rechazada por el operador: «se ve muy IA»** — el intento de forzar dos campos de foco produce una nitidez pareja que delata la generación. No volver a probarla por prompt. |
| **Clave baja** (la escena en sombra, sólo emerge lo esencial) | Funciona, pero **no se distingue** de luz con carácter + lecho oscuro, que ya está en el canon. Duplicar una palanca es lo que diluye el sistema. |
| **Trama** (a través de una malla perforada que fragmenta al sujeto) | **No se logró** (2026-09-20). El grill del micrófono salió espectacular como textura, pero detrás **no se lee que haya una persona**: sólo una mancha. La palanca exige una cara **rota por la rejilla**, no borrada, y lo que queda es un bodegón del objeto. Vecina de `instrumento` por diseño; si se reintenta, con la cara mucho más cerca de la malla y perforación más abierta. |
| **Flash duro editorial** | Funciona y **confirma que es otro idioma**: puesto junto a las demás, no pertenece. Si se adopta, va declarado como **territorio aparte** (trendjacking, cultura), nunca mezclado con el lenguaje principal. |

**Lección transversal:** hay extremos que el motor **no hace**. Conviene averiguarlo con una prueba barata antes
de diseñar una serie alrededor de uno.

---

## La que quedó a un intento de distancia **[pendiente]**

**`doble-exposicion`** — dos momentos del proceso superpuestos en un cuadro, visibles **uno a través del otro**.
Probada el 2026-09-20 (`H5`): el modelo **sí produjo superposición real** —el boceto a lápiz atraviesa la pieza
terminada y la misma persona aparece en dos momentos—, pero la pieza trae **un borde duro en diagonal**, y el
contrato de la palanca prohíbe cualquier borde justamente porque **es lo que la separa de un collage**.

No se descarta y **tampoco se aprueba**: el catálogo vale porque cada palanca declara cómo comprobarla, y aprobar
una que no pasa su propia comprobación vacía el criterio de todas las demás. Para retomarla: insistir en que las
zonas claras de una exposición rellenan las oscuras de la otra **en todo el cuadro**, sin que ninguna tenga canto,
y no describir ninguna de las dos como una hoja o un papel —de ahí salió el borde.

## Otros ejes que deciden la pieza (y no son palancas)

No cambian lo que la foto *hace*, pero deciden cómo sale. Cada uno tiene documento dueño; **ninguno se escribe a
mano en la escena**.

| Eje | Campo | Cuántos | Dónde vive |
|---|---|---|---|
| Formato | `formato` | 4 (`4:5` · `9:16` · `16:9` · `1:1`) con su % de lecho y su límite de sujetos | [prompts y pipeline](./EFEONCE_PHOTO_PROMPT_BLOCKS_AND_PIPELINE_V1.md) |
| Reservas del plate | `reservas` | 6 (texto · objeto para enmarcar · lecho de la firma · aire para cursores · campo profundo · lecho por formato) | [reserva de espacio](./EFEONCE_PHOTO_PLATE_SPACE_RESERVATION_V1.md) |
| Lecho de la firma | `lecho` | catálogo de objetos + **tono declarado** | [la firma](./EFEONCE_PHOTO_SIGNATURE_FOREGROUND_V1.md) |
| Cámara, lente y ángulo | en la escena | **20 tomas probadas** — las nombra la sección de abajo | [cámaras y lentes](./EFEONCE_PHOTO_CAMERA_LENS_ANGLE_CATALOG_V1.md) |
| Hora del día | en la escena | amanecer · mediodía duro · hora dorada · noche | [cámaras y lentes §4](./EFEONCE_PHOTO_CAMERA_LENS_ANGLE_CATALOG_V1.md) |
| Objetos de marca | `objetos` | 10 kits (logo 3D, mascotas, prendas, merch, lanyard) | [prompts y pipeline §3.7.1](./EFEONCE_PHOTO_PROMPT_BLOCKS_AND_PIPELINE_V1.md) |
| Identidad de personas | `identidad` | personas con vista por ángulo | [personas, identidad y vestuario](./EFEONCE_PHOTO_PEOPLE_IDENTITY_WARDROBE_V1.md) |
| Colorimetría medible | — | roles de color, balance de blancos, rangos Lab | [colorimetría](./EFEONCE_PHOTO_COLORIMETRY_V1.md) |

### Las veinte tomas del catálogo de cámara

**Se escriben en la escena**, no hay campo para ellas. Cada una tiene ficha con lente, altura, distancia, qué
comunica, para qué servicios sirve, su lecho y el **contraste del logo medido** en
[`EFEONCE_PHOTO_CAMERA_LENS_ANGLE_CATALOG_V1.md`](./EFEONCE_PHOTO_CAMERA_LENS_ANGLE_CATALOG_V1.md) §3.

| # | Toma | Lente | Qué comunica |
|---|---|---|---|
| 1 | Asiento en la mesa (base del sistema) | 50 mm f/2 u 85 mm f/1,8 | «Tu lugar en la mesa» |
| 2 | Asiento a ras + **ojo de pez** | 10 mm | Taller, cercanía |
| 3 | **Ojo de pez fuerte** | 8 mm, distorsión evidente | Energía |
| 4 | **Ojo de pez grupo** | 8 mm full-frame, centro de mesa redonda mirando arriba | El equipo alrededor de la obra |
| 5 | **Dron cenital** | 90°, ~25 m, todo enfocado | Escala de una activación |
| 6 | **Tilt-shift** | Balcón a 45°, franja nítida | El rodaje como maqueta |
| 7 | **Contrapicado** (vista de gusano) | 24 mm f/2,8, cámara en el piso | Dirección, autoridad |
| 8 | **Reflejo en vidrio** | 50 mm f/2 | Estrategia con la ciudad detrás |
| 9 | **Tele 200 mm** | 200 mm f/2,8 | El equipo en la ciudad; el escenario |
| 10 | **Macro** | 100 mm macro f/4 | Textura del oficio; pausa visual |
| 11 | **Retrato 105–135 mm** | 105–135 mm f/2 | Persona con carácter |
| 12 | **Marco dentro del marco** | 50 mm f/2,8 desde un pasillo oscuro | Estrategia observada, foco |
| 13 | **Escala** | 35 mm f/4, espacio enorme | Datos, magnitud |
| 14 | **Barrido** | 35 mm, obturación lenta paneando | Velocidad, Run & Gun |
| 15 | **Noche** | 50 mm f/1,8 | Cierre de proyecto |
| 16 | Por encima del respaldo | 70–85 mm f/1,8–2 | «Tu lugar en la mesa», con la silla vacía |
| 17 | Mesa larga en profundidad | 135 mm f/2 a centímetros de la mesa | Retrato al fondo, calma |
| 18 | Por encima del hombro | 85 mm f/2 | Descubrimiento en pantalla |
| 19 | Picado 60° sobre la obra | 50 mm f/4 | La obra sobre la mesa |
| 20 | Respaldo del espectador | 70 mm f/2, cabecera | Presentación desde tu silla |

> **Toma ≠ palanca de encuadre.** Una toma dice **con qué se fotografía** (lente, altura, distancia); una palanca
> de la familia D dice **qué hace la foto**. Se combinan: el fragmento de esta carpeta es `palanca: fragmento`
> sobre un **retrato 85 mm**. Lo que el modelo respeta de una toma —y lo que no— está medido en §1 de ese
> catálogo: el lente declarado cambia la sensación, pero **la física exacta no se respeta**; la **posición de
> cámara** sí obedece.

## Cómo se pide una palanca

```json
{
  "formato": "4:5",
  "palanca": "instrumento",
  "instrumento": "a chrome loupe magnifier resting on a printed press sheet",
  "atmosfera": "polvo",
  "escena": "SCENE (…): … el azul en un portador visible … un acento naranja o lima del 1 al 5% …",
  "lecho": { "objeto": "…", "tono": "DARK walnut in shadow, matte" }
}
```

| Palanca | Campo obligatorio |
|---|---|
| `instrumento` | `instrumento` — a través de qué se mira |
| `fragmento` | `corta` — por dónde corta el borde |
| `oclusion` | `ocluye` — qué cubre al sujeto |
| `dentro-del-objeto` | `objetoContenedor` — dentro de qué está la cámara |
| `copiloto` | `criatura` — qué mascota de partner acompaña, y cómo está puesta |
| `cenital`, `little-planet` | normalmente `lecho: "sin-lecho"` + `sinLechoPorque` |

Las demás no exigen campos extra. El comando aborta si falta uno, listando qué espera.

## Qué falta **[pendiente]**

- **Tabla de selección por tipo de pieza.** Con veinticuatro palancas de encuadre, el problema ya no es cuáles existen sino **cuál
  usar cuándo**. Un retrato de equipo no pide lo mismo que una pieza de oficio sin personas ni que una de evento.
- **Prueba de reconocimiento.** Sigue abierta desde el maestro: sin ella el lenguaje es un sistema consistente,
  no un activo distintivo medido.
