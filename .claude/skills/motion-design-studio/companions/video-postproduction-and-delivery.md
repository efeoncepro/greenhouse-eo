# Companion — Posproducción, sonido y entrega de video

**Versión:** 2026-09-24. **Dueño:** Motion Design Studio; Audio Studio dirige el oficio sonoro.
**Entrada:** material generado o filmado, contrato de dirección, referencias y decisiones del operador.
**Salida:** película revisable, fuentes reproducibles, evidencia y estados separados de entrega/aprobación/publicación.

Este companion convierte el caso SKY V17 en un procedimiento reutilizable. Sus gates son requisitos de
trabajo, no una afirmación de que exista un validador automático universal. Los scripts de SKY prueban una
implementación local; no son una plataforma de edición ni garantizan otros montajes. El detalle histórico
está en [retrospectiva SKY](../../../../docs/operations/social/2026-09-24-sky-retrospectiva-produccion-v17.md).
Los valores de SKY —24 fps, 29,5 s, resolución, ganancias, tiempos, ratios y costos— son ejemplos, no defaults.

## 1. Contrato de entrada: qué se puede cambiar y qué se debe preservar

Antes de tocar el montaje, registrar:

- **Narrativa:** secuencia de estados, información que debe leerse y evento principal de marca. Una respuesta
  sin turno de usuario o una citación que no causa la transformación puede incumplir aunque se vea atractiva.
- **Cámaras:** número acordado, propósito de cada una, eje, altura, encuadre, movimiento y continuidad entre
  ellas. El contrato cubre toda la película: interfaz, objeto, cartelas y cierre, no sólo el plano heroico.
- **Objeto e identidad:** referencias aprobadas por vista, rasgos que deben permanecer y trayectoria. Las
  vistas pieza por pieza preparadas con Claude en SKY fueron trabajo de preproducción; conservar su autoría,
  elecciones y aprobaciones al rescatar metraje. No atribuir su construcción a la herramienta de posproducción.
- **Frontera de composición:** qué puede ser generativo y qué debe mantenerse exacto. En SKY se autorizó
  animación local sólo para cartelas posteriores al avión y cierre; eso no autorizaba reconstruir toda la UI.
- **Audio:** voz permitida o prohibida, carácter musical aceptado, pistas rechazadas, necesidad de continuidad,
  eventos que necesitan efectos, silencio intencional y resolución musical deseada.
- **Entrega:** duración exacta o margen admitido, ratios, destinos, resolución real requerida, color, fps,
  subtítulos, paquetes de fuentes, derechos y plazo. Una reducción de duración cambia este contrato.
- **Economía:** trabajo local permitido, operaciones pagadas autorizadas, máximo por solicitud/total y
  restricciones del operador. Tener saldo no autoriza otro intento.

**Gate de entrada:** cualquier cambio contradictorio con estas decisiones vuelve a la dirección; las
correcciones rutinarias dentro del alcance ya autorizado continúan sin pedir permiso de nuevo.

## 2. Inventario, procedencia y selección antes de editar

Crear una tabla por fuente con ID, ruta/URL retenida, hash, autor/proveedor/superficie/modelo, operación,
resolución devuelta, fps/timebase, duración/cuadros, audio, color/rango, estado de derechos y juicio creativo.
Distinguir `aprobado`, `referencia`, `utilizable parcialmente`, `rechazado` y `pendiente`. Una pista cuyo carácter
musical gusta no convierte su mezcla contaminada en un master aprobado.

Conservar originales y versiones rechazadas de forma no destructiva. Marcar los rangos útiles por componente:
una mala entrega puede contener la mejor búsqueda, una buena pasada o nubes utilizables. Registrar por qué se
retiene cada rango y qué no se hereda. Descargar al paquete de producción el resultado que se necesita editar,
con procedencia; no depender de enlaces temporales del proveedor para la reproducibilidad.

**Mejora del acierto de SKY:** reemplazar “V9 es buena/mala” por un inventario de rangos y propiedades. Ahorra
regeneraciones, pero exige que el ensamblaje resultante pase continuidad; reunir los mejores cuadros aislados
no asegura la mejor película.

## 3. Decidir: rescate, corrección local, edición generativa o regeneración

