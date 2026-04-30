# TASK-694 — Deep Link Platform Foundation

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
- Epic: `none`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `platform`
- Blocked by: `none`
- Branch: `task/TASK-694-deep-link-platform-foundation`
- Legacy ID: `none`
- GitHub Issue: `optional`

## Summary

Implementa la foundation runtime de deep links de Greenhouse: callers expresan referencias semanticas (`kind`, `id`, `action`) y una capa canonica resuelve `href`, `absoluteUrl`, fallback y metadata de acceso. El primer corte no cambia rutas ni persiste un nuevo contrato en DB; deja una libreria testeada y migra 1-2 consumers de bajo riesgo preservando `actionUrl` legacy.

## Why This Task Exists

Hoy Greenhouse genera links por isla: sidebar/search usan rutas estaticas, notificaciones y emails guardan URLs directas, Teams cards reciben `actionUrl`, quote share tiene builders propios y API Platform app puede devolver rutas sin resolver sobre el mismo contrato. Eso crea drift, rompe previews entre ambientes y no deja expresar correctamente la diferencia entre `views` visibles y `entitlements` finos.

## Goal

- Crear `src/lib/navigation/deep-links/**` como runtime compartido para referencias semanticas, definitions, resolver, base URL y access metadata.
- Registrar definitions iniciales para las rutas mas usadas y sensibles: `home`, `ops_health`, `person`, `quote`, `income`, `expense`, `leave_request`, `payroll_period` y `public_quote_share`.
- Migrar un consumer de bajo riesgo a `resolveGreenhouseDeepLink()` sin romper el output actual.
- Dejar tests unitarios que cubran encoding, fallback, URLs absolutas, metadata de acceso y compatibilidad con ambientes.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_DEEP_LINK_PLATFORM_V1.md`
- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_IDENTITY_ACCESS_V2.md`
- `docs/architecture/GREENHOUSE_ENTITLEMENTS_AUTHORIZATION_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_PORTAL_VIEWS_V1.md`
- `docs/architecture/GREENHOUSE_NOTIFICATION_HUB_V1.md`
- `docs/architecture/GREENHOUSE_TEAMS_BOT_INTERACTION_V1.md`
- `docs/architecture/GREENHOUSE_API_PLATFORM_ARCHITECTURE_V1.md`

Reglas obligatorias:

- No crear un router paralelo a Next.js; el resolver produce rutas canonicas existentes.
- No reemplazar `VIEW_REGISTRY`; las definitions deben complementar `view_code` y detectar drift.
- Cada link interno debe declarar explicitamente si vive en el plano `views/authorizedViews/view_code`, en `entitlements/capabilities`, o en ambos.
- No meter datos sensibles en path/query; IDs opacos permitidos, payloads y secretos prohibidos.
- No introducir Branch, Firebase Dynamic Links u otro proveedor externo en esta foundation.
- Mantener `actionUrl` legacy como output derivado donde ya exista.

## Normative Docs

- `docs/tasks/TASK_PROCESS.md`
- `docs/operations/DOCUMENTATION_OPERATING_MODEL_V1.md`
- `docs/operations/RELEASE_CHANNELS_OPERATING_MODEL_V1.md`

## Dependencies & Impact

### Depends on

- `docs/architecture/GREENHOUSE_DEEP_LINK_PLATFORM_V1.md`
- `src/lib/admin/view-access-catalog.ts`
- `src/lib/tenant/resolve-portal-home-path.ts`
- `src/components/layout/vertical/VerticalMenu.tsx`
- `src/components/layout/shared/search/DefaultSuggestions.tsx`
- `src/lib/finance/quote-share/**`

### Blocks / Impacts

- `TASK-690` a `TASK-693` pueden usar este contrato para CTAs de Notification Hub sin seguir propagando URLs crudas.
- API Platform app (`api/platform/app/home`, `api/platform/app/notifications`) puede devolver referencias + resolved URLs en vez de rutas web sueltas.
- Command palette/search y sidebar pueden converger despues sobre el mismo registry.
- Teams Bot y emails pueden resolver URLs absolutas por ambiente sin duplicar helpers.

### Files owned

- `src/lib/navigation/deep-links/**`
- `src/lib/navigation/deep-links/__tests__/**`
- `src/app/api/admin/teams/test/route.ts`
- `src/lib/webhooks/consumers/notification-mapping.ts` (solo si se elige como proof consumer)
- `docs/architecture/GREENHOUSE_DEEP_LINK_PLATFORM_V1.md` (delta menor si el runtime cambia el contrato)
- `docs/tasks/to-do/TASK-694-deep-link-platform-foundation.md`
- `Handoff.md`
- `changelog.md`

## Current Repo State

### Already exists

- `VIEW_REGISTRY` con rutas y `viewCode` canonicos en `src/lib/admin/view-access-catalog.ts`.
- Guards de pagina por `viewCode` en layouts como `/finance`, `/hr`, `/admin/ops-health`.
- `portalHomePath` por tenant/usuario via `src/lib/tenant/resolve-portal-home-path.ts`.
- `actionUrl` en notificaciones, emails y Teams cards.
- Quote share y short links publicos en `src/lib/finance/quote-share/**`.
- Search/default suggestions con rutas estaticas en `src/components/layout/shared/search/DefaultSuggestions.tsx`.

