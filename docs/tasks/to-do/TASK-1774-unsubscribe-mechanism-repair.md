# TASK-1774 — Reparación del mecanismo de baja de correo

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
- Execution profile: `backend-data`
- UI impact: `none`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `api|command`
- Epic: `EPIC-042`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `platform|content`
- Blocked by: `none`
- Branch: `Greenhouse develop; shared checkout; sin worktrees ni ramas por task`
- Legacy ID: `none`
- GitHub Issue: `none`

> Nota UI: la task devuelve una confirmación mínima autocontenida desde el route handler para una
> persona externa que no tiene sesión. No introduce ruta del portal, primitive, layout ni consumo del
> design system, por eso `UI impact: none`. La superficie gobernada de preferencias por tipo —la página
> con toggles que `TASK-269` planeó y no entregó— es un carril `ui-ux` propio de `EPIC-042` con su
> wireframe, declarado en Out of Scope y en Follow-ups. Escribir esa página acá sería repetir el error
> que originó el defecto: mezclarla con el mecanismo y dejarla sin entregar.

## Summary

Hoy nadie puede darse de baja de un correo de Greenhouse: el enlace del pie responde `405`, el botón
nativo de Gmail responde `500` y un `POST` bien formado responde `400`. La task repara las tres capas,
deja de emitir tokens de baja para tipos que no exponen el control, y verifica con un clic real desde
una bandeja real.

## Why This Task Exists

`ISSUE-163`. El defecto no es una regresión: `TASK-269` diseñó la capacidad y cerró `complete` con su
criterio del endpoint sin marcar y sin la página de preferencias que su Slice planeaba. Quedó un
endpoint que sólo acepta `POST` con los parámetros en el body, mientras el correo manda un enlace `GET`
con los parámetros en el query, y un header `List-Unsubscribe-Post` que promete aceptar
`application/x-www-form-urlencoded` sin que el handler lo parsee.

Tres consecuencias que no se compensan entre sí. **Cumplimiento:** `payroll_export` resuelve sus
destinatarios desde `email_subscriptions`, o sea una lista real sin salida real. **Entregabilidad:** un
`List-Unsubscribe` que responde `500` al one-click de Gmail es peor que no declararlo — el proveedor lo
lee como remitente que incumple su propio contrato y empuja al usuario a marcar spam. **Programa:**
`EPIC-042` no puede declarar `unsubscribePolicy='required'` en ninguna cohorte mientras el control sea
inerte, y `TASK-1397` (Career Alerts) sería la primera suscripción opt-in real del sistema construida
sobre esta primitiva.

## Goal

- Que una persona pueda darse de baja por los dos caminos reales: el enlace del pie y el botón nativo
  del cliente de correo.
- Que Greenhouse deje de emitir y persistir credenciales de baja para tipos que no exponen el control.
- Que el mecanismo tenga un solo decisor sobre quién lleva el control, en custodia temporal hasta que
  el registro de policy de `EPIC-042` lo absorba.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_EMAIL_CATALOG_V1.md`
- `docs/architecture/GREENHOUSE_EMAIL_PRESENTATION_POLICY_DECISION_V1.md` (§`Delta 2026-08-24` D1 y D2)
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md`
- `docs/epics/to-do/EPIC-042-efeonce-governed-email-presentation-program.md`
- `docs/operations/MODULAR_MIGRATION_NEW_WORK_OPERATING_MODEL_V1.md`

Reglas obligatorias:

- **El `GET` NO muta estado.** Los clientes de correo y los escáneres de seguridad corporativos
  prefetchean enlaces; un `GET` que da de baja permite que un escáner desuscriba a alguien que nunca
  hizo clic. El `GET` presenta la confirmación; la mutación ocurre en el `POST`.
- **El one-click de RFC 8058 sí muta sin confirmación, y así debe ser.** Es el contrato del estándar y
  lo dispara una acción deliberada del usuario en su cliente. No pedirle confirmación adicional.
- **Idempotencia obligatoria.** Reintentar la misma baja no puede responder `500`. Gmail reintenta.
- **Ningún error crudo al destinatario.** Contrato canónico `canonicalErrorResponse`; un token vencido
  explica qué pasó y qué hacer, no devuelve `400` pelado.
- **No crear un cuarto decisor de unsubscribe.** Hoy hay tres (`EMAIL_PRIORITY_MAP`, la lista
  `BROADCAST_EMAIL_TYPES` y la rama batch/secuencial). Esta task **reduce** a uno en custodia temporal;
  el registro de policy de `EPIC-042` lo absorbe después. Cualquier constante nueva se declara temporal
  con su condición de retiro.
