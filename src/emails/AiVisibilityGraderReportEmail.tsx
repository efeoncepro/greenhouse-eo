import { Heading, Section, Text } from '@react-email/components'

import { getMicrocopy, type AiVisibilityGraderReportEmailTemplateCopy } from '@/lib/copy'
import { selectEmailTemplateCopy } from '@/lib/email/template-copy'

import EmailButton from './components/EmailButton'
import EmailLayout from './components/EmailLayout'
import { EMAIL_COLORS, EMAIL_FONTS } from './constants'

/**
 * TASK-1250 — AI Visibility Grader report delivery email (lead magnet).
 *
 * Approved Product Design direction "Report Packet Delivery": an auditable delivery
 * packet, not just a notification — compact score summary + one priority insight
 * (qué detectamos / por qué importa / qué hacer ahora) + tokenized secure link +
 * attachment notice + consent/provenance + plain-text fallback.
 *
 * BRAND = Efeonce (the AGENCY), NOT the Greenhouse portal: a cold public prospect
 * receives this. The attachment (TASK-1273 PDF) is already 100% Efeonce-branded;
 * this body matches. "Efeonce Greenhouse" is never used (carried brand debt).
 *
 * Leak-safe by construction: every field is built server-side from the frozen
 * `PublicGraderReport` snapshot (via the report-artifact model) — no raw provider
 * text, accuracy findings, internal ids or PII reach this template.
 */
export interface AiVisibilityReportEmailInsight {
  detection: string
  importance: string
  action: string
}

interface AiVisibilityGraderReportEmailProps {
  organizationName: string
  scoreValue: number | null
  levelLabel: string | null
  primaryGapTitle: string | null
  isPartial: boolean
  insight: AiVisibilityReportEmailInsight | null
  reportUrl: string
  attachmentFilename: string
  attachmentSizeLabel: string | null
  locale?: 'es' | 'en'
}

const LEGACY_EN_AI_VISIBILITY_REPORT_EMAIL_COPY: AiVisibilityGraderReportEmailTemplateCopy = {
  previewText: () => 'Your AI visibility report is ready',
  heading: 'Your full report is here',
  headingPartial: 'Your visibility report is ready',
  greeting: 'Hi,',
  intro: organizationName =>
    `We analyzed how ${organizationName} shows up across AI engines and search. Here is your headline finding; the full report is attached as a PDF and available through a secure link.`,
  partialBanner:
    'Partial delivery: some engines did not respond in time. The report reflects the available results.',
  summary: {
    scoreLabel: 'Estimated visibility',
    scoreSuffix: '/ 100',
    scoreEmpty: 'No data',
    levelLabel: 'Level',
    gapLabel: 'Main gap',
    gapEmpty: '—',
    contentLabel: 'Content',
    contentValue: 'Public · safe to share'
  },
  insight: {
    eyebrow: 'Priority #1',
    detectionLabel: 'What we found',
    importanceLabel: 'Why it matters',
    actionLabel: 'What to do now'
  },
  cta: 'Open secure report',
  ctaHelp: 'The link gives you secure access to the online report and the attached PDF.',
  attachment: {
    title: 'Full report attached',
    formatPrefix: 'PDF document',
    description: 'Contains the detailed analysis, gaps, opportunities and next steps.'
  },
  why: {
    title: 'Why did you receive this report?',
    body: 'You requested it from the AI visibility diagnostic and agreed to receive it. It is public and safe to share: it contains no confidential information.'
  },
  fallback: {
    title: 'If the button does not work, copy this secure link',
    note: 'For your security, this link has an expiration.'
  },
  automatedFooter: () => 'Efeonce Group SpA · Automated email from the AI visibility diagnostic. efeoncepro.com'
}

