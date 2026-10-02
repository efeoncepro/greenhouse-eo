// pnpm gates — los mismos gates que corre el CI en cada PR.
import { hygiene } from './hygiene.mjs'
import { managedDrift } from './managed-drift.mjs'
import { nativePolicy } from './native-policy.mjs'
import { piezas } from './piezas.mjs'

// native-policy al final: ejecuta el guardarraíl del workbench (en una copia), y nada debe correr después de él.
const results = [managedDrift(), hygiene(), piezas(), nativePolicy()]

if (results.includes(false)) {
  console.log('\nHay gates en rojo. Corrige lo indicado y vuelve a correr pnpm gates.')
  process.exit(1)
}

console.log('\nTodos los gates en verde.')
