# Fiestas Patrias 2026: de la dirección de arte a Metricool

Fecha de registro: 2026-09-13. Owner: Social Media Studio / Efeonce.
Concepto aprobado: **Hay cosas que no necesitan rediseño**.
Esta es la bitácora técnica y creativa del caso; las reglas reutilizables viven en las skills
enlazadas por el [protocolo social](../SOCIAL_CREATIVE_AGENT_EXECUTION_V1.md).
No convierte una ejecución local en una capacidad disponible de Globe.

## 1. Alcance y estado

El operador pidió nivel de estudio para una agencia que atiende segmentos medio-altos y altos:
comida apetecible, autenticidad chilena, contraste tipográfico, narrativa y firma reconocible.
El alcance evolucionó de exploración gráfica a video, reel nativo, portadas, captions, entrega y
programación autorizada. La aprobación de las últimas versiones y la solicitud de programarlas
constan en la conversación; no se deducen de una puntuación del agente.

| Entregable aprobado | Archivo | Especificación |
|---|---|---|
| LinkedIn | `efeonce-fiestas-patrias-v09-4x5.mp4` | 1080×1350, 9 s, 24 fps, 216 cuadros, H.264/AAC |
| Portada LinkedIn | `portada-linkedin-4x5.png` | 1080×1350; JPG derivado para transporte |
| Instagram | `efeonce-fiestas-patrias-reel-9x16.mp4` | v10, 1080×1920, 9 s, 24 fps, 216 cuadros, H.264/AAC |
| Portada Instagram | `portada-reel-9x16.png` | 1080×1920; JPG derivado para transporte |

Estado observado en Metricool el 2026-09-13: ambas publicaciones `PENDING`,
`autoPublish=true`, `draft=false`, videos y portadas alojados por Metricool.
Esto acredita programación; no publicación efectiva ni resultados de audiencia.

## 2. Decisiones que cambiaron el resultado

| Observación del operador | Corrección | Criterio transferible |
|---|---|---|
| Empanada deformada o excesivamente imperfecta | Vista reconocible y proporciones de una empanada chilena bien armada | El aspecto artesanal no justifica una anatomía incorrecta |
| Composición ordinaria o demasiado folclórica | Mesa con profundidad, luz cálida, fondo azul oscuro y utilería selectiva | La calidad viene de cámara, materia, luz y jerarquía; no del número de adornos |
| Texto con demasiado interespaciado/interlineado | Jerarquía por familia, peso y tamaño; medir huecos entre tinta real | Tracking, leading y escala son controles distintos; revisar el defecto concreto |
| Sólo un peso de Bricolage | Bricolage variable en 500/750/800 y Poppins Medium como contrapunto | Contraste con función narrativa, sin mezclar pesos indiscriminadamente |
| Saludo al inicio | Reservar “¡Felices Fiestas Patrias!” para el desenlace | Separar gancho, desarrollo, remate y firma |
| “Hay cosas” y continuación parecían frases desconectadas | “Hay cosas…” → “…que no necesitan” → “rediseño” | La puntuación conserva continuidad cuando cambia el plano textual |
| Logo parecía destinatario del saludo | Logo centrado al pie, sin “un saludo de” | La firma debe leerse como emisor, separada de la frase de felicitación |
| Fondo sin impacto / firma poco visible | Profundidad y desenfoque natural de primer plano; zona tranquila para el logo | Evitar un parche de blur o bloque de color que delate la corrección |
| Terremoto poco apetecible / reflejos excesivos | Helado y granadina legibles, vidrio con detalle; compresión localizada de altas luces | Brillo apetecible exige volumen y textura, no blancos recortados |
| Reel resuelto como extensión con relleno | Keyframe vertical y nueva toma generativa 9:16 | Una adaptación real recompone escena y overlays; no estira el master |

Estas observaciones son evidencia cualitativa de esta revisión, no resultados de un estudio de audiencia.
“Premium” no se traduce automáticamente en negro/dorado, tracking amplio ni minimalismo vacío.

## 3. Preproducción, referencias y elección de técnica

