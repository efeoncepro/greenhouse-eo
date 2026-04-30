import { INTERNAL_DEEP_LINK_DEFINITIONS } from './definitions'
import type { GreenhouseDeepLinkDefinition, GreenhouseDeepLinkKind } from './types'

const DEFINITION_MAP = new Map<GreenhouseDeepLinkKind, GreenhouseDeepLinkDefinition>(
  INTERNAL_DEEP_LINK_DEFINITIONS.map(definition => [definition.kind, definition])
)

export const getGreenhouseDeepLinkDefinition = (kind: GreenhouseDeepLinkKind) => DEFINITION_MAP.get(kind) || null

export const listGreenhouseDeepLinkDefinitions = () => [...DEFINITION_MAP.values()]
