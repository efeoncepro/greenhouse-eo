import assert from 'node:assert/strict'

import { lintUiSource } from '../ui-code-lint.mjs'
import { REQUIRED_VISUAL_DIMENSIONS, validateVisualScorecard } from '../ui-quality-gate.mjs'

const goodDimensions = Object.fromEntries(
  REQUIRED_VISUAL_DIMENSIONS.map(dimension => [
    dimension,
    {
      score: 4.5,
      rationale: 'The reviewed desktop and mobile evidence shows an intentional, coherent product decision.',
      evidence: 'frame.png'
    }
  ])
)

const goodScorecard = {
  dimensions: goodDimensions,
  evidence: {
    desktop: 'desktop.png',
    mobile: 'mobile.png',
    dossier: 'review-dossier.md'
  }
}

{
  const result = validateVisualScorecard(goodScorecard)

  assert.equal(result.findings.length, 0)
  assert.ok(result.average >= 4.5)
}

{
  const result = validateVisualScorecard({
    ...goodScorecard,
    dimensions: {
      ...goodDimensions,
      hierarchy: {
        score: 2,
        rationale: 'The hierarchy is not yet stable in the first fold and needs a dominant decision.',
        evidence: 'desktop.png',
        nextAction: 'Recompose the first fold.'
      }
    }
  })

  assert.ok(result.findings.some(finding => finding.includes('floor')))
}

{
  const result = validateVisualScorecard({
    ...goodScorecard,
    dimensions: {
      ...goodDimensions,
      visualImpact: {
        score: 4.4,
        rationale: 'The interface is polished but still lacks a task-native dominant visual moment.',
        evidence: 'desktop.png',
        nextAction: 'Create an asymmetric decision canvas tied to the primary task.'
      }
    }
  })

  assert.ok(result.findings.some(finding => finding.includes('visualImpact must be at least 4.5')))
}

{
  const findings = lintUiSource({
    file: '/src/views/example.tsx',
    source: [
      "import { Button } from '@mui/material'",
      "import { motion } from 'framer-motion'",
      "const sx = { color: '#123456', fontFamily: 'Inter', borderRadius: 3 }"
    ].join('\n')
  })

  assert.ok(findings.some(finding => finding.rule === 'raw-mui-control'))
  assert.ok(findings.some(finding => finding.rule === 'direct-framer-motion'))
  assert.ok(findings.some(finding => finding.rule === 'raw-hex'))
  assert.ok(findings.some(finding => finding.rule === 'font-family'))
  assert.ok(findings.some(finding => finding.rule === 'numeric-radius'))
}

{
  const canonicalTokens = lintUiSource({
    file: '/src/@core/theme/axis-tokens.ts',
    source: "export const ramp = { 500: '#12afa2' }"
  })

  const driftFixture = lintUiSource({
    file: '/src/@core/theme/axis-semantic-drift.test.ts',
    source: "expect(color).toBe('#12afa2')"
  })

  const productConsumer = lintUiSource({
    file: '/src/views/example.tsx',
    source: "const sx = { color: '#12afa2' }"
  })

  assert.equal(canonicalTokens.some(finding => finding.rule === 'raw-hex'), false)
  assert.equal(driftFixture.some(finding => finding.rule === 'raw-hex'), false)
  assert.equal(productConsumer.some(finding => finding.rule === 'raw-hex'), true)
}

{
  const findings = lintUiSource({
    file: '/src/components/greenhouse/primitives/example.tsx',
    source: [
      "boxShadow: selected ? theme.greenhouseElevation.raised.boxShadow : 'none'",
      "boxShadow: '0 12px 32px rgba(0, 0, 0, 0.18)'"
    ].join('\n')
  })

  assert.equal(findings.filter(finding => finding.rule === 'ad-hoc-shadow').length, 1)
}

{
  const compatibilityConsumer = lintUiSource({
    file: '/src/views/example.tsx',
    source: "const sx = { boxShadow: 'var(--mui-customShadows-md)' }"
  })

  const primitiveConsumer = lintUiSource({
    file: '/src/components/greenhouse/primitives/example.tsx',
    source: "const sx = { boxShadow: 'var(--mui-customShadows-md)' }"
  })

  assert.equal(compatibilityConsumer.some(finding => finding.rule === 'ad-hoc-shadow'), false)
  assert.equal(primitiveConsumer.some(finding => finding.rule === 'ad-hoc-shadow'), true)
}

{
  const findings = lintUiSource({
    file: '/src/views/example.tsx',
    source: [
      "<i className='tabler-x' style={{ fontSize: 16 }} />",
      '<Box',
      "  component='i'",
      "  sx={{ fontSize: 18 }}",
      '/>',
      "<Typography sx={{ fontSize: 16 }}>Text</Typography>"
    ].join('\n')
  })

  assert.deepEqual(
    findings.filter(finding => finding.rule === 'inline-font-size').map(finding => finding.line),
    [6]
  )
}

{
  const findings = lintUiSource({
    file: '/src/views/example.tsx',
    source: ["const first = { fontSize: 12 }", "const second = { fontSize: 14 }"].join('\n'),
    lineFilter: new Set([2])
  })

  assert.deepEqual(findings.map(finding => finding.line), [2])
}

console.log('[ui-quality-gates.test] PASS')
