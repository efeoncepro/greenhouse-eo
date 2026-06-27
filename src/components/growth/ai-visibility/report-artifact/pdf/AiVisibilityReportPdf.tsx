import 'server-only'

import { resolve } from 'node:path'

import { Document, Image, Page, StyleSheet, Text, View } from '@react-pdf/renderer'

import { EFEONCE_LEGAL_NAME_FALLBACK, EFEONCE_URL } from '@/config/efeonce-brand'
import { EfeoncePdfFooter } from '@/lib/finance/pdf/efeonce-pdf-footer'
import { EfeonceSloganPdf } from '@/lib/finance/pdf/efeonce-slogan-pdf'
import { GH_GROWTH_AI_VISIBILITY, GH_GROWTH_AI_VISIBILITY_REPORT_ARTIFACT as C } from '@/lib/copy/growth'
import type { GraderReportSeverity } from '@/lib/growth/ai-visibility/report/contracts'

import { REPORT_SEVERITY_TONE, reportSectionVisible, type ReportArtifactModel } from '../model'
import type { ReportHeader } from '../web/AiVisibilityReportArtifact'
import { ReportPdfColors as K, ReportPdfFonts as F, ReportPdfPage as P } from './report-pdf-tokens'

/**
 * TASK-1273 — AI Visibility Report · PDF premium render adapter (Slice 2).
 *
 * Tercer adapter del report artifact (web · print-HTML · PDF), todos sobre el
 * MISMO `ReportArtifactModel`. Documento react-pdf vectorial, paginado A4, con
 * fuentes embebidas. Consume EXCLUSIVAMENTE el variant `attachment`
 * (`modelFromPublicReport(report, 'attachment')`) — leak-safe por tipo; respeta
 * la disclosure matrix (sin trend, sin narrativa cruda por motor).
 *
 * Autoría como UN componente con todo el texto inline (sin sub-componentes que
 * reciban el modelo crudo) para que el no-leak test recorra el árbol de strings.
 * Fuente visual: `docs/research/mockups/ai-visibility-report-pdf-mockup.html` (v5).
 *
 * Charts vectoriales (gauge/barras) via `<Svg>`/`<View>`; logos de marca como
 * `<Image>` PNG (react-pdf no acepta SVG) rasterizados por
 * `scripts/build-pdf-brand-assets.ts`. Marca Efeonce desde el SSOT, NUNCA AxisWordmark.
 */

const asset = (file: string): string => resolve(process.cwd(), 'public', file)

/** provider canónico → PNG del isotipo (rasterizado). Sin entrada = sin tile. */
const ENGINE_ASSET: Record<string, string | undefined> = {
  gemini: 'branding/pdf/engine-gemini.png',
  openai: 'branding/pdf/engine-gpt.png',
  anthropic: 'branding/pdf/engine-claude.png',
  perplexity: 'branding/pdf/engine-perplexity.png'
}

/** Color de texto/cifra por severidad (amber → ink AA). */
const toneInk = (severity: GraderReportSeverity): string => {
  const tone = REPORT_SEVERITY_TONE[severity]

  if (tone === 'success') return K.success
  if (tone === 'warning') return K.warningInk
  if (tone === 'error') return K.error

  return K.subtle
}

/** Color de punto/relleno por severidad (amber brillante para el dot). */
const toneDot = (severity: GraderReportSeverity): string => {
  const tone = REPORT_SEVERITY_TONE[severity]

  if (tone === 'success') return K.success
  if (tone === 'warning') return K.warning
  if (tone === 'error') return K.error

  return K.subtle
}

const clampPct = (n: number): number => Math.max(0, Math.min(100, n))

