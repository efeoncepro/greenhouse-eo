# El criterio de la órbita: cuándo, cómo, con qué y por qué

> Verificado contra: axis-design-system@e26bd85 (iconografía §3.14: AXIS `main@5b8ab20`, tag `v0.3.6`) y
> greenhouse-eo@7cb24df17 — 2026-09-26 (decisiones del operador D1–D22 del 2026-09-26 registradas; ver
> [ledger.md](ledger.md)). §3.14 «Plastilina en volumen» (D24): AXIS `main@c18e3d3` — 2026-09-27.
> Fuentes: láminas del canvas reconstruidas en AXIS (`apps/lab/src/data/graphic-line-elements.json`, citadas como
> «lámina X.Y»); página del Lab `apps/lab/src/pages/references/graphic-line.astro` («Lab X.Y»); manual
> `docs/operations/brand-graphic-line/EFEONCE_GRAPHIC_LINE_V1.md` («manual §»); ADR
> `docs/architecture/EFEONCE_GRAPHIC_LINE_ORBIT_DECISION_V1.md`; norma
> `EFEONCE_ORBIT_MOTION_LANGUAGE_V1.md`; `docs/operations/EFEONCE_ADVERTISING_THREE_VOICES_ACTION_V1.md` («Tres
> voces»); `docs/context/05_voz-tono-estilo.md` y `09_marca-agencia.md`; decisiones del operador del 2026-09-26.
> Lo que no está en una fuente va marcado **«inferido»**: tómalo como lectura razonada, no como regla.

Este archivo no repite números: esos viven en los tokens `efeonceGraphicLine` y los explica
[package-and-tokens.md](package-and-tokens.md). Tampoco repite recetas: están en [composition.md](composition.md). Aquí
está **el juicio**: qué significa cada elemento, cuándo corresponde y cuándo no, con qué convive y qué delata que no se
entendió la línea. Decide como el director de arte que la diseñó: cada elemento tiene un trabajo y, fuera de él, sobra
(lámina 5.6).

---

## 1. La idea en una frase y el porqué

**Una esfera que recorre su órbita** (manual §0; Lab 0.1). La esfera del isotipo —la nave con su anillo y su esfera— es
el activo. Recorre su órbita: el avance se ve, el oficio está a la vista y la conversación cierra con una respuesta
(lámina 0.2, «1 · Idea»).

Por qué esta forma y no otra:

- **No inventa un símbolo: abre el que ya existía.** La «o» de efeonce es una órbita; adentro va una nave con tres
  ventanas («tres puntos… lo que todavía se está pensando») y arriba, cortando el anillo, una sola esfera: el punto que
  cierra. «Tres puntos que se vuelven uno» (Lab 0.1, manifiesto). Por eso el isotipo nunca lleva otra órbita: ya trae la
  suya (lámina 5.5).
- **La gramática es la marca.** «El anillo pregunta. La esfera responde. El arco avanza, solo si un dato lo prueba. El
  halo ilumina. Lo justo» (Lab 0.1). Anillo = lo abierto, lo libre, lo que todavía se pregunta; esfera = lo decidido,
  lo ocupado, lo que cierra (manual §0, idea 2). Esa gramática rige la voz, la oficina, las credenciales y los objetos.
- **Atención, no decoración.** «La órbita no decora. Trabaja. Rodea lo que importa. Mide lo que avanza. Enfoca donde se
  decide» (Lab 0.1). Tres usos, un sistema (ADR, decisión 2): **rodea**, **mide**, **enfoca**.
- **El oficio a la vista.** La línea es la forma visible del Why de Efeonce: «No te entregamos crecimiento: lo
  construimos contigo. A la vista. Vuelta a vuelta» (Lab 0.1; `09_marca-agencia.md` §Golden Circle). El avance se
  muestra, no se promete; por eso el arco sólo existe con un dato (creencia contraria #3 de `05`: las vanity metrics son
  un acuerdo de silencio).
- **Línea fina y luz, nunca un disco plano** (manual §0, idea 3). Un trazo tenue, un arco, una esfera en la punta; el
  halo es luz. Nada de discos rellenos, brillos, reflejos ni esferas de vidrio (lámina 0.2, «10 · No hacer»). La línea
  retiró del canvas el punto gigante, la esfera tipográfica y el objeto 3D (lámina 6.1): se leían como puntuación, no
  como forma, y no medían ni enfocaban (ADR, alternativas descartadas).

**Estado honesto:** hasta correr la prueba sin logo (600 personas, lámina 6.2), la línea es un sistema consistente,
**no** un activo distintivo demostrado. No la vendas como *brand equity*. La prueba va **antes de cualquier pauta con la
órbita** (operador, 2026-09-26, D14); proveedor y presupuesto los decide el operador.

---

## 2. Cuándo sí usar la órbita y cuándo no

### 2.1 La prueba de decisión

Antes de dibujar un anillo, contesta en orden. Un «no» corta el camino: la pieza va sin órbita y la fotografía y la
tipografía bastan.

1. **¿Es de Efeonce o de su familia?** La línea es de la marca propia. No va en trabajo de clientes ni en la interfaz de
   Greenhouse (ADR, decisión 6; lámina 3.2: «La línea gráfica es de Efeonce: no se aplica a la interfaz de
   Greenhouse»).
2. **¿Hay algo concreto que rodear, medir o enfocar?** Una palabra, una lente, un objeto, una foto de persona (rodea);
   un dato real con fuente o la navegación de un deck (mide); el lugar donde está la decisión o el cliente (enfoca).
   Además, cuatro trabajos derivados que el canvas validó: el **estado** (libre / ocupado), el **mapa de familia**, el
   **cierre de marca** y la **firma de correo**. Si no hay nada de esto, no hay órbita.
3. **¿La pieza ya tiene su composición?** La órbita **no sustituye** la composición ni las formas del lenguaje
   fotográfico; se usa en casos específicos, **se declara a propósito** y nunca va por defecto (operador, 2026-09-26;
   manual §1.3). Una pieza fotográfica sin órbita es lo normal, no una pieza incompleta.
4. **¿Cabe con su aire, sin cruzar nada?** Nunca sobre el sujeto de la foto, las reservas de texto, el lecho ni la
   firma (chequeo `orbit-never-over-subject-or-reserves`); ningún texto la cruza (lámina 5.1). Si para meterla hay que
   empujar el texto o tapar la cara, la respuesta es no.
5. **¿Ya hay otra órbita, lente o foco en la pieza?** Una sola por pieza, por muro, por vidrio (lámina 4.1, 4.3 2/3;
   ADR 5). Si ya está, no se suma otra.

### 2.2 Contención

- **Una de cada cosa por pieza:** una órbita o lente, una esfera, un acento, una sola luz de foco, una pregunta y una
  respuesta (láminas 0.2, 1.4, 2.1, 3.1). Del oficio a la vista, **máximo dos herramientas** además de la esfera
  (lámina 2.3).
- **Lo que se lee no se decora.** La señalética de servicio (cocina, baños, salida) va en Poppins, **sin esfera ni
  órbita**: «se lee, no decora» (lámina 4.3 1/3).
- **Lo que viaja no se anuncia.** El envío a clientes va sobrio por fuera (logo chico y un anillo): «lo que viaja por
  correo no anuncia lo que lleva» (lámina 4.7 1/3).
- **La segunda hoja se calla.** La hoja membretada lleva la órbita en la esquina; la continuación, no: logo chico y
  número de página (lámina 4.7 2/3). En el deck, el contenido en papel baja la órbita a 80 px en la esquina, sólo como
  indicador (lámina 4.2).
- **Nada de patrones.** Una lente o una órbita por muro o vidrio (lámina 4.3 2/3); repetir la esfera como patrón es un
  «no» explícito (lámina 1.1).

### 2.3 Frecuencia en una campaña (inferido)

