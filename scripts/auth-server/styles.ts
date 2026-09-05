/** Build-time styles from canonical portable tokens; runtime consumes the generated CSS artifact. */
import { efeonceTokens } from '@efeoncepro/axis-tokens'

import { axisMain, axisNeutral } from '../../src/@core/theme/axis-tokens'
import spacing from '../../src/@core/theme/spacing'
import { typographyScale, fontWeights } from '../../src/components/theme/typography-tokens'

export function createAuthServerStyles(): string {
  const n = axisNeutral.light
  const r = efeonceTokens.radius
  const s = spacing.spacing
  const body = typographyScale.bodyLg
  const title = typographyScale.headlineLg
  const label = typographyScale.labelMd

  return `
@font-face { font-family: 'Geist'; src:url('/fonts/Geist-Regular.ttf') format('truetype'); font-weight:400; font-display:swap; }
@font-face { font-family: 'Geist'; src:url('/fonts/Geist-SemiBold.ttf') format('truetype'); font-weight:600; font-display:swap; }
@font-face { font-family: 'Poppins'; src:url('/fonts/Poppins-Bold.ttf') format('truetype'); font-weight:700; font-display:swap; }
:root { --font-geist:'Geist'; --font-poppins:'Poppins'; color-scheme:light; }
* { box-sizing:border-box; }
body { margin:0; color:${n.textPrimary}; background:${n.bodyBg}; font-family:${body.fontFamily}; font-size:${body.fontSize}; line-height:${body.lineHeight}; }
a { color:${axisMain.primary}; text-underline-offset:.2em; }
p,h1,h2,ul { margin:0; }
button,input,a { -webkit-tap-highlight-color:transparent; }
button,input { font:inherit; }
.id-page { width:min(100%,${s(152)}); margin-inline:auto; padding:${s(12)} ${s(6)}; }
.id-page[data-state="login"] { max-width:${s(136)}; }
.id-brand { display:flex; align-items:center; justify-content:center; gap:${s(3)}; margin-block-end:${s(8)}; font-weight:${fontWeights.semibold}; }
.id-brand img,.id-brand svg { width:${s(10)}; height:${s(8)}; object-fit:contain; }
.id-context { text-align:center; margin-block-end:${s(6)}; overflow-wrap:anywhere; }
.id-context strong { display:block; margin-block-start:${s(1)}; font-weight:${fontWeights.semibold}; }
.id-surface { background:${n.paper}; border:1px solid ${n.divider}; border-radius:${r.lg}; padding:${s(8)}; }
.id-title { font-family:${title.fontFamily}; font-size:${title.fontSize}; font-weight:${title.fontWeight}; line-height:${title.lineHeight}; margin-block-end:${s(3)}; letter-spacing:-.02em; }
.id-intro { color:${n.textSecondary}; margin-block-end:${s(7)}; }
.id-section + .id-section { border-block-start:1px solid ${n.divider}; padding-block-start:${s(6)}; margin-block-start:${s(6)}; }
.id-section h2 { font-size:${typographyScale.bodyLg.fontSize}; font-weight:${fontWeights.semibold}; margin-block-end:${s(2)}; }
.id-section p { margin-block-end:${s(4)}; }
.id-primary,.id-secondary { display:inline-flex; align-items:center; justify-content:center; gap:${s(2)}; min-height:${s(11)}; padding:${s(3)} ${s(4)}; border-radius:${r.md}; text-decoration:none; font-size:${label.fontSize}; line-height:${label.lineHeight}; font-weight:${label.fontWeight}; cursor:pointer; text-align:center; overflow-wrap:anywhere; }
.id-primary { background:${axisMain.primary}; color:${n.paper}; border:1px solid ${axisMain.primary}; }
.id-secondary { background:${n.paper}; color:${n.textPrimary}; border:1px solid ${n.divider}; }
.id-section > .id-primary,.id-section > .id-secondary,form .id-secondary { width:100%; }
.id-field { display:flex; flex-direction:column; gap:${s(2)}; margin-block:${s(4)}; font-size:${label.fontSize}; font-weight:${label.fontWeight}; }
.id-field .id-muted { font-weight:${fontWeights.regular}; margin-block-end:0; }
form .id-actions { margin-block-start:${s(4)}; }
.id-field input { width:100%; min-width:0; min-height:${s(11)}; padding:${s(3)}; border:1px solid ${n.divider}; border-radius:${r.md}; background:${n.paper}; color:${n.textPrimary}; font-weight:${fontWeights.regular}; }
.id-actions { display:flex; gap:${s(3)}; margin-block-start:${s(7)}; }
.id-actions > * { flex:1; }
.id-muted,.id-footer,.id-preview-note { font-size:${typographyScale.bodyMd.fontSize}; color:${n.textSecondary}; }
.id-preview-note { margin-block-end:${s(5)}; text-align:center; }
.id-footer { text-align:center; margin-block-start:${s(6)}; }
.id-org { margin-block:${s(5)}; padding-block:${s(4)}; border-block-start:1px solid ${n.divider}; overflow-wrap:anywhere; }
.id-org p { margin-block-end:0; }
.id-org + .id-section { padding-block-start:${s(4)}; margin-block-start:${s(4)}; }
.id-permissions { list-style:none; padding:0; }
.id-scope { padding-block:${s(4)}; }
.id-scope + .id-scope { border-block-start:1px solid ${n.divider}; }
.id-scope-heading { display:flex; align-items:baseline; gap:${s(2)}; flex-wrap:wrap; }
.id-scope-heading h3 { margin:0; font-size:${typographyScale.bodyLg.fontSize}; font-weight:${fontWeights.semibold}; }
.id-divider { margin-block:${s(4)}; text-align:center; }
.id-scope-details { margin-block-start:${s(4)}; font-size:${typographyScale.bodyMd.fontSize}; overflow-wrap:anywhere; }
.id-scope-details summary { cursor:pointer; min-height:${s(8)}; }
.id-scope p { margin-block-start:${s(2)}; color:${n.textSecondary}; }
.id-scope-kind { display:inline-block; font-size:${typographyScale.bodySm.fontSize}; font-weight:${fontWeights.semibold}; margin-inline-start:${s(2)}; }
:focus-visible { outline:2px solid ${axisMain.primary}; outline-offset:3px; }
.id-surface > p { margin-block-end:${s(4)}; }
.id-surface ul { list-style:none; padding:0; }
.id-surface li { overflow-wrap:anywhere; }
.muted { color:${n.textSecondary}; font-size:${typographyScale.bodyMd.fontSize}; }
.code,.id-surface code { font-family:inherit; font-size:${typographyScale.bodySm.fontSize}; color:${n.textSecondary}; overflow-wrap:anywhere; }
.actions { display:flex; gap:${s(3)}; margin-block:${s(6)}; }
.actions > * { flex:1; }
button.primary,button.secondary { min-height:${s(11)}; padding:${s(3)} ${s(4)}; border-radius:${r.md}; font-size:${label.fontSize}; line-height:${label.lineHeight}; font-weight:${label.fontWeight}; cursor:pointer; }
button.primary { color:${n.paper}; background:${axisMain.primary}; border:1px solid ${axisMain.primary}; }
button.secondary { color:${n.textPrimary}; background:${n.paper}; border:1px solid ${n.divider}; }
.id-footer a + a { margin-inline-start:${s(4)}; }
.id-surface summary,.id-footer summary { min-height:${s(8)}; cursor:pointer; }
.id-footer a,.id-surface a:not(.id-primary):not(.id-secondary) { display:inline-flex; align-items:center; min-height:${s(8)}; }
.id-surface pre { font-family:inherit; white-space:pre-wrap; overflow-wrap:anywhere; }
.id-qr { width:${s(60)}; max-width:100%; height:auto; margin-block:${s(4)}; }
.id-surface input[type="checkbox"] { width:${s(6)}; height:${s(6)}; vertical-align:middle; }
[hidden] { display:none!important; }
@media(max-width:40rem) { .id-page { padding:${s(6)} ${s(4)}; } .id-context strong { display:block; margin-block-start:${s(1)}; font-weight:${fontWeights.semibold}; }
.id-surface { padding:${s(6)}; } .id-brand { margin-block-end:${s(6)}; } .id-actions,.actions { flex-direction:column; } }
@media(prefers-reduced-motion:reduce) { *,*::before,*::after { animation:none!important; transition:none!important; scroll-behavior:auto!important; } }
`
}
