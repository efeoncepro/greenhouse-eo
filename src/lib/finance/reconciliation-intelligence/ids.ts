import { randomUUID } from 'node:crypto'

const shortUuid = () => randomUUID().replace(/-/g, '').slice(0, 8)

export const generateReconciliationSuggestionId = () => `EO-RCI-${shortUuid()}`
