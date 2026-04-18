import { Fragment } from 'react'
import type { ReactNode } from 'react'

import { Heading, Link, Section, Text } from '@react-email/components'

import EmailButton from './components/EmailButton'
import EmailLayout from './components/EmailLayout'
import { APP_URL, EMAIL_COLORS, EMAIL_FONTS } from './constants'

type WeeklyDigestSeverity = 'critical' | 'warning' | 'info'

export type WeeklyExecutiveDigestNarrativePart =
  | { type: 'text'; value: string }
  | { type: 'link'; value: string; href: string }

export interface WeeklyExecutiveDigestInsight {
  severity: WeeklyDigestSeverity
  headline: string
  narrative: WeeklyExecutiveDigestNarrativePart[]
  rootCauseNarrative?: WeeklyExecutiveDigestNarrativePart[]
  actionLabel?: string
  actionUrl?: string
}

export interface WeeklyExecutiveDigestSpaceSection {
  name: string
  href: string
  insights: WeeklyExecutiveDigestInsight[]
}

interface WeeklyExecutiveDigestEmailProps {
  periodLabel?: string
  totalInsights?: number
  criticalCount?: number
  warningCount?: number
  infoCount?: number
  spacesAffected?: number
  spaces?: WeeklyExecutiveDigestSpaceSection[]
  portalUrl?: string
  closingNote?: string
  unsubscribeUrl?: string
}

const SEVERITY_STYLES: Record<WeeklyDigestSeverity, { label: string; bg: string; border: string; text: string }> = {
  critical: {
    label: 'Crítico',
    bg: '#FEF3F2',
    border: '#FECDCA',
    text: '#B42318'
  },
  warning: {
    label: 'Seguimiento',
    bg: '#FFFAEB',
    border: '#FEDF89',
    text: '#B54708'
  },
  info: {
    label: 'Informativo',
    bg: '#EFF8FF',
    border: '#B2DDFF',
    text: '#175CD3'
  }
}

const summaryRow = (label: string, value: string) => (
  <tr>
    <td style={{
      padding: '10px 0',
      fontFamily: EMAIL_FONTS.body,
      fontSize: '14px',
      color: EMAIL_COLORS.secondary,
      borderBottom: `1px solid ${EMAIL_COLORS.border}`,
    }}>
      {label}
    </td>
    <td style={{
      padding: '10px 0',
      fontFamily: EMAIL_FONTS.heading,
      fontSize: '14px',
      color: EMAIL_COLORS.text,
      textAlign: 'right' as const,
      fontWeight: 600,
      borderBottom: `1px solid ${EMAIL_COLORS.border}`,
    }}>
      {value}
    </td>
  </tr>
)

const renderNarrative = (parts: WeeklyExecutiveDigestNarrativePart[]): ReactNode[] =>
  parts.map((part, index) => {
    const key = `${part.type}-${index}-${part.value}`

    if (part.type === 'link') {
      return (
        <Link
          key={key}
          href={part.href}
          style={{
            color: EMAIL_COLORS.primary,
            textDecoration: 'underline',
            fontWeight: 600
          }}
        >
          {part.value}
        </Link>
      )
    }

    return <Fragment key={key}>{part.value}</Fragment>
  })

const countInsights = (spaces: WeeklyExecutiveDigestSpaceSection[]) => {
  return spaces.reduce(
    (acc, space) => {
      if (space.insights.length > 0) {
        acc.spaces += 1
      }

      for (const insight of space.insights) {
        acc.total += 1
        acc[insight.severity] += 1
      }

      return acc
    },
    { total: 0, critical: 0, warning: 0, info: 0, spaces: 0 }
  )
}

