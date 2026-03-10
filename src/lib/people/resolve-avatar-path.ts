const normalizeValue = (value: string) =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s@._-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

const knownAvatarEntries = [
  {
    matches: ['julio reyes', 'jullio', 'julio', 'julio.reyes@efeonce.org'],
    avatarPath: '/images/greenhouse/team/EO_Avatar-Jullio.png'
  },
  {
    matches: ['daniela ferreira', 'daniela', 'dferreira@efeoncepro.com'],
    avatarPath: '/images/greenhouse/team/EO_Avatar-Daniela.png'
  },
  {
    matches: ['melkin hernandez', 'mekin hernandez'],
    avatarPath: '/images/greenhouse/team/EO_Avatar-Melkin.png'
  },
  {
    matches: ['andres carlosama'],
    avatarPath: '/images/greenhouse/team/EO_Avatar-Fondo_Team_Andr%C3%A9s.png'
  },
  {
    matches: ['valentina'],
    avatarPath: '/images/greenhouse/team/EO_Avatar-Valentina.png'
  },
  {
    matches: ['humberly'],
    avatarPath: '/images/greenhouse/team/Humberly.jpg'
  },
  {
    matches: ['luis'],
    avatarPath: '/images/greenhouse/team/Luis.jpg'
  }
]

export const resolveAvatarPath = (input: { name?: string | null; email?: string | null }) => {
  const signals = [input.name || '', input.email || ''].map(normalizeValue).filter(Boolean)

  for (const entry of knownAvatarEntries) {
    if (entry.matches.some(match => signals.some(signal => signal.includes(normalizeValue(match))))) {
      return entry.avatarPath
    }
  }

  return null
}
