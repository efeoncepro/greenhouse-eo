/**
 * TASK-2051 — «Para leer con calma» v2 cards (approved by the operator on 2026-10-24, canvas version 93; direction in
 * docs/ui/visual-directions/TASK-2051-blog-portada-v3/README.md § «Tarjetas v2», boards and generator in
 * tarjetas-v2-2026-10-24.tar.gz).
 *
 * The frozen Portada-v3/Movil-v3 canvases still carry the v1 rail. This module is the approved replacement, applied by
 * bind-canvas.cjs as a deviation to BOTH the reference and the bound template (so the equivalence test keeps proving the
 * rest of the page, and the PHP parity test proves this markup): one card template for every format, fed by data.
 *
 * - CSS: the approved card CSS with its classes renamed to `rc-*` (the canvas `.card`, `.kick`… rules of the v1 rail
 *   never reach it). `.rc-m` is the mobile scale.
 * - TEMPLATE: one `<a role="listitem">` per card; the format icon, the badge icon and the stat icon are chosen by flags
 *   (`c.fArt`, `c.bNew`, `c.sClock`…), never by raw markup in the data.
 * - FIXTURE(blob): the canvas cards expressed as that data contract, including the webinar ticket and the podcast wave
 *   (format examples: production renders them as soon as an eo_event or a `podcast` post exists).
 * - LOGIC: the liquid hover. `spot` writes the pointer position and tilt as CSS custom properties; the runtime keeps
 *   them across its once-a-second repaint (dc-runtime syncAttrs never rewrites an unchanged rendered `style`).
 */

const RAIL_ASSETS = {
  railV2Aeo: { id: 'dae3f8f9e60eae4eab21680355f6335e', file: 'dae3f8f9e60eae4eab21680355f6335e.webp' },
  railV2Dash: { id: '8cc10c839384b07e6822181200792b6b', file: '8cc10c839384b07e6822181200792b6b.webp' },
  railV2Cw: { id: 'd98e07c31b5fa2a3c131a0a7a1ca9c15', file: 'd98e07c31b5fa2a3c131a0a7a1ca9c15.webp' },
  railV2Guide: { id: 'ee50540e7240619c9ec1751d60dd70e9', file: 'ee50540e7240619c9ec1751d60dd70e9.webp' },
  railV2Author: { id: 'd3d48225885eb50f1d69665335810842', file: 'd3d48225885eb50f1d69665335810842.png' },
  clientAnam: { id: '2cce1669273f30a90970f8d7c349a38b', file: '2cce1669273f30a90970f8d7c349a38b.svg' },
  efeonceLogoNegative: { id: '16d30f9195bc78c7a14cd088bfbf957e', file: '16d30f9195bc78c7a14cd088bfbf957e.svg' },
  thinkLogo: { id: '17c7c1422f73e2de74221416d7741218', file: '17c7c1422f73e2de74221416d7741218.svg' },
}

