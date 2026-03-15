import process from 'node:process'

import { readFile } from 'node:fs/promises'
import path from 'node:path'

import { applyGreenhousePostgresProfile, loadGreenhouseToolEnv } from './lib/load-greenhouse-tool-env'

type ProviderSeed = {
  providerId: string
  providerName: string
  providerType: 'organization' | 'platform' | 'financial_vendor'
  websiteUrl: string
}

type ToolSeed = {
  toolId: string
  toolName: string
  providerId: string
  vendor: string
  toolCategory: string
  toolSubcategory: string
  costModel: string
  subscriptionAmount?: string
  subscriptionCurrency?: string
  subscriptionBillingCycle?: string
  subscriptionSeats?: number
  creditUnitName?: string
  creditUnitCost?: string
  creditUnitCurrency?: string
  creditsIncludedMonthly?: number
  description: string
  websiteUrl: string
  isActive: boolean
  sortOrder: number
}

const PROVIDER_SEEDS: ProviderSeed[] = [
  { providerId: 'adobe', providerName: 'Adobe', providerType: 'organization', websiteUrl: 'https://www.adobe.com' },
  { providerId: 'anthropic', providerName: 'Anthropic', providerType: 'organization', websiteUrl: 'https://www.anthropic.com' },
  { providerId: 'black-forest-labs', providerName: 'Black Forest Labs', providerType: 'organization', websiteUrl: 'https://blackforestlabs.ai' },
  { providerId: 'freepik', providerName: 'Freepik', providerType: 'platform', websiteUrl: 'https://www.freepik.com' },
  { providerId: 'google-deepmind', providerName: 'Google DeepMind', providerType: 'organization', websiteUrl: 'https://deepmind.google' },
  { providerId: 'higgsfield-ai', providerName: 'Higgsfield AI', providerType: 'platform', websiteUrl: 'https://higgsfield.ai' },
  { providerId: 'kuaishou', providerName: 'Kuaishou', providerType: 'organization', websiteUrl: 'https://klingai.com' },
  { providerId: 'microsoft', providerName: 'Microsoft', providerType: 'financial_vendor', websiteUrl: 'https://www.microsoft.com' },
  { providerId: 'notion', providerName: 'Notion', providerType: 'financial_vendor', websiteUrl: 'https://www.notion.so' },
  { providerId: 'openai', providerName: 'OpenAI', providerType: 'organization', websiteUrl: 'https://openai.com' }
]

const TOOL_SEEDS: ToolSeed[] = [
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

const main = async () => {
  loadGreenhouseToolEnv()
  applyGreenhousePostgresProfile('migrator')

  const { closeGreenhousePostgres, runGreenhousePostgresQuery } = await import('@/lib/postgres/client')

  try {
    const sqlPath = path.resolve(process.cwd(), 'scripts/setup-postgres-ai-tooling.sql')
    const sql = await readFile(sqlPath, 'utf8')

    await runGreenhousePostgresQuery(sql)

    for (const provider of PROVIDER_SEEDS) {
      await runGreenhousePostgresQuery(
        `
          INSERT INTO greenhouse_core.providers (
            provider_id,
            public_id,
            provider_name,
            legal_name,
            provider_type,
            website_url,
            status,
            active,
            created_at,
            updated_at
          )
          VALUES (
            $1,
            $2,
            $3,
            $3,
            $4,
            $5,
            'active',
            TRUE,
            CURRENT_TIMESTAMP,
            CURRENT_TIMESTAMP
          )
          ON CONFLICT (provider_id) DO UPDATE
          SET
            public_id = EXCLUDED.public_id,
            provider_name = EXCLUDED.provider_name,
            legal_name = COALESCE(greenhouse_core.providers.legal_name, EXCLUDED.legal_name),
            provider_type = EXCLUDED.provider_type,
            website_url = COALESCE(EXCLUDED.website_url, greenhouse_core.providers.website_url),
            status = 'active',
            active = TRUE,
            updated_at = CURRENT_TIMESTAMP
        `,
        [provider.providerId, provider.providerId, provider.providerName, provider.providerType, provider.websiteUrl]
      )
    }

    for (const tool of TOOL_SEEDS) {
      await runGreenhousePostgresQuery(
        `
          INSERT INTO greenhouse_ai.tool_catalog (
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
            fin_supplier_id,
            description,
            website_url,
            icon_url,
            is_active,
            sort_order,
            created_at,
            updated_at
          )
          VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8::numeric, $9, $10, $11, $12, $13::numeric, $14, $15, $16, $17, $18, NULL, $19, $20, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
          )
          ON CONFLICT (tool_id) DO UPDATE
          SET
            tool_name = EXCLUDED.tool_name,
            provider_id = EXCLUDED.provider_id,
            vendor = EXCLUDED.vendor,
            tool_category = EXCLUDED.tool_category,
            tool_subcategory = EXCLUDED.tool_subcategory,
            cost_model = EXCLUDED.cost_model,
            subscription_amount = EXCLUDED.subscription_amount,
            subscription_currency = EXCLUDED.subscription_currency,
            subscription_billing_cycle = EXCLUDED.subscription_billing_cycle,
            subscription_seats = EXCLUDED.subscription_seats,
            credit_unit_name = EXCLUDED.credit_unit_name,
            credit_unit_cost = EXCLUDED.credit_unit_cost,
            credit_unit_currency = EXCLUDED.credit_unit_currency,
            credits_included_monthly = EXCLUDED.credits_included_monthly,
            description = EXCLUDED.description,
            website_url = EXCLUDED.website_url,
            is_active = EXCLUDED.is_active,
            sort_order = EXCLUDED.sort_order,
            updated_at = CURRENT_TIMESTAMP
        `,
        [
          tool.toolId,
          tool.toolName,
          tool.providerId,
          tool.vendor,
          tool.toolCategory,
          tool.toolSubcategory,
          tool.costModel,
          tool.subscriptionAmount ?? null,
          tool.subscriptionCurrency ?? null,
          tool.subscriptionBillingCycle ?? null,
          tool.subscriptionSeats ?? null,
          tool.creditUnitName ?? null,
          tool.creditUnitCost ?? null,
          tool.creditUnitCurrency ?? null,
          tool.creditsIncludedMonthly ?? null,
          null,
          tool.description,
          tool.websiteUrl,
          tool.isActive,
          tool.sortOrder
        ]
      )
    }

    console.log('Applied PostgreSQL AI Tooling runtime schema for Greenhouse')
    console.log(
      JSON.stringify(
        {
          seededProviders: PROVIDER_SEEDS.length,
          seededTools: TOOL_SEEDS.length
        },
        null,
        2
      )
    )
  } finally {
    await closeGreenhousePostgres()
  }
}

main().catch(error => {
  console.error(error)
  process.exitCode = 1
})
