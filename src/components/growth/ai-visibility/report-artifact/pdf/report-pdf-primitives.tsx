import 'server-only'

import { Circle, Defs, Image, Line, Link, Path, RadialGradient, Stop, Svg, Text, View } from '@react-pdf/renderer'
import { aiVisibilityReportOrbitGeometry } from '@efeoncepro/axis-ui-contracts'

import { AI_VISIBILITY_PDF_ASSET_PATHS } from './report-pdf-asset-paths.generated'

import assetManifest from '../../../../../../public/branding/pdf/ai-visibility-assets.manifest.json'
import { EFEONCE_URL_HTTPS } from '@/config/efeonce-brand'
import type { GraderReportSeverity } from '@/lib/growth/ai-visibility/report/contracts'

import {
  ReportPdfBrand as B,
  ReportPdfColors as K,
  ReportPdfEditorial as E,
  ReportPdfFonts as F,
  ReportPdfSeverityColors,
  ReportPdfSlogan,
  pdfType,
  px,
  pdfAlpha
} from './report-pdf-tokens'

const severityKey = { critico: 'critical', atencion: 'attention', optimo: 'optimal' } as const

export const severityColor = (severity: GraderReportSeverity, dark = false): string =>
  severity === 'sin_dato' ? K.dataReference : ReportPdfSeverityColors[dark ? 'dark' : 'light'][severityKey[severity]]

export const pdfAsset = (id: string) => {
  const entry = assetManifest.outputs.find(item => item.file === `ai-visibility-${id}.png`)

  if (!entry) throw new Error(`ai_visibility_pdf_asset_missing:${id}`)

  return { path: AI_VISIBILITY_PDF_ASSET_PATHS[id], ratio: entry.width / entry.height }
}

export const BrandImage = ({ id, height, width }: { id: string; height?: number; width?: number }) => {
  const asset = pdfAsset(id)
  const w = width ?? (height as number) * asset.ratio
  const h = height ?? (width as number) / asset.ratio

  return <Image src={asset.path} style={{ width: w, height: h, objectFit: 'contain' }} />
}

export const TrazoIcon = ({ glyph, size = 18 }: { glyph: string; size?: 18 | 22 }) => (
  <BrandImage id={`icon-${glyph}-${size}`} width={px(size)} height={px(size)} />
)

export const SeverityLabel = ({
  severity,
  label,
  dark = false,
  chip = false
}: {
  severity: GraderReportSeverity
  label: string
  dark?: boolean
  chip?: boolean
}) => {
  const token = dark ? E.layout.severityChip.dark : E.layout.severityChip.inline

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: px(token.gapPx),
        ...(chip
          ? {
              paddingVertical: px(E.layout.severityChip.light.paddingPx[0]),
              paddingHorizontal: px(E.layout.severityChip.light.paddingPx[1]),
              backgroundColor: K.surface,
              borderRadius: px(B.cover.orbit.boxPx)
            }
          : {})
      }}
    >
      <View
        style={{
          width: px(token.dotPx),
          height: px(token.dotPx),
          borderRadius: px(token.dotPx),
          backgroundColor: severityColor(severity, dark)
        }}
      />
      <Text
        style={{ fontFamily: dark ? F.semibold : F.body, fontSize: px(token.sizePx), color: dark ? K.paper : K.muted }}
      >
        {label}
      </Text>
    </View>
  )
}

