---
name: greenhouse-email
description: Creates new email templates for Greenhouse EO. Handles React Email components, template registration, type updates, preview metadata, and delivery integration. Invoke when building new transactional or broadcast emails.
user-invocable: true
argument-hint: "[describe the email: purpose, domain, recipients, key data to show]"
---

# Greenhouse Email Template Builder

You are a senior developer creating production email templates for Greenhouse EO. You follow the project's exact email architecture — React Email components, centralized delivery layer, auto-context hydration, Resend provider.

## Tech Stack

| Layer | Technology | Details |
|-------|-----------|---------|
| Template Engine | React Email | `@react-email/components` v1.0.10 |
| Provider | Resend | `resend` v6.9.4 |
| Delivery | Centralized | `src/lib/email/delivery.ts` → `sendEmail()` |
| Context | Auto-hydrated | `src/lib/email/context-resolver.ts` |
| Types | TypeScript strict | `src/lib/email/types.ts` |
| Registration | Template registry | `src/lib/email/templates.ts` |
| Locale | es/en | Via `locale` prop, es default |
| AI Images | Imagen 4 via Vertex AI | `@google/genai` v1.45.0 |
| AI Animations | Gemini → SVG | CSS keyframes, brand palette |

---

## Architecture Overview

```
src/
  emails/
    components/
      EmailLayout.tsx          # Shared layout: header gradient + body card + footer
      EmailButton.tsx          # Styled CTA button
    constants.ts               # Brand tokens: EMAIL_COLORS, EMAIL_FONTS, LOGO_URL, APP_URL
    [TemplateName]Email.tsx     # One file per template
    [TemplateName]Email.test.tsx # Optional test
  lib/
    email/
      types.ts                 # EmailType union, EmailDomain, interfaces
      templates.ts             # registerTemplate() + registerPreviewMeta()
      delivery.ts              # sendEmail() — central entry point
      context-resolver.ts      # Auto-resolves userName, clientName, locale from PG
      tokens.ts                # ResolvedEmailContext types + DEFAULT_PLATFORM_CONTEXT
      subscriptions.ts         # getSubscribers/addSubscriber for broadcast types
      unsubscribe.ts           # JWT-signed unsubscribe URLs
      rate-limit.ts            # 10 emails/hour per recipient
    ai/
      image-generator.ts       # generateImage() (Imagen 4) + generateAnimation() (Gemini → SVG)
      google-genai.ts          # GoogleGenAI Vertex AI client singleton
  resend.ts                    # Resend client singleton
public/
  images/
    emails/                    # Pre-generated hero/header images for email templates
    banners/                   # Profile banners (7 categories, Imagen 4)
    generated/                 # Ad-hoc generated images
  animations/
    generated/                 # SVG animations (Gemini)
scripts/
  generate-banners.mts         # Batch banner generation script (reference for email images)
```

---

## Step-by-Step: Creating a New Email

### Step 1 — Add the email type to the union

File: `src/lib/email/types.ts`

Add the new type to `EmailType`:

```typescript
export type EmailType =
  | 'password_reset'
  | 'invitation'
  | 'verify_email'
  | 'payroll_export'
  | 'payroll_receipt'
  | 'notification'
  | 'your_new_type'          // ← add here
```

### Step 2 — Create the React Email template

File: `src/emails/YourNewEmail.tsx`

**Mandatory patterns:**

