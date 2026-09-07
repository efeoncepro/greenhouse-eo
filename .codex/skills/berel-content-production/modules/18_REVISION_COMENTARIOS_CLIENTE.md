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

La página de un artículo compartida con Berel se trata completa como **superficie del cliente**. Un toggle
colapsado, callout, comentario o bloque histórico no vuelve privado el contenido. Está prohibido dejar ahí
razonamiento de agentes, prompts, procedencia, auditorías, QA, controles de corrección, pendientes, schema,
montaje CMS/Dev o instrucciones de diseño.

Un comentario que detecta una fuga es un **incidente centinela**:

1. detener la declaración de `En revisión` o cualquier aviso de pieza lista;
2. inventariar el hilo y también toda la versión vigente, sus callouts, toggles y comentarios visibles;
3. retirar la operación interna de la superficie del cliente y trasladar lo necesario a una tarea/página
   privada de Efeonce;
4. dejar una sola `Versión vigente para revisión`, con metadatos aprobables y copy público exacto;
5. rotular versiones anteriores como `Histórico` sin fingir que ese rótulo vuelve aceptable una fuga activa;
6. ejecutar el gate automatizado y leer el render completo como cliente;
7. responder el hilo sin narrar herramientas ni detalles internos del incidente.

Señales de alto riesgo incluyen `Dónde vive`, `Regla SEO`, `Montaje CMS`, `Schema para Dev`, `Nota de
adaptación`, `Nota de montaje`, `Pendientes antes de publicar`, `Control de corrección`, `no cargar al CMS`,
`pendiente de confirmación`, `la ficha declara` y cualquier mensaje dirigido a quien maquete o a otro agente.
La lista ayuda a detectar; **no reemplaza la lectura semántica**.

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
   superficies visibles relacionadas; conservar historia nunca exige conservar la fuga.
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

## Contrato de respuesta

Usar [`../templates/respuesta-comentario-cliente.md`](../templates/respuesta-comentario-cliente.md) como
estructura, adaptándola al hilo. La respuesta debe permitir reconstruir cuatro cosas:

1. qué observación se aceptó;
2. qué cambio quedó aplicado o por qué no correspondía editar;
3. qué se hizo distinto de la redacción sugerida, si aplica;
4. qué regla o evidencia sostiene la decisión.

No responder con `listo`, `corregido` o `de acuerdo` sin explicar el resultado.

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
- [ ] Cada hilo nuevo tiene decisión explícita.
- [ ] Cada cambio fue releído en su bloque y en la transición con sus vecinos.
- [ ] Cada hilo atendido tiene respuesta con observación, acción y razón.
- [ ] Ningún hilo fue marcado como resuelto por Efeonce.
- [ ] Una sola versión vigente está rotulada con claridad; las anteriores dicen `Histórico`.
- [ ] No hay notas internas, QA, pendientes, specs, CMS/Dev ni mensajes entre agentes en toda la página compartida.
- [ ] El export fresco pasó `client-visible-copy-gate.mjs` y la lectura humana del render.
- [ ] Todos los hijos conservan tabulador y siguen dentro del toggle correcto.
- [ ] Las reglas nuevas quedaron en Aprendizajes y Playbook.
- [ ] Los hallazgos fuera de alcance se reportaron aparte.
- [ ] Si la pieza estaba publicada, existe pendiente Drupal separado; no se afirmó actualización pública.

El proceso termina por **cobertura + decisión + respuesta + readback**, nunca por una respuesta de API ni por
llevar el contador de comentarios abiertos a cero.
