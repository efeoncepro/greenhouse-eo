# TASK-1604 — Critical Role Scorecards and Assessment Template Pack

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
- Backend impact: `migration|seed`
- Epic: `EPIC-038`
- Status real: `Slice SEO/Arte aplicado: instrumentos versionados, seis competencias activas y nueve preguntas SEO en sme_review. Las dos vacantes reales fueron publicadas por un acto operativo separado el 2026-09-09 y hoy están active/public_listed; siguen sin policy ni assessments. Activación SME, template runtime SEO y binding del scorecard de Arte permanecen pendientes.`
- Rank: `EPIC-038-phase-1`
- Domain: `hiring|hr|content|agency`
- Blocked by: `none`
- Branch: `task/TASK-1604-role-scorecard-assessment-template-pack`
- GitHub Issue: `none`

## Summary

Materializa scorecards y assessment templates reutilizables para roles críticos, comenzando por SEO Specialist
Senior y Director(a) de Arte Senior sin crear un banco paralelo.

## Why This Task Exists

El motor de assessment existe, pero los estándares por rol, work samples, software/hard skills, interview guide y criterios de calidad no están gobernados como paquete operativo uniforme.

## Goal

- Publicar templates versionados y preguntas con gate SME.
- Cubrir work sample, entrevista estructurada, portfolio/software evidence y límites de nivel.
- Conectar cada template al quality gate del opening.

## Architecture Alignment

- `docs/architecture/GREENHOUSE_HIRING_ATS_ARCHITECTURE_V1.md`
- `.codex/skills/greenhouse-talent-people-operator/references/assessment-interviewing.md`
- `docs/documentation/hr/assessment-question-authoring-guide.md`
- `TASK-1603`

## Dependencies & Impact

### Depends on

- Para el slice autorizado de autoría y drafts: assessment engine `TASK-1360..1363` y el operador canónico de
  openings de `TASK-1719`.
- La activación de preguntas, el claim de pack aprobado, el quality gate obligatorio y cualquier asignación
  automática siguen dependiendo de `TASK-1602` y `TASK-1603`.

### Blocks / Impacts

- Critical-role onboarding y validity loop.

### Files owned

- `migrations/**`
- `scripts/hiring/**`
- `docs/documentation/hr/**`

## Current Repo State

### Already exists

- Assessment engine, competencies, question bank, template versioning y Content Creator v2 runtime.

### Gap

- Falta un pack formal por rol con coverage matrix, interview scorecard, evidence policy y aprobación SME trazable.

### Baseline verified 2026-08-15

- El motor, templates/versionado, competencias y Content Creator v2 son reutilizables; no prueban que exista un
  pack de roles críticos aprobado bajo la policy de claims de `TASK-1602`.
- Ningún seed, coverage matrix ni gate SME de esta task fue aplicado. El pack debe esperar la policy de claims y
  consumir el binding de opening que `TASK-1719` implementará para `TASK-1603`.

## Modular Placement Contract

- Topology impact: `domain-package`
- Current home: `greenhouse_hiring` y documentación HR
- Future candidate home: `domain-package`
- Boundary: templates/questions/scorecards canónicos consumidos por Hiring y review
- Server/browser split: sensitive answer keys/rúbricas sólo server-side; candidato recibe allowlist
- Build impact: `none`
- Extraction blocker: template versioning y foreign keys a applications históricas

## Backend/Data Contract

- Backend rigor: `backend-standard`
- Impacto principal: `migration|seed`
- Source of truth afectado: hiring competency/question/template
- Consumidores afectados: assessment taking/review, Hiring Desk, Nexa
- Runtime target: local, staging y production por migración gobernada
- Invariantes: template usado es inmutable; preguntas `draft → sme_review → active`; score advisory
- Migration posture: additive seed con rollback sólo antes de uso; después retire/versione, nunca borre
- Audit: SME status transitions y template creation events
- Access: capabilities internas; no candidate answer key

## Scope

### Slice 1 — Scorecard matrix

- Definir competencias, niveles, pesos, evidencia, preguntas, entrevista y software/hard skills por rol.

### Slice 2 — Seed and SME activation

- Crear/activar templates y questions; documentar cómo asignar y puntuar.

## Out of Scope

- Nuevas UI de authoring y AI scoring autónomo.

## Acceptance Criteria

