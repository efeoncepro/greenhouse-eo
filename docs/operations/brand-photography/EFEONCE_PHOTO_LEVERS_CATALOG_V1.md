# Catálogo de palancas fotográficas Efeonce V1

> **Tipo de documento:** Catálogo canónico de oficio (maestro de palancas)
> **Versión:** 2.0 · **Creado:** 2026-09-20 por Claude
> **Estado:** veinticinco palancas en cuatro familias, aprobadas por el operador tras tres rondas de prueba medidas el 2026-09-20.
> **Relacionado:** [maestro](./EFEONCE_PHOTOGRAPHIC_LANGUAGE_V1.md) · [prompts y pipeline](./EFEONCE_PHOTO_PROMPT_BLOCKS_AND_PIPELINE_V1.md) · [cámaras](./EFEONCE_PHOTO_CAMERA_LENS_ANGLE_CATALOG_V1.md) · [reservas](./EFEONCE_PHOTO_PLATE_SPACE_RESERVATION_V1.md)

Una **palanca** es una decisión de oficio que cambia lo que la foto *hace*, no lo que muestra.

**Hay cuatro familias y se combinan entre sí**, aunque dentro de la familia de encuadre va **una sola**:

| Familia | Cuántas | Cómo se pide | Cuántas por pieza |
|---|---|---|---|
| [A. Siempre activas](#a-las-cinco-siempre-activas-el-bloque-de-impacto) | 5 | van solas en cada prompt (`impacto: false` las apaga) | las cinco |
| [B. Atmósfera](#b-atmósfera--el-aire-que-hace-visible-la-luz) | 4 | `atmosfera` | una, opcional |
| [C. Acción suspendida](#c-acción-suspendida--lo-que-está-en-vuelo) | 1 | `suspendido` | opcional, **1 de cada 4 piezas** |
| [D. Encuadre y punto de vista](#d-las-quince-de-encuadre-y-punto-de-vista) | 15 | `palanca` | **una sola** |

Son **25 palancas**, y se combinan con las **[20 tomas de cámara](#las-veinte-tomas-del-catálogo-de-cámara)**
—ojo de pez, dron cenital, tilt-shift, contrapicado, macro, tele, barrido…— que dicen **con qué** se fotografía.
Además hay [otros ejes](#otros-ejes-que-deciden-la-pieza-y-no-son-palancas) —formato, reserva,
lecho, cámara, objetos de marca, identidad— que deciden la pieza pero tienen documento propio. El maestro define el
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

## D. Las quince de encuadre y punto de vista

### De luz y tiempo

#### `luz-motivada` — la fuente se ve
**Qué es.** La luz que baña al sujeto sale de algo que está **dentro del cuadro**: un monitor, una pantalla mural,
una lámpara práctica, una ventana. Es lo que separa luz real de un grade, que este lenguaje rechaza.
**Cómo se logra.** La caída tiene que leerse: el lado cercano a la fuente iluminado, el lejano cayendo a negro, y
la dirección inequívoca desde la fuente. El color viene de la fuente, nunca de un filtro sobre la imagen.
**Evidencia.** `B3` (monitor de calibración, Bogotá) · lecho 17,26:1.

#### `larga-exposicion` — duración en vez de instante
**Qué es.** Personas y luces se disuelven en estelas continuas mientras **un elemento queda perfectamente nítido**
y ancla la imagen.
**Cómo se logra.** Trípode. El movimiento lee como tiempo acumulado, no como trepidación, y nadie en movimiento es
reconocible.
**Ojo.** **No tiene momento decisivo** y es correcto que no lo tenga: su tensión es la duración. El comando apaga
ese aviso para esta palanca, y sólo ese.
**Evidencia.** `B4` (montaje nocturno, Miami) · lecho 19,91:1.

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
**Evidencia.** `E3` (estudio completo, Santiago).

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
**Evidencia.** `C4` y `F4` (después de la sesión, Miami).

---

## Las cuatro descartadas y por qué **[medido]**

Valen tanto como las aprobadas: evitan repetir el gasto.

| Descartada | Qué pasó |
|---|---|
| **Baño de color** (toda la escena teñida del azul de marca) | **El modelo se niega.** Con marcadores explícitos —«su piel es azul», «el suéter blanco se lee azul»— oscureció el cuarto pero **mantuvo la piel natural**. Su sesgo es más fuerte que la instrucción. Lo que sí produce ya existe: es `luz-motivada`. |
| **Split diopter** (dos planos nítidos a distinta distancia) | **Descartada dos veces.** Devuelve **profundidad de campo normal** sin la costura característica: pliego nítido + persona nítida + fondo suave es lo que da cualquier lente a f/5.6, así que la palanca no existe en el resultado. Reintentada con el sistema de color el 2026-09-20 y **rechazada por el operador: «se ve muy IA»** — el intento de forzar dos campos de foco produce una nitidez pareja que delata la generación. No volver a probarla por prompt. |
| **Clave baja** (la escena en sombra, sólo emerge lo esencial) | Funciona, pero **no se distingue** de luz con carácter + lecho oscuro, que ya está en el canon. Duplicar una palanca es lo que diluye el sistema. |
| **Flash duro editorial** | Funciona y **confirma que es otro idioma**: puesto junto a las demás, no pertenece. Si se adopta, va declarado como **territorio aparte** (trendjacking, cultura), nunca mezclado con el lenguaje principal. |

**Lección transversal:** hay extremos que el motor **no hace**. Conviene averiguarlo con una prueba barata antes
de diseñar una serie alrededor de uno.

---

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
| `cenital`, `little-planet` | normalmente `lecho: "sin-lecho"` + `sinLechoPorque` |

Las demás no exigen campos extra. El comando aborta si falta uno, listando qué espera.

## Qué falta **[pendiente]**

- **Tabla de selección por tipo de pieza.** Con quince palancas, el problema ya no es cuáles existen sino **cuál
  usar cuándo**. Un retrato de equipo no pide lo mismo que una pieza de oficio sin personas ni que una de evento.
- **Prueba de reconocimiento.** Sigue abierta desde el maestro: sin ella el lenguaje es un sistema consistente,
  no un activo distintivo medido.
