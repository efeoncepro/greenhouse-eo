# PDR-002 — Arquitectura de información de la sección de visibilidad

> **Tipo:** Product Decision Record (IA/URL del sitio público).
> **Estado:** Accepted — slugs cerrados con datos (Semrush CL 2026-07-05); resta
> confirmar contenido existente de `/servicios` por crawl vivo.
> **Fecha:** 2026-07-05. **Skills:** `info-architecture`, `seo-aeo`.
> **Depende de:** [PDR-001](PDR-001-seo-landing-complementaria-al-aeo.md) ·
> alinea con [PDR-003](PDR-003-layering-ecosistema-digital-efeonce.md).

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

**Hub `/servicios` con spokes por keyword comercial; el pillar de autoridad
temática es una guía de CONTENIDO en Think, no una página de servicio genérica.**

Dos correcciones sobre la versión inicial (que proponía un pillar `/visibilidad`):
(1) `/visibilidad` como URL de servicio apunta a un término sin volumen de
búsqueda → peso muerto; (2) el hub se llama `/servicios` (no `/soluciones`: el
manual de voz de Efeonce, `docs/context/05_voz-tono-estilo.md`, lista "soluciones
integrales" como cliché de agencia a evitar; y `Servicio` es el objeto canónico
del modelo 360). El pillar-cluster canónico = pillar de contenido comprehensivo +
spokes que son las páginas-servicio; el pillar de autoridad se muda a Think.

```text
Think (capa de contenido)   Guía pillar "Visibilidad en búsqueda + IA"
                            (topical authority; linkea ↓ a spokes + grader)
efeoncepro.com  (apex · marketing · conversión)
└── /servicios                          hub (outcome vía copy, no vía la palabra)
    ├── /servicios/posicionamiento-seo  spoke SEO  · title→"agencia SEO" (880) + "posicionamiento web"
    └── /servicios/aeo                  spoke AEO  · term "aeo" (320, uncontested)  ← 301 desde /aeo-2
                                    │
                        funnel de conversión ▼   (mismo nodo, no duplicado)
think.efeoncepro.com  (hub de lead magnets · Astro)
└── AI Visibility Grader    NODO — instrumento diagnóstico (Search + AI Visibility, EPIC-022)
```

