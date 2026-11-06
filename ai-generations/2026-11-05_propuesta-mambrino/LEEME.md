# Propuesta Trattoria Mambrino Chile · social media y contenido — 2026-11-05

**Estado:** borrador para revisión de Julio. Nada enviado. Línea **Brand** (social media y contenido), tuteo. La contraportada es la oficial de propuesta (`close-proposal-horizon`, «Empower your Growth»): la norma la fija para toda propuesta.
Fuente: reunión con Dayanna Vicente (Coordinadora de marketing, Grupo Mambrino) del 04/11/2026 en Notion;
contacto HubSpot 259368373373, empresa 60401677206 (Mambrino, Lima). Sin deal en HubSpot.

**Canvas de diseño:** https://claude.ai/artifact/GujCzjaq1iX4b29CWFsGMg (21 mesas de 1920×1080).

## Precio (cotizador V3, `requires_review`, catálogo operating-review-2026-10-27-v14) — v2 del 2026-11-05

Julio pidió bajar: la agencia anterior cotizó USD 4.000/mes × 3 = 12.000 (transcripción) y a Mambrino le pareció
«totalmente sacado fuera del lugar». Se rehízo con equipo compacto, como su modelo in-house.

| Plan | Redes y contenido/mes | Sesión foto/video/mes | Total/mes | Total 3 meses | Margen propio |
|---|---|---|---|---|---|
| Lanzamiento (recomendado) | 1.430 | 470 | **1.900** | **5.700** | 45,6 % |
| Ampliado | 1.910 | 470 | **2.380** | **7.140** | 45,3 % |

**Precios aprobados por Julio el 2026-11-05, netos más IVA.** USD netos, precio de política, `creative-managed-service` On-Going, piso 45 % sin filas marcadas. La sesión de
noviembre se hace en el friends & family (sin cobro aparte por la apertura).

**Supuestos a confirmar:** social media manager 0,30 FTE (Lanzamiento) / 0,42 (Ampliado) que también diseña con Adobe
Express y modera; editor de video 0,08 / 0,12; sin ejecutivo de cuenta costeado (Julio como responsable comercial);
fotógrafo freelance CLP 420.000 por sesión (estimado, sin cotización); Metricool con el plan completo cargado; sin
provisión de reemplazo; IVA aparte (la cotización V3 lo tiene sin resolver). La v1 (Esencial 8.610 / Completo 11.130) quedó en `pricing/descartado-v1/`.

## Láminas

| Tipo | Láminas | Cómo |
|---|---|---|
| Receta | 01 portada (`cover-proposal` orbit, línea brand, `intents/01-portada-brand.json`), 21 contraportada oficial (`close-proposal`, plate BR3, `intents/99-contraportada.json`) | `intents/` → `pnpm brand:compose` → `out/` |
| Nativa | 02–05, 09–11, 13–16, 18–20 | canvas de Design |
| Con muestras IA | 06 platos, 07 momentos, 08 feed, 12 sesión | `muestras/` (GPT Image 2.6 Sunburst high, ≈ USD 0,30, prompts `muestras/*.prompt.txt`), inspiradas en el análisis de sus fotos; cada lámina dice que son muestras |
| Reutilizada aprobada | 12 caso Sky | `2026-10-12_brochure-efeonce-360/entrega-casos/caso-sky-p34.png` |

Logo: `logos/` (vector oficial de mambrino.com.pe, pasado a blanco). Uso pendiente de autorización de Julio.

## Descartado

- Contraportada Brand generada (`fichas/BRD3-*`, `plates/BRD3-*`, `out/99-contraportada-brand/`): rechazada por Julio (espalda con isotipo y existe la oficial). No usar.
- Fotos reales de Mambrino: sólo referencia de estilo (scratchpad), nunca en el deck.

## v3 «alto impacto» — 2026-11-05 (tarde)

24 láminas. Nuevas piezas de muestra (GPT Image 2.6 Sunburst, ≈ USD 0,50 en total): `muestras/v2/` (apertura) y
`muestras/v2-piezas/` (carrusel, historia, reel). Láminas nuevas: feed + historias, carrusel de lanzamiento, guion de
reel, primer mes (calendario 9 nov–6 dic), comunidad en acción (DMs), tablero de medición («Datos de ejemplo») y tres
recetas aprobadas compuestas con `brand:compose` (`intents/v2-*.json`, `out/v2-*`): Vívelo, método y plan.
Retiradas por planas: feed v1, fotografía, comunidad v1, cómo trabajamos v1, medición v1 y pasos v1.
Render de revisión local: `node ai-generations/2026-11-05_propuesta-mambrino/render/render.mjs <project> <out>`
(runtime del canvas + `render/blobs.json`).
Pendiente conocido: en Vívelo y plan la plantilla dibuja el anillo y la curva en teal aunque la línea sea Brand.

## 2026-11-05 tarde — cierre de entrega
- Vívelo, Cómo trabajamos y Cómo empezamos rehechas como láminas nativas del canvas en línea Brand (sin el teal de las
  recetas `content-day` y `decision-plan`); la etiqueta del cursor dice «Tú apruebas aquí» junto a Revisión.
- PDF: `pdf/Propuesta-Trattoria-Mambrino-Chile-Efeonce.pdf` (vector, 48 MB) y `-correo.pdf` (15,5 MB, mixto). Copias en
  OneDrive `Licitaciones/Trattoria Mambrino/1. Social Media/`. Scripts: `render/pdf.mjs` y `render/pdf-light.mjs`.
- Borrador en Outlook (Borradores): Para dvicente@restaurante.com.pe, CCO 48713323@bcc.hubspot.com, firma gráfica,
  sin adjunto (el selector de archivos del sistema no se puede operar desde el navegador integrado). No enviado.
