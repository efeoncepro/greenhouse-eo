# TASK-330 — Gobernanza de fuentes, sync y drift de jerarquias

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `complete`
- Priority: `P2`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Status real: `Implementado`
- Rank: `TBD`
- Domain: `data`
- Blocked by: `none`
- Branch: `task/TASK-330-hierarchy-sync-drift-governance`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Definir y materializar la gobernanza de source of truth para jerarquias: que campo puede venir de Entra u otra fuente, que queda manual en Greenhouse, como se detecta drift y como se resuelven conflictos sin romper approvals ni visibilidad.

## Why This Task Exists

Una capability enterprise de jerarquias no puede depender solo de edicion manual si despues otra integracion pisa los datos. Hoy Greenhouse ya sincroniza profile enrichment desde Entra, pero no tiene una politica canonica para reporting lines:

- no esta definido quien gana entre manual y externo
- no hay drift monitoring
- no hay review queue para conflictos
- no hay reglas para no romper workflows en curso cuando cambia una jerarquia importada

## Goal

- Formalizar source governance de jerarquias
- Detectar drift entre Greenhouse y fuentes externas relevantes
- Permitir sync futuro sin destruir la semantica canonica y auditada

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_INTERNAL_ROLES_HIERARCHIES_V1.md`
- `docs/architecture/GREENHOUSE_IDENTITY_ACCESS_V2.md`
- `docs/architecture/GREENHOUSE_SCIM_ENTRA_INTEGRATION_V1.md`
- `docs/tasks/complete/TASK-324-reporting-hierarchy-foundation.md`

Reglas obligatorias:

- Los cambios importados no deben invalidar approvals ya snapshot-eados.
- La fuente externa no puede sobreescribir silenciosamente una jerarquia manual sin evidencia y policy clara.
- La primera iteracion puede limitarse a las fuentes ya existentes en el repo; no inventar conectores nuevos sin source real.

## Normative Docs

- `docs/tasks/to-do/TASK-323-hierarchy-supervisor-approval-program.md`

## Dependencies & Impact

### Depends on

- `docs/tasks/complete/TASK-324-reporting-hierarchy-foundation.md`
- `src/lib/entra/graph-client.ts`
- `src/app/api/webhooks/entra-user-change/route.ts`
- `src/lib/sync/event-catalog.ts`

### Blocks / Impacts

- fiabilidad de jerarquias importadas
- futuros syncs de identidad/persona
- mantenimiento de supervisoria en el tiempo

### Files owned

- `src/lib/entra/graph-client.ts`
- `src/app/api/webhooks/entra-user-change/route.ts`
- `src/lib/sync/event-catalog.ts`
- `src/lib/hr-core/service.ts`
- `docs/architecture/GREENHOUSE_SCIM_ENTRA_INTEGRATION_V1.md`
- `src/lib/reporting-hierarchy/store.ts`
- `src/lib/reporting-hierarchy/readers.ts`
- `src/lib/integrations/notion-delivery-data-quality.ts`
- `src/lib/identity/reconciliation/reconciliation-service.ts`

## Current Repo State

### Already exists

- Entra sync ya enriquece perfiles con atributos como job title, ubicación, teléfono, estado y avatar
- Greenhouse ya tiene event catalog y lanes de sync para otros dominios
- la jerarquia canonica propuesta en `TASK-324` puede capturar source metadata
- Greenhouse ya tiene infraestructura reusable para monitoreo histórico (`integration_data_quality_runs/checks`) y review queue (`identity_reconciliation_proposals`)

### Gap

- no existe policy de precedence para reporting hierarchy
- no existe drift detection ni review queue
- no existe contrato canonico para imports de supervisoria
- el contrato actual de Entra/SCIM no trae `manager`, por lo que no existe todavía una fuente externa madura de reporting hierarchy lista para auto-apply

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Source governance policy

- Definir precedencia entre manual Greenhouse y fuentes externas soportadas
- Definir cuando un cambio externo entra automatico, cuando entra en revision y cuando solo genera alerta
- Documentar impacto sobre approvals y subtree visibility

### Slice 2 — Drift detection y observabilidad

- Detectar diferencias entre jerarquia canonica y fuente externa soportada
- Emitir eventos o auditoria de drift
- Exponer estado util para RRHH/admin

### Slice 3 — Ingest controlado

- Integrar el primer carril de import controlado solo si la fuente soportada realmente expone supervisoria; si no, limitar la iteracion a gobernanza + drift + observabilidad sobre manual Greenhouse y dejar Entra preparado pero no sobredimensionado
- Registrar source metadata y no sobrescribir sin policy
- Dejar el contrato listo para futuras fuentes sin acoplar el core

## Out of Scope

- crear integracion nueva con un proveedor no presente en el repo
- editar jerarquias desde el organigrama
- reemplazar el modulo admin manual

## Detailed Spec

- La primera iteracion puede enfocarse en gobernanza y deteccion antes que en auto-apply agresivo.
- Si el source support efectivo queda acotado a manual Greenhouse + observabilidad sobre Entra, documentarlo explicitamente y no sobredimensionar la lane.
- No asumir import de jerarquia desde Entra mientras `src/lib/entra/graph-client.ts` no resuelva `manager` ni exista una policy aprobada para mapear ese dato a `reporting_lines`.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [x] Existe policy explicita de source of truth para jerarquias
- [x] Hay deteccion de drift entre jerarquia canonica y fuente externa soportada
- [x] Los cambios importados preservan auditabilidad y no rompen approvals ya snapshot-eados
- [x] La lane deja preparado el terreno para sync futuro sin ambiguedad

## Verification

- `pnpm exec tsc --noEmit --incremental false`
- `pnpm lint`
- `pnpm test`
- revision manual de policy + evidencia de drift monitoring

## Closing Protocol

- [x] Actualizar arquitectura de identidad/sync si cambia la policy de source precedence

## Follow-ups

- soportar fuentes adicionales si el negocio decide que Greenhouse no sera source primario de supervisoria
