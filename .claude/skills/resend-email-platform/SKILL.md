---
name: resend-email-platform
description: Operar Resend como plataforma de correo de Greenhouse — envío, idempotencia, dominios y subdominios, tracking (open/click), webhooks y firma Svix, reintentos y replay, reconciliación de estado, suppression list, entregabilidad, límites y errores. Invócala al tocar `src/lib/email/**`, el handler `/api/webhooks/resend`, la configuración de dominios en Resend, cualquier flujo con bearer/magic link por correo, o al diagnosticar por qué un correo no llegó. Verificada contra docs oficiales as-of 2026-08-19.
---

# Resend — plataforma de correo

Resend es la infraestructura de correo **global** de Greenhouse: no es de Hiring, ni de Growth, ni de
Finance. Un cambio acá los afecta a todos, y esa es la primera cosa que hay que tener presente antes
de tocar nada.

Convención de esta skill: **[DOC]** = documentado por el proveedor · **[INF]** = inferido con la
cadena de evidencia declarada · **[NO-DOC]** = confirmado ausente de la documentación. Cuando algo es
`[NO-DOC]`, la respuesta correcta es verificarlo empíricamente, no completarlo con intuición.

## Los cinco invariantes que más caro cuestan

**NUNCA configures un `tracking_subdomain` en un dominio que emita links con secreto** (magic link,
bearer de acceso, reset de contraseña). Con click tracking activo, Resend **reescribe todos los `<a
href>`**, y lo que le pasa a un fragmento (`#access=TOKEN`) **no está documentado en ninguna parte**
— barrido exhaustivo de docs, blog, changelog y el repo oficial. El modo de falla es **silencioso**:
el link abre, la página carga, y el usuario no tiene acceso. Peor: el `tracking_subdomain`
**no se puede remover, sólo cambiar** [DOC], así que configurarlo es una decisión irreversible.

**El flag basta para que el rewrite ocurra. `tracking_subdomain` NO es un segundo candado.**
Es fácil leer la documentación al revés — yo lo hice el 2026-08-19 y me costó un diagnóstico
equivocado. `tracking_subdomain` sirve para usar un **dominio de tracking propio** (branding y
reputación aislada); sin él, Resend reescribe igual usando su infraestructura compartida.

Evidencia empírica del repo: `efeoncepro.com` tenía `click_tracking=true` y
`tracking_subdomain=None`, y aun así llegaron eventos `email.clicked` **firmados por webhook** sobre
correos reales de candidatos. El rewrite estaba ocurriendo.

Corolario: **para saber si un dominio reescribe links, mira el flag, no el subdominio.** Y si quieres
certeza, busca eventos `clicked` con `event_source='webhook'` — un clic registrado sólo puede existir
si hubo rewrite.

**El readback se hace con `GET /domains/{id}`, nunca con `PATCH` ni con `list`** [DOC]. El `PATCH`
devuelve sólo `{object, id}` — no confirma el estado resultante. El `list` omite los DNS records.

**Verifica el dominio EXACTO del remitente.** Los subdominios son objetos `domain` independientes con
tracking propio. Comprobar `efeoncepro.com` cuando el correo sale de `avisos.efeoncepro.com` da falso
verde.

**Un envío a una dirección suprimida NO falla** [DOC]: devuelve éxito de API y dispara
`email.suppressed`. Si tu lógica de reintento sólo mira 4xx/5xx, nunca se entera de que ese correo
jamás va a llegar, por más que reintentes. La suppression list es **team-wide**: afecta todos los
dominios y subdominios de la cuenta.

## Cómo decidir dónde vive cada correo

Resend **recomienda explícitamente** [DOC] enviar desde subdominio y **no trackear transaccionales**:
*"link tracking and open tracking … can actually hurt your deliverability for transactional emails
like notifications, magic links"*. El mecanismo canónico para tener ambas cosas es **un subdominio
por propósito**, cada uno con su tracking independiente:

