/**
 * ISSUE-168 — El CTA hereda la superficie de su ANFITRIÓN, no la del sistema operativo.
 *
 * ## Por qué existe
 *
 * El `<greenhouse-cta>` es un invitado: vive incrustado dentro de la página de otro
 * (WordPress del cliente, informe de Think, landing de Astro). Sus tokens usan
 * `light-dark()`, que resuelve mirando `prefers-color-scheme` — la preferencia del
 * SISTEMA del visitante.
 *
 * Medido en producción el 2026-09-01 sobre `efeoncepro.com/greenhouse-cta-prueba/`:
 * la página es blanca (`rgb(255,255,255)`), el navegador estaba en modo oscuro, y el
 * host no declaraba ningún `color-scheme`. Resultado: **una tarjeta navy pegada sobre
 * una página blanca**. Nadie eligió ese navy.
 *
 * Ese desajuste era la causa RAÍZ de una cadena de síntomas que se veían como bugs
 * independientes: el eyebrow ilegible, las etiquetas del formulario a 1.02:1, y la
 * tentación de meterle una hoja blanca dentro a una tarjeta que no debería ser oscura.
 *
 * ## La regla
 *
 * 🔴 **Un widget incrustado se adapta a la casa, no al sistema operativo del visitante.**
 * Si la página es clara, el widget es claro. Si el anfitrión es genuinamente oscuro
 * —el dock del informe de Think— el widget es oscuro, y ahí sí correctamente.
 *
 * Una declaración explícita del host SIEMPRE manda sobre la medición: si alguien
 * escribió `color-scheme` en el tag, sabe algo que nosotros no.
 */

/** Debajo de esta luminancia relativa, la superficie del anfitrión cuenta como oscura. */
const DARK_SURFACE_LUMINANCE = 0.5

/** Hasta dónde subir buscando un fondo opaco antes de rendirse. */
const MAX_ANCESTOR_HOPS = 24

export type HostSurfaceScheme = 'light' | 'dark'

const channelToLinear = (value: number): number =>
  value <= 0.03928 ? value / 12.92 : Math.pow((value + 0.055) / 1.055, 2.4)

/**
 * Luminancia relativa de un color CSS computado, o `null` si es transparente o viene
 * en una notación que no reconocemos. Devolver `null` es deliberado: preferimos no
 * saber a adivinar mal — el caller sigue subiendo por los ancestros.
 */
export const surfaceLuminance = (color: string | null | undefined): number | null => {
  if (!color) return null

  const trimmed = color.trim()

  if (trimmed === 'transparent') return null

  // Allowlist de notaciones que SABEMOS leer. Sin esto, `lch(50% 40 200)` entregaba
  // sus tres numeros y se interpretaban como RGB — una luminancia inventada que puede
  // dar vuelta el esquema. Lo atrapo su propio test.
  const isRgb = /^rgba?\(/.test(trimmed)
  const isSrgb = /^color\(\s*srgb\b/.test(trimmed)

  if (!isRgb && !isSrgb) return null

  const parts = trimmed.match(/-?\d*\.?\d+/g)

  if (!parts || parts.length < 3) return null

  // `rgb()/rgba()` viene en 0-255; `color(srgb …)` en 0-1. La notación decide la escala.
  const scale = isSrgb ? 1 : 255
  const alpha = parts.length > 3 ? Number(parts[3]) : 1

  // Un fondo translúcido no define la superficie: deja ver el de abajo.
  if (!Number.isFinite(alpha) || alpha < 0.95) return null

  const [r, g, b] = parts.slice(0, 3).map(value => channelToLinear(Number(value) / scale))

  if ([r, g, b].some(value => !Number.isFinite(value))) return null

  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

/**
 * Esquema efectivo del anfitrión. Orden de autoridad:
 *
 * 1. Lo declarado por el host (`color-scheme="light|dark"`) — una decisión explícita
 *    nunca se sobrescribe con una medición.
 * 2. La luminancia del primer fondo OPACO subiendo desde el elemento.
 * 3. `null` — no se pudo medir. El caller no fuerza nada y deja que
 *    `prefers-color-scheme` decida, que es el comportamiento histórico.
 */
export const resolveHostSurfaceScheme = (
  element: Element,
  declared?: string | null,
): HostSurfaceScheme | null => {
  if (declared === 'light' || declared === 'dark') return declared

  const view = element.ownerDocument?.defaultView

  if (!view || typeof view.getComputedStyle !== 'function') return null

  let node: Element | null = element.parentElement
  let hops = 0

  while (node && hops < MAX_ANCESTOR_HOPS) {
    const luminance = surfaceLuminance(view.getComputedStyle(node).backgroundColor)

    if (luminance !== null) return luminance < DARK_SURFACE_LUMINANCE ? 'dark' : 'light'

    node = node.parentElement
    hops += 1
  }

  return null
}
