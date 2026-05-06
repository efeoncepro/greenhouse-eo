# Sistema de Email — Entrega, Templates y Proteccion

> **Tipo de documento:** Documentacion funcional (lenguaje simple)
> **Version:** 1.4
> **Creado:** 2026-04-06 por Claude (asistido por Julio Reyes)
> **Ultima actualizacion:** 2026-05-06 por Codex
> **Documentacion tecnica:** `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md` (seccion email delivery), `docs/architecture/GREENHOUSE_EMAIL_CATALOG_V1.md`

## Que es

Greenhouse cuenta hoy con una capa seria de email transaccional y operativo. Ya no es solo una colección de templates, pero tampoco debe entenderse como una suite completa de campañas o marketing automation.

Hoy el sistema cubre bien los correos que importan para la operación del portal:

- **Templates** — componentes React (react-email) que generan HTML compatible con todos los clientes de correo
- **Context Resolver** — resuelve automaticamente los datos del destinatario (nombre, idioma, cliente) antes de enviar
- **Soporte bilingue (i18n)** — templates de identidad disponibles en espanol e ingles segun el locale del usuario
- **Rate limiting** — proteccion contra loops accidentales (10 emails/hora por destinatario)
- **Bounce handling** — deteccion automatica de rebotes duros que marca direcciones como no entregables
- **Unsubscribe** — enlaces firmados para que el destinatario se desuscriba sin necesidad de iniciar sesion
- **Tracking de entrega** — cada email queda registrado en PostgreSQL con su estado completo
- **Reintentos** — ventana de 24 horas con hasta 3 intentos para entregas fallidas

El proveedor de entrega es **Resend**, integrado via su SDK en el backend. Parte de los envíos también puede ejecutarse desde el `ops-worker`, por ejemplo para lanes programadas o batch como el digest semanal de Nexa.

## Lo que es hoy

Hoy Greenhouse tiene:

- una capa central de envío para emails transaccionales y algunos broadcast relevantes
- un catálogo de templates reusable
- tracking operativo de entregas en PostgreSQL
- reintentos, dead letter y protecciones básicas de entregabilidad
- integración con eventos de negocio que sí justifican email

En la práctica, esto cubre bien:

- acceso e identidad
- nómina y adjuntos operativos
- notificaciones importantes
- permisos/leave
- un digest ejecutivo semanal interno de Nexa

## Lo que todavía no es

Hoy Greenhouse **no** tiene todavía:

- un sistema de campañas de marketing
- journeys multistep configurables desde UI
- un centro de observabilidad de email completo dentro del portal
- segmentación rica por audiencias arbitrarias para envíos masivos
- una política de preferencias súper detallada por todas las categorías de negocio

## Inventario de templates

| Template | Archivo | Dominio | Idiomas | Tests |
|----------|---------|---------|---------|-------|
| Invitacion / Onboarding | `src/emails/InvitationEmail.tsx` | identity | es, en | No |
| Reset de contrasena | `src/emails/PasswordResetEmail.tsx` | identity | es, en | No |
| Verificacion de email | `src/emails/VerifyEmail.tsx` | identity | es, en | No |
| Notificacion generica | `src/emails/NotificationEmail.tsx` | system | es, en | No |
| Recibo de nomina | `src/emails/PayrollReceiptEmail.tsx` | payroll | es (chile), en (international) | Si |
| Exportacion de nomina lista | `src/emails/PayrollExportReadyEmail.tsx` | payroll | es | Si |
| Pago programado | `src/emails/PayrollPaymentCommittedEmail.tsx` | payroll | es, en por regimen | Si |
| Pago cancelado / en revision | `src/emails/PayrollPaymentCancelledEmail.tsx` | payroll | es, en por regimen | Si |
| Liquidacion v2 actualizada | `src/emails/PayrollLiquidacionV2Email.tsx` | payroll | es | Si |
| Cambio de cuenta de pago | `src/emails/BeneficiaryPaymentProfileChangedEmail.tsx` | finance/payroll | es | Si |
| Permiso aprobado/rechazado | `src/emails/LeaveRequestDecisionEmail.tsx` | hr | es, en | Si |
| Confirmacion de revision de permiso | `src/emails/LeaveReviewConfirmationEmail.tsx` | hr | es, en | Si |
| Solicitud de permiso enviada | `src/emails/LeaveRequestSubmittedEmail.tsx` | hr | es, en | Si |
| Solicitud de permiso por revisar | `src/emails/LeaveRequestPendingReviewEmail.tsx` | hr | es, en | Si |
| Magic link | `src/emails/MagicLinkEmail.tsx` | identity | es, en | Si |
| Propuesta comercial compartida | `src/emails/QuoteSharePromptEmail.tsx` | commercial | es | Si |
| Resumen ejecutivo semanal Nexa | `src/emails/WeeklyExecutiveDigestEmail.tsx` | delivery | es | Si |

