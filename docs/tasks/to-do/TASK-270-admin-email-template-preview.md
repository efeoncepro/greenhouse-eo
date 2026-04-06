# TASK-270 — Admin Email Template Preview: vista integrada para previsualizar y probar templates

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Medio`
- Effort: `Medio`
- Type: `implementation`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `admin`, `email`, `ui`
- Blocked by: `none`
- Branch: `task/TASK-270-admin-email-template-preview`
- Legacy ID: —
- GitHub Issue: —

## Summary

Los email templates solo se pueden previsualizar con `pnpm email:dev` (server standalone en otro puerto). No es accesible para el equipo, no esta integrado al portal, y no permite enviar pruebas reales con el delivery layer enterprise. Esta task construye una vista admin en `/admin/emails/preview` que renderiza templates server-side, permite toggle de idioma y viewport, edicion de datos de ejemplo, y envio de prueba al email del admin logueado.

## Why This Task Exists

1. El equipo no puede ver como lucen los emails sin levantar un server de desarrollo local
2. No hay forma de enviar un email de prueba sin crear un usuario real o disparar un flujo de produccion
3. Los templates ahora soportan i18n (es/en) — necesitan una forma facil de verificar ambas versiones
4. TASK-269 agrego tokens auto-resueltos, unsubscribe links, y rate limiting — un preview integrado permite validar estos features end-to-end
5. Una empresa grande necesita que su equipo pueda auditar y probar la comunicacion por email sin depender de desarrolladores

## Goal

- Vista admin integrada al portal para previsualizar los 6 email templates
- Toggle de idioma (es/en) y viewport (desktop/mobile)
- Edicion de props del template en un panel lateral con preview en tiempo real
- Boton "Enviar prueba" que envia el template renderizado al email del admin logueado
- Accesible solo para `efeonce_admin`

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_UI_PLATFORM_V1.md` — patrones UI, componentes MUI
- `docs/architecture/GREENHOUSE_IDENTITY_ACCESS_V2.md` — admin route guards
- `docs/documentation/plataforma/sistema-email-templates.md` — inventario y design system de emails

Reglas obligatorias:

- `requireAdminTenantContext()` en la API route
- Layout guard admin en la pagina
- Componentes MUI + Vuexy primitives
- Copy en español (nomenclatura Greenhouse)
- No crear `new Pool()` — usar `runGreenhousePostgresQuery` si se necesita DB

## Normative Docs

- `docs/documentation/plataforma/sistema-email-templates.md` — inventario completo de templates, tokens, design system

## Dependencies & Impact

### Depends on

- TASK-269 (email enterprise hardening) — templates con i18n, defaults de preview, context resolver. Ya implementado.
- `@react-email/render` — ya instalado, exporta `render()` para convertir React a HTML string
- `src/lib/email/delivery.ts` — `sendEmail()` para el envio de prueba
- `src/lib/email/templates.ts` — `resolveTemplate()` y `listRegisteredTemplates()`

### Blocks / Impacts

- Ninguna task bloqueada
- TASK-267 (reenviar onboarding) — podria beneficiarse de esta vista para probar el template de invitacion

### Files owned

- `src/app/api/admin/emails/preview/route.ts` — NUEVO: GET (render HTML) + POST (enviar prueba)
- `src/app/(dashboard)/admin/emails/preview/page.tsx` — NUEVO: pagina admin
- `src/views/greenhouse/admin/email-preview/EmailTemplatePreviewView.tsx` — NUEVO: vista principal
- `src/views/greenhouse/admin/email-preview/TemplatePropsEditor.tsx` — NUEVO: editor de props

## Current Repo State

### Already exists

