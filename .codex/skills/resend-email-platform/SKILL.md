---
name: resend-email-platform
description: Operar Resend como plataforma de correo de Greenhouse — envío, idempotencia, dominios y subdominios, tracking (open/click), webhooks y firma Svix, reintentos y replay, reconciliación de estado, suppression list, entregabilidad, límites y errores. Invócala al tocar `src/lib/email/**`, el handler `/api/webhooks/resend`, la configuración de dominios en Resend, cualquier flujo con bearer/magic link por correo, o al diagnosticar por qué un correo no llegó. Verificada contra docs oficiales as-of 2026-08-20.
---

# Resend — plataforma de correo

Resend es la infraestructura de correo **global** de Greenhouse: no es de Hiring, ni de Growth, ni de
Finance. Un cambio acá los afecta a todos, y esa es la primera cosa que hay que tener presente antes
de tocar nada.

Convención de esta skill: **[DOC]** = documentado por el proveedor · **[OBS]** = observado en runtime
· **[INF]** = inferido con la cadena de evidencia declarada · **[NO-DOC]** = confirmado ausente de la
documentación. Cuando algo es `[NO-DOC]`, la respuesta correcta es verificarlo empíricamente, no
completarlo con intuición.

## Los seis invariantes que más caro cuestan

**NUNCA configures un `tracking_subdomain` en un dominio que emita links con secreto** (magic link,
bearer de acceso, reset de contraseña). Con click tracking activo, Resend **reescribe todos los `<a
href>`**, y lo que le pasa a un fragmento (`#access=TOKEN`) **no está documentado en ninguna parte**
— barrido exhaustivo de docs, blog, changelog y el repo oficial. El modo de falla es **silencioso**:
el link abre, la página carga, y el usuario no tiene acceso. Peor: el `tracking_subdomain`
**no se puede remover, sólo cambiar** [DOC], así que configurarlo es una decisión irreversible.

**La documentación actual declara un doble candado: flag + tracking subdomain verificado.**
Desde el readback documental del 2026-08-20, el tracking sólo está activo cuando
`open_tracking|click_tracking` está habilitado **y** existe un `tracking_subdomain` verificado.
No obstante, el runtime observado el 2026-08-19 produjo eventos `email.clicked` con
`tracking_subdomain=None`. Esa contradicción se trata como drift, no como permiso para confiar en
un solo campo: en links con secreto, apaga `click_tracking` y prueba el href realmente recibido.

Evidencia empírica del repo: `efeoncepro.com` tenía `click_tracking=true` y
`tracking_subdomain=None`, y aun así llegaron eventos `email.clicked` **firmados por webhook** sobre
correos reales de candidatos. El rewrite estaba ocurriendo.

Corolario: **ningún readback aislado demuestra que un link sensible quedó intacto.** Comprueba flag,
subdominio y DNS en `GET /domains/{id}`; para certeza de comportamiento, usa un correo canary y el
href recibido. Un evento `clicked` firmado demuestra que hubo rewrite.

**El readback se hace con `GET /domains/{id}`, nunca con `PATCH` ni con `list`** [DOC]. El `PATCH`
devuelve sólo `{object, id}` — no confirma el estado resultante. El `list` omite los DNS records.

**Verifica el dominio EXACTO del remitente.** Los subdominios son objetos `domain` independientes con
tracking propio. Comprobar `efeoncepro.com` cuando el correo sale de `avisos.efeoncepro.com` da falso
verde.

**`RESEND_API_KEY_SECRET_REF` declarado NO es la API key disponible.** El envío pasa por el cliente
**síncrono** `getResendClient()` (`src/lib/resend.ts`), que lee `process.env.RESEND_API_KEY` o una
resolución ya cacheada; el carril `*_SECRET_REF` lo puebla sólo el resolvedor **asíncrono**, y en un
runtime nuevo nadie lo precalienta antes del primer envío. En Cloud Run el secreto hay que **montarlo**
(`--update-secrets RESEND_API_KEY=<ref>`), como hace `services/ops-worker/deploy.sh`. Caso fuente
2026-09-05: el auth-server declaraba el ref y tenía su binding IAM, y el magic link de producción
llevaba días fallando con `RESEND_API_KEY is not configured` — un fallo que no es del proveedor y que
ningún readback contra Resend puede ver.

**Un envío a una dirección suprimida puede quedar aceptado sin entrega** [OBS]: Greenhouse observó
un ID de proveedor seguido de `email.suppressed`; la documentación confirma que Resend omite el
despacho. Si tu lógica sólo mira 4xx/5xx, nunca se entera de que ese correo no llegará. La
suppression list es **team-wide**: afecta todos sus dominios y subdominios.

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

0. **¿El runtime tenía la API key?** Antes de mirar al proveedor, lee la fila de
   `greenhouse_notifications.email_deliveries`: un `status=failed` con `RESEND_API_KEY is not
   configured` significa que el correo nunca salió y no hay nada que diagnosticar en Resend. Esa fila
   —`status`, `provider_status`, `error_message`— es la única evidencia observable del envío; el 2xx del
   endpoint que lo dispara no prueba nada, y menos si es indistinguible por diseño (magic link: 202
   idéntico exista o no la cuenta).
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
