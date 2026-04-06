import { Heading, Section, Text } from '@react-email/components'

import EmailButton from './components/EmailButton'
import EmailLayout from './components/EmailLayout'
import { APP_URL, EMAIL_COLORS, EMAIL_FONTS } from './constants'

export interface CurrencyBreakdown {
  currency: string
  regimeLabel: string
  grossTotal: string
  netTotal: string
  entryCount: number
}

interface PayrollExportReadyEmailProps {
  periodLabel: string
  entryCount: number
  breakdowns: CurrencyBreakdown[]
  netTotalDisplay: string
  exportedBy?: string | null
  exportedAt?: string | null
}

const BRAND_BLUE = '#023c70'

const summaryRow = (label: string, value: string, indent = false) => (
  <tr>
    <td style={{
      padding: '10px 0',
      paddingLeft: indent ? '16px' : '0',
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

const regimeHeaderRow = (label: string) => (
  <tr>
    <td colSpan={2} style={{
      padding: '12px 0 4px',
      fontFamily: EMAIL_FONTS.heading,
      fontSize: '12px',
      fontWeight: 600,
      color: EMAIL_COLORS.muted,
      letterSpacing: '0.5px',
      textTransform: 'uppercase' as const,
      borderBottom: `1px solid ${EMAIL_COLORS.border}`,
    }}>
      {label}
    </td>
  </tr>
)

const attachmentRow = (title: string, subtitle: string) => (
  <tr>
    <td style={{
      padding: '10px 0',
      borderBottom: `1px solid ${EMAIL_COLORS.border}`,
    }}>
      <span style={{
        fontFamily: EMAIL_FONTS.heading,
        fontSize: '14px',
        fontWeight: 600,
        color: EMAIL_COLORS.text,
        display: 'block',
        lineHeight: '20px',
      }}>
        {title}
      </span>
      <span style={{
        fontFamily: EMAIL_FONTS.body,
        fontSize: '12px',
        color: EMAIL_COLORS.muted,
        display: 'block',
        lineHeight: '18px',
        marginTop: '2px',
      }}>
        {subtitle}
      </span>
    </td>
  </tr>
)

const PREVIEW_BREAKDOWNS: CurrencyBreakdown[] = [
  { currency: 'CLP', regimeLabel: 'Chile', grossTotal: '$12.450.000', netTotal: '$9.280.000', entryCount: 8 },
  { currency: 'USD', regimeLabel: 'Internacional', grossTotal: 'US$8,500.00', netTotal: 'US$7,200.00', entryCount: 3 }
]

export default function PayrollExportReadyEmail({
  periodLabel = 'Marzo 2026',
  entryCount = 11,
  breakdowns = PREVIEW_BREAKDOWNS,
  netTotalDisplay = '$9.280.000 + US$7,200.00',
  exportedBy,
  exportedAt
}: PayrollExportReadyEmailProps) {
  const metaParts: string[] = []

  if (exportedBy) metaParts.push(`Exportado por ${exportedBy}`)
  if (exportedAt) metaParts.push(exportedAt)

  const metaLine = metaParts.join(' · ')

  return (
    <EmailLayout previewText={`Nómina ${periodLabel} cerrada — neto total ${netTotalDisplay}`} lang='es'>
      {/* Overline */}
      <Text style={{
        fontFamily: EMAIL_FONTS.body,
        fontSize: '11px',
        fontWeight: 500,
        color: EMAIL_COLORS.muted,
        letterSpacing: '1.5px',
        textTransform: 'uppercase' as const,
        margin: '0 0 6px',
        lineHeight: '16px',
      }}>
        {'NÓMINA · '}{periodLabel.toUpperCase()}
      </Text>

      <Heading style={{
        fontFamily: EMAIL_FONTS.heading,
        fontSize: '26px',
        fontWeight: 700,
        color: EMAIL_COLORS.text,
        margin: '0 0 8px',
        lineHeight: '34px',
      }}>
        Nómina cerrada y lista para revisión
      </Heading>

      <Text style={{
        fontSize: '15px',
        color: EMAIL_COLORS.secondary,
        lineHeight: '24px',
        margin: '0 0 24px',
      }}>
        El período <strong>{periodLabel}</strong> fue cerrado con{' '}
        <strong>{entryCount} colaboradores</strong>. Adjuntamos el reporte
        y el detalle para tu revisión.
      </Text>

      {/* Summary table */}
      <Section style={{
        backgroundColor: '#F8FAFC',
        border: `1px solid ${EMAIL_COLORS.border}`,
        borderRadius: '12px',
        padding: '18px 18px 8px',
        margin: '0 0 4px',
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <tbody>
            {summaryRow('Colaboradores', String(entryCount))}
            {breakdowns.map((b) => (
              <>
                {regimeHeaderRow(`${b.regimeLabel} (${b.currency})`)}
                {summaryRow('Bruto', b.grossTotal, true)}
                {summaryRow('Neto', b.netTotal, true)}
              </>
            ))}
          </tbody>
        </table>
      </Section>

      {/* Net total hero box */}
      <Section style={{
        backgroundColor: BRAND_BLUE,
        borderRadius: '0 0 12px 12px',
        padding: '20px 18px',
        margin: '0 0 20px',
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <tbody>
            <tr>
              <td style={{
                fontFamily: EMAIL_FONTS.body,
                fontSize: '13px',
                color: 'rgba(255,255,255,0.7)',
                fontWeight: 500,
                verticalAlign: 'bottom',
              }}>
                Neto total a pagar
              </td>
              <td style={{
                fontFamily: EMAIL_FONTS.heading,
                fontSize: '28px',
                color: '#FFFFFF',
                fontWeight: 700,
                textAlign: 'right' as const,
                lineHeight: '34px',
              }}>
                {netTotalDisplay}
              </td>
            </tr>
          </tbody>
        </table>
      </Section>

      {/* Attachments section */}
      <Section style={{
        backgroundColor: '#F8FAFC',
        border: `1px solid ${EMAIL_COLORS.border}`,
        borderRadius: '12px',
        padding: '16px 18px 6px',
        margin: '0 0 12px',
      }}>
        <Text style={{
          fontFamily: EMAIL_FONTS.heading,
          fontSize: '11px',
          fontWeight: 600,
          color: EMAIL_COLORS.muted,
          letterSpacing: '1.5px',
          textTransform: 'uppercase' as const,
          margin: '0 0 8px',
          lineHeight: '16px',
        }}>
          Adjuntos incluidos
        </Text>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <tbody>
            {attachmentRow(
              'Reporte de nómina (PDF)',
              'Resumen por colaborador en formato imprimible'
            )}
            {attachmentRow(
              'Detalle de nómina (CSV)',
              'Desglose completo para contabilidad'
            )}
          </tbody>
        </table>
      </Section>

      {/* Metadata caption */}
      {metaLine && (
        <Text style={{
          fontSize: '12px',
          color: EMAIL_COLORS.muted,
          lineHeight: '18px',
          margin: '0 0 24px',
          textAlign: 'right' as const,
        }}>
          {metaLine}
        </Text>
      )}

      {/* CTA */}
      <Section style={{ textAlign: 'center' as const, margin: `${metaLine ? '0' : '12px'} 0 24px` }}>
        <EmailButton href={`${APP_URL}/hr/payroll`}>Ver nómina en Greenhouse</EmailButton>
      </Section>

      {/* Brand footer inside card */}
      <Text style={{
        fontSize: '12px',
        color: EMAIL_COLORS.muted,
        lineHeight: '18px',
        margin: '0',
        borderTop: `1px solid ${EMAIL_COLORS.border}`,
        paddingTop: '20px',
      }}>
        Efeonce Group SpA · efeoncepro.com
      </Text>
    </EmailLayout>
  )
}
