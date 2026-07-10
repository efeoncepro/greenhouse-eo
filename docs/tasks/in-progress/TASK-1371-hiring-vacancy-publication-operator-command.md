# TASK-1371 — Hiring Vacancy Publication Operator Command

## Delta 2026-07-08 — Revisión 3-lentes (arch-architect + talent/people-ops + product-design)

Hechos verificados contra el repo real. Task bien encuadrada (Full API Parity: un command, muchos wrappers); ajustes:

- **Sustrato confirmado:** `createTalentDemand`/`createHiringOpening`/`updateHiringOpening`/`publishOpening` existen en `src/lib/hiring/store.ts`+`publication.ts`; `publishHiringVacancyFromBrief` es net-new; `hiring_opening` hoy SOLO tiene `public_location_mode` (los campos estructurados de Slice 0 son net-new reales); la inferencia heurística que 1371 reemplaza es real (`inferArea`/`containsAreaTerm`/`skillChips` en `public-careers/view-model.ts`).
- **Open Question de idempotencia RESUELTA:** existe primitive canónico **`src/lib/api-platform/core/idempotency.ts` + `core/commands.ts`** (command execution ledger). El command DEBE reusar ese ledger, NO rodar idempotencia propia en el store salvo que Discovery demuestre una brecha concreta. (Cierra la 3.ª Open Question.)
- **⚠️ Coordinación viva (no colisionar):** `src/lib/hiring/public-careers/view-model.ts` (+167 líneas) y `schema.ts` están **modificados sin commitear** (probable trabajo concurrente Codex que EXPANDE la heurística de inferencia). 1371 Slice 0 **reemplaza** esa heurística con campos estructurados → tratar el estado actual del view-model como **interino** y secuenciar: primero aterrizar/commitear lo interino, luego 1371 lo supersede. NO stagear esos archivos como parte de otra cosa; coordinar antes de tocar el renderer.
- **Alinear el brief con la skill:** el input `HiringVacancyBrief` debe alinear con `templates/job-brief.md` de `greenhouse-talent-people-operator` (existe), no inventar un shape paralelo; el `job-offer-recipe.md` es de oferta (post-decisión), no de publicación — no mezclarlos.
- **⚠️ Gap talento — compensación/salario:** los campos estructurados (workMode/region/area/skills) mejoran la higiene del posting, pero NO incluyen banda de compensación. Con la **EU Pay Transparency Directive (jun 2026)** y la doctrina 2026 de la skill, un operador de publicación de vacantes debería **decidir explícitamente** si expone un `publicCompBand`/rango salarial (aunque sea opcional/gated), no dejarlo silenciosamente ausente. Añadido como Open Question + decisión de scope.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `in-progress`
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
- Epic: `EPIC-011`
- Status real: `Implementado local / rollout pendiente`
- Rank: `TBD`
- Domain: `hr|ops`
- Blocked by: `none`
- Branch: `task/TASK-1371-hiring-vacancy-publication-operator-command`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Crear un operador programatico robusto para publicar vacantes de Hiring desde un brief estructurado sin requerir release, SQL directo ni ediciones manuales de production. El operador debe componer los commands/endpoints existentes de demanda, opening y publish, producir IDs/URLs canonicos y quedar listo para ser usado por CLI, Nexa o futuras superficies internas.

## Why This Task Exists

El flujo de Careers ya tiene API parity en piezas separadas (`createTalentDemand`, `createHiringOpening`, `publishOpening` y submit publico), pero la operacion diaria sigue siendo demasiado artesanal: un agente que quiere publicar una vacante puede terminar revisando docs, escribiendo payloads sueltos o pidiendo un release innecesario. Eso no escala para talento. La raiz no es falta de endpoint, sino falta de una primitive operativa de publicacion de vacantes que empaquete validacion, idempotencia, auditoria, preview y resultado canonicamente consumible.

## Goal

