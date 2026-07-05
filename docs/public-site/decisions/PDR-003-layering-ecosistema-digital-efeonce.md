# PDR-003 — Layering del ecosistema digital Efeonce

> **Tipo:** Product Decision Record (modelo/mapa del ecosistema digital).
> **Estado:** Accepted (modelo) — visión del operador 2026-07-05.
> **Skills:** `info-architecture`, `arch-architect`, `commercial-expert`.
> **Sibling:** `docs/operations/GREENHOUSE_REPO_ECOSYSTEM_V1.md` es la vista de
> **repos/pipelines** (ops); este PDR es la vista de **capas de producto/marca**.

## Contexto

No existía un modelo canónico del ecosistema digital Efeonce como **capas de
producto/marca** (lo que había, `GREENHOUSE_REPO_ECOSYSTEM_V1.md`, es un mapa de
repos/pipelines orientado a ops). Este PDR fija ese modelo para que las decisiones
de producto/IA del sitio y sus vecinos tengan un marco compartido.

## Decisión — el ecosistema tiene DOS ejes

Modelar el ecosistema en dos ejes ortogonales, no en una lista plana. Las
**superficies** (eje A) consumen las **plataformas** (eje B).

```text
EJE A — SUPERFICIES front-of-house  ("cómo el mundo toca a Efeonce", por audiencia)

  1. Adquisición / comercial-pública   efeoncepro.com                (WP → Astro)
       └─ atraer y convertir demanda (marketing, servicios, /visibilidad)

  2. Contenido / autoridad  =  THINK (hub de contenido)   canales: web + email
       ├─ Editorial:  Marketing con Manzanitas (blog)  ── efeoncepro.com/blog (WP)
       │                 └─ Glitch: sección de noticias (blogpost + NEWSLETTER
       │                    semanal — IA, Marketing, Negocios), dentro del blog
       └─ Interactivo / lead magnets  ─────────────────  think.efeoncepro.com (Astro)
                 tools (AI Visibility Grader), ebooks, webinars

  3. Experiencia  (una capa, DOS caras)
       ├─ Cliente:   portal cliente / sky-efeonce ──▶ experiencia.efeoncepro.com
       └─ Operador:  cockpit interno Greenhouse   (back-of-house, tenant internal)

EJE B — PLATAFORMAS / BACKBONES  ("con qué operas por dentro" + "qué más vendes")

  • Runtime Greenhouse    PG + BQ, modelo canónico 360, Nexa, entitlements
  • Kortex                CRM / datos comercial (peer system + producto vendible)
  • Verk                  analítica (producto)
  • Pipelines             Notion↔BQ, HubSpot↔BQ, ops-worker
```

### Reglas del modelo

- **Superficies por audiencia, no por host.** Una superficie puede correr en
  varios hosts/runtimes (ej. contenido = WP `/blog` + Astro `think`); el runtime
  puede converger sin cambiar la capa.
- **La capa de experiencia tiene dos caras** — cliente (sky → `experiencia.efeoncepro.com`)
  y operador (cockpit Greenhouse). Mismo runtime, audiencias y jobs distintos
  (esto es lo que separa Nexa cliente vs Nexa operador y su navegación).
- **Think es UN hub de contenido**, no dos superficies que compiten con el blog.
  Contiene editorial (Marketing con Manzanitas — con **Glitch** como su sección de
  noticias: blogpost + newsletter semanal) e interactivo (tools/lead magnets). El
  bloque Gutenberg `efeoncepro/glitch-drop` (TASK-1337) es solo el módulo de
  render, no la sección. Distribución por **web + email** (newsletter). **Hub de
  marca ≠ host:** cada pieza tiene UNA URL canónica; el
  split de runtime actual (blog WP `/blog` vs tools Astro `think`) es válido
  mientras el canonical esté limpio y no se duplique en el índice. Convergencia a
  Astro headless prevista en el route-ownership matrix.
- **El grader es un nodo del eje A capa 2** (contenido/Think), no una superficie
  aparte — ver [PDR-002](PDR-002-arquitectura-informacion-seccion-visibilidad.md).
- **Kortex vive en el eje B**, no en las capas front-of-house. Es (a) backbone de
  datos comercial/RevOps que alimenta la capa de adquisición (atribución,
  pipeline) y (b) producto vendible del portfolio. Peer system: Greenhouse lo
  **observa y le pide comandos gobernados**, no lo absorbe (contrato sister
  platforms + reader/command adapter, TASK-1162/1164).

## Alternativas descartadas

- **Una sola lista plana de "capas"** mezclando superficies y plataformas — mete
  a Kortex/Verk (horizontales) en el mismo plano que sitio/contenido/experiencia
  (verticales por audiencia) y confunde "cómo te tocan" con "con qué operas".
- **Think y /blog como superficies separadas** — falso: son un hub de contenido;
  el blog (Manzanitas + Glitch) es una familia del hub, no un rival. (Corrige el
  Ajuste 2 preliminar de la conversación.)
- **Kortex como cuarta capa front-of-house** — no es audience-facing; es backbone
  horizontal + producto. Forzarlo a vertical rompe el modelo.

## Consecuencias

- Marco compartido para decidir dónde nace cada capacidad nueva (¿superficie o
  plataforma? ¿qué audiencia?) y para razonar bordes (contenido, experiencia).
- Aclara el borde think/blog (riesgo SEO de doble indexación) como problema de
  **canonical URL**, no de arquitectura de capas.
- Deja explícita la doble cara de "experiencia" → informa IA + Nexa por audiencia.
- Reversible/aditivo: es un mapa conceptual; no cambia runtime ni repos.

## Reglas duras

- **NUNCA** meter Kortex/Verk (eje B) en las capas front-of-house (eje A).
- **NUNCA** tratar Think y el blog como superficies que compiten — son el mismo
  hub de contenido; resolver la coexistencia por canonical URL, no separándolos.
- **NUNCA** modelar "experiencia" como una sola audiencia — cliente y operador
  son caras distintas.
- **SIEMPRE** que nazca una capacidad, ubicarla primero en el eje correcto
  (superficie por audiencia vs plataforma/backbone) antes de decidir host/repo.
- **SIEMPRE** alinear con el sibling `GREENHOUSE_REPO_ECOSYSTEM_V1.md` (repos) y
  el contrato de sister platforms cuando la decisión cruce un peer system.

## Enlaces

- [PDR-001](PDR-001-seo-landing-complementaria-al-aeo.md) · [PDR-002](PDR-002-arquitectura-informacion-seccion-visibilidad.md).
- Repos/pipelines: [`GREENHOUSE_REPO_ECOSYSTEM_V1.md`](../../operations/GREENHOUSE_REPO_ECOSYSTEM_V1.md).
- Kortex peer: `GREENHOUSE_KORTEX_INTEGRATION_ARCHITECTURE_V1.md`,
  `GREENHOUSE_KORTEX_CONTROL_PLANE_READER_V1.md`, `GREENHOUSE_KORTEX_COMMAND_ADAPTER_V1.md`,
  `GREENHOUSE_SISTER_PLATFORMS_INTEGRATION_CONTRACT_V1.md`.
- Glitch/blog: `docs/documentation/public-site/glitch-drop-gutenberg-block.md`.
