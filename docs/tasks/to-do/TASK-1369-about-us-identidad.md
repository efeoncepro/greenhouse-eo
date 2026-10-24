# TASK-1369 — About Us: remanente E-E-A-T, reslug `/nosotros` y GVC

## Delta 2026-10-24 — recalibrada al remanente

El 2026-10-23 `/about-us-efeonce/` (249770) se rediseñó con la línea gráfica «La órbita» desde un canvas aprobado por el
operador y se publicó como widgets Elementor source-led (`greenhouse_nosotros_*`, once módulos; fuente
`scripts/public-website/nosotros-source/`), con ajustes de fidelidad el 2026-10-23/24. Ese rediseño cerró el alcance de
página de esta task: h1 = el Why, arco Why→How→What, dirección de arte del hero, equipo real, prueba citable, founder,
cinco países y CTA. Por decisión del operador (2026-10-24) la task queda acotada a lo que el rediseño no hizo:
datos estructurados de identidad (E-E-A-T), reslug `/nosotros` con 301 y una verificación GVC formal. El scope de
página, el wireframe original de 11 secciones y los bloqueantes «bios reales» y «dirección de arte» quedan como
historia (`docs/ui/wireframes/TASK-1369-about-us-identidad.md`). TASK-1322 se cerró como superada el mismo día.

<!-- ═══════════════════════════════════════════════════════════
 ZONE 0 — IDENTITY & TRIAGE
 ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Medio`
- Effort: `Bajo`
- Type: `implementation`
- Execution profile: `standard`
- UI impact: `none`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `none`
- Epic: `EPIC-047`
- Status real: `Diseno`
- Rank: `EPIC-047-10`
- Domain: `content`
- Blocked by: `none`
- Branch: `task/TASK-1369-about-us-identidad`

## Summary

Completa la página de identidad ya publicada en `/about-us-efeonce/`: agrega datos estructurados de entidad
(`AboutPage`, `Organization` enriquecida y `Person` del liderazgo visible), mueve la URL a `/nosotros` con 301 y deja
una verificación GVC desktop + mobile con escenario versionado. No cambia diseño ni copy de la página.

## Why This Task Exists

El rediseño del 2026-10-23 resolvió la página visible, pero la entidad sigue débil para buscadores y motores de
respuesta: el grafo Yoast vivo sólo publica `WebPage` (nombre «Sobre Nosotros Efeonce - Efeonce»), `WebSite` y un
`Organization` genérico («Efeonce Group SpA») sin `foundingDate`, `areaServed`, `founder` ni `sameAs` de liderazgo, y no
hay ningún `Person`. PDR-011 además sugiere `/nosotros` como URL de la página de identidad; hoy `/nosotros/` responde 404.
Tampoco existe un escenario GVC que proteja la página ante cambios del tema Ohio (caso real: rieles Dark/Light del
2026-10-23).

## Goal

- JSON-LD válido en la página: `AboutPage` + `Organization` (fundación, países, alianza HubSpot, `founder`) + `Person`
  de Julio Reyes y de cada líder que la página muestre con nombre y rol.
- URL canónica `/nosotros/` con 301 desde `/about-us-efeonce/`, sin perder metadatos ni enlaces internos.
- Escenario GVC `about-us` versionado, capturado y mirado en 1440 y 390.

<!-- ═══════════════════════════════════════════════════════════
 ZONE 1 — CONTEXT & CONSTRAINTS
 ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/public-site/decisions/PDR-011-about-us-identidad-golden-circle.md` (página de identidad; sugiere `/nosotros`)
- `docs/context/09_marca-agencia.md` y `docs/context/01_quienes-somos.md` (datos de entidad: fundación, países, alianzas)
- Skill `efeonce-public-site-wordpress` → `references/landings/about-us-efeonce.md`,
  `references/source-led-elementor-patterns.md`, `references/taxonomy-permalink-migrations.md` (Yoast Premium redirects)
- Skill `seo-aeo` (entidades, `AboutPage`/`Organization`/`Person`, migración de URL)

Reglas obligatorias:

