# TASK-2093 — Wireframe: el comprador suma a su comité

> Estado: **propuesta para canvas, sin dirección aprobada.** La dirección visual vigente de Rooms es «La órbita»
> ([dirección visual](../visual-directions/EFEONCE_ROOMS_VISUAL_DIRECTION_V1.md)): Bricolage editorial, Poppins
> funcional, primitivas de `@efeoncepro/axis-ui-primitives/react`. Este wireframe fija regiones, campos, estados y
> copy; la composición final sale del canvas del slice 1 y se registra aquí con sus artboards antes de `UI ready: yes`.
> Contrato de datos: [TASK-2092](../../tasks/to-do/TASK-2092-rooms-buyer-committee-colleague-access.md).

## Superficies

| # | Superficie | Ruta / componente actual | Quién la ve |
|---|---|---|---|
| A | Acción «Sumar a alguien de tu equipo» en la sala | `/rooms/[roomId]/editions/[editionId]`, dentro de `GuestSessionBoundary`, junto a «Salir de la sala» (`session-actions.tsx`) | Invitado con `colleagues.request` |
| B | Hoja para proponer al colega | Diálogo de AXIS (`Dialog`) sobre la sala; hoja inferior en móvil | Invitado |
| C | Resultado de la propuesta | Misma hoja, estado final | Invitado |
| D | Solicitudes de tu cliente | `/rooms/[roomId]/invitations` (`invitation-management.tsx`), bloque nuevo sobre la lista | Equipo con `access.manage` |
| E | Origen en la lista de invitaciones | Fila de invitación existente, insignia «Propuesto por…» | Equipo |
| F | Aviso en la lista de salas | `/rooms` (casa), contador de pendientes por sala | Equipo |

## A · Acción en la sala

```text
┌──────────────────────────────────────────────────────────────────────┐
│ efeonce | Rooms                       [Sumar a alguien de tu equipo] [Salir de la sala] │
├──────────────────────────────────────────────────────────────────────┤
│  (sala: órbita, escenas, lectura)                                    │
│  …                                                                   │
│  ── al final del recorrido ─────────────────────────────────────── │
│  ¿Quién más de tu equipo debería verla?   [Sumar a un colega]        │
└──────────────────────────────────────────────────────────────────────┘
```

- Acción secundaria en el encabezado (variante quieta, no compite con la lectura) y una invitación editorial al
  final del recorrido, que es el momento natural para pensar en el comité.
- Sin la capability, la acción no se renderiza (el servidor decide; la UI recibe `canRequestColleague`).
- Con el tope alcanzado, la acción sigue visible y el diálogo explica que la sala ya tiene 10 colegas.

## B · Hoja para proponer

```text
┌──────────────────────────────────────────────┐
│ Sumar a alguien de tu equipo             (×) │
│ Recibirá su propio enlace y código.          │
│ Tu acceso no se comparte.                    │
│                                              │
│ Correo de tu colega *                        │
│ [ nombre@empresa.cl                       ]  │
│ ¿Por qué debería verla? (opcional)           │
│ [ Aprueba el presupuesto de marketing     ]  │
│   0/200                                      │
│                                              │
│ ⓘ Si es de tu misma empresa (@armor.cl),     │
│   recibe el acceso de inmediato. Si no,      │
│   Efeonce lo revisa antes.                   │
│                                              │
│ [ Enviar invitación ]        [ Cancelar ]    │
└──────────────────────────────────────────────┘
```

Campos: `colleagueEmail` (obligatorio, `type=email`, máx. 320) y `reason` (opcional, máx. 200, contador visible).
La nota de dominio usa el dominio real del invitado, que entrega el servidor (`ownDomain`), nunca lo infiere el
cliente desde un input.

## C · Resultado

| Resultado del servidor | Título | Cuerpo |
|---|---|---|
| `auto_approved` | Listo, ya tiene acceso | Le enviamos a {correo} su enlace y su código. Podrá entrar cuando quiera mientras la sala esté vigente. |
| `pending` | Se lo pedimos a Efeonce | {correo} no es de {dominio}, así que el equipo de Efeonce lo revisará. Le llegará la invitación en cuanto lo aprueben. |
| `quota_exceeded` | Esta sala ya tiene 10 colegas | Para sumar a alguien más, pídeselo a quien te invitó. |
| `conflict` (ya invitado) | Esa persona ya tiene acceso | {correo} ya puede entrar a esta sala. |
| `invalid_input` | Revisa el correo | Escribe un correo válido, distinto del tuyo. |
| error de red / incierto | No pudimos confirmar el envío | Revisa tu conexión y vuelve a intentarlo; no se enviará dos veces. |

## D · Solicitudes de tu cliente (equipo)

```text
Invitaciones a esta sala                                     [Invitar]
┌──────────────────────────────────────────────────────────────────┐
│ Solicitudes de tu cliente (2)                                    │
│ ┌──────────────────────────────────────────────────────────────┐ │
│ │ ana.perez@gmail.com                                          │ │
│ │ Propuesta por juan@armor.cl · hace 2 h                       │ │
│ │ «Es la consultora que nos asesora en marca»                  │ │
│ │ Correo gratuito: revísalo antes de aprobar.                  │ │
│ │                            [Aprobar]  [Rechazar]             │ │
│ └──────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────┘
juan@armor.cl     Activa · Entregada       Vigencia hasta 01-12-2026
ines@armor.cl     Activa · Propuesta por juan@armor.cl (automática)
```

- Razón de revisión visible: «Correo gratuito» u «Otro dominio: {dominio}».
- Aprobar abre confirmación con la vigencia heredada; rechazar pide confirmación y no notifica al colega.
- Vacío: el bloque no aparece si no hay solicitudes.

## E · Origen y revocación

- Insignia «Propuesta por {correo}» y, si fue automática, el sufijo «(automática)».
- Revocar a un invitado que propuso colegas muestra la casilla «Revocar también a sus {n} colegas», desmarcada por
  defecto.

## F · Casa

- En la lista de salas, junto al nombre: «2 solicitudes» como insignia que enlaza a D.

## Estados transversales

| Estado | A/B/C (invitado) | D/E/F (equipo) |
|---|---|---|
| Cargando | botón con «Enviando…», campos bloqueados | lista con esqueleto |
| Sin permiso | acción oculta | bloque oculto |
| Sesión vencida | `GuestSessionBoundary` muestra su estado de sesión terminada | redirección a login (307 existente) |
| Móvil 390 px | hoja inferior a pantalla completa, botones apilados | tarjetas apiladas, botones a ancho completo |
| Teclado | foco al título al abrir, Esc cierra si no hay envío en curso, foco vuelve al botón | orden de tabulación por tarjeta |

## Copy

Nuevo namespace en `src/lib/copy/invitations.ts` de `efeonce-rooms` (`COLLEAGUE_COPY`), tuteo es-CL, sin jerga de
seguridad hacia el comprador. Ids: `requestCta`, `requestEndCta`, `sheetTitle`, `sheetIntro`, `emailLabel`,
`reasonLabel`, `domainNote(domain)`, `send`, `sending`, `resultAuto`, `resultPending`, `resultQuota`,
`resultAlready`, `resultInvalid`, `resultUncertain`, `inboxTitle(count)`, `proposedBy(email)`, `reviewFree`,
`reviewOtherDomain(domain)`, `approve`, `reject`, `revokeColleagues(count)`, `homeBadge(count)`.
