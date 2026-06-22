import 'server-only'

import { runGreenhousePostgresQuery } from '@/lib/postgres/client'

import type { DesignHandoffAllowedFile } from './types'

type AllowedFileRow = {
  file_key: string
  file_label: string
  added_by: string
  added_at: string
  superseded_at: string | null
}

const mapAllowedFile = (row: AllowedFileRow): DesignHandoffAllowedFile => ({
  fileKey: row.file_key,
  fileLabel: row.file_label,
  addedBy: row.added_by,
  addedAt: row.added_at,
  supersededAt: row.superseded_at
})

export const listAllowedDesignHandoffFiles = async (): Promise<DesignHandoffAllowedFile[]> => {
  const rows = await runGreenhousePostgresQuery<AllowedFileRow>(
    `SELECT file_key, file_label, added_by, added_at, superseded_at
       FROM greenhouse_core.design_handoff_allowed_files
      WHERE superseded_at IS NULL
      ORDER BY file_label ASC, added_at ASC`
  )

  return rows.map(mapAllowedFile)
}

export const getAllowedDesignHandoffFile = async (fileKey: string): Promise<DesignHandoffAllowedFile | null> => {
  const rows = await runGreenhousePostgresQuery<AllowedFileRow>(
    `SELECT file_key, file_label, added_by, added_at, superseded_at
       FROM greenhouse_core.design_handoff_allowed_files
      WHERE file_key = $1 AND superseded_at IS NULL
      LIMIT 1`,
    [fileKey]
  )

  return rows[0] ? mapAllowedFile(rows[0]) : null
}

export const isAllowedProductFile = async (fileKey: string): Promise<boolean> =>
  (await getAllowedDesignHandoffFile(fileKey)) !== null
