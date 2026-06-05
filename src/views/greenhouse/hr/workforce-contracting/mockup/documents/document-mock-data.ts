// Mock data for the Workforce Contracting Studio — signable document FORMAT mockup.
// Mirrors the real `WorkforceContractingStructuredContent` shape (localizedDrafts by
// language → sections aligned by sectionCode). Content is illustrative legal prose for
// a Chile dependent contract (jurisdiction pack CL_CHILE_DEPENDENT_V1) used ONLY to
// validate the visual document standard (O1 offer letter + C2 contract). Not legal advice.

export type DocLanguage = 'es-CL' | 'en-US'

export interface MockDocSection {
  /** Canonical alignment key shared across languages (mirror of the real contract). */
  sectionCode: string
  /** Clause label (e.g. "PRIMERO" / "FIRST"); empty for prose-only sections. */
  ordinal?: string
  heading: string
  /** One or more paragraphs of legal body text. */
  paragraphs: string[]
}

export interface MockLocalizedDoc {
  title: string
  sections: MockDocSection[]
}

export interface MockTermRow {
  code: string
  labelEs: string
  labelEn: string
  /** Language-neutral value (numbers/dates shown once). */
  value: string
}

export interface MockBilingualDocument {
  kind: 'offer_letter' | 'employment_contract'
  jurisdictionPackCode: string
  authoritativeLanguage: DocLanguage
  localized: Record<DocLanguage, MockLocalizedDoc>
  /** Structured terms summary (offer letter termscard / contract header facts). */
  terms: MockTermRow[]
}

// ── Shared parties + facts (illustrative) ─────────────────────────────────────
export const MOCK_PLACE_DATE_ES = 'Santiago de Chile, 12 de junio de 2026'
export const MOCK_PLACE_DATE_EN = 'Santiago, Chile, June 12, 2026'

export const MOCK_EMPLOYER = {
  legalName: 'Efeonce Group SpA',
  taxId: '77.357.182-1',
  address: 'Dr. Manuel Barros Borgoño 71, Of. 1105, Providencia, Región Metropolitana, Chile',
  representativeName: 'María Paz Contreras Alarcón',
  representativeTaxId: '15.482.309-7',
  representativeTitle: 'Representante legal'
}

export const MOCK_WORKER = {
  fullName: 'Diego Antonio Fuentes Bravo',
  taxId: '19.704.552-K',
  nationality: 'chilena',
  address: 'Av. Pedro de Valdivia 1842, Dpto. 503, Providencia, Región Metropolitana, Chile',
  jobTitle: 'Diseñador de producto senior',
  jobTitleEn: 'Senior Product Designer'
}

// ── Structured terms (offer termscard / contract facts) ───────────────────────
const SHARED_TERMS: MockTermRow[] = [
  { code: 'role', labelEs: 'Cargo', labelEn: 'Role', value: 'Diseñador de producto senior · Senior Product Designer' },
  { code: 'gross', labelEs: 'Remuneración bruta mensual', labelEn: 'Monthly gross salary', value: '$2.450.000 CLP' },
  { code: 'start', labelEs: 'Fecha de inicio', labelEn: 'Start date', value: '1 de julio de 2026' },
  { code: 'schedule', labelEs: 'Jornada', labelEn: 'Working hours', value: '44 horas semanales · Art. 22 C.T.' },
  { code: 'modality', labelEs: 'Modalidad', labelEn: 'Work arrangement', value: 'Híbrida (3 días presencial)' },
  { code: 'place', labelEs: 'Lugar de trabajo', labelEn: 'Workplace', value: 'Providencia, Santiago + remoto' },
  { code: 'contract_type', labelEs: 'Tipo de contrato', labelEn: 'Contract type', value: 'Indefinido' }
]