### Gap

- No existe `src/lib/navigation/deep-links/**`.
- No hay helper unico de base URL para ambiente/preview/staging/production; hoy existen builders ad hoc repartidos en Teams, webhooks, reliability, emails y `quote-share`.
- No hay contrato semantico para decir "quote edit", "leave review" o "ops health" sin acoplarse a una ruta string.
- No hay metadata unificada para resolver ambos planos de acceso: `views` visibles y `entitlements` finos.
- No hay tests que protejan drift entre rutas, `VIEW_REGISTRY`, notificaciones, Teams y API Platform.

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

### Slice 1 — Runtime Types + Base URL

- Crear `types.ts`, `base-url.ts` e `index.ts` bajo `src/lib/navigation/deep-links/`.
- Modelar `GreenhouseDeepLinkReference`, `GreenhouseResolvedDeepLink`, `GreenhouseDeepLinkDefinition`, `GreenhouseDeepLinkAccess` y `GreenhouseDeepLinkPreview`.
- Implementar base URL con precedencia explicita: override del caller, env publico/canonico de app, Vercel URL cuando aplique, fallback local seguro para tests.
- Cubrir encoding y normalizacion de slashes/trailing slash con tests unitarios.

### Slice 2 — Registry + Resolver

- Crear `registry.ts`, `resolver.ts` y `definitions/*`.
- Implementar `resolveGreenhouseDeepLink(reference, context?)`.
- Registrar definitions iniciales:
  - `home` -> `portalHomePath` cuando exista, fallback `/home`; para surface interna tratar `viewCode` como derivado de startup policy/Home entitlements y no asumir un `viewCode` único ya materializado
  - `ops_health` -> `/admin/ops-health`
  - `person` -> `/people/:personId`
  - `quote` -> `/finance/quotes/:quoteId` y `edit` -> `/finance/quotes/:quoteId/edit`
  - `income` -> `/finance/income/:incomeId`
  - `expense` -> `/finance/expenses/:expenseId`
  - `leave_request` -> `/hr/leave?requestId=:requestId`
  - `payroll_period` -> `/hr/payroll/periods/:periodId`
  - `public_quote_share` -> `/public/quote/:quotationId/:versionNumber/:token` o el builder vigente si ya existe input suficiente
- Hacer que errores de referencia invalida degraden a `status='invalid_reference'` con fallback seguro, no throw en consumers de notificacion.

### Slice 3 — Access Metadata + Drift Guards

- Crear `access.ts` con metadata declarativa para ambos planos.
- Declarar `viewCode` inicial:
  - `ops_health`: `administracion.ops_health`
  - `quote`: `finanzas.cotizaciones`
  - `income`: `finanzas.ingresos`
  - `expense`: `finanzas.egresos`
  - `leave_request`: `equipo.permisos`
  - `payroll_period`: `equipo.nomina`
- Declarar capabilities finas como metadata no bloqueante cuando el repo ya tenga entitlement claro; si no existe, dejar `requiredCapabilities: []` y documentar el gap.
- Reutilizar bindings/capabilities ya comprobados en discovery cuando existan:
  - `ops_health` -> `platform.health.read`
  - `person` -> `people.directory`
  - `leave_request` -> `hr.leave` y `hr.leave_balance` segun action
  - `quote`, `income`, `expense`, `payroll_period` quedan inicialmente view-first salvo que discovery posterior demuestre capability fina estable
- Agregar test que compare definitions con `VIEW_REGISTRY` para las surfaces con `viewCode`.

### Slice 4 — Low-Risk Consumer Proof

- Migrar `src/app/api/admin/teams/test/route.ts` para resolver la URL absoluta de `ops_health` desde el registry.
- Elegir un segundo consumer solo si el diff queda acotado: preferir helper de notification mapping o email CTA que ya produzca `actionUrl`.
- Preservar el shape actual de payloads; el cambio visible debe ser nulo salvo mayor consistencia de base URL.

### Slice 5 — Docs + Handoff

- Actualizar `docs/architecture/GREENHOUSE_DEEP_LINK_PLATFORM_V1.md` solo si el runtime final ajusta nombres o shapes.
- Actualizar `Handoff.md` con validaciones, consumers migrados y follow-ups.
- Actualizar `changelog.md` si cambia estructura runtime o protocolo para agentes.

## Out of Scope

- No agregar `action_link_json` ni migraciones DB de notificaciones en esta task.
- No reescribir sidebar, search/command palette o `VIEW_REGISTRY`.
- No crear `/l/:linkId` ni un sistema general de short links.
- No cambiar page guards, auth, tenant resolution o route groups.
- No migrar todo email/Teams/Notification Hub en un solo lote.
- No implementar universal links mobile ni deferred deep linking externo.
- No reemplazar el sistema publico de quote share.

## Detailed Spec