const CSS = `.rail{scroll-padding-left:max(0px,calc((100% - 1280px)/2))}
.rc{position:relative;flex:none;scroll-snap-align:start;width:440px;height:600px;border-radius:32px;overflow:hidden;display:flex;flex-direction:column;text-decoration:none;color:inherit;transition:transform 300ms cubic-bezier(0.2,0,0,1),box-shadow 300ms cubic-bezier(0.2,0,0,1)}
.rc--navy{background:#001a33;color:#ffffff}
.rc--blue{background:#023c70;color:#ffffff}
.rc--ink{background:#091951;color:#ffffff}
.rc--paper{background:#ffffff;color:#023c70;box-shadow:inset 0 0 0 1px rgba(2,60,112,.12)}
.rc__b{display:flex;flex-direction:column;flex:1;min-height:0;padding:26px 30px 24px}
.rc--type .rc__b{padding:34px 34px 26px}
.rc-kick{display:flex;align-items:center;gap:10px;font-size:13px;font-weight:500;letter-spacing:.01em;opacity:.86}
.rc-kick b{font-weight:600}
.rc-kick__ic{display:grid;place-items:center;width:30px;height:30px;border-radius:50%;flex:none;background:color-mix(in srgb,var(--tc) 24%,transparent);color:color-mix(in srgb,var(--tc) 55%,#ffffff)}
.rc--paper .rc-kick__ic{background:color-mix(in srgb,var(--tc) 13%,transparent);color:var(--tc)}
.rc-kick__ic svg{width:16px;height:16px}
.rc-kick--glass{position:absolute;top:20px;left:20px;z-index:3;height:40px;padding:0 16px 0 5px;border-radius:999px;background:rgba(0,26,51,.5);backdrop-filter:blur(14px) saturate(140%);-webkit-backdrop-filter:blur(14px) saturate(140%);box-shadow:inset 0 0 0 1px rgba(255,255,255,.12);opacity:1;color:#ffffff}
.rc--photo{justify-content:flex-end}
.rc__bg{position:absolute;inset:0;z-index:0;overflow:hidden}
.rc__bg img{display:block;width:100%;height:100%;object-fit:cover;transition:transform 900ms cubic-bezier(0.2,0,0,1)}
.rc__scrim{position:absolute;inset:0;z-index:1;background:linear-gradient(to top,var(--bg) 0%,var(--bg) 30%,color-mix(in srgb,var(--bg) 82%,transparent) 46%,color-mix(in srgb,var(--bg) 30%,transparent) 64%,transparent 80%)}
.rc--photo .rc__b{position:relative;z-index:2;flex:none;padding:0 30px 24px}
.rc--photo .rc-ttl{margin-top:0;font-size:30px}
.rc--photo .rc-ft{margin-top:22px;border-top-color:rgba(255,255,255,.18)}
.rc-kick{flex-wrap:wrap;row-gap:8px}
.rc-bdg{position:relative;display:inline-flex;align-items:center;gap:7px;height:30px;padding:0 13px 0 4px;border-radius:999px;overflow:hidden;background:var(--bc);color:#001a33;font-size:11.5px;font-weight:800;letter-spacing:.07em;text-transform:uppercase;white-space:nowrap;box-shadow:0 8px 22px -6px color-mix(in srgb,var(--bc) 70%,transparent),inset 0 1px 0 rgba(255,255,255,.45)}
.rc-bdg__i{display:grid;place-items:center;width:23px;height:23px;flex:none;border-radius:50%;background:#001a33;color:var(--bc)}
.rc-bdg__i svg{width:14px;height:14px}
.rc-bdg__i svg [fill="#ffffff"]{fill:#001a33;opacity:.0}
.rc-bdg::after{content:"";position:absolute;inset:0;background:linear-gradient(105deg,transparent 30%,rgba(255,255,255,.55) 45%,transparent 60%);transform:translateX(-120%);animation:rc-glint 4.2s cubic-bezier(0.22,1,0.36,1) infinite}
@keyframes rc-glint{0%,62%{transform:translateX(-120%)}100%{transform:translateX(120%)}}
.rc-bdg--free,.rc-bdg--upd{background:#ffffff;color:#001a33;box-shadow:0 8px 22px -8px rgba(0,0,0,.45),inset 0 0 0 1px rgba(255,255,255,.6)}
.rc-bdg--free .rc-bdg__i,.rc-bdg--upd .rc-bdg__i{background:#001a33;color:#ffffff}
.rc--paper .rc-bdg--free,.rc--paper .rc-bdg--upd{background:#023c70;color:#ffffff;box-shadow:0 8px 22px -8px rgba(2,60,112,.55)}
.rc--paper .rc-bdg--free .rc-bdg__i,.rc--paper .rc-bdg--upd .rc-bdg__i{background:#ffffff;color:#023c70}
.rc-bdg__i--live i{width:8px;height:8px;border-radius:50%;background:var(--bc);animation:rc-ping 1.8s cubic-bezier(0.22,1,0.36,1) infinite}
.rc-bdgrow{display:flex;margin:0 0 14px}
.rc--type .rc-bdgrow{margin-top:18px}
@media (prefers-reduced-motion:reduce){.rc-bdg::after{animation:none;display:none}}
.rc-ttl{margin:14px 0 0;font-size:28px;line-height:1.04;font-weight:740;letter-spacing:-.03em;text-wrap:balance;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}
.rc-dek{margin:12px 0 0;font-size:14.5px;line-height:1.5;opacity:.72;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.rc-big{margin:auto 0 0;font-size:176px;line-height:.8;font-weight:760;letter-spacing:-.07em;font-variant-numeric:tabular-nums}
.rc-big--q{font-size:92px;line-height:.86;letter-spacing:-.055em}
.rc-client{display:flex;flex-direction:column;gap:12px;margin:auto 0 10px}
.rc-client__l{font-size:12px;font-weight:600;letter-spacing:.14em;text-transform:uppercase;opacity:.6}
.rc-client__logo{display:block;width:300px;height:auto;transform-origin:left bottom;transition:transform 900ms var(--ease,cubic-bezier(0.22,1,0.36,1))}
.rc-ft{display:flex;align-items:center;justify-content:space-between;gap:14px;margin-top:auto;padding-top:18px;border-top:1px solid rgba(207,228,250,.16)}
.rc--paper .rc-ft{border-top-color:rgba(2,60,112,.12)}
.rc--type .rc-ft{margin-top:22px}
.rc-who{display:flex;align-items:center;gap:11px;min-width:0}
.rc-who__av{display:flex}
.rc-who__av img,.rc-who__av span{width:34px;height:34px;border-radius:50%;object-fit:cover;flex:none;box-shadow:0 0 0 2px var(--ring,#001a33)}
.rc-who__av span{display:grid;place-items:center;background:#e6edf3;color:#023c70;font:700 12px 'Bricolage Grotesque',sans-serif}
.rc-who__av > * + *{margin-left:-10px}
.rc-who__n{display:flex;flex-direction:column;align-items:flex-start;min-width:0;line-height:1.25}
.rc-who__n b{font-size:14px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.rc-who__n span{font-size:12.5px;opacity:.64;white-space:nowrap}
.rc-who__logo{height:17px;width:auto;display:block}
.rc-who__logo--l{height:26px}
.rc-who__logo--s{height:20px}
.rc-who__n .rc-who__logo + span{margin-top:6px}
.rc-who__n .rc-who__logo--s + span{margin-top:5px}
.rc-stat{display:inline-flex;align-items:center;gap:7px;flex:none;height:32px;padding:0 12px;border-radius:999px;background:rgba(207,228,250,.1);font-size:13px;font-weight:600;font-variant-numeric:tabular-nums;white-space:nowrap}
.rc--paper .rc-stat{background:rgba(2,60,112,.06)}
.rc-stat svg{width:15px;height:15px;opacity:.8}
.rc:focus-visible{outline:2px solid #023c70;outline-offset:4px}
.rc{--tc:#36c8bf;--tcl:color-mix(in srgb,var(--tc) 58%,#ffffff);--ease:cubic-bezier(0.22,1,0.36,1);--px:50%;--py:30%;--rx:0deg;--ry:0deg;transform:perspective(1100px) rotateX(var(--rx)) rotateY(var(--ry));transition:transform 900ms var(--ease),box-shadow 900ms var(--ease)}
.rc--paper{--tcl:var(--tc)}
.rc--type .rc-kick{padding-right:54px}
.rc::before{content:"";position:absolute;inset:0;z-index:2;border-radius:inherit;pointer-events:none;opacity:0;background:radial-gradient(520px circle at var(--px) var(--py),color-mix(in srgb,var(--tc) 34%,transparent),transparent 60%);mix-blend-mode:screen;transition:opacity 700ms var(--ease)}
.rc--paper::before{mix-blend-mode:multiply;background:radial-gradient(520px circle at var(--px) var(--py),color-mix(in srgb,var(--tc) 12%,transparent),transparent 62%)}
.rc::after{content:"";position:absolute;inset:0;z-index:5;border-radius:inherit;pointer-events:none;padding:1.5px;opacity:0;background:radial-gradient(360px circle at var(--px) var(--py),var(--tcl),transparent 70%);-webkit-mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0);-webkit-mask-composite:xor;mask-composite:exclude;transition:opacity 700ms var(--ease)}
.rc-cta{position:absolute;top:20px;right:20px;z-index:6;display:inline-flex;align-items:center;height:42px;padding:0 13px;border-radius:999px;background:rgba(255,255,255,.14);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);color:#ffffff;font-size:14px;font-weight:600;white-space:nowrap;transition:background-color 700ms var(--ease),color 500ms var(--ease),padding 700ms var(--ease)}
.rc--paper .rc-cta{background:rgba(2,60,112,.07);color:#023c70}
.rc-cta__l{display:grid;grid-template-columns:0fr;transition:grid-template-columns 700ms var(--ease)}
.rc-cta__l > span{overflow:hidden;opacity:0;transition:opacity 400ms var(--ease)}
.rc-cta svg{width:16px;height:16px;flex:none;transition:transform 700ms var(--ease)}
.rc-kick__ic{position:relative;overflow:hidden;isolation:isolate;transition:color 500ms var(--ease)}
.rc-kick__ic::before{content:"";position:absolute;inset:0;z-index:-1;border-radius:50%;background:var(--tcl);transform:scale(0);transition:transform 700ms var(--ease)}
.rc--paper .rc-kick__ic::before{background:var(--tc)}
.rc-big{transition:color 700ms var(--ease),transform 900ms var(--ease);transform-origin:left bottom}
.rc-ttl{transition:transform 900ms var(--ease)}
.rc-who__av img{transition:box-shadow 600ms var(--ease)}
.rc-stat{transition:background-color 600ms var(--ease),color 600ms var(--ease)}
.rc__bg img{transition:transform 1400ms var(--ease),filter 900ms var(--ease)}
@keyframes rc-ping{0%{box-shadow:0 0 0 0 rgba(110,194,7,.55)}100%{box-shadow:0 0 0 12px rgba(110,194,7,0)}}
@media (hover:hover){
.rc:hover{transform:perspective(1100px) rotateX(var(--rx)) rotateY(var(--ry)) translateY(-10px);transition:transform 260ms var(--ease),box-shadow 900ms var(--ease);box-shadow:0 40px 70px -24px color-mix(in srgb,var(--tc) 55%,transparent),0 18px 40px rgba(0,26,51,.18)}
.rc:hover::before,.rc:hover::after{opacity:1}
.rc:hover .rc-cta{background:var(--tcl);color:#001a33;padding:0 14px 0 18px}
.rc:hover.rc--paper .rc-cta{background:var(--tc);color:#ffffff}
.rc:hover .rc-cta__l{grid-template-columns:1fr}
.rc:hover .rc-cta__l > span{opacity:1;transition-delay:120ms}
.rc:hover .rc-cta svg{transform:translateX(5px)}
.rc:hover .rc-kick__ic{color:#001a33}
.rc:hover.rc--paper .rc-kick__ic{color:#ffffff}
.rc:hover .rc-kick__ic::before{transform:scale(1)}
.rc:hover .rc-big{color:var(--tcl);transform:translateY(-6px)}
.rc:hover .rc-client__logo{transform:translateY(-6px) scale(1.03)}
.rc:hover .rc-ttl{transform:translateY(-4px)}
.rc:hover .rc-who__av img{box-shadow:0 0 0 2px var(--tcl)}
.rc:hover .rc-stat{background:var(--tcl);color:#001a33}
.rc:hover.rc--paper .rc-stat{background:var(--tc);color:#ffffff}
.rc:hover .rc__bg img{transform:scale(1.08);filter:saturate(1.12) brightness(1.04)}
}
.rc-m{scroll-padding-inline:16px}
.rc-m .rc{width:304px;height:540px;border-radius:26px}
.rc-m .rc__b{padding:22px 22px 20px}
.rc-m .rc--type .rc__b{padding:26px 24px 20px}
.rc-m .rc-ttl{font-size:23px}
.rc-m .rc-dek{font-size:13.5px}
.rc-m .rc-big{font-size:124px}
.rc-m .rc-big--q{font-size:66px}
.rc-m .rc-client__logo{width:208px}
.rc-m .rc-stat{height:30px;padding:0 10px;font-size:12px}
.rc-m .rc-who__av img,.rc-m .rc-who__av span{width:30px;height:30px}
.rc-m .rc-who__n b{font-size:13px}
@media (prefers-reduced-motion:reduce){.rc,.rc:hover{transform:none!important}.rc:hover .rc-big,.rc:hover .rc-ttl,.rc:hover .rc__bg img,.rc:hover .rc-cta svg,.rc:hover .rc-client__logo{transform:none!important}.rc-bdg__i--live i{animation:none}}
.rc--event{background:radial-gradient(130% 70% at 100% 0%,color-mix(in srgb,var(--tc) 26%,transparent),transparent 58%),radial-gradient(90% 60% at 0% 100%,color-mix(in srgb,#0375db 22%,transparent),transparent 60%),#001a33;color:#ffffff}
.rc-ev{display:flex;align-items:stretch;gap:18px;margin:auto 0 0}
.rc-ev .rc-ev__d{margin:0;font-size:168px;line-height:.78}
.rc-ev__side{display:flex;flex-direction:column;justify-content:space-between;gap:10px;padding:4px 0 6px 18px;border-left:1px solid rgba(207,228,250,.2)}
.rc-ev__m{font-size:34px;line-height:.9;font-weight:760;letter-spacing:.01em;text-transform:uppercase}
.rc-ev__t{display:flex;flex-direction:column;gap:3px;font-size:13px;line-height:1.35}
.rc-ev__t b{font-weight:600}
.rc-ev__t span{opacity:.66}
.rc-ev__c{align-self:flex-start;display:inline-flex;align-items:center;height:26px;padding:0 10px;border-radius:999px;background:color-mix(in srgb,var(--tc) 18%,transparent);color:color-mix(in srgb,var(--tc) 55%,#ffffff);font-size:12px;font-weight:600;font-variant-numeric:tabular-nums}
.rc-ev__cut{position:relative;display:block;flex:none;height:0;margin:22px -34px 0;border-top:1.5px dashed rgba(207,228,250,.24)}
.rc-ev__cut::before,.rc-ev__cut::after{content:"";position:absolute;top:-12px;width:24px;height:24px;border-radius:50%;background:#f7f8f6}
.rc-ev__cut::before{left:-12px}
.rc-ev__cut::after{right:-12px}
.rc .rc-ft.rc-ft--stub{border-top:0;margin-top:0;padding-top:18px}
.rc-wave{display:flex;align-items:center;gap:3px;height:104px;margin:auto -34px 0}
.rc-wave i{flex:1 1 0;min-width:0;width:6px;border-radius:3px;background:currentColor;opacity:.9;transform-origin:center}
.rc-wave i:nth-child(3n){opacity:.45}
@keyframes rc-wave{0%,100%{transform:scaleY(.32)}50%{transform:scaleY(1.12)}}
@keyframes rc-lit{0%,6%{background-color:var(--tc);opacity:1}30%,100%{background-color:currentColor}}
.rc-wave i:nth-child(1){animation-delay:0ms,-3000ms}
.rc-wave i:nth-child(2){animation-delay:-60ms,-2960ms}
.rc-wave i:nth-child(3){animation-delay:-120ms,-2920ms}
.rc-wave i:nth-child(4){animation-delay:-180ms,-2880ms}
.rc-wave i:nth-child(5){animation-delay:-240ms,-2840ms}
.rc-wave i:nth-child(6){animation-delay:-300ms,-2800ms}
.rc-wave i:nth-child(7){animation-delay:-360ms,-2760ms}
.rc-wave i:nth-child(8){animation-delay:-420ms,-2720ms}
.rc-wave i:nth-child(9){animation-delay:-480ms,-2680ms}
.rc-wave i:nth-child(10){animation-delay:-540ms,-2640ms}
.rc-wave i:nth-child(11){animation-delay:-600ms,-2600ms}
.rc-wave i:nth-child(12){animation-delay:-660ms,-2560ms}
.rc-wave i:nth-child(13){animation-delay:-720ms,-2520ms}
.rc-wave i:nth-child(14){animation-delay:-780ms,-2480ms}
.rc-wave i:nth-child(15){animation-delay:-840ms,-2440ms}
.rc-wave i:nth-child(16){animation-delay:-900ms,-2400ms}
.rc-wave i:nth-child(17){animation-delay:-960ms,-2360ms}
.rc-wave i:nth-child(18){animation-delay:-1020ms,-2320ms}
.rc-wave i:nth-child(19){animation-delay:-1080ms,-2280ms}
.rc-wave i:nth-child(20){animation-delay:-1140ms,-2240ms}
.rc-wave i:nth-child(21){animation-delay:-1200ms,-2200ms}
.rc-wave i:nth-child(22){animation-delay:-1260ms,-2160ms}
.rc-wave i:nth-child(23){animation-delay:-1320ms,-2120ms}
.rc-wave i:nth-child(24){animation-delay:-1380ms,-2080ms}
.rc-wave i:nth-child(25){animation-delay:-1440ms,-2040ms}
.rc-wave i:nth-child(26){animation-delay:-1500ms,-2000ms}
.rc-wave i:nth-child(27){animation-delay:-1560ms,-1960ms}
.rc-wave i:nth-child(28){animation-delay:-1620ms,-1920ms}
.rc-wave i:nth-child(29){animation-delay:-1680ms,-1880ms}
.rc-wave i:nth-child(30){animation-delay:-1740ms,-1840ms}
.rc-wave i:nth-child(31){animation-delay:-1800ms,-1800ms}
.rc-wave i:nth-child(32){animation-delay:-1860ms,-1760ms}
.rc-wave i:nth-child(33){animation-delay:-1920ms,-1720ms}
.rc-wave i:nth-child(34){animation-delay:-1980ms,-1680ms}
.rc-wave i:nth-child(35){animation-delay:-2040ms,-1640ms}
.rc-wave i:nth-child(36){animation-delay:-2100ms,-1600ms}
.rc-wave i:nth-child(37){animation-delay:-2160ms,-1560ms}
.rc-wave i:nth-child(38){animation-delay:-2220ms,-1520ms}
.rc-wave i:nth-child(39){animation-delay:-2280ms,-1480ms}
.rc-wave i:nth-child(40){animation-delay:-2340ms,-1440ms}
.rc-wave i:nth-child(41){animation-delay:-2400ms,-1400ms}
.rc-wave i:nth-child(42){animation-delay:-2460ms,-1360ms}
.rc-wave i:nth-child(43){animation-delay:-2520ms,-1320ms}
.rc-wave i:nth-child(44){animation-delay:-2580ms,-1280ms}
.rc-wave i:nth-child(45){animation-delay:-2640ms,-1240ms}
.rc-wave i:nth-child(46){animation-delay:-2700ms,-1200ms}
.rc-wave i:nth-child(47){animation-delay:-2760ms,-1160ms}
.rc-wave i:nth-child(48){animation-delay:-2820ms,-1120ms}
.rc-wave i:nth-child(49){animation-delay:-2880ms,-1080ms}
.rc-wave i:nth-child(50){animation-delay:-2940ms,-1040ms}
.rc-wave i:nth-child(51){animation-delay:-3000ms,-1000ms}
.rc-wave i:nth-child(52){animation-delay:-3060ms,-960ms}
.rc-wave i:nth-child(53){animation-delay:-3120ms,-920ms}
.rc-wave i:nth-child(54){animation-delay:-3180ms,-880ms}
.rc-wave i:nth-child(55){animation-delay:-3240ms,-840ms}
.rc-wave i:nth-child(56){animation-delay:-3300ms,-800ms}
.rc-wave i:nth-child(57){animation-delay:-3360ms,-760ms}
.rc-wave i:nth-child(58){animation-delay:-3420ms,-720ms}
.rc-wave i:nth-child(59){animation-delay:-3480ms,-680ms}
.rc-wave i:nth-child(60){animation-delay:-3540ms,-640ms}
.rc-wave i:nth-child(61){animation-delay:-3600ms,-600ms}
.rc-wave i:nth-child(62){animation-delay:-3660ms,-560ms}
.rc-wave i:nth-child(63){animation-delay:-3720ms,-520ms}
.rc-wave i:nth-child(64){animation-delay:-3780ms,-480ms}
@media (hover:hover){.rc:hover .rc-wave i{animation-name:rc-wave,rc-lit;animation-duration:1.1s,3s;animation-timing-function:cubic-bezier(0.45,0,0.55,1),linear;animation-iteration-count:infinite,infinite}}
.rc-m .rc-ev .rc-ev__d{font-size:118px}
.rc-m .rc-ev__m{font-size:26px}
.rc-m .rc-ev__side{padding-left:14px}
.rc-m .rc-ev__t{font-size:12px}
.rc-m .rc-ev__cut{margin:18px -24px 0}
.rc-m .rc-wave{height:76px;margin-left:-24px;margin-right:-24px;gap:2px}
@media (prefers-reduced-motion:reduce){.rc-wave i{animation:none!important}}`

