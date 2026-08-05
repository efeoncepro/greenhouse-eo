# Overlay Efeonce / Greenhouse — índice (social-media-studio)

## Contrato vigente de Social Media

El servicio comercial vigente es una operación humana recurrente, operada por un squad Efeonce. Su diferenciador es convertir conocimiento, conversación y contenido social en autoridad y demanda medibles, con foco inicial en B2B experto.

### Run & Gun: capability vs servicio

- **Efeonce Run & Gun Studio:** capability interna de producción profesional rápida, con equipo, crew, captura, sonido, iluminación, movilidad, edición y postproducción.
- **Efeonce Run & Gun Production:** servicio cotizable que define objetivo, jornada, equipo, entregables, rondas, derechos y fecha de entrega.
- **Paquetes:** `Content Capture Day`, `Executive / Interview Capture`, `Social-First Production Sprint` y `Brand Story / Campaign Capture`.

Run & Gun es una ventaja de delivery, no producción ilimitada incluida en el retainer. Jornadas, viajes, talentos, derechos, licencias, postproducción ampliada y campañas extraordinarias requieren SOW y economics propios.

### Globe no es dependencia

La operación actual debe funcionar con personas, herramientas y procesos disponibles sin Globe. `CLIENT_DELIVERY.md` conserva un adaptador futuro para clientes internacionales, pero no debe leerse como disponibilidad de Globe ni como requisito para vender o ejecutar Social Media.

> Aterriza el conocimiento portable de social media en el ecosistema real de Efeonce.
> Lo genérico vive en `../modules/`; aquí van los mapeos, boundaries, herramientas y paths
> reales. **Reverifica el estado en el repo y en las plataformas** (todo cambia rápido).
> Nota: el overlay de `digital-marketing` lista "social/Metricool" como un **GAP** de martech
> — esta skill es la que lo llena.

## Cuándo usar este overlay

Cuando el trabajo social toca los canales propios de Efeonce (marca, Think/Glitch/grader) o
la operación para un cliente internacional futuro. Para Social Media actual basta `../modules/`; Globe no es dependencia.

## Archivos del overlay

| Archivo | Qué cubre |
|---|---|
| `STUDIO_TOOLING.md` | El pipeline real de ejecución: Metricool + Higgsfield + AI-image + Figma/Express + hand-offs. |
| `SOCIAL_BOUNDARY.md` | La costura completa vs digital-marketing / growth-marketing-cro / copywriting / seo-aeo / efeonce-agency / generadores. Regla de precedencia. |
| `CLIENT_DELIVERY.md` | Adaptador futuro para clientes internacionales: multi-marca, aprobaciones y reporting. No implica disponibilidad de Globe. |

## Ecosistema digital Efeonce (SSOT: `docs/public-site/decisions/PDR-003`)

Dos ejes ortogonales — **superficies** front-of-house (por audiencia/etapa) que consumen
**plataformas/backbones** (runtime Greenhouse, Kortex CRM, Verk). Dónde entra social:

- **Think** = demand-gen + nurturing top-of-funnel: blog *Marketing con Manzanitas* →
  newsletter semanal *Glitch* (IA/Marketing/Negocios) + tools (*AI Visibility Grader*, ebooks,
  webinars). Social distribuye Think, pero no se reduce a promoción: reels, carruseles, posts,
  Pins, Shorts y videos pueden ser **platform-native cluster nodes** de sus Territory/Cluster
  Experiences cuando tienen JTBD propio, valor autónomo, relación gobernada, URL/ID, owner y
  medición. Un teaser que sólo lleva al blog sigue siendo activación.
- **`efeoncepro.com`** = demand-capture + conversión (WordPress/Kinsta, recalibrando a Astro).
  Social empuja tráfico a las landings de servicio (ej. `/aeo-2/`).
- **El grader (AI Visibility Grader)** es la costura top→bottom — pieza social-nativa ideal:
  contenido que muestra el resultado del grader es "DM-able" y demuestra expertise AEO.

## Marca (dura)

- **Efeonce ≠ Greenhouse.** Greenhouse es el portal operativo interno (los clientes NO lo ven).
  Todo lo social público es **marca Efeonce** (agencia). SSOT de marca:
  `src/config/efeonce-brand.ts` (arquitectura de marca, eslogan). NUNCA uses el `AxisWordmark`
  ni assets del Design System interno en social público.
- Voz: es-CL neutro, natural para audiencia LATAM/internacional. Para craft fino de copy →
  `copywriting` + su sistema de voz Efeonce. Para reglas de tono del portal → `greenhouse-ux-writing`
  (pero eso es copy de producto, no social).
- Ilustraciones/personajes propietarios (`characters/greenhouse-*.png`, Nexa) = obra del equipo
  creativo, NO stock. Úsalas con criterio de marca; producción visual nueva → generadores (§tooling).

## Coherencia con las skills hermanas del repo

Esta skill es **social-first ejecución**. Encadena con: `digital-marketing` (cuando social es
parte de una campaña integrada), `growth-marketing-cro` + `greenhouse-growth-forms` (captura de
lead social → grader/newsletter), `content-marketing-studio` (pertenencia al territorio/cluster),
`seo-aeo` (URLs sociales en Google/Search Console + AEO; acá búsqueda/recomendación in-platform),
`efeonce-public-site-wordpress` (publicar nodos owned cuando corresponde),
`greenhouse-email` (Glitch newsletter runtime). Detalle en `SOCIAL_BOUNDARY.md`.
