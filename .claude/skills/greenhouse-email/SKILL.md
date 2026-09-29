---
name: greenhouse-email
description: Crear, modificar y validar templates React Email operados por Greenhouse para comunicaciones Efeonce, su presentación gobernada, registro, copy, previews y conexión con la entrega canónica. Usar para correos transaccionales o broadcast, perfiles de footer y hero images; usar resend-email-platform, no esta skill, para dominios, tracking, webhooks, suppressions o diagnóstico del proveedor.
---

# Greenhouse Email

Construye correos de Greenhouse sobre el catálogo y la entrega existentes. La unidad de trabajo no es solo el
componente visual: incluye tipo, prioridad, destinatario, consentimiento, trigger, contexto, plain text, preview,
dedupe, runtime consumidor y evidencia proporcional.

## Primera lectura

Lee solo lo que el cambio necesita:

- `docs/architecture/GREENHOUSE_EMAIL_CATALOG_V1.md` para catálogo, arquitectura y estado operativo.
- `src/lib/email/types.ts`, `templates.ts`, `delivery.ts`, `tokens.ts` y `context-resolver.ts` para el contrato real.
- `src/emails/components/EmailLayout.tsx`, `EmailButton.tsx` y `src/emails/constants.ts` para primitives y tokens.
- `docs/architecture/GREENHOUSE_EMAIL_PRESENTATION_POLICY_DECISION_V1.md`, `EPIC-042`, `TASK-1764` y
  [references/footer-presentation.md](references/footer-presentation.md) cuando cambien marca, firma, footer,
  identidad legal, RRSS, preferencias o unsubscribe. El mockup aprobado vive en
  `/admin/emails/footer-profiles/mockup`; es referencia visual, no runtime productivo. La firma de correo
  personal de Outlook (v3.1) no pertenece a esta skill: ver `EFEONCE_GRAPHIC_LINE_V1.md` §10.2.
- Los **módulos de correo de Efeonce** canonizados en AXIS (pie, CTA principal, tarjeta de agenda, bloque de marca;
  2026-09-29, sin adoptar en Greenhouse) cuando el correo sea de Efeonce o de un producto suyo: sección «Delta
  2026-09-29» abajo y [references/footer-presentation.md](references/footer-presentation.md) §«Módulos canónicos».
- `resend-email-platform` cuando cambien provider, dominio, tracking, webhook, suppression, retry o entregabilidad.
- `greenhouse-ai-image-generator` y
  `docs/architecture/creative-studio/OPENAI_GPT_IMAGE_PROVIDER_CAPABILITY_MATRIX_V1.md` cuando el correo necesite
  un visual generado. Lee además [references/ai-visuals.md](references/ai-visuals.md).
- La arquitectura y skill del dominio dueño —Hiring, Payroll, Finance, Growth, etc.— antes de cablear el trigger.

## Frontera de autorización

Esta skill autoriza trabajo local sobre templates y documentación dentro del alcance pedido. No autoriza enviar
correos reales, agregar destinatarios, habilitar tipos, cambiar tracking, subir assets a producción, desplegar
Vercel/Cloud Run ni promover flags. Esas acciones requieren aprobación explícita y su skill operativa.

## Arquitectura vigente

| Responsabilidad                 | Fuente canónica                                       |
| ------------------------------- | ----------------------------------------------------- |
| Componentes                     | `src/emails/*.tsx`                                    |
| Layout, botón y tokens          | `src/emails/components/*` + `src/emails/constants.ts` |
| Tipos, prioridad y sensibilidad | `src/lib/email/types.ts`                              |
| Registro y preview              | `src/lib/email/templates.ts`                          |
| Entrega                         | `src/lib/email/delivery.ts` → `sendEmail()`           |
| Contexto runtime                | `src/lib/email/context-resolver.ts` + `tokens.ts`     |
| Provider                        | Resend mediante la capa centralizada                  |
| Historial/retry                 | `greenhouse_notifications.email_deliveries`           |
| Assets públicos                 | `GREENHOUSE_PUBLIC_MEDIA_BUCKET`                      |

No inventes un sender, cliente Resend, endpoint de envío ni registry paralelo.

## Flujo de implementación

