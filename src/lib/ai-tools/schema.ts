import 'server-only'

import { getBigQueryClient, getBigQueryProjectId } from '@/lib/bigquery'

let ensureAiToolingInfrastructurePromise: Promise<void> | null = null

const TABLE_DEFINITIONS: Record<string, string> = {
  providers: `
    CREATE TABLE IF NOT EXISTS \`{projectId}.greenhouse.providers\` (
      provider_id STRING NOT NULL,
      provider_name STRING NOT NULL,
      provider_category STRING NOT NULL,
      provider_kind STRING,
      website_url STRING,
      support_url STRING,
      icon_url STRING,
      is_active BOOL,
      created_at TIMESTAMP,
      updated_at TIMESTAMP
    )
  `,
  ai_tool_catalog: `
    CREATE TABLE IF NOT EXISTS \`{projectId}.greenhouse.ai_tool_catalog\` (
      tool_id STRING NOT NULL,
      tool_name STRING NOT NULL,
      provider_id STRING NOT NULL,
      vendor STRING,
      tool_category STRING NOT NULL,
      tool_subcategory STRING,
      cost_model STRING NOT NULL,
      subscription_amount NUMERIC,
      subscription_currency STRING,
      subscription_billing_cycle STRING,
      subscription_seats INT64,
      credit_unit_name STRING,
      credit_unit_cost NUMERIC,
      credit_unit_currency STRING,
      credits_included_monthly INT64,
      fin_supplier_id STRING,
      description STRING,
      website_url STRING,
      icon_url STRING,
      is_active BOOL,
      sort_order INT64,
      created_at TIMESTAMP,
      updated_at TIMESTAMP
    )
  `,
  member_tool_licenses: `
    CREATE TABLE IF NOT EXISTS \`{projectId}.greenhouse.member_tool_licenses\` (
      license_id STRING NOT NULL,
      member_id STRING NOT NULL,
      tool_id STRING NOT NULL,
      license_status STRING NOT NULL,
      activated_at DATE,
      expires_at DATE,
      access_level STRING,
      license_key STRING,
      account_email STRING,
      notes STRING,
      assigned_by STRING,
      created_at TIMESTAMP,
      updated_at TIMESTAMP
    )
  `,
  ai_credit_wallets: `
    CREATE TABLE IF NOT EXISTS \`{projectId}.greenhouse.ai_credit_wallets\` (
      wallet_id STRING NOT NULL,
      wallet_name STRING NOT NULL,
      wallet_scope STRING NOT NULL,
      client_id STRING,
      client_name STRING,
      tool_id STRING NOT NULL,
      tool_name STRING NOT NULL,
      credit_unit_name STRING NOT NULL,
      initial_balance INT64 NOT NULL,
      current_balance INT64 NOT NULL,
      reserved_balance INT64,
      monthly_limit INT64,
      monthly_consumed INT64,
      monthly_reset_day INT64,
      low_balance_threshold INT64,
      valid_from DATE NOT NULL,
      valid_until DATE,
      wallet_status STRING NOT NULL,
      notes STRING,
      alert_sent BOOL,
      created_by STRING,
      created_at TIMESTAMP,
      updated_at TIMESTAMP
    )
  `,
  ai_credit_ledger: `
    CREATE TABLE IF NOT EXISTS \`{projectId}.greenhouse.ai_credit_ledger\` (
      ledger_id STRING NOT NULL,
      wallet_id STRING NOT NULL,
      request_id STRING,
      entry_type STRING NOT NULL,
      credit_amount INT64 NOT NULL,
      balance_before INT64 NOT NULL,
      balance_after INT64 NOT NULL,
      consumed_by_member_id STRING,
      consumed_by_name STRING,
      client_id STRING,
      client_name STRING,
      notion_task_id STRING,
      notion_project_id STRING,
      project_name STRING,
      asset_description STRING,
      unit_cost NUMERIC,
      cost_currency STRING,
      total_cost NUMERIC,
      total_cost_clp NUMERIC,
      reload_reason STRING,
      reload_reference STRING,
      notes STRING,
      created_by STRING,
      created_at TIMESTAMP
    )
  `
}

