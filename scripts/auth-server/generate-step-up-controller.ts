/** CLI wrapper; importing the build helper never executes generation. */
import { generateStepUpController } from './step-up-controller-build'

void generateStepUpController(process.argv.includes('--check')).catch(() => {
  console.error('step_up_controller_generation_failed')
  process.exitCode = 1
})
