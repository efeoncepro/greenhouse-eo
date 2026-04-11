# TASK-313 — Skills y Certificaciones: perfil profesional, verificación Efeonce y CRUD

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Alto`
- Type: `implementation`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `identity`
- Blocked by: `none`
- Branch: `task/TASK-313-skills-certifications-profile-crud`
- Legacy ID: `follow-on de TASK-157`
- GitHub Issue: `none`

## Summary

Extender el perfil del colaborador para que `Mi perfil` y `Admin Center > Usuario` permitan gestionar `Skills y certificaciones` con CRUD completo, links profesionales, contacto y `Sobre mí`. La task agrega verificación visible como `Verificado por Efeonce`, preview embebido de certificados PDF/imagen usando la foundation shared de assets y una política explícita de visibilidad por audiencia.

## Why This Task Exists

`TASK-157` dejó el motor canónico de skills y staffing, pero no la superficie operativa donde una persona o un admin puedan registrar, corregir, verificar y mantener esa información. Hoy el repo tiene piezas parciales (`member_skills`, `linkedinUrl`, `portfolioUrl`, `skills`, `tools`, `notes`, uploader de assets privados, `/my/profile`, `/admin/users/[id]`), pero no existe una experiencia unificada de perfil profesional.

Sin esta task:

- las skills existen como backend de staffing, no como perfil usable
- las certificaciones no tienen agregado propio ni evidencia embebida
- no hay badge de verificación confiable hacia cliente (`Verificado por Efeonce`)
- `Mi perfil` y `Admin > Usuario` quedan desalineados
- datos como LinkedIn, Behance, X/Twitter, Threads, dirección, teléfono y `Sobre mí` siguen fragmentados o invisibles

## Goal

- Habilitar CRUD de `Skills y certificaciones` en `Mi perfil` y en `Admin Center > Usuario`
- Reutilizar la foundation shared de assets privados para subir certificados y mostrarlos embebidos sin descarga forzada
- Formalizar verificación `Verificado por Efeonce` y reglas de visibilidad para datos profesionales, certificaciones y contacto

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_IDENTITY_ACCESS_V2.md`
- `docs/architecture/GREENHOUSE_UI_PLATFORM_V1.md`
- `docs/architecture/Greenhouse_HRIS_Architecture_v1.md`
- `docs/architecture/GREENHOUSE_AGENCY_LAYER_V2.md`

Reglas obligatorias:

- El perfil profesional debe enriquecer la identidad canónica `person/member`; no crear una tabla paralela `user_profile` desconectada del objeto persona.
- `Skills` siguen consumiendo el canon de `TASK-157` (`greenhouse_core.skill_catalog`, `greenhouse_core.member_skills`, `greenhouse_core.service_skill_requirements`); no reintroducir arrays legacy como source of truth de skills verificadas.
- Los certificados deben reutilizar la foundation shared de assets (`/api/assets/private`, `GreenhouseFileUploader`, buckets privados), no abrir una lane nueva de storage o signed URLs ad hoc.
- La etiqueta visible de verificación debe ser `Verificado por Efeonce`; Greenhouse es la plataforma, Efeonce la entidad que valida.
- La visibilidad debe distinguir self/admin/client. Ningún item debe salir como cliente-visible y verificado si no existe aprobación explícita de admin.
- La iconografía debe reutilizar primero el stack real del repo: `tabler-*` para semántica de producto y `BrandLogo`/logos bundleados para marcas externas (`LinkedIn`, `Behance`, `X`, `Threads`, etc.). No introducir un set ilustrado nuevo generado por AI para los iconos core del CRUD.
- El helper AI visual (`generateImage`, `generateAnimation`) queda reservado para ilustraciones, empty states o micro-interacciones puntuales; no para reemplazar la iconografía funcional principal.

## Normative Docs

- `docs/tasks/complete/TASK-157-skills-matrix-staffing.md`
- `docs/tasks/in-progress/TASK-257-mi-perfil-enterprise-redesign.md`
- `docs/tasks/to-do/TASK-027-hris-document-vault.md`

## Dependencies & Impact

### Depends on

