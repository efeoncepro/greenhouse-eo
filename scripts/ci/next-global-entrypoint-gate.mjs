#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'

const ROOT = process.cwd()

const CANDIDATES = [
  'middleware.js',
  'middleware.jsx',
  'middleware.ts',
  'middleware.tsx',
  'src/middleware.js',
  'src/middleware.jsx',
  'src/middleware.ts',
  'src/middleware.tsx',
  'proxy.js',
  'proxy.jsx',
  'proxy.ts',
  'proxy.tsx',
  'src/proxy.js',
  'src/proxy.jsx',
  'src/proxy.ts',
  'src/proxy.tsx'
]

const existing = CANDIDATES.filter(file => fs.existsSync(path.join(ROOT, file)))
const middlewareFiles = existing.filter(file => file.endsWith('middleware.js') || file.endsWith('middleware.jsx') || file.endsWith('middleware.ts') || file.endsWith('middleware.tsx'))
const proxyFiles = existing.filter(file => file.endsWith('proxy.js') || file.endsWith('proxy.jsx') || file.endsWith('proxy.ts') || file.endsWith('proxy.tsx'))

const fail = message => {
  console.error(`[next-global-entrypoint-gate] ${message}`)
  console.error(`[next-global-entrypoint-gate] Found: ${existing.length ? existing.join(', ') : '(none)'}`)
  process.exit(1)
}

if (middlewareFiles.length > 0) {
  fail('Next.js 16 uses proxy.ts as the canonical global request entrypoint in this repo. Move any middleware logic into src/proxy.ts.')
}

if (proxyFiles.length !== 1 || proxyFiles[0] !== 'src/proxy.ts') {
  fail('Greenhouse expects exactly one global request entrypoint: src/proxy.ts.')
}

console.log('[next-global-entrypoint-gate] OK — single global request entrypoint: src/proxy.ts')