| Diagnóstico | Primera ruta que evaluar | Prueba de aceptación | Motivo para detenerla |
| --- | --- | --- | --- |
| Error de timing, duración de lectura o punto de entrada | Edición/conform local desde fuente | Lectura suficiente, trayectoria y audio preservados | Salto visible, velocidad artificial o ruptura del arreglo |
| Texto/logo exacto dentro de la frontera de composición | Corregir vector/overlay y recomponer | Geometría aprobada, jerarquía, alpha y lectura en entrega | Parche tapa información, invade UI no autorizada o altera el fondo |
| Audio contaminado con voz | Recuperar instrumental limpia y stems; reconstruir mezcla | Escucha sin restos, intención musical y eventos coherentes | Separación deja fonemas/reverb o degrada música |
| Defecto visual acotado con extremos rescatables | Piloto de edición generativa localizado | Núcleo corregido y dos empalmes válidos | Nueva geometría, doble objeto, luz/velocidad incompatible |
| Fuente suave o comprimida, estructura correcta | Piloto de restauración | Más detalle útil sin deformar UI/objeto | Halos, letras inventadas, plasticidad o mayor flicker |
| Relato/cámara/identidad fallan de forma extensa | Revisar dirección y referencias; luego evaluar generación nueva | Secuencia completa y costos autorizados | Repetir mismo payload esperando variación favorable |

No confundir `edit` con conservación de píxeles, ni `enhance` con información original recuperada. La ruta se
elige por alcance y riesgo observable. Una nueva generación completa evita algunos empalmes, pero puede
introducir regresiones en todo lo aprobado. Si una restricción es “resolver con lo existente”, documentar el
límite real de calidad antes de proponer gasto; no convertirlo en una excepción tácita.

## 4. Conform: un reloj y una procedencia por cuadro

1. Medir fuentes con herramientas como FFprobe; no inferir resolución/fps del nombre, prompt o preview.
2. Fijar fps, timebase, duración objetivo y convención de cuadros base cero o base uno. Convertir tiempos con
   racionales y registrar redondeo; revisar `duration`, `nb_frames` y timestamps. VFR requiere un conform explícito.
3. Construir EDL/mapa de fuente: cuadro de salida → archivo y tiempo/cuadro original. Registrar retiming,
   recorte y mezclas. Mantener el reloj de overlays y los offsets de audio sobre ese mismo montaje.
4. Descomprimir fuentes una vez a un flujo de composición o intermedio sin pérdida cuando haga falta.
   Evitar JPEG intermedio y cadenas MP4→MP4→MP4. Un archivo FFV1 no restaura el daño previo de la fuente.
5. Elegir retiming por movimiento: una selección monotónica puede servir a un hold casi estático, pero puede
   producir judder en paneos. Optical flow puede deformar alas, letras y bordes; requiere prueba localizada,
   no activación automática. No cambiar la velocidad del evento de marca para corregir su espera anterior.
6. Medir tiempo de lectura desde que el contenido está completo/estable, no desde que comienza a entrar.
   Separar **revelado → lectura → anticipación → acción**. Retocar sólo la fase que el feedback identifica.

**Ejemplo, no receta universal:** V17 comprimió un hold fuente de 72 a 60 cuadros a 24 fps, preservó extremos y
mantuvo consecutivos los cuadros de activación/vuelo respecto a V16. La película quedó en 29,5 s por decisión
aceptada. “Velocidad conservada” describe esa comparación; el bruto de generaciones anteriores ya tenía retiming.

## 5. Contrato de empalme para ventanas generativas

Una ventana tiene cuatro zonas: margen de entrada, núcleo de intervención, margen de salida y contexto
adyacente del master. El proveedor puede modificar cualquiera; los márgenes no son bloqueos garantizados.

Para **cada extremo**, registrar y comparar:

| Variable | Qué observar antes/dentro/después |
| --- | --- |
| Identidad y geometría | Cantidad de objetos, silueta, livery/ropa, proporciones, letras, orientación |
| Trayectoria del objeto | Centro, escala relativa, profundidad aparente, dirección y velocidad de pantalla |
| Cámara | Eje, altura, perspectiva, movimiento de fondo, parallax y continuidad de aceleración |
| Mundo | Horizonte, nubes, luz, sombras, textura, exposición y color |
| Transición | Ocultación real, continuidad de dirección, duración del enlace y punto de atención |
| Sonido | Handles útiles, cola, evento que continúa y efectos que no deben repetirse |