- `docs/tasks/complete/TASK-157-skills-matrix-staffing.md`
- `src/lib/agency/skills-staffing.ts`
- `src/app/api/agency/skills/members/[memberId]/route.ts`
- `src/views/greenhouse/my/MyProfileView.tsx`
- `src/views/greenhouse/GreenhouseAdminUserDetail.tsx`
- `src/lib/hr-core/service.ts`
- `src/app/api/hr/core/members/[memberId]/profile/route.ts`
- `src/components/greenhouse/GreenhouseFileUploader.tsx`
- `src/app/api/assets/private/route.ts`
- `src/app/api/assets/private/[assetId]/route.ts`

### Blocks / Impacts

- `/my/profile`
- `/admin/users/[id]`
- futura surfacing client-facing de perfiles o dossiers de talento verificado
- follow-ons de `TASK-157` donde staffing y talento necesiten distinguir skill autodeclarada vs verificada

### Files owned

- `src/views/greenhouse/my/MyProfileView.tsx`
- `src/views/greenhouse/my/my-profile/**`
- `src/views/greenhouse/GreenhouseAdminUserDetail.tsx`
- `src/views/greenhouse/admin/users/**`
- `src/lib/hr-core/service.ts`
- `src/types/hr-core.ts`
- `src/lib/agency/skills-staffing.ts`
- `src/types/agency-skills.ts`
- `src/components/greenhouse/GreenhouseFileUploader.tsx`
- `docs/architecture/GREENHOUSE_UI_PLATFORM_V1.md`
- `docs/architecture/Greenhouse_HRIS_Architecture_v1.md`

## Current Repo State

### Already exists

- `TASK-157` ya dejó el canon de skills y los endpoints member/service:
  - `greenhouse_core.skill_catalog`
  - `greenhouse_core.member_skills`
  - `greenhouse_core.service_skill_requirements`
  - `src/app/api/agency/skills/members/[memberId]/route.ts`
- `Mi perfil` ya tiene shell enterprise con tabs y composición en:
  - `src/views/greenhouse/my/MyProfileView.tsx`
  - `src/views/greenhouse/my/my-profile/tabs/ProfileTab.tsx`
- `Admin > Usuario` ya tiene detalle enterprise con tabs en:
  - `src/views/greenhouse/GreenhouseAdminUserDetail.tsx`
  - `src/views/greenhouse/admin/users/UserDetailHeader.tsx`
- HR Core ya expone parte del perfil editable:
  - `phone`
  - `linkedinUrl`
  - `portfolioUrl`
  - `skills`
  - `tools`
  - `notes`
  vía `src/lib/hr-core/service.ts` y `src/types/hr-core.ts`
- El uploader y serving de archivos privados ya existen:
  - `src/components/greenhouse/GreenhouseFileUploader.tsx`
  - `src/app/api/assets/private/route.ts`
  - `src/app/api/assets/private/[assetId]/route.ts`
- El repo ya tiene foundation de iconografía reutilizable:
  - `src/assets/iconify-icons/bundle-icons-css.ts`
  - `src/components/greenhouse/BrandLogo.tsx`
  - `simple-icons`
  - `@iconify-json/logos`
  - clases `tabler-*` ya disponibles globalmente
- El helper AI visual ya existe para casos no cubiertos por librería:
  - `src/lib/ai/image-generator.ts`
  - `docs/architecture/GREENHOUSE_AI_VISUAL_ASSET_GENERATOR_V1.md`

### Gap

- No existe CRUD visible de `member_skills` en `Mi perfil` ni en `Admin > Usuario`
- No existe agregado canónico de certificaciones profesionales con evidencia y estado de verificación
- No existe preview embebido de PDF/imagen para certificados en estas surfaces
- No existe badge `Verificado por Efeonce`
- No hay política runtime explícita de visibilidad para skills, certificaciones y links profesionales
- Faltan campos para `twitter/x`, `threads`, `behance`, dirección y `Sobre mí`
- `TASK-257` toca `/my/profile`; esta task comparte superficie y debe secuenciar o integrar cuidadosamente esa estructura existente
- No existe todavía un contrato explícito de iconografía para distinguir: skill/certificación/estado/acción vs marca externa de red profesional

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

### Slice 1 — Canonical profile contract + certification aggregate

