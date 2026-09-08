# 18 · Revisión y respuesta de comentarios del cliente

> Procedimiento vigente desde el 2026-09-07, promovido del Playbook Producción y validado en los
> hilos de `Color y Resistencia para tus Exteriores`. Aplica a comentarios de Laboratorio Berel,
> negocio o sus contactos en cualquier artículo. Complementa los módulos 03, 04, 07 y 09; el
> módulo 08 entra solo si la pieza ya está publicada.

## Principio rector

Al cliente se le da la razón cuando la tiene. Cuando el diagnóstico es correcto pero la solución
propuesta dañaría claridad, voz, SEO/AEO, evidencia o el hilo conductor, se aplica una solución mejor y
se explica con respeto. **Nunca aceptar por aceptar ni discutir por defender el texto propio.**

## Incidente grave: notas internas visibles

La página completa es visible para Berel, pero el Playbook exige separar funciones. Los toggles hermanos de
Research, análisis SEO/AEO, análisis de contenido y Plan/Brief permanecen como evidencia profesional. El
incidente ocurre cuando notas de agente, razonamiento operativo, QA, pendientes o montaje CMS/Dev se cuelan en
el toggle de artículo, reescritura o tutorial y rompen la narrativa. Prompts, secretos, credenciales y
conversación cruda no pertenecen a ningún punto de la página. **Las fichas N1–N4 y fotos de paso son parte
obligatoria del entregable editorial y no se retiran durante el saneamiento.**

Un comentario que detecta una fuga es un **incidente centinela**:

1. detener la declaración de `En revisión` o cualquier aviso de pieza lista;
2. inventariar el hilo y la página completa para reconocer toggles de evidencia, versiones y zona editorial;
3. retirar del toggle editorial la operación ajena a la narrativa y trasladar cada dato a su toggle de evidencia
   o, si es sensible, a una tarea/página privada de Efeonce, sin mover ni reescribir N1–N4;
4. dejar una sola zona editorial vigente con metadatos aprobables, copy público exacto y las cuatro fichas
   visuales distribuidas junto a sus secciones; conservar intactos los toggles de evidencia;
5. rotular versiones anteriores como `Histórico` sin fingir que ese rótulo vuelve aceptable una fuga activa;
6. ejecutar el gate automatizado sobre el export completo y leer el render del toggle editorial como cliente;
7. responder el hilo sin narrar herramientas ni detalles internos del incidente.

Señales de alto riesgo incluyen `Dónde vive`, `Regla SEO`, `Montaje CMS`, `Schema para Dev`, `Nota de
adaptación`, `Nota de montaje`, `Pendientes antes de publicar`, `Control de corrección`, `no cargar al CMS`,
`pendiente de confirmación`, `la ficha declara` y cualquier mensaje dirigido a quien maquete o a otro agente.
ALT, archivo, formato, lazy-load y posición son correctos **dentro de una ficha N1–N4 completa**; fuera de ella
pueden revelar una nota operativa. La lista ayuda a detectar; **no reemplaza la lectura semántica**.

## Antes de editar: inventario completo

1. Leer la página actual y su estado; no trabajar desde una copia anterior.
2. Obtener **todos** los comentarios y respuestas, incluidos los hilos ya atendidos y los marcados como
   resueltos por el cliente. Los previews o marcadores visibles en el body pueden omitir respuestas y no
   sustituyen el inventario completo.
3. Leer cada hilo desde el comentario que lo originó hasta su última respuesta. Nada se responde suelto.
4. Clasificar cada hilo sin alterar su estado nativo en Notion:

| Estado operativo | Significado | Evidencia mínima |
|---|---|---|
| `nuevo` | no tiene decisión o acción de Efeonce | comentario completo leído |
| `atendido` | existe decisión, cambio cuando aplica, respuesta y readback | edición/decisión + respuesta + lectura fresca |
| `bloqueado` | falta dato, autorización, asset o definición del cliente | motivo, owner y siguiente paso |
| `fuera de alcance` | el hallazgo no pertenece al comentario ni a la revisión autorizada | reporte separado al operador |