Recuperar antes de generar: concepto, país, ocasión, canales, copy literal, fuentes, logo oficial,
versión aceptada y defectos todavía abiertos. Las referencias se separan por función:
morfología del alimento, contexto de servicio, bebida, cámara/luz, material, composición y tipografía.
Si hace falta buscar bancos fotográficos, registrar fuente y derechos; una referencia visual no
concede licencia para reutilizar el archivo. El historial disponible no permite enumerar una
selección concreta de stock: no atribuir al caso una compra o descarga no acreditada.

Un contact sheet de preproducción permite comparar encuadres y continuidad antes del video.
Otro contact sheet, extraído del MP4 final, sirve para QA temporal; cumplen funciones distintas.
Preparar un keyframe sin texto generativo facilita mantener titulares y marca exactos después.

La empanada **no necesitó modelado 3D** en esta ejecución. Se utilizó imagen generativa como
base visual y video generativo para el movimiento ambiental, con composición posterior.
Considerar 3D si se necesita giro orbital amplio, interacción física controlada, múltiples ángulos
idénticos, geometría de producto verificable o animación de corte/relleno. La razón es control
de geometría y continuidad, no que 3D sea sinónimo de calidad.

## 4. Escena y apetito

La mesa ancla el contexto real de consumo. La empanada ocupa el primer plano; terremoto,
anticuchos y pebre aportan reconocimiento y capas. Paño y banderines acompañan sin competir.
Fondo azul profundo y luz cálida construyen contraste con la masa dorada y la bebida.

Revisar borde plegado, volumen, unión de masa, tostado y proporción respecto al plato; no aceptar
una empanada como bolsa amorfa, croissant o masa fundida. El dorado conserva tonos medios y
textura. Los anticuchos muestran ingredientes y cocción; el pebre conserva frescura.
En el terremoto, helado, granadina, líquido y vidrio deben distinguirse sin parecer plástico.
Vapor discreto: movimiento ambiental secundario que no tapa texto ni altera la forma del alimento.
No corregir por saturación global un problema localizado de altas luces o materia.

El tratamiento v09 usa máscaras suaves en FFmpeg: curvas para la bebida, curvas y
`unsharp=5:5:0.25:5:5:0` ligero para la empanada y reducción localizada de vapor.
El master v08/v09 parte de 1248×1664, recorta 1248×1560 en x=0/y=52 y escala proporcionalmente
a 1080×1350. El recorte conserva la composición; no hubo deformación geométrica de la comida.

## 5. Capas, fuentes y marca exacta

Separar plate limpio, motion generado, tipografía, cursor/selección, logo, audio y export final.
No pedir al modelo que resuelva el logo oficial o que escriba titulares exactos.
Activos del repo usados:

- `src/assets/fonts/BricolageGrotesque-Variable.ttf`: wght 200–800, wdth 75–100, opsz 12–96.
- `src/assets/fonts/Poppins-Medium.ttf` y familia local disponible.
- `public/branding/logo-negative.svg`, proporción original 837.07×196.68.

`fontkit` da shaping, avances, offsets y contornos; se convierten los glifos a paths SVG.
`sharp` rasteriza el overlay. Para Bricolage se fijaron wdth=100/opsz=96 con peso por rol.
No usar una fuente fallback ni aplicar tracking para disimular una falta de contraste.
La caja visible se calcula transformando el bbox de cada glifo; el hueco vertical es
`top(siguiente) - bottom(anterior)`, no la diferencia entre baselines.

| Texto de v09 | Familia/peso | Tamaño nominal | Posición x / baseline y |
|---|---|---|---|
| Hay cosas… | Bricolage 500 | 118 px | 74 / 205 |
| …que no necesitan | Poppins 500 | 54 px | 77 / 112 |
| rediseño | Bricolage 800 | 126 px | 74 / 225 |
| ¡Felices | Poppins 500 | 49 px | 77 / 105 |
| Fiestas Patrias! | Bricolage 750 | 98 px | 77 / 190 |

El hueco de tinta entre continuación y “rediseño” es 8.258 px; entre las líneas del saludo,
8.413 px aproximadamente. Son medidas del caso, no tokens universales. En v10 se ajustan
baselines a 320, 240, 353, 235 y 320 respectivamente; se conserva el ritmo entre líneas.
Logo v09: x=420/y=1230/ancho=240, centrado a x=540 y proporción intacta.
El mismo criterio exige verificar la zona de firma en cada formato, no copiar coordenadas.

