# TASK-2049 — EO Portfolio: migración y salida a producción

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `integration`
- Epic: `EPIC-056`
- Status real: `Diseño. Esperando TASK-2047 (plugin) y TASK-2048 (plantillas), y la lista de aprobaciones de cliente del operador.`
- Rank: `TBD`
- Domain: `content`
- Blocked by: `TASK-2047, TASK-2048`
- Branch: `Greenhouse develop para docs; el contenido y el código viven en efeonce-public-site-runtime con su release acotado por SSH; sin worktrees`

## Summary

Lleva el portafolio nuevo a producción: migra las 15 entradas reales del tipo `ohio_portfolio` al tipo `eo_project`
de TASK-2047, publica sólo las que tienen aprobación del cliente, sube los videos al bucket público de AXIS, redirige
`/project/<slug>/` con 301, enciende la plantilla de TASK-2048 en `/portafolio/` y, tras 30 días sin tráfico residual,
desactiva el plugin Ohio Portfolio. Cierra el programa con la documentación en sus tres capas.

## Why This Task Exists

TASK-2047 y TASK-2048 construyen el contenedor y la vista, pero el sitio sigue sirviendo el portafolio de Ohio hasta
que alguien mueva el contenido, decida qué se publica y cambie las URLs. Esa salida toca contenido de clientes reales,
URLs indexadas y un plugin del tema: es la parte con más riesgo de marca y de SEO del programa, y necesita su propio
plan de orden, verificación y vuelta atrás (PDR-028 §6).

## Goal

- Las 15 entradas reales existen como documentos `eo_project` válidos; las aprobadas están publicadas en
  `/portafolio/<slug>/`.
