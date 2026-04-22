import { BigQuery } from '@google-cloud/bigquery'

import { resolveContactDisplayName } from '../src/lib/contacts/contact-display'

type CandidateUserRow = {
  user_id: string
  client_id: string
  hubspot_company_id: string
  email: string
  full_name: string | null
  job_title: string | null
}

type HubSpotContactRow = {
  hubspotContactId: string
  email: string | null
  firstName: string | null
  lastName: string | null
  displayName: string | null
  phone: string | null
  mobilePhone: string | null
  jobTitle: string | null
  lifecyclestage: string | null
  hsLeadStatus: string | null
  company: string | null
}

const bigQuery = new BigQuery({
  projectId: process.env.GCP_PROJECT || process.env.GOOGLE_CLOUD_PROJECT || 'efeonce-group'
})

const serviceBaseUrl = (process.env.HUBSPOT_GREENHOUSE_INTEGRATION_BASE_URL || 'https://hubspot-greenhouse-integration-y6egnifl6a-uc.a.run.app').trim().replace(/\/+$/, '')
const dryRun = process.argv.includes('--dry-run')
const clientIdArg = process.argv.find(argument => argument.startsWith('--client-id='))
const scopedClientId = clientIdArg ? clientIdArg.slice('--client-id='.length).trim() : null

const normalizeText = (value: string | null | undefined) => value?.trim() || ''

const getCompanyContacts = async (hubspotCompanyId: string) => {
  const response = await fetch(`${serviceBaseUrl}/companies/${hubspotCompanyId}/contacts`, {
    method: 'GET',
    headers: {
      Accept: 'application/json'
    }
  })

  if (!response.ok) {
    throw new Error(`HubSpot integration service returned ${response.status} for company ${hubspotCompanyId}.`)
  }

  const payload = (await response.json()) as { contacts?: HubSpotContactRow[] }

  return payload.contacts || []
}

const getCandidateUsers = async () => {
  const query = `
    SELECT
      cu.user_id,
      cu.client_id,
      c.hubspot_company_id,
      cu.email,
      cu.full_name,
      cu.job_title
    FROM \`efeonce-group.greenhouse.client_users\` AS cu
    INNER JOIN \`efeonce-group.greenhouse.clients\` AS c
      ON c.client_id = cu.client_id
    WHERE c.hubspot_company_id IS NOT NULL
      AND REGEXP_CONTAINS(cu.user_id, r'^user-hubspot-contact-\\d+$')
      ${scopedClientId ? 'AND cu.client_id = @clientId' : ''}
    ORDER BY cu.client_id, cu.user_id
  `

  const [rows] = await bigQuery.query({
    query,
    ...(scopedClientId ? { params: { clientId: scopedClientId } } : {})
  })

  return rows as CandidateUserRow[]
}

const updateUser = async ({
  userId,
  fullName,
  jobTitle
}: {
  userId: string
  fullName: string
  jobTitle: string | null
}) => {
  await bigQuery.query({
    query: `
      UPDATE \`efeonce-group.greenhouse.client_users\`
      SET
        full_name = @fullName,
        job_title = @jobTitle,
        updated_at = CURRENT_TIMESTAMP()
      WHERE user_id = @userId
    `,
    params: {
      userId,
      fullName,
      jobTitle
    },
    types: {
      userId: 'STRING',
      fullName: 'STRING',
      jobTitle: 'STRING'
    }
  })
}

const main = async () => {
  const candidateUsers = await getCandidateUsers()
  const usersByClient = new Map<string, CandidateUserRow[]>()

  for (const row of candidateUsers) {
    const current = usersByClient.get(row.client_id) || []

    current.push(row)
    usersByClient.set(row.client_id, current)
  }

  let scannedUsers = 0
  let updatedUsers = 0
  const updatedPreview: Array<{ clientId: string; userId: string; before: string; after: string }> = []

  for (const [clientId, rows] of usersByClient.entries()) {
    const hubspotCompanyId = rows[0]?.hubspot_company_id

    if (!hubspotCompanyId) {
      continue
    }

    const contactsResponse = await getCompanyContacts(hubspotCompanyId)

    const contactsByUserId = new Map<string, HubSpotContactRow>(
      contactsResponse.map(contact => [`user-hubspot-contact-${contact.hubspotContactId}`, contact] as const)
    )

    for (const row of rows) {
      scannedUsers += 1

      const contact = contactsByUserId.get(row.user_id)

      if (!contact) {
        continue
      }

      const resolvedName = resolveContactDisplayName(contact)
      const resolvedJobTitle = normalizeText(contact.jobTitle) || null
      const currentFullName = normalizeText(row.full_name)
      const currentJobTitle = normalizeText(row.job_title) || null

      if (currentFullName === resolvedName && currentJobTitle === resolvedJobTitle) {
        continue
      }

      updatedUsers += 1
      updatedPreview.push({
        clientId,
        userId: row.user_id,
        before: currentFullName || '(empty)',
        after: resolvedName
      })

      if (!dryRun) {
        await updateUser({
          userId: row.user_id,
          fullName: resolvedName,
          jobTitle: resolvedJobTitle
        })
      }
    }
  }

  console.log(
    JSON.stringify(
      {
        dryRun,
        scopedClientId,
        tenantsScanned: usersByClient.size,
        scannedUsers,
        updatedUsers,
        preview: updatedPreview.slice(0, 20)
      },
      null,
      2
    )
  )
}

main().catch(error => {
  console.error(error)
  process.exit(1)
})
