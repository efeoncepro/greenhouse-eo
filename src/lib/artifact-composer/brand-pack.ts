/**
 * Artifact Composer — el CONTRATO de brand pack (TASK-1393 Slice 3b).
 *
 * **La marca es un INPUT del motor, no una constante.** Un brand pack declara colores (primitives +
 * roles + opacidades) y — desde Slice 4 — tipografía (fuentes + type roles). AXIS es *el brand pack
 * de Efeonce*, no *el* brand pack: nada en el motor ni en una plantilla nombra una marca.
 *
 * El compilador es DETERMINISTA: mismo pack → mismo CSS, byte a byte (entradas ordenadas, sin
 * reloj, sin red). El CSS compilado se COMMITEA y un test verifica que está sincronizado — el
 * renderer nunca depende de Figma ni de un build paralelo.
 *
 * Guard de CONTRASTE (WCAG AA): apenas la marca es un input, un cliente puede traer una paleta que
 * produzca texto bajo 4,5:1 — y el deck sale ilegible o inadmisible. El compilador evalúa los pares
 * declarados por el pack y **falla al compilar, no en la lámina**… con un scoping deliberado:
 * `enforcement: 'advisory'` para el pack default `axis` (afinado a mano; un refactor no arregla una
 * decisión de marca — la revela) y `'blocking'` para packs no-default (cliente).
 */

/** Un color del pack: nombre de variable CSS + valor exacto + procedencia verificable. */
export interface BrandPackColor {
  /** Nombre de la custom property (ej. `--axis-deck-teal-500`). */
  cssVar: string
  /** Valor EXACTO `#rrggbb`. El compilador no aproxima ni normaliza: `#0375D9 ≠ #0375DB`. */
  hex: string
  /** Procedencia: variable/node en el SoT declarado del pack, o `proposed` si aún no existe allá. */
  source: { collection: string; figmaName?: string; nodeId: string | null; status: 'exists' | 'proposed' }
}

/** Un rol semántico: intención reusable que apunta a un color del pack — nunca a un HEX propio. */
export interface BrandPackRole {
  /** Nombre del rol (ej. `surface`, `ink`, `onDark`, `accent`). */
  name: string
  /** `cssVar` del color del pack al que resuelve. */
  colorVar: string
}

/** Par de contraste que el pack promete cumplir (WCAG AA: 4.5 texto normal · 3 texto grande). */
export interface BrandPackContrastPair {
  /** Rol del texto/figura. */
  fg: string
  /** Rol de la superficie. */
  bg: string
  /** Ratio mínimo exigido. */
  min: number
  /** Contexto humano del par (dónde se usa). */
  context: string
}

export interface BrandPack {
  name: string
  version: string
  /** `advisory` sólo para el pack default afinado a mano; packs de cliente son `blocking`. */
  contrastEnforcement: 'advisory' | 'blocking'
  colors: BrandPackColor[]
  roles: BrandPackRole[]
  contrastPairs: BrandPackContrastPair[]
}

export interface ContrastFinding {
  fg: string
  bg: string
  ratio: number
  min: number
  context: string
}

export class BrandPackContrastError extends Error {
  readonly findings: ContrastFinding[]

  constructor(packName: string, findings: ContrastFinding[]) {
    const detail = findings
      .map(f => `  ${f.fg} sobre ${f.bg}: ${f.ratio.toFixed(2)}:1 < ${f.min}:1 (${f.context})`)
      .join('\n')

    super(
      `El brand pack "${packName}" no pasa WCAG AA y su enforcement es blocking — ` +
        `falla al compilar, no en la lámina:\n${detail}`
    )
    this.name = 'BrandPackContrastError'
    this.findings = findings
  }
}

export class BrandPackIntegrityError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'BrandPackIntegrityError'
  }
}

const HEX_RE = /^#[0-9a-f]{6}$/

export const hexToRgb = (hex: string): [number, number, number] => [
  Number.parseInt(hex.slice(1, 3), 16),
  Number.parseInt(hex.slice(3, 5), 16),
  Number.parseInt(hex.slice(5, 7), 16)
]