const summaryRow = (label: string, value: string, emphasis = false) => (
  <table style={{
    width: '100%',
    borderCollapse: 'collapse',
    borderBottom: `1px solid ${EMAIL_COLORS.border}`,
  }}>
    <tbody>
      <tr>
        <td style={{
          padding: '10px 0',
          fontFamily: EMAIL_FONTS.body,
          fontSize: '14px',
          color: EMAIL_COLORS.secondary,
          fontWeight: 500,
          width: '50%',
          verticalAlign: 'top',
        }}>
          {label}
        </td>
        <td style={{
          padding: '10px 0',
          fontFamily: EMAIL_FONTS.heading,
          fontSize: emphasis ? '18px' : '15px',
          color: EMAIL_COLORS.text,
          fontWeight: emphasis ? 700 : 600,
          textAlign: 'right',
          verticalAlign: 'top',
        }}>
          {value}
        </td>
      </tr>
    </tbody>
  </table>
)

// Stacked (NOT 2-col): label as a small eyebrow above the value, full-width below.
// A 2-col table cramped the value on mobile (~320px); stacking reads well at any width.
const insightRow = (label: string, value: string) => (
  <div style={{ margin: '0 0 12px' }}>
    <div style={{
      fontFamily: EMAIL_FONTS.heading,
      fontSize: '11px',
      fontWeight: 700,
      letterSpacing: '0.04em',
      textTransform: 'uppercase' as const,
      color: EMAIL_COLORS.primary,
      margin: '0 0 3px',
    }}>
      {label}
    </div>
    <div style={{
      fontFamily: EMAIL_FONTS.body,
      fontSize: '14px',
      lineHeight: '21px',
      color: EMAIL_COLORS.secondary,
    }}>
      {value}
    </div>
  </div>
)

