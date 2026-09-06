# TASK-1842 — Flow: credenciales de la persona en Efeonce ID

> **Flujo maestro del programa:** `docs/ui/flows/EPIC-044-auth-server-login-consent-UI-FLOW.md`.
> Esta superficie es un **nodo nuevo** de ese flujo: hoy S0–S10 no tiene ninguno para la gestión de
> credenciales de la persona, y esa ausencia es la razón por la que la capacidad quedó sin dueño.
> La task registra el nodo (propuesto `S11 · Credenciales de la persona`) al implementarla.

## Dónde entra en el recorrido

El recorrido externo de EPIC-044 es: invitación → correo → aceptar → magic link → sesión →
`/oauth/authorize` → consentimiento → vuelta a la aplicación. Ese recorrido **crea sesión** pero
nunca ofrece dejar de depender del correo. Esta pantalla es el único punto donde la persona
convierte una sesión existente en una forma de volver a entrar.

| Nodo | Entrada | Salida |
|---|---|---|
| Desde la sesión (`GET /auth/session` HTML) | enlace «Tus formas de entrar» | `/account/credentials` |
| Tras entrar por magic link sin `return_to` | la pantalla de sesión iniciada ofrece el enlace | `/account/credentials` |
| Desde `/login` | **no**: sin sesión no hay alta posible (`register/*` la exige) | — |

**Regla dura del recorrido:** el alta **nunca** se ofrece dentro de `/oauth/authorize` ni del
step-up. Interrumpir una autorización en curso para configurar credenciales es exactamente lo que
hace hoy el step-up con el TOTP, y es la fricción que esta task no debe replicar.

## Recorridos

1. **Primera passkey.** Sesión activa → `/account/credentials` (estado vacío) → «Agregar una
   passkey» → ceremonia WebAuthn → la lista pasa de vacía a una fila → confirmación en `role=status`.
   Desde la próxima entrada, `/login` ofrece un camino que funciona.
2. **Ceremonia fallida o cancelada.** Mensaje **con** reintento; la lista no cambia.
3. **Navegador sin WebAuthn.** El CTA no se renderiza y se explica; el correo sigue disponible. Sin
   reintento: el obstáculo es el dispositivo, no la ceremonia.
4. **Retiro.** «Retirar» → confirmación que **nombra el dispositivo** → la fila desaparece. Si era la
   última, la confirmación dice antes que volverá a depender del correo.
5. **Tope alcanzado.** El alta se deshabilita **con su razón visible**, no desaparece.

## Contrato con el backend

- `GET /auth/passkeys` — reader existente; devuelve `credentialId`, `deviceName`, `deviceType`,
  `backedUp`, `createdAt`, `lastUsedAt` y el tope.
- `POST /auth/passkeys/register/{start,finish}` — existentes; exigen sesión y validan mismo origen.
- Retiro por credencial — **[verificar]**: `revokePersonAuthState` es corte de emergencia por admin,
  no autoservicio. Si no existe un command per-credencial, es la única pieza backend de esta task y
  nace con audit; nunca se retira una credencial por SQL ni desde la UI sin command.
- La UI **no** decide autoridad: sólo consume la sesión `__Host-efeonce_auth` ya resuelta.

## Full API parity

Toda acción visible existe primero como contrato programático: el alta y el listado ya lo son; el
retiro se agrega como command canónico y la pantalla es un consumer más, igual que lo sería Nexa o un
CLI. Ninguna lógica de negocio vive en el HTML.

## Motion

Reutiliza el motion del shell (entrada de la tarjeta por tokens del SSOT). La ceremonia se comunica
por **texto** en una región viva, nunca sólo por animación; con `prefers-reduced-motion` el
significado final es idéntico. Sin motion propio → esta task no abre contrato de motion.

## Accesibilidad del recorrido

Foco inicial en el título, nunca en un control destructivo. El retiro nombra su dispositivo en el
`aria-label` (si no, se anuncia «Retirar» N veces idénticas). Una sola región viva. El recorrido
completo se hace por teclado, incluida la confirmación de retiro.
