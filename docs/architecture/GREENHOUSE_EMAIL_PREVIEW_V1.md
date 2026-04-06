# Greenhouse Email Template Preview — Admin Preview & Test Send System

> **Version:** 1.0
> **Created:** 2026-04-06
> **Status:** Implemented
> **Audience:** AI agents, platform engineers, developers
> **Related:** [GREENHOUSE_EMAIL_CATALOG_V1.md](./GREENHOUSE_EMAIL_CATALOG_V1.md) (email catalog & delivery), [GREENHOUSE_IDENTITY_ACCESS_V2.md](./GREENHOUSE_IDENTITY_ACCESS_V2.md) (auth & RBAC)

---

## 1. Overview

The Email Template Preview system provides an admin-facing tool for rendering, inspecting, and test-sending every transactional email template registered in Greenhouse. It eliminates the need for a local react-email dev server for template review and enables non-technical stakeholders with admin access to verify email appearance before campaigns or feature launches.

**Key goals:**

- Zero-config auto-discovery: any template that calls `registerPreviewMeta()` appears in the preview UI automatically
- Bilingual preview: toggle between `es` and `en` renders for templates that support i18n
- Desktop/mobile viewport simulation via iframe width switching (600px / 375px)
- Live prop editing: change template variables (name, URL, amounts) and see the preview re-render with debounce
- Test send: dispatch a real email through the production delivery pipeline (`sendEmail()`) to validate end-to-end rendering in actual mail clients

---

## 2. Auto-Discovery Architecture

### 2.1 PreviewMeta Interface

```typescript
// src/lib/email/types.ts
export interface EmailPreviewMeta {
  label: string                     // Human-readable name for the UI sidebar
  description: string               // Short description of the template's purpose
  domain: EmailDomain               // 'identity' | 'payroll' | 'system' | ...
  defaultProps: Record<string, unknown>  // Default props for preview rendering
  supportsLocale: boolean           // Whether the template accepts locale ('es' | 'en')
  propsSchema: EmailPreviewPropField[]  // Schema for the props editor panel
}

export interface EmailPreviewPropField {
  key: string
  label: string
  type: 'text' | 'number' | 'select' | 'boolean'
  options?: string[]                // Only for type 'select'
}
```

### 2.2 Registration Pattern

Templates are registered for preview via `registerPreviewMeta()` in `src/lib/email/templates.ts`. This function stores metadata in a module-level `Map<EmailType, EmailPreviewMeta>`:

```typescript
registerPreviewMeta('invitation', {
  label: 'Invitacion de onboarding',
  description: 'Email que se envia al invitar un usuario nuevo a la plataforma',
  domain: 'identity',
  supportsLocale: true,
  defaultProps: {
    inviteUrl: 'https://greenhouse.efeoncepro.com/auth/accept-invite?token=preview-token',
    inviterName: 'Julio Reyes',
    clientName: 'Efeonce Group',
    userName: 'Maria Gonzalez'
  },
  propsSchema: [
    { key: 'inviterName', label: 'Nombre del invitador', type: 'text' },
    { key: 'clientName', label: 'Nombre del cliente', type: 'text' },
    // ...
  ]
})
```

### 2.3 Auto-Discovery Flow

1. `templates.ts` is loaded on server startup (imported by the API route)
2. Each `registerPreviewMeta()` call pushes an entry into `EMAIL_PREVIEW_META` map
3. The catalog endpoint reads the full map — no manifest file, no config, no database query
4. New templates appear in the UI immediately after calling `registerPreviewMeta()` and deploying

---

## 3. API Contract

All endpoints live at `/api/admin/emails/preview` (`src/app/api/admin/emails/preview/route.ts`).

### 3.1 GET — Catalog (no params)

Returns the full list of preview-enabled templates.

```
GET /api/admin/emails/preview
→ 200 { catalog: Array<{ emailType, label, description, domain, supportsLocale, defaultProps, propsSchema }> }
```