Inspeccionar secuencias densas a ambos lados y reproducir a 1×. Un fotograma de borde compatible no prueba que
la velocidad coincida; una correlación reducida alta no prueba nitidez ni naturalidad. Guardar contacto general,
cuadros consecutivos del seam y detalles nativos donde se juega identidad.

**Caso rechazado:** el primer Omni SKY cambió cielo y extremos y produjo dos aviones durante una disolvencia.
Los buenos cuadros intermedios no compensaron ese defecto. “Preservar extremos” en el prompt no los fijó.
La posible influencia de cielos incluidos en las referencias fue una hipótesis, no una causa demostrada.

**Caso utilizable:** otra ventana se integró durante la oclusión del paso cercano y la salida terminó en una
mezcla sobre nubes. No se disolvieron dos aviones. La oclusión permitió esconder el cambio espacial en ese caso;
no autoriza cualquier corte ni garantiza que un nuevo resultado se pueda empalmar.

**Gate:** si falla un extremo, no integrar para justificar el gasto. Reducir alcance, usar otra fuente o
presentar el límite. Toda nueva operación pagada es una nueva decisión de producción; no reintentar a ciegas.

## 6. Picture lock y mapa de sonido

Cerrar primero la selección y el montaje visual con todos sus eventos, incluidos los tiempos de overlays
aprobados. Se puede reservar el audio con una referencia temporal durante previs; la producción final de
música/SFX se hace después de leer la imagen real. No forzar el video a un guion sonoro generado sobre tiempos
que el modelo no cumplió. Si la dirección aprobó un proceso guiado por canción desde el inicio, declarar esa
excepción explícita y usar su estructura real en el animatic.

El lock registra hash de placa/composición, EDL, fps, conteo y cue sheet. Para cada cue:

- ID y causa visible; fotograma/tiempo del evento; prioridad narrativa.
- Inicio, anticipación, ataque/crest y cola; fuente/stem y si el sonido cruza un corte.
- Relación con el pulso musical; espacio espectral/ganancia prevista; aprobación y escucha pendiente.

No todos los cambios visibles requieren un sonido. Un reloj de teclas inventado o un motor repetido en
cartelas agrega ruido sin causa. La jerarquía debe distinguir interfaz secundaria, transformación de marca,
vuelo y resolución del cierre.

## 7. Música, SFX, mezcla y juicio perceptual

Cargar [sin voz](../../audio-studio/efeonce/NO_VOICE_MUSIC_SFX.md) y
[continuidad musical](../../audio-studio/efeonce/APPROVED_MUSIC_CONTINUITY.md).

### Música: identidad y continuidad

- Convertir adjetivos ambiguos (“épico”, “fresco”) en una referencia escuchada, instrumentación, pulso, carácter
  y estructura. Registrar si el archivo fue realmente adjuntado al modelo y bajo qué control de influencia.
- Si existe una pista limpia que cumple, usarla. Preferir arreglo completo/cutdown musical verdadero frente a
  bucles forzados. Una ausencia de silencio digital no prueba continuidad de frase o ausencia de empalme.
- Un ajuste uniforme de tempo con afinación conservada es distinto de dejar la pista intacta. Documentarlo y
  escucharlo. No copiar el factor1,14 de SKY a otros temas. Cambios por secciones exigen justificación musical.
- Si el usuario pide explícitamente sin cortes internos, ese es el contrato. No “arreglar” un vacío con un
  puente que viola esa decisión aunque las métricas mejoren.

### Impacto de marca: trayectoria, no sólo transitorio

Diseñar anticipación → tensión/crecimiento → liberación → continuidad. El punto de mayor importancia necesita
una duración y timbre coherentes con su transformación. Un pico alineado puede seguir sonando a clic; un subgrave
puede dar masa en auriculares y desaparecer en un teléfono. Relacionar el acento con la instrumentación de la
pista; tres capas ajenas entre sí no generan unidad por coincidir en el tiempo.

