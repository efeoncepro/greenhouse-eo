#!/usr/bin/env node
// Scoped compiler graph, including the repo's real NextAuth augmentation. No runtime imports execute.
import { readdirSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import ts from 'typescript'

const here = dirname(fileURLToPath(import.meta.url))
const root = resolve(here, '../../..')
const config = ts.readConfigFile(join(root, 'tsconfig.json'), ts.sys.readFile)

if (config.error) throw new Error(ts.flattenDiagnosticMessageText(config.error.messageText, '\n'))
const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, root)
const roots = [...readdirSync(here).filter(file => file.endsWith('.ts')).map(file => join(here, file)), join(root, 'src/types/next-auth.d.ts')]
const program = ts.createProgram(roots, { ...parsed.options, noEmit: true, incremental: false })
const diagnostics = [...parsed.errors, ...ts.getPreEmitDiagnostics(program)]

console.log(ts.formatDiagnosticsWithColorAndContext(diagnostics, {
  getCanonicalFileName: file => file, getCurrentDirectory: () => root, getNewLine: () => '\n'
}))
console.log(`Scoped typecheck: ${diagnostics.length} diagnostics (harness roots + imported dependencies; not whole repository)`)
process.exitCode = diagnostics.length ? 1 : 0
