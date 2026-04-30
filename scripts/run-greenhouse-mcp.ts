import { runGreenhouseMcpServer } from '@/mcp/greenhouse'

async function main() {
  const server = await runGreenhouseMcpServer()

  console.error('Greenhouse MCP read-only server running on stdio')

  const shutdown = async () => {
    await server.close()
    process.exit(0)
  }

  process.on('SIGINT', shutdown)
  process.on('SIGTERM', shutdown)
}

main().catch(error => {
  console.error('Greenhouse MCP server failed to start:', error)
  process.exit(1)
})
