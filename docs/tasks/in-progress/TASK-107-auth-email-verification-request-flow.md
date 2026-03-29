# TASK-107 — Invitation & Verification: UI, Email Redesign, Verify Flow

## Delta 2026-03-29 (segunda pasada)

- **SSO-aware movido de FU-2 a scope principal**: algunos clientes ya usan Google o Microsoft SSO para iniciar sesión, así que el flujo de invitación debe detectar esto y adaptar el email + accept page.
- Bug encontrado: `POST /api/admin/invite` hardcodea `auth_mode = 'credentials'` para todos — debe detectar si el dominio del email tiene SSO habilitado (`allowed_email_domains`) y setear `auth_mode = 'sso'` en ese caso.

## Delta 2026-03-29

- Scope extendido: además del verify-email request endpoint, ahora incluye:
  - UI de invitación (dialog en Admin Center para invitar colaboradores y clientes)
  - Rediseño del email de invitación al nivel visual de PayrollExportReadyEmail
  - Reenvío y estado visible de invitaciones
  - Página de token expirado
  - Post-activación con auto-login
  - SSO-aware: detección de dominio SSO, email diferenciado, accept page adaptada
  - El backend de invitación (`POST /api/admin/invite`) ya existe y está funcional

## Status

| Campo | Valor |
|-------|-------|
| Lifecycle | `in-progress` |
| Priority | `P1` |
| Impact | `Alto` |
| Effort | `Alto` |
| Status real | `Implementacion` |
| Rank | `—` |
| Domain | `identity` |
| Assigned to | **Claude** |

## Summary

Cerrar el flujo completo de invitación y verificación end-to-end:
1. **UI de invitación** — dialog en Admin Users para invitar colaboradores y clientes
2. **Email de invitación rediseñado** — al nivel visual de PayrollExportReadyEmail
3. **Reenvío de invitación** — botón en tabla de usuarios para pending/expirados
4. **Estado visible de invitación** — fecha de envío, tiempo restante, si expiró
5. **Página de token expirado** — UX dedicada cuando el enlace ya no es válido
6. **Post-activación** — auto-login después de crear password
7. **Diferenciación colaborador/cliente** — campos dinámicos según tipo
8. **Verify-email request endpoint** — endpoint canónico para solicitar verificación de email
9. Prioridad: colaboradores primero, clientes después

## Why This Task Exists

- El backend de invitación existe (`POST /api/admin/invite`) pero **no hay UI** para usarlo — hoy no se puede invitar a nadie desde el portal
- El email de invitación es plano y básico comparado con los emails modernos del sistema (payroll export, receipts)
- El flujo de verify-email está incompleto: existe el consume pero no el sender
- No se puede reenviar una invitación expirada
- No hay feedback cuando un usuario hace click en un enlace expirado
- La activación no logea automáticamente — fricción innecesaria

## Current Repo State

### Ya existe
- `POST /api/admin/invite` — crea usuario + token 72h + envía email
- `POST /api/account/accept-invite` — consume token, activa cuenta
- `GET /api/account/validate-token` — valida token antes de mostrar form
- `/auth/accept-invite` — página para aceptar invitación (crear password)
- `InvitationEmail.tsx` — template básico (necesita rediseño)
- `VerifyEmail.tsx` — template de verificación
- `auth-tokens.ts` — sistema de tokens (invite, verify, reset)
- `sendEmail()` — delivery centralizado con templates
- Admin Users table — muestra status `invited`/`pending` pero sin detalle de fecha o expiración

### Gap actual
- No hay UI/dialog para enviar invitaciones desde Admin Center
- Email de invitación es visualmente inferior a los emails modernos
- No se puede reenviar invitaciones
- No se distingue "invitado hace 1h" de "expirado hace 3 días"
- Token expirado muestra error genérico en vez de página dedicada
- No hay auto-login post-activación
- No existe endpoint sender para verify-email

## Slices — Implementar ahora

### Slice 1 — UI de invitación (Dialog en Admin Users)

