/**
 * TASK-1938 — Copy for the PDF presentation of the frozen AI Visibility Report.
 * The approved canvas translation table (2026-09-29) owns the document wording.
 * Metrics and recommendation selection continue to come from ReportArtifactModel.
 */
import type { ScoreDimensionKey } from '@/lib/growth/ai-visibility/scoring/config'
import type {
  CitationSourceClassification,
  GraderReportSeverity,
  RecommendationGapKey,
  SentimentNet
} from '@/lib/growth/ai-visibility/report/contracts'

export type AiVisibilityReportPdfLocale = 'es' | 'en' | 'pt-BR'

export interface AiVisibilityReportPdfCopy {
  locale: AiVisibilityReportPdfLocale
  intlLocale: 'es-CL' | 'en-US' | 'pt-BR'
  title: string
  prospectLabel: string
  clientLabel: string
  preparedFor: string
  verdict: string
  outOf100: string
  firstMeasurement: string
  noComparableHistory: string
  noData: string
  coverage: string
  noResponse: string
  unknownCoverage: string
  notSampled: string
  brandLabel: string
  assessmentResult: string
  chapters: readonly [string, string, string, string]
  primaryGap: string
  mainGap: string
  priorityPlan: string
  priorityHelper: string
  dimensionsTitle: string
  dimensionsHelper: string
  qualityTitle: string
  qualityHelper: string
  citationShare: string
  sentiment: string
  prominence: string
  levelsTitle: string
  perception: string
  operability: string
  perceptionLegend: string
  operabilityLegend: string
  enginesTitle: string
  benchmarkTitle: string
  sourcesTitle: string
  provenanceTitle: string
  asOf: string
  questions: string
  scoreVersion: string
  questionPack: string
  scopeNotice: string
  severity: Record<GraderReportSeverity, string>
  dimension: Record<ScoreDimensionKey, string>
  level: Record<'found' | 'readable' | 'correct' | 'actionable' | 'intrinsic', { label: string; english: string; question: string }>
  source: Record<CitationSourceClassification, string>
  sentimentLabel: Record<SentimentNet, string>
  recommendation: Record<RecommendationGapKey, { title: string; action: string }>
  finding: {
    visibleWithoutCitations: string
    mentionedWithoutCitations: string
  }
  closing: {
    prospectQuestion: string
    clientQuestion: string
    answer: string
    prospectEvidence: string
    clientEvidence: string
    evidenceFocus?: string
    bookMeeting: string
    chooseTime: string
    accountOwner: string
    nextReport: string
    datePending: string
    continuity: string
  }
  format: {
    headline: Record<GraderReportSeverity, (dimension: string) => string>
    period: (date: string) => string
    evaluatedIn: (engines: string) => string
    coverageBasis: (questions: string, responded: string, requested: string) => string
    coverageUnknown: (questions: string) => string
    fraction: (present: string, resolved: string) => string
    mentions: (count: string) => string
    citations: (count: string) => string
    benchmarkBasis: (count: string) => string
    sourcesBasis: (count: string) => string
    citationBasis: (cited: string, total: string) => string
    citationFinding: (share: string) => string
    leadingSource: (domain: string, citations: string, total: string, kind: string) => string
    planDimension: (dimension: string, score: string, weight: string) => string
    prominenceBasis: (average: string) => string
    sentimentBasis: (count: string) => string
    levelAxis: (ordinal: string, axis: string) => string
    weakestEngines: (engines: string) => string
    trend: (delta: string, date: string) => string
  }
}

/** Approved temporary account lead, declared once until assignment is available. */
export const AI_VISIBILITY_REPORT_DEFAULT_ACCOUNT_OWNER = {
  name: 'Julio Reyes',
  role: 'Managing Director & GTM',
  email: 'jreyes@efeoncepro.com'
} as const