1. Define propósito, dominio, trigger exacto, audiencia, prioridad y si el correo contiene credencial o dato
   sensible. Confirma que el evento merece email y no una superficie interna.
2. Busca un template, bloque de copy, primitive, email type y caller reutilizable antes de agregar piezas.
3. Extiende `EmailType` y sus sets/mapas relacionados solo cuando corresponda. La marca, prioridad,
   token-sensitivity, reply-to y broadcast son contratos independientes. **`EmailType` no es una etiqueta
   descriptiva: es el discriminante por el que el sistema ramifica** —kill-switch por tipo en
   `email_type_config`, perfil de footer y selector del caller—, así que una variante que deba poder pausarse
   sin silenciar a su vecina (un envío masivo frente al individual) necesita tipo propio. Reusar el del
   vecino deja las dos bajo el mismo interruptor y firma en el log append-only un hecho falso sobre la
   persona. El dedupe **no** es argumento: se resuelve por `source_event_id + source_entity +
   recipient_email`, no por tipo. Un tipo nuevo nace con su fila de `email_type_config` (seed de migración,
   normalmente `enabled=false`) y su perfil de footer declarado; sin el perfil cae al legacy en silencio.
4. Clasifica la presentación por `EmailType`; si el trabajo toca footer, aplica la policy y el rollout de
   [references/footer-presentation.md](references/footer-presentation.md). Nunca infieras unsubscribe o RRSS desde
   `EmailPriority`.
5. Crea o modifica un componente puro de React Email. Usa `EmailLayout`, `EmailButton`, tokens compartidos,
   estilos inline y el diccionario canónico `src/lib/copy/*/emails.ts` para copy reutilizable.
6. Registra template, subject, plain text y preview metadata desde la misma semántica. Los datos de negocio
   siguen viniendo del contexto runtime, nunca del diccionario.
7. Cablea el caller mediante `sendEmail()`. En consumers reactivos, ejecuta dedupe antes de rotar tokens o
   realizar cualquier side effect no idempotente.
8. Agrega visual solo si mejora comprensión o jerarquía. Un hero no sustituye copy, CTA, estado ni datos exactos.
9. Verifica render HTML, plain text, snapshots/tests, TypeScript y build proporcional. Si el cambio es visible,
   revisa el preview en ancho desktop y móvil.
10. Declara el estado honestamente: código local no significa template desplegado ni consumer operativo.

## Reglas de template

- Cada prop opcional necesita un default seguro para preview; una prop de negocio requerida no debe inventarse
  silenciosamente en producción.
- Mantén español/inglés donde el email type lo soporte. El subject, preview text, HTML y plain text deben contar
  la misma verdad sin duplicar frases inútilmente.
- Todo CTA incluye una URL de fallback legible. Nunca expongas un bearer en logs, persistencia genérica, analytics
  ni copy de error.
- Unsubscribe depende del propósito y consentimiento, no de `broadcast`: está prohibido por defecto y sólo es
  obligatorio para suscripción opcional o marketing comercial. No conviertas un transaccional en broadcast para
  reutilizar una lista ni agregues promoción a un correo esencial.
- Usa tablas de presentación y estilos inline compatibles con clientes de correo. No dependas de JavaScript,
  SVG animado, video, hover o CSS moderno para transmitir información esencial.
- Imágenes decorativas usan `alt=""`; imágenes informativas requieren un alt equivalente, breve y localizado.
  Declara dimensiones para evitar layout shift.
- Copy institucional reutilizable vive en `src/lib/copy/`; nombres, fechas, montos, URLs, decisiones y estados
  llegan desde el contexto del dominio.

## Runtime y rollout

Los consumers reactivos y templates compilados viven en el `ops-worker` compartido. Modificar
`src/emails/*.tsx`, `src/lib/email/templates.ts`, `delivery.ts` o la projection no vuelve operativo el cambio por
sí solo: identifica el consumidor real y documenta deploy, flag/DB kill switch, canary, observabilidad y rollback.

No ejecutes `services/ops-worker/deploy.sh` como consecuencia automática de editar un template.

