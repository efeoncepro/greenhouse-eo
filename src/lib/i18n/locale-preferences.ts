import 'server-only'

import { query, withTransaction } from '@/lib/db'
import { defaultLocale, normalizeLocale } from '@/i18n/locales'
import { resolveLocaleFromRequest } from '@/i18n/resolve-locale'

import type { Locale } from '@/lib/copy'

export type LocalePreferenceSnapshot = {
  preferredLocale: Locale | null
  tenantDefaultLocale: Locale | null
  legacyLocale: Locale | null
  effectiveLocale: Locale
}

export type LocaleOption = {
  locale: Locale
  label: string
  nativeLabel: string
}

export const localeOptions: LocaleOption[] = [
  { locale: 'es-CL', label: 'Español (Chile)', nativeLabel: 'Español (Chile)' },
  { locale: 'en-US', label: 'English (United States)', nativeLabel: 'English (United States)' }
]

export const toLegacyClientUserLocale = (locale: Locale): 'es' | 'en' => {
  return locale === 'en-US' ? 'en' : 'es'
}

const normalizeNullableLocale = (value: string | null | undefined): Locale | null => normalizeLocale(value)

type LocaleSnapshotRow = {
  preferred_locale: string | null
  organization_default_locale: string | null
  client_default_locale: string | null
  legacy_locale: string | null
}

export const buildLocalePreferenceSnapshot = ({
  preferredLocale,
  organizationDefaultLocale,
  clientDefaultLocale,
  legacyLocale
}: {
  preferredLocale?: string | null
  organizationDefaultLocale?: string | null
  clientDefaultLocale?: string | null
  legacyLocale?: string | null
}): LocalePreferenceSnapshot => {
  const normalizedPreferredLocale = normalizeNullableLocale(preferredLocale)

  const tenantDefaultLocale =
    normalizeNullableLocale(organizationDefaultLocale) ?? normalizeNullableLocale(clientDefaultLocale)

  const normalizedLegacyLocale = normalizeNullableLocale(legacyLocale)

  const effectiveLocale = resolveLocaleFromRequest({
    userLocale: normalizedPreferredLocale,
    tenantLocale: tenantDefaultLocale,
    legacyLocale: normalizedLegacyLocale
  })

  return {
    preferredLocale: normalizedPreferredLocale,
    tenantDefaultLocale,
    legacyLocale: normalizedLegacyLocale,
    effectiveLocale
  }
}

export const getUserLocalePreferenceSnapshot = async (userId: string): Promise<LocalePreferenceSnapshot> => {
  const rows = await query<LocaleSnapshotRow>(
    `SELECT
        ip.preferred_locale,
        org.default_locale AS organization_default_locale,
        c.default_locale AS client_default_locale,
        cu.locale AS legacy_locale
       FROM greenhouse_core.client_users cu
       LEFT JOIN greenhouse_core.identity_profiles ip
         ON ip.profile_id = cu.identity_profile_id
       LEFT JOIN greenhouse_core.clients c
         ON c.client_id = cu.client_id
       LEFT JOIN greenhouse_core.spaces spc
         ON spc.client_id = cu.client_id
        AND spc.active = TRUE
       LEFT JOIN greenhouse_core.organizations org
         ON org.organization_id = spc.organization_id
        AND org.active = TRUE
      WHERE cu.user_id = $1
      ORDER BY spc.created_at ASC NULLS LAST
      LIMIT 1`,
    [userId]
  )

  const row = rows[0]

  if (!row) {
    return {
      preferredLocale: null,
      tenantDefaultLocale: null,
      legacyLocale: null,
      effectiveLocale: defaultLocale
    }
  }

  return buildLocalePreferenceSnapshot({
    preferredLocale: row.preferred_locale,
    organizationDefaultLocale: row.organization_default_locale,
    clientDefaultLocale: row.client_default_locale,
    legacyLocale: row.legacy_locale
  })
}

