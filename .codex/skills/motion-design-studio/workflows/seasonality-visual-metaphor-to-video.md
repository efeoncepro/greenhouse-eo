# Seasonality: de metáfora visual a video con marca exacta

Estado: ejecución técnica comprobada, candidato creativo pendiente de aprobación — 2026-09-12.
Owner: Social Media Studio (encargo y canal) + Motion Design Studio (realización).
Caso: Efeonce, «Hay abrazos que encendemos», Día de Muertos, México.
No confundir un render terminado con una receta artísticamente aprobada o un resultado de campaña.

## 1. Cuándo cargar este workflow

Cuando se solicite animar un key visual estacional, producir un video de una festividad o desarrollar una
metáfora cultural en movimiento. Cargar también `social-media-studio/modules/11_TRENDJACKING_CREATIVE_PRODUCTION.md`,
`social-media-studio/efeonce/SEASONAL_CONTENT.md` si es Efeonce, los módulos motion 04/07/08/09 y el conector elegido.
Para otra marca, sustituir el overlay, activos y destino; no reutilizar el branding de Efeonce.

**Clasificación:** esta pieza es seasonality porque responde a una ocasión cultural previsible, no a un
suceso o conversación emergente verificados. El video, su novedad técnica o un aspecto espectacular no la
convierten en trendjacking. Para una reacción dentro de una temporada, registrar además detonante, fecha,
fuente, conversación y vigencia; sólo esa capa puede clasificarse como reactiva.

## 2. Brief y mecanismo antes de herramientas

Recuperar el concepto y decisiones ya aceptadas: no reabrir el brief ni volver a pedir logo, copy o permiso
para la misma prueba autorizada. Registrar mercado, ocasión/ventana, audiencia, intención, canal, duración,
mensaje literal, rol de marca, fuentes, versión y alcance autorizado. Si el usuario sólo pide metodología,
no generar; si encarga producir, ejecutar hasta un candidato reproducible y revisado.

Escribir cuatro frases concretas:

1. **Verdad humana/cultural:** qué experiencia de la ocasión se representa. En este caso, preparar luz y
   una ofrenda para recibir y recordar; no presentarlo como significado único para todas las personas mexicanas.
2. **Metáfora visible:** qué objeto encarna esa experiencia. Una llama de veladora se convierte en abrazo.
3. **Acción/revelación:** qué cambia realmente durante el video. Llama ordinaria → dos corrientes → perfiles
   abrazados. El texto nombra lo ya descubierto; no tiene que explicar una escena culturalmente genérica.
4. **Vínculo de marca:** qué disciplina demuestra y cómo se atribuye. Efeonce firma concepto, dirección y
   producción; la pieza no afirma que un CRM resuelva el duelo ni necesita insertar un objeto corporativo.

Aplicar pruebas: ¿se reconoce la ocasión sin leer? ¿el cambio se entiende sin sonido? ¿el texto y la imagen
se complementan? ¿la marca tiene un papel defendible? ¿el movimiento produce significado o sólo adorna?
Épico se traduce en escala, profundidad, anticipación, contraste y resolución emocional. No implica fuego
destructivo, cámara frenética, percusión bélica, glitches ni acumulación de efectos.

## 3. Contrato visual y continuidad

Separar elementos protegidos de variables animables. En este caso:

- Protegidos: una vela marfil, un cuenco de terracota decorado, cempasúchil naranja, camino de pétalos,
  papel picado morado, calavera de azúcar a la derecha, muro ciruela y proporciones del mundo aprobado.
- Animables: llama, reflejos de luz, mínima vibración del papel y cámara con trayectoria físicamente coherente.
- Prohibidos para esta ejecución: duplicación de velas/personas, cuerpos ardiendo, fuego en flores/papel,
  calaveras flotantes, miembros nuevos, horror o transformación de la identidad de marca.

La llama-abrazo debe nacer de una misma mecha, conservar continuidad luminosa y dejar legibles dos perfiles.
No trasladar estas prohibiciones de caso a toda creatividad mexicana. Revisar pertinencia cultural de cada
nueva escena; no convertir símbolos sagrados o personales en superficies de branding por rutina.

## 4. Storyboard, contact sheet y keyframes

Preparar tabla con tiempo, encuadre, acción, cámara, foco, continuidad, sonido y transición. Crear un contact
sheet ilustrativo con paneles numerados y tiempos en su leyenda. Etiquetarlo **previs ilustrativa**. No es
un video, un animatic medido ni evidencia del modelo. Para validar ritmo, producir un animatic cuando el
encargo lo requiera; si una prueba exploratoria avanza sin él, registrar esa limitación.

