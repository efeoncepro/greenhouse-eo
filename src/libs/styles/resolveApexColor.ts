'use client'

/**
 * TASK-1306 — resuelve un color del theme a algo que ApexCharts pueda parsear.
 *
 * ⚠️ EL PROBLEMA: Greenhouse corre MUI con `cssVariables: true`, así que
 * `theme.palette.primary.main` NO devuelve `#0375DB` sino `var(--mui-palette-primary-main)`.
 * ApexCharts parsea los colores con su propia clase `Color` (regex sobre hex/rgb) y con una
 * CSS var revienta con `Cannot read properties of null (reading '1')` — una excepción de
 * runtime por chart, silenciosa en pantalla (el gráfico simplemente no termina de pintar).
 *
 * No es un problema de esta surface: es un bug LATENTE para cualquier chart Apex que tome
 * su color del theme. Por eso vive acá, junto al wrapper `AppReactApexCharts`, y no
 * enterrado en un componente de dominio.
 *
 * Recharts no lo sufre: pinta con SVG y el navegador resuelve la var por él. Apex necesita
 * el valor real porque hace matemática de color (gradientes, sombras, opacidades).
 */

/** Cache: `getComputedStyle` fuerza reflow y los charts piden el mismo color muchas veces. */
const resolvedCache = new Map<string, string>()

/**
 * Se delega la resolución AL NAVEGADOR en vez de parsear la cadena a mano.
 *
 * MUI con `cssVariables` no emite un solo formato: hay `var(--mui-palette-primary-main)`
 * pero también `rgba(var(--mui-palette-common-backgroundChannel) / 0.87)`, donde la var
 * va ANIDADA. Un parser propio tendría que cubrir cada variante y se rompería con la
 * siguiente que MUI agregue. Pintando el color en un elemento suelto y leyendo su
 * `color` computado, el navegador devuelve siempre `rgb(...)`/`rgba(...)` — que es
 * exactamente lo que ApexCharts sabe parsear.
 */
export const resolveApexColor = (value: string, fallback: string): string => {
  if (!value.includes('var(')) {
    return value
  }

  // En SSR no hay `document`: se devuelve el fallback HEX. El wrapper de Apex es
  // `dynamic(ssr:false)`, así que el chart real siempre se pinta ya en cliente.
  if (typeof window === 'undefined') {
    return fallback
  }

  const cached = resolvedCache.get(value)

  if (cached) {
    return cached
  }

  const probe = document.createElement('span')

  probe.style.display = 'none'
  probe.style.color = value
  document.body.appendChild(probe)

  const computed = getComputedStyle(probe).color

  probe.remove()

  // Un color inválido deja el computed en el default del navegador; ahí vale más el
  // fallback declarado que un negro sorpresa.
  const resolved = computed && computed !== 'rgb(0, 0, 0)' ? computed : fallback

  resolvedCache.set(value, resolved)

  return resolved
}

/**
 * TASK-1307 — el mismo resolvedor, nombrado para cualquier motor de chart.
 *
 * ECharts también necesita el color REAL (pinta a canvas y hace matemática de color para
 * gradientes/opacidades), así que comparte exactamente esta necesidad con Apex. Es un alias
 * deliberado en vez de una copia: un segundo resolvedor divergiría a la primera variante de
 * formato que MUI agregue. Los consumidores Apex ya existentes siguen intactos.
 */
export const resolveChartColor = resolveApexColor