const SVG = inner => `<svg viewBox="0 0 24 24" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${inner}</g></svg>`

// Format glyphs (canvas FMT_ICON), keyed by the flag the data sets.
const FORMAT_ICONS = {
  fArt: '<path d="M7 3.5h7l4 4V20a.5.5 0 0 1-.5.5h-10.5a.5.5 0 0 1-.5-.5V4a.5.5 0 0 1 .5-.5Z"/><path d="M14 3.5V8h4M9 12h6M9 15.5h6"/>',
  fCase: '<rect x="3.5" y="7" width="17" height="12.5" rx="2"/><path d="M9 7V5.5a1.5 1.5 0 0 1 1.5-1.5h3A1.5 1.5 0 0 1 15 5.5V7M3.5 12.5h17"/>',
  fGuide: '<path d="M4 5.5a1.5 1.5 0 0 1 1.5-1.5H11v16H5.5A1.5 1.5 0 0 1 4 18.5Z"/><path d="M11 4h7.5A1.5 1.5 0 0 1 20 5.5v13a1.5 1.5 0 0 1-1.5 1.5H11"/><path d="m13.5 12.5 2.5 2.5 2.5-2.5M16 8v7"/>',
  fDiag: '<path d="M4.5 16a7.5 7.5 0 1 1 15 0"/><path d="m12 16 3.5-4.5"/><circle cx="12" cy="16" r="1.2"/>',
  fEvent: '<rect x="3.5" y="6" width="12" height="12" rx="2.5"/><path d="m15.5 10.5 5-3v9l-5-3"/>',
  fPod: '<rect x="9" y="3.5" width="6" height="11" rx="3"/><path d="M5.5 11.5a6.5 6.5 0 0 0 13 0M12 18v2.5"/>',
}