- Extender el contrato de perfil profesional para cubrir:
  - links profesionales (`linkedin`, `portfolio`, `twitter/x`, `threads`, `behance`, [verificar si se agrega `github`])
  - datos de contacto visibles internamente (`phone`, dirección)
  - `Sobre mí`
- Reconciliar campos existentes de HR Core (`linkedinUrl`, `portfolioUrl`, `skills`, `tools`, `notes`) con el nuevo contrato; no duplicarlos en una segunda fuente de verdad.
- Diseñar e implementar el agregado canónico de certificaciones con:
  - nombre
  - emisor
  - fecha de emisión
  - fecha de vencimiento
  - `asset_id` / evidencia
  - link de validación opcional
  - estado de verificación y metadata (`verified_by`, `verified_at`)
- Endurecer `member_skills` para surfacing de verificación y visibilidad reutilizable por reader/UI.

### Slice 2 — Self-service en Mi Perfil

- Agregar una tab o sección visible `Skills y certificaciones` en `/my/profile`
- Habilitar CRUD para:
  - skills del colaborador
  - certificaciones del colaborador
  - links profesionales
  - contacto básico editable permitido
  - `Sobre mí`
- Reutilizar componentes existentes del repo para:
  - upload de archivo
  - formularios
  - tabs/cards
  - preview embebido de PDF/imagen
- Definir y reutilizar un mapa de iconografía consistente:
  - `tabler-*` para acciones, estados y tipos internos
  - `BrandLogo` / logos bundleados para plataformas externas y emisores de certificación cuando aplique
  - generación AI solo como excepción documentada si no existe recurso reutilizable
- El preview debe abrir el certificado dentro del portal, no descargarlo por defecto.

### Slice 3 — Admin Center > Usuario: CRUD + verificación

- Agregar una surface clara en `/admin/users/[id]` para perfil profesional
- Habilitar CRUD completo de admin sobre:
  - skills
  - certificaciones
  - links
  - contacto
  - `Sobre mí`
- Agregar acciones de verificación / desverificación con badge visible `Verificado por Efeonce`
- Diferenciar estados operativos al menos para:
  - autodeclarado
  - verificado
  - vencido (certificaciones)
  - por revisar

### Slice 4 — Visibilidad por audiencia + reader reusable

- Formalizar reglas de visibilidad:
  - self/admin siempre ven el perfil completo permitido por permisos
  - cliente solo ve el subconjunto explícitamente permitido
  - skills/certificaciones cliente-visibles requieren verificación explícita
- Publicar un reader o payload reusable para futuros consumers client-facing, sin obligar a que esta task implemente todas las surfaces cliente desde ya.
- Dejar explícito cómo conviven:
  - skill autodeclarada
  - skill verificada
  - certificación con evidencia
  - certificación expirada

## Out of Scope

- Integración automática con APIs externas de LinkedIn, X/Twitter, Threads o Behance
- Parsing automático de CV o inferencia IA de skills desde certificados
- Reemplazar o cerrar `TASK-027` como módulo completo de Document Vault HR
- Crear una página pública nueva o un client portal completo solo para mostrar perfiles
- Cambiar el algoritmo de staffing de `TASK-157` más allá de consumir metadata de verificación si aplica

## Detailed Spec

### Modelo funcional esperado

El perfil profesional se divide en cuatro lanes:

1. **Skills**
   - capacidades profesionales del catálogo canónico
   - nivel/seniority
   - notas
   - visibilidad
   - verificación Efeonce

2. **Certificaciones**
   - credential formal con evidencia
   - preview embebido PDF/imagen
   - vigencia
   - verificación Efeonce

3. **Links profesionales**
   - LinkedIn
   - X/Twitter
   - Threads
   - Behance
   - portfolio personal
   - [verificar si se suma `GitHub` o `Dribbble` en este mismo slice]

4. **Información personal/profesional**
   - teléfono
   - dirección
   - `Sobre mí`

### Visual / UX baseline

