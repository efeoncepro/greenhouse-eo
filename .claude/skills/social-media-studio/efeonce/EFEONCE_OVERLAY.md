# Overlay Efeonce / Greenhouse — índice (social-media-studio)

> Aterriza el conocimiento portable de social media en el ecosistema real de Efeonce.
> Lo genérico vive en `../modules/`; aquí van los mapeos, boundaries, herramientas y paths
> reales. **Reverifica el estado en el repo y en las plataformas** (todo cambia rápido).
> Nota: el overlay de `digital-marketing` lista "social/Metricool" como un **GAP** de martech
> — esta skill es la que lo llena.

## Cuándo usar este overlay

Cuando el trabajo social toca los canales propios de Efeonce (marca, Think/Glitch/grader) o
la operación para un cliente Globe. Para social genérico basta `../modules/`.

## Archivos del overlay

| Archivo | Qué cubre |
|---|---|
| `STUDIO_TOOLING.md` | El pipeline real de ejecución: Metricool + Higgsfield + AI-image + Figma/Express + hand-offs. |
| `SOCIAL_BOUNDARY.md` | La costura completa vs digital-marketing / growth-marketing-cro / copywriting / seo-aeo / efeonce-agency / generadores. Regla de precedencia. |
| `CLIENT_DELIVERY.md` | Social as-a-service para clientes Globe: multi-marca, aprobaciones, reporting cliente. |

## Ecosistema digital Efeonce (SSOT: `docs/public-site/decisions/PDR-003`)

Dos ejes ortogonales — **superficies** front-of-house (por audiencia/etapa) que consumen
**plataformas/backbones** (runtime Greenhouse, Kortex CRM, Verk). Dónde entra social:

- **Think** = demand-gen + nurturing top-of-funnel: blog *Marketing con Manzanitas* →
  newsletter semanal *Glitch* (IA/Marketing/Negocios) + tools (*AI Visibility Grader*, ebooks,
  webinars). **Social es el motor de distribución de Think**: reels/carruseles/posts que llevan
  al blog, capturan suscriptores de Glitch y activan el grader como lead magnet.
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
lead social → grader/newsletter), `seo-aeo` (AEO por-motor LLM; acá cubrimos social search),
`efeonce-public-site-wordpress` (publicar el long-form/blog que el social distribuye),
`greenhouse-email` (Glitch newsletter runtime). Detalle en `SOCIAL_BOUNDARY.md`.