Usar banda media/aguda y dinámica de forma deliberada, sin subir todo el master. Medir separación por bandas,
mezcla mono y cancelación como diagnóstico. Escuchar en auriculares y altavoz representativo del destino.
No afirmar “funciona en móvil” sólo porque un filtro 300–6000 Hz contiene energía. El ducking acompaña, no crea
un hueco que haga sentir un reinicio de la película. Ningún valor de dB o duración de SKY es universal.

### Fuentes sin voz y revisión

Producir audio separado cuando la narración esté prohibida y el motor de video la reintroduzca. Si se dispone
de salida muda, seleccionarla y comprobar streams. Si no, descartar por mapeo explícito el audio generado del
video y construir la mezcla limpia; no superponerla dejando el AAC original por accidente.

ASR/VAD vacíos no certifican ausencia de voz; ASR también puede alucinar. Separadores como Demucs pueden dejar
sílabas, respiraciones o reverberación. La escucha verifica estos defectos y el carácter musical. Si el agente
no puede oír, registrar `medición técnica realizada; escucha no realizada` y entregar para revisión; no fingir
escucha ni anunciar aprobación sonora.

Conservar stems limpios, premaster, master WAV, parámetros y cue sheet. Medir el audio **extraído del archivo
final**: true peak puede cambiar al codificar AAC. En un análisis `loudnorm`, distinguir `input_*` medido de
`output_*` simulado; no reportar lo segundo como lectura del original.

## 8. Cambios después del lock: duración y sincronía

Cualquier trim, retime, logo animado o cambio de cierre crea una nueva revisión. Congelar la anterior y
calcular un mapa temporal viejo→nuevo. Clasificar cues como **no afectados**, **desplazados**, **retimados** o
**rediseñados**; no desplazar todo el audio por inercia.

| Cambio | Tratamiento inicial | Evidencia necesaria |
| --- | --- | --- |
| Sólo logo estático, duración y eventos iguales | Reutilizar audio aprobado; stream-copy si compatible | Hash de payload, timestamps, escucha/reproducción de export |
| Se elimina espera antes de una acción | Mover eventos posteriores; preservar foley previo | Mapa de cuadros y cues, onset musical, cola y duración |
| Canción necesita desplazarse completa | Mantener muestras/arreglo si el margen lo permite | Verificar que el recorte inicial/final elimina sólo silencio permitido; no mutilar ataque o cola |
| Duración exacta obliga a conservar el final | Redistribuir tiempo de forma editorial o revisar arreglo | No añadir congelado/silencio sólo para llenar; revisar lectura, música y cierre |
| Tempo o frase cambia | Derivado nuevo desde fuente limpia/stems | Nueva escucha de arreglo, afinación, transiciones y sync |

V17 desplazó música/marca/avión/cierre−0,5 s y mantuvo UI inicial porque sus eventos no se movían. Se comprobó
que los 0,5 s descartados al principio de esos stems eran silencio digital. Esto permitió conservar canción y
resolución; **no es seguro restar 0,5 s a cualquier pista**. No cortar AAC como sustituto de recomponer stems.

## 9. Restauración: piloto condicional y control de identidad

El orden de dependencias es: **fuentes → conform → picture lock/cues → audio → restauración de placa, si hace
falta → recomposición de gráficos exactos → mux/export → QA**. Audio y restauración pueden avanzar en paralelo
si comparten el lock y el restaurador no cambia duración/fps. Si cambia el reloj, rehacer conform/cues antes de
entregar. El objetivo es restaurar metraje antes de rasterizar encima las letras y marcas exactas.

1. Diagnosticar: resolución nativa, crop, desenfoque de movimiento, compresión, error de geometría o suavidad
   generativa. No todo se corrige con upscaling; un crop 2× de una fuente 1080 conserva aproximadamente 540 px de
   ancho útil antes de escalar, sin que esa cuenta certifique detalle percibido.
2. Elegir un piloto que incluya el riesgo real: UI, transformación, sujeto y movimiento. Confirmar costo del
   piloto más máximo completo y condición de continuación. No hacer “prueba” sin contabilizarla.
3. Comparar antes/después al mismo tamaño y con mismo encuadre/color, también a escala nativa. Revisar letras,
   bordes, textura, halos, flicker, smear, geometría y movimiento. Evitar confundir más contraste con más detalle.