Las fuentes fijan la regla por pieza, no por serie. De ellas se sigue: en una campaña, la órbita aparece en las piezas
donde tiene trabajo (una lente sobre una foto con un punto de interés claro, un dato real, un cierre) y **no** en todas.
La lente «depende de que la foto tenga un punto de interés claro; con una foto débil, se nota el truco» (lámina 1.3):
repetirla en cada pieza de la serie convierte una forma que enfoca en una plantilla. El eslogan sigue la misma lógica:
«no va en cada post: ahí la respuesta con esfera ya cierra» (lámina 2.2). *(inferido a partir de 1.3, 2.2, 4.3 y la
regla «nunca por defecto»)*

---

## 3. La gramática, elemento por elemento

Anatomía (lámina 1.2; Lab 1.2): **anillo** (el recorrido) · **arco** (lo avanzado) · **esfera** en la punta (dónde
vamos) · **halo** (el foco sobre lo importante) · **órbitas interiores** (máximo dos) · **satélites** (canales o
productos). La órbita es **circular**; nunca un óvalo (operador, 2026-09-26): el óvalo sólo aparece como la órbita 3D
del isotipo dentro de la animación del logo, cuando el anillo de la línea se inclina hasta volverse la órbita de la nave
(Lab 4.4.2, reveal).

### 3.1 Anillo — el recorrido

- **Significa:** el camino, lo abierto, lo libre, la pregunta. En la oficina, sala libre; en un evento, el asistente;
  en el llavero, la argolla (láminas 4.3 2/3, 4.6 3/3, 4.7 2/3).
- **Cuándo:** siempre que haya órbita; es su base. Solo, con la pregunta: en cuadernos, pizarras y formularios la
  pregunta queda sola con su anillo y «responde quien lo usa» (lámina 2.1, «Abierta»).
- **Cómo:** fino y tenue (1 px por cada 794 px de ancho, opacidad baja; el 22 % sólo con órbitas interiores o
  satélites, manual §1.3). En oscuro es luz de halo; en papel, navy (resolver del contrato). Con algo adentro, el anillo
  guarda aire alrededor del objeto (`ringAirRatio`).
- **Combina con:** el arco y la esfera; una palabra, una lente, una foto de persona, un ícono de área (firma de equipo).
- **Nunca:** grueso, muchos, detrás del texto (lámina 5.6), alrededor del logo (lámina 5.4), ovalado, cortado por texto.
- **Error típico:** usar el anillo como marco decorativo de cualquier cosa. Un anillo sin nada que recorrer ni rodear es
  ruido.

### 3.2 Arco — lo avanzado

- **Significa:** cuánto se avanzó. Es el único elemento que afirma algo medible, por eso es el más controlado.
- **Cuatro papeles, cuatro reglas** (Lab 1.2.1, «Trayectoria»; token `trajectory`):

  | Papel | Qué dice | Regla de criterio |
  |---|---|---|
  | **Dato** (`measure`) | un valor real, con su fuente | el dato es la **posición de la esfera**, no un arco que se llena (ver 3.4) |
  | **Avance** (`progress`) | en qué sección va un deck o informe | la portada con arco corto; cada sección suma su tramo; el cierre completa la órbita con la esfera arriba |
  | **Acento** (`orbit`) | movimiento, no un dato | corto, arriba a la izquierda; **nunca junto a un número** |
  | **Satélites** | el mapa de portafolio | largo, en degradé, **sin esfera**; los satélites van sobre él |

- **Cómo:** punta redonda, sentido horario; el acento va centrado en su posición (arriba a la izquierda) y lleva la
  esfera en la punta (manual §1.3).
- **Nunca:** un arco de avance sin dato real («Arco de avance sin dato real», lámina 0.2); un arco decorativo al lado de
  una cifra, porque se lee como dato; un arco inventado para «dar sensación de progreso» (lámina 5.6: «decorativo o
  inventado» es el no).
- **Error típico:** tratar el arco como barra de carga. Ver 3.4: la órbita **recorre**, no se llena.

### 3.3 Esfera — el punto que cierra

La esfera tiene muchos papeles y un solo significado: **lo decidido**. Por eso se cuida más que ningún otro elemento.

| Papel | Dónde | Fuente |
|---|---|---|
| **Punto final** de la respuesta o del titular display de marca propia | titulares, voz, «Hacer.» en la taza blanca, nombre en la firma y el carnet | lámina 1.1, 4.4, 4.5, 4.6 3/3 |
| **Punta del arco:** dónde vamos | toda órbita con acento, dato o avance | lámina 1.2 |
| **Estado ocupado / decidido** | salas, plan de Insights, credencial de staff | láminas 4.3 2/3, 4.6 3/3, 7.2 |
| **Lámpara del foco** | «Te hacemos visible» | lámina 1.4 |
| **Planeta** del isotipo | la animación reveal: la esfera se vuelve el planeta | Lab 4.4.2; norma, regla 6 |
| **Divisor acostado:** la línea que termina en la esfera | firma de correo, pie de la hoja membretada | lámina 4.5, 4.7 2/3; manual §10.2 |
| **Botón, sello, cuenta, imán** | lapicero, gorra y polo; sello del sobre («cerrado = respondido»); llavero; imán de pizarra que avanza | láminas 4.6, 4.7, 5.1 |
| **Último punto de una figura** | la mirada termina donde está la respuesta | lámina 7.1 |

- **Cuándo:** donde algo se decidió, se respondió o está ocupado. Si nada se decidió, no hay esfera.
- **Cómo, como punto final:** es **parte del texto**, no un adorno al lado (operador, 2026-09-26; manual §1.2). Se apoya
  en la línea base, sin superar la altura de x, a 0,20 em de la palabra dominante, con el espaciado óptico de la última
  letra (lámina 1.1). Bajo el mínimo legible **se omite**, no se agranda. Sola, con dos diámetros de aire. El texto de
  la respuesta no lleva un «.» tipeado además de la esfera: la esfera **es** el punto (compositor, modo
  `graphicVoice`: «sin punto final»).
- **Toda herramienta la incluye:** la guía derecha, las marcas de corte, la selección colaborativa y sus cursores, y el
  aire hasta la órbita miden la palabra **con** su esfera (lámina 2.3; contrato `answer-period-part-of-text`). **Un
  titular sin su esfera está incompleto; una selección que termina en la última letra está mal.**
- **Nunca la llevan:** la pregunta (lleva el anillo delante), el eyebrow, las etiquetas, el cuerpo de texto ni el
  eslogan (manual §1.2, §5). Tampoco el logo: «la esfera es de la palabra, no del logo» (lámina 5.4).
- **Nunca:** como viñeta; dos por pieza; otro color que el acento de la línea; con volumen, brillo o sombra; deformada o
  agrandada; repetida como patrón; reemplazando letras («Hac●r»); suelta, fuera de la punta del arco; el teal usado en
  textos o fondos (láminas 1.1, 5.6).
- **La excepción que confirma la regla:** en la firma de correo conviven el punto del nombre (la única voz de titular)
  y la línea que termina en la esfera; lo que **no** se repite es la línea con esfera. La regla de la zona de partners
  va sin esfera, porque «si la esfera se repite, deja de ser identidad» (manual §10.2).

**Anillo propio de la esfera (`sphereRing`) — «en vivo»** (operador, 2026-09-26, D8):

- **Significa:** que algo está ocurriendo ahora. Es el eco del pulso de impacto cuando la esfera llega en movimiento y
  el estado activo, «en el aire» (cabina al aire, sala en sesión, «¿Cómo va? En vivo»).
- **Cuándo:** sólo con la intención declarada: el intent de `orbit` lleva `live: true`. Sin eso, el contrato rechaza
  `sphereRing: true` (`sphere-ring-only-live`).
- **Nunca:** como adorno para «dar más marca» a la esfera, en un dato (`measure`), en la esfera que cierra un texto ni
  en una pieza que no está en vivo.

### 3.4 Estela — el rastro del recorrido

