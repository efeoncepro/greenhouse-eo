/**
 * TASK-862 Slice B — Microcopy for the renuncia voluntaria final settlement (finiquito)
 * legal document. Used by document-pdf.tsx (Slice D) and the HrOffboardingView
 * sign-or-ratify dialog (Slice E).
 *
 * Register choice (es-CL):
 *
 * - Narrative clauses PRIMERO–QUINTO + reserva instructions + constancia + Ley 21.389
 *   banner: FORMAL LEGAL Spanish. NO tuteo. Third-person reference to the worker
 *   ("Don/Doña X declara..."). Mirrors canonical Chilean finiquito convention
 *   (caso BICE 2026-05-08 used as reference). This is intentional and OVERRIDES the
 *   tuteo default per the greenhouse-ux-writing skill — the audience is a notario
 *   and an abogado laboralista, not the operator.
 *
 * - Operator-facing chips/labels (ministro de fe kind labels, dialog hints):
 *   tuteo + concise (matches HR dashboard convention).
 *
 * Parameters carried by template functions are interpolated literally; the
 * caller is responsible for resolving Spanish names, RUT formatting, date
 * formatting (DD-MM-YYYY canonical for finiquito).
 */

export interface FiniquitoClauseParams {
  /** Trabajador legal name as it appears in identity_profile. */
  workerName: string
  /** Trabajador tax id (CL_RUT presentation form e.g. 18.234.567-8). */
  workerTaxId: string
  /** Empleador (legal entity) trade name or legal name. */
  employerLegalName: string
  /** Hire date in DD-MM-YYYY form (Chile canonical). */
  hireDate: string
  /** Last working day in DD-MM-YYYY form (Chile canonical). */
  lastWorkingDay: string
  /** Resignation letter ratification date in DD-MM-YYYY form. */
  resignationNoticeRatifiedAt: string
}

export interface FiniquitoClauseSegundoParams extends FiniquitoClauseParams {
  /** Net amount as CLP integer (formatted with thousand separators by caller). */
  netPayableFormatted: string
  /** Net amount in words (from formatClpInWords). */
  netPayableInWords: string
  /** Payment method label e.g. "transferencia bancaria". */
  paymentMethod: string
}

export type FiniquitoClauseTerceroParams = FiniquitoClauseParams

export interface FiniquitoMaintenanceObligationParams {
  /** Variant declared by HR (alt A = not subject, alt B = subject). */
  variant: 'not_subject' | 'subject'
  /** Monthly retention amount in CLP (alt B only). */
  amount?: number
  /** Beneficiary name (alt B only). */
  beneficiary?: string
  /** Operator user who declared the maintenance obligation. */
  declaredByDisplayName: string
  /** Operator user RUT for traceability. */
  declaredByTaxId?: string
  /** Date of declaration in DD-MM-YYYY form. */
  declaredAt: string
}