export default function AiVisibilityGraderReportEmail({
  organizationName = 'Tu marca',
  scoreValue = 72,
  levelLabel = 'Intermedio',
  primaryGapTitle = 'Autoridad temática',
  isPartial = false,
  insight = {
    detection: 'Tu marca aparece en IA y buscadores, pero con baja asociación temática en tu categoría.',
    importance: 'Limita tu visibilidad en respuestas generativas y en resultados relevantes.',
    action: 'Publica 2-3 contenidos pilar sobre tus temas clave y consigue menciones en sitios de tu industria.'
  },
  reportUrl = 'https://think.efeoncepro.com/brand-visibility/r/grt-preview-token',
  attachmentFilename = 'informe-visibilidad-ia.pdf',
  attachmentSizeLabel = '~2 MB',
  locale = 'es'
}: AiVisibilityGraderReportEmailProps) {
  const t = selectEmailTemplateCopy(
    locale,
    getMicrocopy().emails.growth.aiVisibilityReport,
    LEGACY_EN_AI_VISIBILITY_REPORT_EMAIL_COPY
  )

  const scoreDisplay = scoreValue === null ? t.summary.scoreEmpty : `${scoreValue} ${t.summary.scoreSuffix}`
  const heading = isPartial ? t.headingPartial : t.heading

  return (
    <EmailLayout previewText={t.previewText(organizationName)} lang={locale} brand="efeonce">
      <Heading style={{
        fontFamily: EMAIL_FONTS.heading,
        fontSize: '26px',
        fontWeight: 700,
        color: EMAIL_COLORS.text,
        margin: '0 0 8px',
        lineHeight: '34px',
      }}>
        {heading}
      </Heading>

      <Text style={{
        fontSize: '15px',
        color: EMAIL_COLORS.secondary,
        lineHeight: '24px',
        margin: '0 0 20px',
      }}>
        {t.greeting} {t.intro(organizationName)}
      </Text>

      {isPartial && (
        <Section style={{
          backgroundColor: EMAIL_COLORS.warningBg,
          borderRadius: '10px',
          padding: '12px 16px',
          margin: '0 0 20px',
        }}>
          <Text style={{
            fontFamily: EMAIL_FONTS.body,
            fontSize: '13px',
            color: EMAIL_COLORS.warning,
            lineHeight: '20px',
            margin: '0',
          }}>
            {t.partialBanner}
          </Text>
        </Section>
      )}

      <Section style={{
        backgroundColor: '#F8FAFC',
        border: `1px solid ${EMAIL_COLORS.border}`,
        borderRadius: '12px',
        padding: '18px 18px 8px',
        margin: '0 0 24px',
      }}>
        {summaryRow(t.summary.scoreLabel, scoreDisplay, true)}
        {levelLabel && summaryRow(t.summary.levelLabel, levelLabel)}
        {summaryRow(t.summary.gapLabel, primaryGapTitle ?? t.summary.gapEmpty)}
        {summaryRow(t.summary.contentLabel, t.summary.contentValue)}
      </Section>

      {insight && (
        <Section style={{
          backgroundColor: EMAIL_COLORS.infoBg,
          borderRadius: '12px',
          padding: '16px 18px 18px',
          margin: '0 0 24px',
        }}>
          <Text style={{
            fontFamily: EMAIL_FONTS.heading,
            fontSize: '12px',
            fontWeight: 700,
            letterSpacing: '0.04em',
            textTransform: 'uppercase' as const,
            color: EMAIL_COLORS.primary,
            margin: '0 0 2px',
          }}>
            {t.insight.eyebrow}
          </Text>
          {insightRow(t.insight.detectionLabel, insight.detection)}
          {insightRow(t.insight.importanceLabel, insight.importance)}
          {insightRow(t.insight.actionLabel, insight.action)}
        </Section>
      )}

      <Section style={{ textAlign: 'center' as const, margin: '0 0 12px' }}>
        <EmailButton href={reportUrl}>{t.cta}</EmailButton>
      </Section>

      <Text style={{
        fontSize: '13px',
        color: EMAIL_COLORS.muted,
        lineHeight: '20px',
        textAlign: 'center' as const,
        margin: '0 0 24px',
      }}>
        {t.ctaHelp}
      </Text>

      <Section style={{
        border: `1px solid ${EMAIL_COLORS.border}`,
        borderRadius: '12px',
        padding: '16px 18px',
        margin: '0 0 20px',
      }}>
        <Text style={{
          fontFamily: EMAIL_FONTS.heading,
          fontSize: '15px',
          fontWeight: 600,
          color: EMAIL_COLORS.text,
          margin: '0 0 2px',
        }}>
          {t.attachment.title}
        </Text>
        <Text style={{
          fontFamily: EMAIL_FONTS.body,
          fontSize: '13px',
          color: EMAIL_COLORS.muted,
          margin: '0 0 6px',
        }}>
          {attachmentFilename} · {t.attachment.formatPrefix}{attachmentSizeLabel ? ` · ${attachmentSizeLabel}` : ''}
        </Text>
        <Text style={{
          fontFamily: EMAIL_FONTS.body,
          fontSize: '13px',
          color: EMAIL_COLORS.secondary,
          lineHeight: '20px',
          margin: '0',
        }}>
          {t.attachment.description}
        </Text>
      </Section>

      <Section style={{
        backgroundColor: EMAIL_COLORS.infoBg,
        borderRadius: '12px',
        padding: '14px 18px',
        margin: '0 0 20px',
      }}>
        <Text style={{
          fontFamily: EMAIL_FONTS.heading,
          fontSize: '14px',
          fontWeight: 600,
          color: EMAIL_COLORS.text,
          margin: '0 0 4px',
        }}>
          {t.why.title}
        </Text>
        <Text style={{
          fontFamily: EMAIL_FONTS.body,
          fontSize: '13px',
          color: EMAIL_COLORS.secondary,
          lineHeight: '20px',
          margin: '0',
        }}>
          {t.why.body}
        </Text>
      </Section>

      <Text style={{
        fontSize: '13px',
        fontWeight: 600,
        color: EMAIL_COLORS.text,
        margin: '0 0 4px',
      }}>
        {t.fallback.title}
      </Text>
      <Text style={{
        fontSize: '13px',
        color: EMAIL_COLORS.primary,
        lineHeight: '20px',
        margin: '0 0 4px',
        wordBreak: 'break-all' as const,
      }}>
        {reportUrl}
      </Text>
      <Text style={{
        fontSize: '12px',
        color: EMAIL_COLORS.muted,
        lineHeight: '18px',
        margin: '0 0 20px',
      }}>
        {t.fallback.note}
      </Text>

      <Text style={{
        fontSize: '12px',
        color: EMAIL_COLORS.muted,
        lineHeight: '18px',
        margin: '0',
        borderTop: `1px solid ${EMAIL_COLORS.border}`,
        paddingTop: '20px',
      }}>
        {t.automatedFooter()}
      </Text>
    </EmailLayout>
  )
}