- Nombre visible del módulo: `Skills y certificaciones`
- La verificación debe mostrarse como badge azul con lockup inline locale-aware (`Verificado por` / `Verified by`) + wordmark SVG de Efeonce; no replicar branding de Twitter/Meta literalmente ni reemplazar el wordmark por texto plano cuando la surface soporte el componente shared.
- Certificados:
  - card compacta con nombre, emisor y vigencia
  - CTA `Ver certificado`
  - visor embebido en dialog/drawer:
    - `iframe` para PDF
    - preview de imagen para JPG/PNG/WEBP
- Skills:
  - chips por categoría
  - badge de seniority
  - badge de estado (`Autodeclarada`, `Verificada`)
- Perfil:
  - CTA de edición contextual
  - resumen arriba con conteos (`skills`, `certificaciones activas`, `verificadas`, `por vencer`) si la superficie lo soporta sin ruido

### Reutilización explícita

- Uploader: `src/components/greenhouse/GreenhouseFileUploader.tsx`
- Assets privados:
  - `src/app/api/assets/private/route.ts`
  - `src/app/api/assets/private/[assetId]/route.ts`
- My Profile shell:
  - `src/views/greenhouse/my/MyProfileView.tsx`
  - `src/views/greenhouse/my/my-profile/**`
- Admin user detail shell:
  - `src/views/greenhouse/GreenhouseAdminUserDetail.tsx`
  - `src/views/greenhouse/admin/users/**`

### Colisión / coordinación

- `TASK-257` sigue `in-progress` y toca `/my/profile`
- El agente que tome `TASK-313` debe decidir en Discovery si:
  - extiende la estructura ya aterrizada por `TASK-257`, o
  - espera cierre/merge de esa task antes de atacar la surface
- No se debe abrir una segunda shell de `Mi perfil`

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] `/my/profile` permite CRUD de skills, certificaciones, links profesionales, contacto permitido y `Sobre mí`
- [ ] `/admin/users/[id]` permite CRUD del mismo set y además verificar/desverificar skills y certificaciones
- [ ] Los certificados aceptan PDF/JPG/PNG/WEBP vía la foundation shared de assets y pueden verse embebidos sin descarga forzada
- [ ] Los items verificados muestran badge visible `Verificado por Efeonce`
- [ ] Existe una política runtime explícita de visibilidad self/admin/client y los items cliente-visibles no pueden aparecer verificados sin aprobación admin
- [ ] La implementación reutiliza `TASK-157` como source of truth de skills y no reintroduce arrays legacy como canon
- [ ] La UI usa una semántica de iconos consistente: `tabler-*` para producto y `BrandLogo`/logos bundleados para marcas, sin introducir un set AI inconsistente para acciones core
- [ ] `pnpm lint`, `pnpm exec tsc --noEmit --incremental false` y `pnpm build` pasan sin errores

## Verification

- `pnpm lint`
- `pnpm exec tsc --noEmit --incremental false`
- `pnpm test`
- `pnpm build`
- Validación manual en:
  - `/my/profile`
  - `/admin/users/[id]`
  - preview embebido de un PDF y una imagen
  - badge `Verificado por Efeonce`
  - visibilidad restringida en un consumer cliente-safe [verificar surface final]

## Closing Protocol

- [ ] Actualizar `docs/architecture/GREENHOUSE_UI_PLATFORM_V1.md` con el patrón final de perfil profesional y preview embebido
- [ ] Actualizar `docs/architecture/Greenhouse_HRIS_Architecture_v1.md` o el documento canónico que quede dueño del agregado de certificaciones
- [ ] Registrar en `project_context.md` y `Handoff.md` la política visible de verificación `Verificado por Efeonce` y el contrato de visibilidad

## Follow-ups

- Surfacing cliente de talento verificado en vistas tipo `equipo`, dossier o future Globe surfaces
- Cola operativa de revisión para admins (`pendientes de verificar`, `por vencer`, `rechazadas`)
- Importadores o conectores externos para poblar links/certificaciones sin data entry manual

## Open Questions

- ¿Las certificaciones deben modelarse como agregado propio del perfil profesional o como subdominio alineado/bridge de `TASK-027`?
- ¿`address` debe ser una sola string o una estructura más rica (`country`, `city`, `street`) en este slice?
- ¿`GitHub` y `Dribbble` entran en el primer corte junto a LinkedIn/X/Threads/Behance o quedan como follow-on?