export const GH_FINIQUITO = {
  resignation: {
    clauses: {
      primero: ({ workerName, workerTaxId, employerLegalName, hireDate, lastWorkingDay, resignationNoticeRatifiedAt }: FiniquitoClauseParams) =>
        `PRIMERO: Don(ña) ${workerName}, RUT ${workerTaxId}, declara haber prestado servicios como trabajador(a) dependiente de ${employerLegalName} desde el ${hireDate} hasta el ${lastWorkingDay}, fecha en la cual se hace efectivo el término de su contrato de trabajo por aplicación de la causal del ARTÍCULO 159 N°2 DEL CÓDIGO DEL TRABAJO — RENUNCIA VOLUNTARIA DEL TRABAJADOR, formalizada mediante carta de renuncia ratificada con fecha ${resignationNoticeRatifiedAt}, suscrita con las formalidades del artículo 177 del mismo cuerpo legal.`,

      segundo: ({ workerName, netPayableFormatted, netPayableInWords, paymentMethod }: FiniquitoClauseSegundoParams) =>
        `SEGUNDO: Don(ña) ${workerName} declara recibir en este acto, a su entera satisfacción, mediante ${paymentMethod}, la cantidad de $ ${netPayableFormatted}.- (${netPayableInWords}), por los conceptos que se detallan en la cláusula quinta del presente instrumento.`,

      tercero: ({ workerName, employerLegalName, hireDate }: FiniquitoClauseTerceroParams) =>
        `TERCERO: Por el presente instrumento las partes declaran terminado el contrato de trabajo de fecha ${hireDate}, otorgando don(ña) ${workerName} amplio, total y definitivo finiquito a su empleador, ${employerLegalName}, expresando que no tiene cargo ni reclamo alguno que formular en su contra, y que nada se le adeuda por ningún concepto, ya que todas sus remuneraciones, prestaciones y regalías a que tiene derecho por disposición de la ley y de su contrato individual de trabajo le han sido pagadas total y oportunamente. Las cotizaciones previsionales le fueron pagadas oportunamente durante toda la duración del contrato, y las correspondientes a los días trabajados en el mes en curso se enterarán dentro del plazo legal establecido en el artículo 19 del DL N° 3.500 y el artículo 162 inciso 5° del Código del Trabajo.`,

      cuartoAltA: ({ declaredAt }: FiniquitoMaintenanceObligationParams) =>
        `CUARTO ALTERNATIVA A: Las partes comparecientes declaran expresamente que el(la) trabajador(a) NO se encuentra afecto a retención por pensión de alimentos de acuerdo con lo establecido en la Ley N° 14.908, modificada por la Ley N° 21.389 de 2021. Declaración efectuada con fecha ${declaredAt} y registrada con sello digital en sistema Greenhouse.`,

      cuartoAltB: ({ amount, beneficiary, declaredAt }: FiniquitoMaintenanceObligationParams) =>
        `CUARTO ALTERNATIVA B: Las partes comparecientes declaran expresamente que el(la) trabajador(a) SÍ se encuentra afecto a retención por pensión de alimentos de acuerdo con lo establecido en la Ley N° 14.908, modificada por la Ley N° 21.389 de 2021, por un monto mensual de $ ${amount ?? 0} a favor de ${beneficiary ?? '(beneficiario pendiente de declarar)'}. Declaración efectuada con fecha ${declaredAt} y registrada con sello digital en sistema Greenhouse.`,

      quintoPrefacio: 'QUINTO: El detalle de los conceptos pagados al trabajador es el siguiente:'
    },
    constancia:
      'Este documento resume los haberes, descuentos y pagos asociados al término de la relación laboral. La firma o ratificación debe realizarse ante ministro de fe cuando corresponda (notario público, inspector del trabajo, presidente del sindicato o oficial del Registro Civil), conforme al artículo 177 del Código del Trabajo. La persona trabajadora puede formular reserva de derechos al momento de firmar, escribiéndola de su puño y letra en el espacio destinado al efecto.',
    reserva: {
      title: 'Reserva de derechos del trabajador (espacio para escritura manual)',
      instructions:
        'Si el trabajador desea formular reserva, debe hacerlo en este espacio antes de firmar. La firma sin reserva manuscrita implica renuncia a las acciones señaladas en la cláusula tercera.',
      consignedHeader: 'Reserva de derechos del trabajador',
      consignedSubtitle: 'Consignada de puño y letra por el trabajador al momento de firmar:'
    },
    ministro: {
      // Labels for the sign-or-ratify dialog Select (tuteo, operator-facing)
      kindLabel: {
        notary: 'Notario público',
        labor_inspector: 'Inspector del Trabajo',
        union_president: 'Presidente del sindicato',
        civil_registry: 'Oficial del Registro Civil'
      } as const,
      // Status when ratification is pending (PDF render, document-facing — formal)
      // TASK-863 V1.3 — copy más claro: explica QUÉ falta completar al momento de la firma.
      pending: 'Pendiente de ratificación',
      pendingSubtitle: 'Indicar al ratificar: notario público, inspector del Trabajo, presidente del sindicato u oficial del Registro Civil',
      pendingFootnote: 'Conforme al art. 177 del Código del Trabajo',
      // Label for ratification row when persisted (formal register)
      ratifiedLabel: (kindLabel: string, notariaOrLocation: string | null) =>
        notariaOrLocation ? `${kindLabel} · ${notariaOrLocation}` : kindLabel,
      ratifiedAtLine: (ratifiedAt: string) => `Ratificado ${ratifiedAt}`
    },
    title: 'Finiquito de contrato de trabajo',
    subtitle: {
      draft: 'Documento legal de término de relación laboral dependiente, causal art. 159 N°2 del Código del Trabajo (renuncia voluntaria). Producirá efecto liberatorio una vez ratificado ante ministro de fe conforme al artículo 177 del Código del Trabajo.',
      ratified: (ratifiedAt: string) =>
        `Documento ratificado ante ministro de fe con fecha ${ratifiedAt}. Produce el efecto liberatorio previsto en el artículo 177 del Código del Trabajo, sin perjuicio de la reserva de derechos consignada por el trabajador.`
    },
    netBoxLabels: {
      drafTitle: 'Líquido a pagar',
      ratifiedTitle: 'Líquido pagado',
      helpDraft: 'Incluye descuentos legales detallados en la cláusula quinta.',
      helpRatifiedAt: (ratifiedAt: string) => `Transferido el ${ratifiedAt} a cuenta corriente del trabajador.`
    },
    partiesLabels: {
      sectionTitle: 'Partes comparecientes',
      employer: 'Empleador',
      worker: 'Trabajador/a',
      employerTaxId: 'RUT empleador',
      workerTaxId: 'RUT trabajador/a',
      employerRepresentative: 'Representante empleador',
      workerJobTitle: 'Cargo',
      employerAddress: 'Domicilio empleador',
      workerAddress: 'Domicilio trabajador/a'
    },
    relationLabels: {
      sectionTitle: 'Relación y causal',
      hireDate: 'Fecha ingreso',
      lastWorkingDay: 'Último día trabajado',
      effectiveDate: 'Fecha término',
      causal: 'Causal',
      regime: 'Régimen',
      resignationLetterAsset: 'Carta renuncia ratificada'
    },
    clausesSectionTitle: 'Cláusulas',
    breakdownColumnLabels: {
      concept: 'Concepto',
      treatment: 'Tratamiento',
      evidence: 'Respaldo',
      amount: 'Monto CLP'
    },
    totalsLabels: {
      totalGross: 'Total haberes',
      totalDeductions: 'Total descuentos',
      netPayable: 'Líquido a pagar'
    },
    statusPillLabels: {
      ready: 'Listo para firma',
      needsReview: 'Revisión interna requerida',
      blocked: 'Bloqueado para firma',
      ratified: 'Ratificado'
    },
    watermark: {
      proyecto: 'PROYECTO',
      proyectoBlocked: 'BLOQUEADO',
      rejected: 'RECHAZADO',
      voided: 'ANULADO',
      superseded: 'REEMPLAZADO'
    },
    operatorBanners: {
      // tuteo, HR dashboard surfaces
      resignationLetterMissing: 'Sube la carta de renuncia ratificada antes de calcular el finiquito.',
      maintenanceObligationMissing: 'Declara la pensión de alimentos (Alt A o Alt B) antes de calcular el finiquito.',
      workerAddressMissing: 'El domicilio del trabajador no está registrado. El finiquito puede emitirse pero queda como advertencia.'
    },
    // TASK-863 — copy operativo de los 2 pre-requisitos en HrOffboardingView (tuteo es-CL).
    prerequisites: {
      chips: {
        resignationLetterAttached: 'Carta subida',
        resignationLetterMissing: 'Carta faltante',
        maintenanceNotSubject: 'Pensión: No afecto',
        maintenanceSubject: 'Pensión: Afecto',
        maintenanceMissing: 'Pensión pendiente'
      },
      buttons: {
        uploadResignationLetter: 'Subir carta de renuncia',
        replaceResignationLetter: 'Reemplazar carta',
        declareMaintenance: 'Declarar pensión alimentos',
        editMaintenance: 'Editar pensión alimentos'
      },
      calculateBlockedTooltip:
        'Sube la carta de renuncia y declara la pensión de alimentos antes de calcular.',
      resignationLetterDialog: {
        title: 'Subir carta de renuncia ratificada',
        description:
          'Adjunta el PDF (o escaneo) de la carta de renuncia firmada por el trabajador. Quedará vinculada al caso y disponible en el legajo del finiquito.',
        uploaderTitle: 'Carta de renuncia',
        uploaderHelper: 'PDF o imagen (JPG/PNG/WEBP), máximo 10 MB.',
        cta: 'Vincular al caso',
        savingCta: 'Guardando…',
        cancel: 'Cancelar'
      },
      maintenanceDialog: {
        title: 'Declarar pensión de alimentos (Ley 21.389)',
        description:
          'La Ley 21.389 obliga a verificar si el trabajador está afecto a retención por pensión de alimentos antes de pagar el finiquito.',
        variantLabel: 'Estado del trabajador',
        variantNotSubject: 'No afecto a retención (Alt A)',
        variantSubject: 'Afecto a retención (Alt B)',
        amountLabel: 'Monto mensual a retener (CLP)',
        amountHelper: 'Monto bruto declarado en la resolución judicial o convenio.',
        beneficiaryLabel: 'Beneficiario/a',
        beneficiaryHelper: 'Nombre completo de la persona beneficiaria.',
        evidenceTitle: 'Resolución o certificado (opcional)',
        evidenceHelper:
          'Certificado RNDA, resolución judicial u otro respaldo. Opcional pero recomendado.',
        cta: 'Declarar pensión',
        savingCta: 'Guardando…',
        cancel: 'Cancelar',
        validationAmount: 'Ingresa un monto mayor a 0.',
        validationBeneficiary: 'Ingresa el nombre del beneficiario.'
      }
    }
  }
} as const

export type GhFiniquito = typeof GH_FINIQUITO
