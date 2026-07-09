# Public Site — Producto (efeoncepro.com + think.efeoncepro.com)

> **Qué es esto.** El hogar-producto del sitio público de Efeonce: dónde viven
> las **decisiones de producto/posicionamiento** y el **roadmap de ejecución**
> del sitio público como superficie comercial. Es el índice descubrible por
> agentes: si conversamos sobre landings, posicionamiento GTM del sitio, orden
> de ejecución o qué se decidió y por qué, **se empieza por acá**.
>
> Sello: creado 2026-07-05. Idioma es-CL neutro (tuteo, sin voseo).

## Para qué sirve (y para qué NO)

Este espacio captura el **plano de producto** del sitio público: qué landings/
superficies existen o vienen, cómo se posicionan entre sí, en qué orden se
ejecutan y por qué. Es la capa narrativa que ata los EPICs, los ADR de
arquitectura y las skills en una sola historia de producto.

| Sí vive acá | NO vive acá → va a |
| --- | --- |
| Decisiones de producto/posicionamiento/GTM del sitio (PDR) | Decisiones de **arquitectura** (contratos técnicos) → `architecture/DECISIONS_INDEX.md` (ADR) |
| Roadmap/secuencia de ejecución del sitio (now/next/later) | Programas de trabajo ejecutables → `docs/epics/` (EPIC-###) |
| El "por qué" comercial de cada superficie | Unidades ejecutables → `docs/tasks/` (TASK-###) |
| Mapa de landings y su relación entre sí | Operación real del sitio (WP/Kinsta/Astro/deploy) → skill `efeonce-public-site-wordpress` |

**Regla de no-duplicación:** cuando un PDR obliga arquitectura, **cita** el ADR
de `DECISIONS_INDEX.md`; no copia su contenido. Cuando un PDR se baja a trabajo,
**cita** el EPIC/TASK; no lo reemplaza.

## Índice

- **[PRODUCT_ROADMAP.md](PRODUCT_ROADMAP.md)** — roadmap del sitio público
  (now / next / later) con enlaces a los EPICs y PDRs que lo sostienen.
- **[decisions/](decisions/)** — Product Decision Records (PDR). Log de
  decisiones de producto/posicionamiento, más blando que un ADR.
  - [PDR-001 — Landing SEO complementaria al AEO](decisions/PDR-001-seo-landing-complementaria-al-aeo.md)
  - [PDR-002 — Arquitectura de información de la sección de visibilidad](decisions/PDR-002-arquitectura-informacion-seccion-visibilidad.md)
  - [PDR-003 — Layering del ecosistema digital Efeonce](decisions/PDR-003-layering-ecosistema-digital-efeonce.md)
  - [PDR-004 — Posicionamiento de la landing "Agencia Creativa"](decisions/PDR-004-landing-agencia-creativa-posicionamiento.md)
  - [PDR-005 — Posicionamiento de la landing "Redes Sociales"](decisions/PDR-005-landing-redes-sociales-posicionamiento.md)
  - [PDR-006 — Posicionamiento de la landing "HubSpot" (Agentic Customer Platform + partnership)](decisions/PDR-006-landing-hubspot-agentic-platform-posicionamiento.md)
  - [PDR-007 — Posicionamiento del "HubSpot Portal Grader" (lead magnet + gancho a la venta)](decisions/PDR-007-hubspot-portal-grader-lead-magnet.md)
  - [PDR-008 — Posicionamiento de la landing "Agencia" (`/agencia`)](decisions/PDR-008-landing-agencia-marketing-digital-posicionamiento.md)
  - [PDR-009 — Booking nativo con HubSpot Scheduler API](decisions/PDR-009-hubspot-scheduler-native-booking.md)
  - [PDR-010 — La Home es el pitch; `/agencia` se pliega](decisions/PDR-010-home-es-el-pitch-agencia-se-pliega.md)
  - [PDR-011 — About Us como identidad Golden Circle](decisions/PDR-011-about-us-identidad-golden-circle.md)
  - [PDR-012 — Growth Operating System como posicionamiento global](decisions/PDR-012-growth-operating-system-global-positioning.md)

## Contexto canónico (fuentes que este espacio NO reimplementa)

- **Arquitectura del sitio público** (ADR vigentes): estrategia Astro runtime,
  render headless del report, módulo SEO Search Visibility 360, forms/CTA
  engines → [`architecture/DECISIONS_INDEX.md`](../architecture/DECISIONS_INDEX.md).
- **Programas de trabajo:** EPIC-019 (public website landing control plane),
  EPIC-020 (public AI visibility lead magnet), EPIC-022 (growth SEO Search
  Visibility 360), EPIC-023 (growth CTA/popup CRO) → [`docs/epics/`](../epics/).
- **Operación real del sitio:** skill `efeonce-public-site-wordpress`
  (WP/Kinsta/Astro, WP-CLI/REST, Content Factory, Growth Forms, deploy).
- **Posicionamiento comercial:** skill `commercial-expert` (overlay Greenhouse) +
  Business Context Pack `docs/context/`.
- **SEO/AEO:** skill `seo-aeo` (+ framework propietario "5 niveles" y overlay
  Efeonce) — la doctrina de posicionamiento en búsqueda + IA.
- **Content hub/blog WordPress:** contrato operativo vigente en
  [`docs/documentation/public-site/wordpress-blog-content-hub-search.md`](../documentation/public-site/wordpress-blog-content-hub-search.md)
  y auditoria base
  [`docs/audits/public-site/2026-07-09-wordpress-blog-content-hub-search.md`](../audits/public-site/2026-07-09-wordpress-blog-content-hub-search.md).
  Layout candidato elegido: `Demo 35: Blog Magazine`, documentado en
  [`docs/audits/public-site/2026-07-09-demo35-blog-magazine-layout-review.md`](../audits/public-site/2026-07-09-demo35-blog-magazine-layout-review.md).
- **Grader / dominio growth:** `architecture/GREENHOUSE_PUBLIC_AI_VISIBILITY_GRADER_ARCHITECTURE_V1.md`.

## Convención de PDR

- ID estable `PDR-###`, kebab-case en el nombre de archivo.
- Estado: `Proposed` · `Accepted` · `Superseded` · `Deprecated`.
- Cada PDR declara: contexto, decisión, alternativas descartadas (una línea c/u),
  consecuencias, enlaces a ADR/EPIC/TASK, y reglas duras si aplica.
- Al aceptar/cambiar un PDR, actualizar el índice de arriba y, si toca el orden
  de ejecución, `PRODUCT_ROADMAP.md`.