const PROVIDER_SEEDS = [
  {
    providerId: 'anthropic',
    providerName: 'Anthropic',
    providerCategory: 'ai_vendor',
    providerKind: 'organization',
    websiteUrl: 'https://www.anthropic.com'
  },
  {
    providerId: 'openai',
    providerName: 'OpenAI',
    providerCategory: 'ai_vendor',
    providerKind: 'organization',
    websiteUrl: 'https://openai.com'
  },
  {
    providerId: 'adobe',
    providerName: 'Adobe',
    providerCategory: 'software_suite',
    providerKind: 'organization',
    websiteUrl: 'https://www.adobe.com'
  },
  {
    providerId: 'freepik',
    providerName: 'Freepik',
    providerCategory: 'software_suite',
    providerKind: 'platform',
    websiteUrl: 'https://www.freepik.com'
  },
  {
    providerId: 'google-deepmind',
    providerName: 'Google DeepMind',
    providerCategory: 'ai_vendor',
    providerKind: 'organization',
    websiteUrl: 'https://deepmind.google'
  },
  {
    providerId: 'black-forest-labs',
    providerName: 'Black Forest Labs',
    providerCategory: 'ai_vendor',
    providerKind: 'organization',
    websiteUrl: 'https://blackforestlabs.ai'
  },
  {
    providerId: 'higgsfield-ai',
    providerName: 'Higgsfield AI',
    providerCategory: 'ai_vendor',
    providerKind: 'platform',
    websiteUrl: 'https://higgsfield.ai'
  },
  {
    providerId: 'kuaishou',
    providerName: 'Kuaishou',
    providerCategory: 'ai_vendor',
    providerKind: 'organization',
    websiteUrl: 'https://klingai.com'
  }
]

const TOOL_SEEDS = [
  {
    toolId: 'claude-opus',
    toolName: 'Claude Opus',
    providerId: 'anthropic',
    vendor: 'Anthropic',
    toolCategory: 'gen_text',
    toolSubcategory: 'LLM',
    costModel: 'per_credit',
    creditUnitName: 'token_batch',
    creditUnitCost: '0.12',
    creditUnitCurrency: 'USD',
    description: 'Large language model for long-form text, strategy and reasoning.',
    websiteUrl: 'https://www.anthropic.com/claude',
    isActive: true,
    sortOrder: 10
  },
  {
    toolId: 'chatgpt-team',
    toolName: 'ChatGPT Team',
    providerId: 'openai',
    vendor: 'OpenAI',
    toolCategory: 'gen_text',
    toolSubcategory: 'LLM suite',
    costModel: 'subscription',
    subscriptionAmount: '30',
    subscriptionCurrency: 'USD',
    subscriptionBillingCycle: 'monthly',
    subscriptionSeats: 1,
    description: 'Collaborative ChatGPT workspace for internal delivery teams.',
    websiteUrl: 'https://openai.com/chatgpt/team',
    isActive: true,
    sortOrder: 20
  },
  {
    toolId: 'adobe-creative-cloud',
    toolName: 'Adobe Creative Cloud',
    providerId: 'adobe',
    vendor: 'Adobe',
    toolCategory: 'creative_production',
    toolSubcategory: 'design suite',
    costModel: 'subscription',
    subscriptionAmount: '59.99',
    subscriptionCurrency: 'USD',
    subscriptionBillingCycle: 'monthly',
    subscriptionSeats: 1,
    description: 'Creative suite for design and production.',
    websiteUrl: 'https://www.adobe.com/creativecloud.html',
    isActive: true,
    sortOrder: 30
  },
  {
    toolId: 'firefly',
    toolName: 'Adobe Firefly',
    providerId: 'adobe',
    vendor: 'Adobe',
    toolCategory: 'gen_visual',
    toolSubcategory: 'image generation',
    costModel: 'included',
    creditUnitName: 'generation',
    creditUnitCost: '0',
    creditUnitCurrency: 'USD',
    description: 'Generative image features included with Adobe plans.',
    websiteUrl: 'https://www.adobe.com/products/firefly.html',
    isActive: true,
    sortOrder: 40
  },
  {
    toolId: 'freepik-ai-suite',
    toolName: 'Freepik AI Suite',
    providerId: 'freepik',
    vendor: 'Freepik',
    toolCategory: 'ai_suite',
    toolSubcategory: 'creative suite',
    costModel: 'hybrid',
    subscriptionAmount: '24',
    subscriptionCurrency: 'USD',
    subscriptionBillingCycle: 'monthly',
    creditUnitName: 'generation',
    creditUnitCost: '0.08',
    creditUnitCurrency: 'USD',
    creditsIncludedMonthly: 300,
    description: 'Suite of AI creative tools and assets.',
    websiteUrl: 'https://www.freepik.com/ai',
    isActive: true,
    sortOrder: 50
  },
  {
    toolId: 'veo-3',
    toolName: 'Veo 3.1',
    providerId: 'google-deepmind',
    vendor: 'Google DeepMind',
    toolCategory: 'gen_video',
    toolSubcategory: 'video generation',
    costModel: 'per_credit',
    creditUnitName: 'render',
    creditUnitCost: '1.5',
    creditUnitCurrency: 'USD',
    description: 'Premium AI video generation.',
    websiteUrl: 'https://deepmind.google',
    isActive: true,
    sortOrder: 60
  },
  {
    toolId: 'flux-pro',
    toolName: 'FLUX Pro',
    providerId: 'black-forest-labs',
    vendor: 'Black Forest Labs',
    toolCategory: 'gen_visual',
    toolSubcategory: 'image generation',
    costModel: 'per_credit',
    creditUnitName: 'generation',
    creditUnitCost: '0.25',
    creditUnitCurrency: 'USD',
    description: 'High-fidelity AI image generation.',
    websiteUrl: 'https://blackforestlabs.ai',
    isActive: true,
    sortOrder: 70
  },
  {
    toolId: 'higgsfield',
    toolName: 'Higgsfield',
    providerId: 'higgsfield-ai',
    vendor: 'Higgsfield AI',
    toolCategory: 'gen_video',
    toolSubcategory: 'video generation',
    costModel: 'per_credit',
    creditUnitName: 'render',
    creditUnitCost: '1.2',
    creditUnitCurrency: 'USD',
    description: 'AI video experimentation and generation.',
    websiteUrl: 'https://higgsfield.ai',
    isActive: true,
    sortOrder: 80
  },
  {
    toolId: 'kling-v2',
    toolName: 'Kling v2',
    providerId: 'kuaishou',
    vendor: 'Kuaishou',
    toolCategory: 'gen_video',
    toolSubcategory: 'video generation',
    costModel: 'per_credit',
    creditUnitName: 'render',
    creditUnitCost: '1.1',
    creditUnitCurrency: 'USD',
    description: 'AI video render generation.',
    websiteUrl: 'https://klingai.com',
    isActive: true,
    sortOrder: 90
  }
]

