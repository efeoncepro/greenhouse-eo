/**
 * Shell de las pantallas de Efeonce ID con la órbita (operador, 2026-11-02; canvas aprobado y skill
 * `efeonce-graphic-line`). Todas las pantallas del emisor que no son el login V4 la usan: consentimiento, step-up,
 * segundo factor, enlaces por correo, invitación, sesión, acceso retirado, límites y errores.
 *
 * Familia del login V4: formulario en papel con el lockup «Efeonce | ID» arriba y, en escritorio, el panel oscuro con
 * la órbita canónica. Bricolage para titulares (contraste de pesos), Poppins para todo lo funcional. Valores desde
 * `efeonceGraphicLine` (color, órbita) y la geometría compartida con el render; nada transcrito de una captura.
 *
 * Reglas de la línea que esta hoja sostiene:
 * - una sola esfera por pantalla: con panel, el titular cierra con punto tipeado; sin panel (móvil), el punto del
 *   titular ES la esfera, en el acento oscuro de la línea;
 * - el teal nunca va en texto ni en fondos; lectura y escritura se distinguen por el texto;
 * - el movimiento es el de entrada (anillo, arco, esfera, halo) y después queda quieto; con movimiento reducido no hay.
 *
 * Igual que el resto de la hoja: SIN backticks dentro de la plantilla (ver generate-brand-assets.ts).
 */
import { efeonceGraphicLine } from '@efeoncepro/axis-tokens'

import {
  ORBIT_ARC_LENGTH,
  ORBIT_RING_LENGTH
} from '../../src/lib/auth-server/oauth/pages/orbit-geometry'

