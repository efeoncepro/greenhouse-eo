# Public Site — Product Roadmap

> Roadmap del sitio público de Efeonce como **producto comercial**. No es un
> backlog de tareas (eso vive en `docs/tasks/`) ni un programa (eso vive en
> `docs/epics/`): es la **secuencia narrativa** de qué superficies existen o
> vienen y por qué, con enlaces a los EPICs/PDRs que las sostienen.
>
> Sello: 2026-07-05. Horizontes relativos convertidos a estado, no a fechas.

## North Star

El sitio público es la **puerta de adquisición** del modelo ASaaS: convierte
demanda (búsqueda clásica + motores de respuesta IA) en pipeline gobernado
(HubSpot portal 48713323), con el **AI Visibility Grader** como lead magnet e
instrumento de medición compartido. Toda superficie nueva se justifica por su
aporte al embudo Bow-tie, no por completitud de catálogo.

Marco de posicionamiento (skill `seo-aeo`, framework propietario Efeonce): las
superficies se ordenan por los 5 niveles — **Be Found · Readable · Correct ·
Actionable · Intrinsic**. SEO cubre el cimiento (Found/Readable); AEO cubre el
filo (Correct/Actionable/Intrinsic).

El sitio público es la **capa de adquisición** del ecosistema digital Efeonce
(modelo de capas en [PDR-003](decisions/PDR-003-layering-ecosistema-digital-efeonce.md):
adquisición · contenido/Think · experiencia, sobre plataformas Greenhouse/Kortex/Verk).

## Estado actual (baseline)

| Superficie | Estado | Rol | Fuente |
| --- | --- | --- | --- |
| `/aeo-2` (servicio AEO) | Live | Filo / diferenciador | EPIC-020 · skill `efeonce-public-site-wordpress` |
| AI Visibility Grader (lead magnet) | Motor robusto (eje AEO); hub en `think.efeoncepro.com` | Gancho compartido | EPIC-020 · grader architecture |
| Programa SEO (Search Visibility 360) | Planificado (ADR Accepted, tasks fundacionales) | Motor de datos SEO | EPIC-022 |
| Migración a Astro runtime | Dirección aceptada, sin cutover | Rail frontend objetivo | ADR Astro runtime strategy |

## Now

- **PDR-001 — Landing SEO complementaria al AEO** (decidido): posicionamiento SEO
  como *cimiento* de la promesa de visibilidad (no commodity), hermana de
  `/aeo-2`. Ver [PDR-001](decisions/PDR-001-seo-landing-complementaria-al-aeo.md).
- **PDR-002 — Arquitectura de información** (decidida, slugs data-backed): hub
  `/servicios` (no `/soluciones` — cliché de voz) con spokes por keyword real
  (Semrush CL): `/servicios/posicionamiento-seo` (title→"agencia seo" 880) +
  `/servicios/aeo` (term 320, uncontested ← 301 desde `/aeo-2`). El pillar de
  autoridad = **guía de contenido en Think**, no página de servicio. El grader es
  el nodo de conversión compartido. Ver [PDR-002](decisions/PDR-002-arquitectura-informacion-seccion-visibilidad.md).

## Next

- **Crawl vivo** de `efeoncepro.com` (route-ownership matrix): confirmar si
  `/servicios` ya existe con contenido propio y el equity de `/aeo-2` para el 301.
  Los slugs ya están cerrados con datos (Semrush CL); el crawl es confirmación, no
  bloqueo del diseño.
- Extender el **nodo grader** del eje AEO al eje SEO (EPIC-022 "Search Visibility
  360") para que la spoke SEO tenga un diagnóstico de producto real detrás.
- Bajar PDR-001/PDR-002 a **TASK** bajo EPIC-019 (landing control plane) /
  EPIC-022 (SEO): guía pillar en Think + spoke `/servicios/posicionamiento-seo` +
  301 de `/aeo-2` → `/servicios/aeo`, con copy y build.

## Later

- Cutover del sitio público a **Astro** (tratar como migración: baseline,
  redirects 1:1, paridad de contenido, preservar entidad/schema). Ver ADR Astro
  runtime strategy.
- Localización multilingüe real (es/en/pt) para el footprint Globe.

## Cómo se mantiene

- Una decisión de producto nueva → PDR en `decisions/` + fila en el horizonte que
  corresponda acá.
- Una decisión que obliga arquitectura → ADR en `architecture/DECISIONS_INDEX.md`,
  citado desde el PDR (no duplicar).
- Cuando un horizonte se ejecuta → mover la línea a "baseline" y enlazar el
  EPIC/TASK que lo cerró.