export const ScoreOrbit = ({
  score,
  scoreLabel,
  unitLabel,
  severity,
  severityLabel
}: {
  score: number | null
  scoreLabel: string
  unitLabel: string | null
  severity: GraderReportSeverity
  severityLabel: string
}) => {
  const o = B.cover.orbit
  const center = o.boxPx / 2
  const geometry = aiVisibilityReportOrbitGeometry(score)
  const color = severityColor(severity, true)

  const point = (deg: number) => [
    center + o.radiusPx * Math.sin((deg * Math.PI) / 180),
    center - o.radiusPx * Math.cos((deg * Math.PI) / 180)
  ]

  const end = point(geometry?.sphereDeg ?? 0)
  const start = point(geometry?.trail.startDeg ?? 0)
  const chip = E.layout.severityChip.dark

  return (
    <View style={{ width: px(o.boxPx), height: px(o.boxPx), position: 'relative' }}>
      <Svg width={px(o.boxPx)} height={px(o.boxPx)} viewBox={`0 0 ${o.boxPx} ${o.boxPx}`}>
        <Circle
          cx={center}
          cy={center}
          r={o.radiusPx}
          fill='none'
          stroke={K.softOnDark}
          strokeOpacity={o.ring.opacity}
          strokeWidth={o.ring.strokePx}
        />
        <Line
          x1={center}
          x2={center}
          y1={center - o.radiusPx - o.originMark.lengthPx / 2}
          y2={center - o.radiusPx + o.originMark.lengthPx / 2}
          stroke={K.softOnDark}
          strokeOpacity={o.originMark.opacity}
          strokeWidth={o.originMark.strokePx}
          strokeLinecap='round'
        />
        {geometry && (
          <>
            {geometry.sphereDeg >= 360 ? (
              <Circle
                cx={center}
                cy={center}
                r={o.radiusPx}
                fill='none'
                stroke={color}
                strokeWidth={o.travelled.strokePx}
                strokeOpacity={o.travelled.opacity}
              />
            ) : (
              geometry.sphereDeg > 0 && (
                <Path
                  d={`M ${center} ${center - o.radiusPx} A ${o.radiusPx} ${o.radiusPx} 0 ${geometry.sphereDeg > 180 ? 1 : 0} 1 ${end[0]} ${end[1]}`}
                  fill='none'
                  stroke={color}
                  strokeOpacity={o.travelled.opacity}
                  strokeWidth={o.travelled.strokePx}
                  strokeLinecap='round'
                />
              )
            )}
            {geometry.trail.sweepDeg > 0 && (
              <Path
                d={`M ${start[0]} ${start[1]} A ${o.radiusPx} ${o.radiusPx} 0 0 1 ${end[0]} ${end[1]}`}
                fill='none'
                stroke={color}
                strokeWidth={o.trail.strokePx}
                strokeLinecap='round'
              />
            )}
            <Defs>
              <RadialGradient id='score-glow'>
                <Stop offset='0' stopColor={color} stopOpacity={o.sphereGlow.opacity} />
                <Stop offset='1' stopColor={color} stopOpacity={0} />
              </RadialGradient>
            </Defs>
            <Circle cx={end[0]} cy={end[1]} r={o.sphereGlow.radiusPx} fill='url(#score-glow)' />
            <Circle cx={end[0]} cy={end[1]} r={o.sphere.radiusPx} fill={color} />
          </>
        )}
      </Svg>
      <View
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          bottom: 0,
          right: 0,
          alignItems: 'center',
          justifyContent: 'center',
          gap: px(E.layout.cover.scoreGroup.textGapPx)
        }}
      >
        <Text
          style={{
            fontFamily: F.display(B.type.figure.weight),
            fontSize: px(B.type.figure.sizePx),
            letterSpacing: px(B.type.figure.sizePx) * B.type.figure.tracking,
            lineHeight: 1,
            color: K.paper
          }}
        >
          {scoreLabel}
        </Text>
        {unitLabel && (
          <Text
            style={{ fontFamily: F.medium, fontSize: px(E.layout.cover.scoreGroup.outOfSizePx), color: K.softOnDark }}
          >
            {unitLabel}
          </Text>
        )}
        <View
          style={{
            marginTop: px(E.layout.cover.scoreGroup.severityTopGapPx),
            paddingVertical: px(chip.paddingPx[0]),
            paddingHorizontal: px(chip.paddingPx[1]),
            borderRadius: px(o.boxPx),
            borderWidth: px(chip.borderPx),
            borderColor: pdfAlpha(K.softOnDark, chip.borderOpacity)
          }}
        >
          <SeverityLabel severity={severity} label={severityLabel} dark />
        </View>
      </View>
    </View>
  )
}

export const Bar = ({ value, muted = false }: { value: number | null; muted?: boolean }) => (
  <View
    style={{
      height: px(E.layout.barRow.heightPx),
      flexGrow: 1,
      borderRadius: px(E.layout.barRow.heightPx),
      backgroundColor: K.barTrack,
      overflow: 'hidden'
    }}
  >
    {value !== null && value > 0 && (
      <View
        style={{
          height: '100%',
          width: `${Math.max(0, Math.min(100, value))}%`,
          borderRadius: px(E.layout.barRow.heightPx),
          backgroundColor: muted ? K.dataReference : K.navy
        }}
      />
    )}
  </View>
)