Exportar referencias individuales. No enviar el mosaico como primer fotograma salvo contrato explícito de
storyboard del modelo. Usar plate limpio sin titular/logo para generar movimiento; reservar el diseño final
como referencia de composición. Si inicio y final son requisitos exactos, preparar ambos y confirmar soporte
real. Un keyframe adjunto no garantiza que el modelo respete geometría ni tiempo.

| Tramo propuesto para este caso | Acción | Cámara | Audio |
|---|---|---|---|
| 0–3 s | Camino de pétalos y llama ordinaria | Dolly bajo, profundidad y foco hacia la vela | Ambiente, papel y pulso grave |
| 3–6 s | La llama crece | Ascenso suave y arco lateral pequeño | Acumulación de cuerdas y fuego |
| 6–10 s | Dos corrientes forman el abrazo | Acercamiento con desaceleración | Crescendo y resolución al encuentro |
| 10–12 s | Se reconoce la metáfora completa | Retroceso limitado al encuadre hero | Apertura armónica |
| 12–15 s | Abrazo vivo y lectura | Hold con fluctuación natural | Decaimiento, sin corte brusco |

Estos tiempos son dirección, no hechos verificados por escribirlos en el prompt. Después de generar,
ajustar montaje y entrada tipográfica al comportamiento observado. Evitar que el retroceso empequeñezca el
motivo principal. Fijar encuadre y tamaño objetivo comparándolos con el KV, no sólo «zoom out cinematic».

## 5. Selección, preflight y ejecución del modelo

Preferir el modelo solicitado si está disponible. No declarar un ganador universal por preferencia ni
comparar modelos no probados. Descubrir herramientas y consultar el schema vigente: ID, modo, duración,
resolución, relación, roles de referencia, audio, restricciones y costo con los medios definitivos.
Guardar sólo parámetros no sensibles y respuesta útil; nunca URLs firmadas, credenciales o base64 en docs.

Secuencia: `models_get → preparar/subir referencia → confirmar carga → estimate_video_cost → generate_video
→ guardar job ID → jobs_wait → resultado → inspección → post → entrega`. Los nombres son del conector
Higgsfield observado, no un API universal. Respetar el contrato de herramientas disponible en cada sesión.

- Distinguir archivo local, attachment y sandbox remoto. Un conector remoto no puede leer arbitrariamente
  el disco del Mac. Usar su ruta soportada de upload; comprobar bytes/HTTP y confirmar antes de generar.
- Preferir upload directo soportado. No repetir la transferencia base64 en cientos de llamadas como receta:
  en esta prueba fue una contingencia lenta. Si se necesita un puente, comprobar límites antes, mantener
  payloads acotados, no imprimir bytes ni URLs firmadas y verificar hash del archivo reconstruido.
- En sandbox efímero, crear/procesar y exportar en la misma ejecución, o usar lease de background documentado.
  No confiar en persistencia después de que vence el entorno.
- Estimar cada intento con parámetros finales. Coste estimado ≠ débito confirmado; crédito del proveedor ≠
  Studio Credits de Efeonce. No inventar reserva/settlement internos para una llamada directa al conector.
- La instrucción de producir autoriza la prueba dentro del alcance acordado; no solicitar permisos redundantes.
  Si se devuelve `unlim_choice`, no hubo generación: preguntar el texto devuelto y usar la elección del usuario.
  No escoger saldo automáticamente ni pasar flags de generaciones gratuitas incompatibles.
- Guardar ID apenas se envía. Un timeout no autoriza reenviar: consultar el mismo job. Respetar intervalos
  de polling y comunicar avances sin afirmar terminación. No duplicar un widget que ya se actualiza.
- Inspeccionar parámetros devueltos y ajustes. En esta prueba `end_image` acabó representado como
  `reference_images`: no certifica end-frame estricto. Si es indispensable, verificarlo o cambiar de ruta.

### Snapshot de la prueba, no defaults permanentes

Conector consultado el 2026-09-12: `seedance_2_5`, `mode=omni_reference`, 15 s, `resolution=1080p`,
`aspect_ratio=9:16`, `generate_audio=true`, `bitrate_mode=high`, `count=1`. Estimación: 135 créditos vendor.
Schema observado: duraciones 4–30 s, resoluciones 480p/720p/1080p. Reconsultar antes de otra ejecución;
no afirmar precios/capacidades actuales a partir de este documento.

## 6. Prompt por toma

