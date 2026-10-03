import 'server-only'

import { Children, type ReactNode } from 'react'

import { Circle, Document, Image, Link, Page, StyleSheet, Svg, Text, View } from '@react-pdf/renderer'

import { EFEONCE_LEGAL_NAME_FALLBACK, EFEONCE_SOCIAL_LINKS, EFEONCE_URL_HTTPS } from '@/config/efeonce-brand'
import { SEVERITY_ATTENTION_BELOW, SEVERITY_CRITICAL_BELOW } from '@/lib/growth/ai-visibility/report/recommendations'

import type { ReportArtifactModel } from '../model'
import type { ReportHeader } from '../web/AiVisibilityReportArtifact'
import {
  resolveAiVisibilityReportPdfPresentation,
  type AiVisibilityReportPdfPresentationContext,
  type AiVisibilityReportPdfPresentation
} from './report-pdf-presentation'
import {
  Bar,
  BrandImage,
  ChapterFooter,
  ChapterHeader,
  ScoreOrbit,
  SeverityLabel,
  Slogan,
  TrazoIcon
} from './report-pdf-primitives'
import {
  ReportPdfBrand as B,
  ReportPdfColors as K,
  ReportPdfEditorial as E,
  ReportPdfFonts as F,
  pdfType,
  px,
  pdfAlpha
} from './report-pdf-tokens'

/** TASK-1938: six-page presentation adapter of the existing public-safe snapshot.
 * Native text/graphics, official raster assets, and no data access inside the document.
 * Existing attachment disclosure is preserved; the projection never receives raw observations.
 */
const T = E.type.editorial
const L = E.layout