const es: AiVisibilityReportPdfCopy = {
  locale: 'es', intlLocale: 'es-CL', title: 'AI Visibility Report',
  prospectLabel: 'Diagnóstico de visibilidad en IA', clientLabel: 'Informe de visibilidad en IA',
  preparedFor: 'Preparado para', verdict: 'Veredicto', outOf100: 'de 100',
  firstMeasurement: 'Primera medición: tu punto de partida', noComparableHistory: 'Sin histórico comparable',
  noData: 'Sin dato', coverage: 'En cobertura', noResponse: 'Sin respuesta',
  unknownCoverage: 'Cobertura de respuestas no verificada en este informe', notSampled: 'No evaluado',
  brandLabel: 'Tu marca', assessmentResult: 'Resultado del AEO Assessment',
  chapters: ['Qué hacer', 'Por qué ocurre', 'Dónde estás', 'Mercado y fuentes'],
  primaryGap: 'Lo que más pesa hoy', mainGap: 'Brecha principal', priorityPlan: 'Plan prioritario',
  priorityHelper: 'Movimientos priorizados según las brechas del informe.',
  dimensionsTitle: 'Siete dimensiones, con su peso',
  dimensionsHelper: 'Cada dimensión aporta al puntaje según su peso; la gravedad sale de la misma escala de la portada.',
  qualityTitle: 'Calidad de la presencia',
  qualityHelper: 'No basta con aparecer: importa si te citan, cómo te describen y en qué lugar.',
  citationShare: 'Share de citas', sentiment: 'Sentimiento', prominence: 'Prominencia',
  levelsTitle: 'Niveles para existir en un internet de agentes', perception: 'Percepción', operability: 'Operabilidad',
  perceptionLegend: '¿te mencionan? (niveles 01, 02, 03 y 05)', operabilityLegend: '¿te pueden usar? (04)',
  enginesTitle: 'Motor por motor', benchmarkTitle: 'Participación de voz', sourcesTitle: 'Fuentes que sostienen la respuesta',
  provenanceTitle: 'Procedencia y metodología', asOf: 'Datos al', questions: 'Preguntas',
  scoreVersion: 'Versión del puntaje', questionPack: 'Paquete de preguntas',
  scopeNotice: 'Diagnóstico muestreado y asistido por IA. No garantiza posiciones ni resultados; refleja una muestra de respuestas en la fecha del análisis.',
  severity: { critico: 'Crítico', atencion: 'Atención', optimo: 'Óptimo', sin_dato: 'Sin dato' },
  dimension: {
    ai_visibility: 'Visibilidad en IA', entity_clarity: 'Claridad de identidad',
    category_ownership: 'Dominio de la categoría', competitive_sov: 'Participación de voz',
    citation_quality: 'Calidad de las citas', message_alignment: 'Alineación del mensaje', revenue_intent_coverage: 'Intención de compra'
  },
  level: {
    found: { label: 'Que te encuentre', english: 'Be Found', question: '¿Existes para la IA?' },
    readable: { label: 'Que te entienda', english: 'Be Readable', question: '¿Te puede leer sin adivinar?' },
    correct: { label: 'Que te represente bien', english: 'Be Correct', question: '¿Lo que dice de ti es verdad?' },
    actionable: { label: 'Que pueda actuar', english: 'Be Actionable', question: '¿Te pueden usar, no solo citar?' },
    intrinsic: { label: 'Que te prefiera', english: 'Be Intrinsic', question: '¿Eres el default?' }
  },
  source: { own_domain: 'Tu sitio', competitor: 'Competidor', third_party: 'Terceros', ugc: 'Comunidad' },
  sentimentLabel: { positivo: 'Positivo', neutral: 'Neutral', negativo: 'Negativo', mixto: 'Mixto', sin_dato: 'Sin dato' },
  recommendation: {
    weak_citation_quality: { title: 'Gánate citas creíbles', action: 'Consigue menciones externas confiables con PR digital y actualiza la frescura de tus fuentes propias.' },
    low_category_ownership: { title: 'Apropia tu categoría', action: 'Publica un explainer de categoría, una página comparativa y perfiles en directorios de terceros.' },
    weak_revenue_intent: { title: 'Cubre la intención de compra', action: 'Agrega contenido de precios, implementación y casos de uso con pruebas.' },
    low_entity_clarity: { title: 'Aclara tu identidad ante la IA', action: 'Reescribe y amplía tus páginas de servicios y de quiénes somos con datos estructurados para que los motores entiendan quién eres, qué vendes y para quién.' },
    competitors_dominate: { title: 'Disputa los prompts de compra', action: 'Crea contenido comparativo y de alternativas con evidencia para aparecer donde hoy dominan otros proveedores.' },
    message_drift: { title: 'Alinea tu mensaje', action: 'Alinea tu sitio y tus perfiles públicos con tu narrativa deseada para que la IA repita tu posicionamiento, no uno desviado.' }
  },
  finding: { visibleWithoutCitations: 'Te encuentran, pero casi no te citan.', mentionedWithoutCitations: 'Te mencionan, pero no te citan.' },
  closing: {
    prospectQuestion: '¿Conversamos?', clientQuestion: '¿Lo revisamos juntos?', answer: 'Cuando quieras',
    prospectEvidence: 'Te mostramos qué mover primero para subir tu puntaje, y cómo medirlo mes a mes.',
    clientEvidence: 'Tu equipo en Efeonce trae la lectura y el plan de los tres movimientos a la próxima reunión.',
    evidenceFocus: 'qué mover primero',
    bookMeeting: 'Agenda una reunión', chooseTime: 'Elige el horario en efeoncepro.com/contacto',
    accountOwner: 'Responsable de tu cuenta', nextReport: 'Próximo informe', datePending: 'Por confirmar', continuity: 'Medimos lo mismo, mes a mes'
  },
  format: {
    headline: {
      critico: dimension => `${dimension} con brecha crítica en answer engines`,
      atencion: dimension => `${dimension} con espacio de mejora en answer engines`,
      optimo: dimension => `${dimension} sólida en answer engines`,
      sin_dato: dimension => `${dimension} sin evidencia suficiente`
    },
    period: date => `Diagnóstico al ${date}`, evaluatedIn: engines => `Evaluado en ${engines} motores de respuesta`,
    coverageBasis: (questions, responded, requested) => `${questions} preguntas · ${responded} de ${requested} motores respondieron`,
    coverageUnknown: questions => `${questions} preguntas · cobertura de respuestas no verificada`,
    fraction: (present, resolved) => `${present} de ${resolved}`, mentions: count => `${count} menciones`, citations: count => `${count} citas`,
    benchmarkBasis: count => `Qué parte de las menciones ocupas frente a otras marcas (${count} menciones en total).`,
    sourcesBasis: count => `Los dominios que los motores citan en la muestra (${count} citas).`,
    citationBasis: (cited, total) => `${cited} de ${total} respuestas con cita apuntan a tu sitio.`,
    citationFinding: share => `${share} de las respuestas con cita apuntan a tu sitio.`,
    leadingSource: (domain, citations, total, kind) => `La fuente más citada es ${domain} (${kind.toLowerCase()}, ${citations} de ${total} citas).`,
    planDimension: (dimension, score, weight) => `Mueve ${dimension} · hoy ${score} · peso ${weight} del puntaje`,
    prominenceBasis: average => `Tu mejor posición en la respuesta; promedio ${average}`,
    sentimentBasis: count => `Basado en ${count} menciones calificadas por IA.`,
    levelAxis: (ordinal, axis) => `Nivel ${ordinal} · ${axis}`,
    weakestEngines: engines => `Dónde más se pierde presencia: ${engines}.`, trend: (delta, date) => `${delta} puntos desde el ${date}`
  }
}