// ── O1 — Offer letter (carta oferta), bilingual ───────────────────────────────
export const MOCK_OFFER: MockBilingualDocument = {
  kind: 'offer_letter',
  jurisdictionPackCode: 'CL_CHILE_DEPENDENT_V1',
  authoritativeLanguage: 'es-CL',
  terms: [
    ...SHARED_TERMS.slice(0, 6),
    { code: 'validity', labelEs: 'Vigencia de la oferta', labelEn: 'Offer valid until', value: '26 de junio de 2026' }
  ],
  localized: {
    'es-CL': {
      title: 'Carta oferta de incorporación',
      sections: [
        {
          sectionCode: 'salutation',
          heading: '',
          paragraphs: [
            `Estimado ${MOCK_WORKER.fullName}:`,
            `Con gran entusiasmo te extendemos esta oferta para incorporarte a ${MOCK_EMPLOYER.legalName} en el cargo de ${MOCK_WORKER.jobTitle}. Valoramos tu trayectoria y estamos convencidos de que tu aporte será clave para el crecimiento del equipo.`
          ]
        },
        {
          sectionCode: 'role_and_conditions',
          heading: 'El rol y las condiciones',
          paragraphs: [
            'A continuación encontrarás un resumen de las condiciones principales de tu incorporación. El detalle completo, con todas las cláusulas legales, se formalizará en tu contrato individual de trabajo una vez aceptada esta oferta.',
            'Tu jornada se regirá por la legislación laboral chilena vigente y tendrás acceso a los beneficios del equipo desde tu primer día.'
          ]
        },
        {
          sectionCode: 'next_steps',
          heading: 'Próximos pasos',
          paragraphs: [
            'Si decides aceptar, responde a esta carta o confírmanos por los canales habituales antes de la fecha de vigencia indicada. Coordinaremos contigo la firma del contrato y el proceso de incorporación.',
            'Quedamos atentos a cualquier consulta. Será un gusto darte la bienvenida.'
          ]
        },
        {
          sectionCode: 'acceptance',
          heading: 'Aceptación',
          paragraphs: [
            'Declaro haber leído y comprendido las condiciones de esta oferta y manifiesto mi voluntad de aceptarla en los términos señalados.'
          ]
        }
      ]
    },
    'en-US': {
      title: 'Employment offer letter',
      sections: [
        {
          sectionCode: 'salutation',
          heading: '',
          paragraphs: [
            `Dear ${MOCK_WORKER.fullName},`,
            `We are delighted to offer you the opportunity to join ${MOCK_EMPLOYER.legalName} as ${MOCK_WORKER.jobTitleEn}. We value your background and are confident that your contribution will be key to the team's growth.`
          ]
        },
        {
          sectionCode: 'role_and_conditions',
          heading: 'The role and conditions',
          paragraphs: [
            'Below is a summary of the main conditions of your offer. The full detail, including all legal clauses, will be formalized in your individual employment contract once this offer is accepted.',
            'Your working hours will be governed by current Chilean labor law, and you will have access to team benefits from your first day.'
          ]
        },
        {
          sectionCode: 'next_steps',
          heading: 'Next steps',
          paragraphs: [
            'If you choose to accept, please reply to this letter or confirm through the usual channels before the validity date indicated. We will coordinate the contract signing and onboarding with you.',
            'We remain available for any questions. We look forward to welcoming you.'
          ]
        },
        {
          sectionCode: 'acceptance',
          heading: 'Acceptance',
          paragraphs: [
            'I declare that I have read and understood the conditions of this offer and express my willingness to accept it on the terms stated.'
          ]
        }
      ]
    }
  }
}