- **Significa:** que la esfera viene de algún lado. Es lo que distingue **recorrer** de **llenar**.
- **Cómo:** en un dato, la esfera parte a las 12 (una marca en el anillo señala la partida), viaja en sentido horario
  valor × 360° y lleva detrás una estela corta del acento, **nunca antes de la partida**. 60 % es siempre la esfera a
  216°, en cualquier pieza. 0 %: la esfera en la partida, sin estela. 100 %: la esfera vuelve a las 12 tras la vuelta
  completa (Lab 1.2.1; token `trajectory.measure`).
- **Criterio del operador (2026-09-26):** la órbita que **recorre** es la que mejor funciona. Un dato no es un loader:
  es la posición de la esfera con una estela corta. **Al 100 % la esfera se queda**: perderla es un error, porque el
  dato completo sigue siendo una decisión, no un anillo vacío.
- **Con qué:** la cifra entera impresa («60 %») y su fuente. Dos datos en una pieza: mismo radio, misma partida.
- **Nunca:** un arco que crece desde el origen hasta volverse anillo; una estela más larga que lo recorrido; un dato sin
  fuente (la esfera no se mueve sin dato real).

### 3.5 Halo — la luz

- **Significa:** el foco sobre lo importante. «El halo ilumina. Lo justo» (Lab 0.1).
- **Cuándo:** en la forma «con halo»: portadas y cierres sobre oscuro (Lab 1.2, formas). En movimiento sube al final,
  cuando la esfera ya asentó (4.4).
- **Cómo:** degradé radial suave que se apaga hacia el borde y toma el color del acento de la línea (manual §2). Pleno
  sobre oscuro; **sobre papel, a media intensidad** (operador, 2026-09-26, D7: token `orbit.haloOnLightScale: 0.5`; el
  resolver del contrato 0.3.1 multiplica la opacidad de cada parada por ese factor en superficie clara y el render del
  motion lee el mismo token; el manual lo fija en navy al 6 %, frente al 13 % del oscuro, §2) o se omite: en impresión,
  los degradados bajo 5 % hacen bandas en offset (lámina 5.1). *Con el contrato 0.3.0 (el que tiene Greenhouse hoy) el
  halo sale igual en ambas superficies: hasta adoptar la 0.3.1, redúcelo a mano con el token.*
- **Nunca en:** la forma **plana** (sobre fotos, en papel y en tamaños chicos, Lab 1.2), el dato y el avance (el
  resolver no les pone halo), la cerámica, el vinilo y la pizarra (lámina 5.1). Nunca brillo, reflejo ni esfera de
  vidrio.
- **Error típico:** usar el halo como «glow» para dar volumen. El halo no es un efecto: es la luz del foco, y sólo
  existe donde hay algo que iluminar.

### 3.6 Órbitas interiores

- **Significan:** profundidad de un sistema vacío: la anatomía, el portafolio.
- **Cuándo:** **sólo en una órbita vacía que las necesita** (el diagrama de anatomía, el mapa de portafolio). Máximo
  dos (manual §1.3; Lab 1.2).
- **Regla del operador (2026-09-26):** **un solo anillo alrededor del contenido.** Cuando la órbita rodea algo —una
  palabra, el logo, un objeto, una lente, un texto—, queda el anillo que recorre, con su arco y su esfera, y el objeto
  adentro. El cierre de marca, el deck y la lente llevan un solo anillo. El contrato lo rechaza
  (`inner-orbits-never-around-content`).
- **Error típico:** órbitas interiores alrededor de una palabra «para darle más marca». Compiten con la palabra y
  convierten la órbita en diana.

### 3.7 Satélites

- **Significan:** lo que orbita a Efeonce: los productos y Greenhouse en el portafolio, o los canales donde medimos.
- **Cómo:** discos pequeños con el ícono del canal o del producto sobre la órbita exterior, con el arco largo en degradé
  y **sin esfera** (lámina 1.2). Un ícono de la iconografía en un satélite va siempre en **reposo** (§3.14). En el mapa de portafolio, el arco y el centro son de Efeonce; Globe, Wave, Reach y
  Greenhouse orbitan con su isotipo: **son contexto, no firma** (lámina 3.2; Lab 3.2).
- **Nunca:** logos de terceros presentados como alianzas. «Los satélites de canales muestran dónde medimos, no con quién
  nos asociamos» (lámina 0.2, «No hacer»). Las alianzas reales sólo se declaran en la zona de partners de la firma de
  correo, con el registro de partnerships (manual §10.2).

### 3.8 Lente — la foto como sujeto de atención

- **Significa:** mirar de cerca, decidir. «La esfera muestra lo que importa: donde está la decisión» (lámina 1.3).
- **Por qué funciona:** contraste de tratamiento, monocromo contra color: el ojo va directo al círculo. Tiene
  significado (enfocar, decidir, mirar de cerca) y encaja con el oficio a la vista. Funciona con cualquier foto del
  lenguaje fotográfico, sin producir imágenes nuevas (lámina 1.3, «Por qué tiene punch»).
- **Cuándo:** una foto con un punto de interés claro que quepa en el círculo con aire. Si la foto es débil, se nota el
  truco: cambia la foto o no uses lente (lámina 1.3, «Riesgo»).
- **Cómo:** la foto entera en navy apagado; dentro del círculo, a todo color y ampliada; alrededor, **la misma órbita
  de siempre**: anillo con su aire, arco corto y la esfera en su punta, arriba a la izquierda, **lejos de la cara**
  (manual §1.5; lámina 4.2).
- **Con qué:** la voz (pregunta y respuesta) al costado del anillo, nunca cruzándolo; la firma de Efeonce abajo.
- **Nunca:** un disco suelto en vez de la órbita (se corrigió el 2026-09-26: la esfera suelta era seis veces más grande
  y sin arco); velo navy sobre fotos de banco; emblema legible en la ropa («el logo lo pone la pieza, no la ropa»,
  lámina 5.2); la órbita sobre la cara o el gesto (lámina 4.1).

### 3.9 Foco — «Te hacemos visible»

- **Significa:** la lente leída como foco de escenario. La esfera, en la punta de su arco, es la lámpara; el círculo, su
  luz; lo que queda dentro, el cliente. Es la promesa más clara del marketing dicha con la forma de la marca (lámina
  1.4).
- **Siempre con su prueba:** «Te hacemos visible.» va con «Y lo medimos.» y con el mecanismo al lado (visibilidad en
  buscadores y respuestas de IA, alcance medido). Es anti-humo: calza sobre todo con Engine (Wave) y Voice (Reach)
  (lámina 1.4, «Cuidar»; `05`: «promesas sin mecanismo» es un no).
- **Cómo:** penumbra navy y **una sola luz** por pieza; el foco **siempre lleva su anillo**, concéntrico con la luz,
  con la lámpara arriba a la derecha (operador, 2026-09-26). En espacio, un foco real proyecta el círculo en recepción,
  stand o escenario. En movimiento, el foco barre la escena y se posa sobre el cliente.
- **Lo propio:** el foco de escenario es un recurso conocido; lo que lo hace Efeonce es la esfera en la punta del arco,
  la penumbra navy y una sola luz (lámina 1.4).
- **Nunca:** un foco sin anillo; dos luces; nombres reales de competidores en el campo en penumbra; pauta sin la
  revisión legal del claim (regla reafirmada por el operador el 2026-09-26, D15; manual §1.4).

### 3.10 Marca de estado

- **Significa:** la gramática de la voz llevada a la arquitectura: «El estado se dice con la forma» (lámina 4.3 2/3).
  Anillo = libre o abierto; esfera = ocupado o decidido.
- **Cómo:** acompaña al texto del estado, **no lo reemplaza** (lámina 7.2); el contrato exige etiqueta. Si hay arco, mide
  tiempo real (estado de sala); sin dato, no hay arco.
