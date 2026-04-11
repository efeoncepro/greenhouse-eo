export type PrimaryColorConfig = {
  name?: string
  light?: string
  main: string
  dark?: string
}

// Efeonce institutional palette — 7 options from the brand ecosystem.
// Default (first entry) is Core Blue. All others are Efeonce family colors.
// Contract: docs/architecture/GREENHOUSE_THEME_TOKEN_CONTRACT_V1.md §4.1
const primaryColorConfig: PrimaryColorConfig[] = [
  {
    name: 'efeonce-core',
    light: '#3691E3',
    main: '#0375DB',
    dark: '#024C8F'
  },
  {
    name: 'efeonce-royal',
    light: '#0375DB',
    main: '#024C8F',
    dark: '#023C70'
  },
  {
    name: 'efeonce-azure',
    light: '#024C8F',
    main: '#023C70',
    dark: '#022A4E'
  },
  {
    name: 'efeonce-midnight',
    light: '#023C70',
    main: '#022A4E',
    dark: '#011A32'
  },
  {
    name: 'efeonce-lime',
    light: '#8FD139',
    main: '#6EC207',
    dark: '#589C05'
  },
  {
    name: 'efeonce-sunset',
    light: '#FF8533',
    main: '#FF6500',
    dark: '#CC5100'
  },
  {
    name: 'efeonce-crimson',
    light: '#CC4477',
    main: '#BB1954',
    dark: '#99133D'
  }
]

export default primaryColorConfig
