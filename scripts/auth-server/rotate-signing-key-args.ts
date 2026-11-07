/** Parse the operator command before loading credentials or opening KMS/PG. */
export type RotationAction =
  | Readonly<{ kind: 'status' }>
  | Readonly<{ kind: 'create' }>
  | Readonly<{ kind: 'register'; versionName: string; activate: boolean }>
  | Readonly<{ kind: 'retire'; kid: string; force: boolean }>

const invalid = (): never => {
  throw new Error('Invalid rotation arguments: use --status, --register <version>, --retire <kid> [--force], or no action to create a version')
}

export const parseRotationArgs = (args: readonly string[]): RotationAction => {
  let mode: 'status' | 'register' | 'retire' | null = null
  let value: string | null = null
  let force = false
  let noActivate = false

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index]

    if (arg === '--status' || arg === '--register' || arg === '--retire') {
      if (mode) invalid()
      mode = arg === '--status' ? 'status' : arg === '--register' ? 'register' : 'retire'

      if (arg !== '--status') {
        const next = args[++index]

        if (!next || next.startsWith('--')) invalid()
        value = next
      }

      continue
    }

    if (arg === '--force') {
      if (force) invalid()
      force = true
      continue
    }

    if (arg === '--no-activate') {
      if (noActivate) invalid()
      noActivate = true
      continue
    }

    invalid()
  }

  if (mode === 'status') {
    if (force || noActivate) invalid()

    return { kind: 'status' }
  }

  if (mode === 'retire') {
    if (!value || noActivate) return invalid()

    return { kind: 'retire', kid: value, force }
  }

  if (force) invalid()

  if (mode === 'register') {
    if (!value) return invalid()

    return { kind: 'register', versionName: value, activate: !noActivate }
  }

  if (noActivate) invalid()

  return { kind: 'create' }
}
