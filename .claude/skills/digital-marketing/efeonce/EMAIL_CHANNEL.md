# Email como canal en Greenhouse

> Esta skill posee el *craft del canal email* (campañas, newsletters, nurture, segmentación).
> La *infra de plantillas y entrega* es de `greenhouse-email` + `src/lib/email/**`; el
> *lifecycle/behavioral y la deliverability detallada* son de `growth-marketing-cro` (06).

## Infra real en el repo

`src/lib/email/`:
- `delivery.ts`, `deliverability-monitor.ts`, `subscriptions.ts`, `unsubscribe.ts`,
  `rate-limit.ts`, `context-resolver.ts`, `locale-resolver.ts`, `templates.ts`,
  `template-copy.ts`, `tokens.ts`, `types.ts`.

`src/emails/` (React Email — transaccional + un broadcast/digest):
- `WeeklyExecutiveDigestEmail.tsx`, `AiVisibilityGraderReportEmail.tsx`, `InvitationEmail.tsx`,
  `MagicLinkEmail.tsx`, `VerifyEmail.tsx`, `PasswordResetEmail.tsx`, `NotificationEmail.tsx`,
  `QuoteSharePromptEmail.tsx`, + payroll/leave/contractor. `components/`, `constants.ts`.

Rutas/crons: `api/admin/emails`, `admin/email-subscriptions`, `admin/email-deliveries`,
`admin/email-gdpr-deletion`, `account/email-preferences`, `cron/email-deliverability-monitor`,
`cron/email-data-retention`, `cron/email-delivery-retry`.

## Frontera de ownership

| Tipo | Ejemplo repo | Dueño |
|---|---|---|
| Transaccional | Magic link, verify, password reset, invitation | `greenhouse-email` + `src/lib/email` |
| Broadcast/digest | Weekly Executive Digest, AI Visibility Grader report | infra `greenhouse-email`; *estrategia de campaña* → esta skill |
| **Marketing campaign / newsletter / nurture** | (no existe rail dedicado hoy) | **craft → esta skill**; entrega → `greenhouse-email` |
| Lifecycle/behavioral | (triggers por comportamiento) | `growth-marketing-cro` (06) |

**No existe** hoy un rail de marketing-email/drip/segmentación en el repo (HubSpot es CRM, ver
`CHANNELS_AND_MARTECH_GAPS.md`). Si se construye, la **infra de plantillas/entrega** reusa
`src/lib/email/**` + `greenhouse-email`; el **craft de campaña/segmentación** lo diseña esta skill;
la **lógica de disparo por comportamiento** es de growth.

## Deliverability

- Hay `deliverability-monitor.ts` + crons de retry/retention. El **detalle de reglas 2026**
  (SPF/DKIM/DMARC, one-click unsubscribe, spam <0.10%, Gmail/Yahoo) vive en
  `growth-marketing-cro` (06). No lo dupliques; referéncialo.

## Reglas duras

- **NUNCA** reimplementar entrega/plantillas de email: reusa `src/lib/email/**` + `greenhouse-email`.
- **NUNCA** meter lógica de lifecycle/retención acá (es de `growth-marketing-cro` 06).
- El craft de campaña/newsletter/segmentación es de esta skill; la infra y el lifecycle, de sus dueños.
