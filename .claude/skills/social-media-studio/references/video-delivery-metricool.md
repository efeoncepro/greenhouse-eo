# Entregar y programar videos con portada en Metricool

Contrato operativo derivado de Fiestas Patrias y comprobado nuevamente en Día de Muertos el
2026-09-13. Es evidencia de las superficies usadas ese día, no garantía de capacidades futuras.
Caso creativo completo: [Fiestas Patrias](../../../../docs/operations/social/2026-09-13-fiestas-patrias-production-method.md).

## 1. Cerrar el paquete antes de programar

Identificar por red el video aprobado, portada, copy y fecha. Una adaptación 9:16 tiene composición,
acción y zonas de texto propias: si el usuario exige una adaptación real, producir el video vertical;
no completar un 4:5 con bandas, relleno de color o un fondo difuminado para llamarlo Reel nativo.
La portada es una pieza editorial autónoma que funciona sin reproducir: no es un contact sheet ni
necesariamente el cierre del video. No anticipar en ella un remate reservado al final. Validar sus
recortes de perfil/feed y legibilidad reducida, además del lienzo completo.

Guardar MP4 final con audio aprobado integrado y portada PNG master en la campaña de OneDrive.
Mantener masters/versiones anteriores; se publica el PNG (un JPG sólo existe ante un rechazo observado y nunca sustituye al PNG). Reabrir destino,
comprobar dimensiones y SHA-256. Registrar duración, resolución, FPS, códecs y versión de audio.
La aprobación de una cueca o pista se conserva: no regenerarla al adaptar el encuadre. Si se copia
sin recodificar, un hash del stream de audio demuestra igualdad; no confundirlo con hash del MP4.

## 2. Resolver autorización, cuenta y fecha

Una instrucción explícita como «prográmalo con sus portadas y copy» autoriza la programación de ese
contenido en esas redes. No pedir una segunda aprobación para ejecutar lo ya autorizado. Aprobar
un diseño, por sí solo, no autoriza publicarlo. Una autorización no se traslada a otra campaña.

Llamar `getBrandSettings` y verificar label, ID, timezone y handles antes de cualquier escritura.
En el caso verificado: Efeonce Group `3961547`, Instagram `efeoncepro` y LinkedIn
`urn:li:organization:20503593`. El perfil personal de Julio es otra marca. Estos IDs son pistas para
la búsqueda, no sustituyen el descubrimiento actual.

Consultar mejores horas por red y cola existente. `getBestTimeToPostByNetwork` recibe fechas ISO
con offset; calcularlo para la fecha de publicación mediante una zona IANA, no copiar el offset de
hoy. `America/Santiago` usaba `-03:00` para 2026-09-18 y 2026-11-02. Su `dayOfWeek` significa
1=lunes…7=domingo, no el índice de JavaScript. El valor es intensidad relativa, no probabilidad de
éxito. Elegir dentro del día solicitado; no mover una festividad a otro día por un pico. Sin datos,
explicitar criterio editorial y conservar la fecha autorizada.

`getBestTimeToPostByNetwork` devolvió horas parciales del día solicitado; ampliar la ventana y filtrar
por día antes de escoger el máximo. `getScheduledPosts` también puede devolver elementos adicionales:
no interpretar una consulta estrecha vacía como ausencia definitiva. Ampliar la ventana, revisar `extendedRange`
si el schema lo ofrece y filtrar localmente por `publicationDate`, zona, marca y provider. Comparar
concepto/copy, media y fecha para detectar duplicados. Una entrada `autolistData` sin ID de post
ni contenido concreto representa una autolista, no prueba de un post ya programado. Un composer
abierto sin guardar tampoco es un post. Ante respuesta incierta de creación, leer la cola antes de
reintentar para no duplicar.

## 3. Transportar media y crear un post por red

**Regla dura de formato (instrucción del operador, 2026-09-16): en social media las imágenes se generan y se
publican en PNG.** Aplica a posts estáticos, carruseles de Instagram, documentos de LinkedIn armados desde imágenes
y portadas de video. El JPG no garantiza la calidad: suma una compresión con pérdida antes de la que la plataforma
aplique por su cuenta.

- Generar con `--format png` (`pnpm ai:image` / `pnpm ai:fal`) y componer/exportar el master en PNG sRGB.
- Subir al bucket de campañas y pasar a Metricool **las URLs de los PNG**. Nunca derivar un JPG «de transporte» por
  costumbre ni por suponer que la red lo exige.
- Única excepción: un rechazo real y observado del conector o la red para ese PNG (error con evidencia). Registrar el
  error, derivar el JPG con la máxima calidad (q ≥ 95, 4:4:4) y declararlo en la entrega. Una suposición no es evidencia.