/** Luminancia relativa WCAG 2.x. */
const relativeLuminance = (hex: string): number => {
  const [r, g, b] = hexToRgb(hex).map(channel => {
    const c = channel / 255

    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  }) as [number, number, number]

  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

export const contrastRatio = (hexA: string, hexB: string): number => {
  const [lighter, darker] = [relativeLuminance(hexA), relativeLuminance(hexB)].sort((a, b) => b - a)

  return (lighter! + 0.05) / (darker! + 0.05)
}

export interface CompiledBrandPack {
  css: string
  contrastFindings: ContrastFinding[]
}

/**
 * Compila el pack a CSS custom properties. Emite por color `--x: #hex` y `--x-rgb: R, G, B`
 * (la variante `-rgb` permite `rgba(var(--x-rgb), a)`: la BASE se tokeniza, el alpha es
 * composicional). Los roles emiten `--<prefix>-role-<name>` apuntando al var del color.
 *
 * Valida integridad (fail-closed): HEX malformado, cssVar duplicado, rol apuntando a un color
 * inexistente o par de contraste sobre un rol no declarado ABORTAN la compilación.
 */
export const compileBrandPack = (pack: BrandPack, options: { rolePrefix: string }): CompiledBrandPack => {
  const byVar = new Map<string, BrandPackColor>()

  for (const color of pack.colors) {
    if (!HEX_RE.test(color.hex)) {
      throw new BrandPackIntegrityError(`${color.cssVar}: valor "${color.hex}" no es #rrggbb en minúsculas.`)
    }

    if (byVar.has(color.cssVar)) {
      throw new BrandPackIntegrityError(`cssVar duplicada: ${color.cssVar}`)
    }

    byVar.set(color.cssVar, color)
  }

  const roleByName = new Map<string, BrandPackRole>()

  for (const role of pack.roles) {
    if (!byVar.has(role.colorVar)) {
      throw new BrandPackIntegrityError(`el rol "${role.name}" apunta a un color inexistente: ${role.colorVar}`)
    }

    if (roleByName.has(role.name)) {
      throw new BrandPackIntegrityError(`rol duplicado: ${role.name}`)
    }

    roleByName.set(role.name, role)
  }

  // Guard de contraste — se evalúa SIEMPRE; el enforcement decide si bloquea.
  const findings: ContrastFinding[] = []

  for (const pair of pack.contrastPairs) {
    const fg = roleByName.get(pair.fg)
    const bg = roleByName.get(pair.bg)

    if (!fg || !bg) {
      throw new BrandPackIntegrityError(
        `el par de contraste "${pair.fg}/${pair.bg}" referencia un rol no declarado.`
      )
    }

    const ratio = contrastRatio(byVar.get(fg.colorVar)!.hex, byVar.get(bg.colorVar)!.hex)

    if (ratio < pair.min) {
      findings.push({ fg: pair.fg, bg: pair.bg, ratio, min: pair.min, context: pair.context })
    }
  }

  if (findings.length > 0 && pack.contrastEnforcement === 'blocking') {
    throw new BrandPackContrastError(pack.name, findings)
  }

  const lines: string[] = [
    `/**`,
    ` * GENERADO — NO EDITAR A MANO.`,
    ` * Brand pack "${pack.name}" v${pack.version} compilado por \`pnpm composer:brand-pack\`.`,
    ` * Fuente: brand-packs/${pack.name}/ (snapshot Figma + ledger). Un test verifica la sincronía.`,
    ` */`,
    ':root {'
  ]

  for (const color of [...pack.colors].sort((a, b) => a.cssVar.localeCompare(b.cssVar))) {
    const [r, g, b] = hexToRgb(color.hex)

    lines.push(`  ${color.cssVar}: ${color.hex};`)
    lines.push(`  ${color.cssVar}-rgb: ${r}, ${g}, ${b};`)
  }

  for (const role of [...pack.roles].sort((a, b) => a.name.localeCompare(b.name))) {
    lines.push(`  --${options.rolePrefix}-role-${role.name}: var(${role.colorVar});`)
    lines.push(`  --${options.rolePrefix}-role-${role.name}-rgb: var(${role.colorVar}-rgb);`)
  }

  lines.push('}')

  return { css: `${lines.join('\n')}\n`, contrastFindings: findings }
}