const s = StyleSheet.create({
  // ── cover (full navy) ──
  cover: { backgroundColor: K.navy, color: '#fff', paddingHorizontal: P.padX, paddingTop: P.padTop, position: 'relative' },
  coverWm: { height: 20, width: 'auto' },
  coverEyebrow: { fontFamily: F.bodySemibold, fontSize: 7, letterSpacing: 1.4, color: K.onNavyMuted, textTransform: 'uppercase', marginTop: 46 },
  coverOrg: { fontFamily: F.displayBold, fontSize: 42, letterSpacing: -1.2, marginTop: 8, color: '#fff' },
  coverPeriod: { fontFamily: F.body, fontSize: 10, color: K.onNavyStrong, marginTop: 12 },
  coverHero: { flexDirection: 'row', alignItems: 'center', gap: 28, marginTop: 64 },
  // Score badge = anillo View (border) en color de severidad. NO Svg: react-pdf
  // tiene un bug de compositing de <Svg> sobre Page con backgroundColor (el stroke
  // ámbar sale verde y el dasharray no se aplica). El número porta el valor; el
  // anillo porta la severidad. Verificado contra fondo navy.
  gaugeWrap: { width: 118, height: 118, borderRadius: 59, borderWidth: 9, borderStyle: 'solid', alignItems: 'center', justifyContent: 'center' },
  gaugeNum: { fontFamily: F.displayExtra, fontSize: 38, color: '#fff', lineHeight: 1 },
  gaugeUnit: { fontFamily: F.body, fontSize: 8, color: K.onNavyStrong, marginTop: 3 },
  verdictTitle: { fontFamily: F.display, fontSize: 14, color: '#fff', marginTop: 6 },
  verdictBody: { fontFamily: F.body, fontSize: 9.5, lineHeight: 1.55, color: K.onNavyStrong, marginTop: 7, maxWidth: 300 },
  coverEngines: { position: 'absolute', left: P.padX, bottom: 60 },
  coverEnginesLbl: { fontFamily: F.bodySemibold, fontSize: 7, letterSpacing: 1.3, color: K.onNavyFaint, textTransform: 'uppercase', marginBottom: 9 },
  engineStrip: { flexDirection: 'row', gap: 8 },
  engineTile: { width: 30, height: 30, borderRadius: 8, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  engineTileImg: { width: 17, height: 17, objectFit: 'contain' },
  coverFoot: { position: 'absolute', left: P.padX, right: P.padX, bottom: 28 },
  coverFootText: { fontFamily: F.body, fontSize: 7, color: K.onNavyFaint },

  // ── content page ──
  page: { backgroundColor: K.paper, color: K.text, paddingHorizontal: P.padX, paddingTop: P.padTop, paddingBottom: P.padBottom, fontFamily: F.body, fontSize: 9.5 },
  pageNo: { position: 'absolute', top: 32, right: P.padX, fontFamily: F.body, fontSize: 7.5, color: K.subtle, letterSpacing: 1 },
  eyebrow: { fontFamily: F.bodySemibold, fontSize: 7.5, letterSpacing: 1.4, color: K.accent, textTransform: 'uppercase' },
  sectionTitle: { fontFamily: F.display, fontSize: 15, color: K.navy, letterSpacing: -0.3, marginTop: 5 },
  helper: { fontFamily: F.body, fontSize: 8.5, color: K.muted, marginTop: 4, maxWidth: 440 },
  section: { marginTop: 26 },
  axisBand: { flexDirection: 'row', gap: 16, marginTop: 10 },
  axisBandText: { fontFamily: F.body, fontSize: 8, color: K.muted },
  axisBandStrong: { fontFamily: F.bodySemibold, color: K.navy },

  // levels
  levelsRow: { flexDirection: 'row', gap: 10, marginTop: 13 },
  level: { flex: 1, borderWidth: 1, borderColor: K.divider, borderStyle: 'solid', borderRadius: 9, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 9 },
  levelFull: { borderWidth: 1, borderColor: K.divider, borderStyle: 'solid', borderRadius: 9, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 9, marginTop: 10 },
  levelOrd: { fontFamily: F.displayBold, fontSize: 13, color: K.accent, width: 18 },
  levelMain: { flex: 1 },
  levelLabel: { fontFamily: F.bodySemibold, fontSize: 9.5, color: K.text },
  levelEn: { fontFamily: F.body, fontSize: 8, color: K.subtle },
  levelQ: { fontFamily: F.body, fontSize: 8, color: K.muted, marginTop: 2 },
  levelScore: { fontFamily: F.displayBold, fontSize: 14 },
  coverChip: { fontFamily: F.bodySemibold, fontSize: 7.5, color: K.muted, backgroundColor: K.surface, borderWidth: 1, borderColor: K.divider, borderStyle: 'solid', borderRadius: 999, paddingVertical: 3, paddingHorizontal: 8 },

  // engine rows
  engineRow: { flexDirection: 'row', alignItems: 'center', gap: 11, marginTop: 14 },
  engineRowTile: { width: 27, height: 27, borderRadius: 7, backgroundColor: K.surface, borderWidth: 1, borderColor: K.divider, borderStyle: 'solid', alignItems: 'center', justifyContent: 'center' },
  engineRowImg: { width: 15, height: 15, objectFit: 'contain' },
  engineRowBody: { flex: 1 },

  barHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 4 },
  barName: { fontFamily: F.body, fontSize: 9, color: K.text },
  barNameBold: { fontFamily: F.bodyBold, fontSize: 9, color: K.text },
  barVal: { fontFamily: F.bodySemibold, fontSize: 8.5 },
  track: { height: 6.5, borderRadius: 4, backgroundColor: K.track },
  fill: { height: 6.5, borderRadius: 4 },

  // gap callout
  gap: { borderWidth: 1, borderColor: K.divider, borderLeftWidth: 4, borderLeftColor: K.error, borderStyle: 'solid', borderRadius: 9, padding: 15, marginTop: 13, backgroundColor: K.surface },
  gapTitle: { fontFamily: F.display, fontSize: 11.5, color: K.text },
  gapMotion: { fontFamily: F.body, fontSize: 8.5, color: K.muted, marginTop: 7, lineHeight: 1.5 },
  gapMotionStrong: { fontFamily: F.bodySemibold, color: K.accent },

  // dimensions
  dimRow: { marginTop: 13 },
  dimScore: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 5, height: 5, borderRadius: 999 },

  // kpis
  kpis: { flexDirection: 'row', gap: 11, marginTop: 14 },
  kpi: { flex: 1, borderWidth: 1, borderColor: K.divider, borderStyle: 'solid', borderRadius: 9, padding: 13 },
  kpiOverline: { fontFamily: F.bodySemibold, fontSize: 6.5, letterSpacing: 1.1, color: K.subtle, textTransform: 'uppercase' },
  kpiValue: { fontFamily: F.displayBold, fontSize: 19, color: K.navy, marginTop: 8 },
  kpiValueSm: { fontFamily: F.displayBold, fontSize: 16, color: K.navy, marginTop: 9 },
  kpiHint: { fontFamily: F.body, fontSize: 8, color: K.muted, marginTop: 6 },

  // sentiment
  senti: { marginTop: 16 },
  sentiOverline: { fontFamily: F.bodySemibold, fontSize: 6.5, letterSpacing: 1.1, color: K.subtle, textTransform: 'uppercase', marginBottom: 8 },
  sentiBar: { flexDirection: 'row', height: 8, borderRadius: 4, overflow: 'hidden' },
  sentiLegend: { flexDirection: 'row', gap: 18, marginTop: 9 },
  sentiItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  sentiSw: { width: 7, height: 7, borderRadius: 2 },
  sentiText: { fontFamily: F.body, fontSize: 8, color: K.muted },
  sentiTextB: { fontFamily: F.bodySemibold, color: K.text },

  // recommendations
  rec: { flexDirection: 'row', gap: 11, marginTop: 11 },
  recNum: { width: 21, height: 21, borderRadius: 6, backgroundColor: K.navy, color: '#fff', fontFamily: F.displayBold, fontSize: 10, alignItems: 'center', justifyContent: 'center', textAlign: 'center' },
  recBody: { flex: 1 },
  recTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  recTitle: { fontFamily: F.bodyBold, fontSize: 10, color: K.text },
  recAction: { fontFamily: F.body, fontSize: 8.5, color: K.muted, marginTop: 3, lineHeight: 1.45 },
  sevChip: { fontFamily: F.bodySemibold, fontSize: 7.5, borderRadius: 999, paddingVertical: 2, paddingHorizontal: 7 },

  // provenance
  prov: { marginTop: 12 },
  provRow: { flexDirection: 'row', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: K.divider, borderBottomStyle: 'solid', paddingVertical: 6 },
  provKey: { fontFamily: F.body, fontSize: 9, color: K.muted },
  provVal: { fontFamily: F.bodySemibold, fontSize: 9, color: K.text },

  // disclaimer + closing
  disc: { marginTop: 14, paddingTop: 11, borderTopWidth: 1, borderTopColor: K.divider, borderTopStyle: 'solid' },
  discText: { fontFamily: F.body, fontSize: 7, color: K.subtle, lineHeight: 1.5 },
  closing: { marginTop: 18, paddingTop: 13, borderTopWidth: 1, borderTopColor: K.divider, borderTopStyle: 'solid', alignItems: 'center' },
  closingLogo: { height: 18, width: 'auto', marginBottom: 8 },
  closingLegal: { fontFamily: F.body, fontSize: 6.5, color: K.subtle, marginTop: 7 }
})

