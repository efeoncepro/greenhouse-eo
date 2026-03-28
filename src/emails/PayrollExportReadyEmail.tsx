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

export default function PayrollExportReadyEmail({
  periodLabel,
  entryCount,
  grossTotal,
  netTotal,
  exportedBy
}: PayrollExportReadyEmailProps) {
  return (
    <EmailLayout previewText={`Payroll ${periodLabel} exportado y listo para revisar`} lang='es'>
      <Heading style={{
        fontFamily: EMAIL_FONTS.heading,
        fontSize: '26px',
        fontWeight: 700,
        color: EMAIL_COLORS.text,
        margin: '0 0 8px',
        lineHeight: '34px',
      }}>
        Payroll exportado
      </Heading>

      <Text style={{
        fontSize: '15px',
        color: EMAIL_COLORS.secondary,
        lineHeight: '24px',
        margin: '0 0 20px',
      }}>
        El período <strong>{periodLabel}</strong> ya quedó cerrado y exportado. Este correo se envía para
        Finance y HR con el resumen operativo del cierre y los artefactos asociados.
      </Text>

      <Section style={{
        backgroundColor: '#F8FAFC',
        border: `1px solid ${EMAIL_COLORS.border}`,
        borderRadius: '12px',
        padding: '18px 18px 8px',
        margin: '0 0 24px',
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <tbody>
            <tr>
              <td style={{ padding: '10px 0', fontFamily: EMAIL_FONTS.body, color: EMAIL_COLORS.secondary }}>Período</td>
              <td style={{ padding: '10px 0', fontFamily: EMAIL_FONTS.heading, color: EMAIL_COLORS.text, textAlign: 'right', fontWeight: 700 }}>{periodLabel}</td>
            </tr>
            <tr>
              <td style={{ padding: '10px 0', fontFamily: EMAIL_FONTS.body, color: EMAIL_COLORS.secondary }}>Colaboradores</td>
              <td style={{ padding: '10px 0', fontFamily: EMAIL_FONTS.heading, color: EMAIL_COLORS.text, textAlign: 'right', fontWeight: 700 }}>{entryCount}</td>
            </tr>
            <tr>
              <td style={{ padding: '10px 0', fontFamily: EMAIL_FONTS.body, color: EMAIL_COLORS.secondary }}>Bruto total</td>
              <td style={{ padding: '10px 0', fontFamily: EMAIL_FONTS.heading, color: EMAIL_COLORS.text, textAlign: 'right', fontWeight: 700 }}>{grossTotal}</td>
            </tr>
            <tr>
              <td style={{ padding: '10px 0', fontFamily: EMAIL_FONTS.body, color: EMAIL_COLORS.secondary }}>Neto total</td>
              <td style={{ padding: '10px 0', fontFamily: EMAIL_FONTS.heading, color: EMAIL_COLORS.text, textAlign: 'right', fontWeight: 700 }}>{netTotal}</td>
            </tr>
            {exportedBy && (
              <tr>
                <td style={{ padding: '10px 0', fontFamily: EMAIL_FONTS.body, color: EMAIL_COLORS.secondary }}>Exportado por</td>
                <td style={{ padding: '10px 0', fontFamily: EMAIL_FONTS.heading, color: EMAIL_COLORS.text, textAlign: 'right', fontWeight: 700 }}>{exportedBy}</td>
              </tr>
            )}
          </tbody>
        </table>
      </Section>

      <Section style={{ textAlign: 'center' as const, margin: '0 0 24px' }}>
        <EmailButton href={`${APP_URL}/hr/payroll`}>Abrir Payroll</EmailButton>
      </Section>

      <Text style={{
        fontSize: '13px',
        color: EMAIL_COLORS.muted,
        lineHeight: '20px',
        margin: '0 0 8px',
        borderTop: `1px solid ${EMAIL_COLORS.border}`,
        paddingTop: '20px',
      }}>
        Los adjuntos del cierre incluyen el PDF de período y el CSV de soporte. Si prefieres revisar online,
        abre el módulo de Payroll desde el botón anterior.
      </Text>

      <Text style={{
        fontSize: '12px',
        color: EMAIL_COLORS.muted,
        lineHeight: '18px',
        margin: '0',
      }}>
        Greenhouse by Efeonce Group SpA · Este es un correo automático enviado desde {APP_URL}
      </Text>
    </EmailLayout>
  )
}