| Item | Detalle |
|------|---------|
| Trigger | Botón "Invitar usuario" en la vista de Admin Users (`/admin/users`) |
| Dialog | MUI Dialog con formulario dinámico según tipo |
| Validación | Email required + format, nombre required, space required |
| Submit | POST a `/api/admin/invite` con los campos |
| Feedback | Success: toast + cerrar dialog + refrescar tabla. Error: inline alert |
| Permisos | Solo visible para `efeonce_admin` |

**Campos del formulario:**
1. **Tipo** — Radio group al inicio: "Colaborador Efeonce" / "Cliente externo" (cambia los campos siguientes)
2. **Email** — `CustomTextField`, type email, required
3. **Nombre completo** — `CustomTextField`, required
4. **Space** — `CustomTextField select` con lista de spaces/clients
   - Colaborador: preseleccionar space interno de Efeonce
   - Cliente: lista de spaces clientes activos
5. **Roles** — Chips seleccionables. Defaults:
   - Colaborador: `collaborator` pre-seleccionado
   - Cliente: `client_executive` pre-seleccionado

**Archivo nuevo:** `src/views/greenhouse/admin/users/InviteUserDialog.tsx`

### Slice 2 — Rediseño de InvitationEmail

| Item | Detalle |
|------|---------|
| Patrón | Seguir PayrollExportReadyEmail: overline + heading + body + summary box + hero CTA + metadata |
| Overline | `INVITACIÓN · GREENHOUSE` (11px, uppercase, letter-spacing, muted) |
| Heading | `Bienvenido a Greenhouse` (26px, Poppins 700) |
| Body | Texto contextual: `{inviterName} te invitó a unirte a {clientName} en Efeonce Greenhouse™` |
| Summary box | `#F8FAFC` bg + border, rows: Space, Rol, Invitado por, Válido hasta |
| Hero section | Brand blue `#023c70` box con texto "Activa tu cuenta" + CTA button blanco "Activar mi cuenta" |
| Metadata | `Invitado por {inviterName} · {fecha}` alineado a la derecha |
| Footer | Fallback URL + disclaimer de seguridad |
| Props nuevas | Agregar `roleName`, `expiresAt` al context del template |

**Archivo:** `src/emails/InvitationEmail.tsx`

### Slice 3 — Reenvío de invitación + estado visible

| Item | Detalle |
|------|---------|
| Backend | `POST /api/admin/invite/resend` — recibe `userId`, invalida token anterior, genera nuevo token 72h, reenvía email |
| UI | Botón "Reenviar" en la tabla de Admin Users para usuarios con status `pending`/`invited` |
| Estado visible | En la tabla o en el detalle del usuario, mostrar: fecha de envío, "Expira en Xh" o "Expirado hace Xd" |
| Datos | Leer `created_at` y `expires_at` del último token `invite` del usuario desde `greenhouse_core.auth_tokens` |

**Archivos:**
- `src/app/api/admin/invite/resend/route.ts` (nuevo)
- `src/views/greenhouse/admin/users/` — actualizar tabla/detalle

### Slice 4 — Página de token expirado

| Item | Detalle |
|------|---------|
| Ruta | `/auth/accept-invite` — misma página, pero con estado de error mejorado |
| Detección | `validate-token` ya retorna `{ valid: false }` para tokens expirados |
| UI | En vez de error genérico, mostrar: icono `tabler-clock-off`, "Tu invitación expiró", "Contacta a tu administrador para solicitar una nueva invitación", botón "Ir al login" |
| Diseño | Centrado vertical, card limpia, consistente con la página de login |

**Archivo:** `src/app/(blank-layout-pages)/auth/accept-invite/page.tsx`

### Slice 5 — Post-activación auto-login

| Item | Detalle |
|------|---------|
| Flujo actual | Accept invite → set password → "Cuenta activada" → usuario tiene que ir a login manualmente |
| Flujo nuevo | Accept invite → set password → auto-login via `signIn('credentials', { email, password })` → redirect a landing |
| Implementación | Después de la respuesta exitosa de `/api/account/accept-invite`, llamar `signIn` de `next-auth/react` con las credenciales recién creadas |
| Landing | Colaborador → `/home`, Cliente → su dashboard según `portalHomePath` |