```typescript
import { Heading, Section, Text } from '@react-email/components'

import EmailButton from './components/EmailButton'
import EmailLayout from './components/EmailLayout'
import { EMAIL_COLORS, EMAIL_FONTS } from './constants'

// 1. Define a props interface — every prop has a default for preview
interface YourNewEmailProps {
  recipientName?: string
  someData: string
  locale?: 'es' | 'en'
  unsubscribeUrl?: string       // Only if broadcast type
}

// 2. Export default function with defaults on every prop
export default function YourNewEmail({
  recipientName = 'María González',
  someData = 'Preview value',
  locale = 'es',
  unsubscribeUrl
}: YourNewEmailProps) {
  // 3. Localization via inline t object (NOT i18n library)
  const t = locale === 'en' ? {
    heading: 'English heading',
    greeting: (name?: string) => name ? `Hi ${name},` : 'Hi,',
    cta: 'View in Greenhouse',
    fallback: 'If the button does not work, copy and paste this address into your browser:'
  } : {
    heading: 'Título en español',
    greeting: (name?: string) => name ? `Hola ${name?.split(' ')[0]},` : 'Hola,',
    cta: 'Ver en Greenhouse',
    fallback: 'Si el botón no funciona, copia y pega esta dirección en tu navegador:'
  }

  return (
    // 4. Always wrap in EmailLayout
    <EmailLayout previewText={t.heading} locale={locale} unsubscribeUrl={unsubscribeUrl}>
      {/* 5. Heading — Poppins, 24px, weight 700 */}
      <Heading style={{
        fontFamily: EMAIL_FONTS.heading,
        fontSize: '24px',
        fontWeight: 700,
        color: EMAIL_COLORS.text,
        margin: '0 0 8px',
        lineHeight: '32px'
      }}>
        {t.heading}
      </Heading>

      {/* 6. Greeting text */}
      <Text style={{
        fontSize: '15px',
        color: EMAIL_COLORS.secondary,
        lineHeight: '24px',
        margin: '0 0 20px'
      }}>
        {t.greeting(recipientName)}
      </Text>

      {/* 7. Body content */}
      <Text style={{
        fontSize: '15px',
        color: EMAIL_COLORS.secondary,
        lineHeight: '24px',
        margin: '0 0 28px'
      }}>
        {/* Your content here */}
      </Text>

      {/* 8. CTA button — centered section */}
      <Section style={{ textAlign: 'center' as const, margin: '0 0 28px' }}>
        <EmailButton href="https://greenhouse.efeoncepro.com/path">
          {t.cta}
        </EmailButton>
      </Section>

      {/* 9. Fallback URL for email clients that hide buttons */}
      <Text style={{
        fontSize: '12px',
        color: EMAIL_COLORS.muted,
        lineHeight: '18px',
        margin: '0',
        wordBreak: 'break-all'
      }}>
        {t.fallback} {'https://greenhouse.efeoncepro.com/path'}
      </Text>
    </EmailLayout>
  )
}
```

**Style reference — use these exact tokens:**

```typescript
// Colors (from src/emails/constants.ts)
EMAIL_COLORS.background   // '#F2F4F7' — page background
EMAIL_COLORS.containerBg  // '#FFFFFF' — card background
EMAIL_COLORS.headerBg     // '#022a4e' — Midnight Navy
EMAIL_COLORS.headerAccent // '#0375db' — Core Blue gradient stop
EMAIL_COLORS.primary      // '#0375db' — CTA buttons, links
EMAIL_COLORS.primaryHover // '#025bb0'
EMAIL_COLORS.text         // '#1A1A2E' — headings
EMAIL_COLORS.secondary    // '#344054' — body text
EMAIL_COLORS.muted        // '#667085' — disclaimers, footer
EMAIL_COLORS.border       // '#E4E7EC' — separators
EMAIL_COLORS.success      // '#12B76A' — positive indicators
EMAIL_COLORS.footerBg     // '#F9FAFB'

// Fonts
EMAIL_FONTS.heading  // Poppins — for headings and CTA text
EMAIL_FONTS.body     // DM Sans — for body text

// URLs
LOGO_URL  // 'https://greenhouse.efeoncepro.com/branding/logo-white-email.png'
APP_URL   // 'https://greenhouse.efeoncepro.com'
```

**Data display patterns (for emails with tables/summaries):**

```typescript
// Summary row pattern (from PayrollReceiptEmail)
const summaryRow = (label: string, value: string, emphasis = false) => (
  <table style={{ width: '100%', borderCollapse: 'collapse', borderBottom: `1px solid ${EMAIL_COLORS.border}` }}>
    <tbody>
      <tr>
        <td style={{ padding: '10px 0', fontFamily: EMAIL_FONTS.body, fontSize: '14px', color: EMAIL_COLORS.secondary, fontWeight: 500, width: '55%' }}>
          {label}
        </td>
        <td style={{ padding: '10px 0', fontFamily: EMAIL_FONTS.heading, fontSize: emphasis ? '18px' : '15px', color: EMAIL_COLORS.text, fontWeight: emphasis ? 700 : 600, textAlign: 'right', whiteSpace: 'nowrap' }}>
          {value}
        </td>
      </tr>
    </tbody>
  </table>
)

// Summary card wrapper
<Section style={{
  backgroundColor: '#F8FAFC',
  border: `1px solid ${EMAIL_COLORS.border}`,
  borderRadius: '12px',
  padding: '18px 18px 8px',
  margin: '0 0 24px',
}}>
  {summaryRow('Label', 'Value')}
  {summaryRow('Total', '$1,000', true)}
</Section>
```

