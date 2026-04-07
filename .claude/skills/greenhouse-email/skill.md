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

Emails can include AI-generated hero images to make them visually richer. The project uses **Imagen 4** (raster images) via Vertex AI.

### Image Storage: GCS Public Buckets (NOT Vercel)

**CRITICAL:** Email images MUST be stored in the **GCS public media bucket**, NOT in `public/` served by Vercel. Reasons learned from production:

1. Vercel staging has **SSO Protection** — the browser cannot load images from Vercel URLs in email previews or real emails
2. `NEXT_PUBLIC_APP_URL` is not set in Vercel — URL resolution breaks across environments
3. GCS public buckets are accessible without auth, work in all email clients, and are environment-aware

**Buckets per environment:**

| Environment | Bucket | URL pattern |
|-------------|--------|-------------|
| Staging | `efeonce-group-greenhouse-public-media-staging` | `https://storage.googleapis.com/efeonce-group-greenhouse-public-media-staging/emails/...` |
| Production | `efeonce-group-greenhouse-public-media-prod` | `https://storage.googleapis.com/efeonce-group-greenhouse-public-media-prod/emails/...` |

**Env var:** `GREENHOUSE_PUBLIC_MEDIA_BUCKET` — set per environment in Vercel.

### Workflow for Adding Images to an Email

1. **Generate** the image using Imagen 4 (via script or API)
2. **Resize** to 560px width using `sips --resampleWidth 560` (macOS) — target under 200KB
3. **Upload to BOTH GCS buckets:**
   ```bash
   gcloud storage cp image.png gs://efeonce-group-greenhouse-public-media-staging/emails/image.png
   gcloud storage cp image.png gs://efeonce-group-greenhouse-public-media-prod/emails/image.png
   ```
4. **Also commit** to `public/images/emails/` for local dev and as a git record
5. **Reference in the template** using the GCS URL resolved from the bucket env var:

```typescript
const MEDIA_BUCKET = process.env.GREENHOUSE_PUBLIC_MEDIA_BUCKET || 'efeonce-group-greenhouse-public-media-prod'
const HERO_IMAGE_URL = `https://storage.googleapis.com/${MEDIA_BUCKET}/emails/your-image.png`
```

### Image Generation API

**Core module:** `src/lib/ai/image-generator.ts`

```typescript
import { generateImage } from '@/lib/ai/image-generator'

const result = await generateImage(
  'Clay 3D render on a pure white background. [describe objects]...',
  { aspectRatio: '16:9', format: 'png', filename: 'email-hero-name.png' }
)
```

**Batch script:** `scripts/generate-email-images.mts` — run with `npx tsx scripts/generate-email-images.mts`

### Prompt Guidelines for Email Hero Images

**Mandatory style: Clay 3D on white background.** This is the canonical style for Greenhouse email heroes.

**Prompt structure:**

```
Clay 3D render on a pure white background. [Describe the main object in midnight navy (#022a4e)].
[Describe secondary objects using core blue (#0375db) and teal accents].
[Describe small accent in success green (#12B76A) if approval-related].
All objects have rounded edges, matte clay textures, and cast soft diffused shadows
directly below onto the white surface. Minimal composition, centered, professional.
Soft ambient studio lighting from above. Cool neutral shadows, no warm tones.
No text, no people, no logos. 16:9 aspect ratio.
```

**Rules:**
- **ALWAYS** use `pure white background` — the image sits inside a white email card, must blend seamlessly
- **ALWAYS** use clay 3D style: `matte clay textures`, `rounded edges`, `soft diffused shadows`
- **ALWAYS** use brand colors for objects: midnight navy (#022a4e) as primary, core blue (#0375db) as accent, success green (#12B76A) for positive elements
- **ALWAYS** include: `No text, no people, no logos`
- **ALWAYS** include: `Cool neutral shadows, no warm tones` — prevents Imagen from adding warm tinted backgrounds
- **NEVER** use dark backgrounds, abstract gradients, glass morphism, or tech-circuit aesthetics — those are for profile banners, not emails
- Choose objects that are **semantically related** to the email content (calendar for leave, clipboard for review, invoice for finance, etc.)
- Keep composition **centered and minimal** — the image is small (560×305), complex scenes become noisy

**Domain object mapping (clay 3D):**

| Domain | Primary object | Secondary objects | Accent |
|--------|---------------|-------------------|--------|
| identity | Navy key or shield | Blue lock, teal envelope | Green checkmark |
| payroll | Navy payslip/document | Blue calculator, teal coins | Green badge |
| finance | Navy chart/ledger | Blue coins, teal arrow up | Green growth indicator |
| hr | Navy calendar | Blue checkmark, teal clock | Green ribbon |
| delivery | Navy package/box | Blue rocket, teal clipboard | Green star |
| system | Navy gear/bell | Blue wrench, teal notification | Green pulse |

### Using Images in EmailLayout

Place the `<Img>` as the **first child** inside `<EmailLayout>`:

```typescript
import { Img } from '@react-email/components'

const MEDIA_BUCKET = process.env.GREENHOUSE_PUBLIC_MEDIA_BUCKET || 'efeonce-group-greenhouse-public-media-prod'
const HERO_IMAGE_URL = `https://storage.googleapis.com/${MEDIA_BUCKET}/emails/your-image.png`

// Inside the component:
<EmailLayout previewText={t.heading} locale={locale}>
  <Img
    src={HERO_IMAGE_URL}
    alt=""
    width={560}
    height={305}
    style={{
      width: '100%',
      height: 'auto',
      borderRadius: '8px',
      margin: '0 0 24px',
      display: 'block'
    }}
  />
  {/* rest of email content */}
</EmailLayout>
```

### Post-Generation Checklist

- [ ] Generated with Imagen 4 (`imagen-4.0-generate-001`)
- [ ] White background, clay 3D style, brand colors
- [ ] Resized to **560px width** (`sips --resampleWidth 560`)
- [ ] File size **under 200KB** (PNG)
- [ ] Uploaded to **staging** GCS bucket (`gcloud storage cp`)
- [ ] Uploaded to **prod** GCS bucket (`gcloud storage cp`)
- [ ] Committed to `public/images/emails/` in git (local dev + record)
- [ ] Template references `GREENHOUSE_PUBLIC_MEDIA_BUCKET` env var for URL
- [ ] `alt=""` (decorative), `width` and `height` attributes set
- [ ] Verified in admin preview (`/admin/emails/preview`)

### Email Client Compatibility Notes

- **Always use absolute GCS URLs** — never Vercel URLs or relative paths
- **Always set `width` and `height`** attributes — many email clients need them for layout
- **Use `alt=""`** for decorative images (screen readers skip them)
- **PNG only** — Gmail, Outlook, and Apple Mail all support PNG; WebP support is inconsistent
- **Max image width: 560px** — matches the `<Container>` max-width in EmailLayout
- **Keep file size under 200KB** per image — large images get clipped or blocked
- **SVG animations do NOT work in email** — email clients strip `<style>` and `<script>`. Only use raster PNG in emails

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
- [ ] If using AI images: clay 3D on white bg, brand colors, resized to 560px, under 200KB
- [ ] If using AI images: uploaded to BOTH GCS public buckets (staging + prod), committed to git
- [ ] If using AI images: template uses `GREENHOUSE_PUBLIC_MEDIA_BUCKET` env var for URL resolution
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
