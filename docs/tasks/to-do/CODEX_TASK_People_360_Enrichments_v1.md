# CODEX TASK -- People 360 Enrichments (v1)

## Estado

Follow-up operativo creado el `2026-03-19` despues de cerrar la task fundacional:
- `docs/tasks/complete/CODEX_TASK_People_Unified_View_v3.md`

La base del modulo ya existe:
- `/people`
- `/people/[memberId]`
- tabs operativas
- integracion con `Admin Team`
- read enrichments base de `capacity`, `financeSummary` y payroll

Lo pendiente ya no es "crear People", sino enriquecerlo como surface 360 sin romper ownership de otros modulos.

## Resumen

Extender `People` como capa de lectura transversal del colaborador, consumiendo dominios satelite ya existentes sin convertirlo en master de mutacion.

## Scope

### 1. Enrichments prioritarios

- identidad enlazada y facetas canónicas visibles desde `Person 360`
- mejor lectura de permisos / acceso cuando sea util para admins
- enrichments de `HR Core` listos para consumo read-only
- enrichments de `AI Tooling` si la experiencia necesita mostrar licencias o wallets por colaborador

### 2. Surface 360

- mejorar el uso de `GET /api/people/meta`
- hacer visible el contrato de tabs y enrichments soportados
- evitar que frontend tenga que adivinar ownership o permisos entre modulos

### 3. UX de consolidacion

- CTAs claros hacia `Admin Team`, `Payroll`, `Finance` u otros dueños de write
- mantener `People` como orquestador de lectura, no como write layer nuevo

## Fuera de alcance

- mover writes a `/api/people/*`
- duplicar CRUD de roster o assignments
- reabrir el diseño fundacional del modulo

## Criterios de aceptacion

- `People` expone mejor el contexto cross-module del colaborador
- los enrichments nuevos vienen de modulos dueños ya existentes
- no se duplican namespaces ni ownership de mutacion
