# Método Efeonce de producción narrativa: del guion al plano consistente

> **Tipo de documento:** Método operativo (oficio + procedimiento)
> **Versión:** 1.0 (en construcción: la producción fuente no está cerrada)
> **Creado:** 2026-10-17 por Claude, con el operador
> **Producción fuente:** «¿Para cuándo?» (Efeonce × BytePlus, 30 s, 4:5) — `ai-generations/2026-10-16_byteplus-anuncio-para-cuando/`
> y `ai-generations/2026-10-17_breakr-marca/`
> **Método madre:** [Producción y posproducción de video](VIDEO_PRODUCTION_AND_POSTPRODUCTION_V1.md) (etapas, estados,
> gates, post y entrega). Este documento no lo reemplaza: cubre lo que una pieza **con personajes, set y acción
> física** necesita y el método madre no fija.

## 0. Para qué sirve y cuándo se usa

Una pieza narrativa (personas en un lugar, que hacen algo que tiene consecuencias) falla de una forma que el resto de
los videos no conoce: **cada plano se ve bien solo y la secuencia no tiene sentido**. En la producción fuente pasó
todas las veces que se corrigió un plano mirándolo aislado: el portátil cambió de lado de Antonio, la cámara cruzó el
eje, la lata pasó de chica a gigante, Antonio quedó sentado junto a Paula. Cada arreglo local rompía el plano vecino.

La causa es siempre la misma: **el modelo genera imágenes, no un mundo**. El mundo lo fija la producción antes de
generar, por escrito, y cada plano se revisa contra él. Eso es este método.

Se usa cuando la pieza tiene al menos uno de estos rasgos: personajes que se repiten entre planos, un set con
geografía, un objeto o una acción que viaja entre planos, o plano y contraplano. Para un spot 2D, un reel de muestra o
un video de interfaz, mandan las recetas del método madre.

**Relación con lo existente** (no se repite aquí):

| Tema | Dueño | Qué agrega este método |
|---|---|---|
| Etapas, estados, gates, post | [método madre](VIDEO_PRODUCTION_AND_POSTPRODUCTION_V1.md) | Nada; se aplica igual |
| Cobertura de cámaras (matriz) | companion de preproducción §4 | Emplazamientos ligados a la planta del set (§J) |
| Elenco e identidad | [Brand Cast](../brand-photography/EFEONCE_BRAND_CAST_V1.md), [ledger BytePlus](BYTEPLUS_VIRTUAL_PORTRAIT_LEDGER_V1.md) | Continuidad de cara entre ediciones (§A) |
| Componentes de video | [Surface Composition §4.5](../brand-graphic-line/EFEONCE_SURFACE_COMPOSITION_V1.md) | Cómo se asignan en el storyboard (§C) |
| Pantallas en escena | [anexo producto e interfaz](../../architecture/GREENHOUSE_AI_VIDEO_PRODUCT_AND_INTERFACE_V1.md) | Realismo de pantallas y UI de terceros (§G) |
| **Biblia de continuidad, geografía, física, plan de luz, marca de producto** | **no existía** | **§B, §D, §E, §I** |

## 1. Cómo se usa: un piso, no un techo

Este método es **el paso a paso mínimo** que toda producción narrativa cumple, en orden, con su entregable y su
verificación. **No limita el oficio**: cuántas cámaras, qué ángulos y movimientos, qué luz, qué música, qué efectos
y cómo se cuenta la historia lo decide quien produce con **todo** su conocimiento de cine, publicidad y producción.
Las tablas de este documento son puntos de partida y ejemplos, nunca la única opción. Lo que sí es obligatorio:

- hacer cada paso y dejar su entregable;
- no avanzar con la verificación de un paso en rojo;
- escribir las decisiones en la biblia, para que el siguiente plano las respete;
- cuando una decisión de oficio se aparta de un ejemplo de aquí, decir por qué en una línea.

## 2. Paso a paso

