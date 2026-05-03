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
- Epic: `EPIC-011`
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
- `docs/architecture/GREENHOUSE_PERSON_IDENTITY_CONSUMPTION_V1.md`
- `docs/architecture/GREENHOUSE_IDENTITY_ACCESS_V2.md`
- `docs/architecture/GREENHOUSE_UI_PLATFORM_V1.md`
- `docs/ui/GREENHOUSE_VUEXY_COMPONENT_CATALOG_V1.md`
- `docs/ui/GREENHOUSE_MODERN_UI_UX_BASELINE_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`

Reglas obligatorias:

- la landing pública es un lens del `HiringOpening`, no un módulo paralelo
- no exponer score, owners internos, economics internos, risk ni notas privadas
- el apply flow debe crear o reconciliar `Person`, `CandidateFacet` y `HiringApplication`
- la primera iteración debe ser centralizada y de marca Efeonce, no multi-tenant por cliente
- El endpoint público de apply debe ser deny-by-default: rate limit, validación estricta, consentimiento obligatorio, sanitización, almacenamiento privado y respuesta sin detalles internos.
- Greenhouse ya tiene storage privado GCP para assets (`GREENHOUSE_PRIVATE_ASSETS_BUCKET`, `greenhouse_core.assets`, `/api/assets/private`). Hiring debe reutilizar esa capability y no crear buckets, helpers ni uploaders paralelos.
- No usar uploads públicos directos de CV en V1 salvo que se extienda el asset pipeline existente con contextos Hiring, allowlist de MIME/tamaño, antivirus/scan o quarantine, y URLs no públicas.
- El submit público no crea `member`, `user`, `assignment` ni `placement`.
- El formulario público debe usar `React Hook Form` + schema `zod` compartido entre cliente y API; no duplicar validación a mano.
- El route handler público debe delegar en un service de dominio idempotente; no persistir lógica de reconciliación directamente dentro del handler.

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

- `src/app/[lang]/careers/**` o ruta pública equivalente definida en Discovery
- `src/app/api/public/hiring/**`
- `src/views/greenhouse/careers/**`
- `src/components/greenhouse/careers/**`
- `src/lib/hiring/public-careers/**`
- `src/lib/hiring/public-careers/schema.ts`
- `src/lib/hiring/public-careers/submit-application.ts`
- `src/types/assets.ts` solo si se agregan contextos `hiring_application_draft` / `hiring_application`
- `src/lib/storage/greenhouse-assets.ts` solo para registrar contextos Hiring sobre el bucket privado existente
- `src/app/api/assets/private/route.ts` solo si el upload privado existente necesita aceptar el nuevo contexto Hiring
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
- Construir el form con `React Hook Form` y componentes MUI/Vuexy existentes.
- Definir un schema `zod` compartido para campos, normalización y mensajes de error seguros.
- Permitir links/portfolio y metadata básica de disponibilidad desde V1.
- No habilitar upload directo de CV por defecto; si se habilita, debe usar la capability privada existente (`greenhouse_core.assets` + bucket GCP privado), límites de tamaño/MIME, quarantine/scan o compensating control documentado.
- Reconciliar submit contra `Person`, `CandidateFacet` y `HiringApplication`
- Persistir consentimiento explícito, source attribution `public_careers`, retention policy y versión de copy/legal aceptada.
- Responder al postulante con un mensaje genérico y seguro, sin revelar dedupe, scores, estado interno ni existencia previa de la persona.
- Usar idempotency key o dedupe determinístico por `openingId + normalizedEmail + window` para evitar aplicaciones duplicadas por retry/doble submit.
- Mantener scoring, emails, revisión y handoff fuera del submit síncrono; esos efectos deben salir por eventos/jobs posteriores.

### Slice 3 — Guardrails mínimos

- Agregar consentimiento explícito
- Agregar protección mínima anti-spam/rate limiting según la capacidad real del repo
- Confirmar que los assets subidos por postulantes no queden expuestos públicamente
- Si se aceptan CV/portfolio como archivo, agregar contextos `hiring_application_draft` y `hiring_application` al registry de assets existente, con retention class dedicada o `document_vault` si se justifica.
- Confirmar que `canTenantAccessAsset` o el reader interno equivalente solo permite lectura a usuarios con capability Hiring explícita.
- Sanitizar texto libre y URLs antes de persistir o mostrar internamente.
- Registrar eventos/audit trail mínimos para submit, dedupe y rechazo por abuso sin guardar payload sensible innecesario.
- Usar `captureWithDomain(err, 'hiring')` o patrón equivalente de observabilidad y devolver errores públicos genéricos.

