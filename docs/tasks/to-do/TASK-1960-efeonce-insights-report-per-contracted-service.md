# TASK-1960 — Efeonce Insights: un informe por servicio contratado (alcance, módulos y destinatarios del servicio)

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
- Backend impact: `migration`
- Epic: `EPIC-045`
- Status real: `Diseno; pedido del operador 2026-10-02`
- Rank: `TBD`
- Domain: `platform|growth|delivery`
- Blocked by: `none`
- Branch: `Greenhouse develop; sin worktrees`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Hoy un informe de Insights pertenece a una organización y su evidencia de entrega (ICO) se calcula sobre todo el espacio
de trabajo del cliente. Un cliente grande con dos servicios que reportan a equipos distintos (Sky: Diseño digital y Blog
SEO/AEO) necesita dos informes separados, cada uno acotado a su servicio, con sus módulos y sus destinatarios. Esta task
ancla el informe al objeto canónico **Servicio** y acota la evidencia a lo que ese servicio produce.

## Why This Task Exists

Pedido del operador (2026-10-02): «Sky tiene dos servicios con nosotros, uno de diseño y otro de SEO y contenido. Deben ir
en informes separados: es el mismo cliente, pero son dos equipos complementarios y distintos, y se reporta a personas
distintas».

Estado verificado en la base (2026-10-02, sólo lectura):

- Los servicios ya existen como objetos canónicos sincronizados desde HubSpot (`greenhouse_core.services`):
  `SVC-HS-551519372424` «Sky Airline - Diseño digital» (activo) y `SVC-HS-591725750952` «Sky Airline - Blog SEO/AEO»
  (`seo_aeo`, onboarding desde 2026-09-24); Berel tiene `SVC-HS-554261764224` «Pinturas Berel - Agencia SEO».
- Los dos servicios de Sky comparten el mismo espacio (`spc-ae463d9f…`, «Sky Airline»), y ningún proyecto de delivery
  está vinculado a un servicio (`greenhouse_delivery.projects.module_id` es NULL en todos; `services.notion_project_id`
  también).
- El adapter ICO (`src/lib/efeonce-insights/adapters/ico-adapter.ts:62-67`) lista los espacios activos de la organización
  y calcula por espacio; ignora `projectIds` (`contracts/request.ts:61`). Hoy los proyectos de Sky con actividad son
  campañas creativas, así que el informe de entrega existente refleja Diseño por coincidencia: cuando el equipo de
  contenido registre sus tareas en el mismo espacio, se mezclarán.
- `greenhouse_insights.insight_reports` no tiene vínculo con un servicio (columnas: organización, propósito, título).

## Goal

- Un informe de Insights puede declarar el servicio que cubre (`service_id` → `greenhouse_core.services`); la edición
  hereda ese alcance y lo sella en la evidencia.
- La evidencia de entrega (ICO) de un informe con servicio se calcula sólo sobre los proyectos de ese servicio.
- Los módulos permitidos se derivan de la línea del servicio (p. ej. `seo_aeo` ⇒ SEO + AEO [+ entrega de contenido];
  diseño ⇒ entrega creativa), sin impedir que el operador acote más.
- Destinatarios, recurrencia y enlaces compartidos son por informe, de modo que cada equipo recibe sólo el suyo.
- Sky queda con dos informes: «Sky · Diseño digital» y «Sky · Blog SEO/AEO».

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

- Modelo 360: `Servicio` es objeto canónico; Insights lo extiende por FK, no crea una identidad paralela
  (`docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`).
- Insights: ventana, snapshot sellado, plan congelado y gates de emisión intactos
  (`docs/architecture/EFEONCE_INSIGHTS_ARCHITECTURE_V1.md` §5, §7, §10).
- ICO: Notion = sistema operativo, Greenhouse = motor (`architecture/metrics/ICO_DELIVERY_METRICS_AGENT_INVARIANTS.md`);
  el vínculo proyecto↔servicio se resuelve en Greenhouse, nunca con una fórmula Notion.
- Lectura cliente por servicio: `TASK-1853` define el reader por organización/servicio/período del portal; ambos
  deben compartir el mismo vínculo proyecto↔servicio.

## Normative Docs

- `docs/architecture/EFEONCE_INSIGHTS_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_HUBSPOT_SERVICES_INTAKE_V1.md` (origen de `greenhouse_core.services`)

## Dependencies & Impact

### Depends on

- `greenhouse_core.services` (sincronizado desde HubSpot p_services).
- Un vínculo proyecto de delivery ↔ servicio. Hoy no existe: es el primer slice.

### Blocks / Impacts

- `TASK-1853`/`TASK-1854` (portal cliente por servicio): mismo vínculo proyecto↔servicio.
- `TASK-1957`/`TASK-1958` (informe apto para cliente): el título por defecto debe nombrar el servicio.
- Schedules y entrega por correo de Insights (`schedules/`, `delivery/`): una recurrencia por informe de servicio.
- Tools MCP de Insights: el alcance por servicio debe estar disponible por el mismo contrato.

