# Registro cine · el casebook — cómo se hace, en la práctica

> **Tipo:** guía operativa (oficio) · **Versión:** 1.2 · **Creado:** 2026-10-02 por la sesión de la línea gráfica
> **Última actualización:** 2026-10-03 por Claude (1.2: fallas 29 a 31 — el modelo esquiva la oclusión, la pose repetida de Nexa por expresiones en tres cuartos puestas primeras y la cara afinada por un ancla frontal más estrecha que el canon: [Nexa: pose y proporción](#nexa-pose-y-proporción-2026-10-03--lo-que-aprendimos). Las filas 21–28 del elenco en grupo son del mismo día. 1.1: el escenario del login de Greenhouse, TASK-1964 — fallas 14 a
> 20, personajes de casting con retrato ancla, el alcance que falta para una superficie de producto y tres fotos
> aprobadas: [Escenario del login](#escenario-del-login-de-greenhouse-2026-10-02--lo-que-aprendimos))
> **Canon que manda:** [`EFEONCE_PHOTO_REGISTER_CINE_V1.md`](./EFEONCE_PHOTO_REGISTER_CINE_V1.md) (alcance, cámara, luz, color, plantilla).
> Este documento **no lo reemplaza**: lo vuelve operable. El canon dice qué es el registro; el casebook dice cómo se
> llega a una foto aprobable sin consultarle a nadie, con las fallas que ya pasaron y su corrección exacta.

## Por qué existe

Entre el 2026-09-26 y el 2026-10-02 **ninguna sesión llegó sola a una foto cine aprobable**: todas consultaron a la
sesión de la línea gráfica (Salesforce, deck SEO, CMP-004, el traje de Nexa). Las consultas se repitieron: diez
fallas, siempre las mismas. Aquí están escritas con su síntoma, su causa medida y la frase que la corrige. Lo que se
puede chequear con una máquina, lo chequea `foto:prompt` (al compilar la ficha) o `foto:validar:cine` (sobre el
plate). Lo que no, lo revisa el agente **`cine-reviewer`** (`.claude/agents/cine-reviewer.md`).

## El flujo, en seis pasos

1. **¿Va en cine?** Mira el alcance (§2 del canon): Nexa protagonista, `proposal-cinematic`, secciones y «about» del
   deck, portadas y contraportadas con foto, Marketing con Manzanitas con el roster, perfiles sociales con Nexa.
   **Publicidad con personas del equipo: en prueba.** Fuera de eso, el registro es A, B o C.
2. **Parte de la foto aprobada más cercana**, nunca de cero: `pnpm foto:cine:nueva --listar` muestra las recetas y
   `pnpm foto:cine:nueva --desde <id> --id <nuevo> --dir <carpeta>` copia su ficha con `registro: "cine"`, marca la
   escena para reescribir y lista en `__completar` los campos cine que faltan (ver
   [aprobadas](#las-fotos-cine-aprobadas-desde-dónde-partir)). Cambia la escena, no la estructura.
3. **Llena los campos cine de la ficha** (`llave`, `primerPlano`, `fondo`, `fenomeno`, `alcance`): ver
   [la ficha cine](#la-ficha-cine-los-campos-que-la-hacen-cine). `pnpm foto:prompt` los compila en el prompt y avisa lo
   que falta.
4. **Pide revisión antes de gastar:** invoca el agente `cine-reviewer` con la ruta de la ficha.
5. **Genera:** `pnpm foto:generar <ficha> --quality high` (gpt-image-2.5-sunburst, ≈ USD 0,05 por plate). Una sola
   generación por intento; sin relight ni upscale.
6. **Mide y mira:** `pnpm foto:validar:cine <plate>`, `pnpm foto:validar <plate>` (lecho y texto) y
   `pnpm foto:emblema <plate>` al 100 %. Después,
   `cine-reviewer` sobre el plate. Si algo falla, **corrige la ficha y regenera**; no edites la foto entera.

## La ficha cine: los campos que la hacen cine

Con `"registro": "cine"`, `foto:prompt` entiende cinco campos propios. Ninguno es obligatorio para que la ficha
compile (las fichas cine anteriores siguen funcionando igual), pero **cada uno que falta produce un aviso**, porque
cada uno corresponde a una falla medida.

| Campo | Qué declara | Ejemplo aprobado |
|---|---|---|
| `llave` | `{ fuente, lado, tamano?, distancia? }`: **una** fuente dura, con lado y altura; el comando añade «the only key light, NO fill, NO front light» | `{ "fuente": "a fist-sized core of azure-white light on her palm", "lado": "below and to the right of her face", "distancia": "about 30 cm from her face" }` (NX7d) |
| `primerPlano` | algo real y oscuro junto al lente, fuera de foco: da profundidad. Puede ser el mismo objeto del `lecho` | `"a Spark hovering close to the lens at the bottom right, large and soft out of focus, cut by the frame edge"` |
| `fondo` | luces prácticas grandes y frías al fondo, fundidas en bokeh: dan escala | `"a row of large cold practical lights far behind, melted into round bokeh"` (NX5b, NX7d) |
| `fenomeno` | `{ que, esServicio }`: el fenómeno de luz y **una frase que diga por qué ES el servicio**. En vertical, el comando lo baja del 36 % | `{ "que": "one azure beam picks a single card out of thousands", "esServicio": "AEO: la IA te elige a ti" }` (AE2b) |
| `alcance` | uno de `nexa` · `proposal-cinematic` · `deck-seccion` · `deck-portada` · `manzanitas` · `social-nexa` · `publicidad-prueba` | `"proposal-cinematic"` |
| `identidad` con `vista` + `expresion` | desde el 2026-10-02 conviven (una persona sola en la toma): la `vista` manda en el ángulo de la cabeza y la `expresion` sólo en el gesto (las 12 fotográficas de Nexa comparten el mismo tres cuartos, así que solas no cambian el ángulo). `vestuario` sigue sin combinarse | `[{ "persona": "nexa", "vista": "45-izq", "expresion": "curiosa" }]` |

Además, en cine el comando **inyecta solo** lo que se olvida siempre: el uniforme «deep navy, never royal blue» (salvo el hoodie, que conserva el azul royal de su kit) cuando
hay una prenda del kit **o el traje biónico de Nexa**, y el lecho «matte, non-reflective, outside the reach of the key
light». Con el traje, además, quita el smartwatch y el anillo de los accesorios de Nexa (los antebrazos son placas y la
pantalla del reloj competía con la única fuente de luz; prueba ciega del 2026-10-02).

## Las fallas, con su corrección (1–10 aquí; 11–13 en «Prueba ciega del 2026-10-02»; 14–20 en «Escenario del login»; 21–29 en «Elenco en grupo»; 30–31 en «Nexa: pose y proporción»)

Cada fila es un caso real. **La columna «chequeo» dice quién la atrapa hoy.**

| # | Síntoma | Causa medida | Corrección (frase o regla) | Caso | Chequeo |
|---|---|---|---|---|---|
| 1 | **Objetos como stickers**: nítidos, del mismo tamaño, con luz propia, en abanico | Demasiadas **referencias de objeto**: cada una dice «Reproduce EXACTLY» con su foto de estudio y el modelo copia también su nitidez y su luz | **Máximo dos referencias de objeto** de personaje en la toma (las del plano cercano); el resto, sin imagen: «the same figures as the references, far, small and out of focus, their LED eyes as glowing dots» | NX7b (10 ref.) → NX7d (8, dos Sparks) | `foto:prompt` avisa si hay más de 2 objetos-personaje; `cine-reviewer` sobre el plate |
| 2 | **Luz plana**: la cara pareja, sin modelado ni dirección (juzgar contra las aprobadas: también llevan luz suave de frente) | La fuente es una línea fina o no tiene lado; hay relleno implícito | Fuente **con tamaño y cerca**, con lado; «the only key light, NO fill, NO front light: the far side of the face falls into deep shadow, nose shadow legible on the cheek» | NX7b → NX7d; NX5 «a hard key light from the left sculpts her face» | `foto:prompt` avisa sin `llave`; `foto:validar:cine` sólo atrapa el cuadro claro y parejo; `cine-reviewer` |
| 3 | **Sin profundidad**: todo en un plano | Falta primer plano junto al lente y fondo con bokeh; «some are out of focus» no basta | **Tres planos con distancia en metros** y apertura (cerca nítido · ~1 m · 4–6 m desenfocado, 85 mm f/1.8–2); un objeto **junto al lente** | NX5b (robot en la cornisa), NX7d | `foto:prompt` avisa sin `primerPlano` ni `fondo`; `cine-reviewer` (los píxeles no lo separan: ver [Medidor](#medidor-qué-mide-foto-validar-cine-y-qué-no)) |
| 4 | **El fenómeno está al lado del servicio** | Se eligió un objeto lindo (cinta, perfume, pantallas) en vez de la luz que ES el servicio | Prueba de quitarlo: si sin la luz la idea sigue en pie, la luz sobra. Declara `fenomeno.esServicio`. En ads, **luz dura con la sombra como logo** y **larga exposición real** tienen respaldo; freeze y levitación no | CA1/CA3 (CMP-004); AE2 «un haz elige UNA» | `foto:prompt` avisa sin `fenomeno`; `cine-reviewer` |
| 5 | **En vertical, el fenómeno sube a la reserva** | La fuente está riggeada alta; el fenómeno no se nombró en la prohibición | Nombrar el fenómeno: «the [vortex] stays entirely BELOW 36 % of the frame height; the top third is calm deep dark space»; fuente baja (rodilla–pecho); vórtices hacia el fondo, no hacia arriba | AD1d; CA4 (hasta el 15 %) | `foto:prompt` lo inyecta en 4:5 y 9:16; `foto:validar:cine` mide la luz en la reserva |
| 6 | **Uniforme azul rey** en vez de navy | El modelo satura el azul del polo, la softshell o el traje | «deep navy, never royal blue»; el hoodie es la excepción: su kit es azul royal y así se pide | AE2b, CR2b, CA1/CA3/CA3b, SE1 | `foto:prompt` lo inyecta; `cine-reviewer` (bajo una llave azul los píxeles no lo separan) |
| 7 | **Lecho que falla**: banda de blur o contraste bajo | Objeto «matte black» en un estudio vacío = banda; o el **reflejo** de la fuente en una superficie clara o brillante | El lecho es **lo que de verdad hay entre la cámara y el sujeto** (la mesa de la reunión, la consola), con la cámara a centímetros de su borde, **negro mate no reflectante, fuera del alcance de la llave** | NX7d (2,98:1 por reflejo); SP1; CA4 (las placas del traje llegan al pie) | `foto:prompt` inyecta mate; `foto:validar` mide el lecho |
| 8 | **Isotipo pintado** o en el lugar equivocado | Isotipo compuesto plano sobre la tela; o generado sin referencia (inventó un cohete) | La prenda **por su kit** en `objetos`: el bordado sale de la referencia. `foto:isotipo --acabado` sólo si difiere. El traje biónico ya trae el isotipo en su referencia | WB1b (bajo el brazo, retirado) → WB1c; NX3 (cohete) | `foto:emblema` al 100 % |
| 9 | **Cara deformada** después de corregir algo | Se editó la foto entera con otra proporción: el modelo reencuadra y rehace la cara | Nunca editar la foto entera para un color o una posición: se corrige la ficha y se regenera; si hay que editar, máscara y misma proporción | SF1 (Salesforce, arquitecta) | `cine-reviewer` |
| 10 | **Fuera de alcance** | Cine con personas del equipo donde no corresponde, o el cliente retratado en su dolor | Revisar §2 antes de escribir; el cliente sólo en panel-end y nunca atacado («atacas al cliente, rompe el esquema») | SX3 (deck SEO, rechazada) | `foto:prompt` avisa sin `alcance`; AXIS `cine-requires-nexa-or-proposal` |

**Tres reglas de oficio que no son fallas sino criterio, y que el revisor aplica:**

- **Cuando todo brilla parejo y todo está nítido, nada es cine.** Una sola fuente con tamaño, una o dos cosas nítidas
  con luz, y el resto en sombra y desenfoque.
- **Contacto físico**: una criatura que toca a la persona (posada en el hombro) «está ahí»; las que flotan en arco se
  leen diagrama.
- **Manos simples**: una sola acción de manos por persona, con el brazo entero visible. La mano que «sale de donde no
  debe» aparece con acciones finas cerca del pecho y otro elemento cruzando (CA3).

## Las fotos cine aprobadas: desde dónde partir

El índice que lee la máquina es [`scripts/foto/cine-recetas.json`](../../../scripts/foto/cine-recetas.json) (ruta de
ficha y plate, alcance, por qué funciona, advertencias); `pnpm foto:cine:nueva --listar` lo imprime. Al aprobar una
foto cine nueva, se agrega ahí **y** en esta tabla.

| Id | Uso | Protagonista | Por qué funciona | Ficha |
|---|---|---|---|---|
| `NX7d` | Nexa despliega a su squad | Nexa (traje) + 2 Sparks con referencia | núcleo de luz cerca de la cara, tres planos, contacto, bokeh al fondo | `2026-10-01_traje-bionico-nexa/fichas/NX7d-*.json` |
| `NX5b` | `proposal-cinematic-nexa` | Nexa (traje) | llave dura con lado, objeto junto al lente, luces de partida en bokeh | `2026-09-26_deck-nexa/fichas/NX5-*.json` |
| `NX6b` | portadas con líneas | Nexa (softshell) | una órbita como única luz, reserva del 45 % | `2026-09-26_deck-nexa/fichas/NX6-*.json` |
| `AE2b` | `proposal-cinematic-aeo` | estratega SEO | un haz que elige UNA tarjeta entre miles: el fenómeno es el servicio | `2026-09-26_deck-aeo/fichas/AE2-*.json` |
| `SE1` | `proposal-cinematic-seo` | estratega SEO | mapa de luz con núcleo de entidad, persona del equipo | `2026-09-28_deck-seo-aeo/fichas/SE1-*.json` |
| `RV1b` | `proposal-cinematic-revops` | líder RevOps | la fuente modela a la persona; moño de luz | `2026-09-26_deck-revops/fichas/RV1-*.json` |
| `CR2b` / `CR4` | creativa | directora creativa | constelación de piezas a varias profundidades / el squad entrega | `2026-09-26_deck-creativo/` · `2026-09-28_portada-creativa/` |
| `SP2b` / `SP1` | sección partida | equipo / cliente (panel-end) | 1:1, reserva izquierda, luz dramática | `2026-09-27_secciones-partidas/fichas/` |
| `PH2` | destacado de Instagram | Nexa | retrato centrado, un color de luz sobre oscuro | `2026-09-30_portadas-sociales/fichas/PH2-aeo.json` |
| `PS1b` | portada de perfil 3:1 | Nexa (softshell) | reserva izquierda, una sola fuente | `2026-09-30_portadas-sociales/fichas/PS1b-*.json` |
| `WB1c` | portada Engine, `proposal-cinematic-web` | desarrollador | el polo del kit editado: bordado en el pecho | `2026-09-26_deck-web/fichas/WB1c/` |
| `LG1` | escenario del login, novedad AI Visibility (`alcance: nexa`) | Nexa (traje) + 1 Spark en el hombro | atrapa UNA tarjeta de respuesta entre miles congeladas en el aire; un haz azul engine; la tarjeta es la llave | `2026-10-02_login-escenario/fichas/LG1-ai-visibility-nexa.json` |
| `LG2e` | escenario del login, novedad «Escalar producción creativa» (`alcance: producto`) | directora creativa de **casting** con hoodie | UNA órbita naranja cerrada de larga exposición cerrada con flash de segunda cortina; la esfera sobre la palma es la llave; seis piezas de campaña sobre el anillo. Parte de `NX6b`: la órbita cerrada dice «ella dirige» | `2026-10-02_login-escenario/fichas/LG2e-escalar-produccion-orbita.json` |

Aprobadas por el operador el 2026-10-02 (TASK-1964). **Pendiente:** sumar `LG1` y `LG2e` a
`scripts/foto/cine-recetas.json` (lo hace la sesión dueña del índice). `LG3e`, la tercera foto aprobada del login, **no
es cine** (registro B, puesta en escena): está en [Escenario del login](#escenario-del-login-de-greenhouse-2026-10-02--lo-que-aprendimos).

⚠️ Varias de estas (AE2b, CR2b, NX6b, RV1b, BR1b, BR2b, SP2b, SE1) llevan el **isotipo compuesto plano** (falla 8):
sirven como receta de luz, encuadre y escena, no como receta de bordado. Pendiente: rehacerlas con el método de WB1c.

## Medidor: qué mide `foto:validar:cine` y qué no

Calibrado el 2026-10-02 contra 16 plates cine aprobados (NX5b, NX6b, NX7–NX7g, AE2b, SE1, RV1b, CR4, SP1, SP2b, WB1c)
y 19 de otros registros (ads de visibilidad, CMP-002 HubSpot, palancas). Sólo dos gates sobrevivieron:

| Gate | Umbral | Aprobados | Qué atrapa |
|---|---|---|---|
| `sombra` | ≥ 35 % del cuadro con L* < 20 | 62–86 % | un cuadro claro y parejo (la forma gruesa de la falla 2) |
| `reserva` (vertical) | L* p99 ≤ 45 en el 36 % superior | sin aprobados verticales en disco; 3 de 7 verticales de otros registros reprueban (a1 97, b1 96, a2 67) | el fenómeno o la llave que suben a la reserva (falla 5) |

**Lo que el medidor no ve, medido el mismo día, y por eso lo revisa `cine-reviewer` mirando el plate:**

- **Stickers (falla 1):** NX7b, rechazada, pasa todo; su profundidad (zona más nítida / mediana = 18,1) cae dentro del
  rango de las aprobadas (5,7 a 183).
- **Luz plana con relleno (falla 2):** las fotos documentales del lenguaje miden la misma «llave» (L* p99 − p50 ≈ 52–73)
  que las cine (51–82).
- **Azul rey (falla 6):** bajo una llave azul, el polo de AE2b (rechazado por azul rey) mide L* 12 · b* −28 y el de WB1c
  (navy aprobado) L* 12 · b* −35.

`profundidad` y `llave` se imprimen como información, sin gate. Si algún día una métrica separa estos casos, entra
como gate con su calibración en esta tabla.

## Prueba ciega del 2026-10-02 — lo que aprendimos

Tres sesiones nuevas, sin poder consultar, con un encargo real cada una y dos generaciones como tope
(`ai-generations/2026-10-02_prueba-ciega-cine/`): A, sección partida 1:1 «Contenido que la IA cita»; B, propuesta
HubSpot 16:9; C, destacado 9:16 «Agentes» con Nexa. **Las tres llegaron solas a un plate razonable** (≈ USD 0,10 a
0,15 cada una) y las tres se dieron CORREGIR con la rúbrica del revisor, el mismo juicio que hizo la sesión de la
línea gráfica al mirarlas. La falla común fue la misma: **la cara salió con relleno**.

**La causa era del compilador, no de las sesiones**, y quedó corregida el mismo día (sólo en fichas cine; los
demás registros siguen idénticos, regresión: 332 fichas, 0 no cine cambiadas):

- Los bloques compartidos pedían «documentary», «shadows open», «real sunlight», «white balance warm-neutral»,
  «a mug, a notebook», personas genéricas y una sombra «warm» en la reserva. En cine `foto:prompt` los reemplaza
  (`AJUSTES_CINE`): película, sombras casi negras sin relleno, una sola fuente dura de lado, balance frío, nada
  analógico, sólo las personas que la escena declara.
- La llave pide ahora una cara **en dos tonos**: la mitad lejos de la llave cae casi a negro.
- El lecho en cine ya no se pide como «abstract blur with no visible edges» (que es la banda de la falla 7): se pide
  como una masa real con la lente a centímetros de su borde.
- `primerPlano` se compila como un objeto **separado** del lecho.
- En vertical, el `fondo` también queda bajo el 36 % (antes sólo el fenómeno).
- Sección partida 1:1: `"reservas": { "texto": { "lado": "izquierda", … } }` compila la reserva a la izquierda.
- `foto:cine:nueva` acepta `--formato` y `--alcance`; al cambiar el formato descarta las reservas de la receta.
- `foto:prompt` avisa si la ficha todavía tiene `__completar`.

**Tres fallas nuevas, con su corrección:**

| # | Síntoma | Corrección | Caso |
|---|---|---|---|
| 11 | **Pedir un número no alcanza**: «cinco en total» dio seis | Ubicar cada figura por geografía: «ONE far on the left at chest height… ONE farther on the right» | C (AG1 → AG1b) |
| 12 | **El sujeto se corre a la reserva** aunque la ficha pida «face at 70 %» | Anclar por geografía, no por porcentaje: «her left elbow is at about 58 % of the frame width; between the left edge and her body there is a wide band of empty darkness» | A, B |
| 13 | **La llave de color tiñe el emblema** y lo aplana | Mirar el pecho con `foto:emblema`; si se lee teñido o estampado, la llave va de lado y no de frente al pecho | B (magenta) |

**Lo que el medidor sigue sin ver y mira el revisor:** relleno en la cara, Sparks lejanos demasiado nítidos y la
reserva lateral en 16:9 y 1:1 (`foto:validar` mide la banda de arriba).

**Segunda prueba y experimento de luz (2026-10-02, tarde) — la barra estaba mal calibrada.** Tres sesiones nuevas más
(`2026-10-02_prueba-ciega-cine-2/`) llegaron solas a un plate y el revisor les dio CORREGIR por «cara con relleno».
Un experimento con una sola variable por toma (`2026-10-02_experimento-luz-cine/`: fuente grande por delante de la cara,
cuerpo girado hacia la fuente, aviso de que la luz de las referencias no es la de la escena) **no cambió la cara en
ninguna toma**. Al comparar con las aprobadas se vio por qué: **AE2b, SE1, RV1b, WB1c y NX5b también tienen la cara
modelada con luz suave de frente**; la «mitad casi negra» era una barra escrita, no la que el operador aprobó.

- **Falla 2 se juzga contra las aprobadas:** la cara modelada por la fuente, con un lado algo más oscuro y la dirección
  legible. Sólo es falla si la cara queda pareja y sin dirección, o iluminada desde el lado contrario a la fuente.
- **Lo que separa de verdad una prueba de una aprobada es el escenario** [observado, a confirmar]: las aprobadas tienen
  un espacio grande y con profundidad (auditorio, escenario con luces, hangar, piso de grilla) y un fenómeno que ocupa
  buena parte del cuadro; las pruebas eran una persona en un vacío negro con una hoja de luz chica. «Empty dark studio»
  evita la oficina, pero no reemplaza el lugar: declara un espacio real, oscuro y profundo, con escala.

**Decisiones del operador (2026-10-02)** sobre las siete contradicciones que encontró la prueba: aros de Nexa dorados;
el destacado «Agents» aprobado se queda (tres Sparks, sin Nexa ni texto); escala vertical por encuadre (9:16 de la
cintura arriba, 4:5 del pecho arriba); en la sección partida la mirada va al panel; personas reales del roster con la
prenda de su línea y casting por rol con el código por escena; luces prácticas encendidas sólo como bokeh frío y lejano
(excepción cine); una sección partida por deck la controla el validador del plan. Detalle en el
[registro cine, delta 2026-10-02 (b)](EFEONCE_PHOTO_REGISTER_CINE_V1.md#delta-2026-10-02-b--decisiones-del-operador-tras-la-prueba-ciega).
`foto:prompt` aplica en cine las tres que son de toma (aros, escala, mirada).

## Escenario del login de Greenhouse (2026-10-02) — lo que aprendimos

Tres fotos para el carrusel de novedades del login V4 (TASK-1964), en
`ai-generations/2026-10-02_login-escenario/` (fichas, prompts compilados, plates, retratos de casting y la revisión al
100 %). Aprobadas por el operador: `LG1` y `LG2e` (cine, en la tabla de arriba) y `LG3e` (registro B).

**El alcance de producto [resuelto el 2026-10-03: caso 6, `alcance: "producto"`].** Lo que sigue es cómo se llegó. El login es una superficie de
producto, no una pieza de campaña. El operador aceptó cine con una persona de **casting** (no del roster) en uniforme
para ese escenario, como **excepción explícita del login**. Como `ALCANCES_CINE` no tiene un alcance web ni de
producto, las fichas declaran `alcance: "publicidad-prueba"` y lo explican en `nota`. Con Nexa protagonista (`LG1`) no
hace falta excepción: es el caso 1. **Propuesta** (no aplicada en código): un alcance propio, por ejemplo
`producto-escenario`, que diga «superficie de producto con foto de marca» y obligue a declarar la excepción; hasta que
el operador lo decida, `publicidad-prueba` + `nota` es la forma honesta de escribirlo. Detalle en el
[registro cine, delta 2026-10-02 (c)](EFEONCE_PHOTO_REGISTER_CINE_V1.md#delta-2026-10-02-c--el-escenario-del-login-de-greenhouse).

**Personajes de casting con retrato ancla (lo que funcionó).** Un personaje nuevo, sin foto de referencia, salió con
piel «muy IA» y el operador lo rechazó; retocar sólo la cara no alcanzó (fallas 14 y 15). Lo que el operador aprobó:

1. **Primero el retrato ancla**, uno por personaje, con la receta de piel v3 (la de
   [`.claude/rules/brand-photography.md`](../../../.claude/rules/brand-photography.md), «Realismo NO es castigo»):
   `pnpm ai:image` con `gpt-image-2.5-sunburst`, `--quality high`, `1024x1536`, de pecho, 85 mm f/2, ventana grande
   con rebote, pared gris oscura, camiseta lisa sin logo y un bloque `SKIN (critical)` que pide la textura **sólo** de
   poros irregulares y vello fino, tono parejo, sin rojeces y sin envejecer. Prompts verbatim:
   `casting/ancla-*.txt`.
2. **Después la escena**, con el campo `casting` de la ficha apuntando a ese retrato (`refs`) y su bloque
   `IDENTITY (critical)`, y el personaje pedido en `identidad` por su clave. Es el método de «casting de campaña» del
   compilador ([personas, delta 2026-10-02](EFEONCE_PHOTO_PEOPLE_IDENTITY_WARDROBE_V1.md#delta-2026-10-02--casting-de-campaña-para-personajes-ficticios))
   aplicado a un personaje que todavía no tiene una pieza aprobada de donde salir.

**Siete fallas nuevas, con su corrección.** Las 17 y 18 son **inferencias del agente `cine-reviewer`**: el texto está
en el prompt compilado [verificado], el efecto sobre la foto no se aisló [inferido]. No están corregidas en
`build-prompt.mjs`.

| # | Síntoma | Causa | Corrección | Caso | Chequeo |
|---|---|---|---|---|---|
| 14 | **Piel «muy IA»** en un personaje de casting (rechazo del operador) | Personaje sin ancla fotográfica: el modelo inventa la cara y la piel en la escena | Retrato ancla con la piel v3 y después la escena con `casting` apuntando a él (arriba) | `LG2b`/`LG3d` → `LG2e`/`LG3e` | operador; `cine-reviewer` al 100 % |
| 15 | **Retocar la piel no cambia la piel** | `pnpm ai:inpaint image` con Sunburst sobre la cara (recorte con contexto): en `LG2b` la zona cambió poco (delta medio 10,4/255, run `e29414c20458`); en `LG3d` reencuadró ≈ 6 px y escaló 0,98 (delta 15,4; `suspectMisaligned`, el pipeline marcó REVISAR, código 3; run `fdd790982b85`) [verificado 2026-10-02] | La piel de un personaje se resuelve en el ancla, no retocando la foto terminada | `piel/inpaint/` | manifiesto de `ai:inpaint` |
| 16 | **Microtextura craquelada** y punta de nariz más ancha y brillante que el ancla | Plate a **3840×2160**; regenerado a **2560×1440** (el máximo no experimental) salió fino [observado en una corrida; la causalidad es inferencia] | Plates de personas a 2560×1440; mirar la cara al 100 % contra el ancla. Coincide con «más resolución no es más fidelidad» (regla de fotografía) | `LG2d` (3840) → `LG2e` (2560) | ojo al 100 %, `revision/LG2d-vs-LG2e-cara.jpg` |
| 17 | La piel de la escena contradice la del ancla | El bloque de realismo compartido (`scripts/foto/bloques/bloque-realismo-v3.txt`) pide «fine wrinkles, uneven skin tone», y `AJUSTES_CINE` no lo reemplaza: está en todos los prompts del login, incluido `LG2e` [verificado]; que empuje la piel hacia lo envejecido es inferencia | Hasta que el compilador lo resuelva, el `IDENTITY` del casting manda en la piel; mirar la cara contra el ancla | `prompts/LG2e-*.txt` | pendiente de código |
| 18 | **Todo nítido** en una escena que pide profundidad de campo | En cine, la plantilla de `suspendido` añade «Every piece is sharp and clearly in flight» (`build-prompt.mjs`, `bloqueSuspendido`, ~l. 1556) [verificado], y contradice el desenfoque por distancia [inferido] | Quitar `suspendido` y declarar el congelado **en la escena**, con qué está nítido y qué se funde (`LG2d`/`LG2e` no lo usan). `LG1` lo usa y fue aprobada porque su `suspendido` ya dice que sólo lo cercano está nítido | `LG2`–`LG2c` → `LG2e` | `cine-reviewer` |
| 19 | **Congelado y estela a la vez** no se entienden | Freeze a 1/8000 s junto a una larga exposición es incoherente: una toma no puede ser las dos cosas | «a long exposure closed by a rear-curtain flash»: la estela la da la exposición larga; el flash de segunda cortina congela al sujeto al final | borrador de `LG2d`, atrapado por `cine-reviewer` antes de gastar → `LG2d`/`LG2e` | `cine-reviewer` |
| 20 | **Lámpara práctica encendida y un monitor azul grande de fondo** (también en registro B) | Se describió el «ambiente» con fuentes propias en vez de una sola fuente de la escena | En B, las prácticas van apagadas; en cine, sólo como bokeh frío y lejano (delta (b), decisión 6). El **panel azul de fondo** está prohibido: el portador legítimo del azul era la propia bomber | primera toma de `LG3` (rechazada por canon antes de mostrarla) → `LG3e` | `cine-reviewer` |

**`LG3e`, la foto aprobada que no es cine.** Registro B, puesta en escena: un estratega de contenidos de casting con la bomber
sobre el polo golpea la mesa y el plan de contenidos queda congelado en el aire; acento teal de growth; una sola fuente LED
baja dentro del cuadro. En el login lleva la lente; `LG1` y `LG2e` van **sin lente**, porque su luz ya es la órbita de
la pieza (una órbita por pieza; el operador lo aceptó). Ficha: `fichas/LG3e-contenidos-estratega.json`.

## Elenco en grupo (2026-10-03) — lo que aprendimos

Prueba cinemática del elenco de marca (`EFEONCE_BRAND_CAST_V1.md`), los cinco juntos, desde C4S07, con dos pasadas del
`cine-reviewer`. Fichas y plates: `ai-generations/2026-10-03_elenco-cine/` (`EC1`, `EC2`).

| # | Síntoma | Causa medida | Corrección | Caso | Chequeo |
|---|---|---|---|---|---|
| 21 | **Identidad prometida en texto**: tres personajes nombrados salen como otras personas | El tope era de dos personas ancladas; el resto iba sólo descrito | Grupo de 3 a 5 entre el `ELENCO`, Nexa y Julio, en cualquier combinación (2026-10-03): una referencia frontal por persona. Medido: con dos anclados, tres caras cambian; con los cinco, sostienen su identidad (hermanas incluidas) | EC1 → brazo 2 → EC2 | `foto:prompt` (`REFS_POR_PERSONA`) |
| 22 | **Bloques IDENTITY sin nombre** con varias mujeres de pelo oscuro | El bloque decía «the woman…» sin decir cuál | En grupo, cada bloque empieza `PERSON n — NOMBRE (Image k):` y la escena nombra la imagen de cada persona | EC1 | `foto:prompt` lo inyecta en grupo |
| 23 | **Caras con luz de estudio** pegadas en una escena oscura | Con cinco anclas, la luz de las referencias se impone a la de la escena | La escena declara la luz en cada cara («a soft teal glow from BELOW…; the light of the identity references does NOT carry over»); en grupo el bloque REFERENCES lo repite | brazo 2 → EC2 | `cine-reviewer` |
| 24 | **Bordado reinventado** en todas las prendas del grupo | A 40–90 px por pecho el modelo no copia la marca aunque tenga la prenda puesta como referencia | `foto:isotipo --acabado` pecho por pecho; si una mano tapa la marca, se pide la vista de oclusión del kit (fila 28) | EC2-b (Hum y Antonio sí; Karo no) | `foto:emblema` al 100 % |
| 25 | **`primerPlano` igual al `lecho`** | El compilador agrega «a separate object from the bed», y el modelo recibe dos objetos o uno contradictorio | Si el primer plano es el lecho, se omite `primerPlano` | EC1 | `cine-reviewer` |
| 26 | **Prenda de hombre en una mujer, de frente en una persona a 45°** | Sin `puesta`, la prenda viajaba siempre con su vista frontal masculina | `foto:prompt` elige la vista puesta por silueta, giro, cámara y oclusión (`elegirPuesta`) e imprime las demás opciones; en grupo, `persona` en cada prenda | prueba de uniforme del elenco | la línea `·` de `foto:prompt` |
| 27 | **Marca rotada en el plano en un giro profundo** | Sin una referencia en esa perspectiva, el modelo dibuja la marca a mano y la inclina (hasta ~35° a 70°) | El kit trae vistas puestas a 45° y 70°, de frente y de espaldas; se pidieron con la órbita horizontal y partiendo del frente | `2026-10-03_uniforme-vistas` | esfera arriba y ventanas horizontales, al 100 % |
| 28 | **Una mano tapa la marca y se compone una marca más chica al lado** | La composición acomodó la marca al espacio libre | La vista real es la marca a su tamaño con sólo la parte visible: se pide la vista de oclusión del kit (`tapa`), no se compone encima. `foto:isotipo` ya compone por detrás de los oclusores, pero no decide el tamaño | EC2-c (descartada) → validado en `VO-karo-mano` (2026-10-03) | el operador, sobre la mano de Karo |
| 29 | **El modelo esquiva la oclusión**: baja la tablet, sube la taza o la corre a un costado | Al pedir un objeto delante de la marca, el modelo prefiere dejar la marca entera y libre | Anclar el objeto a la marca en la frase («los nudillos delante de la marca») y pedir la vista de oclusión del kit (`tapa`). Si igual corre el objeto, revisar la marca: en la validación con taza salió correcta y entera | vistas de oclusión de `2026-10-03_uniforme-vistas`; validación en escena con taza | la línea `·` de `foto:prompt` + `foto:emblema` al 100 % |

## Nexa: pose y proporción (2026-10-03) — lo que aprendimos

Dos fallas de identidad de Nexa que ninguna frase del prompt corregía, porque las causaba una **imagen**. Detalle y
validación en la [ficha de Nexa, delta 2026-10-03](./NEXA_CHARACTER_BIBLE_FICHA_V1.md#delta-2026-10-03--25-expresiones-casi-de-frente-ancla-frontal-v2-y-proporción-del-rostro).

| # | Síntoma | Causa medida | Corrección | Caso | Chequeo |
|---|---|---|---|---|---|
| 30 | **Nexa sale siempre con la misma pose, volteando la cara** (operador) | Las 12 expresiones de `5-expresiones/` se editaron desde el ancla en tres cuartos, todas con el mismo giro, y entraban **primeras** cuando la ficha pedía `expresion` (casi siempre, porque `foto:prompt` avisa si falta). La primera imagen manda en la pose más que cualquier frase | El ancla frontal va siempre primera y la expresión detrás, sólo para el gesto; en dupla y en grupo la expresión no viaja. 25 expresiones nuevas casi de frente (método A2) | `VP1` gira a la derecha cuando la escena lo pide; `VP2` de frente | orden de `--image` que imprime `foto:prompt` |
| 31 | **La cara de Nexa sale afinada o alargada** (operador: «le alarga o achata la cara al ancho, poniéndola excesivamente fina») | El ancla frontal aprobada era 4–5 % más estrecha que el resto del canon (medido con Vision) | Ancla frontal v2: la aprobada estirada ×1,037 en horizontal, sin modelo; geometría del rostro en el IDENTITY (pómulos ≈ 1,2 veces ojos → mentón) y canon `rostro` 0,81 ± 0,02 | ancla vieja 0,836 → v2 0,816; canon aprobado 0,79–0,82 | `pnpm foto:rostro <png> --persona nexa` |

## Lo que no se automatiza (y por eso existe el revisor)

`foto:prompt` y `foto:validar:cine` atrapan lo medible. El juicio que queda —si el fenómeno ES el servicio, si la
escena se entiende sin titular, si la persona correcta está en el lugar correcto— lo revisa `cine-reviewer` contra este
casebook. Si el revisor y el operador discrepan, **gana el operador** y la diferencia se agrega aquí como fila nueva.

## Cómo crece este documento

Cada consulta nueva que no esté cubierta se convierte en una fila de la tabla de fallas (síntoma, causa medida,
corrección, caso, chequeo). Si la corrección es mecánica, se agrega al comando y la fila dice dónde.