- Implementar un command/orchestrator server-side `publishHiringVacancyFromBrief` o equivalente que convierta un brief aprobado en demanda, opening y publicacion gobernada.
- Exponer una superficie programatica segura para operadores/agentes: dry-run por defecto, execute/publish explicito, salida con demand/opening IDs, URLs publicas y warnings.
- Dejar el proceso "crear y publicar vacante" sin dependencia de release por cada vacante, SQL manual o UI-only flow.
- Documentar el uso operativo para la skill de talento, manual de uso y consumers futuros como Nexa/Hiring Desk.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_HIRING_ATS_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_API_PLATFORM_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md`
- `docs/epics/to-do/EPIC-011-hiring-ats-end-to-end-program.md`
- `docs/tasks/in-progress/TASK-354-public-careers-landing-apply-intake.md`
- `docs/tasks/complete/TASK-1367-careers-apply-intake-service.md`
- `docs/tasks/complete/TASK-355-hiring-desk-internal-workspaces-publication-governance.md`
- `docs/documentation/hr/careers-publicas.md`
- `docs/manual-de-uso/hr/operar-careers-publicas.md`

Reglas obligatorias:

- No crear scripts SQL para sembrar vacantes como camino operativo normal.
- No requerir release/deploy para publicar una nueva vacante si el runtime ya tiene los commands habilitados.
- El operador debe componer commands server-side existentes; no debe duplicar reglas de Hiring ni escribir tablas directas desde una CLI.
- La publicacion debe respetar allowlist publica, estados del opening, capacidades internas y audit/outbox existentes.
- Full API parity significa un contrato programatico gobernado, no botones UI ni endpoints ad hoc por tabla.
- Cualquier workaround debe ser temporal, reversible y documentado con owner/retirada.

## Normative Docs

- `.codex/skills/greenhouse-talent-people-operator/SKILL.md`
- `.codex/skills/greenhouse-talent-people-operator/references/greenhouse-runtime.md`
- `docs/operations/SOLUTION_QUALITY_OPERATING_MODEL_V1.md`
- `docs/operations/GREENHOUSE_OPERATING_LOOP_V1.md`
- `docs/operations/CONTEXT_HANDOFF_OPERATING_MODEL_V1.md`

## Dependencies & Impact

### Depends on

- Hiring foundation runtime de `TASK-353` y arquitectura EPIC-011.
- `createTalentDemand`, `createHiringOpening`, `updateHiringOpening` y `publishOpening` en `src/lib/hiring/**`.
- Endpoints existentes `POST /api/hiring/demands`, `POST /api/hiring/openings`, `GET/PATCH /api/hiring/openings/[id]` y `POST/DELETE /api/hiring/openings/[id]/publish`.
- Public careers runtime de `TASK-354`, en especial rutas `/public/careers` y `/public/careers/[openingPublicId]/apply`.
- Submit publico de `TASK-1367` para validar que el opening publicado recibe aplicaciones.

### Blocks / Impacts

- Reduce el esfuerzo operativo de publicar vacantes de Efeonce sin depender de releases acoplados.
- Desbloquea consumidores agenticos y Nexa para "crear/publicar vacante" sin improvisar payloads.
- Puede ser consumido por `TASK-355` como backend operator path de Publication Desk.
- Actualiza el manual y la skill de talento para que el camino canonico sea command/API, no release ni SQL.

### Files owned

- `src/lib/hiring/**`
- `src/types/hiring.ts`
- `src/lib/hiring/publication.ts`
- `src/lib/hiring/store.ts`
- `src/app/api/hiring/**`
- `migrations/**`
- `scripts/hiring/**`
- `package.json`
- `docs/manual-de-uso/hr/operar-careers-publicas.md`
- `docs/documentation/hr/careers-publicas.md`
- `.codex/skills/greenhouse-talent-people-operator/**`
- `.claude/skills/greenhouse-talent-people-operator/**`
- `Handoff.md`
- `changelog.md`
- `project_context.md`

## Current Repo State

### Already exists

- `TASK-354` dejo la interfaz publica de careers en production con alta fidelidad al HTML fuente y Growth Form browser contract.
- `TASK-1367` dejo `POST /api/public/hiring/applications` y `submitPublicHiringApplication` como write path publico para postulaciones.
- Existen comandos/endpoints internos para crear demanda, crear opening, editar opening y publicar/despublicar.
- El submit E2E fue probado server-side contra `EO-OPN-0009`, creando application `EO-APP-0007` y CV asset asociado.

### Gap

- No existe un unico operador canonico que tome un brief de vacante y haga preview/execute/publish con idempotencia y salida operacional.
- La documentacion ya advierte que no debe haber release por vacante, pero aun falta el mecanismo ergonomico que vuelva esa regla facil de cumplir.
- Nexa/agentes no tienen una primitive clara para publicar una vacante sin conocer detalles de payloads internos.
- El proceso actual puede inducir a soluciones fragiles: payloads manuales, SQL, seed scripts one-off o release acoplado.
- El payload publico aun mezcla campos estructurados reales con strings legacy e inferencias del view-model. En particular, `area`/`department` se infiere por heuristica desde titulo/copy, `skillChips` se deriva desde texto/requisitos y `publicLocationMode` combina modalidad + ubicacion en un string ambiguo.

### Existing structured fields vs missing fields

| Campo de oferta | Soporte actual | Gap | Resolucion esperada |
|---|---|---|---|
| Titulo publico | `publicTitle` / `public_title` | existe | mantener requerido para publicar |
| Resumen/descripcion/requisitos/nice-to-have | `publicSummary`, `publicDescription`, `publicRequirements`, `publicNiceToHave` | existe como texto publico | mantener, pero no usar para derivar datos estructurados |
| Jornada | `publicEmploymentMode` / `public_employment_mode` | existe como string libre | normalizar a enum/label gobernado o validar allowlist |
| Seniority | `publicSeniority` + `seniority` | existe como string libre | normalizar a nivel aprobado y fallback interno |
| Modalidad de trabajo | solo `publicLocationMode` | falta campo unico `workMode` | agregar `publicWorkMode: remote|hybrid|onsite` |
| Region remota | no existe | falta `hiringRegion` | agregar `publicHiringRegion` (`LATAM`, `Global`, `Chile`, etc.) requerido si `workMode=remote` |
| Ubicacion hibrida/presencial | mezclada en `publicLocationMode` | falta ciudad/pais/oficina | agregar `publicCity`, `publicCountry` y/o `publicOfficeLocation`, requerido si `workMode=hybrid|onsite` |
| Area/departamento publico | no existe; Careers lo infiere en `src/lib/hiring/public-careers/view-model.ts` | falta source of truth | agregar `publicArea` o `publicDepartment` con catalogo/allowlist inicial |
| Skills/competencias publicas | `requestedSkills` existe en `talent_demand`; Careers deriva chips desde textos | falta proyeccion publica allowlist | agregar `publicSkillTags`/`publicCompetencyTags` para chips y evaluacion |
| Proceso publico | `publicProcessNotes` existe | riesgo de filtrar notas internas como assessment template | mantener solo para copy publico; assessment template debe ser campo interno separado si aplica |
| URL apply | `applyUrl` existe | existe | mantener derivada/canonica |
| Assessment template | no existe como campo interno estructurado del opening | hoy puede colarse en `publicProcessNotes` | agregar solo si el plan lo requiere como campo interno no publicable |

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-standard`
- Impacto principal: `migration`
- Source of truth afectado: `greenhouse_hiring.talent_demand`, `greenhouse_hiring.hiring_opening`, proyeccion publica allowlist, outbox/audit existentes del dominio Hiring.
- Consumidores afectados: `talent operator CLI`, `Nexa governed action`, `Hiring Desk Publication Desk`, `manual de HR`.
- Runtime target: `local`, `staging`, `production`.

### Contract surface

- Contrato existente a respetar: writers/readers de `src/lib/hiring/**` y endpoints API internos de Hiring.
- Contrato nuevo o modificado: columnas publicas estructuradas del opening + command/orchestrator `publishHiringVacancyFromBrief` o nombre final equivalente, con modo `dryRun | execute | publish`.
- Backward compatibility: `compatible` — no modifica rutas publicas ni submit de postulantes.
- Full API parity: todo consumidor UI, CLI o Nexa debe llamar al command/orchestrator o endpoint gobernado equivalente; no debe escribir tablas ni replicar reglas de negocio.

### Data model and invariants

- Entidades/tablas/views afectadas: `greenhouse_hiring.talent_demand`, `greenhouse_hiring.hiring_opening`, audit/outbox existente. No introducir tablas nuevas salvo que el plan demuestre que el command execution ledger existente no cubre idempotencia.
- Invariantes que no se pueden romper:
  - `dryRun` no escribe estado.
  - `execute` crea o reutiliza draft sin publicar si `publish=false`.
  - `publish` solo publica openings completos y seguros para `/public/careers`.
  - No se publican vacantes sin `publicTitle`, `publicSummary` y descripcion publica revisada.
  - No se publican vacantes sin `publicArea`/`publicDepartment` aprobado.
  - No se publican vacantes con modalidad ambigua o derivada desde copy.
  - No se publican vacantes remotas sin region publica aprobada.
  - No se publican vacantes hibridas/presenciales sin ubicacion real publicable.
  - Los chips/competencias publicas salen de tags estructurados, no de heuristicas del renderer.
  - No se crean duplicados si se repite el mismo `idempotencyKey`, `externalRef` o brief aprobado.
  - El command nunca salta capabilities, tenant boundary ni audit/outbox existentes.
  - CV/applications siguen entrando por `POST /api/public/hiring/applications`; esta task no toca postulaciones.
- Tenant/space boundary: solo operador interno Efeonce/agency autorizado; no cliente self-service.
- Idempotency/concurrency: idempotency key requerida para execute/publish; retry debe devolver el mismo resultado o un canonical duplicate outcome con IDs existentes.
- Audit/outbox/history: usar auditoria/outbox existente de los commands compuestos; si se agrega endpoint, registrar command execution outcome sin PII innecesaria.

### Migration, backfill and rollout

- Migration posture: `additive`. Agregar columnas publicas estructuradas a `greenhouse_hiring.hiring_opening`; mantener `public_location_mode` solo como compatibilidad derivada mientras Careers migra a campos nuevos.
- Default state: command disponible solo a operadores/capabilities; CLI en dry-run por defecto.
- Backfill plan: migrar vacantes publicadas existentes a campos estructurados. Para `EO-OPN-0009`: `publicArea=Marketing`, `publicWorkMode=remote`, `publicHiringRegion=LATAM`, `publicSkillTags` con SEO, vendor management, marketing, liderazgo operativo.
- Rollback path: revertir PR o deshabilitar endpoint/CLI nuevo; openings creados por smoke se pueden despublicar con `DELETE /api/hiring/openings/[id]/publish`.
- External coordination: ninguna para implementar; para smoke productivo usar vacante de prueba o aprobacion explicita del operador.

### Security and access

- Auth/access gate: capability interna de Hiring existente o nueva minima si el plan demuestra que falta granularidad (`hiring.opening.publish` o equivalente).
- Sensitive data posture: no PII de candidatos; el brief de vacante puede contener informacion operacional no publica y debe redactarse en logs.
- Error contract: errores canonicos sin raw SQL ni stack: `hiring_vacancy_publication_invalid_input`, `hiring_vacancy_publication_duplicate`, `hiring_vacancy_publication_publish_guard`, `hiring_vacancy_publication_forbidden`, `hiring_vacancy_publication_unavailable`.
- Abuse/rate-limit posture: endpoint interno autenticado; CLI local no debe aceptar dominios/remotes arbitrarios sin entorno configurado.

### Runtime evidence

- Local checks: tests unitarios/integracion del command con dry-run, execute idempotente y publish guard.
- DB/runtime checks: smoke contra staging o entorno local con Cloud SQL autorizado, verificando opening draft/publicado y URL publica.
- Integration checks: tras publish, `GET /api/public/hiring/openings` o pagina `/public/careers/[openingPublicId]` debe reflejar la vacante.
- Reliability signals/logs: si no hay signal existente, documentar candidato `hiring.opening.publication_operator_failed` sin bloquear esta task.
- Production verification sequence: ver seccion especifica; production publish real requiere aprobacion del operador.

### Acceptance criteria additions

- [ ] Source of truth, contract surface and consumers are named with real paths or objects.
- [ ] Data invariants, tenant/access boundary and idempotency/concurrency posture are explicit.
- [ ] Migration/backfill/rollback posture is explicit and proportional to risk.
- [ ] Runtime or DB evidence is listed for any change beyond docs/tooling.
- [ ] Sensitive domains have canonical errors, audit/signal posture and no raw data leaks.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

## Discovery 2026-07-09

- Hook Codex ejecutado: `pnpm codex:task-hook TASK-1371 --develop`.
- Goal confirmado por operador: ejecutar en el checkout actual, mantenerse en `develop`, sin subagentes ni worktree, sin publish real ni release sin confirmacion explicita.
- Reuso validado: `createTalentDemand`, `createHiringOpening`, `updateHiringOpening` y `publishOpening` son el sustrato correcto; el operador nuevo no escribe tablas de negocio directo.
- Idempotencia/audit: se reutiliza el ledger canonico de API Platform (`executeApiPlatformCommand`), sin store propio paralelo.
- Gap runtime confirmado: `hiring_opening` necesitaba campos publicos estructurados; `publicLocationMode` queda legacy/transicional.
- Alcance de compensacion: se agrega `publicCompensationBand` opcional y warning operativo; no queda como publish guard obligatorio hasta governance posterior.

## Implementation Plan 2026-07-09

1. Agregar migracion aditiva con campos publicos estructurados y backfill de `EO-OPN-0009`.
2. Extender tipos/store/readers/public payload y publish guards para que Careers use source of truth estructurado antes que inferencia.
3. Implementar `publishHiringVacancyFromBrief` con `dryRun|execute|publish`, idempotencia canonica, warnings, timings y salida estable.
4. Exponer wrappers programaticos: endpoint interno y CLI `pnpm hiring:publish-vacancy`.
5. Actualizar manuales, documentacion HR, arquitectura Hiring/ATS, epic y skill de talento.
6. Cerrar como `code complete, rollout pendiente` si Cloud SQL/migracion/smoke real no quedan aplicados en esta sesion.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     "Que construyo exactamente, slice por slice?"
     El agente solo lee esta zona DESPUES de que el plan este
     aprobado. Ejecuta un slice, verifica, commitea, y avanza.
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 0 — Structured publication fields

- Agregar migracion aditiva para campos publicos estructurados del opening:
  - `public_work_mode` con enum/check `remote | hybrid | onsite`.
  - `public_hiring_region` para remoto (`LATAM`, `Global`, `Chile`, etc.).
  - `public_city`, `public_country` y/o `public_office_location` para hibrido/presencial.
  - `public_area` o `public_department` con allowlist inicial.
  - `public_skill_tags` y/o `public_competency_tags` para chips/evaluacion publica.
- Actualizar `src/types/hiring.ts`, `src/lib/hiring/store.ts`, `src/lib/hiring/publication.ts` y `PublicOpeningPayload`.
- Mantener `publicLocationMode` como campo legacy derivado durante transicion; ningun operador/agente debe escribirlo a mano.
- Actualizar publish guard para bloquear openings sin campos publicos estructurados minimos.
- Backfill de vacantes existentes usando valores aprobados, no heuristicas del renderer.

### Slice 1 — Operator contract and validation

- Definir tipos/input schema para `HiringVacancyBrief` con campos publicos e internos: titulo, area, seniority, modalidad, ubicacion, resumen, descripcion, responsabilidades, requisitos, nice-to-have, skills, liderazgo/vendor management/SEO/marketing, owner, origin, publish intent e idempotency key.
- Implementar validacion server-side reusable sin depender de JSX ni del form publico.
- Modelar area, ubicacion, modalidad, jornada, seniority y competencias como campos estructurados, no como copy libre: `publicArea`, `workMode`, `hiringRegion`, `officeLocation`/`cityCountry`, `employmentMode`, `seniority`, `skillTags`/`competencyTags` segun aplique.
- Implementar `dryRun` que normaliza el brief, deriva payloads de demand/opening y devuelve warnings/preview sin escribir.
- Asegurar que los textos publicos pasen por sanitizacion y allowlist de campos publicables.

### Slice 2 — Command orchestration

- Implementar el command/orchestrator que compone `createTalentDemand`, `createHiringOpening`, `updateHiringOpening` si aplica y `publishOpening`.
- Hacer el flujo idempotente por `idempotencyKey`/`externalRef`/fingerprint definido, evitando duplicados en retries.
- Garantizar que publish se ejecute solo despues de crear/verificar opening completo y elegible.
- Devolver salida canonica: `demandId`, `demandPublicId`, `openingId`, `openingPublicId`, `status`, `detailUrl`, `applyUrl`, `warnings`, `timings`.

### Slice 3 — Programmatic surfaces

- Crear una CLI/script gobernado, por ejemplo `pnpm hiring:publish-vacancy --file <brief.json> --dry-run`, con `--execute` y `--publish` explicitos.
- Si corresponde al plan, exponer endpoint interno API-parity para agentes/Nexa, usando auth/capability y sin aceptar secretos desde el cliente.
- Documentar payload ejemplo para la vacante Account Manager y para futuras vacantes.
- Asegurar que la superficie programatica reutiliza el mismo command, no una implementacion paralela.

### Slice 4 — Evidence, docs and operating loop

- Probar local/staging con dry-run y execute/publish controlado.
- Verificar URL publica y, si el smoke publica, despublicar/limpiar o dejar publicado solo con aprobacion.
- Actualizar manual, documentacion HR, skill de talento y handoff con el nuevo proceso.
- Registrar tiempos de ejecucion del smoke si se hace un paso a production o staging gobernado.

## Out of Scope

- Construir la UI de Publication Desk; esa pertenece a `TASK-355`.
- Cambiar el diseno de `/public/careers` o el apply form de `TASK-354`.
- Cambiar `POST /api/public/hiring/applications` o el pipeline de CV/postulantes.
- Crear assessment, interview pipeline, candidate scoring o document capture amplio.
- Reemplazar Greenhouse Growth Forms ni modificar Turnstile.
- Hacer releases por cada nueva vacante.
- Usar SQL/manual seed como camino operativo final.

## Detailed Spec

### Input shape

El plan puede ajustar nombres, pero el contrato debe cubrir al menos:

- `idempotencyKey`
- `mode`: `dryRun | execute | publish`
- `requestedRole`
- `publicTitle`
- `publicSummary`
- `publicDescription`
- `responsibilities[]`
- `requirements[]`
- `niceToHave[]`
- `skills[]` / `competencyTags[]`
- `department` o `area` como campo estructurado publicable, no inferido desde copy
- `workMode`: `remote | hybrid | onsite`
- `hiringRegion`: `LATAM | Global | Chile | [region aprobada]` (obligatorio para `remote`)
- `officeLocation` o `cityCountry`: ciudad/pais/oficina real (obligatorio para `hybrid` y `onsite`)
- `seniority`
- `employmentType`
- `engagementType`
- `fulfillmentMode`
- `demandOrigin`
- `ownerRef`
- `openingVisibility`
- `seoKeywords[]` o tags publicables cuando aplique
- `sourceReference` para ligar la vacante a un brief/chat/doc sin guardar contenido sensible innecesario

### Output shape

La salida debe ser estable y apta para agentes:

```ts
type HiringVacancyPublicationResult = {
  outcome: 'validated' | 'created' | 'published' | 'duplicate' | 'reused_draft'
  mode: 'dryRun' | 'execute' | 'publish'
  demandId?: string
  demandPublicId?: string
  openingId?: string
  openingPublicId?: string
  status?: string
  detailUrl?: string
  applyUrl?: string
  warnings: string[]
  timings: Array<{ step: string; durationMs: number }>
}
```

### Operational behavior

- `dryRun` debe ser el default de CLI/API para evitar publishes accidentales.
- `execute` crea draft reutilizable y devuelve instrucciones de siguiente paso.
- `publish` crea/reusa draft y publica en el mismo command solo si se cumplen guards.
- El command debe poder operar con un subject interno construido por el entorno autorizado, nunca con role spoofing desde payload.
- Los errores deben ser machine-readable y mapeables a copy humano en UI/Nexa.
- El command debe rechazar modalidades ambiguas (`remote/hybrid`, `segun acuerdo`, `flexible` sin definicion) en `execute`/`publish`. `dryRun` puede devolver warning y payload normalizado, pero no debe publicar sin elegir una modalidad unica.
- El command debe rechazar area/departamento ausente o fuera de allowlist en `execute`/`publish`; `dryRun` puede sugerir area por heuristica, pero no puede publicarla sin seleccion estructurada.
- El command debe derivar el payload legacy `publicLocationMode` solo desde campos estructurados. El agente/CLI no escribe ese string manualmente; el renderer publico solo consume el resultado.
- El command debe derivar chips publicos desde `skillTags`/`competencyTags`, no desde frases sueltas de requisitos.
- Para remoto, el renderer debe mostrar `Ubicacion = hiringRegion` y `Modalidad = Remoto`. Para hibrido/presencial, debe mostrar `Ubicacion = officeLocation/cityCountry` y `Modalidad = Hibrido/Presencial`.

### API parity decision

La solucion aceptable tiene una primitive server-side unica. La CLI, endpoint interno o Nexa action son wrappers del mismo command. Si el executor descubre que las APIs existentes ya bastan pero falta ergonomia, igual debe crear el wrapper operativo; documentar "usa tres endpoints manualmente" no cierra esta task.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 0 (structured fields migration) MUST ship before opening publication operator publishes real vacancies.
- Slice 1 (contract/dry-run) MUST ship before Slice 2.
- Slice 2 (command orchestration) MUST ship before Slice 3 surfaces.
- Slice 3 (CLI/API wrapper) MUST reuse Slice 2 and cannot duplicate writes.
- Slice 4 (docs/smoke) closes only after at least one dry-run and one non-production execute/publish path are verified, or after documenting why runtime smoke is blocked.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Vacante duplicada por retry o agente impaciente | Hiring | medium | idempotency key + lookup by source/fingerprint before create | duplicate outcome, audit entries |
| Publicacion incompleta o con copy no revisado | Public careers | medium | publish guards + dry-run preview + required public fields | `hiring_vacancy_publication_publish_guard` |
| UI publica muestra area/modalidad inferida incorrecta | Careers | medium | structured public fields + renderer consumes allowlist payload | mismatch in Careers view model tests |
| Endpoint interno expone write path sin capability suficiente | Identity/API | low | `can()`/capability gate, no subject spoofing | forbidden canonical error |
| CLI diverge de API/runtime | Ops | medium | CLI imports command server-side or calls canonical endpoint only | test comparing dry-run payload |
| Smoke deja vacante test visible | Public careers | low | use staging or unpublish cleanup in verification | public listing check |

### Feature flags / cutover

- Sin flag obligatorio si solo se agrega command interno + CLI dry-run default + capability gate.
- Si se expone endpoint nuevo en production, evaluar flag `HIRING_VACANCY_PUBLICATION_OPERATOR_ENABLED` default `false` en production hasta smoke verde.
- Revert: apagar flag si existe o revertir PR; los openings ya publicados se pueden despublicar con endpoint existente.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 0 | Revertir migracion aditiva antes de usar campos en publish o mantener columnas sin consumo | <20 min | si |
| Slice 1 | Revertir tipos/validacion/dry-run; no toca estado | <10 min | si |
| Slice 2 | Revertir command; despublicar openings de prueba si los hubo | <20 min | si |
| Slice 3 | Remover package script/endpoint o apagar flag/capability | <15 min | si |
| Slice 4 | Revertir docs si contenian instrucciones erroneas; corregir handoff | <10 min | si |

### Production verification sequence

1. Ejecutar tests locales del command y CLI.
2. Ejecutar `dryRun` con fixture Account Manager.
3. Ejecutar `execute` en staging o entorno seguro y verificar draft.
4. Ejecutar `publish` en staging o con vacante test aprobada.
5. Verificar `/public/careers/[openingPublicId]` y `applyUrl`.
6. Despublicar la vacante test salvo aprobacion explicita para mantenerla visible.
7. Si se habilita en production, registrar release ID, agente, fecha y duracion total del proceso operativo.

### Out-of-band coordination required

- Aprobacion del operador antes de publicar una vacante real en production.
- Si la vacante real sale live, confirmar copy final, owner de talento y si debe quedar visible en `/public/careers`.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [x] Existe un command/orchestrator server-side unico para publicar vacantes desde brief, con `dryRun`, `execute` y `publish`.
- [x] El flujo compone writers/readers de Hiring existentes y no escribe tablas directas desde CLI.
- [x] La idempotencia evita duplicados en retry y devuelve IDs existentes cuando corresponde.
- [x] `publicArea`/`publicDepartment`, `workMode`, `hiringRegion`, `officeLocation/cityCountry`, `employmentMode`, `seniority` y `skillTags`/`competencyTags` nacen como campos estructurados del command/API; no se escriben a mano como copy libre ni se infieren en el renderer.
- [x] `publish` bloquea cargos hibridos/presenciales sin ubicacion real y cargos remotos sin region aprobada (`LATAM`, `Global`, `Chile`, etc.).
- [x] `publish` bloquea cargos sin area/departamento publico aprobado.
- [x] La salida incluye IDs, public IDs, status, URLs, warnings y timings por paso.
- [x] La CLI o endpoint programatico permite a un agente publicar una vacante sin release, SQL ni UI manual.
- [x] El camino queda documentado en manual HR, documentacion Careers y skill de talento.
- [x] Hay evidencia de dry-run y execute/publish controlado; si production queda fuera, se declara explicitamente. `dryRun` local verde; smoke `publish` runtime verde reutilizando `EO-OPN-0009` por `publication_source_ref` sin crear demanda/opening nuevos.

## Verification

- `pnpm task:lint --task TASK-1371`
- `pnpm ops:lint --changed`
- `pnpm lint`
- `pnpm tsc --noEmit`
- Tests focales de `src/lib/hiring/**` para dry-run, idempotencia, publish guard y canonical errors.
- Smoke CLI/API con fixture de vacante Account Manager.
- Verificacion runtime de URL publica cuando se ejecute `publish`.

## Evidence 2026-07-09

- `pnpm test src/lib/hiring/vacancy-publication-operator.test.ts src/lib/hiring/publication.test.ts src/lib/hiring/public-careers/view-model.test.ts` — verde.
- `pnpm test` — verde inicial: 1258 test files passed, 23 skipped; 8868 tests passed, 126 skipped.
- `pnpm test` — verde final tras compatibilidad Careers: 1258 test files passed, 23 skipped; 8870 tests passed, 126 skipped.
- `pnpm exec eslint src/lib/hiring/vacancy-publication-operator.ts src/lib/hiring/vacancy-publication-operator.test.ts src/lib/hiring/publication.ts src/lib/hiring/publication.test.ts src/lib/hiring/public-careers/view-model.ts src/lib/hiring/public-careers/view-model.test.ts src/app/api/hiring/vacancy-publications/route.ts scripts/hiring/publish-vacancy.ts` — verde.
- `pnpm exec eslint src/lib/hiring/public-careers/view-model.ts src/lib/hiring/public-careers/view-model.test.ts` — verde tras fix de modalidad/chips legacy.
- `pnpm exec eslint src/components/greenhouse/careers/CareersHomeClient.tsx src/components/greenhouse/careers/CareersDetailView.tsx src/components/greenhouse/careers/CareersApplyClient.tsx src/lib/hiring/public-careers/view-model.ts src/lib/hiring/public-careers/view-model.test.ts` — verde tras revision UI pre-release.
- `pnpm exec eslint src/lib/copy/dictionaries/es-CL/careers.ts src/lib/copy/dictionaries/en-US/careers.ts src/lib/hiring/public-careers/view-model.test.ts` — verde tras revision UX writing/copy.
- `NODE_OPTIONS=--max-old-space-size=8192 pnpm exec tsc --noEmit --pretty false` — verde.
- `pnpm build` — verde final post-copy; warning no bloqueante existente de Turbopack en `src/lib/roadmap/work-item-index/reader.ts` por patron amplio.
- `pnpm fe:capture task354-careers-runtime-audit --env=local` — verde post-copy: 2 variants, 12 frames, output `.captures/2026-07-09T11-11-01_task354-careers-runtime-audit`.
- Playwright copy probe final — verde: home/detail/apply desktop1440/mobile390 sin overflow, sin copy viejo (`locos`, `Hollywood-level`, `sin friccion`, etc.), con copy nuevo y `growth tasks` preservado como spanglish profesional de marketing.
- Playwright product UI audit local — verde: `.captures/2026-07-09T10-49-careers-product-ui-audit` cubre home/detail/apply/404 en desktop1440, wide2048 y mobile390 (12 combinaciones), con assertions `failed=[]` para HTTP status, overflow, controles nombrados, H1 semantico, split `Ubicacion=LATAM` / `Modalidad=Remoto` y chips canonicos.
- Playwright apply invalid-state probe — verde: `.captures/2026-07-09T-careers-apply-invalid-state`; submit vacio enfoca primer input invalido, muestra resumen/errores, marca requireds y no genera overflow en desktop1440/mobile390.
- `pnpm task:lint --task TASK-1371` — verde: `template=1`, `errors=0`, `warnings=0`.
- `pnpm ops:lint --changed` — verde.
- `pnpm hiring:publish-vacancy --file scripts/hiring/fixtures/account-manager-vacancy-brief.example.json --dry-run` — verde; preview valido con warning `public_compensation_band_not_set`.
- `gtimeout 180s pnpm pg:connect:migrate` — verde: aplico `20260709182000000_task-1371-hiring-opening-public-structured-fields` y `20260709183000000_task-1371-account-manager-legacy-location-backfill`.
- `gtimeout 90s pnpm pg:connect:status` — verde: `No migrations to run!`.
- `pnpm hiring:publish-vacancy --file scripts/hiring/fixtures/account-manager-vacancy-brief.example.json --publish` con Cloud SQL Proxy — smoke runtime verde: `outcome=duplicate`, `openingPublicId=EO-OPN-0009`, `status=published`, pasos `lookup_existing_opening`, `update_public_opening_projection`, `publish_opening`; no creo demanda/opening nuevos.
- Query DB post-smoke — verde: `EO-OPN-0009` quedo `publication_status=published`, `visibility=public_listed`, `public_area=Marketing`, `public_work_mode=remote`, `public_hiring_region=LATAM`, `public_location_mode=LATAM`, `publication_source_ref=job-brief-account-manager-marketing-20260709`.
- `curl -I https://greenhouse.efeoncepro.com/public/careers/EO-OPN-0009` — verde: `HTTP/2 200`.

## Compatibility Ledger 2026-07-09 — Careers view-model symptoms

Contexto observado en runtime/screenshot durante la ejecucion: la vacante Account Manager mostraba `Ubicacion=LATAM` y `Modalidad=LATAM`, y las competencias clave salian como fragments de prosa (`Experiencia operando...`, `Nociones practicas...`, `Capacidad de ordenar...`) cuando faltaban tags estructurados o el bundle live aun usaba fallback legacy.

Resolucion aplicada:

- Source of truth canonica:
  - modalidad publica vive en `public_work_mode` (`remote|hybrid|onsite`);
  - ubicacion remota vive en `public_hiring_region` (`LATAM`, `Global`, etc.);
  - ubicacion hibrida/presencial vive en `public_city`/`public_country`/`public_office_location`;
  - chips publicos viven en `public_skill_tags`.
- `public_location_mode` queda solo como compatibilidad legacy. Para remoto puede contener `LATAM` como region/ubicacion, pero nunca debe interpretarse como modalidad canonica ni editarse a mano para "arreglar" la UI.
- `src/lib/hiring/public-careers/view-model.ts` ahora degrada defensivamente un `public_location_mode` legacy tipo `LATAM`, `Global`, `Chile`, etc. a `Modalidad=Remoto` si `public_work_mode` viene ausente, preservando `Ubicacion=LATAM`.
- El mismo view-model prioriza `skillTags` estructurados. Si debe caer a fallback legacy, canonicaliza por reglas cortas (`Account management`, `SEO`, `Liderazgo operativo`, `Growth`, etc.) y evita convertir frases de requisitos en chips visibles.
- Regresiones agregadas en `src/lib/hiring/public-careers/view-model.test.ts`:
  - no renderizar una region remota legacy como modalidad;
  - mantener chips Account Manager canonicos sin fragments de prosa.

Lo que NO debe hacer el siguiente agente:

- No corregir `Modalidad=LATAM` cambiando copy JSX/CSS o reemplazando `public_location_mode` por `Remoto`; eso mezcla ubicacion y modalidad otra vez.
- No volver a inferir `Área` o competencias desde copy como solucion final. Es fallback temporal para legacy; la solucion canonica es publicar/republicar con `public_area` y `public_skill_tags`.
- No cerrar `TASK-1371` como complete si falta push/release/smoke productivo del bundle que contiene estos cambios. Estado correcto: `in-progress`, code complete local, rollout pendiente.

Commits locales relevantes en `develop`:

- `ff6bd4b0f` — operador TASK-1371, campos estructurados y docs iniciales.
- `c048d71e5` — marker `-- Up Migration` faltante en migracion forward-fix.
- `a78a41861` — endurecimiento de migraciones, smoke runtime y cierre local.
- `971494c27` — compatibilidad Careers: modalidad legacy `LATAM` -> `Remoto` y chips canonicos.

Diagnostico live posterior:

- Produccion `https://greenhouse.efeoncepro.com/public/careers/EO-OPN-0009` seguia mostrando el bug con Sentry release `915be02a86abfd49c71365af8a647f9fdfa35207`.
- Ese release no selecciona `public_work_mode`, `public_hiring_region` ni `public_skill_tags` en `src/lib/hiring/publication.ts`; su `PublicOpeningPayload` solo incluye `locationMode`.
- Con ese bundle viejo no existe mitigacion de datos que muestre simultaneamente `Ubicacion=LATAM` y `Modalidad=Remoto`, porque ambos labels derivan del mismo `public_location_mode`.
- Estado operativo correcto: corregido en codigo local, **bug todavia presente en produccion hasta release/hotfix de codigo**.

## UI Pre-release Review 2026-07-09

Revision solicitada antes de agrupar release: revisar meticulosamente la UI publica Careers para detectar ajustes adicionales que convenga llevar en el mismo paquete.

Hallazgos:

- **Bloqueante visual descartado:** el circulo negro con `N` visto en capturas locales es `nextjs-portal` (Next.js dev tools indicator), no `NexaFloatingButton`, no DOM de producto y no aparecera en production build. No perseguirlo como fuga de Nexa en `/public/careers`.
- **Ajuste aplicado:** `CareersHomeClient` ahora inserta un espacio semantico entre `copy.hero.titleAccent` y `copy.hero.titleRest`. Visualmente sigue renderizando en dos lineas, pero el `h1.textContent` pasa de `Crececon Efeonce` a `Crece con Efeonce` para accesibilidad/SEO.
- **Detalle Account Manager:** local con bundle actual muestra chips hero `LATAM`, `Remoto`, `L2`; resumen lateral `Ubicacion=LATAM`, `Modalidad=Remoto`; competencias clave `Marketing`, `SEO`, `Vendor management`, `Liderazgo operativo`.
- **Apply:** form desktop/mobile mantiene labels, iconos, CV uploader, consentimiento, Turnstile local fallback y estado invalido sin overflow. Los `input` nativos de file/checkbox son 1px por accesibilidad/control custom; no son targets visuales pequenos.
- **Home/listing/marquee:** sin overflow de pagina en 1440/2048/390; H1 corregido; listing muestra tags canonicos; el marquee conserva segmentos duplicados sin hueco de pagina.
- **404 Careers:** estado no encontrado renderiza card/CTA/footer sin solapes en desktop/mobile.
- **UX writing / brand voice:** se reviso `src/lib/copy/dictionaries/*/careers.ts` con las skills `greenhouse-ux-content-accessibility`, `copywriting` y `efeonce-agency`. Se refino employer brand, CTAs, proceso, empty/error/success y helper de CV para sonar mas Efeonce y menos generico/excluyente. Se retiraron expresiones publicamente riesgosas (`locos`, `Hollywood-level`) y se mantuvo el criterio de spanglish profesional para marketing: terminos como `growth`, `performance`, `vendor management`, `brief` o `paid media` son validos si describen el trabajo real; no traducirlos por purismo.

Evidencia durable:

- GVC final post-copy: `.captures/2026-07-09T11-11-01_task354-careers-runtime-audit`.
- Playwright audit: `.captures/2026-07-09T10-49-careers-product-ui-audit/audit.json` (`failed=[]`).
- Invalid submit screenshots: `.captures/2026-07-09T-careers-apply-invalid-state`.

## Closure State 2026-07-09

- Estado: `in-progress`, con implementacion, migraciones y smoke runtime local/Cloud SQL verificados.
- Motivo de no cierre: por instruccion operativa, no mover a `complete/` en este corte; queda lista para revision/commit/release posterior.
- Nota `publicLocationMode`: para remoto se setea intencionalmente a `LATAM` como fallback legacy de ubicacion. La modalidad canonica ya no vive ahi: vive en `public_work_mode='remote'`.
- Rollout pendiente: `develop` contiene los commits locales y estaba ahead de `origin/develop`; produccion seguira mostrando el bundle anterior hasta push/release gobernado. Si se pide release, usar `greenhouse-production-release` y medir tiempo agente end-to-end.

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `docs/tasks/TASK_ID_REGISTRY.md` quedo sincronizado si cambia lifecycle o path
- [x] `Handoff.md` quedo actualizado con evidencia, tiempos y cualquier bloqueo
- [x] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [x] `project_context.md` quedo actualizado si cambia el proceso operativo de talento
- [x] la skill de talento quedo actualizada con el nuevo comando/proceso
- [x] se ejecuto chequeo de impacto cruzado sobre `TASK-354`, `TASK-355` y manuales HR

## Follow-ups

- `TASK-355` puede consumir este operador desde Publication Desk.
- Crear Nexa action/tooling especifico solo si no queda cubierto por el endpoint/CLI de esta task.
- Crear biblioteca de plantillas de vacantes si se repiten briefs por rol.

## Open Questions

- **[RESUELTA 2026-07-09]** Nombre final y ubicacion: `publishHiringVacancyFromBrief` vive en `src/lib/hiring/vacancy-publication-operator.ts`.
- **[RESUELTA 2026-07-09]** Endpoint interno: se agrego `POST /api/hiring/vacancy-publications` y reusa el mismo command que el CLI.
- **[RESUELTA 2026-07-08]** Idempotencia: **reusar el command execution ledger canónico `src/lib/api-platform/core/idempotency.ts` + `core/commands.ts`** (existe). No rodar idempotencia propia en el store salvo brecha concreta demostrada en Discovery.
- **[RESUELTA 2026-07-09 como V1 opcional]** Compensación/salario: el operador expone `publicCompensationBand` como campo estructurado opcional y warning `public_compensation_band_not_set`; no es publish guard hasta que finance/payroll/legal definan governance de bandas aprobadas.
