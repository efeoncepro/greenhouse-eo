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
EJE A — SUPERFICIES front-of-house  (mapeadas al BOW-TIE: adquisición → experiencia)

  ── LADO IZQUIERDO: ADQUISICIÓN (un continuo por etapa de funnel) ──

  1. Demand GEN + nurturing (top-of-funnel)  =  THINK (hub de contenido · web + email)
       ├─ Marketing con Manzanitas   (BLOG · marca editorial flagship)
       │      └─ Glitch              (sección de noticias: blogpost + newsletter
       │                              semanal — IA, Marketing, Negocios)
       ├─ AI Visibility Grader       (tool / lead magnet)
       ├─ Ebooks · Webinars · Podcast (lead magnets / thought leadership)
       ├─ YouTube · canales sociales (distribución y confianza)
       └─ los forms capturan usuarios en etapa temprana → base de nurturing
                          think.efeoncepro.com (Astro) + efeoncepro.com/blog (WP)

  2. Demand CAPTURE + conversión (mid/bottom-funnel)  =  efeoncepro.com  (WP → Astro)
       └─ marketing, servicios, /visibilidad, contacto — intención comercial

     ⇢ el GRADER es la COSTURA: tool de Think que produce diagnóstico calificado
       → handoff a comercial (top → bottom del funnel)

  ── KNOT: handoff comercial → HubSpot pipeline (portal 48713323) ──

  ── LADO DERECHO: RETENCIÓN / EXPANSIÓN ──

  3. Experiencia  (una capa, DOS caras)
       ├─ Cliente:   portal cliente / sky-efeonce ──▶ experiencia.efeoncepro.com
       │             + Experiencia Efeonce: aprendizaje, networking, contenido,
       │               webinars/podcast/tools y comunidad alrededor del servicio
       └─ Operador:  cockpit interno Greenhouse   (back-of-house, tenant internal)

EJE B — PLATAFORMAS / BACKBONES  ("con qué operas por dentro" + "qué más vendes")

  • Runtime Greenhouse    PG + BQ, modelo canónico 360, Nexa, entitlements
  • Kortex                CRM / datos comercial (peer system + producto vendible)
  • Verk                  analítica (producto)
  • Pipelines             Notion↔BQ, HubSpot↔BQ, ops-worker
```

### Reglas del modelo

- **Adquisición es un continuo (bow-tie izquierdo), no una capa única.** Think y
  el sitio son AMBOS adquisición, diferenciados por **etapa de funnel**: Think =
  demand *gen* + captura temprana + nurturing (top); sitio = demand *capture* +
  conversión (mid/bottom). El contenido ES el motor de adquisición top-funnel, no
  un propósito separado. La capa de experiencia es el **lado derecho** del bow-tie
  (retención/expansión).
- **El grader es la costura del funnel.** Tool de Think (top) que produce un
  diagnóstico calificado y hace handoff a comercial (bottom) → HubSpot pipeline.
  Es el nodo de conversión compartido (ver [PDR-002](PDR-002-arquitectura-informacion-seccion-visibilidad.md)),
  no una superficie aparte.
- **Superficies por audiencia/etapa, no por host.** Una superficie puede correr en
  varios hosts/runtimes (ej. contenido = WP `/blog` + Astro `think`); el runtime
  puede converger sin cambiar la capa.
- **La capa de experiencia tiene dos caras** — cliente (sky → `experiencia.efeoncepro.com`)
  y operador (cockpit Greenhouse). Mismo runtime, audiencias y jobs distintos
  (esto es lo que separa Nexa cliente vs Nexa operador y su navegación).
- **Experiencia Efeonce excede el portal.** El cliente contrató entrada a un
  ecosistema de crecimiento: operación, software, aprendizaje, contenido, tools,
  networking y memoria. Greenhouse es el command center que vuelve esa experiencia
  visible y acumulable; no sustituye YouTube, sociales, webinars, podcast, ebooks
  ni sesiones de comunidad.
- **Think es EL hub de contenido** (destino), con jerarquía de propiedades:
  `Think (hub) → Marketing con Manzanitas (blog · marca editorial flagship) →
  Glitch (sección de noticias: blogpost + newsletter semanal, IA/Marketing/
  Negocios)`, más tools/lead magnets como hermanos del blog (grader, ebooks,
  webinars, podcast). YouTube y canales sociales son distribución/relación del
  mismo sistema editorial, no capas rivales. El bloque Gutenberg
  `efeoncepro/glitch-drop` (TASK-1337) es solo el
  módulo de render de Glitch, no la sección. Modelo mental = HubSpot (destino con
  Blog + free tools + newsletter). Distribución por **web + email**. **Hub de
  marca ≠ host:** cada pieza tiene UNA URL canónica; el split de runtime actual
  (blog WP `/blog` vs tools Astro `think`) es válido mientras el canonical esté
  limpio y no se duplique en el índice. Convergencia a Astro headless prevista en
  el route-ownership matrix.
- **Naming de marca (default de trabajo, revisable por el operador):** `Think` = el
  hub/destino (aloja tools + blog + newsletter); `Marketing con Manzanitas` = la
  marca editorial (el blog) DENTRO de Think. Alternativa si Manzanitas carga más
  equity: Manzanitas como marca de contenido y Think como host técnico. Decisión
  de branding pendiente de confirmación.
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
- **Think como capa "de contenido" separada de adquisición** — falso: el contenido
  es el motor de adquisición top-funnel (demand gen + nurturing). Separarlos
  esconde que Think captura leads tempranos que alimentan el pipeline comercial.

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
- **NUNCA** tratar Think como "solo contenido" desligado de adquisición — es
  demand gen + nurturing (top-of-funnel); sus forms alimentan el pipeline.
- **SIEMPRE** que nazca una capacidad, ubicarla primero en el eje correcto
  (superficie por audiencia/etapa vs plataforma/backbone) antes de decidir
  host/repo; si es superficie de mercado, ubicarla por etapa de funnel (bow-tie).
- **SIEMPRE** alinear con el sibling `GREENHOUSE_REPO_ECOSYSTEM_V1.md` (repos) y
  el contrato de sister platforms cuando la decisión cruce un peer system.

## Enlaces

- [PDR-001](PDR-001-seo-landing-complementaria-al-aeo.md) · [PDR-002](PDR-002-arquitectura-informacion-seccion-visibilidad.md).
- Repos/pipelines: [`GREENHOUSE_REPO_ECOSYSTEM_V1.md`](../../operations/GREENHOUSE_REPO_ECOSYSTEM_V1.md).
- Kortex peer: `GREENHOUSE_KORTEX_INTEGRATION_ARCHITECTURE_V1.md`,
  `GREENHOUSE_KORTEX_CONTROL_PLANE_READER_V1.md`, `GREENHOUSE_KORTEX_COMMAND_ADAPTER_V1.md`,
  `GREENHOUSE_SISTER_PLATFORMS_INTEGRATION_CONTRACT_V1.md`.
- Glitch/blog: `docs/documentation/public-site/glitch-drop-gutenberg-block.md`.
- Think (docs): [`docs/think/README.md`](../../think/README.md).
- Bow-tie / funnel: skill `commercial-expert` (overlay GH) + `spec/Arquitectura_BowTie_Efeonce_v1_1.md`.