4. Si pasa, procesar el alcance aprobado exactamente una vez; registrar request/session/generationID y estado.
   Ante timeout incierto, consultar ese ID. No reenviar porque el proceso demora o no ofrece porcentaje.
5. Verificar respuesta completa: resolución, fps, duración, cuadros, color y continuidad. Un piloto exitoso
   reduce riesgo; no aprueba automáticamente todos los cuadros del completo.
6. Identificar la entrega como restaurada/reescalada desde su fuente. No llamarla 4K nativa ni prometer recuperar
   información original inexistente. Conservar las comparaciones y cualquier límite no resuelto.

## 10. Overlays exactos y cierres integrados

- Mantener fuente tipográfica, plan de animación, render por tiempo determinista y transparencia. Capturas de
  navegador deben esperar fuentes/imágenes; el resultado no debe depender de latencia ni azar por cuadro.
- Congelar paquetes aprobados con hashes y crear derivados con alcance de cambio explícito. El hash protege
  integridad, no calidad: un asset equivocado también puede tener hash estable.
- Animar jerarquía: anticipación, entrada, asentamiento/lectura, salida que guía al siguiente elemento. No usar
  el máximo golpe en todas las cartelas; reservar jerarquía para el mensaje principal y dar resolución al cierre.
- Mantener fondo generativo en movimiento cuando ese es el contrato. No reemplazar el cielo por una placa fija
  o esconderlo con un scrim para compensar legibilidad sin discutir dirección.
- Usar vectores aprobados para marcas. Inspeccionar vacíos y separaciones a tamaño final; dos caminos que no se
  tocaban por color pueden fusionarse al convertirse a blanco. Respetar geometría, no aproximar con tipografía.
- Alpha y modo de fusión son propiedades diferentes. Un MOV con alpha no almacena automáticamente Luminosity.
  Aplicar la operación al fondo real y evitar duplicar opacidad ya incorporada en el asset.
- Controlar jerarquía de URL respecto a logos y mensaje. Revisar cierre como secuencia: salida del agradecimiento,
  entrada de lockup, URL, cambio de fondo y resolución musical. Un corte debe tener intención visual y sonora;
  “abrupto” no significa “impactante”.

## 11. Color, exportación y preservación de calidad

Mantener un contrato de color desde decodificación hasta contenedor: primarias, transferencia, matriz y rango.
Asignar tags no transforma píxeles; una conversión equivocada no se arregla etiquetando Rec.709. Si faltan tags,
comparar una interpretación sustentada con la fuente y documentar la hipótesis, en lugar de asumir sRGB/709.

Exportar cada resolución desde composición/intermedio maestro común, con una compresión final por entrega.
No derivar 1080p del MP4 final 4K si están disponibles las fuentes. Dimensionar gráficos para salida mayor y revisar
el derivado pequeño: reducción y subsampling pueden cerrar vacíos o cambiar contraste. CRF/bitrate no prueban
calidad ni son configuraciones universales. Preservar un intermedio sin pérdida cuando el costo operativo lo
justifique; ProRes 4444 puede conservar alpha, pero no equivale a compresión matemáticamente sin pérdida.

**Remux/stream-copy:** sirve para contenedor o audio inalterado cuando el formato lo permite. No corrige crops,
retiming o compositing sin recodificar. Si se corrige sólo metadata, verificar tags del archivo real y payloads
antes/después. Algunos filtros de bitstream cambian headers y por ello hashes sin alterar imagen decodificada;
no prometer identidad de payload por usar `-c copy`. En V17 sí se comprobó igualdad de video/audio comprimidos.

## 12. QA proporcional: qué demuestra cada prueba