### Step 3 — Register the template

File: `src/lib/email/templates.ts`

**Add import at top:**

```typescript
import YourNewEmail from '@/emails/YourNewEmail'
```

**Add registerTemplate() call** (after the existing ones, before the preview meta section):

```typescript
registerTemplate('your_new_type', (context: {
  // List ALL props the template needs
  someData: string
  recipientName?: string
  locale?: 'es' | 'en'
  unsubscribeUrl?: string        // Only for broadcast types
}) => {
  const locale = context.locale || 'es'

  return {
    subject: locale === 'en'
      ? 'English subject — Greenhouse'
      : 'Asunto en español — Greenhouse',
    react: YourNewEmail({
      someData: context.someData,
      recipientName: context.recipientName,
      locale,
      unsubscribeUrl: context.unsubscribeUrl
    }),
    text: buildYourNewPlainText(context)   // Plain text fallback
    // attachments: [...]                   // Optional: for emails with PDF/CSV
  }
})
```

**Plain text builder pattern:**

```typescript
const buildYourNewPlainText = (context: {
  someData: string
  recipientName?: string
  locale?: 'es' | 'en'
}) => {
  const locale = context.locale || 'es'
  const greeting = locale === 'en'
    ? (context.recipientName ? `Hi ${context.recipientName},` : 'Hi,')
    : (context.recipientName ? `Hola ${context.recipientName.split(' ')[0]},` : 'Hola,')

  return [
    greeting,
    '',
    '... plain text body ...',
    '',
    `→ ${process.env.NEXT_PUBLIC_APP_URL || 'https://greenhouse.efeoncepro.com'}/path`,
    '',
    '— Greenhouse by Efeonce Group'
  ].filter(Boolean).join('\n')
}
```

### Step 4 — Register preview metadata

File: `src/lib/email/templates.ts` (at the end, in the preview meta section)

```typescript
registerPreviewMeta('your_new_type', {
  label: 'Label descriptivo en español',
  description: 'Descripción breve del email para el admin preview',
  domain: 'finance',   // One of: 'identity' | 'payroll' | 'finance' | 'hr' | 'delivery' | 'system'
  supportsLocale: true,
  defaultProps: {
    someData: 'Valor de ejemplo para preview',
    recipientName: 'María González'
  },
  propsSchema: [
    { key: 'someData', label: 'Datos principales', type: 'text' },
    { key: 'recipientName', label: 'Nombre del destinatario', type: 'text' }
    // type: 'text' | 'number' | 'select' | 'boolean'
    // For select: add options: ['opt1', 'opt2']
  ]
})
```

### Step 5 — Send the email (from API route or service)

```typescript
import { sendEmail } from '@/lib/email/delivery'

// Pattern A: Direct send (with explicit recipients)
await sendEmail({
  emailType: 'your_new_type',
  domain: 'finance',
  recipients: [{ email: 'user@example.com', name: 'User Name', userId: 'user-123' }],
  context: {
    someData: 'actual value'
    // recipientName auto-hydrated by context-resolver if not provided
    // locale auto-hydrated from client_users.locale
  },
  sourceEntity: 'your_feature_name',
  actorEmail: session.user.email
})

// Pattern B: Broadcast (auto-resolves subscribers from email_subscriptions)
await sendEmail({
  emailType: 'your_new_type',
  domain: 'finance',
  // recipients omitted — pulls from email_subscriptions table
  context: { someData: 'actual value' },
  attachments: [{ filename: 'report.pdf', content: pdfBuffer, contentType: 'application/pdf' }]
})
```

---

## Domain Types

| Domain | Use for |
|--------|---------|
| `identity` | Auth flows: password reset, invitation, email verification |
| `payroll` | Payroll exports, individual receipts |
| `finance` | Invoicing, billing, financial reports |
| `hr` | HR notifications, leave, org changes |
| `delivery` | Project delivery, asset reviews, deadlines |
| `system` | Generic notifications, platform alerts |

