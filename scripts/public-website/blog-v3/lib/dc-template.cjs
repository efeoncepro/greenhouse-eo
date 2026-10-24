/**
 * TASK-2051 — Parser of an approved Claude Design artboard (.dc.html) into a render-neutral AST.
 *
 * The blog home v3 is implemented by rendering the canvas template itself (not a hand copy): the same AST feeds the
 * PHP renderer (server HTML, SEO, no-JS) and the browser renderer (state changes), so the page cannot drift from the
 * approved design. AST nodes (JSON, compact):
 *   ['t', text]                         raw text (already HTML; may contain holes → ['x', parts])
 *   ['x', parts]                        text with holes; parts = [ 's'|'h', value ] (h = escaped lookup)
 *   ['e', tag, attrs, children]         element; attrs = [ [name, kind, value] ]
 *        kind 's' static raw · 'h' whole-value lookup · 'i' interpolated parts · 'ev' event handler lookup
 *   ['for', listPath, asName, children]
 *   ['if', valuePath, children]
 */
const cheerio = require('cheerio')

const HOLE = /\{\{\s*([^}]+?)\s*\}\}/g

function splitHoles(s) {
  const parts = []
  let last = 0

  for (const m of s.matchAll(HOLE)) {
    if (m.index > last) parts.push(['s', s.slice(last, m.index)])
    parts.push(['h', m[1]])
    last = m.index + m[0].length
  }

  if (last < s.length) parts.push(['s', s.slice(last)])

  return parts
}

function wholeHole(s) {
  const m = s.match(/^\s*\{\{\s*([^}]+?)\s*\}\}\s*$/)

  return m ? m[1] : null
}

function convert(node) {
  if (node.type === 'text') {
    const parts = splitHoles(node.data)

    return parts.some(p => p[0] === 'h') ? ['x', parts] : ['t', node.data]
  }

  if (node.type === 'comment' || node.type === 'directive') return null
  if (node.type !== 'tag' && node.type !== 'script' && node.type !== 'style') return null

  const kids = (node.children || []).map(convert).filter(Boolean)

  if (node.name === 'sc-for') return ['for', wholeHole(node.attribs.list), node.attribs.as, kids]
  if (node.name === 'sc-if') return ['if', wholeHole(node.attribs.value), kids]

  const attrs = []

  for (const [name, raw] of Object.entries(node.attribs || {})) {
    if (name.startsWith('hint-')) continue
    const hole = wholeHole(raw)

    if (/^on[A-Z]/.test(name)) {
      if (!hole) throw new Error(`Event attribute ${name} without a handler hole`)
      attrs.push([name.slice(2).toLowerCase(), 'ev', hole])
    } else if (hole) attrs.push([name, 'h', hole])
    else if (HOLE.test(raw)) {
      HOLE.lastIndex = 0
      attrs.push([name, 'i', splitHoles(raw)])
    } else attrs.push([name, 's', raw])
    HOLE.lastIndex = 0
  }

  return ['e', node.name, attrs, kids]
}

/** Parses the artboard file. Returns css (helmet <style>), fontLinks, the root element AST and the logic class source. */
function parseDcFile(source) {
  const helmet = source.match(/<helmet>([\s\S]*?)<\/helmet>/)[1]
  const css = helmet.match(/<style>([\s\S]*?)<\/style>/)[1]
  const fontLinks = [...helmet.matchAll(/<link[^>]+href="([^"]+)"/g)].map(m => m[1].replaceAll('&amp;', '&'))
  const body = source.slice(source.indexOf('</helmet>') + 9, source.indexOf('</x-dc>'))
  const logic = source.match(/<script type="text\/x-dc"[^>]*>([\s\S]*?)<\/script>/)[1]

  const $ = cheerio.load(body, {
    xml: { xmlMode: false, recognizeSelfClosing: true, lowerCaseAttributeNames: false, lowerCaseTags: false, decodeEntities: false },
  })

  const roots = $.root()[0].children.filter(n => n.type === 'tag')

  if (roots.length !== 1) throw new Error(`Expected one root element, found ${roots.length}`)

  return { css, fontLinks, ast: convert(roots[0]), logic }
}

module.exports = { parseDcFile, splitHoles }
