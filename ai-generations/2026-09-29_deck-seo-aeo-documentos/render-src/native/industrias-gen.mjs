import { readFileSync, writeFileSync } from 'node:fs'
const I = [
  ['01', 'Banca y finanzas', '¿Qué banco tiene la mejor cuenta para pymes?'],
  ['02', 'Seguros', '¿Qué seguro de auto cubre más por menos?'],
  ['03', 'Retail', '¿Dónde compro buenas zapatillas de running?'],
  ['04', 'Manufactura', '¿Qué proveedor de envases cumple la norma?'],
  ['05', 'Servicios profesionales', '¿Qué estudio contable me recomiendas?'],
  ['06', 'SaaS', '¿Qué CRM me sirve para una pyme B2B?']
]
const icon = i => readFileSync(new URL(`icon${i}.svg`, import.meta.url), 'utf8')
const card = (n, name, q, i) => {
  const hero = i === 0
  return `<div style="position: relative; box-sizing: border-box; height: 256px; ${hero ? 'transform: translateZ(90px) translateY(-18px);' : ''} padding: 22px 24px 20px; border-radius: 22px; display: flex; flex-direction: column; background: ${hero ? 'linear-gradient(170deg, #134066 0%, #0a2640 100%)' : 'linear-gradient(170deg, #10304b 0%, #081c30 100%)'}; box-shadow: ${hero ? '0 0 0 2px rgba(114, 222, 216, 0.85), 0 40px 90px rgba(0, 6, 16, 0.7), 0 0 90px rgba(114, 222, 216, 0.4)' : '0 0 0 1px rgba(255, 255, 255, 0.16), 0 20px 40px rgba(0, 6, 16, 0.55)'}">
<div style="font-weight: 600; font-size: 15px; letter-spacing: 0.14em; color: #72ded8">${n}</div>
<div style="margin-top: 8px; font-family: 'Bricolage Grotesque', sans-serif; font-weight: 760; font-size: 36px; line-height: 1.02; letter-spacing: -0.025em; color: #ffffff">${name}</div>
<div style="margin-top: auto; display: flex; align-items: flex-start; gap: 10px; padding: 12px 14px; border-radius: 14px; background: rgba(255, 255, 255, 0.08); box-shadow: inset 0 0 0 1px rgba(207, 228, 250, 0.18)">
<span style="flex-shrink: 0; display: block; width: 26px; height: 26px; margin-top: 1px">${icon(i)}</span>
<span style="font-weight: 400; font-size: 17px; line-height: 1.3; color: #e6edf3">${q}</span></div>
</div>`
}
const body = `<div style="width: 1920px; height: 1080px; box-sizing: border-box; position: relative; overflow: hidden; background: #091951; color: #ffffff; font-family: 'Poppins', system-ui, sans-serif">

<svg viewBox="0 0 1920 1080" width="1920" height="1080" style="position: absolute; left: 0; top: 0" aria-hidden="true">
<defs>
<radialGradient id="inh1" cx="1290" cy="420" r="900" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#72ded8" stop-opacity="0.30"/><stop offset="0.35" stop-color="#1f9e94" stop-opacity="0.11"/><stop offset="1" stop-color="#1f9e94" stop-opacity="0"/></radialGradient>
<linearGradient id="inh2" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#000000" stop-opacity="0"/><stop offset="1" stop-color="#000814" stop-opacity="0.55"/></linearGradient>
<radialGradient id="inpf" cx="1290" cy="905" r="520" gradientUnits="userSpaceOnUse" gradientTransform="translate(0 760.2) scale(1 0.16)"><stop offset="0" stop-color="#72ded8" stop-opacity="0.30"/><stop offset="0.7" stop-color="#1f9e94" stop-opacity="0.06"/><stop offset="1" stop-color="#1f9e94" stop-opacity="0"/></radialGradient>
<filter id="inpfg" x="-20%" y="-50%" width="140%" height="200%"><feGaussianBlur stdDeviation="9"/></filter>
</defs>
<rect width="1920" height="1080" fill="url(#inh1)"/>
<rect y="778" width="1920" height="302" fill="url(#inh2)"/>
<ellipse cx="1290" cy="905" rx="520" ry="74" fill="url(#inpf)"/>
<ellipse cx="1290" cy="905" rx="520" ry="74" fill="none" stroke="#72ded8" stroke-opacity="0.55" stroke-width="3"/>
<path d="M 810 933 A 520 74 0 0 0 1652 958" fill="none" stroke="#1f9e94" stroke-width="14" opacity="0.45" filter="url(#inpfg)"/>
<path d="M 810 933 A 520 74 0 0 0 1652 958" fill="none" stroke="#1f9e94" stroke-width="6" stroke-linecap="round"/>
<defs><linearGradient id="inbm" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#72ded8" stop-opacity="0.35"/><stop offset="1" stop-color="#72ded8" stop-opacity="0"/></linearGradient><filter id="inbg"><feGaussianBlur stdDeviation="14"/></filter></defs>
<g filter="url(#inbg)"><rect x="930" y="160" width="60" height="760" fill="url(#inbm)"/><rect x="1265" y="120" width="44" height="800" fill="url(#inbm)" opacity="0.7"/><rect x="1590" y="180" width="36" height="740" fill="url(#inbm)" opacity="0.6"/></g>
</svg>

<div style="position: absolute; left: 0; top: 0; width: 1920px; height: 1080px; perspective: 2200px; perspective-origin: 1290px 440px">
<div style="position: absolute; left: 800px; top: 240px; width: 950px; display: grid; grid-template-columns: repeat(3, 1fr); gap: 18px; transform-style: preserve-3d; transform: rotateY(-10deg) rotateX(5deg); transform-origin: 0% 100%">
${I.map((r, i) => card(r[0], r[1], r[2], i)).join('\n')}
</div>
</div>

<img src="@SV360@" alt="Efeonce | SV360" style="position: absolute; left: 140px; top: 44px; display: block; width: 353.9px; height: 40px">
<div style="position: absolute; left: 140px; top: 130px; font-weight: 500; font-size: 16px; letter-spacing: 0.14em; text-transform: uppercase; color: #cfe4fa">Industrias</div>
<div style="position: absolute; left: 140px; top: 196px; width: 600px; display: flex; align-items: center; gap: 16px; font-weight: 300; font-size: 40px; line-height: 1.2; color: #cfe4fa"><span style="display: inline-block; flex-shrink: 0; width: 18px; height: 18px; border: 3px solid #0375db; border-radius: 50%"></span><span>¿Conocemos tu industria?</span></div>
<div style="position: absolute; left: 132px; top: 280px; font-family: 'Bricolage Grotesque', system-ui, sans-serif; font-weight: 760; font-size: 128px; line-height: 0.95; letter-spacing: -0.045em; color: #ffffff">Por<br>dentro<span style="display: inline-block; width: 0.2em; height: 0.2em; margin-left: 0.04em; border-radius: 50%; background: #0375db"></span></div>
<p style="position: absolute; left: 140px; top: 560px; width: 540px; margin: 0; font-weight: 300; font-size: 26px; line-height: 1.45; color: #e6edf3">Seis industrias donde tu comprador ya le pregunta a la IA antes de llamarte. Nosotros sabemos <b style="font-weight: 600; color: #ffffff">qué pregunta</b>.</p>

<img src="@URL@" alt="efeoncepro.com" style="position: absolute; left: 140px; bottom: 62px; display: block; width: 160px; height: 31.5px">
</div>`
writeFileSync(new URL('body.html', import.meta.url), body)
const A = '/Users/jreye/Documents/greenhouse-eo/node_modules/@efeoncepro/axis-brand-assets/assets'
const HEAD = '<!doctype html><html><head><meta charset="utf-8"><link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,200..800&family=Poppins:wght@300;400;500;600;700&display=swap" rel="stylesheet"><style>body{margin:0;background:#091951}</style></head><body>'
writeFileSync(new URL('../Industrias.html', import.meta.url), HEAD + body.replace('@SV360@', `file://${A}/sv360-lockup-negative.svg`).replace('@URL@', `file://${A}/url-bubble-baked-dark.svg`) + '</body></html>')
const dcTop = readFileSync('/private/tmp/claude-501/-Users-jreye-Documents-greenhouse-eo/7f34a149-441d-4150-acaf-87be132deb6d/scratchpad/canvas-seo/project/SEO-Servicios.dc.html', 'utf8')
const head = dcTop.slice(0, dcTop.indexOf('</helmet>') + 9).replace(/<title>[^<]*<\/title>/, '<title>Industrias · ¿Conocemos tu industria? Por dentro.</title>')
const tail = dcTop.slice(dcTop.indexOf('</x-dc>'))
const dc = head + '\n' + body.replace('@SV360@', '/_blob/e61f97cb4adb580e876fed1898b607a0').replace('@URL@', '/_blob/dc12dab8c85e07910a289336a3ca90a9') + '\n' + tail
for (const s of ['', '-Brochure', '-Propuesta']) writeFileSync(`/private/tmp/claude-501/-Users-jreye-Documents-greenhouse-eo/7f34a149-441d-4150-acaf-87be132deb6d/scratchpad/canvas-seo/project/Industrias${s}.dc.html`, dc)