const en: AiVisibilityReportPdfCopy = {
  locale: 'en', intlLocale: 'en-US', title: 'AI Visibility Report',
  prospectLabel: 'AI visibility assessment', clientLabel: 'AI visibility report',
  preparedFor: 'Prepared for', verdict: 'Verdict', outOf100: 'out of 100',
  firstMeasurement: 'First measurement: your baseline', noComparableHistory: 'No comparable history',
  noData: 'No data', coverage: 'Not measured yet', noResponse: 'No response',
  unknownCoverage: 'Response coverage is not verified in this report', notSampled: 'Not evaluated',
  brandLabel: 'Your brand', assessmentResult: 'AEO Assessment result',
  chapters: ['What to do', 'Why it happens', 'Where you stand', 'Market and sources'],
  primaryGap: 'What matters most today', mainGap: 'Main gap', priorityPlan: 'Priority plan',
  priorityHelper: 'Moves prioritized according to the gaps in this report.',
  dimensionsTitle: 'Seven dimensions, weighted',
  dimensionsHelper: 'Each dimension adds to the score by its weight; severity uses the same scale as the cover.',
  qualityTitle: 'Presence quality',
  qualityHelper: 'Showing up is not enough: what matters is whether they cite you, how they describe you and where.',
  citationShare: 'Citation share', sentiment: 'Sentiment', prominence: 'Prominence',
  levelsTitle: 'Levels to exist on an agentic web', perception: 'Perception', operability: 'Operability',
  perceptionLegend: 'do they mention you? (levels 01, 02, 03 and 05)', operabilityLegend: 'can they use you? (04)',
  enginesTitle: 'Engine by engine', benchmarkTitle: 'Share of voice', sourcesTitle: 'Sources behind the answer',
  provenanceTitle: 'Provenance and methodology', asOf: 'Data as of', questions: 'Questions',
  scoreVersion: 'Score version', questionPack: 'Question pack',
  scopeNotice: 'A sampled, AI-assisted assessment. It does not guarantee positions or outcomes; it reflects a sample of answers on the date of the analysis.',
  severity: { critico: 'Critical', atencion: 'Needs work', optimo: 'Optimal', sin_dato: 'No data' },
  dimension: {
    ai_visibility: 'AI visibility', entity_clarity: 'Identity clarity', category_ownership: 'Category ownership',
    competitive_sov: 'Share of voice', citation_quality: 'Citation quality', message_alignment: 'Message alignment', revenue_intent_coverage: 'Purchase intent'
  },
  level: {
    found: { label: 'Be Found', english: 'Be Found', question: 'Do you exist for AI?' },
    readable: { label: 'Be Readable', english: 'Be Readable', question: 'Can it read you without guessing?' },
    correct: { label: 'Be Correct', english: 'Be Correct', question: 'Is what it says about you true?' },
    actionable: { label: 'Be Actionable', english: 'Be Actionable', question: 'Can they use you, not just cite you?' },
    intrinsic: { label: 'Be Intrinsic', english: 'Be Intrinsic', question: 'Are you the default?' }
  },
  source: { own_domain: 'Your site', competitor: 'Competitor', third_party: 'Third party', ugc: 'Community' },
  sentimentLabel: { positivo: 'Positive', neutral: 'Neutral', negativo: 'Negative', mixto: 'Mixed', sin_dato: 'No data' },
  recommendation: {
    weak_citation_quality: { title: 'Earn credible citations', action: 'Earn trustworthy third-party mentions through digital PR and keep your own sources fresh.' },
    low_category_ownership: { title: 'Own your category', action: 'Publish a category explainer, a comparison page and profiles on third-party directories.' },
    weak_revenue_intent: { title: 'Cover purchase intent', action: 'Add pricing, implementation and use-case content, with proof.' },
    low_entity_clarity: { title: 'Clarify your identity for AI', action: 'Expand your service and about pages with structured data so engines understand who you are, what you sell and who you serve.' },
    competitors_dominate: { title: 'Compete for purchase prompts', action: 'Create comparison and alternative content with evidence to appear where other providers currently dominate.' },
    message_drift: { title: 'Align your message', action: 'Align your website and public profiles with your intended narrative so AI repeats your positioning accurately.' }
  },
  finding: { visibleWithoutCitations: 'They find you, but rarely cite you.', mentionedWithoutCitations: "They mention you, but don't cite you." },
  closing: {
    prospectQuestion: 'Shall we talk?', clientQuestion: 'Shall we review it together?', answer: 'Whenever you like',
    prospectEvidence: "We'll show you what to move first to raise your score, and how to measure it month by month.",
    clientEvidence: 'Your Efeonce team brings the reading and the plan for the three moves to the next meeting.',
    evidenceFocus: 'what to move first',
    bookMeeting: 'Book a meeting', chooseTime: 'Pick a time at efeoncepro.com/contacto',
    accountOwner: 'Your account lead', nextReport: 'Next report', datePending: 'To be confirmed', continuity: 'Same measurement, month after month'
  },
  format: {
    headline: {
      critico: dimension => `${dimension} with a critical gap in answer engines`,
      atencion: dimension => `${dimension} with room for improvement in answer engines`,
      optimo: dimension => `${dimension} is strong in answer engines`,
      sin_dato: dimension => `${dimension} without sufficient evidence`
    },
    period: date => `Assessment as of ${date}`, evaluatedIn: engines => `Evaluated across ${engines} answer engines`,
    coverageBasis: (questions, responded, requested) => `${questions} questions · ${responded} of ${requested} engines responded`,
    coverageUnknown: questions => `${questions} questions · response coverage is not verified`,
    fraction: (present, resolved) => `${present} of ${resolved}`, mentions: count => `${count} mentions`, citations: count => `${count} citations`,
    benchmarkBasis: count => `Your share of mentions against other brands (${count} mentions in total).`,
    sourcesBasis: count => `The domains engines cite in the sample (${count} citations).`,
    citationBasis: (cited, total) => `${cited} of ${total} answers with a citation point to your site.`,
    citationFinding: share => `${share} of answers with a citation point to your site.`,
    leadingSource: (domain, citations, total, kind) => `The most cited source is ${domain} (${kind.toLowerCase()}, ${citations} of ${total} citations).`,
    planDimension: (dimension, score, weight) => `Moves ${dimension} · today ${score} · ${weight} of the score`,
    prominenceBasis: average => `Your best position in the answer; average ${average}`,
    sentimentBasis: count => `Based on ${count} mentions classified by AI.`,
    levelAxis: (ordinal, axis) => `Level ${ordinal} · ${axis}`,
    weakestEngines: engines => `Where presence drops most: ${engines}.`, trend: (delta, date) => `${delta} points since ${date}`
  }
}