// Badge glyphs (canvas BI): filled, two-tone. `live` is a pulsing dot instead of a glyph.
const BADGE_ICONS = {
  bSeats: '<path d="M3 8a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v2.2a2 2 0 0 0 0 3.6V16a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-2.2a2 2 0 0 0 0-3.6Z"/><path opacity=".45" fill="#ffffff" d="M14.5 6.5h1v11h-1z"/>',
  bWait: '<path d="M6 3h12v3.2a4 4 0 0 1-1.6 3.2L13.2 12l3.2 2.6A4 4 0 0 1 18 17.8V21H6v-3.2a4 4 0 0 1 1.6-3.2L10.8 12 7.6 9.4A4 4 0 0 1 6 6.2Z"/><path opacity=".5" fill="#ffffff" d="M9 18.5c0-1 1.3-2 3-2.8 1.7.8 3 1.8 3 2.8Z"/>',
  bTop: '<path d="M12 1.8c.8 3.4-1 5.3-2.6 7.1C8 10.5 6.4 12.3 6.4 15.2a5.6 5.6 0 0 0 11.2 0c0-3.1-1.6-4.9-2.8-6.2-.4 1.9-1.4 3-2.7 3.5.8-3.7-.1-8.1-.1-10.7Z"/><path opacity=".5" fill="#ffffff" d="M12 21c-1.8 0-3-1.3-3-2.9 0-1.9 1.7-2.8 2.4-4.4.6 1.2 1.9 1.8 2.6 2.7.6.7 1 1.2 1 1.9 0 1.5-1.3 2.7-3 2.7Z"/>',
  bTrend: '<path d="M2.6 17.2 9 10.8l3.6 3.6 5.2-5.2" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/><path d="M14.4 5.6h6.4V12Z"/>',
  bNew: '<path d="M11 1.8 13.3 8l6.2 2.3-6.2 2.3L11 18.8l-2.3-6.2-6.2-2.3L8.7 8Z"/><path opacity=".6" d="M18.5 14.5l1 2.5 2.5 1-2.5 1-1 2.5-1-2.5-2.5-1 2.5-1Z"/>',
  bUpd: '<path d="M20 11a8 8 0 1 1-2.4-5.7" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"/><path d="M21 2.6V9h-6.4Z"/>',
  bFree: '<path d="M3.5 10h17v3h-17zM5 13h14v7.5a.5.5 0 0 1-.5.5h-13a.5.5 0 0 1-.5-.5Z"/><path opacity=".5" fill="#ffffff" d="M11 10h2v11h-2z"/><path d="M12 9.6C10 9.6 7.2 8.8 7.2 6.6c0-1.5 1.2-2.4 2.4-2.4 1.6 0 2.4 2 2.4 5.4 0-3.4.8-5.4 2.4-5.4 1.2 0 2.4.9 2.4 2.4 0 2.2-2.8 3-4.8 3Z"/>',
}

