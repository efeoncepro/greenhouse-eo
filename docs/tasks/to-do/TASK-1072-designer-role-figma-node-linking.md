# TASK-1072 — Rol `designer` + Figma node linking (primer entitlement del rol)

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Medio`
- Effort: `Alto`
- Type: `implementation`
- Epic: `—`
- Status real: `Diseño (skills arch-architect + greenhouse-product-ui-architect aplicadas)`
- Domain: `platform | identity | ui`

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — PROBLEM & SOLUTION
     ═══════════════════════════════════════════════════════════ -->

## Problem

Dos cosas que se resuelven juntas porque una es la sustancia de la otra:

1. **El rol `designer` no existe.** Hoy el Design System (`/design-system`, TASK-1070)
   es accesible a todos los colaboradores vía el viewCode `plataforma.design_system`.
   El operador quiere un rol `designer` para — eventualmente — distinguir quién
   **opera** el Design System de quién solo lo **consume**. Pero un rol que solo se
   diferencia por un viewCode es un rol *flaco*: su set de entitlements sería vacío.

2. **El vínculo página↔nodo Figma vive hardcodeado.** `GreenhouseFigmaNodeButton`
   (TASK del primitive Figma node) abre el nodo AXIS de cada página, y se renderiza
   **disabled** cuando la página no tiene nodo asociado. El mapeo ruta→nodo vive en el
   TS hardcodeado `src/views/greenhouse/admin/design-system/design-system-figma-nodes.ts`
   (2 entradas: breadcrumbs `205:234905`, colors `11205:5341`). Sumar/cambiar un
   vínculo hoy requiere editar código + deploy.

**El insight que une ambos**: convertir ese registro hardcodeado en algo que un
diseñador llena **desde la UI** (pega la URL de Figma → un proceso la disecciona y
persiste el vínculo → el botón se activa) es exactamente la **primera capability
real** del rol `designer`. La feature le da carne al rol; el rol gatea la feature.

## Solution

Crear el rol `designer` con sus **4 planos** (route_groups + views + **entitlements** +
startup policy) y, como su primera capability, el **Figma node linking**: una
mini-interfaz inline (sobre `GreenhouseFloatingSurface` variant `inlineEditor`) anclada
en el `GreenhouseFigmaNodeButton` disabled, que acepta una URL de Figma, la **disecciona**
(pure fn `parseFigmaUrl`), **valida** (debe ser del file AXIS) y **persiste** el vínculo
en una tabla SSOT — reemplazando el registro TS hardcodeado por data-driven.

**Separación de planos (canónica)**:
- **Ver el Design System** = plano **views** (`plataforma.design_system`, todo interno).
- **Vincular un nodo** = plano **entitlements** (`design_system.figma_node.link`, solo `designer` + admin).
- Un colaborador no-diseñador ve el DS + ve el botón disabled, pero **no** ve el affordance de vincular (tooltip honesto "pedile a un diseñador").

**`capturar el nodo` partido en dos** (no acoplar el write a la API de Figma):
- **V1 = link-only**: parse + validar AXIS + upsert. El botón se activa. Síncrono.
- **V1.1 (opcional, diferible)**: enriquecer `node_name`/thumbnail vía API Figma como
  paso **reactivo + degradable** (si Figma falla, el link igual quedó).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — DETAILED SPEC (sliced)
     ═══════════════════════════════════════════════════════════ -->

## Detailed Spec

### Slice 0 — Rol `designer` foundation (4 planos)

Prerequisito: la capability del Slice 2 se concede a `designer`, así que el rol debe
existir primero (FK + coverage guard). Crear el rol tocando los 4 planos:

1. **Catálogo DB (primero — FK)**: migración `INSERT` en `greenhouse_core.roles`
   (`role_view_assignments` y `role_entitlement_defaults` tienen FK a `roles(role_code)`):
   `role_code='designer'`, `role_name='Diseñador'`, `role_family`, `description`,
   `tenant_type='efeonce_internal'`, `is_admin=FALSE`, `is_internal=TRUE`,
   `route_group_scope` (coincidente 1:1 con el plano 2 — invariante TASK-987).
2. **Enum TS (SSOT)**: `src/config/role-codes.ts` → `DESIGNER: 'designer'` en `ROLE_CODES`
   + agregarlo a `ROLE_PRIORITY` (posición: antes de `collaborator`, después de los roles funcionales).
3. **route_groups**: `src/lib/tenant/role-route-mapping.ts` → `[ROLE_CODES.DESIGNER]: ['internal', 'my']`
   (interno para el DS + `my` para que conserve su experiencia personal). **Debe igualar
   `roles.route_group_scope` del plano 1** (parity TS↔DB).
4. **views**: en la migración de TASK-1070 ya se concedió `plataforma.design_system` a
   `collaborator`; agregar grant explícito a `designer` en `role_view_assignments`
   (append-only). Decisión de **restringir a collaborator se difiere** (open question 4).
5. **startup policy / audience**: `inferAudience()` en `runtime.ts` — `designer` cae a
   audiencia `collaborator`/`my` por default (tiene route_group `my`); validar que el Home
   resuelve sin cambio. No crear audiencia nueva en V1.
6. **Tests de visibilidad**: actualizar `internal-role-visibility.test.ts`,
   `view-access-resolution.test.ts` y cualquier test que enumere/cuente roles internos.

**Gotcha**: la UI de asignación (`/admin/users` → usuario → Acceso) lista `availableRoles`
**directo desde `greenhouse_core.roles`** → el rol aparece para asignar **sin tocar UI**.
El label visible sale de `roles.role_name` (data-driven).

### Slice 1 — Dominio: tabla SSOT + parser + command + reader

**Migración** — tabla `greenhouse_core.design_system_figma_nodes` (SSOT, reemplaza el TS):
```
surface_key   TEXT PK            -- '/design-system/breadcrumbs' (mismo grano que hoy)
file_key      TEXT NOT NULL      -- CHECK: debe ser AXIS (allowlist)
node_id       TEXT NOT NULL      -- '205:234905' (normalizado, ':' no '-')
node_name     TEXT NULL          -- enriquecido async (V1.1)
linked_by     TEXT NOT NULL      -- user_id
linked_at     TIMESTAMPTZ NOT NULL DEFAULT now()
superseded_at TIMESTAMPTZ NULL   -- re-link = supersede, nunca delete
updated_by    TEXT
```
+ `design_system_figma_node_events` (append-only audit, triggers anti-UPDATE/DELETE,
patrón state-machine+CHECK+audit trio). Ownership `greenhouse_ops`, GRANT a `greenhouse_runtime`.
Seed: las 2 filas del TS hardcodeado actual (breadcrumbs, colors).

**Parser puro** `parseFigmaUrl(url) → { fileKey, fileName, nodeId } | null`
(`src/lib/design-system/figma-nodes/parse-figma-url.ts`): `figma.com/design/:fileKey/:fileName?node-id=205-234905`
→ normaliza `205-234905` → `205:234905` (inverso de `buildFigmaNodeUrl`). Cero side-effects,
tests exhaustivos (URLs válidas/malformadas/otro file/branch URLs).

**Command** `linkDesignSystemFigmaNode({ surfaceKey, url, actorUserId })` (server-only):
parse → validar `fileKey === AXIS_FILE_KEY` (fail-closed) → upsert idempotente por
`surface_key` (re-link supersede el anterior con audit) → outbox event + audit en la misma tx.

**Reader** `getDesignSystemFigmaNodeMap()` (server): devuelve `Record<surfaceKey, { fileKey, nodeId }>`.
SSOT = DB; el TS `design-system-figma-nodes.ts` queda como **seed**, no como fuente runtime.

### Slice 2 — Capability `design_system.figma_node.link` (triple-layer)

1. **Catálogo TS**: `src/config/entitlements-catalog.ts` → capability `design_system.figma_node.link`
   (`action='update'`, `scope='tenant'`). **Módulo**: introducir `design_system` como
   `GreenhouseEntitlementModule` (future-proof para token/specimen capabilities) — alternativa
   reusar `platform` (open question, recomendado `design_system`).
2. **Registry DB**: migración seed en `greenhouse_core.capabilities_registry`.
3. **Runtime grant**: `src/lib/entitlements/runtime.ts` → grant a `hasRole(subject, ROLE_CODES.DESIGNER)`
   **+ `efeonce_admin`**. El guard `capability-grant-coverage.test.ts` exige ≥1 grant.
4. **Default gobernado**: `role_entitlement_defaults` seed para `designer`.

### Slice 3 — UI: inline editor + shell server-fed

**Decisión reuse/extend/new-primitive: NO primitive nueva.** Reusar `GreenhouseFloatingSurface`
variant `inlineEditor` (su contrato canónico incluye "inline editors"); `GreenhouseFigmaNodeButton`
es el **anchor**.

- **Shell server-fed**: la `layout.tsx` (server) de `/design-system` lee `getDesignSystemFigmaNodeMap()`
  y lo pasa como prop a `DesignSystemBreadcrumbShell` (`'use client'`). Deja de resolver client-side
  desde el TS.
- **Affordance gateado**: pasar `canLink` (resuelto server-side por `can(subject, 'design_system.figma_node.link', 'update')`)
  al shell. Cuando `!nodeId && canLink` → render "Vincular nodo Figma" que ancla un `GreenhouseFloatingSurface inlineEditor`
  con un `CustomTextField` (URL) + preview parseado (`AXIS · node 205:234905`) + botón "Vincular".
- **forms-ux**: un campo, paste-friendly, validación al submit, **mostrar el preview parseado antes de confirmar**.
- **Estados (state-design)**:
  - No-diseñador: botón disabled + tooltip "Sin nodo Figma — pedile a un diseñador que lo vincule". Sin editor.
  - Diseñador sin nodo: affordance "Vincular nodo" → inline editor.
  - Editando → validando (spinner) → error (URL inválida / file ≠ AXIS / nodo no encontrado) → vinculado (botón flipea optimista a "Abrir en Figma", confirmado por server).
  - Reduced-motion horneado por FloatingSurface.
- **API**: `POST /api/admin/design-system/figma-nodes` (o `/api/design-system/...`), gateado por la capability.
  Error es-CL canónico (`canonicalErrorResponse`), nunca `error.message` crudo.

### Slice 4 — (opcional, diferible) enrichment de metadata del nodo

`node_name`/thumbnail vía API Figma o MCP, reactivo + degradable. NO bloquea V1. Puede ser task derivada.

### Slice 5 — Tests + GVC + docs

- Tests: `parseFigmaUrl` (exhaustivo), command (upsert/supersede/audit/fail-closed AXIS), capability grant coverage, role visibility.
- GVC desktop+mobile: estado no-diseñador (disabled+tooltip), diseñador (affordance → editor → validando → vinculado → botón activo).
- Docs: `ui-platform/PRIMITIVES.md` (el editor sobre FloatingSurface), `GREENHOUSE_IDENTITY_ACCESS_V2` (rol `designer` + capability), changelog, Handoff, `CLAUDE.md`/`AGENTS.md` (snapshot ROLE_CODES → 14 roles + el invariante "ver DS = view / vincular nodo = entitlement").

## Dependencies & Impact

- **Depende de:** TASK-1070 (`/design-system` + viewCode `plataforma.design_system`), `GreenhouseFigmaNodeButton` + `design-system-figma-nodes.ts`, `GreenhouseFloatingSurface` (variant `inlineEditor`).
- **Impacta a:** `ROLE_CODES` pasa de 13 → 14 roles (actualizar el snapshot canónico en `CLAUDE.md`/`AGENTS.md`); cualquier test que cuente roles internos; el snapshot anti-rol-fantasma. El TS `design-system-figma-nodes.ts` deja de ser SSOT runtime (queda como seed).
- **Archivos owned:** migración(es) `roles`+`capabilities_registry`+`design_system_figma_nodes`; `src/config/role-codes.ts`; `src/lib/tenant/role-route-mapping.ts`; `src/config/entitlements-catalog.ts`; `src/lib/entitlements/runtime.ts`; `src/lib/design-system/figma-nodes/**`; `DesignSystemBreadcrumbShell.tsx` + `design-system/layout.tsx`; `GreenhouseFigmaNodeButton` (composición con FloatingSurface).

## Verification

- `pnpm build` exit 0, `pnpm lint` full, `pnpm tsc --noEmit` 0.
- `capability-grant-coverage.test.ts` verde (la capability nueva tiene grant).
- Role visibility tests actualizados verdes.
- Migración aplicada (anti pre-up-marker + parity TS↔DB de `route_group_scope`).
- Smoke: un usuario con rol `designer` ve el affordance y vincula un nodo (el botón se activa); un `collaborator` no-diseñador ve el botón disabled sin editor. GVC de ambos.
- SSOT: el shell resuelve el nodo desde la DB (no del TS), verificado vinculando una página sin nodo (ej. `/design-system/typography`) y viendo el botón activarse.

## Hard rules (NUNCA / SIEMPRE)

- **NUNCA** resolver el mapeo ruta→nodo desde el TS hardcodeado en runtime una vez exista la tabla. El TS es seed; la DB es SSOT.
- **NUNCA** persistir un vínculo cuyo `file_key` no sea AXIS (allowlist, fail-closed). No dejar que un Figma externo arbitrario entre al DS.
- **NUNCA** `DELETE` de un vínculo ni de las filas de audit. Re-link = supersede append-only.
- **NUNCA** mostrar el affordance de vincular a quien no tenga `design_system.figma_node.link` (capability, no viewCode). Ver el DS ≠ poder vincular.
- **NUNCA** crear una primitive nueva para el editor: reusar `GreenhouseFloatingSurface inlineEditor`. NUNCA reinventar popover/input desde cero.
- **NUNCA** sembrar la capability sin grant en `runtime.ts` en el mismo PR (guard `capability-grant-coverage`). NUNCA documentar `designer` sin agregarlo a `ROLE_CODES` (anti-rol-fantasma TASK-935).
- **NUNCA** desincronizar `ROLE_ROUTE_GROUPS` (TS) y `roles.route_group_scope` (DB) para `designer` (parity TASK-987).
- **NUNCA** bloquear el write del link en la API de Figma. Link síncrono; enrichment async + degradable.
- **NUNCA** `Sentry.captureException` directo: `captureWithDomain(err, 'identity' | 'platform', ...)`.
- **SIEMPRE** error es-CL canónico (`canonicalErrorResponse`) en la API; nunca `error.message` crudo.
- **SIEMPRE** la layout (server) inyecta el mapping + `canLink` al shell client; el cliente no decide acceso.

## Open questions (resueltas como defaults canónicos en este diseño)

1. **Scope de "capturar"** → **V1 link-only** (parse + validar + persist). Enrichment de metadata = Slice 4 opcional/diferible.
2. **fileKey** → **allowlist solo AXIS** (`yyMksCoijfMaIoYplXKZaR`), extensible a futuros files de marca con un CHECK/lista.
3. **Grano** → **por-página** (`surface_key` = ruta), mismo grano que el registro actual. Múltiples nodos por página (variants/specimens) = futuro.
4. **¿Restringir `plataforma.design_system` a `designer` y revocar a `collaborator`?** → **NO en V1.** Ver el DS sigue abierto a todo interno (incl colaboradores, TASK-1070); solo **vincular** es exclusivo del diseñador. La restricción de *ver* es una decisión separada del operador (flip de grant), no se acopla a esta task.
5. **Módulo de la capability** → recomendado nuevo módulo `design_system` (future-proof); alternativa `platform`. Decidir al implementar Slice 2.