| Paso | Qué se hace | Entregable | Verificación para avanzar |
|---|---|---|---|
| 1. Guion | Beats, diálogo y duración de cada plano en una grilla de tiempo (música o ritmo) | Guion y lista de planos con tiempos | La historia se entiende sin texto en pantalla; cada plano tiene una función |
| 2. Reparto | Quién es cada personaje, real o ficticio, y su regla de conducta | Referencias aprobadas por personaje (y retratos de video si el motor los exige) | El operador aprobó cada referencia (§A) |
| 3. Producto | Marca ficticia o real, sistema y referencia única de producto | Activos determinísticos + referencia fotorrealista | Nombre chequeado; la marca nunca la dibujó el modelo (§B) |
| 4. Biblia | Planta, ejes, línea de 180°, utilería con lado fijo, vestuario, luz por tramo | `CONTINUIDAD.md` desde la plantilla | Cada eje verificado con geometría (§D, §I) |
| 5. Física | Escalas por distancia al lente, recorrido del objeto, causa y efecto | Sección de física en la biblia | Tamaños calculados, no a ojo (§E) |
| 6. Cámaras | Emplazamientos, alturas, lentes, ángulos y movimientos por plano | Plan de cámaras | Todos del mismo lado de la línea; cada movimiento tiene función (§J) |
| 7. Storyboard | Una lámina por plano con el componente de video aplicado | Storyboard en el canvas | Cada lámina declara eje, voz, componente y transición (§C, §F) |
| 8. Auditoría | Revisar la **secuencia completa** contra la biblia, idealmente con dos revisores independientes (planta y física) | Lista de quiebres y bloqueo único | Ningún quiebre abierto en el clímax (§F.3) |
| 9. Plan de sonido y efectos | Audio, VFX y SFX por plano | Planes en la biblia o el paquete | Cada efecto con técnica decidida; cada SFX con causa visible (§K–§M) |
| 10. Planos finales | Generar o editar cada plano contra la biblia; reponer caras; revisar texto | `planos/final/` + prompts y costos | Revisión al 100 % de caras, texto y lado de cada objeto (§H) |
| 11. Video y post | Según el [método madre](VIDEO_PRODUCTION_AND_POSTPRODUCTION_V1.md) | Corte, mezcla, entrega | Gates del método madre |

Saltarse los pasos 4, 5 y 8 es lo que más costó en la producción fuente: más de 40 ediciones de imagen, la mitad
para corregir consecuencias de no tener la planta.

---

# Parte 1 — Mundo, personajes y storyboard

## A. Personajes e identidad

- **Quién es real y quién es ficticio se decide primero.** El elenco ficticio de marca vive en el
  [Brand Cast](../brand-photography/EFEONCE_BRAND_CAST_V1.md); un personaje de casting fuera del elenco (la fuente:
  Paula, la clienta) nace de un **retrato ancla** propio antes de cualquier escena
  (`v2-gpt/casting/ancla-paula.png`), con ficha de rasgos y vestuario.
- **Para video en BytePlus**, cada personaje necesita sus retratos virtuales cargados (rostro neutro + cuerpo frontal;
  2 assets por personaje) y registrados en el [ledger](BYTEPLUS_VIRTUAL_PORTRAIT_LEDGER_V1.md). Seedance rechaza
  rostros que no vengan por esa vía.
- **Cada personaje tiene una regla de conducta escrita** en la biblia, no sólo un aspecto. En la fuente: «Antonio
  nunca reacciona: es el que sabía». Esa regla decidió tres correcciones (Antonio sorprendido en el 10 era un error,
  aunque la imagen fuera buena).
- **La cara aprobada se repone después de cada edición.** Toda edición con IA de un plano redibuja las caras aunque el
  prompt diga «keep the face»: en la fuente cambió los ojos de Paula en el 11a y su expresión en el 11b. Se resuelve
  **componiendo la cara del plano aprobado** sobre el plano nuevo (búsqueda de posición y escala, ajuste de color por
  anillo, borde difuso), no regenerando. Requisito: misma expresión y ángulo parecido. Si el ángulo cambió mucho, la
  búsqueda falla (en la fuente, el 17: correlación 0,52) y lo correcto es **conservar el plano aprobado y editar sólo
  alrededor de la persona** (se agregó la nuca de Antonio sin tocar a Paula).
  Comando: `pnpm creative:face:restore -- --src aprobado.png --face cx,cy,rx,ry --dst editado.png --out salida.png`
  (`scripts/creative/continuity/restore-face.mjs`, pruebas con `pnpm creative:continuity:test`). Sale con código 3
  y no escribe si la correlación queda bajo 0,8.

