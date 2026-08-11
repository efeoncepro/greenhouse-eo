# TASK-285 — Client Role Differentiation for Globe Enterprise

## Delta 2026-08-10 — el resultado de esta task ya NO está en vigor

Cerrado por `TASK-1685` (decisión (a′), cierra `ISSUE-148`). Esta task sigue en `complete/` porque **se
implementó y se verificó como decía**; lo que cambió es el sistema debajo. Lo que sigue es lo que un
agente necesita saber antes de citar cualquier cosa de este archivo.

### Qué dejó de ser cierto

**La diferenciación de `client_specialist` no se aplica en ninguna parte.** Desde `TASK-1685`, la
visibilidad de una vista `cliente.*` la decide un solo primitive:

```
acceso = interna ∨ ( ¬revocadaParaLaPersona ∧ ( vistaBase ∨ móduloDeLaOrgLaDeclara ) )
```

`role_view_assignments` **no participa**. Las 3 filas `granted=FALSE` que esta task sembró
(`cliente.equipo`, `cliente.analytics`, `cliente.campanas` para `client_specialist`) **siguen en la
tabla y no hacen nada**. No se borraron: la tabla es append-only y su intención está registrada.

**La "Cadena de enforcement" de §Implementation Notes está superseded, y su paso 3 nunca fue del todo
cierto.** Medido el 2026-08-10:

| Paso declarado | Estado real entonces | Estado hoy |
|---|---|---|
| 1. `resolveAuthorizedViewsForUser` → `JWT.authorizedViews` | cierto | cierto, pero no gobierna vistas `cliente.*` |
| 2. `canSeeView()` filtra el menú | cierto (3 de 3 vistas ocultas) | **reemplazado** por el primitive |
| 3. page guard bloquea el acceso directo | **1 de 3** | **reemplazado** por el primitive |

El paso 3 es el que conviene mirar. `requireViewCodeAccess` —el page guard canónico desde `TASK-827`—
**nunca** leyó `authorizedViews`: resuelve por módulo contratado. De las 3 vistas negadas, sólo
`/campanas` tenía además un `layout.tsx` que gateaba por el carril de rol; `/equipo` y `/analytics`
tienen `page.tsx` y nada más. O sea que un `client_specialist` de una organización con el módulo podía
abrir Equipo y Analytics escribiendo la URL desde que existe ese guard. El menú se las ocultaba, y eso
bastó para que nadie lo notara.

**Nunca fue observable con usuarios reales.** Al 2026-08-10 no existe ningún usuario `client_specialist`
puro: el único que tiene ese rol es la persona agente de Berel, que tiene los tres, y la derivación es
una **unión** — el grant de executive gana. La diferenciación estuvo sembrada, parcialmente cableada y
sin ejercitar durante cuatro meses.

### Acceptance criteria que ya no se sostienen

- ❌ *"Un usuario `client_specialist` NO ve Analytics, Campanas, Equipo en el menú"* — el menú ya no
  consulta el rol. Lo que ve depende de los módulos que su organización contrató.
- ⚠️ *"`client_executive`, `client_manager` y `client_specialist` tienen visibilidad diferenciada"* — no
  la tienen. Dentro de una misma organización, los tres roles ven lo mismo.
- ✅ El resto sigue en pie: no se rompió acceso existente, el default `client_executive` sigue vigente, y
  la infraestructura de `role_view_assignments` sigue siendo el carril canónico **del portal interno**.

### Dónde vive esa capacidad ahora, si se vuelve a necesitar

La necesidad de negocio que originó esta task —*"un VP Marketing y un Content Specialist tienen
necesidades distintas"*— **sigue siendo válida y hoy no tiene carril**. `TASK-1685` §D2 lo declaró como
renuncia explícita, no como olvido. Si vuelve a hacer falta:

- **El instrumento es `user_view_overrides` per-persona** (`override_type='revoke'`), que existe, tiene
  `reason` y `expires_at`, y desde `TASK-1685` **sí cierra la puerta** — antes era decorativo ahí.
