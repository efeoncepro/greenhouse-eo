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
  /**
   * TASK-863 V1.5 — Fecha en que el trabajador SUSCRIBIÓ la carta de renuncia
   * (firma del trabajador). DD-MM-YYYY. Legalmente distinta de la fecha de
   * ratificación notarial art. 177 CT.
   */
  resignationNoticeSignedAt: string
  /**
   * Fecha en que la carta de renuncia fue RATIFICADA ante ministro de fe
   * (art. 177 CT). DD-MM-YYYY. Null cuando aún no se ratificó — la cláusula
   * PRIMERO omite el tramo de ratificación en ese caso.
   */
  resignationNoticeRatifiedAt: string | null
}

export interface FiniquitoClauseSegundoParams extends FiniquitoClauseParams {
  /** Net amount as CLP integer (formatted with thousand separators by caller). */
  netPayableFormatted: string
  /** Net amount in words (from formatClpInWords). */
  netPayableInWords: string
  /** Payment method label e.g. "transferencia bancaria". */
  paymentMethod: string
  /**
   * TASK-863 V1.5 — `true` cuando el documento ya está ratificado ante ministro
   * de fe (documentStatus = signed_or_ratified). Cambia el verbo performativo
   * de la cláusula SEGUNDO de "declara que recibirá" (futuro condicional) a
   * "declara haber recibido" (perfecto consumado). Evita vicio de consentimiento
   * en documentos draft (rendered/in_review/approved/issued) que aún no fueron
   * ratificados pero ya declaran "recibe en este acto".
   */
  isRatified: boolean
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
      // TASK-863 V1.5 — separar 2 fechas legales distintas de la carta de renuncia
      // (firma del trabajador vs ratificación notarial art. 177 CT). Antes la cláusula
      // mezclaba ambas, lo que podía invalidarla en demanda.
      primero: ({ workerName, workerTaxId, employerLegalName, hireDate, lastWorkingDay, resignationNoticeSignedAt, resignationNoticeRatifiedAt }: FiniquitoClauseParams) => {
        const ratificationTail = resignationNoticeRatifiedAt
          ? `, ratificada ante ministro de fe el ${resignationNoticeRatifiedAt} conforme al artículo 177 del Código del Trabajo`
          : ', cuya ratificación ante ministro de fe se efectuará conforme al artículo 177 del Código del Trabajo'

        return `PRIMERO: Don(ña) ${workerName}, RUT ${workerTaxId}, declara haber prestado servicios como trabajador(a) dependiente de ${employerLegalName} desde el ${hireDate} hasta el ${lastWorkingDay}, fecha en la cual se hace efectivo el término de su contrato de trabajo por aplicación de la causal del ARTÍCULO 159 N°2 DEL CÓDIGO DEL TRABAJO — RENUNCIA VOLUNTARIA DEL TRABAJADOR, formalizada mediante carta de renuncia suscrita por el(la) trabajador(a) con fecha ${resignationNoticeSignedAt}${ratificationTail}.`
      },

      // TASK-863 V1.5 — Verbo performativo state-conditional. Pre-ratificación
      // (rendered/in_review/approved/issued) usa futuro condicional "declara que
      // recibirá, al momento de la ratificación...". Post-ratificación
      // (signed_or_ratified) usa perfecto consumado "declara haber recibido en
      // este acto...". Evita vicio de consentimiento en documentos draft.
      segundo: ({ workerName, netPayableFormatted, netPayableInWords, paymentMethod, isRatified }: FiniquitoClauseSegundoParams) => {
        const verbPhrase = isRatified
          ? 'declara haber recibido en este acto, a su entera satisfacción'
          : 'declara que recibirá, al momento de la ratificación ante ministro de fe, a su entera satisfacción'

        return `SEGUNDO: Don(ña) ${workerName} ${verbPhrase}, mediante ${paymentMethod}, la cantidad de $ ${netPayableFormatted}.- (${netPayableInWords}), por los conceptos que se detallan en la cláusula quinta del presente instrumento.`
      },

      tercero: ({ workerName, employerLegalName, hireDate }: FiniquitoClauseTerceroParams) =>
        `TERCERO: Por el presente instrumento las partes declaran terminado el contrato de trabajo de fecha ${hireDate}, otorgando don(ña) ${workerName} amplio, total y definitivo finiquito a su empleador, ${employerLegalName}, expresando que no tiene cargo ni reclamo alguno que formular en su contra, y que nada se le adeuda por ningún concepto, ya que todas sus remuneraciones, prestaciones y regalías a que tiene derecho por disposición de la ley y de su contrato individual de trabajo le han sido pagadas total y oportunamente. Las cotizaciones previsionales le fueron pagadas oportunamente durante toda la duración del contrato, y las correspondientes a los días trabajados en el mes en curso se enterarán dentro del plazo legal establecido en el artículo 19 del DL N° 3.500 y el artículo 162 inciso 5° del Código del Trabajo.`,

