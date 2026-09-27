// Voz de la línea gráfica (§4 del manual): eyebrow · pregunta (Poppins Light con anillo teal) · respuesta
// (Bricolage con su esfera, ≥3× la pregunta, 1–3 palabras) · evidencia (Poppins, una palabra en negrita).
// El logo de Efeonce va arriba, a 500 px, para recordación. Mismo sistema en todas las portadas.
export const QPX = 40, APX = 124, EPX = 28
export const makeVoice = ({ LOGO, ring, TEAL, SOFT, M, answerHtml, W = 1920 }) => {
  const eyebrowP = (t, css) => `<p style="${css}margin:0;font:500 22px/1.2 Pop;letter-spacing:.24em;text-transform:uppercase;color:${SOFT};z-index:3">${t}</p>`
  const qP = (t, css) => `<p style="${css}margin:0;font:300 ${QPX}px/1.2 Pop;color:#F4F6F8;white-space:nowrap;z-index:3">${ring}${t}</p>`
  const aP = (lead, a, css, sel) => `<p ${sel ? 'data-sel ' : ''}style="${css}margin:0;font:760 ${APX}px Bric;line-height:.95;letter-spacing:-.035em;color:#fff;white-space:nowrap;z-index:3">${lead}${answerHtml(a, TEAL)}</p>`
  const evP = (t, css) => `<p style="${css}margin:0;font:400 ${EPX}px/1.3 Pop;color:#F4F6F8;z-index:3">${t}</p>`
  // Columna a la izquierda (portadas con foto u órbita a la derecha).
  const column = ({ top, eyebrow, q, lead = '', a, ev, gap = 34, sel = false, logoW = 500 }) => {
    // Con selección, el marco necesita aire arriba (pregunta) y abajo (etiqueta del colaborador).
    const lines = lead ? lead.split('<br>').length : 1, aTop = top + 300 + (sel ? 28 : 0), evTop = aTop + Math.round(lines * APX * 0.95) + gap
    const at = (y, x = M) => `position:absolute;left:${x}px;top:${y}px;`
    return `<img src="${LOGO}" alt="Efeonce" style="position:absolute;left:${M}px;top:${top}px;width:${logoW}px;height:auto;z-index:3">` +
      eyebrowP(eyebrow, at(top + 190)) + qP(q, at(top + 238)) + aP(lead, a, at(aTop, M - 4), sel) + (ev ? evP(ev, at(evTop)) : '')
  }
  // Eje central (portada del amanecer).
  const centered = ({ top, eyebrow, q, a, ev, logoW = 480 }) => {
    const row = (y, html) => `<div style="position:absolute;left:0;top:${y}px;width:${W}px;display:flex;justify-content:center;z-index:3">${html}</div>`
    return row(top, `<img src="${LOGO}" alt="Efeonce" style="width:${logoW}px;height:auto">`) +
      row(top + 150, eyebrowP(eyebrow, '')) + row(top + 194, qP(a ? q : q, '')) + row(top + 250, aP('', a, 'text-align:center;')) +
      (ev ? row(top + 250 + Math.round(APX * 0.95) + 22, evP(ev, 'text-align:center;')) : '')
  }
  return { column, centered }
}
export const COPY = {
  brochure: { eyebrow: 'Brochure · Servicios 2026', q: '¿Qué hace Efeonce?', a: 'Crecer', ev: '<b style="font-weight:600">Cinco</b> líneas de servicio:<br>Growth · Brand · Engine · Voice · Revenue' },
  proposal: client => ({ eyebrow: 'Propuesta comercial · Octubre 2026', q: '¿Cómo crecemos en 2027?', a: 'Con foco', ev: `Preparada para <b style="font-weight:600">${client}</b> · Confidencial` })
}
