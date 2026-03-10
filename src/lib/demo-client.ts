const defaultDemoProjectIds = [
  '2dc39c2f-efe7-803e-abcd-d74ff4a40940',
  '23339c2f-efe7-80e0-9331-e9d44054cb10',
  '30639c2f-efe7-80f7-975a-eff92a518fb2',
  '2dc39c2f-efe7-80d9-b209-ed222af4d7bf'
]

const parseCsv = (value: string | undefined, fallback: string[]) => {
  const items = value
    ?.split(',')
    .map(item => item.trim())
    .filter(Boolean)

  return items && items.length > 0 ? items : fallback
}

export const demoClientConfig = {
  id: process.env.DEMO_CLIENT_ID || 'greenhouse-demo-client',
  email: process.env.DEMO_CLIENT_EMAIL || 'client.portal@efeonce.com',
  password: process.env.DEMO_CLIENT_PASSWORD || 'greenhouse-demo',
  name: process.env.DEMO_CLIENT_NAME || 'Greenhouse Demo',
  projectIds: parseCsv(process.env.DEMO_CLIENT_PROJECT_IDS, defaultDemoProjectIds)
}
