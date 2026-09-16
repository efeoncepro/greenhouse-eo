export * from './validate-request'
export * from './create-edition'
export * from './lifecycle'
export * from './generation'
export * from '../render/commands'

// TASK-1846 — el puerto de outputs se conecta al cargar el barrel de commands: es por donde entran
// lanes y MCP. `issue` deja de fallar por "puerto sin conectar" y pasa a exigir outputs completados.
import { wireInsightOutputsPort } from '../render/outputs-port'

wireInsightOutputsPort()

