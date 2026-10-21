// Bloquea `NodeJS.ProcessEnv` como tipo en src/** (anotación o `as`): el env inyectado se tipa
// `EnvSource` (`@/types/env-source`).
//
// Next.js aumenta `NodeJS.ProcessEnv` con `readonly NODE_ENV` obligatorio. Una función que sólo LEE
// claves y lo exige obliga a cada test a fabricar un env completo o a castear, y el cast apaga el
// chequeo de tipos justo donde importa (el test de `ai:listen` no compilaba por esto, 2026-10-21;
// la migración quitó ~120 casts). `process.env` es asignable a `EnvSource`, así que el default
// `= process.env` no cambia.
//
// Excepción legítima: una API de terceros que exige `NodeJS.ProcessEnv` (p. ej. el `env` de
// `child_process`). Se desactiva en esa línea con el motivo.

const GOVERNED_SRC_REGEX = /[/\\]src[/\\]/

const isProcessEnvTypeName = typeName =>
  typeName &&
  typeName.type === 'TSQualifiedName' &&
  typeName.left.type === 'Identifier' &&
  typeName.left.name === 'NodeJS' &&
  typeName.right.type === 'Identifier' &&
  typeName.right.name === 'ProcessEnv'

const message =
  "No tipes el env como `NodeJS.ProcessEnv`: usa `EnvSource` de '@/types/env-source'. " +
  'Next exige `NODE_ENV` en ProcessEnv, lo que obliga a castear en los tests y apaga el chequeo de tipos. ' +
  'Si una API de terceros exige ProcessEnv (env de child_process), desactiva esta regla en esa línea con el motivo.'

export default {
  meta: {
    type: 'problem',
    docs: {
      description: 'Inyectar el env como EnvSource, no NodeJS.ProcessEnv (sin casts en tests).',
      url: 'src/types/env-source.ts'
    },
    schema: []
  },

  create(context) {
    const filename = context.getFilename()

    if (!GOVERNED_SRC_REGEX.test(filename)) return {}

    return {
      TSTypeReference(node) {
        if (!isProcessEnvTypeName(node.typeName)) return

        context.report({ node, message })
      }
    }
  }
}
