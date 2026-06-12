// TASK-1083 — greenhouse/no-direct-knowledge-chunk-query
//
// Full API Parity #2 (decisión #16): el reader SSOT searchKnowledge + el store de
// knowledge son el ÚNICO lugar que toca las tablas del corpus para búsqueda/lectura.
// NINGÚN consumer (1084 UI, 1085 Nexa, 1086 MCP, otros dominios) queryea
// greenhouse_knowledge.knowledge_{chunks,documents,document_versions} directo — si se
// duplica, alguien olvida el pre-LLM filtering (audience/sensitivity/agentic_policy)
// y se fuga contenido denegado.
//
// Consumir el contrato:
//   • búsqueda / retrieval → searchKnowledge (src/lib/knowledge/search)
//   • browse / detail      → los readers del store (src/lib/knowledge/store)
//   • endpoints app        → GET /api/platform/app/knowledge/{search,documents,documents/:id}
//
// Modo `warn` durante V1.0; promueve a `error` tras TASK-1084/1085 (cuando los
// consumers reales existan y estén migrados al contrato).
//
// Exentos (en la propia rule):
//   - src/lib/knowledge/**          — el data layer es dueño de las tablas
//   - eslint-plugins/**             — esta rule + sus tests (fixtures con el patrón)
//   - migrations/**                 — DDL, no análisis estático aplicable
//
// Pattern fuente: TASK-822 (no-cross-domain-import-from-client-portal) +
// TASK-890 (no-inline-payroll-scope-gate). AST vanilla, .mjs.

// Solo las tablas de CONTENIDO (chunks + document_versions = el texto recuperable),
// y solo en contexto de query real (FROM/JOIN). `knowledge_documents` (metadata) NO
// se flagea: los signals de governance/ops la cuentan legítimamente. Requerir FROM/JOIN
// evita falsos positivos en arrays de nombres de tabla (registry) y en db.d.ts generado.
const KNOWLEDGE_TABLE_REGEX =
  /\b(?:FROM|JOIN)\s+greenhouse_knowledge\.knowledge_(?:chunks|document_versions)\b/i

const EXEMPT_PATH_REGEX =
  /(^|\/)(src\/lib\/knowledge\/|eslint-plugins\/|migrations\/|src\/types\/db\.d\.ts)/

const MESSAGE =
  'SQL embebido recupera contenido del corpus Knowledge directo (FROM/JOIN ' +
  'greenhouse_knowledge.knowledge_chunks|knowledge_document_versions). Consumí el contrato SSOT: ' +
  'searchKnowledge (src/lib/knowledge/search) para retrieval, o los readers del store ' +
  '(src/lib/knowledge/store) para browse/detail, o los endpoints app /api/platform/app/knowledge/*. ' +
  'Queryear las tablas directo salta el pre-LLM filtering (audience/sensitivity/agentic_policy) y fuga ' +
  'contenido denegado (Full API Parity #2, TASK-1083).'

const normalizePath = (filename) => (filename ? filename.replace(/\\/g, '/') : '')

const checkSqlString = (context, node, sqlText) => {
  if (KNOWLEDGE_TABLE_REGEX.test(sqlText)) {
    context.report({ node, message: MESSAGE })
  }
}

export default {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Prohíbe SQL embebido que queryea las tablas del corpus Knowledge directo. Usar el reader/store/endpoints canónicos (Full API Parity #2).',
      url: 'docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md'
    },
    schema: []
  },

  create(context) {
    const filename = normalizePath(context.filename ?? context.getFilename?.())

    if (EXEMPT_PATH_REGEX.test(filename)) {
      return {}
    }

    return {
      TemplateLiteral(node) {
        const text = node.quasis.map((q) => q.value.raw).join(' ')

        checkSqlString(context, node, text)
      },

      Literal(node) {
        if (typeof node.value !== 'string' || node.value.length < 20) {
          return
        }

        checkSqlString(context, node, node.value)
      }
    }
  }
}
