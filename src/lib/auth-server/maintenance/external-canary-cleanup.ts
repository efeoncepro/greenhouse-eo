import type { PoolClient } from 'pg'

export type DeleteExternalCanaryAuthArtifactsInput = {
  environmentId: string
  subjects: string[]
  runId: string
  bindingIds: string[]
  ownedOauthClientIds: string[]
  sharedOauthClientIds: string[]
}

/**
 * Elimina únicamente artefactos del emisor que el censo del canary ya atribuyó al run.
 *
 * El lifecycle de la organización vive en `identity/external-access`, pero ese dominio no escribe
 * tablas `greenhouse_auth`. Mantener estas sentencias junto al dueño del emisor conserva el boundary
 * sin perder la transacción única del cleanup gobernado.
 */
export const deleteExternalCanaryAuthArtifacts = async (
  client: PoolClient,
  input: DeleteExternalCanaryAuthArtifactsInput
) => {
  const hasOwnedClients = input.ownedOauthClientIds.length > 0
  const hasSharedSubjectArtifacts = input.sharedOauthClientIds.length > 0 && input.subjects.length > 0

  if (hasOwnedClients || hasSharedSubjectArtifacts) {
    const deleteOauthChildren = async (relation: string) =>
      client.query(
        `DELETE FROM greenhouse_auth.${relation}
          WHERE client_id=ANY($1::text[])
             OR (client_id=ANY($2::text[]) AND environment_id=$3 AND subject=ANY($4::text[]))`,
        [input.ownedOauthClientIds, input.sharedOauthClientIds, input.environmentId, input.subjects]
      )

    await deleteOauthChildren('access_tokens')
    await deleteOauthChildren('refresh_tokens')
    await deleteOauthChildren('authorization_codes')
    await deleteOauthChildren('client_consents')
  }

  if (hasOwnedClients || hasSharedSubjectArtifacts || input.bindingIds.length > 0) {
    await client.query(
      `DELETE FROM greenhouse_auth.authorization_contexts
        WHERE client_id=ANY($1::text[])
           OR binding_id=ANY($2::text[])
           OR (client_id=ANY($3::text[]) AND environment_id=$4 AND subject=ANY($5::text[]))`,
      [input.ownedOauthClientIds, input.bindingIds, input.sharedOauthClientIds, input.environmentId, input.subjects]
    )
  }

  if (hasOwnedClients) {
    await client.query(`DELETE FROM greenhouse_auth.oauth_clients WHERE client_id=ANY($1::text[])`, [
      input.ownedOauthClientIds
    ])
  }

  if (input.subjects.length > 0) {
    await client.query(
      `DELETE FROM greenhouse_auth.passkey_challenges
        WHERE environment_id=$1 AND (subject=ANY($2::text[]) OR correlation_id=$3)`,
      [input.environmentId, input.subjects, input.runId]
    )
    await client.query(
      `DELETE FROM greenhouse_auth.totp_backup_codes WHERE environment_id=$1 AND subject=ANY($2::text[])`,
      [input.environmentId, input.subjects]
    )
    await client.query(
      `DELETE FROM greenhouse_auth.totp_enrollments WHERE environment_id=$1 AND subject=ANY($2::text[])`,
      [input.environmentId, input.subjects]
    )
    await client.query(
      `DELETE FROM greenhouse_auth.passkey_credentials WHERE environment_id=$1 AND subject=ANY($2::text[])`,
      [input.environmentId, input.subjects]
    )
    await client.query(
      `DELETE FROM greenhouse_auth.magic_link_tokens WHERE environment_id=$1 AND subject=ANY($2::text[])`,
      [input.environmentId, input.subjects]
    )
    await client.query(`DELETE FROM greenhouse_auth.sessions WHERE environment_id=$1 AND subject=ANY($2::text[])`, [
      input.environmentId,
      input.subjects
    ])
  }
}
