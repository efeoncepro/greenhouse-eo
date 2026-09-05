/** Build-time styles from canonical portable tokens; runtime consumes the generated CSS artifact. */
import { efeonceTokens, axisRamp } from '@efeoncepro/axis-tokens'

import { axisMain, axisNeutral } from '../../src/@core/theme/axis-tokens'
import spacing from '../../src/@core/theme/spacing'
import { typographyScale, fontWeights, letterSpacings } from '../../src/components/theme/typography-tokens'

/**
 * Hoja única de Efeonce ID (login, consentimiento, step-up).
 *
 * Arquitectura en dos capas, como el resto del producto: los tokens portables AXIS entran una sola
 * vez arriba y se materializan en propiedades personalizadas semánticas (`--id-*`); TODAS las reglas
 * consumen la capa semántica, nunca un valor primitivo. Esa capa es también lo que hace posible el
 * modo oscuro: el bloque `prefers-color-scheme` redefine los mismos nombres con los neutrales
 * oscuros de AXIS y ninguna regla de abajo cambia.
 *
 * Restricción que manda sobre el diseño: la CSP del emisor es `default-src 'none'` con `style-src`
 * por hash. No hay CSS externo, ni fuentes remotas, ni atributos `style=`. Todo lo visual vive acá.
 */
