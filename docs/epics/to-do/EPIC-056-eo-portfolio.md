# EPIC-056 — EO Portfolio: portafolio de proyectos del sitio público

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Alto`
- Status real: `Diseño. PDR-028 aceptado el 2026-10-23; canvas de portada y entrada en revisión del operador; cuatro tasks creadas, ninguna iniciada.`
- Rank: `TBD`
- Domain: `content`
- Owner: `unassigned`
- Branch: `Greenhouse develop para docs; el código vive en efeonce-public-site-runtime con su release acotado por SSH; sin worktrees`
- GitHub Issue: `none`

## Summary

Reemplaza el portafolio del tema Ohio en `efeoncepro.com/portafolio/` por un portafolio propio: cada proyecto cuenta para
quién se hizo, qué tenía que resolver, cómo se hizo y qué pasó, con sus piezas en su formato real, imagen o video, en la
línea gráfica La órbita. Coordina la limpieza de los demos de Ohio que hoy están indexados, el plugin con el contenido
validado, las plantillas de portada y entrada, y la migración de las 15 entradas reales.

## Why This Epic Exists

El programa cruza cuatro frentes que no caben en una task: contenido de producción con riesgo de marca (44 demos de Ohio
indexados, [ISSUE-183](../../issues/open/ISSUE-183-portfolio-ohio-demo-entries-indexed.md)), un modelo de datos nuevo con
una compuerta de aprobación del cliente, una superficie visible con video y una migración con redirecciones. La regla de
partir backend-data y ui-ux obliga a separar el plugin de las plantillas, y la limpieza tiene que salir antes, sola,
porque es urgente y de bajo riesgo.

## Outcome

- `/portafolio/` y `/portafolio/<slug>/` muestran sólo trabajo real de Efeonce, con contexto y piezas en su formato, en
  La órbita.
- Ningún proyecto se publica sin aprobación del cliente y ninguna cifra sin fuente: lo garantiza el sistema, no la
  revisión manual.
- El contenido se edita por el admin, por WP-CLI para agentes y se lee como JSON público, listo para la migración a Astro.
- El tipo de contenido de Ohio queda fuera de uso, con las URLs antiguas redirigidas y sin demos indexados.

## Non-goals

- Reescribir los casos largos del blog o la página de Sky en experiencia.efeoncepro.com: el blog sigue siendo canónico.
- Llevar el portafolio a Think o a Astro: queda preparado por el JSON público, no se migra en este programa.
- Publicar un contrato de AXIS para el portafolio antes de que exista un segundo consumidor.
- Decidir el futuro de `/partnership/` (sigue en la oleada 5 del plan de migración).
- Producir piezas o proyectos nuevos: el programa trabaja con las 15 entradas reales existentes.

## Architecture Alignment

- [PDR-028 — Portafolio de proyectos](../../public-site/decisions/PDR-028-portafolio-de-proyectos-eo-portfolio.md) (decisión de este programa)
- [PDR-027 — Navegación global portable](../../public-site/decisions/PDR-027-navegacion-global-del-sitio-portable.md) (patrón de contenido con tres puertas)
- [PDR-024 — AXIS en el sitio público](../../public-site/decisions/PDR-024-axis-en-el-sitio-publico-composicion-agentica.md) (versión fija, sin React)
- [PDR-020 — Canales propios](../../public-site/decisions/PDR-020-canales-propios-sistema-editorial.md) §4.3 (casos con compuerta de cliente; el blog es canónico)
- [PDR-026 — Cada landing deriva su patrón](../../public-site/decisions/PDR-026-cada-landing-deriva-su-patron-de-diseno.md)
- [Plan de migración a La órbita](../../public-site/LA_ORBITA_SITE_MIGRATION_PLAN_V1.md) §Oleada 5
- [Navegación global del sitio público V1](../../architecture/public-site/PUBLIC_SITE_GLOBAL_NAVIGATION_V1.md) (precedente técnico del plugin)
- Flujo maestro de UI: [`EPIC-056-eo-portfolio-UI-FLOW.md`](../../ui/flows/EPIC-056-eo-portfolio-UI-FLOW.md)

## Child Tasks

- `TASK-2046` — [Limpieza de los demos de Ohio](../../tasks/to-do/TASK-2046-eo-portfolio-ohio-demo-cleanup.md): 44 demos a 410 y restos de Envato fuera de las entradas reales. Remedia ISSUE-183. Sin dependencias; va primero.
- `TASK-2047` — [Plugin y contenido](../../tasks/to-do/TASK-2047-eo-portfolio-plugin-content.md): tipo `eo_project`, documento validado, compuerta de cliente, tres puertas. Puede correr en paralelo con TASK-2046.
- `TASK-2048` — [Portada y entrada](../../tasks/to-do/TASK-2048-eo-portfolio-index-entry-templates.md): plantillas del servidor sobre AXIS y el reproductor. Bloqueada por TASK-2047 y por la aprobación del diseño.
- `TASK-2049` — [Migración y salida a producción](../../tasks/to-do/TASK-2049-eo-portfolio-migration-rollout.md): 15 entradas, 301, video al bucket, Ohio Portfolio desactivado a los 30 días. Bloqueada por TASK-2047 y TASK-2048.

## Existing Related Work

- [ISSUE-183](../../issues/open/ISSUE-183-portfolio-ohio-demo-entries-indexed.md) — demos de Ohio publicados e indexados.
- `TASK-2041` y `TASK-2042` (EPIC-055) — plugin `eo-site-nav` y su adaptador: el patrón técnico que este programa repite. El menú global ya enlaza «Portafolio» con la foto `portafolio-op`.
- Plugin `eo-axis-video` en `efeonce-public-site-runtime` — reproductor de AXIS, candidato, no activo.
- Material de casos ya publicado: experiencia.efeoncepro.com (Sky), módulo de prueba de Agencia Creativa y posts 251397 y 251432 (ANAM).
- Canvas «Portafolio Efeonce — concepto»: [claude.ai/artifact/Rb6NHjgnSRqMK963jPwtUm](https://claude.ai/artifact/Rb6NHjgnSRqMK963jPwtUm), página «EO Portfolio».

## Exit Criteria

- [ ] Ninguna URL de demo de Ohio responde 200 ni aparece en un sitemap del sitio.
- [ ] `/portafolio/` y cada `/portafolio/<slug>/` publicados se sirven desde el plugin nuevo, con un H1, datos estructurados y sin scroll horizontal en 390 px.
- [ ] El intento de publicar un proyecto sin aprobación del cliente falla en el admin, en `wp eo-portfolio publish` y no aparece en el JSON público.
- [ ] Cada `/project/<slug>/` real responde 301 al destino definido en PDR-028 §6.
- [ ] Ohio Portfolio desactivado tras 30 días sin tráfico residual, con la evidencia registrada.
- [ ] Documentación técnica, funcional y manual de uso del portafolio publicadas.