### 3.2 GET — Render Preview

Renders a specific template to HTML.

```
GET /api/admin/emails/preview?template=invitation&locale=en&props={"userName":"Test"}
→ 200 {
    html: "<html>...",
    subject: "You were invited to Greenhouse — Efeonce",
    text: "...",
    meta: { label, domain, supportsLocale }
  }
→ 404 { error: 'Template "X" no encontrado.' }
→ 400 { error: 'props debe ser JSON valido.' }
→ 500 { error: 'Error al renderizar template.' }
```

| Param      | Type   | Required | Default | Notes                                     |
| ---------- | ------ | -------- | ------- | ----------------------------------------- |
| `template` | string | Yes      | —       | `EmailType` key (e.g. `invitation`)       |
| `locale`   | string | No       | `es`    | `'es'` or `'en'`                          |
| `props`    | string | No       | `{}`    | JSON-encoded object to override defaults  |

### 3.3 POST — Test Send

Sends a real test email through `sendEmail()`.

```
POST /api/admin/emails/preview
Content-Type: application/json

{
  "template": "invitation",
  "locale": "es",
  "props": { "userName": "Test User" },
  "recipientEmail": "julio@efeonce.com"   // optional, defaults to admin's email
}

→ 200 { sent: true, deliveryId: "...", recipientEmail: "...", status: "sent" }
→ 404 { error: 'Template "X" no encontrado.' }
→ 400 { error: 'template es requerido.' }
→ 500 { error: 'Error al enviar correo de prueba.' }
```

The test send goes through the full delivery pipeline: context resolver, rate limiting, tracking, and Resend dispatch. The email is recorded in `email_deliveries` with `source_entity = 'email_preview_test'`.

---

## 4. Rendering Pipeline

```
Client (browser)
  │
  │  GET /api/admin/emails/preview?template=X&locale=Y&props=Z
  │
  ▼
requireAdminTenantContext()        ← Auth gate
  │
  ▼
getPreviewMeta(template)           ← Lookup in EMAIL_PREVIEW_META map
  │
  ▼
merge: { ...meta.defaultProps, ...overrideProps, locale? }
  │
  ▼
resolveTemplate(template, mergedProps)
  │  → calls registered resolver function
  │  → returns { subject, react: ReactElement, text }
  │
  ▼
render(resolved.react)             ← @react-email/render → HTML string
  │
  ▼
→ { html, subject, text, meta }    ← JSON response to client
  │
  ▼
iframe.srcDoc = html               ← Client renders via sandboxed iframe
```

The iframe uses `sandbox="allow-same-origin"` — no script execution, no navigation, no forms. The preview is purely visual.

---

## 5. Auth & Authorization

| Layer                | Mechanism                                                                       |
| -------------------- | ------------------------------------------------------------------------------- |
| **API route**        | `requireAdminTenantContext()` — rejects non-admin sessions with 403             |
| **Page route**       | `hasAuthorizedViewCode({ viewCode: 'administracion.email_delivery' })` + fallback to `routeGroups.includes('admin')` |
| **Menu visibility**  | `canSeeView('administracion.email_delivery', true)` in `VerticalMenu.tsx`       |

Only users with the `efeonce_admin` role (or explicit `administracion.email_delivery` view code in their permission set) can access the preview.

---

## 6. UI Layout

Three-panel layout in `EmailTemplatePreviewView.tsx`:

```
┌──────────────┬──────────────────────────────────┬─────────────────┐
│              │         Toolbar                   │                 │
│   Template   │  [ES|EN] [Desktop|Mobile] Subject │   Props Editor  │
│   List       │                      [Send Test]  │                 │
│   (240px)    ├──────────────────────────────────┤   (320px,       │
│              │                                  │    collapsible)  │
│  - Invitation│         iframe (srcdoc)          │                 │
│  - Password  │         600px / 375px            │  [userName]     │
│  - Verify    │                                  │  [inviteUrl]    │
│  - Notif     │         bg: #F2F4F7              │  [clientName]   │
│  - Payroll   │                                  │  ...            │
│  - Receipt   │                                  │                 │
└──────────────┴──────────────────────────────────┴─────────────────┘
```

