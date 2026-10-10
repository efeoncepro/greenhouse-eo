# Deck «Marketing de Contenidos» de Efeonce (línea Brand) — aprobado 2026-10-10

Brochure de 57 láminas, 16:9, de todo lo que Efeonce vende en social media, influencer marketing, creadores y UGC,
listening y trendjacking, social care y paid social. El operador lo aprobó el 2026-10-10 («Me encantó todo, queda
aprobado» y luego «Esto quedó aprobado, canonizalo»).

- **Canvas (privado):** <https://claude.ai/artifact/De7FU2Z7YuZLx561KJ16Ph> (Design, sistema «Efeonce — La órbita»),
  versión 65. Tres páginas: «Deck» (57), «Ruta corta · 21 láminas» (copias para presentar) e «Interfaces · Marketing
  Studio» (cinco vistas construidas).
- **PDF (16:9, 57 páginas, rasterizado):** `Efeonce-Brochure-Marketing-de-Contenidos.pdf` en esta carpeta. La ruta
  corta (`…-ruta-corta.pdf`, 21 páginas) se regenera con el mismo comando y no entra a git. **No hay copia en OneDrive
  todavía:** el deck no se manda a un prospecto hasta cerrar los pendientes de abajo.
- **Fuente:** `project/*.dc.html` + `project/canvas.json` (copia exacta de lo publicado en el canvas, versión 65).
  `order.json` = orden de la página «Deck»; `order-ruta.json` = orden de la ruta corta (archivos `R-NN-*.dc.html`,
  copias de las láminas originales). `blobs/` = los assets del canvas (`/_blob/<id>`); los PNG/JPG no entran a git.
  `INVENTARIO-TEXTO.md` = el texto de las 57 láminas, extraído de la fuente.
- **Generadores:** `../laminas/` (Python; cada uno escribe su `.dc.html`): `fotoslides.generador.py` (láminas de foto
  con columna de voz), `frentes.generador.py` y `nuevas.py` (franjas de foto y las cinco láminas del 2026-10-10),
  `paid.py`, `deep.py`, `redes.py`, `ciclo.py`, `squad.py`, `mes.py`, `niveles.py`, `equipo.generador.py`; piezas
  compartidas en `lib.py` y `ui.py`; `eyebrows.py` (etiquetas de sección) y `reorden.py` (orden + ruta corta) son
  idempotentes y se corren después de regenerar. Las interfaces de Marketing Studio salen de `../ui/*.generador.py`.
  Las láminas marcadas «(receta)» salen de `pnpm brand:compose` con los intents de `../intents/`.
- **Rehacer el PDF:** traer `artifact-type/dc-runtime.js` del canvas a `project/` (no va en git; `support.js` es el
  shim de una línea que lo carga) y correr, desde la raíz de greenhouse-eo:
  `node ai-generations/2026-10-09_deck-contenidos/deck/exp/render-pdf.mjs ai-generations/2026-10-09_deck-contenidos/deck <salida.pdf> [order-ruta.json]`.
  Runtime real del canvas, captura 1920×1080 a `deviceScaleFactor` 2 en JPEG q88, una imagen a sangre por página.
- **Fotos de cine:** fichas en `../fotos/fichas/`, prompts en `../fotos/prompts/`, plates en `../fotos/plates/`
  (no entran a git). Piezas de la marca ficticia del ejemplo: `../ads/` (prompts en `batch.json` y `batch2.json`).

## Estructura

Apertura (1–5) · **Frentes** (6–27: los seis frentes que corren todo el año, con sus láminas de detalle) ·
**Momentos** (28–31: lanzamientos, cobertura en vivo, crisis y reputación) · **Programas** (32–36: creadores,
ejecutivos en LinkedIn, embajadores) · Cómo trabajamos (37–47) · Medición y prueba (48–53) · Cierre (54–57).

## Orden

01 Portada · 02 Tesis · 03 Lo que cambió: Cada pieza compite sola · 04 Seis frentes · 05 Caso Sky · 06 Social media · 07 Social media: Una idea, cada formato · 08 Social media: Series · 09 Social media: Producción · 10 Social media: Producción con IA · 11 Social media: Canales cerrados · 12 Influencer marketing · 13 Influencer marketing: Cómo elegimos creadores · 14 Creadores y UGC · 15 Listening y trendjacking · 16 Listening: De ruido a señales · 17 Listening: Trendjacking · 18 Listening: Social search · 19 Social care · 20 Social care: Cómo respondemos · 21 Social care: Personas y agentes · 22 Paid social · 23 Paid social: Probar y escalar · 24 Paid social: UGC patrocinado · 25 Paid social: Anuncios por canal · 26 Social commerce · 27 Redes que atendemos · 28 Momentos · 29 Momentos: Lanzamientos · 30 Momentos: Cobertura en vivo · 31 Momentos: Crisis y reputación · 32 Programas · 33 Programas: Creadores · 34 Programas: Voz ejecutiva en LinkedIn · 35 Programas: Ejecutivos en LinkedIn · 36 Programas: Embajadores de marca · 37 Cómo trabajamos · 38 Marketing Studio · 39 Stack · 40 Día a día · 41 Vívelo 1 · 42 Vívelo 2 · 43 Tu mes con nosotros · 44 El squad · 45 Expertos multidisciplinarios · 46 Control · 47 Derechos claros · 48 Medición · 49 Medición: Del social al CRM · 50 Testimonio · 51 Clientes · 52 Partners · 53 Mercados · 54 Niveles del plan · 55 Cómo empezar · 56 Próximos pasos · 57 Contraportada.

Láminas compuestas con una receta del compositor (14): Portada, Caso Sky, Social care · Personas y agentes, Stack, Día a día, Vívelo 1, Vívelo 2, Control, Testimonio, Clientes, Partners, Mercados, Próximos pasos, Contraportada.
Las demás se hicieron a mano en el canvas.

## Ruta corta (21)

01 Portada · 02 Tesis · 03 Lo que cambió: Cada pieza compite sola · 04 Seis frentes · 05 Caso Sky · 06 Social media · 07 Influencer marketing · 08 Creadores y UGC · 09 Social media: Producción con IA · 10 Listening y trendjacking · 11 Social care · 12 Paid social · 13 Momentos · 14 Programas · 15 Cómo trabajamos · 16 Día a día · 17 El squad · 18 Medición · 19 Niveles del plan · 20 Cómo empezar · 21 Contraportada.

Son copias: si cambia una lámina original hay que volver a correr `../laminas/reorden.py` y publicar.

## Qué quedó canonizado lámina por lámina (2026-10-10)

En `docs/operations/brand-graphic-line/EFEONCE_SURFACE_COMPOSITION_V1.md` (§4.6) y `deck-recipes/README.md`:

- «Día a día» con Marketing Studio: uso aprobado de `content-day-tools` (commit `f04933528`).
- «Producción con IA»: lámina a mano, candidata a receta; la foto CT24 entra al índice de recetas de cine (`0221b89dc`).
- Patrón «franjas de foto», variantes de seis y de tres franjas («Seis frentes», «Momentos», «Programas») (`b6f6f4cec`).
- Lámina de equipo «Expertos multidisciplinarios» con «+85» (`ddcdb79d4`).

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