## B. Producto: marca ficticia o marca real

**Cuándo una y cuándo otra**

| | Marca ficticia | Marca real del cliente |
|---|---|---|
| Cuándo | Pieza propia de Efeonce o de un partner que necesita un producto «de mentira» que parezca real (la fuente: un anuncio de BytePlus cuyo cliente ficticio vende una bebida) | Muestra para el cliente, propuesta, pieza pautada |
| Quién aprueba la marca | El operador | El cliente, con su manual |
| Riesgo | Parecerse a una marca existente | Redibujarla mal |
| Regla común | **El modelo nunca dibuja la marca desde cero.** Se arma determinística (logo, KV, packaging) y al modelo se le pasa como referencia para materia y luz | Igual, y además: lo aprobado se importa desde su generador, nunca se redibuja (F35) |

**Procedimiento para una marca ficticia** (la fuente: BREAKR, `brand.py`, página «Marca de la bebida · BREAKR» del canvas):

1. **Nombre con intención narrativa.** El nombre sale de la historia, no de una lista: BREAKR es la ola que rompe y
   «romper la espera», y su lema «Break the wait.» responde al título del video. El operador eligió idioma y registro
   («algo en inglés con mucho punch»).
2. **Chequeo de nombre con fecha.** Búsqueda web de cada candidato en la categoría y descarte de lo que ya existe o se
   confunde (la fuente descartó Riptide, registrada; Swell, existe; Outburst, cerca de «Orange Burst»; Tropel, cerca de
   Tropical). Se deja escrito que no reemplaza una búsqueda de registro de marca si la pieza se publica.
3. **Sistema mínimo**: logotipo, paleta con su función (qué color manda, cuál vive sólo en un elemento), dos
   tipografías **distintas de las de Efeonce**, sabores o variantes, lema en los idiomas de la pieza. La marca
   ficticia nunca toma el acento de la línea gráfica de Efeonce.
4. **Activos determinísticos** (`brand_assets.py` → `activos/`): logotipo, packaging plano y KV en los formatos que
   aparecen en escena (4:5, 9:16, 16:9).
5. **Referencia única de producto fotorrealista**, editada desde el producto que ya existía en los planos (forma,
   condensación y luz se conservan; sólo cambia la etiqueta). Esa imagen es la única referencia del producto para todos
   los planos (`lata/breakr-lata-v1.png`) y se escribe en la biblia.
6. **Aplicación a los planos**: edición con imagen 1 = plano, imagen 2 = producto, imagen 3 = KV cuando hay pantalla.
   Cada lata y pantalla se revisa **letra por letra al 100 %**: en la fuente salió «REAKR» (la B fuera de la lata) y un
   «ORANGE BREAK» ilegible. Se corrige **por zona** (`pnpm ai:inpaint image` con máscara del texto y la lata de
   referencia), nunca regenerando el plano.

## C. Componentes de video en el storyboard

- El kit aprobado (18 componentes, acento por línea de servicio, 4:5 / 9:16 / 16:9) vive en
  [Surface Composition §4.5](../brand-graphic-line/EFEONCE_SURFACE_COMPOSITION_V1.md) y en AXIS.
- **Cada plano del storyboard declara su componente o «sin texto».** La fuente asignó: subtítulo en vidrio denso para
  diálogo, remate para el golpe del chiste, burbujas para las excusas, zócalo de lugar con pin para las ciudades,
  zócalo de persona, super de dato y lockup para el cierre, barrido navy e iris de anillo como transiciones.