`resolved` es una decisión del cliente y un dato separado. **No usarlo para inferir si Efeonce atendió el
hilo ni intentar llevar el contador de abiertos a cero.**

### Baseline de integridad de comentarios

Antes de cualquier edición, registrar por separado:

- número de **observaciones del cliente**, atribuidas por autor;
- conjunto de identificadores de discusión;
- número total de comentarios, incluidas las respuestas de Efeonce;
- estado `resolved` de cada hilo y tipo de ancla (`inline`, bloque o página).

Estos números no son intercambiables. Una observación puede compartir hilo con respuestas; un bloque eliminado
puede hacer desaparecer el ancla del inventario visible; una respuesta nueva aumenta comentarios sin aumentar
observaciones del cliente. El cierre compara identidad y estado de los hilos, no solo un total.

## Recuperación segura desde el historial de Notion

Usar el historial únicamente cuando una edición comprobada haya dañado la estructura, el contenido vigente o
las anclas. No recorrer versiones para “ver cuál funciona”.

1. Detener nuevas escrituras y conservar el baseline anterior a la falla.
2. Identificar por fecha y vista previa la última versión conocida que contenga el artículo correcto y las
   anclas esperadas.
3. Restaurar **una sola vez** esa versión.
4. Releer página y comentarios inmediatamente. La recuperación solo queda probada si reaparecen los
   identificadores esperados, sus autores y su estado `resolved`; el mensaje de éxito de Notion no basta.
5. Si el conjunto no coincide, detenerse: otra restauración a ciegas puede empeorar el incidente.
6. Con la base íntegra, aplicar reemplazos pequeños conservando los spans o `discussion-urls` existentes, las
   fichas N1–N4 y sus posiciones; releer los hilos y comparar las fichas carácter por carácter después de cada fase.

Si el cliente pidió retirar un bloque completo, el ancla puede desaparecer legítimamente. En ese caso se
conserva la observación y la decisión en un comentario de página apto para el cliente, se explica el criterio y
el hilo queda sin resolver por Efeonce. Eliminar el bloque no convierte automáticamente la observación en
cerrada.

## Método de resolución, hilo por hilo

1. **Inventariar:** distinguir comentarios nuevos de los ya atendidos y confirmar que ninguno quedó fuera.
2. **Evaluar contra estándares:** decidir si la observación es correcta por claridad, intención de sección,
   voz Berel es-MX, evidencia, SEO/AEO, accesibilidad o contrato del artefacto; no resolver solo por gusto.
3. **Separar diagnóstico y remedio:** registrar mentalmente `problema detectado` y `solución propuesta` como
   dos preguntas independientes.
4. **Preservar valor:** si el problema es de ubicación, reubicar el contenido bajo un encabezado propio en
   vez de eliminar cobertura útil. Ese encabezado debe capturar la intención o keyword real.
5. **Tomar la sustancia, no la letra:** una frase sugerida se adopta solo si también respeta léxico, claims,
   hilo conductor y reglas de marca. Palabras como `ideal`, `perfecto` o `la mejor opción` no entran como
   comodines por venir dentro de un comentario.
6. **Editar con reemplazos pequeños:** anclar en texto copiado del estado guardado y no reescribir la página.
   Si la corrección mueve un bloque, agregar una línea puente; un encabezado correcto sin transición todavía
   se siente insertado. Excepción: una fuga interna amplía el saneamiento a toda la versión vigente y sus
   superficies visibles relacionadas; conservar historia nunca exige conservar la fuga. Antes de editar,
   congelar la lista de fichas N1–N4 y comprobar después que composición, copy, ALT, archivo y posición siguen
   idénticos. Si diseño ya produjo el asset, cualquier diferencia detiene el cierre.
7. **Releer el bloque completo:** comprobar que la corrección no creó transición abrupta, remate duplicado,
   cambio de persona, palabra vetada, pérdida de intención o una frase que requiere segunda lectura.
8. **Responder en el mismo hilo:** explicar qué se aceptó, qué se resolvió de otra manera y por qué, citando
   la regla o el dato pertinente. La respuesta habla de la razón editorial; nunca expone herramientas,
   extracción, prompts, APIs, CMS ni proceso interno.
