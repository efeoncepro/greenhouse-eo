import { Pool } from 'pg'
import { describe, expect, it } from 'vitest'

import {
  displayProjectName,
  displaySprintName,
  displayTaskName,
  isFallbackDisplayName
} from './task-display'

/**
 * Unit + parity tests for the delivery display-name helpers.
 *
 * The TS helpers in `task-display.ts` MUST mirror the SQL functions defined
 * in `migrations/20260426144105255_add-delivery-display-name-functions.sql`
 * bit-for-bit. We assert this by running the same inputs through both sides
 * (when a Postgres connection is available) and comparing the output strings.
 *
 * If you change the fallback format in either side, this test fails until
 * both sides agree. Please update both, or roll back.
 */

describe('displayTaskName', () => {
  it('returns the trimmed task_name when present', () => {
    const result = displayTaskName({ task_name: '  PMAX (Adaptar CL)  ', task_source_id: 'tsk-1' })

    expect(result).toEqual({ text: 'PMAX (Adaptar CL)', isFallback: false, notionUrl: null })
  })

  it('falls back when task_name is null', () => {
    const result = displayTaskName({ task_name: null, task_source_id: 'tsk-25039c2f-efe7-800d' })

    expect(result.text).toBe('Tarea sin título · tsk-2503')
    expect(result.isFallback).toBe(true)
  })

  it('falls back when task_name is empty string', () => {
    const result = displayTaskName({ task_name: '', task_source_id: 'tsk-25039c2f' })

    expect(result.isFallback).toBe(true)
    expect(result.text).toBe('Tarea sin título · tsk-2503')
  })

  it('falls back when task_name is whitespace only', () => {
    expect(displayTaskName({ task_name: '   ', task_source_id: 'tsk-aaaaaaaa' })).toMatchObject({
      isFallback: true,
      text: 'Tarea sin título · tsk-aaaa'
    })
  })

  it('passes through page_url so the UI can render an "edit in Notion" CTA', () => {
    const result = displayTaskName({
      task_name: null,
      task_source_id: 'tsk-1',
      page_url: 'https://notion.so/foo'
    })

    expect(result.notionUrl).toBe('https://notion.so/foo')
  })

  it('accepts both snake_case and camelCase keys', () => {
    expect(displayTaskName({ taskName: 'foo', taskSourceId: 'a' }).text).toBe('foo')
    expect(displayTaskName({ task_name: 'bar', task_source_id: 'b' }).text).toBe('bar')
  })

  it('lowercases the source-id short form (matches SQL LOWER(SUBSTRING(...)))', () => {
    expect(displayTaskName({ task_name: null, task_source_id: 'TSK-ABCDEF' }).text).toBe('Tarea sin título · tsk-abcd')
  })

  it('handles missing source_id gracefully without throwing', () => {
    expect(displayTaskName({ task_name: null }).text).toBe('Tarea sin título · ')
  })
})

describe('displayProjectName', () => {
  it('uses the project prefix', () => {
    expect(displayProjectName({ project_name: null, project_source_id: 'prj-25039c2f' }).text).toBe(
      'Proyecto sin título · prj-2503'
    )
  })

  it('returns the trimmed name when present', () => {
    expect(displayProjectName({ projectName: '  Foo  ', projectSourceId: 'p' })).toMatchObject({
      text: 'Foo',
      isFallback: false
    })
  })
})

describe('displaySprintName', () => {
  it('uses the sprint prefix', () => {
    expect(displaySprintName({ sprint_name: null, sprint_source_id: 'spr-99887766' }).text).toBe(
      'Sprint sin título · spr-9988'
    )
  })
})

describe('isFallbackDisplayName', () => {
  it.each([
    ['Tarea sin título · tsk-1234', true],
    ['Proyecto sin título · prj-1234', true],
    ['Sprint sin título · spr-1234', true],
    ['PMAX (Adaptar CL)', false],
    ['', false]
  ])('detects fallback labels: %s → %s', (input, expected) => {
    expect(isFallbackDisplayName(input)).toBe(expected)
  })
})

const PG_CONN = process.env.GREENHOUSE_POSTGRES_HOST && process.env.GREENHOUSE_POSTGRES_PORT
  ? {
      host: process.env.GREENHOUSE_POSTGRES_HOST,
      port: Number(process.env.GREENHOUSE_POSTGRES_PORT),
      user: process.env.GREENHOUSE_POSTGRES_OPS_USER ?? process.env.GREENHOUSE_POSTGRES_USER,
      password: process.env.GREENHOUSE_POSTGRES_OPS_PASSWORD ?? process.env.GREENHOUSE_POSTGRES_PASSWORD,
      database: process.env.GREENHOUSE_POSTGRES_DATABASE,
      ssl: false
    }
  : null

describe.skipIf(!PG_CONN)('SQL parity (requires PG)', () => {
  it('TS displayTaskName matches PG greenhouse_delivery.task_display_name across cases', async () => {
    const pool = new Pool(PG_CONN as never)

    try {
      const cases = [
        { name: null, id: 'tsk-25039c2f-efe7-800d' },
        { name: '', id: 'tsk-aaaa' },
        { name: '   ', id: 'tsk-FOO' },
        { name: 'PMAX (Adaptar CL)', id: 'tsk-25039c2f' },
        { name: 'plain title', id: 'short' },
        { name: null, id: '' },
        { name: null, id: null }
      ]

      for (const { name, id } of cases) {
        const sqlResult = await pool.query<{ result: string }>(
          'SELECT greenhouse_delivery.task_display_name($1, $2) AS result',
          [name, id]
        )

        const sqlText = sqlResult.rows[0]?.result
        const tsText = displayTaskName({ task_name: name, task_source_id: id }).text

        expect(tsText, `parity for ${JSON.stringify({ name, id })}`).toBe(sqlText)
      }
    } finally {
      await pool.end()
    }
  })

  it('TS displayProjectName matches PG greenhouse_delivery.project_display_name', async () => {
    const pool = new Pool(PG_CONN as never)

    try {
      const cases = [
        { name: null, id: 'prj-25039c2f' },
        { name: 'Project Foo', id: 'prj-x' },
        { name: '', id: 'prj-EMPTY' }
      ]

      for (const { name, id } of cases) {
        const sqlResult = await pool.query<{ result: string }>(
          'SELECT greenhouse_delivery.project_display_name($1, $2) AS result',
          [name, id]
        )

        const tsText = displayProjectName({ project_name: name, project_source_id: id }).text

        expect(tsText).toBe(sqlResult.rows[0]?.result)
      }
    } finally {
      await pool.end()
    }
  })

  it('TS displaySprintName matches PG greenhouse_delivery.sprint_display_name', async () => {
    const pool = new Pool(PG_CONN as never)

    try {
      const cases = [
        { name: null, id: 'spr-99887766' },
        { name: 'Sprint 12', id: 'spr-12' },
        { name: '', id: 'spr-' }
      ]

      for (const { name, id } of cases) {
        const sqlResult = await pool.query<{ result: string }>(
          'SELECT greenhouse_delivery.sprint_display_name($1, $2) AS result',
          [name, id]
        )

        const tsText = displaySprintName({ sprint_name: name, sprint_source_id: id }).text

        expect(tsText).toBe(sqlResult.rows[0]?.result)
      }
    } finally {
      await pool.end()
    }
  })
})
