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
5. **Consultar la referencia de estilo D** en <mention-page url="https://app.notion.com/p/cbf3b2942bf74f5784f4105881ed1f6d"/>: Reloj de Flores con cantero de rosas muy fuera de foco y visitantes en escena. Separar REF-ESTILO-D de REF-01: la primera guía el lenguaje fotográfico; la segunda, con foto real, sostiene la fidelidad del lugar.
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
## Cómo se escribe el prompt
Siempre en dos partes. El **base** describe; el **negativo** prohíbe.
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
