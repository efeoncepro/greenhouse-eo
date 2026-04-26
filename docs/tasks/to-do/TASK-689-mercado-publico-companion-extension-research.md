# TASK-689 — Mercado Publico Companion Extension Research Spike

## Status

- Lifecycle: `to-do`
- Priority: `P3`
- Impact: `Medio`
- Effort: `Medio`
- Type: `policy`
- Epic: `optional`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `crm`
- Blocked by: `TASK-688`
- Branch: `task/TASK-689-mercado-publico-companion-extension`
- Legacy ID: `none`
- GitHub Issue: `optional`

## Summary

Investiga si conviene un complemento de Chrome/Edge estilo companion para asistir al usuario dentro de Mercado Publico, similar a lo que hace Licitalab, sin guardar credenciales ni violar terminos. La salida debe ser decision de producto/seguridad y task futura si procede.

## Why This Task Exists

Si la postulacion no existe por API, un companion podria ayudar a verificar contexto, descargar documentos o guiar pasos manuales. Pero introduce riesgos altos: seguridad, terminos de uso, credenciales, fragilidad de DOM y soporte.

## Goal

- Evaluar factibilidad legal, tecnica y de seguridad.
- Definir casos permitidos vs prohibidos.
- Recomendar seguir/no seguir y con que arquitectura.

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_COMMERCIAL_PUBLIC_PROCUREMENT_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_IDENTITY_ACCESS_V2.md`
- `docs/architecture/GREENHOUSE_ENTITLEMENTS_AUTHORIZATION_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_NATIVE_INTEGRATIONS_LAYER_V1.md`

Reglas obligatorias:

- No guardar credenciales Mercado Publico.
- No automatizar envio de ofertas sin validacion legal explicita.
- No depender de DOM scraping fragil como contrato core de datos.

## Normative Docs

- `docs/research/RESEARCH-007-commercial-public-tenders-module.md`
- `docs/operations/DOCUMENTATION_OPERATING_MODEL_V1.md`

## Dependencies & Impact

### Depends on

- `TASK-688`

### Blocks / Impacts

- Posible task futura de extension companion.
- Politica de seguridad de integraciones browser-side.

### Files owned

- `docs/research/RESEARCH-007-commercial-public-tenders-module.md`
- `docs/architecture/GREENHOUSE_COMMERCIAL_PUBLIC_PROCUREMENT_ARCHITECTURE_V1.md`
- `Handoff.md`

## Current Repo State

### Already exists

- Research menciona que Licitalab usa complemento de Chrome como hipotesis competitiva.

### Gap

- No hay decision Greenhouse sobre browser extension companion.

## Scope

### Slice 1 — Competitive And Legal Research

- Documentar patrones observables de companions.
- Revisar riesgos de terminos, seguridad y privacidad.

### Slice 2 — Architecture Options

- Evaluar extension read-only, assisted checklist, document capture, deep link y no-go zones.
- Definir auth/entitlements si existiera companion.

### Slice 3 — Recommendation

- Dejar decision y follow-up task si procede.

## Out of Scope

- Construir extension.
- Automatizar postulacion.
- Capturar credenciales o cookies.

## Acceptance Criteria

- [ ] Hay decision documentada de seguir/no seguir.
- [ ] Casos permitidos/prohibidos quedan claros.
- [ ] Si se sigue, existe task futura con scope seguro.

## Verification

- Revision manual de research y arquitectura.
- `rg -n "extension|companion|Chrome|Mercado Publico" docs/research docs/architecture docs/tasks`

## Closing Protocol

- [ ] Lifecycle y carpeta sincronizados.
- [ ] README de tasks actualizado.
- [ ] Handoff actualizado.

## Follow-ups

- Task de companion extension solo si la decision es positiva.