- **Extensiones validadas:** credencial de evento, el rol por la forma (anillo = asistente, órbita = speaker, esfera =
  staff; lámina 4.6 3/3); cabina de llamadas «anillo libre, esfera en el aire»; sobre «cerrado = respondido».
- **En vivo:** el estado activo, «en el aire», es el único estado que puede sumar el anillo propio de la esfera
  (`sphereRing` con `live: true`; ver 3.3). Ocupado no es lo mismo que en vivo: una sala reservada lleva la esfera sola.
- **Nunca:** como semáforo de colores (verde/rojo); sin etiqueta.

### 3.11 Cierre de marca

- **Significa:** la pieza termina; aparece quién la firma.
- **Cuándo:** final de video, última lámina, contraportada, pantalla de recepción en loop, sin sonido (láminas 4.1, 4.3
  1/3, 7.2). No va en impresos (contrato).
- **Cómo:** el anillo aparece, el arco crece, la esfera llega y asienta, sube el halo y, al final, la firma (lámina 4.1;
  ver 9). La animación de la órbita **sin logo** sirve para piezas que ya tienen su firma o su texto (Lab 4.4.2).
- **El logo dentro de la órbita** (operador, 2026-09-26, D5): **sólo** en tres cierres de marca —el cierre del deck
  (`deckSlideHtml('close')`), el cierre de video y el muro de recepción—, con el resguardo X del logo respetado: el
  anillo queda fuera de ese resguardo. En cualquier otro cierre el logo va **fuera** de la órbita, como la contraportada
  de Insights (lámina 7.2).
- **Delta (operador, 2026-09-27):** en brochure y propuesta comercial, el cierre clásico del deck (logo de 220 px dentro
  de la órbita) quedó retirado como contraportada: el logo de Efeonce de portada y contraportada va a 500 px en 1920.
  Y la **portada de propuesta** lleva dentro de su órbita gigante el **logo del cliente** (caja fija), no el de
  Efeonce: D5 sigue hablando del logo de Efeonce. Detalle: `EFEONCE_SURFACE_COMPOSITION_V1.md` §4.6.

### 3.12 Mapa de familia

- **Significa:** Efeonce en el centro; todo lo demás orbita (lámina 3.2).
- **Cómo:** la única órbita que admite órbitas interiores y satélites a la vez; el arco y el centro son de Efeonce; los
  productos y Greenhouse van como satélites con su isotipo. Es el único lugar de la línea donde aparece la marca de
  Greenhouse (G verde), y como contexto.

### 3.13 Todas las formas del canvas son legítimas

Decisión del operador (2026-09-26): todas las formas que el canvas exploró siguen disponibles y no se descartan
(Lab 1.2, formas):

| Forma | Para qué |
|---|---|
| **Con halo** | portadas y cierres sobre oscuro |
| **Plana**, sin halo | sobre fotos, en papel y en tamaños chicos |
| **Con órbitas interiores** | sólo una órbita vacía: anatomía, portafolio |
| **Con satélites** | arco largo en degradé, sin esfera; el portafolio o los canales |
| **Un dato** | la esfera recorre hasta el valor con su estela corta |
| **Órbita sesgada** (D20) | sólo alrededor del objeto protagonista de Plastilina: su firma; nunca mide (§3.14) |
| **Lente**, **foco**, **marca de estado**, **cierre de marca**, **mapa de familia** | sus trabajos de 3.8 a 3.12 |

Elegir una forma es elegir un trabajo. Si ninguna calza con el trabajo de la pieza, la respuesta no es inventar una
sexta: es no usar órbita.

### 3.14 Íconos — dos voces, la esfera como estado

> **Canónica desde el 2026-09-26 (D16–D22).** La fuente de verdad es **AXIS**: valores en `efeonceGraphicLine.icons`
> (`@efeoncepro/axis-tokens` 0.3.6), geometría y reglas ejecutables en `@efeoncepro/axis-graphic-line/icons` (0.4.0),
> guía `axis-design-system/docs/agent-composition/iconography.md`, Lab `axis.efeonce.org/references/iconography/`. Aquí
> va sólo el criterio; el detalle y la historia, en [iconography.md](iconography.md).

- **Significa:** la esfera no es parte del dibujo: es un **estado**. En **reposo** el ícono es sólo su forma; en
  **respuesta** aparece una esfera en el acento de la línea de servicio **de la pieza** (D16). Conserva la gramática de
  la marca («la esfera responde») sin gastar la esfera en cada ícono.
- **Dos voces (D19, D22):** **Trazo** dice lo que se mide (Growth, Engine, Revenue: decks, informes, listas, firmas,
  navegación); **Plastilina** dice lo que se crea (Brand: piezas sociales, portadas, stickers, momentos del oficio).
  Voice todavía no tiene voz fija: se elige con criterio y se declara en la pieza. La voz sale de la línea
  (`iconVoiceForLine`), nunca del gusto. **Nunca se mezclan en un mismo grupo**; si conviven en una pieza, Plastilina
  manda en grande y el Trazo apoya en chico, en grupos separados.
- **Color (D18, D21):** fondo Efeonce `#001a33` en **todas** las líneas, tinta blanca sobre oscuro y navy sobre papel, y
  el acento **sólo en la esfera**. El acento es de la línea de la pieza, nunca del objeto («el pincel en naranja» es un
  error). Los valores salen de `resolveIcon`, nunca transcritos.
- **Cuándo responde (D17):** responde **uno solo** —el activo o protagonista— y sólo si la pieza no tiene otra esfera
  (la de una órbita, la que cierra la respuesta, un marcador de estado). Dentro de una órbita, en listas, tablas,
  contacto, navegación y satélites: reposo. El Trazo responde desde 20 px; Plastilina no baja de 32 px (más chico, el
  Trazo).
- **Órbita sesgada (D20):** la firma de Plastilina. Una elipse inclinada −16° alrededor del objeto protagonista, que
  pasa por detrás arriba y por delante abajo; el objeto va en **reposo** y la esfera la pone la órbita. Una por pieza,
  nunca cruza el texto y **nunca mide**: lo que mide, enfoca o cierra la marca sigue siendo la órbita circular.
- **Cómo:** glifo de `ICON_CATALOG` (79: 36 de Trazo, 43 de Plastilina, desde D26) → `resolveIcon` → `auditIconGroup(items,
  { pieceHasSphere })` antes de entregar; Plastilina protagonista con `skewedOrbitHeroSvg`.
- **Un glifo que no existe no se dibuja dentro de la pieza:** se da de alta en AXIS (`pnpm icons:check`; Plastilina,
  antes `pnpm icons:vectorize`) y lo aprueba el operador. El control mide el peso, no el carácter: que se lea como
  familia lo decide un ojo humano ([lessons.md](lessons.md)).
- **Errores típicos:** todos los íconos de una fila respondiendo (la esfera se vuelve viñeta, como en §3.3) · Trazo y
  Plastilina en un mismo grupo · un acento por objeto · volumen, brillo, sombra o degradé inventados en el plano (el
  único volumen es el del set aprobado, abajo) · la órbita sesgada midiendo o cruzando el texto · un glifo dibujado a
  mano en la pieza.
