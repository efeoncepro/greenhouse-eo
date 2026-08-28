const opportunityCodePattern = /\b\d{2,}-\d{1,}-[A-Z]{2,}\d{2}\b/i

export function parseLicitaLabRadarArgs(args) {
  const parsed = {
    checkOnly: false,
    forceLogin: false,
    help: false,
    maxOpportunities: 100,
    output: null,
    view: null
  }

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index]

    if (arg === '--') continue

    if (arg === '--check-only') {
      parsed.checkOnly = true
      continue
    }

    if (arg === '--force-login') {
      parsed.forceLogin = true
      continue
    }

    if (arg === '--max-opportunities') {
      const value = Number.parseInt(args[index + 1] || '', 10)

      if (!Number.isInteger(value) || value < 1 || value > 500) {
        throw new Error('--max-opportunities debe estar entre 1 y 500')
      }

      parsed.maxOpportunities = value
      index += 1
      continue
    }

    if (arg === '--output') {
      const value = args[index + 1]

      if (!value) throw new Error('--output requiere una ruta bajo .auth/')
      parsed.output = value
      index += 1
      continue
    }

    if (arg === '--view') {
      const value = String(args[index + 1] || '').toLowerCase()

      if (!['recommended', 'all'].includes(value)) {
        throw new Error('--view acepta recommended o all')
      }

      parsed.view = value
      index += 1
      continue
    }

    if (arg === '--help' || arg === '-h') {
      parsed.help = true
      continue
    }

    throw new Error(`opción no reconocida: ${arg}`)
  }

  return parsed
}

export function parseLicitaLabOpportunityCells(cells) {
  const normalizedCells = cells.map(value => normalizeMultiline(value)).filter(Boolean)
  const rawText = normalizedCells.join('\n')
  const code = rawText.match(opportunityCodePattern)?.[0]?.toUpperCase() || null

  if (!code) return null

  const opportunityCell = normalizedCells[0] || rawText
  const opportunityLines = opportunityCell.split('\n').map(normalizeText).filter(Boolean)

  const title =
    opportunityLines.find(line => {
      if (opportunityCodePattern.test(line)) return false
      if (/^(?:★|☆|\*)?\s*\d{1,3}%$/.test(line)) return false
      if (/^(?:Ágil|LP|LE|L1|LS)\b/i.test(line)) return false
      if (/^Recomendada$/i.test(line)) return false

      return line.length >= 8
    }) || null

  const buyerLines = (normalizedCells[1] || '').split('\n').map(normalizeText).filter(Boolean)
  const amountText = normalizedCells.find(value => /\$\s*[\d.]+/.test(value)) || null
  const closeText = normalizedCells.find(value => /\b\d{1,2}\/\d{1,2}\/\d{4}\b/.test(value)) || null

  return {
    code,
    title: title ? stripScorePrefix(title) : null,
    scorePct: parseScore(opportunityCell),
    buyer: buyerLines[0] || null,
    buyerRegion: buyerLines[1] || null,
    amountText: amountText ? normalizeText(amountText.split('\n')[0]) : null,
    closeText: closeText ? normalizeText(closeText) : null,
    rawText
  }
}

export function normalizeText(value) {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .trim()
}

function normalizeMultiline(value) {
  return String(value || '')
    .split('\n')
    .map(normalizeText)
    .filter(Boolean)
    .join('\n')
}

function stripScorePrefix(value) {
  return normalizeText(value).replace(/^(?:★|☆|\*)?\s*\d{1,3}%\s*/, '') || null
}

function parseScore(value) {
  const match = String(value || '').match(/(?:★|☆|\*)?\s*(\d{1,3})%/)

  if (!match) return null
  const score = Number.parseInt(match[1], 10)

  return score >= 0 && score <= 100 ? score : null
}
