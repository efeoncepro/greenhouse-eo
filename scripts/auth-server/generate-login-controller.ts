/** Regenera el controlador de login del navegador. `--check` falla si el artefacto quedó atrasado. */
import { generateLoginController } from './login-controller-build'

void generateLoginController(process.argv.includes('--check')).catch(error => {
  console.error(error)
  process.exit(1)
})
