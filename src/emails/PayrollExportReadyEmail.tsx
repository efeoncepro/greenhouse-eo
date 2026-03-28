import { Heading, Section, Text } from '@react-email/components'

import EmailButton from './components/EmailButton'
import EmailLayout from './components/EmailLayout'
import { APP_URL, EMAIL_COLORS, EMAIL_FONTS } from './constants'

interface PayrollExportReadyEmailProps {
  periodLabel: string
  entryCount: number
  grossTotal: string
  netTotal: string
  exportedBy?: string | null
}

const BRAND_BLUE = '#023c70'

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

export default function PayrollExportReadyEmail({
  periodLabel,
  entryCount,
  grossTotal,
  netTotal,
  exportedBy
}: PayrollExportReadyEmailProps) {
  return (
    <EmailLayout previewText={`Nómina ${periodLabel} exportada — neto total ${netTotal}`} lang='es'>
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
        Nómina exportada
      </Heading>

      <Text style={{
        fontSize: '15px',
        color: EMAIL_COLORS.secondary,
        lineHeight: '24px',
        margin: '0 0 24px',
      }}>
        El período <strong>{periodLabel}</strong> fue cerrado y exportado. A continuación
        el resumen del cierre para Finance y HR.
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
            {summaryRow('Período', periodLabel)}
            {summaryRow('Colaboradores', String(entryCount))}
            {summaryRow('Bruto total', grossTotal)}
          </tbody>
        </table>
      </Section>

      {/* Net total hero box */}
      <Section style={{
        backgroundColor: BRAND_BLUE,
        borderRadius: '0 0 12px 12px',
        padding: '20px 18px',
        margin: '0 0 12px',
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
                Neto a pagar
              </td>
              <td style={{
                fontFamily: EMAIL_FONTS.heading,
                fontSize: '28px',
                color: '#FFFFFF',
                fontWeight: 700,
                textAlign: 'right' as const,
                lineHeight: '34px',
              }}>
                {netTotal}
              </td>
            </tr>
          </tbody>
        </table>
      </Section>

      {/* Exported by caption */}
      {exportedBy && (
        <Text style={{
          fontSize: '12px',
          color: EMAIL_COLORS.muted,
          lineHeight: '18px',
          margin: '0 0 24px',
          textAlign: 'right' as const,
        }}>
          Exportado por {exportedBy}
        </Text>
      )}

      {/* CTA */}
      <Section style={{ textAlign: 'center' as const, margin: `${exportedBy ? '0' : '12px'} 0 24px` }}>
        <EmailButton href={`${APP_URL}/hr/payroll`}>Ver nómina en Greenhouse</EmailButton>
      </Section>

      {/* Microcopy */}
      <Text style={{
        fontSize: '13px',
        color: EMAIL_COLORS.muted,
        lineHeight: '20px',
        margin: '0 0 16px',
        borderTop: `1px solid ${EMAIL_COLORS.border}`,
        paddingTop: '20px',
      }}>
        El PDF del período y el detalle por colaborador están disponibles en el módulo de Nómina.
      </Text>

      {/* Brand footer inside card */}
      <Text style={{
        fontSize: '12px',
        color: EMAIL_COLORS.muted,
        lineHeight: '18px',
        margin: '0',
      }}>
        Efeonce Group SpA · efeoncepro.com
      </Text>
    </EmailLayout>
  )
}