const s = StyleSheet.create({
  page: {
    height: 841.89,
    fontFamily: F.body,
    color: K.ink,
    fontSize: px(T.body.sizePx),
    lineHeight: T.body.lineHeight
  },
  cover: {
    paddingTop: px(B.cover.paddingPx[0]),
    paddingHorizontal: px(B.cover.paddingPx[1]),
    paddingBottom: px(B.cover.paddingPx[2])
  },
  backdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: K.ground },
  masthead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: px(L.cover.headerGapPx)
  },
  period: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: px(L.cover.period.paddingPx[0]),
    paddingHorizontal: px(L.cover.period.paddingPx[1]),
    borderWidth: px(L.cover.period.borderPx),
    borderColor: pdfAlpha(K.softOnDark, L.cover.period.borderOpacity),
    borderRadius: px(B.cover.orbit.boxPx)
  },
  identity: { marginTop: px(L.cover.identity.topGapPx) },
  organization: { ...pdfType(T.organizationProspect), color: K.paper },
  clientIdentity: { flexDirection: 'row', alignItems: 'center', gap: px(L.cover.identity.clientGapPx) },
  date: { ...pdfType(T.body), color: K.softOnDark, marginTop: px(L.cover.dataAsOf.topGapPx) },
  scoreGroup: { alignItems: 'center', marginTop: px(L.cover.scoreGroup.topGapPx), gap: px(L.cover.scoreGroup.gapPx) },
  legend: { flexDirection: 'row', justifyContent: 'center', gap: px(L.cover.legend.gapPx) },
  verdict: { marginTop: px(L.cover.verdict.topGapPx), gap: px(L.cover.verdict.gapPx) },
  verdictTitle: {
    fontFamily: F.display(B.cover.verdict.weight),
    fontSize: px(B.cover.verdict.sizePx),
    color: K.paper,
    lineHeight: L.cover.verdict.lineHeight,
    letterSpacing: px(B.cover.verdict.sizePx) * L.cover.verdict.tracking
  },
  assessment: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: px(L.cover.assessment.gapPx),
    marginTop: px(L.cover.assessment.topGapPx)
  },
  engineDiscs: { flexDirection: 'row', gap: px(L.cover.assessment.enginesGapPx) },
  engineDisc: {
    width: px(B.cover.engineDiscPx),
    height: px(B.cover.engineDiscPx),
    borderRadius: px(B.cover.engineDiscPx),
    backgroundColor: K.paper,
    alignItems: 'center',
    justifyContent: 'center'
  },
  signature: { position: 'absolute', bottom: px(B.cover.paddingPx[2]), left: 0, right: 0, alignItems: 'center' },
  interior: {
    paddingTop: px(B.interior.paddingPx[0]),
    paddingHorizontal: px(B.interior.paddingPx[1]),
    paddingBottom: px(B.interior.paddingPx[2] + L.interior.footer.paddingTopPx + B.interior.footer.centerHeightPx)
  },
  section: { marginTop: px(L.interior.sectionGapPx), gap: px(L.interior.section.gapPx) },
  title: pdfType(T.sectionTitle),
  subtitle: pdfType(T.sectionSubtitle),
  helper: { ...pdfType(T.helper), color: K.muted },
  body: pdfType(T.body),
  caption: { ...pdfType(T.caption), color: K.muted },
  label: { ...pdfType(T.label), textTransform: 'uppercase' },
  row: { flexDirection: 'row', alignItems: 'center', gap: px(L.barRow.gapPx) },
  rowLabel: {
    width: px(L.barRow.labelWidthPx),
    flexDirection: 'row',
    alignItems: 'center',
    gap: px(L.barRow.labelGapPx),
    flexShrink: 0
  },
  rowLabelText: { ...pdfType(T.body), flexShrink: 1 },
  rowValue: { width: px(L.barRow.valueWidthPx), alignItems: 'flex-end', flexShrink: 0, gap: px(L.barRow.valueGapPx) },
  value: pdfType(T.barValue),
  gapCard: {
    paddingVertical: px(L.gapCard.paddingPx[0]),
    paddingHorizontal: px(L.gapCard.paddingPx[1]),
    borderRadius: px(L.gapCard.radiusPx),
    backgroundColor: K.navy,
    gap: px(L.gapCard.gapPx)
  },
  gapHeading: { ...pdfType(T.gapHeadline), color: K.paper },
  recommendation: {
    paddingVertical: px(L.recommendationRow.paddingBlockPx),
    borderBottomWidth: px(L.recommendationRow.rulePx),
    borderBottomColor: K.rule,
    flexDirection: 'row',
    gap: px(L.recommendationRow.gapPx)
  },
  recNumber: { ...pdfType(T.recommendationNumber), width: px(L.recommendationRow.numberWidthPx), flexShrink: 0 },
  recContent: { flexBasis: 0, minWidth: 0, flexGrow: 1, flexShrink: 1, gap: px(L.recommendationRow.detailGapPx) },
  recHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: px(L.recommendationRow.headingGapPx),
    flexWrap: 'wrap'
  },
  quality: { flexDirection: 'row', gap: px(L.qualityCards.gapPx) },
  card: {
    flexGrow: 1,
    flexBasis: 0,
    backgroundColor: K.surface,
    paddingVertical: px(L.qualityCards.paddingPx[0]),
    paddingHorizontal: px(L.qualityCards.paddingPx[1]),
    borderRadius: px(L.qualityCards.radiusPx),
    gap: px(L.qualityCards.contentGapPx)
  },
  cardHeading: { flexDirection: 'row', alignItems: 'center', gap: px(L.qualityCards.labelGapPx) },
  cardLabel: { ...pdfType(T.caption), fontFamily: F.semibold, color: K.muted },
  kpi: pdfType(T.kpiValue),
  level: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: px(L.levelRow.gapPx),
    paddingVertical: px(L.levelRow.paddingBlockPx),
    borderBottomWidth: px(L.levelRow.rulePx),
    borderBottomColor: K.rule
  },
  levelDisc: {
    width: px(L.levelRow.discPx),
    height: px(L.levelRow.discPx),
    borderRadius: px(L.levelRow.discPx),
    backgroundColor: K.surface,
    alignItems: 'center',
    justifyContent: 'center'
  },
  levelContent: { flexBasis: 0, minWidth: 0, flexGrow: 1, flexShrink: 1, gap: px(L.levelRow.textGapPx) },
  levelResult: { flexShrink: 0, flexDirection: 'row', alignItems: 'center', gap: px(L.levelRow.scoreGapPx) },
  provenance: {
    marginTop: px(L.interior.sectionGapPx),
    paddingVertical: px(L.provenance.paddingPx[0]),
    paddingHorizontal: px(L.provenance.paddingPx[1]),
    backgroundColor: K.surface,
    borderRadius: px(L.provenance.radiusPx),
    gap: px(L.provenance.gapPx)
  },
  back: {
    paddingTop: px(L.backCover.paddingPx[0]),
    paddingHorizontal: px(L.backCover.paddingPx[1]),
    paddingBottom: px(L.backCover.paddingPx[2]),
    color: K.paper
  },
  closeContent: { flexGrow: 1, alignItems: 'center', justifyContent: 'center' },
  voice: { alignItems: 'center', gap: px(L.backCover.voiceGapPx), width: '100%' },
  question: { ...pdfType(T.closingQuestion), color: K.paper },
  answer: { ...pdfType(T.closingAnswer), color: K.paper, textAlign: 'center' },
  closeEvidence: {
    ...pdfType(T.closingEvidence),
    color: K.softOnDark,
    textAlign: 'center',
    maxWidth: px(L.backCover.evidenceMaxWidthPx),
    marginTop: px(L.backCover.evidenceTopGapPx)
  },
  action: { marginTop: px(L.backCover.actionTopGapPx), alignItems: 'center', gap: px(L.backCover.agenda.captionGapPx) },
  cta: {
    ...pdfType(T.agenda),
    color: K.ink,
    backgroundColor: K.paper,
    borderRadius: px(B.cover.orbit.boxPx),
    paddingVertical: px(L.backCover.agenda.paddingPx[0]),
    paddingHorizontal: px(L.backCover.agenda.paddingPx[1]),
    textDecoration: 'none'
  },
  clientCards: {
    flexDirection: 'row',
    gap: px(L.backCover.clientCards.gapPx),
    marginTop: px(L.backCover.actionTopGapPx)
  },
  clientCard: {
    borderWidth: px(L.backCover.clientCards.borderPx),
    borderColor: pdfAlpha(K.softOnDark, L.backCover.clientCards.borderOpacity),
    paddingVertical: px(L.backCover.clientCards.paddingPx[0]),
    paddingHorizontal: px(L.backCover.clientCards.paddingPx[1]),
    borderRadius: px(L.backCover.clientCards.radiusPx),
    gap: px(L.backCover.clientCards.textGapPx)
  },
  socials: { flexDirection: 'row', alignItems: 'center', gap: px(L.socials.gapPx), marginTop: px(L.socials.topGapPx) },
  socialDisc: {
    width: px(L.socials.discPx),
    height: px(L.socials.discPx),
    borderRadius: px(L.socials.discPx),
    borderWidth: px(L.socials.borderPx),
    borderColor: pdfAlpha(K.softOnDark, L.socials.borderOpacity),
    alignItems: 'center',
    justifyContent: 'center'
  },
  closeBrand: { marginTop: px(L.backCover.brandTopGapPx) },
  legal: {
    ...pdfType(T.legal),
    position: 'absolute',
    bottom: px(L.backCover.paddingPx[2]),
    left: 0,
    right: 0,
    textAlign: 'center',
    color: K.softOnDark
  }
})