**Llevar `sendEmail` a un runtime NUEVO exige MONTAR `RESEND_API_KEY`, no declarar su `*_SECRET_REF`.**
`sendEmail` resuelve el proveedor con el cliente **síncrono** `getResendClient()` (`src/lib/resend.ts`),
que lee `process.env.RESEND_API_KEY` o una resolución ya cacheada; el carril `RESEND_API_KEY_SECRET_REF`
lo puebla sólo el resolvedor **asíncrono**, y en un runtime nuevo nadie lo precalienta antes del primer
envío. En Cloud Run eso significa montarlo con `--update-secrets` (`RESEND_API_KEY=<ref>`), como hace
`services/ops-worker/deploy.sh`; declarar el ref y darle su binding IAM **no** lo sustituye —concede
permiso para leer algo que nadie está leyendo—. Caso fuente 2026-09-05: `services/auth-server/deploy.sh`
declaraba `RESEND_API_KEY_SECRET_REF` con su binding pero nunca montaba el secreto, y el magic link del
authorization server llevaba días fallando en producción con `RESEND_API_KEY is not configured`.

## Delta 2026-09-12 — entregas muertas, cuota del proveedor y cierre incierto (ISSUE-172)

Lo que cambió en `src/lib/email/delivery.ts` y afecta a cualquier correo del catálogo (ficha:
`docs/issues/resolved/ISSUE-172-talent-pool-public-id-lpad-truncation-collision.md`; operación del proveedor en
`resend-email-platform` → «Delta 2026-09-12»; procedimiento en
`docs/operations/runbooks/resend-email-lifecycle-rollout.md` → «Revivir entregas dead_letter (gobernado)»):

- **`email_deliveries.error_message` ahora dice por qué rechazó el proveedor**: `Email provider rejected dispatch
  (daily_quota_exceeded).` — el `name` del error de Resend viaja; el `message` no (cita direcciones). Si tu
  verificación lee la fila (y debe), ya no necesita el panel del proveedor para distinguir cuota agotada de
  dirección inválida (`validation_error`) o rate limit (`rate_limit_exceeded`).
- **El proveedor tiene cuota y un replay la consume.** El 2026-09-12 el plan Free (100/día) se agotó a las
  12:58:11Z por los acuses de una recuperación de postulaciones; desde ~13:05Z es Pro (diario ilimitado,
  50 000/mes). Un consumer reactivo que se re-drena emite sus correos: antes de un replay, contar cuántos y mirar
  plan/cuota.
- **`dead_letter` tiene camino gobernado de vuelta**: `reviveDeadLetterEmailDeliveries({ reason ≥10, deliveryIds? |
  emailTypes?, sinceHours?, limit? })` o `POST /api/admin/ops/email-delivery-retry` con cuerpo `{ reviveDeadLetter }`.
  Vuelve la fila a `failed` (`attempt_number = 0`, motivo en `resend_reason`) y el cron `ops-email-delivery-retry`
  reenvía. **Nunca** revive tipos token-sensitive (`TOKEN_SENSITIVE_EMAIL_TYPES`: un bearer muerto se rota por su
  propio contrato), `persistence.retryable=false`, cierres inciertos ni buzones bloqueados. Sin `UPDATE` a mano.
- **`dispatchOutcome:'unknown'` ya deja huella**: `resend_id` + `error_class='dispatch_unknown'` + `status='failed'`.
  Ni el reintento automático ni el revive lo toman (el correo ya salió). Si un caller hace side effects después
  de `sendEmail`, cuenta con que el resultado puede ser `unknown` y no lo trates como `failed` ordinario.
- **Buzones bloqueados** (`bounced|complained|suppressed`): el predicado canónico es `providerBlockedConditionSql`
  en `src/lib/email/provider-block.ts` (`src/lib/hiring/assessment/access-recovery/provider-block.ts` sólo
  re-exporta). Reintento y revive lo excluyen; ningún template ni caller redefine ese predicado.

## Delta 2026-09-28 — qué id devuelve `sendEmail()` (TASK-1848)

`sendEmail()` genera un `batchId = randomUUID()` por llamada, que se persiste como `email_deliveries.batch_id`.
Ese id **no** es la fila (`delivery_id`). Contrato leído en `src/lib/email/delivery.ts` + `SendEmailResult`
(`src/lib/email/types.ts`):