      // TASK-863 V1.5 — Cita legal precisa: art. 13 de la Ley 14.908 es el
      // operativo (obligación del empleador en finiquito); Ley 21.389 es solo
      // la modificatoria de 2021. Antes citaba solo la modificatoria.
      cuartoAltA: ({ declaredAt }: FiniquitoMaintenanceObligationParams) =>
        `CUARTO ALTERNATIVA A: Las partes comparecientes declaran expresamente que el(la) trabajador(a) NO se encuentra afecto a retención por pensión de alimentos de acuerdo con lo establecido en el artículo 13 de la Ley N° 14.908 sobre Abandono de Familia y Pago de Pensiones Alimenticias, en su texto modificado por la Ley N° 21.389 de 2021. Declaración efectuada con fecha ${declaredAt} y registrada con sello digital en sistema Greenhouse.`,

      cuartoAltB: ({ amount, beneficiary, declaredAt }: FiniquitoMaintenanceObligationParams) =>
        `CUARTO ALTERNATIVA B: Las partes comparecientes declaran expresamente que el(la) trabajador(a) SÍ se encuentra afecto a retención por pensión de alimentos de acuerdo con lo establecido en el artículo 13 de la Ley N° 14.908 sobre Abandono de Familia y Pago de Pensiones Alimenticias, en su texto modificado por la Ley N° 21.389 de 2021, por un monto mensual de $ ${amount ?? 0} a favor de ${beneficiary ?? '(beneficiario pendiente de declarar)'}. Declaración efectuada con fecha ${declaredAt} y registrada con sello digital en sistema Greenhouse.`,

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
    },
    workQueue: {
      title: 'Cola de offboarding',
      subtitle: 'Prioriza casos, prerequisitos, cálculo, documento y ratificación desde una sola vista operacional.',
      summary: {
        attention: 'Requieren acción',
        readyToCalculate: 'Listos para calcular',
        documents: 'Documentos en curso',
        noLaborSettlement: 'Sin finiquito laboral'
      },
      lane: {
        finalSettlement: 'Finiquito laboral',
        contractualClose: 'Cierre contractual',
        externalProvider: 'Proveedor externo',
        needsClassification: 'Por clasificar',
        finalSettlementHelp: 'Trabajador dependiente en nómina interna; requiere cálculo, documento y ratificación.',
        contractualCloseHelp: 'Honorarios o relación no laboral; se cierra como relación contractual sin finiquito laboral.',
        externalProviderHelp: 'El cierre vive en el proveedor laboral o payroll externo.',
        needsClassificationHelp: 'La combinación contractual requiere clasificación antes de habilitar documentos o pagos.'
      },
      nextStep: {
        uploadResignationLetter: 'Subir carta de renuncia',
        declareMaintenance: 'Declarar pensión alimentos',
        calculate: 'Calcular finiquito',
        approveCalculation: 'Aprobar cálculo',
        renderDocument: 'Generar documento',
        submitDocumentReview: 'Enviar a revisión',
        approveDocument: 'Aprobar documento',
        issueDocument: 'Emitir documento',
        registerRatification: 'Registrar ratificación',
        reviewPayment: 'Revisar pago pendiente',
        externalProviderClose: 'Cerrar con proveedor',
        classifyCase: 'Clasificar caso',
        completed: 'Cierre completo',
        none: 'Sin acción pendiente'
      },
      actions: {
        approveCase: 'Aprobar caso',
        scheduleCase: 'Programar salida',
        executeCase: 'Ejecutar salida',
        replaceResignationLetter: 'Reemplazar carta',
        editMaintenance: 'Editar pensión alimentos',
        reissueDocument: 'Reemitir documento',
        downloadPdf: 'PDF'
      },
      blockers: {
        resignationLetter: 'Falta carta de renuncia ratificada.',
        maintenance: 'Falta declaración de pensión de alimentos.',
        settlementApproval: 'El cálculo debe estar aprobado antes de operar el documento.',
        noSettlement: 'No existe cálculo vigente.',
        historicalDocument: 'El documento corresponde a un cálculo anterior.'
      },
      progress: {
        done: 'listo'
      }
    }
  }
} as const

export type GhFiniquito = typeof GH_FINIQUITO