const DIM_GLYPH = {
  ai_visibility: 'ia',
  entity_clarity: 'crm',
  category_ownership: 'objetivo',
  competitive_sov: 'medios',
  citation_quality: 'prensa',
  message_alignment: 'social',
  revenue_intent_coverage: 'revenue'
} as const

const LEVEL_GLYPH = {
  found: 'busqueda',
  readable: 'codigo',
  correct: 'checklist',
  actionable: 'integracion',
  intrinsic: 'objetivo'
} as const

const ENGINE_ID: Record<string, string> = {
  openai: 'chatgpt',
  anthropic: 'claude',
  gemini: 'gemini',
  perplexity: 'perplexity',
  google_ai_overview: 'google-ai-overview'
}

const SOCIAL_ORDER = ['linkedin', 'instagram', 'youtube', 'threads'] as const

const Interior = ({
  p,
  index,
  footerExpanded,
  children
}: {
  p: AiVisibilityReportPdfPresentation
  index: number
  footerExpanded?: boolean
  children: ReactNode
}) => (
  <Page
    size='A4'
    style={[
      s.page,
      s.interior,
      footerExpanded
        ? {
            paddingBottom:
              s.interior.paddingBottom + px(T.caption.sizePx * T.caption.lineHeight * 2 + L.interior.section.gapPx)
          }
        : {}
    ]}
  >
    <ChapterHeader index={index} title={p.copy.chapters[index]} />
    {children}
    <ChapterFooter organization={p.organizationName} period={p.periodLabel} expanded={footerExpanded} />
  </Page>
)

const Section = ({
  title,
  helper,
  children,
  secondary = false
}: {
  title: string
  helper?: string | null
  children?: ReactNode
  secondary?: boolean
}) => {
  const [first, ...rest] = Children.toArray(children)

  return (
    <View style={s.section}>
      <View wrap={false} style={{ gap: px(L.interior.section.gapPx) }}>
        <Text style={secondary ? s.subtitle : s.title}>{title}</Text>
        {helper && <Text style={s.helper}>{helper}</Text>}
        {first}
      </View>
      {rest}
    </View>
  )
}

