import {
  comparisonTableManifestSchema,
  type ComparisonTableManifest,
} from './manifest-schema'

export type ComparisonTableManifestIssue = {
  path: string
  message: string
}

export type ComparisonTableValidationResult =
  | { ok: true; manifest: ComparisonTableManifest }
  | { ok: false; issues: ComparisonTableManifestIssue[] }

/**
 * Pure validator (no side effects) for `comparisonTable.v1`. This is the
 * reject-before-write gate: callers MUST run this and bail on `ok: false`
 * BEFORE building any bridge request or touching `_elementor_data`.
 *
 * Returns the parsed+normalized manifest (defaults applied) on success, or a
 * flat list of `{ path, message }` issues on failure — safe to surface es-CL
 * via the canonical error contract (no raw Zod objects leak to the client).
 */
export function validateComparisonTableManifest(
  input: unknown
): ComparisonTableValidationResult {
  const parsed = comparisonTableManifestSchema.safeParse(input)

  if (parsed.success) {
    return { ok: true, manifest: parsed.data }
  }

  return {
    ok: false,
    issues: parsed.error.issues.map(issue => ({
      path: issue.path.join('.') || '(root)',
      message: issue.message,
    })),
  }
}