- Caso que motivó la regla: «Hay frases que no se tocan» (Instagram 377234791 y LinkedIn 377235636, 2026-09-16) se
  programó con JPEG q95 derivados de PNG sin que nada lo exigiera; el operador lo corrigió.

Descubrir el schema MCP actual. El conector usado exponía `createScheduledPost` con `blogId`,
`date`, `info` (JSON serializado) y `mediaFiles`; no asumir que acepta directamente todos los campos
del objeto interno. Mantener las fechas del envoltorio y `publicationDate` coherentes.

- La media debe tener URL pública accesible. Usar el alojamiento de campañas ya configurado:
  `gs://efeonce-group-greenhouse-public-media-prod/campaigns/<campaña>/`. No modificar IAM.
  Publicar sólo entregables destinados a redes, nunca fuentes privadas, logs o credenciales.
- Subir nombres versionados y `content-type` explícito. Verificar HTTP 200 y tipo correcto de video
  e imagen. Si cambia el archivo, usar URL nueva para evitar contenido anterior en caché.
- `media` contiene el MP4; la portada va en **`videoThumbnailUrl`**, no como segundo elemento de
  `media`. En el caso se admitieron JPEG (Fiestas Patrias) y PNG (Día de Muertos): **PNG es el default**
  (regla dura de formato, arriba); JPEG sólo ante un rechazo observado.
- Metricool re-alojó ambos recursos en `static.metricool.com/planner/...`; verificar media nativa y
  thumbnail persistidos. Una URL en el cuerpo del copy no equivale a adjuntar el video.
- Crear una publicación por red cuando copy u hora difieran. La portada puede compartirse si su
  encuadre es adecuado y la red la acepta; no asumir que un único archivo sirve siempre.

Campos internos verificados (fragmentos; no son el schema completo del MCP):

```json
{
  "publicationDate": {"dateTime": "2026-09-18T19:00:00", "timezone": "America/Santiago"},
  "text": "<copy literal aprobado para esta red>",
  "providers": [{"network": "instagram"}],
  "saveExternalMediaFiles": true,
  "autoPublish": true,
  "draft": false,
  "media": ["<URL pública del MP4 aprobado>"],
  "videoThumbnailUrl": "<URL pública de la portada>",
  "instagramData": {"autoPublish": true, "type": "REEL", "showReelOnFeed": true, "isAiGenerated": true}
}
```

Para LinkedIn se verificó `linkedinData: {"type":"POST","previewIncluded":false}`. El flag IA del
Reel corresponde al contenido generado y al disclosure aplicable, no a una propiedad universal de
todo video. Preservar copy literal aprobado por red; no reutilizar automáticamente el caption largo
de LinkedIn en Instagram. `mediaAltText` para imágenes cuando se soporte; el readback de estos
videos devolvió `[null]`, por lo que no afirmar que se publicó alt text en el video.

## 4. Readback, evidencia y cierre

La respuesta de creación no cierra la tarea. Leer nuevamente `getScheduledPosts` y comprobar por ID:
marca/provider, texto completo, fecha/hora/zona, MP4, `videoThumbnailUrl`, formato REEL/feed cuando
aplique, `autoPublish:true`, `draft:false` y `providers[].status:PENDING`. Distinguir ID numérico del
post y UUID del enlace del planner; conservar ambos sin intercambiarlos.

Guardar `PROGRAMACION.md` y un manifiesto saneado por campaña: archivos/hashes, copy por red, fecha,
hora y zona, IDs, UUID/enlaces, URLs de media/portada y campos de readback. Excluir correo del creador,
tokens, cookies y otros datos innecesarios del output bruto. Un borrador, autolista, upload o HTTP 200
no equivale a programación. `PENDING` significa **programado**, todavía no publicado. Sólo un readback
posterior a la hora puede confirmar publicación efectiva; programar no crea un monitor implícito.

Evidencia del 2026-09-13 (no estado vivo):

| Campaña | Fecha local | Red/hora | ID de post |
|---|---|---|---|
| Fiestas Patrias: Hay cosas que no necesitan rediseño | 2026-09-18 | LinkedIn 11:00 | 375161528 |
| Fiestas Patrias: Hay cosas que no necesitan rediseño | 2026-09-18 | Instagram 19:00 | 375161568 |
| Día de Muertos: Hay abrazos que encendemos | 2026-11-02 | LinkedIn 11:00 | 375165858 |
| Día de Muertos: Hay abrazos que encendemos | 2026-11-02 | Instagram 18:00 | 375165897 |

Las dos campañas conservan activos, copy y manifiestos separados. Día de Muertos verifica reutilización
del método y aceptación de PNG; no cambia la dirección creativa ni los entregables de Fiestas Patrias.
