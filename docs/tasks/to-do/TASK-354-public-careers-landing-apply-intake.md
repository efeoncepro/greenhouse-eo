# TASK-354 — Public Careers Landing & Apply Intake

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Alto`
- Type: `implementation`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `agency`
- Blocked by: `TASK-353`
- Branch: `task/TASK-354-public-careers-landing-apply-intake`
- Legacy ID: `follow-on de GREENHOUSE_HIRING_ATS_ARCHITECTURE_V1`
- GitHub Issue: `none`

## Summary

Crear la landing pública de vacantes de Efeonce/Greenhouse con listing, detail y apply flow, conectada al mismo dominio `Hiring / ATS` y sin abrir un pipeline paralelo de candidatos.

## Why This Task Exists

La nueva arquitectura ya exige una entrada pública para candidatos, pero hoy el repo no tiene:

- listado público de openings
- detalle público de vacante
- formulario de postulación
- intake público hacia `Person`, `CandidateFacet` y `HiringApplication`

Sin esta surface, el ATS seguiría siendo solo desk interno y la adquisición de talento continuaría fuera del contrato canónico.

## Goal

- Publicar una landing pública de vacantes con discovery básico
- Permitir postulación pública hacia el pipeline interno
- Respetar privacidad, consentimiento y guardrails mínimos de abuso

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_HIRING_ATS_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_UI_PLATFORM_V1.md`
- `docs/ui/GREENHOUSE_VUEXY_COMPONENT_CATALOG_V1.md`
- `docs/ui/GREENHOUSE_MODERN_UI_UX_BASELINE_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`

Reglas obligatorias:

- la landing pública es un lens del `HiringOpening`, no un módulo paralelo
- no exponer score, owners internos, economics internos, risk ni notas privadas
- el apply flow debe crear o reconciliar `Person`, `CandidateFacet` y `HiringApplication`
- la primera iteración debe ser centralizada y de marca Efeonce, no multi-tenant por cliente

## Normative Docs

- `project_context.md`
- `Handoff.md`
- `docs/research/RESEARCH-003-hiring-desk-reactive-ecosystem.md`
- `docs/architecture/GREENHOUSE_HIRING_ATS_ARCHITECTURE_V1.md`

## Dependencies & Impact

### Depends on

- `TASK-353`
- `src/lib/storage/greenhouse-assets.ts`
- `src/app/api/assets/private/route.ts`
- `src/app`
- `src/views/greenhouse`

### Blocks / Impacts

- visibilidad externa del ATS
- source attribution `public_careers`
- futura analítica de conversión de careers

### Files owned

- `src/app`
- `src/views/greenhouse`
- `src/components/greenhouse`
- `src/lib/storage/greenhouse-assets.ts`
- `docs/architecture/GREENHOUSE_HIRING_ATS_ARCHITECTURE_V1.md`

## Current Repo State

### Already exists

- App Router y foundation UI compartida en `src/app` y `src/components/greenhouse`
- platform shared de assets/attachments:
  - `src/lib/storage/greenhouse-assets.ts`
  - `src/app/api/assets/private/route.ts`
- patrones Vuexy/MUI ya estudiados para listados, tabs, drawers y kanban en `full-version`

### Gap

- no existe ninguna surface pública de careers
- no existe apply flow conectado al dominio `Hiring / ATS`
- no existe source público canónico de postulaciones

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Public vacancies listing and detail

- Materializar listing público de vacantes
- Materializar detail público por opening publicado
- Incluir filtros y discovery básicos según el payload público ya definido en `TASK-353`

### Slice 2 — Public apply flow

- Crear formulario de postulación pública
- Permitir CV/portfolio/links y metadata básica de disponibilidad
- Reconciliar submit contra `Person`, `CandidateFacet` y `HiringApplication`

### Slice 3 — Guardrails mínimos

- Agregar consentimiento explícito
- Agregar protección mínima anti-spam/rate limiting según la capacidad real del repo
- Confirmar que los assets subidos por postulantes no queden expuestos públicamente

## Out of Scope

- desk interno del ATS
- publicación/aprobación interna de openings
- micrositios por tenant o por cliente
- scorecards de evaluación
- email nurturing o marketing automation

## Detailed Spec

La UX pública debe priorizar:

- claridad del opening
- discovery simple
- apply flow corto pero suficiente
- copy humana y sin jerga interna

La task debe verificar explícitamente:

- qué rutas públicas del `App Router` se usarán
- cómo se protegerá el endpoint de apply
- cómo se almacenará y autorizará el CV/portfolio usando la capability shared de assets

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Existe una landing pública de vacantes con listing y detail conectados al publication contract real del opening
- [ ] Existe un apply flow público que crea o reconcilia `Person`, `CandidateFacet` y `HiringApplication`
- [ ] La surface pública no expone metadata interna del ATS y aplica guardrails mínimos de consentimiento/abuso

## Verification

- `pnpm lint`
- `pnpm tsc --noEmit`
- `pnpm test`
- Validación manual del flujo público end-to-end: listing -> detail -> apply

## Closing Protocol

- [ ] Verificar con browser que la landing pública no renderiza fields internos del opening
- [ ] Dejar en `Handoff.md` cualquier decisión sobre captcha/rate limiting o upload público que condicione la siguiente iteración

## Follow-ups

- analytics de conversión de careers
- follow-on de branded pages por practice o cliente si el negocio realmente lo pide

## Open Questions

- si la primera iteración usará upload directo de CV o solo links/portfolio mientras se endurece la capa pública de assets
