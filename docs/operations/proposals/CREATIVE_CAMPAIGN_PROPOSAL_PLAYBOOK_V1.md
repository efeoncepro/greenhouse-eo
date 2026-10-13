# Propuesta de campaña creativa para un cliente — playbook de punta a punta (V1)

> **Tipo de documento:** Playbook operativo (para agentes y personas)
> **Versión:** 1.0
> **Creado:** 2026-10-12 por Claude, con Julio Reyes
> **Caso fuente:** Sika Mexicana, licitación privada Wherex N.º 1164 («conceptualización y despliegue creativo» de una campaña de lanzamientos). Al corte del 12/10/2026 el paquete estaba terminado para la revisión final del operador y **nada se había presentado en el portal**. El resultado de la licitación se desconoce.
> **Alcance de la evidencia:** un solo caso. Las reglas de este documento son las que el operador fijó o lo que se midió en ese caso; no son todavía un estándar probado en varias propuestas.
> **Skills:** [`greenhouse-public-private-tenders`](../../../.claude/skills/greenhouse-public-private-tenders/SKILL.md) · [`creative-practice`](../../../.claude/skills/creative-practice/SKILL.md) · [`deck-studio`](../../../.claude/skills/deck-studio/SKILL.md) · [`motion-design-studio`](../../../.claude/skills/motion-design-studio/SKILL.md) · [`audio-studio`](../../../.claude/skills/audio-studio/SKILL.md)

Cómo leer las marcas de este documento:

| Marca | Significa |
|---|---|
| **[operador]** | Instrucción o corrección literal del operador en el caso fuente |
| **[medido]** | Se comprobó en la sesión del caso |
| **[propuesta propia]** | Lo decidió el agente; nadie lo validó |
| **[no verificado]** | No se pudo comprobar |