Los 4 templates de identidad (invitacion, reset, verificacion, notificacion) soportan espanol e ingles a traves de la prop `locale`. Los templates de payroll usan su propia logica de idioma basada en `payRegime` (chile = espanol, international = ingles).

El digest semanal de Nexa es un template interno orientado a liderazgo. No resuelve idioma por usuario en este corte: se envia en espanol y reutiliza narrativas ya materializadas por la lane advisory de Nexa.

## Cómo funciona hoy, en simple

1. Un módulo del portal decide que un evento merece email.
2. Llama a la capa central de entrega.
3. Greenhouse resuelve automáticamente contexto del destinatario cuando puede.
4. Se renderiza el template.
5. Se intenta el envío por Resend.
6. La entrega queda registrada en PostgreSQL con su estado.
7. Si Resend luego reporta entrega, bounce o complaint, Greenhouse actualiza ese estado.

## Context Resolver automatico

Antes de TASK-269, cada endpoint que enviaba un email tenia que consultar manualmente el nombre del destinatario, su cliente, y otros datos. Esto causaba inconsistencias y errores (como ISSUE-017, donde un caller no resolvia correctamente el nombre).

Ahora la capa de entrega incluye un **Context Resolver** que auto-hidrata los datos del destinatario antes de enviar cualquier email.

**Que hace:**

1. Recibe el email del destinatario
2. Consulta `client_users JOIN clients` en PostgreSQL
3. Inyecta automaticamente: nombre, nombre de pila, idioma, nombre del cliente, URL de la plataforma
4. Si el destinatario esta marcado como `email_undeliverable = true`, la entrega se cancela

**Reglas de precedencia:**

- Si el caller ya paso un valor (por ejemplo `userName`), ese valor tiene prioridad sobre el auto-resuelto
- Si el Context Resolver falla por una razon distinta a "no entregable", el envio continua con los datos del caller — no se bloquea

**Beneficio:** los endpoints que envian emails ya no necesitan hacer queries manuales para obtener datos del destinatario. El resolver lo hace una sola vez de forma centralizada.

> Detalle tecnico: `src/lib/email/context-resolver.ts`. Usa `resolveEmailContext()` que retorna un `ResolvedEmailContext` tipado.

## Catalogo de tokens canonicos

Estos son los datos que el Context Resolver auto-resuelve para cada destinatario. Son props TypeScript tipadas, no interpolacion de templates (como Handlebars o Mustache).

### Recipient

| Token | Tipo | Descripcion |
|-------|------|-------------|
| `recipient.firstName` | `string` | Nombre de pila (primer nombre del full name) |
| `recipient.fullName` | `string` | Nombre completo del usuario |
| `recipient.email` | `string` | Email normalizado (lowercase, sin espacios) |
| `recipient.locale` | `'es' \| 'en'` | Idioma preferido del usuario |
| `recipient.userId` | `string` | ID del usuario en `client_users` |

### Client