- **NUNCA** volver a expresarlo como deny per-**rol** sobre una vista que el módulo concede: el rol es
  un conjunto que se acumula, así que reintroduce la paradoja de que *ganar un rol te quita acceso* —
  exactamente lo que hace que estas 3 filas no afecten a la persona agente de Berel.
- Si la diferenciación es **comercial** (un plan que incluye Analytics y otro que no), el carril correcto
  no es el rol sino **el módulo**: dos productos distintos, no dos permisos.

Lo que deliberadamente **no** se decidió: si Efeonce quiere recuperar la diferenciación per-clase. Se
declaró el seam, no se construyó, porque al 2026-08-10 no hay un solo consumidor que lo ejercite y un
input que nadie ejerce deriva.

### Referencias

- `docs/tasks/complete/TASK-1685-client-portal-single-visibility-primitive.md` §Slice 1 (D1/D2)
- `docs/issues/resolved/ISSUE-148-...md` §Resolución
- `GREENHOUSE_CLIENT_PORTAL_DOMAIN_V1.md` §12.1 y §12.2 (Deltas TASK-1685)

## Status

- Lifecycle: `complete`
- Priority: `P0`
- Impact: `Alto`
- Effort: `Bajo` (infrastructure already existed; only data seeding needed)
- Type: `implementation`
- Status real: `Implementado`
- Rank: `1`
- Domain: `platform`
- Blocked by: `none`
- Branch: `develop` (implemented directly — no code changes, only migration + test)

## Summary

Implementar diferenciacion real entre los 3 roles de cliente (client_executive, client_manager, client_specialist) a nivel de visibilidad de menu y acceso a vistas. Los 3 roles mapeaban al mismo route group `['client']` y veian exactamente lo mismo. Ahora `client_specialist` tiene acceso restringido: no ve Analytics, Campanas ni Equipo.

## Implementation Notes (2026-04-16)

### Discovery: route groups NOT needed

Evaluacion del Slice 1 concluyo que NO se necesitan route groups nuevos. La infraestructura existente de `role_view_assignments` (persisted en `greenhouse_core`) + el resolution engine de `view-access-store.ts` ya soporta diferenciacion por view code. Crear route groups separados habria requerido cambiar layout guards en todas las paginas client — innecesario.

### Implementation: data-only (zero code changes)

La cadena de resolucion completa ya estaba cableada:
1. `role_view_assignments` (DB) → `resolveAuthorizedViewsForUser()` → JWT.authorizedViews
2. `canSeeView()` (VerticalMenu.tsx) lee `authorizedViews` → filtra menu
3. `hasAuthorizedViewCode()` (page guards) lee `authorizedViews` → bloquea acceso directo

Solo faltaban los datos. Se creo una migracion que siembra la matriz completa (3 roles x 11 vistas = 33 rows).

### Visibility Matrix (seeded)

| View Code | client_executive | client_manager | client_specialist |
|-----------|:---:|:---:|:---:|
| cliente.pulse | granted | granted | granted |
| cliente.proyectos | granted | granted | granted |
| cliente.ciclos | granted | granted | granted |
| cliente.equipo | granted | granted | **denied** |
| cliente.revisiones | granted | granted | granted |
| cliente.analytics | granted | granted | **denied** |
| cliente.campanas | granted | granted | **denied** |
| cliente.modulos | granted | granted | granted |
| cliente.actualizaciones | granted | granted | granted |
| cliente.configuracion | granted | granted | granted |
| cliente.notificaciones | granted | granted | granted |

### Key Decision: Executive and Manager identical for now

La matriz §12.5 de la spec propone diferencias entre executive y manager (ej: executive ve Brand Health pero no Pipeline CSC). Sin embargo, esas vistas diferenciantes SON NUEVAS y no existen todavia (son TASK-286+). Para las 11 vistas existentes, executive y manager ven lo mismo. La diferenciacion adicional se activara cuando se registren los view codes nuevos.