Contrato esperado, ajustable durante Plan Mode si el repo revela una mejor convencion:

```ts
export type GreenhouseDeepLinkKind =
  | 'home'
  | 'ops_health'
  | 'person'
  | 'quote'
  | 'income'
  | 'expense'
  | 'leave_request'
  | 'payroll_period'
  | 'public_quote_share'

export type GreenhouseDeepLinkReference = {
  kind: GreenhouseDeepLinkKind
  id?: string
  action?: 'view' | 'edit' | 'review' | 'open'
  params?: Record<string, string | number | boolean | null | undefined>
  audience?: 'internal' | 'public' | 'api_app' | 'teams' | 'email'
}

export type GreenhouseResolvedDeepLink = {
  status: 'resolved' | 'fallback' | 'forbidden' | 'not_found' | 'invalid_reference'
  href: string
  absoluteUrl: string
  canonicalPath: string
  fallbackHref?: string
  access: GreenhouseDeepLinkAccess
  preview?: GreenhouseDeepLinkPreview
}
```

Resolver rules:

- `href` siempre es relativo para links internos, excepto `public_quote_share` si el builder vigente requiere URL publica absoluta.
- `absoluteUrl` siempre usa `resolveGreenhouseBaseUrl()` y nunca concatena env vars ad hoc dentro de consumers.
- `forbidden` solo se emite si el caller entrega contexto de acceso suficiente para evaluarlo; sin contexto, el resolver debe devolver metadata y dejar enforcement al guard existente.
- Query params deben construirse con `URLSearchParams`; path params deben usar `encodeURIComponent`.
- El resolver debe ser usable desde server code y tests sin depender de DOM/window.

Definitions iniciales sugeridas:

| Kind | Actions | Path | View plane | Entitlement plane |
| --- | --- | --- | --- | --- |
| `home` | `view` | `portalHomePath` o `/home` | surface interna sin `viewCode` único materializado; `cliente.pulse` aplica para la lens cliente | `home.*` / startup policy segun destination |
| `ops_health` | `view` | `/admin/ops-health` | `administracion.ops_health` | `platform.health.read` si aplica |
| `person` | `view` | `/people/:personId` | `equipo.personas` | `people.directory` para lectura/launch |
| `quote` | `view`, `edit` | `/finance/quotes/:quoteId`, `/finance/quotes/:quoteId/edit` | `finanzas.cotizaciones` | usar metadata comercial/finance existente si existe |
| `income` | `view` | `/finance/income/:incomeId` | `finanzas.ingresos` | usar metadata finance existente si existe |
| `expense` | `view` | `/finance/expenses/:expenseId` | `finanzas.egresos` | usar metadata finance existente si existe |
| `leave_request` | `view`, `review` | `/hr/leave?requestId=:requestId` | `equipo.permisos` | `hr.leave` si aplica |
| `payroll_period` | `view` | `/hr/payroll/periods/:periodId` | `equipo.nomina` | sensibilidad payroll; no exponer preview por defecto |
| `public_quote_share` | `open` | quote share builder vigente | public share | token/revocation owns access |

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Existe `src/lib/navigation/deep-links/**` con exports publicos desde `index.ts`.
- [ ] `resolveGreenhouseDeepLink()` resuelve las 9 definitions iniciales con `href`, `absoluteUrl`, `canonicalPath`, fallback y access metadata.
- [ ] Las definitions con `viewCode` estan alineadas con `VIEW_REGISTRY`.
- [ ] Al menos un consumer real usa el resolver y conserva el payload/behavior actual.
- [ ] No quedan concatenaciones nuevas de base URL en los archivos tocados.
- [ ] Tests cubren base URL, encoding, fallback, referencia invalida y access metadata.
- [ ] La documentacion viva queda sincronizada si el contrato cambia durante implementacion.

## Verification

- `pnpm test --run src/lib/navigation/deep-links`
- `pnpm test --run src/app/api/admin/teams`
- `pnpm lint`
- `pnpm build` si el diff toca rutas Next.js o exports compartidos
- Prueba manual o `pnpm staging:request` solo si se decide validar un consumer desplegado

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas
- [ ] se confirmo que `TASK-690` a `TASK-693` no fueron modificadas ni bloqueadas por esta foundation

## Follow-ups

- `action_link_json` para notificaciones cuando Notification Hub este listo para storage semantico.
- Generar command palette/search desde el deep link registry.
- Reconciliar sidebar y `VIEW_REGISTRY.routePath` contra definitions.
- Exponer references + resolved URLs en API Platform app.
- Evaluar `/l/:linkId` solo para casos auditables o externos.
- Universal links/mobile deferred deep links si la app first-party avanza.

## Open Questions

- Confirmar si `person` debe usar `equipo.personas`, `mi_ficha.*` o un entitlement person-level segun audiencia.
- Definir si `public_quote_share` debe depender del builder vigente o recibir un shape completo separado para evitar token leakage.
- Decidir si `forbidden` pertenece al resolver V1 o queda como metadata hasta que `TASK-658` cierre resource authorization bridge.