| Token | Tipo | Descripcion |
|-------|------|-------------|
| `client.name` | `string` | Nombre del cliente (o "Efeonce" para internos) |
| `client.id` | `string` | ID del cliente en `clients` |
| `client.tenantType` | `'client' \| 'efeonce_internal'` | Tipo de tenant |

### Platform

| Token | Tipo | Descripcion |
|-------|------|-------------|
| `platform.url` | `string` | URL base de la plataforma |
| `platform.supportEmail` | `string` | Email de soporte (`soporte@efeoncepro.com`) |
| `platform.logoUrl` | `string` | URL publica del logo para emails |

> Detalle tecnico: definidos en `src/lib/email/tokens.ts` como interfaces TypeScript (`ResolvedRecipientContext`, `ResolvedClientContext`, `ResolvedPlatformContext`).

## TASK-408 Slice 0: dictionary-ready sin perder personalizacion

TASK-408 comenzo la migracion de copy de emails hacia `src/lib/copy/`, pero la capa de personalizacion se mantiene separada y protegida.

La regla es:

- `src/lib/email/tokens.ts` define el contexto canonico del destinatario, cliente y plataforma.
- `src/lib/email/delivery.ts` mergea ese contexto con los valores enviados por el caller. El caller mantiene prioridad para datos especificos como montos, periodos, cliente, links, adjuntos y mensajes personalizados.
- `src/lib/copy/dictionaries/es-CL/emails.ts` guarda copy institucional reusable y builders de subject que reciben tokens como parametros.
- `src/emails/EmailTemplateBaseline.test.tsx` snapshottea los 17 templates y verifica snippets de tokens personalizados para detectar regresiones antes de tocar delivery real.

Esto evita que la migracion a dictionary convierta emails dinamicos en texto fijo o pierda datos como nombre, monto, periodo, `unsubscribeUrl` o links de accion.

## TASK-408 Slice 2A: shell institucional

`EmailLayout` ahora toma el copy institucional compartido desde `getMicrocopy().emails.layout` para el footer y el alt del logo en espanol. Esto no cambia el contenido de negocio ni los tokens del email.

Frontera operativa:

- `EmailLayout` no genera nombres, montos, periodos, clientes ni enlaces de negocio.
- `unsubscribeUrl` sigue llegando desde la capa de delivery/tokens; el layout solo renderiza el link si existe.
- El footer `en` conserva el texto legacy mientras `en-US` sea mirror de `es-CL`, para no convertir correos internacionales a espanol por accidente.
- `EmailButton` sigue recibiendo `children`; los textos de CTA se migran por template en Slice 3.

## TASK-408 Slice 3A: templates auth incrementales

`VerifyEmail`, `MagicLinkEmail`, `PasswordResetEmail` e `InvitationEmail` son los primeros templates individuales migrados a dictionary. El copy en espanol vive en `getMicrocopy().emails.auth.*`; el copy ingles queda como fallback legacy mientras `en-US` sea mirror de `es-CL`.

La primitive `selectEmailTemplateCopy()` permite repetir este patron en los siguientes templates sin tocar delivery:

- `es` / `es-CL` / default → dictionary de plataforma.
- `en` / `en-US` → fallback legacy temporal.
- No cambia subject registry, URLs, tokens ni contexto del caller.

## Soporte de idioma (i18n)

Los emails de Greenhouse soportan espanol e ingles. El idioma se determina asi:

1. El campo `locale` en la tabla `client_users` indica el idioma preferido del usuario (por defecto `'es'`)
2. El Context Resolver lee este campo y lo inyecta en el contexto del template
3. Cada template usa objetos de traduccion inline (no archivos separados de idioma)

**Templates bilingues:**

| Template | Comportamiento |
|----------|---------------|
| Invitacion | Subject, saludo, cuerpo y boton adaptan segun `locale` |
| Reset de contrasena | Subject y texto adaptan segun `locale` |
| Verificacion | Subject y texto adaptan segun `locale` |
| Notificacion generica | Saludo y texto adaptan segun `locale` |