- **No tocar el default `?? 'broadcast'` de `delivery.ts`.** Es fail-open y hay que matarlo, pero su
  dueño es el registro de policy: corregirlo acá sin el registro deja el sistema sin decisor.
- Nunca loggear el token de baja ni el correo completo del destinatario en claro.

## Normative Docs

- `docs/issues/open/ISSUE-163-unsubscribe-mechanism-not-actionable.md`
- `docs/tasks/complete/TASK-269-email-delivery-enterprise-hardening.md` (origen documental)
- `docs/tasks/to-do/TASK-1764-governed-email-footer-profile-migration.md`
- `docs/tasks/to-do/TASK-1397-careers-talent-alerts-foundation.md`
- `src/lib/email/unsubscribe.ts`
- `src/lib/email/subscriptions.ts`
- `src/app/api/account/email-preferences/route.ts`
- `src/lib/api/canonical-error-response.ts`
- RFC 8058 — One-Click Unsubscribe: https://www.rfc-editor.org/rfc/rfc8058

## Dependencies & Impact

### Depends on

- `email_subscriptions` y `auth_tokens` existentes; ninguna migración nueva.
- `generateToken`/`validateToken` de `src/lib/auth-tokens.ts` como emisor y validador vigente.
- `EmailLayout` sigue renderizando el enlace sólo cuando el template pasa `unsubscribeUrl`; esta task
  no cambia qué templates lo pasan.

### Blocks / Impacts

- **Bloquea a `EPIC-042`**: ninguna cohorte declara `unsubscribePolicy='required'` antes de este cierre.
- **Desbloquea a `TASK-1397`** (Career Alerts): su `Blocked by: none` es incorrecto hoy y su supuesto de
  que existe «signed opt-out» es falso en la mitad de la cadena.
- Impacta a `TASK-993` (correo de payment run de contractors), que depende de las mismas primitivas.
- Cierra `ISSUE-163`.

### Files owned

- `src/app/api/account/email-preferences/route.ts`
- `src/lib/email/unsubscribe.ts`
- `src/lib/email/delivery.ts` — **sólo** el punto de emisión del token y del header; no la resolución de
  prioridad ni el carril batch
- `docs/issues/open/ISSUE-163-unsubscribe-mechanism-not-actionable.md`
- `docs/tasks/to-do/TASK-1774-unsubscribe-mechanism-repair.md`

## Current Repo State

### Already exists

- `generateUnsubscribeUrl` compone la URL firmada y persiste el token con TTL de 30 días.
- `email_subscriptions` con soft-delete (`removeSubscriber` hace `SET active = FALSE`), más lectores en
  admin, GDPR y desactivación por bounce.
- `EmailLayout` renderiza el enlace cuando recibe `unsubscribeUrl`; hoy lo reciben `notification`,
  `payroll_export` y `weekly_executive_digest`.
- `canonicalErrorResponse` + `CanonicalErrorCode` como contrato de error client-facing.

### Gap

- El handler no acepta `GET` ni `application/x-www-form-urlencoded`, y lee `action`/`emailType` sólo del
  body mientras la URL los lleva en el query.
- No existe superficie que consuma el token: el endpoint no tiene ningún consumer en `src/`.
- `payroll_receipt` está en `BROADCAST_EMAIL_TYPES` y no renderiza el enlace, pero igual emite y
  persiste un token de 30 días y manda el header.
- No hay idempotencia declarada ni señal que cuente intentos de baja fallidos.

## Modular Placement Contract

- Topology impact: `api`
- Current home: `src/app/api/account/email-preferences/route.ts` y `src/lib/email/**` en el runtime compartido
- Future candidate home: `remain-shared`
- Boundary: el handler es el único mutador de `email_subscriptions` por token; `unsubscribe.ts` es el
  único emisor de la URL firmada; los templates nunca componen la URL