- El JSON-LD sólo declara hechos visibles o verificables en fuentes canónicas; ningún dato inventado (fecha, países,
  certificaciones). Nunca nombrar distribuidores como partners.
- El grafo se integra con el de Yoast (mismo `@id` de `Organization`), no lo duplica.
- El 301 es el último paso y se hace con Yoast Premium redirects; nunca un redirect PHP ad hoc.

## Normative Docs

- `docs/documentation/public-site/wordpress-ohio-elementor-layout.md` (rieles Ohio y landing Nosotros)
- `docs/manual-de-uso/public-site/wordpress-ohio-elementor-layout.md`
- `docs/architecture/GREENHOUSE_FRONTEND_CAPTURE_HELPER_V1.md` (GVC)

## Dependencies & Impact

### Depends on

- Página Nosotros source-led publicada (2026-10-23) — hecho.
- Datos de entidad confirmados por el operador: año de fundación **2008** (confirmado 2026-10-24, registrado en
  `docs/context/01_quienes-somos.md`); faltan los perfiles públicos (`sameAs`) del liderazgo.

### Blocks / Impacts

- Enlaces internos a `/about-us-efeonce/` (menú global, footer, home, landings): pasan a `/nosotros/` o quedan cubiertos
  por el 301.
- `scripts/public-website/publish-nosotros-elementor-page.php`, `configure-nosotros-seo.php`,
  `configure-nosotros-og.php` y el registro de landings referencian el slug actual.

### Files owned

- Página WordPress 249770 (slug, metadatos SEO, schema).
- `scripts/public-website/configure-nosotros-seo.php` (o script hermano para el schema)
- `scripts/frontend/scenarios/about-us.yaml` (nuevo)

## Current Repo State

### Already exists

- Página rediseñada y publicada con once módulos source-led y `data-capture`:
  `about-hero/quees/marcas/why/brain/equipo/mercados/prueba/partners/founder/cierre`.
- Meta description, título SEO y OG actualizados el 2026-10-23 (`configure-nosotros-seo.php`, `configure-nosotros-og.php`).
- Grafo Yoast con `WebPage`, `ImageObject`, `BreadcrumbList`, `WebSite`, `Organization` genérico.

### Gap

- Sin `AboutPage`, sin `Person`, `Organization` sin datos de entidad.
- `/nosotros/` = 404; canonical sigue en `/about-us-efeonce/`.
- Sin escenario GVC de la página.

<!-- ═══════════════════════════════════════════════════════════
 ZONE 2 — PLAN MODE
 El agente que toma esta task ejecuta Discovery y produce
 plan.md segun TASK_PROCESS.md. No llenar al crear la task.
 ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
 ZONE 3 — EXECUTION SPEC
 ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — E-E-A-T: datos estructurados de identidad

- Tipar la página como `AboutPage` y enriquecer el `Organization` de Yoast (mismo `@id`): `foundingDate`, `areaServed`
  (Chile, Estados Unidos, Colombia, México, Perú), `founder` → `Person`, `sameAs` corporativos.
- `Person` para Julio Reyes (Managing Director & Founder) y para cada líder visible con nombre y rol en la página.
- Validar con Rich Results Test / validador de schema.org y snapshot de la meta previa.

### Slice 2 — Reslug `/nosotros` + 301

- Cambiar el slug a `nosotros`, crear el 301 en Yoast Premium, actualizar enlaces internos propios (menú, footer, landings)
  y los scripts que fijan el slug. Purga de caché Kinsta.
- Registrar el cambio en el registro de landings y en la ficha de la landing.

### Slice 3 — GVC formal

- Escenario `scripts/frontend/scenarios/about-us.yaml` que recorre los once `data-capture` en 1440 y 390.
- Assertions: un solo `h1`, sin scroll horizontal, texto fuera de los rieles Ohio desde 1181 px.
- Capturar, mirar y dejar evidencia.

## Out of Scope

- Cambios de diseño, copy o módulos de la página (ya aprobados y publicados).
- Imagen de captura real del portal en el bloque «lo ves en vivo» (queda como follow-up si se quiere).
- Corrección de rieles Ohio en Partners (pendiente aparte por decisión del operador).

