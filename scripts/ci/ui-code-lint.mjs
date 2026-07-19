#!/usr/bin/env node

import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { extname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import ts from 'typescript'

const UI_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.css', '.scss'])
const UI_ROOTS = ['src/app/', 'src/views/', 'src/components/', 'src/@core/']

const CANONICAL_COLOR_SOURCE_FILES = new Set([
  '/src/@core/theme/axis-tokens.ts',
  '/src/@core/theme/axis-secondary.ts',
  '/src/@core/theme/axis-semantic.ts'
])

const isColorDefinitionOrFixture = file =>
  CANONICAL_COLOR_SOURCE_FILES.has(file) || /\.(?:test|spec)\.[jt]sx?$/.test(file)

export const UI_CODE_RULES = [
  {
    id: 'raw-hex',
    pattern: /#[0-9a-f]{3,8}\b/i,
    allow: ({ file }) => isColorDefinitionOrFixture(file),
    message: 'map colors to theme.palette/theme.axis/CSS palette variables'
  },
  {
    id: 'font-family',
    pattern: /\bfontFamily\s*:/,
    message: 'use canonical Typography variants; do not set fontFamily locally'
  },
  {
    id: 'inline-font-size',
    pattern: /\bfontSize\s*:\s*(?:['\"][^'\"]+['\"]|\d+)/,
    message: 'use Typography variants or canonical typography tokens'
  },
  {
    id: 'direct-framer-motion',
    pattern: /from\s+['\"]framer-motion['\"]/,
    message: 'use the repository Framer Motion wrapper/canonical motion primitives'
  },
  {
    id: 'ad-hoc-motion',
    pattern: /\b(?:transition|animation)\s*:\s*['\"][^'\"]*(?:\d+ms|cubic-bezier|ease-in-out)/,
    message: 'use canonical motion timing/easing tokens'
  },
  {
    id: 'numeric-radius',
    pattern: /\bborderRadius\s*:\s*(?!0\b|9999\b)\d+(?:\.\d+)?\b/,
    message: 'use theme.shape.customBorderRadius.* as a CSS length'
  },
  {
    id: 'ad-hoc-shadow',
    pattern: /\bboxShadow\s*:\s*['\"](?!none['\"])/,
    allow: ({ file, line }) =>
      !isPrimitiveImplementation(file) &&
      /\bboxShadow\s*:\s*['\"]var\(--mui-customShadows-[a-z0-9-]+\)['\"]/i.test(line),
    message: 'use canonical elevation/surface tokens'
  },
  {
    id: 'local-section-card',
    pattern: /\b(?:const|function)\s+SectionCard\b/,
    message: 'reuse GreenhouseOperationalSection or an existing section primitive'
  }
]

const isPrimitiveImplementation = file => file.includes('/src/components/greenhouse/primitives/')

const collectIconFontSizeLines = source => {
  const lines = new Set()
  const sourceFile = ts.createSourceFile('ui-code-lint.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
  const sourceLines = source.split('\n')

  const visit = node => {
    if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
      const tagName = node.tagName.getText(sourceFile)

      const componentAttribute = node.attributes.properties.find(
        attribute => ts.isJsxAttribute(attribute) && attribute.name.getText(sourceFile) === 'component'
      )

      const componentValue =
        componentAttribute &&
        ts.isJsxAttribute(componentAttribute) &&
        componentAttribute.initializer &&
        ts.isStringLiteral(componentAttribute.initializer)
          ? componentAttribute.initializer.text
          : null

      if (tagName === 'i' || (tagName === 'Box' && componentValue === 'i')) {
        const startLine = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line
        const endLine = sourceFile.getLineAndCharacterOfPosition(node.end).line

        for (let line = startLine; line <= endLine; line += 1) {
          if (/\bfontSize\s*:/.test(sourceLines[line] ?? '')) lines.add(line + 1)
        }
      }
    }

    ts.forEachChild(node, visit)
  }

  visit(sourceFile)

  return lines
}

export const lintUiSource = ({ source, file = 'fixture.tsx', lineFilter = null }) => {
  const findings = []
  const lines = source.split('\n')
  const iconFontSizeLines = collectIconFontSizeLines(source)

  for (const [index, line] of lines.entries()) {
    const lineNumber = index + 1

    if (lineFilter && !lineFilter.has(lineNumber)) continue
    if (line.includes('ui-code-lint-disable-line')) continue

    for (const rule of UI_CODE_RULES) {
      if (rule.id === 'inline-font-size' && iconFontSizeLines.has(lineNumber)) continue
      if (!rule.pattern.test(line)) continue
      if (rule.allow?.({ file, line })) continue

      findings.push({ file, line: lineNumber, rule: rule.id, message: rule.message })
    }

    if (
      !isPrimitiveImplementation(file) &&
      /import\s*\{[^}]*\b(?:TextField|Autocomplete|Chip|Avatar|Button)\b[^}]*\}\s*from\s*['\"]@mui\/material['\"]/.test(line)
    ) {
      findings.push({
        file,
        line: lineNumber,
        rule: 'raw-mui-control',
        message: 'consumer UI must use Greenhouse/Vuexy wrappers before raw MUI controls'
      })
    }
  }

  return findings
}

const git = (repoRoot, args) =>
  execFileSync('git', args, { cwd: repoRoot, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim()

const changedFiles = repoRoot => {
  const files = new Set()

  for (const args of [
    ['diff', '--name-only', '--diff-filter=ACMR', 'HEAD'],
    ['diff', '--cached', '--name-only', '--diff-filter=ACMR', 'HEAD'],
    ['ls-files', '--others', '--exclude-standard']
  ]) {
    try {
      for (const file of git(repoRoot, args).split('\n')) if (file.trim()) files.add(file.trim())
    } catch {
      // Local best-effort; explicit paths remain available.
    }
  }

  return [...files]
}

const changedLineNumbers = (repoRoot, file) => {
  try {
    const diff = git(repoRoot, ['diff', '--unified=0', 'HEAD', '--', file])
    const changed = new Set()
    let nextLine = null

    for (const line of diff.split('\n')) {
      const hunk = line.match(/^@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@/)

      if (hunk) {
        nextLine = Number(hunk[1])
        continue
      }

      if (nextLine === null || line.startsWith('+++') || line.startsWith('---')) continue

      if (line.startsWith('+')) {
        changed.add(nextLine)
        nextLine += 1
      } else if (!line.startsWith('-')) {
        nextLine += 1
      }
    }

    if (diff) return changed
  } catch {
    // Explicit and untracked/new files fall back to full-source linting.
  }

  return null
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])

if (isMain) {
  const repoRoot = resolve(import.meta.dirname, '../..')
  const args = process.argv.slice(2)
  const excludes = []
  const explicit = []
  let changed = false

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index]

    if (arg === '--changed') changed = true
    else if (arg === '--exclude') excludes.push(args[++index])
    else if (arg.startsWith('--exclude=')) excludes.push(arg.slice(10))
    else explicit.push(arg)
  }

  const candidates = changed ? changedFiles(repoRoot) : explicit

  const files = candidates.filter(file =>
    UI_ROOTS.some(root => file.startsWith(root)) &&
    UI_EXTENSIONS.has(extname(file)) &&
    !excludes.some(exclude => file.startsWith(exclude)) &&
    existsSync(resolve(repoRoot, file))
  )

  const findings = files.flatMap(file => {
    const source = readFileSync(resolve(repoRoot, file), 'utf8')
    const lineFilter = changed ? changedLineNumbers(repoRoot, file) : null

    return lintUiSource({ source, file: `/${file}`, lineFilter })
  })

  if (findings.length) {
    console.error(`UI code lint: BLOCK (${findings.length} findings)`)
    for (const item of findings) console.error(`- ${item.file}:${item.line} [${item.rule}] ${item.message}`)
    process.exit(1)
  }

  console.log(`UI code lint: PASS (${files.length} files)`)
}