- **`result.deliveryId`**: con exactamente un `recipientResults` devuelve `recipientResults[0].deliveryId ?? batchId`;
  con varios, el batch. Los retornos tempranos (tipo pausado sin intent, sin destinatarios, fallo al resolverlos)
  devuelven el batch y no crean fila.
- **`recipientResults[].deliveryId`** es la fila **sólo** en tres caminos: Batch API de broadcast (captura el
  `RETURNING delivery_id`), `token_sensitive` (intent pre-reclamado con `claimTokenSensitiveEmailIntent`) y
  reintento de una fila existente. En el **camino secuencial estándar de primer intento** (un destinatario,
  prioridad no-broadcast o con `attachments`), `deliverRecipient` devuelve `durableDeliveryId || batchId` y
  descarta el id que retorna `createDeliveryRow`: ahí **también es el batch** (igual en `rate_limited` e
  `undeliverable`).
- **Regla:** nunca guardes `result.deliveryId` como referencia a una fila de `email_deliveries`, y no asumas que
  `recipientResults[].deliveryId` lo es fuera de esos tres caminos. Para correlacionar un envío con su fila usa
  `source_entity` + `source_event_id` (+ `recipient_email`), o `batch_id` + `recipient_email`. Si un dominio
  necesita el `delivery_id` real en un envío estándar, se corrige en `delivery.ts` (propagar el retorno de
  `createDeliveryRow`), no en el caller.
- Caso fuente: la modalidad `attachment` de Insights guardaba el batch en
  `insight_delivery_recipients.email_delivery_id` (medido en staging 2026-09-28: `idlr-2984…` → `bb79bbb7…`,
  su correo real `c4fb8f5c…`); el estado de transporte no se afectó porque se lee por `source_event_id`. Ningún
  test lo vio porque el mock de `sendEmail` no distinguía batch de fila. Un primer fix que leía
  `recipientResults?.[0]?.deliveryId` (`34d763460`) **seguía** recibiendo el batch en ese camino secuencial (su test
  pasaba con un mock que asumía la fila). Fix real `8882af0e3`: resolver la fila por `source_event_id`
  (verificado contra PG: `idlr-2984…` → `c4fb8f5c…`).

## Delta 2026-09-29 — módulos de correo de Efeonce en AXIS (canon aprobado, **sin adoptar**)

El operador aprobó el correo de entrega de Efeonce Insights (canvas https://claude.ai/artifact/1FHPWVxQ2rbK6jdxw2EqNd
v21, página «Correo»: enlace en escritorio, en celular y PDF adjunto) y lo canonizó con este alcance: **el correo de
Insights es una aplicación, no la plantilla única**. Lo definitivo son tres módulos que cualquier correo de Efeonce
reutiliza con su propio cuerpo:

- **Pie**, en este orden: tarjeta de agenda → bloque de marca → burbuja URL + 4 redes (LinkedIn, Instagram, YouTube,
  Threads) → filete → bloque legal (11 px `#9fb3c8`; «Efeonce Group SpA» en 600 `#cfe4fa` · RUT 77.357.182-1;
  dirección; teléfonos · `sales@efeoncepro.com`; valores desde `src/config/efeonce-brand.ts`) → filete → preferencias
  y baja (11 px) → motivo y © (10 px). Banda `#001a33` en toda línea.
- **CTA**: el principal es una píldora navy `#001a33` a todo el ancho (p. ej. «Ver el informe completo →»), como mucho
  uno; la **agenda** es una tarjeta `#023c70` radio 16 con «¿Lo revisamos juntos?» (Bricolage 700 22 px), bajada 13 px
  `#cfe4fa` y píldora blanca «Agendar una reunión».
- **Bloque de marca**: logo de Efeonce a 220 px y, **debajo**, el eslogan al 64 % del ancho del logo, con la palabra de
  la **línea de servicio** que firma (Growth, Brand, Engine, Voice o Revenue; nunca el producto: Insights firma
  Growth). A 220 px la palabra va en blanco (bajo 24 px el acento no se usa).
