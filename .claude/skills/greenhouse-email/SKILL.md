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
  `/admin/emails/footer-profiles/mockup`; es referencia visual, no runtime productivo.
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
