# TASK-1158 — Public Site Astro Runtime Control Plane Decision Binding

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `complete`
- Priority: `P1`
- Impact: `Muy alto`
- Effort: `Medio`
- Type: `policy`
- Execution profile: `backend-data`
- UI impact: `none`
- Backend impact: `integration`
- Epic: `EPIC-019`
- Status real: `Cerrada`
- Rank: `TBD`
- Domain: `public-site|platform|content|marketing-ops|ops`
- Blocked by: `none`
- Branch: `task/TASK-1158-public-site-astro-runtime-control-plane`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Formalizar si `efeonce-web`/Astro pasa a ser el runtime gobernado por Greenhouse para activos publicos de `efeoncepro.com`, y bajo que estrategia de dominio, routing, SEO, WordPress/blog y Vercel/GitHub binding.

La task no migra el sitio ni publica paginas. Produce el decision packet, la matriz de ownership de rutas y el contrato minimo para que las siguientes tasks puedan construir landings de servicios rapido, sin dividir SEO en subdominios absurdos ni seguir atrapados en Elementor como unica via de produccion.

## Why This Task Exists

El operador necesita escalar landing pages, casos de negocio y paginas de servicios en modo VIBE Coding. WordPress + Ohio + Elementor permite salir del paso, pero hoy el proceso es pesado, lento y fragil para iterar secciones completas con QA visual.

Ya existe el repo `efeoncepro/efeonce-web` como intento Astro/headless, con Vercel conectado, pero el control plane vigente de Greenhouse para Public Site documenta WordPress/Kinsta como runtime actual y advierte que usar `efeonce-web` directamente seria un cambio de estrategia. Antes de implementar mas landings en cualquiera de los dos carriles, hay que decidir el runtime y el dominio principal de forma explicita, con SEO como restriccion de primer orden.

## Goal

