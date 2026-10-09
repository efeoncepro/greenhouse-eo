<callout icon="🎯" color="blue_bg">
	**Skill: generar las imágenes del Blog SKY con IA.** Del brief al archivo listo para WordPress: qué motor usar, cómo escribir el prompt, qué revisar antes de aprobar y cómo entregar.
	**Motores autorizados:** **ChatGPT Images 2.5** y **Nano Banana Pro**. No se usan otros sin autorización.
	**Esta skill no define el contenido de la imagen.** Eso lo manda <mention-page url="https://app.notion.com/p/cbf3b2942bf74f5784f4105881ed1f6d"/> y, pieza por pieza, el callout de spec dentro del artículo. Acá sólo está el cómo producirla.
</callout>
<table_of_contents/>
## Cuándo usar esta skill
Cuando una tarea de pieza gráfica está en `Brief listo` y hay que entregar el archivo. También para regenerar variantes de una pieza ya aprobada.
Si la tarea está en `Bloqueado` o `Pendiente aprobación interna`, **no se genera nada**: primero se resuelve el bloqueo o la decisión.
## Antes de abrir el motor
1. **Leer el callout de spec dentro del artículo**, no la ficha. El artículo es la fuente de verdad: si la ficha difiere, manda el artículo y se corrige la ficha.
2. **Leer el prompt final de la ficha de la tarea.** Es el único campo que no sale del artículo y ya viene escrito en dos partes: base y negativo.
3. **Revisar las REF cargadas** en la sección *Referencias visuales* de la tarea. Si la pieza muestra un lugar con forma identificable y no hay REF, se pide antes de generar.
4. **Confirmar la hora del relato.** La luz de la pieza tiene que coincidir con el momento que dice el texto. Abrir exposición y sombras no autoriza a inventar sol ni cambiar el clima.
5. **Consultar la referencia de estilo D** en <mention-page url="https://app.notion.com/p/cbf3b2942bf74f5784f4105881ed1f6d"/>: Reloj de Flores con cantero de rosas muy fuera de foco y visitantes en escena. Separar REF-ESTILO-D de REF-01: la primera guía el lenguaje fotográfico; la segunda, con foto real, sostiene la fidelidad del lugar. **Elegir y registrar D · observación o E · experiencia** según el ancla del artículo. E conserva el tratamiento D de luz, color y desenfoque y aplica además su dirección de actividad, casting y mirada definida abajo.
6. **Identificar un primer plano contextual plausible** y el protagonista que debe permanecer nítido. Si incorporarlo obliga a cambiar la escena del artículo, escalar antes de generar.
7. **Verificar el motor/modelo autorizado** mediante información expuesta por la herramienta o interfaz. Si no se puede confirmar su nombre exacto, detener y registrar el bloqueo: una herramienta genérica de imágenes no acredita autorización por sí sola. No atribuir un motor sin evidencia.
## Qué motor usar
<table header-row="true">
<tr>
<td>Caso</td>
<td>Motor</td>
<td>Por qué</td>
</tr>
<tr>
<td>Escena nueva desde cero, sin referencia</td>
<td>**ChatGPT Images 2.5**</td>
<td>Mejor adherencia a prompts largos con muchas condiciones simultáneas de encuadre, luz y prohibiciones</td>
</tr>
<tr>
<td>Lugar identificable con REF cargada</td>
<td>**Nano Banana Pro**</td>
<td>Mejor para mantener la forma de una referencia y para fundir varias imágenes de apoyo</td>
</tr>
<tr>
<td>Intervenir o corregir una pieza ya generada</td>
<td>**Nano Banana Pro**</td>
<td>Edición dirigida sin rehacer la imagen completa</td>
</tr>
<tr>
<td>Variantes de recorte de una pieza aprobada</td>
<td>Ninguno</td>
<td>No se regenera: se recorta el maestro. Regenerar cambia la imagen</td>
</tr>
<tr>
<td>Pieza con texto rotulado (banners)</td>
<td>Ninguno de los dos para el texto</td>
<td>El rótulo se compone en diseño sobre el fondo generado. El texto nunca se delega al motor</td>
</tr>
</table>
<callout icon="🧪" color="yellow_bg">
	**Este criterio es una hipótesis de arranque, no un dato cerrado.** Se valida con las primeras piezas del Artículo 1: si un motor rinde mejor de lo esperado en un caso, se corrige esta tabla y se anota la fecha. No se cambia en silencio.
