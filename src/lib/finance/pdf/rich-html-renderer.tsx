import 'server-only'

import { Text, View } from '@react-pdf/renderer'

import { PdfColors, PdfFonts } from './tokens'

/**
 * Lightweight whitelist HTML renderer for product description rich HTML
 * (TASK-603 + TASK-629). Supports a deliberately tiny tag set:
 * <p>, <strong>, <em>, <ul>, <ol>, <li>, <br>.
 *
 * The HTML coming from `product_catalog.description_rich_html` is already
 * sanitized server-side via `sanitizeProductDescriptionHtml` (TASK-603),
 * so this renderer trusts the input shape. Anything outside the whitelist
 * renders as plain text.
 */

interface RenderOptions {
  baseFontSize?: number
  baseColor?: string
  primaryColor?: string
  lineHeight?: number
}

const stripTags = (html: string): string =>
  html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim()

/**
 * Splits HTML into block-level chunks based on <p>, <ul>, <ol>, <br>.
 * Each chunk is rendered as a separate React-PDF block.
 */
const splitIntoBlocks = (html: string): string[] => {
  if (!html) return []

  // Normalize <br> as paragraph break
  const normalized = html
    .replace(/<br\s*\/?\s*>/gi, '</p><p>')
    .replace(/&nbsp;/g, ' ')

  // Split on closing block tags
  const parts = normalized.split(/(?=<(?:p|ul|ol)[\s>])/i)

  return parts.map(p => p.trim()).filter(Boolean)
}

const renderInlineRuns = (
  innerHtml: string,
  baseColor: string,
  primaryColor: string
): React.ReactNode[] => {
  if (!innerHtml) return []

  const runs: React.ReactNode[] = []

  // Tokenize by <strong>, <em>, or plain text
  const re = /<(strong|em)>(.*?)<\/\1>|([^<]+)/gis
  let match: RegExpExecArray | null
  let key = 0

  while ((match = re.exec(innerHtml)) !== null) {
    const [, tag, inner, plain] = match

    if (plain) {
      const text = plain.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')

      if (text.trim()) {
        runs.push(<Text key={key++}>{text}</Text>)
      } else if (text.length > 0) {
        runs.push(<Text key={key++}>{text}</Text>)
      }
    } else if (tag === 'strong') {
      runs.push(
        <Text key={key++} style={{ fontFamily: PdfFonts.bodyBold, color: primaryColor }}>
          {stripTags(inner)}
        </Text>
      )
    } else if (tag === 'em') {
      runs.push(
        <Text key={key++} style={{ fontStyle: 'italic', color: baseColor }}>
          {stripTags(inner)}
        </Text>
      )
    }
  }

  return runs
}

export const renderRichHtmlBlocks = (
  html: string | null,
  options: RenderOptions = {}
): React.ReactNode => {
  if (!html || !html.trim()) return null

  const baseFontSize = options.baseFontSize ?? 9
  const baseColor = options.baseColor ?? PdfColors.text
  const primaryColor = options.primaryColor ?? PdfColors.primary
  const lineHeight = options.lineHeight ?? 1.5

  const blocks = splitIntoBlocks(html)

  return (
    <View>
      {blocks.map((block, idx) => {
        // List block
        const listMatch = block.match(/^<(ul|ol)[\s>]([\s\S]*?)<\/\1>/i)

        if (listMatch) {
          const [, listTag, listBody] = listMatch
          const items = Array.from(listBody.matchAll(/<li>([\s\S]*?)<\/li>/gi))

          return (
            <View key={idx} style={{ marginBottom: 6, paddingLeft: 12 }}>
              {items.map((item, itemIdx) => (
                <View key={itemIdx} style={{ flexDirection: 'row', marginBottom: 2 }}>
                  <Text style={{ fontSize: baseFontSize, color: baseColor, width: 12 }}>
                    {listTag === 'ol' ? `${itemIdx + 1}.` : '•'}
                  </Text>
                  <Text style={{ fontSize: baseFontSize, color: baseColor, lineHeight, flex: 1 }}>
                    {renderInlineRuns(item[1], baseColor, primaryColor)}
                  </Text>
                </View>
              ))}
            </View>
          )
        }

        // Paragraph block (or untagged)
        const paraMatch = block.match(/^<p[\s>]([\s\S]*?)<\/p>/i) ?? block.match(/<p[\s>]([\s\S]*?)<\/p>/i)
        const inner = paraMatch ? paraMatch[1] : block

        return (
          <Text
            key={idx}
            style={{
              fontFamily: PdfFonts.body,
              fontSize: baseFontSize,
              color: baseColor,
              lineHeight,
              marginBottom: 6
            }}
          >
            {renderInlineRuns(inner, baseColor, primaryColor)}
          </Text>
        )
      })}
    </View>
  )
}
