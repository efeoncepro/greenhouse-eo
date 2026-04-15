# TASK-413 — Kortex Identity Bridge Hardening & Contract Closure

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `identity`
- Blocked by: `none`
- Branch: `task/TASK-413-kortex-identity-bridge-hardening`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Cerrar los gaps Greenhouse-side que quedaron despues de `TASK-405` y `TASK-406` para que el bridge de identidad Kortex no quede solo "implementado en codigo", sino tambien endurecido en pruebas, documentado en el contrato API y alineado en handoff operativo.

## Why This Task Exists

`main` y `develop` ya convergieron sobre `POST /api/integrations/v1/sister-platforms/identity` y el helper `requireIntegrationRequest()`, pero la capacidad todavia tiene deuda estructural: no hay tests automatizados del carril de autenticacion, el bridge no aparece formalizado en la documentacion API/OpenAPI y el handoff de Kortex quedo ambiguo respecto al cierre Greenhouse-side y al siguiente owner del runtime Kortex.

Eso deja una integracion sensible de identidad sin contrato operativo completo: el codigo existe, pero su verification surface, su machine-readable handoff y su continuidad documental siguen incompletos.

## Goal

- Agregar cobertura automatizada al bridge de identidad Kortex y a su guard de autenticacion.
- Formalizar `POST /api/integrations/v1/sister-platforms/identity` en la documentacion API y OpenAPI de Greenhouse.
- Dejar el handoff Greenhouse -> Kortex explicito, legible y consistente con el estado real del repo.

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
- `docs/architecture/GREENHOUSE_SISTER_PLATFORMS_INTEGRATION_CONTRACT_V1.md`
- `docs/architecture/GREENHOUSE_KORTEX_INTEGRATION_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_SISTER_PLATFORM_BINDINGS_RUNTIME_V1.md`

Reglas obligatorias:

- el bridge debe seguir siendo `peer-system` y server-to-server; no convertir Kortex en modulo interno ni introducir acceso lateral a runtime o DB
- la autenticacion del carril debe seguir siendo explicita y versionable; cualquier ajuste debe preservar el boundary `header token -> Greenhouse credentials verification`
- no mezclar esta task con expansion funcional del sister-platform read lane ni con cambios de tenancy/bindings fuera del endpoint de identidad

## Normative Docs

- `docs/api/GREENHOUSE_INTEGRATIONS_API_V1.md`
- `docs/api/GREENHOUSE_INTEGRATIONS_API_V1.openapi.yaml`
- `docs/api/GREENHOUSE_API_REFERENCE_V1.md`
- `project_context.md`
- `Handoff.md`

## Dependencies & Impact

### Depends on

- `docs/tasks/complete/TASK-405-reconcile-main-into-develop-kortex-identity.md`
- `docs/tasks/complete/TASK-406-promote-kortex-identity-bridge-to-main.md`
- `src/app/api/integrations/v1/sister-platforms/identity/route.ts`
- `src/lib/integrations/integration-auth.ts`
- `src/lib/tenant/access.ts`

### Blocks / Impacts

- runtime handoff Greenhouse-side del bridge Kortex
- confianza operativa para consumir el endpoint desde el runtime Kortex
- futuras tasks de runtime Kortex que dependan de un contrato de identidad estable y documentado

### Files owned

- `src/app/api/integrations/v1/sister-platforms/identity/route.ts`
- `src/lib/integrations/integration-auth.ts`
- `src/app/api/integrations/v1/sister-platforms/identity/route.test.ts`
- `src/lib/integrations/integration-auth.test.ts`
- `docs/api/GREENHOUSE_INTEGRATIONS_API_V1.md`
- `docs/api/GREENHOUSE_INTEGRATIONS_API_V1.openapi.yaml`
- `docs/api/GREENHOUSE_API_REFERENCE_V1.md`
- `Handoff.md`

## Current Repo State

### Already exists

- `POST /api/integrations/v1/sister-platforms/identity` valida token de integracion, normaliza `email/password`, verifica credenciales Greenhouse y devuelve payload de usuario
- `requireIntegrationRequest()` ya soporta `Authorization: Bearer`, `x-greenhouse-integration-key` y `x-greenhouse-sister-platform-key`
- `TASK-405` y `TASK-406` dejaron el codigo Greenhouse-side reconciliado entre `develop` y `main`

### Gap

- no existe cobertura automatizada visible para `integration-auth` ni para el route de identidad
- el endpoint `/api/integrations/v1/sister-platforms/identity` no esta formalizado en `GREENHOUSE_INTEGRATIONS_API_V1.md` ni en el OpenAPI contract
- el handoff operativo de Kortex no deja suficientemente claro que ya quedo hecho en Greenhouse y que falta del lado Kortex

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

