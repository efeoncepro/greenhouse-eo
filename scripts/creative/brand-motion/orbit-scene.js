// Efeonce «La órbita» — escena de motion del logo (browser). Un solo modelo determinístico: `render(t)` fija cada
// atributo del SVG para el tiempo t (ms). Lo usan el render de video (cuadro a cuadro) y, a futuro, el runtime web.
//
// Idea: la órbita de la línea gráfica ES la órbita del isotipo vista de frente. El anillo de la línea se inclina hasta la
// elipse medida del isotipo oficial (órbita 3D coherente: la parte trasera pasa detrás de la nave y del planeta, la
// delantera corta la nave), la esfera se vuelve el planeta, la nave se revela y la cámara lleva el isotipo a la «o» del
// logotipo. La apertura recorre el camino inverso y termina en la línea.
//
// Geometría: todo en unidades del isotipo oficial (viewBox 727,4 × 516,12). El cuadro final es el SVG oficial.

/* global window, document */
;

(function () {
  const NS = 'http://www.w3.org/2000/svg'
  const TAU = Math.PI * 2
  const clamp = x => Math.max(0, Math.min(1, x))
  const lerp = (a, b, t) => a + (b - a) * t

  // cubic-bezier(x1,y1,x2,y2) → y(x), resuelto por Newton-Raphson + bisección.
  const bezier = (x1, y1, x2, y2) => {
    const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx
    const cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by
    const sx = t => ((ax * t + bx) * t + cx) * t
    const sy = t => ((ay * t + by) * t + cy) * t
    const dx = t => (3 * ax * t + 2 * bx) * t + cx

    return x => {
      if (x <= 0) return 0
      if (x >= 1) return 1
      let t = x

      for (let i = 0; i < 8; i++) {
        const e = sx(t) - x
        const d = dx(t)

        if (Math.abs(e) < 1e-7) return sy(t)
        if (Math.abs(d) < 1e-6) break
        t -= e / d
      }

      let lo = 0, hi = 1

      t = x

      for (let i = 0; i < 40; i++) {
        const v = sx(t)

        if (Math.abs(v - x) < 1e-7) break
        if (v < x) lo = t
        else hi = t
        t = (lo + hi) / 2
      }

      return sy(t)
    }
  }

  // Resorte casi crítico para asentar: sobrepasa ≤ 1,5 % y vuelve una vez.
  const settle = x => {
    if (x <= 0) return 0
    if (x >= 1) return 1
    const z = 0.82, w = 11

    return 1 - Math.exp(-z * w * x) * (Math.cos(w * Math.sqrt(1 - z * z) * x) + (z / Math.sqrt(1 - z * z)) * Math.sin(w * Math.sqrt(1 - z * z) * x))
  }

  const EASE = {}

  const hexToRgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16) / 255)
  const srgbToLin = c => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
  const linToSrgb = c => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055)

  // Mezcla de color en OKLab: el paso de teal a blanco no pasa por un gris sucio.
  const toOklab = hex => {
    const [r, g, b] = hexToRgb(hex).map(srgbToLin)
    const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b)
    const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b)
    const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b)

    return [0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s, 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s, 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s]
  }

  const fromOklab = ([L, A, B]) => {
    const l = (L + 0.3963377774 * A + 0.2158037573 * B) ** 3
    const m = (L - 0.1055613458 * A - 0.0638541728 * B) ** 3
    const s = (L - 0.0894841775 * A - 1.291485548 * B) ** 3
    const rgb = [4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s, -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s, -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s]

    return '#' + rgb.map(c => Math.round(clamp(linToSrgb(clamp(c))) * 255).toString(16).padStart(2, '0')).join('')
  }

  const mixColor = (h1, h2, t) => {
    const a = toOklab(h1), b = toOklab(h2)

    return fromOklab(a.map((v, i) => lerp(v, b[i], clamp(t))))
  }

  const el = (tag, attrs = {}, parent) => {
    const e = document.createElementNS(NS, tag)

    for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v)
    if (parent) parent.appendChild(e)

    return e
  }

  const set = (e, attrs) => {
    for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, typeof v === 'number' ? +v.toFixed(3) : v)
  }

  // ── Ajuste de elipse (cónica por mínimos cuadrados) ───────────────────────────────────────────────────
  const fitEllipse = P => {
    const M = Array.from({ length: 5 }, () => Array(6).fill(0))

    for (const [x, y] of P) {
      const r = [x * x, x * y, y * y, x, y]

      for (let i = 0; i < 5; i++) {
        for (let j = 0; j < 5; j++) M[i][j] += r[i] * r[j]
        M[i][5] += r[i]
      }
    }

    for (let c = 0; c < 5; c++) {
      let p = c

      for (let r = c + 1; r < 5; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r
      ;[M[c], M[p]] = [M[p], M[c]]

      for (let r = 0; r < 5; r++) {
        if (r === c) continue
        const k = M[r][c] / M[c][c]

        for (let j = c; j < 6; j++) M[r][j] -= k * M[c][j]
      }
    }

    const [A, B, C, D, E] = M.map((r, i) => r[5] / r[i])
    const den = B * B - 4 * A * C
    const cx = (2 * C * D - B * E) / den, cy = (2 * A * E - B * D) / den
    const num = 2 * (A * E * E + C * D * D - B * D * E - den)
    const s = Math.sqrt((A - C) ** 2 + B * B)
    const r1 = -Math.sqrt(num * (A + C + s)) / den, r2 = -Math.sqrt(num * (A + C - s)) / den
    const th = B === 0 ? (A < C ? 0 : Math.PI / 2) : Math.atan((C - A - s) / B)
    // r1 va a lo largo de th; el eje mayor define psi.
    const major = r1 >= r2 ? { a: r1, b: r2, psi: th } : { a: r2, b: r1, psi: th - Math.PI / 2 }

    return { cx, cy, ...major }
  }

  const S = { ready: false }

  window.orbitScene = {
    init(cfg) {
      S.cfg = cfg
      const { W, H } = cfg
      const root = document.getElementById('stage')

      root.setAttribute('viewBox', `0 0 ${W} ${H}`)
      root.setAttribute('width', W)
      root.setAttribute('height', H)
      const defs = el('defs', {}, root)

      S.defs = defs

      // Piezas oficiales del isotipo, sin estilos (el color lo decide la escena).
      const iso = new DOMParser().parseFromString(cfg.isotypeSvg, 'image/svg+xml')
      const shapes = [...iso.querySelectorAll('path,circle')]

      const clone = (src, parent, extra = {}) => {
        const c = el(src.tagName, {}, parent)

        for (const a of ['d', 'cx', 'cy', 'r']) if (src.getAttribute(a)) c.setAttribute(a, src.getAttribute(a))
        for (const [k, v] of Object.entries(extra)) c.setAttribute(k, v)

        return c
      }

      // Orden oficial: 0 órbita izquierda (trasera) · 1 órbita derecha (trasera) · 2 planeta · 3 órbita delantera + aleta · 4 nave.
      S.src = { backL: shapes[0], backR: shapes[1], planet: shapes[2], front: shapes[3], ship: shapes[4] }

      // Medición: una capa oculta con las piezas para isPointInFill/getTotalLength.
      const probe = el('g', { opacity: 0 }, root)

      S.probe = {}
      for (const [k, v] of Object.entries(S.src)) S.probe[k] = clone(v, probe)
      this.measure()
      probe.remove()

      // ── Capas ──
      S.cam = el('g', {}, root) // isotipo: transform de cámara (héroe → «o»)
      S.halo = el('circle', { fill: 'url(#halo)' }, S.cam)
      const halo = el('radialGradient', { id: 'halo', gradientUnits: 'userSpaceOnUse' }, defs)

      S.haloStops = cfg.tokens.orbit.halo.map(s => el('stop', { offset: s.offset, 'stop-color': cfg.colors.accent, 'stop-opacity': 0 }, halo))
      S.haloGrad = halo
      const BIG = { maskUnits: 'userSpaceOnUse', x: -4000, y: -4000, width: 9000, height: 9000 }
      const white = m => el('rect', { x: -4000, y: -4000, width: 9000, height: 9000, fill: '#fff' }, m)
      const E = S.E
      const fo = [], fi = []

      for (let i = 0; i <= S.N; i++) {
        const j = i % S.N, phi = (j / S.N) * TAU

        fo.push(this.point(phi, S.kout[j], E.a, E.b))
        fi.push(this.point(phi, S.kin[j], E.a, E.b))
      }

      const annulus = pathOf(fo) + pathOf(fi.reverse())
      const gap = S.gapShip

      // Dilatación con el aire oficial medido: los cortes de la nave y del anillo salen de las formas oficiales.
      const df = el('filter', { id: 'dilateGap', filterUnits: 'userSpaceOnUse', x: -160, y: -160, width: 1050, height: 840 }, defs)

      el('feMorphology', { in: 'SourceGraphic', operator: 'dilate', radius: gap }, df)

      // La pieza delantera oficial trae anillo + aleta. La aleta es sólo lo que queda FUERA del anillo en la zona de la cola
      // (abajo a la izquierda, antes de la mitad de la nave): viaja con la nave. Todo lo demás es anillo y queda fijo.
      const tailX = S.shipAxis.x0 + (S.shipAxis.x1 - S.shipAxis.x0) * 0.42
      const fm = el('mask', { id: 'finOnly', ...BIG }, defs)
      const finClip = el('clipPath', { id: 'tailZone', clipPathUnits: 'userSpaceOnUse' }, defs)

      el('rect', { x: -4000, y: E.cy, width: 4000 + tailX, height: 4000 }, finClip)
      const finG = el('g', { 'clip-path': 'url(#tailZone)' }, fm)

      el('rect', { x: -4000, y: -4000, width: 9000, height: 9000, fill: '#fff' }, finG)
      el('path', { d: annulus, fill: '#000', stroke: '#000', 'stroke-width': gap * 2, 'stroke-linejoin': 'round', 'fill-rule': 'evenodd' }, finG)
      const ro = el('mask', { id: 'ringOnly', ...BIG }, defs)

      white(ro)
      const roG = el('g', { 'clip-path': 'url(#tailZone)' }, ro)

      el('rect', { x: -4000, y: -4000, width: 9000, height: 9000, fill: '#000' }, roG)
      el('path', { d: annulus, fill: '#fff', stroke: '#fff', 'stroke-width': gap * 2, 'stroke-linejoin': 'round', 'fill-rule': 'evenodd' }, roG)

      // Anillo del giro (paramétrico, sólo mientras gira).
      const pmk = el('mask', { id: 'paramMask', ...BIG }, defs)

      white(pmk)
      S.planetHoleP = el('circle', { fill: '#000', r: 0 }, pmk)
      S.ringParam = el('path', { 'fill-rule': 'evenodd', mask: 'url(#paramMask)' }, S.cam)
      // Copia de la forma (sin máscara ni opacidad) para cortar el casco con el mismo anillo que se ve.
      S.ringParamShape = el('path', { id: 'ringParamShape', 'fill-rule': 'evenodd' }, defs)

      // Anillo oficial SIN huecos: unión de las tres piezas oficiales con cierre morfológico (radio > medio corte). Es el
      // anillo oficial en todo su recorrido salvo los puentes donde estaban los cortes; los cortes vuelven a nacer de
      // máscaras con el aire medido (planeta y nave), así que el cuadro de llegada coincide con el dibujo oficial.
      const closeR = Math.max(...S.cross.map(c => c.d)) / 2 + 2
      const cf = el('filter', { id: 'closeRing', filterUnits: 'userSpaceOnUse', x: -160, y: -160, width: 1050, height: 840 }, defs)

      el('feMorphology', { in: 'SourceGraphic', operator: 'dilate', radius: closeR, result: 'd' }, cf)
      el('feMorphology', { in: 'd', operator: 'erode', radius: closeR }, cf)
      const ringC = el('g', { id: 'ringClosed', filter: 'url(#closeRing)' }, defs)

      clone(S.src.backL, ringC, { fill: 'currentColor' })
      clone(S.src.backR, ringC, { fill: 'currentColor' })
      clone(S.src.front, ringC, { fill: 'currentColor', mask: 'url(#ringOnly)' })

      // Sectores: la parte delantera del anillo (la de la pieza oficial delantera) y la trasera.
      const frontPoly = []
      let startJ = S.front.findIndex((f, q) => f && !S.front[(q - 1 + S.N) % S.N])

      if (startJ < 0) startJ = 0
      frontPoly.push([E.cx, E.cy])

      for (let q = 0; q < S.N; q++) {
        const w = (startJ + q) % S.N

        if (!S.front[w]) break
        frontPoly.push(this.point((w / S.N) * TAU, 4, E.a, E.b))
      }

      const fsm = el('mask', { id: 'frontSector', ...BIG }, defs)

      el('path', { d: pathOf(frontPoly), fill: '#fff' }, fsm)
      const bsm = el('mask', { id: 'backSector', ...BIG }, defs)

      white(bsm)
      el('path', { d: pathOf(frontPoly), fill: '#000' }, bsm)

      // Trasero: se abre donde está el planeta y donde pasa la nave (silueta oficial dilatada, en movimiento).
      const bk = el('mask', { id: 'backMask', ...BIG }, defs)

      white(bk)
      S.planetHole = el('circle', { fill: '#000', r: 0 }, bk)
      S.shipHole = el('g', { filter: 'url(#dilateGap)' }, bk)
      clone(S.src.ship, S.shipHole, { fill: '#000' })
      clone(S.src.front, S.shipHole, { fill: '#000', mask: 'url(#finOnly)' })
      S.backG = el('g', { mask: 'url(#backMask)' }, S.cam)
      const backInner = el('g', { mask: 'url(#backSector)' }, S.backG)

      S.backUse = el('use', { href: '#ringClosed' }, backInner)

      // Nave: casco oficial (lo corta el anillo delantero dilatado) + aleta (viaja con la nave, sin corte).
      const sm = el('mask', { id: 'shipMask', ...BIG }, defs)

      white(sm)
      const cut = el('g', { filter: 'url(#dilateGap)' }, sm)
      const nx = el('mask', { id: 'notCross', ...BIG }, defs)

      white(nx)
      for (const c of S.cross) el('circle', { cx: c.x, cy: c.y, r: S.gapShip * 3 + 34, fill: '#000' }, nx)
      const cutNX = el('g', { mask: 'url(#notCross)' }, cut)
      const cutIn = el('g', { mask: 'url(#frontSector)' }, cutNX)

      S.cutClosed = el('use', { href: '#ringClosed', color: '#000' }, cutIn)
      S.cutParam = el('use', { href: '#ringParamShape' }, cutIn)
      S.shipOuter = el('g', {}, S.cam)
      S.shipInner = el('g', {}, S.shipOuter)
      S.hullWrap = el('g', { mask: 'url(#shipMask)' }, S.shipOuter)
      S.hullInner = el('g', {}, S.hullWrap)
      S.offShip = clone(S.src.ship, S.hullInner)
      S.offFin = clone(S.src.front, S.shipInner, { mask: 'url(#finOnly)' })
      // En las zonas de cruce la nave va por delante de TODO el anillo: el delantero también se abre con la nave dilatada.
      const crossR = S.gapShip * 3 + 34
      const xm = el('mask', { id: 'frontCut', ...BIG }, defs)

      white(xm)
      const xClip = el('clipPath', { id: 'crossZones', clipPathUnits: 'userSpaceOnUse' }, defs)

      for (const c of S.cross) el('circle', { cx: c.x, cy: c.y, r: crossR }, xClip)
      const xg = el('g', { 'clip-path': 'url(#crossZones)' }, xm)

      S.shipHoleFront = el('g', { filter: 'url(#dilateGap)' }, xg)
      clone(S.src.ship, S.shipHoleFront, { fill: '#000' })
      // El anillo del giro también se abre alrededor de la nave: en su sector trasero y en las zonas de cruce.
      S.shipHoleP = el('g', { filter: 'url(#dilateGap)' }, el('g', { mask: 'url(#backSector)' }, pmk))
      clone(S.src.ship, S.shipHoleP, { fill: '#000' })
      clone(S.src.front, S.shipHoleP, { fill: '#000', mask: 'url(#finOnly)' })
      S.shipHolePF = el('g', { filter: 'url(#dilateGap)' }, el('g', { 'clip-path': 'url(#crossZones)' }, pmk))
      clone(S.src.ship, S.shipHolePF, { fill: '#000' })
      S.frontOuter = el('g', { mask: 'url(#frontCut)' }, S.cam)
      S.frontG = el('g', { mask: 'url(#frontSector)' }, S.frontOuter)
      S.frontUse = el('use', { href: '#ringClosed' }, S.frontG)

      S.arc = el('path', { fill: 'none', 'stroke-linecap': 'round' }, S.cam)
      S.sphere = el('circle', {}, S.cam)
      // Isotipo oficial completo (sin máscaras): el estado final exacto.
      S.official = el('g', { opacity: 0 }, S.cam)
      for (const k of ['backL', 'backR', 'planet', 'front', 'ship']) clone(S.src[k], S.official)

      // Letras del logotipo (coordenadas del logo) y eslogan.
      S.logoG = el('g', {}, root)
      const logo = new DOMParser().parseFromString(cfg.logoSvg, 'image/svg+xml')
      const lp = [...logo.querySelectorAll('path,circle')]

      // Las 6 primeras formas son las letras e·f·e·n·c·e; el resto es el isotipo (×0,3358 del oficial).
      S.letters = lp.slice(0, 6).map(src => clone(src, S.logoG))
      const lmask = el('mask', { id: 'letterMask', maskUnits: 'userSpaceOnUse', x: -2000, y: -2000, width: 6000, height: 6000 }, defs)

      el('rect', { x: -2000, y: -2000, width: 6000, height: 6000, fill: '#fff' }, lmask)
      // El hueco de las letras es el isotipo MISMO en su posición de cada cuadro (dilatado): las letras nacen detrás de él.
      S.letterHole = el('g', {}, lmask)
      for (const k of ['backL', 'backR', 'planet', 'front', 'ship']) clone(S.src[k], S.letterHole, { fill: '#000', stroke: '#000', 'stroke-width': 26, 'stroke-linejoin': 'round' })
      S.logoG.setAttribute('mask', 'url(#letterMask)')
      const isoInLogo = lp.find(e => e.tagName === 'circle')

      S.isoToLogo = { s: +isoInLogo.getAttribute('r') / 61.83 }
      S.isoToLogo.tx = +isoInLogo.getAttribute('cx') - 363.7 * S.isoToLogo.s
      S.isoToLogo.ty = +isoInLogo.getAttribute('cy') - 61.83 * S.isoToLogo.s

      S.slogan = el('text', { 'text-anchor': 'middle', 'font-family': 'Poppins' }, root)

      for (const part of cfg.slogan.parts) {
        const sp = el('tspan', { 'font-weight': part.weight, 'font-style': part.italic ? 'italic' : 'normal' }, S.slogan)

        sp.textContent = part.text + (part === cfg.slogan.parts[cfg.slogan.parts.length - 1] ? '' : ' ')
        part.node = sp
      }

      this.layout()
      S.ready = true
    },

    // Mide la elipse media de la órbita oficial y el perfil de grosor (radios normalizados interior/exterior por ángulo).
    measure() {
      const P = S.probe
      const ring = [P.backL, P.backR, P.front]
      const svg = document.getElementById('stage')
      const pt = svg.createSVGPoint()

      const outline = (el, step = 0.5) => {
        const L = el.getTotalLength(), out = []

        for (let s = 0; s < L; s += step) {
          const q = el.getPointAtLength(s)

          out.push([q.x, q.y])
        }

        return out
      }

      // Elipse media: primero con las piezas traseras (anillo puro); luego suma los puntos de la delantera que caen en el
      // anillo (la delantera trae la aleta pegada y sesgaría el ajuste).
      const backPts = [...outline(P.backL), ...outline(P.backR)]
      let E = fitEllipse(backPts)

      S.E = E

      const norm = ([x, y]) => {
        const c = Math.cos(-E.psi), s = Math.sin(-E.psi), X = (x - E.cx) * c - (y - E.cy) * s, Y = (x - E.cx) * s + (y - E.cy) * c

        return Math.hypot(X / E.a, Y / E.b)
      }

      const frontPts = outline(P.front).filter(q => Math.abs(norm(q) - 1) < 0.12)

      E = fitEllipse([...backPts, ...frontPts])
      S.E = E

      const N = 720, K0 = 0.72, DK = 0.0015, NK = Math.round((1.28 - K0) / DK)
      const kin = new Array(N).fill(null), kout = new Array(N).fill(null), owner = new Array(N).fill(null)

      for (let i = 0; i < N; i++) {
        const phi = (i / N) * TAU
        const hits = []

        for (let q = 0; q <= NK; q++) {
          const [x, y] = this.point(phi, K0 + q * DK, E.a, E.b)

          pt.x = x
          pt.y = y
          hits.push(ring.findIndex(r => r.isPointInFill(pt)))
        }

        const runs = []
        let st = null

        hits.forEach((h, q) => {
          if (h >= 0 && st === null) st = q

          if ((h < 0 || q === hits.length - 1) && st !== null) {
            runs.push([st, h >= 0 ? q : q - 1])
            st = null
          }
        })
        const kAt = q => K0 + q * DK
        const cand = runs.filter(([a, b]) => kAt(a) < 1.1 && kAt(b) > 0.9)

        if (!cand.length) continue
        const [a, b] = cand.sort((r1, r2) => Math.abs((kAt(r1[0]) + kAt(r1[1])) / 2 - 1) - Math.abs((kAt(r2[0]) + kAt(r2[1])) / 2 - 1))[0]
        const count = [0, 0, 0]

        for (let q = a; q <= b; q++) count[hits[q]]++
        kin[i] = kAt(a)
        kout[i] = kAt(b)
        owner[i] = count.indexOf(Math.max(...count)) === 2 ? 'front' : 'back'
      }

      // La aleta: donde el grosor supera 1,45× la mediana local, no es anillo.
      const th = kin.map((v, i) => (v === null ? null : kout[i] - v))

      for (let i = 0; i < N; i++) {
        if (th[i] === null) continue
        const win = []

        for (let d = -40; d <= 40; d++) {
          const v = th[(i + d + N) % N]

          if (v !== null) win.push(v)
        }

        win.sort((x, y) => x - y)
        if (th[i] > win[Math.floor(win.length / 2)] * 1.22) kin[i] = kout[i] = null
      }

      // Bordes de hueco: las puntas oficiales son curvas estilizadas; el anillo del giro las ignora (±18°) y se interpola suave.
      // La exactitud la da el cruce a las piezas oficiales, no este perfil.
      const isNull = kin.map(v => v === null)

      for (let i = 0; i < N; i++) {
        if (!isNull[i]) continue

        for (let d = -10; d <= 10; d++) {
          const j = (i + d + N) % N

          kin[j] = kout[j] = null
        }
      }

      const rawKin = kin.slice(), rawKout = kout.slice()
      const gaps = []
      const start = kin.findIndex(v => v !== null)

      for (let s0 = 0; s0 < N; s0++) {
        const i = (start + s0) % N

        if (kin[i] !== null) continue
        let len = 0

        while (kin[(i + len) % N] === null) len++
        const a = (i - 1 + N) % N, b = (i + len) % N

        for (let q = 0; q < len; q++) {
          const t = (q + 1) / (len + 1), j = (i + q) % N
          const ts = t * t * (3 - 2 * t)

          kin[j] = lerp(kin[a], kin[b], ts)
          kout[j] = lerp(kout[a], kout[b], ts)
          owner[j] = owner[j] ?? (t < 0.5 ? owner[a] : owner[b])
        }

        gaps.push({ from: i, len })
        s0 += len - 1
      }

      // El anillo del giro usa un ajuste de Fourier (orden 4) sobre las muestras válidas, con descarte iterativo de
      // valores atípicos (la aleta, las puntas curvas): suave por construcción. La exactitud la da el cruce a lo oficial.
      const valid = rawKin.map(v => v !== null)

      const fourier = (vals) => {
        let use = vals.map((v, q) => valid[q])
        let coef = null

        for (let it = 0; it < 4; it++) {
          const n = 9, M = Array.from({ length: n }, () => Array(n + 1).fill(0))

          for (let q = 0; q < N; q++) {
            if (!use[q]) continue
            const phi = (q / N) * TAU
            const r = [1]

            for (let h = 1; h <= 4; h++) r.push(Math.cos(h * phi), Math.sin(h * phi))

            for (let a = 0; a < n; a++) {
              for (let b = 0; b < n; b++) M[a][b] += r[a] * r[b]
              M[a][n] += r[a] * vals[q]
            }
          }

          for (let c = 0; c < n; c++) {
            let pv = c

            for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[pv][c])) pv = r
            ;[M[c], M[pv]] = [M[pv], M[c]]

            for (let r = 0; r < n; r++) {
              if (r === c) continue
              const k = M[r][c] / M[c][c]

              for (let b = c; b <= n; b++) M[r][b] -= k * M[c][b]
            }
          }

          coef = M.map((row, q) => row[n] / row[q])

          const f = q => {
            const phi = (q / N) * TAU
            let v = coef[0]

            for (let h = 1; h <= 4; h++) v += coef[2 * h - 1] * Math.cos(h * phi) + coef[2 * h] * Math.sin(h * phi)

            return v
          }

          const res = vals.map((v, q) => (valid[q] ? v - f(q) : 0))
          const sd = Math.sqrt(res.reduce((acc, r, q) => acc + (use[q] ? r * r : 0), 0) / Math.max(1, use.filter(Boolean).length))

          use = use.map((u, q) => valid[q] && Math.abs(res[q]) < 2.2 * sd)
        }

        return Array.from({ length: N }, (_, q) => {
          const phi = (q / N) * TAU
          let v = coef[0]

          for (let h = 1; h <= 4; h++) v += coef[2 * h - 1] * Math.cos(h * phi) + coef[2 * h] * Math.sin(h * phi)

          return v
        })
      }

      S.kin = fourier(rawKin.map(v => v ?? 0))
      S.kout = fourier(rawKout.map(v => v ?? 0))
      S.front = owner.map(o => o === 'front')
      S.N = N

      // Planeta: ángulo del punto de la elipse media más cercano a su centro.
      let best = 0, bd = Infinity

      for (let i = 0; i < N; i++) {
        const [x, y] = this.point((i / N) * TAU, 1, E.a, E.b)
        const d = Math.hypot(x - 363.7, y - 61.83)

        if (d < bd) {
          bd = d
          best = i
        }
      }

      S.phiPlanet = (best / N) * TAU

      // Aire oficial: del planeta al anillo trasero y de la nave a cualquier pieza del anillo (medido, no a ojo).
      const ship = outline(P.ship, 1)
      const allRing = [...backPts.filter((_, q) => q % 2 === 0), ...outline(P.front, 1)]

      S.gapPlanet = Math.min(...backPts.map(([x, y]) => Math.hypot(x - 363.7, y - 61.83) - 61.83))
      let gs = Infinity

      for (const [x, y] of ship) for (const [u, v] of allRing) {
        const d = (x - u) * (x - u) + (y - v) * (y - v)

        if (d < gs) gs = d
      }

      S.gapShip = Math.sqrt(gs)

      // Cruces: donde la órbita pasa de detrás a delante de la nave, las puntas oficiales quedan a un aire de distancia.
      const nearest = (A, B) => {
        let m = Infinity, pair = null

        for (const a of A) for (const b of B) {
          const d = (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2

          if (d < m) {
            m = d
            pair = [a, b]
          }
        }

        return { d: Math.sqrt(m), x: (pair[0][0] + pair[1][0]) / 2, y: (pair[0][1] + pair[1][1]) / 2 }
      }

      const frontOutline = outline(P.front, 1)

      S.cross = [nearest(outline(P.backL, 1), frontOutline), nearest(outline(P.backR, 1), frontOutline)]
      const sb = P.ship.getBBox()

      S.shipAxis = { x0: sb.x, x1: sb.x + sb.width, y0: sb.y + sb.height / 2, y1: sb.y + sb.height / 2 }
      S.maxFrontThick = Math.max(...S.kout.map((v, i) => (S.front[i] ? (v - S.kin[i]) * E.a : 0)))
      S.gapsList = gaps.map(g => {
        const mid = ((g.from + g.len / 2) / N) * TAU
        const [x, y] = this.point(mid, 1, E.a, E.b)
        const [x0, y0] = this.point((g.from / N) * TAU, 1, E.a, E.b)
        const [x1, y1] = this.point(((g.from + g.len) / N) * TAU, 1, E.a, E.b)

        return { x, y, r: Math.hypot(x1 - x0, y1 - y0) / 2, planet: Math.hypot(x - 363.7, y - 61.83) < 61.83 + 80 }
      })
    },

    point(phi, k, A, B) {
      const E = S.E
      const x = k * A * Math.cos(phi), y = k * B * Math.sin(phi)
      const c = Math.cos(E.psi), s = Math.sin(E.psi)

      return [E.cx + x * c - y * s, E.cy + x * s + y * c]
    },

    layout() {
      const { W, H, format } = S.cfg
      const short = Math.min(W, H)
      // Escala de la línea (tokens): referencia de 794 px, ×1,75 en redes hasta 1200 px de ancho.
      const social = W <= S.cfg.tokens.orbit.socialMaxWidthPx
      const lineScale = (W / S.cfg.tokens.orbit.baseWidthPx) * (social ? S.cfg.tokens.orbit.socialMultiplier : 1)

      S.lineScale = Math.min(lineScale, short / 480)
      // Héroe: el isotipo mide 62 % del lado corto (el anillo de la línea toma ese diámetro) y queda algo arriba del centro.
      const heroW = short * (format === '16x9' ? 0.56 : 0.62)

      S.hero = { s: heroW / (2 * S.E.a) }
      S.hero.tx = W / 2 - S.E.cx * S.hero.s
      S.hero.ty = H * 0.47 - S.E.cy * S.hero.s
      // Final: logotipo al 46 % del lado corto (58 % en verticales), centrado un poco sobre el centro para el eslogan.
      const logoW = short * (W < H ? 0.66 : W === H ? 0.56 : 0.5)
      const ls = logoW / 837.07

      S.logoT = { s: ls, tx: W / 2 - (837.07 * ls) / 2, ty: H * 0.46 - (196.68 * ls) / 2 }
      S.logoG.setAttribute('transform', `translate(${S.logoT.tx},${S.logoT.ty}) scale(${ls})`)
      S.fin_final = {
        s: ls * S.isoToLogo.s,
        tx: S.logoT.tx + S.isoToLogo.tx * ls,
        ty: S.logoT.ty + S.isoToLogo.ty * ls
      }
      // Eslogan: ancho = 78 % del logotipo, debajo con aire de medio alto del logotipo.
      S.slogan.setAttribute('font-size', 100)
      const w100 = S.slogan.getComputedTextLength() || 900
      const fs = (logoW * 0.78) / w100 * 100

      S.slogan.setAttribute('font-size', fs)
      S.sloganBase = { x: W / 2, y: S.logoT.ty + 196.68 * ls + fs * 1.35, fs }
    },

    // Estado de todos los elementos para el tiempo t (ms) de la animación elegida.
    render(t, anim, pass = 'main') {
      const st = anim === 'open' ? this.stateOpen(t) : this.stateReveal(t)

      this.apply(st, pass)

      return st
    },

    stateReveal(t) {
      const seg = (a, b) => clamp((t - a) / (b - a))
      const e = EASE

      return {
        ringOpacity: e.emphasized(seg(0, 450)),
        ringBreath: lerp(0.96, 1, e.emphasized(seg(0, 450))),
        arc: e.standard(seg(250, 1150)),
        sphereBirth: e.emphasized(seg(250, 450)),
        tilt: e.standard(seg(950, 1850)),
        thick: e.standard(seg(1050, 1850)),
        color: e.standard(seg(1050, 1750)),
        planet: e.standard(seg(1450, 1850)),
        planetSettle: settle(seg(1700, 2100)),
        gapsPlanet: e.emphasized(seg(1500, 1850)),
        // La nave vuela sobre el anillo del giro (continuo); el anillo oficial, con sus cruces, entra de golpe recién
        // cuando la nave está en su lugar y los tapa.
        ringSwap: t >= 2250 ? 1 : 0,
        ship: e.emphasized(seg(1550, 2250)),
        swap: seg(2300, 2400),
        isoSettle: settle(seg(2250, 2450)),
        cam: e.standard(seg(2450, 3250)),
        letters: t,
        lettersFrom: 2750,
        slogan: e.emphasized(seg(3100, 3600)),
        halo: e.standard(seg(1200, 2200)),
        haloEnd: e.standard(seg(2450, 3250))
      }
    },

    stateOpen(t) {
      const seg = (a, b) => clamp((t - a) / (b - a))
      const e = EASE
      const back = x => 1 - x

      return {
        ringOpacity: 1,
        ringBreath: lerp(1, 1.18, e.emphasized(seg(2000, 2800))),
        arcOpen: e.emphasized(seg(2000, 2800)),
        arc: 0,
        sphereBirth: 1,
        tilt: back(e.standard(seg(1400, 2200))),
        thick: back(e.standard(seg(1400, 2100))),
        color: back(e.standard(seg(1500, 2200))),
        planet: back(e.standard(seg(1400, 1800))),
        planetSettle: 1,
        gapsPlanet: back(e.emphasizedAccelerate(seg(1400, 1700))),
        // Oficial → anillo cerrado (1000–1080) → anillo continuo del giro (1085), todo antes de que la nave arranque.
        ringSwap: t < 1085 ? 1 : 0,
        ship: back(e.emphasizedAccelerate(seg(1100, 1700))),
        shipExit: true,
        // El isotipo oficial cede a la construcción ANTES de que la nave arranque.
        swap: back(seg(1000, 1080)),
        isoSettle: 1,
        cam: back(e.standard(seg(600, 1300))),
        letters: t,
        lettersOut: [300, 800],
        slogan: 0,
        halo: 1,
        haloEnd: back(e.standard(seg(600, 1300)))
      }
    },

    apply(st, pass) {
      const cfg = S.cfg
      const E = S.E
      const col = cfg.colors
      const tok = cfg.tokens.orbit
      const px = 1 / S.hero.s // 1 px del héroe en unidades del isotipo

      // ── Cámara: interpolación de escala en log (zoom perceptualmente parejo) y del centro de la elipse ──
      const k = st.cam
      const sc = Math.exp(lerp(Math.log(S.hero.s), Math.log(S.fin_final.s), k))
      const heroC = [S.hero.tx + E.cx * S.hero.s, S.hero.ty + E.cy * S.hero.s]
      const finC = [S.fin_final.tx + E.cx * S.fin_final.s, S.fin_final.ty + E.cy * S.fin_final.s]
      const cx = lerp(heroC[0], finC[0], k), cy = lerp(heroC[1], finC[1], k)
      const settleScale = lerp(0.975, 1, st.isoSettle)

      const camT = `translate(${cx},${cy}) scale(${sc * settleScale}) translate(${-E.cx},${-E.cy})`

      S.cam.setAttribute('transform', camT)
      S.letterHole.setAttribute('transform', `scale(${1 / S.logoT.s}) translate(${-S.logoT.tx},${-S.logoT.ty}) ${camT}`)

      // ── Anillo del giro: círculo de la línea → elipse del isotipo, trazo fino → perfil medido ──
      const tiltAng = st.tilt * Math.acos(E.b / E.a)
      const breath = st.ringBreath ?? 1
      const A = E.a * breath, B = E.a * Math.cos(tiltAng) * breath
      const hair = Math.max((tok.ringStrokePx * S.lineScale * px) / (2 * E.a), 0.0012)
      const O = [], I = []

      for (let j = 0; j <= S.N; j++) {
        const w = j % S.N, phi = (w / S.N) * TAU

        O.push(this.point(phi, lerp(1 + hair, S.kout[w], st.thick), A, B))
        I.push(this.point(phi, lerp(1 - hair, S.kin[w], st.thick), A, B))
      }

      const ringD = pathOf(O) + pathOf(I.reverse())
      const ringColor = mixColor(col.ringLine, col.logo, st.color)
      const ringOp = lerp(mean(tok.ringOpacity), 1, st.color) * st.ringOpacity
      const toOfficial = st.ringSwap ?? 0 // 0 = anillo del giro · 1 = piezas oficiales

      set(S.ringParam, { d: ringD, fill: ringColor, 'fill-opacity': ringOp * (1 - toOfficial) })
      S.ringParamShape.setAttribute('d', ringD)
      S.cutClosed.setAttribute('visibility', toOfficial >= 0.5 ? 'visible' : 'hidden')
      S.cutParam.setAttribute('visibility', toOfficial >= 0.5 ? 'hidden' : 'visible')
      S.backG.setAttribute('opacity', toOfficial)
      S.frontOuter.setAttribute('opacity', toOfficial)
      set(S.planetHoleP, { cx: 363.7, cy: 61.83, r: st.gapsPlanet > 0 ? (61.83 + S.gapPlanet) * st.gapsPlanet : 0 })
      set(S.planetHole, { cx: 363.7, cy: 61.83, r: st.gapsPlanet > 0 ? (61.83 + S.gapPlanet) * st.gapsPlanet : 0 })

      // ── Nave: entra volando por la izquierda a lo largo de su eje y frena en su lugar; en la apertura sale por la derecha ──
      const left = (0 - S.hero.tx) / S.hero.s, right = (cfg.W - S.hero.tx) / S.hero.s
      const dx = st.shipExit ? (1 - st.ship) * (right - S.shipAxis.x0 + 40) : -(1 - st.ship) * (S.shipAxis.x1 - left + 40)
      const shipOn = st.ship > 0.0005

      S.shipInner.setAttribute('transform', `translate(${dx},0)`)
      S.hullInner.setAttribute('transform', `translate(${dx},0)`)
      S.shipHole.setAttribute('transform', `translate(${dx},0)`)
      S.shipHoleFront.setAttribute('transform', `translate(${dx},0)`)

      for (const n of [S.shipHoleP, S.shipHolePF]) {
        n.setAttribute('transform', `translate(${dx},0)`)
        n.setAttribute('visibility', shipOn ? 'visible' : 'hidden')
      }

      S.shipHoleFront.setAttribute('visibility', shipOn ? 'visible' : 'hidden')
      S.shipHole.setAttribute('visibility', shipOn ? 'visible' : 'hidden')
      S.shipOuter.setAttribute('visibility', shipOn ? 'visible' : 'hidden')
      for (const n of [S.offShip, S.offFin]) n.setAttribute('fill', col.logo)
      S.backUse.setAttribute('color', col.logo)
      S.frontUse.setAttribute('color', col.logo)

      // ── Arco de la línea y esfera ──
      const sweep = (mean(tok.arcSweepDeg.withSphere) * Math.PI) / 180
      let phiS = S.phiPlanet, phiA0 = S.phiPlanet - sweep * st.arc

      if (st.arcOpen !== undefined) {
        // Apertura: el arco nace en el planeta y crece hacia adelante.
        phiA0 = S.phiPlanet
        phiS = S.phiPlanet + sweep * st.arcOpen
      } else {
        phiS = S.phiPlanet - sweep * (1 - st.arc)
        phiA0 = S.phiPlanet - sweep
      }

      const arcOp = (st.arcOpen !== undefined ? 1 : st.arc > 0 ? 1 : 0) * (1 - st.color)
      const arcPts = []
      const steps = 60

      for (let i = 0; i <= steps; i++) arcPts.push(this.point(lerp(phiA0, phiS, i / steps), 1, A, B))
      set(S.arc, { d: arcPts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(2)},${p[1].toFixed(2)}`).join(''), stroke: col.accent, 'stroke-width': mean(tok.arcStrokePx) * S.lineScale * px, opacity: arcOp * (Math.abs(phiS - phiA0) > 0.004 ? 1 : 0) })

      // La esfera viaja en la punta del arco; al volverse planeta crece, sube a su centro exacto y toma el color del logo.
      const [sx, sy] = this.point(phiS, 1, A, B)
      const p = st.planet
      const rS = mean(tok.sphereRadiusPx) * S.lineScale * px * st.sphereBirth
      const rP = 61.83
      const land = clamp(p)
      const pr = lerp(rS, rP, land) * (st.arcOpen !== undefined ? 1 : lerp(1, 1, 1))

      set(S.sphere, {
        cx: lerp(sx, 363.7, land),
        cy: lerp(sy, 61.83, land),
        r: pr * lerp(1, 1, st.planetSettle),
        fill: mixColor(col.accent, col.logo, land)
      })

      // ── Cruce a las piezas oficiales (cuando todo calza) ──
      const sw = st.swap

      S.official.setAttribute('opacity', sw)
      for (const n of S.official.children) n.setAttribute('fill', col.logo)
      for (const n of [S.ringParam, S.backG, S.frontOuter, S.sphere, S.arc]) n.setAttribute('visibility', sw >= 1 ? 'hidden' : 'visible')
      if (sw >= 1) S.shipOuter.setAttribute('visibility', 'hidden')

      // ── Halo (capa propia; en la pasada principal sólo si la variante lo lleva) ──
      // En fondo claro el halo se lee como mancha: va a la mitad (token × 0,5); en oscuro, el token tal cual.
      const haloOp = st.halo * lerp(1, 0.55, st.haloEnd) * (cfg.colors.haloScale ?? 1)

      set(S.halo, { cx: E.cx, cy: E.cy, r: E.a * tok.haloRadiusRatio })
      set(S.haloGrad, { cx: E.cx, cy: E.cy, r: E.a * tok.haloRadiusRatio })
      S.haloStops.forEach((s, i) => s.setAttribute('stop-opacity', (tok.halo[i].opacity * haloOp).toFixed(4)))

      // ── Letras: salen desde detrás del isotipo hacia afuera, una tras otra; en la apertura se recogen ──
      const order = [2, 1, 0, 3, 4, 5] // e(235) f e(56) · n c e: las más cercanas a la «o» primero
      const center = 404.57

      S.letters.forEach((n, i) => {
        const rank = order.indexOf(i) % 3
        let q

        if (st.lettersOut) {
          const [a, b] = st.lettersOut
          const d = (2 - rank) * 45

          q = 1 - EASE.emphasizedAccelerate(clamp((st.letters - a - d) / (b - a - 90)))
        } else {
          q = st.lettersFrom === undefined ? 1 : EASE.emphasized(clamp((st.letters - st.lettersFrom - rank * 30) / 520))
        }

        const bb = n.getBBox()
        const dir = bb.x + bb.width / 2 < center ? -1 : 1

        set(n, { transform: `translate(${(1 - q) * -dir * 60},0)`, fill: col.logo, 'fill-opacity': clamp(q * 1.4) })
      })
      // Las letras sólo existen cuando la cámara ya acercó el isotipo a la «o».
      S.logoG.setAttribute('visibility', st.cam > 0.3 ? 'visible' : 'hidden')

      // ── Eslogan ──
      const sb = S.sloganBase

      set(S.slogan, { x: sb.x, y: sb.y + (1 - st.slogan) * sb.fs * 0.25, opacity: st.slogan })
      cfg.slogan.parts.forEach(part => part.node.setAttribute('fill', part.accent ? col.accent : col.slogan))

      // Pasadas: principal (sin halo) · halo (sólo halo).
      const main = pass !== 'halo'

      for (const n of [S.cam, S.logoG, S.slogan]) n.style.display = ''
      S.halo.style.display = pass === 'main' ? 'none' : ''

      if (!main) {
        for (const n of S.cam.children) if (n !== S.halo) n.style.display = 'none'
        S.logoG.style.display = 'none'
        S.slogan.style.display = 'none'
      } else {
        for (const n of S.cam.children) if (n !== S.halo) n.style.display = ''
      }
    }
  }

  function pathOf(pts) {
    return pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(2)},${p[1].toFixed(2)}`).join('') + 'Z'
  }

  function mean(r) {
    return Array.isArray(r) ? (r[0] + r[r.length - 1]) / 2 : r
  }

  window.orbitScene.setEasing = e => {
    EASE.emphasized = bezier(...e.emphasized)
    EASE.standard = bezier(...e.standard)
    EASE.emphasizedAccelerate = bezier(...e.emphasizedAccelerate)
  }

  window.orbitScene._state = S
})()
