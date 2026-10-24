/**
 * Rúbricas versionadas de `pnpm ai:listen`. Una versión nueva cambia el número: así una nota de hoy se compara con
 * otra sólo si salió del mismo preset@versión, el mismo modelo y el mismo nivel de razonamiento.
 *
 * `defaults` son sugerencias que la CLI aplica cuando el autor no pasa el flag (el flag explícito siempre gana).
 */
export interface GeminiMediaPreset {
  version: number
  description: string
  defaults: { thinking: 'low' | 'medium' | 'high'; fps?: number; resolution?: 'low' | 'medium' | 'high' }
  prompt: string
}

const COMMON = `Eres un director creativo y diseñador sonoro exigente revisando una pieza corta para redes sociales. Sé concreto y
breve. No elogies por cortesía. Distingue lo que viste u oíste con certeza de lo que sospechas.`

export const GEMINI_MEDIA_PRESETS = {
  sync: {
    version: 1,
    description: 'Sincronía de imagen y sonido: golpes, cortes, silencios y caída de la música sobre la grilla.',
    defaults: { thinking: 'high', fps: 12 },
    prompt: `${COMMON}
Revisa la SINCRONÍA. Para cada golpe de sonido, di si cae en el mismo cuadro que el corte o el destello de imagen, y con
qué desfase aproximado. Señala silencios (dónde empiezan y terminan), golpes que se adelantan o atrasan, música que entra
fuera de tiempo y cualquier sonido que tape a otro en un momento clave.`
  },
  impacto: {
    version: 1,
    description: 'Impacto visual y punch: ritmo, energía, contraste y momentos memorables.',
    defaults: { thinking: 'medium', fps: 4 },
    prompt: `${COMMON}
Evalúa el IMPACTO: ¿engancha en el primer segundo?, ¿cuál es el momento más fuerte?, ¿hay tramos planos o sin energía?,
¿el ritmo de montaje sube hacia el clímax? Puntúa impacto de 0 a 10 y explica qué lo subiría.`
  },
  cierre: {
    version: 1,
    description: 'Cierre y lockup: que se lea la marca, el mensaje y que el final no se sienta abrupto ni estático.',
    defaults: { thinking: 'medium', fps: 6, resolution: 'high' },
    prompt: `${COMMON}
Revisa el CIERRE: ¿se leen los logos y el texto del lockup y cuánto tiempo quedan en pantalla?, ¿el sting cae con la
entrada de la marca?, ¿el final se siente abrupto, estático o cambia de dirección de movimiento de forma brusca?
Puntúa cierre y legibilidad de 0 a 10.`
  },
  tiron: {
    version: 1,
    description: 'Tirones y congelados: cuadros que se repiten, saltos de velocidad, sensación de «video cargando».',
    defaults: { thinking: 'high', fps: 24 },
    prompt: `${COMMON}
Busca TIRONES: cuadros congelados o repetidos, saltos bruscos de velocidad, zooms que avanzan a saltos, cambios de
dirección que «rebotan» y cualquier momento que se sienta como un video esperando cargar. Para cada uno da el tramo.`
  },
  lockup: {
    version: 1,
    description: 'Legibilidad de marca y texto en un cuadro o en el tramo final.',
    defaults: { thinking: 'medium', fps: 2, resolution: 'high' },
    prompt: `${COMMON}
Revisa la LEGIBILIDAD: transcribe exactamente el texto visible, di si cada logo se reconoce, si algo queda cortado o muy
cerca del borde, y si el contraste alcanza para leerlo en un teléfono. Puntúa legibilidad de 0 a 10.`
  }
} as const satisfies Record<string, GeminiMediaPreset>

export type GeminiMediaPresetName = keyof typeof GEMINI_MEDIA_PRESETS
