export const MEETING_LAYOUT_RECIPES = ['guided', 'split', 'command'] as const
export type MeetingLayoutRecipe = (typeof MEETING_LAYOUT_RECIPES)[number]

export const MEETING_ACTIVATION_MODES = ['inline', 'dialog', 'full_screen', 'page'] as const
export type MeetingActivationMode = (typeof MEETING_ACTIVATION_MODES)[number]

const recipeRank: Record<MeetingLayoutRecipe, number> = {
  guided: 0,
  split: 1,
  command: 2,
}

const WIDTH_GUIDED_TO_SPLIT = 560
const WIDTH_SPLIT_TO_COMMAND = 960
const HEIGHT_COMMAND_MINIMUM = 620
const HYSTERESIS = 24

export const parseMeetingLayoutRecipe = (value: string | null): MeetingLayoutRecipe =>
  MEETING_LAYOUT_RECIPES.includes(value as MeetingLayoutRecipe) ? value as MeetingLayoutRecipe : 'command'

export const parseMeetingActivationMode = (value: string | null): MeetingActivationMode =>
  MEETING_ACTIVATION_MODES.includes(value as MeetingActivationMode) ? value as MeetingActivationMode : 'inline'

export interface MeetingLayoutInput {
  width: number
  height?: number
  current?: MeetingLayoutRecipe
  maxRecipe?: MeetingLayoutRecipe
}

const clampRecipe = (recipe: MeetingLayoutRecipe, maxRecipe: MeetingLayoutRecipe): MeetingLayoutRecipe =>
  recipeRank[recipe] <= recipeRank[maxRecipe] ? recipe : maxRecipe

/**
 * Resolves semantic layout from the component's own box. Hysteresis prevents
 * oscillation when a scrollbar or host animation sits close to a threshold.
 */
export const resolveMeetingLayout = ({
  width,
  height = 0,
  current,
  maxRecipe = 'command',
}: MeetingLayoutInput): MeetingLayoutRecipe => {
  const safeWidth = Number.isFinite(width) ? Math.max(0, width) : 0
  const safeHeight = Number.isFinite(height) ? Math.max(0, height) : 0
  const commandHasHeight = safeHeight === 0 || safeHeight >= HEIGHT_COMMAND_MINIMUM
  let resolved: MeetingLayoutRecipe

  if (current === 'guided') {
    resolved = safeWidth >= WIDTH_GUIDED_TO_SPLIT + HYSTERESIS ? 'split' : 'guided'
  } else if (current === 'command') {
    resolved = safeWidth < WIDTH_SPLIT_TO_COMMAND - HYSTERESIS || (safeHeight > 0 && safeHeight < HEIGHT_COMMAND_MINIMUM - HYSTERESIS)
      ? 'split'
      : 'command'
  } else if (current === 'split') {
    if (safeWidth < WIDTH_GUIDED_TO_SPLIT - HYSTERESIS) resolved = 'guided'
    else if (safeWidth >= WIDTH_SPLIT_TO_COMMAND + HYSTERESIS && commandHasHeight) resolved = 'command'
    else resolved = 'split'
  } else if (safeWidth < WIDTH_GUIDED_TO_SPLIT) {
    resolved = 'guided'
  } else if (safeWidth < WIDTH_SPLIT_TO_COMMAND || !commandHasHeight) {
    resolved = 'split'
  } else {
    resolved = 'command'
  }

  return clampRecipe(resolved, maxRecipe)
}
