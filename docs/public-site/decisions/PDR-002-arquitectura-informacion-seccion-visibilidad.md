# PDR-002 — Arquitectura de información de la sección de visibilidad

> **Tipo:** Product Decision Record (IA/URL del sitio público).
> **Estado:** Accepted (estructura) — slug exacto pendiente de inventario por crawl vivo.
> **Fecha:** 2026-07-05. **Skills:** `info-architecture`, `seo-aeo`.
> **Depende de:** [PDR-001](PDR-001-seo-landing-complementaria-al-aeo.md).

## Contexto

PDR-001 decidió crear la landing SEO complementaria a `/aeo-2` y dejó abierta la
arquitectura de información: ¿pillar `/visibilidad` con hijas, o dos landings
hermanas planas al nivel actual? El sitio corre en WordPress/Kinsta (apex
`efeoncepro.com`) con migración futura a Astro/Vercel. El
[route-ownership matrix](../../operations/public-site-route-ownership-matrix-20260616.md)
modela service pages como slugs planos `/servicio-*`, apex-only, y exige
**inventario de URLs por crawl vivo + redirect map** antes de mover nada. El lead
magnet (AI Visibility Grader) vive en `think.efeoncepro.com` (hub Astro).

## Decisión

**Pillar-cluster anidado, no dos landings hermanas planas.**

La IA es del **ecosistema digital Efeonce** (multi-host), no de un solo sitio. El
grader es un **nodo de primera clase** de ese ecosistema, no un CTA colgado.

```text
efeoncepro.com  (apex · marketing)
└── /visibilidad            PILLAR / hub — categoría "ser encontrado por Google + IA"
    ├── /visibilidad/seo    servicio SEO   (cimiento · Be Found/Readable)
    └── /visibilidad/aeo    servicio AEO   (filo · Be Correct/Actionable/Intrinsic)  ← 301 desde /aeo-2
                                    │
                        funnel de conversión ▼   (mismo nodo, no duplicado)
think.efeoncepro.com  (hub de lead magnets · Astro)
└── AI Visibility Grader    NODO — instrumento diagnóstico (Search + AI Visibility, EPIC-022)
```

- **Pillar `/visibilidad`:** hub de categoría; tesis "no basta con rankear en
  Google"; framework 5 niveles; enlaza a ambas hijas y al nodo grader.
- **`/visibilidad/seo`:** cimiento; keyword de alto volumen ("SEO",
  "posicionamiento web", "agencia SEO"); puente "el SEO moderno ya te prepara
  para la IA" → `/visibilidad/aeo`; funnel al nodo grader.
- **`/visibilidad/aeo`:** filo/diferenciador; ("AEO", "citado por ChatGPT");
  link "se apoya en el cimiento SEO" → `/visibilidad/seo`; funnel al nodo grader.
- **Grader = NODO de primera clase** del ecosistema digital Efeonce, con URL
  canónica propia servida desde `think.efeoncepro.com`. Es el **nodo de
  conversión terminal** al que el cluster `/visibilidad` hace funnel (y otras
  superficies del ecosistema también). UN solo nodo (una engine, muchos entry
  points): las páginas del cluster apuntan a él, NO lo reconstruyen ni lo
  duplican. Preservar UTM/atribución por origen; el nodo tiene su propio
  wayfinding (breadcrumb de regreso al ecosistema Efeonce, cross-links).

### Navegación (las 4 superficies coexisten)

- Global: entrada "Visibilidad" en nav top → flyout con las 2 hijas + pillar.
- Local: breadcrumb `Inicio › Visibilidad › SEO` + cross-link entre hijas.
- Contextual: cada hija enlaza su hermana + el nodo grader.
- Supplemental: footer + sitemap del ecosistema (incluye el nodo grader).

### URLs / redirects

- **301 `/aeo-2` → `/visibilidad/aeo`** (ahora, equity bajo; limpia el `-2`
  no-semántico). Registrar en el redirect map exigido por el matrix.
- Registrar el esquema en el route-ownership matrix para port 1:1 al cutover Astro.

## Alternativas descartadas

- **Dos landings hermanas planas** (`/aeo-2` + `/seo` al nivel actual) — pierde la
  relación de categoría, deja `/aeo-2` huérfano semántico, no construye autoridad
  temática (pillar-cluster) y obliga re-migrar URLs en el cutover Astro.
- **Mantener `/aeo-2` como está** — el slug `-2` es un smell de información (no
  comunica); sin hub no hay flujo de link equity interno.
- **Anidar bajo `/servicios/`** — posible si ya existe ese hub; se resuelve con el
  crawl. Top-level `/visibilidad` preferido por peso SEO del término categoría.

## Consecuencias

- **Positivas:** modelo mental correcto (categoría → servicios); autoridad temática
  SEO; esquema a prueba de migración (port 1:1 a Astro); el grader como nodo único
  del ecosistema (una engine, muchos entry points).
- **Costo:** un 301 + registrar en redirect map/matrix; crear el pillar (no solo
  las dos hijas) para no dejar cluster sin hub.
- **4 pilares:** Safety = 301 con equity bajo, reversible. Robustez = estructura
  estándar pillar-cluster. Resiliencia = redirect map + matrix la preservan.
  Escalabilidad = admite más hijas (p.ej. `/visibilidad/[servicio]`) sin refactor.

## Pendiente antes de fijar slugs (honestidad IA + matrix)

1. **Inventario de URLs por crawl vivo** de `efeoncepro.com` (exigido por el
   matrix). Confirmar si existe hub `/servicios` con IA propia → decide top-level
   `/visibilidad` vs `/servicios/visibilidad`.
2. Confirmar equity/links actuales de `/aeo-2` para dimensionar el 301.

## Reglas duras

- **NUNCA** dejar el cluster sin pillar (hijas huérfanas = sin hub de autoridad).
- **NUNCA** mover `/aeo-2` sin 301 registrado en el redirect map (regla del matrix).
- **NUNCA** fijar el slug final sin el crawl vivo del sitio (no de memoria).
- **SIEMPRE** registrar el esquema en el route-ownership matrix para el port Astro.
- **SIEMPRE** un solo NODO grader canónico (una engine, muchos entry points):
  las páginas del cluster funnelean hacia él; NUNCA reconstruirlo ni duplicarlo
  como página del pillar. El nodo tiene su propio wayfinding en el ecosistema.

## Enlaces

- [PDR-001](PDR-001-seo-landing-complementaria-al-aeo.md) (posicionamiento).
- [route-ownership matrix](../../operations/public-site-route-ownership-matrix-20260616.md).
- Ejecución: candidata a TASK bajo EPIC-019 (landing control plane) / EPIC-022 (SEO).
- Skills: `info-architecture`, `seo-aeo`, `efeonce-public-site-wordpress`.
