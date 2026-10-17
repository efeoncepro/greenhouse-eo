# Corrección de aprobación de brochures — 17-10-2026

## Autoridad y resultado

Julio pidió que ningún agente repita el recorte y ratificó: los brochures están aprobados y no necesitan nada más.
[Contrato vigente](../../operations/EFEONCE_APPROVED_BROCHURES_POLICY_V1.md).
Se corrigieron las fuentes de instrucción, no los PDF ni documentos o enlaces existentes en HubSpot.
No se enviaron correos como parte de esta corrección documental. La aprobación del material no acredita
recepción del correo anterior ni ingestión CRM. La copia Aloja de 38 láminas no es material aprobado.

## Causa

El LEEME y el canon conservaban cautelas de envío pese a la aprobación. La skill y el manual añadían
una revalidación y contemplaban copias acotadas sin exigir una instrucción explícita de edición del material.
El agente interpretó esas notas como motivo para quitar 19 láminas del original de 57 y subir otra copia.
Julio no había pedido ese cambio. El original conserva el hash previamente registrado.

## Comprobaciones

- `pnpm skills:mirrors`: espejos Codex/Claude idénticos, exit 0.
- Cierre documental acotado con `node scripts/check-documentation-closure.mjs -- <25 rutas>`: 0 warnings, exit 0.
- 31 enlaces nuevos a política/antecedentes resueltos; `git diff --check` de las rutas modificadas: exit 0.
- SHA256 del PDF original de contenidos coincide con el manifiesto anterior a la copia; original intacto.
- Entrada personal del radar, historial privado HSP-0032 y una nota de actualización de memoria guardan
  la decisión. El historial conserva la pausa y el readback de envío/CRM pendiente; no permite repetir el correo.
- La primera pasada estricta detectó límites de contexto (21 sesiones/61 entradas y puntero demasiado largo).
  Se acortó sólo el puntero nuevo y se ejecutó `pnpm docs:context-rotate --apply`: 1 sesión y 1 entrada
  trasladadas a sus históricos sin pérdida. Context gate estricto se ejecuta después de la última edición;
  resultado conservado en la ejecución.
- Los PDF no se editan, regeneran ni sobrescriben; no se modifica el estado de documentos en HubSpot.
- La eficacia en ejecuciones futuras aún no se ha observado; no se garantiza impedir todos los errores.

## Anotaciones retiradas — historia superada, NO condiciones de envío

Las transcripciones siguientes explican la causa. Están expresamente sustituidas por la aprobación de Julio;
no son tareas, requisitos ni razones para editar o volver a validar los brochures.

### ai-generations/2026-10-09_deck-contenidos/deck/LEEME.md

```text
## Pendientes antes de mandarlo a un prospecto

- **Compromisos de servicio redactados por la sesión que armó el deck**, aprobados en conjunto y no uno por uno:
  comunidad en canales cerrados (11), series (8), «lo orgánico prueba, la pauta escala» (23), social conectado al
  CRM (49), resultados visibles en Marketing Studio (42), los cuatro compromisos de «Producción con IA» (10: «nunca
  inventados», «derechos y uso comercial revisados»), Thought Leader Ads en LinkedIn (24) y las promesas de los
  agentes de IA en social care (20–21). Contrastarlos con lo que Efeonce opera y garantiza hoy.
- **«+85 expertos más en Latam» (45):** cifra del operador, sin fuente en el repo; la lámina no dice qué cuenta ni a
  qué fecha.
- **Marca y datos de muestra:** las interfaces y los anuncios usan la marca ficticia Mareas Café, con personas y
  cifras inventadas. Casi todas llevan rótulo; en «Día a día» (40) las cifras del panel no lo llevan.
- **Logos de terceros:** Metricool, Sprout Social y Favikon en «Stack» (39) y «Día a día» (40): falta verificar que
  Efeonce los opere y la autorización de uso (TASK-1937). Logos de clientes sólo con autorización.
- **Caso Sky (5):** el avión es un montaje del PNG oficial de Sky sobre un cielo generado; revisar restricciones de
  marca de Sky. Las cifras vienen del caso publicado (12 meses de entrega).
- **Voz:** «¿Cómo trabajamos contigo? Así» (40) no pasa la regla de voz del 2026-10-06; «Sí, pero lo hacemos bien»
  (10) tiene cinco palabras. Aprobadas así por el operador.
- **Detalles de foto:** Nexa aparece con anillos en dos tomas (6 y 31); en las franjas, revisar al 100 % las caras
  de extras cortadas por el recorte.
- **Sellos de partner (49):** HubSpot y Salesforce van como PNG rasterizado del SVG oficial, porque el canvas
  pintaba el SVG en negro.
```

