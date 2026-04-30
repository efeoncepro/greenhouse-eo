import * as z from 'zod/v4'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'

import { GreenhouseApiPlatformClient } from './http-client'
import { resolveGreenhouseMcpConfig } from './config'
import { createGreenhouseMcpHandlers, greenhouseMcpToolOutputSchema } from './tools'
import type { GreenhouseMcpConfig } from './types'

export const createGreenhouseMcpServer = (
  config: GreenhouseMcpConfig,
  deps?: { fetch?: typeof fetch }
) => {
  const server = new McpServer(
    {
      name: 'greenhouse-read-only',
      version: '1.0.0'
    },
    {
      instructions:
        'Greenhouse MCP V1 is read-only. It is downstream of api/platform/ecosystem/*, uses a fixed external scope from server configuration, preserves Greenhouse request IDs, and must not be used for writes, SQL access, or tenancy inference from free text.'
    }
  )

  const client = new GreenhouseApiPlatformClient(config, deps?.fetch)
  const handlers = createGreenhouseMcpHandlers(client)

  server.registerTool(
    'get_context',
    {
      title: 'Get Context',
      description: 'Resolve the effective Greenhouse consumer and binding context for the configured external scope.',
      inputSchema: {},
      outputSchema: greenhouseMcpToolOutputSchema
    },
    async () => handlers.getContext()
  )

  server.registerTool(
    'list_organizations',
    {
      title: 'List Organizations',
      description: 'List organizations accessible to the configured Greenhouse scope.',
      inputSchema: {
        page: z.number().int().positive().optional(),
        pageSize: z.number().int().positive().max(100).optional(),
        search: z.string().trim().min(1).optional(),
        status: z.string().trim().min(1).optional(),
        type: z.string().trim().min(1).optional()
      },
      outputSchema: greenhouseMcpToolOutputSchema
    },
    async args => handlers.listOrganizations(args)
  )

  server.registerTool(
    'get_organization',
    {
      title: 'Get Organization',
      description: 'Load one organization by canonical identifier or public ID within the configured scope.',
      inputSchema: {
        id: z.string().trim().min(1)
      },
      outputSchema: greenhouseMcpToolOutputSchema
    },
    async args => handlers.getOrganization(args)
  )

  server.registerTool(
    'list_capabilities',
    {
      title: 'List Capabilities',
      description: 'List client capability assignments visible from the configured Greenhouse scope.',
      inputSchema: {
        page: z.number().int().positive().optional(),
        pageSize: z.number().int().positive().max(100).optional(),
        search: z.string().trim().min(1).optional()
      },
      outputSchema: greenhouseMcpToolOutputSchema
    },
    async args => handlers.listCapabilities(args)
  )

  server.registerTool(
    'get_integration_readiness',
    {
      title: 'Get Integration Readiness',
      description: 'Read operational readiness for one or more Greenhouse integrations through the ecosystem lane.',
      inputSchema: {
        keys: z.array(z.string().trim().min(1)).max(25).optional()
      },
      outputSchema: greenhouseMcpToolOutputSchema
    },
    async args => handlers.getIntegrationReadiness(args)
  )

  return server
}

export const runGreenhouseMcpServer = async (
  config: GreenhouseMcpConfig = resolveGreenhouseMcpConfig()
) => {
  const server = createGreenhouseMcpServer(config)
  const transport = new StdioServerTransport()

  await server.connect(transport)

  return server
}