- [ ] Account Manager y Content Creator tienen template aprobado y coverage matrix.
- [ ] Cada pregunta tiene rubric observable y revisión SME.
- [ ] Se prueba candidate projection sin answer key/rubric.
- [ ] Manual de asignación y entrevista queda actualizado.

## Delta 2026-09-09 — SEO Specialist Senior y Director(a) de Arte Senior

El operador aprobó ejecutar un slice acotado de esta task para dos vacantes reales. Este delta levantó el
bloqueo para autoría, migración/seed aditivo, templates, preguntas hasta `sme_review` y creación inicial de
openings privados. La publicación posterior fue un acto operativo separado: no declara el pack aprobado ni
adelanta la policy de claims de `TASK-1602` o el quality gate de `TASK-1603`.

### Configuración de las vacantes

- `SEO Specialist Senior`: área pública `Growth`, jornada completa, remoto, trabajo alineado a
  `America/Santiago`, español, reporte directo al `Managing Director`.
- `Director(a) de Arte Senior`: área pública `Creative`, jornada completa, remoto, trabajo alineado a
  `America/Santiago`, español, reporte directo a `Creative Operations Lead`.
- Una posición por rol, demanda `on_going`, contratación `internal_hire`, origen `manual_internal`, prioridad
  alta y procedencia `real`.
- Países elegibles: `AR BO BR CL CO CR DO EC SV GT HN MX NI PA PY PE UY VE US ES`.
- Sin banda salarial pública por decisión explícita del operador. El contrato y beneficios se resuelven según
  el país elegible mediante las fuentes centrales; no se inventan condiciones por rol.

### Instrumentos

- SEO usa `candidate_test` y entrevista estructurada. Competencias nuevas:
  `seo_technical_strategy`, `search_content_aeo`, `search_measurement`; reutiliza `research_synthesis`,
  `communication` y `ownership`. Pesos: `30/20/20/10/10/10`.
- Dirección de Arte usa revisión de portfolio y caso guiado mediante `interviewer_scorecard`, no un examen
  textual como proxy de oficio. Competencias nuevas: `art_direction`, `visual_systems`,
  `creative_production`; reutiliza `leadership`, `communication` y `ownership`. Pesos:
  `25/25/20/10/10/10`.
- Escala conductual común de cinco niveles con anclas observables `1`, `3` y `5`; la decisión final es humana.
  No hay auto-rechazo, auto-contratación ni inferencias protegidas.
- La prueba SEO usa un caso ficticio B2B, permite herramientas y AI con disclosure, y obliga a defender las
  decisiones en entrevista. La evaluación de Arte usa portfolio propio/anónimo y crítica de un artefacto
  ficticio; no exige trabajo especulativo utilizable por Efeonce o clientes.

### Acceptance criteria del slice autorizado

- [x] Se agregan de forma aditiva las seis competencias nuevas y su readback confirma categoría, descripción
  y niveles previstos sin alterar competencias existentes.
- [x] Las preguntas se crean por el writer canónico, nacen `draft`, transitan sólo a `sme_review` y ninguna
  queda `active` sin aprobación humana SME sobre el contenido individual.
- [x] Los dos instrumentos quedan versionados con pesos que suman `100` y método correcto. El template runtime
  SEO no se materializa hasta tener cobertura `active`; `interviewer_scorecard` no tiene binding a template en
  el runtime actual. Answer keys y rúbricas permanecen fuera de la proyección candidata.
- [x] El instrumento SEO mide diagnóstico, priorización, arquitectura de búsqueda, SEO/AEO aplicado,
  medición, comunicación ejecutiva y ownership en un timebox razonable.
- [x] El instrumento de Dirección de Arte mide concepto, craft, sistemas visuales, producción, feedback,
  liderazgo y criterio de derechos mediante portfolio/caso guiado; no reduce el oficio a preguntas teóricas.
- [x] Los dos briefs pasan `--dry-run` del operador `hiring:publish-vacancy` sin publicar.
- [x] Los dos commands `--execute` crearon o reutilizaron demandas y openings inicialmente `draft`; el readback
  conservó `data_origin=real`, privacidad, owners correctos y contenido público v2 completo. La publicación se
  ejecutó después por el command gobernado y no forma parte del acto de autoría del pack.