## 6. Storytelling y tiempo efectivo

El gesto creativo es **decidir no rediseñar**: cursor y selección evocan el oficio de la agencia
sin transformar el alimento. No es una demostración de una interfaz funcional.

| Tiempo v09/v10 | Acción |
|---|---|
| 0.15–0.45 s | Entra “Hay cosas…” |
| 2.05–2.30 s | Sale el primer texto |
| 2.35–2.65 s | Entra “…que no necesitan” |
| 2.68–2.80 s | Aparece selección sobre la empanada |
| 3.28–3.50 s | Entra “rediseño”, coincidiendo con llegada al tirador |
| 3.35–3.95 s | Cursor duda; no arrastra ni escala |
| 3.95–4.45 s | Cursor se retira |
| 4.45–4.65 s | Selección desaparece |
| 5.35–5.60 s | Sale el concepto |
| 5.60–5.95 s | Mesa sin texto |
| 5.95–6.30 s | Entra saludo final |
| 6.55–6.90 s | Entra logo |
| 6.90–9.00 s | Cierre completo, 2.10 s de lectura |

Los overlays se calculan para cada cuadro, t=i/24, con interpolación suave. La selección
se ajusta a extremos visibles del alimento; no debe seleccionar toda la mesa.
Revisar que entradas/salidas, hold y relación gesto/palabra sobrevivan en el MP4 exportado.

## 7. Motor, iteraciones y adaptación nativa

El fondo inicial usa ImageGen; la toma ambiental usa Seedance 2.5. FFmpeg/fontkit/sharp
resuelven acabado, diseño exacto y ensamblaje. Un render local de overlays no se presenta
como nueva generación de video. El modelo no sustituye dirección, arte ni revisión.

| Paso acreditado | Identificador / evidencia | Alcance |
|---|---|---|
| Toma fuente v08 | Seedance job `a5beef64-3b63-4abc-8e3e-1b553f58f231` | 90 créditos del proveedor; un intento previo falló sin débito neto según registro v08 |
| Acabado v09 | `finish.filter`, `render-overlays.cjs` | Reutiliza toma; 0 nuevos créditos generativos |
| Toma vertical v10 | Seedance job `25ffe273-cc12-4e90-8d17-a803f56005b9` | Nuevo keyframe ImageGen, nuevo video 1080×1920; 90 créditos, saldo 2008.75→1918.75 |

Los costos son hechos de aquella ejecución, no tarifas vigentes ni Studio Credits de Globe.
El video vertical original dura 10 s; el master editado dura 9 s. No se añadieron franjas,
fondos duplicados, estiramientos ni color de relleno. Se recompusieron textos, selección,
cursor y logo sobre el nuevo encuadre.

## 8. Audio

Cueca chilena generada previamente con ElevenLabs vía Magnific, conservada durante el acabado.
El usuario la escuchó y aprobó explícitamente; esa aprobación posterior resuelve el pendiente
de escucha que todavía describía el LEEME de v08. No volver a generar audio por cambiar ratio.
El registro v08 informa −16.03 LUFS-I y −3.15 dBTP; medir no equivale a escuchar.

