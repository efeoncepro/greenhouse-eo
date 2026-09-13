# Día del Pódcast 2026 — Una última pregunta

Estado verificado el 2026-09-13: **fotohistoria v04 aprobada y programada; publicación pendiente**.
La programación existente se consultó de nuevo en Metricool al cerrar esta documentación; no se crearon posts nuevos.

## Concepto y jerarquía

Marketing con Manzanitas es el programa/submarca de efeonce. Nexa entrevista a un consultor ficticio:
una afirmación de automatización total encuentra una pregunta sobre criterio editorial. El humor nace
de la conversación y del silencio, no de ridiculizar a una persona real. Altman/Amodei fueron ideas
iniciales, no invitados del resultado final. La celebración cierra con «Feliz día del Podcast» (sin tilde en Feliz).

El estudio representa una agencia moderna, colorida y premium: pared acústica azul, acentos y
sillones naranja, nogal, luz diurna y prácticas cálidas. Marketing con Manzanitas domina; efeonce
firma como marca madre. Un iPad sustituye la libreta. Vestuario, micrófonos cortos de base redonda,
vasos de agua, taza negra, posiciones y miradas forman el mapa de continuidad.

## Recorrido y decisiones

| Etapa | Resultado y decisión |
| --- | --- |
| Preproducción | Contactos, referencias y placas; los originales de Nexa son identidad, las imágenes del set son composición. No promover una cara deformada a referencia maestra. |
| Correcciones | Evitar textura movida/dañada en piel; una corrección de pared/logo debe quedar localizada. La aprobación del logo no aprueba automáticamente todos los rostros. |
| Logo físico | SVG oficial rasterizado a PNG transparente como entrada del modelo. El operador rechazó pegar un SVG plano sobre la pared: conservar perspectiva, luz y bokeh. No redibujar efeonce. |
| Video | Dos masters de 30 s significaban variantes de formato, no un minuto concatenado. Prioridad 9:16; gasto 16:9 diferido. |
| Audio/video revisado | Pronunciación de «intervenga» y silencios excesivos rechazados; no eran pausas intencionales para que el equipo arreglara la edición. Audio nativo no equivale a lipsync/pronunciación garantizados. |
| Proveedor posterior | El operador pidió Fal para futuras pruebas; el giro a estáticos evitó nuevas pruebas de video. No presentar Fal como ejecución realizada ni la capacidad de 30 s como contrato universal del proveedor. |
| Estático v01 | Rechazado por bandas azules y apariencia de contact sheet. |
| Fotohistoria v02 | Cinco fotografías 4:5 a sangre y globos materiales sobre la imagen; sin franja editorial azul ni paginación. La pared azul del set permanece. |
| v03 | Texto más compacto y separado de los bordes de los globos. |
| v04 | Seis escenas: pausa «…» antes del remate; nueva expresión resignada al pedir editar. Cuatro placas conservadas y dos nuevas ediciones. |
| Entrega | Instagram: seis PNG 1080×1350. LinkedIn: un PDF con seis páginas 4:5, no seis imágenes sueltas. |

El realismo no quedó certificado como perfecto: cabello, barba y prendas del invitado conservan
algunos patrones artificiales. La aprobación editorial y de programación no borra esta limitación.

## Secuencia final

1. Invitado: «Con IA puedes producirlo todo en automático».
2. Nexa: «¿Todo?». Invitado: «Guion, imagen, voz… todo».
3. Nexa: «¿Y quién decide si vale la pena publicarlo?».
4. Invitado callado, mirada baja, manos juntas: «…». No añadir «silencio incómodo» como explicación.
5. Invitado devuelve la mirada con media sonrisa resignada: «¿Podemos editar esa parte?».
6. Ambos en el estudio: «Feliz día del Podcast».

La pausa ocupa una imagen porque cambia la actuación y prepara el remate. No confundirla con
silencios largos defectuosos del video anterior.

## Composición y QA

Globos de cara crema satinada opaca, borde acrílico y reflejos cálidos; texto oscuro legible, no
transparencia que compita con la foto. Generar el entorno/globo y luego componer texto exacto
con Bricolage Grotesque mediante fontkit/Sharp; revisar el PNG exportado después de la última edición.
Esto no contradice la integración generativa del logo físico: son tratamientos distintos.

En las fuentes 1122×1402, Bricolage usa wght600, wdth100, opsz48, color #14283B y opacidad .96.
El multiplicador entre centros de tinta pasó de 1.20 a 1.02: **no es leading de línea base**.
Tamaños de la iteración: 58; 63/64; 57; 67; 88 px; cierre cy1065→1070.
El globo de pausa v04 usa cx662/cy1067, ancho245, texto105 px. Son medidas del caso, no tokens universales.
Mantener kerning nativo, sin comprimir horizontalmente las letras; medir aire contra la cara interior
del globo, no contra su sombra o cola.