| Panel          | Width  | Behavior                                                              |
| -------------- | ------ | --------------------------------------------------------------------- |
| Template list  | 240px  | Fixed sidebar; shows label + domain chip per template                 |
| Preview        | flex   | Centered iframe; width switches between 600px (desktop) / 375px (mobile) |
| Props editor   | 320px  | Collapsible; renders `TextField` per `propsSchema` entry; debounced 500ms |

The toolbar displays: locale toggle, viewport toggle, subject line (from last render), props panel toggle button, and "Enviar prueba" button.

---

## 7. Integration Points

| System                  | How it integrates                                                                   |
| ----------------------- | ----------------------------------------------------------------------------------- |
| **sendEmail()**         | Test sends use the full delivery pipeline — context resolver, rate limit, tracking  |
| **@react-email/render** | Server-side render of React email components to HTML string                         |
| **Resend**              | Test sends go through Resend like any production email                              |
| **email_deliveries**    | Test sends are tracked with `source_entity = 'email_preview_test'`                  |
| **Rate limiting**       | Test sends are subject to the same 10/hour/recipient rate limit                     |

---

## 8. File Manifest

| File                                                                  | Purpose                                   |
| --------------------------------------------------------------------- | ----------------------------------------- |
| `src/app/api/admin/emails/preview/route.ts`                          | API: catalog, render, test send           |
| `src/app/(dashboard)/admin/emails/preview/page.tsx`                  | Page: auth guard + view mount             |
| `src/views/greenhouse/admin/email-preview/EmailTemplatePreviewView.tsx` | UI: three-panel preview layout          |
| `src/lib/email/templates.ts`                                         | Template registry + preview meta registry |
| `src/lib/email/types.ts`                                             | `EmailPreviewMeta`, `EmailPreviewPropField` interfaces |

---

## 9. Extensibility — Adding a New Template to Preview

To make a new email template appear in the preview system:

1. Register the template resolver as usual with `registerTemplate()` in `templates.ts`
2. Call `registerPreviewMeta()` with the template's `EmailType` key:

```typescript
registerPreviewMeta('my_new_email', {
  label: 'My New Email',
  description: 'What this email does',
  domain: 'identity',       // or 'payroll', 'system', etc.
  supportsLocale: true,
  defaultProps: {
    userName: 'Maria Gonzalez',
    someUrl: 'https://example.com'
  },
  propsSchema: [
    { key: 'userName', label: 'Recipient name', type: 'text' },
    { key: 'someUrl', label: 'Action URL', type: 'text' }
  ]
})
```

3. Deploy. The template will appear in the sidebar automatically — no UI changes, no config files, no database entries.

**Rules for `propsSchema`:**
- Every prop that an admin might want to change should have an entry
- Use `type: 'select'` with `options` for enum fields (e.g., currency, regime)
- Use `type: 'number'` for numeric fields — the UI renders a standard text field but the value is passed as-is
- `defaultProps` should produce a realistic, visually complete preview

---

## 10. Currently Registered Templates

| EmailType          | Label                       | Domain     | i18n  |
| ------------------ | --------------------------- | ---------- | ----- |
| `invitation`       | Invitacion de onboarding    | identity   | Yes   |
| `password_reset`   | Restablecer contrasena      | identity   | Yes   |
| `verify_email`     | Verificacion de correo      | identity   | Yes   |
| `notification`     | Notificacion generica       | system     | Yes   |
| `payroll_export`   | Nomina cerrada              | payroll    | No    |
| `payroll_receipt`  | Recibo de nomina            | payroll    | No    |