- **La pieza toma el acento de su línea** (la fuente: Growth, teal sobre navy). El fondo de los lechos es siempre el
  navy de Efeonce.
- **El texto nunca lo dibuja el modelo**: se compone en post sobre reservas del plano.

## D. Geografía del set y biblia de continuidad

La biblia es **un archivo por producción** (`CONTINUIDAD.md` junto a los planos), se arma desde la plantilla
`motion-design-studio/templates/continuity-bible.md` y es la fuente única. Todo plano nuevo
o corregido se revisa contra ella **antes** de mostrarlo.

**Contenido mínimo**

1. **Planta** vista desde arriba con puntos cardinales: muebles, quién se sienta dónde, ventanas y muros, pantallas.
2. **Ejes de cámara** con nombre (A, B, C…): dónde está la cámara, hacia dónde mira, qué queda a la izquierda y a la
   derecha del cuadro, qué se ve al fondo y qué planos usan cada eje.
3. **Línea de 180°** trazada en la planta (de un personaje al otro) y la regla: **todas las cámaras de un mismo lado**.
   Se verifica con la geometría, no a ojo: si la cámara mira al sureste, lo que está al noreste cae a la izquierda.
4. **Utilería con lado fijo respecto de cada persona** («el portátil de Antonio, siempre delante de él y a su
   izquierda; la taza más allá del portátil»), y cuándo cambia de estado (girado hacia Paula del 09 al 12).
5. **Vestuario y estado** por tramo (seca / empapada, rodaja de naranja en el hombro izquierdo, café en la mano derecha).
6. **Luz por tramo** (§I).
7. **Tabla del clímax**: por plano, eje, posición de cada persona y objeto, recorrido de la acción y luz.
8. **Decisiones conscientes**: lo que parece error y no lo es («Día 42» es un gag sin continuidad; el vidrio de la
   pantalla queda intacto).

**Errores que la fuente demostró y que la biblia previene**

| Error | Por qué pasó | Regla |
|---|---|---|
| El contraplano cruzó el eje (17 y 18: los dos miraban hacia el mismo lado) | La biblia original puso a Antonio a la izquierda en el eje B sin verificar la geometría | Trazar la línea y comprobar cada eje contra ella; el plano que ya está bien (el 08) es la referencia |
| El portátil cambió de lado de Antonio | El 09 lo puso a su derecha; los demás planos, a su izquierda | El lado de cada objeto respecto de su dueño se escribe y no cambia sin motivo |
| Antonio quedó sentado junto a Paula (12) y junto a su portátil del lado de la pantalla (10) | El modelo «acomoda» a las personas para que se vean | En el prompt se describe la geometría y qué tapa a qué («la tapa le cubre el pecho; sólo asoman cabeza y hombros») |
| El ventanal apareció detrás de Paula en el eje B | El modelo pone la vista linda donde quiere | La biblia dice qué fondo tiene cada eje y qué **no** puede aparecer |

## E. Física de la acción

- **Escala por distancia al lente, no a ojo.** Se parte de medidas reales (lata 15,7 cm; cabeza ≈ 23 cm) y de la
  distancia de cada uno al lente: a igual distancia, la lata mide 0,68 cabezas; a 1 m del lente con la persona a
  2,5 m, ≈ 1,7. La fuente falló dos veces en sentidos opuestos (chica, después gigante) hasta calcularlo.
- **Recorrido del objeto entre planos**: de dónde sale, hacia dónde va respecto de la cámara de cada plano y en qué
  posición termina (la lata cae junto a Paula en el 12; si no, «desapareció»).
- **Fluidos con comportamiento físico**: una pantalla de 30 cm no explota en estrella; emite una lengua de agua del
  ancho del objeto que cae frente al teclado, corre por la mesa como un frente que se abre y estalla en corona al chocar.
  Al pedirlo: láminas finas en los bordes, cuerpo que refracta, espuma sólo donde rompe, gotas redondas y filamentos
  (nunca cuentas en el aire), salpicaduras donde caen, rastro mojado. **Sin hielo** si la biblia no lo tiene.