---

## Auto-Hydrated Context

The delivery layer (`sendEmail()`) auto-resolves these fields for every recipient via PostgreSQL lookup. **You do NOT need to provide them** — they are injected into the template context automatically:

| Field | Source | Description |
|-------|--------|-------------|
| `userName` | `client_users.full_name` | Full name |
| `recipientFirstName` | Extracted from full_name | First name |
| `clientName` | `clients.client_name` | Company name |
| `clientId` | `client_users.client_id` | Client ID |
| `locale` | `client_users.locale` | `'es'` or `'en'` |
| `tenantType` | `client_users.tenant_type` | `'client'` or `'efeonce_internal'` |
| `platformUrl` | env or default | `https://greenhouse.efeoncepro.com` |
| `supportEmail` | hardcoded | `soporte@efeoncepro.com` |

Caller-provided values **take precedence** over auto-resolved values.

---

## Broadcast Emails (subscription-based)

For broadcast emails (e.g., payroll_export, notifications that go to all subscribers):

1. Add your type to `BROADCAST_EMAIL_TYPES` in `src/lib/email/delivery.ts` (line ~404)
2. Accept `unsubscribeUrl?: string` in your template props
3. Pass `unsubscribeUrl` to `<EmailLayout>`
4. Manage subscribers via `src/lib/email/subscriptions.ts`:
   - `addSubscriber(emailType, email, name?, userId?)`
   - `removeSubscriber(emailType, email)`
   - `getSubscribers(emailType)` — called automatically by `sendEmail()` when no recipients provided

---

## Attachments

Templates can return attachments in the `EmailTemplateRenderResult`:

```typescript
return {
  subject: '...',
  react: <Component />,
  text: '...',
  attachments: [{
    filename: 'report.pdf',
    content: pdfBuffer,       // Buffer
    contentType: 'application/pdf'
  }]
}
```

Callers can also pass attachments via `sendEmail({ attachments })`. Both are merged.

---

## AI Visual Enrichment (Imagen 4 + Gemini)

Emails can include AI-generated images to make them visually richer and more engaging. The project has a full image generation pipeline using **Imagen 4** (raster images) and **Gemini** (SVG animations) via Vertex AI.

### Image Generation API

**Core module:** `src/lib/ai/image-generator.ts`

```typescript
import { generateImage } from '@/lib/ai/image-generator'

// Generate a hero/header image for an email template
const result = await generateImage(
  'Modern SaaS abstract banner, soft gradient from navy to teal, translucent glass shapes, minimal, no text no people no logos, 8K quality',
  {
    aspectRatio: '16:9',    // '1:1' | '16:9' | '9:16' | '4:3' | '3:4'
    format: 'png',          // 'png' | 'webp'
    filename: 'email-hero-finance-report.png',  // optional, auto-slugified if omitted
    numberOfImages: 1
  }
)
// result: { path: '/images/generated/email-hero-finance-report.png', filename, format, sizeBytes }
```

**SVG animation (Gemini):**

```typescript
import { generateAnimation } from '@/lib/ai/image-generator'

const result = await generateAnimation(
  'Subtle pulsing notification bell icon with gentle glow effect',
  { filename: 'email-notification-icon.svg', width: 120, height: 120 }
)
// result: { path: '/animations/generated/email-notification-icon.svg', svgContent, sizeBytes }
```

### API Endpoints (admin-only)

```bash
# Generate raster image
POST /api/internal/generate-image
  { "prompt": "...", "aspectRatio": "16:9", "format": "png", "filename": "..." }

# Generate SVG animation
POST /api/internal/generate-animation
  { "prompt": "...", "filename": "...", "width": 120, "height": 120 }
```

Both require `requireAdminTenantContext()` + `ENABLE_ASSET_GENERATOR=true` in production.

### Strategy: Pre-generate, Not On-the-fly

**IMPORTANT:** Email images must be **pre-generated and committed to the repo**, not generated at send time. Reasons:

1. Email clients need stable, absolute URLs that resolve instantly
2. Generated images go to `public/` and are served by Vercel CDN
3. Generating at send time would add latency and risk failures
4. Images must be identical for all recipients of the same email type

**Workflow for adding images to an email:**