export const updateUserPreferredLocale = async ({
  userId,
  locale
}: {
  userId: string
  locale: Locale | null
}): Promise<LocalePreferenceSnapshot> => {
  return withTransaction(async client => {
    const { rows } = await client.query<{
      identity_profile_id: string | null
    }>(
      `SELECT identity_profile_id
         FROM greenhouse_core.client_users
        WHERE user_id = $1
        FOR UPDATE`,
      [userId]
    )

    const user = rows[0]

    if (!user) {
      throw new Error('USER_NOT_FOUND')
    }

    if (user.identity_profile_id) {
      await client.query(
        `UPDATE greenhouse_core.identity_profiles
            SET preferred_locale = $1,
                updated_at = CURRENT_TIMESTAMP
          WHERE profile_id = $2`,
        [locale, user.identity_profile_id]
      )
    }

    if (locale) {
      await client.query(
        `UPDATE greenhouse_core.client_users
            SET locale = $1,
                updated_at = CURRENT_TIMESTAMP
          WHERE user_id = $2`,
        [toLegacyClientUserLocale(locale), userId]
      )
    }

    const { rows: snapshotRows } = await client.query<LocaleSnapshotRow>(
      `SELECT
          ip.preferred_locale,
          org.default_locale AS organization_default_locale,
          c.default_locale AS client_default_locale,
          cu.locale AS legacy_locale
         FROM greenhouse_core.client_users cu
         LEFT JOIN greenhouse_core.identity_profiles ip
           ON ip.profile_id = cu.identity_profile_id
         LEFT JOIN greenhouse_core.clients c
           ON c.client_id = cu.client_id
         LEFT JOIN greenhouse_core.spaces spc
           ON spc.client_id = cu.client_id
          AND spc.active = TRUE
         LEFT JOIN greenhouse_core.organizations org
           ON org.organization_id = spc.organization_id
          AND org.active = TRUE
        WHERE cu.user_id = $1
        ORDER BY spc.created_at ASC NULLS LAST
        LIMIT 1`,
      [userId]
    )

    const snapshotRow = snapshotRows[0]

    return buildLocalePreferenceSnapshot({
      preferredLocale: snapshotRow?.preferred_locale ?? null,
      organizationDefaultLocale: snapshotRow?.organization_default_locale ?? null,
      clientDefaultLocale: snapshotRow?.client_default_locale ?? null,
      legacyLocale: snapshotRow?.legacy_locale ?? null
    })
  })
}

export type TenantLocaleSnapshot = {
  clientId: string
  organizationId: string | null
  organizationDefaultLocale: Locale | null
  clientDefaultLocale: Locale | null
  effectiveLocale: Locale
}

type TenantLocaleRow = {
  client_id: string
  organization_id: string | null
  organization_default_locale: string | null
  client_default_locale: string | null
}

const buildTenantLocaleSnapshot = (row: TenantLocaleRow): TenantLocaleSnapshot => {
  const organizationDefaultLocale = normalizeNullableLocale(row.organization_default_locale)
  const clientDefaultLocale = normalizeNullableLocale(row.client_default_locale)
  const effectiveLocale = organizationDefaultLocale ?? clientDefaultLocale ?? defaultLocale

  return {
    clientId: row.client_id,
    organizationId: row.organization_id,
    organizationDefaultLocale,
    clientDefaultLocale,
    effectiveLocale
  }
}

export const getTenantLocaleSnapshot = async (clientId: string): Promise<TenantLocaleSnapshot | null> => {
  const rows = await query<TenantLocaleRow>(
    `SELECT
        c.client_id,
        org.organization_id,
        org.default_locale AS organization_default_locale,
        c.default_locale AS client_default_locale
       FROM greenhouse_core.clients c
       LEFT JOIN greenhouse_core.spaces spc
         ON spc.client_id = c.client_id
        AND spc.active = TRUE
       LEFT JOIN greenhouse_core.organizations org
         ON org.organization_id = spc.organization_id
        AND org.active = TRUE
      WHERE c.client_id = $1
      ORDER BY spc.created_at ASC NULLS LAST
      LIMIT 1`,
    [clientId]
  )

  return rows[0] ? buildTenantLocaleSnapshot(rows[0]) : null
}

export const updateTenantDefaultLocale = async ({
  clientId,
  locale
}: {
  clientId: string
  locale: Locale
}): Promise<TenantLocaleSnapshot> => {
  return withTransaction(async client => {
    const { rows } = await client.query<TenantLocaleRow>(
      `SELECT
          c.client_id,
          org.organization_id,
          org.default_locale AS organization_default_locale,
          c.default_locale AS client_default_locale
         FROM greenhouse_core.clients c
         LEFT JOIN greenhouse_core.spaces spc
           ON spc.client_id = c.client_id
          AND spc.active = TRUE
         LEFT JOIN greenhouse_core.organizations org
           ON org.organization_id = spc.organization_id
          AND org.active = TRUE
        WHERE c.client_id = $1
        ORDER BY spc.created_at ASC NULLS LAST
        LIMIT 1
        FOR UPDATE OF c`,
      [clientId]
    )

    const row = rows[0]

    if (!row) {
      throw new Error('TENANT_NOT_FOUND')
    }

    await client.query(
      `UPDATE greenhouse_core.clients
          SET default_locale = $1,
              updated_at = CURRENT_TIMESTAMP
        WHERE client_id = $2`,
      [locale, clientId]
    )

    if (row.organization_id) {
      await client.query(
        `UPDATE greenhouse_core.organizations
            SET default_locale = $1,
                updated_at = CURRENT_TIMESTAMP
          WHERE organization_id = $2`,
        [locale, row.organization_id]
      )
    }

    return {
      clientId,
      organizationId: row.organization_id,
      organizationDefaultLocale: row.organization_id ? locale : null,
      clientDefaultLocale: locale,
      effectiveLocale: locale
    }
  })
}