- **«Suscribirme» está retirado** en todo correo; la agenda lo reemplaza y va a `https://efeoncepro.com/contacto/`
  con UTM `utm_medium=email`, `utm_source={producto}`, `utm_content=pie` (y `utm_campaign` si hay), **nunca** a un
  `mailto:`. El enlace personal de un informe no lleva UTM.

Dónde vive: AXIS `v0.3.38` — token `efeonceEmail` (`axis-tokens` 0.3.38), contrato `efeonce.email-modules` 0.1.0
`candidate` (`axis-ui-contracts` 0.3.38; 23 códigos, entre ellos `cta-subscribe-retired`, `agenda-never-email` y
`footer-unsubscribe-required`; 6 chequeos del adapter: `images-png-with-dimensions`, `no-inline-svg-in-email`,
`legal-block-live-text`, `bulletproof-buttons`, `footer-contrast`, `dark-mode-safe`), `pnpm email:resolve` en AXIS,
guía `docs/agent-composition/email-modules.md`, ADR `docs/architecture/EMAIL_MODULES_DECISION_V1.md`, Lab
https://axis.efeonce.org/references/email/. **PNG seguros para correo** en `@efeoncepro/axis-brand-assets` 0.4.6
(`AXIS_EMAIL_ASSETS`, @2x con alfa, `pnpm email:assets`): `email-logo-negative`, `email-slogan-<línea>-negative`,
`email-social-{linkedin,instagram,youtube,threads}-white` y `url-bubble-baked-dark-email`. **Logo y eslogan son dos
archivos** apilados con el `stack.gapBelowLogoImagePx` del sello: nunca un solo PNG ni un eslogan escalado a otro ancho.
Dirección sellada en Greenhouse: `docs/ui/visual-directions/EFEONCE_EMAIL_MODULES_V1-direction.md` (+ PNG en
`docs/ui/visual-directions/EFEONCE_EMAIL_MODULES_V1/`). Criterio de marca: `efeonce-graphic-line` →
`references/applications.md` §C4.

**Estado real (2026-09-29):** Greenhouse **no** los adoptó. Fija el set anterior de AXIS (`axis-tokens` y
`axis-ui-contracts` 0.3.37, `axis-brand-assets` 0.4.5) y `src/emails/InsightsEditionDeliveryEmail.tsx` y
`src/emails/components/EmailLayout.tsx` no cambiaron. La implementación del correo de Insights está pendiente
(`efeonce-insights`). No declares el pie nuevo como runtime ni lo copies a mano desde el canvas: se consume desde el
manifiesto y los PNG de AXIS cuando haya task de adopción.

**Tensión abierta (registrar, no resolver):** la policy propuesta (TASK-1764, ADR
`GREENHOUSE_EMAIL_PRESENTATION_POLICY_DECISION_V1.md`, `Proposed`) prohíbe promoción en correos de servicio, deja
`unsubscribe` en `forbidden` y RRSS en `none` para los propósitos transaccionales; el pie aprobado lleva agenda, redes
y baja en **todo** correo de Efeonce. No quites la agenda ni las redes de un correo para «cumplir» la policy, ni
reescribas la policy para calzar con el pie: lo decide el operador al adoptar los módulos. Detalle en
[references/footer-presentation.md](references/footer-presentation.md) §«Módulos canónicos».

## Verificación mínima

Selecciona gates proporcionales al diff:

```bash
pnpm email:dev
pnpm exec vitest run src/emails
pnpm exec tsc --noEmit
pnpm build
```

Para cambios de skill corre además:

```bash
pnpm skills:mirrors
node scripts/skills/validate-skill-routes.mjs --all
```

**El único hecho observable de que un correo salió es su fila en
`greenhouse_notifications.email_deliveries`** (`status`, `provider_status`, `error_message`). Un 2xx del
endpoint que lo dispara no prueba nada —el envío es asíncrono respecto de esa respuesta— y menos si el
endpoint es deliberadamente indistinguible: el de magic link responde 202 idéntico exista o no la cuenta,
por anti-enumeración. Un correo muerto **no se reporta solo**; si tu verificación no lee esa fila, no
verificaste el envío.

Un email queda `code complete, rollout pendiente` mientras falten deploy del runtime dueño, habilitación,
canary consentido o readback del provider.