- **Plastilina en volumen (D24, 2026-09-27):** la **tercera capa** (Trazo · Plastilina plana · Plastilina en volumen):
  el mismo glifo en arcilla mate inflada, derivado de su vector aprobado.
  - **Significa:** el objeto como **protagonista** con cuerpo, la presencia física del oficio. Por eso es uno por pieza
    y sólo donde el objeto es la pieza: portada, key visual, social de un objeto, escenario, merch, el objeto en
    escena.
  - **Complementa, no reemplaza:** el plano sigue siendo el ícono de todos los días; el volumen es el momento. Donde el
    ícono organiza información (listas, tablas, navegación, contenido de deck, dashboards, UI) va el plano o el Trazo.
    Nunca en un grupo con el plano o con el Trazo; bajo 160 px, el plano.
  - **Sale del vector, nunca al revés:** un objeto que no existe en el set plano no se genera en 3D. Primero entra al
    set plano con su aprobación; recién después, su volumen. Así el volumen hereda silueta, calados, esfera y gesto, y
    la familia se sostiene.
  - **«Clay» vs Plastilina:** «clay» es como el diseño suele llamar al estilo 3D de arcilla (claymorphism). Cuando el
    operador dice «los clay» se refiere a Plastilina; el nombre canónico es **Plastilina** (en inglés, «Plasticine»), y
    el volumen es una capa suya, no una voz nueva. Las librerías «Clay 3D» del equipo en OneDrive son otra cosa
    (ilustración genérica para propuestas) y no se mezclan con Plastilina en una pieza.
  - **Errores típicos:** generarlo de nuevo dentro de una pieza en vez de usar el PNG aprobado · dos objetos en volumen
    en la misma pieza · el volumen como viñeta o en una fila de servicios · un objeto nuevo inventado directo en 3D ·
    extruir el vector (sale plano, una «galleta»: rechazado por el operador).
- **Descartado:** la dirección «órbita abierta» (cada contorno con un corte): compite con la órbita del isotipo en vez
  de acompañarla (D16).
- **Todavía no:** las firmas de correo y de equipo siguen con íconos Tabler hasta que el operador decida; el motion de
  los íconos no está definido.

---

## 4. Las voces: pregunta y respuesta

**«Siempre hay dos voces»** (lámina 2.1). La pregunta abre con el anillo: es la voz de quien trabaja con nosotros. La
respuesta cierra con la esfera: la decisión. La evidencia, cuando existe, va debajo.

| Voz | Forma | Criterio |
|---|---|---|
| **Pregunta** | Poppins Light 300, con el anillo pequeño delante | una pregunta **real** del cliente, no retórica; una pregunta abierta **es** el anillo |
| **Respuesta** | Bricolage 760, de una a tres palabras, cierra con la esfera | es el dominante: mide **al menos 3×** la pregunta; la respuesta está decidida, por eso lleva la esfera |
| **Evidencia** | Poppins, una palabra en negrita | dato, fuente o mecanismo; puede faltar |

**Por qué este par expresa la marca.** La personalidad de Efeonce es «obsesión por la prueba» y «honestidad incómoda»
(`05`); el formato pregunta-respuesta obliga a contestar lo que el cliente de verdad pregunta, con una respuesta corta
que se hace cargo, y deja lugar a la prueba debajo. «Pregunta chica, respuesta grande» (lámina 5.6) pone el peso en la
decisión, no en la duda. Es la misma gramática del anillo y la esfera, dicha en palabras.

**Tono** (lámina 2.1, «Cuidar»; `05`):

- Preguntas que el cliente hace de verdad; nunca chistes ni frases motivacionales.
- Tuteo neutro; sin voseo ni modismos.
- Nunca dos preguntas ni dos respuestas seguidas.
- La respuesta no promete resultados que no podemos probar. Toda afirmación de impacto se puede rastrear a un dato o un
  caso (`05`, *non-negotiable*).

**Sí / no** (lámina 5.6): pregunta chica, respuesta grande de una a tres palabras · **no:** pregunta grande, respuesta
larga y chica. Bricolage para decir, Poppins para explicar · **no:** Bricolage en párrafos ni monoespaciada.

**Banco de pares (candidatos, sin aprobar;** lámina 2.1**; el operador lo revisa y aprobará 2 pares por línea con
respuestas verificables, D12):** ¿Lo medimos? Siempre · ¿Quién decide? Tú, con evidencia ·
¿Y si después lo hago yo? Esa es la idea · ¿Y el reporte del viernes? Ya lo viste · ¿Cuánto rindió? Te mostramos todo ·
¿Cómo va? En vivo · ¿Dónde quedó lo aprendido? En tu historial · ¿Otra agencia más? No. Un sistema · ¿Y si lo probamos?
Hoy. Úsalos como calibración del tono, no como copy aprobado. Verbos de la línea: Hacer, Medir, Crear, Aparecer,
Llegar, Siempre, Adelante, Gracias, Aquí (manual §4).

**Pares aprobados en portadas (operador, 2026-09-27;** canvas por superficie, página Deck; norma
`EFEONCE_SURFACE_COMPOSITION_V1.md` §4.6**).** Una portada de brochure por línea de servicio, con el acento de la
línea en el anillo y la esfera; estos cinco salen de «candidatos» (los dos primeros venían del banco de arriba):

| Línea | Par |
|---|---|
| Growth | ¿Lo medimos? **Siempre.** |
| Brand | ¿Quién crea mi contenido? **Tu squad.** |
| Engine | ¿Te encuentra la IA? **Visible.** |
| Voice | ¿Dónde invierto? **Donde rinde.** |
| Revenue (HubSpot) | ¿Y el reporte del viernes? **Ya lo viste.** |

Además, dentro de piezas aprobadas ese día: la portada de propuesta comercial («¿Cómo crecemos en 2027? **Con
foco.**», evidencia «Preparada para **[Cliente]** · Confidencial»; el nombre del cliente nunca como título), la
contraportada de brochure («¿Conversamos? **Cuando quieras.**») y la lámina que abre la sección del equipo («¿Quién
hace crecer tu marca? **Este equipo.**»). La portada general de brochure y la lámina que abre la sección de servicios
usan «¿Qué hace Efeonce? **Crecer.**». Cómo se escribe una portada: eyebrow · pregunta · respuesta de 1–3 palabras
(≥ 3× la pregunta) · evidencia con una palabra en negrita; nunca un título suelto tipo «Servicios 2026». Si la
pregunta o la evidencia cruzarían la órbita o al sujeto de la foto, **se acorta la frase** («¿Qué hacemos por tu
marca?» → «¿Qué hace Efeonce?»; «¿Dónde pongo el presupuesto?» → «¿Dónde invierto?») o se parte la evidencia en 2–3
líneas.

**Pares aprobados en las láminas del deck (operador, 2026-09-27;** catálogo
`docs/operations/brand-graphic-line/deck-recipes/`**).** Las 69 láminas quedaron aprobadas con su voz; estos pares son
copy aprobado dentro de su lámina (textos exactos del JSON; la respuesta se escribe sin punto porque el punto es la
esfera):

| Lámina (receta) | Par |
|---|---|
| Sección partida, esquina abajo (`section-split-corner-bottom`) | ¿Cuánto tarda tu campaña? **En días.** |
| Sección partida, panel a la derecha (`section-split-panel-end`) | ¿Qué responde la IA? **Tu marca.** |
| Secciones con lente, clásica, a sangre y partida | ¿Quién decide el corte? **El dato.** |
| Quiénes somos (`section-cine-about`) | ¿Quiénes somos? **Un solo equipo.** |
| Por qué lo hacemos (`section-cine-purpose`) | ¿Por qué lo hacemos así? **Contigo.** |
| Tríptico (`triptych`) | ¿Cómo trabajamos? **Escucha. Crea. Mide.** (una palabra por toma, cada una con su esfera) |
| Cotización, tabla y escena (`content-pricing`, `content-pricing-stage`) | ¿Cómo se cotiza? **Por capacidad.** |
| Cotización en vivo (`content-pricing-live`) | ¿Cuánto cuesta? **Sin letra chica.** |
| Próximos pasos (`decision-next-steps`) | ¿Y ahora qué sigue? **Empecemos.** |
| Día a día (`content-day`, `content-day-tools`) | ¿Cómo es un día con nosotros? **Así.** · ¿Cómo trabajamos contigo? **Así.** |
| Vívelo (`content-day-live-progress`, `content-day-live-results`) | ¿Cómo avanza tu proyecto? **A la vista.** · ¿Cómo va? **En vivo.** |
| Método y prueba | ¿Te recomienda la IA? **Capa por capa.** · ¿Cómo te ve la IA? **Mídelo.** · ¿Quién hace el trabajo? **Personas y agentes.** · ¿Qué pasa al empezar? **Movimiento.** · ¿Y si no funciona? **Empiezas chico.** · ¿Quién confía en nosotros? **Marcas líderes.** · ¿Con quién construimos? **Con los grandes.** · ¿Por qué Efeonce? **Por esto.** |
| Propuestas por línea | ¿Cómo escalas tu contenido? **Con sistema.** (y los de `proposal-cinematic`, arriba) |