1. **Generate** the image using `generateImage()` or the batch script pattern
2. **Save** to `public/images/emails/` (create this dir for email-specific images)
3. **Commit** the image to git — Vercel CDN serves it automatically
4. **Reference** in the template with an absolute URL:

```typescript
import { Img } from '@react-email/components'

// In your email template:
<Img
  src="https://greenhouse.efeoncepro.com/images/emails/hero-finance-report.png"
  alt="Greenhouse Finance"
  width={560}
  height={180}
  style={{
    width: '100%',
    height: 'auto',
    borderRadius: '8px',
    margin: '0 0 24px'
  }}
/>
```

### Batch Generation Script Pattern

Follow the pattern in `scripts/generate-banners.mts` to create a batch script for email images:

```typescript
// scripts/generate-email-images.mts
import { GoogleGenAI } from '@google/genai'
import { writeFile, mkdir } from 'node:fs/promises'
import { join } from 'node:path'

const OUTPUT_DIR = join(process.cwd(), 'public', 'images', 'emails')
const MODELS = ['imagen-4.0-generate-001', 'imagen-3.0-generate-002']

const EMAIL_IMAGES: Record<string, string> = {
  'hero-your-email-type':
    'Modern SaaS email header banner, [describe visual metaphor], translucent glass shapes with soft gradients, deep navy to [accent color] gradient background, glass morphism aesthetic, ultra clean Linear/Vercel design language, no text no people no logos, 8K render quality'
}

// ... follow generate-banners.mts pattern for client setup + generation loop
```

Run: `npx tsx scripts/generate-email-images.mts`

### Prompt Guidelines for Email Images

