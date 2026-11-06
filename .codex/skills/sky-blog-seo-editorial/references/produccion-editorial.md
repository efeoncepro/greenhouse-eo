# Producción editorial del Blog SKY (Playbook integrado)

> **Qué es.** Es el capítulo normativo de la skill `sky-blog-seo-editorial` para producir un artículo del Blog SKY (blog.skyairline.com), nuevo o reescrito. Integra el [Playbook Producción · Blog SKY](https://app.notion.com/p/06531fec27634eed98b73094ba05ce5e) (Notion, SKY Wiki SEO, última edición 04-11-2026).
>
> - **La página de Notion sigue siendo la versión que lee el equipo.** Este texto la reordena; no la reemplaza.
> - **Las normas enlazadas mandan sobre este texto y sobre el Playbook.** El Playbook define *cuándo y dónde* se aplica cada norma; el *qué* lo mandan sus páginas: la voz, el Brand Voice; las imágenes, la Spec de imágenes (y la elección de la secuencia, el Sistema de selección); su ejecución, la Skill de imágenes con IA; las rutas enlazables, Precios y Rutas SKY. Si algo de aquí las contradice, mandan ellas y se corrige este texto.
> - **Un cambio de norma se escribe el mismo día** en su página (la voz en el Brand Voice, la imagen en la Spec, el proceso en el Playbook) **y aquí**.
> - **Frontera.** Este capítulo es la norma *por artículo*. El orden de un *lote* (inventario → research → pauta y piloto → redacción → specs → handoff) vive en [lote-editorial.md](lote-editorial.md). La producción del píxel (prompt, maestro, medición de portada, exportación, banner compuesto) es de `sky-blog-graphic-line`; este capítulo fija la spec y las tareas.
> - Es agnóstico al destino y al artículo: donde dice `[Destino]` o `[Artículo]`, sustituye por los del ciclo en curso. Ejemplo vivo de todo lo que describe: [artículo de referencia](https://app.notion.com/p/325df068860b47a2b905edf73cee6887).

## Cuándo se usa

- Al producir cualquier artículo del Blog SKY, nuevo o reescrito.
- Cuando se pide «escribir el artículo de `[Destino]`», «pasar un artículo a la voz SKY», «especificar las imágenes» o cualquier fase suelta.
- Las fases son independientes, con **una sola excepción**: las imágenes y sus tareas de diseño no se definen antes de que exista el texto (Fases 6 y 8 dependen de la Fase 4). Una imagen pedida antes del artículo es un placeholder, no un brief.

Ciclo completo: encuadre → research verificado → ficha SEO → escritura en POV «El Viajero» → rutas → imágenes → anexos → tareas de diseño → QA de voz → estados y handoff a WordPress.

## 1. Las cinco decisiones no negociables

Son la identidad del blog; no se negocian pieza por pieza.

1. **POV «El Viajero».** La referencia de tono es un vlogger de viajes: se narra la experiencia, no se explica el destino desde arriba.
2. **Hipotético inmersivo.** Se narra lo que el lector *va a vivir* («imagina que…», «vas a bajar…»), nunca lo que el narrador vivió. Es lo que permite voz vivencial sin inventar experiencias.
3. **AEO primero.** TL;DR citable, H2 en forma de pregunta y FAQ. El artículo está escrito para que un motor de respuesta pueda extraerlo.
4. **Patrón sándwich.** El relato va en voz de viajero; los datos duros viven en fichas aparte. Nunca mezclados.
5. **Cero cifras sin respaldo.** Ningún precio, tarifa ni horario entra al cuerpo sin fuente oficial, moneda y fecha.

## 2. Fuentes de verdad

| Fuente | Qué decide |
| --- | --- |
| **Content Hub** (base del teamspace «Sky Ariline - SEO+AEO») | Fila del artículo: `Artículo`, `Tipo`, `Formato`, `Estado`, `Aprobación cliente`, `Responsable`, `Fecha de publicación`, `Enlace` y la relación `Tareas 1` con su tarea principal en Tareas SKY |
| [Brand Voice](https://app.notion.com/p/a7339c2fefe782b99e22013d9a5f0647) | POV, intensidad del «yo» según el tipo de artículo, estructura, recursos permitidos y límites; sección 5, tuteo sin voseo |
| [Spec de imágenes del blog](https://app.notion.com/p/cbf3b2942bf74f5784f4105881ed1f6d) | Cuántas imágenes, campos obligatorios, medidas, ALT y dirección fotográfica; fuente del estándar D y su referencia visual; tabla completa de casos de marcas y personas; registro de excepciones |
| [Sistema de selección de imágenes](https://app.notion.com/p/3f439c2fefe78004844fc55f417c3324) | Cómo elegir la secuencia de tres imágenes: tres preguntas, tipos A–H con modificadores, matriz por tipo de artículo, presencia humana y ficha de análisis |
| [Skill · Producción de imágenes con IA · Blog SKY](https://app.notion.com/p/5e4b2473c7914933a3e65531bb72c885) | Ejecución: verificar motor autorizado, preparar prompt, separar referencias de estilo y fidelidad, controlar artefactos, recortar, exportar y registrar trazabilidad; traduce cada tipo A–H a registro D o E |
| [Precios y Rutas SKY](https://app.notion.com/p/c6bcd3d717794691b706befbc25c4b74) | Única fuente para saber qué ruta se puede enlazar, con qué URL y en qué mercado |
| [Tareas del teamspace SKY](https://app.notion.com/p/3e439c2fefe780b7b74bd4b46ccc1b62) y su base Proyectos hermana | Donde viven las tareas de cada pieza gráfica, con su ficha ([plantilla de ficha](https://app.notion.com/p/3f139c2fefe780a88804e8fd69cf6232); [proyecto ejemplo](https://app.notion.com/p/197728e53de445b5ac455dd1f2b22bcf)) |
| **Sitios oficiales del destino** | Horarios, direcciones, tarifas y días de cierre. Fuente primaria de todo dato duro |
| **Frame.io** | Revisión visual por versión, antes de cargar a WordPress |
| **WordPress** | Destino final: ALT, peso, lazy y lectura móvil |

## 3. Ciclo por artículo

### Fase 1 · Encuadre

1. Abrir la fila en el Content Hub y leer `Tipo` y `Formato`: deciden la estructura y la intensidad del «yo». Si la fila no tiene valor, preguntar en lugar de asumir.
2. Consultar en el Brand Voice la intensidad del «yo» de ese tipo. Una guía de destino va en 🟢 Alto; un artículo de políticas o equipaje, no.
3. Definir el **mercado del lector** (`es-cl`, `es-pe`, etc.): determina qué variantes de keyword se usan («pasajes» en Chile, «boletos» en Perú) y qué landing de ruta se puede enlazar. Si las rutas no están activas en todos los mercados, el mercado lo decide la ruta 🟢 (ver Fase 5).
4. Anotar la fecha con la que se firmará la versión. Se usa en dos lugares (firma y bloque voz SKY) y tiene que coincidir.

### Fase 2 · Research y verificación de datos

> ⛔ **Ningún dato duro entra al cuerpo sin fuente.** Horarios, días de cierre, direcciones, distancias, tiempos de traslado, tarifas y requisitos de ingreso se verifican en la fuente oficial del lugar, no en blogs de terceros. Si solo hay fuente secundaria, el dato entra **marcado como secundaria** en la tabla de fuentes y queda en la lista de reemplazos antes de publicar. Si no hay fuente, el dato **no se escribe**: en su lugar queda `[Pendiente antes de publicar: …]`.

- Al cierre del artículo, tabla **Fuentes (uso interno)** con una fila por dato: qué se afirma y de dónde sale, con la marca *(secundaria)* donde aplique. **Las fuentes viven solo ahí**: las fichas «Datos para planificar» no llevan columna de fuente.
- Los datos con vigencia (horarios, cierres, terminales, requisitos) se revisan cada vez que el artículo se actualiza.
- **Precios:** solo con moneda, fecha y fuente oficial. Un rango sin fecha envejece el artículo y expone a la marca.
- **Rutas:** se verifican en Precios y Rutas SKY el mismo día en que se escribe (Fase 5).
- Si dos fuentes se contradicen, no se elige una: la discrepancia se anota y se escala. Ningún dato en disputa entra al texto.
- **Conductas de personas y advertencias de seguridad son datos duros** (ver reglas de narrativa).
- **Datos sanitarios y regulatorios, genéricos para Latinoamérica:** se explica quién define el requisito (autoridad de origen y de destino) y dónde consultarlo, sin trámites, plazos, plataformas ni oficinas de un solo país. El mercado de las rutas no limita este alcance.
- **Temas migratorios:** la ficha deriva a la fuente oficial sin dar requisitos; el nombre del organismo se copia tal cual de su sitio oficial.
- **Centro de Ayuda de SKY:** se lee abriendo cada pregunta (sus respuestas cargan al hacer clic; no se declara ilegible sin abrirlas) y manda sobre el Contrato de Transporte. Donde difieren, el artículo usa el Centro de Ayuda y la diferencia queda como hallazgo para Producto / SAC. Un ejemplo que aparece en dos listas incompatibles no se publica.
- **«Directo» no se escribe sin verificar:** Precios y Rutas no indica si un vuelo es directo; sin fuente que lo confirme, la palabra se quita.

### Fase 3 · Ficha SEO

Va al inicio de la página del artículo, como bloque de uso interno que no se publica.

| Campo | Regla |
| --- | --- |
| Keyword principal | La consulta real, tal como se busca. Aparece en el title, en el H1 y al inicio del TL;DR |
| Variantes | Las del mercado del lector. **Toda variante declarada aparece al menos una vez en el texto**, de forma natural. Las variantes de pasajes se declaran solo con ruta activa; el vocabulario sigue al mercado («valija» es AR/UY) |
| Title SEO | Promesa concreta y acotada. Sin superlativos |
| Meta description | Qué resuelve el artículo y cómo está organizado |
| Slug | Corto, con la keyword, sin preposiciones de más |

Antes de escribir (al cerrar la ficha, antes de la v1):

- **Slug sin colisión** con un artículo publicado y **diferenciado** de las URL publicadas del mismo tema, aunque la keyword principal se mantenga.
- **Canibalización por tema, no solo por slug:** buscar en el blog los artículos publicados del mismo tema. Si cumplir la promesa del título obliga a repetir uno publicado, el tema se descarta o se reenfoca, y la fila pasa a `Archivado` con el motivo, sin borrar.
- **El cuerpo cumple la promesa del título:** si el título dice «qué hacer», el cuerpo lo entrega con fuente; si no puede, se cambia el título o el tema antes de escribir.

### Fase 4 · Escritura

#### Estructura canónica

| # | Bloque | Qué lleva |
| --- | --- | --- |
| 1 | **Gancho** | Microescena tipo montaje: tres imágenes concretas en una frase y la tensión del artículo en la siguiente. Abre como un video, no como una introducción |
| 2 | **TL;DR** | H2 propio con la etiqueta explícita (`## TL;DR: [keyword exacta]`), 40 a 60 palabras, keyword al inicio, más una lista numerada de **una línea por bloque del cuerpo** (no tres fijas) |
| 3 | **Tesis** | Por qué el artículo se organiza así. Puede llevar una tabla de ritmo, que no repite lo que ya dijo el TL;DR |
| 4 | **Cuerpo por bloques** | Cada bloque (día, zona, caso) abre con **escena en hipotético**, sigue con el criterio y cierra con su ficha **«Datos para planificar»** (dato y detalle, sin columna de fuente) |
| 5 | **Tabla de perfiles** | «Si eres… prioriza… puedes saltarte». Es el bloque que vuelve accionable el artículo |
| 6 | **H2 operativos en pregunta** | Cómo moverse, dónde alojarse, qué errores evitar. **Mínimo cuatro H2 en forma de pregunta** en todo el artículo |
| 7 | **Bloque voz SKY** | Datos oficiales, cómo llegar volando, continuidad de viaje y equipaje. Fechado `Actualizado: DD/MM/AAAA`, en cursiva bajo el título |
| 8 | **FAQ** | 5 a 7 preguntas reales, cada respuesta autocontenida en dos o tres líneas |
| 9 | **Cierre** | Callback a las imágenes del gancho, cierre de criterio y CTA. **«Está bueno SKY.» va una sola vez, al final, como frase propia** |
| 10 | **Firma** | Autoría del equipo editorial más la fecha de actualización |

Fuera del cuerpo publicable quedan la ficha SEO, la tabla de fuentes y los anexos de la Fase 7. La estructura canónica se respeta también en relatos cortos.

**Patrón sándwich.** Horarios, direcciones, distancias y días de cierre **se sacan del párrafo narrativo** y se agrupan al cierre de cada bloque en «Datos para planificar». Mezclarlos le quita ritmo al relato y esconde el dato que el lector vino a buscar.

#### Reglas de narrativa

- **Escena antes que explicación.** Cada sección grande parte con una escena, no con la lógica del itinerario. Vale también en bloques de intensidad 🔴 Mínima.
- **Hipotético inmersivo.** Se permite «imagina que», «vas a ver», «yo elegiría», «a todos nos ha pasado». No se permite «cuando fui», «el año pasado en…» ni testimonios sobre el servicio de SKY.
- **Recursos narrativos alternados:** dos párrafos seguidos no abren con la misma técnica.
- **Al menos un detalle sensorial por punto de interés:** olor, temperatura, sonido, textura o sabor.
- **Los errores se narran donde ocurren.** La lista final solo recapitula en una línea por punto; no vuelve a explicar.
- **Hilo entre bloques.** Cada día cierra anticipando el siguiente, estilo *próximamente*. Un itinerario es una secuencia, no bloques independientes. El último día se escribe según la hora habitual del vuelo, sin afirmarla.
- **Callback final.** El cierre retoma las tres imágenes del gancho, ya resueltas.
- **El narrador nunca habla de su propio proceso de escritura** («el tercer día lo pensé flexible a propósito» delata al redactor).
- **El texto no nombra su propia estructura:** nada de «la tesis», «la razón que viene», «la última razón», «sección» ni «como dijimos arriba». El hilo se construye con el relato («mañana toca seguirla»).
- **No se atribuyen conductas a personas sin fuente.** Lo que hacen los locales, los guías u otros viajeros es un dato: sin fuente, no se escribe. «Los locales» además es ambiguo en Chile, donde también significa negocios.
- **Las advertencias de seguridad son datos duros.** Crecidas, corrientes, mareas o derrumbes van en la ficha con fuente oficial; en el relato solo caben como criterio («yo cambiaría el plan»), nunca como afirmación sobre cómo se comporta un río o el mar.
- **Español neutro con tuteo, nunca voseo**, también en artículos para Argentina o Uruguay. Un artículo para varios mercados se escribe en un solo texto neutro; el mercado define rutas, enlaces y variantes de keyword, no la conjugación (Brand Voice, sección 5).
- **No dar por hecho que la persona tiene limitaciones.** En adultos mayores, salud o accesibilidad, la autonomía es el punto de partida: las necesidades (silla de ruedas, asistencia, pausas) se escriben en condicional («quizás», «si la necesita», «si en trayectos así se cansa»), no como rasgo de la edad.
- **Cautela proporcional en salud.** El relato no alarma ni pide más reposo del que el lector va a hacer: recomienda lo mínimo razonable (una primera noche tranquila) y dice cuándo suele pasar el malestar. Las recomendaciones oficiales más extensas quedan en la ficha como referencia; las señales de alerta se mantienen completas.
- **Tradiciones locales como experiencia, no como remedio.** Una práctica icónica (mate o hoja de coca) se narra con detalle sensorial y se cuenta su evidencia real y sus restricciones (llevarla a otro país puede estar prohibido), con fuente. No se afirma que cure o prevenga sin respaldo.
- **Si el tema cubre a más de un sujeto (perro y gato), ninguna frase del relato excluye a uno que el tema incluye.**

> ⚠️ **Límite que no se cruza:** ninguna frase puede afirmar que el narrador estuvo ahí. Las imágenes se generan o se intervienen con IA, así que **la «E» de Experiencia de EEAT se sostiene en el texto, no en la foto**: no se presenta una pieza generada como registro de un viaje real ni se le atribuye autoría fotográfica a nadie.

### Fase 5 · Conexión con las rutas SKY

Seis reglas (detalle en el Brand Voice):

1. **Solo rutas 🟢 Activas** en Precios y Rutas SKY, verificadas el día en que se escribe.
2. **URL limpia:** sin UTM ni parámetros de campaña.
3. **Sin precios** en el cuerpo: cambian y envejecen el artículo.
4. **Dónde enlazar:** el «cómo llegar volando» dentro del bloque voz SKY, y una línea de continuidad al cierre del último bloque del cuerpo. **Máximo dos menciones por artículo.**
5. **Mercado correcto:** la landing corresponde al mercado del lector. Activa en un mercado no significa landing catalogada en otro. Si las rutas no están activas en todos los mercados, el artículo va al mercado con ruta 🟢 y URL limpia de su país. Las landings genéricas compartidas (por ejemplo es-us «vuelos al Caribe») no sirven como enlace de ruta.
6. **Ruta no catalogada:** enlazar el home, dejar el hallazgo en un callout rojo para Paid / Ad Ops y escalarlo. **Nunca inventar una URL de ruta.**

Además:

- **Patrón de continuidad:** el enlace se gana con una línea del relato («lo más probable es que te queden ganas de más»), no con un bloque comercial pegado al final.
- **La continuidad vende una ruta 🟢 nueva que nace del relato** y respeta la geografía («más sur» solo si el destino queda al sur). Si el destino principal no tiene ruta activa, la continuidad lleva la venta.
- **«Continuidad de viaje» dentro del bloque voz SKY va sin enlace,** no repite lo de «Cómo llegar volando» y se escribe en voz de marca, sin «yo».
- **El enlace de ruta va junto a un beneficio concreto con fuente** (tiempo, conexión, temporada), no como dato suelto.
- **Artículos sin destino también llevan rutas** («SKY tiene vuelos internacionales, como…, y nacionales, como…»): máximo dos (una internacional, una nacional), 🟢 Activas del mercado del artículo, URL limpia, en el bloque voz SKY y apoyadas en un beneficio con fuente. Se excluyen rutas donde el beneficio no aplica.
- **Si cambia una ruta enlazada, se actualiza todo el mismo día:** encuadre, fuentes, hallazgo y pendientes en la misma edición; ninguna sección queda con la ruta anterior.
- Los banners de ruta también son menciones comerciales y cuentan para el tope (caso Artículo 1, ver bitácora).

### Fase 6 · Imágenes

**Límites.** **Máximo 3 imágenes editoriales por artículo, incluida la portada.** Los `BANNER` de ruta no cuentan: son otra familia y tienen tarea propia. **IMG 1** es la portada 🔁: es el LCP, va sin `loading="lazy"` y es la base de reutilización. **IMG 2** e **IMG 3** son escenas, numeradas por orden de lectura. **Las infografías están fuera del alcance** (06/10/2026): el resumen citable lo dan el TL;DR, la lista y las tablas; si una tesis solo se entiende con un diagrama, se pide autorización y se registra como excepción en la Spec.

**Elegir la secuencia antes de escribir los callouts**, con el Sistema de selección:

- Leer el artículo completo y extraer tres momentos que ya existan en el texto (apertura, desarrollo, cierre).
- Asignar a cada uno su pregunta: ¿Dónde estoy?, ¿Qué hago o qué decido?, ¿Cómo se siente o qué demuestra?; un tipo primario A–H y sus modificadores. Revisar variedad, continuidad y fidelidad.
- La matriz por tipo de artículo es punto de partida: si el texto no tiene la escena, no se inventa.
- **Variedad mínima:** al menos dos tipos distintos; máximo un plano de destino casi puro y una selfie; al menos una imagen con acción, presencia humana o señal de POV si el tema lo permite. Dos imágenes con la misma acción se diferencian por momento, escala o función, o queda una. Si el artículo no sostiene tres escenas, se entregan dos y se documenta la excepción.
- **La tercera se elige por argumento, no por belleza:** gana la que demuestra algo que el lector no puede imaginar leyéndolo. Las postales intercambiables entre artículos se descartan. Prueba: si se quita la imagen y el artículo no pierde comprensión, recuerdo ni emoción, sobra.
- **Las descartadas se dejan escritas** en orden de prioridad dentro del toggle de imágenes, para no volver a discutirlas si se autoriza presupuesto.
- **Si el tema cubre perro y gato, las imágenes muestran a los dos:** la portada presenta a ambos y las otras dos se reparten; gancho, cierre, ALT, archivos y notas Dev se ajustan en la misma edición.
- **La imagen de proceso muestra el paso real del trámite** que el lector vive (counter con pesaje y revisión de la mascota) antes que una que lo esquive. El riesgo de uniformes o logos se resuelve en la spec: personal con ropa neutra, cuerpo parcial, sin señalética. Si la escena no está en el texto, se escribe en el relato con su dato y fuente.
- **Tipo A–H no es registro D/E:** la taxonomía decide qué función cumple la imagen; la referencia D y los registros D y E de la Skill deciden cómo se produce. Escribir siempre «Tipo D» o «registro D».

**El callout de spec.** Se escribe **dentro del cuerpo, en el punto exacto donde va la imagen**, para que quien sube el artículo sepa orden y ubicación sin interpretar. Al publicar se borran: son instrucciones de producción, no contenido. Cada callout lleva: identificador y posición · pregunta de secuencia · tipo primario A–H y modificadores · archivo `.webp` · medidas y peso · lazy sí o no · **ALT literal** · qué debe verse · **ancla POV** (la frase del texto que ilustra) · qué no debe aparecer. **No lleva prompt.** **Una sola fuente de verdad del ALT:** el del callout, el de las notas para Dev y el que se carga en WordPress son idénticos.

**Dirección fotográfica.**

- **Las fotos se producen desde el POV del viajero, no se buscan como stock.** La mirada simula la posición de quien recorre el lugar; no acredita un viaje real. Estándar, prohibiciones, encuadres y ejemplo visual D están en la Spec.
- **Estándar D** (06/10/2026): luz abundante compatible con hora y clima, sombras abiertas, altas luces conservadas y color natural luminoso; elemento contextual muy cerca del lente y muy fuera de foco, con desenfoque óptico convincente, enmarcando sin tapar al protagonista distante nítido. Rechazar borrones planos, franjas gaussianas, halos y máscaras. Si no hay un elemento plausible sin cambiar la escena, escalar la composición. Se aplica en callout de escena, ficha, prompt y QA.
- **Las personas son parte de la experiencia:** acciones espontáneas (caminar, observar, conversar, fotografiar). No exigir que todas estén de espaldas o desenfocadas ni vaciar la escena para cumplir el POV. Sin poses ni miradas dirigidas al lente; se mantienen los límites sobre rostros en primer plano y personas reales identificables.
- **Nada reconocible generado:** ningún rótulo legible de un negocio real, ningún logo de terceros, ningún rostro identificable, y **nada de cabinas, aviones ni uniformes SKY generados**. Un letrero inventado sobre un local real es un error atribuible a SKY. Si la pieza necesita texto legible, es un banner y se rotula en diseño. Tabla completa de casos en la Spec.
- **Con fotos reales, el encuadre sigue la geografía de la referencia.** No cambiar hora o clima para conseguir más luz.

**Producción con IA y referencias.**

- **Las piezas se generan o se intervienen con IA** (06/10/2026), incluso partiendo de una foto real. La IA es el medio, no el estilo: si la imagen se nota generada, se rechaza.
- **El prompt final no va en el callout:** vive en la ficha de la tarea de cada pieza (Fase 8). El callout dice qué debe verse; el prompt dice cómo se produce.
- **Separar referencias:** REF-ESTILO-D guía luz, color, profundidad y POV; no certifica geografía ni aprobación para publicar. Para un lugar identificable se exige foto real REF-01 en la tarea antes de generar; D no la sustituye.
- **Ejecutar con la Skill de imágenes,** no improvisar: cargarla y verificar el motor/modelo autorizado mediante la herramienta o interfaz. Si no se puede verificar, detener; una herramienta genérica no acredita autorización. Si falta foto real necesaria o motor verificable, detener y registrar bloqueo.

**Maestro y recortes.** La base de reutilización 🔁 es la portada por defecto. Generar un maestro horizontal de mayor resolución; entrega del artículo **1408 × 768 px (11:6)**, variantes **1200 × 630** (newsletter y OG) y **1080 × 1080**. Los recortes se derivan del mismo maestro aprobado, nunca se regeneran. Validar cada encuadre por separado, incluyendo protagonista y primer plano: el margen del 7,5 % no garantiza todos los recortes. Se registran motor, versión, prompt, referencias y parámetros disponibles; el ID no garantiza reproducción.

**Renumeración y archivado.**

- **Si una pieza sale del artículo, las demás se renumeran por orden de lectura** y cada ficha conserva la equivalencia a la vista (`N1_IMG-2 · anterior: N1_IMG-3`). El número es la posición en el texto, no la antigüedad de la pieza.
- **Una pieza ya producida que sale no se borra.** Si el archivo solo existe como adjunto en la página, se deja en su lugar con un callout `⛔ ARCHIVADA · no se publica` que ordena borrar imagen y callout al subir a WordPress, y su tarea pasa a `Archivado` indicando dónde quedó el archivo y qué la reemplazó. El entorno del agente no es almacenamiento: si hay que sacar el archivo de la página, primero se descarga.

**Banners de ruta:** copy aprobado, sin precios, sin «oferta» y sin el claim. Ruta verificada como activa antes de producir.

### Fase 7 · Anexos del artículo

Al final de la página, nunca en el cuerpo publicable. La página entera queda plegada en secciones (toggles h1:
Brief, Research, Artículo, Fuentes y hallazgos, Producción y cambios): los anexos van en las dos últimas. Norma y
procedimiento: [lote-editorial.md](lote-editorial.md) §6, «Estructura de la ficha». Una ficha en texto corrido no se
entrega a SKY.

| Anexo | Para quién | Qué lleva |
| --- | --- | --- |
| **🖼️ Imágenes del artículo** (toggle) | Diseño | Solo índice: las tres imágenes con su posición y estado, por qué se eligieron, prioridad de las descartadas y notas para Dev con archivo, ALT y carga |
| **📝 Qué se cambió en esta versión** (toggle) | Redacción | Tabla Qué / Antes / Ahora / **Regla para replicar**. Convierte una corrección puntual en estándar. Cada versión tiene su propio toggle y el nuevo va debajo del anterior |
| **Callouts de hallazgos** | Paid, Ad Ops, Producto, SAC | Lo que se detectó al escribir y no se arregla desde el texto. Un hallazgo declarado es gestionable; uno omitido se publica como error |
| **Fuentes (uso interno)** | Equipo | Una fila por dato, con la marca de fuente secundaria donde aplique |

### Fase 8 · Tareas de diseño

> ⛔ **Prerrequisito: el artículo debe estar escrito.** La escena de la portada y el ancla de cada imagen salen del texto. Sin texto no hay forma de saber qué imagen corresponde.

**Dónde.** Las tareas y proyectos de SKY van en las **bases del teamspace SKY** (Tareas y su base Proyectos hermana), no en las bases generales de la agencia. Las dos parejas de bases **no comparten relaciones**: una tarea creada en la base general no puede colgar de un proyecto de SKY ni al revés; crearla en la base equivocada la deja huérfana.

**1. Proyecto mensual** en Proyectos del teamspace SKY: `SKY · Producción Creativa - [Mes] [AA]`, ícono 🎨, `Estado` = `Planificación`, fechas del primer al último día del mes.

**2. Tarea principal por artículo** en Tareas: `SKY · Artículo N: [Título]`, `Tipo de entregable` = `Contenido`. Es la que existe desde la producción editorial. Cómo se crea (aplicado el 04/11/2026 a los Artículos 12 a 48):

- **Solo para artículos con `Aprobación cliente` = `Aprobado`** en el Content Hub. Rechazados y En espera no llevan tarea.
- **Antes de crear, revisar si ya existe** buscando `SKY · Artículo` en Tareas: un artículo aprobado tiene exactamente una tarea principal.
- **Numeración consecutiva** desde el último N existente, en el orden de `Fecha de publicación` del Content Hub.
- **Campos:** ícono 📝 · `Estado` = `Sin empezar` · `Responsables` = el `Responsable` del Content Hub · `Proyecto` = el del mes · `Tipo de entregable` = `Contenido` · `Fecha límite` escalonada en días hábiles, antes de la fecha de publicación y del plazo pedido · `Artículo Content Hub` = la fila del artículo (relación, no solo mención; visible desde las dos bases).
- **Cuerpo:** mención al artículo del Content Hub y al Playbook. Si el cliente comentó algo al aprobar, va textual en un callout 💬 con autor y fecha.
- **Las subtareas de diseño no se crean junto con la tarea principal:** esperan al texto.

**3. Una subtarea por pieza gráfica:** `Tarea principal` = la del artículo · `Proyecto` = el del mes · `Tipo de entregable` = `Diseño gráfico` · ícono 🖼️ · fecha posterior a la del artículo.

**Naming:** `SKY · Artículo N · IMG 1 Portada: [escena]` · `SKY · Artículo N · IMG 2: [escena]` · `SKY · Artículo N · IMG 3: [escena]` · `SKY · Artículo N · BANNER n: [nombre]`. El número es el **orden de lectura en el artículo**, no el orden de producción.

**ID de pieza:** `N[artículo]_IMG-[n]` y `N[artículo]_BAN-[n]`. Si una pieza cambia de rol o de número, se conserva la equivalencia a la vista (`N1_IMG-2 · anterior: N1_B02`): archivos entregados y comentarios de Frame.io siguen con el ID viejo.

#### La ficha de cada pieza

Se escribe en el **cuerpo de la subtarea en el mismo momento en que se crea**: una subtarea de imagen sin ficha está incompleta. Plantilla vigente: la de la plantilla de ficha de pieza, llenada completa y en este orden.

| Bloque | Campos |
| --- | --- |
| **Identificación** | ID de pieza · Artículo · Título del artículo · Posición · Tipo de imagen (tipo primario A–H y modificadores, copiados del callout) · Tipo de toma · Registro D o E |
| **Contenido de la escena** | Destino exacto · Ciudad y país · Protagonista visual · Qué debe aparecer · Qué no debe aparecer · Personas · Acción o comportamiento |
| **Luz y encuadre** | Momento del día · Luz y clima · Exposición luminosa, sombras abiertas y altas luces conservadas · Color natural · Composición desde el POV del viajero · Primer plano contextual muy fuera de foco · Protagonista nítido · Orientación |
| **Entrega técnica** | Formatos requeridos (archivo, ALT y carga) · Dimensiones · Zona segura |
| **Cierre** | Referencias de estilo y fotos reales para fidelidad, diferenciadas · Prompt final base + negativo · Motor/modelo autorizado y versión verificables · Parámetros, semilla e ID si existen · Criterios de aceptación · Responsable de producción · Fecha de entrega · Estado · Versión de pieza |

Reglas al llenarla:

- **Se copia del callout de spec, no se reinventa.** Posición, archivo, ALT y carga son idénticos. Si ficha y artículo difieren, manda el artículo y se corrige la ficha.
- **Momento del día no es decorativo:** es la hora que dice el relato. Si el texto abre temprano, la portada es de luz temprana. Ganar luminosidad es abrir exposición y sombras sin quemar altas luces; no inventar sol, sustituir garúa ni cambiar la hora.
- **Prompt final obligatorio en todas las piezas,** también en las fotos del viajero: **base** y **negativo**. Se redacta en la tarea, no en el artículo, a partir de escena, luz, hora y prohibiciones del callout, con la plantilla vigente de la Skill de imágenes. En fotos editoriales declara elemento cercano muy fuera de foco, protagonista nítido, POV, color y exposición del estándar D, y excluye desenfoque plano, halos, máscaras y obstrucciones. Antes de aprobar, revisar artefactos al 100 % de zoom y fidelidad del lugar.
- **Los datos de producción se registran al ejecutar:** motor/modelo y versión verificables, parámetros y semilla si existen, ID de generación, referencias usadas y versión de pieza. No salen del artículo ni se inventan para completar la ficha. El ID da trazabilidad, no garantiza reproducción; las variantes se derivan del maestro aprobado.
- **Qué no debe aparecer es un campo de trabajo, no de relleno:** las prohibiciones que arruinan la pieza (recortar los edificios de la huaca, rostros reconocibles, cielo reemplazado, texto sobre la imagen), más las de «nada reconocible generado» (Fase 6).
- **Copy literal aparte:** las piezas con texto rotulado llevan una sección `Copy literal` debajo de la ficha, tal cual; lo que no está escrito ahí no se inventa.
- **Zona segura:** el margen del 7,5 % por lado es protección inicial, no garantía. Validar por separado artículo, OG y cuadrado cuando correspondan, con contenido crítico visible y primer plano sin obstrucciones.
- **Cierre con `Referencias visuales`:** separar REF-ESTILO-D (enlazada al ejemplo de la Spec) de REF-01 y siguientes (fotografías reales del lugar). Dejar espacio para cargar las faltantes y bloquear antes de generar si falta una foto real necesaria.
- **Pieza sin condiciones para ejecutarse se crea `Bloqueado`, con ficha completa y el motivo escrito.** Bloqueo típico: banner cuya ruta no está 🟢 Activa, o lugar que no se puede representar con fidelidad por falta de referencia. No se cambia el estándar en silencio: una excepción autorizada se registra en la Spec.
- **Reserva anticipada:** si por planificación hay que reservar una pieza antes del texto, se crea bloqueada y **sin ficha**; la ficha se escribe cuando hay artículo.
- Diseño entrega en Frame.io para revisión por versión. Aprobado, se carga a WordPress.

#### Estados de la subtarea

| Situación | Estado | Qué tiene que llevar |
| --- | --- | --- |
| Ficha completa y condiciones dadas | `Brief listo` | Prompt final escrito |
| Falta una condición externa: ruta sin catalogar, foto real necesaria inexistente o motor autorizado no verificable | `Bloqueado` | Ficha completa más el motivo; no generar mientras falte la condición |
| Hay dos conceptos propuestos y nadie decidió | `Pendiente aprobación interna` | Tabla que compare las opciones y quién decide |
| Volvió de revisión con comentarios | `Cambios solicitados` | Qué se pidió, con fecha |
| La pieza salió del artículo | `Archivado` | Dónde quedó el archivo y qué la reemplazó |

- **Estado de tarea y estado de ficha que no coinciden son un hallazgo:** se registra y la imagen no se aprueba hasta que coincidan.
- **Si alguien más trabaja la pieza, no se sobreescribe.** Se deja su trabajo intacto como *opción A*, se agrega arriba un callout rojo con una tabla que compare escena, archivo, ALT y medidas contra lo que pide el artículo, se deja `Pendiente aprobación interna` y se escala. Una ficha reescrita en silencio destruye trabajo ajeno y esconde el desacuerdo.

#### Tareas duplicadas o en la base equivocada

- La fila mala se renombra `[DUPLICADA · no usar]`, pasa a `Archivado` y lleva arriba un callout que apunta a la tarea buena.
- **No se borra desde el agente:** el borrado puede quedar bloqueado y la fila archivada deja rastro de por qué se duplicó. Si hay que eliminarla, la borra una persona desde la base.
- Antes de recrear una pieza en otra base, revisar **qué relaciones se pierden** y escribirlas como enlaces en el cuerpo de la tarea, para que no quede sin artículo ni sin proyecto.

### Fase 9 · QA de voz antes de entregar

«Suena bien» no es criterio. El texto se relee contra esta lista antes de mover el estado: lo que se cuela son fallas de detalle, no de tono general.

| Qué revisar | Falla típica |
| --- | --- |
| TL;DR | No abre con la keyword exacta, o pasa de 60 palabras |
| Gancho | Explica el itinerario en vez de mostrar una escena |
| Narrador | Afirma experiencia propia, o habla de su proceso de escritura |
| Estructura | El texto nombra sus partes: «la tesis», «la razón que viene» |
| Personas | Atribuye conductas a locales, guías o viajeros sin fuente |
| Seguridad | Advertencias sobre ríos, mar o clima afirmadas en el relato sin fuente oficial |
| Fuentes | Columna de fuente dentro de una ficha «Datos para planificar» en vez de la tabla final |
| Datos duros | Horarios y direcciones dentro del párrafo narrativo en vez de la ficha |
| Cifras | Precios o tarifas sin moneda, fecha y fuente oficial |
| Rutas | Más de dos menciones, URL con UTM, o ruta sin verificar ese día |
| Cierre | Resume el artículo en vez de retomar las imágenes del gancho |
| Encabezados | Ningún H2 en forma de pregunta (el mínimo es cuatro) |
| Variantes de keyword | Declaradas en la ficha SEO y ausentes del texto |
| Fechas | Firma y bloque voz SKY con fechas distintas |
| Claim | «Está bueno SKY» repetido o fuera del cierre |
| Sensorialidad | Lugares descritos solo por su horario |

### Fase 10 · Estados y handoff

| Dónde | Cuándo | A qué estado |
| --- | --- | --- |
| Artículo en el Content Hub | Versión terminada y auditada | `En revisión` |
| Artículo en el Content Hub | Aprobado por el cliente | `Aprobación cliente` = `Aprobado`; `Estado` = `Aprobado`, y `Publicado` cuando salga al sitio. Habilita la tarea principal |
| Artículo en el Content Hub | Rechazado por el cliente | `Aprobación cliente` = `Rechazado`; `Estado` = `Bloqueado`. Sin tarea en Tareas SKY |
| Artículo en el Content Hub | El cliente lo deja para más adelante | `Aprobación cliente` = `En espera`; el `Estado` no se toca. Sin tarea hasta que se apruebe |
| Artículo en el Content Hub | Sin tema definido | Se queda en `Idea`: no se toca |
| Artículo en el Content Hub | Tema descartado por canibalización | `Archivado` con el motivo, sin borrar |

**Aprobación del cliente:** la decisión de SKY se registra en `Aprobación cliente` (En espera, Aprobado o Rechazado), no solo en el comentario. Si el cliente deja comentarios en la propiedad `Estado`, se leen todos, se traduce cada uno a `Aprobación cliente` y los que traen condiciones (plazos, enfoques, cambios) se copian a la tarea del artículo. Un comentario ambiguo queda `En espera` y se consulta con Natalia.

**Antes de cargar a WordPress:** borrar los callouts de spec de imagen (y las piezas `⛔ ARCHIVADA` con su callout), cargar los ALT exactos, confirmar portada sin lazy y el resto con lazy, verificar peso de menos de 200 KB, revisar la lectura en móvil y resolver o declarar cada `[Pendiente antes de publicar: …]` y `[link interno: …]`.

**Al reportar avance**, separar siempre en tres grupos: listos, bloqueados con el motivo, y fuera de alcance. Un conteo sin el motivo del bloqueo no sirve para decidir.

## 4. Reglas transversales

- **No borrar contenido existente:** las versiones nuevas se agregan debajo y la anterior queda como histórico.
- **Un pendiente declarado es gestionable; uno omitido se publica como error.** Todo lo no verificado va a su marca o a su callout.
- **Distinguir verificado de estimado.** Las fuentes secundarias se marcan y se reemplazan antes de publicar.
- **Los enlaces internos pendientes se marcan** con `[link interno: tema]`, nunca como texto suelto ni con URL inventada.
- **Los hallazgos de otra área se escalan, no se parchan** desde el texto.
- **Al cerrar una versión, actualizar las dos fechas:** la firma y el bloque voz SKY.
- **Toda norma nueva se escribe el mismo día** en su página y en la bitácora, con su consecuencia. Un artículo bien corregido mejora una pieza; una regla capturada mejora todas las siguientes.

### Formato en Notion

- **Nunca el carácter `|` dentro de una celda de tabla:** parte la fila y se pierde el texto posterior.
- Evitar los símbolos «menor que», «menor o igual» y la virgulilla sueltos en el cuerpo: escribirlos en palabras («menos de 200 KB», «cerca de las 11:45»).
- Notion **canoniza** parte del formato al guardar. Son cambios cosméticos: no reintentar corregirlos.
- Editar con reemplazos pequeños anclados a texto copiado literalmente de la página; no reescribir la página entera.

## 5. Bitácora convertida en reglas

Cada decisión que cambia el estándar se escribe en la bitácora del Playbook el mismo día, con su consecuencia; sin esto, la norma se vuelve a discutir en el artículo siguiente. Aquí se agrupan por tema. Las reglas ya están integradas en las fases; esta sección conserva origen y caso.

### Voz y narrativa

| Fecha | Regla | Consecuencia y caso |
| --- | --- | --- |
| 06/10/2026 | La «E» de EEAT se sostiene en el texto, no en la imagen | Una pieza generada no se presenta como registro de un viaje real ni se le atribuye autoría fotográfica |
| 06/10/2026 | Lista del TL;DR: una línea por bloque, no tres fijas | Se alinea con el Brand Voice. Caso: Paraty, que tiene cuatro bloques |
| 06/10/2026 | El texto publicable no nombra su estructura | Los hilos entre bloques se escriben como relato; «tesis», «razón» o «sección» no aparecen en el cuerpo |
| 09/10/2026 | Recursos narrativos alternados | Dos párrafos seguidos no abren con la misma técnica; estructura canónica también en relatos cortos; último día según la hora habitual del vuelo, sin afirmarla; con fotos reales, el encuadre sigue la geografía de la referencia. Caso: Valdivia |
| 14/10/2026 | Escena en hipotético también en bloques 🔴 Mínima | En temas migratorios la ficha deriva a la fuente oficial sin dar requisitos; el nombre del organismo se copia tal cual. Caso: Cancún |
| 14/10/2026 | Cierre y registro de cambios | «Está bueno SKY.» como frase propia; fecha del bloque voz SKY en cursiva bajo el título; un toggle de cambios en tabla por versión, la nueva debajo de la anterior |
| 15/10/2026 | Español neutro con tuteo, nunca voseo, también para Argentina o Uruguay | Un solo texto neutro para varios mercados; el mercado define rutas, enlaces y variantes, no la conjugación. Registrada en Brand Voice sección 5. Decisión de Valentina al planificar Escala larga en Santiago |
| 15/10/2026 | No dar por hecho que la persona tiene limitaciones | Necesidades en condicional, autonomía como punto de partida. Caso: Viajar en avión con un adulto mayor (corrección de Valentina en la v1) |
| 15/10/2026 | Cautela proporcional en temas de salud | Lo mínimo razonable en el relato, recomendaciones extensas en la ficha, señales de alerta completas. Caso: Mal de altura en Cusco (corrección de Valentina en la v1) |
| 15/10/2026 | Las tradiciones locales entran como experiencia, no como remedio | Detalle sensorial, evidencia real y restricciones con fuente; no se afirma que cure o prevenga. Caso: Mal de altura en Cusco (corrección de Valentina en la v1) |

### Datos, fuentes y SEO

| Fecha | Regla | Consecuencia y caso |
| --- | --- | --- |
| 06/10/2026 | Fuentes solo al final, en la tabla Fuentes (uso interno) | Las fichas «Datos para planificar» quedan con dato y detalle, sin columna de fuente |
| 06/10/2026 | Conductas de personas y advertencias de seguridad son datos duros | Sin fuente no se escriben; la seguridad entra al relato solo como criterio y a la ficha con fuente oficial. Caso: Paraty |
| 14/10/2026 | «Directo» no se escribe sin verificar | Precios y Rutas no lo indica; sin fuente, la palabra se quita. Caso: Curanto |
| 15/10/2026 | Datos sanitarios y regulatorios, genéricos para Latinoamérica | Quién define el requisito y dónde consultarlo, sin trámites ni oficinas de un solo país, que además se desactualizan. Caso: Errores al viajar con mascota (SAG) |
| 15/10/2026 | El Centro de Ayuda se lee abriendo cada pregunta y manda sobre el Contrato de Transporte | Diferencias como hallazgo para Producto / SAC; un ejemplo en dos listas incompatibles no se publica. Caso: Errores al viajar con mascota |
| 15/10/2026 | Slug diferenciado si ya hay artículos sobre la keyword | El slug no se parece a URL publicadas del mismo tema. Caso: Errores al viajar con mascota (/mascotas-en-cabina y /viajar-con-perros) |
| 15/10/2026 | El cuerpo cumple la promesa del título | Se revisa al cerrar la ficha SEO, antes de la v1. Caso: Escala larga en Santiago (descartado por Valentina) |
| 15/10/2026 | Revisar canibalización por tema antes de la v1, no solo el slug | Si repite uno publicado (por ejemplo /panoramas-en-santiago), se descarta o reenfoca y la fila pasa a Archivado con motivo, sin borrar. Caso: Escala larga en Santiago |

### Rutas

| Fecha | Regla | Consecuencia y caso |
| --- | --- | --- |
| 06/10/2026 | `[BANNER 1]` eliminado del Artículo 1 | Con dos banners el artículo quedaba con tres menciones comerciales, una más de las permitidas |
| 14/10/2026 | La continuidad de viaje vende una ruta 🟢 nueva que nace del relato | Respeta la geografía; si el destino principal no tiene ruta activa, la continuidad lleva la venta. Casos: Curanto, Valdivia y Cancún |
| 14/10/2026 | Enlace de ruta junto a un beneficio concreto con fuente | Tiempo, conexión o temporada verificables; nunca dato suelto |
| 14/10/2026 | El mercado del artículo lo decide la ruta 🟢 | Mercado con ruta activa y URL limpia de su país; landings genéricas compartidas no sirven; variantes de pasajes solo con ruta activa; vocabulario según mercado. Caso: Cancún |
| 14/10/2026 | «Continuidad de viaje» del bloque voz SKY va sin enlace | Máximo dos menciones; no repite «Cómo llegar volando»; voz de marca, sin «yo» |
| 14/10/2026 | Si cambia una ruta enlazada, se actualiza todo el mismo día | Encuadre, fuentes, hallazgo y pendientes en la misma edición |
| 15/10/2026 | Artículos sin destino también llevan rutas | Máximo dos (internacional y nacional), 🟢 del mercado, URL limpia, en el bloque voz SKY, con beneficio con fuente; se excluyen rutas donde no aplica. Caso: Errores al viajar con mascota |

### Imágenes

| Fecha | Regla | Consecuencia y caso |
| --- | --- | --- |
| 06/10/2026 | Máximo 3 imágenes editoriales, portada incluida; banners no cuentan | Las candidatas sobrantes se listan como descartadas, en orden de prioridad |
| 06/10/2026 | Spec de cada imagen inline en el artículo, donde va la imagen | El toggle queda solo como índice; los callouts se borran al publicar |
| 06/10/2026 | Las piezas se generan o se intervienen con IA, incluso desde foto real | Toda pieza lleva prompt final (base + negativo); se cayó el bloqueo por falta de producción fotográfica en destino |
| 06/10/2026 | El prompt vive solo en la ficha de la tarea | El callout dice qué debe verse; no lleva prompt |
| 06/10/2026 | Infografías fuera de alcance por ahora | IMG 2 e IMG 3 son escenas; la base 🔁 pasa a la portada; excepción solo con autorización y registrada en la Spec |
| 06/10/2026 | Nada reconocible generado | El riesgo de la IA no es la cesión de derechos sino la verosimilitud: el error se publica en nombre de SKY. Texto legible = banner rotulado en diseño |
| 06/10/2026 | Estándar D | Aplica en callout, ficha, prompt y QA; personas espontáneas admitidas. La Spec guarda el ejemplo y la Skill guía la ejecución |
| 06/10/2026 | Estilo no equivale a fidelidad ni a autorización del motor | REF-ESTILO-D no sustituye REF-01; motor verificado en herramienta o interfaz; si falta una condición, detener y registrar bloqueo |
| 06/10/2026 | Entrega 1408 × 768 = 11:6; maestro de mayor resolución y recortes independientes | Artículo, OG y cuadrado del maestro aprobado, cada encuadre comprobado sin confiar solo en el 7,5 %; registrar motor, versión, prompt, referencias y parámetros; el ID no garantiza reproducción |
| 09/10/2026 | Sistema de selección: secuencia de tres preguntas con tipo primario A–H y modificadores | Se aplica en la Fase 6 antes de los callouts; la Spec recoge reglas y campos; la Skill traduce cada tipo a registro D o E; no se confunden |
| 15/10/2026 | Si el tema cubre perro y gato, las imágenes muestran a los dos | Portada con ambos, las otras se reparten; gancho, cierre, ALT, archivos y notas Dev en la misma edición. Caso: Errores al viajar con mascota |
| 15/10/2026 | La imagen de proceso muestra el paso real del trámite | Ropa neutra, cuerpo parcial, sin señalética; si la escena no está en el texto, se escribe con dato y fuente. Caso: Errores al viajar con mascota |

### Tareas y estados

| Fecha | Regla | Consecuencia y caso |
| --- | --- | --- |
| 06/10/2026 | Tareas y proyectos de SKY en las bases del teamspace SKY | Las bases generales no comparten relaciones: una pieza creada ahí queda huérfana. |
| 14/10/2026 | Estado de tarea y ficha que no coinciden son un hallazgo | La imagen no se aprueba hasta que coincidan. Caso: Qué llevar a Cancún |
| 04/11/2026 | Aprobación del cliente en propiedad propia (`Aprobación cliente`: En espera, Aprobado, Rechazado) | Aprobado mueve `Estado` a Aprobado y habilita la tarea; Rechazado pasa a Bloqueado; En espera no toca el estado. Aplicado a la ronda de Natalia del 03/11/2026: 41 aprobados, 5 rechazados, 2 en espera |
| 04/11/2026 | La tarea principal se vincula al artículo por relación (`Artículo Content Hub`), no solo por mención | Cada artículo aprobado tiene exactamente una tarea, visible desde las dos bases; tareas principales con 📝, subtareas de diseño con 🖼️ |

Caso sin fila propia en la bitácora, registrado en la Fase 8 del Playbook: el 06/10/2026 la portada del Artículo 1 tenía una ficha en edición con otro concepto; de ahí la regla de no sobrescribir trabajo ajeno (opción A, tabla comparativa, `Pendiente aprobación interna`).

## 6. Contradicciones abiertas del Playbook

Detectadas al integrarlo el 06-11-2026. No se resolvieron aquí: se escalan a Julio y Valentina y, cuando se
decidan, se corrigen en el Playbook de Notion y en este capítulo el mismo día.

| Tema | Qué choca |
| --- | --- |
| Menciones de ruta | La Fase 5 pone la segunda mención en una línea de continuidad al cierre del cuerpo; la bitácora del 14-10 dice que la «Continuidad de viaje» del bloque voz SKY va sin enlace; la del 06-10 cuenta los banners como mención comercial; en artículos sin destino las dos menciones van en el bloque voz SKY; y `lote-editorial.md` las cuenta como «Cómo llegar volando» más el banner |
| Equivalencia de ID | Conviven `N1_IMG-2 · anterior: N1_IMG-3` y el ID viejo `N1_B02`, que no sigue el formato `BAN-n` |
| Tarea principal | La Fase 8 dice que la tarea «ya existe desde la producción editorial», pero el mismo paso manda crearla sólo con `Aprobación cliente` = Aprobado (en diciembre se creó antes, por pedido de Julio, como excepción anotada) |
| Portada del Artículo 1 | El pendiente dice «decide Marca y bloquea IMG 1», mientras la regla del caso pide `Pendiente aprobación interna` |
| Infografías | La Fase 8 todavía nombra «el dato de la infografía», aunque las infografías están fuera de alcance desde el 06-10 |

## 7. Equipo y pendientes

| Quién | Qué sostiene |
| --- | --- |
| Valentina | Content Hub, calendario editorial y guía de estilo comunicacional |
| Daniela | Wiki y distribución a diseño |
| Julio | Research, SEO/AEO y supervisión editorial |
| Andrés | Diseño de la newsletter |
| Natalia | Contacto con el cliente y decisiones de alcance |
| Melkin | Diseño y producción de las piezas gráficas |

Flujo visual: diseño entrega en Frame.io y se carga en WordPress. La newsletter reemplazó a las redes sociales en el alcance, por eso la base de reutilización 🔁 se adapta a newsletter y OG, no a formatos verticales.

### Pendientes abiertos de la cuenta (estado al 04-11-2026)

Fechados: verificar en la página de Notion antes de darlos por vigentes.

- [ ] Falta la fila del Home Market Chile para Santiago → Lima en Precios y Rutas SKY. Está la inversa, pero no hay landing es-cl catalogada. Mientras no exista, el «cómo llegar» apunta al home.
- [ ] Confirmar con Marca si el uso de IA se declara en el pie de imagen o en un aviso del blog, y dónde se archivan prompts y semillas de las piezas aprobadas.
- [ ] Armar el banco de referencias reales (REF) de los lugares recurrentes de las rutas SKY, para que la generación no invente geografía.
- [ ] Resolver el conflicto de portada del Artículo 1: Plaza Mayor temprano (lo que pide el texto) frente a la viajera en el Malecón. Decide Marca y bloquea IMG 1.
- [ ] Dos proyectos homónimos de Producción Creativa Noviembre 26, uno en cada base de Proyectos. Dejar vivo uno solo.
- [ ] La tarea principal del artículo y el BANNER 2 siguen en las bases generales. Mientras estén ahí, las imágenes no pueden colgar como subtareas del artículo: quedan agrupadas por proyecto, no por artículo.
- [ ] Relación Content Hub ↔ Tareas SKY: la columna quedó como `Tareas 1` porque ya existe `Tareas` apuntando a la base general. Definir si se renombra a `Tareas SKY` y si la antigua se retira.
- [ ] Tareas de los Artículos 1, 2, 4, 5, 8, 9 y 10 sin `Artículo Content Hub`: sus artículos no quedaron aprobados en la ronda del 03/11/2026. Vincularlas cuando se confirme su estado.
- [ ] Precios de transporte urbano y presupuestos: definir fuente oficial, o mantenerlos fuera del cuerpo.
- [ ] Manual de marca SKY para tipografía y colores secundarios de infografías.
- [ ] Confirmar con Dev si WordPress exige una variante de apertura distinta a 1408 × 768.

## 8. Checklist de cierre por artículo

- [ ] `Tipo`, `Formato` y mercado del lector leídos en el Content Hub antes de escribir
- [ ] Ficha SEO completa, slug sin colisión y variantes declaradas presentes en el texto
- [ ] TL;DR con etiqueta explícita, keyword exacta al inicio y 40 a 60 palabras
- [ ] Mínimo cuatro H2 en forma de pregunta
- [ ] Patrón sándwich aplicado: ningún horario ni dirección dentro del relato
- [ ] Un detalle sensorial por punto de interés, errores narrados en su escena y hilo entre bloques
- [ ] Cierre con callback a las imágenes del gancho y claim una sola vez
- [ ] Rutas verificadas como 🟢 Activas ese día, URL limpia, máximo dos menciones, mercado correcto
- [ ] Ninguna cifra sin fuente oficial, moneda y fecha; lo que falta quedó marcado como pendiente
- [ ] Tabla de fuentes (uso interno) completa, con las secundarias marcadas
- [ ] Tres imágenes como máximo, portada incluida, cada una con su callout de spec en su posición
- [ ] Secuencia elegida con el Sistema de selección: tres preguntas respondidas, tipo primario A–H y modificadores en cada callout, variedad mínima cumplida y descartes priorizados
- [ ] ALT idénticos en el callout, en las notas para Dev y en WordPress
- [ ] Tareas de diseño creadas solo con el texto ya escrito, con ficha copiada del artículo
- [ ] Toggles de imágenes y de cambios de versión al día, con regla para replicar
- [ ] Hallazgos para otras áreas en su callout y escalados
- [ ] QA de voz hecho contra la lista de fallas típicas
- [ ] Fechas de firma y de bloque voz SKY coincidentes
- [ ] Cada pieza gráfica con prompt final en su ficha, no en el callout del artículo
- [ ] Fotos editoriales alineadas al estándar D: POV, luz y color naturales luminosos, primer plano contextual muy fuera de foco y protagonista nítido sin obstrucciones; sin borrón plano ni máscaras
- [ ] Personas en acciones espontáneas cuando corresponda; sin poses, sin obligarlas a estar todas de espaldas o desenfocadas y manteniendo límites de identidad
- [ ] Hora y clima del relato conservados; REF de estilo separada de foto real de fidelidad y motor autorizado verificado antes de generar
- [ ] Maestro, registros de producción y recortes de artículo 1408 × 768 (11:6), OG y cuadrado comprobados según la Skill; cada recorte revisado por separado
- [ ] `Aprobación cliente` = `Aprobado` antes de crear la tarea principal, con ícono 📝 y relación `Artículo Content Hub`
- [ ] Piezas creadas en las bases del teamspace SKY y colgando del proyecto del mes
- [ ] Numeración de imágenes revisada por orden de lectura, con equivalencia de IDs si alguna cambió
- [ ] Piezas archivadas marcadas como no publicables, con su archivo localizable
- [ ] `Estado` movido en el Content Hub y avance reportado en tres grupos