La lista completa, con el eyebrow y la evidencia de cada lámina, está en el JSON. Un par aprobado **en su lámina** no
queda libre para cualquier pieza: fuera de ella vuelve a ser candidato del banco.

**Cómo se cruza con las tres voces + acción de publicidad.** El compositor de anuncios materializa esta voz con
`graphicVoice: "efeonce"`: pregunta en Poppins Light con su anillo, respuesta en Bricolage 760 de hasta tres palabras
con la esfera al final de la última línea, la regla de ≥3× y la selección que incluye la esfera (compositor de CTA,
§«Voz de la línea gráfica sobre fotografía», opt-in del 2026-09-26). La correspondencia con el concepto de Tres voces es
**inferida**: la pregunta ocupa el papel de la **entrada**, la respuesta el del **titular dominante** (la misma regla
de 3× que mide `ratioDominanteEntrada`) y la evidencia el del **remate**. El grupo de acción (beneficio, CTA,
descriptor) sigue igual, en Poppins y sin esfera; una caja de énfasis sobre la respuesta no pide otra sobre el CTA. Un
solo cursor local se vincula al CTA; el colaborador sólo cuando un argumento lo justifica (Tres voces, «Cursores con
significado»).

---

## 5. El eslogan y las líneas de servicio

**«El acento cierra, también en el eslogan»** (lámina 2.2). La palabra final del eslogan hace el mismo papel que la
esfera: el acento va al cierre.

- **Dos formas oficiales:** el bloque con el logo (centrado debajo) y el eslogan solo, con la palabra final destacada.
  Se usa desde el archivo oficial; no se rearma (lámina 2.2).
- **Sólo cierra:** final de video, última lámina, contratapa, firma de correo, recepción, merch. **No va en cada post**:
  ahí la respuesta con esfera ya cierra (lámina 2.2).
- **El eslogan acompaña al logo; no es texto suelto** (operador, 2026-09-28, contraportada de Marketing con Manzanitas:
  «El eslogan separado del logo no tiene sentido; el eslogan no es simple texto, es un elemento de marca que acompaña
  al logo»). En una pieza social se usa en su forma de bloque con el logo de Efeonce (`slogan.forms: 'lockup'`), en la
  firma; nunca como una línea más de la columna de texto, entre la voz y la firma.
  **El bloque es logo arriba y eslogan DEBAJO, más chico** (operador, 2026-09-28: «eslogan debajo del logo de Efeonce y
  más pequeño, no puede estar al mismo tamaño»): el eslogan mide el **64 % del ancho del logo**
  (`efeonceGraphicLine.motion.layout.sloganOfLogo`) y va separado **1,35 veces su fuente** (`sloganGapOfFont`). Nunca al
  ancho del logo ni encima de él: `axisAdvertising.compositions.supportingTagline` (escalar al ancho del lockup) es de
  la publicidad, no del eslogan de Efeonce. Como el componente `Slogan` pinta la palabra siempre en el acento, el bloque
  se dimensiona para que el eslogan mida **24 px o más** (en 1080 de ancho, logo de 400 px); más chico, la palabra iría
  en blanco y el componente no lo hace solo.
- **Nunca en la portada; en la contraportada depende del documento** (operador, 2026-09-27). En la portada recarga,
  repite la respuesta y ocupa la esquina inferior derecha, que es del sujeto o la órbita. En la contraportada de una
  **propuesta comercial** es el mensaje principal: «Empower your Growth» grande y protagonista (72 px en 1920, en sus
  pesos oficiales, «Growth» en el acento), sin «¿Conversamos?», porque la propuesta llega después de conversar. En la
  de un **brochure** el mensaje es «¿Conversamos? Cuando quieras.» y el eslogan firma debajo, porque el brochure abre la
  conversación. Norma: `EFEONCE_SURFACE_COMPOSITION_V1.md` §4.6.
- **La palabra es de la línea de servicio, no del producto** (operador, 2026-09-26): Growth (Efeonce; su producto
  Greenhouse, la plataforma que controla todo), Brand (servicios creativos; Globe), Engine (web, infraestructura, SEO y
  medición; Wave), Voice (medios y distribución; Reach), **Revenue** (RevOps y CRM). La palabra toma el acento de la
  línea **cuando el eslogan mide 24 px o más**; más chico, la palabra va en navy sobre claro o blanco sobre oscuro (regla
  del acento, sección 8; así lo hace ya la firma de correo, con el eslogan a 12 px). *Deriva: el manual §7 aún dice
  «palabra por decidir» para RevOps; los tokens (`lines[].sloganWord`) y el ledger ya fijan Revenue.*
- **RevOps tiene dos acentos:** no tiene plataforma propia y toma el acento de la plataforma en que se opera, HubSpot o
  Salesforce, **en tonos propios de Efeonce, nunca los colores de la marca del partner** (tokens `lines`; Lab 3.1). El
  magenta de HubSpot quedó aprobado tal cual (operador, 2026-09-26, D2); el naranja de HubSpot no se usa: choca con
  Globe y Reach, y es el color del partner.
- **«Empower your» en gris medido:** sobre claro, un gris que alcanza 5,0:1 (el `#848484` anterior daba 3,5:1 y no
  pasaba; operador, 2026-09-26); sobre oscuro, gris claro (token `slogan.leadColor`). *`05_voz-tono-estilo.md` todavía
  nombra el gris `#848484`: manda el token.*
- **Pesos del SSOT** (`src/config/efeonce-brand.ts`): *Empower* ExtraBold itálica, *your* ExtraBold, palabra final Black
  itálica. No cambian por línea.
- **Nunca:** en mayúsculas, con esfera, traducido, con otros pesos o cursivas (láminas 2.2, 5.6; token `slogan`).
- **Cierre del deck:** la palabra final va **en el acento de la línea**, no en blanco (operador, 2026-09-26, D3; 8,5:1
  sobre `#001a33` en Growth). `deckSlideHtml('close')` la pinta así desde axis-graphic-line 0.3.2.

---

## 6. La firma y la burbuja URL

**El razonamiento:** Efeonce es la única marca que se construye activamente (`09`, arquitectura de marca). Por eso
**Efeonce firma todo**, de cualquier línea de servicio; los productos (Globe, Wave, Reach, Greenhouse) aparecen como
**contexto** —su nombre, su interfaz en un mockup, su isotipo pequeño dentro de su propia superficie— y nunca firman
(operador, 2026-09-26; manual §7). *Esto reemplaza lo que decía la lámina 3.1 («la firma: el logo propio de cada
producto, con «by efeonce»»): el lockup «by efeonce» vive sólo en la superficie del propio producto.*

- **Insights, marca de producto que acompaña** (operador, 2026-09-28): en sus propias superficies (el informe compartido,
  el portal) va **junto al logo de Efeonce**, separados por un filete fino y con las alturas de x alineadas; no lleva
  «by efeonce» porque Efeonce ya está al lado, y **nunca firma**: la firma sigue siendo el logo de Efeonce en el pie. Su
  esfera es parte del logo (como el planeta de Efeonce), no la esfera de la línea; si la pieza ya tiene una órbita con
  esfera en el mismo acento y compiten, se revisa a ojo. Archivos: `insights-logo-*` / `insights-isotype-*`.