9. **Dejar el hilo abierto:** Efeonce no lo marca como resuelto. El cierre corresponde a quien comentó o a su
   contacto del lado del cliente.
10. **Promover aprendizaje y separar pendientes:** si surgió una regla reutilizable, registrarla el mismo día
    en `Aprendizajes del feedback de Berel` y en el Playbook. Todo hallazgo fuera del comentario se reporta
    aparte; si la pieza ya está publicada, registrar también un pendiente Drupal con owner y evidencia esperada.

## Controles editoriales introducidos el 2026-09-07

### Barrido preventivo aunque no existan comentarios

Los comentarios ayudan a descubrir defectos, pero no son el sistema de QA. Si una fuga aparece en una página,
auditar por lectura el resto del mes objetivo: una sola zona vigente, evidencia separada, metadatos aprobables,
links públicos, specs contextuales completas, ausencia de notas de agente y jerarquía intacta. Ejecutar gate y
lectura humana en cada página; editar únicamente donde exista un defecto confirmado.

Registrar por artículo `sin cambios`, `corregido` o `bloqueado`, junto con specs/hilos antes y después. Una página
sin comentarios puede fallar; una página con comentarios atendidos puede contener otra fuga. La ampliación es de
cobertura de auditoría, no de autoridad para reescribir todo el lote.

### Claridad antes que ingenio

- Todo remate o frase compacta se entiende en la primera lectura.
- Prueba práctica: leer en voz alta; si exige una segunda pasada para decodificarse, se reescribe en llano.
- Ejemplos descartados por ambigüedad: `Y aguantar se elige` y `el color se elige con código`.

### Una sección, una intención

- El cuerpo bajo cada encabezado responde la pregunta prometida por ese encabezado.
- Color, precio, resistencia, inspiración y preparación son intenciones diferentes cuando desarrollan una
  respuesta propia.
- Reubicar no es borrar: el contenido útil conserva cobertura y recibe un encabezado descriptivo.
- Toda reubicación incluye una línea puente desde la sección anterior.

### Evergreen sin anclas temporales

- En un cuerpo evergreen no usar `paleta vigente`, `temporada actual`, `última paleta de temporada`,
  `combinación vigente de la temporada`, `paleta del trimestre` ni equivalentes.
- Nombrar cada color por nombre y código. Una página hija temporal puede nombrar su paleta/año cuando esa sea
  su intención; esa excepción no convierte el hub evergreen en contenido de temporada.

## Taxonomía de comentarios y aprendizaje del lote de octubre

Para aprender del feedback sin contar dos veces una misma observación, asignar **una causa primaria** y, cuando
ayude, una causa secundaria. La causa primaria describe por qué el texto debía cambiar:

| Causa primaria | Pregunta de diagnóstico |
|---|---|
| `claridad y estructura` | ¿El lector entiende a la primera quién hace qué, qué significa la frase y por qué el bloque está ahí? Incluye títulos, subtítulos, continuidad, encabezados y presentación de enlaces. |
| `precisión de producto` | ¿Se nombra el producto o acabado exacto y la recomendación corresponde a su uso, superficie y nivel de exigencia? |
| `voz y localización` | ¿La frase suena a Berel en español de México, con primera persona de marca y sin giros extraños o negativos? |
| `alcance editorial o de negocio` | ¿La marca quiere incluir ese tema, producto, precio o enfoque en esta pieza? |

SEO/AEO, evidencia y cobertura suelen actuar como **restricciones del remedio**, no necesariamente como la causa
del comentario. Por ejemplo, retirar una sección por decisión de negocio puede perder una intención de búsqueda;
se aplica el alcance pedido y se documenta el costo, sin presentar SEO como origen de la observación.

En el barrido de octubre de 2026 se revisaron 25 observaciones del cliente en tres artículos. Distribución por
causa primaria: 10 de claridad y estructura (40 %), 7 de precisión de producto (28 %), 5 de voz y localización
(20 %) y 3 de alcance editorial o de negocio (12 %). Es un caso de aprendizaje, no una cuota para lotes futuros.

