-- AI Tooling & Credit System
-- Reference SQL bootstrap aligned with src/lib/ai-tools/schema.ts

CREATE TABLE IF NOT EXISTS `efeonce-group.greenhouse.providers` (
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
);

CREATE TABLE IF NOT EXISTS `efeonce-group.greenhouse.ai_tool_catalog` (
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
);

CREATE TABLE IF NOT EXISTS `efeonce-group.greenhouse.member_tool_licenses` (
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
);

CREATE TABLE IF NOT EXISTS `efeonce-group.greenhouse.ai_credit_wallets` (
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
);

CREATE TABLE IF NOT EXISTS `efeonce-group.greenhouse.ai_credit_ledger` (
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
);

MERGE `efeonce-group.greenhouse.providers` AS target
USING (
  SELECT 'anthropic' AS provider_id, 'Anthropic' AS provider_name, 'ai_vendor' AS provider_category, 'organization' AS provider_kind, 'https://www.anthropic.com' AS website_url UNION ALL
  SELECT 'openai', 'OpenAI', 'ai_vendor', 'organization', 'https://openai.com' UNION ALL
  SELECT 'adobe', 'Adobe', 'software_suite', 'organization', 'https://www.adobe.com' UNION ALL
  SELECT 'freepik', 'Freepik', 'software_suite', 'platform', 'https://www.freepik.com' UNION ALL
  SELECT 'google-deepmind', 'Google DeepMind', 'ai_vendor', 'organization', 'https://deepmind.google' UNION ALL
  SELECT 'black-forest-labs', 'Black Forest Labs', 'ai_vendor', 'organization', 'https://blackforestlabs.ai' UNION ALL
  SELECT 'higgsfield-ai', 'Higgsfield AI', 'ai_vendor', 'platform', 'https://higgsfield.ai' UNION ALL
  SELECT 'kuaishou', 'Kuaishou', 'ai_vendor', 'organization', 'https://klingai.com'
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
  INSERT (provider_id, provider_name, provider_category, provider_kind, website_url, is_active, created_at, updated_at)
  VALUES (source.provider_id, source.provider_name, source.provider_category, source.provider_kind, source.website_url, TRUE, CURRENT_TIMESTAMP(), CURRENT_TIMESTAMP());

MERGE `efeonce-group.greenhouse.ai_tool_catalog` AS target
USING (
  SELECT 'claude-opus' AS tool_id, 'Claude Opus' AS tool_name, 'anthropic' AS provider_id, 'Anthropic' AS vendor, 'gen_text' AS tool_category, 'LLM' AS tool_subcategory, 'per_credit' AS cost_model, CAST(NULL AS NUMERIC) AS subscription_amount, 'USD' AS subscription_currency, 'monthly' AS subscription_billing_cycle, CAST(NULL AS INT64) AS subscription_seats, 'token_batch' AS credit_unit_name, CAST('0.12' AS NUMERIC) AS credit_unit_cost, 'USD' AS credit_unit_currency, CAST(NULL AS INT64) AS credits_included_monthly, CAST(NULL AS STRING) AS fin_supplier_id, 'Large language model for long-form text, strategy and reasoning.' AS description, 'https://www.anthropic.com/claude' AS website_url, CAST(NULL AS STRING) AS icon_url, TRUE AS is_active, 10 AS sort_order UNION ALL
  SELECT 'chatgpt-team', 'ChatGPT Team', 'openai', 'OpenAI', 'gen_text', 'LLM suite', 'subscription', CAST('30' AS NUMERIC), 'USD', 'monthly', 1, CAST(NULL AS STRING), CAST(NULL AS NUMERIC), 'USD', CAST(NULL AS INT64), CAST(NULL AS STRING), 'Collaborative ChatGPT workspace for internal delivery teams.', 'https://openai.com/chatgpt/team', CAST(NULL AS STRING), TRUE, 20 UNION ALL
  SELECT 'adobe-creative-cloud', 'Adobe Creative Cloud', 'adobe', 'Adobe', 'creative_production', 'design suite', 'subscription', CAST('59.99' AS NUMERIC), 'USD', 'monthly', 1, CAST(NULL AS STRING), CAST(NULL AS NUMERIC), 'USD', CAST(NULL AS INT64), CAST(NULL AS STRING), 'Creative suite for design and production.', 'https://www.adobe.com/creativecloud.html', CAST(NULL AS STRING), TRUE, 30 UNION ALL
  SELECT 'firefly', 'Adobe Firefly', 'adobe', 'Adobe', 'gen_visual', 'image generation', 'included', CAST(NULL AS NUMERIC), 'USD', 'monthly', CAST(NULL AS INT64), 'generation', CAST('0' AS NUMERIC), 'USD', CAST(NULL AS INT64), CAST(NULL AS STRING), 'Generative image features included with Adobe plans.', 'https://www.adobe.com/products/firefly.html', CAST(NULL AS STRING), TRUE, 40 UNION ALL
  SELECT 'freepik-ai-suite', 'Freepik AI Suite', 'freepik', 'Freepik', 'ai_suite', 'creative suite', 'hybrid', CAST('24' AS NUMERIC), 'USD', 'monthly', 1, 'generation', CAST('0.04' AS NUMERIC), 'USD', 1000, CAST(NULL AS STRING), 'Hybrid creative suite with included monthly generations.', 'https://www.freepik.com/premium', CAST(NULL AS STRING), TRUE, 50 UNION ALL
  SELECT 'veo-3', 'Veo 3', 'google-deepmind', 'Google DeepMind', 'gen_video', 'video generation', 'per_credit', CAST(NULL AS NUMERIC), 'USD', 'monthly', CAST(NULL AS INT64), 'render', CAST('4.50' AS NUMERIC), 'USD', CAST(NULL AS INT64), CAST(NULL AS STRING), 'High-fidelity video generation model.', 'https://deepmind.google/models/veo/', CAST(NULL AS STRING), TRUE, 60 UNION ALL
  SELECT 'flux-pro', 'FLUX Pro', 'black-forest-labs', 'Black Forest Labs', 'gen_visual', 'image generation', 'per_credit', CAST(NULL AS NUMERIC), 'USD', 'monthly', CAST(NULL AS INT64), 'render', CAST('0.08' AS NUMERIC), 'USD', CAST(NULL AS INT64), CAST(NULL AS STRING), 'High-quality image generation for campaign assets.', 'https://blackforestlabs.ai', CAST(NULL AS STRING), TRUE, 70 UNION ALL
  SELECT 'higgsfield', 'Higgsfield', 'higgsfield-ai', 'Higgsfield AI', 'gen_video', 'avatar generation', 'per_credit', CAST(NULL AS NUMERIC), 'USD', 'monthly', CAST(NULL AS INT64), 'generation', CAST('1.50' AS NUMERIC), 'USD', CAST(NULL AS INT64), CAST(NULL AS STRING), 'AI-native avatar and motion video generation.', 'https://higgsfield.ai', CAST(NULL AS STRING), TRUE, 80 UNION ALL
  SELECT 'kling-v2', 'Kling v2', 'kuaishou', 'Kuaishou', 'gen_video', 'video generation', 'per_credit', CAST(NULL AS NUMERIC), 'USD', 'monthly', CAST(NULL AS INT64), 'render', CAST('2.75' AS NUMERIC), 'USD', CAST(NULL AS INT64), CAST(NULL AS STRING), 'Video generation platform used for campaign production.', 'https://klingai.com', CAST(NULL AS STRING), TRUE, 90
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
    fin_supplier_id = source.fin_supplier_id,
    description = source.description,
    website_url = source.website_url,
    icon_url = source.icon_url,
    is_active = source.is_active,
    sort_order = source.sort_order,
    updated_at = CURRENT_TIMESTAMP()
WHEN NOT MATCHED THEN
  INSERT (
    tool_id, tool_name, provider_id, vendor, tool_category, tool_subcategory, cost_model, subscription_amount,
    subscription_currency, subscription_billing_cycle, subscription_seats, credit_unit_name, credit_unit_cost,
    credit_unit_currency, credits_included_monthly, fin_supplier_id, description, website_url, icon_url,
    is_active, sort_order, created_at, updated_at
  )
  VALUES (
    source.tool_id, source.tool_name, source.provider_id, source.vendor, source.tool_category, source.tool_subcategory, source.cost_model, source.subscription_amount,
    source.subscription_currency, source.subscription_billing_cycle, source.subscription_seats, source.credit_unit_name, source.credit_unit_cost,
    source.credit_unit_currency, source.credits_included_monthly, source.fin_supplier_id, source.description, source.website_url, source.icon_url,
    source.is_active, source.sort_order, CURRENT_TIMESTAMP(), CURRENT_TIMESTAMP()
  );
