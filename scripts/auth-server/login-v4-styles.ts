import { efeonceGraphicLine, efeonceTokens } from '@efeoncepro/axis-tokens'

import { typographyScale } from '../../src/components/theme/typography-tokens'
import spacing from '../../src/@core/theme/spacing'
import { motionCss } from '../../src/components/greenhouse/motion/core/tokens'
import { LOGIN_STAGE_BREAKPOINT, LOGIN_STAGE_TYPE } from '../../src/views/login/login-constants'

/** Source-led V4 dimensions are support-specific; color, motion, radius and typography derive from their owners. */
export function createLoginV4Styles(): string {
  const c = efeonceGraphicLine.color
  const s = spacing.spacing
  const radius = efeonceTokens.radius
  const stageText = efeonceTokens.color.surface // V4 uses common.white over photographic stage.
  const headline = LOGIN_STAGE_TYPE.headline

  return `
@font-face { font-family:'Geist Web'; src:url('/fonts/Geist-Latin-Variable.woff2') format('woff2'); font-weight:400 800; font-display:swap; }
@font-face { font-family:'Bricolage Grotesque'; src:url('/fonts/BricolageGrotesque-Latin-500.woff2') format('woff2'); font-weight:500; font-display:swap; }
.id-v4-layout { --id-text:${c.navy}; --id-paper:${c.paper}; --id-muted:color-mix(in srgb,${c.navy} 80%,${c.paper}); --id-accent:${c.navy}; --id-on-accent:${c.paper}; --id-border:color-mix(in srgb,${c.navy} 18%,${c.paper}); --id-hover:color-mix(in srgb,${c.navy} 4%,${c.paper});
  display:grid; grid-template-columns:minmax(0,1fr); min-height:100svh; background:var(--id-paper); color:var(--id-text); font-family:'Geist Web',system-ui,sans-serif; }
.id-v4-panel { display:flex; flex-direction:column; align-items:center; min-width:0; padding:${s(12)} ${s(6)} ${s(6)}; }
.id-v4-form { width:100%; max-width:${s(95)}; margin-block:auto; padding-block:${s(6)}; }
.id-v4-brand { display:flex; justify-content:center; color:${c.navy}; margin-block-end:${s(6)}; }
.id-v4-brand svg { display:block; width:${s(39)}; height:auto; }
.id-v4-form .id-title { font:500 ${typographyScale.headlineLg.fontSize}/1.4 'Geist Web',system-ui,sans-serif; text-align:center; margin:0; color:var(--id-text); }
.id-v4-form .id-intro { margin:${s(2)} 0 ${s(7)}; font-size:.9375rem; line-height:1.5; text-align:center; color:var(--id-muted); }
.id-v4-form .id-section { border:0; padding:0; margin:0; }
.id-v4-form .id-section + .id-section { margin-block-start:${s(3)}; }
.id-v4-form ul { list-style:none; padding:0; }
.id-v4-form .id-actions,.id-v4-form .actions { display:flex; margin-block:${s(3)}; gap:${s(2)}; }
.id-v4-form .id-primary,.id-v4-form .primary,.id-v4-form .id-secondary { display:inline-flex; align-items:center; justify-content:center; gap:${s(3)}; width:100%; min-height:${s(13)}; padding:${s(3)} ${s(4)}; border-radius:${radius.lg}; font:500 .9375rem/1.4 'Geist Web',system-ui,sans-serif; text-decoration:none; cursor:pointer; transition:background-color ${motionCss.duration.short} ${motionCss.ease.standard},transform ${motionCss.duration.short} ${motionCss.ease.standard}; }
.id-v4-form .id-primary,.id-v4-form .primary { border:1px solid ${c.navy}; background:${c.navy}; color:${c.paper}; box-shadow:none; }
.id-v4-form .id-secondary { border:1px solid var(--id-border); background:transparent; color:${c.navy}; box-shadow:none; }
.id-v4-form .id-primary:hover,.id-v4-form .primary:hover { background:${c.dark}; }
.id-v4-form .id-secondary:hover { background:var(--id-hover); border-color:var(--id-muted); }
.id-v4-form button:active { transform:scale(.985); }
.id-v4-form button:disabled { opacity:.6; cursor:wait; }
.id-v4-form button:focus-visible,.id-v4-form a:focus-visible,.id-v4-footer a:focus-visible,.id-v4-tabs button:focus-visible { outline:2px solid ${c.navy}; outline-offset:3px; }
.id-v4-form .id-icon,.id-v4-form .id-actions svg,.id-v4-form .actions svg,.id-v4-form .id-secondary svg { width:${s(5)}; height:${s(5)}; flex:none; }
.id-v4-form .id-or { display:flex; align-items:center; gap:${s(3)}; margin:${s(6)} 0; color:var(--id-muted); font-size:.8125rem; text-align:center; }
.id-v4-form .id-or::before,.id-v4-form .id-or::after { content:''; height:1px; flex:1; background:var(--id-border); }
.id-v4-form .id-field label { display:block; font-size:.875rem; font-weight:500; margin-block-end:${s(2)}; }
.id-v4-form .id-input { display:flex; align-items:center; gap:${s(2)}; border:1px solid var(--id-border); border-radius:${radius.lg}; background:transparent; padding-inline:${s(4)}; }
.id-v4-form .id-input svg { width:${s(5)}; height:${s(5)}; flex:none; color:var(--id-muted); position:static; translate:none; }
.id-v4-form .id-input input { min-width:0; width:100%; min-height:${s(13)}; border:0; outline:0; background:transparent; font:inherit; box-shadow:none; padding:${s(3)} 0; }
.id-v4-form .id-input:focus-within { border-color:${c.navy}; box-shadow:0 0 0 3px color-mix(in srgb,${c.navy} 10%,transparent); }
.id-v4-form .id-note-fine { font-size:.8125rem; line-height:1.5; color:var(--id-muted); text-align:center; margin-block-start:${s(3)}; }
.id-v4-form [data-login-status]:empty { display:none; }
.id-v4-form .id-alert { display:flex; align-items:flex-start; gap:${s(2)}; padding:${s(3)}; margin-block:${s(4)}; border:1px solid var(--id-border); border-radius:${radius.md}; color:var(--id-text); background:var(--id-hover); }
.id-v4-footer { width:100%; max-width:${s(95)}; display:grid; justify-items:center; gap:${s(2)}; margin-block-start:${s(8)}; font-size:.75rem; line-height:1.5; color:var(--id-muted); text-align:center; }
.id-v4-footer a { display:inline-flex; min-height:${s(6)}; align-items:center; color:${c.navy}; }
.id-v4-product { font-size:1rem; font-weight:600; color:${c.navy}; }
.id-v4-stage { position:relative; overflow:hidden; isolation:isolate; min-width:0; height:${s(95)}; margin:${s(3)} ${s(6)} ${s(6)}; border-radius:${radius.lg}; background:${c.dark}; }
.id-v4-photo,.id-v4-slide { position:absolute; inset:0; width:100%; height:100%; }
.id-v4-photo { object-fit:cover; }
.id-v4-photo-muted { filter:grayscale(${efeonceGraphicLine.lens.outside.grayscale}) brightness(${efeonceGraphicLine.lens.outside.brightness}); }
.id-v4-lens-ring { fill:none; stroke:${c.paper}; stroke-width:1.5; opacity:.7; }
.id-v4-lens-arc { fill:none; stroke:${c.teal}; stroke-width:${efeonceGraphicLine.lens.anatomy.arcStrokePx}; }
.id-v4-lens-sphere { fill:${c.teal}; }
.id-v4-story { position:absolute; inset-inline:${s(8)}; inset-block-end:${s(24)}; color:${stageText}; display:grid; gap:${s(3)}; max-width:${s(130)}; }
.id-v4-story h2 { font-family:'Bricolage Grotesque',system-ui,sans-serif; font-size:${headline.fontSize}; font-weight:${headline.fontWeight}; line-height:${headline.lineHeight}; letter-spacing:${headline.letterSpacing}; text-wrap:balance; }
.id-v4-story a { color:${stageText}; display:inline-flex; align-items:center; min-height:${s(6)}; gap:${s(2)}; width:fit-content; }
.id-v4-story p { font-size:.9375rem; line-height:1.5; }
.id-v4-story .id-v4-kicker { font-size:.75rem; letter-spacing:.08em; text-transform:uppercase; }
.id-v4-tabs { position:absolute; inset-inline:${s(8)}; inset-block-end:${s(8)}; display:flex; gap:${s(3)}; }
.id-v4-tabs button { flex:1; min-width:0; min-height:${s(9)}; padding:${s(2)} 0; border:0; border-block-end:2px solid color-mix(in srgb,${stageText} 35%,transparent); background:transparent; color:${stageText}; font-size:.75rem; cursor:pointer; }
.id-v4-stage a:focus-visible,.id-v4-tabs button:focus-visible { outline:2px solid ${stageText}; outline-offset:3px; }
.id-v4-tabs button[aria-current=true] { border-block-end-color:${stageText}; }
.id-v4-tabs [data-login-carousel-pause] { flex:0 0 ${s(9)}; }
@media(min-width:${LOGIN_STAGE_BREAKPOINT}px) {
 .id-v4-layout { grid-template-columns:minmax(${s(110)},${s(155)}) minmax(0,1fr); }
 .id-v4-panel { padding:${s(6)} ${s(7)} ${s(6)}; min-height:100svh; }
 .id-v4-brand svg { width:${s(45)}; }
 .id-v4-stage { height:auto; min-height:calc(100svh - ${s(6)}); margin:${s(3)}; }
 .id-v4-story { inset-inline:${s(14)}; }
}
@media(max-width:${LOGIN_STAGE_BREAKPOINT - 1}px) {
 .id-v4-panel { padding-block-start:${s(6)}; }
 .id-v4-stage { width:min(calc(100% - ${s(12)}),${s(95)}); justify-self:center; }
 .id-v4-story h2 { font-size:${LOGIN_STAGE_TYPE.headlineCard.fontSize}; }
 .id-v4-story { inset-inline:${s(6)}; inset-block-end:${s(18)}; gap:${s(1)}; }
 .id-v4-story-body { display:none; }
 .id-v4-tabs { inset-inline:${s(6)}; inset-block-end:${s(3.5)}; }
}
@media(prefers-reduced-motion:no-preference) { .id-v4-form { animation:id-v4-enter ${motionCss.duration.extended} ${motionCss.ease.emphasized} both; } }
@keyframes id-v4-enter { from { transform:translateY(${s(3)}); } to { transform:none; } }
`
}