- Server/browser split: `server-only`; el token se valida en el servidor y nunca cruza al cliente
- Build impact: `none`
- Extraction blocker: `none`

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-standard`
- Impacto principal: `api`
- Source of truth afectado: `greenhouse_notifications.email_subscriptions` (estado de suscripción) y
  `auth_tokens` (credencial de baja)
- Consumidores afectados: destinatarios externos e internos vía cliente de correo; admin de
  suscripciones; el carril de bounce/complaint que ya desactiva filas
- Runtime target: `staging` primero, luego `production`; el endpoint vive en Vercel

### Contract surface

- Contrato existente a respetar: `POST /api/account/email-preferences` con `{action, emailType, token}`
  en el body y modo sesión; `canonicalErrorResponse` para todo error client-facing
- Contrato nuevo o modificado: `GET` (presenta confirmación, no muta) y `POST` que además acepta
  `application/x-www-form-urlencoded` y lee `action`/`emailType` del query cuando faltan en el body
- Backward compatibility: `compatible` — el `POST` con JSON y body completo sigue funcionando igual
- Full API parity: la baja es un command server-side (`removeSubscriber`) consumido por el handler; el
  correo es un cliente más y no reimplementa la lógica

### Data model and invariants

- Entidades/tablas/views afectadas: `greenhouse_notifications.email_subscriptions`, `auth_tokens`
- Invariantes que no se pueden romper:
  - Un `GET` nunca cambia `active` en `email_subscriptions`.
  - Reintentar la misma baja es idempotente y responde `2xx`.
  - Un tipo que no renderiza el enlace no genera fila en `auth_tokens` con `token_type='unsubscribe'`.
  - La baja por token afecta únicamente al correo que el token identifica.
- Write-target allowlist: `N/A` — el dominio email no tiene boundary test de destinos de escritura
- Tenant/space boundary: el token identifica al destinatario por correo; no hay derivación de tenant y
  no debe introducirse una
- Idempotency/concurrency: la baja es idempotente por naturaleza (`SET active = FALSE` sobre una fila ya
  inactiva no es error); declarar el comportamiento explícito en vez de dejarlo implícito
- Audit/outbox/history: reutilizar el ledger de entrega existente; no crear tabla de auditoría nueva

### Migration, backfill and rollout

- Migration posture: `none`
- Default state: `enabled with rationale` — el estado actual es `405`/`500`; cualquier respuesta
  funcional es estrictamente mejor y no hay comportamiento previo que preservar
- Backfill plan: `N/A`. Los tokens huérfanos de `payroll_receipt` vencen solos en 30 días; no se purgan
  como parte de esta task para no tocar `auth_tokens` de otros tipos
- Rollback path: `revert PR + redeploy`
- External coordination: ninguna. No hay secretos, env vars ni configuración de proveedor nueva

### Security and access

- Auth/access gate: token firmado con TTL, o sesión activa. **No introducir un tercer modo.**
- Sensitive data posture: el token es credencial — nunca en logs, nunca en el cuerpo de la respuesta,
  nunca en un mensaje de error
- Error contract: `canonicalErrorResponse` con códigos propios para token inválido y token vencido; el
  prose es es-CL y en-US según el idioma del destinatario cuando esté disponible
- Abuse/rate-limit posture: el token acota el abuso a un correo y una ventana de 30 días. Declarar si el
  `GET` necesita rate-limit o no, con razón; no dejarlo implícito

### Runtime evidence

- Local checks: tests del handler cubriendo los tres caminos (`GET`, one-click `form-urlencoded`, `POST`
  JSON), token inválido, token vencido y reintento idempotente
- DB/runtime checks: `SELECT active FROM greenhouse_notifications.email_subscriptions` antes y después;
  `SELECT count(*) FROM auth_tokens WHERE token_type='unsubscribe'` para confirmar que `payroll_receipt`
  deja de generar filas
- Integration checks: clic real desde Gmail y desde Outlook Web sobre un correo de `notification`, más
  el botón nativo «Cancelar suscripción» de Gmail
- Reliability signals/logs: contador de intentos de baja fallidos; hoy no existe y sin él el defecto
  volvería a ser invisible
- Production verification sequence: ver `## Rollout Plan & Risk Matrix`

### Acceptance criteria additions

- [ ] Source of truth, contract surface and consumers are named with real paths or objects.
- [ ] Data invariants, tenant/access boundary and idempotency/concurrency posture are explicit.
- [ ] Migration/backfill/rollback posture is explicit and proportional to risk.
- [ ] Runtime or DB evidence is listed for any change beyond docs/tooling.
- [ ] Sensitive domains have canonical errors, audit/signal posture and no raw data leaks.

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

### Slice 1 — El one-click de Gmail deja de responder 500

- El handler acepta `application/x-www-form-urlencoded` además de JSON, y trata el body
  `List-Unsubscribe=One-Click` de RFC 8058 como una baja válida.
- `action` y `emailType` se leen del query string cuando no vienen en el body, que es como los manda la
  URL que el correo ya está distribuyendo.