- [x] El slice de autoría no habilitó `assessment_policy`, no creó instancias para candidatos, no envió correos
  y no ejecutó `publishOpening`. La publicación posterior tampoco agregó policy ni assessments.
- [x] Quedan documentados los IDs de preguntas, demandas y openings, la ausencia intencional de templates
  runtime/digests y los gates/readbacks ejecutados.

### Evidencia del slice 2026-09-09

- Migración aplicada por `pnpm pg:connect:migrate`:
  `20260909230425070_task-1604-critical-role-competencies`.
- Preguntas SEO en `sme_review` (9):
  `qst-13c5b215-d906-4a31-9224-daa91ea9c5b2`,
  `qst-a5b381ba-a29f-4430-9bf1-f0490f214c8a`,
  `qst-62ae20a9-f841-4b01-a465-1022e1f7ce66`,
  `qst-19db30c8-99c0-4b3e-b0e9-e36d26691527`,
  `qst-f72e3605-1326-463b-8dd4-e01ee9ca38c6`,
  `qst-b3f3f74d-74fb-46ff-abe5-e255d9f3b3f4`,
  `qst-7766a393-4175-4626-a002-35431f1dfc04`,
  `qst-ff526911-30f6-4146-8946-e1aaeddaa21d` y
  `qst-3d56b852-88a9-46d4-83c4-73e818273494`.
- SEO: demanda `EO-TDM-0678` / `tdmn-a75ae48d-a40c-47a7-9f77-c0a56e364ce7`; opening
  `EO-OPN-0674` / `opng-262f0d6d-f139-4355-9017-165cbab54b9c`.
- Dirección de Arte: demanda `EO-TDM-0679` / `tdmn-2e229629-acc7-4444-b6be-9bb7ea1065f0`; opening
  `EO-OPN-0675` / `opng-e679b3d6-1bea-4da0-97ff-ba2976f02c9f`.
- Readback: ambos openings `status=draft`, `publication_status=draft`, `visibility=internal_only`,
  `data_origin=real`, `published_at=null`, `public_compensation_band=null`, contenido v2, 20 países,
  `policy_count=0` y `assessment_count=0`.
- El guard `--materialize-seo-template` rechazó correctamente seis módulos sin coverage `active`. La matriz de
  Arte no se persiste como template porque la instancia `interviewer_scorecard` actual no acepta `template_id`.
- Validación focal: ESLint limpio; `tsc --noEmit` limpio; 20 tests verdes entre invariantes del pack y
  proyección pública anti-leak.
- El CLI canónico `scripts/hiring/publish-vacancy.ts` ahora cierra el pool de Postgres en `finally`; antes de
  esta corrección completaba la escritura pero dejaba el proceso vivo.

### Readback de cierre documental 2026-09-10

- La migración está aplicada y el readback conserva seis competencias `active`, nueve preguntas authored en
  `sme_review`, cero templates del pack y los dos owners activos.
- `EO-OPN-0674` y `EO-OPN-0675` están `status=active`, `publication_status=published`,
  `visibility=public_listed`, `data_origin=real`, contenido v2 y 20 países elegibles. Sus rutas públicas
  responden `200` y muestran el CTA `Postular`.
- Ambas vacantes siguen con `policy_count=0` y `assessment_count=0`. Publicar una vacante no activa el pack ni
  certifica cobertura SME, template runtime, asignación o Quality Gate.
- El guard de materialización cuenta sólo las nueve preguntas exactas de este pack, no preguntas antiguas de la
  misma competencia/nivel. La reutilización de template exige coincidencia exacta de `roleHint`, módulos,
  niveles y pesos; una colisión de nombre distinta o duplicada falla cerrado.

## Rollout Plan & Risk Matrix

Seed → revisión SME → staging → aplicación a un opening piloto → production. Rollback: retirar preguntas/template no usados; templates usados se versionan.

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---:|---|---|
| Assessment demasiado largo | candidate experience | medium | timebox, pilot y completion telemetry | `hiring.assessment_completion_drop` |
| Rubric inconsistente | hiring quality | medium | SME calibration y dual scoring sample | `hiring.assessment_rater_drift` |

## Verification & Definition of Done

- [ ] Coverage, anti-leak, scoring y live smoke verdes.
- [ ] SME owner acepta cada template.
- [ ] Docs/runbook y registry sincronizados.