AAC estéreo 48 kHz copiado sin recodificar entre v08/v09/v10. SHA-256 del payload de audio:
`e85b016506bed5ceb39a9d47a04b327e00c7717c063b9c260df565053380bd5a`.
Esta prueba acredita identidad de audio entre versiones, no licencia ni calidad perceptiva.
El registro v08 conserva consulta de licencia comercial del 2026-09-13 a
[la página de música de Magnific](https://www.magnific.com/ai/music-generator).
Para reutilizar fuera del alcance, revalidar plan, proveedor, condiciones y autorización;
no convertir esa consulta fechada en cobertura universal.

## 9. Portadas autónomas

Una portada debe comunicar el concepto sin reproducir toda la secuencia temporal.
Se usa la frase completa “Hay cosas que no necesitan rediseño”, sin elipsis porque aquí
no hay interrupción, y el logo como firma. No usar “¡Felices Fiestas Patrias!” como apertura
ni sustituir la portada por un contact sheet. Se componen sobre fotogramas limpios de cada toma.

| Formato | Tres líneas: familia/peso/tamaño y baselines | Firma |
|---|---|---|
| 9:16 | Poppins500/52/y296; Bricolage750/104/y395; Bricolage800/126/y498 | x420/y1570/ancho240 |
| 4:5 | Poppins500/42/y105; Bricolage750/88/y188; Bricolage800/108/y278 | x420/y1230/ancho240 |

Portada 9:16: huecos reales 11.12 y 10.95 px; preview central 3:4 revisado como control
editorial, no garantía de todos los recortes de Instagram. Portada 4:5: huecos 9.164 y
11.116 px. PNG master; JPG 95, chroma 4:4:4 usado para transporte en esta programación.
Metricool también aceptó PNG en el caso posterior Día de Muertos: JPG no es obligación global.

## 10. Copy aprobado por canal

### LinkedIn

> Hoy tenemos una sola observación: que alcance para repetir.
>
> Hay cosas que no necesitan rediseño. Una empanada bien hecha, una cueca de fondo y una mesa donde siempre cabe alguien más.
>
> Que estas Fiestas Patrias nos den tiempo para compartir, brindar y alargar la sobremesa.
>
> ¡Felices Fiestas Patrias! 🇨🇱
>
> #FiestasPatrias #Efeonce

### Instagram

> Nuestra única observación: que alcance para repetir.
>
> ¡Felices Fiestas Patrias! 🇨🇱

El caption prolonga la complicidad del concepto; no introduce claims comerciales ni describe
herramientas de producción al público. Copy de portada, texto temporal y caption son superficies
diferentes. Mantener párrafos y caracteres literales en el JSON; no convertir saltos de línea
en secuencias visibles ni alterar el texto para resolver un error del conector.

## 11. Entrega, evidencia y programación

Ruta relativa a la biblioteca OneDrive Marketing `Alineación/5. Contenidos`:

`Seasonalities/Fiestas Patrias Chile/2026/Hay cosas que no necesitan rediseño/`

Se conservaron `Video/v09 - Remate y cierre/`, `Video/v10 - Reel nativo 9x16 y portada/`
y `Entrega para publicación/` con ambas versiones, portadas y captions.
La última carpeta contiene `PROGRAMACION.md` y `metricool-programacion-18-09-2026.json`.
Copia local comparada por hash; sincronización remota y permisos del equipo no verificados.
Los LEEME previos a la programación describen su momento histórico; el registro de programación
posterior es la evidencia de ese cambio de estado.

La cuenta fue resuelta en vivo: Efeonce Group, brandId=3961547; LinkedIn organización
20503593 e Instagram `efeoncepro`, zona `America/Santiago`. No usar el perfil personal
de Julio. El usuario autorizó ambas publicaciones y especificó 18/09/2026; no hacía falta
pedir otra confirmación. Horas elegidas con `getBestTimeToPostByNetwork` y cola revisada.

| Red | Fecha/hora local | ID | Planner |
|---|---|---|---|
| LinkedIn | 2026-09-18 11:00 | 375161528 | [Abrir](https://app.metricool.com/planner/calendar?blogId=3961547&openWithPostUuid=-629866128707793216) |
| Instagram REEL | 2026-09-18 19:00 | 375161568 | [Abrir](https://app.metricool.com/planner/calendar?blogId=3961547&openWithPostUuid=3955060729052676309) |

Valores relativos de las franjas del viernes: LinkedIn 2914 a las11; Instagram286 a las19.
No son pronósticos de rendimiento. El primer rango de Instagram devolvía sólo parte del
viernes; se amplió la consulta hasta recuperar horas faltantes y se filtró por día.
La autolista sin ID/texto/media no se trató como duplicado de campaña ni se modificó.

Assets servidos con HTTP200/MIME correcto desde
`gs://efeonce-group-greenhouse-public-media-prod/campaigns/fiestas-patrias-2026/`,
sin cambios IAM. Un post por red: `media=[URL.mp4]`, `videoThumbnailUrl=URL.jpg`,
`publicationDate={dateTime,timezone}`, `autoPublish=true`, `draft=false`,
`saveExternalMediaFiles=true`. LinkedIn `type=post`, `previewIncluded=false`;
Instagram `type=REEL`, `showReelOnFeed=true`, `isAiGenerated=true`.
El parámetro externo `date` lleva offset; el `dateTime` interno usa hora local sin offset.
El servidor normalizó LinkedIn a `POST`; respetar el valor del readback.

El [readback saneado](fiestas-patrias-2026-scheduling-evidence.json) conserva el resultado verificado.
Tras crear, `getScheduledPosts` confirmó IDs, fecha, zona, texto, proveedor, media,
thumbnail y estado. Los URLs finales de video y portada son `static.metricool.com/planner/...`:
media nativa re-alojada, no un enlace insertado en el caption.
La respuesta con `mediaAltText=[null]` corresponde a estos posts de video; no afirmar que
se publicó un alt text ni extrapolar esa ausencia a posts de imagen.

## 12. Verificación y límites

- Ambos masters: decodificación completa de 216 cuadros sin error, specs en `qa-technical.json`.
- v09/v10: 27 muestras reales y cierres a resolución completa revisados; no es inspección visual
  cuadro a cuadro de los 216 cuadros. Los contactos no prueban por sí solos continuidad perceptiva.
- Portadas: lectura, logo, alimento y márgenes revisados en el formato final.
- Audio: aprobación del usuario y hash de payload idéntico; export no sustituyó la cueca.
- Programación: readback positivo, sin afirmar publicación futura como hecha.
- No hubo medición de audiencia, conversión ni atribución de impacto.
- No se modificó Notion en esta programación: la task/calendario de planificación no equivale al scheduler.
- Evidencia local de trabajo: `.captures/fiestas-patrias-2026-v08/`, `v09/`, `v10-reel/`.
  Son carpetas locales ignoradas, no dependencias descargables del repo. El [manifiesto de artefactos](fiestas-patrias-2026-artifact-manifest.json)
  conserva hashes y metadatos para identificar entregables sin subir binarios.

## 13. Cómo se conserva el aprendizaje

Consultar el [manual operativo](../../manual-de-uso/social/producir-y-programar-seasonalities.md)
y la [descripción funcional](../../documentation/social/produccion-seasonalities.md).
El protocolo social enruta las skills de oficio; no duplicar esta bitácora en todos los SKILL.md.
El caso extiende el oficio bajo el ADR existente
`GREENHOUSE_AGENT_CONTEXT_ROUTER_DECISION_V1.md` y el contrato multimodal; no cambia
schema, compiler, autoridades, presupuesto, proveedores habilitados ni decisiones de release.

Día de Muertos fue una comprobación posterior del mismo transporte: 2026-11-02, LinkedIn11:00
ID375165858 e Instagram18:00 ID375165897, ambas con portada PNG y readback PENDING.
Tiene su propia carpeta y copy; no mezclar sus archivos o autorizaciones con Fiestas Patrias.


## 14. Revisión de esta documentación

Trabajo distribuido en tres subagentes con archivos separados: dirección/tipografía/copy/marca;
video/audio; entrega/programación. Integración y revisión final por el agente principal.
Se comprobaron enlaces añadidos, paridad de referencias, métricas contra scripts/JSON, igualdad
actual del payload AAC de ambos masters y readback fresco de Metricool. Una segunda revisión
contrastó todos los campos del manifiesto saneado con la evidencia original.

AGENTS.md/CLAUDE.md y el harness de implementación no requieren cambios: el router social existente
ya carga los dueños correctos; no se añade gate, runtime ni autoridad. Los SKILL raíz con overlays
específicos de agente conservan sus diferencias intencionales; las referencias nuevas se espejan.
El índice de docs, protocolo, planificación fechada, contexto y handoff enlazan las fuentes nuevas.
No se edita la caché de plugins ni la memoria privada como sustituto de documentación versionada.

Verificación de cierre: skills:mirrors, QA documental acotado a staged, docs:closure-check y
comprobación de enlaces/diff. El gate de contexto se ejecuta después de rotar el historial si lo exige.
El checker de paquete puede incluir WIP ajeno; la decisión de alcance usa el diff staged propio.
La revisión de escenarios cubrió: rechazo visual pese a decode verde; audio aprobado frente a LEEME
viejo; 9:16 con relleno; portada confundida con cierre; cuenta personal frente a empresa; timeout de
creación; rango horario parcial; PENDING confundido con publicado. Se resolvieron en sus fuentes.