const getExistingTables = async (projectId: string) => {
  const [rows] = await getBigQueryClient().query({
    query: `
      SELECT table_name
      FROM \`${projectId}.greenhouse.INFORMATION_SCHEMA.TABLES\`
      WHERE table_name IN UNNEST(@tableNames)
    `,
    params: { tableNames: Object.keys(TABLE_DEFINITIONS) }
  })

  return new Set((rows as Array<{ table_name: string }>).map(row => row.table_name))
}

const seedProviders = async (projectId: string) => {
  const bigQuery = getBigQueryClient()

  for (const provider of PROVIDER_SEEDS) {
    await bigQuery.query({
      query: `
        MERGE \`${projectId}.greenhouse.providers\` AS target
        USING (
          SELECT
            @providerId AS provider_id,
            @providerName AS provider_name,
            @providerCategory AS provider_category,
            @providerKind AS provider_kind,
            @websiteUrl AS website_url
        ) AS source
        ON target.provider_id = source.provider_id
        WHEN MATCHED THEN
          UPDATE SET
            provider_name = source.provider_name,
            provider_category = source.provider_category,
            provider_kind = source.provider_kind,
            website_url = source.website_url,
            is_active = TRUE,
            updated_at = CURRENT_TIMESTAMP()
        WHEN NOT MATCHED THEN
          INSERT (
            provider_id,
            provider_name,
            provider_category,
            provider_kind,
            website_url,
            is_active,
            created_at,
            updated_at
          )
          VALUES (
            source.provider_id,
            source.provider_name,
            source.provider_category,
            source.provider_kind,
            source.website_url,
            TRUE,
            CURRENT_TIMESTAMP(),
            CURRENT_TIMESTAMP()
          )
      `,
      params: provider
    })
  }
}