Orden: intención y duración → función de cada referencia → invariantes → acciones temporales → trayectoria
continua de cámara → cierre y espacio editorial → sonido → exclusiones específicas. No pedir al modelo
que diseñe el titular o reproduzca un logo exacto si después se compondrán como firma editorial.

```text
Crear [duración/formato] en el mundo visual de [referencia y rol].
Preservar [objetos, geometría, materiales, color y símbolo cultural].
[0–A]: [estado inicial, acción, cámara y foco].
[A–B]: [transformación causal legible].
[B–C]: [revelación, tamaño del motivo y desaceleración].
[C–fin]: [encuadre estable con movimiento ambiental, espacio para copy].
Sonido: [ambiente, eventos sincronizados, progresión musical, resolución].
Sin [defectos concretos]; sin texto, logo ni watermark generados.
```

Si falla sólo texto, posición, duración de lectura o mezcla, corregir en post. Si falla geometría,
formación del símbolo o continuidad esencial, preparar una nueva toma/ref y estimar el nuevo intento.
No gastar una nueva generación para corregir una firma editorial que pertenece a composición.

## 7. Tipografía, logo y product placement temporal

Crear capas independientes a resolución final desde fuente y SVG oficiales. Conservar fuente, peso/ejes,
tracking, interlínea, caja de tinta y copy literal. Componer después de la generación; las letras no deben
morfear con la llama. El diseño final puede entregarse al modelo como referencia, pero no sustituye estas capas.

Caso: Bricolage Grotesque (`src/assets/fonts/BricolageGrotesque-Variable.ttf`), titular en dos líneas,
«Hay abrazos» / «que encendemos.», y `public/branding/logo-negative.svg`. En el master 1080×1920, la capa
headline conserva el layout del estático; fade de 11,7 a 12,4 s. Logo ancho 200 px, x=440/y=1580,
proporción original, fade 12,5–13 s. Ambos quedan completos hasta 15 s. Son valores de este candidato,
no una plantilla obligatoria ni safe zones oficiales de todas las redes.

Verificar contraste durante entrada y hold, no sólo al final. El primer píxel del fade no equivale a tiempo
de lectura: contar cuando el texto es legible. Revisar a tamaño móvil, con interfaz del canal vigente,
fondo cambiante, saliencia y distancia entre titular, motivo y firma. Unificar recorrido visual sin separar
el logo en un foco competidor. Si un encuadre termina con poco aire, corregir layout/timing antes de publicar.

La firma en espacio de pantalla no requiere tracking 3D. Una marca grabada/impresa en un objeto sí requiere
perspectiva, proporción, material, iluminación, oclusión, desenfoque y seguimiento temporal estables:
aplicar `social-media-studio/references/brand-in-scene.md`. No confundir overlay con placement físico.

## 8. Audio y finishing

Decidir si el audio nativo sirve como candidato o si hacen falta música, foley y SFX separados. No duplicar
pistas sobre una mezcla nativa sin separar eventos. No afirmar stems, licencia comercial ni revisión auditiva
por existir un stream AAC. Escuchar inicio, transformación, resolución y final; revisar también sin sonido.

Medir el original y el export final. Una meta de mezcla como −14 LUFS-I y −1 dBTP es una decisión de entrega,
no una regla universal de Instagram. Usar normalización medida de dos pases cuando corresponda, exportar,
volver a medir y corregir overshoot del códec si el techo estricto lo exige. Evitar recorte y compresión
excesiva; un fade final puede cambiar la medición y necesita readback.

Caso real: original −21,08 LUFS-I / −5,44 dBTP; export con marca −13,93 LUFS-I / −0,99 dBTP, LRA 6,8.
El pico final está 0,01 dB sobre la meta propuesta de −1: no declarar cumplimiento exacto. La calidad
musical y sincronía completa quedaron pendientes de escucha; la medición no las certifica.

Original: HEVC 10 bits, 1080×1920, 24 fps, contenedor 15,05 s; AAC estéreo 32 kHz. Export: H.264 yuv420p,
15 s, AAC estéreo 48 kHz, faststart. Mantener fps nativos; remuestrear audio no recupera detalle perdido.
Conservar original generativo y composición con marca como archivos diferentes.

## 9. QA: gates y estados honestos

1. **Estratégico/cultural:** ocasión reconocible, metáfora pertinente, rol de marca, no claims inventados.
2. **Temporal:** reproducir todo el clip; revisar formación, cambios de foco, aceleraciones, raccord,
   parpadeos, objetos, perfiles, anclaje a mecha y estabilidad del cierre. Frames aislados no bastan.