Este playbook ordena el trabajo y fija las reglas. El detalle de cada pieza vive en su documento dueño (ver [§10](#10-documentos-dueños-del-detalle)); aquí se enlaza, no se copia.

## 1. Cuándo aplica

Aplica cuando un comprador pide a Efeonce una **propuesta creativa para su propia marca** y exige, como en el caso fuente:

- una evolución o conceptualización de su campaña o línea gráfica;
- piezas de muestra (imágenes para redes y un video corto);
- metodología, abordaje y tiempos de entrega;
- una oferta económica desglosada.

En el caso fuente llegó como licitación privada por un portal (Wherex), con ronda de preguntas y una sola ronda de ofertas.

No aplica a:

| Caso | Dónde mirar |
|---|---|
| Licitación en general (expediente, cumplimiento, paquete) | [Construir una licitación](../../manual-de-uso/comercial/construir-una-licitacion.md) y la skill `greenhouse-public-private-tenders` |
| Propuesta técnica SEO/AEO | [Propuesta técnica para leer sin presentador](../../manual-de-uso/comercial/armar-propuesta-tecnica-seo-sin-presentador.md) |
| Sólo la parte gráfica (manual de campaña, piezas, portada) | [Propuesta gráfica creativa para un cliente](../../manual-de-uso/creative/propuesta-grafica-creativa-para-cliente.md) |
| Cómo se vende y se cotiza el servicio creativo | Skill `creative-practice` (capacidad gobernada, nunca horas ni piezas) |

## 2. El paquete: cinco piezas

| # | Pieza | Formato en el caso | Con qué se produce | Documento dueño |
|---|---|---|---|---|
| 1 | Anexo gráfico: manual de identidad de la campaña, piezas de muestra y storyboard | PDF, 21 páginas | Lienzo de Claude Design: tableros `.dc.html` generados por código Python (`gen*.py`), exportados a PDF | [Manual de la parte gráfica](../../manual-de-uso/creative/propuesta-grafica-creativa-para-cliente.md) |
| 2 | Propuesta técnica | Deck 16:9, 22 láminas, PDF | Generador propio del taller (`build-tecnica.py`, molde «propuesta para leer sin presentador», línea Brand); portada, cierre y lámina de caso con `pnpm brand:compose` | [LEEME del taller](../../../ai-generations/2026-10-12_sika-propuesta-tecnica/LEEME.md) · `deck-studio` |
| 3 | Reel de muestra | MP4 9:16, 25 s, 1080×1920, con locución y música | Cuadros fijos (GPT Image 2.5 Sunburst) → planos (Seedance 2.5 por BytePlus) → capa de motion (HTML + GSAP) → montaje (ffmpeg) → voz (Eleven v4) y música (ElevenLabs Music v2.5) | LEEME del taller, sección «Reel v2» · `motion-design-studio` · `audio-studio` |
| 4 | Página para ver el reel | URL en Think + QR | Astro, `AxisVideoPlayer` (skin Cinema), `noindex`, sin analítica | Comentario de cabecera de la página en el repo `efeonce-think` |
| 5 | Oferta económica | PDF A4, 4 páginas | Plantilla A4 de Efeonce, versión 2 (`render-cotizacion-a4.mjs`) | [Plantilla A4](../../commercial/templates/cotizacion-a4/README.md) |

**El deck técnico y el anexo gráfico son documentos separados**, no una sola propuesta **[operador]**.

## 3. Secuencia de trabajo

| Paso | Qué se hace | Se cierra cuando |
|---|---|---|
| 1. Leer al comprador | Bases, ficha del portal y **todo** el Centro de mensajes, incluidas las preguntas de los otros proveedores y sus respuestas ([§4.1](#41-leer-al-comprador)) | Hay una lista de lo que se pide **con las palabras del comprador** y de lo que sigue sin respuesta |
| 2. Sistema y piezas | Manual de identidad de la campaña, pieza madre y muestras, en el lienzo ([manual gráfico](../../manual-de-uso/creative/propuesta-grafica-creativa-para-cliente.md)) | El operador aprobó la pieza madre y las muestras |
| 3. Deck técnico | Metodología, alcance, plazo, control, equipo y experiencia, como documento aparte ([§4.3](#43-deck-técnico)) | Todos los hilos de comentarios del operador están resueltos |
| 4. Reel | Idea, cuadros fijos, planos, capa de motion, montaje y audio ([§4.4](#44-reel-de-muestra)) | El operador lo vio **y lo oyó** y lo aprobó |
| 5. Página y QR | Página del reel en Think; QR y enlace en el deck y en el storyboard del anexo ([§4.5](#45-página-del-reel-y-qr)) | Readback de la página y de los medios hecho |
| 6. Económica | Releer ficha y mensajes, costear, acordar el precio con el operador y emitir con la plantilla A4 ([§4.6](#46-oferta-económica)) | Las páginas del PDF están revisadas y el manifiesto registra la revisión |
| 7. Exportar | PDF del deck, del anexo y de la económica, y el MP4, a la carpeta de la licitación | El operador dio el aviso de exportar; se exporta todo de una vez |
| 8. Presentar | Cargar archivos, completar campos y enviar en el portal | **Sólo con la confirmación expresa del operador en ese momento** |

Dos reglas cruzan toda la secuencia:

- **Releer la ficha y el Centro de mensajes completo antes de congelar cada documento, y otra vez antes de la económica.** En el caso, una respuesta dada a otro proveedor (se espera una propuesta de SLA por niveles de complejidad) se leyó tarde, con el deck ya exportado; hubo que agregar una lámina y volver a exportar.
- **El operador revisa comentando sobre el tablero del lienzo**; el agente corrige el generador, vuelve a renderizar, mira el render, responde en el hilo y lo resuelve.

## 4. Reglas por pieza

### 4.1 Leer al comprador

- **Leer no modifica nada, y presentar exige permiso.** Cargar archivos, enviar mensajes o presentar en el portal se hace sólo con la confirmación expresa del operador en ese momento **[operador]**.
- **El Centro de mensajes muestra las preguntas de todos los proveedores.** En el caso, las respuestas a otros definieron el alcance a cotizar (un «lanzamiento tipo» con cantidades por formato, más el desarrollo de la pieza madre), que el video de muestra podía ser storyboard o animatic, que para punto de venta sólo se pedía el diseño, que la volumetría era una referencia para comparar ofertas y que las condiciones de pago se revisarían después **[medido]**.
- **La ficha responde cosas que nadie contestó por mensaje.** La pregunta por la moneda no tuvo respuesta, pero el paso del servicio licitado ya mostraba un selector de moneda, un solo servicio con un monto total y la leyenda de que el total no considera IVA **[medido]**.
- **La pestaña de información trae los datos de facturación del comprador** (razón social, identificador fiscal, dirección) y las condiciones de pago. La plantilla de la económica necesita el identificador fiscal **[medido]**.
- **La hora de cierre se muestra en la hora local de quien mira.** Confírmala con el comprador **[medido]**: en el caso, 19:00 en Santiago eran las 16:00 en Ciudad de México.

Mecánica medida en Wherex (para revisar oportunidades, ver [Revisar licitaciones Wherex](../../manual-de-uso/comercial/revisar-licitaciones-wherex-con-chrome.md)): la oferta tiene los pasos «Información y preguntas» → «1. Servicio licitado» → «2. Condiciones y archivos adjuntos» → «3. Resumen y enviar oferta». El clic sobre el rótulo del paso no navega; se avanza con «Siguiente». El estado «Editando» ya existía antes de leer.

### 4.2 Anexo gráfico

El método completo (sistema antes que piezas, fotos de producto con el render oficial, firma de Efeonce fuera del material del cliente, portada, PDF) está en el [manual de la parte gráfica](../../manual-de-uso/creative/propuesta-grafica-creativa-para-cliente.md) y en el [caso](../../commercial/tenders/sika-mexico-campana-creativa-1164/propuesta-grafica-creativa.md). Lo que el resto del paquete le exige al anexo:

- **El manual de la campaña es la fuente de todo lo demás.** El reel, la página y el deck toman el sello, la firma y las reglas gráficas **desde el generador del manual**, sin redibujarlos.
- **El storyboard del anexo muestra los cuadros del reel aprobado** y lleva el QR y el enlace a la página.
- **El anexo también le habla al cliente.** Si el deck se corrige de tercera a segunda persona, el anexo se barre igual.

### 4.3 Deck técnico

Reglas **[operador]** (12/10/2026, sobre comentarios en el lienzo):

| # | Regla | Cita o caso |
|---|---|---|
| 1 | **Se le habla al cliente.** Segunda persona formal: ustedes, su brief, sus respuestas. Nunca narrar «el cliente pidió, indicó, confirmó» como si se le contara a un tercero | El rótulo fijo pasó a «Qué significa para ustedes»; se corrigieron cerca de 60 frases con un script de reemplazos y una búsqueda de verbos en tercera persona |
| 2 | **Nada defensivo ni que limite el alcance.** Fuera: láminas de «piezas adicionales», tarjetas «Fuera del servicio», líneas de moneda y facturación, líneas de «idioma y textos» | «¿Es realmente necesario decir esto? ¿Para qué?» · «no tiene sentido acá» · «¿en qué aporta acá?» |
| 3 | **No exponer la distancia.** Se dice que hay personas en ambos países y una sola persona responsable; no «desde Chile» ni «horas en común» | «nos puede jugar en contra» |
| 4 | **Plazo competitivo.** | 15 a 20 días por lanzamiento fue «demasiado tiempo para un cliente de este tipo»; quedó en diez días hábiles, con la pieza madre a aprobación el día 4 **[propuesta propia, sin validar por operaciones]** |
| 5 | **El caso de éxito es la lámina aprobada, no una hecha a mano.** Receta `decision-case` del compositor, con la foto correcta del caso | El operador rechazó la lámina hecha a mano y pidió la foto específica del caso |
| 6 | **Equipo con nombre y tamaño.** Fotos reales del squad y la cifra de tamaño del equipo destacada | La cifra usada («+85 profesionales en toda Latinoamérica») la dio el operador; no tiene fuente en el repo |
| 7 | **Títulos directos**, sin formato de pregunta y respuesta | Instrucción del 07/10 para ese deck |
| 8 | **Cumplimiento con las palabras de la ficha.** La lámina de cumplimiento cita literal lo que pide el comprador y dice en qué lámina o anexo está cada cosa | — |
| 9 | **Si la ficha pide un video, se entrega un video.** | El comprador admitía storyboard; el operador decidió entregar el reel real ([§4.4](#44-reel-de-muestra)) |

Orden de referencia (el del caso, 22 láminas): portada · la idea (pieza madre a página completa) · cumplimiento · punto de partida · evolución (qué se conserva y qué se ordena) · el sistema · el brief punto por punto · audiencias · muestras · alcance · método (cinco etapas, dos aprobaciones del cliente) · lanzamiento tipo · reel (QR y enlace) · plazo · tiempos por nivel de complejidad (lo que el comprador llamó SLA) · control (aprobación, rondas, contenido técnico, IA, derechos) · equipo · trabajo con el país del cliente · experiencia (caso) · continuidad · inicio (cinco insumos) · cierre.

Cómo se produjo en el caso (comandos completos y fuente de cada dato por lámina, en el [LEEME del taller](../../../ai-generations/2026-10-12_sika-propuesta-tecnica/LEEME.md)):

- Un solo generador Python escribe el HTML local (para PNG y PDF) y los tableros `.dc.html` del lienzo. La navegación en anillo y los íconos Trazo salen de `@efeoncepro/axis-graphic-line` (`deckSlideHtml`, `resolveIcon`, `auditIconGroup`).
- Portada `cover-proposal` y cierre `close-proposal` con `pnpm brand:compose`.
- PDF: un JPEG por lámina, unidos con pdf-lib; el enlace del QR es una anotación URI sobre la lámina. `render.mjs` avisa si un bloque de texto se desborda.

Esto describe el taller del caso, no la vía gobernada de decks. Para recetas por lámina, selector de plantilla y Composer, mandan `deck-studio` y [Componer un deck con recetas](../../manual-de-uso/creative/componer-deck-con-recetas.md).

### 4.4 Reel de muestra

**El listón [operador]:** la primera versión (un animatic con audio) fue rechazada: «no se ve cinemático y profesional como requiere Sika». El cliente pauta en televisión y medios programáticos; la muestra «debe ser de impacto».

**Lo que se aprobó:** una sola idea con antagonista, estructurada como gancho macro en cámara lenta → tres lugares → giro tipográfico → aplicación del producto → envase héroe → firma de campaña. 25 s; cortes en 4 · 6 · 8 · 10 · 12 · 17 · 21 s.

Tubería **[medido]**:

| Etapa | Cómo | Regla |
|---|---|---|
| 1. Cuadros fijos | `pnpm ai:image --model gpt-image-2.5-sunburst --quality high --size 1024x1536 [--batch <json>] [--image <ref>]` | El envase se genera con el **render oficial del cliente como `--image`**; la etiqueta se revisa al 100 % |
| 2. Planos | `pnpm ai:byteplus --model seedance25 --image <primer cuadro> --prompt-file <movimiento> --duration 5 --aspect 9:16 --resolution 1080p --no-audio --out … --yes` | El operador pidió Seedance 2.5 por BytePlus por ser la API más barata. La etiqueta se mantuvo exacta en movimiento |
| 3. Capa de motion | HTML + GSAP con la tipografía y los elementos del manual de la campaña, renderizada cuadro a cuadro con Playwright a PNG con alfa | Los elementos aprobados se toman del generador del manual |
| 4. Montaje | ffmpeg **por segmentos**, con `-nostdin` y preset `veryfast` | Ver trampas en [§5](#5-trampas-medidas) |
| 5. Locución y música | Conector de claude.ai de ElevenLabs: `creative_generate_speech` (modelo `eleven_v4`) y `creative_generate_in_flow` con nodo `music` (`eleven_music_v2_5`) | La mezcla final lleva `loudnorm` |

La elección de modelo no se decide de memoria: [guía de selección de modelos](../../architecture/GREENHOUSE_AI_MEDIA_MODEL_SELECTION_GUIDE_V1.md) y [BytePlus directo](../../manual-de-uso/creative-studio/byteplus-directo.md). El método general de video está en [Producción y posproducción de video](../creative-production/VIDEO_PRODUCTION_AND_POSTPRODUCTION_V1.md).

Reglas **[operador]** que salieron de la revisión:

| Regla | Cita |
|---|---|
| **No estirar un plano para llenar su tiempo.** Se regenera el plano con la acción a velocidad real y la cámara lenta sólo donde corresponde | «cae muy lento… es extraña la lentitud» |
| **La música va en un solo tramo continuo.** No se reedita en trozos; los acentos se refuerzan con golpes sintetizados en los cortes | «La música la cortaste súper extraño… se nota muchísimo» |
| **El video sigue la línea gráfica del manual.** Etiquetas, campos de color, sello y titulares salen del manual de la campaña | «¿Sientes que el video sigue la línea gráfica que se armó?» |
| **No inventar variantes de un elemento aprobado.** El sello se toma del generador del manual; un elemento que el manual reserva para la firma no se usa suelto | El agente había inventado una caja «2 EN 1»; se reemplazó por el sello aprobado |
| **La voz es del país del cliente, en registro no coloquial, con el motor más avanzado disponible** | «tiene que ser de un mexicano (no coloquial) y… el motor más avanzado de Eleven Labs que es el V4» |

**El agente no puede oír.** La sincronía de voz, golpes y música la juzga el operador **[no verificado por el agente]**.

### 4.5 Página del reel y QR

Pedido **[operador]**: «una página en Think con el reproductor canónico de Efeonce… bien armada, con el video al centro… premium, con el logo de la campaña… y en la propuesta un QR y el enlace».

Cómo se hizo **[medido]** (repo `efeonce-think`, hermano de este):

- Página `src/pages/muestras/<slug>-<token>.astro` con `export const prerender = true`; medios en `public/muestras/<slug>-<token>/`.
- `BaseLayout` con `noindex` y `analytics={false}`.
- `AxisVideoPlayer` sobre `@efeoncepro/axis-ui-primitives/video-player`: `skin: 'cinema'`, `presentation: 'embedded'`, `surface: 'dark'`, `line: 'brand'`; subtítulos VTT y póster WebP.
- La firma de la campaña se renderiza desde el generador del manual; acompaña el logo de la práctica de Efeonce.
- Los colores de la campaña del cliente van como constantes locales comentadas («no son tokens de Efeonce»).
- El comentario de cabecera de la página dice cómo retirarla: borrar la página y su carpeta de medios, redeploy y readback.

Reglas:

- **El token de la URL es discreción, no seguridad.** El MP4 queda público por URL directa. No se publica ahí nada que no pueda verse.
- **Think despliega a producción al hacer push a `main`.** El push se hace sólo con autorización del operador. Antes, revisa `origin/main..HEAD`: en el caso, el push llevó también un commit de otra sesión que estaba sin empujar.
- **Readback después del deploy:** página 200 con `noindex, nofollow`; MP4 con rangos (206); VTT y póster 200; reproducción comprobada en navegador a tamaño de teléfono.
- **QR** con `qrcode` (nivel M), en la lámina del reel del deck y en el storyboard del anexo. Ambos PDF llevan además el enlace clicable.

### 4.6 Oferta económica

| Tema | Regla | Origen |
|---|---|---|
| Herramienta | **Plantilla A4 de Efeonce, versión 2** (varias líneas): `node scripts/documents/render-cotizacion-a4.mjs --data <caso>/cotizacion/cotizacion.json --out <carpeta nueva>`. No Excel | **[operador]**: «¿por qué lo generaste con eso si tenemos un render de Efeonce armado que funciona bien y tiene todo de Efeonce?» |
| Costeo | Cotizador V3 (`pnpm --silent pricing:v3 --current …`), oferta `creative-managed-service`, modalidad On-Demand, un período, con escenarios. El resultado es una simulación (`requires_review`), no una Quote | **[medido]** · [Cotizar V3 por CLI](../../manual-de-uso/finance/cotizar-v3-por-cli.md) |
| Precio | **Lo decide el operador.** El agente presenta escenarios y el piso de margen | **[operador]** |
| Desglose | **Por componente, no por pieza suelta:** primero estrategia y concepto (evolución gráfica; conceptualización y pieza madre), después los entregables agrupados (redes, video, punto de venta) | **[operador]**: «más que cotizar por pieza se cobra el refresh de marca, la conceptualización creativa y ahí luego entregables; ahí se justifica más el monto» |
| Reparto entre líneas | El cotizador entrega filas por rol, no por componente. El reparto lo hace el agente y se declara como tal | **[propuesta propia]** |
| Forma de pago | **No se inventa.** Si el comprador dijo que las condiciones se revisan después, el documento dice que se acuerdan al formalizar el servicio | El agente había puesto 30 días; se corrigió |
| Tarifario de extras | No se incluye si el comprador no lo pide como obligatorio (coherente con la regla 2 del deck) | En el caso era opcional |
| IVA | `not_applicable` imprime «IVA: No aplica»: es una afirmación fiscal y la decide Finance o el operador | **[medido]** |

**Riesgo que hay que avisar al operador.** Si el componente de «evolución gráfica» se presenta como pago único, los lanzamientos siguientes quedan en el total menos esa línea, que puede caer bajo el piso de margen calculado para un lanzamiento. En el caso, el documento lo cobra como parte de cada lanzamiento; la decisión es del operador.

La plantilla no decide precio, margen ni impuestos, y un PDF aprobado por el operador no reemplaza una Quote del sistema ni su gate ([frontera en la plantilla](../../commercial/templates/cotizacion-a4/README.md#elegir-la-vía-según-el-pedido)).

### 4.7 Lienzo y exportación

- Tableros `project/*.dc.html` más `project/canvas.json`; se publica con la herramienta Artifact (`root` = carpeta del lienzo, `file_path` = `canvas.json`, mapa `files`; `null` quita un archivo). Imágenes y video van como activos (`asset: true` → `/_blob/<id>`); un `blobs.json` local mapea nombre → blob **[medido]**.
- **No se exporta PDF hasta el aviso del operador**; después se exporta todo de una vez **[operador]**.
- **Corregir un anexo ya exportado sin rehacerlo:** se parte del PDF aprobado, se reemplaza la página que cambió y se pega sólo la franja de texto modificada sobre las otras (`anexo-pdf.cjs`, `embedPage` con caja). La versión anterior se conserva **[medido]**.

## 5. Trampas medidas

| Pieza | Síntoma | Causa | Qué hacer |
|---|---|---|---|
| Portal | El clic en el rótulo del paso no avanza | Así navega Wherex | Avanzar con «Siguiente» |
| Portal | La hora de cierre no coincide con la del comprador | Se muestra en la hora local del usuario | Confirmar la hora y la zona con el comprador |
| Deck | Portada con una selección «Cliente» que no se puede apagar | El intent de `cover-proposal` (dawn) no la expone | En el caso se quitó con un script (`quitar-seleccion-dawn.mjs`: espejo e interpolación vertical) |
| Deck | La respuesta de la portada se monta sobre la burbuja URL | Respuesta de dos líneas | Usar una línea |
| Deck | `decision-case` falla con `line-piece-keeps-efeonce-dark` | La receta sólo compone en claro y en línea `growth`; línea Brand en claro no pasa el contrato | Componer el caso como lámina clara en línea `growth` |
| Deck | La lámina de equipo del compositor trunca nombres completos y muestra la selección «Cliente» | Límite de la receta | En el caso se hizo a mano con las fotos reales del squad (`src/lib/artifact-composer/catalogs/deck-axis/assets/squad/`) |
| Deck / lienzo | El generador en modo lienzo falla **en silencio** | Una imagen nueva no tiene su blob en `blobs.json` | Subir el activo y registrar el blob antes de generar |
| Lienzo | La carga por lote de activos rechaza un archivo | Límite de 20 MB por archivo (el MP4 pesaba 22,4 MB) | Preparar una copia web más liviana |
| Reel | La página de Playwright se cierra al renderizar la capa de motion | `window.seek` devuelve la línea de tiempo y Playwright intenta serializarla | `window.seek` no devuelve nada |
| Reel | ffmpeg se queda detenido en segundo plano | Un solo ffmpeg con ocho entradas y `concat` (pasó dos veces) | Montar por segmentos, con `-nostdin` y preset `veryfast` |
| Reel | `afade st=` falla | `bc` imprime `.70`, sin el cero | Formatear el número con cero inicial (el `montaje.sh` del caso lo calcula con `awk` y `printf`) |
| Reel | La mezcla sale en mono | `amix` sin formato de canales | `aformat=channel_layouts=stereo` |
| Reel | Un plano deforma un elemento a partir de cierto segundo (en el caso, después del 2,85) | Causa no determinada | Usar el plano sólo hasta donde aguanta, o regenerarlo |
| Reel | Los empalmes de la música se notan | La pista salió de 43 s para un video de 25 s y se reeditó en cinco trozos | Usar un solo tramo continuo (en el caso, 17,45–42,45) y reforzar los cortes con golpes sintetizados |
| Audio | Los dos servidores MCP locales de ElevenLabs fallan con `invalid_api_key` | Tienen el id de la clave, no la `sk_` | Generar por el conector de claude.ai de ElevenLabs |
| Página | El push a `main` de Think lleva commits de otra sesión | Commits locales ajenos sin empujar | Revisar `origin/main..HEAD` antes del push |
| Económica | «Por confirmar» en grande como total, en portada e inversión | `vatRate: null` con `taxStatus: "pending"` | Definir el tratamiento del impuesto con Finance u operador |
| Económica | La unidad se parte en su columna («publicacion/es») | Unidad de cantidad larga | Unidades cortas («piezas», «diseños») |
| Económica | Media hoja vacía y una página de más | Los totales son un bloque entero: si no caben bajo la tabla, pasan a otra página | Detalles, título y nota tributaria de una línea; `checks.pagination` del manifiesto trae las alturas |
| Económica | El generador rechaza los datos | `buyer.taxId` es obligatorio; `buyer.logo.source` exige una URL HTTPS de fuente oficial | Tomar el identificador fiscal de la ficha del portal; sin fuente oficial del logo, `logo: null` |
| Deck y económica | El deck anuncia un desglose que la económica ya no tiene (en el caso, «el valor de cada pieza» en las láminas de cumplimiento y de lanzamiento tipo, con la económica ya desglosada por componente) **[medido]** | La económica se cerró después del deck y cambió de estructura | Tras cerrar la económica, buscar en el deck y en el anexo toda frase que la describa, corregirla, volver a exportar y reemplazar las copias |
| Económica | Una versión nueva no puede salir sobre la anterior | El generador exige una carpeta de salida nueva o vacía | Una carpeta por versión |

Moneda: la plantilla A4 funciona en pesos mexicanos (`currency: "MXN"`, `locale: "es-MX"`) **[medido]**.

## 6. Disciplina de trabajo

- **Mirar el render (PNG o PDF) antes de entregar.** Un número que pasa no aprueba una pieza.
- **Lo aprobado se reutiliza desde su generador** (sello, firma, lámina de caso). Redibujarlo o inventar una variante fue rechazado dos veces en el caso.
- **Cuando el operador corrige un tono, se barre todo el documento**, no sólo la lámina comentada.
- **Antes de usar una herramienta por precedente, buscar la canónica de Efeonce.** El `economica.json` del expediente y el precedente de otra licitación llevaron al Excel; la canónica era la plantilla A4.
- **Commits locales con rutas explícitas; push sólo con la señal del operador.**

## 7. Lista de control de cierre

Lectura del comprador

- [ ] Ficha y Centro de mensajes releídos completos, con fecha de la última lectura anotada en el expediente.
- [ ] Cada cosa que pide el comprador (ficha y respuestas, incluidas las dadas a otros proveedores) está cubierta o figura como pendiente declarado.
- [ ] Hora y zona de cierre confirmadas.

Deck técnico y anexo

- [ ] Segunda persona en todo el deck y en el anexo; búsqueda de verbos en tercera persona sin resultados.
- [ ] Sin láminas ni líneas defensivas o que limiten el alcance.
- [ ] La lámina de cumplimiento usa el texto literal de la ficha y remite a lámina o anexo.
- [ ] Caso de éxito desde la receta aprobada; autorización del cliente citado verificada o declarada pendiente.
- [ ] Plazo, equipo y cifras con su fuente; lo que es propuesta propia está marcado en el expediente.
- [ ] `render.mjs` sin avisos de desborde; todas las láminas miradas.
- [ ] El storyboard del anexo muestra el reel aprobado.

Reel, página y QR

- [ ] Etiqueta del producto revisada al 100 % en los cuadros fijos y en movimiento.
- [ ] La capa de motion usa los elementos del manual de la campaña.
- [ ] El operador oyó la mezcla final y la aprobó.
- [ ] Página con `noindex, nofollow`; MP4 con rangos; VTT y póster responden; reproducción comprobada.
- [ ] QR escaneado con un teléfono real (en el caso quedó **[no verificado]**).
- [ ] Enlace clicable en el deck y en el anexo.

Económica

- [ ] Precio decidido por el operador; desglose por componente; suma igual al total.
- [ ] Tratamiento del impuesto, validez y forma de pago decididos por quien corresponde, no por el agente.
- [ ] Riesgo del componente de pago único avisado.
- [ ] El deck y el anexo describen la económica como quedó (misma estructura de desglose, mismo plazo, mismos entregables); el total del documento es el monto que se escribirá en el portal.
- [ ] Todas las páginas del PDF miradas; texto extraído y fuentes revisadas (`pdftotext`, `pdffonts`); `visualReview` y `pdfTextAndPageAudit` registrados en el manifiesto.

Exportación y presentación

- [ ] El operador dio el aviso de exportar.
- [ ] Deck, anexo, económica y MP4 en la carpeta de la licitación, con sus versiones anteriores conservadas.
- [ ] Peso de los archivos revisado contra los límites del portal; copia liviana del video disponible.
- [ ] Expediente actualizado: qué está aprobado, qué es propuesta propia y qué sigue pendiente.
- [ ] **Nada cargado ni enviado en el portal sin la confirmación expresa del operador en ese momento.**

## 8. Qué queda fuera o sin validar

Fuera del alcance de este playbook:

- Decidir si se participa, el registro en CRM y el expediente de la licitación (`greenhouse-public-private-tenders`).
- La cotización persistida en Greenhouse, sus aprobaciones y el gate de Quote y margen. El caso quedó en `workshop_only`: sin Proposal ID ni render gobernado.
- La presentación en el portal: campos, adjuntos y envío no se ejercitaron en el caso.

Sin validar al corte del 12/10/2026 (no documentar como resuelto):

| Tema | Estado |
|---|---|
| Resultado de la licitación | Desconocido |
| Plazo de diez días hábiles por lanzamiento | **[propuesta propia]**, sin visto bueno de operaciones |
| SLA por niveles de complejidad que espera el comprador | Incorporado el 12/10 como lámina «Tiempos por nivel»: 2, 3 y 4 días hábiles según el nivel, urgencias y cumplimiento a la vista (primero se muestra el dato; el nivel comprometido se acuerda con tres meses de datos, según `creative-practice` módulo 11). Los tiempos son **[propuesta propia]**, sin visto bueno de operaciones |
| Tratamiento del IVA y validez de 60 días | La validez es **[propuesta propia]**; el IVA lo decide Finance |
| Evolución gráfica por lanzamiento o como pago único | Decisión del operador, abierta |
| Reparto del total entre componentes | **[propuesta propia]** |
| Autorización del cliente citado en la lámina de caso | Sin verificar |
| Uso de la marca del comprador en la portada y en el deck | Pendiente (TASK-1937) |
| Conflicto de interés con otro cliente del mismo rubro | Sin decidir |
| Campos y adjuntos del portal; peso del video | Sin revisar |
| Escaneo del QR con un teléfono real | **[no verificado]** |
| Sincronía de voz, golpes y música | La juzgó sólo el operador |
| Gasto total de IA del reel a 1080p | No quedó totalizado |

## 9. Caso fuente: Sika Mexicana, Wherex N.º 1164

Es el caso del que salen las reglas, no una plantilla para copiar: el concepto, el guion, los textos y los montos son de ese cliente.

| Dato | Valor |
|---|---|
| Comprador y proceso | Sika Mexicana, S.A. de C.V. · licitación privada de una ronda en Wherex, N.º 1164 |
| Cierre | 16/10/2026, 16:00 de Ciudad de México (19:00 de Santiago) |
| Estado al 12/10/2026 | Paquete terminado para la revisión final del operador; nada presentado |
| Anexo gráfico | «POSIBLE», 21 páginas |
| Deck técnico | 22 láminas, línea Brand |
| Reel | «El agua siempre busca una entrada», 25 s, aprobado por el operador el 12/10 |
| Página | `muestras/sika-posible-<token>` en Think, en producción desde el 12/10 |
| Económica | PDF A4 de 4 páginas, en pesos mexicanos |

Datos **internos** del caso (no se entregan al comprador; sólo como ejemplo de orden de magnitud):

- Precio decidido por el operador: MXN 64.000 netos por lanzamiento tipo. El agente había recomendado 70.000.
- Cotizador V3, tres escenarios: A MXN 63.700 · B USD 3.320 · C (25 % más de horas) MXN 76.700. Piso de margen 45 % ≈ MXN 57.650.
- Supuestos del agente en el costeo, sin validar por Operations ni Finance: 134 h, USD 60 de producción con IA, talento en Chile, tipo de cambio de política USD→MXN 19,25.
- Desglose final: evolución gráfica 16.000 · conceptualización y pieza madre 14.000 · redes (5 publicaciones y 6 historias) 11.000 · reel de hasta 30 s 14.000 · punto de venta e impresos (4 diseños) 9.000.
- Si la evolución gráfica fuera pago único, los lanzamientos siguientes quedarían en 48.000, bajo el piso.
- Costo de referencia de video: un clip de Seedance 2.5 de 5 s a 720p ≈ USD 2,31.

Expediente: [README](../../commercial/tenders/sika-mexico-campana-creativa-1164/README.md) · [oferta técnica](../../commercial/tenders/sika-mexico-campana-creativa-1164/oferta-tecnica.md) · [oferta económica](../../commercial/tenders/sika-mexico-campana-creativa-1164/oferta-economica.md) · [anexo gráfico](../../commercial/tenders/sika-mexico-campana-creativa-1164/propuesta-grafica-creativa.md) · [registro interno](../../commercial/tenders/sika-mexico-campana-creativa-1164/research/2026-10-07-propuesta-tecnica-INTERNO.md).

## 10. Documentos dueños del detalle

| Tema | Documento |
|---|---|
| Parte gráfica: lienzo, manual de campaña, fotos de producto, portada, PDF | [Propuesta gráfica creativa para un cliente](../../manual-de-uso/creative/propuesta-grafica-creativa-para-cliente.md) |
| Taller del deck y del reel: comandos, fuentes por lámina, versiones | [LEEME del taller](../../../ai-generations/2026-10-12_sika-propuesta-tecnica/LEEME.md) (`build-tecnica.py`, `render.mjs`, `pdf.mjs`, `anexo-pdf.cjs`, `reel/v2/`) |
| Oferta económica en A4: contrato de datos, paginación, revisión | [Plantilla A4](../../commercial/templates/cotizacion-a4/README.md) |
| Costeo | [Cotizar V3 por CLI](../../manual-de-uso/finance/cotizar-v3-por-cli.md) · skill `efeonce-pricing-operator` |
| Licitación: expediente, cumplimiento, registro | [`greenhouse-public-private-tenders`](../../../.claude/skills/greenhouse-public-private-tenders/SKILL.md) · [Construir una licitación](../../manual-de-uso/comercial/construir-una-licitacion.md) |
| Venta del servicio creativo: precio, rondas, derechos de uso | [`creative-practice`](../../../.claude/skills/creative-practice/SKILL.md) |
| Decks: oficio y recetas | [`deck-studio`](../../../.claude/skills/deck-studio/SKILL.md) · [Componer un deck con recetas](../../manual-de-uso/creative/componer-deck-con-recetas.md) |
| Video y motion | [`motion-design-studio`](../../../.claude/skills/motion-design-studio/SKILL.md) · [Producción y posproducción de video](../creative-production/VIDEO_PRODUCTION_AND_POSTPRODUCTION_V1.md) |
| Locución y música | [`audio-studio`](../../../.claude/skills/audio-studio/SKILL.md) |
| Elección de modelo y costo | [Guía de selección de modelos](../../architecture/GREENHOUSE_AI_MEDIA_MODEL_SELECTION_GUIDE_V1.md) |
| Página del reel | Repo `efeonce-think`: `src/pages/muestras/sika-posible-dde148ea051c.astro` y `public/muestras/sika-posible-dde148ea051c/` |

Los archivos de `ai-generations/` que no estén en disco se ubican con `pnpm ai-gen:where <ruta>` y se traen con `pnpm ai-gen:pull <carpeta>`; no se regeneran.