export default function WeeklyExecutiveDigestEmail({
  periodLabel = 'Semana del 8 al 14 de abril de 2026',
  totalInsights,
  criticalCount,
  warningCount,
  infoCount,
  spacesAffected,
  spaces = [],
  portalUrl = APP_URL,
  closingNote = 'Resumen automático basado en los insights materializados del período. Abre Greenhouse para ver el detalle completo.',
  unsubscribeUrl
}: WeeklyExecutiveDigestEmailProps) {
  const derivedCounts = countInsights(spaces)
  const totalInsightsValue = totalInsights ?? derivedCounts.total
  const criticalValue = criticalCount ?? derivedCounts.critical
  const warningValue = warningCount ?? derivedCounts.warning
  const infoValue = infoCount ?? derivedCounts.info
  const spacesAffectedValue = spacesAffected ?? derivedCounts.spaces
  const severitySummary = `${criticalValue} críticos · ${warningValue} en seguimiento · ${infoValue} informativos`
  const previewText = `${periodLabel} · ${totalInsightsValue} insights · ${spacesAffectedValue} espacios`

  return (
    <EmailLayout previewText={previewText} lang='es' unsubscribeUrl={unsubscribeUrl}>
      <Text style={{
        fontFamily: EMAIL_FONTS.body,
        fontSize: '11px',
        fontWeight: 600,
        color: EMAIL_COLORS.muted,
        letterSpacing: '0',
        textTransform: 'uppercase' as const,
        margin: '0 0 6px',
        lineHeight: '16px',
      }}>
        {'NEXA INSIGHTS · '}{periodLabel.toUpperCase()}
      </Text>

      <Heading style={{
        fontFamily: EMAIL_FONTS.heading,
        fontSize: '24px',
        fontWeight: 700,
        color: EMAIL_COLORS.text,
        margin: '0 0 8px',
        lineHeight: '32px',
      }}>
        Resumen semanal para liderazgo
      </Heading>

      <Text style={{
        fontSize: '15px',
        color: EMAIL_COLORS.secondary,
        lineHeight: '24px',
        margin: '0 0 20px',
      }}>
        Lo más relevante de la semana, ordenado por impacto y listo para lectura rápida.
      </Text>

      <Section style={{
        backgroundColor: '#F8FAFC',
        border: `1px solid ${EMAIL_COLORS.border}`,
        borderRadius: '8px',
        padding: '16px 18px 8px',
        margin: '0 0 20px',
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <tbody>
            {summaryRow('Insights incluidos', String(totalInsightsValue))}
            {summaryRow('Distribución por severidad', severitySummary)}
            {summaryRow('Espacios afectados', String(spacesAffectedValue))}
          </tbody>
        </table>
      </Section>

      {spaces.length > 0 ? (
        spaces.map((space) => (
          <Section
            key={space.name}
            style={{
              backgroundColor: '#FFFFFF',
              border: `1px solid ${EMAIL_COLORS.border}`,
              borderRadius: '8px',
              padding: '16px',
              margin: '0 0 16px',
            }}
          >
            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '10px' }}>
              <tbody>
                <tr>
                  <td style={{ verticalAlign: 'top' }}>
                    <Text style={{
                      fontFamily: EMAIL_FONTS.body,
                      fontSize: '11px',
                      fontWeight: 600,
                      color: EMAIL_COLORS.muted,
                      letterSpacing: '0',
                      textTransform: 'uppercase' as const,
                      margin: '0 0 4px',
                      lineHeight: '16px',
                    }}>
                      Espacio
                    </Text>
                    <Heading style={{
                      fontFamily: EMAIL_FONTS.heading,
                      fontSize: '18px',
                      fontWeight: 700,
                      color: EMAIL_COLORS.text,
                      margin: 0,
                      lineHeight: '24px',
                    }}>
                      <Link
                        href={space.href}
                        style={{
                          color: EMAIL_COLORS.text,
                          textDecoration: 'none',
                        }}
                      >
                        {space.name}
                      </Link>
                    </Heading>
                  </td>
                  <td style={{
                    verticalAlign: 'top',
                    textAlign: 'right' as const,
                    fontFamily: EMAIL_FONTS.body,
                    fontSize: '13px',
                    color: EMAIL_COLORS.muted,
                    whiteSpace: 'nowrap' as const,
                  }}>
                    {space.insights.length} {space.insights.length === 1 ? 'insight' : 'insights'}
                  </td>
                </tr>
              </tbody>
            </table>

            {space.insights.length === 0 ? (
              <Text style={{
                fontSize: '14px',
                color: EMAIL_COLORS.secondary,
                lineHeight: '22px',
                margin: '0',
              }}>
                No hubo insights materializados para este espacio en el período.
              </Text>
            ) : (
              space.insights.map((insight, index) => {
                const severity = SEVERITY_STYLES[insight.severity]

                return (
                  <Section
                    key={`${space.name}-${insight.headline}-${index}`}
                    style={{
                      backgroundColor: '#F8FAFC',
                      border: `1px solid ${EMAIL_COLORS.border}`,
                      borderRadius: '8px',
                      padding: '14px 14px 12px',
                      margin: index === 0 ? '0' : '12px 0 0',
                    }}
                  >
                    <Text style={{
                      display: 'inline-block',
                      margin: '0 0 8px',
                      padding: '4px 10px',
                      borderRadius: '999px',
                      border: `1px solid ${severity.border}`,
                      backgroundColor: severity.bg,
                      color: severity.text,
                      fontFamily: EMAIL_FONTS.heading,
                      fontSize: '11px',
                      fontWeight: 700,
                      letterSpacing: '0',
                      textTransform: 'uppercase' as const,
                    }}>
                      {severity.label}
                    </Text>

                    <Heading style={{
                      fontFamily: EMAIL_FONTS.heading,
                      fontSize: '16px',
                      fontWeight: 700,
                      color: EMAIL_COLORS.text,
                      margin: '0 0 6px',
                      lineHeight: '22px',
                    }}>
                      {insight.headline}
                    </Heading>

                    <Text style={{
                      fontSize: '14px',
                      color: EMAIL_COLORS.secondary,
                      lineHeight: '22px',
                      margin: '0',
                    }}>
                      {renderNarrative(insight.narrative)}
                    </Text>

                    {insight.rootCauseNarrative && insight.rootCauseNarrative.length > 0 && (
                      <Section
                        style={{
                          marginTop: '10px',
                          padding: '10px 12px',
                          borderLeft: `3px solid ${EMAIL_COLORS.primary}`,
                          backgroundColor: '#FFFFFF',
                          borderRadius: '4px',
                        }}
                      >
                        <Text style={{
                          fontFamily: EMAIL_FONTS.body,
                          fontSize: '11px',
                          fontWeight: 700,
                          color: EMAIL_COLORS.muted,
                          letterSpacing: '0',
                          textTransform: 'uppercase' as const,
                          margin: '0 0 4px',
                          lineHeight: '16px',
                        }}>
                          Causa probable
                        </Text>
                        <Text style={{
                          fontSize: '13px',
                          color: EMAIL_COLORS.secondary,
                          lineHeight: '20px',
                          margin: 0,
                        }}>
                          {renderNarrative(insight.rootCauseNarrative)}
                        </Text>
                      </Section>
                    )}

                    {insight.actionUrl && (
                      <Text style={{
                        fontSize: '13px',
                        color: EMAIL_COLORS.muted,
                        lineHeight: '20px',
                        margin: '10px 0 0',
                      }}>
                        <Link
                          href={insight.actionUrl}
                          style={{
                            color: EMAIL_COLORS.primary,
                            textDecoration: 'underline',
                            fontWeight: 600,
                          }}
                        >
                          {insight.actionLabel || 'Abrir detalle'}
                        </Link>
                      </Text>
                    )}
                  </Section>
                )
              })
            )}
          </Section>
        ))
      ) : (
        <Section style={{
          backgroundColor: '#F8FAFC',
          border: `1px solid ${EMAIL_COLORS.border}`,
          borderRadius: '8px',
          padding: '16px',
          margin: '0 0 20px',
        }}>
          <Heading style={{
            fontFamily: EMAIL_FONTS.heading,
            fontSize: '16px',
            fontWeight: 700,
            color: EMAIL_COLORS.text,
            margin: '0 0 6px',
            lineHeight: '22px',
          }}>
            Sin insights para mostrar
          </Heading>

          <Text style={{
            fontSize: '14px',
            color: EMAIL_COLORS.secondary,
            lineHeight: '22px',
            margin: '0',
          }}>
            No se materializaron insights en este período. Cuando haya novedades, aparecerán aquí con enlaces directos al portal.
          </Text>
        </Section>
      )}

      <Section style={{ textAlign: 'center' as const, margin: '0 0 18px' }}>
        <EmailButton href={portalUrl}>Abrir Greenhouse</EmailButton>
      </Section>

      <Text style={{
        fontSize: '13px',
        color: EMAIL_COLORS.muted,
        lineHeight: '20px',
        margin: '0',
      }}>
        {closingNote}{' '}
        <Link
          href={portalUrl}
          style={{
            color: EMAIL_COLORS.primary,
            textDecoration: 'underline',
            fontWeight: 600,
          }}
        >
          Ver en Greenhouse
        </Link>
        .
      </Text>
    </EmailLayout>
  )
}