// Footer stat glyphs (canvas ICON).
const STAT_ICONS = {
  sClock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
  sDoc: '<path d="M7 3.5h7l4 4V20a.5.5 0 0 1-.5.5h-10.5a.5.5 0 0 1-.5-.5V4a.5.5 0 0 1 .5-.5Z"/><path d="M14 3.5V8h4"/><path d="M12 11v6"/><path d="m9.5 14.5 2.5 2.5 2.5-2.5"/>',
  sSpark: '<path d="M12 3.5v4M12 16.5v4M3.5 12h4M16.5 12h4M6 6l2.6 2.6M15.4 15.4 18 18M18 6l-2.6 2.6M8.6 15.4 6 18"/>',
  sCal: '<rect x="4" y="5.5" width="16" height="14.5" rx="2.5"/><path d="M4 10h16M8.5 3.5v4M15.5 3.5v4"/>',
  sPlay: '<path d="M8 5.5v13l10.5-6.5Z"/>',
}

// Podcast wave, edge to edge: 64 bars under a voice envelope (deterministic, canvas formula).
const WAVE = '<span class="rc-wave" aria-hidden="true">' + Array.from({ length: 64 }, (_, i) => `<i style="height: ${Math.round(14 + 78 * Math.abs(Math.sin(i * 0.47) * Math.sin(i * 0.13 + 0.6)) ** 0.8)}%;"></i>`).join('') + '</span>'

