#!/usr/bin/env node

import { readFile } from 'node:fs/promises'
import { basename } from 'node:path'
import { brotliCompressSync, gzipSync } from 'node:zlib'

const paths = process.argv.slice(2).filter(arg => arg !== '--' && arg !== '--json')

if (!paths.length) {
  console.error('Usage: node audit-editorial-svg.mjs <asset.svg> [more.svg]')
  process.exit(2)
}

const count = (source, expression) => (source.match(expression) || []).length
const unique = values => [...new Set(values.map(value => value.toUpperCase()))].sort()

const results = []

for (const path of paths) {
  const buffer = await readFile(path)
  const source = buffer.toString('utf8')
  const findings = []
  const has = expression => expression.test(source)

  if (!has(/<svg\b/i)) findings.push({ severity: 'BLOCK', code: 'missing_svg_root' })
  if (!has(/\bviewBox\s*=\s*["'][^"']+["']/i)) findings.push({ severity: 'BLOCK', code: 'missing_viewbox' })
  if (has(/<script\b/i)) findings.push({ severity: 'BLOCK', code: 'script' })
  if (has(/<foreignObject\b/i)) findings.push({ severity: 'BLOCK', code: 'foreign_object' })
  if (has(/\son[a-z]+\s*=/i)) findings.push({ severity: 'BLOCK', code: 'event_handler' })
  if (has(/(?:href|xlink:href)\s*=\s*["'](?:https?:|\/\/|data:text\/html)/i)) {
    findings.push({ severity: 'BLOCK', code: 'external_or_unsafe_reference' })
  }
  if (has(/<text\b/i)) findings.push({ severity: 'WARN', code: 'live_text_verify_font_portability' })
  if (has(/<filter\b/i)) findings.push({ severity: 'WARN', code: 'filter_verify_need_and_rendering' })
  if (!has(/\bwidth\s*=\s*["'][^"']+["']/i) || !has(/\bheight\s*=\s*["'][^"']+["']/i)) {
    findings.push({ severity: 'WARN', code: 'missing_intrinsic_dimensions' })
  }

  const namedColors = [...source.matchAll(/(?:fill|stroke)\s*=\s*["'](?!none\b|currentColor\b)([a-z]+)["']/gi)]
    .map(match => match[1])
  const colors = unique([...(source.match(/#[0-9a-f]{3,8}\b/gi) || []), ...namedColors])

  results.push({
    file: basename(path),
    path,
    verdict: findings.some(item => item.severity === 'BLOCK') ? 'BLOCK' : findings.length ? 'WARN' : 'PASS',
    bytes: {
      raw: buffer.length,
      gzip: gzipSync(buffer, { level: 9 }).length,
      brotli: brotliCompressSync(buffer).length
    },
    geometry: {
      paths: count(source, /<path\b/gi),
      rects: count(source, /<rect\b/gi),
      circles: count(source, /<circle\b/gi),
      text: count(source, /<text\b/gi),
      gradients: count(source, /<(?:linearGradient|radialGradient)\b/gi),
      filters: count(source, /<filter\b/gi)
    },
    colors,
    findings
  })
}

console.log(JSON.stringify(results, null, 2))

if (results.some(result => result.verdict === 'BLOCK')) process.exitCode = 1