- `src/emails/InvitationEmail.tsx` — con defaults de preview y i18n (es/en)
- `src/emails/PasswordResetEmail.tsx` — con defaults de preview y i18n
- `src/emails/VerifyEmail.tsx` — con defaults de preview y i18n
- `src/emails/NotificationEmail.tsx` — con defaults de preview y i18n
- `src/emails/PayrollReceiptEmail.tsx` — con defaults de preview (bilinguismo via payRegime)
- `src/emails/PayrollExportReadyEmail.tsx` — con defaults de preview
- `src/lib/email/templates.ts` — `resolveTemplate()`, `listRegisteredTemplates()`, 6 resolvers registrados
- `src/lib/email/delivery.ts` — `sendEmail()` con context resolver, rate limit, tracking
- `@react-email/render` — instalado, exporta `render(component)` → HTML string
- `src/app/(dashboard)/admin/email-delivery/page.tsx` — pagina admin existente de deliveries (referencia de patron)
- `src/app/api/admin/email-deliveries/route.ts` — API admin existente (referencia de patron de auth)

### Gap

- No existe vista de preview de templates en el portal
- No existe API route para renderizar templates server-side
- No existe mecanismo de envio de prueba desde la UI

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — API route de preview + envio de prueba

- Crear `src/app/api/admin/emails/preview/route.ts`
- **GET** `?template=invitation&locale=es`: renderiza el template con `render()` de `@react-email/render` y retorna HTML string. Acepta props opcionales via query params o JSON body.
- **POST** `{ template, locale, props, recipientEmail }`: renderiza y envia el template via `sendEmail()` al email indicado (o al del admin logueado si no se especifica)
- Auth: `requireAdminTenantContext()`
- Template catalog: mapa estatico de nombre → componente React + props por defecto
- Retorna `{ html, subject, text }` en GET y `{ sent, deliveryId }` en POST

### Slice 2 — Vista de preview con selector de template, locale y viewport

- Crear `src/app/(dashboard)/admin/emails/preview/page.tsx` — pagina server con layout guard admin
- Crear `src/views/greenhouse/admin/email-preview/EmailTemplatePreviewView.tsx` — vista principal:
  - Sidebar izquierdo: lista dinamica de templates (auto-descubierta desde el registro, no hardcodeada)
  - Toolbar superior: toggle locale (es/en), toggle viewport (desktop 600px / mobile 375px), boton "Enviar prueba"
  - Area central: iframe que muestra el HTML renderizado del template seleccionado
  - Fetch al API route `GET /api/admin/emails/preview?template=...&locale=...`
  - El iframe se actualiza cuando cambia template, locale, o props

### Slice 3 — Editor de props y envio de prueba

- Crear `src/views/greenhouse/admin/email-preview/TemplatePropsEditor.tsx`:
  - Panel lateral derecho (drawer o panel colapsable)
  - Campos de texto editables para cada prop del template seleccionado (pre-llenados con defaults)
  - Al editar un campo, se refetch el preview con los nuevos valores
  - Cada template tiene un schema de props diferente — el editor se adapta dinamicamente
- Integrar boton "Enviar prueba":
  - Llama a `POST /api/admin/emails/preview` con el template actual, locale, y props
  - Muestra toast de exito/error con react-toastify
  - El email se envia al correo del admin logueado

## Out of Scope

- Editor visual de HTML/React (no es un CMS de templates)
- Reemplazo de `pnpm email:dev` (sigue util para desarrollo local con hot-reload)
- Historial de envios de prueba (ya existe en el modulo de email deliveries)
- Preview de adjuntos PDF (los adjuntos se mencionan pero no se previewean)
- Creacion o eliminacion de templates (son componentes React, se gestionan con codigo)

## Detailed Spec

### Template Registry (auto-descubrible, no hardcodeado)

El catalogo de templates NO es una lista estatica de 6 items. Debe ser un registro extensible que se actualiza automaticamente cuando se agrega un nuevo template al sistema.

**Patron:** extender `registerTemplate()` en `src/lib/email/templates.ts` para que cada template registre tambien sus metadatos de preview:

```typescript
interface EmailTemplateRegistration<TContext> {
  emailType: EmailType
  resolver: EmailTemplateResolver<TContext>
  // Metadatos de preview (opcionales, para la vista admin)
  preview?: {
    label: string                    // Nombre humano: "Invitacion de onboarding"
    description: string              // "Email que se envia al invitar un usuario nuevo"
    domain: EmailDomain              // 'identity' | 'payroll' | etc.
    defaultProps: Partial<TContext>   // Props de ejemplo para preview
    supportsLocale: boolean          // Tiene i18n?
  }
}
```