const pick = (flags, wrap) => Object.entries(flags).map(([k, inner]) => `<sc-if value="{{ c.${k} }}" hint-placeholder-val="{{ false }}">${wrap(inner)}</sc-if>`).join('')

const ARROW = '<svg viewBox="0 0 24 24" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="m13 6 6 6-6 6"/></g></svg>'
const KICK_BODY = `<span class="rc-kick__ic">${pick(FORMAT_ICONS, SVG)}</span><span><b>{{ c.fmt }}</b> · {{ c.topic }}</span>`
const BADGE = `<sc-if value="{{ c.hasBadge }}" hint-placeholder-val="{{ false }}"><span class="rc-bdgrow"><span class="rc-bdg rc-bdg--{{ c.badge }}" style="--bc: {{ c.badgeColor }};"><span class="rc-bdg__i"><sc-if value="{{ c.bLive }}" hint-placeholder-val="{{ false }}"><span class="rc-bdg__i--live"><i></i></span></sc-if>${pick(BADGE_ICONS, inner => `<svg viewBox="0 0 24 24" aria-hidden="true"><g fill="currentColor">${inner}</g></svg>`)}</span><span>{{ c.badgeLabel }}</span></span></span></sc-if>`

/** One card template for every format. Desktop and tablet use it as is; mobile adds `.rc-m` on the scroller. */
const CARD = `<a href="{{ c.href }}" role="listitem" class="lnk {{ c.cls }}" style="{{ c.style }}" onMouseMove="{{ spot }}" onMouseLeave="{{ unspot }}"><span class="rc-cta"><span class="rc-cta__l"><span>{{ c.verb }}</span></span>${ARROW}</span><sc-if value="{{ c.isPhoto }}" hint-placeholder-val="{{ true }}"><span class="rc__bg"><img src="{{ c.img }}" alt="" style="object-position: {{ c.pos }};" loading="lazy" decoding="async"></span><span class="rc__scrim"></span><span class="rc-kick rc-kick--glass">${KICK_BODY}</span></sc-if><span class="rc__b"><sc-if value="{{ c.isType }}" hint-placeholder-val="{{ false }}"><span class="rc-kick">${KICK_BODY}</span></sc-if><sc-if value="{{ c.isClient }}" hint-placeholder-val="{{ false }}"><span class="rc-client"><span class="rc-client__l">Cliente</span><img class="rc-client__logo" src="{{ c.clientImg }}" alt="{{ c.clientAlt }}"></span></sc-if><sc-if value="{{ c.isQuestion }}" hint-placeholder-val="{{ false }}"><span class="idea rc-big rc-big--q">{{ c.big }}</span></sc-if><sc-if value="{{ c.isEvent }}" hint-placeholder-val="{{ false }}"><span class="rc-ev"><span class="idea rc-big rc-ev__d">{{ c.evDay }}</span><span class="rc-ev__side"><span class="idea rc-ev__m">{{ c.evMonth }}</span><span class="rc-ev__t"><b>{{ c.evWhen }}</b><span>{{ c.evWhere }}</span></span><span class="rc-ev__c">{{ c.evLeft }}</span></span></span></sc-if><sc-if value="{{ c.isWave }}" hint-placeholder-val="{{ false }}">${WAVE}</sc-if>${BADGE}<span class="idea rc-ttl">{{ c.title }}</span><sc-if value="{{ c.hasDek }}" hint-placeholder-val="{{ true }}"><span class="rc-dek">{{ c.dek }}</span></sc-if><sc-if value="{{ c.isEvent }}" hint-placeholder-val="{{ false }}"><span class="rc-ev__cut" aria-hidden="true"></span></sc-if><span class="{{ c.ftCls }}"><sc-if value="{{ c.byPerson }}" hint-placeholder-val="{{ true }}"><span class="rc-who"><span class="rc-who__av"><sc-if value="{{ c.hasPhoto }}" hint-placeholder-val="{{ true }}"><img src="{{ c.authorPhoto }}" alt="" width="34" height="34" loading="lazy" decoding="async"></sc-if><sc-if value="{{ c.noPhoto }}" hint-placeholder-val="{{ false }}"><span>{{ c.initials }}</span></sc-if></span><span class="rc-who__n"><b>{{ c.author }}</b><span>{{ c.when }}</span></span></span></sc-if><sc-if value="{{ c.byBrand }}" hint-placeholder-val="{{ false }}"><span class="rc-who"><span class="rc-who__n"><img class="rc-who__logo {{ c.brandCls }}" src="{{ c.brandImg }}" alt="{{ c.brandAlt }}"><span>{{ c.brandLine }}</span></span></span></sc-if><span class="rc-stat">${pick(STAT_ICONS, SVG)}{{ c.stat }}</span></span></span></a>`