- Producir o actualizar un ADR que decida la estrategia de runtime para `efeoncepro.com`: Astro como front door principal, WordPress como CMS/blog/origen legacy, WordPress runtime vigente, o transicion por rutas.
- Registrar `efeoncepro/efeonce-web` + Vercel como candidato/binding gobernado desde Greenhouse, con hechos actuales, gaps y restricciones.
- Definir la matriz de ownership de rutas: landings de servicios, blog, paginas institucionales, assets, `wp-admin`, REST/API, redirects y previews.
- Definir el preflight SEO obligatorio antes de cualquier cutover: inventario de URLs, canonicals, redirects, sitemaps, schema, noindex y Search Console.
- Derivar las child tasks de implementacion para el piloto de landing de servicios y para el MVP de control desde Greenhouse.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/epics/to-do/EPIC-019-public-website-landing-control-plane.md`
- `docs/architecture/GREENHOUSE_PUBLIC_WEBSITE_LANDING_CONTROL_PLANE_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_PUBLIC_WEBSITE_LANDING_CONTROL_PLANE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_API_PLATFORM_ARCHITECTURE_V1.md`
- `docs/operations/public-site-repository-control-plane-discovery-20260614.md`
- `docs/operations/public-site-runtime-repository-binding-20260614.json`
- `docs/operations/SOLUTION_QUALITY_OPERATING_MODEL_V1.md`

Reglas obligatorias:

- Greenhouse debe ser el control plane operativo; GitHub/Vercel/WordPress/Kinsta son rails y runtimes detras de escena, no superficies manuales obligatorias para el operador.
- No usar `landing.efeoncepro.com` como escape por defecto para landings SEO; si se propone subdominio debe venir con justificacion SEO explicita y rechazo/mitigacion de canibalizacion.
- No tratar `efeonce-web` como source of truth actual sin ADR aceptado; hoy el live runtime verificado sigue siendo WordPress/Kinsta.
- No mutar DNS, Vercel, Kinsta, WordPress ni contenido live desde esta task.
- Cualquier futura UI de Greenhouse debe consumir commands/readers server-side; no botones ad hoc que escriban directo en GitHub, Vercel o WordPress.

## Normative Docs

- `docs/context/00_INDEX.md`
- `docs/context/08_estrategia-comercial.md`
- `docs/context/14_modelo-negocio-asaas.md`
- `/Users/jreye/Documents/efeonce-web/docs/architecture/EFEONCE_WEB_ARCHITECTURE_V1.md`
- `/Users/jreye/Documents/efeonce-web/docs/tasks/TASK_ID_REGISTRY.md`
- `/Users/jreye/Documents/efeonce-web/package.json`

## Dependencies & Impact

### Depends on

- `EPIC-019` como programa publico vigente.
- `TASK-1122` como baseline WordPress runtime/GitOps ya iniciado.
- `TASK-1123` como Content Factory/agent kit relacionado.
- Repo externo local `/Users/jreye/Documents/efeonce-web` como candidato Astro verificado, no como source of truth aceptado.

### Blocks / Impacts

- Futuras tasks de landing pages de servicios HubSpot, Desarrollo Web, Marketing de Contenidos y casos de negocio.
- Futuro MVP de Greenhouse Public Site Control Plane para Astro/Vercel si el ADR acepta ese runtime.
- `EPIC-019` y su arquitectura, porque hoy declara WordPress/Kinsta como runtime V1 y rechaza Astro para V1.
- SEO, Search Console, sitemap y canonical strategy de `efeoncepro.com`.

### Files owned

- `docs/tasks/complete/TASK-1158-public-site-astro-runtime-control-plane-decision-binding.md`
- `docs/tasks/README.md`
- `docs/tasks/TASK_ID_REGISTRY.md`
- `docs/architecture/GREENHOUSE_PUBLIC_WEBSITE_LANDING_CONTROL_PLANE_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_PUBLIC_WEBSITE_LANDING_CONTROL_PLANE_ARCHITECTURE_V1.md`
- `docs/architecture/DECISIONS_INDEX.md`
- `docs/operations/public-site-repository-control-plane-discovery-20260614.md`
- `docs/operations/public-site-runtime-repository-binding-20260614.json`
- `Handoff.md`
- `changelog.md`

## Current Repo State

### Already exists

- Public Site WordPress/Kinsta control plane docs under `EPIC-019`.
- Runtime binding for WordPress code: `docs/operations/public-site-runtime-repository-binding-20260614.json`.
- Read-only bridge/control-plane foundations for WordPress content and code posture.
- External repo `/Users/jreye/Documents/efeonce-web`, remote `git@github.com:efeoncepro/efeonce-web.git`, local branch `develop`, SHA `389ab0ab45aeeab83c2e385e78e8eda34234eadb`, Astro 6.1.5 + Vercel adapter.
- `efeonce-web` Vercel project metadata at `/Users/jreye/Documents/efeonce-web/.vercel/project.json` (`projectName=efeonce-web`, `projectId=prj_i52CnPvaoNB0Lweqk7L7cLimv7W9`).

### Gap

- No hay ADR aceptado que cambie el runtime publico desde WordPress/Kinsta a Astro/Vercel, ni una estrategia de transicion por rutas bajo el dominio principal.
- No hay matriz de ownership de rutas que resuelva landings vs blog vs `wp-admin` vs REST/API vs previews.
- No hay binding Greenhouse formal para operar `efeonce-web` como runtime rail desde el control plane.
- No hay preflight SEO/cutover que proteja canonicals, redirects, sitemap y Search Console antes de mover paginas de servicios.
- `efeonce-web` aun contiene scaffold/demo y tasks pendientes para core pages, blog, landings y SEO; no esta listo para reemplazar el sitio live sin hardening.

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-standard`
- Impacto principal: `integration`
- Source of truth afectado: Public Site runtime/source-of-truth decision, GitHub/Vercel/WordPress/Kinsta bindings, future Greenhouse public-site commands/readers.
- Consumidores afectados: operadores Greenhouse, agentes Codex/Claude/Nexa, `efeonce-web`, WordPress/Kinsta, Vercel, GitHub, future Public Site UI.
- Runtime target: `external`

### Contract surface