| Evidencia | Acredita | No acredita por sí sola |
| --- | --- | --- |
| Metadata/FFprobe | Dimensiones, fps, duración, streams y tags reportados | Detalle real, continuidad o fidelidad de marca |
| Decode completo | Archivo decodificable y errores de codec detectados | Calidad visual o sonora |
| Contact sheet general | Secuencia y cobertura de muestras | Todos los defectos de cuadros no inspeccionados |
| Cuadros consecutivos del riesgo + detalle nativo | Empalmes, geometría y legibilidad del rango revisado | Experiencia integral en movimiento |
| Reproducción1× completa | Ritmo, continuidad temporal y lectura en contexto | Ausencia de artefactos subcuadro sin inspección adicional |
| Escucha completa/mono/dispositivo | Naturalidad, voz residual, fuerza, unión música/SFX | Derechos o coincidencia binaria |
| Hash de fuente/stream | Identidad de bytes del objeto medido | Mismo timing, calidad o aprobación |
| Diferencia/correlación a baja resolución | Correspondencia de cuadros/color grueso | Nitidez nativa, ausencia total de deformaciones |
| LUFS/true peak/silencios/ASR | Diagnóstico cuantitativo específico | Música adecuada, impacto de marca o ausencia certificada de voz |

Cubrir toda la pieza con muestras y densificar sólo donde está el riesgo: seam, retime, lectura, transformación,
vuelo, entrada al cierre. Revisar además esos lugares a tamaño final. La reproducción 1× y escucha se registran
por separado con quién, cuándo y archivo/hash. Si no se pueden ejecutar, declarar pendiente; no transformar
“cuadros inspeccionados” en “vi el video entero” o “escuché la mezcla”.

## 13. Entrega, cierre y trazabilidad

Usar [plantilla de revisión](../templates/video-postproduction-review.md). El paquete mínimo contiene fuentes,
EDL/mapa, assets aprobados, stems/master, scripts o instrucciones reproducibles, export final, hashes,
mediciones y revisión perceptual con sus límites. Estados separados:

1. **Producido/exportado:** existe el archivo completo.
2. **Revisado técnicamente/visualmente/auditivamente:** cada eje tiene evidencia propia.
3. **Entregado para revisión:** el operador puede abrir el archivo real.
4. **Aprobado:** decisión explícita sobre versión y alcance; no inferirla de “continúa”.
5. **Publicado:** acción externa autorizada y verificada; nunca consecuencia automática del render.

No pedir confirmación adicional para preparar o entregar una revisión ya solicitada. Publicar, aprobar y gastar
siguen las autorizaciones reales del caso. El seguimiento termina tras entrega revisada o fallo accionable;
pausar la automatización completada. Mientras un estado remoto no cambia, consultar con cadencia razonable y
sin notificaciones repetitivas. La relación duración de piloto/completo es sólo una estimación; colas y carga
hacen que no sea una promesa de ETA.

## 14. Evidencia del caso y cómo mejorar lo que funcionó

| Acierto | Mejora reutilizable | Error que evita |
| --- | --- | --- |
| Rescate por componente | Catálogo de rangos con motivo y contrato de seam | Regenerar lo aprobado o montar velocidades incompatibles |
| Cartelas congeladas | Manifiesto y permiso de delta por versión | Cambiar silenciosamente coreografía aceptada |
| Referencia musical concreta | Registro de archivo realmente adjunto, selección y estado de escucha | Perseguir adjetivos o afirmar referencia no enviada |
| Stems separados | Cue IDs + mapa de cambios de lock | Mover foley que debía quedarse fijo o cortar canción |
| Piloto restaurado | Cobertura del peor riesgo y decisión binaria con límite | Gastar en toda la película antes de detectar deformación |
| Composición común | Exports hermanos y comparación nativa del menor | Compresión acumulada y detalle perdido en derivado |
| Cuadros/mediciones archivados | Matriz de afirmación→evidencia→límite | Prometer escucha, aprobación o fidelidad que no se verificó |

Fuentes de implementación del caso:

- [Primer piloto Omni rechazado](../../../../ai-generations/2026-09-23_cmp003-sky-video/omni/v10-pilot-01/REVIEW.md).
- [V14: ventanas y música](../../../../ai-generations/2026-09-23_cmp003-sky-video/seedance/v14-finish/README.md).
- [V15: conform desde fuentes](../../../../ai-generations/2026-09-23_cmp003-sky-video/seedance/v15-review/rebuild-picture.py).
- [V16: mezcla de transformación](../../../../ai-generations/2026-09-23_cmp003-sky-video/seedance/v16-brand-repair/mix-transformation.py).
- [V17: reproducción y límites](../../../../ai-generations/2026-09-23_cmp003-sky-video/seedance/v17-refinement-plan/README.md).