**Templates de payroll:**

Los recibos de nomina usan su propia logica de idioma basada en `payRegime`:
- `chile` → espanol (colaboradores bajo regimen chileno)
- `international` → ingles (colaboradores bajo regimen internacional)

**Footer del EmailLayout:**

El footer del email ("Efeonce Greenhouse(TM)") se adapta al idioma del destinatario.

## Rate limiting

Para proteger contra loops accidentales (por ejemplo, un cron que dispara el mismo email repetidamente), el sistema aplica un limite por destinatario:

| Parametro | Valor |
|-----------|-------|
| Limite | 10 emails por hora por destinatario |
| Ventana | Ultimos 60 minutos (rolling window) |
| Que cuenta | Emails con status `sent` o `delivered` |
| Si se excede | La entrega se registra con status `rate_limited` |

El rate limit se evalua antes de enviar. Si el destinatario ya recibio 10 emails en la ultima hora, el nuevo envio no se ejecuta pero queda registrado en la tabla de entregas para trazabilidad.

> Detalle tecnico: `src/lib/email/rate-limit.ts`. Funcion `checkRecipientRateLimit()`.

Para el digest semanal de Nexa esto importa especialmente porque el template esta marcado como `broadcast`. La programacion normal es una vez por semana, pero cualquier replay manual sigue pasando por el mismo control de entrega y trazabilidad.

## Unsubscribe

Los emails de tipo broadcast (como `payroll_export` o `notification`) pueden incluir un enlace de desuscripcion en el footer. El flujo funciona asi:

1. Al generar el email, se crea un **token firmado** valido por 30 dias
2. El enlace apunta a `POST /api/account/email-preferences` con el token
3. El destinatario hace clic → se desuscribe de ese tipo de email sin necesidad de login

**Autenticacion dual:**

| Modo | Cuando se usa |
|------|--------------|
| Token (sin login) | Desde el enlace en el footer del email |
| Sesion (con login) | Desde la configuracion de preferencias dentro del portal |

Ambos modos permiten tanto desuscribirse (`unsubscribe`) como volver a suscribirse (`resubscribe`).

> Detalle tecnico: generacion del token en `src/lib/email/unsubscribe.ts`. Endpoint en `src/app/api/account/email-preferences/route.ts`. Suscripciones en tabla `greenhouse_notifications.email_subscriptions`.

## Bounce y complaint handling

Resend notifica a Greenhouse via webhook cuando un email rebota, es reportado como spam, o se entrega exitosamente.

**Webhook:** `POST /api/webhooks/resend`

| Evento | Que pasa |
|--------|----------|
| `email.bounced` (hard) | Marca al destinatario como `email_undeliverable` en `client_users`. Futuros envios a esa direccion se cancelan automaticamente |
| `email.bounced` (soft) | Se registra el evento pero no se marca como no entregable |
| `email.complained` | Auto-desuscribe al destinatario del tipo de email que genero la queja |
| `email.delivered` | Actualiza el status de la entrega de `sent` a `delivered` |

**Por que importa:**

Enviar emails a direcciones que rebotan repetidamente danaa la reputacion del dominio de envio. El manejo automatico de bounces protege la capacidad de Greenhouse de entregar emails a todos los demas usuarios.

La verificacion del webhook usa firma HMAC-SHA256 (Svix) con comparacion timing-safe para seguridad.

> Detalle tecnico: `src/app/api/webhooks/resend/route.ts`. Requiere `RESEND_WEBHOOK_SIGNING_SECRET` en variables de entorno.

## Eventos outbox

El sistema de email publica eventos al outbox para habilitar reacciones automaticas y metricas futuras:

| Evento | Cuando se emite |
|--------|----------------|
| `email_delivery.bounced` | Un email reboto (hard o soft) |
| `email_delivery.complained` | Un destinatario reporto el email como spam |
| `email_delivery.rate_limited` | Un envio fue bloqueado por rate limit |
| `email_delivery.undeliverable_marked` | Un destinatario fue marcado como no entregable |