- Contrato existente a respetar: `docs/architecture/GREENHOUSE_PUBLIC_WEBSITE_LANDING_CONTROL_PLANE_DECISION_V1.md`, `docs/architecture/GREENHOUSE_PUBLIC_WEBSITE_LANDING_CONTROL_PLANE_ARCHITECTURE_V1.md`, `docs/operations/public-site-runtime-repository-binding-20260614.json`.
- Contrato nuevo o modificado: ADR delta o nuevo ADR de `public-site-runtime-strategy.v1`, matriz `public-site-route-ownership.v1`, y propuesta de binding `public-site-astro-runtime-binding.v1`.
- Backward compatibility: `not applicable` para runtime porque esta task es docs/decision-only; futuras implementaciones deben ser gated.
- Full API parity: cualquier UI futura de Greenhouse debe mapear acciones a commands/readers server-side que gobiernen GitHub/Vercel/WordPress/Kinsta; no se acepta UI como unica via ni scripts manuales sin contrato.

### Data model and invariants

- Entidades/tablas/views afectadas: `none` en esta task; futuras tasks pueden introducir records de binding/deployments.
- Invariantes que no se pueden romper:
  - `efeoncepro.com` mantiene continuidad SEO y no duplica contenido indexable durante transicion.
  - WordPress admin/editorial sigue accesible por un host/ruta definida aunque Astro sea front door.
  - Greenhouse registra ownership, actor, decision, rollback y evidence antes de cualquier publish/cutover futuro.
  - Blog/editorial no se migra ni se proxy-a sin inventario y decision explicita.
- Tenant/space boundary: V1 es interno Efeonce; cualquier comando Greenhouse futuro debe requerir tenant interno/capability de Public Site.
- Idempotency/concurrency: esta task no escribe runtime; futuros deploy/cutover commands deben usar idempotency key por release/cutover id y bloquear doble apply concurrente.
- Audit/outbox/history: esta task documenta la necesidad; futuro runtime debe crear audit/deployment history antes de cambios externos.

### Migration, backfill and rollout

- Migration posture: `none`
- Default state: `read-only`
- Backfill plan: N/A; el inventario SEO/URL es discovery, no backfill.
- Rollback path: revertir docs/task/ADR; no hay cambio runtime.
- External coordination: GitHub/Vercel/Kinsta/WordPress/DNS/Search Console quedan como coordinacion futura, no ejecutada aqui.

### Security and access

- Auth/access gate: futuro `public_site.*` capability + server-side service credentials; esta task no crea credenciales.
- Sensitive data posture: no secrets; IDs publicos/de proyecto pueden documentarse, tokens y auth headers no.
- Error contract: futuros readers/commands deben exponer errores canonicos y redacted.
- Abuse/rate-limit posture: futuros providers externos deben tener retry/circuit breaker; no aplica a docs-only.

### Runtime evidence

- Local checks: `pnpm task:lint --task TASK-1158`, `pnpm ops:lint --changed`, `pnpm docs:closure-check`.
- DB/runtime checks: N/A docs-only.
- Integration checks: read-only CLI/metadata checks contra GitHub/Vercel/`efeonce-web` cuando se ejecute la task; no writes.
- Reliability signals/logs: N/A en esta task; futuros deploy/cutover tasks deben definir signals.
- Production verification sequence: N/A docs-only; si se crea ADR de cutover, incluir secuencia staging -> preview -> prod -> Search Console.

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

### Slice 1 — Runtime decision refresh

- Re-evaluar el ADR vigente de `EPIC-019` contra la nueva intencion: producir landings/servicios en Astro controladas desde Greenhouse.
- Decidir una de estas posturas: WordPress sigue runtime V1; Astro pasa a front door principal; Astro toma rutas especificas bajo el dominio principal; o se requiere decision humana por DNS/proxy.
- Actualizar o crear ADR con status, alternativas, consecuencias, rollback y criterios SEO.
- Actualizar `docs/architecture/DECISIONS_INDEX.md` si el ADR se acepta o si se crea un ADR nuevo.

### Slice 2 — Astro/Vercel/GitHub binding facts

- Documentar hechos actuales de `efeoncepro/efeonce-web`: repo, branch, SHA, stack, Vercel project, CI/deploy drift, pending tasks y estado de scaffold.
- Proponer el contrato `public-site-astro-runtime-binding.v1` o equivalente para que Greenhouse pueda leer estado de repo/deploys/branch y luego crear changes governados.
- Declarar explicitamente que `efeonce-web` no es live source of truth hasta que el ADR lo acepte.

### Slice 3 — Route ownership and SEO preflight

