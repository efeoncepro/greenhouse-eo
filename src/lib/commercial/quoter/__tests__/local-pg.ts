// Access to the LOCAL PostgreSQL cluster of the quoter tests (TASK-2025). A helper, not a test file.
//
// The cluster, its roles and the template database with the quoter migrations applied are prepared by
// `pnpm quoter:test:local` (scripts/commercial/quoter-local-pg.mjs), which runs these tests with the variables read
// below. Without them every database test is SKIPPED, and skipped is not green: the closing evidence of the task is
// a run through that script.
//
// There is one Cloud SQL instance for development, staging and production. Nothing here can reach it: the socket
// must be the one under `.captures/task-2025/`, and every connection re-checks that the server it reached is local
// and is that cluster. Each call to `createLocalDatabase` clones the template into a database of its own, so a test
// never shares rows with another one and the append-only tables never need emptying.
import { randomBytes } from 'node:crypto'

import { Client } from 'pg'

const socket = process.env.QUOTER_LOCAL_PG_SOCKET
const port = Number(process.env.QUOTER_LOCAL_PG_PORT ?? '55462')
const template = process.env.QUOTER_LOCAL_PG_TEMPLATE ?? 'quoter_template'

const SOCKET_SUFFIX = '/.captures/task-2025/pg-socket'
const DATA_SUFFIX = '/.captures/task-2025/pg16-data'

/** Whether the local cluster was handed to this run. Use with `describe.skipIf(!localPgEnabled)`. */
export const localPgEnabled = Boolean(socket)

export type LocalRole = 'postgres' | 'greenhouse_ops' | 'greenhouse_runtime'

const connect = async (role: LocalRole, database: string) => {
  if (!socket || !socket.startsWith('/') || !socket.endsWith(SOCKET_SUFFIX))
    throw new Error('Refusing a PostgreSQL socket that is not the local quoter cluster')

  const client = new Client({ host: socket, port, user: role, database })

  // A connection dropped along with its database must not surface as an unhandled error of the run.
  client.on('error', () => undefined)
  await client.connect()

  try {
    // Reached through a Unix socket and in the database asked for. Which cluster owns that socket is checked with
    // the superuser connection below: an ordinary role may not read `data_directory`.
    const { rows } = await client.query<{ local: boolean; database: string }>(
      `SELECT inet_server_addr() IS NULL AS local, current_database() AS database`
    )

    if (!rows[0]?.local || rows[0].database !== database) throw new Error('Refusing a PostgreSQL server that is not local')

    if (role === 'postgres') {
      const directory = await client.query<{ data_directory: string }>(`SELECT current_setting('data_directory') AS data_directory`)

      if (!directory.rows[0]?.data_directory.endsWith(DATA_SUFFIX))
        throw new Error('Refusing a PostgreSQL server that is not the local quoter cluster')
    }
  } catch (error) {
    await client.end().catch(() => undefined)
    throw error
  }

  return client
}

export type LocalDatabase = {
  name: string
  /** A new connection as the given role. Closed by `drop`, or by the caller before that. */
  connect: (role: LocalRole) => Promise<Client>
  /** Closes what this database opened and removes it. */
  drop: () => Promise<void>
}

let counter = 0

/** A database of its own, cloned from the template that holds the quoter migrations. */
export const createLocalDatabase = async (): Promise<LocalDatabase> => {
  const name = `quoter_t_${process.pid}_${(counter += 1)}_${randomBytes(3).toString('hex')}`
  const admin = await connect('postgres', 'postgres')

  try {
    // An identifier built here from a pid, a counter and hex: nothing a caller supplies reaches this statement.
    await admin.query(`CREATE DATABASE ${name} TEMPLATE ${template}`)
  } finally {
    await admin.end()
  }

  const opened: Client[] = []

  return {
    name,
    connect: async role => {
      const client = await connect(role, name)

      opened.push(client)

      return client
    },
    drop: async () => {
      await Promise.all(opened.map(client => client.end().catch(() => undefined)))

      const cleaner = await connect('postgres', 'postgres')

      try {
        await cleaner.query(`DROP DATABASE IF EXISTS ${name} WITH (FORCE)`)
      } finally {
        await cleaner.end()
      }
    }
  }
}

/** The rejection of a statement that must fail: its SQLSTATE and message, or `null` when it did not fail. */
export const rejectionOf = async (operation: Promise<unknown>): Promise<{ code: string; message: string } | null> => {
  try {
    await operation
  } catch (error) {
    const failure = error as { code?: string; message?: string }

    return { code: failure.code ?? 'unknown', message: failure.message ?? '' }
  }

  return null
}

/** Runs `work` in a transaction of `client`, as a governed command does: committed if it returns, rolled back if not. */
export const inTransaction = async <T>(client: Client, work: () => Promise<T>): Promise<T> => {
  await client.query('BEGIN')

  try {
    const result = await work()

    await client.query('COMMIT')

    return result
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  }
}