**Style rules (match existing banner aesthetic):**
- Always include: `no text no people no logos, 8K render quality`
- Always include: `ultra clean Linear/Vercel design language`
- Use: `glass morphism`, `translucent`, `soft gradients`, `abstract 3D shapes`
- Use Greenhouse brand gradients: navy (#022a4e) to blue (#0375db), or domain-specific palettes
- Aspect ratio: `16:9` for hero banners, `1:1` for icons/thumbnails
- Keep images abstract and professional — never photorealistic faces or specific objects

**Domain color mapping:**

| Domain | Palette | Metaphor |
|--------|---------|----------|
| identity | Navy → purple | Glass structures, frameworks, keys |
| payroll | Blue → teal | Flowing pipelines, rhythmic flow |
| finance | Indigo → amber | Growth curves, analytical layers, charts |
| hr | Green → warm earth | Root networks, organic connections |
| delivery | Magenta → coral | Blooming shapes, creative bursts |
| system | Navy → cyan | Circuit meshes, sensor grids |

### Using Images in EmailLayout

For hero images that sit between the header gradient and the body card, place the `<Img>` as the first child inside `<EmailLayout>`:

```typescript
<EmailLayout previewText={t.heading} locale={locale}>
  {/* Hero image — full width of the card */}
  <Img
    src="https://greenhouse.efeoncepro.com/images/emails/hero-your-type.png"
    alt=""
    width={560}
    height={180}
    style={{
      width: '100%',
      height: 'auto',
      borderRadius: '8px 8px 0 0',
      margin: '-40px -36px 24px -36px',  // Bleed into card padding for edge-to-edge effect
      maxWidth: 'calc(100% + 72px)',
      display: 'block'
    }}
  />

  <Heading style={{ ... }}>
    {t.heading}
  </Heading>
  {/* rest of content */}
</EmailLayout>
```

For inline illustrations (smaller, within the body):

```typescript
<Img
  src="https://greenhouse.efeoncepro.com/images/emails/icon-success.png"
  alt=""
  width={80}
  height={80}
  style={{ margin: '0 auto 16px', display: 'block' }}
/>
```

### Email Client Compatibility Notes

- **Always use absolute URLs** (`https://greenhouse.efeoncepro.com/...`), never relative paths
- **Always set `width` and `height`** attributes — many email clients need them for layout
- **Use `alt=""`** for decorative images (screen readers skip them)
- **PNG preferred** over WebP — Gmail, Outlook, and Apple Mail all support PNG; WebP support is inconsistent
- **Max image width: 560px** — matches the `<Container>` max-width in EmailLayout
- **Keep file size under 200KB** per image — large images get clipped or blocked by email clients
- **SVG animations do NOT work in email** — email clients strip `<style>` and `<script>`. Only use raster images (PNG) in email templates. SVG animations are for the web portal only.

---

## Conventions & Rules

1. **File naming**: `PascalCaseEmail.tsx` in `src/emails/` — always suffix with `Email`
2. **Default props**: Every prop MUST have a sensible default for the preview server
3. **Localization**: Use inline `t` object pattern, NOT i18n libraries. Spanish is default.
4. **Greeting**: Spanish uses first name only (`name.split(' ')[0]`), English uses full name
5. **Plain text**: Every template MUST have a plain text version for accessibility
6. **No external state**: Templates are pure functions — no hooks, no fetch, no server calls
7. **Inline styles only**: React Email does not support CSS classes — all styles are inline objects
8. **`as const` for textAlign**: Always cast `textAlign: 'center' as const` (TypeScript requirement)
9. **`EmailLayout` wraps everything**: Never render `<Html>` or `<Body>` directly in a template
10. **`EmailButton` for CTAs**: Never use raw `<Button>` from `@react-email/components`
11. **Import from components/**: `EmailLayout` and `EmailButton` live in `src/emails/components/`
12. **Import constants**: Always use `EMAIL_COLORS` and `EMAIL_FONTS` from `src/emails/constants.ts`
13. **No emojis in subjects**: Keep subjects professional, use em dash (—) as separator
14. **Subject pattern**: `"Descriptive text — Greenhouse"` or `"Descriptive text — Period/Context"`
15. **Money formatting**: CLP → `$1.234.567` (no decimals), USD → `US$1,234.56`

---

## Checklist for New Email

- [ ] Added type to `EmailType` union in `src/lib/email/types.ts`
- [ ] Created `src/emails/[Name]Email.tsx` with defaults on all props
- [ ] Template uses `EmailLayout`, `EmailButton`, `EMAIL_COLORS`, `EMAIL_FONTS`
- [ ] Localization (es/en) via inline `t` object
- [ ] Registered via `registerTemplate()` in `src/lib/email/templates.ts`
- [ ] Plain text fallback builder function
- [ ] Registered via `registerPreviewMeta()` for admin preview
- [ ] If broadcast: added to `BROADCAST_EMAIL_TYPES` + accepts `unsubscribeUrl`
- [ ] Sending code uses `sendEmail()` from `src/lib/email/delivery.ts`
- [ ] Subject follows pattern: `"Text — Context"` (no emojis)
- [ ] If using AI images: generated with Imagen 4, saved to `public/images/emails/`, committed to git
- [ ] If using AI images: absolute URLs, PNG format, width/height attributes, under 200KB
- [ ] `pnpm build` passes
- [ ] `npx tsc --noEmit` passes

---

## Dev Preview

```bash
# Start React Email preview server on port 3001
pnpm email:dev
```

Templates with default props render in the browser for visual testing. Admin preview is available at `/api/admin/emails/preview?template=your_new_type&locale=es`.

---

## Reference Files

| Purpose | Path |
|---------|------|
| Types | `src/lib/email/types.ts` |
| Registry | `src/lib/email/templates.ts` |
| Delivery | `src/lib/email/delivery.ts` |
| Context resolver | `src/lib/email/context-resolver.ts` |
| Tokens | `src/lib/email/tokens.ts` |
| Resend client | `src/lib/resend.ts` |
| Layout | `src/emails/components/EmailLayout.tsx` |
| Button | `src/emails/components/EmailButton.tsx` |
| Constants | `src/emails/constants.ts` |
| Subscriptions | `src/lib/email/subscriptions.ts` |
| Unsubscribe | `src/lib/email/unsubscribe.ts` |
| Rate limit | `src/lib/email/rate-limit.ts` |
| Admin preview API | `src/app/api/admin/emails/preview/route.ts` |
| Delivery history API | `src/app/api/admin/email-deliveries/route.ts` |
| Image generator | `src/lib/ai/image-generator.ts` |
| GenAI client | `src/lib/ai/google-genai.ts` |
| Generate image API | `src/app/api/internal/generate-image/route.ts` |
| Generate animation API | `src/app/api/internal/generate-animation/route.ts` |
| Banner batch script | `scripts/generate-banners.mts` |
| Email images dir | `public/images/emails/` |
| Banner resolver (reference) | `src/lib/person-360/resolve-banner.ts` |
