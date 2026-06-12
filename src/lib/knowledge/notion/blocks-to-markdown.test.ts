import { describe, expect, it } from 'vitest'

import { blocksToMarkdown, richTextToMarkdown } from './blocks-to-markdown'
import type { NotionBlock, NotionRichText } from './notion-knowledge-client'

const rt = (
  plain_text: string,
  annotations: NotionRichText['annotations'] = {},
  href: string | null = null
): NotionRichText => ({ plain_text, annotations, href })

const block = (
  type: string,
  payload: Record<string, unknown>,
  children?: NotionBlock[]
): NotionBlock => ({
  id: `b-${type}-${Math.round(payload.rich_text ? (payload.rich_text as unknown[]).length : 0)}`,
  type,
  has_children: Boolean(children && children.length > 0),
  ...(children ? { children } : {}),
  [type]: payload
})

describe('richTextToMarkdown', () => {
  it('returns empty string for empty/undefined', () => {
    expect(richTextToMarkdown(undefined)).toBe('')
    expect(richTextToMarkdown([])).toBe('')
  })

  it('applies bold/italic/strikethrough', () => {
    expect(richTextToMarkdown([rt('hi', { bold: true })])).toBe('**hi**')
    expect(richTextToMarkdown([rt('hi', { italic: true })])).toBe('*hi*')
    expect(richTextToMarkdown([rt('hi', { strikethrough: true })])).toBe('~~hi~~')
  })

  it('code takes precedence over other annotations', () => {
    expect(richTextToMarkdown([rt('x = 1', { code: true, bold: true })])).toBe('`x = 1`')
  })

  it('wraps links', () => {
    expect(richTextToMarkdown([rt('docs', {}, 'https://example.com')])).toBe('[docs](https://example.com)')
  })

  it('concatenates segments', () => {
    expect(richTextToMarkdown([rt('Hola '), rt('mundo', { bold: true })])).toBe('Hola **mundo**')
  })
})

describe('blocksToMarkdown', () => {
  it('renders headings at the right level', () => {
    const md = blocksToMarkdown([
      block('heading_1', { rich_text: [rt('Title')] }),
      block('heading_2', { rich_text: [rt('Section')] }),
      block('heading_3', { rich_text: [rt('Sub')] })
    ])

    expect(md).toBe('# Title\n\n## Section\n\n### Sub')
  })

  it('renders paragraphs separated by blank lines', () => {
    const md = blocksToMarkdown([
      block('paragraph', { rich_text: [rt('One')] }),
      block('paragraph', { rich_text: [rt('Two')] })
    ])

    expect(md).toBe('One\n\nTwo')
  })

  it('numbers ordered list items sequentially and resets on interruption', () => {
    const md = blocksToMarkdown([
      block('numbered_list_item', { rich_text: [rt('A')] }),
      block('numbered_list_item', { rich_text: [rt('B')] }),
      block('paragraph', { rich_text: [rt('break')] }),
      block('numbered_list_item', { rich_text: [rt('C')] })
    ])

    expect(md).toBe('1. A\n\n2. B\n\nbreak\n\n1. C')
  })

  it('renders bulleted and to_do items', () => {
    const md = blocksToMarkdown([
      block('bulleted_list_item', { rich_text: [rt('bullet')] }),
      block('to_do', { rich_text: [rt('done')], checked: true }),
      block('to_do', { rich_text: [rt('pending')], checked: false })
    ])

    expect(md).toBe('- bullet\n\n- [x] done\n\n- [ ] pending')
  })

  it('renders quote and callout with emoji', () => {
    const md = blocksToMarkdown([
      block('quote', { rich_text: [rt('cited')] }),
      block('callout', { rich_text: [rt('note')], icon: { emoji: '💡' } })
    ])

    expect(md).toBe('> cited\n\n> 💡 note')
  })

  it('renders a fenced code block with language', () => {
    const md = blocksToMarkdown([block('code', { rich_text: [rt('const x = 1')], language: 'typescript' })])

    expect(md).toBe('```typescript\nconst x = 1\n```')
  })

  it('renders divider', () => {
    const md = blocksToMarkdown([
      block('paragraph', { rich_text: [rt('a')] }),
      block('divider', {}),
      block('paragraph', { rich_text: [rt('b')] })
    ])

    expect(md).toBe('a\n\n---\n\nb')
  })

  it('indents nested list children under their parent item', () => {
    const md = blocksToMarkdown([
      block('bulleted_list_item', { rich_text: [rt('parent')] }, [
        block('bulleted_list_item', { rich_text: [rt('child')] })
      ])
    ])

    expect(md).toBe('- parent\n  - child')
  })

  it('renders a table with a column header', () => {
    const md = blocksToMarkdown([
      block('table', { has_column_header: true }, [
        block('table_row', { cells: [[rt('Col A')], [rt('Col B')]] }),
        block('table_row', { cells: [[rt('1')], [rt('2')]] })
      ])
    ])

    expect(md).toBe('| Col A | Col B |\n| --- | --- |\n| 1 | 2 |')
  })

  it('flattens container blocks (column_list/synced_block) to their children', () => {
    const md = blocksToMarkdown([
      block('column_list', {}, [
        block('column', {}, [block('paragraph', { rich_text: [rt('inside')] })])
      ])
    ])

    expect(md).toBe('inside')
  })

  it('omits child_page and renders unknown leaf blocks with text as paragraphs', () => {
    const md = blocksToMarkdown([
      block('child_page', { title: 'Sub' }),
      block('some_future_block', { rich_text: [rt('still readable')] })
    ])

    expect(md).toBe('still readable')
  })

  it('emits external image links but drops Notion-hosted presigned S3 urls (would trip the sanitizer)', () => {
    const md = blocksToMarkdown([
      block('image', { external: { url: 'https://cdn.example.com/logo.png' }, caption: [rt('Logo')] }),
      block('image', {
        file: { url: 'https://prod-files-secure.s3.us-west-2.amazonaws.com/x.png?X-Amz-Credential=ASIA123&X-Amz-Signature=abc' },
        caption: [rt('Diagrama')]
      })
    ])

    // external → link estable; file (presigned) → solo caption, sin la URL con credenciales
    expect(md).toBe('[Logo](https://cdn.example.com/logo.png)\n\n(Diagrama)')
    expect(md).not.toContain('X-Amz-Credential')
  })

  it('flattens children of unknown container blocks (e.g. tab) instead of dropping them', () => {
    const md = blocksToMarkdown([
      block('tab', { rich_text: [] }, [
        block('heading_2', { rich_text: [rt('Tab section')] }),
        block('paragraph', { rich_text: [rt('Tab body')] })
      ])
    ])

    expect(md).toBe('## Tab section\n\nTab body')
  })

  it('collapses excess blank lines and trims', () => {
    const md = blocksToMarkdown([
      block('paragraph', { rich_text: [rt('a')] }),
      block('paragraph', { rich_text: [] }),
      block('paragraph', { rich_text: [rt('b')] })
    ])

    expect(md).toBe('a\n\nb')
  })
})
