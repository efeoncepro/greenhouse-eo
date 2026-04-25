# TASK-617.2 — API Platform First-Party App Surface Foundation

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Muy alto`
- Effort: `Alto`
- Type: `implementation`
- Epic: `[optional EPIC-###]`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `platform`
- Blocked by: `TASK-617.1`
- Branch: `task/TASK-617.2-api-platform-first-party-app-surface-foundation`
- Legacy ID: `—`
- GitHub Issue: `—`

## Summary

Abrir la foundation de `api/platform/app/*` como lane first-party para la futura app móvil Greenhouse en `React Native`. La task no busca construir toda la mobile API de una vez; busca definir el auth model, los primeros resources base y un contrato desacoplado de rutas web internas del portal.

## Why This Task Exists

La arquitectura ya formalizó algo importante: la futura app `iOS`/`Android` debe ser un consumer oficial de la `API platform`, no un caso improvisado de rutas web reutilizadas por conveniencia.

Además, hoy el supuesto de producto es concreto:

- la app móvil prevista se hará en `React Native`

Eso vuelve especialmente relevantes:

- contratos HTTP predecibles
- OpenAPI usable
- types TypeScript compartibles
- payloads compactos
- auth/session strategy clara para mobile

Sin esta task, Greenhouse corre el riesgo de:

- conectar mobile a rutas internas pensadas para server components o UI web
- mezclar auth de usuario first-party con auth ecosystem server-to-server
- documentar una plataforma “general” que todavía no sirve bien a un consumer propio clave

## Goal

- Definir la lane `api/platform/app/*` como contract first-party de Greenhouse.
- Formalizar la estrategia base de auth/session para mobile dentro de Identity Access.
- Exponer un primer set pequeño de resources y commands pensados para la app `React Native`.

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_API_PLATFORM_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_IDENTITY_ACCESS_V2.md`
- `docs/architecture/GREENHOUSE_ENTITLEMENTS_AUTHORIZATION_ARCHITECTURE_V1.md`

Reglas obligatorias:

- La lane `app` debe ser first-party y user-authenticated; no debe reciclar el auth model de `ecosystem` para server-to-server.
- La task debe tratar `React Native` como supuesto actual del consumer, no como dependencia rígida del contrato API.
- La app no debe depender de rutas internas del portal web pensadas para SSR o server components.
- Los recursos iniciales deben ser pequeños, estables y útiles para mobile; no un espejo completo del portal.

## Normative Docs

- `docs/documentation/plataforma/api-platform-ecosystem.md`
- `project_context.md`
- `Handoff.md`

## Dependencies & Impact

### Depends on

- `docs/tasks/to-do/TASK-617.1-api-platform-rest-hardening.md`
- `src/lib/api-platform/**`
- `src/app/api/platform/**`
- `src/lib/auth/**`
- `src/lib/tenant/**`
- `src/lib/entitlements/**`

### Blocks / Impacts

- futura app `React Native`
- developer docs públicas de la API
- eventual SDK/types generation para mobile
- decisiones futuras de writes first-party

### Files owned

- `src/lib/api-platform/**`
- `src/app/api/platform/app/**`
- `docs/architecture/GREENHOUSE_API_PLATFORM_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_IDENTITY_ACCESS_V2.md`
- `docs/documentation/plataforma/api-platform-ecosystem.md`

## Current Repo State

### Already exists

- lane `ecosystem` read-only en `src/app/api/platform/ecosystem/**`
- architecture spec que ya define lane `app` como parte del objetivo
- Identity Access V2 y runtime de sesión del portal
- futura necesidad explícita de servir una app móvil `React Native`

### Gap

- no existe `src/app/api/platform/app/**`
- no existe una estrategia first-party móvil formalizada dentro de la plataforma
- no existe un primer resource contract explícito para mobile
- la documentación pública/dev todavía no contempla a la app como consumer oficial

## Scope

### Slice 1 — Auth and session model for first-party mobile

- Definir la estrategia base de auth/session/tokens para la lane `app`.
- Alinearla con Identity Access V2 y con tenancy/entitlements por usuario autenticado.
- Dejar explícitas reglas de refresh, revocación y posture mínima si aplican en el diseño final.

### Slice 2 — App lane foundation

- Crear la foundation de `src/app/api/platform/app/**` sobre el shared layer ya existente.
- Mantener envelope, versionado, observabilidad y error taxonomy alineados con el resto de la platform API.
- Diferenciar claramente `app auth` de `ecosystem auth`.

### Slice 3 — First mobile resources

- Exponer un primer set de resources/commands compactos y útiles para mobile.
- La selección exacta se resuelve en Discovery, pero debe apuntar a surfaces first-party claras como:
  - contexto del usuario autenticado
  - home/app context
  - approvals/tasks/notifications si existen readers maduros
- Evitar espejos accidentales de pantallas web completas.

### Slice 4 — Docs and mobile contract sync

- Actualizar arquitectura y documentación para reflejar la lane `app` y el consumer `React Native`.
- Dejar criterios claros de qué entra o no entra a la mobile API en V1.

## Out of Scope

- construir la app `React Native`
- exponer todo el portal web como mobile API
- mezclar event control plane en esta misma task
- abrir writes first-party amplios sin commands explícitos

## Detailed Spec

Esta task debe responder tres preguntas:

1. cómo autentica un usuario first-party móvil
2. qué resources mínimos necesita la app para nacer bien
3. cómo evitamos que mobile consuma rutas web internas por atajo

La base canónica es:

- `ecosystem` = server-to-server
- `app` = first-party user-authenticated

La app prevista hoy es `React Native`, por lo que la task debe favorecer:

- contratos HTTP simples
- outputs compactos
- compat con types TS compartibles
- OpenAPI útil para tooling móvil

## Acceptance Criteria

- [ ] Existe una estrategia first-party de auth/session para la lane `app`, alineada con Identity Access.
- [ ] Existe foundation runtime para `api/platform/app/*`.
- [ ] Existe al menos un set inicial pequeño y explícito de resources/commands first-party para mobile.
- [ ] La documentación deja claro que la app `React Native` consume `api/platform/app/*` y no rutas internas web del portal.

## Verification

- `pnpm lint`
- `pnpm tsc --noEmit`
- `pnpm test`
- smoke manual o automatizado de la lane `app`

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas

- [ ] `docs/architecture/GREENHOUSE_IDENTITY_ACCESS_V2.md` quedó alineada con la estrategia móvil first-party resultante

## Follow-ups

- `TASK-617.4` — developer documentation portal
- follow-up específico de SDK/types generation para React Native si Discovery lo recomienda
