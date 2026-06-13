import 'server-only'

import { access, readFile, stat } from 'node:fs/promises'
import { join } from 'node:path'

import { KnowledgeNotFoundError } from '../errors'

import type {
  KnowledgeConnectorListItem,
  KnowledgeDocCandidate,
  KnowledgeLoadedDocument,
  KnowledgeSourceConnector,
  KnowledgeSourceDescriptor
} from './connector'
import { PILOT_CORPUS, PILOT_REPO_DOCS_SOURCE_NAME, type PilotCorpusEntry } from './pilot-corpus'

const REPO_ROOT = process.cwd()

const toCandidate = (entry: PilotCorpusEntry): KnowledgeDocCandidate => ({
  slug: entry.slug,
  title: entry.title,
  documentType: entry.documentType,
  ownerDomain: entry.ownerDomain,
  approverRole: entry.approverRole,
  audience: entry.audience,
  sensitivity: entry.sensitivity,
  agenticPolicy: entry.agenticPolicy,
  docLayer: entry.docLayer,
  humanUrl: entry.humanUrl,
  sourceLocator: (entry.sourceFiles ?? []).join(', ') || '(to-author)'
})

const fileExists = async (relPath: string): Promise<boolean> => {
  try {
    await access(join(REPO_ROOT, relPath))

    return true
  } catch {
    return false
  }
}

/**
 * Connector `repo_docs` — ingiere documentos markdown del repositorio (el corpus
 * piloto). Es una fuente de ingesta operada por script/ops, no runtime del portal.
 */
export class RepoDocsKnowledgeConnector implements KnowledgeSourceConnector {
  readonly sourceSystem = 'repo_docs' as const

  readonly sourceDescriptor: KnowledgeSourceDescriptor = {
    sourceSystem: 'repo_docs',
    sourceKind: 'markdown_collection',
    name: PILOT_REPO_DOCS_SOURCE_NAME,
    ownerDomain: 'platform',
    audience: 'internal'
  }

  private readonly entries: readonly PilotCorpusEntry[]

  constructor(entries: readonly PilotCorpusEntry[] = PILOT_CORPUS) {
    this.entries = entries
  }

  async list(): Promise<KnowledgeConnectorListItem[]> {
    const items: KnowledgeConnectorListItem[] = []

    for (const entry of this.entries) {
      const candidate = toCandidate(entry)

      if (!entry.sourceFiles || entry.sourceFiles.length === 0) {
        items.push({
          kind: 'unavailable',
          candidate,
          reason: 'to-author: sin archivo fuente declarado'
        })
        continue
      }

      const missing: string[] = []

      for (const file of entry.sourceFiles) {
        if (!(await fileExists(file))) {
          missing.push(file)
        }
      }

      if (missing.length > 0) {
        items.push({
          kind: 'unavailable',
          candidate,
          reason: `archivo(s) faltante(s): ${missing.join(', ')}`
        })
      } else {
        items.push({ kind: 'available', candidate })
      }
    }

    return items
  }

  async load(candidate: KnowledgeDocCandidate): Promise<KnowledgeLoadedDocument> {
    const entry = this.entries.find(e => e.slug === candidate.slug)

    if (!entry || !entry.sourceFiles || entry.sourceFiles.length === 0) {
      throw new KnowledgeNotFoundError('repo_docs source file', candidate.slug)
    }

    const parts: string[] = []
    let latestEditedAt: string | null = null

    for (const file of entry.sourceFiles) {
      const absolute = join(REPO_ROOT, file)

      parts.push(await readFile(absolute, 'utf8'))

      const stats = await stat(absolute)
      const mtime = stats.mtime.toISOString()

      if (!latestEditedAt || mtime > latestEditedAt) {
        latestEditedAt = mtime
      }
    }

    return {
      candidate,
      rawMarkdown: parts.join('\n\n'),
      provenance: {
        sourceSystem: 'repo_docs',
        sourceUrl: entry.sourceFiles.join(', '),
        sourcePageId: null,
        sourceCreatedAt: null,
        sourceEditedAt: latestEditedAt
      }
    }
  }
}
