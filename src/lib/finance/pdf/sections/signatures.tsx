import 'server-only'

import { Image, Page, StyleSheet, Text, View } from '@react-pdf/renderer'

import type { QuotationPdfLegalEntity, QuotationPdfVerification } from '../contracts'
import { PdfColors, PdfFonts, PdfRadii, PdfSpacing } from '../tokens'

import { PageFooter, PageHeader, SectionHeading, resolveLegalEntity, sectionBodyStyle } from './shared'

const styles = StyleSheet.create({
  page: {
    backgroundColor: PdfColors.paper,
    paddingBottom: 72,
    fontFamily: PdfFonts.body,
    fontSize: 9
  },
  body: sectionBodyStyle,
  signaturesGrid: {
    flexDirection: 'row',
    gap: PdfSpacing.s6,
    marginTop: PdfSpacing.s5
  },
  signatureBlock: {
    flex: 1,
    borderTopWidth: 2,
    borderTopColor: PdfColors.primary,
    borderTopStyle: 'solid',
    paddingTop: PdfSpacing.s4
  },
  eyebrow: {
    fontFamily: PdfFonts.bodyMedium,
    fontSize: 7,
    letterSpacing: 1.5,
    color: PdfColors.textMuted,
    textTransform: 'uppercase',
    marginBottom: PdfSpacing.s2
  },
  line: {
    height: 60,
    borderBottomWidth: 1,
    borderBottomColor: PdfColors.textSubtle,
    borderBottomStyle: 'solid',
    marginBottom: PdfSpacing.s2
  },
  field: {
    flexDirection: 'row',
    paddingVertical: 2,
    borderBottomWidth: 1,
    borderBottomColor: PdfColors.divider,
    borderBottomStyle: 'dotted'
  },
  fieldLabel: {
    fontFamily: PdfFonts.bodyMedium,
    fontSize: 7,
    letterSpacing: 1,
    color: PdfColors.textMuted,
    textTransform: 'uppercase',
    width: 60
  },
  fieldValue: {
    fontFamily: PdfFonts.body,
    fontSize: 9,
    color: PdfColors.textSubtle,
    flex: 1
  },
  fieldValueFilled: {
    color: PdfColors.text
  },
  verifyBlock: {
    marginTop: PdfSpacing.s8,
    padding: PdfSpacing.s4,
    backgroundColor: PdfColors.surface,
    borderRadius: PdfRadii.md,
    flexDirection: 'row',
    gap: PdfSpacing.s4,
    alignItems: 'center'
  },
  verifyQr: {
    width: 80,
    height: 80,
    borderRadius: 4
  },
  verifyQrPlaceholder: {
    width: 80,
    height: 80,
    backgroundColor: PdfColors.divider,
    borderRadius: 4
  },
  verifyCopy: { flex: 1 },
  verifyTitle: {
    fontFamily: PdfFonts.heading,
    fontSize: 11,
    color: PdfColors.primary,
    marginBottom: PdfSpacing.s1
  },
  verifyBody: {
    fontFamily: PdfFonts.body,
    fontSize: 8,
    color: PdfColors.textMuted,
    lineHeight: 1.5,
    marginBottom: PdfSpacing.s2
  },
  verifyUrl: {
    fontFamily: PdfFonts.bodyMedium,
    fontSize: 7,
    letterSpacing: 0.5,
    color: PdfColors.accent
  }
})

interface SignaturesPageProps {
  quotationNumber: string
  versionNumber: number
  salesRepName: string | null
  salesRepRole: string | null
  verification: QuotationPdfVerification | null
  pageNumber: number
  totalPages: number
  legalEntity: QuotationPdfLegalEntity
}

export const SignaturesPage = (props: SignaturesPageProps) => {
  const legal = resolveLegalEntity(props.legalEntity)

  return (
    <Page size='A4' style={styles.page}>
      <PageHeader quotationNumber={props.quotationNumber} versionNumber={props.versionNumber} />
      <SectionHeading
        eyebrow='07 · Aceptación'
        title='Firmas autorizadas'
        subtitle='La firma formaliza la aceptación comercial de la propuesta. El contrato formal se firma por separado.'
      />
      <View style={styles.body}>
        <View style={styles.signaturesGrid}>
          <View style={styles.signatureBlock}>
            <Text style={styles.eyebrow}>Por el cliente</Text>
            <View style={styles.line} />
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Nombre</Text>
              <Text style={styles.fieldValue}>_____________________</Text>
            </View>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Cargo</Text>
              <Text style={styles.fieldValue}>_____________________</Text>
            </View>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>RUT</Text>
              <Text style={styles.fieldValue}>_____________________</Text>
            </View>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Fecha</Text>
              <Text style={styles.fieldValue}>__ / __ / ____</Text>
            </View>
          </View>
          <View style={styles.signatureBlock}>
            <Text style={styles.eyebrow}>Por {legal.legalName}</Text>
            <View style={styles.line} />
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Nombre</Text>
              <Text style={[styles.fieldValue, styles.fieldValueFilled]}>
                {props.salesRepName ?? '_____________________'}
              </Text>
            </View>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Cargo</Text>
              <Text style={[styles.fieldValue, styles.fieldValueFilled]}>
                {props.salesRepRole ?? '_____________________'}
              </Text>
            </View>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>RUT</Text>
              <Text style={[styles.fieldValue, styles.fieldValueFilled]}>{legal.taxId}</Text>
            </View>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Fecha</Text>
              <Text style={styles.fieldValue}>__ / __ / ____</Text>
            </View>
          </View>
        </View>
        {props.verification ? (
          <View style={styles.verifyBlock}>
            {props.verification.qrDataUrl ? (
              <Image src={props.verification.qrDataUrl} style={styles.verifyQr} />
            ) : (
              <View style={styles.verifyQrPlaceholder} />
            )}
            <View style={styles.verifyCopy}>
              <Text style={styles.verifyTitle}>Verifica la autenticidad</Text>
              <Text style={styles.verifyBody}>
                Escanea el código QR para validar esta cotización en línea. El
                sistema confirma número, versión, totales y vigencia contra
                nuestros registros.
              </Text>
              <Text style={styles.verifyUrl}>{props.verification.shortLabel}</Text>
            </View>
          </View>
        ) : null}
      </View>
      <PageFooter {...props} />
    </Page>
  )
}