### ai-generations/2026-10-12_brochure-efeonce-360/LEEME.md

```text
## Pendientes antes de enviarlo

- TASK-2012: en la v9 ya no hay láminas con escenario magenta en el recorrido. Cuando salga la voz `decision`, los 11 titulares se recomponen en el compositor en vez de sobre el visual.
- Zoho en «El que encaje»: confirmar si va en un brochure de grupo (recomendación de la sesión HubSpot: sacarlo).
- «Partner oficial de» (29): readback de insignia pendiente para Adobe, AWS, Microsoft y Salesforce en EFEONCE_PARTNERSHIP_REGISTRY_V1.
- Cifras sin fuente en la lámina: «+90 empresas» (21). «+85 expertos» ya no aparece (la v9 lo tapa con el titular de equipo). Cifras de Sky (caso, clientes y «Talento adentro» no): autorización de Sky para prospectos sin confirmar.
- Acentos dentro de un tramo: 03 y 04 (teal, acto 1 en growth); 22 y 23 recompuestas a mano en teal de Growth y fondo #001a33 (v8, regla registrada por la sesión de la línea gráfica el 2026-10-15: lo que viene de otra línea se recompone en el acento del tramo); 10 «Cuatro piezas» conserva el azul de Engine y pasa a fondo #001a33. Fuente: `render-src/native/` del deck SEO; las copias recoloreadas viven en `native-growth/` (ver su LEEME) y se hornean con `shot.cjs`.
- «Ya no» y «Ordenado» nombran a HubSpot en la bajada: válidas sólo dentro del tramo Revenue (están ahí).
- Karo aparece en la portada Brand (CR4) y en «Talento adentro» (SA1): dos tomas con la misma persona; el peer creativo pide máximo una de sus tres láminas con Karo (se tomó sólo A19).
- Portadas Voice (15) y Brand (11): plates aprobados antes de la regla «el acento es puntuación, no luz»; no se regeneraron.
- Logos de clientes y partners sólo con autorización archivada (TASK-1937). Sprocket 3D de HubSpot: aprobado (canon 2026-10-14).
- Caso Sky (31): desde el 2026-10-15 es la lámina del deck de contenidos con el avión de Sky (`2026-10-09_deck-contenidos/out/C12-caso-sky/`, decision-case, línea growth, aprobada el 2026-10-10). Su LEEME advierte: el avión es un montaje del PNG oficial de Sky sobre un cielo generado; revisar restricciones de uso de la librea antes de enviarlo a prospectos.
- Caso Sky (31): aprobada por el operador el 2026-10-15 como la lámina CANÓNICA del caso Sky para todos los decks («Esa es la canónica para los deck»); las versiones del ala por la ventana (SK1) y de la mesa de luz quedan como historia. Registro en la norma a cargo de la sesión de la línea gráfica.
- 2026-10-15 (tarde): «A tu competencia» y «En ingresos» salen del acto 1 y entran al tramo Engine después de «No estás», recompuestas en línea engine con sus recetas (`decision-ai-answer`, `decision-traffic-to-revenue`); el operador objetó que entraban sin preámbulo.
- 2026-10-15 (tarde): «¿Otra agencia más? Un sistema.» → «¿Cuántas agencias necesito? Una sola.» y «Un sistema 360°» → «Una agencia 360°» (el operador: «Efeonce un sistema????»); intent `intents/r2/n01-diferencia.json`.
- **Titulares de la v9: workaround TEMPORAL.** Los 9 titulares se armaron sobre el visual compuesto con un panel del color de fondo (`native-growth/titulares-v9.mjs`). Condición de retiro: cuando las recetas acepten la voz `decision` (TASK-2012, etapa 2), esas láminas se recomponen desde el compositor y el panel desaparece. El generador usa rutas absolutas de esta máquina (`/Users/jreye/...`, sharp y `file://`) y bases del scratchpad de la sesión: no es reproducible en otra máquina. Tipografía igualada a la plantilla del compositor (eyebrow 16 px #e2e2e2, respuesta Bricolage 760 con tracking −0,045 em). Las dos láminas con foto (Voice «Directo a quien importa» y Revenue «Ya no») NO llevan panel: se leía como banda sobre la foto (regla: nunca un scrim sobre foto a sangre), así que quedan con su par original.
- Voice (11): recompuesta el 2026-10-15 en línea voice (acento #f83902) con eyebrow «03 · Voice · Paid social»; intent `intents/r2/s15-paid-social-voice.json`.
- **Densidad de pares: decisión del operador.** 13 de 26 (uno de cada dos); la regla del 2026-10-06 pone el tope en uno de cada tres (8 o 9 en 26). Opciones: aprobarla como excepción del 360, recortar los pares más débiles o esperar a TASK-2012.
- **Franja azul corregida (2026-10-15, «Todas tienen una franja azul a la izquierda… se ve mal»).** El panel plano no calzaba con el degradado del fondo. Ahora el panel ES el fondo exacto de la lámina: la capa de escenario de cada receta (`stage.svg`, volcada con `native-growth/stage-layers.ts.txt` desde `planSurfacePiece`) sobre `#001a33`, verificada contra la lámina original con 1 a 3 niveles de diferencia; la de equipo usa el mismo halo CSS de su HTML; la de Insights se editó directo en su HTML nativo. Sin franja visible.
- Lámina 04 (2026-10-16, «Dale muchísimo más impacto visual»): la lista se reemplazó por la órbita de La órbita con las cinco líneas como esferas alrededor de «Tu cliente» (hecha a mano, `native-growth/orbita-cinco-lineas-v04.mjs`, acento teal de Growth).
- Lámina 04 con el acento de cada línea en su esfera y su etiqueta (2026-10-16, a pregunta del operador): Engine #0375db, Brand #ff6500, Voice #f83902, Revenue #e86bd0 (el de HubSpot, igual que su portada de tramo) y Growth #36c8bf; la órbita sigue en el teal de Growth. Es la segunda lámina con cinco acentos, después de la portada: excepción a «un acento por lámina» que el operador debe confirmar.
- Portadas de tramo (2026-10-16, a pedido del operador): el rótulo «0N · momento · línea» va dentro de una ficha delineada de 2 px en el acento de su línea, sin relleno (`native-growth/chip-tramos.mjs`, dibujada sobre la portada compuesta). Sólo en las cinco aperturas de tramo; los rótulos de las láminas interiores siguen como texto. Al recomponer las portadas desde el compositor, la ficha debe pasar a la receta o volver a dibujarse.
```

### ai-generations/2026-10-13_brochure-agencia-medios/LEEME.md

```text
## Pendientes antes de entregar afuera

Ver «Cautelas» en el delta del canon: cifra de Bresler contra su caso publicado, autorización de logos de clientes
(TASK-1937), readback de HubSpot Gold, inventario de Basis por mercado, alcance de DCO/incrementalidad con
Performance, y no mezclar «cinco países de operación» con el proof point «120+ empresas en 4 países».
```

### .codex/skills/efeonce-b2b-prospecting/references/message-and-contextual-proof.md

```text
Verificar claims, permiso de uso, mercado y estado del artefacto. Brochure aprobado no certifica cifras,
logos o resultados pendientes. Simulación, meta, piloto y resultado observado van separados con sus fechas.
No prometer incremento de venta en Channel & Commerce ni disponibilidad por naturaleza comercial del producto.
La práctica elige material y valida su evidencia; Commercial compone el caso y Pricing decide economics.
Contrastar el PDF concreto con su LEEME/canon antes de adjuntar o insertarlo: aprobado no significa que
cada lámina pueda presentarse como resultado. Si dentro del alcance autorizado se usa una copia sin
láminas pendientes, preservar el original, motivo/páginas/checksum y verificar el resto; no reescribir
casos ni declarar corregida la edición maestra. Para secuencias, conservar la misma versión identificada
en Documentos; el procedimiento está en [seguimientos HubSpot](hubspot-follow-up-sequences.md).
```

### .claude/skills/efeonce-b2b-prospecting/references/message-and-contextual-proof.md

```text
Verificar claims, permiso de uso, mercado y estado del artefacto. Brochure aprobado no certifica cifras,
logos o resultados pendientes. Simulación, meta, piloto y resultado observado van separados con sus fechas.
No prometer incremento de venta en Channel & Commerce ni disponibilidad por naturaleza comercial del producto.
La práctica elige material y valida su evidencia; Commercial compone el caso y Pricing decide economics.
Contrastar el PDF concreto con su LEEME/canon antes de adjuntar o insertarlo: aprobado no significa que
cada lámina pueda presentarse como resultado. Si dentro del alcance autorizado se usa una copia sin
láminas pendientes, preservar el original, motivo/páginas/checksum y verificar el resto; no reescribir
casos ni declarar corregida la edición maestra. Para secuencias, conservar la misma versión identificada
en Documentos; el procedimiento está en [seguimientos HubSpot](hubspot-follow-up-sequences.md).
```

### docs/services/media-distribution/README.md

```text
- **Antes de enviar el brochure afuera** siguen abiertas: la cifra de Bresler contra su caso, la autorización de logos
  de clientes ([TASK-1937](../../tasks/to-do/TASK-1937-third-party-brand-usage-authorization-library.md)), el readback de HubSpot Gold, el inventario de Basis por mercado y el alcance de DCO e
  incrementalidad con Performance.
```