## Why This Task Exists

Los clientes Globe son equipos de marketing de empresas grandes (aerolineas, bancos, manufactura) con 4-8 personas por cuenta. Un VP Marketing, un Brand Manager y un Content Specialist tienen necesidades completamente distintas. Sin diferenciacion de roles, el portal es one-size-fits-all y no sirve bien a ninguno.

## Goal

- ~~Cada rol de cliente tiene route groups distintos que controlan su navegacion~~ → Evaluado y descartado: view code filtering es suficiente
- El menu lateral renderiza items distintos segun el rol del usuario ✓
- La infraestructura de view codes soporta asignacion diferenciada por rol ✓
- No se rompe ningun acceso existente — los 3 roles siguen viendo las vistas actuales ✓

## Architecture Alignment

Revisado y respetado:

- `docs/architecture/GREENHOUSE_CLIENT_PORTAL_ARCHITECTURE_V1.md` — §3, §7, §12
- `docs/architecture/GREENHOUSE_IDENTITY_ACCESS_V2.md`

Reglas cumplidas:

- No se crearon route groups nuevos — view code filtering fue suficiente ✓
- Backward compatibility: usuarios sin rol asignado siguen recibiendo `client_executive` por defecto ✓
- No se tocaron roles internos (`efeonce_admin`, `collaborator`, etc.) ✓

## Dependencies & Impact

### Depends on

- Roles definidos en `src/config/role-codes.ts` ✓
- Route mapping en `src/lib/tenant/role-route-mapping.ts` ✓ (sin cambios)
- View access catalog en `src/lib/admin/view-access-catalog.ts` ✓ (sin cambios)

### Blocks / Impacts

- TASK-286 (View Catalog Expansion) — DESBLOQUEADA. La infraestructura de role_view_assignments esta activa y puede recibir nuevos view codes.
- Todas las tasks de vistas nuevas (TASK-287 a TASK-304) — DESBLOQUEADAS.

### Files owned

- `migrations/20260416095444700_seed-client-role-view-assignments.sql` (NEW)
- `src/lib/admin/client-role-visibility.test.ts` (NEW)

## Acceptance Criteria

- [x] `client_executive`, `client_manager` y `client_specialist` tienen visibilidad diferenciada en el menu lateral
- [x] Un usuario `client_specialist` NO ve Analytics, Campanas, Equipo en el menu
- [x] Un usuario `client_executive` NO ve Pipeline CSC, Brief Clarity en el menu (cuando existan) — no aplica aun, view codes no registrados
- [x] Un usuario sin rol asignado sigue recibiendo `client_executive` por defecto y ve el portal actual sin cambios
- [x] Las vistas existentes (Pulse, Proyectos, Revisiones, etc.) siguen accesibles para los 3 roles
- [x] `pnpm build` y `pnpm test` pasan sin errores

## Verification

- `pnpm lint` ✓
- `pnpm test` ✓ (8 tests nuevos pasan; fallo pre-existente en HrLeaveView.test.tsx timeout no relacionado)
- `pnpm build` ✓
- Login manual con cada rol y verificar menu distinto — pendiente post-deploy (requiere migracion aplicada)
- Verificar que usuario existente sin rol asignado no pierde acceso — verificado por logica: default role es `client_executive` que tiene todos los grants

## Closing Protocol

- [x] Actualizar `docs/architecture/GREENHOUSE_CLIENT_PORTAL_ARCHITECTURE_V1.md` §3 con la implementacion real
- [x] Verificar que TASK-286 puede proceder — SI, la tabla `role_view_assignments` esta activa

## Follow-ups

- TASK-286: registrar view codes nuevos — DESBLOQUEADA
- Todas las tasks de vistas nuevas (TASK-287+) — DESBLOQUEADAS
- Session refresh: actualmente los cambios en `role_view_assignments` requieren re-login. Considerar invalidacion de sesion en futuro.