const TEMPLATE = `<sc-for list="{{ rail }}" as="c" hint-placeholder-count="8">${CARD}</sc-for>`

const KINDS = { isClient: false, isQuestion: false, isEvent: false, isWave: false, evDay: '', evMonth: '', evWhen: '', evWhere: '', evLeft: '', ftCls: 'rc-ft' }
const PHOTO = { ...KINDS, isPhoto: true, isType: false }
const TYPE = { ...KINDS, isPhoto: false, isType: true }
const NO_FLAGS = Object.fromEntries([...Object.keys(FORMAT_ICONS), ...Object.keys(BADGE_ICONS), 'bLive', ...Object.keys(STAT_ICONS)].map(k => [k, false]))

const BADGES = {
  live: ['En vivo', '#6ec207', 'bLive'],
  seats: ['Últimos cupos', '#e86bd0', 'bSeats'],
  wait: ['Lista de espera', '#e86bd0', 'bWait'],
  new: ['Nuevo', '#36c8bf', 'bNew'],
  upd: ['Actualizado', '#cfe4fa', 'bUpd'],
  free: ['Gratis', '#ffffff', 'bFree'],
  top: ['Más leído', '#ff6500', 'bTop'],
  trend: ['Tendencia', '#ffb070', 'bTrend'],
}

function card(base, extra) {
  const c = { ...NO_FLAGS, ...base, ...extra }

  c.hasBadge = Boolean(c.badge)
  if (c.badge) {
    const [label, color, flag] = BADGES[c.badge]

    Object.assign(c, { badgeLabel: label, badgeColor: color, [flag]: true })
  } else Object.assign(c, { badge: '', badgeLabel: '', badgeColor: '' })

  return c
}

const person = (author, photo, when) => ({ byPerson: true, byBrand: false, author, authorPhoto: photo, hasPhoto: true, noPhoto: false, initials: '', when, brandImg: '', brandAlt: '', brandLine: '', brandCls: '' })
const brand = (img, alt, line, cls) => ({ byPerson: false, byBrand: true, author: '', authorPhoto: '', hasPhoto: false, noPhoto: false, initials: '', when: '', brandImg: img, brandAlt: alt, brandLine: line, brandCls: cls })