// ── C2 — Employment contract (contrato de trabajo), bilingual ─────────────────
export const MOCK_CONTRACT: MockBilingualDocument = {
  kind: 'employment_contract',
  jurisdictionPackCode: 'CL_CHILE_DEPENDENT_V1',
  authoritativeLanguage: 'es-CL',
  terms: SHARED_TERMS,
  localized: {
    'es-CL': {
      title: 'Contrato individual de trabajo',
      sections: [
        {
          sectionCode: 'comparecencia',
          heading: '',
          paragraphs: [
            `En ${MOCK_PLACE_DATE_ES}, entre ${MOCK_EMPLOYER.legalName}, RUT ${MOCK_EMPLOYER.taxId}, con domicilio en ${MOCK_EMPLOYER.address}, representada legalmente por don(ña) ${MOCK_EMPLOYER.representativeName}, cédula de identidad N° ${MOCK_EMPLOYER.representativeTaxId}, en adelante "el empleador"; y don(ña) ${MOCK_WORKER.fullName}, cédula de identidad N° ${MOCK_WORKER.taxId}, de nacionalidad ${MOCK_WORKER.nationality}, con domicilio en ${MOCK_WORKER.address}, en adelante "el trabajador", se ha convenido el siguiente contrato individual de trabajo:`
          ]
        },
        {
          sectionCode: 'funciones',
          ordinal: 'PRIMERO',
          heading: 'Naturaleza de los servicios',
          paragraphs: [
            `El trabajador se obliga a prestar servicios para el empleador en el cargo de ${MOCK_WORKER.jobTitle}, desempeñando las funciones propias de dicho cargo y aquellas conexas que le sean encomendadas, de conformidad con el artículo 10 N° 3 del Código del Trabajo.`,
            'El trabajador desempeñará sus funciones con la diligencia y dedicación que la naturaleza del cargo requiere, sujetándose a las instrucciones y al reglamento interno de orden, higiene y seguridad del empleador.'
          ]
        },
        {
          sectionCode: 'lugar',
          ordinal: 'SEGUNDO',
          heading: 'Lugar de prestación de los servicios',
          paragraphs: [
            'Los servicios se prestarán en las dependencias del empleador ubicadas en la comuna de Providencia, Región Metropolitana, sin perjuicio de la modalidad híbrida de trabajo acordada por las partes, que contempla el desempeño parcial de funciones a distancia conforme a la legislación vigente.'
          ]
        },
        {
          sectionCode: 'jornada',
          ordinal: 'TERCERO',
          heading: 'Jornada de trabajo',
          paragraphs: [
            'La jornada ordinaria de trabajo será de 44 horas semanales, distribuidas de lunes a viernes, conforme a los artículos 22 y siguientes del Código del Trabajo y a la Ley N° 21.561 sobre reducción de la jornada laboral.',
            'Las partes podrán pactar la distribución específica de la jornada en el reglamento interno o en anexos posteriores, respetando los límites y descansos legales.'
          ]
        },
        {
          sectionCode: 'remuneracion',
          ordinal: 'CUARTO',
          heading: 'Remuneración',
          paragraphs: [
            'El empleador pagará al trabajador una remuneración bruta mensual de $2.450.000 (dos millones cuatrocientos cincuenta mil pesos chilenos), de la cual se efectuarán las deducciones previsionales y tributarias que correspondan según la ley.',
            'La remuneración se pagará por mes vencido, dentro de los primeros cinco días hábiles del mes siguiente, mediante depósito en la cuenta bancaria que el trabajador indique.'
          ]
        },
        {
          sectionCode: 'duracion',
          ordinal: 'QUINTO',
          heading: 'Duración del contrato',
          paragraphs: [
            'El presente contrato es de duración indefinida y comenzará a regir a contar del 1 de julio de 2026, fecha en que el trabajador deberá presentarse a prestar servicios.'
          ]
        },
        {
          sectionCode: 'pago_obligaciones',
          ordinal: 'SEXTO',
          heading: 'Obligaciones previsionales',
          paragraphs: [
            'El empleador retendrá y enterará en los organismos previsionales y de salud que corresponda las cotizaciones legales del trabajador, dando cumplimiento a las obligaciones establecidas en la legislación de seguridad social vigente.'
          ]
        },
        {
          sectionCode: 'ejemplares',
          ordinal: 'SÉPTIMO',
          heading: 'Ejemplares',
          paragraphs: [
            'El presente contrato se firma en dos ejemplares de idéntico tenor y fecha, quedando uno en poder de cada parte, declarando el trabajador haber recibido el ejemplar que le corresponde.'
          ]
        }
      ]
    },
    'en-US': {
      title: 'Individual employment contract',
      sections: [
        {
          sectionCode: 'comparecencia',
          heading: '',
          paragraphs: [
            `In ${MOCK_PLACE_DATE_EN}, between ${MOCK_EMPLOYER.legalName}, Tax ID ${MOCK_EMPLOYER.taxId}, domiciled at ${MOCK_EMPLOYER.address}, legally represented by ${MOCK_EMPLOYER.representativeName}, national ID No. ${MOCK_EMPLOYER.representativeTaxId}, hereinafter "the Employer"; and ${MOCK_WORKER.fullName}, national ID No. ${MOCK_WORKER.taxId}, of ${MOCK_WORKER.nationality} nationality, domiciled at ${MOCK_WORKER.address}, hereinafter "the Worker", the following individual employment contract has been agreed. This is a reference translation; the Spanish (es-CL) version prevails.`
          ]
        },
        {
          sectionCode: 'funciones',
          ordinal: 'FIRST',
          heading: 'Nature of the services',
          paragraphs: [
            `The Worker undertakes to provide services to the Employer in the role of ${MOCK_WORKER.jobTitleEn}, performing the duties inherent to such role and related tasks assigned, in accordance with Article 10 No. 3 of the Chilean Labor Code.`,
            "The Worker shall perform their duties with the diligence the role requires, subject to the Employer's instructions and internal regulations on order, health and safety."
          ]
        },
        {
          sectionCode: 'lugar',
          ordinal: 'SECOND',
          heading: 'Place of service',
          paragraphs: [
            'Services shall be provided at the Employer’s premises located in the district of Providencia, Metropolitan Region, without prejudice to the hybrid work arrangement agreed by the parties, which contemplates partial remote performance in accordance with current legislation.'
          ]
        },
        {
          sectionCode: 'jornada',
          ordinal: 'THIRD',
          heading: 'Working hours',
          paragraphs: [
            'The ordinary working week shall be 44 hours, distributed Monday to Friday, in accordance with Articles 22 et seq. of the Labor Code and Law No. 21,561 on the reduction of the working week.',
            'The parties may agree the specific distribution of hours in the internal regulations or in subsequent annexes, respecting legal limits and rest periods.'
          ]
        },
        {
          sectionCode: 'remuneracion',
          ordinal: 'FOURTH',
          heading: 'Remuneration',
          paragraphs: [
            'The Employer shall pay the Worker a gross monthly salary of CLP 2,450,000 (two million four hundred fifty thousand Chilean pesos), from which the applicable social security and tax deductions shall be made according to law.',
            'Remuneration shall be paid monthly in arrears, within the first five business days of the following month, by deposit into the bank account indicated by the Worker.'
          ]
        },
        {
          sectionCode: 'duracion',
          ordinal: 'FIFTH',
          heading: 'Term of the contract',
          paragraphs: [
            'This contract is of indefinite duration and shall take effect from July 1, 2026, the date on which the Worker must report to provide services.'
          ]
        },
        {
          sectionCode: 'pago_obligaciones',
          ordinal: 'SIXTH',
          heading: 'Social security obligations',
          paragraphs: [
            'The Employer shall withhold and remit to the relevant pension and health institutions the Worker’s legal contributions, complying with the obligations established under current social security legislation.'
          ]
        },
        {
          sectionCode: 'ejemplares',
          ordinal: 'SEVENTH',
          heading: 'Counterparts',
          paragraphs: [
            'This contract is signed in two counterparts of identical content and date, one remaining with each party, the Worker declaring receipt of the corresponding counterpart.'
          ]
        }
      ]
    }
  }
}

// ── Visible chrome copy (kept as constants to avoid untokenized-copy lint noise) ─
export const DOC_MOCKUP_COPY = {
  pageTitle: 'Estándar de documento — Carta oferta y contrato',
  pageSubtitle:
    'Mockup del formato firmable bilingüe (Efeonce institucional). Carta oferta = formato O1 (carta ejecutiva secuencial). Contrato = formato C2 (instrumento es-CL prevalente + espejo en-US).',
  toggleOffer: 'Carta oferta · O1',
  toggleContract: 'Contrato · C2',
  statusDraft: 'Proyecto',
  statusSigned: 'Firmado',
  prevalentBannerEs: 'Versión en español · prevalente',
  referenceBannerEn: 'English version · reference',
  watermarkDraft: 'PROYECTO',
  termsTitle: 'Resumen de la oferta',
  signatureEmployer: 'Por el empleador',
  signatureWorker: 'El trabajador',
  signatureWitness: 'Ministro de fe',
  preStamped: 'Firma electrónica pre-estampada',
  signHerePlaceholder: 'Firma vía ZapSign',
  representativeRole: 'Representante legal'
} as const