Todos usan aggregate type `emailDelivery`. Estos eventos pueden ser consumidos por proyecciones reactivas para construir alertas de admin, dashboards de entrega, o metricas de engagement.

> Detalle tecnico: eventos definidos en `src/lib/sync/event-catalog.ts` bajo `AGGREGATE_TYPES.emailDelivery` y `EVENT_TYPES.emailDelivery*`.

## Integracion con NotificationService

El sistema de notificaciones de Greenhouse (`NotificationService.dispatch()`) usa `sendEmail()` como canal de entrega para el canal email. La integracion funciona asi:

1. `NotificationService.dispatch()` recibe la notificacion con su categoria
2. Consulta `notification_preferences` para verificar si el usuario tiene habilitado el canal email para esa categoria
3. Si esta habilitado, llama a `sendEmail()` con el template `notification`
4. El Context Resolver opera de forma transparente — auto-hidrata nombre, idioma y datos del cliente
5. `email_subscriptions` controla las suscripciones a emails broadcast (tipos como `payroll_export`)

**Resultado:** una sola llamada a `dispatch()` puede generar notificaciones in-app y email simultaneamente, respetando las preferencias individuales de cada usuario.

> Detalle tecnico: `src/lib/notifications/notification-service.ts`. Usa `sendEmail()` de `src/lib/email/delivery.ts`.

## Servicio de entrega

| Aspecto | Detalle |
|---------|---------|
| Proveedor | Resend (via SDK Node.js) |
| Tracking | Cada envio se registra en `greenhouse_notifications.email_deliveries` con status, resend_id, payload, timestamps |
| Reintentos | Ventana de 24 horas, maximo 3 intentos por entrega fallida |
| Procesamiento batch | `processFailedEmailDeliveries()` reintenta automaticamente entregas fallidas |
| Reintento manual | `retryFailedDelivery(deliveryId)` permite reintentar una entrega especifica |
| Suscripciones | Si no se especifican destinatarios, se consulta `email_subscriptions` para el tipo de email |

Hoy este servicio está pensado para correo transaccional y broadcast importante. No está pensado todavía como una consola universal de campañas ni como reemplazo de un sistema dedicado de messaging masivo.

Estados posibles de una entrega:

| Status | Significado |
|--------|-------------|
| `pending` | En proceso de reintento |
| `sent` | Enviado exitosamente a Resend |
| `delivered` | Confirmado como entregado por Resend (via webhook) |
| `failed` | Fallo al enviar (elegible para reintento si < 3 intentos y < 24h) |
| `skipped` | No enviado: sin API key, destinatario no entregable, o payload irrecuperable |
| `rate_limited` | Bloqueado por rate limit |

> Detalle tecnico: `src/lib/email/delivery.ts`. Funciones `sendEmail()`, `processFailedEmailDeliveries()`, `retryFailedDelivery()`.

## Qué falta para evolucionarlo más

Si Greenhouse quiere llevar esta capa a un nivel todavía más alto, los siguientes pasos siguen pendientes:

### 1. Observabilidad visible para operadores

Hoy los datos existen, pero falta una surface madura para ver:

- entregas fallidas
- dead letters
- complaint rate
- bounce rate
- retries exitosos vs agotados

### 2. Mejor control operativo por tenant y por categoría

Faltaría poder gobernar mejor:

- qué tenant puede enviar qué familia de emails
- qué familias están pausadas por entorno o por cliente
- qué preferencias se administran por categoría de negocio y no solo por tipo puntual

### 3. Broadcasts más desacoplados

Los envíos grandes o programados todavía pueden evolucionar hacia una lane más clara de queue/worker dedicada, para que el sistema operativo de email escale sin apoyarse siempre en los mismos caminos del runtime actual.

### 4. Más catálogo implementado

El catálogo recomendado ya contempla más familias que las que hoy están realmente vivas en producción. Todavía faltan varias notificaciones de seguridad, finanzas y governance.