export interface AiVisibilityReportPdfProps {
  model: ReportArtifactModel
  header: ReportHeader
}

const Gauge = ({ score, severity }: { score: number | null; severity: GraderReportSeverity }) => {
  const ring = score === null || severity === 'sin_dato' ? K.onNavyTrack : toneDot(severity)

  return (
    <View style={[s.gaugeWrap, { borderColor: ring }]}>
      <Text style={s.gaugeNum}>{score === null ? '—' : score}</Text>
      <Text style={s.gaugeUnit}>de 100</Text>
    </View>
  )
}

const StaticBar = ({ value, color }: { value: number; color: string }) => (
  <View style={s.track}>
    <View style={[s.fill, { width: `${clampPct(value)}%`, backgroundColor: color }]} />
  </View>
)

/**
 * Render PDF del informe (variant `attachment`). Un componente, todo el texto
 * inline. Iterar SOLO las secciones visibles del variant attachment.
 */
const AiVisibilityReportPdf = ({ model, header }: AiVisibilityReportPdfProps) => {
  const show = (section: Parameters<typeof reportSectionVisible>[1]) => reportSectionVisible('attachment', section)

  const sampledCount = model.provenance.providersSampled.length
  const arcSeverity = model.overallSeverity

  const sovRows = [
    { name: C.sov.brandLabel, mentions: model.competitiveSov.brandMentions, isBrand: true },
    ...model.competitiveSov.competitors.map(comp => ({ name: comp.name, mentions: comp.mentions, isBrand: false }))
  ]

  const sovMax = Math.max(1, ...sovRows.map(row => row.mentions))

  const sentiment = model.sentimentSummary
  const sentiTotal = Math.max(1, sentiment.positive + sentiment.neutral + sentiment.negative)
  const sentiPct = (n: number) => Math.round((n / sentiTotal) * 100)

  const sevChipStyle = (severity: GraderReportSeverity) => {
    const tone = REPORT_SEVERITY_TONE[severity]

    if (tone === 'error') return { backgroundColor: 'rgba(220,46,57,0.10)', color: K.error }
    if (tone === 'success') return { backgroundColor: 'rgba(21,127,71,0.10)', color: K.success }

    return { backgroundColor: 'rgba(255,183,3,0.16)', color: K.warningInk }
  }

  return (
    <Document title={`${C.header.title} — ${header.organizationName}`} author='Efeonce' creator='Greenhouse EO' producer='Greenhouse EO'>
      {/* ── PAGE 1 · COVER (full navy hero) ── */}
      <Page size='A4' style={s.cover}>
        <Image src={asset('branding/pdf/efeonce-wordmark-white.png')} style={s.coverWm} />
        <Text style={s.coverEyebrow}>{C.header.title}</Text>
        <Text style={s.coverOrg}>{header.organizationName}</Text>
        <Text style={s.coverPeriod}>{header.periodLabel}</Text>

        <View style={s.coverHero}>
          <Gauge score={model.overallScore} severity={arcSeverity} />
          <View style={{ flex: 1 }}>
            <Text style={s.coverEyebrow}>{C.verdict.title}</Text>
            <Text style={s.verdictTitle}>{model.headline.frame}</Text>
            <Text style={s.verdictBody}>{C.verdict.scoreContext}</Text>
            <Text style={[s.coverFootText, { marginTop: 12 }]}>
              {GH_GROWTH_AI_VISIBILITY.severity_label[model.overallSeverity]} ·{' '}
              {C.verdict.coverageValue(sampledCount, sampledCount)} · {C.verdict.scoreDisclaimer}
            </Text>
          </View>
        </View>

        {show('engineSnapshot') && model.engineSnapshot?.length ? (
          <View style={s.coverEngines}>
            <Text style={s.coverEnginesLbl}>Evaluado en</Text>
            <View style={s.engineStrip}>
              {model.engineSnapshot.map(engine =>
                ENGINE_ASSET[engine.provider] ? (
                  <View key={engine.provider} style={s.engineTile}>
                    <Image src={asset(ENGINE_ASSET[engine.provider] as string)} style={s.engineTileImg} />
                  </View>
                ) : null
              )}
            </View>
          </View>
        ) : null}

        <View style={s.coverFoot}>
          <Text style={s.coverFootText}>Preparado por Efeonce · efeoncepro.com</Text>
        </View>
      </Page>

      {/* ── PAGE 2 · NIVELES + VISIBILIDAD POR MOTOR ── */}
      <Page size='A4' style={s.page}>
        <Text style={s.pageNo}>02</Text>

        {show('levels') ? (
          <View>
            <Text style={s.eyebrow}>Marco de evaluación</Text>
            <Text style={s.sectionTitle}>{C.levelsBand.title}</Text>
            <View style={s.axisBand}>
              <Text style={s.axisBandText}>
                <Text style={s.axisBandStrong}>Percepción</Text> · ¿te mencionan?
              </Text>
              <Text style={s.axisBandText}>
                <Text style={s.axisBandStrong}>Operabilidad</Text> · ¿te pueden usar?
              </Text>
            </View>

            {[
              [model.levels[0], model.levels[1]],
              [model.levels[2], model.levels[3]]
            ].map((pair, idx) => (
              <View key={`lvl-row-${idx}`} style={s.levelsRow}>
                {pair.map(level => {
                  const copy = C.level[level.id]

                  return (
                    <View key={level.id} style={s.level}>
                      <Text style={s.levelOrd}>{copy.ordinal}</Text>
                      <View style={s.levelMain}>
                        <Text style={s.levelLabel}>
                          {copy.label} <Text style={s.levelEn}>· {copy.labelEn}</Text>
                        </Text>
                        <Text style={s.levelQ}>{copy.question}</Text>
                      </View>
                      {level.status === 'coverage' ? (
                        <Text style={s.coverChip}>{C.levelsBand.coverageBadge}</Text>
                      ) : (
                        <Text style={[s.levelScore, { color: toneInk(level.severity) }]}>{level.score}</Text>
                      )}
                    </View>
                  )
                })}
              </View>
            ))}

            {model.levels[4] ? (
              <View style={s.levelFull}>
                <Text style={s.levelOrd}>{C.level[model.levels[4].id].ordinal}</Text>
                <View style={s.levelMain}>
                  <Text style={s.levelLabel}>
                    {C.level[model.levels[4].id].label}{' '}
                    <Text style={s.levelEn}>· {C.level[model.levels[4].id].labelEn}</Text>
                  </Text>
                  <Text style={s.levelQ}>{C.level[model.levels[4].id].question}</Text>
                </View>
                {model.levels[4].status === 'coverage' ? (
                  <Text style={s.coverChip}>{C.levelsBand.coverageBadge}</Text>
                ) : (
                  <Text style={[s.levelScore, { color: toneInk(model.levels[4].severity) }]}>{model.levels[4].score}</Text>
                )}
              </View>
            ) : null}
          </View>
        ) : null}

        {show('engineSnapshot') && model.engineSnapshot?.length ? (
          <View style={s.section}>
            <Text style={s.sectionTitle}>{C.engineSnapshot.title}</Text>
            <Text style={s.helper}>{C.engineSnapshot.helper}</Text>
            {model.engineSnapshot.map(engine => {
              const pct = engine.resolved === 0 ? 0 : Math.round((engine.present / engine.resolved) * 100)

              const name =
                GH_GROWTH_AI_VISIBILITY.provider_label[engine.provider as keyof typeof GH_GROWTH_AI_VISIBILITY.provider_label] ??
                engine.provider

              const barColor = pct >= 70 ? K.success : pct >= 45 ? K.warning : K.error

              return (
                <View key={engine.provider} style={s.engineRow}>
                  <View style={s.engineRowTile}>
                    {ENGINE_ASSET[engine.provider] ? (
                      <Image src={asset(ENGINE_ASSET[engine.provider] as string)} style={s.engineRowImg} />
                    ) : null}
                  </View>
                  <View style={s.engineRowBody}>
                    <View style={s.barHead}>
                      <Text style={s.barName}>{name}</Text>
                      <Text style={[s.barVal, { color: K.muted }]}>{C.engineSnapshot.presentLabel(engine.present, engine.resolved)}</Text>
                    </View>
                    <StaticBar value={pct} color={barColor} />
                  </View>
                </View>
              )
            })}
          </View>
        ) : null}

        <EfeoncePdfFooter generatedAt={null} fixed />
      </Page>

      {/* ── PAGE 3 · BRECHA + DIMENSIONES + SEÑALES ── */}
      <Page size='A4' style={s.page}>
        <Text style={s.pageNo}>03</Text>

        {show('primaryGap') && model.primaryGap ? (
          <View>
            <Text style={s.eyebrow}>Dónde enfocar</Text>
            <Text style={s.sectionTitle}>{C.primaryGap.title}</Text>
            <View style={s.gap}>
              <Text style={s.gapTitle}>{model.primaryGap.title}</Text>
              {model.recommendations[0] ? (
                <Text style={s.gapMotion}>
                  <Text style={s.gapMotionStrong}>{C.recommendedMotion.title}</Text> · {model.recommendations[0].action}
                </Text>
              ) : null}
            </View>
          </View>
        ) : null}

        {show('dimensions') ? (
          <View style={s.section}>
            <Text style={s.sectionTitle}>{C.dimensions.title}</Text>
            {model.dimensions.map(dim => {
              const empty = dim.score === null

              return (
                <View key={dim.key} style={s.dimRow}>
                  <View style={s.barHead}>
                    <Text style={s.barName}>{dim.label}</Text>
                    {empty ? (
                      <Text style={[s.barVal, { color: K.subtle }]}>{C.levelsBand.coverageBadge}</Text>
                    ) : (
                      <View style={s.dimScore}>
                        <View style={[s.dot, { backgroundColor: toneDot(dim.severity) }]} />
                        <Text style={[s.barVal, { color: toneInk(dim.severity) }]}>{dim.score}/100</Text>
                      </View>
                    )}
                  </View>
                  {empty ? <View style={s.track} /> : <StaticBar value={dim.score as number} color={K.accent} />}
                </View>
              )
            })}
          </View>
        ) : null}

        {show('aeoSignals') ? (
          <View style={s.section}>
            <Text style={s.sectionTitle}>{C.signals.title}</Text>
            <Text style={s.helper}>Cómo te citan, con qué tono te mencionan y qué tan arriba apareces en las respuestas.</Text>
            <View style={s.kpis}>
              <View style={s.kpi}>
                <Text style={s.kpiOverline}>{C.signals.citationShareTitle}</Text>
                <Text style={s.kpiValue}>{model.citationInsight.ownDomainShare === null ? '—' : `${model.citationInsight.ownDomainShare}%`}</Text>
                <Text style={s.kpiHint}>
                  {C.signals.citationShareHelper(model.citationInsight.findingsCitingOwnDomain, model.citationInsight.findingsWithCitations)}
                </Text>
              </View>
              <View style={s.kpi}>
                <Text style={s.kpiOverline}>{C.signals.sentimentTitle}</Text>
                <Text style={s.kpiValueSm}>{GH_GROWTH_AI_VISIBILITY.sentiment_net_label[model.sentimentSummary.net]}</Text>
                <Text style={s.kpiHint}>{C.signals.sentimentBasis(model.sentimentSummary.evaluated)}</Text>
              </View>
              <View style={s.kpi}>
                <Text style={s.kpiOverline}>{C.signals.prominenceTitle}</Text>
                <Text style={s.kpiValue}>{model.positionSummary.best === null ? '—' : `#${model.positionSummary.best}`}</Text>
                <Text style={s.kpiHint}>
                  {model.positionSummary.best === null ? C.signals.prominenceHelper : `${C.signals.prominenceBest(model.positionSummary.best)} · ${C.signals.prominenceAverage(model.positionSummary.average ?? model.positionSummary.best)}`}
                </Text>
              </View>
            </View>

            <View style={s.senti}>
              <Text style={s.sentiOverline}>Distribución de sentimiento</Text>
              <View style={s.sentiBar}>
                <View style={{ width: `${sentiPct(sentiment.positive)}%`, backgroundColor: K.success }} />
                <View style={{ width: `${sentiPct(sentiment.neutral)}%`, backgroundColor: K.subtle }} />
                <View style={{ width: `${sentiPct(sentiment.negative)}%`, backgroundColor: K.error }} />
              </View>
              <View style={s.sentiLegend}>
                <Text style={s.sentiText}>
                  <Text>{GH_GROWTH_AI_VISIBILITY.sentiment_net_label.positivo} </Text>
                  <Text style={s.sentiTextB}>{sentiPct(sentiment.positive)}%</Text>
                </Text>
                <Text style={s.sentiText}>
                  <Text>{GH_GROWTH_AI_VISIBILITY.sentiment_net_label.neutral} </Text>
                  <Text style={s.sentiTextB}>{sentiPct(sentiment.neutral)}%</Text>
                </Text>
                <Text style={s.sentiText}>
                  <Text>{GH_GROWTH_AI_VISIBILITY.sentiment_net_label.negativo} </Text>
                  <Text style={s.sentiTextB}>{sentiPct(sentiment.negative)}%</Text>
                </Text>
              </View>
            </View>
          </View>
        ) : null}

        <EfeoncePdfFooter generatedAt={null} fixed />
      </Page>

      {/* ── PAGE 4 · SHARE OF VOICE + RECOMENDACIONES + PROVENIENCIA + CIERRE ── */}
      <Page size='A4' style={s.page}>
        <Text style={s.pageNo}>04</Text>

        {show('competitiveSov') ? (
          <View>
            <Text style={s.eyebrow}>Tu marca frente al mercado</Text>
            <Text style={s.sectionTitle}>{C.sov.title}</Text>
            <Text style={s.helper}>{C.sov.helper}</Text>
            {sovRows.map(row => (
              <View key={row.name} style={s.dimRow}>
                <View style={s.barHead}>
                  <Text style={row.isBrand ? s.barNameBold : s.barName}>{row.name}</Text>
                  <Text style={[s.barVal, { color: row.isBrand ? K.accent : K.muted }]}>
                    {row.mentions} {C.sov.mentionsLabel}
                  </Text>
                </View>
                <StaticBar value={(row.mentions / sovMax) * 100} color={row.isBrand ? K.accent : K.subtle} />
              </View>
            ))}
          </View>
        ) : null}

        {show('recommendations') ? (
          <View style={s.section}>
            <Text style={s.eyebrow}>Plan de acción</Text>
            <Text style={s.sectionTitle}>{C.recommendations.title}</Text>
            {model.recommendations.map((rec, idx) => (
              <View key={rec.gapKey} style={s.rec}>
                <Text style={s.recNum}>{idx + 1}</Text>
                <View style={s.recBody}>
                  <View style={s.recTitleRow}>
                    <Text style={s.recTitle}>{rec.title}</Text>
                    <Text style={[s.sevChip, sevChipStyle(rec.severity)]}>{GH_GROWTH_AI_VISIBILITY.severity_label[rec.severity]}</Text>
                  </View>
                  <Text style={s.recAction}>{rec.action}</Text>
                </View>
              </View>
            ))}
          </View>
        ) : null}

        {show('provenance') ? (
          <View style={[s.section, { marginTop: 22 }]}>
            <Text style={s.sectionTitle}>{C.provenance.title}</Text>
            <View style={s.prov}>
              {[
                { k: C.provenance.asOf, v: model.provenance.asOfDate ?? '—' },
                { k: C.provenance.sampledProviders, v: `${sampledCount}` },
                { k: C.provenance.promptCount, v: `${model.provenance.promptCount}` },
                { k: C.provenance.scoreVersion, v: model.provenance.scoreVersion },
                { k: C.provenance.promptPackVersion, v: model.provenance.promptPackVersion }
              ].map(row => (
                <View key={row.k} style={s.provRow}>
                  <Text style={s.provKey}>{row.k}</Text>
                  <Text style={s.provVal}>{row.v}</Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        {show('disclaimer') ? (
          <View style={s.disc}>
            <Text style={s.discText}>{model.disclaimer}</Text>
          </View>
        ) : null}

        <View style={s.closing}>
          <Image src={asset('branding/logo-full.png')} style={s.closingLogo} />
          <EfeonceSloganPdf fontSize={11} />
          <Text style={s.closingLegal}>{EFEONCE_LEGAL_NAME_FALLBACK} · {EFEONCE_URL}</Text>
        </View>
      </Page>
    </Document>
  )
}

export default AiVisibilityReportPdf
