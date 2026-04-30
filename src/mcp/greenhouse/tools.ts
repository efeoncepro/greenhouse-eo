import * as z from 'zod/v4'

import { GreenhouseMcpApiError, type GreenhouseApiPlatformClient } from './http-client'
import type { GreenhouseMcpErrorResult, GreenhouseMcpSuccessResult, GreenhouseMcpToolResult } from './types'

export const greenhouseMcpToolOutputSchema = {
  ok: z.boolean(),
  requestId: z.string().nullable(),
  apiVersion: z.string().nullable(),
  status: z.number(),
  data: z.unknown().optional(),
  meta: z.record(z.string(), z.unknown()).optional(),
  error: z
    .object({
      code: z.string(),
      message: z.string(),
      details: z.record(z.string(), z.unknown()).nullable()
    })
    .optional()
}

const buildToolResponse = (summary: string, result: GreenhouseMcpToolResult) => ({
  content: [
    {
      type: 'text' as const,
      text: summary
    }
  ],
  structuredContent: result,
  isError: result.ok === false
})

const toErrorResult = (error: unknown): GreenhouseMcpErrorResult => {
  if (error instanceof GreenhouseMcpApiError) {
    return {
      ok: false,
      requestId: error.requestId,
      apiVersion: error.apiVersion,
      status: error.status,
      error: {
        code: error.code,
        message: error.message,
        details: error.details
      }
    }
  }

  const message = error instanceof Error ? error.message : 'Unexpected MCP runtime error.'

  return {
    ok: false,
    requestId: null,
    apiVersion: null,
    status: 500,
    error: {
      code: 'internal_error',
      message,
      details: null
    }
  }
}

const callReadTool = async <TData>(
  summary: (result: GreenhouseMcpSuccessResult<TData>) => string,
  action: () => Promise<GreenhouseMcpSuccessResult<TData>>
) => {
  try {
    const result = await action()

    return buildToolResponse(summary(result), result)
  } catch (error) {
    const result = toErrorResult(error)
    const requestFragment = result.requestId ? ` Request ID: ${result.requestId}.` : ''

    return buildToolResponse(
      `Greenhouse API request failed with ${result.status} (${result.error.code}).${requestFragment}`,
      result
    )
  }
}

export const createGreenhouseMcpHandlers = (client: Pick<
  GreenhouseApiPlatformClient,
  'getContext' | 'listOrganizations' | 'getOrganization' | 'listCapabilities' | 'getIntegrationReadiness'
>) => ({
  async getContext() {
    return callReadTool(
      result =>
        `Resolved Greenhouse context for scope ${String((result.meta.scope as { scopeType?: string } | undefined)?.scopeType ?? 'unknown')} (${result.requestId}).`,
      () => client.getContext()
    )
  },
  async listOrganizations(input: {
    page?: number
    pageSize?: number
    search?: string
    status?: string
    type?: string
  }) {
    return callReadTool(
      result => {
        const count = Number((result.data as { count?: number }).count ?? 0)

        return `Loaded ${count} organizations from Greenhouse (${result.requestId}).`
      },
      () => client.listOrganizations(input)
    )
  },
  async getOrganization(input: { id: string }) {
    return callReadTool(
      result => {
        const data = result.data as { organizationName?: string; publicId?: string; organizationId?: string }
        const label = data.organizationName ?? data.publicId ?? data.organizationId ?? input.id

        return `Loaded organization ${label} from Greenhouse (${result.requestId}).`
      },
      () => client.getOrganization(input)
    )
  },
  async listCapabilities(input: {
    page?: number
    pageSize?: number
    search?: string
  }) {
    return callReadTool(
      result => {
        const count = Number((result.data as { count?: number }).count ?? 0)

        return `Loaded ${count} capability assignments from Greenhouse (${result.requestId}).`
      },
      () => client.listCapabilities(input)
    )
  },
  async getIntegrationReadiness(input: { keys?: string[] }) {
    return callReadTool(
      result => {
        const data = result.data as { requestedKeys?: string[]; allReady?: boolean }
        const count = Array.isArray(data.requestedKeys) ? data.requestedKeys.length : 0

        return `Loaded readiness for ${count} integration keys; allReady=${String(Boolean(data.allReady))} (${result.requestId}).`
      },
      () => client.getIntegrationReadiness(input)
    )
  }
})
