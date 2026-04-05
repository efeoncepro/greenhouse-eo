import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

type Environment = 'node' | 'jsdom'
type TestType = 'domain' | 'api' | 'ui' | 'email' | 'script' | 'config'

type InventoryEntry = {
  path: string
  domain: string
  type: TestType
  environment: Environment
}

type Inventory = {
  generatedAt: string
  root: string
  totalFiles: number
  byDomain: Record<string, number>
  byType: Record<TestType, number>
  byEnvironment: Record<Environment, number>
  files: InventoryEntry[]
}

const repoRoot = process.cwd()
const roots = ['src', 'scripts']
const outputDir = path.join(repoRoot, 'artifacts', 'tests')
const outputJson = path.join(outputDir, 'inventory.json')
const outputMarkdown = path.join(outputDir, 'inventory.md')
const testFilePattern = /\.(test|spec)\.(ts|tsx|js|jsx)$/

const increment = (record: Record<string, number>, key: string) => {
  record[key] = (record[key] ?? 0) + 1
}

const walk = async (dirPath: string): Promise<string[]> => {
  const entries = await readdir(dirPath, { withFileTypes: true })

  const files = await Promise.all(
    entries.map(async entry => {
      const absolutePath = path.join(dirPath, entry.name)

      if (entry.isDirectory()) {
        return walk(absolutePath)
      }

      return testFilePattern.test(entry.name) ? [absolutePath] : []
    })
  )

  return files.flat()
}

const classifyDomain = (relativePath: string): string => {
  const parts = relativePath.split(path.sep)

  if (parts[0] === 'src') {
    if (parts[1] === 'app' && parts[2] === 'api') return 'api'
    if (parts[1] === 'views') return parts[2] === 'greenhouse' ? (parts[3] ?? 'views') : (parts[2] ?? 'views')
    if (parts[1] === 'components') return 'components'
    if (parts[1] === 'lib') return parts[2] ?? 'lib'
    if (parts[1] === 'emails') return 'emails'
    if (parts[1] === 'config') return 'config'

    return parts[1] ?? 'src'
  }

  return parts[0] ?? 'scripts'
}

const classifyType = (relativePath: string): TestType => {
  const normalized = relativePath.split(path.sep).join('/')

  if (normalized.startsWith('src/app/api/')) return 'api'
  if (normalized.startsWith('src/views/') || normalized.startsWith('src/components/')) return 'ui'
  if (normalized.startsWith('src/emails/')) return 'email'
  if (normalized.startsWith('scripts/')) return 'script'
  if (normalized.startsWith('src/config/')) return 'config'

  return 'domain'
}

const detectEnvironment = async (absolutePath: string): Promise<Environment> => {
  const contents = await readFile(absolutePath, 'utf8')

  return contents.includes('@vitest-environment jsdom') ? 'jsdom' : 'node'
}

const buildMarkdown = (inventory: Inventory) => {
  const topDomains = Object.entries(inventory.byDomain)
    .sort((left, right) => right[1] - left[1])
    .slice(0, 12)

  const byTypeLines = Object.entries(inventory.byType).map(([type, count]) => `- ${type}: ${count}`)
  const byEnvironmentLines = Object.entries(inventory.byEnvironment).map(([env, count]) => `- ${env}: ${count}`)
  const topDomainLines = topDomains.map(([domain, count]) => `- ${domain}: ${count}`)
  const fileLines = inventory.files.map(file => `- ${file.path} — ${file.domain} / ${file.type} / ${file.environment}`)

  return [
    '# Test Inventory',
    '',
    `- Generated at: ${inventory.generatedAt}`,
    `- Total test files: ${inventory.totalFiles}`,
    '',
    '## By Type',
    ...byTypeLines,
    '',
    '## By Environment',
    ...byEnvironmentLines,
    '',
    '## Top Domains',
    ...topDomainLines,
    '',
    '## Files',
    ...fileLines,
    ''
  ].join('\n')
}

const main = async () => {
  const files = (await Promise.all(roots.map(root => walk(path.join(repoRoot, root))))).flat().sort()

  const entries: InventoryEntry[] = []
  const byDomain: Record<string, number> = {}

  const byType: Record<TestType, number> = {
    domain: 0,
    api: 0,
    ui: 0,
    email: 0,
    script: 0,
    config: 0
  }

  const byEnvironment: Record<Environment, number> = {
    node: 0,
    jsdom: 0
  }

  for (const absolutePath of files) {
    const relativePath = path.relative(repoRoot, absolutePath)
    const domain = classifyDomain(relativePath)
    const type = classifyType(relativePath)
    const environment = await detectEnvironment(absolutePath)

    entries.push({ path: relativePath.split(path.sep).join('/'), domain, type, environment })
    increment(byDomain, domain)
    byType[type] += 1
    byEnvironment[environment] += 1
  }

  const inventory: Inventory = {
    generatedAt: new Date().toISOString(),
    root: repoRoot,
    totalFiles: entries.length,
    byDomain,
    byType,
    byEnvironment,
    files: entries
  }

  await mkdir(outputDir, { recursive: true })
  await writeFile(outputJson, `${JSON.stringify(inventory, null, 2)}\n`)
  await writeFile(outputMarkdown, `${buildMarkdown(inventory)}\n`)

  console.log(`Test inventory generated: ${entries.length} files -> ${path.relative(repoRoot, outputJson)}`)
}

main().catch(error => {
  console.error('[test-inventory] failed to generate inventory', error)
  process.exitCode = 1
})