- Crear matriz de ownership de rutas: `/`, `/servicios-*`, paginas de servicios, blog/posts, `wp-admin`, `wp-json`, previews, assets, sitemap, robots y redirects.
- Definir el inventario SEO obligatorio: URLs actuales, traffic/rank candidates, canonicals, meta/OG, schema, redirects 301, sitemap partitioning, noindex rules, Search Console and analytics checks.
- Definir los gates de aceptacion para cualquier piloto: Lighthouse/Core Web Vitals, GVC visual, no duplicate indexable content, no broken canonical, no lost form/HubSpot attribution.

### Slice 4 — Downstream task map

- Crear o proponer child tasks para: Astro SEO hardening, Greenhouse runtime binding MVP, front-door/path routing implementation y primer piloto de landing de servicios.
- Marcar dependencias con `EPIC-019`, `TASK-1122` y `TASK-1123` sin pisar el trabajo en progreso.
- Dejar `Handoff.md` con la decision tomada, open questions y proximo paso recomendado.

## Out of Scope

- No migrar DNS ni cambiar el dominio principal.
- No publicar ni mover paginas live.
- No hacer cambios de codigo en `efeonce-web` salvo que una child task futura lo tome.
- No editar WordPress/Kinsta, no limpiar cache, no modificar Elementor ni tocar posts publicados.
- No construir la UI de Greenhouse para Public Site en esta task.
- No resolver todo el blog; solo definir si queda en WordPress, Astro/headless, proxy o fase futura.

## Detailed Spec

La decision debe responder como minimo:

- Cual es el runtime propuesto para landings de servicios en `efeoncepro.com`.
- Como se evita el subdominio `landing.efeoncepro.com` como carril SEO primario.
- Donde vive el blog durante la transicion y como se evita contenido duplicado.
- Que pasa con `wp-admin`, `wp-json`, previews, media/uploads y sitemaps.
- Que rol tendra Greenhouse: crear manifests, abrir branches/PRs, disparar Vercel deploys, publicar WordPress drafts, o solo coordinar tareas.
- Que condiciones hacen rollback hacia WordPress/Elementor temporalmente aceptable.

## Rollout Plan & Risk Matrix

Esta task es decision/documentacion. No tiene runtime rollout. Su impacto es bloquear implementaciones futuras hasta que la estrategia de dominio/SEO/control-plane este clara.

### Slice ordering hard rule

- Slice 1 (ADR/runtime decision) MUST happen before Slice 2 declares binding as accepted.
- Slice 2 (binding facts) MUST happen before Slice 4 creates implementation tasks.
- Slice 3 (route/SEO preflight) MUST happen before any child task de cutover o piloto publish.
- Slice 4 can only close when Slices 1-3 have binary outputs.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Mover landings a Astro sin estrategia de rutas duplica o pierde SEO | SEO / public-site | high | ADR + route matrix + redirects/canonical preflight before implementation | Search Console coverage drops, duplicate canonicals, sitemap mismatch |
| `efeonce-web` se trata como listo aunque esta en scaffold | release / Vercel | medium | Binding facts must include pending tasks, build state and noindex/demo route cleanup | Vercel deploy exposes demo/internal routes |
| Greenhouse termina como UI manual sin API parity | platform | medium | Declare commands/readers as required downstream contract | UI action has no server-side primitive/audit |
| WordPress/blog queda sin owner claro | WordPress / content | medium | Route ownership matrix must name blog/editorial owner | `/blog` or posts have conflicting sitemap/canonical |
| Decision se vuelve demasiado teorica y no desbloquea piloto | ops | medium | Slice 4 must create/propose child tasks with concrete order | No child task has acceptance criteria for first service landing |

### Feature flags / cutover

Sin flag en esta task: docs/ADR only. Cualquier child task de runtime debe definir flag/cutover o deploy gate antes de tocar dominio, Vercel production, WordPress production o Kinsta.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | Revert ADR/doc delta | <10 min | si |
| Slice 2 | Revert binding doc/proposal | <10 min | si |
| Slice 3 | Revert route/SEO matrix doc | <10 min | si |
| Slice 4 | Revert/propose cancellation of created child tasks | <15 min | si |

### Production verification sequence

N/A — esta task no cambia production. La task debe dejar definida la secuencia productiva futura antes de que exista un cutover task.