**Archivo:** `src/app/(blank-layout-pages)/auth/accept-invite/page.tsx`

### Slice 6 — SSO-aware invitation flow

| Item | Detalle |
|------|---------|
| Detección | Al invitar, consultar si el dominio del email existe en `allowed_email_domains` de algún client activo en Postgres |
| auth_mode | Si dominio tiene SSO → `auth_mode = 'sso'`. Si no → `auth_mode = 'credentials'`. Si el usuario ya tiene password → `auth_mode = 'both'` |
| Email diferenciado | Si SSO: heading "Accede a Greenhouse", CTA "Iniciar sesion con SSO", texto "Usa tu cuenta corporativa de Google/Microsoft". Si credentials: heading "Bienvenido a Greenhouse", CTA "Activar mi cuenta" |
| Accept page | Si el token es de un usuario SSO (`auth_mode = 'sso'`), no mostrar form de password → mostrar botón "Iniciar sesion con Google/Microsoft" que redirige a `/api/auth/signin` |
| Backend fix | `POST /api/admin/invite` deja de hardcodear `'credentials'` y consulta el dominio |

**Archivos:**
- `src/app/api/admin/invite/route.ts` — detección de SSO domain
- `src/emails/InvitationEmail.tsx` — variante SSO del contenido
- `src/app/(blank-layout-pages)/auth/accept-invite/page.tsx` — variante SSO de accept
- `src/lib/email/templates.ts` — prop `isSso` en el context

### Slice 7 — Verify-email request endpoint

| Item | Detalle |
|------|---------|
| Endpoint | `POST /api/auth/verify-email` |
| Auth | Session required (usuario logueado solicita verificación de su propio email) |
| Lógica | Genera token `verify` 24h, construye `verifyUrl`, envía `verify_email` via `sendEmail()` |
| Rate limit | `checkRateLimit()` — max 3 por hora por email |
| Response | `{ success: true, message: 'Correo de verificacion enviado.' }` |

**Archivo nuevo:** `src/app/api/auth/verify-email/route.ts`

### Slice 8 — Tests

| Item | Detalle |
|------|---------|
| Invite flow | Test del endpoint `/api/admin/invite` (mock de DB + email) |
| SSO detection | Test de detección de dominio SSO en invite endpoint |
| Resend flow | Test del endpoint `/api/admin/invite/resend` |
| Verify request | Test del endpoint `/api/auth/verify-email` |
| Email template | Snapshot test de `InvitationEmail` (variantes credentials y SSO) |

## Follow-up — Documentado para después

Estos items quedan documentados pero fuera del scope de TASK-107. Deben crearse como tasks separadas cuando el flujo base esté cerrado.

### FU-1 — Invitaciones masivas (CSV import)
- **Qué:** Upload CSV con columnas `email, nombre, rol` para invitar múltiples usuarios de una vez
- **Cuándo:** Cuando el equipo crezca a 20+ personas por invitar o al onboardear un cliente grande
- **Dónde:** Nuevo dialog o tab dentro del dialog de invitación
- **Esfuerzo estimado:** Medio

### FU-2 — Notificación al admin cuando la invitación es aceptada
- **Qué:** El admin que invitó recibe un email o notificación in-app cuando el usuario acepta y activa su cuenta
- **Cuándo:** Cuando la capa de notificaciones in-app exista (hoy solo hay email delivery)
- **Dónde:** Hook en `/api/account/accept-invite` que emita un evento `identity.invitation.accepted` al outbox
- **Esfuerzo estimado:** Bajo

### FU-4 — Audit trail de invitaciones
- **Qué:** Ledger persistido de quién invitó a quién, cuándo, si fue aceptada, rechazada o expirada. Hoy `email_deliveries` registra el envío pero no el lifecycle de la invitación
- **Cuándo:** Cuando Admin Center necesite una vista de "historial de invitaciones" separada de la tabla de usuarios
- **Dónde:** Tabla `greenhouse_core.invitation_events` o extensión de `auth_tokens` con status lifecycle
- **Esfuerzo estimado:** Medio