- La baja es idempotente: repetirla responde `2xx`, no `500`.
- Errores por `canonicalErrorResponse`, con códigos propios para token inválido y token vencido.

### Slice 2 — El clic humano funciona y no lo dispara un escáner

- `GET` responde una confirmación mínima autocontenida con un botón que hace `POST`. **No muta.**
- La confirmación nombra el tipo de correo del que se está dando de baja y respeta el idioma del
  destinatario cuando el contexto lo permite.
- Token inválido o vencido rinde una explicación honesta y una salida (a quién escribir), no un error
  crudo ni una página en blanco.

### Slice 3 — Dejar de emitir credenciales que nadie puede usar

- La emisión del token y del header deja de depender de `BROADCAST_EMAIL_TYPES` y pasa a depender de un
  único origen declarado, alineado con qué templates realmente pasan `unsubscribeUrl`.
- Ese origen se declara **temporal**, con su condición de retiro escrita: lo absorbe el registro de
  policy de `EPIC-042`, cuyo test de coherencia romperá el build si divergen.
- `payroll_receipt` deja de generar filas en `auth_tokens`.

### Slice 4 — Señal y evidencia runtime

- Contador de intentos de baja fallidos, para que este defecto no pueda volver a ser invisible.
- Evidencia de clic real desde Gmail y Outlook Web, con readback en base antes y después.

## Out of Scope

- **La superficie gobernada de preferencias por tipo.** La página con toggles que `TASK-269` planeó es
  carril `ui-ux` propio de `EPIC-042`, con wireframe. Esta task entrega el mecanismo, no el portal de
  preferencias.
- **El default `?? 'broadcast'` y los tres decisores.** Su dueño es el registro de policy de
  `EPIC-042`; corregirlos acá dejaría el sistema sin decisor durante la ventana.
- **El rediseño del pie y los perfiles de presentación** — `TASK-1764`.
- **Las cadenas de marca** — `TASK-1274`.
- **La consolidación de `notification_preferences` con `email_subscriptions`**, follow-up abierto de
  `TASK-269`.
- Purgar los tokens huérfanos ya emitidos: vencen solos en 30 días.

## Detailed Spec

El detalle de las tres capas rotas, con su evidencia `file:line`, vive en `ISSUE-163` y no se duplica
acá. Lo que esta sección fija es la forma de la solución.

**Por qué `GET` no muta.** Es la decisión de diseño load-bearing de la task. Los clientes de correo
corporativos y los escáneres de seguridad prefetchean los enlaces de un mensaje antes de que el usuario
los toque. Un `GET` que da de baja convierte ese prefetch en una baja involuntaria, y el destinatario se
entera cuando deja de recibir algo que sí quería. La confirmación intermedia cuesta un clic y elimina la
clase entera.

**Por qué el one-click sí muta sin confirmación.** RFC 8058 existe precisamente para eso: el usuario ya
expresó la intención en la interfaz de su cliente de correo, y el estándar exige que el `POST` complete
la baja sin interacción adicional. Pedirle confirmación rompería el contrato con Gmail y Yahoo, que es
lo que hoy está roto por otra vía.

**Custodia temporal del decisor.** La task no puede crear el registro de policy —ese es el trabajo de la
foundation de `EPIC-042`— pero tampoco puede dejar tres decisores en pie. La salida es un único origen
declarado y marcado como temporal, con su condición de retiro escrita en el propio código.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 (one-click) va primero: es el camino que **hoy está fallando activamente** contra Gmail y
  Yahoo, y cada envío que sale sigue prometiendo un contrato que no cumplimos.
- Slice 2 (clic humano) depende de Slice 1 por el parser compartido de body/query.
- Slice 3 (emisión) puede correr en paralelo con Slice 2; no comparte código con el handler.
- Slice 4 (señal + evidencia) cierra, y su evidencia sólo es válida con 1 y 2 en pie.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Un escáner de enlaces del cliente de correo da de baja a alguien que nunca hizo clic | delivery | high | el `GET` no muta; la mutación exige `POST` | bajas sin `POST` correlacionado en el ledger |
| El parser nuevo rompe el `POST` JSON que ya funciona en modo sesión | api | medium | tests de los tres caminos antes de tocar el handler; backward compatibility declarada | `400` en el toggle con sesión |
| Se crea un cuarto decisor de unsubscribe al tocar la emisión | delivery | medium | origen único declarado temporal + condición de retiro escrita; test de coherencia en la foundation de `EPIC-042` | un tipo emite token sin renderizar el enlace, o al revés |
| Gmail reintenta el one-click y la baja no es idempotente | delivery | medium | idempotencia explícita y testeada | `500` en el endpoint tras un `2xx` previo del mismo token |
| El token o el correo aparecen en logs al agregar observabilidad | seguridad | low | la señal cuenta intentos, no registra credenciales | token visible en Sentry o en logs de Vercel |