export function createOrbitShellStyles(): string {
  const c = efeonceGraphicLine.color
  const growth = efeonceGraphicLine.lines.find(line => line.key === 'growth')!
  const muted = 'color-mix(in srgb, ' + c.navy + ' 80%, ' + c.paper + ')'
  const line = 'color-mix(in srgb, ' + c.navy + ' 14%, transparent)'
  const tint = 'color-mix(in srgb, ' + c.navy + ' 6%, #ffffff)'

  return `
@font-face { font-family:'Poppins'; src:url('/fonts/Poppins-Regular.ttf') format('truetype'); font-weight:400; font-display:swap; }
@font-face { font-family:'Poppins'; src:url('/fonts/Poppins-Medium.ttf') format('truetype'); font-weight:500; font-display:swap; }
@font-face { font-family:'Poppins'; src:url('/fonts/Poppins-SemiBold.ttf') format('truetype'); font-weight:600; font-display:swap; }
@font-face { font-family:'Bricolage Grotesque'; src:url('/fonts/BricolageGrotesque-Variable.ttf') format('truetype'); font-weight:200 800; font-display:swap; }
body.os-body { margin:0; min-height:100dvh; background:${c.paper}; color:${c.navy}; font-family:'Poppins', system-ui, sans-serif;
  --os-ink:${c.navy}; --os-muted:${muted}; --os-line:${line}; --os-card:#ffffff; --os-tint:${tint}; --os-paper:${c.paper};
  --os-period:${growth.accentOnLight}; --os-step-dot:${c.navy}; --os-step-ink:#ffffff; color-scheme:light; }
.os-root [hidden] { display:none !important; }
.os-root .os-status:empty { display:none; }
.os-root { box-sizing:border-box; min-height:100dvh; display:grid; grid-template-columns:minmax(0,1fr); }
.os-main { display:grid; grid-template-columns:minmax(0,1fr); place-items:center; padding:32px 16px; min-width:0; }
.os-form { box-sizing:border-box; width:100%; max-width:26.25rem; display:flex; flex-direction:column; gap:22px; }
.os-form > * { box-sizing:border-box; width:100%; margin:0; }
.os-form[data-align="center"] { text-align:center; }
.os-brand { display:flex; justify-content:flex-start; padding-bottom:6px; }
.os-form[data-align="center"] .os-brand { justify-content:center; }
.os-brand svg { display:block; height:26px; width:auto; }
.os-brand .os-lockup-negative { display:none; }
.os-title { font-family:'Bricolage Grotesque', 'Poppins', sans-serif; font-size:32px; font-weight:740; letter-spacing:-0.03em;
  line-height:1.08; color:var(--os-ink); text-wrap:balance; outline:none; }
.os-title .os-lead { font-weight:340; letter-spacing:-0.02em; }
.os-period::before { content:'.'; }
.os-surface { display:flex; flex-direction:column; gap:22px; }
.os-surface > * { box-sizing:border-box; width:100%; margin:0; }
.os-root p { margin:0; font-size:15px; line-height:1.6; color:var(--os-muted); }
.os-root strong { color:var(--os-ink); }
.os-root .os-text-left { text-align:left; }
.os-root .id-primary, .os-root button.primary, .os-root .id-secondary, .os-root button.secondary {
  box-sizing:border-box; display:flex; align-items:center; justify-content:center; gap:10px; width:100%; min-height:52px;
  padding:0 20px; border-radius:12px; font:500 15px/1.2 'Poppins', sans-serif; text-decoration:none; cursor:pointer; box-shadow:none; }
.os-root .id-primary, .os-root button.primary { background:${c.navy}; color:${c.paper}; border:0; }
.os-root .id-primary:hover, .os-root button.primary:hover { background:color-mix(in srgb, ${c.navy} 86%, #ffffff); }
.os-root .id-secondary, .os-root button.secondary { background:transparent; color:var(--os-ink); border:1px solid var(--os-line); }
.os-root .id-secondary:hover, .os-root button.secondary:hover { background:transparent; border-color:color-mix(in srgb, ${c.navy} 40%, transparent); }
.os-root .id-primary:focus-visible, .os-root .id-secondary:focus-visible, .os-root button:focus-visible, .os-root a:focus-visible,
.os-root input:focus-visible { outline:2px solid ${c.navy}; outline-offset:3px; }
.os-root .id-actions { display:flex; flex-direction:column; gap:12px; margin:0; }
.os-root .id-actions > * { flex:none; }
.os-root .actions { display:grid; grid-template-columns:1fr 1.4fr; gap:12px; margin:0; }
.os-root form { display:flex; flex-direction:column; gap:22px; margin:0; }
.os-link { justify-self:center; align-self:center; width:auto !important; font:500 14px 'Poppins', sans-serif; color:var(--os-ink);
  text-decoration:underline; text-underline-offset:3px; background:none; border:0; padding:0; cursor:pointer; }
.os-footnote { padding-top:20px; border-top:1px solid var(--os-line); font-size:13px !important; }
.os-hint { text-align:left; padding:14px 16px; border-radius:12px; background:var(--os-tint); color:var(--os-ink) !important;
  font-size:14px !important; line-height:1.55 !important; }
.os-alert { text-align:left; padding:14px 16px; border-radius:12px; background:#fdeeee; color:#7a1f1f !important;
  font-size:14px !important; line-height:1.55 !important; }
.os-alert strong { color:inherit; }
.os-code { font-size:13px !important; }
.os-code strong { font-weight:600; letter-spacing:0.02em; }
.os-card { text-align:left; display:flex; align-items:center; gap:12px; padding:12px 14px; border:1px solid var(--os-line); border-radius:12px;
  background:var(--os-card); }
.os-card-stack { text-align:left; display:grid; gap:4px; padding:12px 14px; border:1px solid var(--os-line); border-radius:12px; background:var(--os-card); }
.os-label { display:block; font:400 12px/1.4 'Poppins', sans-serif; color:var(--os-muted); }
.os-value { display:block; font:600 15px/1.35 'Poppins', sans-serif; color:var(--os-ink); overflow-wrap:anywhere; }
.os-client-mark { flex:none; display:grid; place-items:center; width:36px; height:36px; border-radius:10px; background:var(--os-tint);
  color:var(--os-ink); font:600 15px 'Poppins', sans-serif; border:1px solid var(--os-line); box-sizing:border-box; }
.os-client-mark-brand { background:#ffffff; }
.os-client-mark svg { width:24px; height:24px; display:block; }
.os-badge { margin-left:auto; flex:none; display:inline-flex; align-items:center; height:24px; padding:0 10px; border-radius:999px;
  background:#fff1e0; color:#6b3d00; font:500 12px 'Poppins', sans-serif; }
.os-warning { text-align:left; padding:12px 14px; border-radius:12px; background:#fff7ec; border:1px solid #f3d6ab; color:#6b3d00 !important;
  font-size:13px !important; line-height:1.5 !important; }
.os-warning strong { color:inherit; }
.os-section { text-align:left; display:grid; gap:10px; }
.os-section-title { margin:0; font:500 13px 'Poppins', sans-serif; color:var(--os-muted); }
.os-list { margin:0; padding:0; list-style:none; border:1px solid var(--os-line); border-radius:12px; background:var(--os-card); overflow:hidden; }
.os-list > li { display:grid; gap:6px; padding:14px 16px; border-top:1px solid var(--os-line); }
.os-list > li:first-child { border-top:0; }
.os-org { display:flex !important; align-items:center; gap:12px; flex-wrap:wrap; }
.os-org strong { flex:1; min-width:0; font:600 14px/1.4 'Poppins', sans-serif; }
.os-org details { flex-basis:100%; font-size:13px; color:var(--os-muted); }
.os-org summary { cursor:pointer; font:500 13px 'Poppins', sans-serif; color:var(--os-ink); }
.os-org ul { margin:8px 0 0; padding-left:18px; }
.os-chip { justify-self:start; display:inline-flex; align-items:center; height:24px; padding:0 10px; border-radius:999px;
  font:500 12px 'Poppins', sans-serif; background:var(--os-tint); color:var(--os-ink); }
.os-chip[data-kind="write"] { background:${c.navy}; color:#ffffff; }
.os-scope-desc { font-size:14px !important; line-height:1.5 !important; color:var(--os-ink) !important; }
.os-scope-code { font:400 12px 'Poppins', sans-serif; color:var(--os-muted); overflow-wrap:anywhere; }
.os-otp { text-align:left; display:grid; gap:10px; }
.os-otp-label { font:500 14px 'Poppins', sans-serif; color:var(--os-ink); }
.os-otp-cells { display:flex; align-items:center; justify-content:space-between; gap:8px; }
.os-otp-cell { flex:1 1 0; width:0; min-width:0; max-width:58px; aspect-ratio:0.86; box-sizing:border-box; border-radius:12px; border:1px solid color-mix(in srgb, ${c.navy} 22%, transparent);
  background:#ffffff; text-align:center; font:640 30px 'Bricolage Grotesque', sans-serif; color:var(--os-ink); padding:0; caret-color:${c.navy}; }
.os-otp-cell:focus { outline:none; border:2px solid ${c.navy}; box-shadow:0 0 0 4px color-mix(in srgb, ${c.navy} 12%, transparent); }
.os-otp-sep { flex:none; width:10px; height:2px; border-radius:2px; background:color-mix(in srgb, ${c.navy} 25%, transparent); }
.os-otp-text { box-sizing:border-box; width:100%; height:52px; padding:0 14px; border-radius:10px; border:1px solid color-mix(in srgb, ${c.navy} 28%, transparent);
  background:#ffffff; font:500 18px 'Poppins', sans-serif; letter-spacing:0.08em; color:var(--os-ink); }
.os-otp[data-mode="digits"] .os-otp-text { position:absolute; width:1px; height:1px; opacity:0; pointer-events:none; }
.os-otp[data-mode="backup"] .os-otp-cells { display:none; }
.os-or { display:flex; align-items:center; gap:12px; font-size:13px !important; }
.os-or::before, .os-or::after { content:''; flex:1; height:1px; background:var(--os-line); }
.os-steps { display:grid; gap:26px; padding-top:6px; text-align:left; }
.os-step { position:relative; display:grid; grid-template-columns:32px minmax(0,1fr); gap:16px; }
.os-step::before { content:attr(data-step); display:grid; place-items:center; width:32px; height:32px; border-radius:50%; background:var(--os-step-dot);
  color:var(--os-step-ink); font:600 13px 'Poppins', sans-serif; box-shadow:0 0 0 5px var(--os-paper); position:relative; z-index:1; }
.os-step::after { content:''; position:absolute; left:15px; top:36px; bottom:-30px; width:1px; background:var(--os-line); }
.os-enroll-only { display:none; }
.os-steps:not([hidden]) ~ .os-code-form { position:relative; padding-left:48px; text-align:left; }
.os-steps:not([hidden]) ~ .os-code-form::before { content:'3'; position:absolute; left:0; top:0; display:grid; place-items:center; width:32px; height:32px; border-radius:50%;
  background:var(--os-step-dot); color:var(--os-step-ink); font:600 13px 'Poppins', sans-serif; }
.os-steps:not([hidden]) ~ .os-code-form .os-enroll-only { display:grid; gap:3px; }
.os-step-body { display:grid; gap:12px; min-width:0; }
.os-step-title { margin:0; font:600 16px/1.3 'Poppins', sans-serif; color:var(--os-ink); }
.os-panel-card { display:grid; gap:12px; padding:16px; border-radius:16px; background:var(--os-card);
  box-shadow:0 1px 2px color-mix(in srgb, ${c.dark} 4%, transparent), 0 12px 32px -12px color-mix(in srgb, ${c.dark} 16%, transparent); }
.os-qr { display:block; width:132px; height:132px; padding:8px; border-radius:12px; background:#ffffff; border:1px solid var(--os-line); }
.os-secret pre, .os-backups pre { margin:0; white-space:pre-wrap; font:600 14px/1.6 'Poppins', sans-serif; letter-spacing:0.08em; color:var(--os-ink);
  font-variant-numeric:tabular-nums; }
.os-backups pre { columns:2; column-gap:20px; }
.os-check { display:flex !important; align-items:center; gap:10px; font:500 14px 'Poppins', sans-serif; color:var(--os-ink); }
.os-check input { width:20px; height:20px; accent-color:${c.navy}; margin:0; }
.os-panel { display:none; }
.os-panel-stage { position:relative; width:${2 * 200}px; height:${2 * 200}px; }
.os-panel-stage svg.os-orbit { position:absolute; left:50%; top:50%; transform:translate(-50%,-50%); overflow:visible; }
.os-panel-stage .os-orbit-content { position:absolute; inset:0; display:grid; place-items:center; }
.os-orbit-ring { stroke-dasharray:${ORBIT_RING_LENGTH}; animation:os-draw-ring 1600ms cubic-bezier(0.2,0,0,1) 100ms both; }
.os-orbit-arc { stroke-dasharray:${ORBIT_ARC_LENGTH}; animation:os-draw-arc 900ms cubic-bezier(0.2,0,0,1) 700ms both; }
.os-orbit-sphere, .os-word-sphere { transform-box:fill-box; transform-origin:center; animation:os-land 520ms cubic-bezier(0.2,0,0,1) 1500ms both; }
.os-orbit-halo { animation:os-glow 1400ms cubic-bezier(0.4,0,0.2,1) 900ms both; }
.os-orbit-content > * { animation:os-word 1000ms cubic-bezier(0.2,0,0,1) 300ms both; }
.os-root .os-word { margin:0; font-family:'Bricolage Grotesque', sans-serif; font-weight:760; letter-spacing:-0.05em; line-height:0.94; color:#ffffff !important;
  font-size:108px !important; text-align:left; }
.os-root .os-word[data-size="md"] { font-size:84px !important; }
.os-word-sphere { display:inline-block; width:0.17em; height:0.17em; margin-left:0.06em; border-radius:50%; background:${c.teal}; vertical-align:baseline; }
@keyframes os-draw-ring { from { stroke-dashoffset:${ORBIT_RING_LENGTH}; } to { stroke-dashoffset:0; } }
@keyframes os-draw-arc { from { stroke-dashoffset:${ORBIT_ARC_LENGTH}; } to { stroke-dashoffset:0; } }
@keyframes os-land { 0% { transform:scale(0); } 70% { transform:scale(1.35); } 100% { transform:scale(1); } }
@keyframes os-glow { from { opacity:0; } to { opacity:1; } }
@keyframes os-word { from { clip-path:inset(100% 0 0 0); transform:translateY(40px); } to { clip-path:inset(0 0 0 0); transform:none; } }
@keyframes os-rise { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:none; } }
.os-form { animation:os-rise 700ms cubic-bezier(0.2,0,0,1) 150ms both; }
@media (max-width:63.99rem) {
  .os-period::before { content:none; }
  .os-period { display:inline-block; width:0.2em; height:0.2em; margin-left:0.04em; border-radius:50%; background:var(--os-period); }
}
@media (min-width:64rem) {
  .os-root { grid-template-columns:minmax(0,1fr) minmax(0,38.75rem); gap:16px; padding:16px; }
  .os-main { padding:48px 24px; }
  .os-panel { display:grid; place-items:center; position:sticky; top:16px; height:calc(100dvh - 32px); border-radius:20px; background:${c.dark}; overflow:hidden; }
}
@media (prefers-color-scheme: dark) {
  body.os-body { background:${c.dark}; color:#ffffff; --os-ink:#ffffff; --os-muted:#cfe4fa; --os-line:rgba(255,255,255,0.16); --os-card:rgba(255,255,255,0.05);
    --os-tint:rgba(255,255,255,0.08); --os-paper:${c.dark}; --os-period:${c.teal}; --os-step-dot:#ffffff; --os-step-ink:${c.dark}; color-scheme:dark; }
  .os-brand .os-lockup-positive { display:none; }
  .os-brand .os-lockup-negative { display:block; }
  .os-root .id-primary, .os-root button.primary { background:#ffffff; color:${c.dark}; }
  .os-root .id-primary:hover, .os-root button.primary:hover { background:#e6eef7; }
  .os-client-mark-brand { background:#ffffff; }
  .os-otp-cell, .os-otp-text { background:rgba(255,255,255,0.06); color:#ffffff; border-color:rgba(255,255,255,0.24); caret-color:#ffffff; }
  .os-otp-cell:focus { border-color:#ffffff; box-shadow:0 0 0 4px rgba(255,255,255,0.14); }
  .os-chip[data-kind="write"] { background:#ffffff; color:${c.dark}; }
  .os-panel { background:color-mix(in srgb, ${c.dark} 94%, #ffffff); }
}
@media (prefers-reduced-motion: reduce) {
  .os-form, .os-orbit-ring, .os-orbit-arc, .os-orbit-sphere, .os-word-sphere, .os-orbit-halo, .os-orbit-content > * { animation:none; }
}
`
}