- Ninguna URL antigua `/project/<slug>/` de una entrada real responde 200: 301 a su entrada nueva o a `/portafolio/`.
- `/portafolio/` sirve la plantilla nueva; Ohio Portfolio queda desactivado (no eliminado) con evidencia de 30 días.
- Documentación técnica, funcional y manual de uso del portafolio publicadas.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/public-site/decisions/PDR-028-portafolio-de-proyectos-eo-portfolio.md` (§3 invariantes, §4 medios, §6 Ohio)
- `docs/public-site/decisions/PDR-020-canales-propios-sistema-editorial.md` §4.3 (compuerta de cliente; el blog es canónico)
- `docs/public-site/decisions/PDR-027-navegacion-global-del-sitio-portable.md` §3 (bucket público de AXIS, nombres inmutables)
- `docs/public-site/LA_ORBITA_SITE_MIGRATION_PLAN_V1.md` §1 (confirmar en Search Console antes de cambiar una URL)
- `docs/architecture/public-site/PUBLIC_SITE_GLOBAL_NAVIGATION_V1.md` (precedente de plugin con documento y tres puertas)

Reglas obligatorias:

- Ningún proyecto se publica sin `clientApproval` válido; el alcance (`logo`, `pieces`, `metrics`, `testimonial`) decide
  qué se muestra. La migración nunca rellena una aprobación que no exista.
- Ninguna cifra se migra sin `source`. Las cifras del caso de Sky llevan la fuente del caso publicado; el 88 % frente al
  94 % se resuelve con el operador antes de publicar.
- Las entradas demo de Ohio no se migran (son de TASK-2046).
- Todo cambio en producción va por el carril gobernado: `pnpm public-website:ssh-check`, snapshot previo, WP-CLI con
  `--dry-run` primero y lista de IDs explícita. Nunca por título ni por búsqueda.
- El plugin Ohio Portfolio se desactiva, no se elimina.

## Normative Docs

- `docs/public-site/README.md` (estado de las páginas y decisiones del sitio)
- `docs/documentation/public-site/navegacion-global-del-sitio.md` (formato de la documentación funcional del sitio)
- `.claude/skills/efeonce-public-site-wordpress/` (carril SSH, WP-CLI y purga de caché) [verificar referencia exacta]
- Caso «Un año con Sky»: repo `/Users/jreye/Documents/sky-efeonce` (`src/pages/index.astro`, fuente de cifras)

## Dependencies & Impact

### Depends on

- `TASK-2047` — tipo `eo_project`, servicio de guardado, `wp eo-portfolio apply|publish`, compuerta de aprobación.
- `TASK-2048` — plantillas de portada y entrada y su interruptor de corte en la página 247116.
- `TASK-2046` — demos fuera (410) antes de redirigir; si no cerró, esta task no redirige `/project/*` en lote.
- Decisión del operador: lista de proyectos con aprobación y su alcance (PDR-028, Pendientes 2).

### Blocks / Impacts

- Cierra `EPIC-056` y la decisión 5 del plan de migración a La órbita para `/portafolio/`.
- Menú global (`TASK-2041`): el ítem «Portafolio» sigue apuntando a `/portafolio/`; no cambia.
- Pie del sitio: «Casos de éxito» → `/portafolio/` sigue funcionando; el cambio de nombre es decisión pendiente (PDR-028).
- Home: el CTA «Cases» de la página 247116 no cambia de destino.

### Files owned

- `docs/tasks/to-do/TASK-2049-eo-portfolio-migration-rollout.md`
- `docs/documentation/public-site/portafolio.md` (nuevo)
- `docs/manual-de-uso/public-site/portafolio.md` (nuevo)
- `docs/architecture/public-site/PUBLIC_SITE_PORTFOLIO_V1.md` (nuevo)
- `efeonce-public-site-runtime`: scripts de migración y mapa de redirecciones [verificar ubicación con el patrón de `scripts/public-website/` de greenhouse-eo]

## Current Repo State

### Already exists

- 15 entradas reales en `ohio_portfolio` (auditoría del 2026-10-23): bresler, marca-chile, gobierno-de-santiago,
  social-media-nutribait, fivest-branding, lifestyle-app-elementor (Eusari), sky-airlines-propuesta, flick-identity,
  pabellotogo-design, motogas-social-media, dmark-social-media, ghamadent-design, ssilva-campaign, beebot-social-media y
  bighouse-design. Sus campos viven en ACF privado de Ohio (no salen por REST).
- Medios ya publicados por el sitio en `wp-content/plugins/eo-elementor-widgets/assets/img/creativa/` (videos de Sky con
  póster, piezas de Bresler, Eusari, Brio y otras) y en `wp-content/uploads/` (galerías de cada entrada).
- Bucket público de AXIS `gs://efeonce-group-axis-public-media/` con el patrón de carpeta versionada de `site-nav/`.
- Comandos del carril: `pnpm public-website:ssh-check`, `pnpm public-website:export-live-code`,
  `pnpm public-website:wpcli`, `pnpm public-website:runtime-status`, `pnpm public-website:diff-runtime`.

### Gap

- No hay script que lea los campos ACF de Ohio y produzca documentos `eo_project`.
- No hay mapa de redirecciones `/project/*` → `/portafolio/*` ni mecanismo elegido para servirlo.
- No hay lista de aprobaciones de cliente registrada; sin ella sólo se puede migrar a borrador.
- Los videos del portafolio no están en el bucket.
- No existe documentación del portafolio en ninguna de sus tres capas.

## Modular Placement Contract

- Topology impact: `public`
- Current home: `efeonce-public-site-runtime` (WordPress en Kinsta): contenido `eo_project`, redirecciones y estado del
  plugin Ohio Portfolio; docs en greenhouse-eo
- Future candidate home: `public`
- Boundary: la migración escribe sólo por `wp eo-portfolio apply` (TASK-2047); nunca inserta en la base ni en post
  meta directamente
- Server/browser split: la migración corre entera en el servidor de WordPress por WP-CLI; ningún paso pasa por el
  navegador del visitante
- Build impact: `none` — scripts de una sola vez, sin dependencias nuevas en el runtime
- Extraction blocker: `none`

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-critical` — escritura en producción de contenido de clientes, redirecciones de URLs indexadas
  y desactivación de un plugin del tema
- Impacto principal: `integration`
- Source of truth afectado: documentos `eo_project` (TASK-2047); `ohio_portfolio` queda como fuente de lectura de la
  migración y luego fuera de uso
- Consumidores afectados: visitantes de `/portafolio/` y `/project/*`, buscadores, menú global, Home y pie del sitio
- Runtime target: `production` (WordPress en Kinsta), con ensayo en staging o local del runtime

### Contract surface

- Contrato existente a respetar: esquema `portfolio-entry.v1.json` y el servicio de guardado de TASK-2047; interruptor de
  corte de TASK-2048
- Contrato nuevo o modificado: mapa de redirecciones versionado (`/project/<slug>/` → destino) y documento de
  aprobaciones por proyecto
- Backward compatibility: `gated` — las URLs antiguas siguen resolviendo por 301; el corte de la portada va detrás del
  interruptor de TASK-2048
- Full API parity: la migración usa la misma puerta que un agente (`wp eo-portfolio apply|publish`); no hay escritura
  paralela

### Data model and invariants

- Entidades/tablas/views afectadas: posts `eo_project` y su documento; posts `ohio_portfolio` (sólo lectura y luego
  borrador); reglas de redirección
- Invariantes que no se pueden romper:
  - Un proyecto publicado siempre tiene `clientApproval` con referencia, fecha y alcance.
  - Toda cifra publicada tiene `source`.
  - Todo `/project/<slug>/` de una entrada real responde 301, nunca 404 ni 200.
  - Ningún post de `ohio_portfolio` se elimina en esta task.
- Write-target allowlist: `N/A` — no hay boundary test de dominio en greenhouse-eo para el runtime de WordPress
- Tenant/space boundary: no aplica; contenido público de un solo sitio
- Idempotency/concurrency: `apply` por slug es idempotente (mismo documento → misma revisión, sin duplicado); la
  migración se corre con lista de IDs explícita y se puede repetir
- Audit/outbox/history: revisiones del documento en TASK-2047; snapshot JSON de cada entrada de Ohio antes de tocarla,
  guardado fuera del servidor

### Migration, backfill and rollout

- Migration posture: `backfill` (15 documentos) + cambio de URLs
- Default state: documentos creados en borrador; publicación sólo de los aprobados
- Backfill plan: export de Ohio → documento → `validate` → `apply --dry-run` → `apply` en borrador → revisión visual →
  `publish` por slug aprobado
- Rollback path: interruptor de TASK-2048 a Ohio, borrar reglas de redirección, despublicar `eo_project` y reactivar
  Ohio Portfolio
- External coordination: aprobaciones de cliente (operador y cuentas), Search Console, subida al bucket de AXIS con
  credenciales de GCP, purga de caché de Kinsta

### Security and access

- Auth/access gate: WP-CLI por el carril SSH con usuario de servicio del runtime; la publicación exige aprobación en el
  documento
- Sensitive data posture: nombres, cargos y citas de personas del cliente (testimonios) sólo con alcance
  `testimonial`; sin datos personales fuera de eso
- Error contract: `validate` devuelve errores por campo; `apply` falla completo si un documento no valida
- Abuse/rate-limit posture: no aplica; operación interna de una sola vez

### Runtime evidence

- Local checks: validación de los 15 documentos contra el esquema; prueba del mapa de redirecciones
- DB/runtime checks: `wp eo-portfolio export` igual al documento aplicado; conteo de `ohio_portfolio` publicados = 0 al
  final de la fase de corte
- Integration checks: `curl -sI` de cada `/project/<slug>/` (301 y destino), de cada `/portafolio/<slug>/` publicado (200)
  y de `/portafolio/` (200 con la plantilla nueva); JSON público sin proyectos en borrador
- Reliability signals/logs: log de 404 del sitio y tráfico a `/project/*` durante 30 días antes de desactivar Ohio
  Portfolio
- Production verification sequence: ver `## Rollout Plan & Risk Matrix`

### Acceptance criteria additions

- [ ] Source of truth, contract surface and consumers are named with real paths or objects.
- [ ] Data invariants, tenant/access boundary and idempotency/concurrency posture are explicit.
- [ ] Toda tabla nueva queda declarada con su justificación en el allowlist de destinos de escritura del dominio (donde exista boundary test), en el mismo PR: es un control de frontera deliberado, no un inventario que se actualiza solo.
- [ ] Migration/backfill/rollback posture is explicit and proportional to risk.
- [ ] Runtime or DB evidence is listed for any change beyond docs/tooling.
- [ ] Sensitive domains have canonical errors, audit/signal posture and no raw data leaks.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     "Que construyo exactamente, slice por slice?"
     El agente solo lee esta zona DESPUES de que el plan este
     aprobado. Ejecuta un slice, verifica, commitea, y avanza.
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Export y documentos en borrador

- Script que lee por WP-CLI los campos ACF de las 15 entradas reales (por ID, lista explícita) y genera un documento
  `eo_project` por entrada, con `TODO` explícitos donde el dato no existe en Ohio (para quién, reto, resultados).
- Snapshot JSON de cada entrada de Ohio guardado fuera del servidor antes de cualquier cambio.
- `wp eo-portfolio validate` y `apply --dry-run`; luego `apply` en borrador. Ninguna publicación en este slice.

### Slice 2 — Medios

- Videos (mp4 H.264, póster webp, VTT si hay voz) subidos a `gs://efeonce-group-axis-public-media/portfolio/v1/<slug>/`
  con nombres inmutables y caché de un año; imágenes a la biblioteca de WordPress con `alt` y dimensiones.
- Los documentos referencian las URLs y las dimensiones reales; la proporción se deriva de ellas.

### Slice 3 — Contenido y aprobaciones

- Con el operador y las cuentas: completar para quién, reto, idea, ejecución, resultados con fuente y créditos de las
  entradas citables (Sky, Bresler, Berel y ANAM según PDR-020), y registrar `clientApproval` con su alcance.
- `publish` sólo de los slugs con aprobación válida.

### Slice 4 — Redirecciones y corte de la portada

- Mapa de redirecciones versionado: entradas publicadas → `/portafolio/<slug>/`; en borrador → `/portafolio/`.
- Revisión previa en Search Console de las URLs `/project/*` con tráfico o enlaces.
- Interruptor de TASK-2048 encendido en `/portafolio/`; purga de caché de Kinsta.

### Slice 5 — Retiro de Ohio Portfolio y documentación

- Tras 30 días con tráfico residual a `/project/*` sólo redirigido, desactivar el plugin Ohio Portfolio (no eliminar) y
  verificar que nada del sitio dependía de él.
- Documentación en tres capas: técnica (`docs/architecture/public-site/PUBLIC_SITE_PORTFOLIO_V1.md`), funcional
  (`docs/documentation/public-site/portafolio.md`) y manual de uso (`docs/manual-de-uso/public-site/portafolio.md`).
- Cierre de `EPIC-056` y delta en el plan de migración a La órbita.

## Out of Scope

- El plugin, el esquema y las puertas (TASK-2047); las plantillas y el reproductor (TASK-2048).
- Las 44 entradas demo (TASK-2046).
- Proyectos nuevos que no estén entre las 15 entradas reales.
- Cambiar el nombre de «Casos de éxito» en el pie (decisión pendiente del operador).
- Reescribir los casos del blog o la página de Sky en experiencia.efeoncepro.com.
- Video largo con HLS.

## Detailed Spec

**Correspondencia de campos de Ohio** (`ohio/inc/tgmpa/acf-php/project.php`, leída en la auditoría):

| Ohio | Documento `eo_project` | Nota |
|---|---|---|
| título del post | `client.name` y título visible | Revisar: «Identidad Visual Fivest» → cliente «Fivest» |
| `project_client` | `client.name` | Gana sobre el título si existe |
| `project_description` | `steps.challenge.body` (borrador) | Texto en revisión editorial, no se publica tal cual |
| `project_task` | `need` | |
| `project_strategy`, `project_design` | `services[]` | Se mapean al catálogo de `docs/services/`; texto libre en inglés no se migra |
| `project_date` | `period` | Las fechas por defecto «junio 3, 2020» no se migran: quedan `TODO` |
| galería (`project_content`) | `chapters[0].media[]` | Sin duplicar la primera imagen (caso Bresler) |
| `project_video` | medio de video del capítulo | Sólo Dmark tiene uno (YouTube); se decide si se descarga con permiso o queda como enlace |
| `project_link` | `links.external` | Se descartan los enlaces de afiliado de Envato |
| categorías | `line` + `services[]` | Las 42 categorías de Ohio no se migran |

**Destino de cada URL** (se confirma en Slice 4 con Search Console):

| Caso | `/project/<slug>/` responde |
|---|---|
| Entrada migrada y publicada | 301 a `/portafolio/<slug-nuevo>/` |
| Entrada migrada en borrador | 301 a `/portafolio/` |
| Demo de Ohio | 410 (TASK-2046) |

Los slugs nuevos corrigen los heredados: `lifestyle-app-elementor` → `eusari`, `pabellotogo-design` → `pabellontogo`,
`sky-airlines-propuesta` → `sky-airline` [verificar con el operador].

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 (documentos en borrador) → Slice 2 (medios) → Slice 3 (aprobaciones y publicación) → Slice 4 (redirecciones y
  corte) → Slice 5 (retiro de Ohio, 30 días después).
- Slice 4 NO corre si TASK-2046 no cerró: redirigir en lote con los demos todavía publicados mezcla 410 y 301 sin
  control.
- Slice 4 NO corre sin al menos un proyecto publicado con aprobación: una portada vacía en producción es peor que la de
  Ohio.
- Slice 5 NO corre antes de 30 días desde Slice 4.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Se publica un proyecto sin aprobación del cliente | WordPress (contenido) | low | Compuerta de TASK-2047 en las tres puertas; `publish` sólo por slug aprobado | JSON público con un slug fuera de la lista aprobada |
| Una cifra de Sky sale con el dato equivocado (88 % vs 94 %) | WordPress (contenido) | medium | No se publica hasta que el operador fije el dato; `source` obligatoria | Revisión editorial previa al `publish` |
| Una URL antigua con tráfico queda en 404 | SEO / redirecciones | medium | Mapa completo de las 15 entradas + revisión en Search Console antes del corte | Log de 404 en `/project/*` |
| El corte de la portada muestra una plantilla rota en producción | WordPress (UI) | low | Interruptor de TASK-2048; verificación en staging y en producción con el interruptor por página | `curl` de `/portafolio/` sin el marcador de la plantilla |
| Se elimina por error un post de Ohio | WordPress (contenido) | low | Sólo borrador, nunca `delete`; snapshot previo | Conteo de posts `ohio_portfolio` distinto al esperado |
| Desactivar Ohio Portfolio rompe algo del sitio que dependía de él | WordPress (tema) | low | 30 días de observación; verificación de páginas con widgets de Ohio | Errores PHP en el log del sitio |
| Caché de Kinsta sirve la versión vieja tras el corte | CDN | medium | Purga tras cada fase; verificación con cabeceras | Respuesta con la plantilla de Ohio tras la purga |

### Feature flags / cutover

- El corte de `/portafolio/` usa el interruptor de TASK-2048 (por página, con vuelta a Ohio en un paso).
- La publicación es por proyecto: cada `publish` es un corte independiente y reversible.
- Las redirecciones se aplican en un solo cambio versionado que se puede revertir completo.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | Mover a la papelera los `eo_project` en borrador creados por el script (por ID) | 5 min | sí |
| Slice 2 | Los objetos del bucket son inmutables; se dejan sin referencia (no se borran) | 0 min | sí |
| Slice 3 | `wp eo-portfolio` despublica el slug (vuelve a borrador) | 2 min | sí |
| Slice 4 | Interruptor de TASK-2048 a Ohio + revertir el cambio de redirecciones + purga | 10 min | sí |
| Slice 5 | Reactivar Ohio Portfolio | 2 min | sí |

### Production verification sequence

1. `pnpm public-website:ssh-check` y `pnpm public-website:runtime-status`.
2. Snapshot de las 15 entradas de Ohio fuera del servidor.
3. Slice 1 completo en staging o local del runtime; luego en producción en borrador.
4. Slice 2 y verificación de que cada URL del bucket responde 200 con su caché.
5. Slice 3: `publish` por slug aprobado; verificar `/portafolio/<slug>/` 200 y JSON público.
6. Search Console revisado; Slice 4 con el interruptor por página; verificar cada `/project/<slug>/` (301 y destino) y
   `/portafolio/` (200 con la plantilla nueva) tras purgar.
7. Observar 30 días el log de 404 y el tráfico a `/project/*`; Slice 5.

### Out-of-band coordination required

- Operador y cuentas: lista de proyectos con aprobación del cliente y alcance; dato de Sky (88 % vs 94 %).
- Search Console: revisión de URLs antes de redirigir.
- GCP: credenciales para subir al bucket público de AXIS (las tiene el operador o el agente con ADC, no el plugin).
- Kinsta: purga de caché tras cada fase.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Existe un documento `eo_project` válido por cada una de las 15 entradas reales (`wp eo-portfolio validate` sin errores).
- [ ] Ningún `eo_project` publicado carece de `clientApproval`; el JSON público no lista proyectos en borrador.
- [ ] Cada `/project/<slug>/` de las 15 entradas responde 301 al destino del mapa versionado.
- [ ] `/portafolio/` responde 200 servido por la plantilla de TASK-2048.
- [ ] Ningún post de `ohio_portfolio` fue eliminado (conteo antes y después registrado).
- [ ] Los videos del portafolio se sirven desde `storage.googleapis.com/efeonce-group-axis-public-media/portfolio/` con caché de un año.
- [ ] Ohio Portfolio desactivado con evidencia de 30 días de tráfico residual sólo redirigido.
- [ ] Las tres capas de documentación del portafolio existen y están enlazadas desde `docs/public-site/README.md`.

## Verification

- `pnpm task:lint --task TASK-2049`
- `pnpm public-website:ssh-check`
- `pnpm public-website:wpcli -- eo-portfolio validate --all` [verificar sintaxis final en TASK-2047]
- `curl -sI https://efeoncepro.com/project/<slug>/` para las 15 entradas
- `curl -s https://efeoncepro.com/wp-json/eo/v1/portfolio` sin slugs en borrador
- Revisión manual de las entradas publicadas en escritorio y 390 px

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas

- [ ] `EPIC-056` cerrado y movido a `complete/` si sus criterios de salida se cumplen
- [ ] Delta en `docs/public-site/LA_ORBITA_SITE_MIGRATION_PLAN_V1.md` con `/portafolio/` migrado
- [ ] `docs/public-site/README.md` actualizado con el estado del portafolio

## Follow-ups

- Contrato `efeonce.portfolio-entry` en AXIS cuando exista un segundo consumidor (Think o el sitio en Astro).
- Video largo con HLS si el operador lo decide.
- Proyectos sin aprobación: retiro definitivo si el operador lo decide.

## Open Questions

- ¿Qué proyectos tienen aprobación del cliente y con qué alcance? (PDR-028, Pendientes 2)
- ¿El video de Dmark (YouTube) se descarga con permiso o queda como enlace?
- ¿Se corrigen los slugs heredados (`lifestyle-app-elementor`, `pabellotogo-design`) o se conservan?