### Feature flags / cutover

Sin flag — el estado actual del endpoint es `405`/`500`, así que no hay comportamiento previo que
preservar ni cohorte que graduar. El cutover es inmediato y el revert es `revert PR + redeploy`.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | revert PR + redeploy; se vuelve al `500` actual | un release | sí |
| Slice 2 | revert PR + redeploy; se vuelve al `405` actual | un release | sí |
| Slice 3 | revert PR; los tokens vuelven a emitirse como hoy | un release | sí |
| Slice 4 | revert PR; se pierde la señal, no el mecanismo | un release | sí |

### Production verification sequence

1. Desplegar a staging y ejercitar los tres caminos con `curl`: `GET`, `POST` form-urlencoded con
   `List-Unsubscribe=One-Click`, y `POST` JSON con sesión.
2. Verificar en base que sólo el `POST` cambió `active`, y que el `GET` no tocó nada.
3. Repetir la baja con el mismo token: debe responder `2xx`.
4. Enviar un correo de `notification` a una casilla Gmail real y a una Outlook Web real desde staging.
   Hacer clic en el enlace del pie, confirmar, y verificar el readback en base.
5. Usar el botón nativo «Cancelar suscripción» de Gmail sobre el mismo correo y verificar el readback.
6. Confirmar que `payroll_receipt` dejó de generar filas en `auth_tokens`.
7. Repetir 1–6 en producción.
8. Observar la señal de intentos fallidos durante 7 días.

### Out-of-band coordination required

Se necesitan dos casillas reales de prueba —una Gmail y una Outlook Web— para ejercitar el botón nativo,
que no se puede simular con `curl`. Coordinar con el operador antes del paso 4.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Un clic humano en el enlace del pie presenta una confirmación y, al confirmarla, la baja ocurre.
- [ ] El `GET` no cambia `active` en `email_subscriptions` bajo ninguna circunstancia.
- [ ] El botón nativo «Cancelar suscripción» de Gmail responde `2xx` y la fila queda `active = FALSE`.
- [ ] El `POST` JSON en modo sesión sigue funcionando exactamente como antes.
- [ ] Reintentar la misma baja responde `2xx`; no existe camino que devuelva `500` por repetición.
- [ ] Un token inválido o vencido rinde una explicación honesta y una salida, no un error crudo.
- [ ] `payroll_receipt` no genera filas en `auth_tokens` con `token_type='unsubscribe'`.
- [ ] La emisión del token y del header tiene un único origen declarado, marcado temporal y con su
      condición de retiro escrita en el código.
- [ ] Existe una señal que cuenta intentos de baja fallidos.
- [ ] Ni el token ni el correo del destinatario aparecen en logs, respuestas ni Sentry.
- [ ] Hay evidencia de clic real desde Gmail y desde Outlook Web, con readback en base antes y después.
- [ ] `ISSUE-163` queda movido a `resolved/` con la verificación registrada.

## Verification

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm task:lint --task TASK-1774`
- `pnpm ops:lint --changed`
- Ejercicio manual de los tres caminos contra staging, y clic real desde Gmail y Outlook Web.

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas
- [ ] `ISSUE-163` movido a `resolved/` y el tracker actualizado en el mismo lote

## Follow-ups

- Carril `ui-ux` de `EPIC-042` para la superficie gobernada de preferencias por tipo, con su wireframe.
  Es la pieza que `TASK-269` planeó y no entregó; sin dueño explícito vuelve a perderse.
- El registro de policy de `EPIC-042` absorbe el origen temporal de esta task y mata el default
  `?? 'broadcast'`.
- Consolidación de `notification_preferences` con `email_subscriptions`, follow-up heredado de `TASK-269`.

## Open Questions

- ¿El `GET` necesita rate-limit propio, o el TTL del token acota suficiente el abuso? Resolver con razón
  escrita, no por omisión.
- ¿La confirmación debe ofrecer «me equivoqué, quiero seguir recibiendo» en el mismo paso, o eso ya es
  la superficie de preferencias y pertenece al carril `ui-ux`?