## Detailed Spec

El estado y la operación de la landing viven en la skill `efeonce-public-site-wordpress`
(`references/landings/about-us-efeonce.md`). El patrón de deploy source-led y las trampas de Ohio están en
`references/source-led-elementor-patterns.md` §Ohio host fidelity. No duplicar aquí.

## Rollout Plan & Risk Matrix

Contenido público en WordPress, aditivo salvo el reslug. El riesgo real es SEO (equity del slug actual) y de entidad
(datos incorrectos en el grafo).

### Slice ordering hard rule

- Slice 1 (schema) → Slice 3 (GVC sobre la URL vigente) → Slice 2 (reslug + 301) → GVC repetido sobre `/nosotros/`.
  El 301 va al final para no mover equity antes de validar.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Reslug pierde equity de `/about-us-efeonce/` | SEO / public-site | medium | 301 Yoast + enlaces internos actualizados + canonical verificado | caída de impresiones de la URL en GSC |
| Schema duplica o contradice el `Organization` de Yoast | SEO / entidad | medium | reutilizar el `@id` de Yoast; validar el grafo completo | dos nodos `Organization` en el HTML servido |
| Dato de entidad incorrecto (fecha, países) | marca / E-E-A-T | low | sólo hechos confirmados por el operador o fuentes canónicas | revisión previa al publish |

### Feature flags / cutover

- Sin flag. El reslug es el cutover; se hace en una sola operación con su 301.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | restaurar la meta/schema desde el snapshot | <5 min | sí |
| Slice 2 | volver el slug a `about-us-efeonce` y quitar el 301 | <15 min | sí |
| Slice 3 | n/a (sólo evidencia) | — | sí |

### Production verification sequence

1. Publicar el schema y validar el grafo del HTML servido (sin `Organization` duplicado).
2. GVC en la URL vigente.
3. Reslug + 301; `curl -I` de la URL vieja = 301 a `/nosotros/`; canonical = `/nosotros/`.
4. GVC en `/nosotros/`; revisar GSC a la semana.

### Out-of-band coordination required

- Operador: año de fundación confirmado (2008); falta confirmar los perfiles públicos del liderazgo antes de Slice 1 y
  aprobar el momento del reslug.

<!-- ═══════════════════════════════════════════════════════════
 ZONE 4 — VERIFICATION & CLOSING
 ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] El HTML servido de la página contiene `AboutPage`, un único `Organization` enriquecido y `Person` del liderazgo
  visible; el validador no reporta errores.
- [ ] Todo dato del schema está confirmado por el operador o por una fuente canónica citada en la task.
- [ ] `https://efeoncepro.com/about-us-efeonce/` responde 301 a `/nosotros/` y `/nosotros/` responde 200 con canonical propio.
- [ ] Los enlaces internos propios (menú, footer, landings) apuntan a `/nosotros/`.
- [ ] Escenario GVC `about-us` versionado, capturado en 1440 y 390 y mirado: un `h1`, sin scroll horizontal, texto fuera
  de los rieles Ohio.

## Verification

- `pnpm task:lint --task TASK-1369`
- Validador schema.org / Rich Results Test sobre la URL publicada
- `curl -I https://efeoncepro.com/about-us-efeonce/` (301) y `curl -I https://efeoncepro.com/nosotros/` (200)
- `pnpm fe:capture about-us --env=production` (1440 + 390) — mirar los frames

## Closing Protocol

- [ ] `Lifecycle` sincronizado con el estado real
- [ ] el archivo vive en la carpeta correcta
- [ ] `docs/tasks/README.md` y `docs/tasks/TASK_ID_REGISTRY.md` sincronizados
- [ ] `Handoff.md` actualizado
- [ ] ficha de la landing y registro de landings de la skill actualizados con el slug nuevo

## Follow-ups

- Imagen de captura real del portal en el bloque «lo ves en vivo», si el operador la quiere.

## Open Questions

- ¿Momento del reslug? (recomendado: después de Slice 1 y del primer GVC, en una ventana sin campañas apuntando a la URL vieja).