- **Causa y efecto en la utilería**: quién queda mojado y quién seco (la tapa protege a Antonio y su taza), dónde queda
  el mojado (una banda diagonal hacia Paula) y qué queda en el suelo.
- **Reacción coherente con el personaje** (Antonio no reacciona) y con la física (pelo empujado en la dirección del golpe).

## F. Storyboard y ciclo de revisión

1. **Dónde vive**: un canvas por producción, con una página por tema (en la fuente: «Sistema de video» con los
   componentes y el animatic, «Storyboard» con la versión vigente, «Marca de la bebida»). Las versiones anteriores
   se retiran de la vista cuando confunden y quedan en el historial.
2. **Cada lámina** lleva: plano, tiempo, beat, eje, voz o subtítulo, componente, transición y la imagen con el
   componente ya armado.
3. **Auditoría de continuidad de la secuencia completa** antes de mostrar una corrección del clímax. En la fuente, lo
   que destrabó el problema fue revisar la secuencia con **dos subagentes en paralelo** (uno arma la planta y los ejes
   de todas las cámaras; otro analiza la física) y contrastar sus informes antes de tocar un plano. Coincidieron en la
   causa raíz que la revisión plano a plano no veía.
4. **Comentarios del operador en el canvas**: cada comentario se responde en su hilo con qué se cambió y se resuelve;
   si no queda claro a qué plano se refiere, se dice qué se interpretó y el hilo queda abierto.
5. **Una corrección local se valida en la secuencia**: el plano corregido se pone junto al anterior y el siguiente
   antes de publicarlo.

## G. Pantallas, interfaces y producto en pantalla

- **Pantallas en escena (vallas, displays, portátiles)**: el arte de campaña se pone con edición de IA y **después
  una pasada de física de pantalla** (emisión, trama de LED, bloom, reflejo, grano, derrame de luz) que no cambia el
  contenido. En la fuente, componer el KV exacto en perspectiva con física simulada se descartó: se veía pegado. La
  pasada del modelo se aprobó para las 8 pantallas.
- **El arte que va en pantalla es la versión fotográfica de la campaña**, no el KV plano (se rechazó en el teléfono).
- **Interfaces de terceros (Instagram)**: la UI se arma en HTML con texto exacto (usuario, «Publicidad», copy, me gusta,
  barra de navegación) y se compone determinísticamente en el teléfono, ajustada a su perspectiva y esquinas. Así el
  texto queda exacto. Usuario, copy y cifras son ficticios.

## H. Edición, QA y registro

- **Editar, no regenerar.** Para cambiar una zona: `pnpm ai:inpaint image` con máscara (zona protegida idéntica bit a
  bit). Para cambiar el plano entero: edición con el plano como estructura. Generar de cero sólo cuando cambia la
  puesta en escena (en la fuente, el re-bloqueo del clímax).
- **Revisión al 100 % antes de mostrar**: texto de cada producto y pantalla, cara de cada persona contra su
  referencia, lado de cada objeto contra la biblia.
- **Registro**: cada corrida con su prompt en `planos/prompts/`, su log y su costo; la versión aprobada se copia a
  `planos/final/` (el canvas apunta sólo ahí). La fuente registró ≈ USD 2 en ediciones de imagen BREAKR más ≈ USD 3,3
  en el storyboard y ≈ USD 0,7 en retratos (sólo salida; la entrada suma aparte).

---

# Parte 2 — Luz, cámaras, audio, VFX y SFX