### 5. Soporte interno más directo

Sería útil una vista administrativa que permita buscar una entrega, entender por qué falló y reintentarla sin depender tanto de inspección técnica.

## Componentes compartidos

### EmailLayout (`src/emails/components/EmailLayout.tsx`)

Wrapper de pagina completa que aplica a todos los emails:

- **Header**: gradiente diagonal navy (#022a4e) a azul (#0375db) con logo Efeonce blanco centrado (160x37px)
- **Body card**: contenedor blanco de 560px max-width, border radius 12px, sombra sutil, padding 40px/36px
- **Footer**: marca "Efeonce Greenhouse(TM) . Empower your Growth" + aviso de correo automatico
- Fonts: Google Fonts (Poppins para headings, DM Sans para body)
- Color scheme: solo light mode
- El footer adapta su idioma segun el locale del destinatario

### EmailButton (`src/emails/components/EmailButton.tsx`)

Boton CTA reutilizable:

- Fondo azul (#0375db), texto blanco, Poppins SemiBold 15px
- Padding 14px vertical, 36px horizontal
- Border radius 8px, borde 1px (#025bb0)

## Design tokens

| Token | Valor | Uso |
|-------|-------|-----|
| `background` | #F2F4F7 | Fondo general del email |
| `containerBg` | #FFFFFF | Fondo de la tarjeta principal |
| `headerBg` | #022a4e | Gradiente header inicio (Midnight Navy) |
| `headerAccent` | #0375db | Gradiente header fin (Core Blue) |
| `primary` | #0375db | Botones CTA, enlaces |
| `primaryHover` | #025bb0 | Borde de boton / hover |
| `text` | #1A1A2E | Color de headings |
| `secondary` | #344054 | Texto de cuerpo |
| `muted` | #667085 | Disclaimers, pie de pagina |
| `border` | #E4E7EC | Lineas divisoras |
| `success` | #12B76A | Estados exitosos |
| `footerBg` | #F9FAFB | Fondo del footer |

Definidos en `src/emails/constants.ts`.

## Tipografia

| Contexto | Font | Pesos |
|----------|------|-------|
| Headings, botones CTA | Poppins | 500, 600, 700 |
| Texto de cuerpo, disclaimers | DM Sans | 400, 500 |

## Assets de marca

| Asset | Ruta | Uso |
|-------|------|-----|
| Logo blanco (email header) | `public/branding/logo-white-email.png` | Header de todos los emails |
| Logo SVG negativo (blanco) | `public/branding/logo-negative.svg` | Version vector del logo blanco |
| Logo SVG full (azul) | `public/branding/logo-full.svg` | Uso general sobre fondos claros |
| Logo PNG full (azul) | `public/branding/logo-full.png` | Version raster del logo azul |
| Todos los assets | `public/branding/` y `public/branding/SVG/` | Isotipos, variantes, wave, reach, globe |

URL publica del logo email: `https://greenhouse.efeoncepro.com/branding/logo-white-email.png`

## Workflow de diseno: Figma <-> Codigo

### Exportar a Figma (para revision y ajuste visual)

Los templates se pueden exportar a Figma usando la integracion MCP de Figma para que el equipo los revise y ajuste visualmente antes de implementar cambios.

- **Archivo Figma activo**: [Greenhouse — Email de Invitacion / Onboarding](https://www.figma.com/design/18hfZt9f8DeKMWx5JorFhz)
- **Plan Figma**: Efeonce (pro)

| Template | Estado en Figma |
|----------|----------------|
| InvitationEmail | Exportado |
| PasswordResetEmail | Pendiente |
| VerifyEmail | Pendiente |
| PayrollReceiptEmail | Pendiente |
| PayrollExportReadyEmail | Pendiente |
| NotificationEmail | Pendiente |

### Incorporar cambios de Figma al codigo

1. Leer el diseno actualizado desde Figma (screenshot o design context)
2. Comparar con el componente react-email actual en `src/emails/`
3. Actualizar el componente para reflejar los cambios de diseno
4. Ejecutar tests existentes (`pnpm test`) para PayrollReceiptEmail y PayrollExportReadyEmail
5. Verificar con `pnpm build` y `pnpm lint`

## Herramientas Figma MCP disponibles

La integracion con Figma se realiza via MCP (Model Context Protocol). Cuenta autenticada: `jreyes@efeoncepro.com`. Plan: **Efeonce** (pro, Full seat, key: `team::1542509061254045561`).

### Lectura (Figma -> Codigo)

| Herramienta | Que hace |
|-------------|----------|
| `get_design_context` | Herramienta principal para design-to-code. Retorna codigo de referencia + screenshot + metadata contextual |
| `get_screenshot` | Captura screenshot de un nodo especifico |
| `get_metadata` | Estructura XML del archivo (IDs, tipos, nombres, posiciones) |
| `get_variable_defs` | Tokens de diseno (colores, spacing, fonts) |

### Escritura (Codigo -> Figma)

| Herramienta | Que hace |
|-------------|----------|
| `create_new_file` | Crea archivo nuevo de diseno o FigJam |
| `use_figma` | Ejecuta JavaScript via Figma Plugin API (crear, editar, inspeccionar cualquier objeto) |
| `generate_diagram` | Crea diagramas Mermaid (flowchart, sequence, gantt, state) en FigJam |

### Code Connect (vincular Figma <-> componentes React)

| Herramienta | Que hace |
|-------------|----------|
| `add_code_connect_map` | Mapea nodo Figma -> componente React del codebase |
| `get_code_connect_map` | Lee mapeos existentes |
| `get_code_connect_suggestions` | Sugerencias AI de mapeo automatico |
| `get_context_for_code_connect` | Metadata de componente (props, variants, descendientes) |

### Design System

| Herramienta | Que hace |
|-------------|----------|
| `search_design_system` | Busca componentes, variables y estilos en design libraries |
| `create_design_system_rules` | Genera reglas de design system para el repo |

### Gotchas aprendidas

1. `layoutSizingHorizontal = "FILL"` solo se puede setear despues de append a un auto-layout parent
2. `createImageAsync` no existe en el Plugin API via MCP — usar `fetch()` + `figma.createImage(new Uint8Array(buffer))`
3. Para SVGs: `figma.createNodeFromSvg(svgString)` funciona directamente
4. Fonts Inter: "Semi Bold" (con espacio). Poppins: "SemiBold" (sin espacio)
5. `figma.currentPage = page` no funciona — usar `await figma.setCurrentPageAsync(page)`
6. `get_screenshot` y `get_metadata` requieren `nodeId` obligatorio

### Skills de Figma instaladas (7)

Instaladas globalmente en `~/.claude/skills/` desde [github.com/figma/mcp-server-guide](https://github.com/figma/mcp-server-guide). Cada skill tiene un `SKILL.md` con instrucciones detalladas y carpeta `references/` con documentacion de la Plugin API.

| Skill | Proposito |
|-------|-----------|
| `figma-use` | Prerequisito obligatorio antes de cada escritura a Figma. Plugin API patterns y gotchas |
| `figma-generate-design` | Traducir paginas/vistas de la app a disenos en Figma |
| `figma-implement-design` | Traducir disenos de Figma a codigo production-ready (React/TypeScript) |
| `figma-generate-library` | Construir design system library completa desde codebase (tokens, componentes, docs) |
| `figma-code-connect` | Mapear componentes Figma <-> componentes React del codebase |
| `figma-create-design-system-rules` | Generar reglas de design system especificas del proyecto |
| `figma-create-new-file` | Crear archivos Figma nuevos (design o FigJam) |

> Detalle tecnico: ver `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md` (seccion email delivery), `docs/architecture/GREENHOUSE_EMAIL_CATALOG_V1.md`, y `src/emails/constants.ts` para la configuracion completa del design system de emails.