### Files owned

- `src/lib/efeonce-insights/contracts/request.ts`
- `src/lib/efeonce-insights/adapters/ico-adapter.ts`
- `src/lib/efeonce-insights/stores/report-store.ts`
- `src/lib/efeonce-insights/commands/create-edition.ts`
- migración nueva sobre `greenhouse_insights.insight_reports` y el vínculo proyecto↔servicio

## Current Repo State

### Already exists

- Servicios canónicos con línea (`linea_de_servicio`) y servicio específico (`servicio_especifico`).
- Informes por organización, ediciones con `modules` y `request_json.projectIds` (sin uso en el adapter ICO).
- Destinatarios por edición (`insight_delivery_recipients`) y recurrencias por organización (`insight_schedules`).

### Gap

- Sin vínculo informe↔servicio ni proyecto↔servicio.
- El adapter ICO no acota por proyecto ni por servicio.
- Las recurrencias no declaran el informe/servicio que alimentan más allá del `request_template`.

## Modular Placement Contract

- Topology impact: `domain-package`
- Current home: `src/lib/efeonce-insights/` (Vercel + `ops-worker` para recurrencias + Job `artifact-worker` para PDF)
- Future candidate home: `domain-package`
- Boundary: el alcance se resuelve en `collectInsightEvidence` a partir del servicio del informe; los adapters reciben
  la lista de proyectos/targets ya resuelta y no consultan servicios por su cuenta
