# TASK-318 — Client-Safe Verified Talent Profiles

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `complete`
- Priority: `P2`
- Impact: `Alto`
- Effort: `Alto`
- Type: `implementation`
- Status real: `Complete`
- Rank: `TBD`
- Domain: `ui`
- Blocked by: `TASK-285`, `TASK-313`, `TASK-316`
- Branch: `task/TASK-318-client-safe-verified-talent-profiles`
- Legacy ID: `none`
- GitHub Issue: `none`

## Delta 2026-04-11 (TASK-317)

- TASK-317 completada — discovery search/ranking existe en /agency/talent-discovery. Client-safe puede reutilizar el reader con filtro de visibility.

## Delta 2026-04-11 (TASK-316)

- TASK-316 completada — items client_visible solo si verification_status='verified'. Contrato de trust ya implementado.

## Delta 2026-04-11

- TASK-313 completada — ahora existe: campo `visibility` (internal/client_visible) en `member_skills`, reader de perfil profesional en skills y certifications services, `ProfessionalLinksCard` con social links tipados, `AboutMeCard` con headline/bio
- Impacto: la columna `visibility` ya modela la distinción internal vs client_visible; esta task formaliza el reader client-safe y la surface, pero el contrato de datos base ya existe

## Summary

Construir perfiles profesionales cliente-safe donde solo salgan skills, certificaciones y señales aprobadas para consumo externo, incluyendo badge `Verificado por Efeonce`, evidencia seleccionada y narrativa profesional legible. Esta task aterriza la cara visible del talento hacia clientes o stakeholders externos.

## Why This Task Exists

Un sistema enterprise de talento no termina en admin. La diferencia entre un perfil interno y uno cliente-safe es clave:

- no todo dato profesional o personal debe exponerse
- no todo lo autodeclarado puede salir hacia cliente
- el badge `Verificado por Efeonce` tiene más valor cuando opera en un contexto externo controlado

Sin esta task, el sistema se queda en operación interna y no capitaliza la confianza construida.

## Goal

- Definir y mostrar el subconjunto client-safe del perfil profesional
- Hacer visible la verificación de Efeonce de manera sobria y confiable
- Preparar dossiers o perfiles externos reutilizables

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_IDENTITY_ACCESS_V2.md`
- `docs/architecture/GREENHOUSE_UI_PLATFORM_V1.md`
- `docs/architecture/Greenhouse_Nomenclatura_Portal_v3.md`

Reglas obligatorias:

- Cliente solo ve campos explícitamente aprobados para visibilidad externa.
- `Verificado por Efeonce` debe tener respaldo en `TASK-316`.
- No exponer teléfono, dirección u otros datos sensibles por default.
- La iconografía client-facing debe verse sobria y enterprise: estados y señales usan iconos semánticos del sistema; plataformas o emisores muestran logos reales ya disponibles en el repo antes de considerar assets generados.

## Normative Docs

- `docs/tasks/to-do/TASK-313-skills-certifications-profile-crud.md`
- `docs/tasks/to-do/TASK-316-talent-trust-ops-verification-governance.md`
- `docs/tasks/to-do/TASK-285-client-role-differentiation.md`

## Dependencies & Impact

### Depends on

- `TASK-285`
- `TASK-313`
- `TASK-316`
- `src/app/(dashboard)/equipo/page.tsx`
- `src/views/greenhouse/people/**`
- `src/app/(dashboard)/my/profile/page.tsx`

### Blocks / Impacts

- futuras surfaces cliente tipo equipo, dossier, bench o staffing externo
- narrativa comercial del talento verificado

### Files owned

- `src/app/(dashboard)/equipo/page.tsx`
- `src/views/greenhouse/people/**`
- `src/views/greenhouse/[verificar]`
- `src/config/greenhouse-nomenclature.ts`
- `docs/architecture/GREENHOUSE_UI_PLATFORM_V1.md`

## Current Repo State

### Already exists

- existe route `/equipo`
- existen shells de perfil interno y person detail
- existe la noción de role differentiation en backlog cliente

### Gap

- no existe un reader ni una UI de perfil profesional cliente-safe y verificado
- no hay contrato formal de qué campos salen hacia cliente

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Client-safe reader

- Publicar un reader con solo campos aprobados:
  - headline profesional
  - skills verificadas
  - certificaciones vigentes y verificadas
  - links visibles permitidos
  - evidencia o highlights aprobados

### Slice 2 — Client-facing profile surface

- Adaptar una surface real del portal para mostrar perfiles verificados
- Mostrar badge `Verificado por Efeonce`
- El badge debe verse como lockup inline locale-aware (`Verificado por` / `Verified by`) + wordmark SVG de Efeonce para reforzar señal de confianza enterprise sin parecer insignia genérica
- Mantener densidad y claridad tipo dossier profesional, no admin panel disfrazado
- Resolver iconografía con reglas consistentes:
  - skill/certificación/estado -> iconografía semántica del producto
  - LinkedIn/Behance/X/Threads/emisores conocidos -> logo reusable del stack Iconify/BrandLogo

### Slice 3 — Visibility rules

- Formalizar y aplicar qué sale o no sale hacia cliente
- Integrar con role differentiation donde corresponda

## Out of Scope

- revisión/admin queue
- búsqueda interna
- endorsements internos completos

## Detailed Spec

El perfil cliente-safe debe responder, de forma rápida:

- qué sabe hacer la persona
- qué credenciales vigentes y verificadas tiene
- qué evidencia o experiencia relevante puede mostrarse
- por qué la señal de confianza está respaldada por Efeonce

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Existe un reader client-safe separado del perfil interno
- [ ] Solo skills/certificaciones aprobadas y verificadas salen hacia cliente
- [ ] El badge `Verificado por Efeonce` se muestra con copy y jerarquía correctas
- [ ] No se filtran datos sensibles por default
- [ ] La surface client-safe usa iconografía consistente: semántica de producto para estados y logos reales para plataformas/marcas externas

## Verification

- `pnpm lint`
- `pnpm exec tsc --noEmit --incremental false`
- `pnpm build`
- validación manual en la surface cliente afectada

## Closing Protocol

- [ ] Actualizar nomenclatura y documentación de visibilidad

## Follow-ups

- dossier comercial por equipo/bench

## Open Questions

- cuál es la surface cliente primaria: `/equipo` actual u otra vista del bloque Globe