### FU-5 — Revocación de invitación
- **Qué:** Endpoint + botón para cancelar una invitación pendiente (invalida el token, marca el usuario como `revoked`)
- **Cuándo:** Cuando ocurra un caso real de invitación errónea. Hoy el workaround es esperar que expire
- **Dónde:** `DELETE /api/admin/invite/{userId}` + botón en tabla de Admin Users
- **Esfuerzo estimado:** Bajo

### FU-6 — Onboarding post-primera-sesión
- **Qué:** Después de que un nuevo colaborador o cliente haga login por primera vez, guiarlo con un wizard o checklist: completar perfil, ver sus asignaciones, explorar el portal
- **Cuándo:** Cuando el volumen de nuevos usuarios justifique la inversión en onboarding guiado
- **Dónde:** Componente de onboarding montado condicionalmente en el layout si `user.firstLoginAt === null`
- **Esfuerzo estimado:** Alto

## Dependencies & Impact

### Depends on
- `TASK-095` (complete) — capa centralizada de email delivery
- `src/lib/auth-tokens.ts` — token system
- `src/lib/email/delivery.ts` — sendEmail
- `src/emails/constants.ts` — design system de emails

### Impacts to
- `src/views/greenhouse/admin/users/` — dialog + tabla
- `src/emails/InvitationEmail.tsx` — rediseño visual
- `src/lib/email/templates.ts` — update del template context con props nuevas
- `src/app/api/auth/verify-email/route.ts` — nuevo endpoint
- `src/app/api/admin/invite/resend/route.ts` — nuevo endpoint
- `src/app/(blank-layout-pages)/auth/accept-invite/page.tsx` — token expirado + auto-login

### Files owned
- `src/emails/InvitationEmail.tsx`
- `src/app/api/auth/verify-email/route.ts` (nuevo)
- `src/app/api/admin/invite/resend/route.ts` (nuevo)
- `src/views/greenhouse/admin/users/InviteUserDialog.tsx` (nuevo)
- `src/app/(blank-layout-pages)/auth/accept-invite/page.tsx`

## Out of Scope

- Invitaciones masivas (CSV) → FU-1
- Notificación al admin cuando aceptan → FU-2
- Audit trail dedicado → FU-3
- Revocación de invitación → FU-4
- Onboarding post-primera-sesión → FU-5
- Rediseñar la capa de Auth completa
- Analytics de apertura/click en emails

## Acceptance Criteria

- [ ] Botón "Invitar usuario" visible en Admin Users para efeonce_admin
- [ ] Dialog diferencia colaborador/cliente con campos dinámicos
- [ ] Invitación se envía correctamente via API existente
- [ ] Email rediseñado con overline, summary box, hero CTA (nivel PayrollExportReady)
- [ ] Reenvío funcional: nuevo token + nuevo email para usuarios pending/expirados
- [ ] Estado visible: fecha de envío y "expira en Xh" o "expirado" en tabla de usuarios
- [ ] Token expirado muestra página dedicada con mensaje claro y CTA a login
- [ ] Post-activación hace auto-login y redirige a la landing correcta
- [ ] SSO detection: invite con dominio SSO setea `auth_mode = 'sso'` y email muestra CTA de SSO
- [ ] Accept page SSO: muestra botón "Iniciar sesion con SSO" en vez de form de password
- [ ] `POST /api/auth/verify-email` genera token + envía correo con rate limit
- [ ] Tests cubren invite (credentials + SSO), resend y verify flows
- [ ] `pnpm build`, `pnpm lint`, `pnpm exec tsc --noEmit` pasan

## Verification

- `pnpm exec vitest run` sobre tests de auth/email
- `pnpm exec eslint` sobre rutas y helpers tocados
- `pnpm build`
- Test manual: invitar colaborador → recibir email → click link → crear password → auto-login → landing