- Server/browser split: `server-only`
- Build impact: `none`
- Extraction blocker: `el vínculo proyecto↔servicio vive en el PostgreSQL compartido`

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-standard`
- Impacto principal: `migration`
- Source of truth afectado: `greenhouse_insights.insight_reports` (+ `service_id`), vínculo proyecto↔servicio en delivery
- Consumidores afectados: `creación/revisión de ediciones, recurrencias, entrega por correo, lector público, lanes app/ecosystem/MCP de Insights, portal cliente (TASK-1853)`
- Runtime target: `production y staging (Vercel + ops-worker)`

### Contract surface

- Contrato existente a respetar: `InsightRequest` (`contracts/request.ts`), idempotencia `(organization_id, idempotency_key)` + `request_hash`
- Contrato nuevo o modificado: `serviceId` opcional en la creación del informe y en la solicitud; la edición sella el servicio y la lista de proyectos resuelta en el snapshot
- Backward compatibility: `compatible` — informes sin servicio siguen calculando por organización
- Full API parity: `el alcance se declara por el mismo command/route/MCP que crea informes; ninguna UI lo resuelve por su cuenta`

### Data model and invariants

- Entidades/tablas/views afectadas: `insight_reports` (columna `service_id` nullable con FK), vínculo proyecto↔servicio (tabla o columna a decidir en Discovery, append-only con vigencia)
- Invariantes que no se pueden romper:
  - `El servicio de un informe pertenece a la misma organización del informe (CHECK/validación en el command).`
  - `Una edición de un informe con servicio sólo contiene hechos de proyectos/targets de ese servicio; el snapshot sella la lista.`
  - `Un proyecto sin servicio asignado nunca cae en el informe de un servicio: se declara como límite («proyectos sin servicio asignado»).`
  - `Snapshot y plan siguen inmutables; cambiar el vínculo afecta sólo ediciones nuevas.`
- Write-target allowlist: `declarar la columna/tabla nueva en el allowlist del dominio en el mismo PR`
- Tenant/space boundary: `servicio y proyectos se resuelven dentro de la organización autorizada del informe`
- Idempotency/concurrency: `asignar un proyecto a un servicio es idempotente; la creación de informe conserva su idempotencia`
- Audit/outbox/history: `evento insights.report.* existente con el serviceId; historial del vínculo proyecto↔servicio`

### Migration, backfill and rollout

- Migration posture: `additive`
- Default state: `enabled with rationale — campo opcional; sin servicio el comportamiento no cambia`
- Backfill plan: `asignar los proyectos activos de Sky al servicio de Diseño (todos son campañas creativas a 2026-10-02) y dejar el Blog sin proyectos hasta que el equipo de contenido cree los suyos; Berel: su servicio SEO`
- Rollback path: `revert + redeploy; la columna nullable queda sin uso`
- External coordination: `release por el control plane (Vercel + ops-worker)`

### Security and access

- Auth/access gate: `sin cambio: módulo insights_v1 + capability insights.* + audiencia`
- Sensitive data posture: `reduce exposición: un equipo deja de ver la entrega del otro`
- Error contract: `servicio de otra organización ⇒ error canónico 404 anti-oracle`
- Abuse/rate-limit posture: `sin cambio`

### Runtime evidence

- Local checks: `tests del command (servicio ajeno rechazado), del adapter ICO acotado y del límite por proyectos sin servicio`
- DB/runtime checks: `crear en staging los dos informes de Sky y verificar que cada snapshot contiene sólo sus proyectos/targets`
- Integration checks: `una recurrencia por informe genera su borrador y su correo va sólo a los destinatarios de ese informe`
- Reliability signals/logs: `captureWithDomain('insights') ante servicio inválido`
- Production verification sequence: `release → crear informes de Sky por servicio → borrador de cada uno → revisión del operador`

### Acceptance criteria additions

- [ ] Source of truth, contract surface and consumers are named with real paths or objects.
- [ ] Data invariants, tenant/access boundary and idempotency/concurrency posture are explicit.
- [ ] Toda tabla nueva queda declarada con su justificación en el allowlist de destinos de escritura del dominio (donde exista boundary test), en el mismo PR: es un control de frontera deliberado, no un inventario que se completa al final.
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

### Slice 1 — Vínculo proyecto↔servicio

- Modelo append-only con vigencia y command gobernado (route + MCP) para asignar proyectos de delivery a un servicio;
  reader compartido con `TASK-1853`. Backfill de Sky (Diseño) y Berel.

### Slice 2 — Informe con servicio

- Migración `insight_reports.service_id` (FK, nullable) + validación de pertenencia a la organización en el command.
- `InsightRequest.serviceId`; la edición sella servicio y proyectos resueltos; título por defecto «Cliente · Servicio · mes».

### Slice 3 — Evidencia acotada

- `collectInsightEvidence` resuelve proyectos/targets del servicio y los pasa a los adapters; el adapter ICO calcula
  sólo sobre esos proyectos; proyectos sin servicio ⇒ límite declarado. SEO/AEO toman los targets/perfil del servicio.

### Slice 4 — Recurrencia y entrega por informe

- Recurrencias y destinatarios por informe de servicio; crear los dos informes de Sky con sus destinatarios.

## Out of Scope

- La UI del portal por servicio (`TASK-1854`).
- Cambiar fórmulas ICO o del Grader.
- Clasificar tareas sueltas por servicio: la unidad es el proyecto.

## Detailed Spec

Regla de módulos por línea de servicio (propuesta, a confirmar en Discovery): `efeonce_digital/seo_aeo` ⇒ `seo`, `aeo`
y, cuando existan proyectos de contenido, `ico` acotado a ellos; diseño/creativo ⇒ `ico`. El operador puede acotar más,
nunca agregar un módulo cuya evidencia no pertenece al servicio.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

Slice 1 antes que Slice 3: sin vínculo, un informe con servicio quedaría vacío o tomaría todo el espacio.

### Risk matrix

| Riesgo | Sistema | Prob | Mitigación | Señal |
|---|---|---|---|---|
| Proyecto mal asignado mezcla equipos | Insights ICO | Media | límite visible de proyectos sin servicio + revisión humana antes de emitir | límites del borrador |
| Informe con servicio vacío | Insights | Media | `not_ready` con causa si el servicio no tiene proyectos ni targets | estado de la edición |
| Servicio de otra organización | API/MCP | Baja | validación en el command + 404 anti-oracle | tests |

### Feature flags / cutover

Sin flag: el campo es opcional y los informes existentes no cambian.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible |
|---|---|---|---|
| 1–2 | revert + redeploy; columna/tabla sin uso | < 30 min | sí |
| 3 | revert del adapter | < 15 min | sí |
| 4 | pausar recurrencias por informe | inmediato | sí |

### Production verification sequence

Release → asignar proyectos de Sky a Diseño → crear «Sky · Diseño digital» y «Sky · Blog SEO/AEO» → borrador de cada uno
→ verificar evidencia acotada → revisión del operador.

### Out-of-band coordination required

El operador define los destinatarios de cada informe de Sky y confirma qué proyectos son de cada servicio.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Un informe puede declarar un servicio de su misma organización; uno ajeno se rechaza.
- [ ] La evidencia de entrega de un informe con servicio contiene sólo proyectos de ese servicio, sellados en el snapshot.
- [ ] Un proyecto sin servicio no entra a ningún informe de servicio y aparece como límite.
- [ ] Sky tiene dos informes, Diseño digital y Blog SEO/AEO, cada uno con sus módulos, recurrencia y destinatarios.
- [ ] El alcance por servicio está disponible por route y MCP (Full API Parity).

## Verification

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test src/lib/efeonce-insights`
- Borradores en staging de los dos informes de Sky con evidencia acotada

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas

- [ ] Skill `efeonce-insights` actualizada y espejada a `.codex/`.

## Follow-ups

- El servicio SEO de Berel figura con país `CL` en HubSpot aunque su mercado es México: revisar el dato de origen.

## Open Questions

- ¿Quiénes reciben cada informe de Sky (Diseño digital y Blog SEO/AEO)?
- ¿El informe del Blog incluye la entrega del equipo de contenido (tareas/piezas) además de SEO y AEO?