- **Pillar de autoridad = guía de contenido en Think** ("Visibilidad en búsqueda
  e IA"): tesis "no basta con rankear en Google", más el framework 5 niveles;
  linkea a las spokes y al grader. NO es una página de servicio; vive en la capa de
  contenido (coherente con PDR-003). Ahí "visibilidad" (genérico-amplio) es
  correcto para una guía.
- **`/servicios/posicionamiento-seo`** (spoke, cimiento Be Found/Readable): slug =
  categoría del servicio (evergreen); title/H1 apuntan a **"agencia SEO"** (880) +
  "posicionamiento web/seo" (390/320). Puente "el SEO moderno ya te prepara para
  la IA" → `/servicios/aeo`; funnel al grader.
- **`/servicios/aeo`** (spoke, filo Be Correct/Actionable/Intrinsic): slug = el
  término "aeo" (320 reales en CL, competencia 0.09, CPC 0.38 — barato y sin
  disputar, conviene apropiarse ya); NO "visibilidad-en-ia" (~0). Link "se apoya
  en el cimiento SEO" → spoke SEO; funnel al grader.
- **Grader = NODO de primera clase** del ecosistema digital Efeonce, URL canónica
  propia servida desde `think.efeoncepro.com`. Nodo de conversión terminal al que
  ambas spokes (y otras superficies) hacen funnel. UN solo nodo (una engine,
  muchos entry points): las páginas apuntan a él, NO lo reconstruyen ni duplican.
  Preservar UTM/atribución por origen; wayfinding propio.

### Datos que cerraron los slugs (Semrush, database `cl`, 2026-07-05)

| Keyword | Vol/mes | CPC | Comp. | Uso |
| --- | --- | --- | --- | --- |
| seo | 2.900 | 1.08 | 0.28 | Ambiguo — no slug, sí target de contenido |
| **agencia seo** | 880 | 1.61 | 0.26 | Target de title/H1 de la spoke SEO |
| posicionamiento web / seo | 390 / 320 | 2.20 / 1.59 | — | Categoría → slug `posicionamiento-seo` |
| **aeo** | 320 | 0.38 | 0.09 | Slug spoke AEO (barato, uncontested) |
| servicios seo / de seo | 70 / 20 | — | — | Hub `/servicios` = SEO-neutro (esperado) |
| agencia aeo / visibilidad en ia | ~0 | — | — | NO slugear AEO como "visibilidad-en-ia" |

### Alcance regional — el servicio es LATAM-first → EEUU → mundo (Semrush `phrase_all`, 2026-07-05)

El servicio no es Chile-only; se presta a **toda LATAM de inicio, luego EEUU, luego
el mundo**. El slug/keyword **generaliza**: **"agencia seo" es el head term
comercial pan-LATAM**, gana en todos los mercados hispanos. Volumen/mes de
"agencia seo":

| Mercado (es) | Vol/mes | | Mercado | Vol/mes |
| --- | --- | --- | --- | --- |
| Ecuador (`ec`) | **3.600** | | Perú (`pe`) | 590 |
| México (`mx`) | 1.000 | | Argentina (`ar`) | 390 |
| Chile (`cl`) | 880 | | US hispano (`us`) | 3.600 (CPC $7.33) |
| Colombia (`co`) | 720 | | España (`es`, ref) | 12.100 |

→ **~8.000+/mes solo LATAM** (≈9× el dato Chile-only). El slug
`/servicios/posicionamiento-seo` + H1 "agencia seo" **se sostiene en toda LATAM**.

**Fase inglés (EEUU/mundo):** los head terms son **"seo agency" (US 60.500, CPC
$19)** y **"seo services" (US 60.500, CPC $17)** — volumen enorme pero caro/competido.
Requiere una **spoke localizada en inglés** (p.ej. `/en/services/seo` o dominio/
subpath con `hreflang`), **localización real (no traducción máquina)** — es un
follow-up de fase 2, no esta task. **Brasil** (`br`, ~1.900) es portugués (pt-BR),
localización aparte de fase posterior.

**Consecuencias de IA/i18n (para la implementación):**

- Copy de la spoke SEO = **es-LATAM neutro** (tuteo, sin voseo, sin chilenismos) —
  sirve a todo el mercado hispano; NO hardcodear referencias Chile-only.
- Preparar `hreflang` desde el diseño para no re-migrar al sumar `en-US`.
- FAQ pan-LATAM (mismo patrón que CL/MX: definicional + objeciones); FAQ inglés
  (US) tiene su propio set rico de decisión de compra para la fase 2 (mineado).

### Navegación (las 4 superficies coexisten)

- Global: entrada "Servicios" en nav top → flyout con las spokes.
- Local: breadcrumb `Inicio › Servicios › Posicionamiento SEO` + cross-link entre spokes.
- Contextual: cada spoke enlaza su hermana + el nodo grader + la guía pillar (Think).
- Supplemental: footer + sitemap del ecosistema (incluye el nodo grader).

### URLs / redirects

- **301 `/aeo-2` → `/servicios/aeo`** (ahora, equity bajo; limpia el `-2`
  no-semántico y aterriza en el slug con volumen "aeo"). Registrar en el redirect
  map exigido por el matrix.
- Registrar el esquema en el route-ownership matrix para port 1:1 al cutover Astro.

## Alternativas descartadas

- **Pillar `/visibilidad` como URL de servicio** — apunta a un término sin volumen
  ("visibilidad" no se busca; "servicios/de seo" = 70/20 confirma que ese tipo de
  segmento no captura búsqueda). Peso muerto como pillar-URL. En su lugar, el
  pillar de autoridad se muda a una guía de contenido en Think (donde "visibilidad"
  amplio es correcto) y las spokes cargan la keyword comercial.
- **Hub `/soluciones`** — el manual de voz (`docs/context/05_voz-tono-estilo.md`)
  lista "soluciones integrales" como cliché de agencia a evitar; `Servicio` es el
  objeto canónico del 360. El anti-commodity se gana con copy mecanicista, no con
  la palabra del hub.
- **Dos landings hermanas planas** (`/aeo-2` + `/seo` al nivel raíz) — pierde el
  hub `/servicios` y el flujo de link equity, deja `/aeo-2` huérfano, obliga
  re-migrar URLs en el cutover Astro.
- **Slug AEO `/servicios/visibilidad-en-ia`** — ~0 volumen; se descarta frente a
  `/servicios/aeo` (320, uncontested).

## Consecuencias

- **Positivas:** slugs con volumen real (data-backed); hub on-brand y honesto
  (`/servicios`); autoridad temática en la capa correcta (guía en Think); grader
  como nodo único; esquema a prueba de migración (port 1:1 a Astro); AEO ocupa un
  término barato antes de que se encarezca.
- **Costo:** un 301 + registrar en redirect map/matrix; producir la guía pillar en
  Think (no solo las dos spokes) para que el cluster tenga autoridad.
- **4 pilares:** Safety = 301 con equity bajo, reversible. Robustez = pillar-cluster
  estándar. Resiliencia = redirect map + matrix la preservan. Escalabilidad =
  admite más spokes bajo `/servicios/[servicio]` sin refactor.

## Pendiente antes de construir

1. **Crawl vivo** de `efeoncepro.com`: confirmar si `/servicios` ya existe con
   contenido/IA propia (para nested limpio) y el equity actual de `/aeo-2` (para el
   301). Los slugs ya NO dependen del crawl — están cerrados con datos Semrush.
2. Producir la guía pillar en Think + las dos spokes; registrar el esquema en el
   route-ownership matrix.

## Reglas duras

- **NUNCA** slugear una spoke bajo un término sin volumen ("visibilidad",
  "visibilidad-en-ia") — el slug carga la keyword comercial; el hub `/servicios`
  es navegacional (SEO-neutro).
- **NUNCA** mover `/aeo-2` sin 301 registrado en el redirect map (regla del matrix).
- **NUNCA** llamar al hub `/soluciones` (cliché de voz de marca) — `/servicios`.
- **SIEMPRE** registrar el esquema en el route-ownership matrix para el port Astro.
- **SIEMPRE** un solo NODO grader canónico (una engine, muchos entry points): las
  spokes funnelean hacia él; NUNCA reconstruirlo ni duplicarlo como página.
- **SIEMPRE** el pillar de autoridad vive como contenido en Think, no como página
  de servicio genérica en el sitio.

## Enlaces

- [PDR-001](PDR-001-seo-landing-complementaria-al-aeo.md) (posicionamiento).
- [route-ownership matrix](../../operations/public-site-route-ownership-matrix-20260616.md).
- Ejecución: candidata a TASK bajo EPIC-019 (landing control plane) / EPIC-022 (SEO).
- Skills: `info-architecture`, `seo-aeo`, `efeonce-public-site-wordpress`.
