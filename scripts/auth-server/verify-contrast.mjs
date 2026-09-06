#!/usr/bin/env node
/**
 * Contraste REAL de las pantallas de Efeonce ID, medido sobre los píxeles renderizados.
 *
 * POR QUÉ EXISTE. El gate de accesibilidad de GVC corre axe, y axe devolvió `violations: 0` para
 * estas páginas — pero las 24 filas de texto salieron en `incomplete`, con el mensaje «Element's
 * background color could not be determined due to a pseudo element»: el lienzo del emisor pinta su
 * azul con un degradado y un `::after`, y axe se niega a razonar sobre eso. Ese cero no decía «pasa»,
 * decía «no pude mirar». Debajo había un texto a 1.53:1.
 *
 * Leer el CSS tampoco alcanza: subir por `background-color` salta el degradado y aterriza en el
 * `body`, que es claro. Así que acá no se razona sobre CSS — se toma la captura y se muestrean los
 * píxeles alrededor de cada texto. Es la única medición que ve lo que ve una persona.
 *
 * Uso: pnpm auth-server:verify-contrast   (exige el harness en 127.0.0.1:19036)
 */
import { chromium } from 'playwright'
import { PNG } from 'pngjs'

const BASE = process.env.AUTH_UI_BASE_URL ?? 'http://127.0.0.1:19036'

const PAGES = ['/login', '/login/external', '/login/invalid-email', '/consent', '/consent/multiple',
  '/error/missing', '/error/invalid-client', '/error/access-denied', '/error/unavailable',
  '/error/rate-limited', '/magic-link/sent', '/magic-link/expired', '/magic-link/used',
  '/invitation/accepted', '/access/revoked', '/session/started', '/session/closed', '/step-up']

const relative = ([r, g, b]) => {
  const f = v => (v / 255 <= 0.03928 ? v / 255 / 12.92 : ((v / 255 + 0.055) / 1.055) ** 2.4)

  
return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)
}

const contrast = (a, b) => {
  const [x, y] = [relative(a), relative(b)]

  
return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05)
}

const run = async (viewport, label) => {
  const browser = await chromium.launch()
  const context = await browser.newContext({ viewport, deviceScaleFactor: 1 })
  const failures = []
  let measured = 0

  for (const route of PAGES) {
    const page = await context.newPage()

    await page.goto(BASE + route, { waitUntil: 'networkidle' })

    const items = await page.evaluate(() => {
      const out = []

      for (const el of document.querySelectorAll('h1,h2,p,strong,span,code,label,button,a,summary,li')) {
        const text = [...el.childNodes].filter(n => n.nodeType === 3).map(n => n.textContent.trim()).join('')

        if (!text) continue
        const box = el.getBoundingClientRect()

        if (box.width < 4 || box.height < 4 || box.top < 0) continue
        const cs = getComputedStyle(el)

        if (cs.visibility === 'hidden' || cs.opacity === '0') continue
        out.push({
          text: text.slice(0, 42),
          color: cs.color,
          size: parseFloat(cs.fontSize),
          weight: Number(cs.fontWeight),
          box: { x: box.x, y: box.y, w: box.width, h: box.height }
        })
      }

      
return out
    })

    const shot = PNG.sync.read(await page.screenshot())

    const resolved = await page.evaluate(colors => {
      const ctx = document.createElement('canvas').getContext('2d')

      return colors.map(color => {
        ctx.fillStyle = '#000'
        ctx.fillStyle = color
        ctx.fillRect(0, 0, 1, 1)
        const [r, g, b, a] = ctx.getImageData(0, 0, 1, 1).data

        return [r, g, b, a / 255]
      })
    }, items.map(item => item.color))

    for (const [index, item] of items.entries()) {
      /**
       * Fondo compuesto DENTRO de la caja del elemento. Muestrear por fuera parecía más limpio
       * —ahí no hay glifos— pero para un botón cae en la tarjeta que está detrás, no en el relleno
       * del botón: daba «texto blanco sobre blanco» para cada CTA. Se muestrea una rejilla interior
       * y se toma el color MÁS FRECUENTE: los glifos son minoría dentro de su propia caja.
       */
      const counts = new Map()

      for (let px = 2; px < Math.min(item.box.w - 2, 60); px += 2) {
        for (const py of [2, Math.round(item.box.h / 2), Math.round(item.box.h) - 3]) {
          const x = Math.round(item.box.x + px)
          const y = Math.round(item.box.y + py)

          if (x < 0 || x >= shot.width || y < 0 || y >= shot.height) continue
          const i = (shot.width * y + x) << 2
          const key = `${shot.data[i]},${shot.data[i + 1]},${shot.data[i + 2]}`

          counts.set(key, (counts.get(key) ?? 0) + 1)
        }
      }

      if (!counts.size) continue

      const [r, g, b, alpha] = resolved[index]
      const near = pixel => Math.abs(pixel[0] - r) + Math.abs(pixel[1] - g) + Math.abs(pixel[2] - b) < 90

      const ranked = [...counts.entries()]
        .map(([key, n]) => [key.split(',').map(Number), n])
        .sort((a, b) => b[1] - a[1])

      /**
       * El fondo es el color más frecuente ENTRE LOS QUE NO SON EL TEXTO. Tomar el más frecuente a
       * secas fallaba justo en el caso que más importa acá: en un titular blanco de 46px sobre azul,
       * los glifos ganan la votación y el resultado era «blanco sobre blanco».
       */
      const bg = (ranked.find(([pixel]) => !near(pixel)) ?? ranked[0])[0]
      // Texto semitransparente: se compone contra su propio fondo antes de comparar.
      const fg = alpha >= 1 ? [r, g, b] : [r, g, b].map((c, i) => Math.round(c * alpha + bg[i] * (1 - alpha)))
      const ratio = contrast(fg, bg)
      // WCAG 1.4.3: 3:1 para texto grande (>=24px, o >=18.66px en negrita), 4.5:1 el resto.
      const large = item.size >= 24 || (item.size >= 18.66 && item.weight >= 700)
      const floor = large ? 3 : 4.5

      measured++
      if (ratio < floor) failures.push({ route, ...item, bg, ratio: +ratio.toFixed(2), floor })
    }

    await page.close()
  }

  await browser.close()
  console.log(`${label}: ${measured} textos medidos · ${failures.length} bajo el piso WCAG`)

  for (const f of failures) {
    console.log(`  🔴 ${f.ratio}:1 (piso ${f.floor}) ${f.route} · ${f.size}px w${f.weight} · "${f.text}" · ${f.color} sobre rgb(${f.bg})`)
  }

  
return failures.length
}

const failed = (await run({ width: 1440, height: 1000 }, 'desktop 1440')) + (await run({ width: 390, height: 844 }, 'móvil 390'))

if (failed) {
  console.error(`\nFALLA: ${failed} texto(s) bajo el contraste mínimo.`)
  process.exit(1)
}

console.log('\nContraste OK en todas las pantallas del emisor.')