- **Junto a Efeonce, Insights baja su brillo** (operador, 2026-09-28): dos marcas a tinta plena compiten. Baja la que
  ya pesa menos (Insights), así peso y brillo apuntan a la misma jerarquía; la palabra y el anillo van en gris de marca y
  sólo la esfera queda en el acento, como el eslogan. Se usa el archivo `insights-lockup-*`; **nunca** se arma el
  lockup a mano con los dos logos.

- **La firma de una pieza gráfica es el logo de Efeonce centrado, abajo al centro.** Cierra la composición al pie
  (manual §8.1; Tres voces, «la firma debe cerrar la composición al pie»).
- **La burbuja URL sólo reemplaza al logo si el logo ya aparece en la imagen** (un mockup, un objeto, merch). Entonces
  va centrada, sola, con fusión de luminosidad. **Nunca las dos**, y nunca la burbuja a un costado ni junto al logo:
  repetiría la marca (manual §8.5).
- **Por qué casi nunca alcanza:** la fusión fija la luminosidad del gris, así que la burbuja sólo llega a 4,5:1 (el
  umbral decidido el 2026-09-26, D4: token `urlBubble.minContrast`) sobre un lecho muy oscuro. Si no pasa, se cambia el lecho o la foto, no la burbuja (manual §8.5). Esa es la razón de que sea la
  excepción y no la regla.
- **Nunca la URL como texto.** Donde aparezca `efeoncepro.com` va la burbuja oficial (ADR, regla dura). En pies (deck,
  informe, papelería, stand, firma de correo) la burbuja sigue como pie, fusionada u horneada: eso no es firma.
- **El logo es un archivo cerrado:** se cambia dónde y sobre qué se pone, nunca el logo. «Si ninguna versión funciona,
  cambia el fondo o la foto, no el logo» (lámina 5.4). Logo e isotipo nunca en la misma vista (lámina 3.3).
- **Logo dentro de un titular:** sí, con reglas, sólo en display grande, alineado a la línea base y la altura de x, una
  vez por pieza y sin repetirlo como firma en la misma vista (manual §8.2).
- **Objetos:** frente, la palabra con su punto; dorso, el logo solo, chico y abajo, sin órbita ni texto. La órbita
  alrededor del logo quedó descartada (lámina 4.4). **Sí:** frente palabra · dorso logo solo. **No:** logo y órbita
  juntos al frente (lámina 5.6).
- **Logo dentro de la órbita, decidido** (operador, 2026-09-26, D5): sólo en los cierres de marca —cierre del deck,
  cierre de video y muro de recepción (lámina 4.3 1/3)—, con el resguardo X respetado. **Nunca** en el banner de
  LinkedIn (4.1) ni en el reverso de la tarjeta de presentación (4.6 3/3): ahí el logo va solo, como el dorso de un
  objeto. En todo lo demás rige la 5.4 y el manual §8.3 n.º 8: la órbita nunca rodea el logo.
- **Firma de correo:** la línea que termina en la esfera aparece **una vez** y separa a la persona de la marca; la regla
  que abre la zona de partners va **sin esfera**. Sin esa regla, «Partner oficial de» se leía como bajada del logo de
  Efeonce (manual §10.2).

---

## 7. Composición y espacio

- **La órbita fuera de eje, el texto abajo a la izquierda.** Centro de la órbita hacia la derecha y arriba; el texto en
  el tercio inferior izquierdo y **nunca cruza la órbita** (lámina 5.1). Mismo gesto en objetos grandes: la órbita a la
  derecha del telón del stand, bajo el mouse en la alfombra, a la derecha del fondo de pantalla para dejar libre la
  cámara (láminas 4.3 3/3, 4.6, 4.7 3/3).
- **Aire alrededor del anillo:** el anillo rodea con aire, no ajusta. La órbita rodea la lente «con aire» (lámina 4.2);
  «anillo fino, arco y esfera, al costado del texto» es el sí (lámina 5.6).
- **Lejos de la cara:** en fotos la órbita no tapa la cara ni el gesto; la esfera de la lente va arriba a la izquierda,
  lejos de la cara (láminas 4.1, 4.2).
- **Jerarquía:** un solo dominante (la respuesta), una pregunta chica, la evidencia debajo, la firma al pie. La órbita
  acompaña; **no reemplaza la voz**: «el titular sigue cerrando con su punto» (láminas 4.1, 4.2).
- **Cuándo se centra:** cuando la órbita **es** la pieza o su cierre: el cierre de marca y la última lámina (la órbita
  completa con la esfera arriba), la firma al pie, el pecho de la polera, el paraguas visto desde arriba, el retrato de
  la firma de correo (láminas 4.2, 4.6 2/3, 4.7 3/3). En una pieza con texto y foto, nunca. *(la regla general
  «centrar cuando la órbita es la pieza» es inferida de esos casos)*
- **Márgenes y zonas:** respeta el margen del formato y, en 9:16, la zona que tapa la interfaz de cada red (lámina 5.1).
- **Densidad:** una órbita, una esfera, un acento, una luz, máximo dos herramientas del oficio (sección 2.2). La
  continuación de un documento baja el volumen, no lo repite.
- **La órbita no se mete debajo del texto:** nunca detrás del texto (láminas 4.7 2/3, 5.6). En la hoja membretada, la
  órbita recortada en la esquina y la carta en Poppins, sin tocarse.
- **Oficio a la vista:** guía, marcas de corte, selección, nota al margen (una por pieza, firmada) y cursores; las guías y
  marcas en azules; la selección y los cursores son los de AXIS tal como se resuelven, **nunca coordenadas
  decorativas** (lámina 2.3). Los cursores dicen quién actúa (local, multiplayer acting) y quién sólo está
  (multiplayer moving).

---

## 8. Color con criterio

- **Un acento por pieza.** La órbita, la esfera, el halo y la palabra final del eslogan van en el acento de la **línea de
  servicio**; el logo que firma sigue siendo el de Efeonce (manual §7). Nunca dos acentos en la misma órbita (lámina
  3.2).
- **El teal es sólo de Efeonce** y nunca aparece en una pieza de otra línea (lámina 3.1). Si los acentos de producto se
  usan en piezas de Efeonce está pendiente; la recomendación es que no (ADR, delta del 2026-09-26).
- **Papeles del color:** en oscuro, navy profundo de fondo, el acento en la gráfica y la luz del halo; en papel, navy
  para el texto y el acento oscuro para la gráfica (esfera, arco, anillo) y el texto grande. Las demás líneas usan una
  tinta oscura propia como fondo.
- **La regla del acento** (operador, 2026-09-26, D1; token `accentContrast`, chequeo `accent-text-min-size`): el acento
  mide **≥ 3:1 contra su fondo** en gráfico (arco, esfera, halo) y en texto de **24 px o más**. **Nunca va en texto de
  menos de 24 px**: ahí el texto es navy `#023c70` sobre claro o blanco sobre oscuro, y cumple 4,5:1. Por qué: el 3:1
  es el umbral de WCAG para gráfico y texto grande, y todos los acentos lo pasan (los más bajos: Engine sobre
  `#091951` 3,60, Voice sobre papel 3,53, Growth sobre papel 3,87); el texto chico necesita 4,5:1 y ahí varios acentos
  no llegan. **Engine y Voice conservan sus colores.**
- El teal claro como texto sobre blanco (2,1:1) es el no de la lámina 5.6. Mide el contraste sobre los píxeles finales,
  no sobre la paleta teórica: un color de marca no garantiza legibilidad (Tres voces).
- **Materiales:** los valores son sRGB; en papel, cerámica, vinilo y tela el color se fija con prueba física del
  proveedor, nunca sin prueba (lámina 5.1).
- **Nada de semáforo:** el estado se dice con la forma, no con el color (lámina 4.3 2/3).

---

## 9. Cómo se lee en movimiento

La gramática no cambia al moverse; se vuelve secuencia (lámina 4.1; Lab 4.4.1; guion de la lámina 4.4):

