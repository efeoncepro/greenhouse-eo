// pnpm gates — los mismos gates que corre el CI en cada PR.
import { hygiene } from './hygiene.mjs'
import { managedDrift } from './managed-drift.mjs'
import { piezas } from './piezas.mjs'

const results = [managedDrift(), hygiene(), piezas()]

if (results.includes(false)) {
  console.log('\nHay gates en rojo. Corrige lo indicado y vuelve a correr pnpm gates.')
  process.exit(1)
}

console.log('\nTodos los gates en verde.')
