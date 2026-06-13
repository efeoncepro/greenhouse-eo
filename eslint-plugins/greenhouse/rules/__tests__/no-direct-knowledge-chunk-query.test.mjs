// TASK-1083 Slice 2 — tests para greenhouse/no-direct-knowledge-chunk-query.
//
// Confirma que la rule:
//   1. Reporta SQL embebido que toca greenhouse_knowledge.knowledge_{chunks,
//      documents,document_versions} desde un consumer (api route, view, otro lib).
//   2. NO reporta sobre el data layer (src/lib/knowledge/**), migrations ni el plugin.
//   3. NO reporta sobre código limpio que consume el contrato (searchKnowledge /
//      store readers) sin SQL directo.
//
// Pattern heredado de no-cross-domain-import-from-client-portal (TASK-822).

import { RuleTester } from 'eslint'

import rule from '../no-direct-knowledge-chunk-query.mjs'

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: 'module'
  }
})

const CHUNK_SQL = '`SELECT body_text FROM greenhouse_knowledge.knowledge_chunks WHERE document_id = $1`'

ruleTester.run('greenhouse/no-direct-knowledge-chunk-query', rule, {
  valid: [
    {
      name: 'data layer search reader is exempt',
      filename: '/repo/src/lib/knowledge/search/search-knowledge.ts',
      code: CHUNK_SQL
    },
    {
      name: 'data layer store is exempt',
      filename: '/repo/src/lib/knowledge/store.ts',
      code: CHUNK_SQL
    },
    {
      name: 'migrations are exempt (DDL)',
      filename: '/repo/migrations/20260612072724451_task-1083.sql.ts',
      code: CHUNK_SQL
    },
    {
      name: 'the plugin + its tests are exempt',
      filename: '/repo/eslint-plugins/greenhouse/rules/no-direct-knowledge-chunk-query.mjs',
      code: CHUNK_SQL
    },
    {
      name: 'generated db types are exempt',
      filename: '/repo/src/types/db.d.ts',
      code: CHUNK_SQL
    },
    {
      name: 'ops governance counting knowledge_documents (metadata) is allowed',
      filename: '/repo/src/lib/reliability/queries/knowledge-quarantine-count.ts',
      code: `\`SELECT COUNT(*) FROM greenhouse_knowledge.knowledge_documents WHERE publication_status = 'quarantined'\``
    },
    {
      name: 'registry array listing table names (no FROM/JOIN) is clean',
      filename: '/repo/src/lib/reliability/registry.ts',
      code: `const tables = ['greenhouse_knowledge.knowledge_chunks', 'greenhouse_knowledge.knowledge_document_versions']`
    },
    {
      name: 'consumer using the contract (no direct SQL) is clean',
      filename: '/repo/src/lib/api-platform/resources/app-knowledge.ts',
      code: `import { searchKnowledge } from '@/lib/knowledge/search/search-knowledge'`
    },
    {
      name: 'unrelated SQL touching other tables is clean',
      filename: '/repo/src/lib/some-domain/reader.ts',
      code: '`SELECT * FROM greenhouse_core.members WHERE active = TRUE`'
    }
  ],
  invalid: [
    {
      name: 'api route querying knowledge_chunks content directly',
      filename: '/repo/src/app/api/platform/app/knowledge/search/route.ts',
      code: CHUNK_SQL,
      errors: 1
    },
    {
      name: 'view JOINing knowledge_chunks directly',
      filename: '/repo/src/views/greenhouse/knowledge/KnowledgeView.tsx',
      code: '`SELECT d.title FROM x JOIN greenhouse_knowledge.knowledge_chunks kc ON kc.x = d.x`',
      errors: 1
    },
    {
      name: 'other domain querying knowledge_document_versions content directly',
      filename: '/repo/src/lib/nexa/retrieval.ts',
      code: '`SELECT normalized_markdown FROM greenhouse_knowledge.knowledge_document_versions`',
      errors: 1
    }
  ]
})