| Propósito | Subdominio sugerido | Tracking | Por qué |
|---|---|---|---|
| Transaccional con secreto (assessment, reset, invitación) | `avisos.<dominio>` | **jamás** | El rewrite puede romper el link; el fallo es invisible |
| Transaccional sin secreto (recibos, avisos) | mismo transaccional | apagado | Señal de propósito al inbox provider |
| Marketing / broadcasts | `newsletter.<dominio>` | libre | Su reputación no contamina lo transaccional |

Beneficio adicional y real: si una campaña quema la reputación del subdominio de marketing, el correo
que un candidato *necesita* recibir no se ve afectado.

## Referencias

Cárgalas según lo que estés tocando — no leas todo por defecto:

- `references/tracking-y-dominios.md` — el doble candado, qué pasa (y qué no se sabe) con
  fragmento/query/path, custom tracking domain, API de dominios con payloads, límites por plan.
- `references/webhooks-y-eventos.md` — los 19 tipos de evento con sus shapes, firma Svix, la
  contradicción del retry schedule, replay, y por qué el dedup por `svix-id` puede anular tus replays.
- `references/envio-y-limites.md` — idempotencia (ventana de 24 h), batch, rate limits reales,
  scheduled, headers, catálogo de errores con cuáles son reintentables, planes y retención.

## Sinergias

Esta skill describe **el proveedor**. El comportamiento de Greenhouse encima de él vive en otras:

- **`greenhouse-secret-hygiene`** — `RESEND_WEBHOOK_SIGNING_SECRET` es un secreto de verificación
  *inbound*, separado del `RESEND_API_KEY` *outbound*. Un fallo del observer nunca puede tumbar el
  sender. Publicar como scalar crudo por stdin; nunca serializar la respuesta de la API (trae
  `signing_secret`).
- **`greenhouse-talent-people-operator`** — cualquier correo a un candidato. El acceso a un
  assessment es el caso más sensible: si el link llega roto, el candidato no reclama, se va.
- **`greenhouse-backend`** — el handler del webhook, la máquina de estados del lifecycle y el outbox.
- **`greenhouse-cron-sync-ops`** — lo asíncrono (envío reactivo, reconciliación, retención) corre en
  el **ops-worker**, no en Vercel. Un flag de correo que se prenda sólo en Vercel no hace nada.
- **`greenhouse-production-release`** — cambiar la configuración de un dominio en Resend es una
  mutación de runtime externa: va con evidencia y readback, no dentro del deploy.
- **`greenhouse-qa-release-auditor`** — el smoke del **href recibido** es insustituible y no es
  redundante con el readback de configuración: cubren causas distintas.

Canon del repo: `docs/operations/runbooks/resend-email-lifecycle-rollout.md` ·
`docs/architecture/GREENHOUSE_EMAIL_CATALOG_V1.md` ·
`docs/architecture/GREENHOUSE_WEBHOOKS_ARCHITECTURE_V1.md`.

## Diagnóstico rápido — "el correo no llegó"

En este orden, porque cada paso descarta una clase entera:

1. **¿Está suprimida la dirección?** `GET /suppressions/{email}` (acepta email, no sólo id). Si lo
   está, ningún reintento va a funcionar y el envío devolvió éxito igual.
2. **¿Qué dice el proveedor?** `GET /emails/{id}` → `last_event`. Ojo: es un **escalar**, no un
   historial [DOC]. Da el estado final, no la línea de tiempo.
3. **¿Llegó el evento a nuestro lado?** Si el webhook está caído, el estado local miente por omisión:
   `sent` significa "aceptado para despacho", nunca "entregado".
4. **¿El link estaba entero?** Si el correo llegó y el usuario igual no pudo entrar, sospecha del
   rewrite: revisa `tracking_subdomain` del dominio remitente y el href realmente recibido.

Regla general: **la API converge estado final; el historial sólo existe en tus propios webhooks
almacenados** [DOC]. Si perdiste un evento intermedio, no lo recuperas por API.