/** The canvas cards (version 93) as the data contract. `blob(key)` resolves a source asset. */
function FIXTURE(blob) {
  const julio = blob('railV2Author')

  return [
    card(PHOTO, { href: '#', cls: 'rc rc--photo rc--navy', style: '--bg: #001a33; --tc: #0375db; --ring: #001a33;', img: blob('railV2Aeo'), pos: '64% center', fArt: true, fmt: 'Artículo', topic: 'AEO', verb: 'Leer', badge: 'top', title: 'El fin de la web «solo para humanos»', hasDek: true, dek: 'Qué es la web agéntica, cómo cambia el desarrollo de sitios y qué necesita una web para ser entendida y operada por personas y agentes de IA.', ...person('Julio Reyes', julio, '18 jul 2026'), sClock: true, stat: '21 min' }),
    card(TYPE, { href: '#', cls: 'rc rc--type rc--paper', style: '--tc: #8e1b82; --ring: #ffffff;', img: '', pos: 'center', isClient: true, clientImg: blob('clientAnam'), clientAlt: 'ANAM', fCase: true, fmt: 'Caso', topic: 'HubSpot', verb: 'Leer el caso', badge: 'upd', title: 'Lo que aprendimos diseñando su Customer Agent', hasDek: true, dek: 'Qué necesita un Customer Agent de HubSpot para responder sin perder contexto, inventar compromisos ni reemplazar decisiones humanas.', ...person('Julio Reyes', julio, 'Actualizado 20 oct 2026'), sClock: true, stat: '18 min' }),
    card(PHOTO, { href: '#', cls: 'rc rc--photo rc--blue', style: '--bg: #023c70; --tc: #e86bd0; --ring: #023c70;', img: blob('railV2Dash'), pos: '24% center', fCase: true, fmt: 'Caso', topic: 'HubSpot', verb: 'Leer el caso', badge: 'trend', title: 'Un dashboard no arregla un proceso comercial', hasDek: true, dek: 'El trabajo real comenzó antes de los paneles: entender el proceso, contrastarlo con el CRM y separar KPI, diagnóstico y piloto.', ...person('Julio Reyes', julio, '17 jul 2026'), sClock: true, stat: '13 min' }),
    card(PHOTO, { href: '#', cls: 'rc rc--photo rc--navy', style: '--bg: #001a33; --tc: #ff6500; --ring: #001a33;', img: blob('railV2Cw'), pos: 'center', fArt: true, fmt: 'Artículo', topic: 'Diseño', verb: 'Leer', title: 'Creative Workflows: escalar la creatividad sin automatizar el criterio', hasDek: true, dek: 'Un Creative Workflow convierte decisiones creativas humanas en un sistema que escala sin perder el criterio que las hace buenas.', ...person('Julio Reyes', julio, '15 jul 2026'), sClock: true, stat: '23 min' }),
    card(PHOTO, { href: '#', cls: 'rc rc--photo rc--blue', style: '--bg: #023c70; --tc: #0375db; --ring: #023c70;', img: blob('railV2Guide'), pos: '80% center', fGuide: true, fmt: 'Guía descargable', topic: 'AEO', verb: 'Descargar', badge: 'free', title: 'Web agéntica: tu sitio, listo para la IA', hasDek: true, dek: 'La guía para que tu web se pueda leer, usar y recomendar por un agente de IA.', ...brand(blob('thinkLogo'), 'Efeonce Think', 'Una guía de Efeonce Think', 'rc-who__logo--l'), sDoc: true, stat: 'PDF' }),
    card(TYPE, { href: '#', cls: 'rc rc--type rc--ink', style: '--tc: #0375db; --ring: #091951;', img: '', pos: 'center', isQuestion: true, big: '¿Te ve la IA?', fDiag: true, fmt: 'Diagnóstico', topic: 'AEO', verb: 'Medir mi marca', badge: 'free', title: 'Efeonce AEO Assessment', hasDek: true, dek: 'Mide cómo aparece tu marca en ChatGPT, Gemini y Perplexity.', ...brand(blob('efeonceAeoLogo'), 'Efeonce AEO', 'Herramienta de Efeonce', 'rc-who__logo--s'), sSpark: true, stat: '3 motores de IA' }),
    // Format examples of the canvas: the webinar ticket and the podcast wave (production fills them from eo_event and
    // the `podcast` format; neither has content yet).
    card(TYPE, { href: '#', cls: 'rc rc--type rc--navy rc--event', style: '--tc: #36c8bf; --ring: #001a33;', img: '', pos: 'center', isEvent: true, evDay: '12', evMonth: 'Nov', evWhen: 'Jueves · 10:00', evWhere: 'Hora de Chile · En línea', evLeft: 'Faltan 19 días', ftCls: 'rc-ft rc-ft--stub', fEvent: true, fmt: 'Webinar', topic: 'AEO', verb: 'Reservar', badge: 'seats', title: 'Cómo aparecer en las respuestas de ChatGPT', hasDek: true, dek: 'Qué miran los motores de respuesta, cómo medir tu visibilidad y qué cambiar en tu sitio esta misma semana.', ...person('Julio Reyes', julio, 'y el equipo de Efeonce'), sCal: true, stat: '45 min · Gratis' }),
    card(TYPE, { href: '#', cls: 'rc rc--type rc--paper', style: '--tc: #36c8bf; --ring: #ffffff;', img: '', pos: 'center', isWave: true, fPod: true, fmt: 'Podcast', topic: 'Loop Marketing', verb: 'Escuchar', badge: 'new', title: 'Ep. 1 · Loop Marketing en una empresa real', hasDek: true, dek: 'Cómo se ve el marco Express, Tailor, Amplify y Evolve cuando lo aplicas en tu equipo.', ...person('Julio Reyes', julio, 'Conduce'), sPlay: true, stat: '34 min' }),
  ]
}

// Liquid hover (canvas logic, version 93). `reduce` is read here: the mobile board logic has none of its own.
const LOGIC = `spot: (e) => { const el = e.currentTarget; const r = el.getBoundingClientRect(); const x = (e.clientX - r.left) / r.width; const y = (e.clientY - r.top) / r.height; el.style.setProperty('--px', (x * 100).toFixed(1) + '%'); el.style.setProperty('--py', (y * 100).toFixed(1) + '%'); if (!(typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches)) { el.style.setProperty('--ry', ((x - 0.5) * 7).toFixed(2) + 'deg'); el.style.setProperty('--rx', ((0.5 - y) * 7).toFixed(2) + 'deg'); } },
      unspot: (e) => { const el = e.currentTarget; el.style.setProperty('--rx', '0deg'); el.style.setProperty('--ry', '0deg'); },`

module.exports = { CSS, TEMPLATE, FIXTURE, LOGIC, RAIL_ASSETS }