### Slice 1 — Test harness del bridge de identidad

- crear tests unitarios/directos para `requireIntegrationRequest()` cubriendo env missing, token invalido, bearer valido y headers alternativos
- crear tests para `POST /api/integrations/v1/sister-platforms/identity` cubriendo JSON invalido, payload incompleto, credenciales invalidas y credenciales validas con actualización de last login
- dejar mocks explícitos de `src/lib/tenant/access.ts` sin acoplar la suite a runtime externo ni a DB real

### Slice 2 — Contrato API y OpenAPI

- documentar `POST /api/integrations/v1/sister-platforms/identity` en `GREENHOUSE_INTEGRATIONS_API_V1.md` con auth, request/response y errores
- reflejar el endpoint en `GREENHOUSE_INTEGRATIONS_API_V1.openapi.yaml` y sincronizar `GREENHOUSE_API_REFERENCE_V1.md`
- dejar claro si este route pertenece al carril generic integrations, al carril sister-platform o a una transición documentada entre ambos

### Slice 3 — Handoff Greenhouse -> Kortex

- normalizar en `Handoff.md` el estado real del bridge de identidad y el siguiente paso pendiente del lado Kortex
- explicitar qué ya está cerrado en Greenhouse y qué no debe volver a implementarse desde este repo
- dejar referencias cruzadas a `TASK-405`, `TASK-406` y `TASK-413` para evitar nueva deriva documental

## Out of Scope

- construir el runtime Kortex que consume este bridge
- rediseñar el modelo de `sister_platform_consumers` o `sister_platform_bindings`
- introducir nuevas rutas de integracion fuera de `/api/integrations/v1/sister-platforms/identity`
- cambiar el flujo credenciales Greenhouse -> Kortex por OAuth, SSO o tokens de usuario

## Detailed Spec

El agente debe verificar primero si el endpoint debe seguir aceptando `GREENHOUSE_INTEGRATION_API_TOKEN`, `GREENHOUSE_SISTER_PLATFORM_TOKEN` o ambos. Si discovery revela ambigüedad contractual, no improvisar un parche local: documentar la decisión explícita y alinear código + docs + tests en un mismo contrato.

La suite no debe limitarse a "happy path". Debe proteger el boundary real:

- falta de secreto configurado -> `500`
- secreto inválido o faltante en request -> `401`
- body mal formado -> `400`
- `email/password` faltantes -> `400`
- credenciales Greenhouse inválidas -> `401`
- credenciales válidas -> `200` + payload consistente + side effect `updateTenantLastLogin(..., 'sister_platform_credentials')`

La documentación API debe declarar expresamente:

- headers aceptados
- si la auth del route es shared-token o sister-platform token
- shape mínima del request `{ email, password }`
- shape de la respuesta `user`
- errores `400/401/500`

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] existen tests automatizados para `src/lib/integrations/integration-auth.ts` y para `POST /api/integrations/v1/sister-platforms/identity`
- [ ] `docs/api/GREENHOUSE_INTEGRATIONS_API_V1.md` y `docs/api/GREENHOUSE_INTEGRATIONS_API_V1.openapi.yaml` documentan explícitamente el bridge de identidad Kortex
- [ ] `Handoff.md` deja inequívocamente separado el cierre Greenhouse-side del trabajo pendiente del runtime Kortex
- [ ] la implementación documentada sigue alineada con el boundary arquitectónico de sister platforms y no introduce acoplamiento nuevo a runtime o tenancy

## Verification

- `pnpm exec vitest run src/lib/integrations/integration-auth.test.ts src/app/api/integrations/v1/sister-platforms/identity/route.test.ts`
- `pnpm exec eslint src/lib/integrations/integration-auth.ts src/app/api/integrations/v1/sister-platforms/identity/route.ts src/lib/integrations/integration-auth.test.ts src/app/api/integrations/v1/sister-platforms/identity/route.test.ts`
- `pnpm build`
- smoke manual o programático del endpoint devolviendo `401` cuando el token no está presente o es inválido

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas
- [ ] se confirmó explícitamente si `main` y `develop` siguen en paridad para el bridge de identidad o si el drift quedó documentado

## Follow-ups

- runtime Kortex consumer smoke test contra Greenhouse staging/production usando el contrato documentado
- eventual separación formal de auth entre generic integrations y bridge de identidad si se decide descontinuar el fallback `GREENHOUSE_INTEGRATION_API_TOKEN`

## Open Questions

- ¿el bridge debe quedar definitivamente bajo el carril sister-platform con token dedicado, o la convivencia con `GREENHOUSE_INTEGRATION_API_TOKEN` sigue siendo un contrato intencional?
- ¿hace falta promover una spec más explícita del payload `user` para Kortex si ese shape empieza a consumirse fuera del primer piloto?