const ptBR: AiVisibilityReportPdfCopy = {
  locale: 'pt-BR', intlLocale: 'pt-BR', title: 'AI Visibility Report',
  prospectLabel: 'Diagnóstico de visibilidade em IA', clientLabel: 'Relatório de visibilidade em IA',
  preparedFor: 'Preparado para', verdict: 'Veredito', outOf100: 'de 100',
  firstMeasurement: 'Primeira medição: seu ponto de partida', noComparableHistory: 'Sem histórico comparável',
  noData: 'Sem dado', coverage: 'Ainda não medido', noResponse: 'Sem resposta',
  unknownCoverage: 'A cobertura de respostas não foi verificada neste relatório', notSampled: 'Não avaliado',
  brandLabel: 'Sua marca', assessmentResult: 'Resultado do AEO Assessment',
  chapters: ['O que fazer', 'Por que acontece', 'Onde você está', 'Mercado e fontes'],
  primaryGap: 'O que mais pesa hoje', mainGap: 'Principal lacuna', priorityPlan: 'Plano prioritário',
  priorityHelper: 'Movimentos priorizados conforme as lacunas do relatório.',
  dimensionsTitle: 'Sete dimensões, com seu peso',
  dimensionsHelper: 'Cada dimensão soma à pontuação conforme seu peso; a gravidade usa a mesma escala da capa.',
  qualityTitle: 'Qualidade da presença', qualityHelper: 'Não basta aparecer: importa se citam você, como descrevem você e em que lugar.',
  citationShare: 'Share de citações', sentiment: 'Sentimento', prominence: 'Proeminência',
  levelsTitle: 'Níveis para existir em uma internet de agentes', perception: 'Percepção', operability: 'Operabilidade',
  perceptionLegend: 'mencionam você? (níveis 01, 02, 03 e 05)', operabilityLegend: 'podem usar você? (04)',
  enginesTitle: 'Motor por motor', benchmarkTitle: 'Participação de voz', sourcesTitle: 'Fontes que sustentam a resposta',
  provenanceTitle: 'Procedência e metodologia', asOf: 'Dados de', questions: 'Perguntas',
  scoreVersion: 'Versão da pontuação', questionPack: 'Pacote de perguntas',
  scopeNotice: 'Diagnóstico baseado em uma amostra e assistido por IA. Não garante posições nem resultados; reflete uma amostra de respostas na data da análise.',
  severity: { critico: 'Crítico', atencion: 'Atenção', optimo: 'Ótimo', sin_dato: 'Sem dado' },
  dimension: {
    ai_visibility: 'Visibilidade em IA', entity_clarity: 'Clareza de identidade', category_ownership: 'Domínio da categoria',
    competitive_sov: 'Participação de voz', citation_quality: 'Qualidade das citações', message_alignment: 'Alinhamento da mensagem', revenue_intent_coverage: 'Intenção de compra'
  },
  level: {
    found: { label: 'Ser encontrado', english: 'Be Found', question: 'Você existe para a IA?' },
    readable: { label: 'Ser entendido', english: 'Be Readable', question: 'Ela consegue ler você sem adivinhar?' },
    correct: { label: 'Ser bem representado', english: 'Be Correct', question: 'O que ela diz sobre você é verdade?' },
    actionable: { label: 'Ser acionável', english: 'Be Actionable', question: 'Podem usar você, não só citar?' },
    intrinsic: { label: 'Ser o preferido', english: 'Be Intrinsic', question: 'Você é o padrão?' }
  },
  source: { own_domain: 'Seu site', competitor: 'Concorrente', third_party: 'Terceiros', ugc: 'Comunidade' },
  sentimentLabel: { positivo: 'Positivo', neutral: 'Neutro', negativo: 'Negativo', mixto: 'Misto', sin_dato: 'Sem dado' },
  recommendation: {
    weak_citation_quality: { title: 'Conquiste citações confiáveis', action: 'Conquiste menções externas confiáveis com PR digital e mantenha suas fontes próprias atualizadas.' },
    low_category_ownership: { title: 'Domine sua categoria', action: 'Publique um explainer da categoria, uma página comparativa e perfis em diretórios de terceiros.' },
    weak_revenue_intent: { title: 'Cubra a intenção de compra', action: 'Adicione conteúdo de preços, implementação e casos de uso, com provas.' },
    low_entity_clarity: { title: 'Esclareça sua identidade para a IA', action: 'Amplie suas páginas de serviços e sobre a empresa com dados estruturados para que os motores entendam quem você é, o que vende e para quem.' },
    competitors_dominate: { title: 'Dispute os prompts de compra', action: 'Crie conteúdo comparativo e de alternativas com evidências para aparecer onde outros fornecedores dominam hoje.' },
    message_drift: { title: 'Alinhe sua mensagem', action: 'Alinhe seu site e seus perfis públicos à narrativa desejada para que a IA repita seu posicionamento com precisão.' }
  },
  finding: { visibleWithoutCitations: 'Encontram você, mas quase não citam você.', mentionedWithoutCitations: 'Mencionam você, mas não citam.' },
  closing: {
    prospectQuestion: 'Vamos conversar?', clientQuestion: 'Vamos revisar juntos?', answer: 'Quando quiser',
    prospectEvidence: 'Mostramos o que mover primeiro para aumentar sua pontuação, e como medi-la mês a mês.',
    clientEvidence: 'Sua equipe na Efeonce leva a leitura e o plano dos três movimentos para a próxima reunião.',
    evidenceFocus: 'mover primeiro',
    bookMeeting: 'Agende uma reunião', chooseTime: 'Escolha o horário em efeoncepro.com/contacto',
    accountOwner: 'Responsável pela sua conta', nextReport: 'Próximo relatório', datePending: 'A confirmar', continuity: 'Medimos o mesmo, mês a mês'
  },
  format: {
    headline: {
      critico: dimension => `${dimension} com uma lacuna crítica nos motores de resposta`,
      atencion: dimension => `${dimension} com espaço para melhoria nos motores de resposta`,
      optimo: dimension => `${dimension} sólida nos motores de resposta`,
      sin_dato: dimension => `${dimension} sem evidência suficiente`
    },
    period: date => `Diagnóstico de ${date}`, evaluatedIn: engines => `Avaliado em ${engines} motores de resposta`,
    coverageBasis: (questions, responded, requested) => `${questions} perguntas · ${responded} de ${requested} motores responderam`,
    coverageUnknown: questions => `${questions} perguntas · cobertura de respostas não verificada`,
    fraction: (present, resolved) => `${present} de ${resolved}`, mentions: count => `${count} menções`, citations: count => `${count} citações`,
    benchmarkBasis: count => `Quanto das menções você ocupa frente a outras marcas (${count} menções no total).`,
    sourcesBasis: count => `Os domínios que os motores citam na amostra (${count} citações).`,
    citationBasis: (cited, total) => `${cited} de ${total} respostas com citação apontam para o seu site.`,
    citationFinding: share => `${share} das respostas com citação apontam para o seu site.`,
    leadingSource: (domain, citations, total, kind) => `A fonte mais citada é ${domain} (${kind.toLowerCase()}, ${citations} de ${total} citações).`,
    planDimension: (dimension, score, weight) => `Move ${dimension} · hoje ${score} · peso de ${weight} na pontuação`,
    prominenceBasis: average => `Sua melhor posição na resposta; média ${average}`,
    sentimentBasis: count => `Baseado em ${count} menções classificadas por IA.`,
    levelAxis: (ordinal, axis) => `Nível ${ordinal} · ${axis}`,
    weakestEngines: engines => `Onde mais se perde presença: ${engines}.`, trend: (delta, date) => `${delta} pontos desde ${date}`
  }
}

export const AI_VISIBILITY_REPORT_PDF_COPY: Record<AiVisibilityReportPdfLocale, AiVisibilityReportPdfCopy> = {
  es, en, 'pt-BR': ptBR
}