**API route** usa `listRegisteredTemplates()` (ya existe) para obtener la lista, y un nuevo `getTemplatePreviewMeta(emailType)` para obtener los metadatos de preview. Si un template no tiene metadatos de preview, se muestra con label generico y sin props editables.

**Beneficio:** cuando alguien agrega un template nuevo con `registerTemplate('new_type', resolver, { preview: { ... } })`, automaticamente aparece en la vista de preview sin tocar ningun otro archivo.

### Preview Flow

```
UI selecciona template + locale + edita props
  ↓ fetch GET /api/admin/emails/preview?template=invitation&locale=en&props={...}
  ↓
API route:
  1. Lookup en TEMPLATE_CATALOG
  2. Merge defaultProps con props del request
  3. render(Component({ ...mergedProps, locale })) → HTML string
  4. Return { html, subject }
  ↓
UI muestra HTML en iframe via srcdoc
```

### Envio de prueba Flow

```
Admin hace clic en "Enviar prueba"
  ↓ POST /api/admin/emails/preview { template, locale, props }
  ↓
API route:
  1. Resolve template + props
  2. sendEmail({ emailType, domain, recipients: [{ email: admin.email }], context: mergedProps })
  3. Return { sent: true, deliveryId }
  ↓
UI muestra toast "Correo de prueba enviado a jreyes@efeoncepro.com"
```

### UI Layout

```
┌─────────────────────────────────────────────────────────────┐
│ Admin > Emails > Preview de templates                       │
├────────────┬──────────────────────────────┬──────────────────┤
│            │ [es/en] [Desktop/Mobile]     │                  │
│ Templates  │ [Enviar prueba]              │  Editor de       │
│            ├──────────────────────────────┤  datos           │
│ ● Invit.  │                              │                  │
│   Reset   │   ┌──────────────────────┐   │  inviterName:    │
│   Verify  │   │                      │   │  [Julio Reyes]   │
│   Notif.  │   │   Preview iframe     │   │                  │
│   Export  │   │   (600px o 375px)    │   │  clientName:     │
│   Receipt │   │                      │   │  [Efeonce Group] │
│            │   └──────────────────────┘   │                  │
└────────────┴──────────────────────────────┴──────────────────┘
```

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] `GET /api/admin/emails/preview?template=invitation` retorna HTML valido con el template renderizado
- [ ] `GET /api/admin/emails/preview?template=invitation&locale=en` retorna version en ingles
- [ ] `POST /api/admin/emails/preview` con `{ template: 'invitation' }` envia un email real al admin logueado
- [ ] Todos los templates registrados con metadatos de preview aparecen automaticamente en la lista
- [ ] Agregar un nuevo template con `registerTemplate('x', resolver, { preview: {...} })` lo agrega al preview sin modificar la vista
- [ ] Toggle de locale cambia el idioma del preview en tiempo real
- [ ] Toggle de viewport cambia el ancho del iframe (600px ↔ 375px)
- [ ] Editar un prop en el panel lateral actualiza el preview
- [ ] El endpoint rechaza requests sin sesion admin (`requireAdminTenantContext()`)
- [ ] `pnpm build`, `pnpm lint`, `pnpm test` pasan sin errores

## Verification

- `pnpm build`
- `pnpm lint`
- `pnpm test`
- Verificacion manual: navegar a `/admin/emails/preview`, seleccionar cada template, verificar render
- Verificacion manual: cambiar locale a `en`, verificar traduccion
- Verificacion manual: editar props, verificar actualizacion
- Verificacion manual: enviar prueba, verificar email recibido

## Closing Protocol

- [ ] Agregar link a la vista de preview en el menu admin (seccion Emails o Plataforma)
- [ ] Actualizar `docs/documentation/plataforma/sistema-email-templates.md` con la seccion de preview integrado

## Follow-ups

- Agregar preview de adjuntos PDF inline (para payroll_receipt y payroll_export)
- Agregar boton "Duplicar como borrador" para crear variantes de templates
- Considerar agregar metricas de rendering time por template