</callout>
## Dirección de estilo · D aprobada
**Actualización del <mention-date start="2026-10-06"/>.** Aplicar a las fotos editoriales el estándar elegido por Julio Reyes: la variante D del Reloj de Flores. Consultar el ejemplo visual y la definición completa en <mention-page url="https://app.notion.com/p/cbf3b2942bf74f5784f4105881ed1f6d"/>.
- **Producir desde el POV del viajero:** cámara desde una posición accesible durante el recorrido, como una foto espontánea tomada por quien está allí; no una imagen externa del viajero posando.
- **Abrir luz y sombras:** buscar exposición luminosa y detalle en zonas oscuras sin quemar altas luces. Conservar hora, clima y atmósfera del relato; una escena de garúa puede ser luminosa sin convertirse en soleada.
- **Limpiar la colorimetría:** color natural y luminoso, balance de blancos coherente y contraste moderado. Evitar gris apagado, sobresaturación, HDR y filtro publicitario.
- **Incluir siempre un elemento contextual muy cercano al lente y muy fuera de foco:** preferir vegetación u otro objeto plausible del lugar, entrando por un borde o esquina, sin tapar el protagonista distante nítido. No repetir rosas por fórmula ni inventar objetos ajenos a la escena.
- **Simular desenfoque óptico convincente:** transición de nitidez coherente con distancias, contornos suaves y masas de color orgánicas; altas luces desenfocadas naturales cuando existan. No pedir círculos de bokeh decorativos ni añadir un borrón plano, franja gaussiana, halo o máscara.
- **Admitir personas en acciones espontáneas:** caminar, observar, conversar o tomar una foto. No exigir que todas estén de espaldas o desenfocadas. Evitar poses, miradas dirigidas al lente y vestuario coordinado; conservar las restricciones sobre rostros en primer plano y personas reales identificables.
**No confundir aprobación de estilo con aprobación de entrega.** D es una referencia generada con IA, no evidencia geográfica ni una pieza lista para publicar. Mantener REF real, QA, revisión y export según el flujo. No imponer este recurso a rótulos o infografías.
## Registro E · Fotografía de viaje inmersiva en POV
**Incorporado el <mention-date start="2026-10-08"/> por instrucción de Julio Reyes.** Registro adicional al D aprobado. Desarrolla la dirección de experiencia aceptada en las seis pruebas POV de Carretera Austral, Cancún y Río de Janeiro, y le suma el tratamiento de luz, color y profundidad de D.
**Definición:** una foto tomada por alguien que está participando del viaje, con compañeros absorbidos en una actividad concreta. La escena transmite qué se está viviendo, cómo se relacionan las personas con el lugar y desde dónde participa quien fotografía. La experiencia conduce el encuadre; vestuario, piel y acabado sostienen su credibilidad.
### Cómo elegir entre D y E
<table header-row="true">
<tr>
<td>Registro</td>
<td>Qué conduce la foto</td>
<td>Cuándo elegirlo</td>
</tr>
<tr>
<td>**D · Observación del lugar**</td>
<td>El sitio o detalle narrado, observado desde una posición accesible del viajero. Admite personas espontáneas como ya define D</td>
<td>El ancla del artículo describe observar, descubrir o detenerse ante un lugar</td>
</tr>
<tr>
<td>**E · Participación en la experiencia**</td>
<td>Una actividad o momento compartido, visto por un viajero que participa. Persona, gesto, objeto y entorno explican la experiencia</td>
<td>El ancla del artículo relata una acción vivida: caminar un sendero, remar, entrar al agua, jugar o descansar con compañeros</td>
</tr>
</table>
D mantiene su definición y uso existentes. **E hereda el acabado de D y agrega dirección de experiencia; no es una nueva paleta de marca ni una nueva familia de entregables.** Se registra la elección en la tarea y en el prompt. Si el artículo fija el registro, se respeta. Elegir E no autoriza a agregar una aventura, un servicio, una embarcación o un compañero que cambie el contenido de la spec.
### 1. Cámara dentro de la experiencia
- **Participación físicamente creíble:** declarar qué está haciendo quien fotografía y dónde está la cámara. Sentado en otro kayak, siguiendo a un compañero por el sendero, caminando en la orilla o sentado a su lado en la playa. La altura y la perspectiva nacen de esa posición.
- **Lenguaje de teléfono de última generación:** encuadre angular moderado, perspectiva natural y entorno legible. Una equivalencia aproximada de 28–35 mm puede orientar el encuadre; no es EXIF real ni una exigencia de cámara profesional. Evitar distorsión extrema, rostro estirado en el borde y compresión de retrato que borra el destino.
- **Encuadre espontáneo con intención:** asimetría ligera, persona fuera del centro cuando ayude a leer la actividad y espacio hacia la acción. No inclinar el horizonte ni mutilar manos por fórmula para simular espontaneidad.
- **Presencia del viajero:** una mano, manga, rodilla o parte del equipo puede aparecer si corresponde a lo que hace. Debe tener escala y ubicación plausibles y aportar participación, no convertirse en un prop gigante. No es obligatorio mostrar partes del cuerpo en todas las fotos.
### 2. Microescena: acción, consecuencia y atención
**Antes de escribir el prompt, completar:** quién hace qué, en qué instante, con qué apoyo u objeto, qué consecuencia visible produce y hacia qué dirige su atención.
- **Una acción principal por imagen.** Un remo entra al agua y deja una pequeña estela; una ola llega al tobillo y provoca un paso; una persona agarra la baranda mientras avanza. El gesto debe tener causa y contacto visibles.
- **Momento intermedio:** capturar una transición, reacción o pausa ligada a la actividad. Evitar terminar en una persona inmóvil sosteniendo un objeto hacia el lente.
- **Compañeros con agencia:** participan en el mismo viaje; no se convierten en vendedores, anfitriones o personal de servicio por sostener una bebida. Especificar el rol si el motor tiende a confundirlo.
- **Expresión ligada a lo que ocurre:** concentración al apoyar un pie, risa al recibir una ola, atención a una pelota o descanso mirando el mar. No imponer la misma sonrisa en toda la tanda.
- **Prueba de experiencia:** al mirar la foto debe poder explicarse qué ocurre y por qué la cámara está ahí. Una persona bien vestida junto a un paisaje no basta para definir E.
### 3. Personas y lujo discreto
**Casting de este registro:** compañeros adultos ficticios, de mayor capacidad económica, con aspecto cotidiano y cuidado. Mantener la diversidad pertinente a la escena; capacidad económica no se deduce de color de piel, edad, facciones, delgadez ni apariencia de celebridad.
- Expresar calidad mediante confección, caída del lino o algodón, prendas técnicas bien ajustadas, equipo cuidado y accesorios discretos, sin logos. El contexto y el equipo deben estar permitidos por el relato.
- Vestuario individual y funcional para clima y actividad; sin coordinar a todos como un catálogo. Tela, pelo y postura responden al viento, al agua, al peso y al movimiento.
- Mostrar cuerpo completo, tres cuartos o plano medio contextual según la acción. **Conservar la prohibición de rostros en primer plano y de personas reales identificables generadas con IA.** Un rostro ficticio legible dentro de una escena amplia no convierte la pieza en un retrato.
- Mantener uno o pocos compañeros cercanos y una escala coherente para las demás personas. No llenar el fondo con caras diminutas artificialmente detalladas.
- El lujo discreto es un criterio de casting y materiales dentro de E; no autoriza promesas sobre el producto SKY, servicios o destinos, ni vuelve exclusivo el resto del blog.
### 4. Miradas con un objetivo real
**Cada persona relevante tiene un punto de fijación declarado:** la ola visible, el siguiente apoyo, la pelota, la ruta de navegación o el interlocutor que corresponde al relato. El prompt describe ese objetivo y su relación espacial con la cabeza y los ojos.
- Cuando se ven ambos ojos, sus direcciones deben ser compatibles con un mismo objetivo y distancia. Para un objeto cercano, convergencia natural; para un objetivo lejano, orientación compatible con la distancia. No exigir pupilas perfectamente centradas ni miradas simétricas de muñeca.
- Cabeza, párpados y ojos acompañan la acción. Conservar iris y pupilas normales, exposición ocular natural y reflejos compatibles con las fuentes de luz; los reflejos no tienen que ser copias idénticas.
- Rechazar un ojo hacia el objeto y el otro hacia otro lado, pupilas descentradas sin causa, mirada perdida en un punto vacío o iris lechosos. **La solución no es dirigir la mirada al lente:** se corrige la relación con el objetivo de la microescena.
- Un perfil puede ocultar naturalmente el ojo lejano; una risa puede entrecerrar los ojos. Eso es válido si corresponde al gesto. No forzar todos los rostros de espaldas, taparlos con accesorios ni cerrar los ojos como recurso para esconder fallas.
- Revisar la mirada al 100 % y también en el cuadro completo. Si el ojo parece correcto ampliado pero no apunta a lo que la persona está haciendo, la escena falla. Con ojos ocultos no se declara verificada la dirección de ambas pupilas.
### 5. Piel y presencia humana
- Piel natural, flexible y del tono de la persona, con textura fina e irregular a la escala que resuelve la toma. Conservar variación de edad y rasgos; no agregar arrugas, manchas o poros marcados como sustituto del realismo.
- Luz sobre cara y cuerpo coherente con sombra, cielo, arena o agua de la escena. Evitar brillo plástico, maquillaje de catálogo, suavizado de belleza, grietas, cuadrículas de poros y microcontraste agresivo.
- Pelo, pestañas, barba, dientes y uñas se revisan por forma y escala; no deben leerse como dibujo, lámina o patrón repetido. No pedir detalle microscópico para caras pequeñas.
- Si se necesita continuidad entre fotos o el rostro deriva, usar una **ancla de identidad ficticia** con piel y proporciones revisadas. La ancla sostiene identidad; la escena determina postura, gesto, luz y ropa. No copiar la pose ni el fondo del retrato de anclaje, ni convertir la foto final en primer plano.
- Revisar la salida nativa y la exportación; más píxeles o más nitidez no demuestran mejor piel. Registrar resolución y calidad reales del motor, sin inventar EXIF ni atribuir defectos universales a una resolución. Mantener el flujo de maestro y entrega de esta skill.
### 6. Colorimetría y luz heredadas de D
**Aplicar el mismo acabado natural, limpio y luminoso de D.** El nuevo registro cambia la relación con la experiencia, no el tratamiento de color ya aprobado.
- Exposición luminosa y sombras abiertas con volumen; conservar detalle en cielo, espuma y prendas claras. Abrir sombras no significa aplanar toda la imagen ni simular HDR.
- Balance de blancos coherente con hora, clima y luz del relato. Bajo garúa, mantener garúa; en sombra de una sombrilla, mantener sombra. No convertir el momento en atardecer, inventar sol ni reemplazar cielo.
- Piel fiel y materiales reconocibles: lino blanco o marfil conserva textura; agua turquesa mantiene variación; vegetación no se vuelve fluorescente. No aclarar la piel para volverla “premium”.
- Contraste moderado, saturación contenida y negros con detalle. Evitar dominante gris apagada, filtro naranja y turquesa, tonos de postal, publicidad de resort o color de marca impuesto al paisaje.
- Grano leve sólo cuando sea compatible con la luz y el lenguaje de teléfono; no ruido añadido para fabricar autenticidad. El manual de marca sigue sujeto a la definición existente, no se inventa una LUT o paleta SKY desde estas pruebas.
**Dirección de acabado ensayada en E:**
- Corregir el color dominante por material, no con una desaturación global. Agua y cielo pueden necesitar menos cian sin quitarle vida a la piel o cambiar el lino. En calle, conservar diferencias entre pintura, ladrillo, vegetación y luz reflejada; evitar que todo el entorno tome el mismo tono.
- Conservar transiciones suaves en altas luces: espuma, tela clara y pared iluminada mantienen volumen y textura. No contornear cada burbuja ni endurecer cada grieta con claridad o enfoque. Detalle fino no equivale a microcontraste alto.
- La luz orienta la mirada: piel, gesto y contacto se leen sin sobreiluminar artificialmente al compañero. Abrir sombras mantiene separación y dirección de luz; no añade una capa blanca sobre los negros.
- Comparar cuadro completo, tamaño de entrega y detalle nativo. Si el paisaje destaca por saturación o textura mientras la experiencia se pierde, ajustar la jerarquía. No fijar una reducción universal de saturación, una LUT ni una paleta SKY a partir de estas pruebas.
### 7. Bokeh y tres planos heredados de D
**E conserva el primer plano contextual muy cercano y muy fuera de foco obligatorio en las fotos editoriales.** Su origen debe ser natural para la experiencia y el encuadre.
1. **Plano cercano:** elemento real a pocos centímetros del lente, entrando por borde o esquina. Puede ser vegetación, borde próximo de equipo o un detalle del propio viajero cuando corresponda. Muy desenfocado con contornos suaves y masas de color orgánicas; escala normal.
2. **Plano de la experiencia:** compañero, gesto, apoyo u objeto principal nítidos según el punto focal. Ojos y manos relevantes se leen a la escala de la foto. El elemento cercano no tapa contacto, mirada ni información crítica.
3. **Plano del destino:** entorno reconocible, con detalle suficiente para comprender dónde ocurre la experiencia. La nitidez cae de forma plausible con distancia; no se disuelve todo el paisaje como fondo de retrato.
**El bokeh proviene de las distancias y del foco.** Altas luces desenfocadas sólo si existen fuentes que las justifiquen. No pedir círculos decorativos, bandas gaussianas, borrones pegados, halos ni máscaras. No atribuir desenfoque extremo de fondo a una toma móvil amplia por escribir una apertura ficticia.
**Si el primer plano necesario no es plausible sin cambiar la escena, escalar la composición**, como en D. No inventar flores, manos, rodillas o equipo para cumplir una casilla. Validar que el recurso funciona en artículo, OG y cuadrado cuando correspondan, sin cortar el objeto que explica la mirada o la acción.
**Jerarquía óptica:** el primer plano aporta presencia, el gesto concentra la lectura y el destino ubica el viaje. No pedir la misma nitidez para todas las ventanas, personas y superficies. La pérdida de detalle y contraste depende de distancia, escala y atmósfera, sin borrar formas geográficas. No imponer un porcentaje de área borrosa: revisar que el elemento próximo sea plausible, periférico y secundario.
### Pruebas de dirección fotográfica E
Ensayo realizado el <mention-date start="2026-10-08"/> con **`gpt-image-2.5-sunburst`****, calidad ****`max`****, maestros nativos 3840 × 2160**. Se inspeccionaron cuadro completo, recortes nativos de rostro/contacto y exportes 1408 × 768 WebP inferiores a 200 KB. Estos parámetros describen la prueba, no una exigencia universal para todos los motores.
**Hallazgos aplicables:** en Austral y Cancún, el acabado V02 reduce el cian dominante y el microcontraste de roca/espuma sin desaturar globalmente la piel ni fabricar desenfoque. La mejora es moderada. En las tres nuevas locaciones se ensayaron pausa, interacción y observación con primer plano contextual; no se exige la misma acción ni sonrisa en toda la tanda.
- **Valparaíso · V02:** pausa en una subida junto al puerto, mano apoyada en baranda y atención hacia la bahía. La corrección elimina marcas legibles en contenedores y relaja el brazo en cadera. La casa fotografiada es Casa Cuatro Vientos, Cerro Artillería: el título de la página de referencia no basta para acreditar el barrio; contrastar los píxeles y la ubicación.
- **Miami Beach · V01:** dos compañeros en una terraza de Española Way; una servilleta levantada explica el contacto de los dedos y la atención a la mesa. Ojos entrecerrados por expresión: no se certifican ambas pupilas. Dos llamadas de afinado no devolvieron imagen por fallas del servicio; no se atribuye a V01 la mejora de ojos intentada.
- **Buenos Aires · V01:** pausa caminando por la vereda de Diagonal Norte, solapa sujeta y mirada hacia el ápice del Obelisco. Revisar la relación cabeza/ojo visible/objetivo en el cuadro, no sólo la forma del ojo ampliado.
**Límites de validación:** los perfiles ocultan naturalmente el ojo lejano y no acreditan convergencia binocular. Una edición generativa redibuja detalles y exige repetir QA. La imagen D original no estuvo accesible en este ensayo: se aplicaron sus criterios escritos, **sin afirmar igualación visual exacta**. Estas pruebas no modifican la aprobación existente de D ni constituyen aprobación del operador, de Marca o autorización de publicación.
**REF geográficas reales del ensayo:** [Chile Travel](https://chile.travel/atractivos/cerro-alegre-y-concepcion/), contrastada con [Paseo 21 de Mayo · Chile es TUYO](https://chileestuyo.cl/destacado/paseo-21-de-mayo/); [Española Way · turismo oficial de Miami](https://www.miamiandbeaches.com/things-to-do/history-and-heritage/inside-miamis-historic-spanish-village); [Obelisco · Turismo Buenos Aires](https://turismo.buenosaires.gob.ar/es/otros-establecimientos/obelisco). Se usaron para fidelidad, no para copiar personas. La referencia sintética E de acabado no sustituye REF-ESTILO-D ni acredita geografía. Permisos comerciales de las fotos fuente sin verificar: ensayo interno; para publicación, resolver derechos y la spec del artículo.
<details>
<summary>Evidencia visual del ensayo · comparativas y nuevas locaciones</summary>
	**Austral: V01 arriba; V02 abajo.** Comparación de color y contraste, misma escena.
	![](notion-file-block://950a5d24-21d5-4ccc-91ca-aab9e674a447/31f07f77-958f-4b5b-905c-1b09f532b585?space_id=d1de7cb1-0325-4b73-a4d3-f266ae396f15&name=SKY-E-austral-comparacion-V01-V02.jpg)
	**Cancún: V01 arriba; V02 abajo.** Agua, espuma y volumen de piel conservados.
	![](notion-file-block://b92904fc-298a-4b88-acaf-257c5d834663/45b3de96-5ff7-4d23-a181-15206bddc7e8?space_id=d1de7cb1-0325-4b73-a4d3-f266ae396f15&name=SKY-E-cancun-comparacion-V01-V02.jpg)
	**Valparaíso · V02 · pausa frente al puerto.** Prueba para revisión.
	![](notion-file-block://29617c32-90c2-4698-8921-1c9fdfe56613/9ed0c986-7283-41b1-bda8-e371b6050b5a?space_id=d1de7cb1-0325-4b73-a4d3-f266ae396f15&name=SKY-E-Valparaiso-prueba.webp)
	**Miami Beach · V01 · una servilleta al viento.** Prueba para revisión; no afinado ocular verificado.
	![](notion-file-block://1bcb1117-22bf-49f1-93f3-d629529d2008/130c9f71-d931-4528-b1eb-244873a87fa7?space_id=d1de7cb1-0325-4b73-a4d3-f266ae396f15&name=SKY-E-Miami-prueba.webp)
	**Buenos Aires · V01 · caminata frente al Obelisco.** Prueba para revisión.
	![](notion-file-block://eadc4c5e-c739-43ce-92ef-f9cc3204b2c3/bd86eda4-e7c3-44f9-a227-c2c5c71074ff?space_id=d1de7cb1-0325-4b73-a4d3-f266ae396f15&name=SKY-E-Buenos-Aires-prueba.webp)
</details>
### 8. Construcción y continuidad de una tanda
1. Leer la spec y elegir D o E por el ancla editorial; registrar esa decisión.
2. Definir microescena, posición del fotógrafo, gesto, contacto físico y objetivo de mirada.
3. Resolver tres planos, distancia visual y foco; proteger el destino y la información que explica la acción.
4. Cargar REF reales para fidelidad del lugar; mantener aparte la referencia de estilo y, si hace falta, la ancla ficticia de identidad.
5. Escribir base y negativo con el tratamiento D; producir con motor/modelo autorizado y verificable.
6. Revisar al 100 % piel, ojos, manos, apoyos y profundidad; revisar después lectura completa, móvil y recortes. Si falla el punto focal, aplicar la regla vigente de regeneración y máximo de tres intentos; este registro no abre una excepción.
	- Para ensayar acabado, comparar una edición con su versión anterior conservando escena, identidad, clima y acción. Una edición generativa puede redibujar facciones, manos o arquitectura: volver a revisar anatomía, mirada y geografía. No presentarla como etalonaje que sólo cambia píxeles de color. Cada intento cuenta dentro del límite de la pieza.
	- REF-ESTILO-D visual es la referencia de comparación cuando sus píxeles están disponibles. Si sólo se pudo leer su descripción, registrar esa limitación: cumplir criterios escritos no acredita una igualación exacta ni aprobación de Marca.
7. Mantener identidad, ropa cuando sea el mismo momento, objetos, clima y secuencia del itinerario. Variar acciones y composición sin convertir cada toma en la misma persona presentando un objeto. Exportar y entregar por el flujo vigente.
### Ejemplos de microescena E
Son guías de acción; sólo se usan si coinciden con el artículo y con REF del lugar.
- **Kayak:** cámara del viajero desde otro kayak; compañero remando y mirando la ruta; borde próximo desenfocado, pala y contacto con agua legibles, paisaje reconocible.
- **Sendero:** cámara siguiendo a un compañero; paso en curso y mirada hacia el apoyo real; vegetación próxima fuera de foco, baranda y camino legibles.
- **Orilla:** ola que provoca una reacción; atención dirigida a la espuma, ropa y pies responden al agua; elemento contextual cercano desenfocado sin tapar la acción.
- **Juego o descanso:** mirada hacia la pelota visible o hacia la rompiente compartida; interacción o pausa con sentido, no presentación de bebida al lente.
**Alcance de las pruebas aprobadas:** las seis exploraciones definen participación, espontaneidad y dirección humana. No se declaran piezas del Blog SKY listas para publicar: no todas incorporan el primer plano muy desenfocado de D y no sustituyen REF geográficas ni QA. Las siguientes piezas E deben integrar el tratamiento D completo.
<details>
<summary>Plantilla E · experiencia + tratamiento D</summary>
	```markdown
BASE
Fotografía horizontal con lenguaje de teléfono de última generación, desde el POV de [qué hace quien fotografía], a [altura y posición accesible], en [lugar exacto respaldado por REF real]. Registro E: fotografía de viaje inmersiva; momento espontáneo de [acción narrada por el artículo].
[Compañero adulto ficticio y vestuario funcional de calidad discreta] está [gesto y fase de la acción], con [contacto/apoyo correcto] y [consecuencia visible]. Su atención se dirige a [objetivo concreto y ubicación]; cabeza y ambos ojos visibles coinciden con ese objetivo y su distancia. [Expresión ligada a la acción]. Sin mirar al lente, posar ni presentar un objeto a cámara; sin rostro en primer plano.
Muy cerca del lente, [elemento contextual validado] entra por [borde/esquina], muy fuera de foco con transición óptica natural, contornos suaves y masas de color orgánicas. No tapa [contacto, mirada y punto focal]. Plano de experiencia nítido en [gesto/objeto principal]. Detrás, [destino y formas que deben conservarse] sigue reconocible, con profundidad plausible.
[Hora y clima del relato], exposición luminosa, sombras abiertas con volumen, altas luces conservadas. Tratamiento D: color natural limpio y luminoso, balance de blancos coherente, contraste moderado, tono de piel fiel, sin HDR ni filtro publicitario. Piel fotográfica de textura fina e irregular a la escala de la toma, sin detalle exagerado. Acabado: controlar [material que domina por color] sin alterar piel ni vestuario; transiciones suaves en [altas luces relevantes], negros con detalle y volumen. Nitidez concentrada en [gesto/contacto]; [destino lejano] conserva formas y pierde detalle fino de manera gradual. Sin claridad agresiva ni enfoque uniforme en todos los planos.
Encuadre angular moderado, ligera asimetría y espacio hacia la acción; perspectiva y escala coherentes con la participación del fotógrafo. Generar maestro horizontal de mayor resolución; entrega posterior 1408 × 768, 11:6. Proteger [punto focal, objetivo de mirada y elemento cercano] y validar aparte cada recorte requerido.
NEGATIVO
texto, letreros legibles, logos, marca de agua, cielo reemplazado, HDR exagerado, vista aérea o de dron, personas posando o mirando a cámara, rostros en primer plano, personas reales identificables, vestuario coordinado de catálogo, presentación de objetos al lente, mirada perdida, ojos divergentes respecto del mismo objetivo, iris lechosos, piel plástica, filtro de belleza, cuadrículas de poros, microcontraste agresivo, manos deformes, apoyos imposibles, objetos duplicados, color de postal, luz de estudio, exposición apagada, altas luces quemadas, borrón gaussiano plano, franjas superpuestas, halos, máscaras visibles, bokeh decorativo artificial, acción o destino irreconocibles por desenfoque, primer plano que tapa el punto focal, [prohibiciones de la pieza].
	```
</details>
## Cómo se escribe el prompt
Siempre en dos partes. El **base** describe; el **negativo** prohíbe. **Registrar el registro elegido.** La tabla y la plantilla siguientes conservan el registro D; para E usar la plantilla de experiencia anterior, manteniendo todas las reglas comunes de motor, fidelidad, entrega y revisión.
<table header-row="true">
<tr>
<td>El base lleva, en este orden</td>
<td>Ejemplo del Artículo 1</td>
</tr>
<tr>
<td>Tipo de foto y dispositivo</td>
<td>“Fotografía horizontal tomada con un teléfono de última generación”</td>
</tr>
<tr>
<td>Altura y posición de cámara</td>
<td>“a la altura de los ojos, desde la vereda”</td>
</tr>
<tr>
<td>Lugar exacto</td>
<td>“frente a la Huaca Pucllana, Miraflores, Lima”</td>
</tr>
<tr>
<td>Primer plano cercano, protagonista y fondo</td>
<td>“\[elemento contextual validado en la spec\] a pocos centímetros del lente, muy fuera de foco en una esquina; la pirámide de adobe nítida; detrás, edificios de 8 a 12 pisos completos”</td>
</tr>
<tr>
<td>Punto focal y composición</td>
<td>“el cruce entre el adobe y los edificios en el tercio central”</td>
</tr>
<tr>
<td>Hora, clima y exposición</td>
<td>“mañana nublada de garúa, cielo gris uniforme, luz difusa luminosa, sombras abiertas y altas luces conservadas; sin inventar sol”</td>
</tr>
<tr>
<td>Gente y acción</td>
<td>“visitantes caminando u observando el lugar espontáneamente, sin poses ni miradas dirigidas al lente; sin rostros en primer plano ni personas reales identificables”</td>
</tr>
<tr>
<td>Estética</td>
<td>“foto espontánea desde el POV del viajero, color natural luminoso, contraste moderado, desenfoque óptico convincente en el elemento cercano, protagonista distante nítido, grano leve”</td>
</tr>
<tr>
<td>Proporción de entrega y recortes</td>
<td>“maestro horizontal de mayor resolución, para entrega 1408 × 768 (11:6); punto focal protegido y cada recorte requerido validado por separado”</td>
</tr>
</table>
**El negativo mínimo de toda pieza:** texto, letreros legibles, logos, marca de agua, cielo reemplazado, HDR exagerado, vista aérea o de dron, personas posando o mirando a cámara, rostros en primer plano, color saturado tipo postal, luz de estudio. En fotos editoriales agregar: exposición apagada, altas luces quemadas, borrón gaussiano plano, franja de desenfoque superpuesta, halos o máscaras visibles, objetos duplicados, bokeh decorativo artificial, protagonista borroso, primer plano que tapa el punto focal. Sumar las prohibiciones propias de la pieza.
<details>
<summary>Plantilla de prompt lista para copiar</summary>
	```markdown
BASE
Fotografía horizontal tomada con un teléfono de última generación, [altura de cámara] desde [posición], en [lugar exacto, barrio, ciudad, país].
La cámara ocupa la posición del viajero durante el recorrido; toma espontánea, no una sesión publicitaria.
Muy cerca del lente: [elemento real y contextual] a pocos centímetros, entrando por [borde/esquina], muy fuera de foco, con contornos suaves y masas de color orgánicas. Desenfoque óptico convincente, transición coherente con la distancia y altas luces desenfocadas naturales si existen; no un borrón superpuesto.
Protagonista distante y nítido: [qué]. Detrás: [qué], [condición que no se puede perder].
Punto focal: [elemento] en el [tercio] del cuadro, sin quedar tapado por el elemento cercano.
[Hora del día] con [clima y luz real, la misma que dice el texto]; exposición luminosa, sombras abiertas y detalle en zonas oscuras, altas luces conservadas. No cambiar la hora, inventar sol ni reemplazar el cielo; sin sol directo en el lente.
Personas, si corresponde: [acción espontánea]; sin poses ni miradas dirigidas al lente, sin rostros en primer plano ni personas reales identificables. No es obligatorio que todas estén de espaldas o fuera de foco.
Estética documental desde el POV del viajero, no publicitaria: color natural, limpio y luminoso, balance de blancos coherente, contraste moderado, grano leve, ligera imperfección de encuadre. Referencia de estilo D; no copiar su geografía ni sus objetos.
Generar un maestro horizontal de mayor resolución; entrega posterior del artículo: 1408 × 768 px, relación 11:6, no resolución nativa exigida al motor. Mantener [elemento crítico] protegido y comprobar por separado los encuadres de artículo, OG 1200 × 630 y cuadrado 1080 × 1080 cuando la pieza sea la base 🔁; el margen del 7,5 % no garantiza todos los recortes.

NEGATIVO
texto, letreros legibles, logos, marca de agua, cielo reemplazado, HDR exagerado, vista aérea o de dron, personas posando o mirando a cámara, rostros en primer plano, color saturado tipo postal, luz de estudio, exposición apagada, altas luces quemadas, borrón gaussiano plano, franja de desenfoque superpuesta, halos o máscaras visibles, objetos duplicados, bokeh decorativo artificial, protagonista borroso, primer plano que tapa el punto focal, [prohibiciones propias de la pieza].
	```
</details>
## Reglas que no se negocian al generar
- **La IA es el medio, no el estilo.** El resultado tiene que leerse como una foto tomada desde el POV del viajero con teléfono: luminosa, natural, con profundidad óptica y acciones espontáneas. Si se nota generada o producida como publicidad, se rechaza.
- **El primer plano cercano no se resuelve con un borrón añadido.** Mantener el protagonista nítido y el elemento contextual muy fuera de foco, sin obstrucciones, halos ni máscaras. Si no es plausible en la escena, escalar; no cambiar el relato para cumplir el recurso.
- **Nada reconocible generado:** ningún rótulo legible de un negocio real, ningún logo de terceros, ningún rostro identificable. **Nada de cabinas, aviones ni uniformes SKY**: eso es una afirmación sobre el producto, no ambientación. Tabla completa de casos en la <mention-page url="https://app.notion.com/p/cbf3b2942bf74f5784f4105881ed1f6d"/>.
- **La IA no inventa geografía.** Si el artículo nombra un sitio real, tiene que ser reconocible para alguien que lo conoce.
- **Nada de texto dentro de la imagen.** Si la pieza necesita un rótulo para funcionar, es un banner y se compone en diseño.
- **No se cambia la escena para que el motor la resuelva más fácil.** La escena la decidió el artículo. Si no sale, se escala; no se reemplaza por una postal genérica.
## QA de artefactos antes de subir
**Control adicional en E:** comprobar acción, apoyo, piel natural y dirección de mirada al 100 % y en el cuadro completo. Cabeza y ojos visibles deben orientarse hacia el mismo objetivo de la microescena; rechazar iris lechosos, ojos divergentes o una atención sin relación con el gesto. No corregir dirigiendo al lente ni ocultando sistemáticamente rostros. Revisar que ropa y equipo transmitan calidad discreta sin convertir la escena en catálogo. Mantener el tratamiento D de luz, color y bokeh y las reglas de rechazo y máximo de tres intentos.
**Control de acabado en E:** comparar piel, blancos materiales y color dominante con la versión anterior; confirmar luminosidad sin negros lechosos, sobresaturación ni microcontraste uniforme. Comprobar los tres planos en el cuadro completo y en la exportación. Después de cualquier edición generativa, repetir anatomía, atención y fidelidad del lugar. Registrar qué ojos y contactos son realmente visibles; no certificar elementos ocultos.
Se revisa al 100 % de zoom, en este orden:
<table header-row="true">
<tr>
<td>Qué</td>
<td>Falla típica</td>
</tr>
<tr>
<td>Manos</td>
<td>Dedos de más, dedos fundidos, escala equivocada respecto al objeto</td>
</tr>
<tr>
<td>Arquitectura</td>
<td>Líneas que se curvan, ventanas que no siguen el ritmo del edificio, pisos que cambian de altura</td>
</tr>
<tr>
<td>Texturas</td>
<td>Adobe, fruta o ladrillo con patrón repetido idéntico</td>
</tr>
<tr>
<td>Letreros</td>
<td>Texto que parece legible y no lo es. Es el artefacto que más se cuela porque de lejos se ve bien</td>
</tr>
<tr>
<td>Sombras</td>
<td>Dirección que no coincide con la luz declarada en el prompt</td>
</tr>
<tr>
<td>Fidelidad</td>
<td>Elementos del lugar que no existen, o la forma del monumento alterada</td>
</tr>
<tr>
<td>Personas y rostros</td>
<td>Poses, miradas dirigidas al lente, rostros en primer plano o personas reales identificables; no rechazar una escena solo porque incluya personas</td>
</tr>
<tr>
<td>Profundidad y bokeh</td>
<td>Borrón gaussiano plano, franjas superpuestas, halos, duplicaciones, máscaras visibles, primer plano demasiado nítido o que tapa el protagonista, sujeto distante borroso</td>
</tr>
<tr>
<td>Luz y color</td>
<td>Exposición apagada, sombras empastadas, altas luces quemadas, dominante gris artificial, HDR, sobresaturación o luz incompatible con hora y clima</td>
</tr>
</table>
<callout icon="⛔" color="red_bg">
	**Un artefacto visible en el punto focal es motivo de rechazo, no de retoque.** Se regenera. Retocar un punto focal mal generado deja una pieza que se cae cuando alguien la mira de cerca, y la portada se mira de cerca.
</callout>
**Si después de tres intentos la pieza no cumple**, se detiene: se anota en la tarea qué falla, se pasa a `Bloqueado` y se escala. No se entrega una versión “más o menos”.
## Post-proceso y entrega
1. **Generar el maestro** en el formato horizontal más grande que ofrezca el motor. No se genera directo a 1408 × 768.
2. **Recortar a 1408 × 768** respetando el punto focal y la zona segura del 7,5 % por lado. Verificar que el elemento cercano siga dando profundidad sin tapar el protagonista; corregir exposición y balance de blancos con moderación, sin aplicar desenfoque plano para fabricar el bokeh.
3. **Derivar las variantes** desde el mismo maestro, nunca regenerando: 1200 × 630 para newsletter y OG, 1080 × 1080 para reuso interno. Solo la pieza marcada 🔁 lleva variantes. Validar por separado los encuadres de artículo, OG y cuadrado, incluyendo protagonista y primer plano: el margen del 7,5 % no garantiza todos los recortes.
4. **Exportar a ****`.webp`** con calidad cerca de 80 y verificar que quede bajo 200 KB. Si no baja, se reduce calidad antes que resolución.
5. **Nombrar el archivo** exactamente como dice la spec. El nombre es descriptivo y nunca se usa como ALT.
6. **Copiar el ALT literal** del artículo. Tiene que ser idéntico en el callout, en las notas para Dev y en WordPress.
7. **Carga:** la portada va **sin** `loading="lazy"` porque es el LCP. El resto, con lazy.
8. **Subir a **[**Frame.io**](http://Frame.io) para revisión por versión. Aprobado, se carga en WordPress.
<details>
<summary>Conversión y chequeo de peso por línea de comandos</summary>
	```bash
# recorte centrado a 1408x768 y export webp
magick maestro.png -resize 1408x768^ -gravity center -extent 1408x768 -quality 80 pieza.webp

# variante newsletter / OG
magick maestro.png -resize 1200x630^ -gravity center -extent 1200x630 -quality 80 pieza-1200x630.webp

# verificar peso
ls -lh pieza*.webp
	```
</details>
## Qué se registra en la tarea
**Registrar D · observación o E · experiencia.** Para E, anotar el ancla del artículo, participación y posición de quien fotografía, acción/instante, contacto físico, objetivo de mirada y tres planos con tratamiento D aplicado. Separar REF-ESTILO-D, referencia de experiencia, ancla de identidad ficticia si se usa y REF reales del lugar; las referencias sintéticas no acreditan geografía ni publicación.
Sin esto no se puede reproducir una variante ni defender una pieza:
<table header-row="true">
<tr>
<td>Campo</td>
<td>Qué se anota</td>
</tr>
<tr>
<td>Prompt final</td>
<td>Base y negativo, tal como se usó. Si cambió durante la producción, se actualiza</td>
</tr>
<tr>
<td>Motor/modelo y versión</td>
<td>ChatGPT Images 2.5 o Nano Banana Pro; registrar el nombre exacto y la versión verificables en la herramienta o interfaz. No inventar una versión si no está expuesta</td>
</tr>
<tr>
<td>Parámetros, semilla e ID de generación</td>
<td>Registrar parámetros y semilla si el motor los expone, junto con prompt, motor/modelo, versión y referencias. El ID aporta trazabilidad, no garantiza reproducción. Las variantes de recorte se derivan del maestro aprobado</td>
</tr>
<tr>
<td>Versión</td>
<td>`V01`, `V02`… La versión sube con cada regeneración entregada, no con cada intento</td>
</tr>
<tr>
<td>REF usadas</td>
<td>Separar REF-ESTILO-D (dirección fotográfica, generada con IA) de REF-01 y siguientes (fotos reales para fidelidad del lugar); registrar qué se cargó y de dónde salió</td>
</tr>
</table>
## Checklist antes de marcar `Listo para revisión`
- [ ] Registro D o E elegido según el ancla editorial y registrado en la tarea y el prompt
- [ ] Si es E: la cámara participa de la experiencia; acción, apoyos y expresión explican el momento, sin retrato de catálogo ni presentación al lente
- [ ] Si es E: cabeza y ojos visibles se orientan hacia el objetivo declarado; revisión ampliada y en el cuadro completo, sin ocultar defectos
- [ ] Si es E: piel natural y calidad discreta de ropa/equipo, con el tratamiento D completo de luz, color y primer plano muy desenfocado
- [ ] Si es E: gesto y contacto dominan la lectura; color por material, altas luces y nitidez por distancia revisados en maestro y exportación
- [ ] Si hubo edición generativa: identidad, anatomía, mirada y geografía revalidadas; comparación visual con D verificada o su limitación registrada
- [ ] La escena corresponde al callout de spec del artículo, no a una interpretación
- [ ] La luz coincide con la hora y el clima del texto; exposición luminosa, sombras abiertas y altas luces conservadas
- [ ] Color natural, limpio y luminoso, sin HDR, dominante gris artificial ni saturación de postal
- [ ] Primer plano contextual muy cercano al lente y muy fuera de foco; protagonista distante nítido y sin obstrucciones
- [ ] Desenfoque óptico convincente, sin borrón plano, franja gaussiana, máscaras, halos ni bokeh decorativo artificial
- [ ] Cámara desde el POV del viajero; si hay personas, acciones espontáneas sin poses ni miradas dirigidas al lente, sin exigir que todas estén de espaldas o desenfocadas
- [ ] Ningún letrero legible, logo de terceros ni rostro identificable
- [ ] Nada de cabina, avión ni uniforme SKY generado
- [ ] Lugar reconocible para alguien que lo conoce
- [ ] QA de artefactos hecho al 100 % de zoom, punto focal limpio
- [ ] 1408 × 768, `.webp`, menos de 200 KB
- [ ] Variantes 1200 × 630 y 1080 × 1080 solo si la pieza es la 🔁, derivadas del maestro
- [ ] Nombre de archivo y ALT idénticos a los del artículo
- [ ] Portada sin lazy; el resto con lazy
- [ ] Prompt, motor/modelo autorizado y versión verificables, referencias, parámetros y semilla/ID si existen registrados en la ficha; sin atribuciones no comprobadas
- [ ] Encuadres de artículo, OG y cuadrado validados por separado cuando correspondan, sin confiar solo en el margen del 7,5 %
- [ ] Subida a [Frame.io](http://Frame.io)
## Pendientes de esta skill
- [ ] Validar la tabla de motores con las primeras piezas del Artículo 1 y corregirla con fecha.
- [ ] Definir dónde se archivan prompts y semillas de las piezas aprobadas, fuera de la tarea.
- [ ] Confirmar con Marca si el uso de IA se declara en el blog.
- [ ] Armar el banco de REF de los lugares recurrentes de las rutas SKY.
- [ ] Confirmar con Dev si WordPress exige alguna variante distinta a 1408 × 768.