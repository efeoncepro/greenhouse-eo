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

## Estado actual (baseline)

| Superficie | Estado | Rol | Fuente |
|---|---|---|---|
| `/aeo-2` (servicio AEO) | Live | Filo / diferenciador | EPIC-020 · skill `efeonce-public-site-wordpress` |
| AI Visibility Grader (lead magnet) | Motor robusto (eje AEO); hub en `think.efeoncepro.com` | Gancho compartido | EPIC-020 · grader architecture |
| Programa SEO (Search Visibility 360) | Planificado (ADR Accepted, tasks fundacionales) | Motor de datos SEO | EPIC-022 |
| Migración a Astro runtime | Dirección aceptada, sin cutover | Rail frontend objetivo | ADR Astro runtime strategy |

## Now

- **PDR-001 — Landing SEO complementaria al AEO.** Decidido el posicionamiento:
  landing SEO como *cimiento* de la promesa de visibilidad (no commodity),
  hermana de `/aeo-2`, con el grader como gancho compartido. Siguiente paso
  abierto: arquitectura de información (¿pillar `/visibilidad` con hijas, o dos
  landings hermanas?). Ver [PDR-001](decisions/PDR-001-seo-landing-complementaria-al-aeo.md).

## Next

- Definir la **arquitectura de información** de la sección de servicios de
  visibilidad (URLs + qué va en cada página + dónde entra el grader). Bloquea el
  copy y el build de la landing SEO.
- Extender el **lead magnet** del eje AEO al eje SEO (EPIC-022 "Search Visibility
  360") para que la landing SEO tenga un diagnóstico de producto real detrás, no
  solo un formulario.

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
