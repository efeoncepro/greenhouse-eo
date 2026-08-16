export interface AssessmentCompetencyRadarRow {
  competencyId: string
  competencyKey: string
  competencyName: string
  score: number | null
  target: number
  pending: boolean
}

const RADAR_LABELS_BY_KEY: Record<string, string[]> = {
  client_relationship_comm: ['Cliente y', 'comunicación'],
  commercial_acumen: ['Crecimiento', 'comercial'],
  copywriting: ['Copywriting'],
  composure_pressure: ['Compostura'],
  leadership: ['Liderazgo'],
  ownership: ['Ownership'],
  seo: ['SEO'],
  vendor_management: ['Gestión de', 'proveedores'],
  delivery_coordination: ['Coordinación', 'de entrega'],
  project_management: ['Gestión de', 'proyectos'],
  community_management: ['Gestión de', 'comunidad'],
  communication: ['Comunicación'],
  collaboration: ['Colaboración'],
  numerical: ['Razonamiento', 'numérico'],
  verbal: ['Razonamiento', 'verbal'],
  logical: ['Razonamiento', 'lógico'],
  social_channel_strategy: ['Estrategia', 'por canal'],
  tool_fluency: ['Herramientas', 'de contenido'],
  content_analytics: ['Analítica de', 'contenido'],
  research_synthesis: ['Investigación', 'editorial']
}

const wrapAtWordBoundaries = (label: string, preferredLineLength = 18): string[] => {
  const words = label.trim().split(/\s+/).filter(Boolean)

  if (words.length === 0) return ['—']

  return words.reduce<string[]>((lines, word) => {
    const currentLine = lines.at(-1)

    if (!currentLine || `${currentLine} ${word}`.length > preferredLineLength) {
      lines.push(word)
    } else {
      lines[lines.length - 1] = `${currentLine} ${word}`
    }

    return lines
  }, [])
}

export const competencyRadarLabelLines = (competencyKey: string, competencyName: string): string[] =>
  RADAR_LABELS_BY_KEY[competencyKey] ?? wrapAtWordBoundaries(competencyName)

export const isAssessmentRadarComplete = (rows: AssessmentCompetencyRadarRow[]): boolean =>
  rows.length > 0 && rows.every(row => !row.pending && row.score != null)
