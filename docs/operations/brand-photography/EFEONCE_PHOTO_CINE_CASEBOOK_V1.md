# Registro cine · el casebook — cómo se hace, en la práctica

> **Tipo:** guía operativa (oficio) · **Versión:** 1.0 · **Creado:** 2026-10-02 por la sesión de la línea gráfica
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

Además, en cine el comando **inyecta solo** lo que se olvida siempre: el uniforme «deep navy, not royal blue» cuando
hay una prenda del kit, y el lecho «matte, non-reflective, outside the reach of the key light».

## Las diez fallas, con su corrección

Cada fila es un caso real. **La columna «chequeo» dice quién la atrapa hoy.**

| # | Síntoma | Causa medida | Corrección (frase o regla) | Caso | Chequeo |
|---|---|---|---|---|---|
| 1 | **Objetos como stickers**: nítidos, del mismo tamaño, con luz propia, en abanico | Demasiadas **referencias de objeto**: cada una dice «Reproduce EXACTLY» con su foto de estudio y el modelo copia también su nitidez y su luz | **Máximo dos referencias de objeto** de personaje en la toma (las del plano cercano); el resto, sin imagen: «the same figures as the references, far, small and out of focus, their LED eyes as glowing dots» | NX7b (10 ref.) → NX7d (8, dos Sparks) | `foto:prompt` avisa si hay más de 2 objetos-personaje; `cine-reviewer` sobre el plate |
| 2 | **Luz plana**: la cara pareja, sin modelado | La fuente es una línea fina o no tiene lado; hay relleno implícito | Fuente **con tamaño y cerca**, con lado; «the only key light, NO fill, NO front light: the far side of the face falls into deep shadow, nose shadow legible on the cheek» | NX7b → NX7d; NX5 «a hard key light from the left sculpts her face» | `foto:prompt` avisa sin `llave`; `foto:validar:cine` sólo atrapa el cuadro claro y parejo; `cine-reviewer` |
| 3 | **Sin profundidad**: todo en un plano | Falta primer plano junto al lente y fondo con bokeh; «some are out of focus» no basta | **Tres planos con distancia en metros** y apertura (cerca nítido · ~1 m · 4–6 m desenfocado, 85 mm f/1.8–2); un objeto **junto al lente** | NX5b (robot en la cornisa), NX7d | `foto:prompt` avisa sin `primerPlano` ni `fondo`; `cine-reviewer` (los píxeles no lo separan: ver [Medidor](#medidor-qué-mide-foto-validar-cine-y-qué-no)) |
| 4 | **El fenómeno está al lado del servicio** | Se eligió un objeto lindo (cinta, perfume, pantallas) en vez de la luz que ES el servicio | Prueba de quitarlo: si sin la luz la idea sigue en pie, la luz sobra. Declara `fenomeno.esServicio`. En ads, **luz dura con la sombra como logo** y **larga exposición real** tienen respaldo; freeze y levitación no | CA1/CA3 (CMP-004); AE2 «un haz elige UNA» | `foto:prompt` avisa sin `fenomeno`; `cine-reviewer` |
| 5 | **En vertical, el fenómeno sube a la reserva** | La fuente está riggeada alta; el fenómeno no se nombró en la prohibición | Nombrar el fenómeno: «the [vortex] stays entirely BELOW 36 % of the frame height; the top third is calm deep dark space»; fuente baja (rodilla–pecho); vórtices hacia el fondo, no hacia arriba | AD1d; CA4 (hasta el 15 %) | `foto:prompt` lo inyecta en 4:5 y 9:16; `foto:validar:cine` mide la luz en la reserva |
| 6 | **Uniforme azul rey** en vez de navy | El modelo satura el azul del polo y del hoodie | «deep navy, not royal blue» | AE2b, CR2b, CA1/CA3/CA3b, SE1 | `foto:prompt` lo inyecta; `cine-reviewer` (bajo una llave azul los píxeles no lo separan) |
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
| `WB1c` | portada Engine, `proposal-cinematic-web` | desarrollador | el polo del kit editado: bordado en el pecho | `2026-09-26_deck-web/fichas/WB1c/` |

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

**Decisiones del operador (2026-10-02)** sobre las siete contradicciones que encontró la prueba: aros de Nexa dorados;
el destacado «Agents» aprobado se queda (tres Sparks, sin Nexa ni texto); escala vertical por encuadre (9:16 de la
cintura arriba, 4:5 del pecho arriba); en la sección partida la mirada va al panel; personas reales del roster con la
prenda de su línea y casting por rol con el código por escena; luces prácticas encendidas sólo como bokeh frío y lejano
(excepción cine); una sección partida por deck la controla el validador del plan. Detalle en el
[registro cine, delta 2026-10-02 (b)](EFEONCE_PHOTO_REGISTER_CINE_V1.md#delta-2026-10-02-b--decisiones-del-operador-tras-la-prueba-ciega).
`foto:prompt` aplica en cine las tres que son de toma (aros, escala, mirada).

## Lo que no se automatiza (y por eso existe el revisor)

`foto:prompt` y `foto:validar:cine` atrapan lo medible. El juicio que queda —si el fenómeno ES el servicio, si la
escena se entiende sin titular, si la persona correcta está en el lugar correcto— lo revisa `cine-reviewer` contra este
casebook. Si el revisor y el operador discrepan, **gana el operador** y la diferencia se agrega aquí como fila nueva.

## Cómo crece este documento

Cada consulta nueva que no esté cubierta se convierte en una fila de la tabla de fallas (síntoma, causa medida,
corrección, caso, chequeo). Si la corrección es mecánica, se agrega al comando y la fila dice dónde.