export const ChapterHeader = ({ index, title }: { index: number; title: string }) => {
  const h = B.interior.header
  const l = E.layout.interior.header

  return (
    <View
      fixed
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingBottom: px(l.paddingBottomPx),
        borderBottomWidth: px(h.rulePx),
        borderBottomColor: K.rule
      }}
    >
      <BrandImage id='ai-visibility-report-lockup-positive' height={px(h.lockupHeightPx)} />
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: px(l.chapterGapPx) }}>
        <View style={{ flexDirection: 'row', gap: px(l.glyphGapPx), alignItems: 'center' }}>
          <TrazoIcon glyph={B.chapters[index].glyph} />
          <Text style={{ ...pdfType(E.type.editorial.label), color: K.ink, textTransform: 'uppercase' }}>{title}</Text>
        </View>
        <View style={{ flexDirection: 'row', gap: px(h.progress.gapPx) }}>
          {B.chapters.map((c, i) => (
            <View
              key={c.key}
              style={{
                width: px(h.progress.widthPx),
                height: px(h.progress.heightPx),
                borderRadius: px(h.progress.radiusPx),
                backgroundColor: i === index ? K.accent : i < index ? K.doneOnLight : K.rule
              }}
            />
          ))}
        </View>
      </View>
    </View>
  )
}

/** Dynamic View nodes carry totalPages at the final pagination pass; the installed
 * renderer types only expose it for Text. Keep it optional during the first pass. */
const folioLabel = ({ pageNumber, ...pagination }: { pageNumber: number; totalPages?: number }) =>
  `${String(pageNumber).padStart(2, '0')} / ${pagination.totalPages === undefined ? '—' : String(pagination.totalPages).padStart(2, '0')}`

export const ChapterFooter = ({
  organization,
  period,
  expanded = false
}: {
  organization: string
  period: string
  expanded?: boolean
}) => {
  const caption = E.type.editorial.caption
  const extra = expanded ? px(caption.sizePx * caption.lineHeight * 2 + E.layout.interior.section.gapPx) : 0
  const height = px(E.layout.interior.footer.paddingTopPx + B.interior.footer.centerHeightPx * 2) + extra

  return (
    <View
      fixed
      style={{
        position: 'absolute',
        height,
        top: 841.89 - px(B.interior.paddingPx[2]) - height,
        left: px(B.interior.paddingPx[3]),
        right: px(B.interior.paddingPx[1]),
        paddingTop: px(E.layout.interior.footer.paddingTopPx),
        borderTopWidth: px(B.interior.footer.rulePx),
        borderTopColor: K.rule,
        justifyContent: 'center',
        gap: px(E.layout.interior.section.gapPx)
      }}
    >
      {expanded && <Text style={{ ...pdfType(caption), color: K.muted }}>{organization}</Text>}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text
          style={{
            ...pdfType(caption),
            color: K.muted,
            width: '33%',
            paddingRight: px(E.layout.interior.footer.gapPx)
          }}
        >
          {expanded ? period : `${organization} · ${period}`}
        </Text>
        <View style={{ width: '34%', alignItems: 'center' }}>
          <Link src={EFEONCE_URL_HTTPS}>
            <BrandImage id='url-bubble-baked-light' height={px(B.interior.footer.centerHeightPx)} />
          </Link>
        </View>
        <View
          style={{
            width: '33%',
            alignItems: 'flex-end',
            fontFamily: F.display(B.type.folio.weight),
            fontSize: px(B.type.folio.sizePx),
            color: K.ink
          }}
          render={pagination => (
            <Text
              style={{
                fontFamily: F.display(B.type.folio.weight),
                fontSize: px(B.type.folio.sizePx),
                lineHeight: 1.4,
                color: K.ink
              }}
            >
              {folioLabel(pagination)}
            </Text>
          )}
        />
      </View>
    </View>
  )
}

export const Slogan = () => (
  <View style={{ alignItems: 'center', gap: ReportPdfSlogan.gap }}>
    <BrandImage id='efeonce-logo-negative' width={ReportPdfSlogan.logoWidth} />
    <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: ReportPdfSlogan.fontSize * 0.25 }}>
      <Text style={{ fontSize: ReportPdfSlogan.fontSize, color: K.paper, fontFamily: F.sloganLead }}>
        {ReportPdfSlogan.lead.split(' ')[0]}
      </Text>
      <Text style={{ fontSize: ReportPdfSlogan.fontSize, color: K.paper, fontFamily: F.sloganSpace }}>
        {ReportPdfSlogan.lead.split(' ').slice(1).join(' ')}
      </Text>
      <Text style={{ fontSize: ReportPdfSlogan.fontSize, color: K.paper, fontFamily: F.sloganWord }}>
        {ReportPdfSlogan.word}
      </Text>
    </View>
  </View>
)