Esta parte es **método general** (pasos 6 y 9): sirve para cualquier producción y cada una llega a decisiones distintas (otro set,
otro número de cámaras, otros movimientos y ángulos). El vocabulario de oficio (tipos de plano, movimientos y la
emoción que producen, lentes, iluminación, eje de 180°) vive en
`motion-design-studio/modules/03_CINEMATIC_LANGUAGE.md`; aquí está **cómo se decide** con él. El plan concreto de la
producción fuente está en el [Anexo A](#anexo-a--plan-de-para-cuándo), como ejemplo y no como norma.

## I. Luz

1. **Luz motivada**: toda luz tiene una fuente que existe en la geografía (ventana, pantalla, lámpara, sol, fuego).
   Una luz sin fuente se lee falsa aunque sea bonita.
2. **Mundos de luz como recurso narrativo** (opcional): si la historia tiene un giro, la luz puede cambiar con él y en
   ningún otro punto. Se escriben por tramo en la biblia.
3. **La dirección se deduce, no se elige**: con la planta, la fuente y el eje de cada cámara, la luz de cada plano
   queda determinada (fuente detrás del sujeto = contraluz; fuente detrás de la cámara = luz frontal o de tres cuartos).
4. **Pantallas, fuego, neón**: también son fuentes y tiñen lo cercano.
5. **Hora del día coherente con el relato**: si el texto en pantalla o el guion dicen una hora, la luz de todos los
   lugares se ajusta a esa hora en su huso horario, y también lo que la muestre (relojes, «hace 1 minuto» en un feed).
6. **Gate**: la luz de cada plano se revisa contra la biblia, igual que la utilería.

**Plantilla por producción**: tramo · planos · fuente · dirección por eje · temperatura · calidad (dura o suave) ·
qué la contradice.

## J. Cámaras: cantidad, ángulos y movimiento

No hay un número correcto de cámaras ni un movimiento estándar. Se decide por producción con estas preguntas:

**1. ¿Cuántos emplazamientos?** Se cuentan posiciones de cámara en la planta, no planos: varios planos pueden
compartir emplazamiento cambiando lente o encuadre. Menos emplazamientos dan más continuidad y menos riesgo; más
emplazamientos dan variedad y ritmo.

| Tipo de pieza | Punto de partida habitual |
|---|---|
| Diálogo entre dos personas | 3: plano general (o eje lateral) + plano y contraplano sobre el hombro, del mismo lado de la línea |
| Grupo o reunión | 3–5: general, uno por personaje clave, inserto de objetos |
| Producto o demostración | 2–4: héroe del producto, uso en mano, insertos de detalle, pantalla |
| Testimonio o vocería | 1–2: frontal y un ángulo de corte |
| Acción física (un objeto o fluido que viaja) | Uno por tramo del recorrido: origen, viaje, impacto, consecuencia, cada uno con su eje respecto de la línea de acción |
| Recorrido por un lugar | Cámara que se mueve con el sujeto; pocos emplazamientos y mucho movimiento |

**2. ¿Qué ángulo y altura?** El ángulo es una decisión de relato: a la altura de los ojos para el diálogo neutral;
picado para quitar poder o mostrar una situación; contrapicado para dar poder; a ras de mesa o de piso para el objeto
heroico; cenital para la geografía o el gag visual; sobre el hombro para plano y contraplano; subjetiva para meter al
espectador. La altura se escribe en metros: es lo que más cambia una escena generada.

**3. ¿Qué lente?** Como intención óptica: gran angular cerca (energía, distorsión, inmersión), normal (neutral),
tele (aislamiento, compresión, intimidad). El mismo emplazamiento con otro lente da otro plano sin romper continuidad.

**4. ¿Qué movimiento?** Cada movimiento tiene una función; si no la tiene, la cámara queda fija.

| Movimiento | Función típica |
|---|---|
| Fija | Observar, tensión contenida, comedia seca |
| Push-in (acercarse) | Revelación, decisión, foco en un detalle |
| Pull-out (alejarse) | Revelar el contexto o la consecuencia |
| Paneo / tilt | Seguir una mirada o un objeto, mostrar un espacio |
| Travelling lateral | Acompañar, dar ritmo |
| Dolly siguiendo la acción | Velocidad, persecución, un objeto que viaja |
| Grúa o dron | Escala, cambio de mundo, apertura o cierre |
| Cámara en mano | Caos, impacto, urgencia |
| Órbita | Héroe, objeto que importa |
| Whip pan / barrido | Transición de lugar o de tiempo |

**5. ¿Cuándo se mueve?** La gramática de movimiento acompaña al relato: es habitual fijar la cámara en un tramo y
soltarla en el giro. Se escribe por acto.

**6. Continuidad**: todos los emplazamientos de una escena van del mismo lado de la línea de 180°; si hay que
cruzarla, se cruza en cámara (con un movimiento que se vea) o con un plano neutro sobre el eje.

**Plantilla por emplazamiento**: id · eje en la planta · altura · lente · planos que lo usan · movimiento por plano y
su función · entrada y salida (cómo empalma con el plano anterior y el siguiente).

## K. Audio: voz, música y mezcla

El oficio completo está en la skill `audio-studio` y en la etapa 10 del método madre. Lo propio de una pieza narrativa:

- La **voz** se graba o genera después del corte mudo; los subtítulos se re-temporizan con la voz real.
- La **música** va en un tramo continuo y el montaje se ajusta a su grilla de tiempo.
- El **silencio** se planifica como un evento más (corte de música en el punto de giro).
- La voz de cada personaje se fija en la biblia (timbre, acento, edad), igual que su cara.
- **Límite**: el agente no oye; la escucha es humana.

**Plantilla**: elemento · plano y momento en la grilla · fuente (voz grabada, voz sintética, música licenciada,
librería) · estado.

## L. VFX y composición

- Se decide por efecto, no por plano: **generativo en el plano** (el modelo lo pinta junto con la escena),
  **composición en post** (capa aparte, exacta) o **mixto** (generativo + refuerzo compuesto).
- Va a composición todo lo que tiene que ser exacto: texto, marcas, interfaces, cifras, la cara aprobada.
- Va al generativo lo que necesita integrarse con la luz y la física de la escena: fluidos, partículas, pantallas
  encendidas (§G).

**Plantilla**: plano · efecto · técnica (generativo, composición, mixto) · referencia · riesgo · QA.

## M. SFX

- Un SFX por causa visible, y ninguno sin causa.
- Se listan por plano con su momento exacto en la grilla y su intensidad relativa.
- Los componentes de video (lechos, golpes de esfera) tienen su propio sonido de interfaz, separado del mundo.

**Plantilla**: plano · momento · causa visible · sonido · capa (mundo o interfaz).

---

## Lecciones de la producción fuente

| # | Falla | Prevención |
|---|---|---|
| N1 | Cada plano corregido aislado rompía al vecino | Biblia antes de generar; validar cada corrección en la secuencia |
| N2 | Cruce del eje de 180° en el contraplano | Trazar la línea en la planta y verificar cada eje con geometría |
| N3 | Objeto que cambia de lado respecto de su dueño | Lado fijo escrito en la biblia |
| N4 | Escala del producto a ojo (chica, después gigante) | Medidas reales + distancia al lente |
| N5 | La edición con IA cambia caras aunque se pida conservarlas | Reponer la cara aprobada por composición; si el ángulo cambió, editar alrededor de la persona |
| N6 | Texto del producto mal escrito por el modelo | Revisión letra por letra al 100 % y corrección por zona |
| N7 | Pantalla compuesta determinísticamente se ve pegada | Arte por edición + pasada de física de pantalla |
| N8 | KV plano en una pantalla junto a vallas fotográficas | Versión fotográfica del arte de campaña |
| N9 | Luz sin fuente en la escena | Luz motivada, deducida de la planta |
| N10 | El personaje reacciona contra su regla | Regla de conducta escrita por personaje |
| N11 | La revisión plano a plano no ve la causa raíz | Auditoría de secuencia con subagentes en paralelo (planta y física) y contraste antes de editar |

## Pendientes de este método

- Aprobar con el operador los movimientos de cámara, VFX y SFX del Anexo A marcados como propuesta.
- Cerrar la producción fuente (video, audio, post, cifra real del cierre «[X] h») y versionar este documento a 1.1.

---

## Anexo A — Plan de «¿Para cuándo?»

Aplicación de la Parte 2 a la producción fuente. Es un ejemplo: otra producción llega a otro plan. Lo marcado
**propuesta** espera la aprobación del operador.

**Luz**

| Tramo | Planos | Fuente | Calidad |
|---|---|---|---|
| Mundo frío | 01–09 | Ventanal al este, día nublado | Fría, pareja, sin sombras duras |
| Mundo Efeonce | 10–18 | Sol de mañana bajo entrando por el ventanal | Cálida: contraluz en el eje A, frontal o tres cuartos en el eje B |
| Ciudades | 13–15 | Mañana del lunes (zócalos 09:12–09:14), vallas LED encendidas | Sol bajo de mañana; la campaña aparece en el mismo instante que en la sala. Corregido el 2026-10-17: estaban al atardecer y de noche, contra la hora de los zócalos |
| Cierre | 20a–20b | — | Navy de Efeonce |

**Cámaras** (emplazamientos fijados; movimientos: propuesta)

| Emplazamiento | Planos | Altura · lente | Movimiento (propuesta) |
|---|---|---|---|
| A: detrás del hombro derecho de Paula, mirando a Antonio | 06, 07, 09, 18 | Ojos sentado (≈1,15 m) · 50 mm; 85 mm en 07 y 18 | Fija en 06–09; leve push-in en el 18 |
| B: detrás del hombro izquierdo de Antonio, mirando a Paula | 08, 11a, 11b, 17 | Ojos sentado · 35–50 mm | Fija en 08; dolly rápido hacia Paula con la ola en 11a; cámara en mano con sacudida en 11b; fija en 17 |
| C: extremo oeste, a lo largo de la mesa | 01, 04, 05, 12 | ≈1,2–1,4 m · 35 mm | Fija en 01–05; paneo lento de las paredes en el 12 |
| Inserto a ras de mesa | 10 | ≈15–20 cm · 28 mm | Push-in hacia la pantalla cuando sale la lata |
| Grilla de videollamada | 02, 03, 19 | Pantalla | Zoom out de 4 a 16 a 64 (03); recuadros que se apagan (19) |
| Ciudades | 13, 14, 15 | Calle · 35 mm | Corte encadenado por la forma de la lata; leve tilt hacia la valla |
| Vocera | 16 | Plano medio · 50 mm | Fija |
| Gancho | 00 | = 11b | Congelado y rebobinado en post |

**Audio** (sin grabar)

| Elemento | Plan |
|---|---|
| Voces | Paula, Antonio y proveedores con ElevenLabs v4 (pruebas de Antonio en `v2-gpt/voces/`); vocera en ES, EN y PT en el 16 |
| Música | Tensa en el mundo frío, se corta en el 06; el drop entra en el 10 con la lata; cierre sobre el drop |
| Mezcla | −14 LUFS; subtítulos a 17 cps máximo |

**VFX** (propuesta)

| Plano | Efecto | Técnica |
|---|---|---|
| 00 | Congelado y rebobinado al 01 | Composición |
| 10 | La lata atraviesa el vidrio intacto, anillo de luz | Mixto |
| 11a–11b | Ola con física real y corona sobre Paula | Generativo; cara y lata repuestas si derivan |
| 12 | Paredes que se encienden | Generativo + encendido en post |
| 09, 13–15, 17, 18 | Pantallas con la campaña | Pasada de física de pantalla |
| 15 | Feed de Instagram | UI compuesta |
| 19 | Recuadros que se apagan | Composición |
| Todos | Texto y componentes | Composición |

**SFX** (propuesta)

| Plano | SFX |
|---|---|
| 01–05 | Teclado, notificaciones de la llamada, murmullo que crece con la grilla |
| 06 | Silencio; sólo el sorbo de café |
| 09 | Clic suave al girar el portátil |
| 10 | Zumbido de pantalla que sube, whoosh de la lata, burbujeo |
| 11a–11b | Ola por la mesa, golpe de agua, gotas |
| 12 | Encendido de pantallas en cadena |
| 13–15 | Ambiente de ciudad con transición por golpe de música |
| Componentes | Tic al nacer el lecho; nota en cada golpe de esfera |