const seedTools = async (projectId: string) => {
  const bigQuery = getBigQueryClient()

  for (const tool of TOOL_SEEDS) {
    await bigQuery.query({
      query: `
        MERGE \`${projectId}.greenhouse.ai_tool_catalog\` AS target
        USING (
          SELECT
            @toolId AS tool_id,
            @toolName AS tool_name,
            @providerId AS provider_id,
            @vendor AS vendor,
            @toolCategory AS tool_category,
            @toolSubcategory AS tool_subcategory,
            @costModel AS cost_model,
            @subscriptionAmount AS subscription_amount,
            @subscriptionCurrency AS subscription_currency,
            @subscriptionBillingCycle AS subscription_billing_cycle,
            @subscriptionSeats AS subscription_seats,
            @creditUnitName AS credit_unit_name,
            @creditUnitCost AS credit_unit_cost,
            @creditUnitCurrency AS credit_unit_currency,
            @creditsIncludedMonthly AS credits_included_monthly,
            @description AS description,
            @websiteUrl AS website_url,
            @isActive AS is_active,
            @sortOrder AS sort_order
        ) AS source
        ON target.tool_id = source.tool_id
        WHEN MATCHED THEN
          UPDATE SET
            tool_name = source.tool_name,
            provider_id = source.provider_id,
            vendor = source.vendor,
            tool_category = source.tool_category,
            tool_subcategory = source.tool_subcategory,
            cost_model = source.cost_model,
            subscription_amount = source.subscription_amount,
            subscription_currency = source.subscription_currency,
            subscription_billing_cycle = source.subscription_billing_cycle,
            subscription_seats = source.subscription_seats,
            credit_unit_name = source.credit_unit_name,
            credit_unit_cost = source.credit_unit_cost,
            credit_unit_currency = source.credit_unit_currency,
            credits_included_monthly = source.credits_included_monthly,
            description = source.description,
            website_url = source.website_url,
            is_active = source.is_active,
            sort_order = source.sort_order,
            updated_at = CURRENT_TIMESTAMP()
        WHEN NOT MATCHED THEN
          INSERT (
            tool_id,
            tool_name,
            provider_id,
            vendor,
            tool_category,
            tool_subcategory,
            cost_model,
            subscription_amount,
            subscription_currency,
            subscription_billing_cycle,
            subscription_seats,
            credit_unit_name,
            credit_unit_cost,
            credit_unit_currency,
            credits_included_monthly,
            description,
            website_url,
            is_active,
            sort_order,
            created_at,
            updated_at
          )
          VALUES (
            source.tool_id,
            source.tool_name,
            source.provider_id,
            source.vendor,
            source.tool_category,
            source.tool_subcategory,
            source.cost_model,
            source.subscription_amount,
            source.subscription_currency,
            source.subscription_billing_cycle,
            source.subscription_seats,
            source.credit_unit_name,
            source.credit_unit_cost,
            source.credit_unit_currency,
            source.credits_included_monthly,
            source.description,
            source.website_url,
            source.is_active,
            source.sort_order,
            CURRENT_TIMESTAMP(),
            CURRENT_TIMESTAMP()
          )
      `,
      params: tool,
      types: {
        subscriptionAmount: 'NUMERIC',
        creditUnitCost: 'NUMERIC'
      }
    })
  }
}

export const ensureAiToolingInfrastructure = async () => {
  if (ensureAiToolingInfrastructurePromise) {
    return ensureAiToolingInfrastructurePromise
  }

  const projectId = getBigQueryProjectId()
  const bigQuery = getBigQueryClient()

  ensureAiToolingInfrastructurePromise = (async () => {
    const existingTables = await getExistingTables(projectId)

    for (const [tableName, statement] of Object.entries(TABLE_DEFINITIONS)) {
      if (!existingTables.has(tableName)) {
        await bigQuery.query({ query: statement.replaceAll('{projectId}', projectId) })
      }
    }

    await seedProviders(projectId)
    await seedTools(projectId)
  })().catch(error => {
    ensureAiToolingInfrastructurePromise = null
    throw error
  })

  return ensureAiToolingInfrastructurePromise
}