export function createAuthServerStyles(): string {
  const n = axisNeutral.light
  const d = axisNeutral.dark
  const r = efeonceTokens.radius
  const s = spacing.spacing
  const body = typographyScale.bodyLg
  const title = typographyScale.headlineLg
  const label = typographyScale.labelMd

  /** Azul institucional del isotipo (AXIS `primary.800`); en oscuro sube a `primary.300` para no apagarse. */
  const markLight = axisRamp.primary[800]
  const markDark = axisRamp.primary[300]
  /** Campo del panel de marca: la rampa azul de AXIS, de más profundo a institucional. */
  const railDeep = axisRamp.primary[900]
  const railBase = axisRamp.primary[800]
  const railGlow = axisRamp.primary[600]
  const hero = typographyScale.surfaceHeroTitle

  return `
@font-face { font-family: 'Geist'; src:url('/fonts/Geist-Regular.ttf') format('truetype'); font-weight:400; font-display:swap; }
@font-face { font-family: 'Geist'; src:url('/fonts/Geist-SemiBold.ttf') format('truetype'); font-weight:600; font-display:swap; }
@font-face { font-family: 'Poppins'; src:url('/fonts/Poppins-Bold.ttf') format('truetype'); font-weight:700; font-display:swap; }
:root {
  --font-geist:'Geist'; --font-poppins:'Poppins';
  color-scheme:light dark;
  --id-bg:${n.bodyBg};
  --id-paper:${n.paper};
  --id-text:${n.textPrimary};
  --id-muted:${n.textSecondary};
  --id-border:${n.divider};
  --id-hover:${n.actionHover};
  --id-accent:${axisMain.primary};
  --id-accent-hover:color-mix(in oklch, ${axisMain.primary} 88%, black);
  --id-accent-soft:color-mix(in oklch, ${axisMain.primary} 8%, transparent);
  --id-accent-ring:color-mix(in oklch, ${axisMain.primary} 22%, transparent);
  --id-on-accent:${n.bgWhite};
  --id-mark:${markLight};
  --id-danger:${axisMain.error};
  --id-shadow-color:${n.snackbar};
  --id-shadow:0 1px 2px color-mix(in srgb, var(--id-shadow-color) 6%, transparent), 0 ${s(6)} ${s(12)} -${s(6)} color-mix(in srgb, var(--id-shadow-color) 16%, transparent);
}
@media (prefers-color-scheme: dark) {
  :root {
    --id-bg:${d.bodyBg};
    --id-paper:${d.paper};
    --id-text:${d.textPrimary};
    --id-muted:${d.textSecondary};
    --id-border:${d.divider};
    --id-hover:${d.actionHover};
    --id-accent-hover:color-mix(in oklch, ${axisMain.primary} 86%, white);
    --id-mark:${markDark};
    --id-shadow-color:#000000;
    --id-shadow:0 1px 2px color-mix(in srgb, var(--id-shadow-color) 24%, transparent), 0 ${s(6)} ${s(12)} -${s(6)} color-mix(in srgb, var(--id-shadow-color) 44%, transparent);
  }
}
* { box-sizing:border-box; }
body {
  margin:0; color:var(--id-text); background:var(--id-bg);
  font-family:${body.fontFamily}; font-size:${body.fontSize}; line-height:${body.lineHeight};
  -webkit-font-smoothing:antialiased;
  /* Un solo acento, muy diluido y anclado arriba: da profundidad sin convertirse en decoración. */
  background-image:radial-gradient(80rem 32rem at 50% -14rem, var(--id-accent-soft), transparent 70%);
  background-repeat:no-repeat;
}
a { color:var(--id-accent); text-underline-offset:.2em; }
p,h1,h2,ul { margin:0; }
button,input,a { -webkit-tap-highlight-color:transparent; }
button,input { font:inherit; color:inherit; }
/* ─── Lienzo de acceso ───────────────────────────────────────────────────────────────────────
   El login es la primera pantalla que ve alguien de fuera, así que en pantallas anchas se abre en
   dos: un panel de marca con el logotipo institucional y el formulario a su lado. Las demás páginas
   (consentimiento, verificación, error) NO usan el panel: son decisiones puntuales y una columna
   centrada las sirve mejor. El formulario va PRIMERO en el DOM y el panel se reordena por CSS, para
   que un lector de pantalla llegue al campo antes que al mensaje de marca. */
.id-canvas { min-height:100svh; display:grid; align-items:stretch; }
/* Dirección «Nocturno editorial», aplicada a TODAS las pantallas del emisor: el lienzo entero es el
   campo de marca y la tarjeta clara flota encima. Se fija en claro y oscuro —esto es una superficie
   de marca, no una pantalla más del producto— y la tarjeta re-declara los tokens claros en su
   subárbol para leerse igual en ambos esquemas. Sólo /login suma además el panel lateral: el resto
   son decisiones puntuales y les basta la columna centrada sobre el mismo campo. */
.id-canvas { position:relative; isolation:isolate; color:${n.bgWhite};
  background:radial-gradient(120% 90% at 8% 0%, ${railGlow} 0%, ${railBase} 42%, ${railDeep} 100%); }
.id-canvas::after { content:""; position:absolute; inset:0; z-index:-1; pointer-events:none;
  background-image:radial-gradient(color-mix(in oklch, ${n.bgWhite} 6%, transparent) 1px, transparent 1px); background-size:3px 3px; }
.id-canvas .id-page { background:transparent; }
.id-canvas .id-brand { color:${n.bgWhite}; }
.id-canvas .id-brand svg { color:${n.bgWhite}; }
.id-canvas .id-surface {
  /* --id-bg va en la lista: pinta los sub-fondos de dentro (tarjeta de organización, badge
     de permiso). Sin él tomaban el neutro OSCURO del esquema y quedaban negro sobre negro. */
  --id-paper:${n.paper}; --id-text:${n.textPrimary}; --id-muted:${n.textSecondary}; --id-border:${n.divider};
  --id-hover:${n.actionHover}; --id-bg:${n.bodyBg}; --id-shadow-color:${n.snackbar};
  color:var(--id-text); border-color:transparent;
  box-shadow:inset 0 1px 0 ${n.bgWhite}, 0 2px 4px color-mix(in srgb, ${railDeep} 26%, transparent), 0 ${s(16)} ${s(32)} -${s(9)} color-mix(in srgb, ${railDeep} 70%, transparent); }
.id-rail { display:none; }
@media (min-width:64rem) {
  /* La fila en 1fr: sin eso el panel se queda del alto de su contenido y deja una franja muerta. */
  .id-canvas[data-state="login"] { grid-template-columns:minmax(0,5fr) minmax(0,6fr); grid-template-rows:1fr; }
  .id-canvas[data-state="login"] .id-rail { order:-1; display:flex; }
  .id-canvas[data-state="login"] .id-brand { display:none; }
  .id-canvas[data-state="login"] .id-page { min-height:auto; padding-inline:${s(10)}; }
}
.id-rail { position:relative; overflow:hidden; align-items:center; padding:${s(16)} ${s(12)};
  border-inline-end:1px solid color-mix(in oklch, ${n.bgWhite} 13%, transparent); }
.id-rail-inner { position:relative; z-index:1; max-width:${s(132)}; display:grid; gap:${s(5)}; }
.id-rail-logo svg { width:${s(44)}; max-width:100%; height:auto; }
.id-rail-logo svg { color:${n.bgWhite}; }
.id-rail-kicker { font-size:${typographyScale.overline.fontSize}; font-weight:${fontWeights.semibold}; letter-spacing:${letterSpacings.caps}; text-transform:uppercase; color:color-mix(in oklch, ${n.bgWhite} 62%, transparent); }
/* El titular es una superficie de marca, no UI: escala con el viewport desde el mayor paso de la
   rampa hasta 1.6× ese mismo token — derivado del sistema, nunca un tamaño inventado. */
.id-rail-headline { font-family:${hero.fontFamily}; font-size:clamp(${hero.fontSize}, 3.2vw, calc(${hero.fontSize} * 1.45)); font-weight:${fontWeights.bold}; line-height:1.04; letter-spacing:-.028em; margin-block-start:${s(2)}; text-wrap:balance; }
.id-rail-headline em { font-style:normal; color:${axisRamp.primary[300]}; }
.id-rail-body { max-width:46ch; color:color-mix(in oklch, ${n.bgWhite} 82%, transparent); }
.id-rail-trust { display:flex; align-items:center; gap:${s(2)}; font-size:${typographyScale.bodyMd.fontSize}; color:color-mix(in oklch, ${n.bgWhite} 72%, transparent); }
/* Filigrana: el isotipo institucional a gran escala, casi invisible, para dar profundidad sin ruido. */
.id-rail-mark { position:absolute; inset-block-end:-42%; inset-inline-start:-24%; width:${s(240)}; opacity:.045; pointer-events:none; }
.id-rail-mark svg { width:100%; height:auto; }
.id-rail-mark svg { color:${n.bgWhite}; }
.id-page { width:min(100%,${s(152)}); margin-inline:auto; padding:${s(12)} ${s(6)}; display:grid; align-content:center; min-height:100svh; }
@media (max-width:63.99rem) { .id-rail { display:none; } }
.id-page[data-state="login"] { max-width:${s(140)}; }
.id-brand { display:flex; align-items:center; justify-content:center; gap:${s(2)}; margin-block-end:${s(7)}; font-family:${typographyScale.headlineMd.fontFamily}; font-size:${typographyScale.labelLg.fontSize}; font-weight:${fontWeights.bold}; letter-spacing:-.01em; }
.id-brand img,.id-brand svg { width:${s(9)}; height:${s(7)}; object-fit:contain; }
/* Los SVG de marca llegan normalizados a fill="currentColor" (scripts/auth-server/brand-svg.ts):
   el color se hereda por la propiedad color y alcanza a TODA figura — incluido el <circle> del logotipo. */
.id-brand svg { color:var(--id-mark); }
.id-context { text-align:center; margin-block-end:${s(6)}; overflow-wrap:anywhere; font-size:${typographyScale.bodyMd.fontSize}; color:color-mix(in oklch, ${n.bgWhite} 66%, transparent); }
.id-context strong { color:${n.bgWhite}; }
.id-context strong { display:block; margin-block-start:${s(1)}; font-size:${body.fontSize}; color:var(--id-text); font-weight:${fontWeights.semibold}; }
.id-surface { background:var(--id-paper); border:1px solid var(--id-border); border-radius:${r.lg}; padding:${s(9)} ${s(8)} ${s(8)}; box-shadow:var(--id-shadow); }
/* Presencia de la tarjeta sobre el campo: más superficie, radio y sombra derivados del sistema, y
   un filo interior de 1px que la despega del azul en vez de apoyarla sobre él. */
.id-canvas[data-state="login"] .id-surface { padding:${s(12)} ${s(12)} ${s(11)}; border-radius:calc(${r.lg} * 1.5); }
.id-canvas[data-state="login"] .id-title { font-size:${typographyScale.surfaceHeroTitle.fontSize}; margin-block-end:${s(3)}; }
.id-canvas[data-state="login"] .id-intro,.id-canvas[data-state="login"] .id-surface > p { font-size:${typographyScale.bodyLg.fontSize}; }
.id-canvas[data-state="login"] .id-section + .id-section,.id-canvas[data-state="login"] .id-or { margin-block:${s(7)}; }
.id-note-fine { margin-block-start:${s(5)}; font-size:${typographyScale.bodySm.fontSize}; color:var(--id-muted); text-align:center; }
.id-title { font-family:${title.fontFamily}; font-size:${title.fontSize}; font-weight:${title.fontWeight}; line-height:${title.lineHeight}; margin-block-end:${s(2)}; letter-spacing:-.02em; }
.id-surface > p { max-width:60ch; margin-block-end:${s(4)}; text-wrap:pretty; }
.id-intro { color:var(--id-muted); margin-block-end:${s(7)}; }
.id-section + .id-section { border-block-start:1px solid var(--id-border); padding-block-start:${s(6)}; margin-block-start:${s(6)}; }
.id-section h2,.id-surface > h2 { font-size:${typographyScale.bodySm.fontSize}; font-weight:${fontWeights.semibold}; line-height:${typographyScale.bodyMd.lineHeight}; letter-spacing:${letterSpacings.metadata}; color:var(--id-muted); margin-block-end:${s(3)}; }
.id-section p { margin-block-end:${s(4)}; }
.id-primary,.id-secondary,button.primary,button.secondary {
  display:inline-flex; align-items:center; justify-content:center; gap:${s(2)};
  min-height:${s(12)}; padding:${s(3)} ${s(4)}; border-radius:${r.md};
  text-decoration:none; font-size:${label.fontSize}; line-height:${label.lineHeight}; font-weight:${fontWeights.semibold};
  cursor:pointer; text-align:center; overflow-wrap:anywhere;
  transition:background-color .15s cubic-bezier(.2,0,0,1), border-color .15s cubic-bezier(.2,0,0,1), box-shadow .15s cubic-bezier(.2,0,0,1);
}
.id-primary,button.primary { background:var(--id-accent); color:var(--id-on-accent); border:1px solid var(--id-accent); box-shadow:inset 0 1px 0 color-mix(in oklch, ${n.bgWhite} 22%, transparent); }
.id-secondary,button.secondary { background:var(--id-paper); color:var(--id-text); border:1px solid var(--id-border); }
.id-primary:hover,button.primary:hover { background:var(--id-accent-hover); border-color:var(--id-accent-hover); }
.id-secondary:hover,button.secondary:hover { background:var(--id-hover); border-color:color-mix(in oklch, var(--id-text) 24%, transparent); }
.id-primary:active,button.primary:active,.id-secondary:active,button.secondary:active { box-shadow:inset 0 1px 2px color-mix(in srgb, var(--id-shadow-color) 20%, transparent); }
/* Deshabilitado: se apaga sin desaparecer y deja claro que no es un destino. */
.id-primary[aria-disabled="true"],button.primary:disabled,.id-secondary[aria-disabled="true"],button.secondary:disabled {
  cursor:not-allowed; box-shadow:none; background:var(--id-hover); color:${n.textDisabled}; border-color:var(--id-border); }
/* En espera: el controlador de step-up marca el botón mientras la ceremonia corre. */
button[aria-busy="true"] { cursor:progress; }
/* El hover del secundario sobre la tarjeta clara era casi invisible; se apoya en el acento. */
.id-secondary:hover,button.secondary:hover { background:color-mix(in oklch, var(--id-accent) 6%, var(--id-paper)); border-color:color-mix(in oklch, var(--id-accent) 34%, transparent); }
.id-section > .id-primary,.id-section > .id-secondary,form .id-secondary { width:100%; }
.id-icon { width:${s(5)}; height:${s(5)}; flex:none; }
.id-icon-brand { width:${s(4)}; height:${s(4)}; }
.id-field { display:flex; flex-direction:column; gap:${s(2)}; margin-block:${s(4)}; font-size:${typographyScale.labelSm.fontSize}; font-weight:${fontWeights.semibold}; }
.id-field .id-muted { font-weight:${fontWeights.regular}; margin-block-end:0; }
form .id-actions { margin-block-start:${s(4)}; }
.id-input { position:relative; display:block; }
.id-input .id-icon { position:absolute; inset-block-start:50%; inset-inline-start:${s(3)}; translate:0 -50%; color:var(--id-muted); pointer-events:none; }
.id-field input {
  width:100%; min-width:0; min-height:${s(12)}; padding:${s(3)};
  border:1px solid var(--id-border); border-radius:${r.md};
  background:var(--id-paper); color:var(--id-text);
  font-size:${body.fontSize}; font-weight:${fontWeights.regular};
  transition:border-color .15s cubic-bezier(.2,0,0,1), box-shadow .15s cubic-bezier(.2,0,0,1);
}
/* Va DESPUÉS de la regla genérica del campo: si no, su padding gana y el texto pisa el icono. */
.id-field .id-input input { padding-inline-start:${s(11)}; }
.id-field input:hover { border-color:color-mix(in oklch, var(--id-text) 24%, transparent); }
.id-field input:focus { outline:none; border-color:var(--id-accent); box-shadow:0 0 0 ${s(1)} var(--id-accent-ring); }
.id-field input[aria-invalid="true"] { border-color:var(--id-danger); }
.id-field input::placeholder { color:${n.textDisabled}; opacity:1; }
.id-field input:disabled { background:var(--id-hover); color:${n.textDisabled}; cursor:not-allowed; }
/* El autocompletado de Chrome pinta su propio amarillo encima de la tarjeta: se neutraliza con la
   sombra interior, que es lo único que ese pseudo-elemento respeta. */
.id-field input:-webkit-autofill,.id-field input:-webkit-autofill:hover,.id-field input:-webkit-autofill:focus {
  -webkit-text-fill-color:var(--id-text); box-shadow:0 0 0 ${s(25)} var(--id-paper) inset; caret-color:var(--id-text); }
.id-field input:-webkit-autofill:focus { box-shadow:0 0 0 ${s(25)} var(--id-paper) inset, 0 0 0 ${s(1)} var(--id-accent-ring); }
.id-or { display:grid; grid-template-columns:1fr auto 1fr; align-items:center; gap:${s(3)}; margin-block:${s(6)}; font-size:${typographyScale.bodySm.fontSize}; color:var(--id-muted); }
.id-or::before,.id-or::after { content:""; height:1px; background:var(--id-border); }
/* El separador ya corta la lectura: la sección siguiente no repite la línea. */
.id-or + .id-section,.id-or + form.id-section { border-block-start:none; padding-block-start:0; margin-block-start:0; }
.id-alert { display:flex; align-items:flex-start; gap:${s(2)}; margin-block-end:${s(4)}; padding:${s(3)}; border-radius:${r.md}; font-size:${typographyScale.bodyMd.fontSize}; border:1px solid color-mix(in oklch, var(--id-danger) 32%, transparent); background:color-mix(in oklch, var(--id-danger) 7%, transparent); color:var(--id-text); }
.id-alert .id-icon { color:var(--id-danger); }
/* Variante neutra del bloque anterior: confirma o explica una espera, no reporta un problema. */
.id-note { display:flex; align-items:flex-start; gap:${s(2)}; margin-block-start:${s(5)}; padding:${s(3)}; border-radius:${r.md}; font-size:${typographyScale.bodyMd.fontSize}; border:1px solid var(--id-border); background:var(--id-bg); color:var(--id-muted); }
.id-note .id-icon { color:var(--id-muted); }
.id-actions { display:flex; gap:${s(3)}; margin-block-start:${s(7)}; }
.id-actions > * { flex:1; }
.id-muted,.id-footer,.id-preview-note { font-size:${typographyScale.bodyMd.fontSize}; color:var(--id-muted); }
.id-preview-note { margin-block-end:${s(5)}; text-align:center; }
.id-footer { text-align:center; margin-block-start:${s(7)}; font-size:${typographyScale.bodySm.fontSize}; color:${n.textDisabled}; }
.id-org { margin-block:${s(5)}; padding-block:${s(4)}; border-block-start:1px solid var(--id-border); overflow-wrap:anywhere; }
.id-org p { margin-block-end:0; }
.id-org + .id-section { padding-block-start:${s(4)}; margin-block-start:${s(4)}; }
.id-permissions { list-style:none; padding:0; margin-block:${s(5)}; border:1px solid var(--id-border); border-radius:${r.md}; }
.id-scope { display:grid; grid-template-columns:auto 1fr; gap:${s(1)} ${s(3)}; padding:${s(4)}; }
.id-scope > .id-icon { grid-row:span 3; margin-block-start:${s(1)}; color:var(--id-muted); }
.id-scope + .id-scope { border-block-start:1px solid var(--id-border); }
.id-scope-heading { display:flex; align-items:baseline; gap:${s(2)}; flex-wrap:wrap; }
.id-scope-heading h3 { margin:0; font-size:${typographyScale.bodyLg.fontSize}; font-weight:${fontWeights.semibold}; }
.id-divider { margin-block:${s(4)}; text-align:center; }
.id-scope-details { margin-block-start:${s(4)}; font-size:${typographyScale.bodyMd.fontSize}; overflow-wrap:anywhere; }
.id-scope-details summary { cursor:pointer; min-height:${s(8)}; }
.id-scope p { margin-block-start:0; color:var(--id-text); }
.id-scope-kind { display:inline-flex; align-items:center; align-self:start; justify-self:start; padding:${s(0.5)} ${s(2)}; border-radius:${r.sm}; border:1px solid var(--id-border); background:var(--id-bg); color:var(--id-muted); font-size:${typographyScale.bodySm.fontSize}; font-weight:${fontWeights.semibold}; letter-spacing:${letterSpacings.metadata}; }
.id-scope-kind[data-kind="write"] { border-color:color-mix(in oklch, ${axisMain.warning} 55%, transparent); background:color-mix(in oklch, ${axisMain.warning} 14%, transparent); color:var(--id-text); }
.id-scope[data-kind="write"] > .id-icon { color:color-mix(in oklch, ${axisMain.warning} 70%, var(--id-text)); }
.id-organizations { list-style:none; padding:0; margin-block:${s(4)}; display:grid; gap:${s(3)}; }
.id-organizations > li { display:grid; grid-template-columns:auto 1fr; gap:${s(1)} ${s(3)}; padding:${s(4)}; border:1px solid var(--id-border); border-radius:${r.md}; background:var(--id-bg); }
.id-organizations > li > .id-icon { grid-row:span 2; margin-block-start:${s(1)}; color:var(--id-muted); }
:focus-visible { outline:2px solid var(--id-accent); outline-offset:3px; }
.id-surface ul { list-style:none; padding:0; }
.id-surface li { overflow-wrap:anywhere; }
.muted { color:var(--id-muted); font-size:${typographyScale.bodyMd.fontSize}; }
.code,.id-surface code { font-family:inherit; font-size:${typographyScale.bodySm.fontSize}; color:var(--id-muted); overflow-wrap:anywhere; font-variant-numeric:${typographyScale.numericId.fontVariantNumeric ?? 'tabular-nums'}; }
.actions { display:flex; gap:${s(3)}; margin-block:${s(6)}; }
.actions > * { flex:1; }
.id-footer a + a { margin-inline-start:${s(4)}; }
.id-surface summary,.id-footer summary { min-height:${s(8)}; cursor:pointer; }
.id-footer a,.id-surface a:not(.id-primary):not(.id-secondary) { display:inline-flex; align-items:center; min-height:${s(8)}; }
.id-surface pre { font-family:inherit; white-space:pre-wrap; overflow-wrap:anywhere; }
.id-qr { width:${s(60)}; max-width:100%; height:auto; margin-block:${s(4)}; border:1px solid var(--id-border); border-radius:${r.md}; background:${n.bgWhite}; padding:${s(3)}; }
.id-surface input[type="checkbox"] { width:${s(6)}; height:${s(6)}; vertical-align:middle; accent-color:var(--id-accent); }
[hidden] { display:none!important; }
@media(max-width:40rem) {
  .id-page { padding:${s(8)} ${s(4)}; }
  .id-context strong { display:block; margin-block-start:${s(1)}; font-weight:${fontWeights.semibold}; }
  .id-surface { padding:${s(6)}; }
  .id-canvas[data-state="login"] .id-surface { padding:${s(8)} ${s(6)} ${s(7)}; border-radius:${r.lg}; }
  .id-canvas[data-state="login"] .id-title { font-size:${typographyScale.surfaceHeroTitle.mobileFontSize}; }
  .id-brand { margin-block-end:${s(6)}; }
  .id-actions,.actions { flex-direction:column; }
  .id-actions > *,.actions > * { flex:none; }
}
@media(prefers-reduced-motion:reduce) { *,*::before,*::after { animation:none!important; transition:none!important; scroll-behavior:auto!important; } }
`
}
