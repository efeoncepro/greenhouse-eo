export * from './types'
export { listAuthorizedSpaces, resolveSpaceContext, revalidateSpaceContext } from './resolve-space-context'
export {
  grantSpaceAccess,
  revokeSpaceAccess,
  SpaceAccessGrantError,
  type GrantSpaceAccessInput,
  type RevokeSpaceAccessInput,
  type SpaceAccessGrantErrorCode,
  type SpaceAccessGrantRecord
} from './grants-store'
