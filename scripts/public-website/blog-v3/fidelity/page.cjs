/**
 * TASK-2051 — Standalone HTML page for one board: the board's fonts and CSS, the template rendered with the
 * production runtime (frozen clock) and canvas assets served from /_blob/<id>. Used to capture the approved reference
 * and to check that the bound template renders the same pixels.
 */
const path = require('node:path')

const { renderBoard } = require('../lib/render-node.cjs')

const SRC = path.join(__dirname, '..', 'source')

function boardPage(board, { bound = false, data } = {}) {
  const file = path.join(SRC, `${board}.${bound ? 'bound' : 'reference'}.dc.html`)
  const r = renderBoard(file, bound ? { data } : {})
  const fonts = r.fontLinks.filter(h => h.includes('/css2')).map(h => `<link rel="stylesheet" href="${h}">`).join('\n')

  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${board}</title>
${fonts}
<style>${r.css}</style>
</head>
<body>
${r.html}
</body>
</html>`
}

module.exports = { boardPage, SRC }