No mostrar placas sin letras como entregables finales. Etiquetarlas como intermedias y, cuando se
pida «todas», mostrar cada pieza terminada; un contact sheet sirve para QA, no sustituye el carrusel.
El cierre aprobado permanece limpio y sin una segunda jerarquía gráfica innecesaria.

PDF: seis páginas uniformes de 540×675 pt, imágenes a sangre, 17.215.993 bytes en esta entrega.
Se exportó con pdf-lib, preservando resolución; no se certificó como PDF etiquetado/accesible.
Scripts locales son trazabilidad del caso, no un reemplazo del compositor/layout compiler canónico.

## Fuentes y archivo

La [biblioteca de Marketing con Manzanitas](MARKETING_CON_MANZANITAS_BRAND_RESOURCE_LIBRARY.md)
completa la referencia puntual del logo: nueve SVG, nombres exactos, colores, variantes y uso con efeonce.

Raíz OneDrive (la carpeta Alineación usa Unicode descompuesto):

`Alineación/5. Contenidos/Seasonalities/Día del Pódcast/2026/Una última pregunta`

- Preproducción/v02 y v03: continuidad, referencias, prompts, decisión de marca y QA históricos.
- Video/Seedance 2.5 v01: pruebas, no master aprobado para publicación.
- Estáticos/Fotohistoria v04: seis PNG, PDF, Fuentes, PROMPTS.json, manifest.json,
  componer-v04.cjs, exportar-linkedin.cjs, captions y PROGRAMACION-30-09-2026.json.
- Logo del programa: 13- Branding/SVG/mkt-con-manzanitas-dark-full.svg, relativo a Contenidos.
- Referencia de logo aprobada: exec-83268a5a-e156-4363-9f28-682fc0c9e869.png,
  directorio generado 01a09adb-af24-73f2-9ae4-01a3471cb231; marca de aprobación x89,2%, y9,6%.

Los medios pesados permanecen fuera de Git. La evidencia saneada con captions literales y media
rehosteada vive en [podcast-2026-scheduling-evidence.json](podcast-2026-scheduling-evidence.json).

## Copy y programación

El copy final ofrece una situación reconocible del podcast, no una lección promocional ni el spoiler
del remate. Instagram abre «Hay silencios que merecen quedarse en la edición. 🎙️»; LinkedIn
«Quien ha grabado un podcast conoce esa mirada: la de “esa pregunta no estaba en la pauta”».
Los literales completos del JSON y COPY-PROGRAMADO-* prevalecen sobre borradores anteriores.

El operador rechazó agregar explicaciones de IA al caption. Eso no autoriza ocultar metadatos:
Instagram conserva el flag nativo `isAiGenerated:true`, comunicado antes de programar.
No insertar la frase rechazada en alt text, primer comentario u otro campo como sustitución encubierta.
Requisitos legales/plataforma se verifican por separado para cada publicación.

Fecha: [International Podcast Day](https://internationalpodcastday.com/about/), 30 de septiembre.
Marca Metricool **Efeonce Group / 3961547**, Instagram efeoncepro y página LinkedIn
urn:li:organization:20503593 (no perfil personal). Zona America/Santiago, UTC−03 en estas fechas.

| Red | Fecha/hora local | Post | Estado leído |
| --- | --- | --- | --- |
| LinkedIn | 2026-09-30 11:00 | 375227205 | PENDING; autoPublish true; draft false; 1 PDF |
| Instagram | 2026-09-30 19:00 | 375227227 | PENDING; autoPublish true; draft false; 6 PNG en orden |

Las horas se eligieron con datos de la marca: miércoles11 LinkedIn2445; miércoles19 Instagram301.
La primera consulta de mejores horas estaba incompleta: ampliar rango antes de interpretar ausencias.
No convertir esos valores en una regla general ni en garantía de rendimiento.

Se revisaron duplicados antes de crear. Transporte de siete assets aprobados por la ruta pública
ya gobernada `gs://efeonce-group-greenhouse-public-media-prod/campaigns/dia-podcast-2026/v04/`,
sin cambios IAM, con comprobación HTTP/MIME; Metricool los rehosteó en static.metricool.com.
`saveExternalMediaFiles:false` en readback tras rehost no implica fallo. Verificar media real, no
sólo URL en caption. El PDF no requiere volver a convertir imágenes a PDF en el compositor.

## Cierre y continuidad

Documentación: bitácora operativa, descripción funcional, manual y skills espejo Social, Design,
Copy, Typography y Motion. No cambia arquitectura, runtime, permisos ni el router de agentes;
no corresponde inventar ADR ni modificar project_context/AGENTS/CLAUDE por esta campaña.
Este cierre no vuelve a generar, subir ni programar contenidos. Programado no equivale a publicado:
falta readback posterior al 30/09; no se creó monitor ni se autoriza nuevo gasto de video.
