import assert from 'node:assert/strict'

import { parseMigrationSections } from '../migration-marker-gate.mjs'

const cases = [
  {
    name: 'canonical migration with DDL en Up + DROP en Down',
    source: [
      '-- Up Migration',
      '',
      'CREATE TABLE schema.foo (id text PRIMARY KEY);',
      '',
      '-- Down Migration',
      '',
      'DROP TABLE schema.foo;'
    ].join('\n'),
    assertions: result => {
      assert.equal(result.hasUpMarker, true)
      assert.equal(result.hasDownMarker, true)
      assert.match(result.upSection, /CREATE TABLE/)
      assert.match(result.downSection, /DROP TABLE/)
      assert.doesNotMatch(result.downSection, /CREATE TABLE/)
    }
  },
  {
    name: 'pre-up-marker bug: Up vacía + DDL en Down',
    source: [
      '-- Up Migration',
      '',
      '-- Down Migration',
      'CREATE TABLE schema.governance (id text PRIMARY KEY);'
    ].join('\n'),
    assertions: result => {
      assert.equal(result.hasUpMarker, true)
      assert.equal(result.hasDownMarker, true)
      // Up section is whitespace + comments only.
      const stripped = result.upSection.replace(/--[^\n]*/g, '').replace(/\s+/g, '')

      assert.equal(stripped, '', 'Up section must be effectively empty')
      assert.match(result.downSection, /CREATE TABLE/)
    }
  },
  {
    name: 'legacy: no markers (whole file = implicit Up)',
    source: [
      '-- Legacy migration without markers',
      'ALTER TABLE foo ADD COLUMN bar text;'
    ].join('\n'),
    assertions: result => {
      assert.equal(result.hasUpMarker, false)
      assert.equal(result.hasDownMarker, false)
    }
  },
  {
    name: 'asymmetry: Down marker without Up marker',
    source: [
      'CREATE TABLE schema.x (id text);',
      '',
      '-- Down Migration',
      'DROP TABLE schema.x;'
    ].join('\n'),
    assertions: result => {
      assert.equal(result.hasUpMarker, false)
      assert.equal(result.hasDownMarker, true)
    }
  },
  {
    name: 'CREATE OR REPLACE VIEW en Down (revert idempotente válido)',
    source: [
      '-- Up Migration',
      '',
      'CREATE OR REPLACE VIEW schema.v AS SELECT 1;',
      '',
      '-- Down Migration',
      '',
      'CREATE OR REPLACE VIEW schema.v AS SELECT 0;'
    ].join('\n'),
    assertions: result => {
      assert.match(result.upSection, /CREATE OR REPLACE VIEW/)
      assert.match(result.downSection, /CREATE OR REPLACE VIEW/)
    }
  },
  {
    name: 'comentarios en Up se reconocen como vacío efectivo',
    source: [
      '-- Up Migration',
      '',
      '-- This is a comment-only section',
      '/* block comment */',
      '',
      '-- Down Migration',
      '',
      'CREATE INDEX foo_idx ON schema.foo (id);'
    ].join('\n'),
    assertions: result => {
      const stripped = result.upSection
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/--[^\n]*/g, '')
        .replace(/\s+/g, '')

      assert.equal(stripped, '', 'comments-only Up section must be effectively empty')
      assert.match(result.downSection, /CREATE INDEX/)
    }
  },
  {
    name: 'parser case-insensitive en markers',
    source: [
      '-- up migration',
      'CREATE TABLE foo (id text);',
      '-- down MIGRATION',
      'DROP TABLE foo;'
    ].join('\n'),
    assertions: result => {
      assert.equal(result.hasUpMarker, true)
      assert.equal(result.hasDownMarker, true)
    }
  }
]

let passed = 0
let failed = 0

for (const testCase of cases) {
  try {
    const result = parseMigrationSections(testCase.source)

    testCase.assertions(result)

     
    console.log(`  ✓ ${testCase.name}`)
    passed++
  } catch (error) {
     
    console.error(`  ✗ ${testCase.name}`)
     
    console.error(`    ${error.message}`)
    failed++
  }
}

 
console.log(`\n[migration-marker-gate.test] ${passed}/${passed + failed} passed.`)

if (failed > 0) process.exit(1)