### Out-of-band coordination required

- Confirmacion humana futura antes de DNS/proxy/domain changes.
- Confirmacion humana futura antes de conectar Vercel production a `efeoncepro.com`.
- Confirmacion humana futura antes de mover blog, sitemap o canonical strategy.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [x] ADR nuevo o delta del ADR vigente existe, declara status, alternativas, decision, consecuencias, rollback y SEO constraints.
- [x] Matriz de ownership de rutas existe y cubre dominio principal, blog, landings, `wp-admin`, `wp-json`, previews, assets, sitemap y redirects.
- [x] Binding facts de `efeonce-web`/Vercel/GitHub quedan documentados con repo, branch, SHA, Vercel project, gaps de CI/deploy y readiness.
- [x] Contrato o propuesta `public-site-astro-runtime-binding.v1` queda definido con consumers Greenhouse y no contiene secretos.
- [x] Preflight SEO cubre inventario de URLs, canonicals, redirects, sitemap, noindex, schema, Search Console, analytics, HubSpot/form attribution y GVC/Lighthouse gates.
- [x] Child tasks de implementacion quedan creadas o listadas con orden, dependencies y acceptance criteria minimos.
- [x] `EPIC-019` queda actualizado si la decision cambia la postura WordPress-runtime V1.
- [x] `pnpm task:lint --task TASK-1158` termina con `errors=0`.
- [x] `pnpm ops:lint --changed` termina con `errors=0` o sus findings quedan documentados.
- [x] `pnpm docs:closure-check` termina verde o sus findings quedan documentados.

## Verification

- `pnpm task:lint --task TASK-1158`
- `pnpm ops:lint --changed`
- `pnpm docs:closure-check`
- Revision manual de docs afectados contra `EPIC-019` y el repo externo `/Users/jreye/Documents/efeonce-web`.

## Closing Protocol

- [x] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [x] el archivo vive en la carpeta correcta (`to-do/`, `in-progress` o `complete`)
- [x] `docs/tasks/README.md` quedo sincronizado con el cierre
- [x] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [x] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [x] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas
- [x] `EPIC-019` refleja la decision tomada o enlaza explicitamente al ADR actualizado
- [x] Si se crean child tasks, `docs/tasks/TASK_ID_REGISTRY.md` y `docs/tasks/README.md` quedan sincronizados para cada una

## Follow-ups

- Proposed next task — Astro SEO foundation + demo route cleanup in `efeonce-web`.
- Proposed next task — Greenhouse Public Site Astro/Vercel binding reader MVP.
- Proposed next task — Same-domain routing/front-door implementation.
- Proposed next task — First service landing pilot from Figma/tokens to Astro with GVC/Lighthouse/SEO gates.

## Delta 2026-06-16

TASK-1158 completed. Accepted Astro/Vercel as the target public frontend runtime direction for `efeoncepro.com`, while WordPress/Kinsta remains live runtime until cutover and CMS/admin/origin after cutover. No runtime mutation, DNS change, Vercel production domain change, WordPress write, Kinsta write or page publish was performed.

Delivered:

- `docs/architecture/GREENHOUSE_PUBLIC_SITE_ASTRO_RUNTIME_STRATEGY_DECISION_V1.md`
- `docs/operations/public-site-route-ownership-matrix-20260616.md`
- `docs/operations/public-site-astro-runtime-binding-20260616.json`
- Updates to `EPIC-019`, Public Website control-plane docs, `DECISIONS_INDEX`, `project_context.md`, `Handoff.md` and `changelog.md`.

Validation:

- `jq . docs/operations/public-site-astro-runtime-binding-20260616.json`
- `pnpm task:lint --task TASK-1158`
- `pnpm ops:lint --changed`
- `pnpm docs:closure-check`
- `pnpm docs:context-check`

## Open Questions

- El front door de `efeoncepro.com` debe ser Vercel/Astro completo o un proxy/path-routing que conserve WordPress para blog/admin?
- El blog queda en WordPress runtime, Astro headless, o se difiere hasta despues del piloto de landings?
- El dominio `cms.efeoncepro.com` ya es aceptable para WordPress admin/API, o se requiere otra topologia?
- Quien firma la decision final de DNS/cutover: Product, Platform, Marketing Ops o operador unico?