### Slice 3.5 — Public submit API contract

- Endpoint recomendado: `POST /api/public/hiring/applications`.
- El route handler debe:
  - parsear `request.json()` o `multipart/form-data` según el alcance real de assets
  - validar con el schema `zod` compartido
  - aplicar rate limit y anti-abuse antes de persistir
  - llamar `submitPublicHiringApplication()`
  - responder `202` o `201` con payload genérico sin IDs internos sensibles
- El service `submitPublicHiringApplication()` debe ejecutar la transacción de reconciliación y persistencia.
- El service debe ser idempotente y seguro ante retries.

### Slice 4 — Public privacy/read model

- Consumir solo el publication contract allowlist de `TASK-353`.
- Verificar que listing/detail nunca renderizan campos internos de `TalentDemand` ni `HiringOpening`.
- Definir copy pública clara sobre tratamiento de datos, tiempos esperados y contacto.

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
- cómo se almacenará y autorizará el CV/portfolio usando la capability shared de assets ya existente en GCP
- cómo se comparte el schema `zod` entre form, route y tests
- cómo se implementa idempotencia del submit público

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Existe una landing pública de vacantes con listing y detail conectados al publication contract real del opening
- [ ] Existe un apply flow público que crea o reconcilia `Person`, `CandidateFacet` y `HiringApplication`
- [ ] La surface pública no expone metadata interna del ATS y aplica guardrails mínimos de consentimiento/abuso
- [ ] El apply flow no habilita upload público inseguro ni expone storage público de CV/portfolio
- [ ] Cualquier CV/portfolio como archivo reutiliza `GREENHOUSE_PRIVATE_ASSETS_BUCKET` + `greenhouse_core.assets` y no crea storage paralelo
- [ ] El endpoint público aplica rate limiting, validación estricta y respuesta segura sin leaks de dedupe/estado interno
- [ ] El form usa `React Hook Form` + schema `zod` compartido con la API
- [ ] El submit público es idempotente y delega en service de dominio, no en lógica inline del route handler
- [ ] Scoring, emails, revisión y handoff no bloquean el submit público

## Verification

- `pnpm lint`
- `pnpm tsc --noEmit`
- `pnpm test`
- Validación manual del flujo público end-to-end: listing -> detail -> apply
- Test unitario del schema `zod` para inputs válidos, inválidos, URLs sospechosas y consentimiento faltante
- Test unitario del service para idempotencia por retry/doble submit
- Prueba negativa: payload malicioso/spam/rate limit no crea application válida ni filtra errores internos
- Prueba negativa: opening no publicado no aparece en listing/detail público
- Prueba negativa: asset privado de una postulación no se descarga sin sesión/capability interna autorizada

## Closing Protocol

- [ ] Verificar con browser que la landing pública no renderiza fields internos del opening
- [ ] Dejar en `Handoff.md` cualquier decisión sobre captcha/rate limiting o upload público que condicione la siguiente iteración

## Follow-ups

- analytics de conversión de careers
- follow-on de branded pages por practice o cliente si el negocio realmente lo pide

## Resolved Open Questions

- V1 usa links/portfolio como default y no requiere upload directo de CV.
- Upload directo de CV solo se permite si el slice extiende la plataforma privada existente (`GREENHOUSE_PRIVATE_ASSETS_BUCKET`, `greenhouse_core.assets`, `/api/assets/private`) con contextos Hiring, allowlist de MIME/tamaño, quarantine/scan o compensating control explícito, y autorización interna para lectura posterior.
- La landing pública es centralizada Efeonce/Greenhouse. Branding por cliente/practice queda fuera de V1.
- El form V1 usa `React Hook Form` + `zod` compartido. Esto es la opción canónica porque ya existe en dependencias del repo, permite validación cliente/servidor consistente y evita validación duplicada.
- El submit público es idempotente y delega en `src/lib/hiring/public-careers/submit-application.ts`. El route handler solo orquesta validación, anti-abuse, llamada al service y respuesta segura.
