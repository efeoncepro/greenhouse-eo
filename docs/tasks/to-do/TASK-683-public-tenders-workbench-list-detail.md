# TASK-683 — Public Tenders Workbench List And Detail

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Alto`
- Type: `implementation`
- Epic: `optional`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `ui`
- Blocked by: `TASK-675`, `TASK-682`
- Branch: `task/TASK-683-public-tenders-workbench`
- Legacy ID: `none`
- GitHub Issue: `optional`

## Summary

Crea la primera experiencia visible de `Commercial / Licitaciones Publicas`: listado priorizado, filtros, detalle de oportunidad, items, comprador, fechas, score, documentos disponibles y estado interno. Debe ser una herramienta operativa, no una landing page.

## Why This Task Exists

Sin workbench, la ingesta y scoring quedan invisibles. El equipo necesita revisar oportunidades, entender por que matchearon, abrir documentos y tomar decisiones iniciales.

## Goal

- Crear routes/pages para listado y detalle.
- Exponer API/readers tenant-aware.
- Integrar permisos `views` + `entitlements`.

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_COMMERCIAL_PUBLIC_PROCUREMENT_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_IDENTITY_ACCESS_V2.md`
- `docs/architecture/GREENHOUSE_ENTITLEMENTS_AUTHORIZATION_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_COMMERCIAL_QUOTATION_ARCHITECTURE_V1.md`

Reglas obligatorias:

- UI debe usar patrones Vuexy/Greenhouse existentes.
- Usar `greenhouse-agent`, `greenhouse-ui-orchestrator` y `greenhouse-ux-content-accessibility` antes de escribir UI/copy.
- Si se crean API routes, usar `vercel:nextjs`.
- Colores/tokens desde `GH_COLORS`; no inventar paleta.

## Normative Docs

- `docs/research/RESEARCH-007-commercial-public-tenders-module.md`
- `docs/operations/RELEASE_CHANNELS_OPERATING_MODEL_V1.md`

## Dependencies & Impact

### Depends on

- `TASK-675`
- `TASK-682`
- `TASK-679` para descargas de documentos completas; el listado puede mostrar `documents_unavailable` si aun no esta.

### Blocks / Impacts

- `TASK-684`
- `TASK-686`

### Files owned

- `src/app/(dashboard)/commercial/`
- `src/views/greenhouse/commercial/`
- `src/components/greenhouse/`
- `src/app/api/commercial/`
- `src/config/`

## Current Repo State

### Already exists

- Patrones Commercial/Finance en `src/app/(dashboard)/finance/` y `src/views/greenhouse/`.

### Gap

- No existe surface visible para Public Procurement.
- No hay view/capabilities para este modulo.

## Scope

### Slice 1 — Access And Routes

- Registrar view/menu/capabilities segun arquitectura.
- Crear routes de listado y detalle bajo route group canonico.

### Slice 2 — APIs And Readers

- Crear endpoints read-only con filtros, pagination y detail.
- Incluir score explanation y document summary.

### Slice 3 — UI

- Listado denso con filtros por tipo, motion, comprador, fecha, score, estado.
- Detail con tabs/secciones de resumen, items, documentos, score y actividad.

## Out of Scope

- Workflow bid/no-bid.
- Crear deals/quotes.
- IA de documentos.

## Acceptance Criteria

- [ ] Usuarios sin view/capability no ven ni acceden la surface.
- [ ] Listado y detalle filtran por `space_id`.
- [ ] UI muestra score y reasons sin prometer automatizacion inexistente.
- [ ] Empty/loading/error states son accesibles y consistentes con Greenhouse.

## Verification

- `pnpm lint`
- `pnpm build`
- Tests de route/readers si se agregan.
- Verificacion manual local de listado/detalle con datos seed o fixture.

## Closing Protocol

- [ ] Lifecycle y carpeta sincronizados.
- [ ] README de tasks actualizado.
- [ ] Handoff actualizado.
- [ ] changelog/client changelog si la surface queda visible.
- [ ] Docs funcionales bajo `docs/documentation/` si aplica.

## Follow-ups

- `TASK-684`
- `TASK-686`