La señal dominante fue la **comprensión en primera lectura**: sujetos omitidos, referentes ambiguos, frases que
sonaban raras, títulos repetitivos y encabezados poco informativos. La prevención prioritaria es releer el texto
completo como consumidor y comprobar continuidad entre oraciones antes de optimizar detalles más sofisticados.
La segunda señal fue producto: categorías genéricas no sustituyen el nombre exacto, el acabado ni la explicación
de cuándo corresponde cada sistema.

## Contrato de respuesta

Usar [`../templates/respuesta-comentario-cliente.md`](../templates/respuesta-comentario-cliente.md) como
estructura, adaptándola al hilo. La respuesta debe permitir reconstruir cuatro cosas:

1. qué observación se aceptó;
2. qué cambio quedó aplicado o por qué no correspondía editar;
3. qué se hizo distinto de la redacción sugerida, si aplica;
4. qué regla o evidencia sostiene la decisión.

No responder con `listo`, `corregido` o `de acuerdo` sin explicar el resultado.

El mismo estándar rige el reporte del agente al operador: citar el texto leído de la fuente y distinguirlo del
resumen propio. Si una duplicación o errata existe solo en la respuesta del agente, se corrige la respuesta y no
se contabiliza ni se modifica Notion. `Segundasegunda capa` fue un error del reporte; la página conservaba
`Segunda capa para un acabado uniforme`.

## Casos límite de Notion

- **Ancla eliminada y comentario huérfano:** si una edición necesaria borra el bloque anclado y Notion ya no
  permite responder en ese hilo, dejar un comentario de página que mencione la observación original, la persona
  y la decisión aplicada. No marcar el hilo original como resuelto.
- **Ediciones sugeridas no habilitadas:** continuar mediante comentarios y reemplazos pequeños; su ausencia no
  bloquea el proceso.
- **Canonización del contenido:** después de guardar, releer y copiar cualquier ancla siguiente desde el estado
  actual. Si una edición no encuentra coincidencia, releer; no reintentar de memoria.
- **Tabulador perdido en un reemplazo:** Notion puede responder `success` y guardar la línea fuera del toggle.
  Comparar la sangría antes/después, releer el markdown y confirmar el render. Si el hijo quedó suelto, la
  corrección no está terminada.
- **Comentario sobre una pieza publicada:** Notion y Drupal son estados separados. Registrar el pendiente CMS,
  pero no editar ni publicar Drupal sin autorización específica.

## Criterio de cierre

- [ ] Todos los hilos fueron inventariados y clasificados.
- [ ] Si el hallazgo fue centinela, el resto del mes fue auditado aunque no tuviera comentarios; solo se editaron defectos confirmados.
- [ ] Cada hilo nuevo tiene decisión explícita.
- [ ] Cada cambio fue releído en su bloque y en la transición con sus vecinos.
- [ ] Cada hilo atendido tiene respuesta con observación, acción y razón.
- [ ] Ningún hilo fue marcado como resuelto por Efeonce.
- [ ] Una sola zona vigente está rotulada con claridad; las anteriores se distinguen como historial.
- [ ] Los toggles de análisis/evidencia requeridos permanecen completos y separados de la zona editorial.
- [ ] No hay notas internas, QA, pendientes editoriales, CMS/Dev ni mensajes entre agentes en la zona vigente.
- [ ] Las cuatro fichas N1–N4 permanecen en contexto y coinciden literalmente con sus tareas visuales.
- [ ] Si existe arte producido, ninguna corrección cambió composición, copy, ALT, archivo, formato ni posición.
- [ ] El export fresco pasó `client-visible-copy-gate.mjs` y la lectura humana del render.
- [ ] El reporte final cita la fuente fresca y no convierte un typo del agente en un cambio del artículo.
- [ ] Todos los hijos conservan tabulador y siguen dentro del toggle correcto.
- [ ] Las reglas nuevas quedaron en Aprendizajes y Playbook.
- [ ] Los hallazgos fuera de alcance se reportaron aparte.
- [ ] Si la pieza estaba publicada, existe pendiente Drupal separado; no se afirmó actualización pública.

El proceso termina por **cobertura + decisión + respuesta + readback**, nunca por una respuesta de API ni por
llevar el contador de comentarios abiertos a cero.
