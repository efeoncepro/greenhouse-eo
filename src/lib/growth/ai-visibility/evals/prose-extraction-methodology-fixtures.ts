/**
 * TASK-1271 — Growth AI Visibility · Prose Extraction · Methodology fixtures.
 *
 * Set focal que ejercita el contrato metodológico de §Sentiment methodology
 * contract: sentiment HACIA LA MARCA SUJETO ≠ tono general; `unknown` conservador;
 * `mixed` sólo con pros+contras reales; drift sólo con evidencia. Excerpts
 * realistas (no descripciones humanas como el golden-set) para medir false
 * positives/negatives de sentimiento de marca. PURO (sin IO).
 */

export interface ProseEvalCase {
  id: string
  input: { excerpt: string; subjectBrand: string; subjectDomain: string | null }
  expected: {
    /** Etiqueta de sentimiento HACIA la marca sujeto esperada. */
    sentimentLabel: 'positive' | 'neutral' | 'negative' | 'mixed' | 'unknown'
    /** ¿Se espera al menos un drift claim? (narrativa que NO refleja el posicionamiento real). */
    driftExpected: boolean
    note: string
  }
}

export const PROSE_EXTRACTION_METHODOLOGY_FIXTURES: ProseEvalCase[] = [
  {
    id: 'm01_general_tone_not_brand',
    input: {
      excerpt:
        'El marketing digital en Chile es un sector vibrante y lleno de oportunidades. Entre las opciones disponibles se menciona a Acme Studio como una de varias agencias.',
      subjectBrand: 'Acme Studio',
      subjectDomain: 'acme.cl'
    },
    expected: {
      sentimentLabel: 'unknown',
      driftExpected: false,
      note: 'Tono general optimista del mercado, sin juicio sobre la marca sujeto → NO es positive (false-positive guard).'
    }
  },
  {
    id: 'm02_clear_positive_on_brand',
    input: {
      excerpt:
        'Acme Studio destaca como una de las mejores agencias del país: clientes la elogian por su consistencia, resultados medibles y un equipo senior muy sólido.',
      subjectBrand: 'Acme Studio',
      subjectDomain: 'acme.cl'
    },
    expected: {
      sentimentLabel: 'positive',
      driftExpected: false,
      note: 'Juicio positivo explícito sobre la marca sujeto → positive.'
    }
  },
  {
    id: 'm03_clear_negative_on_brand',
    input: {
      excerpt:
        'Varias reseñas describen a Acme Studio como poco confiable: incumplimiento de plazos, soporte deficiente y rotación alta. La recomendación general es evitarla.',
      subjectBrand: 'Acme Studio',
      subjectDomain: 'acme.cl'
    },
    expected: {
      sentimentLabel: 'negative',
      driftExpected: false,
      note: 'Juicio negativo claro sobre la marca sujeto → negative.'
    }
  },
  {
    id: 'm04_only_lists_no_judgment',
    input: {
      excerpt:
        'Algunas agencias de diseño en Chile son: Cebra, Acme Studio y BBDO. Cada una atiende segmentos distintos del mercado.',
      subjectBrand: 'Acme Studio',
      subjectDomain: 'acme.cl'
    },
    expected: {
      sentimentLabel: 'unknown',
      driftExpected: false,
      note: 'La marca aparece en una lista sin juicio evaluativo → unknown (no neutral falsamente positivo/negativo).'
    }
  },
  {
    id: 'm05_real_pros_and_cons',
    input: {
      excerpt:
        'Acme Studio tiene un trabajo creativo muy reconocido y premiado, aunque algunos clientes señalan que sus precios son altos y los tiempos de respuesta lentos.',
      subjectBrand: 'Acme Studio',
      subjectDomain: 'acme.cl'
    },
    expected: {
      sentimentLabel: 'mixed',
      driftExpected: false,
      note: 'Pros (creatividad premiada) y contras (precio/tiempos) reales sobre la marca → mixed (no unknown).'
    }
  },
  {
    id: 'm06_brand_absent',
    input: {
      excerpt:
        'Las agencias líderes en Chile incluyen Cebra y BBDO, reconocidas por sus campañas globales y su escala.',
      subjectBrand: 'Acme Studio',
      subjectDomain: 'acme.cl'
    },
    expected: {
      sentimentLabel: 'unknown',
      driftExpected: false,
      note: 'La marca sujeto no aparece → unknown (la presencia la decide el determinista; aquí sin juicio).'
    }
  },
  {
    id: 'm07_message_drift',
    input: {
      excerpt:
        'Acme Studio es descrita como una agencia de marketing inbound genérica, enfocada en blogs y SEO básico — sin mención de su plataforma de Growth ni su metodología propia.',
      subjectBrand: 'Acme Studio',
      subjectDomain: 'acme.cl'
    },
    expected: {
      sentimentLabel: 'neutral',
      driftExpected: true,
      note: 'La narrativa genérica ("inbound básico") NO refleja el posicionamiento real (Growth platform) → drift esperado.'
    }
  }
]
