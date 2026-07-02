/**
 * Robust react-pdf text extraction for tests.
 *
 * Replaces the fragile pattern of rendering a react-pdf document to a binary
 * PDF and re-parsing it with `pdf-parse` (whose bundled pdf.js throws
 * `UnknownErrorException: Illegal character: 41` non-deterministically in CI —
 * green locally, red on the hosted runner). Instead we walk the react-pdf React
 * element tree directly and collect the text content of every `<Text>` node.
 * Deterministic, dependency-free, and identical in CI and local.
 *
 * This is safe because:
 *   1. react-pdf primitives (`Document`/`Page`/`View`/`Text`/`Image`/…) are
 *      string host types, so they are matched by identity, never invoked.
 *   2. Greenhouse PDF document components are pure presentational functions
 *      (no hooks), so the tree resolves by plain recursion without a renderer.
 *
 * Pattern: each PDF generator exposes a `build*DocumentElement()` that returns
 * the `<Document>` React element (SSOT). Production renders it to a Buffer;
 * tests pass the same element here and assert on `runs` / `text` / `normalized`.
 */
import { isValidElement, type ReactElement, type ReactNode } from 'react'

import { Text as ReactPdfText } from '@react-pdf/renderer'

const asChildrenProps = (node: ReactElement): { children?: ReactNode } =>
  (node.props as { children?: ReactNode } | null) ?? {}

const isReactPdfText = (type: ReactElement['type']): boolean =>
  (type as unknown) === (ReactPdfText as unknown)

/** Flatten every string/number leaf under a node (used to concatenate a `<Text>` run). */
const collectStrings = (node: ReactNode): string[] => {
  if (node === null || node === undefined || typeof node === 'boolean') return []
  if (typeof node === 'string') return [node]
  if (typeof node === 'number') return [String(node)]
  if (Array.isArray(node)) return node.flatMap(collectStrings)

  if (isValidElement(node)) {
    const { type } = node

    if (typeof type === 'function') {
      // Pure presentational component (no hooks): invoke to expand its subtree.
      return collectStrings((type as (props: unknown) => ReactNode)(node.props))
    }

    
return collectStrings(asChildrenProps(node).children)
  }

  
return []
}

export interface ExtractedReactPdfText {
  /** One entry per `<Text>` node: its concatenated descendant string, in document order. */
  runs: string[]
  /** Runs joined by newline — for line-oriented landmark assertions. */
  text: string
  /** Runs joined by a single space, whitespace-collapsed — for phrases that may span nodes. */
  normalized: string
  /** Runs concatenated with whitespace removed — for tokens split only by layout. */
  compact: string
}

/**
 * Walk a react-pdf `<Document>` element tree and extract the text content of
 * every `<Text>` node without rendering to a binary PDF.
 */
export const extractReactPdfText = (root: ReactElement): ExtractedReactPdfText => {
  const runs: string[] = []

  const walk = (node: ReactNode): void => {
    if (node === null || node === undefined || typeof node === 'boolean') return
    if (typeof node === 'string' || typeof node === 'number') return

    if (Array.isArray(node)) {
      node.forEach(walk)
      
return
    }

    if (!isValidElement(node)) return

    const { type } = node

    if (isReactPdfText(type)) {
      const run = collectStrings(asChildrenProps(node).children).join('')

      if (run.length > 0) runs.push(run)
      
return
    }

    if (typeof type === 'function') {
      walk((type as (props: unknown) => ReactNode)(node.props))
      
return
    }

    walk(asChildrenProps(node).children)
  }

  walk(root)

  return {
    runs,
    text: runs.join('\n'),
    normalized: runs.join(' ').replace(/\s+/g, ' ').trim(),
    compact: runs.join('').replace(/\s+/g, '')
  }
}