3. **Editorial/marca:** exactitud, contraste a lo largo del tiempo, proporción, entrada y tiempo de lectura,
   límites del canal, balance entre motivo y firma. Revisar cada formato por separado.
4. **Sonoro:** escuchar música/foley, sync, transiciones y final; medir loudness, true peak y canales.
5. **Técnico/entrega:** decodificación, dimensiones, fps, duración, códecs, bytes/hash y apertura en destino.

Extraer contact sheet de fotogramas reales con marcas de tiempo. Conservarlo separado del storyboard.
Para este candidato se inspeccionaron ocho muestras aproximadamente en 1/3/5/7/9/11/13/15 s y un cierre
adicional a 13,5 s; no presentarlo como auditoría exhaustiva del video o audio. Si faltan tiempos exactos,
registrar el comando de extracción y no inventar precisión.

Estados: `preproducción` → `job enviado` → `generación terminada` → `candidato compuesto` → `QA completo`
→ `aprobado por operador` → `entregado` → `publicado`, registrando dimensiones independientes cuando
entrega y aprobación ocurren en otro orden. Nunca inferir los tres últimos por un `completed` del proveedor.

## 10. Entrega y reproducción

Aplicar `social-media-studio/efeonce/ONEDRIVE_DELIVERY.md`. Para una seasonality, conservar el video dentro
de la campaña: `Seasonalities/<Ocasión>/<AAAA>/<Concepto>/Video/<Versión>/`. No enviar todos los videos
al directorio Seasonalities: el propósito editorial decide la categoría, no el formato MP4.

Entregar MP4 reproducible; PNG para portada/contact sheet/stills, no para el video. Guardar original y
versión con marca con nombres inequívocos, LEEME de estado, manifest de parámetros no sensibles, medidas y
hashes. Revisar duplicados/versiones antes de escribir. No compartir logs/credenciales ni referencias de
otras cuentas. Guardar localmente no verifica sincronización remota ni permisos del equipo.

Mostrar el video con preview nativa o ruta absoluta. Si el usuario vuelve a pedir «muéstramelo», tratarlo
como posible fallo de presentación: abrir el archivo en el panel disponible o usar display nativo del
conector para el resultado correcto; no repetir indefinidamente el mismo embed. Un estado `queued` de
apertura no demuestra que el usuario ya lo esté viendo. No mostrar el original sin marca como si fuera el final.

## 11. Evidencia y aprendizaje del caso

Job Seedance: `82ad3bca-3174-4e9e-b0e1-c602bc9e2d43`. Carpeta relativa a la raíz Marketing:
`Seasonalities/Día de Muertos/2026/Hay abrazos que encendemos/Video/Seedance 2.5 v01/`.
Archivos: `efeonce-abrazos-seedance25-original-9x16-v01.mp4`,
`efeonce-abrazos-seedance25-con-marca-9x16-v01.mp4`, `contact-sheet-fotogramas-reales.png`,
`fotograma-cierre-con-marca.png`, `LEEME.md`, `produccion.json`.
SHA-256 composición: `e6b5ef75f3cf021832c2077a602eabaef366d6030de4fe194e6f5f6c8c82844e`.
SHA-256 original: `7d67dd9feb72453389740b556407637941035939f103bb701c2330386393d3cd`.

Funcionó en las muestras: mundo cultural reconocible, recorrido entre pétalos, llama ordinaria que se
abre y perfiles que forman abrazo; texto/logo exactos por post. Mejorable: retroceso final deja el abrazo
menor de lo deseado. No se hizo comparación A/B con Flux, Minimax u otro modelo; no afirmar superioridad.
No se completó animatic ni validación exhaustiva audiovisual: son pendientes del candidato, no pasos
supuestamente realizados. El «bien, actualiza» del usuario autoriza este aprendizaje; no documenta por sí
solo autorización para publicar ni certifica performance, recuerdo de marca o efectos emocionales medidos.

## 12. Decidir si la idea necesita video

Antes de animar, aplicar [video o estático por mecanismo creativo](../../social-media-studio/efeonce/SEASONAL_CONTENT.md#elegir-video-o-estático-por-el-mecanismo-creativo).
La transformación, secuencia o sonido deben aportar significado; una asociación completa en un encuadre
puede funcionar como estático. En «Hay abrazos que encendemos» se propone video como relato y estático
como síntesis, sin rendimiento comparado demostrado. Acortar el arranque entre pétalos y adelantar la
transformación es una mejora propuesta, todavía no ejecutada en v02. No generar ambos formatos por rutina.
