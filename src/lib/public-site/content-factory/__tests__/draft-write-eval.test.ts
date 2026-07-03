import { describe, expect, it } from 'vitest'

import { authorGutenbergDraft, type GutenbergArticleSpec } from '../article-authoring'
import { buildGovernedDraftWriteEval, parseGovernedDraftWriteReadback } from '../draft-write-eval'

const spec: GutenbergArticleSpec = {
  title: 'Cómo tratar la AI como capacidad gobernada',
  excerpt: 'Guía práctica con criterio operativo.',
  seo: { title: 'AI gobernada %%sep%% %%sitename%%', description: 'Descripción con acentos: gobernó, está, aquí.' },
  intro: ['Intro con tildes: acción, gestión, decisión.'],
  sections: [
    { level: 2, heading: 'Qué cambia', blocks: [{ kind: 'paragraph', text: 'Contexto.' }] },
    { level: 2, heading: 'Cómo empezar', blocks: [{ kind: 'list', items: ['Uno', 'Dos'] }] },
    { level: 2, heading: 'Qué medir', blocks: [{ kind: 'quote', text: 'Evidencia sobre opinión.' }] }
  ]
}

const draft = authorGutenbergDraft(spec)

describe('buildGovernedDraftWriteEval', () => {
  const php = buildGovernedDraftWriteEval({ draft, authorId: 1, manifestId: 'greenhouse-cf-test-001' })

  it('creates a PRIVATE post authored by the passed operator user', () => {
    expect(php).toContain("'post_status'  => 'private'")
    expect(php).toContain("'post_author'  => $author_id")
    expect(php).toContain('$author_id = 1;')
  })

  it('is idempotent by manifest id (skips if the post already exists)', () => {
    expect(php).toContain("'meta_value'  => $manifest")
    expect(php).toContain("'outcome' => 'already_exists'")
  })

  it('embeds es-CL text as raw UTF-8 nowdoc — never \\uXXXX (the encoding gotcha)', () => {
    expect(php).toContain('acentos: gobernó, está, aquí') // metadesc verbatim
    expect(php).toContain('acción, gestión, decisión') // intro verbatim
    expect(php).not.toContain('\\u00f3') // no JSON unicode escapes leaked into PHP
    expect(php).toContain("<<<'GHCFWRITE'")
  })

  it('stamps ownership + Yoast SEO metadata', () => {
    expect(php).toContain("update_post_meta( $post_id, '_greenhouse_owned', '1' )")
    expect(php).toContain('_greenhouse_manifest_id')
    expect(php).toContain('_yoast_wpseo_metadesc')
  })

  it('rejects an invalid author id, slug, or manifest', () => {
    expect(() => buildGovernedDraftWriteEval({ draft, authorId: 0, manifestId: 'greenhouse-cf-test-001' })).toThrow(
      'content_factory_write_author_id_invalid'
    )
    expect(() => buildGovernedDraftWriteEval({ draft, authorId: 1.5, manifestId: 'greenhouse-cf-test-001' })).toThrow(
      'content_factory_write_author_id_invalid'
    )
    expect(() => buildGovernedDraftWriteEval({ draft, authorId: 1, manifestId: 'Bad Manifest!' })).toThrow(
      'content_factory_write_manifest_id_invalid'
    )
    expect(() =>
      buildGovernedDraftWriteEval({ draft: { ...draft, slug: 'Not A Slug' }, authorId: 1, manifestId: 'greenhouse-cf-test-001' })
    ).toThrow('content_factory_write_slug_invalid')
  })

  it('throws on a nowdoc delimiter collision instead of emitting broken PHP', () => {
    const poisoned = authorGutenbergDraft({ ...spec, intro: ['texto con GHCFWRITE adentro'] })

    expect(() => buildGovernedDraftWriteEval({ draft: poisoned, authorId: 1, manifestId: 'greenhouse-cf-test-001' })).toThrow(
      'content_factory_write_nowdoc_delimiter_collision'
    )
  })
})

describe('parseGovernedDraftWriteReadback', () => {
  it('parses a created readback (author name with a space)', () => {
    const stdout =
      'some noise\nGHCF_RESULT {"outcome":"created","post_id":250748,"status":"private","author_id":1,"author_name":"Julio Reyes","parsed_blocks":35,"edit_url":"https://efeoncepro.com/wp-admin/post.php?post=250748&action=edit"}\n'

    const parsed = parseGovernedDraftWriteReadback(stdout)

    expect(parsed).toMatchObject({
      outcome: 'created',
      postId: 250748,
      status: 'private',
      authorId: 1,
      authorName: 'Julio Reyes',
      parsedBlocks: 35
    })
  })

  it('parses already_exists and error outcomes', () => {
    expect(parseGovernedDraftWriteReadback('GHCF_RESULT {"outcome":"already_exists","post_id":9}')).toMatchObject({
      outcome: 'already_exists',
      postId: 9
    })
    expect(parseGovernedDraftWriteReadback('GHCF_RESULT {"outcome":"error","message":"boom"}')).toMatchObject({
      outcome: 'error',
      message: 'boom'
    })
  })

  it('returns null when there is no result line', () => {
    expect(parseGovernedDraftWriteReadback('nothing here')).toBeNull()
  })
})
