#!/usr/bin/env node
// ISSUE-178: fail before compilation if web fonts regain a build-time network dependency.
import { createHash } from 'node:crypto'
import { readdirSync, readFileSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import ts from 'typescript'

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const remoteLoaders = new Set(['next/font/google', '@next/font/google'])

export const remoteFontImports = (source, filename) => {
  if (![...remoteLoaders].some(loader => source.includes(loader))) return []
  const file = ts.createSourceFile(filename, source, ts.ScriptTarget.Latest, true)
  const findings = []

  const visit = node => {
    const specifier = ts.isImportDeclaration(node) || ts.isExportDeclaration(node)
      ? node.moduleSpecifier
      : ts.isCallExpression(node) && (node.expression.kind === ts.SyntaxKind.ImportKeyword ||
        (ts.isIdentifier(node.expression) && node.expression.text === 'require'))
        ? node.arguments[0]
        : undefined

    if (specifier && ts.isStringLiteralLike(specifier) && remoteLoaders.has(specifier.text)) {
      findings.push(`${filename}:${file.getLineAndCharacterOfPosition(node.getStart(file)).line + 1}: use next/font/local with versioned font assets`)
    }

    ts.forEachChild(node, visit)
  }

  visit(file)

  return findings
}

export const checkWebFonts = (root = repoRoot) => {
  const errors = []
  const fontDir = join(root, 'src/assets/fonts/web')
  const manifest = JSON.parse(readFileSync(join(fontDir, 'manifest.json'), 'utf8'))

  if (!Array.isArray(manifest.fonts) || manifest.fonts.length === 0) {
    throw new Error('Web font manifest must contain font assets')
  }

  for (const font of manifest.fonts) {
    if (!/^[\w-]+\.woff2$/.test(font.file)) throw new Error('Invalid web font asset filename')

    try {
      const bytes = readFileSync(join(fontDir, font.file))

      if (bytes.toString('ascii', 0, 4) !== 'wOF2' || bytes.length !== font.bytes ||
          createHash('sha256').update(bytes).digest('hex') !== font.sha256) {
        errors.push(`${font.file}: font bytes differ from the reviewed manifest`)
      }
    } catch {
      errors.push(`${font.file}: missing font asset`)
    }
  }

  const walk = directory => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const path = join(directory, entry.name)

      if (entry.isDirectory()) walk(path)
      else if (entry.isFile() && /\.[cm]?[jt]sx?$/.test(entry.name) && !/\.(test|spec)\./.test(entry.name)) {
        errors.push(...remoteFontImports(readFileSync(path, 'utf8'), relative(root, path)))
      }
    }
  }

  walk(join(root, 'src'))

  return errors
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const errors = checkWebFonts()

  if (errors.length) {
    console.error(errors.join('\n'))
    process.exitCode = 1
  } else console.log('Web fonts: pinned assets verified; no Google font loaders in src.')
}
