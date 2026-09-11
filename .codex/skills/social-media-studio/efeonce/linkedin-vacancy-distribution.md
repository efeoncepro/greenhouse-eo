# Difusión de vacantes de Efeonce en LinkedIn vía Metricool

Usa este companion para difundir en LinkedIn vacantes que ya están publicadas en Careers de Greenhouse, programando posts con el conector MCP de Metricool. Compone `social-media-studio` con `greenhouse-talent-people-operator`; no reemplaza el dominio Hiring ni sus comandos. Endpoints y gotchas de Metricool: `STUDIO_TOOLING.md` §"Metricool MCP".

## Precondiciones

1. Cada opening ya está publicado por el flujo canónico de Hiring y su detalle público responde HTTP 200 en `https://greenhouse.efeoncepro.com/public/careers/EO-OPN-XXXX`.
2. El copy es fiel a la ficha pública: roles, requisitos, elegibilidad, beneficios y proceso salen de ella. No afirmes lo que la ficha no dice; si la verdad del operador y la ficha difieren, corrige la ficha por el comando canónico (`updateHiringOpening` / `PATCH /api/hiring/openings/{id}`) con autorización, o registra la discrepancia como pendiente. No reveles presupuesto, rate bands, notas internas ni datos de candidatos.
3. La cuenta es la correcta por marca: resuelve el `brandId` con `getBrandSettings` por `label`. El perfil de Julio y la página de Efeonce son canales distintos con voz distinta (`EFEONCE_OVERLAY.md` §"Runtime real en Notion"; voz personal en `../../copywriting/efeonce/JULIO_REYES_VOICE_SYSTEM.md`).
4. El operador confirmó explícitamente el lote completo: copy de cada variante, horario, cuentas e imagen.

## Receta de copy

- **Primera persona plural** ("buscamos", "trabajamos", "te pagamos"). Nunca tercera persona sobre Efeonce.
- **Identidad de Efeonce en las primeras líneas**, antes del corte de "ver más" (~210 caracteres): quién contrata y por qué importa, antes que la lista de roles.
- **Un link de detalle por vacante** (`/public/careers/EO-OPN-XXXX`), no un único link al listado.
- **Estructura:** identidad → por cada rol: título + seniority, el problema que resolverá, "Queremos ver:" (la evidencia que pide la ficha) y 👉 su URL → cómo trabajamos → lo que recibes (versión corta del charter de beneficios, con su calificador de modalidad y país) → proceso (tiempo de postulación, ejercicios, plazo, adaptaciones, compensación conversada) → llamado a referir → hashtags (pocos; se usaron 4).
- **Límite de LinkedIn: 3.000 caracteres por post.** Mide con `wc -m` y también en unidades UTF-16 (un emoji como 👉 cuenta doble); ambas cifras deben quedar bajo el límite.
- **Variantes por canal, misma verdad de rol:** varía apertura y tono, nunca roles, requisitos, elegibilidad, beneficios, proceso ni links. En la página de empresa no repitas "Efeonce" como sujeto: LinkedIn ya muestra la página como autora.

## Imagen

- Pieza estática 4:5 (1080×1350) con los azules aprobados de marca y el logo real como sello. El arte puede venir de IA; el logo **nunca**: se compone desde el SVG. Receta en `../../greenhouse-ai-image-generator/SKILL.md` §"Reference edit + character consistency" (pieza social con sello de logo).
- Aloja el PNG final en una URL pública (bucket `campaigns/`, ver `STUDIO_TOOLING.md`) y verifica HTTP 200 y `content-type` antes de programar.
- Escribe un texto alternativo que describa la gráfica y el texto que contiene.

## Ejecución en Metricool y evidencia

1. `getBrandSettings`: resuelve el `brandId` y la `timezone` de cada marca.
2. `getBestTimeToPostByNetwork` con `socialNetwork: linkedin`: elige la hora pico de la semana y evita feriados o fiestas locales.
3. `getScheduledPosts` en cada marca: revisa colisiones en la cola. No toques posts ajenos a la operación.
4. `createScheduledPost` por marca (solo después de la confirmación): `autoPublish: true`, `draft: false`, `providers: [{network: linkedin}]`, `publicationDate {dateTime, timezone}`, `media: [URL pública]`, `mediaAltText: [texto]`, `linkedinData: {type: post, previewIncluded: false, publishImagesAsPDF: false}`, `firstCommentText: ""`.
5. `getScheduledPosts` en cada marca: confirma el id y el estado `PENDING`. `PENDING` significa programado, no publicado.
6. Después de la hora, confirma la publicación efectiva en Metricool y en LinkedIn antes de reportarla como publicada.
7. Conserva un registro fechado en `docs/operations/hiring/` con openings, URLs, marcas, horario y su justificación, resumen del copy aprobado, imagen (URL y alt text), ids de Metricool, estado observado y pendientes.

## Límites

- Es distribución externa: no crea, actualiza ni publica openings. Para eso usa `greenhouse-talent-people-operator` y `docs/manual-de-uso/hr/operar-careers-publicas.md`.
- **Atribución no medible hoy:** Careers no captura UTM ni fuente por postulación, así que agregar UTM a los links no mide nada. Publica los links limpios y trata el aporte de LinkedIn al funnel como un gap abierto hasta que exista una señal canónica en Hiring.
- Nada de DMs, invitaciones masivas ni comentarios automáticos sin una autorización aparte.
- La confirmación humana es obligatoria antes de programar, incluso si el copy ya estaba aprobado.

Referencia de una ejecución real: `docs/operations/hiring/2026-09-11-linkedin-vacancy-distribution.md`.