1. **El anillo aparece:** se abre el escenario, el recorrido.
2. **El arco crece:** el avance.
3. **La esfera llega y asienta,** con golpe: la decisión.
4. **Sube el halo:** el foco.
5. **Al final, la firma** (logo y eslogan en el cierre de 4,5 s).

El foco tiene su propia frase: entra, busca a quien importa, se posa y la lámpara llega (Lab 4.4.1).

Reglas de criterio (norma de movimiento): ritmo lento–rápido–lento con anticipación; **un protagonista a la vez**, nunca
dos; **llegar con golpe**, nunca deslizarse ni detenerse suave; la onda de acento sólo en un encaje, nunca como adorno;
la esfera es la protagonista (viaja en la punta, se vuelve el planeta). Con movimiento reducido, el cuadro final. Las
animaciones del logo nunca se generan con un modelo de video y son sólo de Efeonce, nunca de clientes ni de la interfaz
de Greenhouse. Detalle en [motion.md](motion.md).

*Inferido:* un dato animado sigue la regla de la trayectoria: la esfera viaja desde las 12 hasta su valor con la estela
detrás; nunca se anima como una barra que se llena.

---

## 10. Errores que delatan que no se entendió la línea

Cada uno tiene su fuente. Si ves uno en una pieza, no está terminada.

| Error | Por qué está mal | Fuente |
|---|---|---|
| La órbita se **llena como un loader** | un dato es la posición de la esfera con estela corta; la órbita recorre | operador 2026-09-26; Lab 1.2.1 |
| **La esfera desaparece al 100 %** | el dato completo sigue siendo una decisión; la esfera se queda | operador 2026-09-26; token `trajectory` |
| **Órbita ovalada** | la órbita es circular; el óvalo sólo existe en la animación del isotipo 3D y en la **órbita sesgada** de Plastilina (D20), que rodea un objeto y nunca mide | operador 2026-09-26 |
| **Disco suelto** en la lente | la lente lleva la misma órbita: anillo, arco corto y esfera en la punta | manual §1.5; lámina 1.3 |
| **Foco sin anillo** | el foco siempre lleva su anillo, concéntrico con la luz | operador 2026-09-26 |
| **Órbitas interiores alrededor de una palabra** | un solo anillo alrededor del contenido | operador 2026-09-26; `inner-orbits-never-around-content` |
| **Esfera en una pregunta**, eyebrow, etiqueta, cuerpo o eslogan | la pregunta lleva anillo; la esfera es la decisión | manual §1.2; lámina 5.6 |
| **Esfera como viñeta** o dos esferas por pieza | la esfera pierde identidad si se repite | lámina 5.6; manual §10.2 |
| **Selección o marca de corte que deja la esfera afuera** | la esfera es parte del texto | lámina 2.3; `answer-period-part-of-text` |
| **Arco decorativo sin dato**, o acento junto a un número | el arco afirma avance: sin dato real con fuente no hay arco | lámina 0.2; token `trajectory.accent` |
| **Texto cruzando la órbita**, o la órbita detrás del texto | ningún texto cruza la órbita | lámina 5.1; ADR |
| **Órbita sobre la cara**, el sujeto, la reserva, el lecho o la firma | la órbita no sustituye la composición fotográfica | operador 2026-09-26; `orbit-never-over-subject-or-reserves` |
| **Órbita por defecto** en toda pieza, o un **patrón** de órbitas | se declara a propósito; una por pieza, muro o vidrio | manual §1.3; lámina 4.3 2/3 |
| **Órbita alrededor del logo** fuera de un cierre de marca (p. ej. banner de LinkedIn, reverso de la tarjeta), o **esfera pegada al logo** | el logo va en la órbita sólo en el cierre del deck, el cierre de video y el muro de recepción; la esfera es de la palabra | operador 2026-09-26 (D5); lámina 5.4 |
| **Logo y órbita juntos al frente** de un objeto | frente la palabra, dorso el logo solo | láminas 4.4, 5.6 |
| **URL como texto**, o **burbuja junto al logo**, o **firma y burbuja a la vez** | la burbuja sólo reemplaza al logo cuando el logo ya está en la imagen | manual §8.5; ADR |
| **Producto que firma** la pieza (o «by efeonce» como firma) | Efeonce firma todo; el producto es contexto | operador 2026-09-26; manual §7 |
| **Dos acentos** en una pieza, o **teal en una pieza de otra línea** | una línea, un acento; el teal es de Efeonce | láminas 3.1, 3.2 |
| **Teal claro como texto sobre blanco** | 2,1:1, no alcanza | láminas 1.1, 5.6 |
| **El acento en texto de menos de 24 px** (eyebrow, etiqueta, dato chico, palabra del eslogan chico) | el acento es para gráfico y texto grande (≥ 3:1); el texto chico va en navy o blanco | operador 2026-09-26 (D1); `accent-text-min-size` |
| **Anillo propio de la esfera** (`sphereRing`) en algo que no está en vivo | está reservado al eco del impacto y al estado «en el aire» | operador 2026-09-26 (D8); `sphere-ring-only-live` |
| **Eslogan en mayúsculas, con esfera, traducido o rearmado**, o en cada post | sólo el bloque oficial, sólo en cierres | láminas 2.2, 5.6 |
| **Pregunta grande y respuesta larga y chica**, dos preguntas seguidas, pregunta retórica o chiste | la respuesta domina; la pregunta es real | láminas 2.1, 5.6 |
| **«Te hacemos visible» sin «Y lo medimos.»** ni mecanismo | anti-humo: la visibilidad se mide | lámina 1.4 |
| **Logos de terceros como satélites-alianza** | los satélites muestran dónde medimos, no con quién | lámina 0.2 |
| **Estado en colores de semáforo**, o sin etiqueta | el estado se dice con la forma y acompaña al texto | láminas 4.3 2/3, 7.2 |
| **Discos rellenos, brillos, reflejos, esferas de vidrio**, halo como «glow» | línea fina y luz | lámina 0.2; manual §0 |
| **Velo navy sobre foto de banco**, emblema legible en la ropa | la foto es oficio real; el logo lo pone la pieza | láminas 5.2, 5.6 |
| **Valores transcritos** de una captura o un comentario | los números salen de los tokens | ADR, decisión 3 |
| **Dos protagonistas a la vez** en movimiento, llegada suave, onda de acento como adorno | lenguaje de movimiento | norma, reglas 1 y 2 |
| **Ícono dibujado a mano** en una pieza, o **Trazo y Plastilina en un mismo grupo** | el glifo sale de `ICON_CATALOG` con `resolveIcon`; uno nuevo pasa por `icons:check` y la aprobación; una voz por grupo | operador 2026-09-26 (D22); guía de iconografía de AXIS |
| **Todos los íconos respondiendo**, o un ícono respondiendo junto a otra esfera | responde uno solo y sólo si la pieza no tiene otra esfera | operador 2026-09-26 (D17); `auditIconGroup` |
| **Un acento por objeto** en los íconos («el pincel en naranja») | el acento es de la línea de la pieza y va sólo en la esfera | operador 2026-09-26 (D18) |
| **La línea aplicada a un cliente o a la interfaz de Greenhouse** | es marca propia de Efeonce | ADR, decisión 6 |

---

## Mantenimiento

Toda corrección del operador sobre qué significa un elemento, cuándo va o qué error delata entra aquí **en el momento**,
con fecha, el ejemplo y la razón (Skill Maintenance Contract de `SKILL.md`, punto 0). Las tensiones y derivas marcadas
en este archivo (palabra de RevOps en el manual, gris del eslogan en `05`) se resuelven con el operador; cuando se
resuelvan, se reescribe la entrada y se registra en [ledger.md](ledger.md). El halo en papel, el logo dentro de la
órbita, el contraste del acento, el magenta de HubSpot, el «Growth» del cierre del deck y el anillo propio de la esfera
quedaron decididos el 2026-09-26.