const EngineDisc = ({ provider, small = false }: { provider: string; small?: boolean }) => (
  <View
    style={[
      s.engineDisc,
      small
        ? {
            width: px(L.barRow.engineDiscPx),
            height: px(L.barRow.engineDiscPx),
            borderWidth: px(B.interior.header.rulePx),
            borderColor: K.rule
          }
        : {}
    ]}
  >
    <BrandImage
      id={`engine-${ENGINE_ID[provider]}`}
      width={px(small ? L.barRow.engineLogoPx : L.cover.assessment.logoPx)}
      height={px(small ? L.barRow.engineLogoPx : L.cover.assessment.logoPx)}
    />
  </View>
)

export interface AiVisibilityReportPdfProps {
  model: ReportArtifactModel
  header: ReportHeader
  context?: AiVisibilityReportPdfPresentationContext
  /** Physical fit prepared from the registered font by the server renderer. */
  layout?: { organizationNameFontSize: number; footerExpanded: boolean }
}

export default function AiVisibilityReportPdf(input: AiVisibilityReportPdfProps) {
  const p = resolveAiVisibilityReportPdfPresentation(input)
  const c = p.copy
  const benchmarkMax = Math.max(1, ...p.benchmark.rows.map(row => row.mentions))
  const sourceMax = Math.max(1, ...p.citationSources.rows.map(source => source.count))
  const verdictSplit = p.overall.verdict.indexOf(',')
  const focus = c.closing.evidenceFocus
  const focusAt = focus ? p.closing.evidence.indexOf(focus) : -1
  const ringSize = T.closingQuestion.sizePx * L.backCover.questionRing.sizeEm

  const ringStroke = Math.max(
    L.backCover.questionRing.minimumStrokePx,
    T.closingQuestion.sizePx * L.backCover.questionRing.strokeEm
  )

  const qualityColours = {
    positive: K.navy,
    neutral: K.dataReference,
    negative: B.palette.severity.light.critical,
    mixed: K.muted
  }

  return (
    <Document
      title={`${c.title} · ${p.organizationName}`}
      author={EFEONCE_LEGAL_NAME_FALLBACK}
      subject={c.prospectLabel}
      language={c.intlLocale}
    >
      <Page size='A4' style={[s.page, s.cover]}>
        <View style={s.backdrop} />
        <View style={s.masthead}>
          <BrandImage id='ai-visibility-report-lockup-negative' height={px(B.cover.lockupHeightPx)} />
          <View style={s.period}>
            <Text style={{ fontFamily: F.medium, color: K.softOnDark, fontSize: px(L.cover.period.sizePx), lineHeight: 1, textAlign: 'center' }}>
              {p.periodLabel}
            </Text>
          </View>
        </View>
        <View style={s.identity}>
          {p.audience === 'client' ? (
            <View style={s.clientIdentity}>
              {p.clientLogo && (
                <Image
                  src={{ data: p.clientLogo.data, format: p.clientLogo.format }}
                  style={{
                    width: px(L.cover.identity.logoBoxPx[0]),
                    height: px(L.cover.identity.logoBoxPx[1]),
                    objectFit: 'contain',
                    ...(p.clientLogo.onDark === false
                      ? {
                          backgroundColor: K.paper,
                          padding: px(L.cover.identity.clientTextGapPx),
                          borderRadius: px(L.cover.identity.clientTextGapPx)
                        }
                      : {})
                  }}
                />
              )}
              <View style={{ flexShrink: 1, gap: px(L.cover.identity.clientTextGapPx) }}>
                <Text style={{ ...s.label, color: K.softOnDark }}>{c.preparedFor}</Text>
                <Text
                  style={{
                    ...pdfType(T.organizationClient),
                    ...(input.layout
                      ? {
                          fontSize: input.layout.organizationNameFontSize,
                          letterSpacing: input.layout.organizationNameFontSize * T.organizationClient.tracking
                        }
                      : {}),
                    color: K.paper
                  }}
                >
                  {p.organizationName}
                </Text>
              </View>
            </View>
          ) : (
            <Text
              style={[
                s.organization,
                input.layout
                  ? {
                      fontSize: input.layout.organizationNameFontSize,
                      letterSpacing: input.layout.organizationNameFontSize * T.organizationProspect.tracking
                    }
                  : {}
              ]}
            >
              {p.organizationName}
            </Text>
          )}
          <Text style={s.date}>
            {c.asOf} {p.asOfLabel}
          </Text>
        </View>
        <View style={s.scoreGroup}>
          <ScoreOrbit
            score={p.overall.score}
            scoreLabel={p.overall.scoreLabel}
            unitLabel={p.overall.unitLabel}
            severity={p.overall.severity}
            severityLabel={p.overall.severityLabel}
          />
          {p.trendState.label && <Text style={{ ...s.body, color: K.softOnDark }}>{p.trendState.label}</Text>}
          <View style={s.legend}>
            <SeverityLabel severity='critico' label={`0–${SEVERITY_CRITICAL_BELOW - 1} ${c.severity.critico}`} dark />
            <SeverityLabel
              severity='atencion'
              label={`${SEVERITY_CRITICAL_BELOW}–${SEVERITY_ATTENTION_BELOW - 1} ${c.severity.atencion}`}
              dark
            />
            <SeverityLabel severity='optimo' label={`${SEVERITY_ATTENTION_BELOW}–100 ${c.severity.optimo}`} dark />
          </View>
        </View>
        <View style={s.verdict}>
          <Text style={{ ...s.label, color: K.softOnDark }}>{c.verdict}</Text>
          <Text style={s.verdictTitle}>
            {verdictSplit < 0 ? (
              p.overall.verdict
            ) : (
              <>
                <Text>{p.overall.verdict.slice(0, verdictSplit + 1)}</Text>
                <Text style={{ fontFamily: F.display(B.cover.verdict.lightWeight) }}>
                  {p.overall.verdict.slice(verdictSplit + 1)}
                </Text>
              </>
            )}
          </Text>
          <View style={s.assessment}>
            <View style={s.engineDiscs}>
              {p.engines
                .filter(engine => engine.status !== 'not_sampled')
                .map(engine => (
                  <EngineDisc key={engine.providerId} provider={engine.providerId} />
                ))}
            </View>
            <View style={{ gap: px(L.cover.assessment.textGapPx), flexBasis: 0, flexGrow: 1 }}>
              <BrandImage id='aeo-lockup-negative' height={px(L.cover.assessment.lockupHeightPx)} />
              <Text style={{ ...s.caption, color: K.softOnDark }}>
                {c.assessmentResult} · {p.coverage.evaluatedLabel} · {p.coverage.basisLabel}
              </Text>
            </View>
          </View>
        </View>
        <View style={s.signature}>
          <BrandImage id='efeonce-logo-negative' width={px(B.cover.signatureWidthPx)} />
        </View>
      </Page>

      <Interior p={p} footerExpanded={input.layout?.footerExpanded} index={0}>
        {p.primaryGap && (
          <Section title={c.primaryGap}>
            {p.primaryGap ? (
              <View wrap={false} style={s.gapCard}>
                <View style={{ ...s.recHeading, justifyContent: 'space-between' }}>
                  <Text style={{ ...s.label, color: K.softOnDark }}>
                    {c.mainGap} · {p.primaryGap.dimensionLabel} {p.primaryGap.scoreLabel}
                  </Text>
                  <SeverityLabel severity={p.primaryGap.severity} label={p.primaryGap.severityLabel} dark />
                </View>
                <Text style={s.gapHeading}>{p.primaryGap.finding}</Text>
                {p.primaryGap.evidence && (
                  <Text style={{ ...pdfType(T.evidence), color: K.softOnDark }}>{p.primaryGap.evidence}</Text>
                )}
              </View>
            ) : (
              <Text style={s.helper}>{c.noData}</Text>
            )}
          </Section>
        )}
        <Section title={c.priorityPlan} helper={c.priorityHelper} secondary>
          {p.priorityPlan.map((rec, index) => (
            <View key={rec.gapKey} wrap={false} style={s.recommendation}>
              <Text style={s.recNumber}>{index + 1}</Text>
              <View style={s.recContent}>
                <View style={s.recHeading}>
                  <Text style={pdfType(T.emphasis)}>{rec.title}</Text>
                  <SeverityLabel severity={rec.severity} label={rec.severityLabel} chip />
                </View>
                <Text style={{ ...s.body, color: K.muted }}>{rec.action}</Text>
                <View
                  style={{ flexDirection: 'row', gap: px(L.recommendationRow.movementGapPx), alignItems: 'center' }}
                >
                  <TrazoIcon glyph='medicion' />
                  <Text style={{ ...pdfType(T.movement), flexShrink: 1 }}>{rec.basisLabel}</Text>
                </View>
              </View>
            </View>
          ))}
          {p.priorityPlan.length === 0 && <Text style={s.helper}>{c.noData}</Text>}
        </Section>
      </Interior>

      <Interior p={p} footerExpanded={input.layout?.footerExpanded} index={1}>
        <Section title={c.dimensionsTitle} helper={c.dimensionsHelper}>
          <View style={{ gap: px(L.interior.rowsGapPx.dimensions), marginTop: px(L.interior.chapterContentGapPx.why) }}>
            {p.dimensions.map(dim => (
              <View key={dim.key} wrap={false} style={s.row}>
                <View style={s.rowLabel}>
                  <TrazoIcon glyph={DIM_GLYPH[dim.key]} />
                  <Text style={s.rowLabelText}>
                    {dim.label}
                    <Text style={s.caption}> · {dim.weightLabel}</Text>
                  </Text>
                </View>
                <Bar value={dim.score} />
                <View style={s.rowValue}>
                  <Text style={s.value}>{dim.scoreLabel}</Text>
                  <SeverityLabel severity={dim.severity} label={dim.severityLabel} />
                </View>
              </View>
            ))}
          </View>
        </Section>
        <Section title={c.qualityTitle} helper={c.qualityHelper} secondary>
          <View style={s.quality} wrap={false}>
            <View style={s.card}>
              <View style={s.cardHeading}>
                <TrazoIcon glyph='prensa' />
                <Text style={s.cardLabel}>{c.citationShare}</Text>
              </View>
              <Text style={s.kpi}>{p.quality.citationShareLabel}</Text>
              <Text style={s.caption}>{p.quality.citationBasis}</Text>
            </View>
            <View style={s.card}>
              <View style={s.cardHeading}>
                <TrazoIcon glyph='social' />
                <Text style={s.cardLabel}>{c.sentiment}</Text>
              </View>
              <Text style={s.kpi}>{p.quality.sentiment.label}</Text>
              {p.quality.sentiment.total > 0 && (
                <View
                  style={{
                    flexDirection: 'row',
                    height: px(L.qualityCards.sentimentBarPx),
                    borderRadius: px(L.qualityCards.sentimentBarPx),
                    overflow: 'hidden'
                  }}
                >
                  {p.quality.sentiment.segments
                    .filter(segment => segment.count > 0)
                    .map(segment => (
                      <View
                        key={segment.key}
                        style={{
                          height: '100%',
                          width: `${segment.percent}%`,
                          backgroundColor: qualityColours[segment.key]
                        }}
                      />
                    ))}
                </View>
              )}
              <Text style={s.caption}>
                {p.quality.sentiment.total === 0
                  ? c.noData
                  : p.quality.sentiment.segments
                      .filter(segment => segment.count > 0)
                      .map(segment => `${segment.label} ${segment.percentLabel}`)
                      .join(' · ')}
              </Text>
            </View>
            <View style={s.card}>
              <View style={s.cardHeading}>
                <TrazoIcon glyph='medicion' />
                <Text style={s.cardLabel}>{c.prominence}</Text>
              </View>
              <Text style={s.kpi}>{p.quality.prominence.bestLabel}</Text>
              <Text style={s.caption}>{p.quality.prominence.basisLabel}</Text>
            </View>
          </View>
        </Section>
      </Interior>

      <Interior p={p} footerExpanded={input.layout?.footerExpanded} index={2}>
        <Section title={c.levelsTitle}>
          <View style={{ flexDirection: 'row', gap: px(L.axes.gapPx) }}>
            <Text style={s.caption}>
              <Text style={{ fontFamily: F.semibold }}>{c.perception}</Text> · {c.perceptionLegend}
            </Text>
            <Text style={s.caption}>
              <Text style={{ fontFamily: F.semibold }}>{c.operability}</Text> · {c.operabilityLegend}
            </Text>
          </View>
          <View>
            {p.levels.map(level => (
              <View key={level.id} wrap={false} style={s.level}>
                <View style={s.levelDisc}>
                  <TrazoIcon glyph={LEVEL_GLYPH[level.id]} size={22} />
                </View>
                <View style={s.levelContent}>
                  <Text style={{ ...s.caption, fontFamily: F.semibold }}>{level.axisLabel}</Text>
                  <Text style={pdfType(T.levelName)}>
                    {level.label.split(' · ')[0]}
                    {level.label.includes(' · ') && (
                      <Text style={{ fontFamily: F.body }}>
                        {' · ' + level.label.split(' · ').slice(1).join(' · ')}
                      </Text>
                    )}
                  </Text>
                  <Text style={{ ...pdfType(T.levelPrompt), color: K.muted }}>{level.question}</Text>
                </View>
                <View style={s.levelResult}>
                  {!(level.score === null && level.axis === 'agentic') && (
                    <Text style={{ ...pdfType(T.levelScore), color: level.score === null ? K.muted : K.ink }}>
                      {level.score === null ? '—' : String(level.score)}
                    </Text>
                  )}
                  <SeverityLabel severity={level.severity} label={level.statusLabel} chip />
                </View>
              </View>
            ))}
          </View>
        </Section>
        <Section title={c.enginesTitle} helper={p.engineTakeaway} secondary>
          <View style={{ gap: px(L.interior.rowsGapPx.engines) }}>
            {p.engines.map(engine => (
              <View key={engine.providerId} wrap={false} style={s.row}>
                <View style={s.rowLabel}>
                  <EngineDisc provider={engine.providerId} small />
                  <Text style={s.rowLabelText}>{engine.label}</Text>
                </View>
                <Bar value={engine.mentionRate} />
                <View style={s.rowValue}>
                  <Text style={s.value}>{engine.percentLabel}</Text>
                  <SeverityLabel severity={engine.severity} label={engine.fractionLabel} />
                </View>
              </View>
            ))}
          </View>
        </Section>
      </Interior>

      <Interior p={p} footerExpanded={input.layout?.footerExpanded} index={3}>
        {p.benchmark.rows.length > 0 && (
          <Section title={c.benchmarkTitle} helper={p.benchmark.basisLabel}>
            <View style={{ gap: px(L.interior.rowsGapPx.market) }}>
              {p.benchmark.rows.map(row => (
                <View key={row.name} wrap={false} style={s.row}>
                  <View style={s.rowLabel}>
                    <Text style={{ ...s.rowLabelText, fontFamily: row.isBrand ? F.semibold : F.body }}>{row.name}</Text>
                  </View>
                  <Bar value={(row.mentions / benchmarkMax) * 100} muted={!row.isBrand} />
                  <View style={s.rowValue}>
                    <Text style={s.value}>{row.percentLabel}</Text>
                    <Text style={s.caption}>{row.mentionsLabel}</Text>
                  </View>
                </View>
              ))}
            </View>
          </Section>
        )}
        {p.citationSources.rows.length > 0 && (
          <Section title={c.sourcesTitle} helper={p.citationSources.basisLabel} secondary>
            <View style={{ gap: px(L.interior.rowsGapPx.market) }}>
              {p.citationSources.rows.map(source => (
                <View key={source.domain} wrap={false} style={s.row}>
                  <View style={s.rowLabel}>
                    <Text
                      style={{
                        ...s.rowLabelText,
                        fontFamily: source.classification === 'own_domain' ? F.semibold : F.body
                      }}
                    >
                      {source.domain}
                    </Text>
                  </View>
                  <Bar value={(source.count / sourceMax) * 100} muted={source.classification !== 'own_domain'} />
                  <View style={s.rowValue}>
                    <Text style={s.value}>{source.countLabel}</Text>
                    <Text style={s.caption}>{source.classificationLabel}</Text>
                  </View>
                </View>
              ))}
              {p.citationSources.rows.length === 0 && <Text style={s.helper}>{c.noData}</Text>}
            </View>
          </Section>
        )}
        <View wrap={false} style={s.provenance}>
          <Text style={pdfType(T.cardLabel)}>{c.provenanceTitle}</Text>
          <View style={{ flexDirection: 'row', gap: px(L.provenance.columnGapPx) }}>
            {[
              { glyph: 'calendario', label: c.asOf, value: p.provenance.asOfLabel },
              { glyph: 'composer', label: c.questions, value: p.provenance.promptCountLabel },
              { glyph: 'medicion', label: c.scoreVersion, value: p.provenance.scoreVersionLabel },
              { glyph: 'contrato', label: c.questionPack, value: p.provenance.promptPackVersionLabel }
            ].map(item => (
              <View
                key={item.glyph}
                style={{ flexDirection: 'row', gap: px(L.provenance.itemGapPx), flexBasis: 0, flexGrow: 1 }}
              >
                <TrazoIcon glyph={item.glyph} />
                <View style={{ flexShrink: 1, gap: px(L.provenance.textGapPx) }}>
                  <Text style={s.caption}>{item.label}</Text>
                  <Text style={{ ...s.body, fontFamily: F.semibold }}>{item.value}</Text>
                </View>
              </View>
            ))}
          </View>
          <Text style={s.caption}>{p.disclaimer}</Text>
        </View>
      </Interior>

      <Page size='A4' style={[s.page, s.back]}>
        <View style={s.backdrop} />
        <View style={s.closeContent}>
          <View style={s.voice}>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: px(T.closingQuestion.sizePx * L.backCover.questionRing.gapEm)
              }}
            >
              <Svg
                width={px(T.closingQuestion.sizePx * L.backCover.questionRing.sizeEm)}
                height={px(T.closingQuestion.sizePx * L.backCover.questionRing.sizeEm)}
                viewBox={`0 0 ${ringSize} ${ringSize}`}
              >
                <Circle
                  cx={ringSize / 2}
                  cy={ringSize / 2}
                  r={(ringSize - ringStroke) / 2}
                  fill='none'
                  stroke={K.accent}
                  strokeWidth={ringStroke}
                />
              </Svg>
              <Text style={s.question}>{p.closing.question}</Text>
            </View>
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'center',
                alignItems: 'baseline',
                gap: px(T.closingAnswer.sizePx * L.backCover.answerSphere.gapEm)
              }}
            >
              <Text style={s.answer}>{p.closing.answer}</Text>
              <View
                style={{
                  width: px(T.closingAnswer.sizePx * L.backCover.answerSphere.sizeEm),
                  height: px(T.closingAnswer.sizePx * L.backCover.answerSphere.sizeEm),
                  borderRadius: px(T.closingAnswer.sizePx),
                  backgroundColor: K.accent
                }}
              />
            </View>
            <Text style={s.closeEvidence}>
              {focusAt < 0 || !focus ? (
                p.closing.evidence
              ) : (
                <>
                  {p.closing.evidence.slice(0, focusAt)}
                  <Text style={{ fontFamily: F.semibold }}>{focus}</Text>
                  {p.closing.evidence.slice(focusAt + focus.length)}
                </>
              )}
            </Text>
          </View>
          {p.closing.ctaUrl && (
            <View style={s.action}>
              <Link src={p.closing.ctaUrl} style={s.cta}>
                {p.closing.ctaLabel}
                <Text style={{ fontFamily: F.display() }}> →</Text>
              </Link>
              <Text style={{ ...s.caption, color: K.softOnDark }}>{c.closing.chooseTime}</Text>
            </View>
          )}
          {p.closing.owner && (
            <View style={s.clientCards}>
              <View style={s.clientCard}>
                <Text style={{ ...s.label, color: K.softOnDark }}>{c.closing.accountOwner}</Text>
                <Text style={{ ...s.body, fontFamily: F.semibold, color: K.paper }}>{p.closing.owner.name}</Text>
                <Text style={{ ...s.body, color: K.softOnDark }}>{p.closing.owner.role}</Text>
                <Link
                  src={`mailto:${p.closing.owner.email}`}
                  style={{ ...s.body, color: K.softOnDark, textDecoration: 'none' }}
                >
                  {p.closing.owner.email}
                </Link>
              </View>
              {p.closing.nextReportDateLabel && (
                <View style={s.clientCard}>
                  <Text style={{ ...s.label, color: K.softOnDark }}>{p.closing.nextReportLabel}</Text>
                  <Text style={{ ...s.body, color: K.paper }}>{p.closing.nextReportDateLabel}</Text>
                </View>
              )}
            </View>
          )}
          {p.closing.showSocial && (
            <View style={s.socials}>
              <Link src={EFEONCE_URL_HTTPS} style={{ marginRight: px(L.socials.bubbleAfterGapPx) }}>
                <BrandImage
                  id='url-bubble-baked-dark'
                  width={px(L.socials.bubblePx[0])}
                  height={px(L.socials.bubblePx[1])}
                />
              </Link>
              {SOCIAL_ORDER.map(channel => {
                const social = EFEONCE_SOCIAL_LINKS.find(item => item.channel === channel)!

                return (
                  <Link src={social.url} key={channel}>
                    <BrandImage id={`social-${channel}`} width={px(L.socials.discPx)} height={px(L.socials.discPx)} />
                  </Link>
                )
              })}
            </View>
          )}
          <View style={s.closeBrand}>
            <Slogan />
          </View>
        </View>
        <Text style={s.legal}>{EFEONCE_LEGAL_NAME_FALLBACK}</Text>
      </Page>
    </Document>
  )
}
